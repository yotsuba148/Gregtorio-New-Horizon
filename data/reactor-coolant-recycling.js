(function(){
  'use strict';

  const cold = 'gregtech:gt.360k_Helium_Coolantcell@0';
  const wildcard = 'gregtech:gt.360k_Helium_Coolantcell@32767';
  const id = 'idle:hot_helium_coolant_cell';
  const hot = id+'@0';
  CONTENT.registerItem({k:hot,base:hot,id,meta:0,maxStack:CONTENT.maxStack(cold),name:'360k氦冷却单元（待冷却）'});
  (GD.itemIconAliases ||= {})[hot] = cold;
  (GD.jeiItemAliases ||= {})[wildcard] = hot;
  GD.reactor.coolantProducts[cold] = {k:hot,n:1};

  // Keep the native recipe IDs and timings. Both the raw JEI index and the
  // decoded machine recipes must read the same concrete input.
  for (const [map,index] of [['gt.recipe.vacuumfreezer',191],['gtpp.recipe.cryogenicfreezer',127]]) {
    const recipe = CONTENT.recipe('gt:'+map+':'+index);
    const row = CONTENT.data.maps[map]?.find(record=>record[0]===index);
    if (recipe?.in[0]?.k!==wildcard || CONTENT.data.items[row?.[1]?.[0]?.[0]]?.k!==wildcard) {
      throw Error('Missing 360k helium coolant recipe: '+map);
    }
    row[1][0][0] = CONTENT.itemIndices[hot];
    recipe.in[0] = {k:hot,n:recipe.in[0].n};
    delete CONTENT.inputIndices[map];
  }

  const map = 'native:reactor-coolant';
  (GD.recipeMapLabels ||= {})[map] = '核反应堆';
  CONTENT.registerRecipe({
    id:map+':helium-360k',map,durationTicks:0,
    in:[{k:cold,n:1}],out:[{k:hot,n:1}],
    automationAllowed:false,patternEncodable:false
  });
})();
