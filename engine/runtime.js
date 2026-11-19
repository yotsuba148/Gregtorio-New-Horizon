(function(root){
 'use strict';
 var batch=new root.BatchProcessor(root.CONTENT,root.DEFS);
 var generators=new root.GeneratorProcessor(root.CONTENT,root.DEFS);
 var boiler=root.BOILER||(root.BoilerProcessor?new root.BoilerProcessor(root.CONTENT):null);
 var worldStep=null,behaviors=Object.create(null);
 function attach(step){worldStep=step;}
 function ensure(m){var d=DEFS.of(m.k),handler=d&&behaviors[d.behavior];if(handler&&handler.ensure)handler.ensure(m);if(root.MACHINE_STORAGE)MACHINE_STORAGE.ensure(m);return batch.ensure(m,{legacyTimeUnit:'ticks'});}
 function environmentFor(m){return root.STRUCTURES?root.STRUCTURES.environment(m,root.ENGINE.state):m.environment||{};}
 var world={environmentFor:environmentFor};
 Object.defineProperty(world,'state',{get:function(){return root.ENGINE.state;}});
 function behavior(id){return behaviors[id]||null;}
  function registerBehavior(id,handler){
  if(!id||!handler||(typeof handler.tick!=='function'&&handler.gridTick!==false))throw Error('设备行为需要名称和tick处理器');
  if(behaviors[id])throw Error('设备行为已注册：'+id);
  behaviors[id]=handler;return handler;
 }
 function batchIdle(m){
  var profile=root.STRUCTURES&&STRUCTURES.profile(m),account=profile&&profile.processingEnergy;
  if(account&&account.onIdle)account.onIdle(m);
 }
 registerBehavior('batch_processor',{batchProcessing:true,waitsForInput:true,personalStorage:true,
  idleTick:function(m){if(!m.job)batchIdle(m);},
  tick:function(m,context){
   var pending=!!m.job,changed=batch.tick(m,context.world,context.definition);
   if(!pending&&!m.job&&!changed)batchIdle(m);
   return changed;
  }
 });
 function step(m,context){
  context=context||{state:root.ENGINE.state,tick:root.ENGINE.tick||0,world:world};
  if(root.ENTITIES&&!root.ENTITIES.active(m))return false;
  if(m.location&&m.location.kind==='attached')return false;
  var d=ensure(m);if(!d)return false;var storageChanged=root.MACHINE_STORAGE&&MACHINE_STORAGE.energy(m,d);
  var hook=behaviors[d.behavior];
  if(hook&&hook.gridTick===false){if(!d.multiblock)m.enabled=true;return !!storageChanged;}
  if(hook&&hook.gate){var gateReason=hook.gate(m,d,context);if(gateReason){if(gateReason.status)m.status=gateReason.status;return false;}}
  var passive=behaviors[d.behavior];if(passive&&passive.passiveTick)passive.passiveTick(m,Object.assign({},context,{definition:d}));
  var profile=root.STRUCTURES&&STRUCTURES.profile(m);if(profile&&profile.passiveTick)profile.passiveTick(m,context);
  var wasEnabled=m.enabled,wasStopped=m.workStopped;
  if(!MACHINE_CONTROL.before(m,d)){if(passive&&passive.idleTick)passive.idleTick(m,Object.assign({},context,{definition:d}));return !!storageChanged||wasEnabled!==m.enabled||wasStopped!==m.workStopped;}
  var handler=behaviors[d.behavior];if(!handler){m.status={code:'UNSUPPORTED_BEHAVIOR',text:'设备暂不能运行'};return MACHINE_CONTROL.after(m,d);}
  var changed=handler.tick(m,Object.assign({},context,{definition:d}));
  var controlChanged=MACHINE_CONTROL.after(m,d);
  if(!m.enabled&&passive&&passive.idleTick)passive.idleTick(m,Object.assign({},context,{definition:d}));
  return controlChanged||changed||!!storageChanged;
 }
 function check(m,r,opt){var d=ensure(m),h=d&&behaviors[d.behavior];return h&&h.check?h.check(m,r,world,opt):batch.check(m,r,world,opt);}
 function selectRecipe(m,r){var d=ensure(m);if(!r||!d||r.map!==d.recipeMap||/^gregtech:gt.blockmachines@/.test(m.k)&&!d.requiresRecipeSelection)return false;m.recipeLock=r.id;var h=behaviors[d.behavior];if(h&&h.recipeSelected)h.recipeSelected(m,r);return true;}
 function otherStep(S,tick){return worldStep?worldStep(S,tick,0.05):false;}
 function migrateFields(S){
  if(root.BLUEPRINTS&&S.fx)BLUEPRINTS.ensure(S);
  (S.fx&&S.fx.machines||[]).forEach(function(m){
   if(!Number.isInteger(m.rotation)||m.rotation<0||m.rotation>3)m.rotation=0;var d=DEFS.of(m.k);if(d&&!d.requiresRecipeSelection&&/^gregtech:gt.blockmachines@/.test(m.k))delete m.recipeLock;
   MACHINE_CONTROL.ensure(m,d);delete m.stopAfterBatch;delete m.ports;m.outFace=DEFS.outputFace(d,m.outFace);
   if(root.MACHINE_COVERS)MACHINE_COVERS.ensure(m);
   var rf=m.resourceBuffers&&m.resourceBuffers.rf;
   if(rf){var units=Math.max(0,rf.amount||0)*100+(m.rfConversionRemainder||0);m.eu=(m.eu||0)+Math.floor(units/360);m.workEnergyCredit=(m.workEnergyCredit||0)+units%360;if(m.workEnergyCredit>=360){m.eu+=Math.floor(m.workEnergyCredit/360);m.workEnergyCredit%=360;}delete m.resourceBuffers.rf;delete m.rfConversionRemainder;}
   if(m.job&&m.job.recipe&&m.job.recipe.costs&&m.job.recipe.costs.work&&m.job.recipe.costs.work.rf!=null){
    var r=root.CONTENT.recipe(m.job.recipeId);if(r){m.job.recipe=JSON.parse(JSON.stringify(r));m.job.workEnergyEU=JSON.parse(JSON.stringify(r.workEnergyEU));m.job.EUt=r.eut;m.job.workIntervalTicks=r.workIntervalTicks;}
   }
  });
  (S.fx&&S.fx.machines||[]).forEach(function(m){if(m.circuitConfigured==null)m.circuitConfigured=!!(m.circuitItem||m.legacyCircuit||m.circ>0);delete m.legacyCircuit;});
 }
 function migrate(S,metadata){SAVE_MIGRATIONS.migrate(S,metadata);}

  root.ENGINE={schema:10,behavior:behavior,batch:batch,generators:generators,boiler:boiler,ensure:ensure,stepMachine:step,check:check,selectRecipe:selectRecipe,attachWorldStep:attach,otherStep:otherStep,world:world,migrate:migrate,migrateFields:migrateFields,behaviors:behaviors,registerBehavior:registerBehavior};
 root.BEHAVIOR_REGISTRY.flush(registerBehavior);
})(typeof window!=='undefined'?window:globalThis);
