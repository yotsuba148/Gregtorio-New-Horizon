(function(root){
 'use strict';
 var C=CONTENT,types=Object.create(null),byType=Object.create(null);
 var sharedSlots=new Map(),slotRules=new WeakMap();
 (GD.tools.types||[]).forEach(function(t){byType[t.id]=t;(t.keys||[]).forEach(function(k){types[C.baseKey(k)]=t.id;});});
 function register(id,keys,name){
  var t=byType[id]||(GD.tools.types||[]).find(function(t){return t.id===id;});
  if(!t){t={id:id,name:name||id,cn:name||id,keys:[]};GD.tools.types.push(t);}
  byType[id]=t;
  keys.forEach(function(k){k=C.baseKey(k);if(!t.keys.includes(k))t.keys.push(k);types[k]=id;});
  slotRules=new WeakMap();
  return t;
 }
 register('sword',['wooden','stone','iron','golden','diamond'].map(function(material){return'minecraft:'+material+'_sword@0';}),'剑');
 [['wooden','木'],['stone','石'],['iron','铁'],['golden','金'],['diamond','钻石']].forEach(function(pair){GD.tools.fixed['minecraft:'+pair[0]+'_sword@0']=pair[1];});
 function rule(k){return GD.toolRules[C.baseKey(k)]||{};}
 function type(k){return types[C.baseKey(k)]||null;}
 function describe(alts){
  var ids=Array.from(new Set(alts.filter(function(k){return rule(k).containerTool&&type(k);}).map(type)));
  if(!ids.length)return null;
  return {types:ids,name:ids.map(function(id){return byType[id].cn;}).join(' / '),key:alts.find(function(k){return rule(k).containerTool&&type(k);})};
 }
 function compiled(alts){
  var saved=slotRules.get(alts);
  if(saved)return saved;
  saved={group:describe(alts)};
  if(Object.isFrozen(alts))slotRules.set(alts,saved);
  return saved;
 }
 function spec(alts){return compiled(alts).group;}
 function matchesIngredient(alts,key){
  if(alts.length<32||!Object.isFrozen(alts))return alts.some(function(k){return C.matches(k,key);});
  var lookup=compiled(alts);
  if(!lookup.ingredientMatch)lookup.ingredientMatch=C.ingredientMatcher(alts);
  return lookup.ingredientMatch(key);
 }
 function usable(s){
  if(!s||s.entityUid||!(s.n==null||s.n>0))return false;
  if(rule(s.k).unbreakable)return true;
  if(root.TINKER_TOOLS&&TINKER_TOOLS.isTool(s.k)){var info=TINKER_TOOLS.info(s);if(!info||info.broken)return false;}
  return s.dur==null||s.dur>0;
 }
 function accepts(alts,s){
  if(!usable(s))return false;
  var lookup=compiled(alts),group=lookup.group;
  if(group&&rule(s.k).containerTool&&group.types.indexOf(type(s.k))>=0)return true;
  if(alts.length<32||!Object.isFrozen(alts))return alts.some(function(k){return C.matches(k,s.k,{ignoreNBT:!!rule(k).containerTool});});
  if(!lookup.toolMatch)lookup.toolMatch=C.ingredientMatcher(alts,function(k){return !!rule(k).containerTool;});
  return lookup.toolMatch(s.k);
 }
 function ordered(storages,tools){
  var entries=[];
  function add(s,p,rank,order){if(s)entries.push({stack:s,position:p,rank:rank,order:order});}
  Object.keys(tools||{}).forEach(function(id,i){add(tools[id],{tool:id},0,i);});
  (storages[0]||[]).forEach(function(s,i){add(s,{box:0,slot:i},1,i);});
  storages.slice(1).forEach(function(a,b){a.forEach(function(s,i){add(s,{box:b+1,slot:i},2+b,i);});});
  return entries.sort(function(a,b){var at=!!(rule(a.stack.k).containerTool&&type(a.stack.k)),bt=!!(rule(b.stack.k).containerTool&&type(b.stack.k));return a.rank-b.rank||Number(bt)-Number(at)||(at&&bt?((a.stack.dur==null?Infinity:a.stack.dur)-(b.stack.dur==null?Infinity:b.stack.dur)||0):0)||a.order-b.order;});
 }
 function select(alts,storages,tools){return ordered(storages,tools).find(function(e){return accepts(alts,e.stack);})||null;}
 function normalize(r){
  r.slots=r.slots.map(function(a){
   var list=a.filter(function(k){return !root.CONTENT_SCOPE||CONTENT_SCOPE.allowed(k);}),group=spec(list);
   if(group)group.types.forEach(function(id){byType[id].keys.forEach(function(k){if(rule(k).containerTool&&(!root.CONTENT_SCOPE||CONTENT_SCOPE.allowed(k))&&list.indexOf(k)<0)list.push(k);});});
   var key=JSON.stringify(list),existing=sharedSlots.get(key);
   if(existing)return existing;
   Object.freeze(list);
   sharedSlots.set(key,list);
   return list;
  });
  return r;
 }
 function signature(r,specOf){
  specOf=specOf||spec;
  if(!r.slots.some(specOf))return null;
  return JSON.stringify([r.out,r.n,r.station,r.width,r.height,r.shapeless,r.grid,r.flags,r.slots.map(function(a){var group=specOf(a);return group?'tool:'+group.types.slice().sort().join(','):a.slice().sort();})]);
 }
 var seen=new Set();
 GD.craft=GD.craft.map(normalize).filter(function(r){var id=signature(r);if(!id)return true;if(seen.has(id))return false;seen.add(id);return true;});
 root.CRAFT_TOOLS={type:type,rule:rule,spec:spec,usable:usable,accepts:accepts,matchesIngredient:matchesIngredient,ordered:ordered,select:select,normalize:normalize,signature:signature,register:register};
})(typeof window!=='undefined'?window:globalThis);
