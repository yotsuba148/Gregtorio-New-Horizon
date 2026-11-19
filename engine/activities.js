(function(root){
 'use strict';var defs={},hooks={};
 function register(d){if(!d.id||!(d.time>0))throw Error('Activity needs id and positive time');defs[d.id]=d;}
 function batchLimit(S,d){
  if(!d)return 0;
  if(d.cycleLimit)return Math.max(0,Math.min(64,d.cycleLimit(S)));
  return d.consume||!d.out?.length?64:1000;
 }
 function canRepeat(d){return !!d&&!d.cycleLimit&&d.repeatable!==false;}
 function containerFor(S,fluid){return(GD.containerRegistry||[]).find(function(p){return p.fluid===fluid&&p.amount>0&&ENTITIES.storage(S).some(function(a){return a.some(function(s){return s&&!s.entityUid&&CONTENT.canonicalKey(s.k)===p.empty;});});});}
 function available(S,d,a){if(d.planet?!root.SPACEFLIGHT||!SPACEFLIGHT.landed(S,d.planet):root.TRAVEL&&!TRAVEL.can(S,d.dim))return{ok:false,code:'DIMENSION'};var c=d.conditions||{};if(c.research&&!(S.mechanisms&&S.mechanisms.knowledge&&S.mechanisms.knowledge[c.research]))return{ok:false,code:'RESEARCH'};if(c.tool&&(!hooks.findTool||!hooks.findTool(Array.isArray(c.tool)?c.tool:[c.tool],S)))return{ok:false,code:'TOOL'};if(c.ownedItemId&&!COMMANDS.owned(S,function(k){var item=CONTENT.item(k);return item&&item.id===c.ownedItemId;}).length)return{ok:false,code:'TOOL'};if(d.fluidSource&&!containerFor(S,d.fluidSource))return{ok:false,code:'CONTAINER',complete:!!d.fluidSource};return d.check?d.check(S,a):{ok:true};}
 function random(a,n){var seed=a.randomState;if(seed==null)seed=(Math.random()*4294967296)>>>0;seed=seed||123456789;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;a.randomState=seed>>>0;return a.randomState%n;}
 function chooseOutput(a,pool){var total=pool.reduce(function(n,p){return n+(p.weight||1);},0),r=random(a,total);for(var p of pool){r-=p.weight||1;if(r<0)return[{k:p.k,n:p.n||1}];}throw Error('Invalid activity output pool');}
 function rollDrops(a,d){var out=[],v=d.weightedDrops,total=v.pool.reduce(function(n,p){return n+p.weight;},0),mult=v.multiplier||1,draws=Math.max(1,mult+Math.floor(random(a,1+mult)/2));
  for(var i=0;i<draws;i++){var r=random(a,total),selected=v.pool[0];for(var p of v.pool){r-=p.weight;if(r<0){selected=p;break;}}var prior=out.find(function(p){return p.k===selected.k;});if(prior)prior.n++;else out.push({k:selected.k,n:1});}
  if(random(a,4)>1){var k=random(a,3)>0?v.hostImpure:v.hostDust;if(k){var old=out.find(function(p){return p.k===k;});if(old)old.n++;else out.push({k:k,n:1});}}return out;
 }
 function step(S,a,dt){
  if(!Number.isFinite(a.prog)||a.prog<0)a.prog=0;
  var d=defs[a.src];if(!d){a.done=a.target;a.blocked='SOURCE';return false;}
  var gate=available(S,d,a);if(!gate.ok){if(gate.complete)a.done=a.target;a.blocked=gate.code;return false;}
  delete a.blocked;var st=hooks.duration?hooks.duration(d,a,S):d.time;a.prog=root.GAME_TIME?GAME_TIME.elapsed(S,a.prog,st,dt):(a.prog||0)+dt;
  while(a.prog+1e-9>=st&&a.done<a.target){
   gate=available(S,d,a);if(!gate.ok){if(gate.complete)a.done=a.target;a.blocked=gate.code;a.prog=Math.min(a.prog,st);return false;}
   var costs=d.costs?d.costs(S,a):d.consume||(hooks.consume?hooks.consume(d):[]);
   if(!Array.isArray(costs)){a.blocked='INPUT';a.prog=st;return false;}
   // Only a synchronous outcome callback sees cycle costs; no reward survives a cycle.
   a.cycleCosts=costs;var out;
   try{out=d.outcome?d.outcome(S,a):d.randomOutputs?chooseOutput(a,d.randomOutputs):d.weightedDrops?rollDrops(a,d):(d.out||[]).map(function(p){return{k:p[0],n:p[1]};});}finally{delete a.cycleCosts;}
   if(d.fluidSource){var pair=containerFor(S,d.fluidSource);out=[{k:pair.filled,n:1}];costs=[[pair.empty,1]];}
   else (d.bonus||[]).forEach(function(b){if(random(a,1000000)<b[1]*1000000){if(b[2]==='replace')out=out.filter(function(p){return p.k!==(d.out[0]||[])[0];});out.push({k:b[0],n:1});}});
   var result=COMMANDS.exchange(S,costs.map(function(p){return{k:p[0],n:p[1]};}),out);if(!result.ok){a.blocked=result.code;a.prog=st;return false;}
   a.prog=Math.max(0,a.prog-st);a.done++;if(d.effect)d.effect(S,a,result);if(hooks.onCycle)hooks.onCycle(S,d,a,result);st=hooks.duration?hooks.duration(d,a,S):d.time;
  }return true;
 }
 GD.sources.forEach(function(d){if(d.id==='dig_gravel')d.bonus=[];if(d.id==='get_water'||d.id==='get_lava')d.fluidSource=d.id==='get_water'?'water':'lava';register(d);});
 [
  {id:'get_lava',name:'取岩浆',time:1.5,dim:'overworld',out:[['minecraft:lava_bucket@0',1]],fluidSource:'lava'},
  {id:'forage_grass',name:'草地寻种',time:6,dim:'overworld',out:[['minecraft:wheat_seeds@0',1]]},
  {id:'harvest_sapling',name:'收集橡树苗',time:12,dim:'overworld',out:[['minecraft:sapling@0',1]]},
  {id:'gather_soulsand',name:'挖灵魂沙',time:2,dim:'nether',out:[['minecraft:soul_sand@0',1]]},
  {id:'gather_netherwart',name:'搜寻地狱疣',time:20,timing:'search',dim:'nether',out:[['minecraft:nether_wart@0',1]]}
 ].forEach(function(d){if(!GD.sources.some(function(x){return x.id===d.id;}))GD.sources.push(d);register(d);});
 root.ACTIVITIES={register:register,configure:function(h){hooks=h||{};},available:available,batchLimit:batchLimit,canRepeat:canRepeat,step:step,definitions:defs,containerFor:containerFor,random:random};
})(typeof window!=='undefined'?window:globalThis);
