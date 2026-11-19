(function(root){
 'use strict';
 var research={},processes={},costPolicies={},initializers=[],stations={nasa:{id:'nasa',name:'NASA工作台',k:'GalacticraftCore:tile.rocketWorkbench@0',width:5,height:7,maxSlots:32}};
 function ensure(S){if(!S.mechanisms)S.mechanisms={resources:{},knowledge:{},deployments:{}};var m=S.mechanisms;
  ['resources','knowledge','deployments'].forEach(function(k){if(!m[k])m[k]={};});initializers.forEach(function(f){f(S,m);});return m;}
 function resourcePlan(pools,costs){var next=GTTransactions.clone(pools||{});
  for(var id in costs){var n=costs[id];if(!Number.isSafeInteger(n)||n<0)return null;var pool=next[id];if(!pool||pool.amount<n)return null;pool.amount-=n;}return next;}
 function addResource(pools,id,n,capacity,unit){if(!Number.isSafeInteger(n)||n<0)throw Error('Resource quantity must be a nonnegative integer');var p=pools[id]||(pools[id]={amount:0,capacity:capacity,unit:unit||id});
  var put=Math.min(n,Math.max(0,p.capacity-p.amount));p.amount+=put;return n-put;}
 function meets(S,condition){var m=ensure(S),c=condition||{};
  if((c.all||[]).some(function(id){return !m.knowledge[id];}))return false;
  if(c.any&&c.any.length&&!c.any.some(function(id){return m.knowledge[id];}))return false;
  return true;}
 function registerResearch(d){if(!d.id)throw Error('Research needs id');if(research[d.id])throw Error('Duplicate research '+d.id);research[d.id]=d;}
 function unlock(S,id){var d=research[id],m=ensure(S);if(!d)return{ok:false,code:'DEFINITION'};if(m.knowledge[id])return{ok:false,code:'ALREADY_KNOWN'};
  if(d.check){var gate=d.check(S);if(!gate.ok)return gate;}
  if(!meets(S,d.prerequisites))return{ok:false,code:'PREREQUISITE'};var next=resourcePlan(m.resources,d.costs||{});if(!next)return{ok:false,code:'RESOURCE'};
  var items=d.itemsFor?d.itemsFor(S):d.items||[];
  var itemPlan=COMMANDS.exchange(S,items,d.rewards||[]);if(!itemPlan.ok)return itemPlan;m.resources=next;m.knowledge[id]={unlocked:true};if(d.onUnlock)d.onUnlock(S);return Object.assign({ok:true},itemPlan);}
 function checkCosts(m,r,phase){var costs=(r.costs||{})[phase]||{};if(r.costPolicy){var policy=costPolicies[r.costPolicy];if(!policy)return null;costs=policy(m,r,phase,costs);if(!costs)return null;}return resourcePlan(m.resourceBuffers||{},costs);}
 function registerProcess(d){if(!d.id||!d.map||!d.behavior)throw Error('Process definition needs id, map and behavior');if(d.tick)ENGINE.registerBehavior(d.behavior,d);processes[d.id]=d;}
 function deployStation(S,id){if(id==='cauldron'&&root.RIVER_WASH)return RIVER_WASH.add(S);var d=stations[id],m=ensure(S);if(!d)return{ok:false,code:'DEFINITION'};if(d.featureUnlock&&root.FEATURE_UNLOCKS&&!FEATURE_UNLOCKS.isOpen(S,d.featureUnlock))return{ok:false,code:'LOCKED'};if(m.deployments[id])return{ok:false,code:'ALREADY_DEPLOYED'};var r=COMMANDS.exchange(S,[{k:d.k,n:1}],[]);if(r.ok)m.deployments[id]={k:d.k,n:1};return r;}
 function stationFor(S,id){var d=stations[id];return d&&ensure(S).deployments[id]?d:null;}
 root.MECHANISMS={ensure:ensure,resourcePlan:resourcePlan,addResource:addResource,meets:meets,research:research,registerResearch:registerResearch,unlock:unlock,stations:stations,deployStation:deployStation,stationFor:stationFor,registerStation:function(d){stations[d.id]=d;},
  registerProcess:registerProcess,processes:processes,checkCosts:checkCosts,registerCostPolicy:function(id,f){if(costPolicies[id])throw Error('Duplicate cost policy '+id);costPolicies[id]=f;},registerStateInitializer:function(f){initializers.push(f);}};
})(typeof window!=='undefined'?window:globalThis);

STATE_SCHEMA.register("mechanisms",["mechanisms"]);

ITEM_STORES.registerState('world-deployments',function(S){var deployments=S.mechanisms&&S.mechanisms.deployments;return deployments?[ITEM_STORES.view('world:deployments',deployments,Object.values(deployments))]:[];});
