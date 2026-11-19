(function(root){
 'use strict';
 var modules=new Map(),owners=new Map(),reserved=new Set(['schema','clock','savedAt','dbg','pendingMs','offlineMs','developerTicks']);
 function register(id,fields,encoders){
  if(!id||modules.has(id)||!Array.isArray(fields)||!fields.length)throw Error('Invalid persistent module: '+id);
  fields.forEach(function(field){if(typeof field!=='string'||owners.has(field)||reserved.has(field))throw Error('Persistent field already owned or reserved: '+field);});
  fields.forEach(function(field){owners.set(field,id);});
  modules.set(id,{fields:fields.slice(),encoders:encoders||{}});
 }
 function snapshot(S,metadata){
  var out={schema:metadata.schema};
  modules.forEach(function(module){module.fields.forEach(function(field){var encode=module.encoders[field];out[field]=encode?encode(S[field]):S[field];});});
  out.clock=metadata.clock;out.savedAt=metadata.savedAt;return out;
 }
 root.STATE_SCHEMA={register:register,snapshot:snapshot,fields:function(){return Array.from(owners.keys());}};
})(typeof window!=='undefined'?window:globalThis);
