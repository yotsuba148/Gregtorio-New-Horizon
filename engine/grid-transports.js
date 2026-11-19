/* Canvas-layer dispatch. Each family owns its commands and connectivity. */
(function(root){
 'use strict';
 var families=new Map(),layers=new Map();
 function register(spec){if(!spec.id||families.has(spec.id))throw Error('Duplicate grid transport family');spec.layers.forEach(function(k){if(layers.has(k))throw Error('Duplicate grid transport layer '+k);layers.set(k,spec);});families.set(spec.id,spec);}
 function definition(k){for(var spec of families.values()){var d=spec.definition(k);if(d)return d;}return null;}
 function kinds(){return Array.from(layers.keys());}
 function at(b,cell){return kinds().filter(function(k){return !!(b[k]&&b[k][cell]);});}
 function call(kind,method,args){var f=layers.get(kind);return f&&f[method]?f[method].apply(f,args):null;}
 function placed(S,cell,kind,id){families.forEach(function(f){if(kind&&!f.layers.includes(kind))return;if(f.placed)f.placed(S,cell,kind,id);});}
 function detach(S,cell,kind,id){families.forEach(function(f){if(kind&&!f.layers.includes(kind))return;if(f.detach)f.detach(S,cell,kind,id);});}
 register({id:'gt',layers:['item','fluid','wire'],definition:function(k){return GD.logisticsDefinitions[k]||null;},
  place:function(S,kind,cell,k,source){return COMMANDS.placePipe(S,kind,cell,k,source);},remove:function(S,kind,cell){return COMMANDS.removePipe(S,kind,cell);},
  target:function(b,k,c,d,idx){return PIPE_CONNECTIONS.target(b,k,c,d,idx);},connected:function(b,k,c,d,idx){return PIPE_CONNECTIONS.connected(b,k,c,d,idx);},set:function(S,k,c,d,on){return PIPE_CONNECTIONS.set(S,k,c,d,on);},
  placed:function(){PIPE_CONNECTIONS.placed.apply(null,arguments);},detach:function(){PIPE_CONNECTIONS.detach.apply(null,arguments);}
 });
 root.GRID_TRANSPORTS={register:register,definition:definition,kinds:kinds,at:at,family:function(k){return layers.get(k);},
  place:function(S,k,c,key,source){return call(k,'place',[S,k,c,key,source]);},remove:function(S,k,c){return call(k,'remove',[S,k,c]);},
  target:function(b,k,c,d,idx){return call(k,'target',[b,k,c,d,idx]);},connected:function(b,k,c,d,idx){return call(k,'connected',[b,k,c,d,idx]);},set:function(S,k,c,d,on){return call(k,'set',[S,k,c,d,on]);},placed:placed,detach:detach};
})(typeof window!=='undefined'?window:globalThis);
