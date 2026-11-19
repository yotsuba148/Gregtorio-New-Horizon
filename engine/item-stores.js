(function(root){
 'use strict';
 var stateProviders=new Map(),entityProviders=new Map(),childProviders=new Map();
 function register(table,id,provider){if(!id||table.has(id)||typeof provider!=='function')throw Error('Invalid item-store provider: '+id);table.set(id,provider);}
 function view(id,storage,items,options){return Object.assign({id:id,storage:storage,items:items},options);}
 function views(S,purpose,owner){
  var out=[],ids=new Set(),storages=new Set();
  function add(v){if(v[purpose]===false||ids.has(v.id)||v.storage&&storages.has(v.storage))return;ids.add(v.id);if(v.storage)storages.add(v.storage);out.push(v);v.items.forEach(function(item,index){if(item)childProviders.forEach(function(provider){var children=provider(S,item,{purpose:purpose,owner:owner,viewId:v.id,index:index});if(children)children.forEach(add);});});}
  function entity(m){
   var groups=[],replaced=false;
   entityProviders.forEach(function(provider){var group=provider(S,m);if(group){groups.push(group);replaced=replaced||!!group.replaceSlots;}});
   if(!replaced){if(m.ins)add(view(m.uid+':in',m.ins,m.ins));if(m.outs)add(view(m.uid+':out',m.outs,m.outs));}
   if(m.itemStore)add(view(m.uid+':store',m.itemStore,[m.itemStore],{clear:function(){m.itemStore=null;}}));
   if(purpose==='quest')add(view(m.uid+':controller',null,[{k:m.k,n:1}]));
   groups.forEach(function(group){group.views.forEach(add);});
  }
  if(owner)entity(owner);
  else{
   stateProviders.forEach(function(provider){provider(S).forEach(add);});
   (S.fx&&S.fx.machines||[]).forEach(function(m){if(!m.location||m.location.kind!=='removed')entity(m);});
  }
  return out;
 }
 function items(S,purpose,owner){var out=[];views(S,purpose,owner).forEach(function(v){v.items.forEach(function(item){if(item&&item.k&&(purpose!=='quest'||!item.entityUid))out.push(item);});});return out;}
 // Recovery owns a snapshot and a release operation. A custom store supplies
 // its own clear callback; this module never guesses the fields of a device.
 function recoveryPlan(describe){
  var selected=describe(),snapshot=selected.flatMap(function(v){return v.items.filter(function(s){return s&&s.k;});}).map(GTTransactions.clone);
  selected.forEach(function(v){if(v.items.some(Boolean)&&!v.clear&&!Array.isArray(v.storage))throw Error('Item store lacks a recovery release: '+v.id);});
  var released=false;
  return {items:snapshot,valid:function(){
   if(released)return false;var current=describe();
   return current.length===selected.length&&current.every(function(v,i){return v.id===selected[i].id&&v.storage===selected[i].storage;})&&JSON.stringify(current.flatMap(function(v){return v.items.filter(function(s){return s&&s.k;});}))===JSON.stringify(snapshot);
  },release:function(){if(released)throw Error('Item recovery already committed');released=true;selected.forEach(function(v){if(v.clear)v.clear();else if(Array.isArray(v.storage))v.storage.splice(0,v.storage.length);});}};
 }
 function recovery(S,owner){return recoveryPlan(function(){return views(S,'recover',owner);});}
 register(stateProviders,'player',function(S){
  var out=[];
  if(S.inv)out.push(view('player:bag',S.inv,S.inv));
  (S.chests||[]).forEach(function(c,i){out.push(view('warehouse:'+(c.itemStoreId||i),c.slots,c.slots));});
  if(S.tools)out.push(view('player:tools',S.tools,Object.values(S.tools)));
  if(S.bench>0)out.push(view('world:workbench',null,[{k:'minecraft:crafting_table@0',n:S.bench}]));
  return out;
 });
 STATE_SCHEMA.register('inventory',['inv','tools','chests']);
 root.ITEM_STORES={view:view,views:views,items:items,recovery:recovery,recoveryPlan:recoveryPlan,registerState:function(id,provider){register(stateProviders,id,provider);},registerEntity:function(id,provider){register(entityProviders,id,provider);},registerChildren:function(id,provider){register(childProviders,id,provider);}};
})(typeof window!=='undefined'?window:globalThis);
