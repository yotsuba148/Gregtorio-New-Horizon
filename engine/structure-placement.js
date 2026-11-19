(function(root){
 'use strict';
 function profile(k){return root.STRUCTURES&&STRUCTURES.profile({k:k});}
 function supports(k){var d=DEFS.of(k);return !!(d&&!d.worldOnly&&!d.attachmentOnly&&profile(k)&&MULTIBLOCKS.shape({k:k}));}
 function fields(k){
  var p=profile(k);if(!p)return[];
  return (p.dimensions||[]).map(function(f){var choices=f.choices||[];if(!choices.length)for(var n=f.min;n<=f.max;n+=f.step||1)choices.push([n,String(n)]);return {key:f.key,label:f.label,kind:'size',choices:choices};})
   .concat([{key:'rotation',label:'方向',kind:'rotation',choices:[[0,'0°'],[1,'90°'],[2,'180°'],[3,'270°']]}]);
 }
 function variant(k,value){var out={},groups=(profile(k)||{}).upgrades||[];value=value||{};
  if(Object.keys(value).some(function(key){return !groups.some(function(g){return g.field===key;});}))return null;
  for(var g of groups){var n=value[g.field]==null?0:value[g.field];if(!Number.isSafeInteger(n)||n<0||n>=g.options.length)return null;out[g.field]=n;}return out;
 }
 function begin(k,blueprintId){
  if(!supports(k))return null;var size={};(profile(k).dimensions||[]).forEach(function(f){size[f.key]=f.choices?f.choices[0][0]:f.min;});
  size=MULTIBLOCKS.placementSize({k:k},size);if(!size)return null;
  return {k:k,blueprintId:blueprintId,rotation:0,size:size,variant:variant(k),anchor:null,phase:'following'};
 }
 // The cursor anchors the representative block; the entity keeps its existing top-left coordinates.
 function candidate(plan,anchor){
  anchor=anchor||plan.anchor;if(!anchor||!Number.isSafeInteger(anchor.x)||!Number.isSafeInteger(anchor.y))return null;
  var m={k:plan.k,rotation:plan.rotation||0,x:0,y:0,structureSize:Object.assign({},plan.size),buildPlan:Object.assign({},plan.variant),structure:{variant:Object.assign({},plan.variant)}};
  var shape=MULTIBLOCKS.bounds(m);m.x=anchor.x-shape.cx;m.y=anchor.y-shape.cy;return m;
 }
 function check(S,plan,anchor){var m=candidate(plan,anchor);if(!m)return{ok:false,code:'LOCATION'};if(BLUEPRINTS.active(S).id!==plan.blueprintId)return{ok:false,code:'BLUEPRINT'};return GRID_SPACE.check(S,m,{blueprintId:plan.blueprintId});}
 function freeze(S,plan,anchor){if(!plan||plan.phase!=='following')return{ok:false,code:'PLANNING'};var r=check(S,plan,anchor);if(!r.ok)return r;plan.anchor={x:anchor.x,y:anchor.y};plan.phase='fixed';return r;}
 function change(plan,key,value){
  if(!plan||!['following','fixed'].includes(plan.phase))return{ok:false,code:'PLANNING'};
  var field=fields(plan.k).find(function(f){return f.key===key;});if(!field||!field.choices.some(function(c){return c[0]===value;}))return{ok:false,code:'PROFILE'};
  if(field.kind==='rotation'){plan.rotation=value;return{ok:true};}
  var next=Object.assign({},plan.size);next[key]=value;
  next=MULTIBLOCKS.placementSize({k:plan.k},next);if(!next)return{ok:false,code:'SIZE'};plan.size=next;return{ok:true};
 }
 function reposition(plan){if(!plan||plan.phase!=='fixed')return false;plan.phase='following';plan.anchor=null;return true;}
 function materials(plan){var m=candidate(plan,plan.anchor||{x:0,y:0}),p=STRUCTURES.plan(m,{emptyPorts:true});return p&&p.parts||[];}
 // Only this final transaction creates a real entity and withdraws one real inventory item.
 function commit(S,plan,source){
  if(!plan||plan.phase!=='fixed')return{ok:false,code:'PLANNING'};var r=check(S,plan);if(!r.ok)return r;
  var m=candidate(plan),result=ENTITIES.deploy(S,plan.k,{kind:'grid',x:m.x,y:m.y,blueprintId:plan.blueprintId},true,Object.assign({},source,{structureSize:plan.size,buildPlan:plan.variant,rotation:plan.rotation||0}));
  if(result.ok)plan.phase='committed';return result;
 }
 root.STRUCTURE_PLACEMENT={supports:supports,fields:fields,variant:variant,begin:begin,candidate:candidate,check:check,freeze:freeze,change:change,reposition:reposition,materials:materials,commit:commit};
})(typeof window!=='undefined'?window:globalThis);
