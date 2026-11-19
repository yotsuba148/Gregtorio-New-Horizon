/* Finite factory boards. The entity repository stays global; networks are local. */
(function(root){
 'use strict';
 var grids=['item','fluid','wire','chest','belt'],networkSnapshot=new WeakMap(),boardSources=new WeakMap(),activeNetworkBoards=null;
 function blank(id,name,w,h,dimension){var b={id:id,name:name,dimension:dimension||'overworld',width:w||128,height:h||128,camera:{zoom:1,x:0,y:0}};grids.forEach(function(k){b[k]={};});return b;}
 function repo(S){if(!S.fx)S.fx={};var f=S.fx;if(!Array.isArray(f.machines))f.machines=[];return f;}
 function bind(f){
  ['w','h'].concat(grids).forEach(function(k){var prior=Object.getOwnPropertyDescriptor(f,k);if(prior&&prior.get)return;
   Object.defineProperty(f,k,{configurable:true,enumerable:false,get:function(){var b=activeRepo(f);return b[k==='w'?'width':k==='h'?'height':k];},set:function(v){var b=activeRepo(f);b[k==='w'?'width':k==='h'?'height':k]=v;}});
  });
 }
 function activeRepo(f){return f.blueprints.find(function(b){return b.id===f.activeBlueprintId;})||f.blueprints[0];}
 function ensure(S){
  var f=repo(S);
  if(!Array.isArray(f.blueprints)||!f.blueprints.length){
   var b=blank('bp1','主厂区',Math.max(128,f.w||0),Math.max(128,f.h||0));grids.forEach(function(k){b[k]=f[k]&&typeof f[k]==='object'?f[k]:{};});f.blueprints=[b];f.activeBlueprintId=b.id;f.blueprintSeq=1;
  }
  for(var b of f.blueprints){if(!b.dimension)b.dimension='overworld';if(!b.camera)b.camera={zoom:1,x:0,y:0};if(!(b.width>0))b.width=128;if(!(b.height>0))b.height=128;grids.forEach(function(k){if(!b[k])b[k]={};});}
  if(!f.blueprints.some(function(b){return b.id===f.activeBlueprintId;}))f.activeBlueprintId=f.blueprints[0].id;
  f.blueprintSeq=Math.max(f.blueprintSeq||0,...f.blueprints.map(function(b){return parseInt(b.id.slice(2),10)||0;}));
  for(var m of f.machines){if(!m.location&&Number.isFinite(m.x)&&Number.isFinite(m.y))m.location={kind:'grid'};if(m.location&&m.location.kind==='grid'&&!m.location.blueprintId)m.location.blueprintId=f.blueprints[0].id;}
  bind(f);return f;
 }
 function access(S,dimension){
  var gate=root.SPACEFLIGHT&&SPACEFLIGHT.navigationLock(S);
  return (!gate||gate.id===dimension)&&(!root.DIMENSIONS?dimension==='overworld':DIMENSIONS.open(S,dimension));
 }
 function locations(S){
  var world=root.DIMENSIONS?DIMENSIONS.dims().map(function(d){return {id:d.key,name:d.name};}):[];
  var space=root.SPACE_DESTINATIONS?SPACE_DESTINATIONS.list():[];
  return Array.from(new Map([{id:'overworld',name:'主世界'}].concat(world,space).map(function(d){return[d.id,d];})).values()).filter(function(d){return access(S,d.id);});
 }
 function create(S,name,w,h,dimension){
  w=w==null?128:w;h=h==null?128:h;
  if(!Number.isSafeInteger(w)||!Number.isSafeInteger(h)||w<32||h<32||w>256||h>256)return{ok:false,code:'SIZE'};
  name=String(name||'新厂区').trim().slice(0,48);if(!name)return{ok:false,code:'NAME'};
  dimension=dimension||'overworld';if(!access(S,dimension))return{ok:false,code:'DIMENSION'};
  return{ok:true,blueprint:add(ensure(S),name,w,h,dimension)};
 }

 function add(f,name,w,h,dimension){var b=blank('bp'+(++f.blueprintSeq),name,w,h,dimension);f.blueprints.push(b);return b;}
 function select(S,id){var f=ensure(S),b=f.blueprints.find(function(b){return b.id===id;});if(!b)return{ok:false,code:'BLUEPRINT'};if(!access(S,b.dimension))return{ok:false,code:'DIMENSION'};f.activeBlueprintId=id;return{ok:true};}
 function at(S,dimension){var f=S.fx;if(!f||!f.blueprints||!f.blueprints.length)return;var b=activeRepo(f);return b.dimension===dimension?b:f.blueprints.find(function(v){return v.dimension===dimension;});}
 function openBase(S,dimension){
  if(!access(S,dimension))return {ok:false,code:'DIMENSION'};
  var b=at(S,dimension),r=b?{ok:true,blueprint:b}:create(S,DIMENSIONS.name(dimension)+(dimension.endsWith('station')?'':'基地'),128,128,dimension);
  if(r.ok)select(S,r.blueprint.id);return r;
 }
 function rename(S,id,name){name=String(name||'').trim().slice(0,48);if(!name)return{ok:false,code:'NAME'};var b=ensure(S).blueprints.find(function(b){return b.id===id;});if(!b)return{ok:false,code:'BLUEPRINT'};b.name=name;return{ok:true};}
 function belongs(f,m,b){return m.location&&m.location.kind==='grid'&&(m.location.blueprintId||f.blueprints[0].id)===(b.id||f.activeBlueprintId);}
 function view(f,b){
  if(!b)b=activeRepo(f);Object.defineProperty(b,'machines',{configurable:true,enumerable:false,get:function(){return f.machines.filter(function(m){return belongs(f,m,b);});}});
  Object.defineProperty(b,'w',{configurable:true,enumerable:false,get:function(){return b.width;}});Object.defineProperty(b,'h',{configurable:true,enumerable:false,get:function(){return b.height;}});return b;
 }
 function views(f){return f.blueprints.map(function(b){return view(f,b);});}
 // A phase-local partition: no per-board scans of the global entity array and
 // no persistent membership cache to invalidate after moving or packing a UID.
 function buildNetworkViews(f){
  var byId=new Map(),first=f.blueprints[0].id;
  var out=f.blueprints.map(function(b){var v=Object.create(b);byId.set(b.id,v);boardSources.set(v,b);
   Object.defineProperty(v,'machines',{value:[],configurable:true});
   Object.defineProperty(v,'w',{value:b.width});Object.defineProperty(v,'h',{value:b.height});
   Object.defineProperty(v,'energyLoss',{get:function(){return b.energyLoss;},set:function(n){b.energyLoss=n;}});return v;
  });
  f.machines.forEach(function(m){var loc=m.location,v=loc&&loc.kind==='grid'&&byId.get(loc.blueprintId||first);if(v)v.machines.push(m);});
  return out;
 }
 function networkViews(f){return networkSnapshot.get(f)||buildNetworkViews(f);}
 function withNetworkViews(f,run){
  var prior=networkSnapshot.get(f),priorBoards=activeNetworkBoards,views=buildNetworkViews(f);
  activeNetworkBoards=new Map(views.map(function(view){return [boardSource(view),view];}));
  networkSnapshot.set(f,views);
  try{return run();}finally{activeNetworkBoards=priorBoards;if(prior)networkSnapshot.set(f,prior);else networkSnapshot.delete(f);}
 }
 function boardSource(view){return boardSources.get(view)||view;}
 function networkEpoch(view){return activeNetworkBoards&&activeNetworkBoards.get(boardSource(view));}
 function here(f,m){return f.blueprints?belongs(f,m,activeRepo(f)):root.ENTITIES.isGrid(m);}
 function remove(S,id){var f=ensure(S),b=f.blueprints.find(function(b){return b.id===id;});if(!b)return{ok:false,code:'BLUEPRINT'};
  if(f.blueprints.length===1||b.dimension==='overworld'&&!f.blueprints.some(function(v){return v!==b&&v.dimension==='overworld';}))return{ok:false,code:'LAST_BLUEPRINT'};
  if(f.machines.some(function(m){return belongs(f,m,b);})||grids.some(function(k){return Object.keys(b[k]).length;}))return{ok:false,code:'CONTENTS'};
  f.blueprints=f.blueprints.filter(function(candidate){return candidate!==b;});if(f.activeBlueprintId===id)f.activeBlueprintId=(f.blueprints.find(function(v){return access(S,v.dimension);})||f.blueprints[0]).id;return{ok:true};
 }
 root.BLUEPRINTS={ensure:ensure,create:create,add:add,select:select,rename:rename,remove:remove,at:at,locations:locations,access:access,openBase:openBase,active:function(S){return activeRepo(ensure(S));},activeRepo:activeRepo,view:view,views:views,networkViews:networkViews,withNetworkViews:withNetworkViews,boardSource:boardSource,networkEpoch:networkEpoch,here:here,gridLayers:function(){return grids.slice();},registerLayers:function(values){values.forEach(function(k){if(grids.includes(k))throw Error('Duplicate blueprint layer '+k);grids.push(k);});}};
 function syncDimensions(S){
  var f=ensure(S),dimensions=new Map(f.blueprints.map(function(b){return [b.id,b.dimension];}));
  f.machines.forEach(function(m){if(m.location&&m.location.kind==='grid')m.location.dim=dimensions.get(m.location.blueprintId)||'overworld';});
 }
 SAVE_MIGRATIONS.register('board-dimensions',{steps:[syncDimensions,function(S){
  syncDimensions(S);
  S.fx.machines.forEach(function(m){delete m.intakeDimension;delete m.voidDim;});
 }],restore:syncDimensions});
})(typeof window!=='undefined'?window:globalThis);
