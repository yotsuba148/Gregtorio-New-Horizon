(function(root) {
  'use strict';
  var R = AE_RESOURCES,
    ST = AE_STORAGE,
    TX = GTTransactions,
    operationWindows = new WeakMap();

  function operationBudget(cpu, tick) {
    var recent = (operationWindows.get(cpu) || []).filter(function(v) { return v.tick >= tick - 3 && v.tick <= tick; }),
      current = recent.find(function(v) { return v.tick === tick; });
    if (!current) { current = {tick: tick, used: 0}; recent.push(current); }
    operationWindows.set(cpu, recent);
    return {
      remaining: Math.max(0, (cpu.parallel || 1) - recent.reduce(function(sum, v) { return sum + v.used; }, 0)),
      used: function() { current.used++; this.remaining--; }
    };
  }

  AE_FACTORY.register('legacy-receiver-configuration',{
    before:function(c,tick){
      var a=c.state.ae;if(!a||a.configurationSchema===1)return false;
      if(tick!==1&&tick%20!==0)return false;
      var changed=false,pending=false;
      a.cpus.forEach(function(cpu){if(!cpu.order||cpu.order.status!=='running')return;
        cpu.order.flights.forEach(function(flight){
          if(flight.configurationDelivered)return;
          var task=cpu.order.tasks[flight.task],instructions=task&&task.pattern.virtual||[];
          if(instructions.length){
            var receiver=AE_MACHINE_BRIDGE.previousReceiver(c,flight.port);
            var result={ok:false,code:'CONFIG_RECEIVER'};
            if(receiver){
              var tx=c.network.transaction();
              result=AE_MACHINE_BRIDGE.configure(c,tx,instructions,receiver,true);
              if(result.ok)result=tx.commit();
            }
            if(!result.ok){
              pending=true;
              var code=result.code||'CONFIG_RECEIVER';
              if(flight.configurationFailure!==code){flight.configurationFailure=code;changed=true;}
              return;
            }
          }
          delete flight.configurationFailure;
          flight.configurationDelivered=true;
          changed=true;
        });
      });
      if(!pending){a.configurationSchema=1;changed=true;}
      return changed;
    }
  });

  AE_FACTORY.register('orders', {
    after: function(c, tick) {
      if (!c.orders) return false;
      var changed = AE_LEGACY.flush(c);
      (c.state.ae && c.state.ae.cpus || []).forEach(function(cpu) {
        if (!cpu.order&&cpu.planTarget) {
          if(c.orders.advancePlan(cpu))changed=true;
          return;
        }
        if (cpu.suspended) return;
        if (!cpu.order || !c.byId.has(cpu.node)) return;
        if (cpu.order.status !== 'running' || cpu.order.tasks.every(function(t) {
            return t.completed === t.batches;
          })) {
          var result = c.orders.flush(cpu.id);
          if (result.ok && result.complete) changed = true;
          return;
        }
        if (cpu.order.missing && cpu.order.missing.length) {
          var snap = c.network.snapshot(cpu.node);
          var still = cpu.order.missing.filter(function (r) {
            return AE_RESOURCES.amount(r, 1) && !snap.some(function (s) { return AE_RESOURCES.identity(s) === AE_RESOURCES.identity(r) && s.amount >= r.amount; });
          });
          if (still.length !== cpu.order.missing.length) { cpu.order.missing = still; changed = true; }
        }
        if(cpu.order.flights.some(function(f){return !f.configurationDelivered;}))return;
        var dispatched = false, failure = {code: cpu.order.flights.length ? 'WAITING_OUTPUT' : 'WAITING_DISPATCH'},
          budget = operationBudget(cpu, tick);
        if (!budget.remaining) { cpu.order.blocked = failure; return; }
        for (var taskIndex = 0; taskIndex < cpu.order.tasks.length; taskIndex++) {
          var task = cpu.order.tasks[taskIndex];
          if (task.dispatched >= task.batches) continue;
          var providers = AE_FACTORY.patternProviders(c,cpu.node,task.pattern.id);
          var last = {ok: false, code: 'NO_PATTERN'};
          for (var node of providers) {
            for (var receiver of AE_MACHINE_BRIDGE.receivers(c, node)) {
              var directed = receiver.direction == null ? node : Object.assign({}, node, {side: receiver.direction}),
                port = {id: AE_MACHINE_BRIDGE.deliveryPort(node,receiver), prepare: function(tx, packet) {
                  return AE_MACHINE_BRIDGE.prepare(c, directed, tx, packet, receiver);
                }};
              last = c.orders.dispatch(cpu.id, port, taskIndex);
              if (last.ok || last.code==='WAITING_INPUT') break;
            }
            if (last.ok || last.code==='WAITING_INPUT') break;
          }
          if (last.ok) {
            dispatched = changed = true;
            budget.used();
            if (!budget.remaining) break;
            // Try another copy on another free provider before moving to the next recipe.
            taskIndex--;
          } else {
            failure = {code: last.code, task: taskIndex};
          }
        }
        if (cpu.order) cpu.order.blocked = dispatched ? null : failure;
      });
      return changed;
    }
  });
  root.AE_EXECUTION = {
    prepare: AE_MACHINE_BRIDGE.prepare,
    target: AE_MACHINE_BRIDGE.target
  };
})(typeof window !== 'undefined' ? window : globalThis);
