/* Forestry 4.10.17 / HARD: persistent fertilizer charges and staged liquid reactions.
 * TilePowered pays four energy work steps per plant; further fermentation steps
 * occur every five ticks without a second energy charge. Partial steps still
 * consume the fuel's full liquid quantity. Inventory/tank changes are planned.
 */
(function(root){
 'use strict';
 var TX=root.GTTransactions,map='forestry:fermenter';
 var fuels=[{k:'Forestry:fertilizerCompound@0',uses:100,volume:56},{k:'Forestry:fertilizerBio@0',uses:150,volume:48},{k:'Forestry:mulch@0',uses:150,volume:48}];
 function fuelFor(k){return fuels.find(function(f){return CONTENT.matches(f.k,k,{ignoreNBT:true});});}
 function chargePlan(m,inputs){
  var charge=m.reagentCharge;if(charge&&charge.uses>0)return{inputs:inputs,charge:TX.clone(charge)};
  var index=inputs.findIndex(function(s){return s&&!s.entityUid&&fuelFor(s.k);});if(index<0)return null;
  var stack=inputs[index],fuel=fuelFor(stack.k),next=TX.clone(inputs);next[index].n--;if(!next[index].n)next[index]=null;
  return{inputs:next,charge:{k:stack.k,uses:fuel.uses,totalUses:fuel.uses,volume:fuel.volume}};
 }
 function resourceModifier(stack){
  var item=CONTENT.item(stack.k);if(!item||item.id!=='Forestry:sapling'||!item.nbt)return 1;
  // The genetics adapter supplies the active sappiness allele; do not substitute
  // the NEI display sapling for an unknown genetic individual.
  return root.GENETICS?root.GENETICS.fermentationModifier(item):null;
 }
 function stepPlan(m,r,left,modifier,charge){
  var input=TX.planDrain(m.tanksIn,[{f:r.fin[0].f,mb:charge.volume}]);
  if(!input)return{ok:false,code:'FLUID_INPUT',text:'发酵液不足，每步需要 '+charge.volume+' mB'};
  var n=Math.floor(Math.fround(Math.fround(Math.min(left,charge.volume)*r.fermentation.modifier)*modifier)+0.5);
  var output=TX.planFill(m.tanksOut,[{f:r.fout[0].f,mb:n}],DEFS.of(m.k).fluidOutputTanks);
  if(!output)return{ok:false,code:'FLUID_OUTPUT',text:'发酵产物罐已满'};
  return{ok:true,input:input.tanks,output:output,volume:n};
 }
 function check(m,r,world,opt){
  if(m.enabled===false)return{ok:false,code:'DISABLED',text:'已停用'};
  if(!r||!r.fermentation||r.map!==map||!r.enabled)return{ok:false,code:'RECIPE_MAP',text:'需要发酵配方'};
  var ingredients=TX.planIngredients(m.ins,r.in,function(q,s){return !s.entityUid&&ENGINE.batch.matches(q,s,r);});
  if(!ingredients)return{ok:false,code:'ITEM_INPUT',text:'等待发酵原料'};
  var modifier=resourceModifier(ingredients.consumed[0]);if(modifier==null)return{ok:false,code:'GENETICS',text:'需要读取树苗的多汁基因'};
  var charge=chargePlan(m,ingredients.remaining);if(!charge)return{ok:false,code:'REAGENT',text:'需要肥料、堆肥或覆盖物'};
  var step=stepPlan(m,r,r.fermentation.value,modifier,charge.charge);if(!step.ok)return step;
  if(!(opt&&opt.ignoreEnergy)&&m.eu<DEFS.of(m.k).startEnergy)return{ok:false,code:'ENERGY',text:'电量不足'};
  return{ok:true,ingredients:ingredients,charge:charge,modifier:modifier};
 }
 function step(m,S,payment){
  if(!m.job){
   var candidates=m.recipeLock?[CONTENT.recipe(m.recipeLock)]:CONTENT.candidates(map,m.ins,m.tanksIn),status;
   for(var r of candidates){var result=check(m,r);if(!result.ok){status=result;continue;}
    m.ins=result.charge.inputs;m.reagentCharge=result.charge.charge;
    var p=r.fermentation;
    m.job={recipeId:r.id,recipe:TX.clone(r),inputs:result.ingredients.consumed,fluidInputs:[],outputs:[],fluidOutputs:[],
     durationTicks:20+5*(Math.ceil(p.value/m.reagentCharge.volume)-1),progressTicks:0,EUt:117,workClock:0,energySteps:0,
     remainingValue:p.value,resourceModifier:result.modifier};break;
   }
   if(!m.job){m.status=status||{code:'WAITING_INPUT',text:'等待发酵原料'};return false;}
  }
  var job=m.job,r=job.recipe,charge=chargePlan(m,m.ins);
  if(!charge){m.status={code:'REAGENT',text:'肥料效力耗尽，等待补充'};return false;}
  job.durationTicks=job.progressTicks+Math.max(0,3-job.energySteps)*5+Math.ceil(job.remainingValue/charge.charge.volume)*5;
  var step=stepPlan(m,r,job.remainingValue,job.resourceModifier,charge.charge);if(!step.ok){m.status=step;return false;}
  if(++job.workClock<(root.GAME_TIME?GAME_TIME.ticks(S,5):5)){m.status={code:'RUNNING',text:'发酵中'};return false;}
  var cost=0,credit=m.workEnergyCredit||0;
  var charged=job.energySteps<r.fermentation.energyWorkSteps&&(!payment||!payment.paid);
  if(charged){var owed=r.fermentation.nativeEnergyPerWorkStep*100/(payment?5:1)-credit;cost=Math.max(0,Math.ceil(owed/360));credit=cost*360-owed;}
  if(m.eu<cost){job.workClock=4;m.status={code:'ENERGY',text:'电量不足，已暂停'};return false;}
  m.ins=charge.inputs;m.reagentCharge=charge.charge;m.eu-=cost;m.workEnergyCredit=credit;m.energySpent=(m.energySpent||0)+cost;if(charged&&payment)payment.paid=true;
  job.workClock=0;job.progressTicks+=5;
  if(job.energySteps<r.fermentation.energyWorkSteps)job.energySteps++;
  if(job.energySteps>=r.fermentation.energyWorkSteps){
   m.tanksIn=step.input;m.tanksOut=step.output;m.reagentCharge.uses--;job.remainingValue-=m.reagentCharge.volume;
   if(job.remainingValue<=0){m.completedBatches=(m.completedBatches||0)+1;m.job=null;m.status={code:'IDLE',text:'等待下一批'};return true;}
  }
  m.status={code:'RUNNING',text:'发酵中，肥料剩余 '+m.reagentCharge.uses+' 步'};return true;
 }
 function tick(m,context){var S=context&&context.state,fast=root.GAME_TIME&&GAME_TIME.oneTick(S),changed=false,payment=fast?{paid:false}:null;
  for(var n=0;n<(fast?10000:1);n++){var moved=step(m,S,payment);changed=moved||changed;if(!moved||!m.job)break;}return changed;
 }
 ENGINE.registerBehavior('charged_fermenter',{waitsForInput:true,tick:tick,check:check,
  summary:function(m){var c=m.reagentCharge;return c?[(GD.items[c.k]||c.k)+'：剩余 '+c.uses+' / '+c.totalUses+' 步，每步耗液 '+c.volume+' mB']:['肥料 100步 ×56 mB；堆肥／覆盖物 150步 ×48 mB'];},
  acceptsItem:function(m,k){if(fuelFor(k))return true;return(m.recipeLock?[CONTENT.recipe(m.recipeLock)]:CONTENT.candidates(map,[{k:k,n:1}],[])).some(function(r){return r&&r.in.some(function(p){return ENGINE.batch.matches(p,{k:k},r);});});},
  acceptsFluid:function(m,f){return CONTENT.recipes(map).some(function(r){return r.fin[0].f===f;});}
 });
 root.FERMENTATION={fuels:fuels,check:check,chargePlan:chargePlan};
})(typeof window!=='undefined'?window:globalThis);
