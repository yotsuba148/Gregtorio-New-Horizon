/* TiC 1.13.57: source melting/alloy recipes, lava fuel and persistent heat jobs. */
(function(root){
 'use strict';
 var key='TConstruct:Smeltery@0',capacity=9*1440;
 GD.extraMachineDefinitions.push({key:key,cat:'tconstruct_smeltery',cn:'匠魂冶炼炉',tag:'冶炼',tier:0,volt:0,maxRecipeEUt:0,behavior:'tinkers_smeltery',recipeMap:'tconstruct:smelting',
  slots:{in:9,out:0,fluid:4000},fluidInputTanks:[4000],fluidOutputTanks:Array(9).fill(capacity),totalFluidOutputCapacity:capacity,smelteryPooledMelt:true,
  energyCapacity:0,startEnergy:0,amperage:0,noOverclock:true,requiresStructure:true,multiblock:true,runSwitch:false,preserveItemSlots:true,structureProfile:'tconstruct_smeltery',autoItems:false,autoFluids:false});
 GD.machines.cats.push({id:'tconstruct_smeltery',cn:'匠魂冶炼炉',slots:{in:9,out:0,fluid:4000},tiers:[{t:0,tag:'冶炼',k:key,name:'匠魂冶炼炉'}]});GD.items[key]='冶炼炉控制器';CONTENT.alias('tconstruct_smeltery','tconstruct:smelting');
 STRUCTURES.register({id:'tconstruct_smeltery',name:'匠魂冶炼炉（3×3内腔，一层）',key:key,fixedBuildMaterial:function(k){return k==='TConstruct:Smeltery@2';},build:function(){return{parts:[{k:'TConstruct:Smeltery@2',n:18},{k:'TConstruct:Smeltery@1',n:1},{k:'TConstruct:LavaTank@0',n:1}],power:0};}});
 DEFS.rebuild();
 function total(tanks){return tanks.reduce(function(n,t){return n+(t?t.mb:0);},0);}
 function pool(m){var out=[],by=new Map();(m.tanksOut||[]).forEach(function(t){if(!t||!t.mb)return;if(!Number.isSafeInteger(t.mb)||t.mb<0)throw Error('熔池流体数量无效');if(by.has(t.f))by.get(t.f).mb+=t.mb;else{var s={f:t.f,mb:t.mb};by.set(t.f,s);out.push(s);}});while(out.length<9)out.push(null);m.tanksOut=out;return out;}
 function select(m,fluid){pool(m);var at=m.tanksOut.findIndex(function(t){return t.f===fluid;});if(at<0)return{ok:false,code:'FLUID'};if(at)m.tanksOut.unshift(m.tanksOut.splice(at,1)[0]);return{ok:true};}
 function mix(m){
  pool(m);var changed=false;for(var r of CONTENT.recipes('tconstruct:alloying')){
   var n=Infinity;for(var p of r.fin){var available=m.tanksOut.reduce(function(n,t){return n+(t&&t.f===p.f?t.mb:0);},0);n=Math.min(n,Math.floor(available/p.mb));}
   if(!Number.isSafeInteger(n)||n<=0)continue;
   var drain=GTTransactions.planDrain(m.tanksOut,r.fin.map(function(p){return{f:p.f,mb:p.mb*n};}));if(!drain)continue;
   var retained=drain.tanks.filter(Boolean);while(retained.length<9)retained.push(null);var fill=GTTransactions.planFill(retained,r.fout.map(function(p){return{f:p.f,mb:p.mb*n};}),Array(Math.max(9,retained.length+r.fout.length)).fill(capacity));
   if(!fill||total(fill)>capacity)continue;m.tanksOut=fill;changed=true;
  }pool(m);return changed;
 }
 function ready(m,r){
  if(!(r.tinkersTemperature>200)||r.tinkersTemperature>13000)return{ok:false,code:'TEMPERATURE',text:'超出岩浆燃料熔炼范围'};
  if(total(m.tanksOut)+r.fout.reduce(function(n,p){return n+p.mb;},0)>capacity)return{ok:false,code:'FLUID_OUTPUT',text:'熔池空间不足'};
  return ENGINE.batch.check(m,r,ENGINE.world);
 }
 ENGINE.registerBehavior('tinkers_smeltery',{
  voidProtection:false,
  gate:function(m,d){if(d.attachmentOnly&&m.location&&m.location.kind==='world')return{status:{code:'INSTALL_IN_SMELTERY',text:'先安装到匠魂炉内'}};return null;},
  acceptsFluid:function(m,f){return f==='lava';},
  tick:function(m){
   if(!m.structure||!m.structure.formed){m.status={code:'STRUCTURE',text:'需要组装冶炼炉'};return false;}
   mix(m);
   var r=m.job&&m.job.recipe;
   if(!r){var candidates=m.recipeLock?[CONTENT.recipe(m.recipeLock)]:CONTENT.candidates('tconstruct:smelting',m.ins,[]),last;
    for(var candidate of candidates){if(!candidate)continue;last=ready(m,candidate);if(last.ok){r=candidate;break;}}
    if(!r){m.status=last||{code:'WAITING_INPUT',text:'等待可熔炼原料'};return false;}
   }
   // Completed jobs can discharge while fuel is absent.
   if(m.job&&m.job.progressTicks>=m.job.durationTicks)return ENGINE.batch.finish(m);
   if(!(m.smelteryFuelTicks>0)){
    var fuel=GTTransactions.planDrain(m.tanksIn,[{f:'lava',mb:15}]);if(!fuel){m.status={code:'FUEL',text:'需要岩浆燃料（每15 mB提供80 tick）'};return false;}
    m.tanksIn=fuel.tanks;m.smelteryFuelTicks=80;m.smelteryFuelSpent=(m.smelteryFuelSpent||0)+15;
   }
   if(!m.job&&!ENGINE.batch.start(m,r,ENGINE.world))return false;
   // Native heating runs every four ticks: +13 temperature units at lava's
   // power 1300. One input item is represented by one saved batch here.
   m.smelteryFuelTicks--;var result=ENGINE.batch.tick(m,ENGINE.world);if(!m.job)mix(m);return result;
  }
 });
 root.SMELTERY={mix:mix,ready:ready,capacity:capacity,pool:pool,selectFluid:select,total:total};
})(typeof window!=='undefined'?window:globalThis);
