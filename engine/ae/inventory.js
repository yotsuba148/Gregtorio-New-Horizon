(function(root) {
  'use strict';
  var R = AE_RESOURCES,
    ST = AE_STORAGE,
    TX = GTTransactions;
  var blank = 'appliedenergistics2:item.ItemMultiMaterial@52',
    encoded = 'ae2fc:fluid_encoded_pattern@0';

  function nativeEndpoint(e) {
    return AE_ADAPTERS.endpoint(e);
  }

  function transferIn(c, node, source, limit, commit) {
    var stack = source.get(),
      n = Math.min(TX.count(stack), limit),
      r = R.item(Object.assign({}, stack, {
        n: n
      })),
      a = nativeEndpoint(source),
      tx = c.network.transaction(),
      result = c.network.insert(tx, node, [r], a.storage),
      moved = result.moved.reduce(function(n, r) {
        return n + r.amount;
      }, 0);
    if (result.code) return result;
    if (!moved) return {
      ok: false,
      code: 'SLOTS'
    };
    if (!tx.edit(a, [R.amount(r, moved)], [])) return {
      ok: false,
      code: 'SOURCE_CHANGED'
    };
    if (commit) {
      var applied = tx.commit();
      if (!applied.ok) return applied;
    }
    return {
      ok: true,
      k: stack.k,
      moved: moved,
      remaining: TX.count(stack) - moved
    };
  }

  function transferOut(c, node, resource, target, limit, commit) {
    if (target.fluid || target.transfer) return {
      ok: false,
      code: 'TARGET'
    };
    var stack = R.native(resource);
    if (!target.accepts(stack)) return {
      ok: false,
      code: 'ITEM'
    };
    var destination = nativeEndpoint(target),
      n = Math.min(resource.amount, limit, CORE.maxStack(resource.key), destination.room(destination.read(),
        resource));
    if (!n) return {
      ok: false,
      code: 'SLOTS'
    };
    var tx = c.network.transaction(),
      taken = c.network.extract(tx, node, [R.amount(resource, n)], destination.storage);
    if (!taken.ok) return taken;
    if (!tx.edit(destination, [], [R.amount(resource, n)])) return {
      ok: false,
      code: 'SLOTS'
    };
    if (commit) {
      var applied = tx.commit();
      if (!applied.ok) return applied;
    }
    return {
      ok: true,
      k: resource.key,
      moved: n,
      remaining: resource.amount - n
    };
  }

  function fluidHandler(S, node, selected) {
    var c = AE_FACTORY.get(S),
      key = CONTENT.canonicalFluid(selected),
      sample = R.fluid({
        f: key,
        mb: 1
      }),
      available = ST.count(AE_FACTORY.snapshot(c, node), sample);

    function plan(f, n, inserting) {
      var r = R.fluid({
          f: f,
          mb: n
        }),
        tx = c.network.transaction(),
        result = inserting ? c.network.insert(tx, node, [r]) : c.network.extract(tx, node, [r]);
      var moved = result.ok ? n : inserting ? (result.moved || []).reduce(function(sum, r) {
        return sum + r.amount;
      }, 0) : 0;
      return {
        moved: moved,
        commit: function() {
          if (!result.ok && moved !== n) throw Error('ME fluid capacity changed');
          var applied = tx.commit();
          if (!applied.ok) throw Error('ME fluid transaction changed');
        }
      };
    }
    return {
      id: 'me:' + node + ':' + key,
      tanks: [available ? {
        f: key,
        mb: available
      } : null],
      caps: [Number.MAX_SAFE_INTEGER],
      indices: [0],
      forFluid: function(f) {
        return fluidHandler(S, node, f);
      },
      accepts: function() {
        return c.network.status(node).ok;
      },
      inputRoom: function(f) {
        if (!c.network.status(node).ok) return 0;
        var r = R.fluid({
          f: f,
          mb: 1
        });
        return c.network.routes(node, r, 'write').reduce(function(n, s) {
          return R.add(n, s.adapter.room(s.adapter.read(), r));
        }, 0);
      },
      outputAmount: function(f) {
        return ST.count(AE_FACTORY.snapshot(c, node), R.fluid({
          f: f,
          mb: 1
        }));
      },
      inputPlan: function(f, n) {
        return plan(f, n, true);
      },
      outputPlan: function(f, n) {
        return plan(f, n, false);
      }
    };
  }
  function dynamicContainerMove(S,node,selected,source,limit,commit,info){
    var c=AE_FACTORY.get(S),tx=c.network.transaction(),stack=source.get(),collect=!info.amount;
    var fluid=info.fluid||selected;if(!fluid)return {ok:false,code:'FLUID_AMOUNT'};
    var resource=R.fluid({f:fluid,mb:1}),n=Math.min(TX.count(stack),limit),available=collect?ST.count(AE_FACTORY.snapshot(c,node),resource):0;
    if(info.entity){
      var adapter=ST.tanks('portable:'+info.entity.uid,info.entity.tanksIn,{capacities:[info.capacity]}),mb;
      if(collect){mb=Math.min(info.capacity-info.amount,available);if(!mb)return {ok:false,code:'FLUID_AMOUNT'};if(!c.network.extract(tx,node,[R.amount(resource,mb)]).ok||!tx.edit(adapter,[],[R.amount(resource,mb)]))return {ok:false,code:'TANK'};}
      else{var receipt=c.network.insert(tx,node,[R.amount(resource,info.amount)]);mb=ST.count(receipt.moved,resource);if(!mb)return {ok:false,code:'TANK'};if(!tx.edit(adapter,[R.amount(resource,mb)],[]))return {ok:false,code:'SOURCE_CHANGED'};}
      if(commit){var applied=tx.commit();if(!applied.ok)return applied;}
      return {ok:true,k:stack.k,moved:1,remaining:TX.count(stack),mb:mb,operation:collect?'装出':'倒入'};
    }
    var converted=[],total=0;
    if(collect){for(var i=0;i<n&&available>0;i++){var take=Math.min(info.capacity-info.amount,available);if(!take)break;converted.push(FLUID_CONTAINER_ITEMS.converted(info,fluid,info.amount+take));total+=take;available-=take;}}
    else{var receipt=c.network.insert(tx,node,[R.amount(resource,info.amount*n)]),room=ST.count(receipt.moved,resource);for(var i=0;i<n&&room>0;i++){var take=Math.min(info.amount,room);converted.push(FLUID_CONTAINER_ITEMS.converted(info,fluid,info.amount-take));total+=take;room-=take;}}
    if(!converted.length)return {ok:false,code:collect?'FLUID_AMOUNT':'TANK'};
    n=converted.length;tx=c.network.transaction();
    var result=collect?c.network.extract(tx,node,[R.amount(resource,total)]):c.network.insert(tx,node,[R.amount(resource,total)]);if(!result.ok)return result;
    var a=nativeEndpoint(source);if(!tx.edit(a,[R.item(Object.assign({},stack,{n:n}))],[]))return {ok:false,code:'SOURCE_CHANGED'};
    var leftovers=[];
    converted.forEach(function(value){var r=R.item(value),placed=false;
      if(!tx.read(a)[0]&&source.accepts(value)&&a.room(tx.read(a),r)>=1)placed=tx.edit(a,[],[r]);
      for(var i=0;!placed&&i<S.inv.length;i++){if(source.arr===S.inv&&source.index===i)continue;var b=AE_ADAPTERS.itemSlot(S.inv,i);if(b.room(tx.read(b),r)>=1)placed=tx.edit(b,[],[r]);}
      if(!placed)leftovers.push(value);
    });
    if(leftovers.length){var drops={droppedItems:TX.clone(S.droppedItems)};DROPPED_ITEMS.add(drops,leftovers);tx.stage(ST.properties('ae:container-drops',S,['droppedItems']),drops);}
    if(commit){var applied=tx.commit();if(!applied.ok)return applied;}
    return {ok:true,k:stack.k,moved:n,remaining:TX.count(stack)-n,mb:total,operation:collect?'装出':'倒入'};
  }
  function containerMove(S, node, selected, source, limit, commit) {
    var c = AE_FACTORY.get(S), status = c.network.status(node);
    if (!status.ok) return status;
    var stack = source.get();
    var dynamic=root.FLUID_CONTAINER_ITEMS&&FLUID_CONTAINER_ITEMS.inspect(S,stack);
    if(dynamic)return dynamicContainerMove(S,node,selected,source,limit,commit,dynamic);
    if (!stack || TX.isInstance(stack)) return {ok: false, code: 'CONTAINER'};
    var key = CONTENT.canonicalKey(stack.k),
      pair = GD.containerRegistry.find(function(p) { return p.amount > 0 && p.filled === key; }),
      collect = false;
    if (!pair && selected) {
      pair = GD.containerRegistry.find(function(p) {
        return p.amount > 0 && p.empty === key && p.fluid === selected;
      });
      collect = true;
    }
    if (!pair) return {ok: false, code: 'CONTAINER'};
    var resource = R.fluid({f: pair.fluid, mb: pair.amount}),
      n = Math.min(TX.count(stack), limit), tx = c.network.transaction(), result;
    if (collect) {
      n = Math.min(n, Math.floor(ST.count(AE_FACTORY.snapshot(c, node), resource) / pair.amount));
      if (!n) return {ok: false, code: 'FLUID_AMOUNT'};
      result = c.network.extract(tx, node, [R.amount(resource, n * pair.amount)]);
    } else {
      result = c.network.insert(tx, node, [R.amount(resource, n * pair.amount)]);
      if (!result.ok) {
        if (result.code) return result;
        n = Math.floor((result.moved || []).reduce(function(sum, r) { return sum + r.amount; }, 0) / pair.amount);
        if (!n) return {ok: false, code: 'TANK'};
        tx = c.network.transaction();
        result = c.network.insert(tx, node, [R.amount(resource, n * pair.amount)]);
      }
    }
    if (!result.ok) return result;
    var a = nativeEndpoint(source), converted = R.item({k: collect ? pair.filled : pair.empty, n: n});
    if (!tx.edit(a, [R.item(Object.assign({}, stack, {n: n}))], [])) return {ok: false, code: 'SOURCE_CHANGED'};
    var left = n;
    if (n === TX.count(stack) && source.accepts(R.native(converted)) && source.cap(R.native(converted)) >= n) {
      if (!tx.edit(a, [], [converted])) return {ok: false, code: 'SLOTS'};
      left = 0;
    }
    // Return changed containers to the bag; keep untreated containers in their source slot.
    for (var pass = 0; pass < 2 && left; pass++) {
      for (var i = 0; i < S.inv.length && left; i++) {
        var b = source.arr === S.inv && source.index === i ? a : AE_ADAPTERS.itemSlot(S.inv, i),
          before = tx.read(b)[0], same = before && R.identity(R.item(before)) === R.identity(converted);
        if (pass === 0 ? !same : !!before) continue;
        var amount = Math.min(left, b.room(tx.read(b), converted));
        if (amount && tx.edit(b, [], [R.amount(converted, amount)])) left -= amount;
      }
    }
    if (left) {
      var drops = {droppedItems: TX.clone(S.droppedItems)};
      DROPPED_ITEMS.add(drops, [R.native(R.amount(converted, left))]);
      tx.stage(ST.properties('ae:container-drops', S, ['droppedItems']), drops);
    }
    if (commit) {
      var applied = tx.commit();
      if (!applied.ok) return applied;
    }
    return {ok: true, k: stack.k, moved: n, remaining: TX.count(stack) - n,
      mb: n * pair.amount, operation: collect ? '装出' : '倒入'};
  }

  ITEM_TRANSFER.register('ae:network', function(S, ref) {
    var m = ENTITIES.get(S, ref.uid);
    if (!m || !ENTITIES.isGrid(m) || !AE_DEVICES.spec(m)) return null;
    var c = AE_FACTORY.get(S),
      resource = ref.resource && R.normalize(ref.resource);
    var d = AE_DEVICES.spec(m);
    if (d.fluidOnly && resource && resource.kind !== 'fluid') return null;
    if (resource && resource.kind === 'fluid' || d.fluidOnly) return {
      fluid: true,
      cursorTransfer: !!d.fluidOnly,
      kind: 'fin',
      index: 0,
      locked: function() { return !c.network.status(m.uid).ok; },
      lockCode: c.network.status(m.uid).code || 'NO_POWER',
      transfer: function(source, limit, commit) {
        return containerMove(S, m.uid, resource && resource.key, source, limit, commit);
      },
      machine: {meNetworkNode: m.uid, meFluid: resource && resource.key}
    };

    function current() {
      if (!resource) return null;
      return AE_FACTORY.snapshot(c, m.uid).find(function(r) {
        return R.identity(r) === R.identity(resource);
      }) || null;
    }
    return {
      get: function() {
        var r = current();
        return r ? R.native(r) : null;
      },
      accepts: function() {
        return true;
      },
      cap: function() {
        return Number.MAX_SAFE_INTEGER;
      },
      locked: function() {
        return !c.network.status(m.uid).ok;
      },
      lockCode: c.network.status(m.uid).code || 'NO_POWER',
      transfer: function(source, limit, commit) {
        return transferIn(c, m.uid, source, limit, commit);
      },
      transferOut: function(destination, limit, commit) {
        var r = current();
        return r ? transferOut(c, m.uid, r, destination, limit, commit) : {
          ok: false,
          code: 'EMPTY'
        };
      }
    };
  });
  // 判断一个物品是不是装着流体的容器
  var fluidLookup = null;
  function fluidIn(key) {
    var registry = root.GD && GD.containerRegistry;
    if (!registry) return null;
    if (!fluidLookup || fluidLookup.source !== registry) {
      fluidLookup = {source: registry, map: new Map()};
      registry.forEach(function(p) { if (p && p.filled && p.fluid) fluidLookup.map.set(p.filled, p.fluid); });
    }
    return fluidLookup.map.get(key) || null;
  }
  ITEM_TRANSFER.register('ae:slot', function(S, ref) {
    var m = ENTITIES.get(S, ref.uid),
      d = m && AE_DEVICES.spec(m),
      s = d && AE_DEVICES.ensure(m),
      field = ref.field,
      i = ref.index;
    if (!s || !ENTITIES.isGrid(m) || !['cells', 'items', 'patterns', 'encoding', 'partition', 'samples',
        'fluidSamples'].includes(field) || !
      Array.isArray(s[field]) || !Number.isInteger(i) || i < 0 || i >= s[field].length) return null;
    if (field === 'patterns' && d.role === 'interface' && i >= AE_UPGRADES.patternSlots(m)) return null;
    var arr = s[field];
    return {
      arr: arr,
      index: i,
      get: function() {
        return arr[i] || null;
      },
      set: function(value) {
          if (field === 'encoding' && i === 1) AE_PATTERNS.loadEncoded(s, value);
        arr[i] = value;
      },
      accepts: function(value) {
        if (value.entityUid && field !== 'items') return false;
        if (field === 'partition') return !value.aeCell && !value.aePattern && !!value.k;
        if (field === 'fluidSamples') return !!fluidIn(value.k);
        if (field === 'cells') return !!AE_CELLS.rule(value);
        if (field === 'patterns') return value.k === encoded && !!value.aePattern;
        if (field === 'encoding') return i === 0 ? CONTENT.canonicalKey(value.k) === blank :
          value.k === encoded && !!value.aePattern;
        return true;
      },
      cap: function(value) {
        return field === 'items' ? CORE.maxStack(value.k) : field === 'encoding' && i === 0 && CONTENT
          .canonicalKey(value.k) === blank ? AE_CONTENT.blankPatternCapacity : 1;
      }
    };
  });
  ITEM_TRANSFER.register('ae:port-slot', function(S, ref) {
    var m = ENTITIES.get(S, ref.uid),
      p = m && MULTIBLOCKS.byUid(m, ref.portUid),
      spec = p && PROCESSING_ACCESS.portInfo(p);
    if (!spec || !spec.me || !spec.patterns || !Number.isInteger(ref.index) || ref.index < 0 || ref
      .index >= spec.patternSlots) return null;
    var arr = AE_FACTORY.portState(p).patterns;
    return {
      arr: arr,
      index: ref.index,
      get: function() {
        return arr[ref.index] || null;
      },
      set: function(v) {
        arr[ref.index] = v;
      },
      accepts: function(v) {
        return v.k === encoded && !!v.aePattern;
      },
      cap: function() {
        return 1;
      }
    };
  });
  ITEM_TRANSFER.register('ae:fluid', function(S, ref) {
    var m = ENTITIES.get(S, ref.uid),
      d = m && AE_DEVICES.spec(m);
    if (!d || !d.fluids || !ENTITIES.isGrid(m) || !Number.isInteger(ref.index) || ref.index < 0 || ref
      .index >= d.tankSlots) return null;
    return {
      fluid: true,
      kind: 'fin',
      index: ref.index,
      machine: {
        meInterfaceUID: m.uid
      }
    };
  });
  ITEM_TRANSFER.register('ae:port-fluid', function(S, ref) {
    var m = ENTITIES.get(S, ref.uid),
      p = m && MULTIBLOCKS.byUid(m, ref.portUid),
      d = p && PROCESSING_ACCESS.portInfo(p);
    if (!d || !d.outputFluidBuffer || !Number.isInteger(ref.index) || ref.index < 0 || ref.index >= d
      .outputFluidBuffer(p).length) return null;
    return {
      fluid: true,
      kind: 'fout',
      index: ref.index,
      machine: {
        meOutputOwner: m.uid,
        meOutputPort: p.uid
      }
    };
  });
  TRANSPORT_PORTS.register({
    resolve: function(c) {
      var value = c.index[c.cell],
        m = value && ENGINE.networks.endpoint(value, c.cell, c.side, c.kind),
        p = m && m._port,
        s = p && PROCESSING_ACCESS.portInfo(p);
      return s && s.me && s.stocking ? null : undefined;
    },
    supports: function(c) {
      var value = c.index[c.cell],
        m = value && ENGINE.networks.endpoint(value, c.cell, c.side, c.kind),
        p = m && m._port,
        s = p && PROCESSING_ACCESS.portInfo(p);
      return s && s.me && s.stocking ? false : undefined;
    }
  });
  TRANSPORT_PORTS.register({
    resolve: function() {
      return undefined;
    },
    manual: function(context) {
      var m = context.machine;
      if (m.meNetworkNode) return fluidHandler(context.state, m.meNetworkNode, m.meFluid);
      if (m.meOutputOwner) {
        var owner = ENTITIES.get(context.state, m.meOutputOwner),
          port = owner && MULTIBLOCKS.byUid(owner, m.meOutputPort),
          spec = port && PROCESSING_ACCESS.portInfo(port);
        if (!spec || !spec.outputFluidBuffer) return null;
        var arr = spec.outputFluidBuffer(port);
        return {
          id: port.uid + ':fluid-manual',
          tanks: arr,
          caps: Array(arr.length).fill(spec.capacity),
          indices: [context.index],
          accepts: function() {
            return false;
          }
        };
      }
      if (m.meInterfaceUID) {
        var target = ENTITIES.get(context.state, m.meInterfaceUID);
        if (!target) return null;
        var h = AE_AUTOMATION.interfaceFluid(target);
        h.indices = [context.index];
        return h;
      }
    }
  });
  root.AE_INVENTORY = {
    transferIn: transferIn,
    transferOut: transferOut,
    fluidHandler: fluidHandler,
    containerMove: containerMove,
    blank: blank,
    encoded: encoded
  };
})(typeof window !== 'undefined' ? window : globalThis);
