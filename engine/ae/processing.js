(function(root) {
  'use strict';
  var R = AE_RESOURCES,
    ST = AE_STORAGE,
    TX = GTTransactions,
    cache = new WeakMap(), watchedNetworks = new WeakMap();

  function trackedNetwork(network) {
    var prior = watchedNetworks.get(network);
    if (prior && prior.revision === network.revision) return prior.tracked;
    var tracked = true;
    // Physical containers may be changed by pipes outside AE transactions.
    // Without their own revision, keep polling rather than sleeping on a stale
    // disk-only revision. Inspect descriptors once per topology/power revision.
    for (var store of network.stores.values()) {
      if (!store.adapter.commitTracked) { tracked = false; break; }
    }
    watchedNetworks.set(network, {revision: network.revision, tracked: tracked});
    return tracked;
  }

  function compatible(m) {
    return MULTIBLOCKS.live(m) && MULTIBLOCKS.ports(m).some(function(p) {
      var s = PROCESSING_ACCESS.portInfo(p);
      return s && s.me && (s.stocking || s.patterns);
    });
  }

  function selection(node, values, kind) {
    var samples = (node.state.samples || []).filter(function(r) {
      return r && r.kind === kind;
    });
    if (node.spec.automatic && node.state.automatic !== false && !samples.length) return values.filter(
      function(r) {
        return r.kind === kind;
      }).slice(0, node.spec.samples || 16);
    return samples;
  }

  function build(c, m, groupUid, sourceFilter) {
    var definition = STRUCTURES.instance(m),
      sources = new Map(),
      networks = new Map(),
      multi = MULTIBLOCKS.live(m),
      group = multi ? MULTIBLOCKS.input(m, groupUid) : null,
      graphRevision = c.graph.revision,
      networkRevision = c.network.revision;

    function add(adapter, allowed) {
      var source = sources.get(adapter.storage);
      if (!source) {
        source = {
          adapter: adapter,
          permissions: new Set()
        };
        sources.set(adapter.storage, source);
      }
      source.permissions.add(allowed || 'all');
    }

    function permitted(source, r, id) {
      return source.permissions.has('all') || source.permissions.has(r.kind) || source.permissions.has(id ||
        R.identity(r));
    }

    function network(nodeId, kind) {
      var node = c.byId.get(nodeId);
      if (!node || !c.network.status(nodeId).ok) return;
      var automatic = node.spec.automatic && node.state.automatic !== false && !(node.state.samples || []).some(function(r) { return r && r.kind === kind; }),
        byType = node.spec.stockingTypes && kind === 'item',
        selected = byType ? AE_ITEM_TYPE_STOCK.candidates(c, node) : selection(node, automatic ? AE_FACTORY.snapshot(c, nodeId) : [], kind);
      var component = c.graph.component(nodeId),
        access = networks.get(component);
      if (!access) {
        access = {
          node: nodeId,
          resources: new Map()
        };
        networks.set(component, access);
      }
      if (byType) access.indexed = true;
      selected.forEach(function(r) {
        access.resources.set(R.identity(r), r);
      });
    }

    function items(arr, limit, valid) {
      for (var i = 0; i < limit; i++) add(AE_ADAPTERS.itemSlot(arr, i, valid), 'item');
    }

    function fluids(arr, caps, valid) {
      caps.forEach(function(cap, i) {
        add(AE_ADAPTERS.fluidSlot(arr, i, cap, valid), 'fluid');
      });
    }
    PROCESSING_ACCESS.sources(m, groupUid).filter(function(src){return !sourceFilter||sourceFilter(src);}).forEach(function(src) {
      var owner = src.owner;
      if (src.role === 'pattern') {
        var buffer = AE_FACTORY.portState(owner).buffer,
          adapter = ST.buffer(owner.uid + ':pattern-buffer', buffer);
        adapter.valid = src.valid;
        add(adapter);
      } else if (src.role === 'stocking') network(owner.uid, src.kind);
      else if (src.kind === 'item') items(src.array, src.slots, src.valid);
      else fluids(src.array, src.capacities, src.valid);
    });
    var physical = new Map(sources),
      plans = [];
    networks.forEach(function(access) {
      var plan = AE_READ_INDEX.networkSelection(c, access.node, Array.from(access.resources.values()), access.indexed);
      plans.push(plan);
      plan.owners.forEach(function(s, storage) {
        var old = sources.get(storage);
        if (!old) sources.set(storage, {
          adapter: s.adapter,
          permissions: new Set(s.permissions)
        });
        else s.permissions.forEach(function(id) {
          old.permissions.add(id);
        });
      });
    });
    var totals = new Map();

    function sum(r) {
      var id = R.identity(r),
        old = totals.get(id);
      if (old) old.amount = R.add(old.amount, r.amount);
      else totals.set(id, R.amount(r, r.amount));
    }
    if (plans.length === 1) {
      plans[0].resources.forEach(sum);
      physical.forEach(function(s, storage) {
        var shared = plans[0].owners.get(storage);
        AE_READ_INDEX.selected(c, s.adapter, s.permissions).forEach(function(r) {
          if (!shared || !shared.permissions.has(R.identity(r))) sum(r);
        });
      });
    } else sources.forEach(function(s) {
      AE_READ_INDEX.selected(c, s.adapter, s.permissions).forEach(sum);
    });
    var values = Array.from(totals.values()),
      circuits = multi ? group.circuits : m.circuitConfigured ? [m.circ | 0] : [];
    function stage(tx,consumed){
      if(c.network.retired||c.graph.revision!==graphRevision||c.network.revision!==networkRevision)return false;
      for(var r of R.merge(consumed)){var left=r.amount;for(var s of sources.values()){
        if(!permitted(s,r))continue;var count=Math.min(left,ST.count(s.adapter.resources(tx.read(s.adapter)),r));
        if(count){if(!tx.edit(s.adapter,[R.amount(r,count)],[]))return false;left-=count;}if(!left)break;
      }if(left)return false;}return true;
    }
    return {
      stage:stage,
      items: values.filter(function(r) {
        return r.kind === 'item';
      }).map(R.native),
      fluids: values.filter(function(r) {
        return r.kind === 'fluid';
      }).map(R.native),
      circuits: circuits,
      commit: function(checked) {
        if (c.network.retired || c.graph.revision !== graphRevision || c.network.revision !==
          networkRevision) return false;
        var consumed = checked.itemPlan.consumed.map(R.item).concat(checked.fluidPlan.consumed.map(R
            .fluid)),
          tx = c.network.transaction();
        if(!stage(tx,consumed))return false;
        var committed=tx.commit().ok;
        if(committed&&networks.size&&root.AE_PROGRESS)AE_PROGRESS.stocked(c,m,groupUid);
        return committed;
      }
    };
  }

  function view(m, world, groupUid) {
    var S = world && world.state || ENGINE.state,
      c = AE_FACTORY.peek(S) || AE_FACTORY.get(S),
      key = [ENGINE.tick || 0, c.graph.revision, c.network.revision, c.network.inventoryRevision,
        AE_READ_INDEX.revision, groupUid
      ].join('|'),
      prior = cache.get(m);
    if (prior && prior.key === key) return prior.view;
    var value = build(c, m, groupUid);
    cache.set(m, {
      key: key,
      view: value
    });
    return value;
  }
  // Source-addressed snapshots and a single storage transaction. Processing
  // policies choose which receiver source to use; AE only supplies storage IO.
  PROCESSING_INPUT_POLICY.registerStores('ae',function(m,world,group){
    if(!compatible(m))return;
    var S=world&&world.state||ENGINE.state,c=AE_FACTORY.peek(S)||AE_FACTORY.get(S);
    var views=PROCESSING_ACCESS.sources(m,group).map(function(src){
      var access=build(c,m,group,function(v){return v.owner===src.owner&&v.kind===src.kind;});
      var items=access.items,fluids=access.fluids;
      if(!src.role){items=src.kind==='item'?TX.clone(src.array):[];fluids=src.kind==='fluid'?TX.clone(src.array):[];}
      else if(src.role==='stocking'){
        var node=c.byId.get(src.owner.uid);
        if(node&&!node.spec.stockingTypes){var selected=selection(node,access.items.map(R.item).concat(access.fluids.map(R.fluid)),src.kind);
          var available=new Map(access.items.map(R.item).concat(access.fluids.map(R.fluid)).map(function(r){return[R.identity(r),r];}));
          var ordered=selected.map(function(r){var value=R.native(r),n=(available.get(R.identity(r))||{}).amount||0;if(r.kind==='item')value.n=n;else value.mb=n;return value;});
          items=src.kind==='item'?ordered:[];fluids=src.kind==='fluid'?ordered:[];
        }
      }
      return {owner:src.owner.uid,kind:src.kind,items:items,fluids:fluids,access:access};
    });
    return {views:views,transact:function(allocations,dry){var tx=c.network.transaction();
      for(var v of views){var resources=allocations.filter(function(a){return a.owner===v.owner&&a.kind===v.kind;}).map(function(a){return a.kind==='item'?R.item({k:a.k,n:a.n}):R.fluid({f:a.f,mb:a.mb});});
        if(resources.length&&!v.access.stage(tx,resources))return false;}
      return dry?true:tx.commit().ok;
    }};
  });
  PROCESSING_ACCESS.register('ae', {
    watch: function(m, world, add) {
      if (!compatible(m)) return;
      var S = world && world.state || ENGINE.state, c = AE_FACTORY.peek(S);
      if (!c) return false;
      var sources = PROCESSING_ACCESS.sources(m);
      if (sources.some(function(src) { return src.role === 'stocking'; }) && !trackedNetwork(c.network)) return false;
      add(c); add(c.graph); add(c.network); add(c.graph.revision); add(c.network.revision);
      add(c.network.inventoryRevision); add(AE_READ_INDEX.revision);
      sources.forEach(function(src) {
        if (!src.role) return;
        var state = AE_FACTORY.portState(src.owner);
        add(state); add(state.automatic);
        for (var field of ['samples', 'buffer', 'itemTypes']) {
          var entries = state[field] || [];
          add(entries.length);
          entries.forEach(function(r) {
            if (typeof r === 'string') add(r);
            else { add(r && r.kind); add(r && r.key); add(r && r.amount); }
          });
        }
      });
    },
    candidates: function(m, definition, group, world) {
      if(!compatible(m))return;
      var uid=group&&group.uid||null,source=view(m,world,uid);
      return CONTENT.processingCandidates(definition.recipeMap,source.items,source.fluids);
    },
    input: function(m, recipe, world, options) {
      if(!compatible(m))return;
      return view(m,world,options.inputGroup||null);
    }
  });
  PROCESSING_ACCESS.registerInlet('me-buffer',function(m,port){
    if(!port)return;
    var spec=PROCESSING_ACCESS.portInfo(port);
    if(!spec||!spec.patterns)return;
    var buffer=AE_FACTORY.portState(port).buffer;
    return {configuration:port,bindings:[{kind:'buffer',owner:port,array:buffer,
      valid:function(){return ENTITIES.active(m)&&MULTIBLOCKS.byUid(m,port.uid)===port&&port.me.buffer===buffer;},
      accepts:function(kind,key){return !buffer.length&&(kind==='item'||spec.dual&&kind==='fluid');}}]};
  });
  root.AE_PROCESSING = {
    compatible: compatible,
    view: view,
    invalidate: function(m) { cache.delete(m); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
