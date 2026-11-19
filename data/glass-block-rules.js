(function(){
 'use strict';
 var C=CONTENT,hidden=C.data.catalogReview.hidden;
 var stained=Array.from({length:6},function(_,i){return 'bartworks:BW_GlasBlocks@'+(i+6);});
 stained.forEach(function(key){hidden[key]=true;});
 var removed=C.removeRecipes(function(recipe){return recipe.out.some(function(o){return stained.includes(o.k);});});
 [1,2,13,14,15].forEach(function(meta){
  var key='bartworks:BW_GlasBlocks@'+meta;
  delete hidden[key];
  GD.items[key]=C.rawItems[key].name;
  GD.iconOverrides[key]='modicons/glass/native-'+meta+'.png';
 });
 GD.glassBlockRules={removedRecipes:removed.length,addedRecipes:0};
})();
