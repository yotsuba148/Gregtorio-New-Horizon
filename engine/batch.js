(function(root){
  'use strict';
  var TX=root.GTTransactions;
  if(typeof module==='object'&&module.exports)TX=require('./transactions.js');
  var lastWorkTick=new WeakMap();
  function steamStored(m){return(m.tanksEnergy||[]).reduce(function(n,t){return n+(t&&/^(steam|ic2steam)$/.test(t.f)?t.mb:0);},0);}
  function steamDrain(m,n){for(var i=0;i<(m.tanksEnergy||[]).length&&n>0;i++){var t=m.tanksEnergy[i];if(!t||!/^(steam|ic2steam)$/.test(t.f))continue;var q=Math.min(n,t.mb);t.mb-=q;n-=q;if(!t.mb)m.tanksEnergy[i]=null;}}
  function Processor(content,definitions){this.content=content;this.definitions=definitions;this.aliased=new WeakSet();this.retry=root.PROCESSING_RETRY?new PROCESSING_RETRY.State(content):null;}
  function failureRank(result){if(['ITEM_INPUT','FLUID_INPUT'].includes(result.code))return 0;if(result.code==='CIRCUIT')return 1;return ['ENERGY','STEAM','ITEM_OUTPUT','FLUID_OUTPUT','EMPTY_OUTPUT'].includes(result.code)?3:2;}
  function alias(m,name,get,set){
    var prior=Object.getOwnPropertyDescriptor(m,name);
    if(prior&&prior.get)return;
    delete m[name];Object.defineProperty(m,name,{enumerable:false,configurable:true,get:get,set:set||function(){}});
  }
  Processor.prototype.ensure=function(m,options){
    options=options||{};
    var def=root.STRUCTURES?root.STRUCTURES.instance(m):this.definitions.of(m.k);
    if(!def){m.status={code:'UNKNOWN_MACHINE',text:'缺少设备定义'};return null;}
    if(!Array.isArray(m.ins))m.ins=[];
    if(!Array.isArray(m.outs))m.outs=[];
    var content=this.content;[m.ins,m.outs].forEach(function(a){a.forEach(function(s){if(s)s.k=content.canonicalKey(s.k);});});
    var legacy=!this.aliased.has(m)?{rec:m.rec,prog:m.prog,dur:m.recDur,eut:m.recEut,ins:m.jobIns,fin:m.jobFin,out:m.jobOut,fout:m.jobFout}:null;
    if(!Array.isArray(m.tanksIn))m.tanksIn=m.ftank?[TX.clone(m.ftank)]:[];
    if(!Array.isArray(m.tanksOut))m.tanksOut=m.fout?[TX.clone(m.fout)]:[];
    if(def.steamPowered&&!Array.isArray(m.tanksEnergy))m.tanksEnergy=[null];
    while(m.tanksIn.length>def.fluidInputTanks.length&&!m.tanksIn[m.tanksIn.length-1])m.tanksIn.pop();
    while(m.tanksOut.length>def.fluidOutputTanks.length&&!m.tanksOut[m.tanksOut.length-1])m.tanksOut.pop();
    while(m.tanksIn.length<def.fluidInputTanks.length)m.tanksIn.push(null);
    while(m.tanksOut.length<def.fluidOutputTanks.length)m.tanksOut.push(null);
    if(m.eu==null||!Number.isFinite(m.eu))m.eu=0;
    if(root.MECHANISMS&&root.MECHANISMS.ensureEntityResources)root.MECHANISMS.ensureEntityResources(m,def);

    if(m.enabled==null)m.enabled=true;
    if(root.BATCH_MODE)BATCH_MODE.ensure(m,def);
    if(root.MACHINE_CONTROL)MACHINE_CONTROL.ensure(m,def);
    m.outFace=DEFS.outputFace(def,m.outFace);
    if(m.allowInputFromOutputSide==null)m.allowInputFromOutputSide=false;
    if(/^gregtech:gt.blockmachines@/.test(m.k)&&!def.requiresRecipeSelection)delete m.recipeLock;
    if(m.circ==null)m.circ=0;
    if(m.circuitConfigured==null)m.circuitConfigured=!!(m.circuitItem||m.legacyCircuit||m.circ>0);
    if(m.autoItems==null)m.autoItems=!!m.auto;
    if(m.autoFluids==null)m.autoFluids=def.defaultAutoFluids==null?!!m.auto:m.auto==null?!!def.defaultAutoFluids:!!m.auto;
    if(m.auto==null&&def.defaultAutoFluids!=null)m.auto=!!m.autoFluids;
    if(!m.environment)m.environment={};
    if(legacy&&!m.job&&legacy.rec){
      var factor=options.legacyTimeUnit==='seconds'?20:1;
      var dur=legacy.dur?Math.round(legacy.dur*factor):this.definitions.effective(def,legacy.rec).durationTicks;
      m.job={recipeId:legacy.rec.id||'legacy:active',recipe:TX.clone(legacy.rec),durationTicks:Math.max(1,dur),EUt:legacy.eut||legacy.rec.eut||0,
        progressTicks:Math.min(Math.max(0,Math.round((legacy.prog||0)*factor)),Math.max(1,dur)),
        inputs:TX.clone(legacy.ins||[]),fluidInputs:legacy.fin?[TX.clone(legacy.fin)]:[],
        outputs:TX.clone(legacy.out||legacy.rec.out||[]),fluidOutputs:TX.clone(legacy.fout||legacy.rec.fout||[]),migrated:true};
    }
    if(legacy){
    alias(m,'ftank',function(){return this.tanksIn[0]||null;},function(v){this.tanksIn[0]=v;});
    alias(m,'fout',function(){return this.tanksOut[0]||null;},function(v){this.tanksOut[0]=v;});
    alias(m,'rec',function(){return this.job?this.job.recipe:null;},function(v){if(v===null)this.job=null;});
    alias(m,'prog',function(){return this.job?this.job.progressTicks:0;},function(v){if(this.job)this.job.progressTicks=v;});
    alias(m,'recDur',function(){return this.job?this.job.durationTicks:0;},function(v){if(this.job)this.job.durationTicks=v;});
    alias(m,'recEut',function(){return this.job?this.job.EUt:0;},function(v){if(this.job)this.job.EUt=v;});
    alias(m,'jobIns',function(){return this.job?this.job.inputs:[];});
    alias(m,'jobFin',function(){return this.job?(this.job.fluidInputs[0]||null):null;});
    alias(m,'jobOut',function(){return this.job?this.job.outputs:[];});
    alias(m,'jobFout',function(){return this.job?this.job.fluidOutputs:[];});
    this.aliased.add(m);
    }
    m.machineSchema=1;
    return def;
  };
  Processor.prototype.matches=function(req,stack,recipe){
    if(stack.entityUid)return false;
    var self=this;
    var sensitive=req.nbtSensitive==null?!!recipe.nbtSensitive:!!req.nbtSensitive;
    if(req.alternatives)return req.alternatives.some(function(k){return self.content.matches(k,stack.k,{exact:sensitive,ignoreNBT:!sensitive});});
    return this.content.matches(req.k,stack.k,{exact:sensitive,ignoreNBT:!sensitive});
  };
  Processor.prototype.planOutputs=function(m,items,fluids,def){
    if(root.MULTIBLOCK_OUTPUT&&(def.fixedVoidingMode||MULTIBLOCK_OUTPUT.supported(m)))return{items:MULTIBLOCK_OUTPUT.items(m,items,def),fluids:MULTIBLOCK_OUTPUT.fluids(m,fluids,def)};
    var self=this,multi=root.MULTIBLOCKS&&MULTIBLOCKS.live(m);
    return{items:TX.planOutput(m.outs,items,def.slots.out,function(k){return self.content.maxStack(k);},!!multi),
      fluids:multi?MULTIBLOCKS.fluidOutput(m,fluids):TX.planFill(m.tanksOut,fluids,def.fluidOutputTanks)};
  };
  Processor.prototype.check=function(m,recipe,world,options){
    options=options||{};
    var def=this.ensure(m),self=this;
    if(!def)return{ok:false,code:'UNKNOWN_MACHINE',text:'缺少设备定义'};
    if(!recipe||!recipe.enabled||recipe.fake||recipe.dataError)return{ok:false,code:'INVALID_RECIPE',text:'配方不可执行'};
    if(root.CONTENT_SCOPE&&!root.CONTENT_SCOPE.recipeAllowed(recipe))return{ok:false,code:'CONTENT_SCOPE',text:'此项功能未采用'};
    if(recipe.map!==def.recipeMap)return{ok:false,code:'RECIPE_MAP',text:'这台设备不支持此类工艺'};
    if(recipe.hazard)return{ok:false,code:recipe.hazard.code,text:recipe.hazard.text};
    if(def.outputPolicy==='first_slots'){
      recipe=Object.assign({},recipe,{out:recipe.out.filter(function(p,i){return(p.slot==null?i:p.slot)<def.slots.out;}),fout:recipe.fout.slice(0,def.fluidOutputTanks.length)});
    }
    if(root.MACHINE_CONTROL?!MACHINE_CONTROL.allowed(m,def):!m.enabled)return{ok:false,code:'DISABLED',text:'已关机'};
    if(def.activationTool&&(!world||!world.state||!root.COMMANDS||!root.COMMANDS.owned(world.state,function(k){var item=self.content.item(k);return item&&item.id===def.activationTool;}).length))return{ok:false,code:'TOOL',text:'需要持有'+(def.activationToolName||'激活工具')};
    if(def.requiresRecipeSelection&&!m.recipeLock)return{ok:false,code:'RECIPE_SELECTION',text:'先在配方书中锁定模板'};
    var multi=root.MULTIBLOCKS&&MULTIBLOCKS.live(m),group;
    if(multi&&!Object.prototype.hasOwnProperty.call(options,'inputGroup')){var best=null;for(var g of MULTIBLOCKS.groups(m)){var result=this.check(m,recipe,world,Object.assign({},options,{inputGroup:g.uid}));if(result.ok)return result;if(!best||failureRank(result)>failureRank(best))best=result;}if(best)return best;}
    if(multi)group=MULTIBLOCKS.input(m,options.inputGroup);
    if((def.parallelPerTier||def.maxParallel||def.recipeParallelLimit)&&!options.parallelCount){
      var limit;
      if(def.recipeParallelLimit)limit=def.recipeParallelLimit(recipe);
      else{
        var single=this.definitions.effective(def,recipe);
        var powerLimit=def.steamPowered||!single.EUt?Infinity:Math.floor((def.maxRecipeEUt||def.volt)/single.EUt);
        limit=Math.min(def.maxParallel||def.parallelPerTier*def.tier,powerLimit);
      }
      limit=Math.max(1,limit);
      var probe=function(n){return self.check(m,recipe,world,Object.assign({},options,{parallelCount:n,parallelLimit:limit}));};
      if(def.recipeParallelLimit){
        // Find the largest batch that fits the inputs and outputs before checking stored energy.
        // With machine-specific overclocking, per-tick power can fall at a parallel boundary.
        var fits=function(n){return self.check(m,recipe,world,Object.assign({},options,{parallelCount:n,parallelLimit:limit,ignoreEnergy:true,skipBatch:true}));};
        var first=fits(1);
        if(!first.ok)return first;
        var low=1,high=limit;
        while(low<high){
          var mid=Math.ceil((low+high)/2);
          if(fits(mid).ok)low=mid;else high=mid-1;
        }
        return probe(low);
      }
      var last=null;
      for(var n=limit;n>=1;n--){var attempt=probe(n);if(attempt.ok)return attempt;if(!last)last=attempt;}
      return last;
    }
    var sourceRecipe=recipe,parallel=options.parallelCount||1,copies=options.recipeCopies||parallel;if(copies>1)recipe=Object.assign({},recipe,{in:(recipe.in||[]).map(function(p){return Object.assign({},p,{n:p.n*copies});}),out:(recipe.out||[]).map(function(p){return Object.assign({},p,{n:p.n*copies});}),fin:(recipe.fin||[]).map(function(p){return Object.assign({},p,{mb:p.mb*copies});}),fout:(recipe.fout||[]).map(function(p){return Object.assign({},p,{mb:p.mb*copies});})});
    var profile=root.STRUCTURES&&STRUCTURES.profile(m);if(profile&&profile.prepareRecipe){var prepared=profile.prepareRecipe(m,recipe,{parallel:parallel,recipeCopies:copies,world:world});if(prepared&&prepared.ok===false)return prepared;if(prepared)recipe=prepared;}
    var access=root.PROCESSING_ACCESS&&PROCESSING_ACCESS.input(m,recipe,world,options);if(access&&access.failure)return access.failure;
    var reqs=(recipe.in||[]).map(function(p){return Object.assign({},p,{consumed:true});});
    var requirements=recipe.req||[],circuits=[];
    for(var i=0;i<requirements.length;i++){
      var req=requirements[i];
      if(req.circuit!=null)circuits.push(req.circuit);
      else if(!(root.PROCESSING_ACCESS&&PROCESSING_ACCESS.satisfies(m,req,recipe,function(r,s,recipe){return self.matches(r,s,recipe);},options.inputGroup)))reqs.push(Object.assign({},req,{n:req.n||1,consumed:false}));
    }
    var itemPlan=access&&access.planItems?access.planItems(reqs,function(r,s){return self.matches(r,s,recipe);}):TX.planIngredients(access?access.items:group?group.items:m.ins,reqs,function(r,s){return self.matches(r,s,recipe);},!!multi||!!def.preserveItemSlots);
    if(!itemPlan)return{ok:false,code:'ITEM_INPUT',text:'物品原料不足',requirements:reqs};
    if(recipe.returnContainers&&!recipe.containersResolved){var returns=[];for(var consumed of itemPlan.consumed){var container=root.NATIVE_RULES&&root.NATIVE_RULES.container(consumed.k);if(container)returns.push({k:container,n:consumed.n});}recipe=Object.assign({},recipe,{out:recipe.out.concat(returns),containersResolved:true});}
    var fluidPlan=access&&access.planFluids?access.planFluids(recipe.fin||[]):access?TX.planDrain(access.fluids,recipe.fin||[]):profile&&profile.fluidPlan?profile.fluidPlan(m,recipe.fin||[]):TX.planDrain(m.tanksIn,recipe.fin||[]);
    if(!fluidPlan)return{ok:false,code:'FLUID_INPUT',text:'流体原料不足',requirements:recipe.fin};
    if(profile&&profile.checkFluidRemainder){
      var fluidFailure=profile.checkFluidRemainder(recipe,fluidPlan.tanks);
      if(fluidFailure)return fluidFailure;
    }
    var availableCircuits=access?access.circuits:group?group.circuits:m.circuitConfigured?[m.circ|0]:[];
    if(root.PROCESSING_ACCESS)availableCircuits=PROCESSING_ACCESS.circuits(access?access.items:group?group.items:m.ins,availableCircuits);
    for(var circuit of circuits)if(!options.ignoreCircuit&&availableCircuits.indexOf(circuit)<0)return{ok:false,code:'CIRCUIT',text:'电路编号不匹配',required:circuit};
    var powerLimit=def.maxRecipeEUt||def.volt;
    if(m.structure&&m.structure.formed&&def.multiblock)powerLimit=m.structure.processingPowerEUt||powerLimit;
    var powerFailure=root.MULTIBLOCK_RULES&&MULTIBLOCK_RULES.power(recipe.eut,powerLimit);if(powerFailure)return powerFailure;
    var cond=recipe.conditions||{};
    var conditionFailure=root.MULTIBLOCK_RULES&&MULTIBLOCK_RULES.environment(m,recipe,m.environment,def,world);if(conditionFailure)return conditionFailure;
    if(cond.attachment&&Object.keys(cond.attachment).some(function(slot){return !(m.attachments&&self.content.matches(cond.attachment[slot],m.attachments[slot]||''));}))return{ok:false,code:'ATTACHMENT',text:'缺少工艺所需组件'};
    if(def.requiresStructure&&!(m.structure&&m.structure.formed))return{ok:false,code:'STRUCTURE',text:'结构未完成'};
    if(root.MULTIBLOCK_RULES){var gate=MULTIBLOCK_RULES.check(m,recipe);if(gate)return gate;}
    if(def.recipeCheck){var specific=def.recipeCheck(m,recipe,world);if(specific)return specific;}
    if(root.MECHANISMS&&recipe.research&&world&&world.state&&!root.MECHANISMS.meets(world.state,recipe.research))return{ok:false,code:'RESEARCH',text:'研究条件未满足'};
    if(root.MECHANISMS&&!root.MECHANISMS.checkCosts(m,recipe,'start'))return{ok:false,code:'RESOURCE',text:'工艺资源不足'};
    if(root.MECHANISMS&&!root.MECHANISMS.checkCosts(m,recipe,'work'))return{ok:false,code:'RESOURCE',text:'加工能源不足'};
    var outputs=this.planOutputs(m,recipe.out||[],recipe.fout||[],def),outputPlan=outputs.items;
    if(!outputPlan)return{ok:false,code:'ITEM_OUTPUT',text:'物品输出空间不足'};
    var fluidOut=outputs.fluids;
    if(!fluidOut)return{ok:false,code:'FLUID_OUTPUT',text:'流体输出空间不足'};
    if(def.totalFluidOutputCapacity&&fluidOut.reduce(function(n,t){return n+(t?t.mb:0);},0)>def.totalFluidOutputCapacity)return{ok:false,code:'FLUID_OUTPUT',text:'熔池空间不足'};
    if(recipe.needsEmptyOutput&&(m.outs.some(Boolean)||m.tanksOut.some(function(t){return t&&t.mb>0;})))return{ok:false,code:'EMPTY_OUTPUT',text:'需要清空输出'};
    var effective=this.definitions.effective(def,recipe,parallel);
    effective.EUt=Math.ceil(effective.EUt);if(def.steamPowered)effective.steamMbTick=Math.ceil(effective.steamMbTick);
    if(!options.ignoreEnergy&&def.steamPowered&&steamStored(m)<Math.max(def.startSteam==null?500:def.startSteam,effective.steamMbTick))return{ok:false,code:'STEAM',text:'启动蒸汽不足'};
    var powerAccount=profile&&profile.processingEnergy, startup=powerAccount&&powerAccount.startup?powerAccount.startup(m,recipe):0;
    var availableEU=powerAccount?powerAccount.available(m,world):m.eu;
    var workEU=recipe.workEnergyEU?Math.ceil(Math.max(0,recipe.workEnergyEU.numerator-(m.workEnergyCredit||0))/recipe.workEnergyEU.denominator):effective.EUt;
    var startEU=Math.max(startup,def.startEnergy||0,powerAccount&&powerAccount.waitForFirstWork&&startup>0?0:workEU);
    if(!options.ignoreEnergy&&!def.steamPowered&&availableEU<startEU)return{ok:false,code:'ENERGY',text:'启动电量不足',required:startEU,available:availableEU};
    var checked={ok:true,recipe:recipe,itemPlan:itemPlan,fluidPlan:fluidPlan,effective:effective,outputPlan:outputPlan,fluidOutputPlan:fluidOut,inputGroup:group&&group.uid,parallel:parallel,parallelLimit:options.parallelLimit||parallel,recipeCopies:copies,inputAccess:access,startupEU:startup};
    if(root.BATCH_MODE&&!options.skipBatch)return BATCH_MODE.expand(m,def,checked,function(n){return self.check(m,sourceRecipe,world,Object.assign({},options,{parallelCount:parallel,recipeCopies:n,skipBatch:true}));});
    return checked;
  };
  Processor.prototype.start=function(m,recipe,world,options){
    var checked=this.check(m,recipe,world,options);
    if(!checked.ok){m.status=checked;return false;}
    recipe=checked.recipe;
    if(checked.inputAccess&&!checked.inputAccess.commit(checked)){m.status={code:'ITEM_INPUT',text:'原料不足'};return false;}
    if(root.MECHANISMS){var resources=root.MECHANISMS.checkCosts(m,recipe,'start');if(root.MECHANISMS.commitResources)root.MECHANISMS.commitResources(m,resources);else m.resourceBuffers=resources;}
    var random=(world&&world.randomInt)?function(max){return world.randomInt(max);}:function(max){m.randomState=(Math.imul(m.randomState||1234567,1664525)+1013904223)>>>0;return m.randomState%max;};
    var profile=root.STRUCTURES&&STRUCTURES.profile(m);
    var rolled=profile?.rollBatchOutputs?.(checked,random);
    var outputs=rolled?rolled.items:[],fluidOutputs=rolled?rolled.fluids:TX.clone(recipe.fout||[]);
    if(!rolled)(recipe.out||[]).forEach(function(p){var count=p.n;if(p.chance!=null){count=0;var copies=checked.recipeCopies||checked.parallel||1;for(var i=0;i<copies;i++)if(random(10000)<p.chance)count+=p.n/copies;}if(count>0){var s=TX.clone(p);s.n=count;delete s.chance;delete s.slot;outputs.push(s);}});
    if(!checked.inputAccess){if(root.MULTIBLOCKS&&MULTIBLOCKS.live(m))MULTIBLOCKS.commitInput(m,checked.inputGroup,checked.itemPlan.remaining);else m.ins=checked.itemPlan.remaining;m.tanksIn=checked.fluidPlan.tanks;}
    m.job={recipeId:recipe.id,recipe:TX.clone(recipe),durationTicks:checked.effective.durationTicks,EUt:checked.effective.EUt,
      progressTicks:0,inputGroup:checked.inputGroup||null,parallel:checked.parallel||1,recipeCopies:checked.recipeCopies||checked.parallel||1,inputs:checked.itemPlan.consumed,fluidInputs:checked.fluidPlan.consumed,
      outputs:outputs,fluidOutputs:fluidOutputs,workIntervalTicks:recipe.workIntervalTicks||1,workClock:0,workEnergyEU:TX.clone(recipe.workEnergyEU||null),overclocks:checked.effective.overclocks,steamMbTick:checked.effective.steamMbTick||0};
    var account=profile&&profile.processingEnergy;
    if(checked.startupEU){account.spend(m,checked.startupEU,world);m.energySpent=(m.energySpent||0)+checked.startupEU;}
    if(account&&account.onStart)account.onStart(m);
    if(profile&&profile.commitBatch)profile.commitBatch(m,recipe,m.job);
    m.status={code:'RUNNING',text:'加工中'};
    return true;
  };
  Processor.prototype.finish=function(m,world){
    var job=m.job,def=root.STRUCTURES?root.STRUCTURES.instance(m):this.definitions.of(m.k),self=this;
    if(def.totalFluidOutputCapacity&&(m.tanksOut||[]).reduce(function(n,t){return n+(t?t.mb:0);},0)+(job.fluidOutputs||[]).reduce(function(n,t){return n+t.mb;},0)>def.totalFluidOutputCapacity){m.status={code:'COMPLETED_OUTPUT_BLOCKED',text:'熔池已满，待熔液取出后完成'};return false;}
    var multi=root.MULTIBLOCKS&&MULTIBLOCKS.live(m),outputs=this.planOutputs(m,job.outputs,job.fluidOutputs,def),items=outputs.items;
    var fluids=outputs.fluids;
    if(!items||!fluids){m.status={code:'COMPLETED_OUTPUT_BLOCKED',text:'加工完成，等待输出空间'};return false;}
    var end=root.MECHANISMS?root.MECHANISMS.checkCosts(m,job.recipe,'end'):{};
    if(!end){m.status={code:'COMPLETED_RESOURCE_BLOCKED',text:'加工完成，等待结算资源'};return false;}
    if(root.MECHANISMS){if(root.MECHANISMS.commitResources)root.MECHANISMS.commitResources(m,end);else m.resourceBuffers=end;}
    m.outs=items;if(multi)MULTIBLOCKS.commitFluidOutput(m,fluids);else m.tanksOut=fluids;m.completedBatches=(m.completedBatches||0)+1;m.job=null;
    m.status={code:'IDLE',text:'等待下一批'};
    return true;
  };
  Processor.prototype.tick=function(m,world,preparedDefinition){
    var def=preparedDefinition||this.ensure(m),self=this;
    if(!def)return false;
    if(!m.enabled){m.status={code:'DISABLED',text:'已停用'};return false;}
    if(m.job&&root.MULTIBLOCKS&&MULTIBLOCKS.glassTier){var gt=MULTIBLOCKS.glassTier(m);if(gt!==null&&(m.job.recipe.eut||0)>DEFS.voltOf(gt)){m.status={code:'GLASS_TIER',text:'玻璃等级不足'};return false;}}if(!m.job){
      if(root.MULTIBLOCKS&&MULTIBLOCKS.live(m)){if(!MULTIBLOCKS.startNext(this,m,world))return false;}
      else{
      var attempt=this.retry&&this.retry.begin(m,def,world);if(attempt===false)return false;
      var candidates=def.recipeCandidates?def.recipeCandidates(m,world):root.PROCESSING_ACCESS&&PROCESSING_ACCESS.candidates(m,def,null,world);if(candidates===undefined)candidates=m.recipeLock?[this.content.recipe(m.recipeLock)]:this.content.processingCandidates(def.recipeMap,m.ins,m.tanksIn);
      var best=null;
      for(var i=0;i<candidates.length;i++){
        var r=candidates[i];if(!r)continue;
        var check=this.check(m,r,world);
        if(this.retry)this.retry.observed(attempt,check);
        if(check.ok){this.start(m,r,world);break;}
        if(!best||failureRank(check)>failureRank(best))best=check;
      }
      if(!m.job){m.status=best||{code:'WAITING_INPUT',text:'等待原料'};if(this.retry)this.retry.failed(m,attempt,m.status);return false;}
      if(this.retry)this.retry.forget(m);
      }
    }
    var job=m.job;
    if(def.requiresStructure&&!(m.structure&&m.structure.formed)){m.status={code:'STRUCTURE',text:'结构不完整'};return false;}
    var powerFailure=root.MULTIBLOCK_RULES&&MULTIBLOCK_RULES.power(Math.max(job.recipe.eut||0,def.steamPowered?0:job.EUt||0),def.maxRecipeEUt||def.volt);if(powerFailure){m.status=powerFailure;return false;}
    if(job.progressTicks>=job.durationTicks)return this.finish(m,world);
    var perTick=root.MECHANISMS?root.MECHANISMS.checkCosts(m,job.recipe,'perTick'):{};
    if(!perTick){m.status={code:'RESOURCE',text:'工艺资源不足'};return false;}
    if(root.MULTIBLOCK_RULES){var gate=MULTIBLOCK_RULES.check(m,job.recipe,job);if(gate){m.status=gate;return false;}}
    var cond=job.recipe.conditions||{};
    var conditionFailure=root.MULTIBLOCK_RULES&&MULTIBLOCK_RULES.environment(m,job.recipe,m.environment,def,world);if(conditionFailure){m.status=conditionFailure;return false;}
    if(cond.attachment&&Object.keys(cond.attachment).some(function(slot){return !(m.attachments&&self.content.matches(cond.attachment[slot],m.attachments[slot]||''));})){m.status={code:'ATTACHMENT',text:'所需组件已移除'};return false;}
    var realTime=root.REAL_TIME&&REAL_TIME.isRealTime(m.k);
    var interval=root.GAME_TIME?(realTime?GAME_TIME.real(world&&world.state,job.workIntervalTicks||1):GAME_TIME.ticks(world&&world.state,job.workIntervalTicks||1)):job.workIntervalTicks||1;
    if((job.workClock||0)+1<interval){job.workClock=(job.workClock||0)+1;if(root.MECHANISMS){if(root.MECHANISMS.commitResources)root.MECHANISMS.commitResources(m,perTick);else m.resourceBuffers=perTick;}return false;}
    var work=root.MECHANISMS?root.MECHANISMS.resourcePlan(perTick,(job.recipe.costs||{}).work||{}):perTick;
    if(!work){m.status={code:'RESOURCE',text:'加工能源不足'};return false;}
    if(def.steamPowered){
      if(steamStored(m)<job.steamMbTick){m.status={code:'STEAM',text:'蒸汽不足'};return false;}
      steamDrain(m,job.steamMbTick);m.steamSpent=(m.steamSpent||0)+job.steamMbTick;
    }else{
      var cost=job.EUt,nextCredit=m.workEnergyCredit||0;
      if(job.workEnergyEU){var e=job.workEnergyEU,owed=e.numerator-nextCredit;cost=Math.max(0,Math.ceil(owed/e.denominator));nextCredit=cost*e.denominator-owed;}
      var profile=root.STRUCTURES&&STRUCTURES.profile(m),account=profile&&profile.processingEnergy;
      if((account?account.available(m,world):m.eu)<cost){
        var wait=account&&account.waitForFirstWork&&job.progressTicks===0;
        m.status=wait?{code:'STARTUP_POWER',text:'等待运行电量'}:{code:'ENERGY',text:'电量不足'};
        return false;
      }
      if(account)account.spend(m,cost,world);else m.eu-=cost;
      m.energySpent=(m.energySpent||0)+cost;if(job.workEnergyEU)m.workEnergyCredit=nextCredit;
    }
    if(root.MECHANISMS){if(root.MECHANISMS.commitResources)root.MECHANISMS.commitResources(m,work);else m.resourceBuffers=work;}
    job.workClock=0;job.progressTicks=root.GAME_TIME?(realTime?Math.min(job.durationTicks,(job.progressTicks||0)+interval):GAME_TIME.advance(world&&world.state,job.progressTicks,job.durationTicks,interval)):Math.min(job.durationTicks,job.progressTicks+interval);
    m.status={code:'RUNNING',text:'加工中',progress:job.progressTicks,total:job.durationTicks};
    if(job.progressTicks>=job.durationTicks&&this.finish(m,world)&&root.ENGINE)lastWorkTick.set(m,ENGINE.tick);
    return true;
  };
  Processor.workedThisTick=function(m){return root.ENGINE&&lastWorkTick.has(m)&&lastWorkTick.get(m)===ENGINE.tick;};
  root.BatchProcessor=Processor;
  if(typeof module==='object'&&module.exports)module.exports=Processor;
})(typeof window!=='undefined'?window:globalThis);
