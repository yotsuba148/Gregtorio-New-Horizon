/* Named process resources share entity storage, atomic attachments and explicit local links. */
(function(root){
 'use strict';
 var M=MECHANISMS,instancePolicies={};
 function ensure(m,d){if(!m.resourceBuffers)m.resourceBuffers={};Object.keys(d.resourceCapacities||{}).forEach(function(id){
  var cap=d.resourceCapacities[id],p=m.resourceBuffers[id];if(!p)p=m.resourceBuffers[id]={amount:0,capacity:cap,unit:id};else p.capacity=Math.max(cap,p.amount||0);
 });Object.keys(m.installedItems||{}).forEach(function(slot){var item=m.installedItems[slot];if(!item)return;if(!m.resourceBindings)m.resourceBindings={};Object.keys(item.resourceBuffers||{}).forEach(function(id){m.resourceBindings[id]=slot;m.resourceBuffers[id]=item.resourceBuffers[id];});});return m.resourceBuffers;}
 function syncInstalled(m){Object.keys(m.resourceBindings||{}).forEach(function(id){var item=m.installedItems&&m.installedItems[m.resourceBindings[id]],p=m.resourceBuffers&&m.resourceBuffers[id];if(item&&p){if(!item.resourceBuffers)item.resourceBuffers={};item.resourceBuffers[id]=p;}});}
 function commitResources(m,pools){m.resourceBuffers=pools;syncInstalled(m);return pools;}
 function definition(m){return STRUCTURES.instance(m);}
 function canLink(S,from,to,id){
  var d=definition(from),spec=d&&(d.resourceOutputs||{})[id],target=to&&definition(to);
  if(!spec||!target||!ensure(to,target)[id]||from===to)return false;
  if(!ENTITIES.isGrid(from)||!ENTITIES.isGrid(to)||from.location.blueprintId!==to.location.blueprintId)return false;
  if(spec.roles&&!spec.roles.includes(target.resourceRole))return false;
  return Math.pow(from.x-to.x,2)+Math.pow(from.y-to.y,2)<=Math.pow(spec.range,2);
 }
 function link(S,uid,id,targetUid){var from=ENTITIES.get(S,uid);if(!from)return{ok:false,code:'ENTITY'};
  var d=definition(from);if(!d||!(d.resourceOutputs||{})[id])return{ok:false,code:'RESOURCE'};
  if(targetUid&&!canLink(S,from,ENTITIES.get(S,targetUid),id))return{ok:false,code:'LINK'};
  if(targetUid&&d.resourceLinkTool&&!COMMANDS.owned(S,function(k){return CONTENT.item(k).id===d.resourceLinkTool||CONTENT.matches(d.resourceLinkTool,k,{ignoreNBT:true});}).length)return{ok:false,code:'TOOL'};
  if(!from.resourceLinks)from.resourceLinks={};if(targetUid)from.resourceLinks[id]=targetUid;else delete from.resourceLinks[id];return{ok:true};
 }
 function step(S,tick){var machines=S.fx&&S.fx.machines||[],snap={},moved=0;
  machines.forEach(function(m){var d=definition(m);if(!d)return;ensure(m,d);snap[m.uid]=Object.fromEntries(Object.entries(m.resourceBuffers).map(function(p){return[p[0],p[1].amount||0];}));});
  machines.forEach(function(from){if(!ENTITIES.active(from)||from.enabled===false)return;var d=definition(from);if(!d)return;Object.keys(from.resourceLinks||{}).forEach(function(id){
   var to=ENTITIES.get(S,from.resourceLinks[id]),spec=(d.resourceOutputs||{})[id];if(!spec||tick%(spec.period||1)!==0||!to||!canLink(S,from,to,id))return;
   var a=from.resourceBuffers[id],b=to.resourceBuffers[id],available=Math.min(a.amount,snap[from.uid][id]||0);if(available<(spec.quantum||1))return;
   var n=Math.min(available,spec.maxAmount||spec.quantum||available,b.capacity-b.amount);if(n<=0)return;a.amount-=n;b.amount+=n;snap[from.uid][id]-=n;moved+=n;
  });});return moved;
 }
 function attach(S,m,slot,k){var d=definition(m),choices=(d.componentSlots||{})[slot];if(!choices)return{ok:false,code:'SLOT'};if(m.job)return{ok:false,code:'RUNNING'};
  if(k&&!choices.some(function(x){return CONTENT.matches(x,k);}))return{ok:false,code:'COMPONENT'};k=k&&CONTENT.canonicalKey(k);var old=m.attachments&&m.attachments[slot];if(old===k)return{ok:true,consumed:[],produced:[]};
  var r=COMMANDS.exchange(S,k?[{k:k,n:1}]:[],old?[{k:old,n:1}]:[],{drops:true});if(!r.ok)return r;if(!m.attachments)m.attachments={};if(k)m.attachments[slot]=k;else delete m.attachments[slot];return r;
 }
 function instanceAllowed(spec,s){if(!s||s.entityUid||s.n!=null&&(!Number.isSafeInteger(s.n)||s.n<=0))return false;var item=CONTENT.item(s.k);return !!item&&(spec.ids||[]).includes(item.id);}
 function prepareInstance(m,slot,s){var spec=(definition(m).instanceSlots||{})[slot];if(!spec)return{ok:false,code:'SLOT'};if(m.job)return{ok:false,code:'RUNNING'};if(!instanceAllowed(spec,s))return{ok:false,code:'ITEM'};var policy=instancePolicies[spec.policy];if(!policy)return{ok:false,code:'POLICY'};var next=GTTransactions.clone(s);next.n=1;return policy.prepare(next,m,spec)||{ok:false,code:'PROPERTY'};}
 function writeInstance(m,slot,next){if(!m.installedItems)m.installedItems={};Object.keys(m.resourceBindings||{}).forEach(function(id){if(m.resourceBindings[id]===slot){delete m.resourceBindings[id];delete m.resourceBuffers[id];}});if(next)m.installedItems[slot]=next;else delete m.installedItems[slot];ensure(m,definition(m));}
 function instanceChoices(S,m,slot){var spec=(definition(m).instanceSlots||{})[slot];if(!spec)return[];var out=[];ENTITIES.storage(S).forEach(function(a,b){a.forEach(function(s,i){if(instanceAllowed(spec,s))out.push({box:b,index:i,item:s});});});return out;}
 function installInstance(S,m,slot,source){
  var d=definition(m),spec=(d.instanceSlots||{})[slot];if(!spec)return{ok:false,code:'SLOT'};if(m.job)return{ok:false,code:'RUNNING'};
  var original=ENTITIES.storage(S),boxes=original.map(GTTransactions.clone),old=m.installedItems&&m.installedItems[slot],next=null,fromBag=0,fromWarehouse=0;
  if(source){var arr=boxes[source.box],s=arr&&arr[source.index];if(!instanceAllowed(spec,s))return{ok:false,code:'ITEM'};
   next=GTTransactions.clone(s);next.n=1;var policy=instancePolicies[spec.policy];if(!policy)return{ok:false,code:'POLICY'};var prepared=policy.prepare(next,m,spec);if(!prepared||!prepared.ok)return prepared||{ok:false,code:'PROPERTY'};next=prepared.item;
   var count=s.n==null?1:s.n;if(count<=1)arr[source.index]=null;else arr[source.index].n--;if(source.box)fromWarehouse=1;else fromBag=1;
  }
  var toBag=0,toWarehouse=0;if(old){var temp=[GTTransactions.clone(old)];for(var b=0;b<boxes.length&&temp[0];b++){var result=CORE.transferSlot({from:CORE.slotBox(temp),index:0,to:CORE.slotBox(boxes[b]),n:1});if(b)toWarehouse+=result.moved;else toBag+=result.moved;}if(temp[0])return{ok:false,code:'OUTPUT'};}
  original.forEach(function(a,i){a.splice.apply(a,[0,a.length].concat(boxes[i]));});if(!m.installedItems)m.installedItems={};
  Object.keys(m.resourceBindings||{}).forEach(function(id){if(m.resourceBindings[id]===slot){delete m.resourceBindings[id];delete m.resourceBuffers[id];}});
  if(next)m.installedItems[slot]=next;else delete m.installedItems[slot];ensure(m,d);
  return{ok:true,moved:next?1:0,fromBag:fromBag,fromWarehouse:fromWarehouse,toBag:toBag,toWarehouse:toWarehouse,returned:old?1:0};
 }
 Object.assign(M,{ensureEntityResources:ensure,canLinkResource:canLink,linkResource:link,stepResources:step,attachComponent:attach,commitResources:commitResources,syncInstalled:syncInstalled,
  instanceChoices:instanceChoices,installInstance:installInstance,prepareInstance:prepareInstance,writeInstance:writeInstance,registerInstancePolicy:function(id,policy){if(instancePolicies[id])throw Error('Duplicate instance policy '+id);instancePolicies[id]=policy;}});
})(typeof window!=='undefined'?window:globalThis);

ITEM_STORES.registerEntity('installed-instances',function(S,m){
 if(!m.installedItems)return;
 var items=Object.keys(m.installedItems).map(function(slot){var s=GTTransactions.clone(m.installedItems[slot]);if(s)Object.keys(m.resourceBindings||{}).forEach(function(id){if(m.resourceBindings[id]===slot&&m.resourceBuffers[id]){if(!s.resourceBuffers)s.resourceBuffers={};s.resourceBuffers[id]=GTTransactions.clone(m.resourceBuffers[id]);}});return s;});
 return {views:[ITEM_STORES.view(m.uid+':instances',m.installedItems,items,{clear:function(){Object.keys(m.installedItems).forEach(function(slot){MECHANISMS.writeInstance(m,slot,null);});}})]};
});
