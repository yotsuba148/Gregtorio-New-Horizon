(function(root) {
  'use strict';
  var snapshots = new WeakMap(),
    committedSnapshots = new WeakMap(),
    versions = new WeakMap(),
    revision = 0,
    R = AE_RESOURCES;

  function owner(storage) {
    return storage.array || storage;
  }

  function read(context, adapter, acrossPhases) {
    var committed = acrossPhases && adapter.commitTracked,
      cache = committed ? committedSnapshots : snapshots,
      epoch = committed ? null : context.readEpoch,
      version = versions.get(owner(adapter.storage)) || 0,
      old = cache.get(adapter.storage);
    if (old && old.epoch === epoch && old.version === version) return old;
    var values = adapter.resources(adapter.read()),
      index = new Map(values.map(function(r) {
        return [R.identity(r), r];
      })),
      entry = {
        epoch: epoch,
        version: version,
        values: values,
        index: index,
        groups: new Map()
      };
    cache.set(adapter.storage, entry);
    return entry;
  }

  function selected(context, adapter, permissions) {
    var entry = read(context, adapter);
    if (permissions.has('all')) return entry.values;
    if (permissions.has('item') || permissions.has('fluid')) return entry.values.filter(function(r) {
      return permissions.has(r.kind);
    });
    var values = [];
    permissions.forEach(function(id) {
      var value = entry.index.get(id);
      if (value) values.push(value);
    });
    return values;
  }

  function generation(context) {
    return [context.graph.revision, context.network.revision, context.network.inventoryRevision, revision].join('|');
  }

  function groupedResources(context, adapter, classify, groups) {
    var entry = read(context, adapter, true),
      index = entry.groups.get(classify);
    if (!index) {
      index = new Map();
      entry.values.forEach(function(resource) {
        for (var group of classify(resource) || []) {
          if (!index.has(group)) index.set(group, []);
          index.get(group).push(resource);
        }
      });
      entry.groups.set(classify, index);
    }
    return groups.flatMap(function(group) { return index.get(group) || []; });
  }

  function networkSelection(context, node, resources, acrossPhases) {
    var network = context.network,
      current = generation(context);
    if (context.selectionEpoch !== context.readEpoch || context.selectionGeneration !== current) {
      context.selectionEpoch = context.readEpoch;
      context.selectionGeneration = current;
      context.selections = new Map();
    }
    var ids = resources.map(R.identity).sort(),
      key = JSON.stringify([context.graph.component(node), ids]),
      cached = context.selections.get(key);
    if (cached) return cached;
    var owners = new Map(),
      totals = [];
    resources.forEach(function(r) {
      var id = R.identity(r),
        amount = 0;
      network.routes(node, r, 'read').forEach(function(route) {
        var actual = read(context, route.adapter, acrossPhases).index.get(id);
        if (!actual) return;
        var source = owners.get(route.adapter.storage);
        if (!source) {
          source = {
            adapter: route.adapter,
            permissions: new Set()
          };
          owners.set(route.adapter.storage, source);
        }
        if (source.permissions.has(id)) return;
        source.permissions.add(id);
        amount = R.add(amount, actual.amount);
      });
      if (amount) totals.push(R.amount(r, amount));
    });
    cached = {
      owners: owners,
      resources: totals
    };
    context.selections.set(key, cached);
    return cached;
  }
  AE_STORAGE.observeCommits('me-read-index', function(entries) {
    revision++;
    entries.forEach(function(e) {
      var key = owner(e.adapter.storage);
      versions.set(key, (versions.get(key) || 0) + 1);
    });
  });
  root.AE_READ_INDEX = {
    resources: function(context, adapter) {
      return read(context, adapter).values;
    },
    versionOf: function(storage) {
      return versions.get(owner(storage)) || 0;
    },
    selected: selected,
    groupedResources: groupedResources,
    generation: generation,
    networkSelection: networkSelection
  };
  Object.defineProperty(root.AE_READ_INDEX, 'revision', {
    get: function() {
      return revision;
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
