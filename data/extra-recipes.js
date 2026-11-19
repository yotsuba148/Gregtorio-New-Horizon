/* 额外合成配方。
   放置版的合成表里，格子存的是 data.ingredientGroups 的下标，
   每个 group 是一组可互换的物品下标（data.items 的下标）。
   这里给每个需要的物品新建一个单元素 group，再拼成 3×3 配方追加进去。
   只往 data.crafting 和 data.ingredientGroups 追加，不改任何既有条目。 */
(function(root){
  'use strict';

  // 形状 CTC / FMF / CBC
  var RECIPES = [
    { out: 'gregtech:gt.blockmachines@1127',
      C: 'circuitAdvanced',
      T: 'gregtech:gt.metaitem.01@32670',
      F: 'gregtech:gt.metaitem.01@17085',
      M: 'gregtech:gt.blockmachines@11',
      B: 'gregtech:gt.blockmachines@1123' },
    { out: 'gregtech:gt.blockmachines@1128',
      C: 'circuitData',
      T: 'gregtech:gt.metaitem.01@32671',
      F: 'gregtech:gt.metaitem.01@17084',
      M: 'gregtech:gt.blockmachines@12',
      B: 'gregtech:gt.blockmachines@1124' },
    { out: 'gregtech:gt.blockmachines@1129',
      C: 'circuitElite',
      T: 'gregtech:gt.metaitem.01@32672',
      F: 'gregtech:gt.metaitem.01@17070',
      M: 'gregtech:gt.blockmachines@13',
      B: 'gregtech:gt.blockmachines@1124' },
    { out: 'gregtech:gt.blockmachines@1130',
      C: 'circuitMaster',
      T: 'gregtech:gt.metaitem.01@32673',
      F: 'gregtech:gt.metaitem.01@17129',
      M: 'gregtech:gt.blockmachines@13',
      B: 'gregtech:gt.blockmachines@1125' }
  ];

  function install(){
    var C = root.CONTENT;
    if(!C || !C.data || !C.itemIndices) return false;
    var crafts = C.data.crafting, groups = C.data.ingredientGroups;
    if(!Array.isArray(crafts) || !Array.isArray(groups)) return false;

    var cache = Object.create(null);
    function groupFor(key){
      if(cache[key] != null) return cache[key];
      var gi = -1;
      // 允许直接引用 data.ore 里的分组（如 circuitAdvanced），整组可互换
      var oreGroup = C.data.ore && C.data.ore[key];
      if(Array.isArray(oreGroup) && oreGroup.length){
        gi = groups.length;
        groups.push(oreGroup.slice());
      } else {
        var itemIdx = C.itemIndices[key];
        if(itemIdx == null) return -1;
        gi = groups.length;
        groups.push([itemIdx]);
      }
      cache[key] = gi;
      return gi;
    }

    var startId = 900000;
    RECIPES.forEach(function(r, i){
      if(crafts.some(function(c){ return Array.isArray(c) && c[0] === startId + i; })) return;
      var outIdx = C.itemIndices[r.out];
      if(outIdx == null) return;
      var grid = [
        groupFor(r.C), groupFor(r.T), groupFor(r.C),
        groupFor(r.F), groupFor(r.M), groupFor(r.F),
        groupFor(r.C), groupFor(r.B), groupFor(r.C)
      ];
      if(grid.some(function(g){ return g < 0; })) return;
      crafts.push([startId + i, outIdx, 1, grid, 3, 3, false, {}]);
    });
    return true;
  }

  if(!install() && typeof document !== 'undefined'){
    document.addEventListener('DOMContentLoaded', install);
  }
})(typeof window !== 'undefined' ? window : globalThis);
