(function(root){
 'use strict';
 var D=SPACE_DESTINATIONS,TX=GTTransactions,pad='GalacticraftCore:tile.landingPad@0';
 var tanks=new Map();SPACE.data.oxygenTanks.forEach(function(t){Object.keys(t.states).forEach(function(d){tanks.set(CONTENT.canonicalKey(t.states[d]),{remaining:t.capacity-Number(d)});});});
 function supplyIndex(item){var key=CONTENT.canonicalKey(item.k);if(tanks.has(key))return 0;return SPACEFLIGHT_CONTENT.equipment.findIndex(function(p){return(p.alternatives||[p.k]).some(function(k){return CONTENT.matches(k,key,{ignoreNBT:true});});})+1||-1;}
 function migrate(S){
  var s=D.ensure(S);if(s.vehicleSchema===1)return s.vehicle;
  var vehicle={rocket:null,platform:null,supplies:Array(SPACEFLIGHT_CONTENT.equipment.length+1).fill(null),planet:s.planet||D.home.id},refund=[],chosen=null,flight=null,arrived=null;
  var stations=(S.fx&&S.fx.machines||[]).filter(function(m){return(DEFS.of(m.k)||{}).behavior==='gc_spaceport';});
  chosen=stations.find(function(m){return m.spaceFlight&&['launch','orbit'].includes(m.spaceFlight.phase);})||stations.find(function(m){return m.uid===s.selected;})||stations[0];
  stations.forEach(function(m){
   var payload=(m.ins||[]).concat(m.outs||[],m.structure&&m.structure.installedParts||[],ENTITIES.batchContents(m)).filter(Boolean);if(!DROPPED_ITEMS.valid(payload))throw Error('Invalid legacy spacecraft inventory');
   var rocket=m.installedItems&&m.installedItems.rocket;
   if(rocket){var item=TX.clone(rocket),pool=m.resourceBuffers&&m.resourceBuffers[SPACE.fuelKey];if(pool){if(!item.resourceBuffers)item.resourceBuffers={};item.resourceBuffers[SPACE.fuelKey]=TX.clone(pool);}var prepared=SPACE.prepareRocket(item);if(!prepared.ok)throw Error('Cannot migrate spacecraft: '+prepared.code);if(m===chosen)vehicle.rocket=prepared.item;else refund.push(prepared.item);}
   (m.structure&&m.structure.installedParts||[]).forEach(function(p){if(CONTENT.canonicalKey(p.k)!==pad){refund.push(TX.clone(p));return;}var take=m===chosen?Math.min(p.n,9-(vehicle.platform?vehicle.platform.n:0)):0;if(take)vehicle.platform={k:pad,n:(vehicle.platform?vehicle.platform.n:0)+take};if(p.n>take)refund.push(Object.assign({},p,{n:p.n-take}));});
   (m.ins||[]).forEach(function(item){if(!item)return;var at=supplyIndex(item),n=item.n==null?1:item.n;if(m===chosen&&at>=0&&!vehicle.supplies[at]){vehicle.supplies[at]=Object.assign(TX.clone(item),{n:1});if(n>1)refund.push(Object.assign(TX.clone(item),{n:n-1}));}else refund.push(TX.clone(item));});
   refund=refund.concat(TX.clone((m.outs||[]).filter(Boolean)),ENTITIES.batchContents(m));
   if(m===chosen&&m.spaceFlight){var old=m.spaceFlight,p=D.flightDestination(m);if(['launch','orbit'].includes(old.phase)){flight={uid:'space-flight',phase:old.phase,position:old.position||0,destination:p.id,from:D.home.id};}else if(['landed','surface'].includes(old.phase)){vehicle.planet=p.id;arrived=p.id;}}
  });
  if(refund.length)throw Error('旧航天存档包含无法迁移的额外物品');
  stations.forEach(function(m){D.station(m);m.ins=Array(DEFS.of(m.k).slots.in).fill(null);m.outs=Array(DEFS.of(m.k).slots.out).fill(null);m.job=null;delete m.spaceFlight;delete m.recipeLock;if(m.installedItems)delete m.installedItems.rocket;if(m.resourceBuffers)delete m.resourceBuffers[SPACE.fuelKey];if(m.resourceBindings)delete m.resourceBindings[SPACE.fuelKey];if(m.structure){m.structure.installedParts=[];m.structure.formed=false;}m.status={code:'WAITING_INPUT',text:'等待装载燃料'};});
  var cursor=S.itemCursor,origin=cursor&&cursor.origin;
  if(cursor&&cursor.stack&&origin&&stations.some(function(m){return String(m.uid)===String(origin.uid);})&&(origin.type==='instance'||origin.type==='machine'&&['in','out'].includes(origin.kind))){
   var at=supplyIndex(cursor.stack);cursor.origin=SPACE.rocketInfo(cursor.stack)?{type:'spaceVehicle',slot:'rocket'}:at>=0?{type:'spaceVehicle',slot:'supplies',index:at}:null;delete cursor.sourceConfiguration;
  }
  if(arrived){D.progress(S,arrived).landed=true;s.planet=arrived;}s.vehicle=vehicle;if(flight)s.flight=flight;s.vehicleSchema=1;return vehicle;
 }
 function ensure(S){var v=migrate(S);SPACE.fuelBuffer(v.rocket);return v;}
 function busy(S){var s=D.ensure(S);return !!(s.flight||s.returnFlight);}
 function endpoint(S,r){
  var v=ensure(S),index=Number(r.index),field=r.slot;if(!['rocket','platform','supplies'].includes(field)||field==='supplies'&&(!Number.isInteger(index)||index<0||index>=v.supplies.length))return null;
  return{id:JSON.stringify(r),ref:r,arr:field==='supplies'?v.supplies:null,index:index,get:function(){return field==='supplies'?v.supplies[index]:v[field];},set:function(item){if(field==='supplies')v.supplies[index]=item;else v[field]=item;},locked:function(){return busy(S);},lockCode:'FLIGHT',cap:function(){return field==='platform'?9:1;},accepts:function(item){return !item.entityUid&&(field==='rocket'?!!SPACE.rocketInfo(item):field==='platform'?CONTENT.canonicalKey(item.k)===pad:supplyIndex(item)===index);},prepare:field==='rocket'?SPACE.prepareRocket:undefined};
 }
 function requirements(S){var v=ensure(S);return[{name:'氧气罐',k:SPACE.data.oxygenTanks[0].states['0'],ready:!!(v.supplies[0]&&tanks.get(CONTENT.canonicalKey(v.supplies[0].k))?.remaining>0)}].concat(SPACEFLIGHT_CONTENT.equipment.map(function(p,i){return{name:GD.items[p.k],k:p.k,ready:!!v.supplies[i+1]};}));}
 ITEM_STORES.registerState('space-vehicle',function(S){var v=S.mechanisms&&S.mechanisms.space&&S.mechanisms.space.vehicle;if(!v)return[];return[ITEM_STORES.view('space:rocket',null,[v.rocket]),ITEM_STORES.view('space:platform',null,[v.platform]),ITEM_STORES.view('space:supplies',v.supplies,v.supplies)];});
 root.SPACE_VEHICLE={ensure:ensure,migrate:migrate,endpoint:endpoint,busy:busy,supplyIndex:supplyIndex,requirements:requirements,pad:pad};
 ITEM_TRANSFER.register('spaceVehicle',endpoint);
})(typeof window!=='undefined'?window:globalThis);
