(function(root) {
  'use strict';
  var R = root.AE_RESOURCES,
    C = root.CONTENT,
    TX = root.GTTransactions;

  function Failure(code, resource) {
    this.code = code;
    this.resource = resource;
  }

  function copy(s) {
    return TX.clone(s);
  }

  function byteCost(r) {
    return r.kind === 'fluid' ? Math.ceil(r.amount / 1000) : r.amount;
  }

  function slot(s, r) {
    var id = R.identity(r);
    return s.pool[id] || (s.pool[id] = {
      resource: R.amount(r, 1),
      initial: 0,
      produced: 0
    });
  }

  function consume(s,r,used){
    var left=r.amount,keys=[r.key].concat(r.alternatives||[]),entries=Object.keys(s.pool).map(function(id){return {id:id,row:s.pool[id]};});
    function accepts(row){var actual=row.resource;return actual.kind===r.kind&&keys.some(function(k){return C.matches(k,actual.key);})&&
      (!r.attributes||JSON.stringify(R.stable(r.attributes))===JSON.stringify(R.stable(actual.attributes||{})));}
    entries=entries.filter(function(e){return accepts(e.row);}).sort(function(a,b){return Number(a.row.resource.key!==r.key)-Number(b.row.resource.key!==r.key);});
    if(!r.mixable&&r.alternatives&&r.alternatives.length){var full=entries.find(function(e){return e.row.produced+(s.available[e.id]||0)>=left;});entries=full?[full]:[];}
    entries.forEach(function(e){
      if(!left)return;
      var made=Math.min(left,e.row.produced);if(made){e.row.produced-=made;left-=made;used.push(R.amount(e.row.resource,made));}
      var take=Math.min(left,s.available[e.id]||0);if(take){s.available[e.id]-=take;left-=take;var value=R.amount(e.row.resource,take);s.withdrawals.push(value);used.push(value);}
    });
    return left;
  }

  function give(s, r) {
    var a = slot(s, r);
    a.produced = R.add(a.produced, r.amount);
  }

  // Native populatePlan counts complete pattern outputs, independently of the requested amount.
  function production(target, steps) {
    var id = R.identity(target), total = 0;
    steps.forEach(function(step) {
      step.pattern.outputs.forEach(function(output) {
        if (R.identity(output) === id) total = R.add(total, R.multiply(output.amount, step.batches));
      });
    });
    return R.amount(target, total || target.amount);
  }

  /* AE2 CraftingJobV2 式的分帧计划：建任务 → 每帧推进 N 个节点 → 完成时结算 */
  function createJob(target, inventory, patterns, options) {
    target = R.normalize(target);
    options = options || {};
    var maxSteps = options.maxSteps == null ? 20000 : R.integer(options.maxSteps),
      maxDepth = options.maxDepth == null ? 128 : R.integer(options.maxDepth),
      deadline = Date.now() + (options.maxMillis == null ? 15000 : options.maxMillis),
      work = 0,
      index = new Map(),
      initial = {
        pool: {},
        available: {},
        withdrawals: [],
        missing: [],
        issues: [],
        steps: [],
        bytes: byteCost(target)
      };
    R.merge(inventory.map(R.normalize)).forEach(function(r) {
      slot(initial, r).initial = r.amount;
      initial.available[R.identity(r)] = r.amount;
    });
    patterns=patterns.filter(function(p){return !p.invalid;}).sort(function(a,b){return (b.priority||0)-(a.priority||0);});
    var ids = new Set();
    patterns.forEach(function(p) {
      if (ids.has(p.id)) throw Error('Duplicate AE pattern identity');
      ids.add(p.id);
      p.outputs.forEach(function(r) {
        var id = R.identity(r),
          list = index.get(id) || [];
        list.push(p);
        index.set(id, list);
      });
    });

    function* needG(s,r,path,used){
      s.bytes=R.add(s.bytes,byteCost(r));
      var left=consume(s,r,used);
      if(left){s=yield* produceG(s,R.amount(r,left),path);used.push(R.amount(r,left));}
      return s;
    }

    function* produceG(s, r, path) {
      yield;
      if (Date.now() > deadline) throw new Failure('TIMEOUT', r);
      if (++work > maxSteps || path.length >= maxDepth) throw new Failure('PLAN_LIMIT', r);
      var id = R.identity(r);
      if (path.includes(id)) {
        s.missing.push(r);
        s.issues.push({code: 'CYCLE', resource: r});
        return s;
      }
      var choices = index.get(id) || [];
      if (!choices.length) {
        s.missing.push(r);
        return s;
      }
      var best, score = Infinity, beforeMissing = s.missing.length,
        beforeIssues = s.issues.length;
      for (var p of choices) {
        var next = choices.length > 1 ? copy(s) : s;
        var per = p.outputs.find(function(o) { return R.identity(o) === id; }).amount,
          physical = p.inputs.concat(p.reusable),
          selfInput = R.merge(physical).find(function(o) { return R.identity(o) === id; });
        if (selfInput) per -= selfInput.amount;
        if (per <= 0) {
          next.missing.push(r);
          next.issues.push({code: 'CYCLE', resource: r});
          if (!best) best = next;
          continue;
        }
        var batches = Math.ceil(r.amount / per),
          required = R.scale(physical, batches),
          produced = R.scale(p.outputs, batches);
        R.merge(physical).forEach(function(input) {
          var output = p.outputs.find(function(o) { return R.identity(o) === R.identity(input); });
          if (!output || batches === 1) return;
          var reused = R.multiply(Math.min(input.amount, output.amount), batches - 1),left=reused,
            b = produced.find(function(q) { return R.identity(q) === R.identity(input); });
          required.forEach(function(a){if(R.identity(a)!==R.identity(input))return;var n=Math.min(left,a.amount);a.amount-=n;left-=n;});
          b.amount -= reused;
        });
        var inputPlan=[];
        for(var input of required){var allocated=[];next=yield* needG(next,input,path.concat(id),allocated);inputPlan.push(R.merge(allocated));}
        produced.forEach(function(out) { give(next, out); });
        var result = slot(next, r);
        if (result.produced < r.amount) throw new Failure('CYCLE', r);
        result.produced -= r.amount;
        var cloned = TX.clone(p);
      if (p && p.gridKeys) cloned.gridKeys = p.gridKeys.slice();
      if (p && p.slotKeys) cloned.slotKeys = p.slotKeys.slice();
      next.steps.push({pattern:cloned,batches:batches,inputPlan:inputPlan});
        if (next.missing.length === beforeMissing && next.issues.length === beforeIssues) return next;
        var cost = next.missing.slice(beforeMissing).reduce(function(n, v) { return n + byteCost(v); }, 0);
        if (!best || cost < score) { best = next; score = cost; }
      }
      return best;
    }

    return { target: target, initial: initial, iterator: produceG(initial, target, []), done: false, raw: null };
  }

  function stepJob(job, nodes) {
    var budget = nodes == null ? 200 : R.integer(nodes);
    while (!job.done && budget-- > 0) {
      var step = job.iterator.next();
      if (step.done) { job.done = true; job.raw = step.value; }
    }
    return job.done;
  }

  function finishJob(job) {
    var target = job.target, result = job.raw;
    try {
      if (!result) throw new Failure('PLAN_LIMIT', target);
      var missing = R.merge(result.missing), pending = R.merge(result.steps.flatMap(function(t) {
        return R.scale(t.pattern.outputs, t.batches);
      })), withdrawals = R.merge(result.withdrawals);
      return {
        ok: !missing.length && !result.issues.length,
        code: result.issues.length ? result.issues[0].code : missing.length ? 'MISSING' : undefined,
        resource: result.issues.length ? result.issues[0].resource : missing[0],
        target: target,
        production: production(target, result.steps),
        withdrawals: withdrawals,
        pending: pending,
        missing: missing,
        issues: result.issues,
        steps: result.steps,
        bytes: result.bytes,
        surplus: Object.values(result.pool).filter(function(v) { return v.produced > 0; })
          .map(function(v) { return R.amount(v.resource, v.produced); })
      };
    } catch (error) {
      if (!(error instanceof Failure)) throw error;
      return { ok: false, code: error.code, resource: error.resource };
    }
  }

  function plan(target, inventory, patterns, options) {
    var job;
    try {
      job = createJob(target, inventory, patterns, options);
      while (!job.done) stepJob(job, 400);
      return finishJob(job);
    } catch (error) {
      if (!(error instanceof Failure)) throw error;
      return { ok: false, code: error.code, resource: error.resource };
    }
  }

  root.AE_PLANNER = {
    plan: plan,
    createJob: createJob,
    stepJob: stepJob,
    finishJob: finishJob,
    production: production
  };
})(typeof window !== 'undefined' ? window : globalThis);
