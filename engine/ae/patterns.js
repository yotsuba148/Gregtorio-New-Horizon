(function(root) {
  'use strict';
  var R = root.AE_RESOURCES,
    TX = root.GTTransactions;

  function circuitKey(number) {
    return PROCESSING_ACCESS.circuitKey(number);
  }

  function makeStack(k, n) {
    return CRAFT_TOOLS.type(k) ? Object.assign(PLAYER_TOOLS.create(k), {
      n: n
    }) : {
      k: k,
      n: n
    };
  }

  function virtual(v) {
    if (!v || !['circuit', 'resetCircuit', 'item'].includes(v.kind)) throw Error(
      'Invalid AE virtual configuration');
    if (v.kind === 'resetCircuit') return {
      kind: v.kind
    };
    // 老数据里虚拟配置可能是物品栈格式 {k,n}，先转成 AE 资源
    function coerce(r) {
      if (!r) return r;
      if (r.kind && r.key) return r;
      if (typeof r.k === 'string') return {kind: 'item', key: r.k, amount: r.n || r.amount || 1};
      return r;
    }
    if (v.kind === 'circuit') {
      if (!Number.isInteger(v.number) || v.number < 0 || v.number > 24) throw Error(
        'Invalid AE circuit number');
      var out = {
        kind: v.kind,
        number: v.number
      };
      if (v.resource) out.resource = R.normalize(coerce(v.resource));
      return out;
    }
    var item = R.normalize(coerce(v.resource));
    if (item.kind !== 'item') throw Error('Virtual catalyst must be an item');
    return {
      kind: 'item',
      resource: item
    };
  }

  function draft(p) {
    if (!p || typeof p.id !== 'string' || !p.id)
      throw Error('AE pattern needs stable identities');
    var out = {
      id: p.id,
      mode: p.mode || 'processing',
      /* PatternHelper keeps uncondensed slots separately from condensed resource costs. */
      inputs: (p.inputs || []).map(R.normalize),
      outputs: R.merge((p.outputs || []).map(R.normalize)),
      reusable: R.merge((p.reusable || []).map(R.normalize)),
      virtual: (p.virtual || []).map(virtual)
    };
    var rb = Number(p.recipeBatches);
    out.recipeBatches = Number.isFinite(rb) && rb > 0 ? Math.trunc(rb) : 1;
    var pr = Number(p.priority);
    out.priority = Number.isFinite(pr) ? Math.trunc(pr) : 0;
    if (p.slotKeys) out.slotKeys = p.slotKeys.slice();
    if (p.gridKeys) out.gridKeys = p.gridKeys.slice();
    if (p.clearedSlots) out.clearedSlots = p.clearedSlots.map(Number);
    return out;
  }

  function create(p) {
    var out = draft(p);
    // Keep the physical pattern editable when loading an older conflicting pattern.
    if(PROCESSING_CONFIGURATION.circuitConflict(out.virtual)){
      out.invalid=true;
      return out;
    }
    /* AE2 PatternHelper：合成样板在解析时按九格重算产物，算不出就判无效 */
    if (out.mode === 'crafting' && root.AE_CRAFTING && root.AE_CRAFTING.canonical) {
      out = root.AE_CRAFTING.canonical(out);
      if (out.invalid) return out;
    }
    if (!out.outputs.length) throw Error('Invalid AE pattern');
    delete out.clearedSlots;
    return out;
  }

  function loadEncoded(state, stack) {
    if (!stack || !stack.aePattern) return false;
    var draft = create(stack.aePattern);
    state.canvas = draft.mode === 'crafting' ? 'craft' : 'process';
    state.draft = draft;
    return true;
  }

  function craftingCells(p) {
    var pool=[];
    ['inputs','reusable','virtual'].forEach(function(field) {
      (p[field]||[]).forEach(function(value,index) {
        var resource=field==='virtual'?(value.kind==='item'?value.resource:R.item({k:circuitKey(value.number||0),n:1})):value;
        var row={resource:resource,field:field,index:index};
        if(field==='reusable')row.reusable=true;
        if(field==='virtual'){row.virtualIndex=index;row.command=value.kind;}
        pool.push({row:row,remaining:resource.amount,perSlot:field==='inputs'?(p.recipeBatches||1):1});
      });
    });
    var keys=p.gridKeys||p.slotKeys||(p.inputs||[]).map(function(r){return r.key;}),missing=false;
    var cells=Array.from({length:9},function(_,cell) {
      if((p.clearedSlots||[]).includes(cell)||!keys[cell])return {craftingSlot:cell};
      var entry=pool.find(function(value) {return value.row.resource.kind==='item'&&value.row.resource.key===keys[cell]&&value.remaining>=value.perSlot;});
      if(!entry){missing=true;return {craftingSlot:cell};}
      entry.remaining-=entry.perSlot;
      return Object.assign({},entry.row,{resource:R.amount(entry.row.resource,entry.perSlot),craftingSlot:cell});
    });
    return {cells:cells,complete:!missing&&!pool.some(function(entry){return entry.remaining>0;})};
  }

  function remove(p, field, index, amount, craftingSlot) {
    if (!['inputs', 'outputs', 'reusable', 'virtual'].includes(field) ||
        !Number.isInteger(index) || index < 0 || index >= p[field].length)
      throw Error('Invalid AE draft slot');
    var out = TX.clone(p), row = out[field][index];
    if (field !== 'virtual' && amount && row.amount > amount) row.amount -= R.integer(amount);
    else out[field].splice(index, 1);
    if (craftingSlot != null) {
      out.clearedSlots = out.clearedSlots || [];
      if (!out.clearedSlots.includes(craftingSlot)) out.clearedSlots.push(craftingSlot);
    }
    return draft(out);
  }

  function expand(p, factor) {
    R.integer(factor);
    var out = TX.clone(p);
    out.inputs = R.scale(p.inputs, factor);
    out.outputs = R.scale(p.outputs, factor);
    out.recipeBatches = R.multiply(p.recipeBatches || 1, factor);
    return draft(out);
  }

  function resize(p, factor) {
    if (!Number.isSafeInteger(factor) || !factor || factor === -1) return null;
    var values = p.inputs.concat(p.outputs).map(function(r) { return r.amount; }).concat(p.recipeBatches || 1),
      size = Math.abs(factor);
    if (factor < 0 && values.some(function(n) { return n % size; }) ||
        factor > 0 && values.some(function(n) { return n > Math.floor(2147483647 / size); })) return null;
    var out = TX.clone(p);
    ['inputs', 'outputs'].forEach(function(field) {
      out[field] = p[field].map(function(r) { return R.amount(r, factor > 0 ? r.amount * size : r.amount / size); });
    });
    out.recipeBatches = factor > 0 ? (p.recipeBatches || 1) * size : (p.recipeBatches || 1) / size;
    return draft(out);
  }

  function quantity(p, field, index, n) {
    if (!['inputs', 'outputs', 'reusable'].includes(field) || !p[field][index] ||
        !Number.isSafeInteger(n) || n < 1 || n > 2147483647) return null;
    var out = TX.clone(p);
    out[field][index] = R.amount(out[field][index], n);
    if (out.mode === 'processing') {
      var recipe = null, rates = [];
      if (recipe) {
        (recipe.in || []).forEach(function(part) {
          var amount = out.inputs.filter(function(r) { return r.kind === 'item' &&
            [part.k].concat(part.alternatives || []).some(function(k) { return CONTENT.matches(k, r.key); });
          }).reduce(function(sum, r) { return sum + r.amount; }, 0);
          if (part.n > 0) rates.push(amount / part.n);
        });
        (recipe.fin || []).forEach(function(part) {
          if (part.mb > 0) rates.push(out.inputs.filter(function(r) { return r.kind === 'fluid' && r.key === CONTENT.canonicalFluid(part.f); })
            .reduce(function(sum, r) { return sum + r.amount; }, 0) / part.mb);
        });
        if (rates.length && Number.isSafeInteger(rates[0]) && rates[0] > 0 && rates.every(function(n) { return n === rates[0]; }))
          out.recipeBatches = rates[0];
      }
    }
    return draft(out);
  }

  function withoutVirtual(p, index) {
    if (!Number.isInteger(index) || index < 0 || index >= p.virtual.length) throw Error(
      'Invalid AE virtual slot');
    var out = TX.clone(p);
    out.virtual.splice(index, 1);
    return out;
  }
  // Recipe selection resolves ore alternatives once, at the terminal boundary.
  function concrete(key) {
    var value = CONTENT.item(key);
    if (!value || value.meta !== 32767) return key;
    return (CONTENT.byRawId[value.id] || []).find(function(k) {
      var v = CONTENT.item(k);
      return v && v.meta !== 32767 && CONTENT_SCOPE.allowed(k);
    }) || key;
  }

  /* 通配/标签展开成具体物品：矿辞取第一个成员，meta 32767 取同 id 的真实 meta */
  /* 通配候选（meta 32767）按 id 比较，其它交给 CONTENT.matches */
  function sameKind(a, b) {
    var A = String(a), B = String(b);
    if (A.indexOf('@32767') >= 0 || B.indexOf('@32767') >= 0)
      return A.split('@')[0] === B.split('@')[0];
    return root.CONTENT.matches(a, b);
  }

  function concretePick(k) {
    var C = root.CONTENT;
    if (!k || typeof k !== 'string') return null;
    if (k.indexOf('ore:') === 0) {
      var tag = k.slice(4), list = (C.data.ore || {})[tag] || [];
      for (var i = 0; i < list.length; i++) {
        var row = C.data.items[list[i]];
        if (row) return C.canonicalKey(row.k);
      }
      return null;
    }
    if (k.indexOf('@32767') >= 0) {
      var id = k.slice(0, k.lastIndexOf('@'));
      var keys = Object.keys(C.data.items || {});
      for (var j = 0; j < keys.length; j++) {
        var it = C.data.items[keys[j]];
        if (it && String(it.k).indexOf(id + '@') === 0) return C.canonicalKey(it.k);
      }
      /* 数据里没有 @32767 的具体变体时，按 meta 逐个试出真实物品 */
      for (var m = 0; m < 32; m++) {
        var probe = id + '@' + m;
        if (C.item(probe)) return C.canonicalKey(probe);
      }
    }
    return k;
  }

  function canEncodeRecipe(recipe) {
    return recipe.patternEncodable !== false;
  }

  function fromRecipe(recipe, options) {
    if (!canEncodeRecipe(recipe)) throw Object.assign(Error('Recipe has no fixed pattern'), { code: 'RECIPE_MAP' });
    options = options || {};
    var choices = options.choices || {},
      inputs = [],
      outputs = [],
      reusable = [],
      virtuals = [];

    function item(p, slot, n) {
      var explicit = choices[slot],
        sensitive = p.nbtSensitive != null ? p.nbtSensitive === true : recipe.nbtSensitive === true,
        key;
      if (explicit) {
        if (sensitive && root.CONTENT.canonicalKey(explicit) !== root.CONTENT.canonicalKey(p.k))
          throw Object.assign(Error('AE ingredient does not match recipe'), { code: 'CHOICE', slot: slot });
        /* 通配配方只接受同 id 的具体物品，无关物品必须拒绝 */
        if (p.k && String(p.k).indexOf('@32767') >= 0 && !sameKind(p.k, explicit))
          throw Object.assign(Error('AE ingredient does not match recipe'), { code: 'CHOICE', slot: slot });
        /* 明示选择也不能绕过配方的排除列表：机器接受才是真接受 */
        if (p.alternatives && p.alternatives.length &&
            !p.alternatives.some(function (a) { return sameKind(a, explicit); }))
          throw Object.assign(Error('AE ingredient does not match recipe'), { code: 'CHOICE', slot: slot });
        if(p.k&&!(p.alternatives&&p.alternatives.length)&&!root.CONTENT.matches(p.k,explicit,{exact:sensitive,ignoreNBT:!sensitive}))
          throw Object.assign(Error('AE ingredient does not match recipe'), { code: 'CHOICE', slot: slot });
        key = concrete(concretePick(explicit));
      } else {
        key = concrete(concretePick(p.k || (p.alternatives && p.alternatives[0]) || (p.circuit != null ? circuitKey(p.circuit) : null)));
        if (p.alternatives && p.alternatives.length) {
          if (!p.alternatives.some(function (a) { return sameKind(a, key); }))
            throw Object.assign(Error('AE ingredient does not match recipe'), { code: 'CHOICE', slot: slot });
        } else if (p.k && !sameKind(p.k, key)) {
          throw Object.assign(Error('AE ingredient does not match recipe'), { code: 'CHOICE', slot: slot });
        }
      }
      if (!key || !root.CONTENT.item(key)) throw Object.assign(Error('Choose an AE ingredient'), {
        code: 'CHOICE',
        slot: slot
      });
      var out = R.item({
        k: key,
        n: n
      });
      // 机器槽一次只吃同一种物品，候选可以换，但不能两种混着凑数量
      if (!choices[slot] && Array.isArray(p.alternatives) && p.alternatives.length > 1)
        out.alternatives = p.alternatives.slice();
      return out;
    }
    (recipe.in || []).forEach(function(p, i) {
      inputs.push(item(p, 'in:' + i, p.n));
    });
    (recipe.fin || []).filter(function(p) { return p.mb > 0; }).forEach(function(p) {
      inputs.push(R.fluid(p));
    });
    (recipe.out || []).forEach(function(p) {
      outputs.push(R.item({
        k: p.k,
        n: p.n
      }));
    });
    (recipe.fout || []).filter(function(p) { return p.mb > 0; }).forEach(function(p) {
      outputs.push(R.fluid(p));
    });
    (recipe.req || []).forEach(function(p, i) {
      if (p.circuit != null && options.virtualize) {
        virtuals.push({
          kind: 'circuit',
          number: p.circuit
        });
        return;
      }
      var r = item(p, 'req:' + i, p.n || 1);
      if (options.virtualize) virtuals.push(p.circuit != null ? {
        kind: 'circuit',
        number: p.circuit,
        resource: r
      } : {
        kind: 'item',
        resource: r
      });
      else reusable.push(r);
    });
        /* 概率产出在数据里是数组，展开成多条产物，不能把数组当 key */
    outputs = outputs.reduce(function (acc, o) {
      if (o && Array.isArray(o.key)) {
        o.key.forEach(function (x) {
          acc.push({ kind: 'item', key: CONTENT.canonicalKey(x.k || x.key), amount: x.n || 1 });
        });
        return acc;
      }
      acc.push(o);
      return acc;
    }, []);
return create({
      id: options.id,
      mode: options.mode || 'processing',
      inputs: inputs,
      outputs: outputs,
      reusable: reusable,
      virtual: virtuals
    });
  }

  function fromCrafting(recipe, options) {
    options = options || {};
    if (recipe.station || recipe.width > 3 || recipe.height > 3) throw Object.assign(Error(
      'Dedicated crafting station'), {
      code: 'STATION'
    });
    var inputs = [],
      slotKeys = [],
      reusable = [],
      virtuals = [],
      outputs = [{ kind: 'item', key: CONTENT.canonicalKey(recipe.out), amount: recipe.n || 1 }],
      nc = (recipe.flags || {}).nonConsumedSlots || [];
    recipe.slots.forEach(function(alternatives, i) {
      var pick = (options.choices || {})['slot:' + i] || alternatives.find(function(k) {
        return CONTENT_SCOPE.allowed(k);
      }) || alternatives[0];
      if((options.choices||{})['slot:'+i]&&!alternatives.some(function(k){return sameKind(k,pick);}))
        throw Object.assign(Error('AE ingredient does not match recipe'),{code:'CHOICE',slot:i});
      var k = concrete(pick) || pick;
      /* 抄配方时按槽位自动选料：只要槽里有候选项就直接用，不再二次匹配 */
      if (!k) throw Object.assign(Error('Choose a crafting ingredient'), {
        code: 'CHOICE',
        slot: i
      });
      var tool = !!CRAFT_TOOLS.type(k),
        r = R.item(makeStack(k, 1));
      // 工作台配方允许用同格的不同种材料混着凑，机器槽不允许
      if (alternatives.length > 1 && !(options.choices || {})['slot:' + i]) {
        r.alternatives = alternatives.slice();
        r.mixable = true;
      }
      if (nc.includes(i) && !tool) {
        if (options.virtualize) virtuals.push({
          kind: 'item',
          resource: r
        });
        else reusable.push(r);
      } else {
        slotKeys[i] = k;
        inputs.push(r);
        if (!tool) {
          var container = CONTENT.data.containers.find(function(row) {
            return CONTENT.canonicalKey(CONTENT.data.items[row[1]].k) === CONTENT.canonicalKey(k);
          });
          if (container) outputs.push(R.item({
            k: CONTENT.canonicalKey(CONTENT.data.items[container[0]].k),
            n: 1
          }));
        }
      }
    });
    if (!(outputs[0] && outputs[0].key)) {
      var viaGrid = root.AE_CRAFTING && root.AE_CRAFTING.recipeFor ? root.AE_CRAFTING.recipeFor(inputs) : null;
      if (viaGrid) outputs.unshift({ kind: 'item', key: CONTENT.canonicalKey(viaGrid.out), amount: viaGrid.n || 1 });
    }
    var built = create({
      id: options.id,
      /* 3x3 网格画布：只有工作台配方走这里 */
      mode: 'crafting',
      slotKeys: slotKeys,
      inputs: inputs,
      outputs: outputs,
      reusable: reusable,
      virtual: virtuals
    });
    /* 九格位置单独存：slotKeys 是输入顺序，gridKeys 是 3×3 落在哪一格 */
    if (recipe.grid && recipe.grid.length === 9) {
      var byGrid = Array(9).fill(null);
      recipe.grid.forEach(function (slotIndex, cell) {
        if (slotIndex >= 0 && built.slotKeys && built.slotKeys[slotIndex] != null) byGrid[cell] = built.slotKeys[slotIndex];
      });
      built.gridKeys = byGrid;
    }
    return built;
  }
  root.AE_PATTERNS = {
    create: create,
    loadEncoded: loadEncoded,
    draft: draft,
    craftingCells: craftingCells,
    remove: remove,
    expand: expand,
    resize: resize,
    quantity: quantity,
    withoutVirtual: withoutVirtual,
    canEncodeRecipe: canEncodeRecipe,
    fromRecipe: fromRecipe,
    fromCrafting: fromCrafting,
    circuitKey: circuitKey,
    makeStack: makeStack,
    normalizeVirtual: virtual
  };
})(typeof window !== 'undefined' ? window : globalThis);
