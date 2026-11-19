(function(root){
 'use strict';
 var cache=new WeakMap(),R=AE_RESOURCES,read=AE_READ_INDEX;

 function configured(state){
  return Array.isArray(state.itemTypes)?state.itemTypes.filter(function(id){
   return typeof id==='string'&&Object.hasOwn(TYPE_FILTERS.prefixName,id);
  }):[];
 }
 function toggle(state,id){
  if(!Object.hasOwn(TYPE_FILTERS.prefixName,id))return false;
  var selected=new Set(configured(state));
  if(!selected.delete(id))selected.add(id);
  state.itemTypes=Array.from(selected).sort();
  return true;
 }
 function categories(resource){return resource.kind==='item'?TYPE_FILTERS.prefixesOf(resource.key):null;}
 function candidates(context,node){
  var types=Array.from(new Set(configured(node.state))).sort();
  if(!types.length)return [];
  var generation=read.generation(context),session=cache.get(context);
  if(!session||session.epoch!==context.readEpoch||session.generation!==generation){
   session={epoch:context.readEpoch,generation:generation,results:new Map()};
   cache.set(context,session);
  }
  var key=JSON.stringify([context.graph.component(node.id),types]),result=session.results.get(key);
  if(result)return result;
  var resources=new Map();
  context.network.readableStores(node.id).forEach(function(adapter){
   read.groupedResources(context,adapter,categories,types).forEach(function(resource){
    resources.set(R.identity(resource),resource);
   });
  });
  result=Array.from(resources.values());
  session.results.set(key,result);
  return result;
 }
 root.AE_ITEM_TYPE_STOCK={configured:configured,toggle:toggle,candidates:candidates};
})(typeof window!=='undefined'?window:globalThis);
