/* Small world installations use owned GT entities and the existing EU/fluid rules. */
(function(root){
 'use strict';
 function field(S,id){return PUMPS.field(S,id);}
 function equipment(S,f,kind){var m=f&&f.equipment&&ENTITIES.get(S,f.equipment[kind]);return m&&ENTITIES.active(m)&&m.location&&m.location.kind==='world-site'&&m.location.siteId===f.id?m:null;}
 function accepts(kind,k){var d=DEFS.of(k);return !!d&&(kind==='pump'?d.behavior==='world_fluid_pump':kind==='generator'?d.generator&&(!!d.fuelMap||d.fuelFamily==='steam')&&!d.requiresStructure:kind==='tank'&&d.behavior==='fluid_storage'&&!d.requiresStructure);}
 function owned(S,kind){var byKey={};ENTITIES.storage(S).forEach(function(arr){arr.forEach(function(item){if(item&&accepts(kind,item.k)){var a=byKey[item.k]||(byKey[item.k]={k:item.k,n:0});a.n+=item.n==null?1:item.n;}});});return Object.values(byKey);}
 function canInstall(S,id,kind,item){var f=field(S,id),k=item&&CONTENT.canonicalKey(item.k);if(!f||!accepts(kind,k))return{ok:false,code:'MACHINE'};if(equipment(S,f,kind))return{ok:false,code:'OCCUPIED'};
  if(root.TRAVEL&&!TRAVEL.can(S,f.dim))return{ok:false,code:'DIMENSION'};
  if(kind==='pump'&&!(f.remaining>0))return{ok:false,code:'DEPLETED'};
  var d=DEFS.of(k),pump=kind==='pump'?d:equipment(S,f,'pump'),gen=kind==='generator'?d:equipment(S,f,'generator');if(pump&&pump.k)pump=DEFS.of(pump.k);if(gen&&gen.k)gen=DEFS.of(gen.k);
  if(pump&&gen&&gen.volt>pump.volt)return{ok:false,code:'OVERVOLTAGE'};
  if(item.entityUid){var m=ENTITIES.get(S,item.entityUid);if(!m||m.k!==k||!m.location||m.location.kind!=='packed')return{ok:false,code:'ENTITY_REFERENCE'};}
  return{ok:true,item:Object.assign({},item,{k:k,n:1})};
 }
 function updateReady(S,f){var p=equipment(S,f,'pump');if(p)p.siteReady=!!(equipment(S,f,'generator')&&equipment(S,f,'tank'));}
 function installItem(S,id,kind,item){var valid=canInstall(S,id,kind,item);if(!valid.ok)return valid;var f=field(S,id),r=ENTITIES.activate(S,valid.item,{kind:'world-site',siteId:id,dim:f.dim});if(!r.ok)return r;if(!f.equipment)f.equipment={};f.equipment[kind]=r.machine.uid;if(kind==='pump')r.machine.pumpFieldId=id;updateReady(S,f);return r;}
 function endpoint(S,ref){if(!field(S,ref.siteId)||!['pump','generator','tank'].includes(ref.kind))return null;return{id:JSON.stringify(ref),ref:ref,get:function(){return null;},set:function(item){if(item){var r=installItem(S,ref.siteId,ref.kind,item);if(!r.ok)throw Error('Invalid site installation: '+r.code);}},cap:function(){return 1;},accepts:function(item){return accepts(ref.kind,item.k);},prepare:function(item){return canInstall(S,ref.siteId,ref.kind,item);},locked:function(){return!!equipment(S,field(S,ref.siteId),ref.kind);},lockCode:'OCCUPIED',canRestore:function(){return false;}};}
 function install(S,id,kind,k){var valid=canInstall(S,id,kind,{k:k,n:1});if(!valid.ok)return valid;var stores=ENTITIES.storage(S);for(var a of stores)for(var i=0;i<a.length;i++)if(a[i]&&CONTENT.canonicalKey(a[i].k)===CONTENT.canonicalKey(k)){var r=installItem(S,id,kind,a[i]);if(!r.ok)return r;var n=a[i].n==null?1:a[i].n;a[i]=n>1?Object.assign({},a[i],{n:n-1}):null;return r;}return{ok:false,code:'NO_MACHINE'};}
 function remove(S,id,kind){var f=field(S,id),m=f&&equipment(S,f,kind);if(!m)return{ok:false,code:'MACHINE'};var r=ENTITIES.pack(S,m.uid);if(r.ok){delete f.equipment[kind];updateReady(S,f);}return r;}
 function retireLiquidSites(S){
  var world=S.mechanisms?.worldLiquids;
  if(!world?.fields?.length)return;
  var retired=new Set(world.fields.filter(function(f){return f.type==='river'||f.type==='lava';}).map(function(f){return f.id;}));
  if(!retired.size)return;
  for(var m of (S.fx?.machines||[]).slice()){
   if(m.location?.kind==='world-site'&&retired.has(m.location.siteId)){
    var result=ENTITIES.pack(S,m.uid);
    if(!result.ok)throw Error('旧取水或岩浆设备无法收回 '+m.uid+' '+result.code);
   }
   if(retired.has(m.pumpFieldId)){m.pumpFieldId=null;m.pumpClock=0;}
  }
  world.fields=world.fields.filter(function(f){return !retired.has(f.id);});
 }
 function abandon(S,id){var f=field(S,id);if(!f)return{ok:false,code:'SOURCE'};if(Object.values(f.equipment||{}).some(function(uid){return !!ENTITIES.get(S,uid);})||(S.fx.machines||[]).some(function(m){return m.pumpFieldId===id;}))return{ok:false,code:'EQUIPMENT'};PUMPS.ensure(S).fields=PUMPS.ensure(S).fields.filter(function(f){return f.id!==id;});return{ok:true};}
 function tick(S,t){
  for(var f of PUMPS.ensure(S).fields){if(!f.equipment)continue;var p=equipment(S,f,'pump'),g=equipment(S,f,'generator'),tank=equipment(S,f,'tank');
   if(g&&g.enabled!==false)ENGINE.generators.tick(g,t);
   if(p){p.siteReady=!!(g&&tank);if(g)LOCAL_ENERGY.transfer(g,p);
    if(tank&&tank.enabled!==false){var h=TRANSPORT_PORTS.manualFluid(ENGINE.networks,S,tank,'fin',0);(p.tanksOut||[]).forEach(function(fluid,i){if(!fluid||!h)return;var plan=TRANSPORT_PORTS.fluidPlan(h.forFluid?h.forFluid(fluid.f):h,fluid.f,fluid.mb,true);if(plan.moved){plan.commit();fluid.mb-=plan.moved;if(!fluid.mb)p.tanksOut[i]=null;}});}
   }
  }
 }
 root.WORLD_SITES={abandon:abandon,owned:owned,field:field,equipment:equipment,accepts:accepts,canInstall:canInstall,installItem:installItem,endpoint:endpoint,install:install,remove:remove,retireLiquidSites:retireLiquidSites,tick:tick};
 ITEM_TRANSFER.register('worldSite',endpoint);
})(typeof window!=='undefined'?window:globalThis);
