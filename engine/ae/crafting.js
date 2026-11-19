(function(root) {
  'use strict';
  var TX = GTTransactions,
    R = AE_RESOURCES,
    ST = AE_STORAGE,
    recipeIndex;
  var crafter = new CraftingProcessor(CONTENT, {
    isTool: function(k) {
      return !!CRAFT_TOOLS.type(k);
    },
    craftWear: function(k) {
      return (GD.toolRules[CONTENT.baseKey(k)] || {}).craftWear || 1;
    },
    createStack: AE_PATTERNS.makeStack
  });

  function recipe(id) {
    /* 稳定标识：out:<产物key>，按产物反查配方 */
    if (typeof id === 'string' && id.indexOf('out:') === 0) {
      var key = id.slice(4);
      return (GD.craft || []).find(function (r) {
        return r && r.out === key && !r.station && Array.isArray(r.slots);
      }) || null;
    }
    if (!recipeIndex) recipeIndex = new Map(GD.craft.map(function(r) {
      return [r.id, r];
    }));
    return recipeIndex.get(id) || null;
  }

  function filtered(original, virtuals) {
    var r = TX.clone(original),
      nc = (r.flags || {}).nonConsumedSlots || [],
      slots = [],
      retained = [];
    r.slots.forEach(function(alternatives, i) {
      var skip = nc.includes(i) && virtuals.some(function(v) {
        return v.kind === 'item' && alternatives.some(function(k) {
          return CONTENT.matches(k, v.resource.key);
        });
      });
      if (skip) return;
      if (nc.includes(i)) retained.push(slots.length);
      slots.push(alternatives);
    });
    r.slots = slots;
    r.flags = Object.assign({}, r.flags, {
      nonConsumedSlots: retained
    });
    return r;
  }

  /* 通用解析：按材料（九格或清单）反查工作台配方，不依赖样板里的编号 */
  function recipeFor(list) {
    var keys = (list || []).filter(function (r) {
      /* 虚拟电路、不消耗项不参与九格匹配 */
      if (!r) return false;
      if (r.virtual || r.reusable) return false;
      var k = r.key || r.k || r;
      return typeof k === 'string' && k.indexOf('virtual:') !== 0;
    }).map(function (r) { return r.key || r.k || r; });
    if (!keys.length) return null;
    return (root.GD.craft || []).find(function (r) {
      if (!r || !Array.isArray(r.slots) || r.slots.length !== keys.length) return false;
      return matchesSlots(r, keys.map(function (k) { return { k: k }; }));
    }) || null;
  }
  function matchesSlots(r, present) {
    var left = present.map(function (x) { return x.k || x.key; });
    var alike = function (a, k) {
      var A = String(a), K = String(k);
      if (A.indexOf('@32767') >= 0 || K.indexOf('@32767') >= 0) return A.split('@')[0] === K.split('@')[0];
      return CONTENT.matches(a, k);
    };
    return r.slots.length === left.length && r.slots.every(function (alts) {
      var at = left.findIndex(function (k) { return (alts || []).some(function (a) { return alike(a, k); }); });
      if (at < 0) return false;
      left.splice(at, 1);
      return true;
    });
  }

  function prepare(c, node, tx, packet, receiving) {
    var m = receiving.machine, d = AE_DEVICES.spec(m);
    if (!d || d.role !== 'assembler') return { ok: false, code: 'RECIPE_MAP' };
    if (packet.inputs.some(function (r) { return r.kind !== 'item'; })) return { ok: false, code: 'RECIPE_MAP' };
    var state = AE_DEVICES.ensure(m);
    if(packet.mode!=='crafting')return {ok:false,code:'RECIPE_MAP'};
    if(m.job||(m.ins||[]).some(Boolean)||(m.outs||[]).some(Boolean)||
       (state.returns||[]).some(Boolean)||(m.eject||[]).some(Boolean)||
       state.craftRequest&&state.craftRequest.remainingStarts>0)return {ok:false,code:'BUSY'};
    var units=[];
    packet.inputs.forEach(function(resource){
      for(var i=0;i<resource.amount;i++)units.push(R.native(R.amount(resource,1)));
    });
    if(units.length>9)return {ok:false,code:'SLOTS'};
    var grid=Array(9).fill(null),slots=packet.gridKeys;
    if(slots&&slots.length===9){
      var used=new Set();
      for(var si=0;si<9;si++){
        if(!slots[si])continue;
        var requirement=(packet.ingredients||[]).find(function(r,i){return !used.has(i)&&r.key===slots[si];});
        var index=(packet.ingredients||[]).indexOf(requirement);
        if(index>=0)used.add(index);
        var at=units.findIndex(function(stack){return [slots[si]].concat(requirement&&requirement.alternatives||[]).some(function(key){return CONTENT.matches(key,stack.k);});});
        if(at<0)return {ok:false,code:'INPUT'};
        grid[si]=units.splice(at,1)[0];
      }
      if(units.length)return {ok:false,code:'INPUT'};
    }else units.forEach(function(stack,i){grid[i]=stack;});
    var request = {
      inputs: grid.filter(Boolean).map(TX.clone),
      virtual:TX.clone(packet.virtual||[]),
      outputs: TX.clone(packet.outputs || []),
      gridKeys: grid.map(function(stack){return stack?stack.k:null;}),
      slotKeys: Array.isArray(packet.slotKeys) ? packet.slotKeys.slice(0, 9) : null,
      remainingStarts: packet.recipeBatches || 1
    };
    tx.stage(ST.properties(m.uid + ':assembler-ins', m, ['ins']), { ins: grid });
    tx.stage(ST.properties(m.uid + ':assembler-request', state, ['craftRequest']), { craftRequest: request });
    return { ok: true };
  }

  var craftList = null;
  function craftingRecipes() {
    if (!craftList) craftList = (root.GD.craft || []).filter(function(r) { return r && Array.isArray(r.slots); });
    return craftList;
  }
  function matchGrid(grid, prefer, allowFallback) {
    craftingRecipes();
    var present = grid.filter(Boolean);
    if (prefer) {
      var exact = craftList.find(function (r) {
        return r.out === prefer && r.slots.length === present.length && matchesSlots(r, present);
      });
      if (exact) return exact;
      /* 加载样板时不用别的配方顶替；执行时按九格继续找 */
      if (allowFallback === false) return null;
    }
    return craftList.find(function (r) {
      if (r.slots.length !== present.length) return false;
      var left = present.map(function (x) { return x.k || x.key; });
      return r.slots.every(function (alts) {
        var at = left.findIndex(function (k) { return (alts || []).some(function (a) { return CONTENT.matches(a, k); }); });
        if (at < 0) return false;
        left.splice(at, 1);
        return true;
      });
    }) || null;
  }

  /* AE2 TileMolecularAssembler：SPEED[已装速度卡数] 决定每 tick 推进的进度 */
  var SPEED = [10, 13, 17, 20, 25, 50];

  /* AE2 PatternHelper：pass/fail 缓存 + 逐格试替换 */
  function slotCache(p) {
    if (!p._slotTest) p._slotTest = { ok: new Set(), no: new Set() };
    return p._slotTest;
  }
  function gridKeys(p) {
    return (p.inputs || []).map(function (r) { return r && (r.key || r.k); });
  }
  function isValidSlot(p, index, item) {
    var cache = slotCache(p), mark = index + '|' + item;
    if (cache.ok.has(mark)) return true;
    if (cache.no.has(mark)) return false;
    var expected = (p.outputs || [])[0];
    if (!expected) return false;
    var base = gridKeys(p);
    if (!base[index]) return false;
    if (base[index] === item) { cache.ok.add(mark); return true; }
    var probe = base.slice();
    probe[index] = item;
    var test = matchGrid(probe.map(function (k) { return { k: k }; }));
    if (test && test.out === expected.key) { cache.ok.add(mark); return true; }
    cache.no.add(mark);
    return false;
  }
  /* 加载/使用时按九格重算正统产物；匹配不到即判无效（对应 InvalidPattern） */
  function canonical(p) {
    if (p.mode !== 'crafting') return p;
    var saved = (p.outputs || [])[0];
    var r = Array.isArray(p.gridKeys) && p.gridKeys.length === 9 ? forPattern(p) :
      matchGrid(gridKeys(p).map(function (k) { return { k: k }; }), saved && saved.key, false);
    if (!r) {
      /* 配方表与样板来源可能不一致；样板自带产物时以它为准，不判无效 */
      p.invalid = true;
      return p;
    }
    p.invalid = false;
    p.outputs = [{ kind: 'item', key: r.out, amount: r.n || 1 }];
    return p;
  }

  /* AE2/原版：按 3×3 位置匹配配方（有形状的配方空格也必须真的空） */
  function findRecipeForGrid(grid, prefer) {
    craftingRecipes();
    var alike = function (a, k) {
      var A = String(a), K = String(k);
      if (A.indexOf('@32767') >= 0 || K.indexOf('@32767') >= 0) return A.split('@')[0] === K.split('@')[0];
      return root.CONTENT.matches(a, k);
    };
    var hit = null;
    craftList.forEach(function (r) {
      if (hit) return;
      if (r.station) return;
      if (prefer && r.out !== prefer) return;
      if (prefer && r.out === prefer && root.__AE_DEBUG) root.__AE_DEBUG.push({ cand: r.id, grid: r.grid, slots: r.slots });
      if (Array.isArray(r.grid) && r.grid.length === 9) {
        for (var i = 0; i < 9; i++) {
          var cell = grid[i], want = r.grid[i];
          if (want == null || want < 0) { if (cell) return; }
          else if (!cell || !(r.slots[want] || []).some(function (a) { return alike(a, cell.k); })) {
            if (prefer && root.__AE_DEBUG) root.__AE_DEBUG.push({ stage: 'cellmiss', cell: i, want: r.slots[want], got: cell && cell.k });
            return;
          }
        }
        hit = r;
        return;
      }
      var left = grid.filter(Boolean);
      if (r.slots.length !== left.length) return;
      var pool = left.slice();
      var ok = r.slots.every(function (alts) {
        var at = pool.findIndex(function (x) { return (alts || []).some(function (a) { return alike(a, x.k); }); });
        if (at < 0) return false;
        pool.splice(at, 1);
        return true;
      });
      if (ok) hit = r;
    });
    return hit;
  }

  function forPattern(p) {
    if (!p || p.mode !== 'crafting' || (p.clearedSlots || []).length) return null;
    var expected = (p.outputs || [])[0], r;
    if (Array.isArray(p.gridKeys) && p.gridKeys.length === 9) {
      var mapped=AE_PATTERNS.craftingCells(p);
      if(!mapped.complete)return null;
      var grid=mapped.cells.map(function(value){return value.resource?R.native(value.resource):null;});
      r = findRecipeForGrid(grid, expected && expected.key);
    } else {
      r = matchGrid((p.inputs || []).map(R.native), expected && expected.key, false);
    }
    return r && (!root.CONTENT_SCOPE || CONTENT_SCOPE.recipeAllowed(r)) ? r : null;
  }

  function start(c, m) {
    var s = AE_DEVICES.ensure(m), p = s.craftRequest;
    if (!p || !p.inputs || !p.inputs.length) return false;
    /* AE2 的判定不是“物品完全相同”，而是“按这格换上去，产物仍一致” */
    var speed = 0;
    try { speed = Math.min(SPEED.length - 1, root.AE_UPGRADES.count(m, 'speed')); } catch (e) { speed = 0; }
    canonical(p);
    if (p.invalid) { m.status = { code: 'ITEM_INPUT', text: '样板已失效' }; return false; }
    var expected = (p.outputs || [])[0];
    if (!expected) { m.status = { code: 'ITEM_INPUT', text: '样板没有产物' }; return false; }
    var gridIn = (m.ins || []).slice(),
      expect = (p.gridKeys && p.gridKeys.length === 9) ? p.gridKeys : null;
    for (var i = 0; i < 9; i++) {
      var got = gridIn[i],
        want = expect ? expect[i] : p.inputs[i];
      if (!got) {
        if (want) { m.status = { code: 'ITEM_INPUT', text: '原料不匹配' }; return false; }
        continue;
      }
      /* 有九格位置时以配方匹配为准（AE2 就是这个语义），逐槽再校验会误杀 */
      if (!want || (!expect && !isValidSlot(p, i, got.k))) { m.status = { code: 'ITEM_INPUT', text: '原料不匹配' }; return false; }
    }
    var r = findRecipeForGrid(gridIn, expected.key);
    if (!r || r.out !== expected.key) { m.status = { code: 'ITEM_INPUT', text: '配方不匹配' }; return false; }
    var planned=crafter.plan(r,[gridIn,Array(16).fill(null)],{},
      {state:c.state,outputBoxes:[1],returnBoxes:[1],requireOutputSpace:true});
    if(!planned.ok){m.status={code:'ITEM_INPUT',text:'原料不匹配'};return false;}
    m.ins=planned.storages[0];
    m.job={recipeId:r.id,recipe:{id:r.id,map:'none:ae',out:[{k:r.out,n:r.n||1}],fin:[],fout:[]},
      durationTicks:Math.max(1,Math.ceil(100/SPEED[speed])),progressTicks:0,EUt:5,
      inputs:TX.clone(planned.consumed),fluidInputs:[],outputs:planned.storages[1].filter(Boolean),fluidOutputs:[],aeCrafting:true};
    p.remainingStarts--;
    return true;
  }

  function finish(c,m) {
    var s = AE_DEVICES.ensure(m),
      j = m.job,
      main = TX.planOutput(m.outs, [j.outputs[0]], 1, function(k) {
        return CORE.maxStack(k);
      }, true),
      returns = TX.planOutput(s.returns, j.outputs.slice(1), 9, function(k) {
        return CORE.maxStack(k);
      }, true);
    if (!main || !returns) {
      m.status = {
        code: 'COMPLETED_OUTPUT_BLOCKED',
        text: '输出受阻'
      };
      return false;
    }
    m.outs = main;
    s.returns = returns;
    m.completedBatches = (m.completedBatches || 0) + 1;
    m.job = null;
    if(s.craftRequest&&s.craftRequest.remainingStarts===0){delete s.craftRequest;s.flushInputs=true;}
    m.status = {
      code: 'IDLE',
      text: '等待原料'
    };
    return true;
  }

  function tick(m, context) {
    var c = AE_FACTORY.peek(context.state) || AE_FACTORY.get(context.state),
      s = AE_DEVICES.ensure(m),
      changed = false;
    if (!s.craftRequest && !m.job && s.patterns[0] && s.patterns[0].aePattern && m.ins.some(Boolean)) {
      var p=AE_PATTERNS.create(s.patterns[0].aePattern);
      if(p.mode==='crafting')s.craftRequest=Object.assign(TX.clone(p),{remainingStarts:p.recipeBatches||1});
    }
    var status = c.network.status(m.uid);
    if (!status.ok) {
      m.status = AE_FACTORY.machineStatus(status);
      return false;
    }
    if (!m.job) {
      if (!s.craftRequest || s.craftRequest.remainingStarts <= 0) return false;
      if (!start(c, m)) return false;
      changed = true;
    }
    if (m.job.progressTicks >= m.job.durationTicks) return finish(c,m) || changed;
    if (!AE_FACTORY.consume(c, m.uid, 5)) {
      m.status = {
        code: 'ENERGY',
        text: 'ME网络电量不足'
      };
      return changed;
    }
    m.energySpent = (m.energySpent || 0) + 5;
    m.job.progressTicks = DEVELOPER_MODE.oneTick(context.state) ? m.job.durationTicks : m.job
      .progressTicks + 1;
    m.status = {
      code: 'RUNNING',
      text: '合成中'
    };
    changed = true;
    if (m.job.progressTicks >= m.job.durationTicks) finish(c,m);

    return changed;
  }
  root.AE_CRAFTING = { start: start, recipeFor: recipeFor, canonical: canonical, isValidSlot: isValidSlot,
    prepare: prepare,
    tick: tick,
    recipe: recipe,forGrid:findRecipeForGrid,forPattern:forPattern
  };
})(typeof window !== 'undefined' ? window : globalThis);
