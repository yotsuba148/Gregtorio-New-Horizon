(function(root) {
  'use strict';
  var R = root.AE_RESOURCES,
    TX = root.GTTransactions,
    prepared = new WeakSet();

  function ensure(S) {
    if (!S.ae) S.ae = {
      version: 1,
      logisticsSchema: 1,
      virtualize: true,
      patterns: [],
      cpus: []
    };
    if (prepared.has(S.ae)) return S.ae;
    var a = TX.clone(S.ae);
    if (a.version !== 1 || !Array.isArray(a.patterns) || !Array.isArray(a.cpus) || typeof a
      .virtualize !== 'boolean') throw Error('Invalid AE save');
    if(a.deliveries!=null&&(!a.deliveries||typeof a.deliveries!=='object'||Array.isArray(a.deliveries)))throw Error('Invalid AE delivery ledger');
    if(a.legacyReturns!=null){
      if(!Array.isArray(a.legacyReturns))throw Error('Invalid legacy AE material storage');
      a.legacyReturns.forEach(function(row){
        if(typeof row.sender!=='string'||!Array.isArray(row.resources))throw Error('Invalid legacy AE material owner');
        row.resources=R.merge(row.resources.filter(Boolean).map(R.normalize));
        if(row.resources.some(function(r){return r.kind!=='item';}))throw Error('Invalid legacy circuit material');
      });
    }
    if (a.milestones != null && (!a.milestones || typeof a.milestones !== 'object' || Array.isArray(a
        .milestones) || Object.values(a.milestones).some(function(v) {
        return v !== true;
      }))) throw Error('Invalid AE progress');
    a.patterns = a.patterns.map(root.AE_PATTERNS.create);
    var patternIds = new Set();
    a.patterns.forEach(function(p) {
      if (patternIds.has(p.id)) throw Error('Duplicate AE saved pattern');
      patternIds.add(p.id);
    });
    var ids = new Set();
    a.cpus.forEach(function(cpu) {
      if (!cpu.id || ids.has(cpu.id) || typeof cpu.node !== 'string' || !Array.isArray(cpu
          .resources)) throw Error('Invalid AE CPU save');
      ids.add(cpu.id);
      delete cpu.planJob;
      if(cpu.planTarget)cpu.planTarget=R.normalize(cpu.planTarget);
      if(cpu.planFailure!=null&&(!cpu.planTarget||typeof cpu.planFailure!=='string'))throw Error('Invalid AE plan status');
      if (cpu.sequence != null) R.integer(cpu.sequence, true);
      // 丢弃不是 AE 资源格式的残留项（早期版本把物品栈写进来过）
      cpu.resources = R.merge(cpu.resources.filter(Boolean).map(R.normalize));
      if (cpu.order) {
        var j = cpu.order;
        if (!j.id || !Array.isArray(j.tasks) || !Array.isArray(j.flights) || !['running',
            'cancelling', 'returning'
          ].includes(j.status)) throw Error('Invalid AE order save');
        R.integer(j.sequence, true);
        j.target = R.normalize(j.target);
        j.tasks.forEach(function(t) {
          var keptGrid = t.pattern && t.pattern.gridKeys;
      t.pattern = root.AE_PATTERNS.create(t.pattern);
      if (keptGrid && !t.pattern.gridKeys) t.pattern.gridKeys = keptGrid.slice();
          R.integer(t.batches);
          R.integer(t.dispatched, true);
          R.integer(t.completed, true);
          if (t.completed > t.dispatched || t.dispatched > t.batches) throw Error(
            'Invalid AE task progress');
        });
        j.production = root.AE_PLANNER.production(j.target, j.tasks);
        var flights = new Set(),
          counts = j.tasks.map(function() {
            return 0;
          });
        j.flights.forEach(function(f) {
          if (!f.id || flights.has(f.id) || typeof f.port !== 'string' || !Number
            .isInteger(f.task) || f.task < 0 || f.task >= j.tasks.length || !Array
            .isArray(f.pending) || !f.pending.length) throw Error(
            'Invalid AE flight save');
          flights.add(f.id);
          f.pending = R.merge(f.pending.filter(Boolean).map(R.normalize));
          var task = j.tasks[f.task];
          counts[f.task]++;
          if (!root.AE_STORAGE.remove(task.pattern.outputs, f.pending)) throw Error('Invalid AE pending output');
        });
        j.flights=j.flights.filter(function(f){return f.pending.length;});
        if(j.status==='running'&&j.flights.some(function(f){return !f.configurationDelivered;}))delete a.configurationSchema;
        j.tasks.forEach(function(t, i) {
          if (t.dispatched - t.completed !== counts[i]) throw Error(
            'AE task lost its flight');
        });
      }
    });
    a.logisticsSchema=1;
    S.ae = a;
    prepared.add(a);
    return a;
  }

  function cpu(S, id) {
    return ensure(S).cpus.find(function(c) {
      return c.id === id;
    });
  }

  function createCPU(S, id, node) {
    var a = ensure(S);
    if (typeof id !== 'string' || !id || typeof node !== 'string' || !node || cpu(S, id))
      throw Error('Invalid AE CPU identity');
    var c = {
      id: id,
      node: node,
      resources: [],
      order: null
    };
    a.cpus.push(c);
    return c;
  }

  function preference(S, value) {
    if (typeof value !== 'boolean') throw Error('Invalid AE virtualization setting');
    ensure(S).virtualize = value;
  }

  function savePattern(S, pattern) {
    var a = ensure(S),
      p = root.AE_PATTERNS.create(pattern),
      i = a.patterns.findIndex(function(v) {
        return v.id === p.id;
      });
    if (i < 0) a.patterns.push(p);
    else a.patterns[i] = p;
    return TX.clone(p);
  }
  root.AE_STATE = {
    ensure: ensure,
    cpu: cpu,
    createCPU: createCPU,
    setVirtualize: preference,
    savePattern: savePattern
  };
  root.STATE_SCHEMA.register('ae', ['ae'], {ae:function(value){
    if(!value)return value;
    return Object.assign({},value,{cpus:value.cpus.map(function(cpu){var out=Object.assign({},cpu);delete out.planJob;return out;})});
  }});
  root.ITEM_STORES.registerState('ae-cpus', function(S) {
    return (S.ae && S.ae.cpus || []).map(function(c) {
      return root.ITEM_STORES.view('ae:cpu:' + c.id, c.resources, c.resources.filter(
        function(r) {
          return r.kind === 'item';
        }).map(R.native));
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);
