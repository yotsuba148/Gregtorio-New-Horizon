(function(root) {
  'use strict';
  var R = AE_RESOURCES,
    ST = AE_STORAGE,
    TX = GTTransactions;

  function interfaceFluid(m) {
    var d = AE_DEVICES.spec(m),
      s = AE_DEVICES.ensure(m),
      tanks = s.fluids;
    return {
      id: 'me-interface:' + m.uid,
      tanks: s.fluids,
      caps: Array(d.tankSlots).fill(d.tankCapacity),
      kind: 'container',
      object: m,
      valid: function() {
        return ENTITIES.active(m) && m.me === s && s.fluids === tanks;
      }
    };
  }
  TRANSPORT_PORTS.register({
    supports: function(c) {
      var m = c.index[c.cell],
        d = m && AE_DEVICES.spec(m);
      if (!d || !['interface', 'assembler'].includes(d.role)) return;
      /* AE2：装配室只能接收样板（pushPattern），不能被当作普通库存灌料 */
      if (d.role === 'assembler' && c.direction !== 'import') return;
      return c.kind === 'item' || d.fluids && c.kind === 'fluid';
    },
    resolve: function(c) {
      var m = c.index[c.cell],
        proxy = m && ENGINE.networks.endpoint(m, c.cell, c.side, c.kind),
        p = proxy && proxy._port,
        spec = p && PROCESSING_ACCESS.portInfo(p);
      if (spec && spec.outputFluidBuffer && c.kind === 'fluid') {
        if (c.direction !== 'export') return null;
        var tanks = spec.outputFluidBuffer(p);
        return {
          id: p.uid + ':fluids',
          tanks: tanks,
          caps: Array(tanks.length).fill(spec.capacity),
          kind: 'output',
          object: p,
          valid: function() {
            return ENTITIES.active(m) && MULTIBLOCKS.byUid(m, p.uid) === p &&
              spec.outputFluidBuffer(p) === tanks;
          }
        };
      }
      var d = m && AE_DEVICES.spec(m);
      if (!d || !['interface', 'assembler'].includes(d.role)) return;
      var s = AE_DEVICES.ensure(m);
      if (c.kind === 'fluid') return d.fluids ? c.direction === 'import' ?
        AE_FLUID_INGRESS.handler(m) : interfaceFluid(m) : null;
      if (c.kind !== 'item') return null;
      if (d.role === 'assembler') {
        /* 装配室只回收产物（输出槽），输入九格必须整表写入，不能被当库存灌料 */
        if (c.direction !== 'import') return null;
        var arr = m.outs;
        return TRANSPORT_PORTS.itemHandler(arr, CORE.slotBox(arr), m);
      }
      return TRANSPORT_PORTS.itemHandler(s.items, CORE.slotBox(s.items), m);
    },
    resources: function(c) {
      return (c.board.machines || []).filter(function(m) {
        var d = AE_DEVICES.spec(m);
        return d && d.role === 'interface' && d.fluids;
      }).flatMap(function(m) {
        return [interfaceFluid(m), AE_FLUID_INGRESS.handler(m)];
      });
    }
  });

  function itemSource(m, arr, index) {
    return AE_ADAPTERS.itemSlot(arr, index, function() {
      return ENTITIES.active(m);
    });
  }

  function returnItems(c, n, arr, keep) {
    var moved = false;
    arr.forEach(function(stack, i) {
      if (!stack) return;
      var r = R.item(stack),
        desired = keep && keep[i],
        leave = desired && R.identity(desired) === R.identity(r) ? desired.amount : 0,
        amount = r.amount - Math.min(r.amount, leave);
      if (!amount) return;
      var receipt = AE_DELIVERY.deposit(c, n.id, itemSource(n.entity, arr, i), [R.amount(r, amount)]);
      if (receipt.moved && receipt.moved.length) moved = true;
    });
    return moved;
  }

  function returnFluids(c, n, arr, caps, keep) {
    var moved = false;
    arr.forEach(function(t, i) {
      if (!t || !t.mb) return;
      var r = R.fluid(t),
        wanted = keep && keep[i],
        amount = r.amount - (wanted && R.identity(wanted) === R.identity(r) ? Math.min(r.amount, wanted
          .amount) : 0);
      if (!amount) return;
      var a = AE_ADAPTERS.fluidSlot(arr, i, caps[i], function() {
          return ENTITIES.active(n.entity);
        }),
        receipt = AE_DELIVERY.deposit(c, n.id, a, [R.amount(r, amount)]);
      if (receipt.moved && receipt.moved.length) moved = true;
    });
    return moved;
  }

  // ME-IO 端口：在硬盘和网络之间整盘倒腾，每在线 tick 处理一点
  function ioPort(c, n) {
    var budget=AE_UPGRADES.ioLimit(n.entity),
      cells = n.state.cells || [],
      exporting = n.state.mode === 'export',
      moved = false;
    for (var i = 0; i < cells.length; i++) {
      var stack = cells[i];
      if (!stack || budget<=0) continue;
      var adapter = root.AE_CELLS.adapter(stack);
      if (!adapter) continue;
      if (exporting) {
        var contents = adapter.resources(adapter.read()).filter(function(r) {
          return r.amount > 0;
        });
        if (!contents.length) continue;
        var capped=[];contents.forEach(function(r){var amount=Math.min(budget,r.amount);if(amount)capped.push(R.amount(r,amount));budget-=amount;});
        var out = AE_DELIVERY.deposit(c, n.id, adapter, capped);
        if (out.moved && out.moved.length) moved = true;
      } else {
        var cell = adapter.read(),
          snapshot = c.network.snapshot(n.id) || [],
          want = [];
        for (var r of snapshot) {
          var room = adapter.room(cell, r);
          var amount=Math.min(room,r.amount,budget);if(amount>0){want.push(R.amount(r,amount));budget-=amount;}
        }
        if (!want.length) continue;
        var taken = c.network.take(n.id, adapter, want);
        if (taken && taken.ok && (taken.moved || []).length) moved = true;
      }
    }
    return moved;
  }

  // 流体容器（单元、桶）直接当流体来保持库存，不需要离散成液滴
  var containerIndex = null;
  function fluidOf(key) {
    var registry = root.GD && GD.containerRegistry;
    if (!registry) return null;
    if (!containerIndex || containerIndex.source !== registry) {
      containerIndex = {source: registry, map: new Map()};
      registry.forEach(function(p) {
        if (p && p.filled && p.fluid) containerIndex.map.set(p.filled, p.fluid);
      });
    }
    return containerIndex.map.get(key) || null;
  }

  // ME 请求器：库存低于设定值时自动下一次订单补齐
  function maintain(c, n) {
    var targets = [], i;
    for (i = 0; i < (n.state.itemMarks || []).length; i++) {
      if (!(n.state.enabled || [])[i]) continue;
      var mark = n.state.itemMarks[i], amount = n.state.amounts[i];
      if (mark && mark.key && amount > 0) {
        targets.push({kind: 'item', key: mark.key, amount: amount});
      }
    }
    for (i = 0; i < (n.state.fluidMarks || []).length; i++) {
      if (!(n.state.fluidEnabled || [])[i]) continue;
      var fluidMark = n.state.fluidMarks[i], fluidAmount = n.state.fluidAmounts[i];
      if (fluidMark && fluidMark.key && fluidAmount > 0) {
        targets.push({kind: 'fluid', key: fluidMark.key, amount: fluidAmount});
      }
    }
    if (!targets.length) return false;
    var state = root.AE_STATE.ensure(c.state),
      // 已经下过单、还在跑的目标不再重复下单
      pending = (n.state.pending || []).filter(function(p) {
        return state.cpus.some(function(cpu) {
          return cpu.id === p.cpu && cpu.order && cpu.order.id === p.orderId;
        });
      }),
      snapshot = c.network.snapshot(n.id) || [],
      fired = false;
    n.state.pending = pending;
    function inFlight(e) {
      return pending.some(function(p) {
        return p.kind === e.kind && p.key === e.key;
      });
    }
    for (var t = 0; t < targets.length; t++) {
      var e = targets[t], have = 0;
      for (var j = 0; j < snapshot.length; j++) {
        if (snapshot[j].key === e.key && snapshot[j].kind === e.kind) have += snapshot[j].amount;
      }
      if (have >= e.amount) continue;
      if (inFlight(e)) continue;
      var cpu = null;
      for (var k = 0; k < state.cpus.length; k++) {
        var cand = state.cpus[k];
        if (!cand.order && !(cand.resources || []).length) { cpu = cand; break; }
      }
      if (!cpu) return fired;
      // 一次把缺口全部下单，之后等这一单做完
      var result = c.orders.submit(cpu.id, R.amount({kind: e.kind, key: e.key}, e.amount - have));
      if (result.ok) {
        fired = true;
        pending.push({kind: e.kind, key: e.key, cpu: cpu.id, orderId: result.order});
      }
    }
    return fired;
  }

  // 晶体催生：把种子长成晶体，靠 AE 网络供电
  var GROWER_TICKS = 600;
  function grower(c, n) {
    var recipes = n.spec.grower;
    if (!recipes) return false;
    var input = (n.entity.ins || []).find(function(stack) {
      return stack && stack.k && recipes[String(stack.k).split('~')[0]];
    });
    if (!input) {
      n.state.progress = 0;
      return false;
    }
    var outputKey = recipes[String(input.k).split('~')[0]],
      outputs = n.entity.outs || [],
      // 有空位、或已有同种产出可以堆叠，才算放得下
      room = outputs.some(function(stack) {
        return !stack;
      }) || outputs.some(function(stack) {
        return stack && stack.k === outputKey;
      });
    if (!room) return false;
    n.state.progress = (n.state.progress || 0) + 1;
    if (n.state.progress < GROWER_TICKS) return false;
    n.state.progress = 0;
    var result = root.CORE.insert(root.CORE.slotBox(outputs), outputKey, 1);
    if (result > 0) return false;
    input.n -= 1;
    if (input.n <= 0) {
      var index = (n.entity.ins || []).indexOf(input);
      if (index >= 0) n.entity.ins[index] = null;
    }
    return true;
  }

  function requestStock(c,n,r){
    if(!AE_UPGRADES.count(n.entity,'crafting'))return false;
    var pending=(n.state.pending||[]).filter(function(p){return c.state.ae.cpus.some(function(cpu){return cpu.id===p.cpu&&(cpu.planTarget||cpu.order&&(p.orderId==null||cpu.order.id===p.orderId));});});
    n.state.pending=pending;
    if(pending.some(function(p){return p.kind===r.kind&&p.key===r.key;}))return false;
    var cpu=c.state.ae.cpus.find(function(cpu){return !cpu.order&&!cpu.planTarget&&!cpu.resources.length&&c.graph.component(cpu.node)===c.graph.component(n.id);});
    if(!cpu)return false;
    var result=c.orders.submit(cpu.id,r);
    if(result.ok){pending.push({kind:r.kind,key:r.key,cpu:cpu.id,orderId:result.order});return true;}return false;
  }
  function stock(c, n) {    var desired = n.state.stock || [],
      moved = returnItems(c, n, n.state.items, desired);
    desired.forEach(function(r, i) {
      if (!r) return;
      var old = n.state.items[i],
        have = old && R.identity(R.item(old)) === R.identity(r) ? TX.count(old) : 0;
      if (have >= r.amount) return;
      var available = ST.count(AE_FACTORY.snapshot(c, n.id), r),
        count = Math.min(r.amount - have, available);
      if(!count&&requestStock(c,n,R.amount(r,r.amount-have)))moved=true;
      if (count && c.network.take(n.id, itemSource(n.entity, n.state.items, i), [R.amount(r, count)])
        .ok) moved = true;
    });
    return moved;
  }

  function stockFluids(c, n) {
    var desired = n.state.fluidStock || [],
      caps = Array(n.spec.tankSlots).fill(n.spec.tankCapacity),
      changed = returnFluids(c, n, n.state.fluids, caps, desired);
    desired.forEach(function(r, i) {
      if (!r) return;
      var t = n.state.fluids[i],
        have = t && t.f === r.key ? t.mb : 0,
        native = AE_ADAPTERS.fluidSlot(n.state.fluids, i, n.spec.tankCapacity, function() {
          return ENTITIES.active(n.entity);
        }),
        amount = Math.min(Math.max(0, r.amount - have), ST.count(AE_FACTORY.snapshot(c, n.id), r),
          native.room(native.read(), r));
      if(!amount&&r.amount>have&&requestStock(c,n,R.amount(r,r.amount-have)))changed=true;
      if (amount && c.network.take(n.id, native, [R.amount(r, amount)]).ok) changed = true;
    });
    return changed;
  }

  function transferItem(c, n, tick, importing) {
    var board = BLUEPRINTS.view(c.state.fx, c.state.fx.blueprints.find(function(b) {
        return b.id === n.board;
      })),
      N = ENGINE.networks,
      index = N.grid(board),
      cell = TRANSPORT_PORTS.near(n.x + ',' + n.y, n.side),
      side = (n.side + 2) % 4,
      arr = n.state.items,
      changed = false;
    if (importing) {
      var from = N.port(board, index, cell, side, 'item', 'export');
      if (from && from.box)
        for (var i = 0; i < from.box.arr.length; i++) {
          if (!from.box.arr[i] || !AE_UPGRADES.matches(n.entity,R.item(from.box.arr[i]))) continue;
          var result = TRANSPORT_PORTS.moveItem(from, i, TRANSPORT_PORTS.itemHandler(arr, CORE.slotBox(
            arr)), AE_UPGRADES.transferLimit(n.entity,!!n.spec.fluids));
          if (result.moved) {
            changed = true;
            break;
          }
        }
      if (returnItems(c, n, arr)) changed = true;
      return changed;
    }
    if (!arr[0]) {
      var samples = AE_UPGRADES.samples(n.entity);
      for (var r of samples) {
        if (r.kind !== 'item') continue;
        var count = Math.min(AE_UPGRADES.transferLimit(n.entity,!!n.spec.fluids), ST.count(AE_FACTORY.snapshot(c, n.id), r));
        if(!count&&requestStock(c,n,R.amount(r,1)))changed=true;
        if (count && c.network.take(n.id, itemSource(n.entity, arr, 0), [R.amount(r, count)]).ok) {
          changed = true;
          break;
        }
      }
    }
    if (arr[0]) {
      var to = N.port(board, index, cell, side, 'item', 'import', arr[0]);
      if (to) {
        var budgets = N.itemBudgets(board, tick),
          count = N.sendItem(board, tick, index, budgets, TRANSPORT_PORTS.itemHandler(arr, CORE.slotBox(
            arr)), 0, to, null, AE_UPGRADES.transferLimit(n.entity,!!n.spec.fluids));
        if (count) changed = true;
      }
    }
    return changed;
  }

  function transferFluid(c, n, importing) {
    var bindings = AE_FACTORY.physical(c, n).filter(function(b) {
        var s = b.adapter.resources(b.adapter.read());
        return importing ? s.some(function(r) {
          return r.kind === 'fluid' && b.accepts(r, 'read') && AE_UPGRADES.matches(n.entity,r);
        }) : true;
      }),
      changed = false;
    if (importing) {
      for (var b of bindings) {
        var rs = b.adapter.resources(b.adapter.read()).filter(function(r) {
          return r.kind === 'fluid' && b.accepts(r, 'read') && AE_UPGRADES.matches(n.entity,r);
        });
        for (var r of rs) {
          var result = AE_DELIVERY.deposit(c, n.id, b.adapter, [R.amount(r, Math.min(r.amount, n.spec
            .rate))]);
          if (result.moved && result.moved.length) return true;
        }
      }
      return false;
    }
    var samples = AE_UPGRADES.samples(n.entity);
    for (var r of samples) {
      if (r.kind !== 'fluid') continue;
      var available = Math.min(AE_UPGRADES.transferLimit(n.entity,!!n.spec.fluids), ST.count(AE_FACTORY.snapshot(c, n.id), r));
      if (!available){if(requestStock(c,n,R.amount(r,1)))changed=true;continue;}
      for (var b of bindings) {
        if (!b.accepts(r, 'write')) continue;
        var amount = Math.min(available, b.adapter.room(b.adapter.read(), r));
        if (amount && c.network.take(n.id, b.adapter, [R.amount(r, amount)]).ok) return true;
      }
    }
    return changed;
  }
  AE_FACTORY.register('automation', {
    after: function(c, tick) {
      var changed = false;
      c.nodes.forEach(function(n) {
        if (!c.network.status(n.id).ok) return;
        if (n.role === 'interface') {
          if (stock(c, n)) changed = true;
          if (n.spec.fluids && stockFluids(c, n)) changed = true;
        }
        if (n.role === 'assembler' && n.entity.eject && n.entity.eject.some(Boolean)) {
          var ej = n.entity.eject.filter(Boolean).map(function (x) {
            return { kind: 'item', key: x.k, amount: x.n };
          });
          var etx = c.network.transaction();
          if (c.network.insert(etx, n.id, ej).ok && etx.commit().ok) {
            n.entity.eject = Array(9).fill(null);
            changed = true;
          }
        }
        if (n.role === 'assembler') {
          if (returnItems(c, n, n.entity.outs)) changed = true;
          if (returnItems(c, n, n.state.returns)) changed = true;
          if (n.state.flushInputs && !n.state.craftRequest && !n.entity.job) {
            if (returnItems(c, n, n.entity.ins)) changed = true;
            if (!n.entity.ins.some(Boolean)) n.state.flushInputs = false;
          }
        }
        if (n.role === 'port' && n.spec.itemOut && returnItems(c, n, n.port.items)) changed =
          true;
        if (n.role === 'port' && n.spec.fluidOut) {
          var fluids = n.spec.outputFluidBuffer ? n.spec.outputFluidBuffer(n.port) : n.port.tanks;
          if (returnFluids(c, n, fluids, Array(fluids.length).fill(n.spec.capacity))) changed =
            true;
        }
        if ((n.role === 'import' || n.role === 'export') &&
          tick % (AE_UPGRADES.period(n.entity, n.spec.period) || n.spec.period) === 0) {
          if (n.spec.fluids ? transferFluid(c, n, n.role === 'import') : transferItem(c, n, tick,
              n.role === 'import')) changed = true;
        }
        if (n.role === 'ioport') {
          if (ioPort(c, n)) changed = true;
        }
        if (n.role === 'maintainer' && tick % (n.state.period || 20) === 0) {
          if (maintain(c, n)) changed = true;
        }
        if (n.role === 'grower') {
          if (grower(c, n)) changed = true;
        }
      });
      return changed;
    }
  });
  root.AE_AUTOMATION = {
    interfaceFluid: interfaceFluid,
    returnItems: returnItems,
    returnFluids: returnFluids
  };
})(typeof window !== 'undefined' ? window : globalThis);
