(function(root){
 'use strict';
 var keys={nasa:'GalacticraftCore:tile.rocketWorkbench@0',port:'GalacticraftCore:tile.fuelLoader@0'};
 var nasaRecipes=GD.craft.filter(function(r){return r.station==='nasa';});
 var schematicByTier=new Map(SPACEFLIGHT_CONTENT.schematics.map(function(s){return[s.tier,s];}));
 var dungeonByUnlock=new Map(SPACE_DESTINATIONS.list().flatMap(function(p){return (p.actions||[]).filter(function(a){return a.unlock;}).map(function(a){return[a.unlock,a];});}));
 MECHANISMS.registerStation(Object.assign({},MECHANISMS.stations.nasa,{maxSlots:Math.max.apply(null,nasaRecipes.map(function(r){return r.flags?.stationSlots||r.slots.length;}))}));
 function ownedSchematic(S,schematic){
  var owned=COMMANDS.owned(S,function(k){return k===schematic.item||k===schematic.alternative;});
  return owned.find(function(item){return item.k===schematic.item;})||owned[0];
 }
 SPACEFLIGHT_CONTENT.schematics.forEach(function(schematic){
  MECHANISMS.registerResearch({id:schematic.knowledge,itemsFor:function(S){
   return [{k:ownedSchematic(S,schematic)?.k||schematic.item,n:1}];
  }});
 });
 function nasaStatus(S,recipe){
  var schematic=schematicByTier.get(recipe.rocketTier),known=!recipe.research||!!MECHANISMS.ensure(S).knowledge[recipe.research];
  if(known||!schematic)return{known:known};
  var source=dungeonByUnlock.get(schematic.knowledge);
  return {known:false,schematic:schematic,source:source,available:!!ownedSchematic(S,schematic)};
 }
 function ensure(S){var s=SPACEFLIGHT.ensure(S);if(!s.facilityView)s.facilityView='port';return s;}
 function generator(S,m){return m&&(S.fx.machines||[]).find(function(g){return ENTITIES.active(g)&&g.location&&g.location.kind==='attached'&&g.location.parentUid===m.uid&&g.location.slot==='space_generator';})||null;}
 function accepts(kind,item){var key=CONTENT.canonicalKey(item.k);if(kind!=='generator')return key===keys[kind]&&!item.entityUid;var d=DEFS.of(key);return WORLD_SITES.accepts('generator',key)&&LOCAL_ENERGY.compatible(d,DEFS.of(keys.port));}
 function prepare(S,kind,item,uid){
  if(!SPACEFLIGHT.unlocked(S))return{ok:false,code:'LOCKED',text:'完成「NASA工作台」任务后解锁'};
  if(!accepts(kind,item))return{ok:false,code:'ITEM'};
  var m=uid?ENTITIES.get(S,uid):SPACEFLIGHT.selected(S);
  if(kind==='nasa'&&MECHANISMS.stationFor(S,'nasa')||kind==='port'&&m||kind==='generator'&&generator(S,m))return{ok:false,code:'OCCUPIED'};
  if(kind==='generator'&&!m)return{ok:false,code:'PORT'};
  if(item.entityUid){var g=ENTITIES.get(S,item.entityUid);if(!g||g.k!==item.k||g.location.kind!=='packed')return{ok:false,code:'ENTITY_REFERENCE'};}
  return{ok:true,item:Object.assign({},item,{n:1})};
 }
 function install(S,kind,item,uid){
  if(kind==='nasa'){MECHANISMS.ensure(S).deployments.nasa={k:keys.nasa,n:1};return;}
  var m=uid?ENTITIES.get(S,uid):SPACEFLIGHT.selected(S);
  var location=kind==='port'?{kind:'world',area:'space',dim:'overworld'}:{kind:'attached',parentUid:m.uid,slot:'space_generator'};
  var result=ENTITIES.activate(S,item,location);if(!result.ok)throw Error('Space equipment installation failed: '+result.code);
  if(kind==='port')ensure(S).selected=result.machine.uid;
 }
 function endpoint(S,r){
  if(!['port','nasa','generator'].includes(r.kind))return null;
  return{id:JSON.stringify(r),ref:r,get:function(){return null;},set:function(item){if(item)install(S,r.kind,item,r.uid);},cap:function(){return 1;},accepts:function(item){return accepts(r.kind,item);},prepare:function(item){return prepare(S,r.kind,item,r.uid);},locked:function(){return r.kind==='nasa'?!!MECHANISMS.stationFor(S,'nasa'):r.kind==='port'?!!SPACEFLIGHT.selected(S):!!generator(S,ENTITIES.get(S,r.uid));},lockCode:'OCCUPIED',canRestore:function(){return false;}};
 }
 function deploy(S,kind,uid){
  var stores=ENTITIES.storage(S);
  for(var b=0;b<stores.length;b++)for(var i=0;i<stores[b].length;i++){var item=stores[b][i];if(item&&accepts(kind,item)){var ready=prepare(S,kind,item,uid);if(!ready.ok)return ready;return ITEM_TRANSFER.move(S,b?{type:'chest',box:b-1,index:i}:{type:'bag',index:i},{type:'spaceFacility',kind:kind,uid:uid},{n:1});}}
  return{ok:false,code:'MISSING',text:kind==='generator'?'需要一台LV发电机':kind==='nasa'?'需要NASA工作台':'需要燃料注入器'};
 }
 function remove(S,uid){var m=ENTITIES.get(S,uid);if(!m)return{ok:false,code:'NO_MACHINE'};var parent=m.location&&m.location.parentUid;var result=ENTITIES.pack(S,uid,parent?{fromParent:true}:undefined);if(result.ok&&ensure(S).selected===uid)delete ensure(S).selected;return result;}
 function migrate(S){
  SPACE_VEHICLE.migrate(S);
  (S.fx&&S.fx.machines||[]).forEach(function(m){if(m.k!==keys.port||!ENTITIES.isGrid(m))return;ENTITIES.detach(S,m);m.location={kind:'world',area:'space',dim:'overworld'};m.x=null;m.y=null;});
 }
 function tick(S,t){
  var changed=false;
  SPACEFLIGHT.ports(S).forEach(function(m){if(!m.location||m.location.area!=='space')return;var g=generator(S,m);if(!g)return;if(ENGINE.generators.tick(g,t))changed=true;if(LOCAL_ENERGY.transfer(g,m))changed=true;});
  return changed;
 }
 root.SPACE_FACILITIES={keys:keys,nasaRecipes:nasaRecipes,nasaStatus:nasaStatus,ensure:ensure,generator:generator,accepts:accepts,prepare:prepare,endpoint:endpoint,deploy:deploy,remove:remove,migrate:migrate,tick:tick};
 ITEM_TRANSFER.register('spaceFacility',endpoint);
})(typeof window!=='undefined'?window:globalThis);
