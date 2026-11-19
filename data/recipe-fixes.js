/* 配方归属修正（通用版）
 * 导入时单方块机器的合成配方与物品错开了档位：物品是 LV，配方却是 HV 的部件。
 * 做法：按 recipeMap 把同一族机器归组，读出每条配方的“机器外壳”档位，
 * 再把它分配给同档位的那个物品。只改 data.crafting 的输出下标，不新增配方。
 */
(function () {
  'use strict';
  var C = window.CONTENT, GD = window.GD;
  if (!C || !C.data || !C.data.crafting || !GD) return;
  var D = C.data, names = GD.items || {};

  var TIERS = ['UXV', 'UMV', 'UIV', 'UEV', 'UHV', 'LuV', 'ZPM', 'UV', 'IV', 'EV', 'HV', 'MV', 'LV'];
  function tierOfName(n) {
    for (var i = 0; i < TIERS.length; i++) {
      var t = TIERS[i];
      if (new RegExp('(^|[^A-Za-z])' + t + '($|[^A-Za-z])').test(n || '')) return t;
    }
    return null;
  }
  function recipeTier(row) {
    var found = null;
    (row[3] || []).forEach(function (g) {
      if (g < 0) return;
      (D.ingredientGroups[g] || []).forEach(function (j) {
        var n = names[D.items[j].k] || '';
        var m = n.match(/(UXV|UMV|UIV|UEV|UHV|LuV|ZPM|UV|IV|EV|HV|MV|LV)机器(?:外壳|方块)/);
        if (m) found = m[1];
      });
    });
    return found;
  }

  /* 物品：档位 → crafting 行下标集合；按 recipeMap 分族 */
  var families = {};
  var itemTier = {};         /* itemIndex -> tier */
  var rowsByItem = {};       /* itemIndex -> [rowIndex] */
  D.crafting.forEach(function (row, ri) {
    var item = D.items[row[1]];
    if (!item || !/^gregtech:gt\.blockmachines@/.test(item.k)) return;
    var def = window.DEFS && DEFS.of(item.k);
    if (!def) return;
    var it = tierOfName(names[item.k] || '');
    if (!it) return;
    var rt = recipeTier(row);
    if (!rt) return;
    var key = def.recipeMap || def.cat || '?';
    if (!families[key]) families[key] = { items: {}, rows: [] };
    families[key].items[it] = row[1];
    families[key].rows.push({ ri: ri, tier: rt });
    itemTier[row[1]] = it;
    (rowsByItem[row[1]] = rowsByItem[row[1]] || []).push(ri);
  });

  if (true) { GD.recipeFixes = { disabled: true }; return; }
  var moved = 0, familiesFixed = 0;
  Object.keys(families).forEach(function (key) {
    var fam = families[key];
    var plan = [];   /* { rowIndex, targetItemIndex } */
    fam.rows.forEach(function (r) {
      var target = fam.items[r.tier];
      if (target != null && D.crafting[r.ri][1] !== target) plan.push({ ri: r.ri, target: target });
    });
    if (!plan.length) return;
    familiesFixed++;
    plan.forEach(function (p) {
      D.crafting[p.ri][1] = p.target;
      moved++;
    });
  });

  GD.recipeFixes = { familiesFixed: familiesFixed, rowsMoved: moved };
})();
