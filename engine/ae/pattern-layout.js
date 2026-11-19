(function(root) {
  'use strict';
  var R = AE_RESOURCES;

  function virtualResource(v) {
    return v.kind === 'item' ? v.resource : R.item({
      k: AE_PATTERNS.circuitKey(v.number || 0),
      n: 1
    });
  }

  function resources(p) {
    if (!p) return [];
    if(p.mode==='crafting')return AE_PATTERNS.craftingCells(p).cells;
    var ordinary = p.inputs.map(function(r, i) {
        return {
          resource: r, field: 'inputs', index: i
        };
      }),
      reusable = p.reusable.map(function(r, i) {
        return {
          resource: r,
          reusable: true, field: 'reusable', index: i
        };
      }),
      virtuals = p.virtual.map(function(v, i) {
        return {
          resource: virtualResource(v),
          virtualIndex: i,
          field: 'virtual', index: i,
          command: v.kind
        };
      });
    return ordinary.concat(reusable, virtuals);
  }

  function section(items, columns, rows, page, center) {
    var size = columns * rows,
      pages = Math.max(1, Math.ceil(items.length / size)),
      at = Math.max(0, Math.min(pages - 1, page || 0)),
      cells = Array(size).fill(null);
    items.slice(at * size, (at + 1) * size).forEach(function(r, i) {
      cells[center && items.length === 1 ? Math.floor(size / 2) : i] = r;
    });
    return {
      columns: columns,
      rows: rows,
      page: at,
      pages: pages,
      cells: cells,
      allCells: items.length > size ? items : cells
    };
  }

  function plan(p, d, view) {
    view = view || {};
    var expanded = !!d.extended && (!p || p.mode === 'processing'),
      rows = expanded ? 4 : 3,
      inputColumns = expanded && view.inverted ? 1 : rows,
      outputColumns = expanded && view.inverted ? rows : 1,
      ins = resources(p),
      outs = [];
    if (p && p.mode === 'crafting') {
      /* AE2：合成模式产物槽照常显示，由九格现算，只读 */
      /* 合成模式的产物就用样板里存的那份（编码时按九格算好），渲染时不再反查配方 */
      outs = (p.clearedSlots || []).length ? [] : (p.outputs || []).slice(0, 1).map(function (r) {
        return { resource: r, field: null, index: 0 };
      });

    } else if (p && !(p.clearedSlots || []).length) {
      outs = p.outputs.map(function(r, i) { return { resource: r, field: 'outputs', index: i }; });
    }
    return {
      expanded: expanded,
      input: section(ins, inputColumns, rows, view.inPage),
      output: p && p.mode === 'crafting'
        ? section(outs.slice(0, 1), 1, 1, 0, true)
        : section(outs, outputColumns, rows, view.outPage)
    };
  }
  root.AE_PATTERN_LAYOUT = {
    plan: plan,
    resources: resources,
    virtualResource: virtualResource
  };
})(typeof window !== 'undefined' ? window : globalThis);
