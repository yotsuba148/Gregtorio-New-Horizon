(function(root) {
  'use strict';
  var R = root.AE_RESOURCES,
    ST = root.AE_STORAGE;

  function sharesStorage(a, b) {
    return !!a && !!b && (a === b || (a.array || a) === (b.array || b));
  }

  function Graph() {
    this.revision = 0;
    this.components = new Map();
    this.edges = new Map();
    this.cache = new Map();
  }

  function filter(spec) {
    spec = spec || {};
    return {
      items: new Set((spec.items || []).map(function(k) {
        return root.CONTENT.canonicalKey(k);
      })),
      fluids: new Set((spec.fluids || []).map(function(f) {
        return root.CONTENT.canonicalFluid(f);
      })),
      kinds: new Set(spec.kinds || ['item', 'fluid']),
      inverted: !!spec.inverted, fuzzy: !!spec.fuzzy,
      sampleList: (spec.samples || []).filter(Boolean).map(R.normalize),
      samples: new Set((spec.samples || []).filter(Boolean).map(function(r) {
        return R.identity(R.normalize(r));
      }))
    };
  }

  function allows(f, r) {
    var values = r.kind === 'item' ? f.items : f.fluids;
    if(!f.kinds.has(r.kind))return false;
    var match=(!values.size||values.has(r.key))&&(!f.samples.size||f.samples.has(R.identity(r))||
      f.fuzzy&&f.sampleList.some(function(s){return s.kind==='item'&&r.kind==='item'&&s.key===r.key;}));
    return f.inverted?(values.size||f.samples.size?!match:true):match;
  }
  Graph.prototype.replace = function(nodes, connections, bridges) {
    var adjacent = new Map(),
      components = new Map(),
      edges = new Map();
    nodes.forEach(function(n) {
      if (typeof n !== 'string' || !n || adjacent.has(n)) throw Error(
        'Invalid AE network node');
      adjacent.set(n, []);
    });
    connections.forEach(function(e) {
      if (!adjacent.has(e.from) || !adjacent.has(e.to)) throw Error(
        'Unknown AE connection node');
      adjacent.get(e.from).push(e.to);
      adjacent.get(e.to).push(e.from);
    });
    Array.from(adjacent.keys()).sort().forEach(function(id) {
      if (components.has(id)) return;
      var pending = [id];
      components.set(id, id);
      for (var i = 0; i < pending.length; i++) adjacent.get(pending[i]).forEach(function(
        next) {
        if (!components.has(next)) {
          components.set(next, id);
          pending.push(next);
        }
      });
    });
    (bridges || []).forEach(function(b) {
      if (!components.has(b.from) || !components.has(b.to) || !['read', 'write',
          'readwrite'
        ].includes(b.access)) throw Error('Invalid AE storage-bus connection');
      var from = components.get(b.from),
        list = edges.get(from) || [];
      list.push({
        to: components.get(b.to),
        read: b.access !== 'write',
        write: b.access !== 'read',
        filter: filter(b)
      });
      edges.set(from, list);
    });
    this.components = components;
    this.edges = edges;
    this.revision++;
    this.cache.clear();
    return this;
  };
  Graph.prototype.component = function(node) {
    return this.components.get(node);
  };
  Graph.prototype.reaches = function(from, to, r, operation) {
    var a = this.component(from),
      b = this.component(to);
    if (a == null || b == null || this.available && (!this.available(a) || !this.available(b)))
      return false;
    if (a === b) return true;
    var key = JSON.stringify([a, b, R.identity(r), operation]);
    if (this.cache.has(key)) return this.cache.get(key);
    var queue = [a],
      seen = new Set(queue),
      found = false;
    for (var i = 0; i < queue.length && !found; i++)
      for (var e of this.edges.get(queue[i]) || []) {
        if (!e[operation] || !allows(e.filter, r) || seen.has(e.to) || this.available && !this.available(e
            .to)) continue;
        if (e.to === b) {
          found = true;
          break;
        }
        seen.add(e.to);
        queue.push(e.to);
      }
    if (this.cache.size >= 2048) this.cache.clear();
    this.cache.set(key, found);
    return found;
  };

  function Network(graph) {
    this.graph = graph;
    this.stores = new Map();
    this.owners = new Map();
    this.revision = 0;
    this.inventoryRevision = 0;
    this.routeCache = new Map();
    this.routeGeneration = null;
  }
  Network.prototype.attach = function(node, adapter, options) {
    ST.validate(adapter);
    if (this.graph.component(node) == null) throw Error('Unknown AE storage node');
    options = options || {};
    var stored = this.stores.get(adapter.id),
      owner = this.owners.get(adapter.storage);
    if (stored && stored.adapter !== adapter || owner && owner !== adapter) throw Error(
      'Duplicate AE physical storage');
    var access = options.access || 'readwrite';
    if (!['read', 'write', 'readwrite'].includes(access)) throw Error(
      'Invalid AE storage access');
    var priority = options.priority == null ? 0 : options.priority;
    if (!Number.isSafeInteger(priority)) throw Error('Invalid AE storage priority');
    if (!stored) {
      stored = {
        adapter: adapter,
        bindings: []
      };
      this.stores.set(adapter.id, stored);
      this.owners.set(adapter.storage, adapter);
    }
    var binding = {
      node: node,
      read: access !== 'write',
      write: access !== 'read',
      filter: filter(options),
      priority: priority,
      fuzzy: !!options.fuzzy,
      accepts: options.accepts
    };
    stored.bindings.push(binding);
    this.revision++;
    var self = this;
    return function() {
      var i = stored.bindings.indexOf(binding);
      if (i < 0) return;
      stored.bindings.splice(i, 1);
      if (!stored.bindings.length) {
        self.stores.delete(adapter.id);
        self.owners.delete(adapter.storage);
      }
      self.revision++;
    };
  };
  Network.prototype.routes = function(node, r, operation) {
    var generation = this.graph.revision + ':' + this.revision;
    if (this.routeGeneration !== generation) {
      this.routeCache.clear();
      this.routeGeneration = generation;
    }
    var key = JSON.stringify([this.graph.component(node), R.identity(r), operation]),
      cached = this.routeCache.get(key),
      self = this;
    if (!cached) {
      cached = [];
      this.stores.forEach(function(s) {
        var candidates = s.bindings.filter(function(b) {
          return b[operation] && allows(b.filter, r) && self.graph.reaches(node, b.node, r,
            operation);
        });
        if (candidates.length) cached.push({
          adapter: s.adapter,
          bindings: candidates,
          priority: Math.max.apply(null, candidates.map(function(b) {
            return b.priority;
          })),
          fuzzy: candidates.some(function(b) { return b.fuzzy; })
        });
      });
      /* AE2：注入从高优先级开始，抽取从低优先级开始 */
      var sign = operation === 'write' ? -1 : 1;
      cached.sort(function(a, b) {
        return sign * (a.priority - b.priority) || a.adapter.id.localeCompare(b.adapter.id);
      });
      if (this.routeCache.size >= 2048) this.routeCache.clear();
      this.routeCache.set(key, cached);
    }
    return cached.filter(function(route) {
      return (!route.adapter.valid || route.adapter.valid()) && route.bindings.some(function(b) {
        return !b.accepts || b.accepts(r, operation);
      });
    });
  };
  Network.prototype.snapshot = function(node) {
    if (this.retired) return [];
    var self = this,
      list = [];
    this.stores.forEach(function(s) {
      if (s.adapter.valid && !s.adapter.valid()) return;
      (self.resourceReader ? self.resourceReader(s.adapter) : s.adapter.resources(s.adapter.read()))
      .forEach(function(r) {
        if (!r || !r.key) { try { console.error('SNAP BAD adapter=' + (s.adapter && s.adapter.id) + ' r=' + JSON.stringify(r) + ' data=' + JSON.stringify(s.adapter.read && s.adapter.read()).slice(0, 300)); } catch (e) {} }
        if (s.bindings.some(function(b) {
            return b.read && (!b.accepts || b.accepts(r, 'read')) && allows(b.filter, r) && self
              .graph.reaches(node, b.node,
                r, 'read');
          })) list.push(r);
      });
    });
    return R.merge(list);
  };
  Network.prototype.readableStores = function(node) {
    if (!this.status(node).ok) return [];
    var graph = this.graph,
      start = graph.component(node),
      queue = [start], reachable = new Set(queue);
    for (var i = 0; i < queue.length; i++) {
      for (var edge of graph.edges.get(queue[i]) || []) {
        if (!edge.read || reachable.has(edge.to) || graph.available && !graph.available(edge.to)) continue;
        reachable.add(edge.to);
        queue.push(edge.to);
      }
    }
    return Array.from(this.stores.values()).filter(function(store) {
      return (!store.adapter.valid || store.adapter.valid()) && store.bindings.some(function(binding) {
        return binding.read && reachable.has(graph.component(binding.node));
      });
    }).map(function(store) { return store.adapter; });
  };
  // Check both readable stores and destinations such as GT input buses, whose
  // contents can block an interface without becoming extractable ME stock.
  Network.prototype.hasStored = function(node, matches) {
    if (!this.status(node).ok) return false;
    var graph = this.graph, component = graph.component(node), queue = [component], reachable = new Set(queue);
    for (var i = 0; i < queue.length; i++) {
      for (var edge of graph.edges.get(queue[i]) || []) {
        if (reachable.has(edge.to) || graph.available && !graph.available(edge.to)) continue;
        reachable.add(edge.to);
        queue.push(edge.to);
      }
    }
    for (var store of this.stores.values()) {
      var bindings = store.bindings.filter(function(b) { return reachable.has(graph.component(b.node)); });
      var adapter = store.adapter;
      if (!bindings.length || adapter.valid && !adapter.valid()) continue;
      var resources = this.resourceReader ? this.resourceReader(adapter) : adapter.resources(adapter.read());
      for (var resource of resources) {
        if (!matches(resource)) continue;
        for (var binding of bindings) {
          if (!allows(binding.filter, resource)) continue;
          for (var operation of ['read', 'write']) {
            if (binding[operation] && (!binding.accepts || binding.accepts(resource, operation)) &&
                graph.reaches(node, binding.node, resource, operation)) return true;
          }
        }
      }
    }
    return false;
  };
  Network.prototype.transaction = function() {
    var self = this,
      g = this.graph.revision,
      r = this.revision;
    var tx = new ST.Transaction(function() {
      return self.graph.revision === g && self.revision === r;
    });
    tx.onCommit = function() {
      self.inventoryRevision++;
    };
    return tx;
  };
  Network.prototype.status = function(node) {
    var component = this.graph.component(node);
    if (!this.retired && component != null && this.graph.status) return this.graph.status(component);
    return this.retired || component == null ? {
      ok: false,
      code: 'DISCONNECTED'
    } : this.graph.available && !this.graph.available(component) ? {
      ok: false,
      code: 'NO_POWER'
    } : {
      ok: true
    };
  };
  Network.prototype.extract = function(tx, node, requirements, exclude) {
    var status = this.status(node);
    if (!status.ok) return status;
    var moved=[];
    for (var r of R.merge(requirements)) {
      var left = r.amount;
      for (var route of this.routes(node, r, 'read')) {
        var a = route.adapter;
        if (sharesStorage(a.storage, exclude)) continue;
        var entries = a.resources(tx.read(a)), n = 0;
        if (route.fuzzy) {
          /* 模糊抽取：同 id/meta 不同 NBT 也认 */
          n = entries.filter(function(x) { return x.kind === r.kind && x.key === r.key; })
            .reduce(function(sum, x) { return sum + x.amount; }, 0);
          n = Math.min(left, n);
          var rest = n;
          entries.filter(function(x) { return x.kind === r.kind && x.key === r.key; }).forEach(function(x) {
            if (!rest) return;
            var take = Math.min(rest, x.amount);
            if (take && !tx.edit(a, [R.amount(x, take)], [])) throw Error('AE extraction plan disagrees with storage');
            if(take)moved.push(R.amount(x,take));
            rest -= take;
          });
        } else n = Math.min(left, ST.count(entries, r));
        if (n) {
          if (!route.fuzzy && !tx.edit(a, [R.amount(r, n)], [])) throw Error(
            'AE extraction plan disagrees with storage');
          if(!route.fuzzy)moved.push(R.amount(r,n));
          left -= n;
        }
        if (!left) break;
      }
      if (left) return {
        ok: false,
        code: 'MISSING',
        resource: R.amount(r, left)
      };
    }
    return {
      ok: true,moved:R.merge(moved)
    };
  };
  Network.prototype.insert = function(tx, node, resources, exclude) {
    return this.incoming?this.incoming(tx,node,resources,exclude):this.insertRaw(tx,node,resources,exclude);
  };
  Network.prototype.insertRaw = function(tx, node, resources, exclude) {
    var status = this.status(node);
    if (!status.ok) return Object.assign(status, {
      moved: [],
      remaining: resources.slice()
    });
    var moved = [],
      remaining = [];
    for (var r of R.merge(resources)) {
      var left = r.amount;
      for (var route of this.routes(node, r, 'write')) {
        var a = route.adapter;
        if (sharesStorage(a.storage, exclude)) continue;
        var n = Math.min(left, a.room(tx.read(a), r));
        if (n) {
          if (!tx.edit(a, [], [R.amount(r, n)])) throw Error(
            'AE insertion plan disagrees with storage');
          left -= n;
        }
        if (!left) break;
      }
      if (r.amount > left) moved.push(R.amount(r, r.amount - left));
      if (left) remaining.push(R.amount(r, left));
    }
    return {
      ok: !remaining.length,
      moved: moved,
      remaining: remaining
    };
  };
  Network.prototype.take = function(node, target, requirements) {
    requirements = requirements.map(R.normalize);
    var tx = this.transaction(),
      result = this.extract(tx, node, requirements, target.storage);
    if (!result.ok) return result;
    if (!tx.edit(target, [], result.moved)) return {
      ok: false,
      code: 'FULL'
    };
    return tx.commit();
  };
  Network.prototype.store = function(node, source, resources, partial) {
    resources = resources.map(R.normalize);
    var tx = this.transaction(),
      result = this.insert(tx, node, resources, source.storage);
    if (result.code) return result;
    if (!result.ok && !partial) return {
      ok: false,
      code: 'FULL'
    };
    if (!tx.edit(source, result.moved, [])) return {
      ok: false,
      code: 'MISSING'
    };
    var committed = tx.commit();
    return Object.assign(committed, committed.ok ? result : {}, committed.ok ? {
      ok: result.ok || !!partial
    } : {});
  };
  root.AE_NETWORK = {
    Graph: Graph,
    Network: Network,
    allows: allows
  };
})(typeof window !== 'undefined' ? window : globalThis);
