(function(root){
 'use strict';var D=SPACE_DESTINATIONS;
 FEATURE_UNLOCKS.register('space_page',{quests:[SPACEFLIGHT_CONTENT.quest],mode:'all'});
 D.list().forEach(function(p){if(p.quests&&p.quests.length)FEATURE_UNLOCKS.register('space_destination_'+p.id,{quests:p.quests,mode:'all'});});
 function ensure(S){SPACE_VEHICLE.ensure(S);return D.ensure(S);}
 // 影院音量随存档保存，默认静音、音量为 0
 function cinemaSettings(S){
  var s=ensure(S);
  if(!s.cinema||typeof s.cinema!=='object')s.cinema={muted:true,volume:0};
  if(!Number.isFinite(s.cinema.volume))s.cinema.volume=0;
  s.cinema.volume=Math.max(0,Math.min(100,Math.round(s.cinema.volume)));
  if(typeof s.cinema.muted!=='boolean')s.cinema.muted=!(s.cinema.volume>0);
  return s.cinema;
 }
 function unlocked(S){return FEATURE_UNLOCKS.isOpen(S,'space_page');}
 function accessible(S,id){var p=D.get(id);return !!(p&&p.mission&&unlocked(S)&&(!p.quests||!p.quests.length||FEATURE_UNLOCKS.isOpen(S,'space_destination_'+id)));}
 function landed(S,id){return D.landed(S,id||D.initial.id);}
 var returnGates=D.list().filter(function(p){return p.navigationUntilReturn;});
 function navigationLock(S){
  return returnGates.find(function(p){
   var v=D.readProgress(S,p.id);
   return (v.landed||v.trips)&&!v.returned;
  })||null;
 }
 function canNavigate(S,page){
  if(page==='space'||page==='settings')return true;
  var gate=navigationLock(S);
  if(page==='line'&&gate)return !!(S.fx&&S.fx.blueprints&&BLUEPRINTS.activeRepo(S.fx)?.dimension===gate.id);
  return !gate;
 }
 function planet(S){var s=ensure(S),gate=navigationLock(S);return gate?gate.id:landed(S,s.planet)?s.planet:D.home.id;}
 function destination(S){return D.get(ensure(S).destination)||D.initial;}
 function choosePlanet(S,id){var p=D.get(id),s=ensure(S),gate=navigationLock(S);if(!p||!landed(S,id)||gate&&gate.id!==id||s.flight||s.returnFlight)return false;s.planet=id;s.vehicle.planet=id;s.surfaceView='surface';if(p.mission){s.destination=id;s.tier=p.tier;}return true;}
 function cabin(S){return planet(S)!==D.home.id&&ensure(S).surfaceView==='cabin';}
 function enterCabin(S){var p=D.get(planet(S));if(!landed(S,p.id))return false;ensure(S).surfaceView='cabin';return true;}
 function explore(S){var s=ensure(S);if(planet(S)===D.home.id||s.returnFlight)return false;s.surfaceView='surface';return true;}
 function startReturn(S){var s=ensure(S),p=D.get(planet(S));if(!cabin(S)||s.flight)return{ok:false,code:'PHASE'};
  if(!p.returnFilm){if(!s.vehicle.rocket||!s.vehicle.platform||s.vehicle.platform.n<9)return{ok:false,code:'ROCKET',text:'准备好9块发射平台'};s.returnFlight={destination:p.id,position:0};return finishReturn(S,p.id);}if(!s.vehicle.rocket||!s.vehicle.platform||s.vehicle.platform.n<9)return{ok:false,code:'ROCKET',text:'准备火箭与9块发射平台'};if(!s.returnFlight)s.returnFlight={destination:p.id,position:0};return{ok:true,destination:p.id};}
 function returnPosition(S,id,value){var f=ensure(S).returnFlight;if(!f||f.destination!==id||!Number.isFinite(value)||value<0)return false;f.position=Math.min(value,D.get(id).returnFilm.duration);return true;}
 function finishReturn(S,id){var s=ensure(S),f=s.returnFlight;if(!f||f.destination!==id)return{ok:false,code:'PHASE'};D.progress(S,id).returned=true;delete s.returnFlight;s.planet=D.home.id;s.vehicle.planet=D.home.id;s.surfaceView='surface';return{ok:true,destination:D.home.id};}
 function chooseDestination(S,id){var p=D.get(id),s=ensure(S);if(!p||!p.mission||s.flight||s.returnFlight)return false;s.destination=id;s.tier=p.tier;return true;}
 function ports(S){return(S.fx&&S.fx.machines||[]).filter(function(m){return ENTITIES.active(m)&&(DEFS.of(m.k)||{}).behavior==='gc_spaceport';});}
 function selected(S){var s=ensure(S),list=ports(S);return list.find(function(m){return m.uid===s.selected;})||list[0]||null;}
 function choose(S,uid){var m=ports(S).find(function(p){return p.uid===uid;});if(!m||SPACE_VEHICLE.busy(S))return false;ensure(S).selected=m.uid;return true;}
 function flight(S){return ensure(S).flight||null;}
 function ready(S,m,id){
  var s=ensure(S),p=id?D.get(id):destination(S),v=s.vehicle;
  if(!p||!p.mission)return{ok:false,code:'DESTINATION',text:'选择目的地'};
  if(!unlocked(S))return{ok:false,code:'LOCKED',text:'完成「NASA工作台」任务后解锁'};
  if(s.flight||s.returnFlight)return{ok:false,code:'FLIGHT',text:'继续当前航程'};
  if(planet(S)!==D.home.id)return{ok:false,code:'RETURN',text:'先返回地球'};
  if(!accessible(S,p.id))return{ok:false,code:'LOCKED',text:'完成'+p.name+'的前置任务'};
  if(p.parent&&!landed(S,p.parent))return{ok:false,code:'LOCKED',text:'先登陆'+D.get(p.parent).name};
  if(!m||!ports(S).includes(m))return{ok:false,code:'PORT',text:'部署航天发射站'};
  if(!v.platform||v.platform.n<9)return{ok:false,code:'STRUCTURE',text:'放入9块发射平台'};
  var rocket=SPACE.rocketInfo(v.rocket);if(!rocket)return{ok:false,code:'ROCKET',text:'放入火箭'};
  if(rocket.tier<p.tier)return{ok:false,code:'ROCKET_TIER',text:'需要T'+p.tier+'或更高等级火箭'};
  var missing=SPACE_VEHICLE.requirements(S).filter(function(q){return !q.ready;});if(missing.length)return{ok:false,code:'SUPPLIES',text:'请备齐航天物资，当前缺少：'+missing.map(function(q){return q.name;}).join('、')};
  var pool=v.rocket.resourceBuffers[SPACE.fuelKey];if(pool.amount<p.mission.fuel)return{ok:false,code:'FUEL',text:'等待装载火箭燃料：'+pool.amount+' / '+p.mission.fuel+' mB'};
  return{ok:true};
 }
 function start(S,m,id){var p=id?D.get(id):destination(S),checked=ready(S,m,id);if(!checked.ok)return checked;var s=ensure(S);s.vehicle.rocket.resourceBuffers[SPACE.fuelKey].amount-=p.mission.fuel;s.destination=p.id;s.selected=m.uid;s.flight={uid:'space-flight',phase:p.film?'launch':'orbit',position:0,destination:p.id,from:D.home.id};return{ok:true,phase:s.flight.phase,destination:p.id};}
 function position(S,uid,value){var f=flight(S);if(!f||f.uid!==uid||f.phase!=='launch'||!Number.isFinite(value)||value<0)return false;var fd=D.get(f.destination).film;if(!fd)return false;f.position=Math.min(value,fd.duration);return true;}
 function finishFilm(S,uid){var f=flight(S);if(!f||f.uid!==uid||!['launch','orbit'].includes(f.phase))return{ok:false,code:'PHASE'};var fd=D.get(f.destination).film;f.position=fd?fd.duration:0;f.phase='orbit';return{ok:true};}
 function land(S,uid){var s=ensure(S),f=s.flight;if(!unlocked(S)||!f||f.uid!==uid||f.phase!=='orbit')return{ok:false,code:'PHASE'};var p=D.get(f.destination),v=D.progress(S,p.id);v.landed=true;v.landings++;v.trips++;s.planet=p.id;s.vehicle.planet=p.id;s.surfaceView='surface';MECHANISMS.ensure(S).knowledge['space:'+p.id]={unlocked:true};MECHANISMS.ensure(S).knowledge['space:'+p.mission.id]={unlocked:true};delete s.flight;return{ok:true,destination:p.id};}
 function reset(S,id){
  if(!DEVELOPER_MODE.active(S))return{ok:false,code:'DEVELOPER_MODE'};var p=D.get(id);if(!p||!p.mission)return{ok:false,code:'DESTINATION'};
  var s=ensure(S),v=D.progress(S,id),knowledge=MECHANISMS.ensure(S).knowledge;v.landed=false;v.landings=0;v.trips=0;v.returned=false;delete knowledge['space:'+id];delete knowledge['space:'+p.mission.id];
  (p.actions||[]).forEach(function(a){if(a.unlock)delete knowledge[a.unlock];});if(root.ACTION_QUEUE)ACTION_QUEUE.removeWhere(S,function(a){return a.type==='gather'&&(ACTIVITIES.definitions[a.src]||{}).planet===id;});
  if(s.flight&&s.flight.destination===id)delete s.flight;if(s.returnFlight&&s.returnFlight.destination===id)delete s.returnFlight;if(s.planet===id){s.planet=D.home.id;s.vehicle.planet=D.home.id;s.surfaceView='surface';}s.destination=id;s.tier=p.tier;return{ok:true};
 }
 root.SPACEFLIGHT={ensure:ensure,cinemaSettings:cinemaSettings,unlocked:unlocked,accessible:accessible,landed:landed,planet:planet,destination:destination,choosePlanet:choosePlanet,chooseDestination:chooseDestination,navigationLock:navigationLock,canNavigate:canNavigate,cabin:cabin,enterCabin:enterCabin,explore:explore,startReturn:startReturn,returnPosition:returnPosition,finishReturn:finishReturn,ports:ports,selected:selected,choose:choose,flight:flight,requirements:SPACE_VEHICLE.requirements,ready:ready,start:start,position:position,finishFilm:finishFilm,land:land,reset:reset,resetMoon:function(S){return reset(S,'moon');}};
})(typeof window!=='undefined'?window:globalThis);

