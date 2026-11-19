(function(root) {
  'use strict';
  var ST = AE_STORAGE,
    R = AE_RESOURCES,
    TX = GTTransactions,
    arrays = new WeakMap(),
    sequence = 0;

  function record(arr) {
    var value = arrays.get(arr);
    if (!value) {
      value = {
        id: 'physical:' + (++sequence),
        items: new Map(),
        fluids: new Map(),
        fluid: null
      };
      arrays.set(arr, value);
    }
    return value;
  }

  function endpoint(e) {
    if (e.group) return ST.slots(e.id, e.arr);
    var holder = e.arr && Number.isInteger(e.index) ? itemSlot(e.arr, e.index).storage : {};
    return ST.validate({
      id: e.id,
      storage: e.storage || holder,
      read: function() {
        return [TX.clone(e.get())];
      },
      resources: function(s) {
        return s[0] ? [R.item(s[0])] : [];
      },
      room: function(s, r) {
        if (r.kind !== 'item' || !e.accepts(R.native(r))) return 0;
        var old = s[0];
        if (old && R.identity(R.item(old)) !== R.identity(r)) return 0;
        return Math.max(0, e.cap(R.native(r)) - (old ? TX.count(old) : 0));
      },
      apply: function(s, take, put) {
        var box = ST.slots(e.id, TX.clone(s), {
          slots: 1,
          maxStack: function(k) {
            return e.cap({
              k: k,
              n: 1
            });
          },
          accepts: e.accepts
        });
        return box.apply(s, take, put);
      },
      write: function(s) {
        e.set(s[0] || null);
      }
    });
  }

  function itemSlot(arr, index, valid, notify, capacity) {
    var saved = record(arr),
      old = saved.items.get(index);
    if (old) {
      if (valid) old.valid = valid;
      if (capacity != null) old.capacity = capacity;
      if (notify) old.afterCommit = function(before, next) {
        notify(index, before[0], next[0]);
      };
      return old;
    }
    var cap = ST.slots(saved.id + ':' + index, [null],{
        maxStack: function(k){return Math.min(TRANSPORT_PORTS.capacityForItem(a.capacity,k), CORE.maxStack(k));}
      }),
      a = Object.assign({}, cap);
    a.capacity = capacity;
    a.storage = {
      array: arr,
      index: index
    };
    a.read = function() {
      return [TX.clone(arr[index] || null)];
    };
    a.write = function(next) {
      arr[index] = TX.clone(next[0] || null);
    };
    if (notify) a.afterCommit = function(before, next) {
      notify(index, before[0], next[0]);
    };
    a.valid = valid;
    saved.items.set(index, a);
    return a;
  }

  function fluidArray(arr, caps, valid, accepts) {
    var saved = record(arr);
    if (!saved.fluid) {
      saved.fluid = ST.tanks(saved.id + ':fluid', arr, {
        capacities: caps,
        accepts: accepts
      });
      saved.fluid.valid = valid;
    }
    return saved.fluid;
  }

  function fluidSlot(arr, index, capacity, valid) {
    var saved = record(arr),
      a = saved.fluids.get(index);
    if (a && a.capacity === capacity) {
      if (valid) a.valid = valid;
      return a;
    }
    a = ST.tanks(saved.id + ':fluid:' + index, [null], {
      capacities: [capacity]
    });
    a.storage = {
      array: arr,
      index: index,
      kind: 'fluid'
    };
    a.capacity = capacity;
    a.read = function() {
      return [TX.clone(arr[index] || null)];
    };
    a.write = function(next) {
      arr[index] = TX.clone(next[0] || null);
    };
    a.valid = valid;
    saved.fluids.set(index, a);
    return a;
  }

  function allowedIndices(h) {
    if (h.indices) return h.indices;
    if (h.box.arr !== h.arr) return [];
    return Array.from({
      length: h.box.kind === 'stacks' ? h.box.limit : h.arr.length
    }, function(_, i) {
      return i;
    });
  }
  // Storage discovery reads the same sided ports used by GT pipes and covers.
  function at(context, board, cell, side) {
    var N = ENGINE.networks,
      index = context.indices && context.indices.get(board.id);
    if (!index) {
      index = N.grid(board);
      if (context.indices) context.indices.set(board.id, index);
    }
    var target = index[cell],
      owner = target && target._owner || target;
    var start = owner && {
      uid: owner.uid,
      x: owner.x,
      y: owner.y,
      board: owner.location && owner.location.blueprintId
    };

    function alive() {
      return !start || ENTITIES.active(owner) && owner.uid === start.uid && owner.x === start.x && owner
        .y === start.y && owner.location.blueprintId === start.board;
    }

    function resolve(kind, direction, payload) {
      return alive() ? N.port(board, index, cell, side, kind, direction, payload) : null;
    }
    var items = [],
      fluidParts = [],
      seenItems = new Set(),
      seenFluids = new Set(),
      machine = N.endpoint(target, cell, side, 'item'),
      definition = machine && N.instance(machine);

    function addItems(arr, limit, get, slotCaps) {
      if (!arr || seenItems.has(arr) || !limit) return;
      seenItems.add(arr);
      items.push({
        array: arr,
        limit: limit,
        slotCaps: slotCaps,
        current: function() {
          return alive() && get() === arr;
        }
      });
    }
    if (machine && definition) {
      if (definition.slots.in) addItems(machine.ins, definition.slots.in, function() {
        return machine.ins;
      }, function(slot){return TRANSPORT_PORTS.itemSlotCap(definition,'in',slot);});
      if (definition.slots.out) addItems(machine.outs, definition.slots.out, function() {
        return machine.outs;
      });
    }
    var chest = board.chest && board.chest[cell];
    if (chest && chest.slots) addItems(chest.slots, chest.slots.length, function() {
      return board.chest[cell] && board.chest[cell].slots;
    });
    var exporting = resolve('item', 'export');
    if (exporting && exporting.box) addItems(exporting.arr, exporting.box.kind === 'stacks' ? exporting.box
      .limit : exporting.arr.length,
      function() {
        var h = resolve('item', 'export');
        return h && h.arr;
      });

    function addFluid(h) {
      TRANSPORT_PORTS.fluidParts(h).forEach(function(p) {
        if (p.transient || !p.tanks || !p.caps || seenFluids.has(p.tanks)) return;
        seenFluids.add(p.tanks);
        fluidParts.push(p);
      });
    }
    // Discover the storage independently of a sample fluid. Its sided acceptance
    // is resolved for the requested fluid when a route is actually used.
    var fluidMachine = N.endpoint(target, cell, side, 'fluid');
    if (fluidMachine) {
      ['input', 'output'].forEach(function(role) {
        addFluid(TRANSPORT_PORTS.machineFluid(N, fluidMachine, role));
      });
    }
    ['export', 'import'].forEach(function(direction) {
      addFluid(resolve('fluid', direction));
    });
    var bindings = [];
    items.forEach(function(entry) {
      var arr = entry.array;
      for (var i = 0; i < entry.limit; i++)(function(slot) {
        function hFor(direction, r) {
          var h = resolve('item', direction, r && R.native(r));
          return h && h.arr === arr && h.box && allowedIndices(h).includes(slot) ? h : null;
        }
        var adapter = itemSlot(arr, slot, entry.current, function(changed, before, after) {
          var r = after ? R.item(after) : before ? R.item(before) : null,
            direction = TX.count(after) > TX.count(before) ? 'import' : 'export',
            h = hFor(direction, r);
          if (!h || !h.commit) return;
          if (h.box.arr !== h.arr) {
            var at = allowedIndices(h).indexOf(changed);
            h.box.arr[at] = arr[changed];
          }
          h.commit(direction);
        }, entry.slotCaps && entry.slotCaps(slot));
        bindings.push({
          adapter: adapter,
          accepts: function(r, op) {
            return r.kind === 'item' && !!hFor(op === 'read' ? 'export' : 'import', r);
          }
        });
      })(i);
    });
    fluidParts.forEach(function(part) {
      var arr = part.tanks;

      function parts(direction, f) {
        return TRANSPORT_PORTS.fluidParts(resolve('fluid', direction, f)).filter(function(p) {
          return p.tanks === arr;
        });
      }

      function valid() {
        return alive();
      }
      if(part.fluidPolicy){
        var accepts=function(f){return parts('import',f).some(function(p){return !p.accepts||p.accepts(f);});};
        var grouped=ST.tanks(record(arr).id+':fluid',arr,{capacities:part.caps,fluidPolicy:part.fluidPolicy,accepts:accepts});
        grouped.valid=function(){return valid()&&(!part.valid||part.valid());};
        bindings.push({adapter:grouped,accepts:function(r,op){return r.kind==='fluid'&&parts(op==='read'?'export':'import',r.key).some(function(p){return op==='read'||!p.accepts||p.accepts(r.key);});}});
        return;
      }
      part.caps.forEach(function(cap, index) {
        var a = fluidSlot(arr, index, cap, valid);
        bindings.push({
          adapter: a,
          accepts: function(r, op) {
            return r.kind === 'fluid' && parts(op === 'read' ? 'export' : 'import', r.key)
              .some(function(p) {
                var caps = p.capsFor ? p.capsFor(r.key) : p.caps;
                return (!p.indices || p.indices.includes(index)) && caps[index] > 0 && (
                  op === 'read' || !p.accepts || p.accepts(r.key));
              });
          }
        });
      });
    });
    return bindings;
  }
  function insert(tx, bindings, resources) {
    for(var resource of resources){
      var left=resource.amount, accepts=false;
      for(var binding of bindings){
        if(!binding.accepts(resource,'write'))continue;
        accepts=true;
        var adapter=binding.adapter,count=Math.min(left,adapter.room(tx.read(adapter),resource));
        if(count){if(!tx.edit(adapter,[],[R.amount(resource,count)]))return {ok:false,code:'SLOTS'};left-=count;}
        if(!left)break;
      }
      if(left)return {ok:false,code:accepts?'SLOTS':'MACHINE_INPUT'};
    }
    return {ok:true};
  }
  root.AE_ADAPTERS = {
    insert: insert,
    endpoint: endpoint,
    itemSlot: itemSlot,
    fluidArray: fluidArray,
    fluidSlot: fluidSlot,
    at: at,
    arrayId: function(arr) {
      return record(arr).id;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
