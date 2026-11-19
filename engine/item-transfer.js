(function(root){
 'use strict';
 var TX=GTTransactions,C=CONTENT,extensions=new Map();
 function count(s){return s?(s.n==null?1:s.n):0;}
 function identity(s){return s?JSON.stringify([C.canonicalKey(s.k),s.entityUid||null,s.instanceUid||null]):null;}
 function endpoint(S,r){
  if(!r)return null;var e={id:JSON.stringify(r),ref:r,accepts:function(){return true;},locked:function(){return false;},cap:function(s){return TX.isInstance(s)?1:CORE.maxStack(s.k);}},arr,index=Number(r.index),m,d;
  if(extensions.has(r.type)){var extension=extensions.get(r.type)(S,r);return extension?Object.assign(e,extension):null;}
  if(r.type==='cursor'){e.get=function(){return S.itemCursor&&S.itemCursor.stack||null;};e.set=function(v){if(!S.itemCursor)S.itemCursor={};S.itemCursor.stack=v;};return e;}
  if(r.type==='drop'){
   var drop=root.DROPPED_ITEMS&&DROPPED_ITEMS.get(S,r.id);if(!drop)return null;e.get=function(){return drop.stack;};e.set=function(v){drop.stack=v;if(!v)S.droppedItems.items=S.droppedItems.items.filter(function(p){return p!==drop;});};e.accepts=function(){return false;};return e;
  }
  if(['bag','chest','lineChest','trash'].includes(r.type)){
   var chest=r.type==='chest'&&(S.chests||[])[r.box];if(r.storeId)chest=(S.chests||[]).find(function(c){return c.itemStoreId===r.storeId;});
   if(r.type==='trash'&&(!root.TRASH||!TRASH.active(S)||r.session!==S.trash.session))return null;
   arr=r.type==='trash'?S.trash.slots:r.type==='bag'?S.inv:r.type==='chest'?chest&&chest.slots:FACTORY_STATE.chestSlots(S,r.cell,r.blueprintId);
   if(!Array.isArray(arr))return null;e.arr=arr;
   if(r.group){e.group=true;return e;}if(!Number.isInteger(index)||index<0||index>=arr.length)return null;
   e.get=function(){return arr[index]||null;};e.set=function(v){arr[index]=v;};e.index=index;return e;
  }
  if(r.type==='workbench'){arr=MANUAL_WORKBENCH.ensure(S).slots;if(!Number.isInteger(index)||index<0||index>=arr.length)return null;e.arr=arr;e.index=index;e.get=function(){return arr[index]||null;};e.set=function(v){arr[index]=v;};e.accepts=function(s){return !s.entityUid&&MANUAL_WORKBENCH.enabled(S,index);};return e;}
  if(r.type==='tool'){if(!S.tools)S.tools={};e.get=function(){return S.tools[r.slot]||null;};e.set=function(v){if(v)S.tools[r.slot]=v;else delete S.tools[r.slot];};e.accepts=function(s){return !s.entityUid&&CRAFT_TOOLS.type(s.k)===r.slot;};e.cap=function(){return 1;};return e;}
  if(r.type==='furnace'){
   var machine=r.uid&&ENTITIES.get(S,r.uid),f=r.uid?machine&&machine.k===GRID_FURNACE.key&&ENTITIES.active(machine)&&GRID_FURNACE.state(machine):S.furs&&S.furs[r.furnace],field={in:'input',fuel:'fuel',out:'out'}[r.kind];if(!f||!field)return null;
   e.get=function(){return f[field]||null;};e.set=function(v){var old=f[field];f[field]=v;if(field==='input'&&(!v||old&&old.k!==v.k)){f.progressTicks=0;f.prog=0;}};
   e.accepts=function(s){return !s.entityUid&&(r.kind==='in'?!!FURNACES.find(s.k):r.kind==='fuel'?FURNACES.fuelTicks(s.k)>0:false);};e.cap=function(s){return TX.isInstance(s)?1:Math.min(field==='fuel'?FURNACES.fuelSlotLimit(s.k):Infinity,f.hop?3456:64,r.kind==='out'?Number.MAX_SAFE_INTEGER:Math.max(CORE.maxStack(s.k),f.hop?3456:0));};return e;
  }
  if(r.type==='pipeCover'){
   var board=(S.fx&&S.fx.blueprints||[]).find(function(b){return b.id===r.blueprintId;}),pipe=board&&board[r.kind]&&board[r.kind][r.cell];if(!pipe||!['item','fluid'].includes(r.kind))return null;
   var side=Number.isInteger(r.side)?r.side:0;if(side<0||side>3)return null;
   e.get=function(){var c=PIPE_COVERS.at(pipe,side);return c?{k:c.k,n:1}:null;};e.snapshot=function(){return TX.clone(PIPE_COVERS.at(pipe,side));};e.restoreConfiguration=function(c){var current=PIPE_COVERS.at(pipe,side);if(c&&current&&current.k===c.k)PIPE_COVERS.write(pipe,side,TX.clone(c));};e.set=function(v){var old=PIPE_COVERS.at(pipe,side);PIPE_COVERS.write(pipe,side,v?Object.assign({},PIPE_COVERS.spec(v.k,r.kind),{mode:r.mode||old&&old.mode||'import'}):null);};e.accepts=function(s){return !s.entityUid&&!!PIPE_COVERS.spec(s.k,r.kind);};e.cap=function(){return 1;};return e;
  }
  m=r.uid&&(S.fx&&S.fx.machines||[]).find(function(v){return String(v.uid)===String(r.uid);});if(!m||m.location&&['packed','removed'].includes(m.location.kind))return null;d=STRUCTURES.instance(m);if(!d)return null;e.machine=m;
  if(r.type==='structureUpgrade')return STRUCTURE_UPGRADES.endpoint(S,m,r.field,r.partKey);
  if(r.type==='waterRecovery'){if(!d.pipeOnly||!['ins','outs'].includes(r.field)||!Number.isInteger(index)||index<0)return null;arr=m[r.field];e.get=function(){return arr[index]||null;};e.set=function(v){arr[index]=v;};e.accepts=function(){return false;};return e;}
  if(r.type==='structureRecovery'){
   arr=m.structure&&m.structure.recoveryItems;if(!arr||!Number.isInteger(index)||index<0||index>=arr.length)return null;e.arr=arr;e.index=index;e.get=function(){return arr[index]||null;};e.set=function(v){arr[index]=v;};e.accepts=function(){return false;};return e;
  }
  if(r.type==='structureRecoveryFluid'){
   arr=m.structure&&m.structure.recoveryFluids;if(!arr||!Number.isInteger(index)||index<0||index>=arr.length)return null;e.fluid=true;e.kind='fout';e.index=index;e.machine={tanksOut:arr,_portDef:{sharedFluidStorage:false,fluidOutputTanks:arr.map(function(t){return t?t.mb:0;})}};return e;
  }
  if(r.type==='structurePort'){
   if(!root.MULTIBLOCKS||!MULTIBLOCKS.live(m))return null;
   e.get=function(){var p=MULTIBLOCKS.at(m,r.face);return p?{k:p.k,n:1}:null;};e.snapshot=function(){return TX.clone(MULTIBLOCKS.at(m,r.face));};e.restoreConfiguration=function(c){var p=MULTIBLOCKS.at(m,r.face);if(p&&c&&p.k===c.k){['circ','circuitConfigured','lockedFluid','eu','flow','amps'].forEach(function(k){if(c[k]!=null)p[k]=c[k];});}};
   e.lockCode='CONTENTS';e.locked=function(){var p=MULTIBLOCKS.at(m,r.face),held=S.itemCursor&&S.itemCursor.stack;return !!p&&!!held&&MULTIBLOCKS.hasContents(p)&&!MULTIBLOCKS.canSetPort(m,r.face,held.k,S);};e.accepts=function(s){var repair=MULTIBLOCKS.casingRepair(m,r.face,S);return !s.entityUid&&(repair&&repair.k===C.canonicalKey(s.k)||MULTIBLOCKS.canSetPort(m,r.face,s.k,S));};e.cap=function(){return 1;};e.set=function(v){if(v&&!MULTIBLOCKS.spec(v.k)){if(!MULTIBLOCKS.restoreCasing(S,m,r.face,v.k))throw Error('Invalid structure casing repair');}else{var receipt={};if(!MULTIBLOCKS.setPort(S,m,r.face,v&&v.k,receipt))throw Error('Invalid structure port transfer');return receipt;}};return e;
  }
  if(r.type==='structureMaterial'){
   if(!root.MULTIBLOCKS||!MULTIBLOCKS.live(m))return null;var need=MULTIBLOCKS.required(m);if(!need||!need.fixed.some(function(p){return p.k===r.key;}))return null;
   e.get=function(){var n=MULTIBLOCKS.materialCount(m,r.key);return n?{k:r.key,n:n}:null;};e.cap=function(){return MULTIBLOCKS.casingCapacity(S,m,r.key,need.fixed.find(function(p){return p.k===r.key;}).n);};e.accepts=function(s){return !s.entityUid&&C.canonicalKey(s.k)===C.canonicalKey(r.key);};e.set=function(v){m.structure.fixedParts=m.structure.fixedParts.filter(function(p){return p.k!==r.key;});if(v)m.structure.fixedParts.push({k:r.key,n:v.n});MULTIBLOCKS.reconcileCasings(S,m);if(root.STRUCTURE_UPGRADES)STRUCTURE_UPGRADES.changed(m,'结构材料已调整');else{MULTIBLOCKS.invalidate(m);MULTIBLOCKS.validate(m);}};return e;
  }
  if(r.type==='auxPort'){
   var aux=root.MULTIBLOCKS&&MULTIBLOCKS.byUid(m,r.portUid),auxSpec=aux&&MULTIBLOCKS.spec(aux.k);if(!auxSpec||!auxSpec.aux||!Number.isInteger(index)||index<0||index>=auxSpec.slots)return null;
   e.arr=aux.items;e.index=index;e.get=function(){return aux.items[index]||null;};e.locked=function(){return AUX_INVENTORIES.locked(auxSpec.aux,m,index);};e.cap=function(s){return AUX_INVENTORIES.capacity(auxSpec.aux,s,index);};e.accepts=function(s){return AUX_INVENTORIES.accepts(auxSpec.aux,s,index);};e.set=function(v){aux.items[index]=AUX_INVENTORIES.prepare(auxSpec.aux,v,S);};return e;
  }
  if(r.type==='port'){
   var port=root.MULTIBLOCKS&&MULTIBLOCKS.byUid(m,r.portUid),spec=port&&MULTIBLOCKS.spec(port.k);if(!spec)return null;e.machine=MULTIBLOCKS.proxy(m,port);
   if(['fin','fout'].includes(r.kind)){if(!Number.isInteger(index)||index<0||index>=MULTIBLOCKS.tankCaps(spec).length||r.kind==='fin'&&!spec.fluidIn||r.kind==='fout'&&!spec.fluidOut)return null;e.fluid=true;e.kind=r.kind;e.index=index;return e;}
   if(!['in','out'].includes(r.kind)||r.kind==='in'&&!spec.itemIn||r.kind==='out'&&!spec.itemOut||!Number.isInteger(index)||index<0||index>=spec.slots)return null;e.arr=port.items;e.index=index;e.get=function(){return port.items[index]||null;};e.set=function(v){port.items[index]=v;};e.accepts=function(s){return r.kind==='in'&&(!s.entityUid||d.acceptsPackedItems)&&ENGINE.networks.acceptsItem(m,s.k,{manual:true,index:index});};return e;
  }
  if(r.type==='machine'){
   var hook=root.ENGINE&&ENGINE.behaviors&&ENGINE.behaviors[d.behavior];if(hook&&hook.noItemPort)return null;if(hook&&hook.slotTarget==='furnace'&&['in','out'].includes(r.kind)){if(!Number.isInteger(index)||index<0||index>=d.slots[r.kind])return null;return endpoint(S,{type:'furnace',uid:m.uid,kind:r.kind==='out'?'out':index===1?'fuel':'in'});}
   if(['fin','fout','energy'].includes(r.kind)){e.fluid=true;e.kind=r.kind;e.index=index;var tanks=r.kind==='energy'?(d.steamPowered?[d.steamCapacity]:[]):r.kind==='fin'||d.sharedFluidStorage?d.fluidInputTanks:d.fluidOutputTanks;if(!Number.isInteger(index)||index<0||index>=(tanks||[]).length)return null;return e;}
   if(!['in','out'].includes(r.kind)||!Number.isInteger(index)||index<0||index>=(d.slots[r.kind]||0))return null;arr=r.kind==='in'?m.ins:m.outs;if(!Array.isArray(arr))return null;e.arr=arr;e.index=index;
   e.get=function(){return arr[index]||null;};e.set=function(v){while(arr.length<=index)arr.push(null);arr[index]=v;};e.accepts=function(s){if(r.kind!=='in')return false;if(hook&&hook.slotAccepts)return hook.slotAccepts(m,index,s);return !s.entityUid&&ENGINE.networks.acceptsItem(m,s.k,{manual:true,index:index});};
    var capValue=TRANSPORT_PORTS.itemSlotCap(d,r.kind,index);
    if(capValue!=null)e.cap=function(s){return Math.min(TRANSPORT_PORTS.capacityForItem(capValue,s.k),TX.isInstance(s)?1:CORE.maxStack(s.k));};
    return e;
  }
  if(r.type==='cover'){
   e.canRestore=function(){return MACHINE_COVERS.canAttach(m,Number(r.side));};
   var side=Number(r.side);if(!Number.isInteger(side)||side<0||side>3)return null;MACHINE_COVERS.ensure(m);e.get=function(){var c=m.covers[side];return c?{k:c.k,n:1}:null;};e.snapshot=function(){return TX.clone(m.covers[side]);};e.restoreConfiguration=function(c){if(c&&m.covers[side]&&m.covers[side].k===c.k)m.covers[side]=TX.clone(c);};e.set=function(v){if(!v)delete m.covers[side];else{var spec=MACHINE_COVERS.spec(v.k),old=m.covers[side];m.covers[side]=MACHINE_COVERS.normalizeCover(Object.assign({},spec,{side:side,mode:old&&old.k===v.k?old.mode:'export',allowOpposite:!!(old&&old.k===v.k&&old.allowOpposite)}));}};e.accepts=function(s){return !s.entityUid&&MACHINE_COVERS.canAttach(m,side)&&MACHINE_COVERS.accepts(s.k);};e.cap=function(){return 1;};return e;
  }
  if(r.type==='component'){
   var choices=(d.componentSlots||{})[r.slot];if(!choices)return null;e.locked=function(){return !!m.job;};e.get=function(){var k=m.attachments&&m.attachments[r.slot];return k?{k:k,n:1}:null;};e.set=function(v){if(!m.attachments)m.attachments={};if(v)m.attachments[r.slot]=v.k;else delete m.attachments[r.slot];};e.accepts=function(s){return !s.entityUid&&choices.some(function(k){return C.matches(k,s.k);});};e.cap=function(){return 1;};return e;
  }
  if(r.type==='instance'){
   if(!(d.instanceSlots||{})[r.slot])return null;e.locked=function(){return !!m.job;};e.get=function(){var s=m.installedItems&&m.installedItems[r.slot];if(!s)return null;s=TX.clone(s);Object.keys(m.resourceBindings||{}).forEach(function(id){if(m.resourceBindings[id]===r.slot&&m.resourceBuffers[id]){if(!s.resourceBuffers)s.resourceBuffers={};s.resourceBuffers[id]=TX.clone(m.resourceBuffers[id]);}});return s;};e.set=function(v){MECHANISMS.writeInstance(m,r.slot,v);};e.prepare=function(s){return MECHANISMS.prepareInstance(m,r.slot,s);};e.accepts=function(s){return e.prepare(s).ok===true;};e.cap=function(){return 1;};return e;
  }
  return null;
 }
 function fluidPlan(S,a,b,options){
  options=options||{};
  var s=a.get(),m=b.machine,h=TRANSPORT_PORTS.manualFluid(ENGINE.networks,S,m,b.kind,b.index),tank=null,k=C.canonicalKey(s.k);
  if(!h)return{ok:false,code:'FLUID'};TRANSPORT_PORTS.fluidParts(h).some(function(p){return(p.indices||p.caps.map(function(_,i){return i;})).some(function(i){if(p.tanks[i]&&p.tanks[i].mb>0){tank=p.tanks[i];return true;}return false;});});
  var pairs=GD.containerRegistry.filter(function(p){return Number.isSafeInteger(p.amount)&&p.amount>0;}),pair=pairs.find(function(p){return p.empty===k&&tank&&p.fluid===tank.f&&(!options.containerKey||p.filled===options.containerKey);}),collect=!!pair;
  if(!pair){if(b.kind==='fout')return{ok:false,code:'CONTAINER'};pair=pairs.find(function(p){return p.filled===k&&(!options.containerKey||p.filled===options.containerKey);});if(!pair)return{ok:false,code:'CONTAINER'};}
  if(s.entityUid||TX.isInstance(s))return{ok:false,code:'CONTAINER'};
  if(h.forFluid)h=h.forFluid(pair.fluid);
  if(!collect&&TRANSPORT_PORTS.fluidParts(h).every(function(p){return p.accepts&&!p.accepts(pair.fluid);}))return{ok:false,code:'FLUID'};
  var amount=TRANSPORT_PORTS.fluidSlots(h,pair.fluid,!collect).reduce(function(n,p){return n+p.amount;},0),available=Math.floor(amount/pair.amount),operation=collect?'装出':'倒入';
  var n=Math.min(count(s),available);if(n<1)return{ok:false,code:collect?'FLUID_AMOUNT':'TANK'};return{ok:true,pair:pair,n:n,collect:collect,handler:h,operation:operation};
 }
 function fluidMove(S,a,b,commit,limit,options){
  var dynamic=root.FLUID_CONTAINER_ITEMS&&FLUID_CONTAINER_ITEMS.manual(S,a,b,commit,limit);if(dynamic)return dynamic;
  var p=fluidPlan(S,a,b,options);if(!p.ok)return p;p.n=Math.min(p.n,limit);
  var source=a.get(),storages=ENTITIES.storage(S),box=storages.indexOf(a.arr),chosen;
  for(var n=p.n;n>=1&&!chosen;n--){
   var boxes=storages.map(TX.clone),remaining=count(source)-n,rest=remaining?Object.assign({},source,{n:remaining}):null,converted={k:p.collect?p.pair.filled:p.pair.empty,n:n},sameSlot=false;
   if(box>=0)boxes[box][a.index]=rest;
   if(!rest&&a.accepts(converted)&&n<=a.cap(converted)){sameSlot=true;if(box>=0)boxes[box][a.index]=converted;else rest=converted;}
   if(!sameSlot){var temp=[converted];for(var bi=0;bi<boxes.length&&temp[0];bi++)CORE.transferSlot({from:CORE.slotBox(temp),index:0,to:CORE.slotBox(boxes[bi])});if(temp[0])continue;}
   chosen={n:n,boxes:boxes,rest:rest};
  }
  if(!chosen)return{ok:false,code:'SLOTS'};
  if(!commit)return{ok:true,moved:chosen.n};
  storages.forEach(function(arr,i){arr.splice.apply(arr,[0,arr.length].concat(chosen.boxes[i]));});if(box<0)a.set(chosen.rest);
  TRANSPORT_PORTS.fluidPlan(p.handler,p.pair.fluid,chosen.n*p.pair.amount,!p.collect).commit();
  return{ok:true,k:source.k,moved:chosen.n,remaining:count(source)-chosen.n,mb:chosen.n*p.pair.amount,operation:p.operation};
 }
 function move(S,from,to,options){
  options=options||{};var commit=options.commit!==false,a=endpoint(S,from),b=endpoint(S,to),s=a&&a.get&&a.get();if(!a||!b||!s||count(s)<1)return{ok:false,code:'EMPTY'};if(options.identity&&identity(s)!==options.identity)return{ok:false,code:'SOURCE_CHANGED'};if(a.id===b.id||a.arr&&a.arr===b.arr&&b.group)return{ok:false,code:'SAME'};var locked=a.locked()?a:b.locked()?b:null;if(locked)return{ok:false,code:locked.lockCode||'RUNNING'};
  var limit=options.n==null?count(s):options.n;if(!Number.isSafeInteger(limit)||limit<1)return{ok:false,code:'QUANTITY'};limit=Math.min(limit,count(s));
  if(a.transferOut)return a.transferOut(b,limit,commit,options);
  if(b.transfer)return b.transfer(a,limit,commit);
  if(b.fluid)return fluidMove(S,a,b,commit,limit,options);
  var restore=options.restore&&from.type==='cursor'&&S.itemCursor&&S.itemCursor.sourceIdentity===identity(s)&&JSON.stringify(S.itemCursor.origin)===JSON.stringify(to)&&(!b.canRestore||b.canRestore(s));
  if(!restore&&!b.accepts(s))return{ok:false,code:'ITEM'};
  if(b.group){var target=TX.clone(b.arr),source=[TX.clone(s)],r=CORE.transferSlot({from:CORE.slotBox(source),index:0,to:CORE.slotBox(target),n:limit});if(!r.moved)return{ok:false,code:'SLOTS'};if(commit){b.arr.splice.apply(b.arr,[0,b.arr.length].concat(target));a.set(source[0]);}return{ok:true,k:s.k,moved:r.moved,remaining:count(source[0])};}
  var t=b.get(),same=t&&C.canonicalKey(s.k)===C.canonicalKey(t.k)&&!TX.isInstance(s)&&!TX.isInstance(t),cap=b.cap(s),n=Math.min(count(s),Math.max(0,cap-(same?count(t):0)));
  if(t&&!same){if(options.swap===false||limit<count(s)||!a.accepts(t)||count(t)>a.cap(t)||count(s)>cap)return{ok:false,code:'CONTENTS'};var back=a.prepare?a.prepare(t):{ok:true,item:TX.clone(t)},next=b.prepare?b.prepare(s):{ok:true,item:TX.clone(s)};if(!back.ok||!next.ok)return{ok:false,code:'ITEM'};if(commit){a.set(back.item);b.set(next.item);}return{ok:true,k:s.k,moved:count(s),swapped:true};}
  n=Math.min(n,limit);
  if(n<1)return{ok:false,code:'SLOTS'};var incoming=Object.assign({},s,{n:n}),prepared=b.prepare?b.prepare(incoming):{ok:true,item:incoming};if(!prepared.ok)return prepared;
  var destinationReceipt,result=prepared.item;if(same)result=Object.assign({},t,{n:count(t)+n});if(commit){var configuration=restore&&S.itemCursor.sourceConfiguration;a.set(count(s)>n?Object.assign({},s,{n:count(s)-n}):null);destinationReceipt=b.set(result);if(configuration&&b.restoreConfiguration)b.restoreConfiguration(configuration);}return Object.assign({},destinationReceipt||{},{ok:true,k:s.k,moved:n,remaining:count(s)-n});
 }
 function register(type,resolver){if(typeof type!=='string'||!type.length||extensions.has(type)||typeof resolver!=='function')throw Error('Invalid item-transfer extension: '+type);extensions.set(type,resolver);}
 root.ITEM_TRANSFER={container:function(S,source,target,options){options=options||{};if(!source||!source.get||!source.get())return {ok:false,code:'EMPTY'};return fluidMove(S,source,target,options.commit!==false,options.n==null?count(source.get()):options.n,options);},endpoint:endpoint,move:move,identity:identity,count:count,register:register};
})(typeof window!=='undefined'?window:globalThis);
