(function(root){
 'use strict';
 var conditions=new Map();
 function registerCondition(id,rule){if(conditions.has(id))throw Error('Duplicate recipe condition '+id);conditions.set(id,rule);}
 function power(required,available){if(required<=available)return null;var voltage=DEFS.recipeTier(required)>DEFS.recipeTier(available);return{ok:false,code:voltage?'VOLTAGE':'AMPERAGE',condition:voltage?'voltage':'power',text:(voltage?'电压等级不足':'供电功率不足')+'：需要 '+required+' EU/t，当前 '+available+' EU/t',required:required,available:available};}
 function environment(m,recipe,env,def,world){
  var values=recipe.conditions;
  if(!values)return null;
  var capabilities=def.environmentCapabilities||{},read=false;
  for(var pair of conditions){
   var required=values[pair[0]];
   if(!required)continue;
   if(!read){env=(world&&world.environmentFor?world.environmentFor(m):env)||{};read=true;}
   var rule=pair[1],available=Math.max(rule.available(m,env,def),Number(capabilities[pair[0]]||0));
   if(available<required)return{ok:false,code:rule.code,condition:pair[0],text:rule.label+'不足'+(typeof required==='number'?'：需要 '+required+(rule.unit||'')+'，当前 '+available+(rule.unit||''):''),required:required,available:available};
  }
  return null;
 }
 registerCondition('heat',{code:'HEAT',label:'炉温',unit:' K',available:function(m,env){return env.heat||0;}});
 registerCondition('cleanroom',{code:'CLEANROOM',label:'洁净度',available:function(m,env){return env.cleanroom?1:0;}});
 registerCondition('lowGravity',{code:'GRAVITY',label:'低重力条件',available:function(m,env){return env.lowGravity?1:0;}});
 registerCondition('compressionTier',{code:'COMPRESSION',label:'压缩等级',available:function(m,env){return env.compressionTier||0;}});
 // Recipe requirements and hardware are independent: having one high-grade part
 // cannot compensate for a missing temperature, glass or power requirement.
 function check(m,recipe,job){
  var p=STRUCTURES.profile(m);if(!p||!recipe)return null;
  var def=STRUCTURES.instance(m);var modeFailure=root.MACHINE_MODES&&MACHINE_MODES.check(m,recipe);if(modeFailure&&!job)return modeFailure;
  if(job){var parallel=def.recipeParallelLimit?def.recipeParallelLimit(recipe):def.maxParallel||def.parallelPerTier*def.tier||1;
   if((job.parallel||1)>parallel)return {ok:false,code:'CAPABILITY',text:'当前部件的并行能力不足，批次保留',required:job.parallel,available:parallel};
  }
  for(var rule of p.recipeRequirements||[]){
   var required=rule.required(recipe),available=rule.available(m,def);
   if(required!=null&&(!Number.isFinite(required)||!Number.isFinite(available)||(rule.exact?available!==required:available<required)))return {ok:false,code:rule.code||'CAPABILITY',text:rule.label+'不足：需要 '+required+'，当前 '+available,required:required,available:available};
  }
  return p.checkRecipe?p.checkRecipe(m,recipe,job):null;
 }
 function setMode(m,value){
  return MACHINE_MODES.set(m,value);
 }
 root.MULTIBLOCK_RULES={check:check,setMode:setMode,power:power,environment:environment,registerCondition:registerCondition};
})(typeof window!=='undefined'?window:globalThis);
