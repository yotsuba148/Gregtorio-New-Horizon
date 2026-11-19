(function(root){
 'use strict';var ids=new Set();
 SPACE_DESTINATIONS.list().forEach(function(p){(p.actions||[]).forEach(function(a){
  if(ids.has(a.id)||ACTIVITIES.definitions[a.id])throw Error('Duplicate planet action: '+a.id);ids.add(a.id);
  var def=Object.assign({},a,{planet:p.id,dim:p.id,scene:'space',out:a.out.map(function(row){return row.slice();})});
  if(a.limit)def.cycleLimit=function(){return a.limit;};
  if(a.combat)def.check=function(S){return ADVENTURES.weapon(S)?{ok:true}:{ok:false,code:'TOOL'};};
  if(a.unlock)def.effect=function(S){var knowledge=MECHANISMS.ensure(S).knowledge;if(!knowledge[a.unlock]){knowledge[a.unlock]={unlocked:true};SIMULATION.emit(S,{type:'space-unlocked',text:a.unlockText});}};
  ACTIVITIES.register(def);GD.sources.push(def);
 });});
})(typeof window!=='undefined'?window:globalThis);
