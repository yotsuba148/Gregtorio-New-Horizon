(function(root) {
  'use strict';
  var data = root.AE_CONTENT,
    prepared = new WeakMap();

  function spec(m) {
    return m && data.devices[CONTENT.canonicalKey(m.k)] || null;
  }

  function ensure(m) {
    var d = spec(m);
    if (!d) return null;
    if (prepared.get(m) === m.me && m.me) return m.me;
    if (!m.me) m.me = {
      version: 1
    };
    var s = m.me;
    if (s.version !== 1) throw Error('Invalid ME device save');
    if (d.cellSlots) {
      if (!s.cells) s.cells = Array(d.cellSlots).fill(null);
      if (!Array.isArray(s.cells)) throw Error('Invalid ME drive');
    }
    if (d.role === 'cellworkbench') {
      // 分区是标记，只记身份
      if (!Array.isArray(s.partition)) s.partition = Array(63).fill(null);
      var bench = s.cells && s.cells[0],
        benchCell = bench && root.AE_CELLS && AE_CELLS.rule(bench) ? AE_CELLS.ensure(bench) : null;
      if (benchCell) {
        var wanted = [];
        s.partition.forEach(function(x) {
          var mark = root.AE_MARKERS.normalize(x);
          if (mark) wanted.push(mark);
        });
        benchCell.partition = wanted.length ? wanted : null;
      }
    }
    if (d.role === 'ioport') {
      if (s.mode == null) s.mode = 'import';
      if (!['import', 'export'].includes(s.mode)) s.mode = 'import';
    }
    if (d.role === 'level') {
      if (s.threshold == null) s.threshold = 1;
      if (s.above == null) s.above = true;
      if (s.samples == null) s.samples = [];
    }
    if (d.role === 'p2p') {
      if (!s.p2p) s.p2p = {kind: 'me', frequency: 0};
    }
    if (d.role === 'grower') {
      if (s.progress == null) s.progress = 0;
      if (!Number.isFinite(s.progress) || s.progress < 0) s.progress = 0;
    }
    if (d.role === 'wireless') {
      // 频道就是玩家自己起的名字，同名即连通；空表示不连接
      if (s.channel == null || typeof s.channel !== 'string') s.channel = '';
      if (s.channel.length > 24) s.channel = s.channel.slice(0, 24);
    }
    if (d.role === 'maintainer') {
      // 标记只记身份，和真实物品槽分开存
      if (!Array.isArray(s.itemMarks)) s.itemMarks = Array(9).fill(null);
      if (!Array.isArray(s.fluidMarks)) s.fluidMarks = Array(9).fill(null);
      if (!Array.isArray(s.amounts)) s.amounts = Array(9).fill(0);
      if (!Array.isArray(s.fluidAmounts)) s.fluidAmounts = Array(9).fill(0);
      if (!Array.isArray(s.enabled)) s.enabled = Array(9).fill(true);
      if (!Array.isArray(s.fluidEnabled)) s.fluidEnabled = Array(9).fill(true);
      if (!Array.isArray(s.pending)) s.pending = [];
      if (s.period == null) s.period = 20;
      // 旧档里的真实物品槽迁移成标记
      (function migrateMarks(list, target) {
        if (!Array.isArray(list)) return;
        for (var i = 0; i < list.length && i < target.length; i++) {
          if (!target[i] && list[i]) target[i] = root.AE_MARKERS.normalize(list[i]);
        }
      })(s.samples, s.itemMarks);
      (function migrateFluid(list, target) {
        if (!Array.isArray(list)) return;
        for (var i = 0; i < list.length && i < target.length; i++) {
          var key = list[i] && (list[i].key || list[i].k);
          if (!target[i] && key) {
            var fluid = root.AE_MARKERS && GD.containerRegistry ?
              (GD.containerRegistry.find(function(p) { return p.filled === key; }) || {}).fluid : null;
            if (fluid) target[i] = {kind: 'fluid', key: fluid};
          }
        }
      })(s.fluidSamples, s.fluidMarks);
      delete s.samples;
      delete s.fluidSamples;
    }
    if (d.itemSlots) {
      if (!s.items) s.items = Array(d.itemSlots).fill(null);
      if (!Array.isArray(s.items)) throw Error('Invalid ME interface inventory');
    }
    if (d.tankSlots) {
      if (!s.fluids) s.fluids = Array(d.tankSlots).fill(null);
      if (!Array.isArray(s.fluids)) throw Error('Invalid ME fluid buffer');
    }
    if (d.patterns && !s.encoding) s.encoding = [null, null];
    if (d.patterns) {
      if (!Array.isArray(s.encoding) || s.encoding.length !== 2) throw Error('Invalid pattern slots');
      s.encoding.forEach(function(stack, i) {
        if (stack && (!Number.isSafeInteger(stack.n) || stack.n < 1 || stack.n > (i === 0 && CONTENT
            .canonicalKey(stack.k) === 'appliedenergistics2:item.ItemMultiMaterial@52' ? data
            .blankPatternCapacity : 1))) throw Error('Invalid pattern stack size');
      });
    }
    if (d.role === 'assembler') {
      if (!Array.isArray(m.ins)) m.ins = [];
      while (m.ins.length < 9) m.ins.push(null);
    }
    if (d.returnSlots && !s.returns) s.returns = Array(d.returnSlots).fill(null);
    if (d.patternSlots) {
      if (!s.patterns) s.patterns = Array(d.patternSlots).fill(null);
      if (!Array.isArray(s.patterns)) throw Error('Invalid ME pattern inventory');
      if (d.role === 'interface') { AE_UPGRADES.ensure(m); while (s.patterns.length < 36) s.patterns.push(null); }
    }
    if (d.target || d.role === 'interface') {
      if (s.samples == null) s.samples = [];
      if (!Array.isArray(s.samples)) throw Error('Invalid ME filter slots');
      if (s.access == null) s.access = 'readwrite';
      if (!['read', 'write', 'readwrite'].includes(s.access)) throw Error('Invalid ME storage-bus access');
      if (s.priority == null) s.priority = 0;
      if (!Number.isSafeInteger(s.priority)) throw Error('Invalid ME storage priority');
    }
    if(d.role==='interface'){
      ['blocking','smartBlocking'].forEach(function(field){
        if(s[field]==null)s[field]=false;
        if(typeof s[field]!=='boolean')throw Error('Invalid interface blocking mode');
      });
    }
    ['samples', 'stock', 'fluidStock'].forEach(function(field) {
      if (s[field] != null) {
        if (!Array.isArray(s[field])) throw Error('Invalid ME configuration slots');
        s[field] = s[field].map(function(r) {
          return r ? AE_RESOURCES.normalize(r) : null;
        });
      }
    });
    ['patterns', 'encoding'].forEach(function(field) {
      if (s[field]) s[field].forEach(function(stack) {
        if (stack && stack.aePattern) stack.aePattern = AE_PATTERNS.create(stack.aePattern);
      });
    });
    if (s.draft) s.draft = AE_PATTERNS.draft(s.draft);
    else if (d.patterns && s.encoding[1]) AE_PATTERNS.loadEncoded(s, s.encoding[1]);
    prepared.set(m, s);
    return s;
  }
  Object.keys(data.devices).forEach(function(k) {
    var p = data.devices[k],
      name = GD.items[k],
      receiver = !!p.receiveEU;
    GD.extraMachineDefinitions.push({
      key: k,
      cat: 'ae',
      cn: name,
      entityName: name,
      tier: 0,
      tag: 'AE',
      volt: receiver ? DEFS.voltOf(14) : 0,
      behavior: 'ae_device',
      recipeMap: 'none:ae',
      slots: p.nativeSlots || {
        in: 0,
        out: 0,
        fluid: 0
      },
      preserveItemSlots: !!p.nativeSlots,
      fluidInputTanks: [],
      fluidOutputTanks: [],
      energyCapacity: p.energyCapacity || 0,
      startEnergy: 0,
      amperage: receiver ? 32 : 0,
      autoItems: false,
      autoFluids: false,
      controlCircuit: false,
      directionless: p.role === 'interface',
      sharedGridLayers: p.role === 'cable' ? ['eioItem', 'eioFluid'] : undefined,
      supportsCovers: false,
      runSwitch: false,
      hideIOToggles: true,
      resetOnDismantle: true,
      windowWidth: 620
    });
  });
  GD.machines.cats.push({
    id: 'ae',
    cn: '应用能源',
    slots: {
      in: 0,
      out: 0,
      fluid: 0
    },
    tiers: Object.keys(data.devices).map(function(k) {
      return {
        k: k,
        t: 0,
        tag: 'AE',
        name: GD.items[k]
      };
    })
  });
  Object.keys(data.ports).forEach(function(k) {
    var s = data.ports[k];
    s.hasExtraContents = function(p) {
      return !!p.me && ((p.me.patterns || []).some(Boolean) || (p.me.buffer || []).length > 0 || (p.me
        .outputFluids || []).some(Boolean));
    };
    s.itemStores = function(p){
      if(!p.me)return [];var views=[];
      if(p.me.patterns)views.push(ITEM_STORES.view(p.uid+':patterns',p.me.patterns,p.me.patterns));
      if(p.me.buffer)views.push(ITEM_STORES.view(p.uid+':ae-buffer',p.me.buffer,p.me.buffer.filter(function(r){return r.kind==='item';}).map(AE_RESOURCES.native)));
      return views;
    };
    s.canReplace = function(p, next) {
      return !s.hasExtraContents(p) || p.k === next;
    };
    if (s.fluidOut) {
      s.outputFluidBuffer = function(p) {
        var m = AE_FACTORY.portState(p);
        if (!m.outputFluids) m.outputFluids = [];
        return m.outputFluids;
      };
      s.commitOutputFluids = function(p, values) {
        p.me.outputFluids = values;
      };
    }
    MULTIBLOCKS.registerPort(k, s);
  });
  ENGINE.registerBehavior('ae_device', {
    ensure: ensure,
    tick: function(m, context) {
      if (spec(m).role === 'assembler' && root.AE_CRAFTING) return AE_CRAFTING.tick(m, context);
      return false;
    }
  });
  ITEM_STORES.registerEntity('ae-devices', function(S, m) {
    var d = spec(m),
      s = d && ensure(m);
    if (!s) return;
    var views = [];
    ['cells', 'items', 'patterns', 'encoding', 'returns', 'upgrades'].forEach(function(field) {
      if (s[field]) views.push(ITEM_STORES.view(m.uid + ':me:' + field, s[field], s[field]));
    });
    if (d.role === 'assembler') {
      views.push(ITEM_STORES.view(m.uid + ':craft-input', m.ins, m.ins));
      views.push(ITEM_STORES.view(m.uid + ':craft-output', m.outs, m.outs));
    }
    var cpu = S.ae && S.ae.cpus.find(function(c) {
      return c.id === m.uid;
    });
    if (cpu) views.push(ITEM_STORES.view('ae:cpu:' + cpu.id, cpu.resources, cpu.resources.filter(
      function(r) {
        return r.kind === 'item';
      }).map(AE_RESOURCES.native)));
    return {
      replaceSlots: true,
      views: views
    };
  });
  DEFS.rebuild();
  function syncPartition(m){
    var s=ensure(m),stack=s&&s.cells&&s.cells[0];
    if(spec(m).role!=='cellworkbench'||!stack)return;
    var cell=AE_CELLS.ensure(stack);cell.partition=s.partition.map(AE_MARKERS.normalize).filter(Boolean);
  }
  root.AE_DEVICES = {
    spec: spec,
    syncPartition: syncPartition,
    ensure: ensure
  };
})(typeof window !== 'undefined' ? window : globalThis);
