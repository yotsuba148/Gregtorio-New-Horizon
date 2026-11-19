(function(root) {
  'use strict';
  var R = root.AE_RESOURCES,
    ST = root.AE_STORAGE,
    TX = root.GTTransactions;

  function Engine(S, network, options) {
    this.state = S;
    this.network = network;
    this.options = options || {};
    if (this.options.parallel != null) R.integer(this.options.parallel);
    this.trace = [];
    this.traceLimit = this.options.traceLimit == null ? 128 : R.integer(this.options.traceLimit);
    root.AE_STATE.ensure(S);
  }
  Engine.prototype.record = function(event) {
    if (this.options.onEvent) this.options.onEvent(event);
    if (!this.options.debug) return;
    this.trace.push(TX.clone(event));
    if (this.trace.length > this.traceLimit) this.trace.shift();
  };
  Engine.prototype.preview = function(cpuId, target, terminalNode) {
    var c = root.AE_STATE.cpu(this.state, cpuId);
    if (!c && !terminalNode) return {
      ok: false,
      code: 'CPU'
    };
    var node = c ? c.node : terminalNode, status = this.network.status(node);
    if (!status.ok) return status;
    return root.AE_PLANNER.plan(target, this.network.snapshot(node), this.patternsFor(node));
  };
  Engine.prototype.submit = function(cpuId, target) {
    var c = root.AE_STATE.cpu(this.state, cpuId);
    if (!c) return { ok: false, code: 'CPU' };
    if (c.order || c.resources.length || c.planTarget) return { ok: false, code: 'BUSY' };
    var status = this.network.status(c.node);
    if (!status.ok) return status;
    c.planTarget = TX.clone(R.normalize(target));
    var result=this.runPlan(c);
    if(!result.ok)this.clearPlan(c);
    return result;
  };

  Engine.prototype.clearPlan = function(c) {
    delete c.planTarget;delete c.planJob;delete c.planFailure;
  };

  Engine.prototype.retryPlan = function(cpuId) {
    var c=AE_STATE.cpu(this.state,cpuId);
    if(!c||!c.planTarget||c.order)return {ok:false,code:'ORDER'};
    delete c.planJob;delete c.planFailure;
    return {ok:true,planning:true};
  };

  Engine.prototype.advancePlan = function(c) {
    if(c.planFailure)return false;
    var result=this.runPlan(c);
    if(!result.ok){
      c.planFailure=result.code||'CALCULATION';
      delete c.planJob;
    }
    return !result.planning;
  };

  Engine.prototype.runPlan = function(c) {
    var status=this.network.status(c.node);
    if(!status.ok)return status;
    var result;
    try {
      if(!c.planJob)c.planJob=AE_PLANNER.createJob(c.planTarget,this.network.snapshot(c.node),this.patternsFor(c.node),{});
      AE_PLANNER.stepJob(c.planJob,400);
      if(!c.planJob.done)return {ok:true,planning:true};
      result=this.startOrder(c.id,AE_PLANNER.finishJob(c.planJob));
    }catch(error){
      if(c.order){this.clearPlan(c);throw error;}
      console.error('AE synthesis plan',error);
      return {ok:false,code:'CALCULATION'};
    }
    if(result.ok)this.clearPlan(c);
    return result;
  };

  Engine.prototype.patternsFor = function(node) {
    if (this.options.patterns) return this.options.patterns(node);
    return root.AE_STATE.ensure(this.state).patterns;
  };

  Engine.prototype.startOrder = function(cpuId, plan) {
    var c = root.AE_STATE.cpu(this.state, cpuId);
    if (!c) return { ok: false, code: 'CPU' };
    if (c.order || c.resources.length) return { ok: false, code: 'BUSY' };
    if (!plan.ok) return plan;
    if (c.craftingBytes != null && plan.bytes > c.craftingBytes) return {
      ok: false,
      code: 'MEMORY',
      required: plan.bytes,
      capacity: c.craftingBytes
    };
    var seq = R.add(c.sequence || 0, 1),
      tx = this.network.transaction();
    // 写进 CPU 的必须是规范资源，防止物品栈格式漏进来
    var withdrawals = R.merge(plan.withdrawals.map(R.normalize));
    var extracted = this.network.extract(tx, c.node, withdrawals, c.resources);
    if (!extracted.ok) return extracted;
    if (!tx.edit(ST.buffer('cpu:' + c.id, c.resources), [], withdrawals)) return {
      ok: false,
      code: 'FULL'
    };
    var order = {
      id: c.id + ':' + seq,
      target: TX.clone(plan.target),
      production: TX.clone(plan.production),
      status: 'running',
      sequence: 0,
      tasks: plan.steps.map(function(t) {
        return {
          pattern: t.pattern,
          inputPlan:TX.clone(t.inputPlan||null),
          batches: t.batches,
          dispatched: 0,
          completed: 0
        };
      }),
      flights: [],
      missing: plan.missing ? TX.clone(plan.missing) : []
    };
    tx.stage(ST.properties('cpu:' + c.id + ':job', c, ['sequence', 'order']), {
      sequence: seq,
      order: order
    });
    var result = tx.commit();
    if (!result.ok) return result;
    this.record({
      kind: 'submit',
      cpu: c.id,
      order: c.order.id,
      materials: plan.withdrawals
    });
    return {
      ok: true,
      order: c.order.id
    };
  };
  Engine.prototype.dispatch = function(cpuId, port, selectedTask) {
    var c = root.AE_STATE.cpu(this.state, cpuId),
      j = c && c.order;
    if (!j || j.status === 'cancelling' || j.status === 'returning') return {
      ok: false,
      code: 'ORDER'
    };
    var status = this.network.status(c.node);
    if (!status.ok) return status;
    if (!port || typeof port.prepare !== 'function' || typeof port.id !== 'string') throw Error(
      'Invalid AE processing port');
    var taskIndex = selectedTask == null ? (function () {
        var best = -1, bestPriority = -Infinity;
        j.tasks.forEach(function (t, i) {
          if (t.completed >= t.batches) return;
          var pr = (t.pattern && t.pattern.priority) || 0;
          if (pr > bestPriority) { bestPriority = pr; best = i; }
        });
        return best;
      })() : selectedTask,
      t = j.tasks[taskIndex];
    if (!t) return this.flush(cpuId);
    if (t.dispatched >= t.batches) return {
      ok: false,
      code: 'WAITING_OUTPUT'
    };
    if (j.failure) return {
      ok: false,
      code: j.failure.code
    };
    var physical=t.pattern.inputs.concat(t.pattern.reusable);
    var allocated=physical.map(function(requirement,i){
      if(!t.inputPlan||!t.inputPlan[i])return [requirement];
      var offset=t.dispatched*requirement.amount,left=requirement.amount,out=[];
      t.inputPlan[i].forEach(function(resource){if(!left)return;if(offset>=resource.amount){offset-=resource.amount;return;}var take=Math.min(left,resource.amount-offset);out.push(R.amount(resource,take));left-=take;offset=0;});
      if(left)out.push(R.amount(requirement,left));
      return out;
    });
    var inputs = R.merge(allocated.flat()),
      tx = this.network.transaction(),
      buffer = ST.buffer('cpu:' + c.id, c.resources);
    if (!tx.edit(buffer, inputs, [])) return {
      ok: false,
      code: 'WAITING_INPUT'
    };
    var sequence = R.add(j.sequence, 1),
      token = j.id + ':' + sequence,
      packet = {
        id: token,
        cpu: c.id,
        order: j.id,
        mode: t.pattern.mode,
        inputs: TX.clone(inputs),
        ingredients:TX.clone(t.pattern.inputs),
        positions:TX.clone(allocated),
        virtual: TX.clone(t.pattern.virtual),
        outputs: TX.clone(t.pattern.outputs),
        reusable: TX.clone(t.pattern.reusable),
        gridKeys: Array.isArray(t.pattern.gridKeys) ? t.pattern.gridKeys.slice(0, 9) : null,
      recipeBatches: t.pattern.recipeBatches || 1
      };
    var accepted = port.prepare(tx, packet);
    if (!accepted || accepted.ok === false) return accepted || {
      ok: false,
      code: 'MACHINE'
    };
    var flights = TX.clone(j.flights);
    var pending=TX.clone(t.pattern.outputs).filter(function(r){return accepted.feeding||!accepted.fakeFinal||R.identity(r)!==R.identity(j.target);});
    if(pending.length)flights.push({
      id: token,
      task: taskIndex,
      configurationDelivered:true,
      port: port.id,
      pending: pending,
      ...(accepted.feeding?{feeding:true}:{})
    });
    tx.stage(ST.properties(j.id + ':dispatch', j, ['sequence', 'flights']), {
      sequence: sequence,
      flights: flights
    });
    tx.stage(ST.properties(j.id + ':task:' + taskIndex, t, ['dispatched','completed']), {
      dispatched: R.add(t.dispatched, 1), completed:t.completed+(pending.length?0:1)
    });
    var result = tx.commit();
    if (!result.ok) return result;
    this.record({
      kind: 'dispatch',
      cpu: c.id,
      token: token,
      port: port.id
    });
    return {
      ok: true,
      token: token
    };
  };
  Engine.prototype.collect = function(cpuId, token, source, resources) {
    resources=R.merge(resources.map(R.normalize));
    if(!resources.length)return{ok:false,code:'EMPTY'};
    var c=AE_STATE.cpu(this.state,cpuId),j=c&&c.order,
      flight=j&&j.flights.find(function(f){return f.id===token;});
    if(!flight||flight.feeding)return{ok:false,code:'TOKEN'};
    if(!ST.remove(flight.pending,resources))return{ok:false,code:'UNEXPECTED_OUTPUT'};
    var tx=this.network.transaction(),targetId=R.identity(j.target),
      finals=resources.filter(function(r){return R.identity(r)===targetId;}),
      intermediate=resources.filter(function(r){return R.identity(r)!==targetId;});
    if(!ST.remove(source.resources(tx.read(source)),resources))return{ok:false,code:'MISSING'};
    var stored=this.network.insertRaw(tx,c.node,finals,source.storage);
    if(stored.code)return stored;
    var accepted=R.merge(intermediate.concat(stored.moved));
    if(!accepted.length){j.outputBlocked=TX.clone(stored.remaining);return{ok:false,code:'OUTPUT_STORAGE'};}
    if(!tx.edit(source,accepted,[]))return{ok:false,code:'MISSING'};
    if(!tx.edit(ST.buffer('cpu:'+c.id,c.resources),[],intermediate))return{ok:false,code:'FULL'};
    var pending=ST.remove(flight.pending,accepted),updates={};
    if(finals.length)updates.outputBlocked=TX.clone(stored.remaining);
    if(pending.length)tx.stage(ST.properties(token+':receipt',flight,['pending']),{pending:pending});
    else{
      var task=j.tasks[flight.task];
      updates.flights=j.flights.filter(function(f){return f!==flight;});
      tx.stage(ST.properties(j.id+':task:'+flight.task,task,['completed']),{completed:R.add(task.completed,1)});
    }
    if(Object.keys(updates).length)tx.stage(ST.properties(j.id+':receipt-state',j,Object.keys(updates)),updates);
    var result=tx.commit();if(!result.ok)return result;
    this.record({kind:'collect',cpu:c.id,token:token,resources:accepted});
    return{ok:true,moved:accepted,remaining:stored.remaining};
  };
  Engine.prototype.flush = function(cpuId) {
    var c = root.AE_STATE.cpu(this.state, cpuId),
      j = c && c.order;
    if (!j) return {
      ok: false,
      code: 'ORDER'
    };
    var cancelled = j.status === 'cancelling';
    if (!cancelled && (j.flights.length || j.tasks.some(function(t) {
        return t.completed < t.batches;
      }))) return {
      ok: false,
      code: 'RUNNING'
    };
    j.status = cancelled ? 'cancelling' : 'returning';
    /* 返还失败不每 tick 重试：AE2 的补抽也是按周期来的，这里退避 20 tick 再试 */
    if (j.retryWait > 0) { j.retryWait -= 1; return { ok: true, complete: false, retry: true }; }
    var result = this.network.store(c.node, ST.buffer('cpu:' + c.id, c.resources), c.resources,
      true);
    if (!result.ok) { j.retryWait = 20; return result; }
    if (!c.resources.length && !j.flights.length) {
      var id = j.id;
      c.order = null;
      this.record({
        kind: cancelled ? 'cancelled' : 'completed',
        modes: Array.from(new Set(j.tasks.map(function(t) {
          return t.pattern.mode;
        }))),
        virtual: j.tasks.some(function(t) {
          return t.pattern.virtual.length > 0;
        }),
        cpu: c.id,
        order: id,
        target: TX.clone(j.target),
        production: TX.clone(j.production || AE_PLANNER.production(j.target, j.tasks))
      });
      return {
        ok: true,
        complete: true
      };
    }
    return {
      ok: true,
      complete: false,
      remaining: TX.clone(c.resources),
      flights: j.flights.length
    };
  };
  Engine.prototype.cancel = function(cpuId) {
    var c = root.AE_STATE.cpu(this.state, cpuId);
    if(c&&!c.order&&c.planTarget){this.clearPlan(c);return {ok:true,complete:true};}
    if (!c || !c.order) return {
      ok: false,
      code: 'ORDER'
    };
    var returned=AE_RELAY_DELIVERY.refund(this,c);
    if(!returned.ok)return returned;
    c.order.status = 'cancelling';
    c.order.flights = [];
    c.order.tasks = [];
    this.record({
      kind: 'cancel',
      cpu: c.id,
      order: c.order.id
    });
    return this.flush(cpuId);
  };
  Engine.prototype.inspect = function(cpuId) {
    var c = root.AE_STATE.cpu(this.state, cpuId);
    return c ? TX.clone({
      cpu: c.id,
      node: c.node,
      resources: c.resources,
      order: c.order
    }) : null;
  };
  function phase(cpu) {
    var j = cpu && cpu.order;
    if(!j&&cpu&&cpu.planTarget)return {code:cpu.planFailure||'PLANNING'};
    if (!j) return {code: 'IDLE'};
    if (j.status === 'cancelling') return {code: 'CANCELLING'};
    if (j.status === 'returning') return {code: cpu.resources.length?'OUTPUT_STORAGE':'RETURNING',resources:TX.clone(cpu.resources)};
    if (j.failure) return {code: j.failure.code};
    if(j.outputBlocked&&j.outputBlocked.length)return{code:'OUTPUT_STORAGE',resources:TX.clone(j.outputBlocked)};
    var configuration=j.flights.find(function(f){return f.configurationFailure;});
    if(configuration)return {code:configuration.configurationFailure};
    if (j.flights.length) return {code: j.flights.some(function(f){return f.feeding;})?'RELAY_FEEDING':'WAITING_OUTPUT'};
    if (j.missing && j.missing.length) return {code: 'MISSING', resources: TX.clone(j.missing)};
    if (j.blocked) return {code: j.blocked.code};
    return {code: 'WAITING_DISPATCH'};
  }
  root.AE_ORDERS = {
    Engine: Engine,
    phase: phase
  };
})(typeof window !== 'undefined' ? window : globalThis);
