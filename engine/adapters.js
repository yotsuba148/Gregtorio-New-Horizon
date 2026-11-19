/* Source-backed dynamic recipe families. Register once; machines use the shared batch engine. */
(function(root){
 'use strict';
 var c=root.CONTENT;
 // GT5U FurnaceBackend: smelting registry -> 128 ticks, 4 EU/t.
 c.data.furnace.forEach(function(row,i){
  c.registerRecipe({id:'adapter:furnace:'+i,map:'gt.recipe.e_furnace',in:[{k:c.data.items[row[0]].k,n:1}],
   out:[{k:c.data.items[row[1]].k,n:row[2]}],durationTicks:128,eut:4,source:'GT5U FurnaceBackend + runtime furnace'});
 });
 root.FUEL_RULES={
  // Snapshot GTMachineLoader efficiencies. Values are percentages.
  diesel:{map:'gt.recipe.dieselgeneratorfuel',efficiency:[0,95,90,85,60,50]},
  gas:{map:'gt.recipe.gasturbinefuel',efficiency:[0,95,90,85,60,50]},
  semifluid:{map:'gtpp.recipe.semifluidgeneratorfuels'},
  magic:{map:'gt.recipe.magicfuels'},plasma:{map:'gt.recipe.plasmageneratorfuels'},
  geothermal:{map:'gt.recipe.thermalgeneratorfuel'}
 };
})(typeof window!=='undefined'?window:globalThis);
