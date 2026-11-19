/* The selected warehouse is a destination, never an overflow search order. */
(function(root){
 'use strict';
 function ensure(S){
  var state=S.warehouse||(S.warehouse={sequence:0,targetId:null}),used=new Set();
  state.sequence=Math.max(0,Math.floor(Number(state.sequence)||0));
  (S.chests||[]).forEach(function(chest){
   if(!chest.itemStoreId||used.has(chest.itemStoreId)){
    do{chest.itemStoreId='warehouse-'+(++state.sequence);}while(used.has(chest.itemStoreId)||(S.chests||[]).some(function(other){return other!==chest&&other.itemStoreId===chest.itemStoreId;}));
   }
   used.add(chest.itemStoreId);
  });
  if(!used.has(state.targetId))state.targetId=(S.chests||[])[0]?.itemStoreId||null;
  return state;
 }
 function selected(S){var state=ensure(S);return(S.chests||[]).find(function(c){return c.itemStoreId===state.targetId;})||null;}
 function select(S,id){var state=ensure(S);if(!(S.chests||[]).some(function(c){return c.itemStoreId===id;}))return false;state.targetId=id;return true;}
 function target(S){var chest=selected(S);return chest?{type:'chest',storeId:chest.itemStoreId,group:true}:null;}
 root.WAREHOUSE={ensure:ensure,selected:selected,select:select,target:target};
})(typeof window!=='undefined'?window:globalThis);

STATE_SCHEMA.register("warehouse",["warehouse"]);
