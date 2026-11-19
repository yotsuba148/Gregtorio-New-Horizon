(function(root){
 'use strict';
 var sourceTools={mine_cobble:['pick'],chop_tree:['axe'],dig_gravel:['shovel'],gather_rubberwood:['axe'],gather_wool:['shears'],dig_sand:['shovel'],dig_dirt:['shovel'],dig_clay:['shovel'],cut_reed:['knife','branch','shears'],get_water:[],get_lava:[]};
 var sourceBuckets={get_water:'minecraft:bucket@0',get_lava:'minecraft:bucket@0'},slotWeights={primary:4,secondary:4,between:2,sporadic:1},actions=new Map();
 function prepare(S){
  if(!S.inv)S.inv=Array(36).fill(null);if(!S.tools)S.tools={};if(!S.furs)S.furs=[];if(!S.veins)S.veins=[];if(!S.veinSequence)S.veinSequence=0;
  if(!S.ui)S.ui={dim:'overworld'};if(!S.env)S.env={elapsed:0,weather:'clear',remaining:0,rate:1};ACTION_QUEUE.ensure(S);
 }
 function speed(S,id){var source=ACTIVITIES.definitions[id];if(source&&source.requiredHarvestLevel!=null){var tool=MINING.findPick(S,source.requiredHarvestLevel);return tool?Math.max(.01,tool.inst.spd||1):1;}var ids=sourceTools[id]||source&&source.toolTypes;if(!ids||!ids.length)return 1;var selected=PLAYER_TOOLS.best(S,ids);return selected?Math.max(1,selected.spd||1):1;}
 function duration(S,source,action){
  if(source.timing==='search')return GAME_TIME.seconds(S,source.time);
  var physical=source.breakBlock||source.id==='mine_cobble';
  var normal=physical?WORK_TIME.seconds(S,source,action):source.time/speed(S,source.id);
  return GAME_TIME.seconds(S,normal);
 }
 function rollVein(dim){var pool=DIMENSIONS.veins(dim),total=pool.reduce(function(n,v){return n+v.weight;},0);if(!pool.length||total<=0)return null;var roll=Math.random()*total;for(var vein of pool){roll-=vein.weight;if(roll<=0)return vein;}return pool[0];}
 function makeVein(S,def){var ores=new Map();def.ores.forEach(function(o){var weight=slotWeights[o.slot]||1,prior=ores.get(o.key);if(prior)prior.w+=weight;else ores.set(o.key,{key:o.key,name:o.name,w:weight});});return{id:'vein'+(++S.veinSequence),name:def.name,dim:def.dim||'overworld',ores:Array.from(ores.values()),left:2000+Math.floor(Math.random()*2001)};}
 function register(id,step){if(!id||actions.has(id)||typeof step!=='function')throw Error('Invalid queued action: '+id);actions.set(id,step);}
 function receipt(S,result){SIMULATION.emit(S,{type:'gain',result:result});}
 function wear(S,tool){var result=PLAYER_TOOLS.wear(S,tool);if(result&&result.broken&&!TINKER_TOOLS.isTool(result.item.k))SIMULATION.emit(S,{type:'tool-broken',item:result.item});return result;}
 ACTIVITIES.configure({
  consume:function(source){return sourceBuckets[source.id]?[[sourceBuckets[source.id],1]]:[];},
  duration:function(source,action,S){return duration(S,source,action);},
  findTool:function(ids,S){return PLAYER_TOOLS.find(S,ids);},
  onCycle:function(S,source,action,result){
   if(source.id==='village_plunder'&&!result.produced.length)SIMULATION.emit(S,{type:'empty-plunder'});
   receipt(S,result);
   var ids=sourceTools[source.id]||source.toolTypes;
   if(ids&&ids.length){var physical=source.breakBlock,tool=source.requiredHarvestLevel!=null?MINING.findPick(S,source.requiredHarvestLevel):physical?WORK_TIME.best(S,ids[0]):PLAYER_TOOLS.find(S,ids);if(tool){if(TINKER_TOOLS.isPick(tool.k))TINKER_TOOLS.mine(tool.inst,!!source.weightedDrops,S);else wear(S,tool);}}
  }
 });
 TINKER_TOOLS.setObserver(function(S,tool,event){if(S)SIMULATION.emit(S,{type:'tinker-tool',item:GTTransactions.clone(tool),event:event});});
 register('gather',function(S,a,dt){ACTIVITIES.step(S,a,dt);if(a.done>=a.target)ACTION_QUEUE.finish(S);});
 register('riverwash',function(S,a,dt){if(!TRAVEL.can(S,'overworld'))a.blocked='DIMENSION';else{RIVER_WASH.step(S,a,dt,GAME_TIME.seconds(S,RIVER_WASH.ticksPerItem/20));if(a.complete)ACTION_QUEUE.finish(S);}});
 register('explore',function(S,a,dt){
  if(!DIMENSIONS.open(S,a.dim||'overworld')){a.blocked='DIMENSION';a.prog=0;return;}
  delete a.blocked;var period=GAME_TIME.seconds(S,60);a.prog=GAME_TIME.elapsed(S,a.prog,period,dt);
  while(a.prog+1e-9>=period&&a.done<a.cycles){if(!WORLD_DISCOVERY.veinRoom(S,a.dim||'overworld')){a.blocked='LIMIT';a.prog=period;break;}a.prog=Math.max(0,a.prog-period);var def=rollVein(a.dim||'overworld');if(!def){a.done=a.cycles;break;}a.done++;S.veins.push(makeVein(S,def));}
  if(a.done>=a.cycles){a.prog=0;ACTION_QUEUE.finish(S);}
 });
 register('mine',function(S,a,dt){
  var vein=a.vein,rows=MINING.stepVein(S,a,dt,{wear:function(tool){return wear(S,tool);}});a.done=(a.done||0)+rows.length;rows.forEach(function(row){receipt(S,row);});
  if(vein.left<=0){a.prog=0;S.veins=S.veins.filter(function(v){return v.id!==a.veinId;});ACTION_QUEUE.removeWhere(S,function(v){return v.veinId===a.veinId;});}
  else if(a.target!=null&&a.done>=a.target)ACTION_QUEUE.finish(S);
 });
 function step(S,tick,dt){
  FARMING.tick(S,tick);WORLD_SITES.tick(S,tick);THAUMCRAFT.tick(S);ENVIRONMENT.advance(S,GAME_TIME.environmentSeconds(S,dt));
  var furnaceChanged=false;S.furs.forEach(function(f){var input=f.input&&f.input.n,fuel=f.fuel&&f.fuel.n,out=f.out&&f.out.n,burn=f.burnTicks>0;FURNACES.tick(f,S);if(input!==(f.input&&f.input.n)||fuel!==(f.fuel&&f.fuel.n)||out!==(f.out&&f.out.n)||burn!==(f.burnTicks>0))furnaceChanged=true;});
  ACTION_QUEUE.ensure(S);var a=S.act;if(!a)return furnaceChanged;
  var before=[a.queueId,a.done,a.blocked].join(':'),blocked=a.blocked,handler=actions.get(a.type);
  if(!handler)throw Error('Unknown queued action: '+a.type);
  handler(S,a,dt);
  if(S.act!==a)SIMULATION.emit(S,{type:'action-finished',action:Object.assign({},a)});
  else if(a.blocked&&a.blocked!==blocked)SIMULATION.emit(S,{type:'action-waiting',action:Object.assign({},a)});
  var actionChanged=S.act!==a||before!==[a.queueId,a.done,a.blocked].join(':');
  if(actionChanged)SIMULATION.emit(S,{type:'world-updated'});
  return furnaceChanged||actionChanged;
 }
 root.WORLD_SIMULATION={prepare:prepare,step:step,duration:duration,speed:speed,rollVein:rollVein,makeVein:makeVein,register:register};
 ENGINE.attachWorldStep(step);
})(typeof window!=='undefined'?window:globalThis);
