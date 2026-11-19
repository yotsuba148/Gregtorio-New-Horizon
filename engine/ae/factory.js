(function(root) {
  'use strict';
  var sessions = new WeakMap(),
    deviceSessions = new WeakMap(),
    hooks = new Map(),
    DIR = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0]
    ],
    R = AE_RESOURCES;

  function portState(p) {
    if (!p.me) p.me = {
      version: 1,
      samples: []
    };
    if (p.me.version !== 1 || !Array.isArray(p.me.samples)) throw Error('Invalid ME hatch settings');
    var s = PROCESSING_ACCESS.portInfo(p) || {};
    if (s.patterns) {
      if (!p.me.patterns) p.me.patterns = Array(s.patternSlots).fill(null);
      if (!p.me.buffer) p.me.buffer = [];
    }
    if (s.fluidOut && !p.me.outputFluids) {
      p.me.outputFluids = (p.tanks || []).filter(Boolean);
      if (p.tanks) p.tanks = p.tanks.map(function() {
        return null;
      });
    }
    return p.me;
  }

  function collect(S,c) {
    var out = [];
    c.entities=new Map();
    (S.fx.machines || []).forEach(function(m) {
      c.entities.set(String(m.uid),m);
      if (!ENTITIES.isGrid(m)) return;
      var d = AE_DEVICES.spec(m);
      if (d) {
        var state = AE_DEVICES.ensure(m),
          side = m.outFace == null ? d.role === 'interface' ? -1 : 1 : m.outFace;
        if (AE_UPGRADES.supports(m)) AE_UPGRADES.reconcile(S, m);
        out.push({
          id: m.uid,
          board: m.location.blueprintId,
          dimension: m.location.dim || 'overworld',
          x: m.x,
          y: m.y,
          sides: d.role === 'power_bridge' ? 0 : (d.target || d.role === 'interface' && side >= 0) ? 15 & ~(1 << side) : 15,
          side: side,
          color: d.color,
          role: d.role,
          entity: m,
          state: state,
          spec: d
        });
      }
      if (MULTIBLOCKS.live(m)) MULTIBLOCKS.ports(m).forEach(function(p) {
        var spec = PROCESSING_ACCESS.portInfo(p);
        if (!spec || !spec.me || !PROCESSING_ACCESS.portAvailable(m,p)) return;
        var f = MULTIBLOCKS.worldFace(m, p.face);
        out.push({
          id: p.uid,
          board: m.location.blueprintId,
          x: f.x,
          y: f.y,
          sides: 1 << f.side,
          side: f.side,
          role: 'port',
          entity: m,
          port: p,
          state: portState(p),
          spec: spec
        });
      });
    });
    AE_CONTROLLERS.physical(out);
    return out.sort(function(a, b) {
      return a.id.localeCompare(b.id);
    });
  }

  function linked(a, b, side, powerOnly) {
    if (a.board !== b.board || b.x !== a.x + DIR[side][0] || b.y !== a.y + DIR[side][1]) return false;

    function mask(n) {
      return powerOnly && n.role === 'power_bridge' ? (1 << n.side) | (1 << ((n.side + 2) % 4)) : n.sides;
    }
    return !!(mask(a) & (1 << side)) && !!(mask(b) & (1 << ((side + 2) % 4))) &&
      (a.color == null || b.color == null || a.color === 16 || b.color === 16 || a.color === b.color);
  }

  function neighbors(c, n, powerOnly) {
    var out = [];
    DIR.forEach(function(d, side) {
      (c.cells.get(n.board + ':' + (n.x + d[0]) + ',' + (n.y + d[1])) || []).forEach(function(other) {
        if (linked(n, other, side, powerOnly)) out.push({
          node: other,
          side: side
        });
      });
    });
    return out;
  }

  function connectionMask(c, n) {
    return neighbors(c, n, true).reduce(function(mask, v) {
      return mask | (1 << v.side);
    }, 0);
  }

  function location(n) {
    return n.board + ':' + n.x + ',' + n.y;
  }

  function target(c, n) {
    var p = DIR[n.side];
    return (c.cells.get(n.board + ':' + (n.x + p[0]) + ',' + (n.y + p[1])) || []).find(function(v) {
      return v.role === 'interface';
    });
  }

  function stocked(n, state) {
    return (n.spec.fluids ? state.fluidStock || [] : state.stock || []).some(Boolean);
  }

  function physical(c, n) {
    var d = DIR[n.side],
      b = c.state.fx.blueprints.find(function(b) {
        return b.id === n.board;
      });
    return b ? AE_ADAPTERS.at(c, BLUEPRINTS.view(c.state.fx, b), (n.x + d[0]) + ',' + (n.y + d[1]), (n
      .side + 2) % 4) : [];
  }

  function networkStatus(c, component, powered) {
    var controller = c.controllerStates.get(component), members = c.members.get(component);
    if (controller && controller.code === 'CONTROLLER_CONFLICT')
      return {ok:false,code:controller.code,reason:controller.reason};
    if (powered) return {ok:true};
    return {ok:false,code:!members || members.length === 1 &&
      !members[0].spec.energyCapacity && !members[0].spec.creativePower ? 'DISCONNECTED' : 'NO_POWER'};
  }
  function machineStatus(status) {
    if (status.ok) return {code:'STORAGE',text:'已连接'};
    if (status.code === 'CONTROLLER_CONFLICT') return {code:'ME_CONTROLLER_CONFLICT',text:'ME控制器冲突'};
    if (status.code === 'DISCONNECTED') return {code:'ME_DISCONNECTED',text:'ME网络未连接'};
    return {code:'ENERGY',text:'ME网络断电'};
  }
  function create(S) {
    var c = {
      state: S,
      graph: new AE_NETWORK.Graph(),
      network: null,
      nodes: [],
      byId: new Map(),
      cells: new Map(),
      members: new Map(),
      online: new Map(),
      controllerStates: new Map(),
      signature: null,
      storeSignature: null,
      lastTick: null
    };
    c.graph.status = function(component) {
      return networkStatus(c, component, c.online.get(component) === true);
    };
    c.graph.available = function(component) {
      return c.graph.status(component).ok;
    };
    sessions.set(S, c);
    return c;
  }

  function prepare(S) {
    FACTORY_STATE.ensure(S);
    var c = sessions.get(S) || create(S),
      nodes = collect(S,c),
      signature = JSON.stringify(nodes.map(function(n) {
        return [n.id, n.board, n.dimension, n.x, n.y, n.sides, n.side, n.color, n.entity.k, n.port && n.port.k, n
          .state
          .samples, n.state.upgrades, n.state.access, n.state.priority, (n.state.stock || []).some(Boolean), (n.state
            .fluidStock || []).some(Boolean), n.role === 'wireless' ? n.state.channel : null
        ];
      }));
    c.nodes = nodes;
    c.patternIndex = null;
    c.byId = new Map(nodes.map(function(n) {
      deviceSessions.set(n.entity, c);
      return [n.id, n];
    }));
    c.cells = new Map();
    if(!c.readEpoch)resetReads(c);
    nodes.forEach(function(n) {
      var k = location(n),
        list = c.cells.get(k) || [];
      list.push(n);
      c.cells.set(k, list);
    });
    if (signature !== c.signature) {
      resetReads(c);
      var edges = [],
        bridges = [],
        wireless = new Map();
      nodes.forEach(function(n) {
        neighbors(c, n, false).forEach(function(link) {
          if (n.id < link.node.id) edges.push({
            from: n.id,
            to: link.node.id
          });
        });
        if (n.role === 'storage_bus') {
          var other = target(c, n);
          if (other && !stocked(n, other.state)) bridges.push({
            from: n.id,
            to: other.id,
            access: n.state.access,
            samples: AE_UPGRADES.samples(n.entity),
              inverted: AE_UPGRADES.invert(n.entity),
              fuzzy: AE_UPGRADES.count(n.entity, 'fuzzy') > 0,
            kinds: n.spec.fluids ? ['fluid'] : ['item']
          });
        }
        // 同频道的无线接入器连成一条不限距离的边
        if (n.role === 'wireless' && n.state.channel) {
          var key = JSON.stringify([n.dimension,n.state.channel]);
          var head = wireless.get(key);
          if (head == null) wireless.set(key, n.id);
          else edges.push({from: head, to: n.id});
        }
      });
      c.graph.replace(nodes.map(function(n) {
        return n.id;
      }), edges, bridges);
      c.controllerStates = AE_CONTROLLERS.inspect(c);
      c.members = new Map();
      nodes.forEach(function(n) {
        var component = c.graph.component(n.id), members = c.members.get(component) || [];
        members.push(n); c.members.set(component, members);
      });
      c.signature = signature;
      c.storeSignature = null;
    }
    refreshStorages(c);
    if (nodes.length || S.ae) {
      var state = AE_STATE.ensure(S);
      clusterCPUs(c, state);
      if (!c.orders) c.orders = new AE_ORDERS.Engine(S, c.network, {
        onEvent: function(e) {
          if (root.AE_PROGRESS) AE_PROGRESS.order(S, e);
          if (e.kind === 'completed') SIMULATION.emit(S, {
            type: 'ae-order-completed', order: e.order, target: GTTransactions.clone(e.production || e.target)
          });
        },
        patterns: function(node) {
          return patterns(c, node);
        },
        parallelFor: function(cpu) {
          return cpu.parallel || 1;
        }
      });
    }
    return c;
  }

  function refreshStorages(c) {
    var nodes=c.nodes, signature=c.signature;
    var bindings = [];
    nodes.forEach(function(n) {
      if (n.role === 'drive') n.state.cells.forEach(function(stack, i) {
        if (!stack) return;
        var a = AE_CELLS.adapter(stack);
        if (!a) throw Error('ME drive contains a non-cell item');
        a.valid = function() {
          return ENTITIES.active(n.entity) && n.state.cells[i] === stack;
        };
        bindings.push({
          node: n.id,
          adapter: a,
          options: {
            priority: n.state.priority || 0
          }
        });
      });
      if (n.role === 'storage_bus') {
        var other = target(c, n);
        if (other && !stocked(n, other.state)) return;
        physical(c, n).forEach(function(binding) {
          bindings.push({
            node: n.id,
            adapter: binding.adapter,
            options: {
              access: n.state.access,
              priority: n.state.priority,
              fuzzy: !!(root.AE_UPGRADES && root.AE_UPGRADES.count(n.entity, 'fuzzy') > 0),
              samples: AE_UPGRADES.samples(n.entity),
              inverted: AE_UPGRADES.invert(n.entity),
              fuzzy: AE_UPGRADES.count(n.entity, 'fuzzy') > 0,
              kinds: n.spec.fluids ? ['fluid'] : ['item'],
              accepts: binding.accepts
            }
          });
        });
      }
    });
    hooks.forEach(function(h) {
      if (h.storages) h.storages(c, bindings);
    });
    var storeSignature = JSON.stringify(bindings.map(function(b) {
      return [b.node, b.adapter.id, b.adapter.capacity, b.options.access, b.options.priority, b
        .options.samples, b.options.inverted, b.options.fuzzy, b.options.kinds
      ];
    }));
    // 拓扑变化时存储的归属也跟着变，网络对象必须重建
    if (storeSignature !== c.storeSignature || c.networkTopology !== signature) {
      c.networkTopology = signature;
      if (c.network) {
        c.network.revision++;
        c.network.retired = true;
      }
      c.network = new AE_NETWORK.Network(c.graph);
      c.network.incoming=function(tx,node,resources,exclude){return AE_DELIVERY.insert(c,tx,node,resources,exclude);};
      c.network.resourceReader = function(adapter) {
        return AE_READ_INDEX.resources(c, adapter);
      };
      bindings.forEach(function(b) {
        c.network.attach(b.node, b.adapter, b.options);
      });
      c.storeSignature = storeSignature;
    }
    if(c.orders)c.orders.network=c.network;
  }

  function clusterCPUs(c, state) {
    var pool = new Map(c.nodes.filter(function(n) {
      return n.role === 'cpu' || n.role === 'cpu_unit';
    }).map(function(n) {
      return [n.id, n];
    }));
    c.cpuFor = new Map();
    while (pool.size) {
      var first = pool.values().next().value,
        group = [],
        queue = [first];
      pool.delete(first.id);
      while (queue.length) {
        var n = queue.pop();
        group.push(n);
        DIR.forEach(function(d) {
          (c.cells.get(n.board + ':' + (n.x + d[0]) + ',' + (n.y + d[1])) || []).forEach(function(
            other) {
            if (pool.has(other.id)) {
              pool.delete(other.id);
              queue.push(other);
            }
          });
        });
      }
      var units = group.filter(function(n) {
        return n.role === 'cpu';
      });
      if (!units.length) continue;
      var existing = state.cpus.filter(function(cpu) {
          return units.some(function(n) {
            return n.id === cpu.id;
          });
        }),
        busy = existing.filter(function(cpu) {
          return cpu.order || cpu.planTarget || cpu.resources.length;
        }),
        anchor = busy[0] || existing[0] || AE_STATE.createCPU(c.state, units[0].id, units[0].id),
        capacity = units.reduce(function(sum, n) {
          return sum + n.spec.craftingBytes;
        }, 0),
        parallel = 1 + group.reduce(function(sum, n) {
          return sum + (n.spec.coProcessors || 0);
        }, 0);
      anchor.craftingBytes = capacity;
      anchor.parallel = parallel;
      anchor.nodes = group.map(function(n) {
        return n.id;
      });
      group.forEach(function(n) {
        c.cpuFor.set(n.id, anchor.id);
      });
      state.cpus = state.cpus.filter(function(cpu) {
        return !existing.includes(cpu) || cpu === anchor || busy.includes(cpu);
      });
    }
  }

  function patternEntries(c, node) {
    if(!c.patternIndex){
      var networks=new Map();
      c.nodes.forEach(function(n){
        var slots=n.state&&n.state.patterns;
        if(!slots||n.role==='assembler')return;
        var component=c.graph.component(n.id);
        if(component==null)return;
        var entries=networks.get(component);
        if(!entries){entries=new Map();networks.set(component,entries);}
        var limit=n.role==='interface'?AE_UPGRADES.patternSlots(n.entity):slots.length;
        for(var i=0;i<Math.min(slots.length,limit);i++){
          var raw=slots[i]&&slots[i].aePattern;
          if(!raw||raw.invalid||PROCESSING_CONFIGURATION.circuitConflict(raw.virtual||[]))continue;
          var entry=entries.get(raw.id);
          if(!entry){entry=[];entries.set(raw.id,entry);}
          entry.push({node:n,raw:raw,priority:n.role==='interface'?i-36*(n.state.priority||0):raw.priority||0});
        }
      });
      networks.forEach(function(entries){
        entries.forEach(function(list,id){
          list.sort(function(a,b){return b.priority-a.priority;});
          entries.set(id,{preferred:list[0],providers:Array.from(new Set(list.map(function(entry){return entry.node;})))});
        });
      });
      c.patternIndex=networks;
    }
    return c.patternIndex.get(c.graph.component(node));
  }
  function patterns(c, node) {
    var entries=patternEntries(c,node);
    return entries?Array.from(entries.values(),function(row){
      var entry=row.preferred,pattern=AE_PATTERNS.create(entry.raw);pattern.priority=entry.priority;return pattern;
    }):[];
  }
  function patternProviders(c,node,id){
    var entries=patternEntries(c,node),row=entries&&entries.get(id);
    return row?row.providers:[];
  }

  function power(c) {
    var groups = new Map(),
      changed = false,
      parent = new Map();

    function find(k) {
      var p = parent.get(k);
      if (p == null) return k;
      var root = find(p);
      parent.set(k, root);
      return root;
    }

    function join(a, b) {
      a = find(a);
      b = find(b);
      if (a !== b) parent.set(a, b);
    }
    c.nodes.filter(function(n) {
      return n.role === 'power_bridge';
    }).forEach(function(n) {
      neighbors(c, n, true).forEach(function(link) {
        join(c.graph.component(n.id), c.graph.component(link.node.id));
      });
    });
    c.nodes.forEach(function(n) {
      var key = find(c.graph.component(n.id)),
        g = groups.get(key) || {
          nodes: [],
          sources: [],
          creative: false,
          cost: 0
        };
      g.nodes.push(n);
      if (n.spec.creativePower) g.creative = true;
      g.cost += (n.spec.idleAE == null ? 1 : n.spec.idleAE) / 2;
      if (n.spec.energyCapacity) g.sources.push(n.entity);
      if (n.role === 'drive') n.state.cells.forEach(function(stack) {
        var spec = AE_CELLS.rule(stack);
        if (spec) g.cost += spec.idleAE / 2;
      });
      groups.set(key, g);
    });
    var online = new Map();
    groups.forEach(function(g, key) {
      var available = g.sources.reduce(function(n, m) {
          return n + (m.eu || 0);
        }, 0),
        on = g.creative || available > 0 && available >= g.cost;
      g.nodes.forEach(function(n) {
        online.set(c.graph.component(n.id), on);
      });
      if (on && g.cost && !g.creative) {
        var left = g.cost;
        g.sources.forEach(function(m) {
          var used = Math.min(left, m.eu || 0);
          m.eu -= used;
          left -= used;
        });
        changed = true;
      }
      if (on) {
        var batteries = g.nodes.filter(function(n) {
            return n.role === 'battery';
          }),
          chargers = g.nodes.filter(function(n) {
            return n.spec.receiveEU;
          }).map(function(n) {
            return n.entity;
          });
        for (var b of batteries) {
          var room = Math.max(0, b.spec.energyCapacity - (b.entity.eu || 0));
          for (var source of chargers) {
            if (!room) break;
            var amount = Math.min(room, source.eu || 0);
            source.eu -= amount;
            b.entity.eu = (b.entity.eu || 0) + amount;
            room -= amount;
          }
        }
      }
      g.nodes.forEach(function(n) {
        if (n.role !== 'port') {
          n.entity.status = machineStatus(networkStatus(c, c.graph.component(n.id), on));
        }
      });
    });
    if (JSON.stringify(Array.from(online)) !== JSON.stringify(Array.from(c.online))) {
      c.graph.cache.clear();
      c.network.revision++;
      changed = true;
    }
    c.creativeGroups = new Set(Array.from(groups).filter(function(pair) {
      return pair[1].creative;
    }).map(function(pair) {
      return pair[0];
    }));
    c.online = online;
    c.powerComponent = find;
    return changed;
  }

  function resetReads(c){c.indices=new Map();c.snapshots=new Map();c.readEpoch={};}

  function before(S, tick) {
    var c = prepare(S);
    if (c.lastTick === tick) return false;
    c.lastTick = tick;
    resetReads(c);
    var changed = power(c);
    hooks.forEach(function(h) {
      if (h.before && h.before(c, tick)) changed = true;
    });
    return changed;
  }

  function after(S, tick, sameStep) {
    var c=sessions.get(S),changed=false;
    if(sameStep&&c&&c.lastTick===tick&&c.signature!==null){
      resetReads(c);
      refreshStorages(c);
    }else{
      c=prepare(S);
      resetReads(c);
    }
    hooks.forEach(function(h) {
      if (h.after && h.after(c, tick)) changed = true;
    });
    return changed;
  }

  function register(id, hook) {
    if (!id || hooks.has(id) || !hook) throw Error('Invalid ME factory module: ' + id);
    hooks.set(id, hook);
  }

  function consume(c, node, amount) {
    var key = c.powerComponent ? c.powerComponent(c.graph.component(node)) : c.graph.component(node),
      sources = c.nodes.filter(function(n) {
        return (c.powerComponent ? c.powerComponent(c.graph.component(n.id)) : c.graph.component(n
          .id)) === key && n.spec.energyCapacity;
      }).map(function(n) {
        return n.entity;
      });
    if (c.network.status(node).ok && c.creativeGroups && c.creativeGroups.has(key)) return true;
    if (!c.network.status(node).ok || sources.reduce(function(sum, m) {
        return sum + (m.eu || 0);
      }, 0) < amount) return false;
    var left = amount;
    sources.forEach(function(m) {
      var take = Math.min(left, m.eu || 0);
      m.eu -= take;
      left -= take;
    });
    return true;
  }

  function invalidate(S) {
    var c = sessions.get(S);
    if (c) {
      c.signature = null;
      c.storeSignature = null;
      c.network.revision++;
    }
  }
  ENTITIES.registerLifecycle('ae', {
    removed: function(S, m) {
      if (S.ae) {
        S.ae.cpus = S.ae.cpus.filter(function(cpu) {
          return cpu.id !== m.uid;
        });

      }
      invalidate(S);
    }
  });

  function snapshot(c, node) {
    var revision = [c.graph.revision, c.network.revision, c.network.inventoryRevision, AE_READ_INDEX
      .revision
    ].join('|');
    if (c.snapshotRevision !== revision) {
      c.snapshots.clear();
      c.snapshotRevision = revision;
    }
    var key = c.graph.component(node),
      list = c.snapshots.get(key);
    if (!list) {
      list = c.network.snapshot(node);
      c.snapshots.set(key, list);
    }
    return list.slice();
  }

  function inspect(S, node) {
    var c = prepare(S);
    return {
      node: node,
      status: c.network.status(node),
      component: c.graph.component(node),
      devices: c.nodes.filter(function(n) {
        return c.graph.component(n.id) === c.graph.component(node);
      }).map(function(n) {
        return {
          id: n.id,
          role: n.role,
          key: n.port ? n.port.k : n.entity.k
        };
      }),
      storages: c.network.stores.size,
      resources: snapshot(c, node),
      cpus: (S.ae && S.ae.cpus || []).filter(function(cpu) {
        return c.graph.component(cpu.node) === c.graph.component(node);
      }).map(function(cpu) {
        return {
          id: cpu.id,
          capacity: cpu.craftingBytes,
          parallel: cpu.parallel,
          order: cpu.order ? {
            id: cpu.order.id,
            target: cpu.order.target,
            status: cpu.order.status,
            blocked: cpu.order.blocked,
            failure: cpu.order.failure,
            flights: cpu.order.flights.length
          } : null
        };
      })
    };
  }
  root.AE_FACTORY = {
    prepare: prepare,
    contextFor: function(entity) {
      return deviceSessions.get(entity);
    },
    get: prepare,
    peek: function(S) {
      return sessions.get(S);
    },
    before: before,
    after: after,
    register: register,
    invalidate: invalidate,
    portState: portState,
    physical: physical,
    patterns: patterns,
    patternProviders: patternProviders,
    consume: consume,
    snapshot: snapshot,
    inspect: inspect,
    linked: linked,
    neighbors: neighbors,
    connectionMask: connectionMask,
    machineStatus: machineStatus
  };
})(typeof window !== 'undefined' ? window : globalThis);
