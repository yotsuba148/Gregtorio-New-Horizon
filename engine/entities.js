(function(root){
 'use strict';
 var lifecycle=new Map();
 function storage(S){return[S.inv||[]].concat((S.chests||[]).map(function(c){return c.slots;}));}
 function repo(S){if(!S.fx)S.fx={};if(!S.fx.machines)S.fx.machines=[];if(!S.fx.uidSeq)S.fx.uidSeq=0;return S.fx;}
 function get(S,uid){return repo(S).machines.find(function(m){return String(m.uid)===String(uid);});}
 function deploymentLocation(S,location){
  if(!location||location.kind!=='grid'||!root.BLUEPRINTS)return location;
  var f=BLUEPRINTS.ensure(S),b=f.blueprints.find(function(board){return board.id===(location.blueprintId||f.activeBlueprintId);});
  return b?Object.assign({},location,{blueprintId:b.id,dim:b.dimension}):location;
 }
 function dimension(m){return m.location&&m.location.dim||'overworld';}
 function create(S,key,location,state){
  location=deploymentLocation(S,location);
  var f=repo(S),m=Object.assign({k:key,ins:[],outs:[],eu:0},state||{});
  m.k=CONTENT.canonicalKey(m.k);if(!m.uid)m.uid='e'+(++f.uidSeq);m.location=location||{kind:'grid'};
  if(m.location.kind==='grid'){if(Number.isFinite(m.location.x))m.x=m.location.x;if(Number.isFinite(m.location.y))m.y=m.location.y;}
  if(m.location.kind!=='grid'){m.x=null;m.y=null;}
  if(root.MULTIBLOCKS)MULTIBLOCKS.lockSize(m);var definition=root.ENGINE.ensure(m);var defHook=definition&&root.ENGINE&&ENGINE.behaviors&&ENGINE.behaviors[definition.behavior];if(definition&&defHook&&defHook.batchProcessing&&definition.controlCircuit!==false&&!(state&&Object.prototype.hasOwnProperty.call(state,'circuitConfigured'))){m.circ=0;m.circuitConfigured=true;}f.machines.push(m);return m;
 }
 function activate(S,item,location,state){
  var m=item.entityUid?get(S,item.entityUid):null;
  if(item.entityUid&&(!m||m.k!==item.k||!m.location||m.location.kind!=='packed'))return{ok:false,code:'ENTITY_REFERENCE'};
  location=deploymentLocation(S,location);
  if(!m){var contents=root.FLUID_CONTAINER_ITEMS&&FLUID_CONTAINER_ITEMS.activate(item);m=create(S,item.k,location,Object.assign({},state||{},contents||{}));}m.location=location;m.x=location.kind==='grid'?location.x:null;m.y=location.kind==='grid'?location.y:null;
  return{ok:true,machine:m};
 }
 function deploy(S,key,location,onlyBag,source){
  if(!location)return{ok:false,code:'LOCATION'};
  var definition=root.DEFS&&DEFS.of(key);if(definition&&definition.unplaceable)return{ok:false,code:'NOT_PLACEABLE'};if(definition&&definition.placementRepairOnly)return{ok:false,code:'WALL'};if(definition&&definition.attachmentOnly)return{ok:false,code:'INSTALL_IN_SMELTERY'};
  if(root.TINKER_WORKSTATIONS&&TINKER_WORKSTATIONS.family(key)&&TINKER_WORKSTATIONS.deployed(S,key))return{ok:false,code:'LIMIT'};
  if(definition&&definition.worldOnly&&location.kind!=='world')return{ok:false,code:'WORLD_FACILITY'};
  var chosenSize=root.MULTIBLOCKS?MULTIBLOCKS.placementSize({k:key},source&&source.structureSize):{},candidate={k:key,x:location.x,y:location.y,rotation:source&&source.rotation||0,structureSize:chosenSize};
  if(!chosenSize)return{ok:false,code:'SIZE'};
  var buildPlan=source&&source.buildPlan!=null&&root.STRUCTURE_PLACEMENT?STRUCTURE_PLACEMENT.variant(key,source.buildPlan):null;
  if(source&&source.buildPlan!=null&&!buildPlan)return{ok:false,code:'PROFILE'};
  if(location.kind==='grid'&&root.GRID_SPACE){
   var board=GRID_SPACE.board(S,location.blueprintId);
   if(board&&!BLUEPRINTS.access(S,board.dimension))return{ok:false,code:'DIMENSION'};
   var space=GRID_SPACE.check(S,candidate,{blueprintId:location.blueprintId});if(!space.ok)return space;
  }
  var boxes=onlyBag?[S.inv||[]]:storage(S);
  for(var b=0;b<boxes.length;b++)for(var i=0;i<boxes[b].length;i++){
   var item=boxes[b][i];if(!item||item.k!==key)continue;
   if(source&&(source.bagIndex!=null&&(b!==0||i!==source.bagIndex)||source.entityUid&&source.entityUid!==item.entityUid||source.fresh&&item.entityUid))continue;
   var m=item.entityUid?get(S,item.entityUid):null;
   if(item.entityUid&&(!m||m.k!==item.k||!m.location||m.location.kind!=='packed'))return{ok:false,code:'ENTITY_REFERENCE'};
   if(location.kind==='grid'&&root.PIPE_CONNECTIONS)(root.MULTIBLOCKS?MULTIBLOCKS.cells(candidate):[{x:location.x,y:location.y}]).forEach(function(c){PIPE_CONNECTIONS.prepare(S,c.x+','+c.y,location.blueprintId);});
   var initial=root.MULTIBLOCKS&&MULTIBLOCKS.dimensions(candidate).length?{structureSize:GTTransactions.clone(chosenSize)}:{};initial.rotation=candidate.rotation;if(buildPlan)initial.buildPlan=GTTransactions.clone(buildPlan);m=activate(S,item,location,initial).machine;
   var count=item.n==null?1:item.n;if(count<=1)boxes[b][i]=null;else item.n--;
   var placementProfile=root.STRUCTURES&&STRUCTURES.profile(m);if(placementProfile&&placementProfile.onDeploy)placementProfile.onDeploy(S,m);
   if(location.kind==='grid'&&root.PIPE_CONNECTIONS)(root.MULTIBLOCKS?MULTIBLOCKS.cells(m):[{x:m.x,y:m.y}]).forEach(function(c){PIPE_CONNECTIONS.placed(S,c.x+','+c.y,null,location.blueprintId);});
   return{ok:true,machine:m};
  }
  return{ok:false,code:'NO_MACHINE'};
 }
 function retainsContents(m){
  var d=root.DEFS&&DEFS.of(m.k),match=/^gregtech:gt.blockmachines@(\d+)$/.exec(m.k),meta=match&&+match[1];
  if(d&&d.resetOnDismantle)return false;
  var hook=d&&root.ENGINE&&ENGINE.behaviors&&ENGINE.behaviors[d.behavior];return !!(d&&hook&&hook.retainsContents||meta>=120&&meta<=139);
 }
 function emptyStorage(S,m){
  if(looseContents(m,S).length||fluidContents(S,m.uid).length||m.job||m.eu>0||m.note||m.lockedFluid||m.lockFluid||m.voidOverflow||m.voidAll||m.fuelEnergyCredit)return false;
  if(Object.keys(m.covers||{}).length||Object.keys(m.stockLimits||{}).length)return false;
  var d=DEFS.of(m.k);return(m.outFace==null||m.outFace===1)&&(m.autoFluids==null||m.autoFluids===!!d.defaultAutoFluids)&&!m.autoItems;
 }
 function batchContents(m){var items=[],j=m.job;if(j){var complete=j.progressTicks>=j.durationTicks&&!(m.status&&m.status.code==='COMPLETED_RESOURCE_BLOCKED');if(complete)items=GTTransactions.clone(j.outputs||[]);else{items=GTTransactions.clone(j.spentHardware||[]);var behavior=(DEFS.of(m.k)||{}).behavior,behaviorHook=root.ENGINE&&ENGINE.behaviors&&ENGINE.behaviors[behavior],usedFuel=(j.boilerPower!=null||(behaviorHook&&behaviorHook.consumesFuelDuringBatch))&&j.progressTicks>0,partialFermentation=j.recipe&&j.recipe.fermentation&&j.remainingValue<j.recipe.fermentation.value;if(!usedFuel&&!partialFermentation)items=items.concat(GTTransactions.clone(j.inputs||[]));}}return items;}
 function looseContents(m,S){return ITEM_STORES.items(S||{},'recover',m).map(GTTransactions.clone).concat(batchContents(m));}
 function recovery(m,S){var stores=ITEM_STORES.recovery(S,m),job=JSON.stringify(m.job||null),batch=batchContents(m);return {items:stores.items.concat(batch),valid:function(){return stores.valid()&&JSON.stringify(m.job||null)===job;},release:function(){stores.release();m.job=null;}};}
 function hardware(m){var items=m.wilted?[]:[{k:m.k,n:1}];items=items.concat(m.structure&&m.structure.installedParts||[],m.castingParts||[]);Object.values(m.attachments||{}).forEach(function(p){if(p)items.push(typeof p==='string'?{k:p,n:1}:GTTransactions.clone(p));});Object.values(m.surfaceCovers||{}).concat(Object.values(m.covers||{})).forEach(function(p){if(p&&p.k)items.push({k:p.k,n:1});});if(m.circuitItem)items.push(GTTransactions.clone(m.circuitItem));return items;}
 function pack(S,uid,opt){
  var m=get(S,uid);if(!m)return{ok:false,code:'NO_MACHINE'};
  if(m.location&&['packed','removed'].includes(m.location.kind))return{ok:false,code:'ALREADY_PACKED'};
  if(m.location&&m.location.kind==='attached'&&!(opt&&opt.fromParent))return{ok:false,code:'ATTACHED'};
  if(!retainsContents(m)||opt&&opt.empty||emptyStorage(S,m)){
   var all=[m].concat(repo(S).machines.filter(function(c){return c.location&&c.location.kind==='attached'&&c.location.parentUid===m.uid;}));
   for(var entity of all)for(var handler of lifecycle.values()){
    var blocked=handler.beforeRemove&&handler.beforeRemove(S,entity);
    if(blocked&&!blocked.ok)return blocked;
   }
   var recoveries=all.map(function(c){return recovery(c,S);}),parts=all.flatMap(hardware),loose=recoveries.flatMap(function(p){return p.items;});
   var returned=COMMANDS.returnGroups(S,[{items:parts,drops:true,ground:!!(opt&&opt.ground)},{items:loose,ground:true}],{valid:function(){return recoveries.every(function(p){return p.valid();});},release:function(){recoveries.forEach(function(p){p.release();});}});if(!returned.ok)return returned;
   detach(S,m);
   var removed=new Set(all.map(function(c){return c.uid;}));repo(S).machines=repo(S).machines.filter(function(c){return !removed.has(c.uid);});
   all.forEach(function(c){c.location={kind:'removed'};c.x=null;c.y=null;});
   all.forEach(function(c){lifecycle.forEach(function(handler){if(handler.removed)handler.removed(S,c);});});
   repo(S).machines.forEach(function(c){if(removed.has(c.cleanroomUid))delete c.cleanroomUid;Object.keys(c.resourceLinks||{}).forEach(function(k){if(removed.has(c.resourceLinks[k]))delete c.resourceLinks[k];});if(c.castingStations)c.castingStations=c.castingStations.filter(function(id){return !removed.has(id);});});
   return Object.assign(returned,{k:m.k,plain:true});
  }
  var returnedStorage=COMMANDS.returnItems(S,[{k:m.k,n:1,entityUid:m.uid}],{drops:true,ground:!!(opt&&opt.ground)});if(!returnedStorage.ok)return returnedStorage;detach(S,m);m.location={kind:'packed'};m.x=null;m.y=null;return Object.assign(returnedStorage,{k:m.k});
 }
 function dismantle(S,uid,opt){
  var m=get(S,uid);return !m||!isGrid(m)?{ok:false,code:'NO_MACHINE'}:pack(S,uid,opt);
 }
 function isGrid(m){return (!m.location||m.location.kind==='grid')&&Number.isFinite(m.x)&&Number.isFinite(m.y);}
 function detach(S,m){if(!isGrid(m)||!root.PIPE_CONNECTIONS)return;var board=m.location&&m.location.blueprintId,others=repo(S).machines.filter(function(v){return String(v.uid)!==String(m.uid)&&isGrid(v)&&(v.location&&v.location.blueprintId)===board;});
  (root.MULTIBLOCKS?MULTIBLOCKS.cells(m):[{x:m.x,y:m.y}]).forEach(function(c){if(others.some(function(v){return root.MULTIBLOCKS?MULTIBLOCKS.occupies(v,c.x,c.y):v.x===c.x&&v.y===c.y;}))return;PIPE_CONNECTIONS.detach(S,c.x+','+c.y,null,board);});
 }
 function active(m){return !m.location||!['packed','removed'].includes(m.location.kind);}
 function fluidContents(S,uid){var m=get(S,uid);if(!m)return[];var list=[m].concat(repo(S).machines.filter(function(c){return c.location&&c.location.parentUid===m.uid;})),out=[];
  list.forEach(function(c){(c.structure&&c.structure.recoveryFluids||[]).forEach(function(t,index){if(t&&t.mb>0)out.push({uid:c.uid,field:'recoveryFluids',structure:true,index:index,f:t.f,mb:t.mb});});['tanksIn','tanksOut','tanksEnergy'].forEach(function(field){(c[field]||[]).forEach(function(t,index){if(t&&t.mb>0)out.push({uid:c.uid,field:field,index:index,f:t.f,mb:t.mb});});});Object.keys((DEFS.of(c.k)||{}).storedFluidFields||{}).forEach(function(field){if(c[field]>0)out.push({uid:c.uid,scalar:field,f:DEFS.of(c.k).storedFluidFields[field],mb:c[field]});});Object.keys(c.resourceBuffers||{}).forEach(function(k){if((k==='gc:rocket_fuel'||k.startsWith('essentia:'))&&c.resourceBuffers[k].amount>0)out.push({uid:c.uid,resource:k,amount:c.resourceBuffers[k].amount});});});return out;
 }
 function fluidDiscardBlocked(m){return !!m.job&&!(DEFS.of(m.k)||{}).discardStoredFluidsDuringJob;}
 function discardFluids(S,uid,expected){var m=get(S,uid);if(!m)return{ok:false,code:'NO_MACHINE'};var all=[m].concat(repo(S).machines.filter(function(c){return c.location&&c.location.parentUid===m.uid;}));if(all.some(fluidDiscardBlocked))return{ok:false,code:'RUNNING'};
  var discarded=fluidContents(S,uid);if(expected&&JSON.stringify(expected)!==JSON.stringify(discarded))return{ok:false,code:'CHANGED'};discarded.forEach(function(p){var c=get(S,p.uid);if(p.resource)c.resourceBuffers[p.resource].amount=0;else if(p.scalar)c[p.scalar]=0;else if(p.structure)c.structure[p.field][p.index]=null;else c[p.field][p.index]=null;});return{ok:true,discarded:discarded};
 }
 function migratePickup(S){
  (S.fx&&S.fx.machines||[]).forEach(function(m){if(m.location&&m.location.kind==='packed'&&!retainsContents(m)&&!emptyStorage(S,m))throw Error('旧设备包含无法迁移的打包内容：'+m.uid);});
  var plain=new Set(),boxes=storage(S);boxes.forEach(function(arr){arr.forEach(function(s,i){var m=s&&s.entityUid&&get(S,s.entityUid);if(!m||m.location.kind!=='packed'||!emptyStorage(S,m)||Object.keys(s).some(function(k){return !['k','n','entityUid'].includes(k);}))return;var value={k:s.k,n:s.n==null?1:s.n};arr[i]=value;plain.add(m.uid);});});
  var cursor=S.itemCursor&&S.itemCursor.stack,packed=cursor&&cursor.entityUid&&get(S,cursor.entityUid);if(packed&&packed.location.kind==='packed'&&emptyStorage(S,packed)&&Object.keys(cursor).every(function(k){return ['k','n','entityUid'].includes(k);})){delete cursor.entityUid;S.itemCursor.sourceIdentity=ITEM_TRANSFER.identity(cursor);plain.add(packed.uid);}if(plain.size)repo(S).machines=repo(S).machines.filter(function(m){return !plain.has(m.uid);});

 }
 function registerLifecycle(id,handler){if(!id||lifecycle.has(id)||!handler)throw Error('Invalid entity lifecycle: '+id);lifecycle.set(id,handler);}
 root.ENTITIES={create:create,activate:activate,get:get,deploy:deploy,pack:pack,dismantle:dismantle,looseContents:looseContents,recovery:recovery,batchContents:batchContents,fluidContents:fluidContents,fluidDiscardBlocked:fluidDiscardBlocked,discardFluids:discardFluids,retainsContents:retainsContents,migratePickup:migratePickup,isGrid:isGrid,dimension:dimension,detach:detach,active:active,storage:storage,registerLifecycle:registerLifecycle};
})(typeof window!=='undefined'?window:globalThis);

STATE_SCHEMA.register("entities",["fx"],{fx:function(value){return FACTORY_LAYOUT.snapshot(value);}});
