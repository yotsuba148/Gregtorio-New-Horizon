(function(root){
 'use strict';
 var data=SPACEFLIGHT_CONTENT,byId=new Map(),byMission=new Map(),stateBindings=new WeakSet(),stationBindings=new WeakSet();
 data.planets.forEach(function(p){
  if(!p.id||byId.has(p.id)||!Number.isInteger(p.tier)||p.tier<0)throw Error('Invalid space destination: '+p.id);
  if(p.mission){if(byMission.has(p.mission.id)||!(p.mission.fuel>0))throw Error('Invalid space mission: '+p.id);byMission.set(p.mission.id,p);}
  byId.set(p.id,p);
 });
 if(!byId.has(data.home)||!byId.get(data.initialDestination)?.mission)throw Error('Missing space home or initial destination');
 var destinations=data.planets.filter(function(p){return !!p.mission;}).slice().sort(function(a,b){return a.tier-b.tier;}),tiers=Array.from(new Set(destinations.map(function(p){return p.tier;})));
 function alias(object,key,target,field){Object.defineProperty(object,key,{configurable:true,enumerable:false,get:function(){return target[field];},set:function(value){target[field]=value;}});}
 function storedProgress(mechanism,p){
  var s=mechanism?.space,l=p.legacy||{},prior=s?.destinations?.[p.id];
  if(prior)return prior;
  var old=s?.schema!==2,knowledge=mechanism?.knowledge,trips=old&&s?.missions?.[l.mission]||0;
  return {landed:old&&!!(s?.[l.landed]||trips||knowledge?.['space:'+p.id]||knowledge?.['space:'+p.mission.id]),
   landings:old&&s?.[l.landings]||0,trips:trips,returned:false};
 }
 function initialize(S,mechanism){
  var s=mechanism.space||(mechanism.space={missions:{}});if(stateBindings.has(s))return;
  if(!s.missions)s.missions={};if(!s.destinations)s.destinations={};
  destinations.forEach(function(p){var l=p.legacy||{},v=storedProgress(mechanism,p);
   s.destinations[p.id]=v;
   if(v.returned==null)v.returned=false;
   if(l.landed)alias(s,l.landed,v,'landed');if(l.landings)alias(s,l.landings,v,'landings');if(l.mission)alias(s.missions,l.mission,v,'trips');
  });
  s.schema=2;if(!byId.get(s.destination)?.mission)s.destination=data.initialDestination;if(!tiers.includes(s.tier))s.tier=byId.get(s.destination).tier;if(!s.planet)s.planet=s.destinations[data.initialDestination].landed?data.initialDestination:data.home;stateBindings.add(s);
 }
 MECHANISMS.registerStateInitializer(initialize);
 function ensure(S){return MECHANISMS.ensure(S).space;}
 function progress(S,id){return ensure(S).destinations[id];}
 function readProgress(S,id){var p=byId.get(id);return p?.mission?storedProgress(S.mechanisms,p):null;}
 function landed(S,id){if(id===data.home)return true;var v=readProgress(S,id);return !!(v&&(v.landed||v.trips));}
 function fromRecipe(r){return r&&(byId.get(r.spaceDestination)||byMission.get(r.spaceMission));}
 function station(m){
  if(stationBindings.has(m))return;if(!m.spaceTrips)m.spaceTrips={};
  destinations.forEach(function(p){var key=p.legacy&&p.legacy.stationTrips;if(key){if(m.spaceTrips[p.id]==null)m.spaceTrips[p.id]=m[key]||0;alias(m,key,m.spaceTrips,p.id);}});stationBindings.add(m);
 }
 function flightDestination(m){var p=m.spaceFlight&&byId.get(m.spaceFlight.destination)||fromRecipe(m.job&&m.job.recipe);return p||byId.get(data.initialDestination);}
 function complete(S,m,r){var p=fromRecipe(r);if(!p)throw Error('Missing expedition destination');var v=progress(S,p.id);v.trips++;v.landed=true;station(m);m.spaceTrips[p.id]=(m.spaceTrips[p.id]||0)+1;MECHANISMS.ensure(S).knowledge['space:'+p.mission.id]={unlocked:true};}
 function trips(m,id){station(m);return m.spaceTrips[id]||0;}
 root.SPACE_DESTINATIONS={get:function(id){return byId.get(id);},list:function(){return destinations;},tiers:function(){return tiers;},ensure:ensure,progress:progress,readProgress:readProgress,landed:landed,fromRecipe:fromRecipe,station:station,flightDestination:flightDestination,complete:complete,trips:trips,home:byId.get(data.home),initial:byId.get(data.initialDestination)};
})(typeof window!=='undefined'?window:globalThis);
