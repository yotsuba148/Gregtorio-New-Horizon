(function(root){
 'use strict';
 var sessions=new WeakMap(),effects=new WeakMap(),afterMachines=new Map(),active=null;
 function emit(S,event){var pending=effects.get(S);if(!pending)effects.set(S,pending=[]);pending.push(event);}
 function takeEffects(S){var pending=effects.get(S)||[];effects.delete(S);return pending;}
 function step(S,tick){
  var f=FACTORY_STATE.ensure(S);
  return BLUEPRINTS.withNetworkViews(f,function(){return stepBoards(S,f,tick);});
 }
 function stepBoards(S,f,tick){
  var context={state:S,tick:tick,world:{state:S,environmentFor:function(m){return STRUCTURES.environment(m,S);}}},changed=false;
  ENGINE.tick=tick;
  ENGINE.networks.power(f,tick);
  if(root.AE_FACTORY&&AE_FACTORY.before(S,tick))changed=true;
  if(ENGINE.otherStep(S,tick))changed=true;
  if(SPACE_FACILITIES.tick(S,tick))changed=true;
  if(MECHANISMS.stepResources(S,tick))changed=true;
  for(var i=0;i<f.machines.length;i++)if(ENGINE.stepMachine(f.machines[i],context))changed=true;
  afterMachines.forEach(function(fn){if(fn(S,tick))changed=true;});
  if(LINE_STORAGE.tick(f,tick))changed=true;
  if(ITEM_FILTERS.tick(f,tick))changed=true;
  if(root.TYPE_FILTERS&&TYPE_FILTERS.tick(f,tick))changed=true;
  if(tick%5===0&&ENGINE.networks.items(f,tick)+ENGINE.networks.fluids(f,tick)>0)changed=true;
  if(root.AE_FACTORY&&AE_FACTORY.after(S,tick,true))changed=true;
  if(DROPPED_ITEMS.tick(S))changed=true;
  return changed;
 }
 function Session(S){this.state=S;this.repo=FACTORY_STATE.ensure(S);this.clock=new GAME_TIME.Clock();}
 Session.prototype.advance=function(now){
  var clock=this.clock,S=this.state,changed=false,steps=0,start=performance.now();
  clock.collect(now);clock.setMode(DEVELOPER_MODE.read(S));
  while(clock.hasPending()&&steps<80){clock.next();if(step(S,clock.tick))changed=true;steps++;if(performance.now()-start>=8)break;}
  return {steps:steps,changed:changed,tick:clock.tick,effects:takeEffects(S)};
 };
 Session.prototype.resume=function(now){this.clock.resetElapsed(now);this.clock.setMode(DEVELOPER_MODE.read(this.state));};
 Session.prototype.configure=function(now){this.clock.collect(now);this.clock.setMode(DEVELOPER_MODE.read(this.state));};
 function session(S){var value=sessions.get(S);if(!value||value.repo!==S.fx){value=new Session(S);sessions.set(S,value);}active=value;return value;}
 function current(){if(!active)throw Error('Simulation session has not been bound');return active;}
 async function prepareLoadedRecipes(S,pause){
  var maps=new Set();
  FACTORY_STATE.ensure(S).machines.forEach(function(m){
   if(!ENTITIES.active(m)||!m.enabled)return;
   var d=STRUCTURES.instance(m);
   if(d&&d.recipeMap)maps.add(CONTENT.mapId(d.recipeMap));
  });
  if(maps.size&&root.TYPE_FILTERS)await TYPE_FILTERS.prepareIndex(pause);
  for(var map of maps)await CONTENT.prepareProcessing(map,pause);
 }
 root.SIMULATION={Session:Session,session:session,current:current,prepareLoadedRecipes:prepareLoadedRecipes,step:step,emit:emit,takeEffects:takeEffects,registerAfterMachines:function(id,fn){if(afterMachines.has(id)||typeof fn!=='function')throw Error('Invalid simulation phase '+id);afterMachines.set(id,fn);}};
})(typeof window!=='undefined'?window:globalThis);
