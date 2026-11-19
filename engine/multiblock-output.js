(function(root){
 'use strict';
 var modes=[
  {id:'none',item:false,fluid:false,text:'不销毁任何物品或流体'},
  {id:'item',item:true,fluid:false,text:'销毁过量物品'},
  {id:'fluid',item:false,fluid:true,text:'销毁过量流体'},
  {id:'all',item:true,fluid:true,text:'销毁过量物品和流体'}
 ];
 function supported(m){
  var d=DEFS.of(m.k);
  var hook=d&&root.ENGINE&&ENGINE.behaviors&&ENGINE.behaviors[d.behavior];
  return !!(d&&d.multiblock&&(d.supportsVoidProtection==null?
   !hook||hook.voidProtection!==false:d.supportsVoidProtection));
 }
 function mode(m){
  var fixed=DEFS.of(m.k)?.fixedVoidingMode;
  var selected=fixed||(supported(m)?m.voidingMode:null);
  return modes.find(function(v){return v.id===selected;})||modes[0];
 }
 function set(m,id){if(!supported(m)||!modes.some(function(v){return v.id===id;}))return false;m.voidingMode=id;return true;}
 function cycle(m,button){if(button!==0&&button!==2)return false;return set(m,modes[(modes.indexOf(mode(m))+(button===2?3:1))%4].id);}
 function items(m,additions,definition){
  var d=definition||STRUCTURES.instance(m);
  return GTTransactions.planOutput(m.outs,additions,d.slots.out,function(k){return CONTENT.maxStack(k);},
   !!(root.MULTIBLOCKS&&MULTIBLOCKS.live(m)),mode(m).item);
 }
 function fluids(m,additions,definition){
  var overflow=mode(m).fluid;
  return root.MULTIBLOCKS&&MULTIBLOCKS.live(m)?MULTIBLOCKS.fluidOutput(m,additions,overflow):
   GTTransactions.planFill(m.tanksOut,additions,(definition||STRUCTURES.instance(m)).fluidOutputTanks,overflow);
 }
 root.MULTIBLOCK_OUTPUT={supported:supported,mode:mode,set:set,cycle:cycle,items:items,fluids:fluids};
})(typeof window!=='undefined'?window:globalThis);
