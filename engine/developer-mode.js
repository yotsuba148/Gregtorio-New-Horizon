/* Developer settings have one normalized policy; clocks remain runtime-only. */
(function(root){
 'use strict';
 var sessions=new WeakMap(),normalScopes=new WeakMap(),OFF=Object.freeze({on:false,speed:1,fastest:false});
 function normalize(value,forceOff){
  if(forceOff||!value||value.on!==true)return{on:false,speed:1,fastest:false};
  var next={on:true,speed:1,fastest:value.fastest===true};if(value.noToolWear===true)next.noToolWear=true;return next;
 }
 function read(S){
  if(!S||normalScopes.get(S))return OFF;
  // Standalone engine callers supply an explicit policy; a bound game always uses its session.
  return sessions.get(S)||normalize(S.dbg);
 }
 function publish(S,value){
  var next=Object.freeze(normalize(value));sessions.set(S,next);S.developerSettings=normalize(next);
  Object.defineProperty(S,'dbg',{value:next,writable:true,configurable:true,enumerable:false});
  // Old timing hints are derived data, never permission to shorten subsequent work.
  var actions=new Set([S.act].concat(S.actionQueue||[]));actions.forEach(function(a){if(a){delete a.spd;if(a.type==='mine')delete a.period;}});
  if(!next.on&&S.env)S.env.rate=1;
  return next;
 }
 function reset(S){return publish(S,OFF);}
 function restore(S){return publish(S,S.developerSettings);}
 function update(S,patch){return publish(S,Object.assign({},sessions.get(S)||read(S),patch));}
 function active(S){return read(S).on===true;}
 function oneTick(S){var d=read(S);return d.on===true&&d.fastest===true;}
 function preserveTools(S){var d=read(S);return d.on===true&&d.noToolWear===true;}
 function normal(S,work){var depth=normalScopes.get(S)||0;normalScopes.set(S,depth+1);try{return work();}finally{if(depth)normalScopes.set(S,depth);else normalScopes.delete(S);}}
 root.DEVELOPER_MODE={normalize:normalize,read:read,reset:reset,restore:restore,update:update,active:active,oneTick:oneTick,preserveTools:preserveTools,normal:normal};
 if(root.STATE_SCHEMA)STATE_SCHEMA.register('developer-mode',['developerSettings'],{developerSettings:function(value){return normalize(value);}});
})(typeof window!=='undefined'?window:globalThis);
