(function(root) {
  'use strict';
  var R = root.AE_RESOURCES,
    ST = root.AE_STORAGE,
    TX = root.GTTransactions,
    cache = new WeakMap(),
    loaded = new WeakSet();

  function rule(stack) {
    return stack && root.AE_CONTENT.cells[CONTENT.canonicalKey(stack.k)] || null;
  }

  function ensure(stack) {
    if (!rule(stack)) return null;
    if (!stack.aeCell) stack.aeCell = {
      version: 1,
      contents: []
    };
    var cell = stack.aeCell;
    if (cell.version !== 1 || !Array.isArray(cell.contents)) throw Error('Invalid ME storage cell');
    if (!Array.isArray(cell.partition)) cell.partition = [];
    if (!loaded.has(cell)) {
      var normalized = R.merge(cell.contents.filter(Boolean).map(R.normalize));
      if (normalized.some(function(r) {
          return r.kind !== rule(stack).kind;
        })) throw Error('Invalid ME cell resource type');
      cell.contents = normalized;
      loaded.add(cell);
    }
    if (!cell.uid) cell.uid = root.crypto && root.crypto.randomUUID ? root.crypto.randomUUID() : 'cell-' +
      Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
    return cell;
  }

  function usage(contents, spec) {
    var values = contents,
      count = values.reduce(function(n, r) {
        return R.add(n, r.amount);
      }, 0);
    return {
      types: values.length,
      amount: count,
      bytes: values.length * spec.bytesPerType + Math.ceil(count / spec.unitsPerByte)
    };
  }

  function room(contents, resource, spec) {
    if (resource.kind !== spec.kind) return 0;
    if (resource.attributes && resource.attributes.aeCell && resource.attributes.aeCell.contents.length)
      return 0;
    var used = usage(contents, spec),
      same = contents.some(function(r) {
        return R.identity(r) === R.identity(resource);
      });
    if (!same && used.types >= spec.types) return 0;
    var overhead = (used.types + (same ? 0 : 1)) * spec.bytesPerType;
    return Math.max(0, (spec.bytes - overhead) * spec.unitsPerByte - used.amount);
  }

  function adapter(stack) {
    var cell = ensure(stack),
      spec = rule(stack);
    if (!cell) return null;
    var prior = cache.get(cell);
    if (prior) return prior;
    var a = ST.buffer('cell:' + cell.uid, cell.contents);
    a.commitTracked = true;
    a.room = function(contents, r) {
      /* 进来就必须是完整资源：没有 key 的东西根本不许写进存储单元 */
      if (!r || !r.key) {
        try { console.error('拒绝写入损坏资源', JSON.stringify(r), new Error().stack); } catch (e) {}
        return 0;
      }
      // 分区过的元件只收列出来的东西
      if (cell.partition && cell.partition.length) {
        var allowed = cell.partition.some(function(p) {
          return p && p.key === r.key && (p.kind || 'item') === r.kind;
        });
        if (!allowed) return 0;
      }
      return room(contents, r, spec);
    };
    cache.set(cell, a);
    return a;
  }

  function inspect(stack) {
    var spec = rule(stack),
      cell = ensure(stack);
    return spec ? Object.assign({
      kind: spec.kind,
      capacity: spec.bytes,
      typeCapacity: spec.types
    }, usage(cell.contents, spec)) : null;
  }

  function indicator(stack, used) {
    var spec = rule(stack);
    if (!spec) return 0;
    used = used || inspect(stack);
    if (!used.amount) return 1;
    var left = (spec.bytes - used.types * spec.bytesPerType) * spec.unitsPerByte - used.amount;
    if (used.types < spec.types && left > spec.bytesPerType * spec.unitsPerByte) return 2;
    return left > 0 ? 3 : 4;
  }
  ITEM_STORES.registerChildren('me-cells', function(S, stack, context) {
    if (!stack.aeCell || !rule(stack)) return;
    var cell = ensure(stack);
    return [ITEM_STORES.view(context.viewId + ':cell:' + context.index, cell.contents, cell.contents
      .filter(function(r) {
        return r.kind === 'item';
      }).map(R.native), {
        recover: false
      })];
  });
  /* 分区：只收列出来的资源；传空数组等于取消分区 */
  function partition(stack, list) {
    var cell = ensure(stack);
    if (!cell) return [];
    if (list !== undefined) {
      cell.partition = (list || []).map(function (r) {
        var res = R.normalize(r.amount ? r : { kind: r.kind || 'item', key: r.key, amount: 1 });
        return { kind: res.kind, key: res.key };
      });
    }
    return cell.partition.map(function (p) { return { kind: p.kind, key: p.key }; });
  }

  root.AE_CELLS = {
    partition: partition,
    rule: rule,
    ensure: ensure,
    adapter: adapter,
    inspect: inspect,
    indicator: indicator,
    room: room
  };
})(typeof window !== 'undefined' ? window : globalThis);
