(function(root) {
  'use strict';
  var TX = root.GTTransactions,
    C = root.CONTENT;

  function integer(n, zero) {
    if (!Number.isSafeInteger(n) || n < (zero ? 0 : 1)) throw Error(
      'AE quantity must be a safe integer');
    return n;
  }

  function add(a, b) {
    return integer(a + b, true);
  }

  function multiply(a, b) {
    return integer(a * b, true);
  }

  function stable(v) {
    if (Array.isArray(v)) return v.map(stable);
    if (v && typeof v === 'object') {
      var out = {};
      Object.keys(v).sort().forEach(function(k) {
        out[k] = stable(v[k]);
      });
      return out;
    }
    return v;
  }

  function identity(r) {
    return JSON.stringify([r.kind, r.key, r.attributes || {}]);
  }

  function unique(r) {
    var a = r.attributes;
    return !!(a && (a.entityUid || a.instanceUid || (a.dmg != null && a.dmg > 0) || a.aeCell && a.aeCell.uid));
  }

  function normalize(r) {
    // 旧数据里可能用物品栈格式 {k,n} 存资源，先转过来再校验
    if (r && !r.kind && typeof r.k === 'string') {
      return item(r);
    }
    if(r&&!r.kind&&typeof r.f==='string')return fluid(r);
    if (!r || !['item', 'fluid'].includes(r.kind) || typeof r.key !== 'string' || !r.key) {
      throw Error('Invalid AE resource: ' + (function() {
        try { return JSON.stringify(r).slice(0, 240); } catch (e) { return String(r); }
      })());
    }
    var out = {
      kind: r.kind,
      key: r.kind === 'item' ? C.canonicalKey(r.key) : C.canonicalFluid(r.key),
      amount: integer(r.amount)
    };
    if (r.kind === 'item' && r.attributes && Object.keys(r.attributes).length) out.attributes =
      stable(TX.clone(r.attributes));
    if (out.attributes && out.attributes.dmg === 0) {
      delete out.attributes.dmg;
      if (!Object.keys(out.attributes).length) delete out.attributes;
    }
    // 配方格自带的候选清单：库存里有其中任意一项就能顶替这一格
    if (r.kind === 'item' && Array.isArray(r.alternatives) && r.alternatives.length) {
      var alts = [];
      r.alternatives.forEach(function(k) {
        if (typeof k !== 'string' || !k) return;
        var canonical = C.canonicalKey(k);
        if (canonical === out.key || alts.includes(canonical)) return;
        alts.push(canonical);
      });
      if (alts.length) out.alternatives = alts.sort();
      if (r.mixable) out.mixable = true;
    }
    if (out.attributes && ['k', 'n', 'kind', 'key', 'amount'].some(function(k) {
        return Object.prototype.hasOwnProperty.call(out.attributes, k);
      })) throw Error('Invalid AE item attributes');
    if (unique(out) && out.amount !== 1) throw Error('AE instances cannot be stacked');
    return out;
  }

  function item(s) {
    if (!s || !s.k) throw Error('Invalid AE item');
    var attrs = TX.clone(s);
    delete attrs.k;
    delete attrs.n;
    return normalize({
      kind: 'item',
      key: s.k,
      amount: s.n == null ? 1 : s.n,
      attributes: attrs
    });
  }

  function fluid(t) {
    if (!t || !t.f) throw Error('Invalid AE fluid');
    return normalize({
      kind: 'fluid',
      key: t.f,
      amount: t.mb
    });
  }

  function native(r) {
    return r.kind === 'item' ? Object.assign({
      k: r.key,
      n: r.amount
    }, TX.clone(r.attributes || {})) : {
      f: r.key,
      mb: r.amount
    };
  }

  function amount(r, n) {
    var out = TX.clone(r);
    out.amount = integer(n);
    if (unique(out) && out.amount !== 1) throw Error('AE instances cannot be stacked');
    return out;
  }

  function merge(values) {
    var out = new Map();
    values.forEach(function(r) {
      var id = identity(r),
        prior = out.get(id);
      if (prior) {
        if (unique(r)) throw Error('Duplicate AE instance');
        prior.amount = add(prior.amount, r.amount);
        // 同一物品出现在多格时保留先出现那格的候选：某格指定了具体物品就是固定
      } else out.set(id, TX.clone(r));
    });
    return Array.from(out.values());
  }

  function scale(values, factor) {
    integer(factor);
    return values.map(function(r) {
      return amount(r, multiply(r.amount, factor));
    });
  }
  root.AE_RESOURCES = {
    integer: integer,
    add: add,
    multiply: multiply,
    identity: identity,
    normalize: normalize,
    item: item,
    fluid: fluid,
    native: native,
    amount: amount,
    merge: merge,
    scale: scale,
    stable: stable
  };
})(typeof window !== 'undefined' ? window : globalThis);
