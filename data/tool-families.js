(function () {
  'use strict';
  var C = window.CONTENT, GD = window.GD;
  if (!C || !C.data || !GD) return;
  var D = C.data, items = D.items;
  /* 工具族：同一 metatool 基 id（@12、@14…）的所有材料变体等价 */
  var TOOL = /^(gregtech:gt\.metatool\.\d+@\d+)(~.*)?$/;
  var family = {}, toolIdx = {};
  items.forEach(function (it, i) {
    var m = TOOL.exec(it.k || '');
    if (!m) return;
    toolIdx[i] = 1;
    (family[m[1]] = family[m[1]] || []).push(i);
  });
  var baseOf = {};
  Object.keys(family).forEach(function (b) { family[b].forEach(function (i) { baseOf[i] = b; }); });
  var groups = D.ingredientGroups, added = 0, touched = 0;
  for (var g = 0; g < groups.length; g++) {
    var list = groups[g], grows = false, fams = {};
    for (var j = 0; j < list.length; j++) {
      if (toolIdx[list[j]]) { fams[baseOf[list[j]]] = 1; grows = true; }
    }
    if (!grows) continue;
    var seen = {};
    list.forEach(function (i) { seen[i] = 1; });
    Object.keys(fams).forEach(function (b) {
      family[b].forEach(function (i) {
        if (!seen[i]) { list.push(i); seen[i] = 1; added++; }
      });
    });
    touched++;
  }
  if (C.craftCache) C.craftCache = {};
  if (window.RECIPE_QUERY && RECIPE_QUERY.invalidate) RECIPE_QUERY.invalidate();
  GD.toolFamilies = { families: Object.keys(family).length, tools: Object.keys(toolIdx).length, groups: touched, added: added };
})();

