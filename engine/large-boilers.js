/* GT5U MTELargeBoiler: fuel, warm-up, throttle, water credit and steam on the shared clock. */
(function(root){
 'use strict';
 var C=CONTENT,TX=GTTransactions,map='idle:largeboiler';
 function solid(k,power){var p=NATIVE_RULES.properties(k);return p&&p.verified&&p.burn>=80&&Math.floor(p.burn*2/power)>1&&!(GD.containerRegistry||[]).some(function(c){return c.filled===k;})?p:null;}
 function solidRecipe(k){var p=solid(k,400);if(!p)return null;return{in:[{k:k,n:1}],out:[],nativeBoiler:{kind:'solid',burn:p.burn,container:NATIVE_RULES.container(k)},durationTicks:Math.max(1,Math.floor(Math.floor(p.burn/80)*(1+Math.log(Math.fround(p.burn/1600))/Math.log(9))*2)),eut:0,
  notes:['固体燃料；实际炉次由锅炉型号、节流和燃料结余决定；需持续供水，蒸汽产出随预热效率变化。'],provenance:{backend:'MTELargeBoiler.checkProcessing',properties:'runtime burn/container'}};}
 var keys=NATIVE_RULES.keys.filter(function(k){return !!solid(k,400);});
 C.registerDynamicFamily(map,{idPrefix:'native:largeboiler:solid:',keys:keys,eut:0,searchText:function(k){return(GD.items[k]||k)+' '+k+' 燃料 steam 蒸汽';},resolve:solidRecipe});
 var fluidFuels=[];
 [['diesel','gt.recipe.dieselgeneratorfuel'],['dense','gt.recipe.semifluidboilerfuels']].forEach(function(pair){
  var source=pair[1],idx=ENGINE.generators.fuels({fuelMap:source});
  Object.keys(idx.fluids).forEach(function(f){var value=idx.fluids[f];if(pair[0]==='diesel'?value<=1:value<=0)return;
   var r=C.registerRecipe({id:'native:largeboiler:'+pair[0]+':'+f,map:map,in:[],out:[],fin:[{f:f,mb:1000}],durationTicks:Math.max(1,pair[0]==='diesel'?Math.floor(value/2)*2:value*4),eut:0,nativeBoiler:{kind:pair[0],value:value},
    notes:['每炉次投入1000 mB燃料；另外持续消耗水并产蒸汽，燃烧时间取决于锅炉型号和节流。'],provenance:{backend:'MTELargeBoiler.checkProcessing',fuelMap:source}});fluidFuels.push(r);
  });
 });
 function check(m,r){
  var d=STRUCTURES.instance(m);if(!d||!d.largeBoiler||!r||r.map!==map||!r.nativeBoiler)return{ok:false,code:'INVALID_RECIPE',text:'不是锅炉燃料'};
  if(!m.structure||!m.structure.formed)return{ok:false,code:'STRUCTURE',text:'需要建造锅炉结构'};
  if(!MACHINE_CONTROL.allowed(m,d))return{ok:false,code:'DISABLED',text:'已关机'};
  var data=r.nativeBoiler;if(data.kind==='solid'&&!solid(r.in[0].k,d.largeBoiler.power))return{ok:false,code:'FUEL',text:'燃料热值不足此锅炉要求'};
  var items=TX.planIngredients(m.ins,r.in,function(p,s){return !s.entityUid&&C.matches(p.k,s.k);},!!(root.MULTIBLOCKS&&MULTIBLOCKS.live(m))),fluids=TX.planDrain(m.tanksIn,r.fin);
  if(!items||!fluids)return{ok:false,code:items?'FLUID_INPUT':'ITEM_INPUT',text:'燃料不足'};
  var out=data.container?[{k:data.container,n:1}]:[];
  if(!MULTIBLOCK_OUTPUT.items(m,out,d))return{ok:false,code:'ITEM_OUTPUT',text:'燃料容器输出已满'};
  return{ok:true,items:items,fluids:fluids,outputs:out};
 }
 function start(m,r){var plan=check(m,r);if(!plan.ok){m.status=plan;return false;}var d=STRUCTURES.instance(m),b=d.largeBoiler,data=r.nativeBoiler,base,excess=m.boilerExcessFuel||0;
  if(data.kind==='solid'){base=Math.floor(data.burn/80);excess+=data.burn%80;base+=Math.floor(excess/80);excess%=80;}
  else base=data.kind==='diesel'?Math.floor(data.value/2):data.value*2;
  var inc=data.kind==='solid'?base*b.increase:0,duration=Math.max(1,Math.floor((data.kind==='solid'?base*(1+Math.log(Math.fround(data.burn/1600))/Math.log(9)):base)))*b.boost;
  var superIncrease=inc>5000?20:0;if(superIncrease)inc=0;
  var throttle=m.circuitConfigured?m.circ|0:0,power=Math.max(25,b.power-25*throttle),projected=m.boilerExcessProjected||0;
  if(superIncrease||(m.boilerEfficiency||0)>=10000){var adjusted=Math.floor(duration*b.power/power);projected+=b.power*duration-power*adjusted;adjusted+=Math.floor(projected/power);projected%=power;duration=adjusted;}
  if(data.kind!=='solid'){inc=duration*b.increase*(data.kind==='diesel'?4:1);superIncrease=inc>5000?20:0;if(superIncrease)inc=0;}
  m.ins=plan.items.remaining;m.tanksIn=plan.fluids.tanks;m.boilerExcessFuel=excess;m.boilerExcessProjected=projected;
  m.job={recipeId:r.id,recipe:TX.clone(r),durationTicks:Math.max(1,duration),progressTicks:0,EUt:0,inputs:plan.items.consumed,fluidInputs:plan.fluids.consumed,outputs:plan.outputs,fluidOutputs:[],boilerPower:power,efficiencyIncrease:inc,superIncrease:superIncrease};
  m.boilerFuelUsed=(m.boilerFuelUsed||0)+(data.kind==='solid'?1:1000);return true;
 }
 function finish(m){var j=m.job,d=STRUCTURES.instance(m),out=MULTIBLOCK_OUTPUT.items(m,j.outputs,d);
  if(!out){m.status={code:'COMPLETED_OUTPUT_BLOCKED',text:'燃料烧完，等待容器输出空间'};return false;}
  m.outs=out;m.boilerEfficiency=Math.min(10000,(m.boilerEfficiency||0)+j.efficiencyIncrease);m.completedBatches=(m.completedBatches||0)+1;m.job=null;return true;
 }
 ENGINE.registerBehavior('large_boiler',{
  acceptsItem:function(m,k){return !!solid(k,DEFS.of(m.k).largeBoiler.power);},
  acceptsFluid:function(m,f){return /^(water|ic2distilledwater)$/.test(f)||fluidFuels.some(function(r){return r.fin[0].f===f;});},check:check,
  summary:function(m){return['锅炉效率 '+((m.boilerEfficiency||0)/100).toFixed(2)+'%','当前蒸汽 '+(m.boilerSteamRate||0)+' mB/t','水耗累计 '+(m.boilerWaterSpent||0)+' mB'];},
  recipeSummary:function(m,r){return r.durationTicks+' tick 为青铜锅炉未节流基准；供水与实际效率决定蒸汽产量';},
  tick:function(m){
   if(!m.structure||!m.structure.formed){m.status={code:'STRUCTURE',text:'需要建造锅炉结构'};return false;}
   if(!m.job){var candidates=m.recipeLock?[C.recipe(m.recipeLock)]:fluidFuels.concat(C.candidates(map,m.ins,[])),last;
    for(var r of candidates){if(!r)continue;last=check(m,r);if(last.ok){start(m,r);break;}}
    if(!m.job){m.boilerEfficiency=Math.max(0,(m.boilerEfficiency||0)-1000);m.boilerSteamRate=0;m.status=last||{code:'FUEL',text:'等待燃料'};return false;}
   }
   var j=m.job;if(j.progressTicks>=j.durationTicks)return finish(m);
   var efficiency=root.GAME_TIME&&GAME_TIME.oneTick(root.ENGINE&&root.ENGINE.state)?10000:Math.min(10000,(m.boilerEfficiency||0)+(j.superIncrease||0)),steam=Math.floor(j.boilerPower*2*efficiency/10000),excess=m.boilerExcessWater||0,water=0,filled=m.tanksOut;
   if(steam){filled=MULTIBLOCK_OUTPUT.fluids(m,[{f:'steam',mb:steam}]);if(!filled){m.status={code:'FLUID_OUTPUT',text:'蒸汽输出已满，燃烧暂停'};return false;}
    water=Math.floor((steam+160)/160);excess+=water*160-steam;water-=Math.floor(excess/160);excess%=160;
    var drain=TX.planDrain(m.tanksIn,water?[{f:'water',mb:water}]:[]);if(!drain)drain=TX.planDrain(m.tanksIn,[{f:'ic2distilledwater',mb:water}]);
    if(!drain){m.status={code:'NO_WATER_HOT',text:'热锅炉缺水，已停机；补水后继续'};return false;}m.tanksIn=drain.tanks;
   }
   if(root.MULTIBLOCKS&&MULTIBLOCKS.live(m))MULTIBLOCKS.commitFluidOutput(m,filled);else m.tanksOut=filled;m.boilerExcessWater=excess;m.boilerEfficiency=efficiency;m.boilerSteamRate=steam;m.boilerSteamProduced=(m.boilerSteamProduced||0)+steam;m.boilerWaterSpent=(m.boilerWaterSpent||0)+water;j.progressTicks++;
   m.status={code:efficiency<10000?'WARMING':'RUNNING',text:(efficiency<10000?'预热中':'供汽中')+'，'+steam+' mB/t'};if(j.progressTicks>=j.durationTicks)finish(m);return true;
  }
 });
 root.LARGE_BOILERS={solid:solid,check:check,start:start,fluidRecipes:fluidFuels};DEFS.rebuild();
})(typeof window!=='undefined'?window:globalThis);
