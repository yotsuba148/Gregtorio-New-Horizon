(function(root) {
  'use strict';
  var R = AE_RESOURCES,
    ST = AE_STORAGE,
    TX = GTTransactions;
  var crafter = new CraftingProcessor(CONTENT, {
    isTool: function(k) {
      return !!CRAFT_TOOLS.type(k);
    },
    craftWear: function(k) {
      return (GD.toolRules[CONTENT.baseKey(k)] || {}).craftWear || 1;
    },
    createStack: AE_PATTERNS.makeStack
  });

  function id() {
    return 'pattern-' + (root.crypto && root.crypto.randomUUID ? root.crypto.randomUUID() : Date.now()
      .toString(36) + '-' + Math.random().toString(36).slice(2));
  }

  function fromJEI(S, m, entry, choices) {
    var d = AE_DEVICES.spec(m),
      s = d && AE_DEVICES.ensure(m);
    if (!s || !d.patterns && !d.crafting) return {
      ok: false,
      code: 'TERMINAL'
    };
    if (!entry || !['craft', 'machine'].includes(entry.kind) || !d.patterns && entry.kind !== 'craft') return {
      ok: false,
      code: 'RECIPE_MAP'
    };
    var options = {
      id: id(),
      virtualize: d.patterns && AE_STATE.ensure(S).virtualize,
      choices: {}
    };
    Object.keys(choices || {}).forEach(function(key) {
      options.choices[key.replace(/^craft:/, 'slot:')] = choices[key];
    });
    try {
      var pattern = entry.kind === 'craft' ? AE_PATTERNS.fromCrafting(entry.recipe, options) : AE_PATTERNS
        .fromRecipe(entry.recipe, options);
      if(PROCESSING_CONFIGURATION.circuitConflict(pattern.virtual))return {ok:false,code:'CIRCUIT_CONFLICT'};
      /* 画布：点箭头抄工作台配方时终端切成 3x3，抄机器配方时是列表；样板类型跟着画布走 */
      s.canvas = pattern.mode === 'crafting' ? 'craft' : 'process';
      s.draft = pattern;
      return {
        ok: true
      };
    } catch (error) {
      if (error.code) return {
        ok: false,
        code: error.code
      };
      throw error;
    }
  }

  function encode(S, m, options) {
    options = options || {};
    var d = AE_DEVICES.spec(m),
      s = d && AE_DEVICES.ensure(m);
    if (!d || !d.patterns || !s.draft) return {
      ok: false,
      code: 'PATTERN'
    };
    if(PROCESSING_CONFIGURATION.circuitConflict(s.draft.virtual))return {ok:false,code:'CIRCUIT_CONFLICT'};
    /* 合成模式的产物还没算，先别因为 outputs 为空就拒绝 */
    if (s.draft.mode !== 'crafting' && !s.draft.outputs.length) return {
      ok: false,
      code: 'PATTERN'
    };
    if (!s.draft.inputs.length && !s.draft.reusable.length && !s.draft.virtual.length ||
        s.draft.mode === 'crafting' && (s.draft.clearedSlots || []).length) return {
      ok: false, code: 'INCOMPLETE_PATTERN'
    };
    var draft = s.draft;
    if (draft.mode === 'crafting') {
      var match = AE_CRAFTING.forPattern(draft);
      if (!match) return { ok: false, code: 'INCOMPLETE_PATTERN' };
      draft = Object.assign({}, draft, {outputs:[{kind:'item',key:match.out,amount:match.n||1}]});
    }
    if (!draft.outputs.length) return { ok: false, code: 'PATTERN' };
    var source = s.encoding[0], output = s.encoding[1],
      legacy = !output && source && source.aePattern,
      existing = output || legacy && source,
      blanks = source && CONTENT.canonicalKey(source.k) === AE_INVENTORY.blank ? TX.count(source) : 0;
    if (!existing && !blanks) return {ok: false, code: 'BLANK_PATTERN'};
    var p = AE_PATTERNS.create(draft),
      a = ST.slots(m.uid + ':encoding', s.encoding, {
        slots: 2,
        maxStack: function(k) {
          return CONTENT.canonicalKey(k) === AE_INVENTORY.blank ? AE_CONTENT.blankPatternCapacity : 1;
        }
      }),
      tx = new ST.Transaction();
    p.id = id();
    var stack = {k: AE_INVENTORY.encoded, n: 1, aePattern: p}, amount = 1;
    if (options.toInventory) {
      var bag = ST.slots('player:bag', S.inv),
        requested = options.all ? blanks + (existing ? 1 : 0) : 1;
      amount = Math.min(requested, bag.room(tx.read(bag), R.item(stack)));
      if (!amount || !tx.edit(bag, [], [R.item(Object.assign({}, stack, {n: amount}))]))
        return {ok: false, code: 'SLOTS'};
    }
    var spent = amount - (existing ? 1 : 0),
      remaining = legacy ? null : blanks ? (blanks > spent ? Object.assign({}, source, {n: blanks - spent}) : null) : source;
    tx.stage(a, [remaining, options.toInventory ? null : stack]);
    var result = tx.commit();
    if (result.ok) {
      s.draft = draft;
      if (root.AE_PROGRESS) {
        AE_PROGRESS.record(S, 'pattern');
        if (p.virtual.length) AE_PROGRESS.record(S, 'virtual_pattern');
      }
    }
    return Object.assign(result, {encoded: result.ok ? amount : 0});
  }

  function craft(S, m) {
    var s = AE_DEVICES.ensure(m),
      p = s.draft,
      r = p && AE_CRAFTING.forPattern(p);
    if (!r || p.mode !== 'crafting') return {
      ok: false,
      code: 'RECIPE_MAP'
    };
    var c = AE_FACTORY.get(S),
      status = c.network.status(m.uid);
    if (!status.ok) return status;
    var before = c.network.snapshot(m.uid).filter(function(r) {
        return r.kind === 'item';
      }),
      arr = before.map(R.native);
    while (arr.length < 512) arr.push(null);
    var plan = crafter.plan(r, [arr], {}, {
      state: S,
      bench: true,
      requireOutputSpace: true
    });
    if (!plan.ok) return plan;
    var after = R.merge(plan.storages[0].filter(Boolean).map(R.item)),
      keys = new Map();
    before.forEach(function(r) {
      keys.set(R.identity(r), r);
    });
    after.forEach(function(r) {
      keys.set(R.identity(r), r);
    });
    var take = [],
      put = [];
    keys.forEach(function(r) {
      var delta = ST.count(after, r) - ST.count(before, r);
      if (delta < 0) take.push(R.amount(r, -delta));
      else if (delta > 0) put.push(R.amount(r, delta));
    });
    var tx = c.network.transaction(),
      removed = c.network.extract(tx, m.uid, take);
    if (!removed.ok) return removed;
    var added = c.network.insert(tx, m.uid, put);
    if (!added.ok) return {
      ok: false,
      code: 'SLOTS'
    };
    return tx.commit();
  }
  ITEM_DESCRIPTIONS.register('ae', function(stack) {
    if (stack.aePattern) return stack.aePattern.outputs.map(function(r) {
      return (r.kind === 'fluid' ? GD.fluids[r.key] || r.key : GD.items[r.key] || r.key) + ' ×' +
        r.amount + (r.kind === 'fluid' ? ' mB' : '');
    }).join('\n');
    if (stack.aeCell) {
      var u = AE_CELLS.inspect(stack);
      return u.bytes + ' / ' + u.capacity + ' B，' + u.types + ' / ' + u.typeCapacity + ' 种';
    }
    return '';
  });
  root.AE_TERMINAL = {
    fromJEI: fromJEI,
    encode: encode,
    craft: craft,
    id: id
  };
})(typeof window !== 'undefined' ? window : globalThis);
