/* AE 线缆染色：原版 GTNHRecipes/network/cables/*.recipe 里是
   「8 个 Fluix 默认色线缆围 1 个染料 -> 8 个同色线缆」，这里照搬。
   四类线缆在我们的数据里元数据是连续 16 色 + 1 个 Fluix 默认色。 */
(function(){
 'use strict';
 var families = [0, 20, 40, 60];                 // 玻璃、包层、智能、致密智能
 var dyes = [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]; // 白→骨粉 … 黑→墨囊
 var grid = [0, 1, 2, 3, 4, 5, 6, 7, 8];
 families.forEach(function(base){
  for(var c = 0; c < 16; c++){
   var out = 'appliedenergistics2:item.ItemMultiPart@' + (base + c);
   if(GD.craft.some(function(r){ return r.out === out; })) continue;
   var cable = ['appliedenergistics2:item.ItemMultiPart@' + (base + 16)];
   var slots = [];
   for(var i = 0; i < 9; i++) slots.push(i === 4 ? ['minecraft:dye@' + dyes[c]] : cable.slice());
   GD.craft.push({
    id: 'ae:cable-dye:' + base + ':' + c,
    out: out, n: 8,
    slots: slots, grid: grid.slice(), width: 3, height: 3, shapeless: false,
    flags: {}, source: 'runtime', station: null
   });
  }
 });
})();
