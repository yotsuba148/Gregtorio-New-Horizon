(function(root){
 'use strict';
 var ids=new Set(['TConstruct:woodPattern','TConstruct:metalPattern','TConstruct:clayPattern','TConstruct:Pattern']);
 function accepts(k){var item=CONTENT.item(k);return !!item&&ids.has(item.id);}
 function ensure(m){if(!Array.isArray(m.patternSlots))m.patternSlots=(m.ins||[]).slice();while(m.patternSlots.length<30)m.patternSlots.push(null);var prior=Object.getOwnPropertyDescriptor(m,'ins');if(!prior||!prior.get)Object.defineProperty(m,'ins',{configurable:true,enumerable:false,get:function(){return this.patternSlots;},set:function(v){this.patternSlots=v;}});}
 var keys=['TConstruct:ToolStationBlock@5','TConstruct:CraftingSlab@4'];
 keys.forEach(function(k){if(!CONTENT.item(k))return;GD.extraMachineDefinitions.push({key:k,cat:'pattern_chest',cn:'模具箱',tag:'匠魂',behavior:'pattern_storage',recipeMap:'tconstruct:patternchest',slots:{in:30,out:0,fluid:0},fluidInputTanks:[],fluidOutputTanks:[],tier:0,volt:0,maxRecipeEUt:0,energyCapacity:0,startEnergy:0,amperage:0,controlCircuit:false,autoItems:false,autoFluids:false,keepContentsOnPickup:true,storage:true,worldOnly:true,worldWorkbench:true});});
 GD.machines.cats.push({id:'pattern_chest',cn:'模具箱',slots:{in:30,out:0,fluid:0},tiers:keys.filter(function(k){return CONTENT.item(k);}).map(function(k){return{k:k,t:0,tag:'匠魂',name:'模具箱'};})});
 ENGINE.registerBehavior('pattern_storage',{
  layout:function(d,kit){return{cells:kit.grid(d.slots.in,8,18,10).map(function(p,i){return{kind:'in',index:i,x:p[0],y:p[1]};}),circuit:null,progress:null,width:196,height:80};},
  ensure:ensure,tick:function(){return false;},acceptsItem:function(m,k){return accepts(k);}});
 DEFS.rebuild();root.PATTERN_CHEST={accepts:accepts,keys:keys};
})(typeof window!=='undefined'?window:globalThis);

ITEM_STORES.registerEntity('pattern-chest',function(S,m){if(m.patternSlots)return {replaceSlots:true,views:[ITEM_STORES.view(m.uid+':patterns',m.patternSlots,m.patternSlots)]};});
