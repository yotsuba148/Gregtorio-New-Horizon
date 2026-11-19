(function(root){
 'use strict';
 // Sided capabilities, independent of the device which requests a transfer.
 // Adapters return undefined to continue lookup, null to deny this operation.
 var adapters=[],DIR=[[0,-1],[1,0],[0,1],[-1,0]];
 function register(adapter){if(!adapter||typeof adapter.resolve!=='function')throw Error('Transport adapter requires resolve');adapters.unshift(adapter);return function(){var i=adapters.indexOf(adapter);if(i>=0)adapters.splice(i,1);};}
 function supports(N,f,idx,cell,side,kind){var c=context(N,f,idx,cell,side,kind);for(var i=0;i<adapters.length;i++)if(adapters[i].supports){var result=adapters[i].supports(c);if(result!==undefined)return!!result;}return undefined;}
 function relay(board,cell,side,kind){
  for(var adapter of adapters){if(!adapter.relay)continue;var result=adapter.relay(board,cell,side,kind);if(result)return result;}
  return null;
 }
 function near(cell,side){var p=cell.split(',').map(Number);return(p[0]+DIR[side][0])+','+(p[1]+DIR[side][1]);}
 function coverKind(c,fallback){return c.kind==='item'||c.kind==='fluid'?c.kind:c.type==='pump'?'fluid':c.type==='conveyor'?'item':c.type==='plate'?null:fallback;}
 function coverAllows(m,side,kind,direction){var c=m.covers&&m.covers[side];if(!c)return true;if(root.MACHINE_COVERS&&!MACHINE_COVERS.applies(m,side,c))return true;if(c.type==='plate')return !!c[kind==='item'?'passItems':'passFluids'];return coverKind(c)!==kind||c.allowOpposite||c.mode===direction;}
 function exposed(N,m,side,kind,direction){
  var d=N.instance(m);if(d&&d.generator&&!d.multiblock&&!m._port&&(side===(m.outFace==null?1:m.outFace)||direction==='export'&&!(m.covers&&m.covers[side])))return false;
  var kinds=direction==='import'?m._inputKinds:m._outputKinds;if(kinds&&!kinds.includes(kind))return false;
  if(m._builtinSide!=null&&m._builtinSide!==side)return false;
  if(m._port){var s=MULTIBLOCKS.spec(m._port.k);if(m._side!==side||!s||!(kind==='item'?direction==='import'?s.itemIn:s.itemOut:direction==='import'?s.fluidIn&&s.externalFluidIn!==false:s.fluidOut))return false;}
  return coverAllows(m,side,kind,direction);
 }
 function inputSide(N,m,side,kind){var d=N.instance(m);return !!d&&!d.pipeOnly&&exposed(N,m,side,kind,'import')&&(!!m._port||kind==='fluid'&&d.allFluidInputs||m.allowInputFromOutputSide||(m.outFace==null?1:m.outFace)!==side);}
 function outputSide(N,m,side,kind){return exposed(N,m,side,kind,'export');}
 function box(N,m,kind){var d=N.instance(m),arr=kind==='in'?m.ins:m.outs;return m._port||d.preserveItemSlots?CORE.slotBox(arr):CORE.stackBox(arr,d.slots[kind]);}
 function itemSlotCap(d,kind,index){
  var behavior=ENGINE.behavior(d.behavior),caps=d.slotCaps||behavior&&behavior.slotCaps;
  return caps&&caps[kind]&&caps[kind][index];
 }
 function capacityForItem(cap,k){return (typeof cap==='function'?cap(k):cap)??Infinity;}
 function acceptsItem(N,m,k,options){
  if(m._owner)return acceptsItem(N,m._owner,k,options);var d=N.instance(m);if(!d)return false;
  var behavior=root.ENGINE.behaviors&&ENGINE.behaviors[d.behavior];if(behavior&&behavior.acceptsItemAt&&options&&options.index!=null)return behavior.acceptsItemAt(m,k,options.index);if(behavior&&behavior.acceptsItem)return behavior.acceptsItem(m,k,options);
  if(m.itemFilter&&m.itemFilter.length&&!m.itemFilter.some(function(x){return N.content.matches(x,k);}))return false;
  var item=N.content.item(k);if(item&&item.id==='gregtech:gt.integrated_circuit'&&(d.controlCircuit||root.MULTIBLOCKS&&MULTIBLOCKS.live(m)))return true;
  if(d.generator)return ENGINE.generators.accepts(m,k);
  var rs=N.content.candidates(d.recipeMap,[{k:k,n:1}],[]);
  return rs.some(function(r){return r&&(r.automationAllowed!==false||options&&options.manual)&&r.in.concat(r.req.filter(function(q){return q.k;})).some(function(p){return ENGINE.batch.matches(p,{k:k,n:1},r);});});
 }
 function acceptsFluid(N,m,f){
  if(m._port&&(MULTIBLOCKS.spec(m._port.k).externalFluidIn===false||!MULTIBLOCKS.allowsFluid(m._owner,m._port,f,'input')))return false;
  if(m._owner)return acceptsFluid(N,m._owner,f);var d=N.instance(m);if(!d)return false;
  var profile=root.STRUCTURES&&STRUCTURES.profile(m);
  if(profile&&profile.acceptsFluid)return profile.acceptsFluid(m,f);
  var behavior=root.ENGINE.behaviors&&ENGINE.behaviors[d.behavior];if(behavior&&behavior.acceptsFluid)return behavior.acceptsFluid(m,f);
  if(d.sharedFluidStorage)return(!d.requiresStructure||!!(m.structure&&m.structure.formed))&&(!m.lockedFluid||m.lockedFluid===f);
  if(d.steamPowered&&/^(steam|ic2steam)$/.test(f))return true;
  if(d.generator)return d.fuelFamily==='steam'?/^(steam|ic2steam)$/.test(f):!!ENGINE.generators.fuels(d).fluids[f];
  return N.content.candidates(d.recipeMap,[],[{f:f,mb:1}]).some(function(r){return r.fin.some(function(p){return p.f===f;});});
 }
 function inputTankCaps(N,m,fluid){
  var d=N.instance(m);if(!d)return[];var caps=d.fluidInputTanks||[],filters=m.inputTankFluids||d.inputTankFluids;
  if(filters)return caps.map(function(cap,i){var values=filters[i];return values&&(Array.isArray(values)?values:[values]).includes(fluid)?cap:0;});
  return caps;
 }
 // arr identifies the backing storage even when box is a selected-slot view.
 function itemHandler(arr,view,m,commit,indices){var h={arr:arr,box:view,machine:m,commit:commit,indices:indices};if(m&&m.stockLimits)h.limit=function(item){return m.stockLimits[item.k]==null?Infinity:Math.max(0,m.stockLimits[item.k]-CORE.count(arr,item.k));};return h;}
 function machineItems(c,m){
  var N=c.network,d=N.instance(m),item=c.payload;if(!d)return null;
  if(c.direction==='export')return exposed(N,m,c.side,'item','export')&&m.outs&&d.slots.out>0?itemHandler(m.outs,box(N,m,'out'),m):null;
  if(!item||item.entityUid||!inputSide(N,m,c.side,'item')||!acceptsItem(N,m,item.k))return null;
  if(m.stockLimits&&m.stockLimits[item.k]!=null&&CORE.count(m.ins,item.k)>=m.stockLimits[item.k])return null;
  var behavior=ENGINE.behaviors[d.behavior],indices=[];
  if(behavior&&behavior.slotTarget==='furnace')indices=[GRID_FURNACE.inputIndex(item.k)];
  else if(behavior&&behavior.acceptsItemAt){for(var i=0;i<d.slots.in;i++)if(behavior.acceptsItemAt(m,item.k,i))indices.push(i);if(!indices.length)return null;}
  else return itemHandler(m.ins,box(N,m,'in'),m);
  var selected=CORE.slotBox(indices.map(function(i){return m.ins[i]||null;}));
  var handler=itemHandler(m.ins,selected,m,function(){indices.forEach(function(i,n){m.ins[i]=selected.arr[n];});},indices);
  if(indices.some(function(i){return itemSlotCap(d,'in',i)!=null;})){
   var stockLimit=handler.limit;
   handler.limit=function(stack){
    var room=indices.reduce(function(total,i){
     var current=m.ins[i],cap=Math.min(capacityForItem(itemSlotCap(d,'in',i),stack.k),CORE.maxStack(stack.k));
     if(current&&(current.k!==stack.k||CORE.isInstance(current)))return total;
     return total+Math.max(0,cap-(current?GTTransactions.count(current):0));
    },0);
    return stockLimit?Math.min(room,stockLimit(stack)):room;
   };
  }
  return handler;
 }
 function machineFluid(N,m,role,definition){
  var d=definition||N.instance(m),input=role==='input',energy=role==='energy',shared=role==='output'&&d.sharedFluidStorage;
  var tanks=energy?m.tanksEnergy:input||shared?m.tanksIn:m.tanksOut,caps=energy?[d.steamCapacity]:input||shared?d.fluidInputTanks:d.fluidOutputTanks;
  if(!tanks||!caps||!caps.length)return null;
  var field=energy?'tanksEnergy':input||shared?'tanksIn':'tanksOut';
  var h={id:(energy?'e:':input?'i:':'o:')+m.uid,tanks:tanks,caps:caps,valid:function(){var owner=m._owner||m;return ENTITIES.active(owner)&&(m._port?MULTIBLOCKS.byUid(owner,m._port.uid)===m._port&&m._port.k===d.key&&m._port.tanks===tanks:m[field]===tanks);},rate:role==='output'&&d.fluidOutputRate!=null?d.fluidOutputRate:Infinity,kind:role,object:m,fluidPolicy:input?d.fluidInputPolicy:null,
   accepts:input?function(f){return acceptsFluid(N,m,f);}:energy?function(f){return /^(steam|ic2steam)$/.test(f);}:null,capsFor:input?function(f){return GTTransactions.fluidCaps(tanks,inputTankCaps(N,m,f),f,d.fluidInputPolicy,h.indices);}:null};return root.DIGITAL_TANKS?DIGITAL_TANKS.decorate(h,m,input):h;
 }
 function pipeFluid(N,p,cell,board){var d=N.def(p,'fluid');if(!p.tanks)p.tanks=p.f&&p.mb>0?[{f:p.f,mb:p.mb}]:Array(d.channels).fill(null);while(p.tanks.length<d.channels)p.tanks.push(null);var tanks=p.tanks;return{id:'p:'+cell,tanks:tanks,valid:function(){return board.fluid[cell]===p&&p.tanks===tanks;},caps:Array(d.channels).fill(d.capacity),rate:d.rate,kind:'pipe',object:p};}
 function context(N,f,idx,cell,side,kind,direction,payload){return{network:N,board:f,index:idx,cell:cell,side:side,kind:kind,direction:direction,payload:payload};}
 function resolve(N,f,idx,cell,side,kind,direction,payload){
  if(!Number.isInteger(side)||side<0||side>3||!['item','fluid'].includes(kind)||!['import','export'].includes(direction))return null;
  var c=context(N,f,idx,cell,side,kind,direction,payload);
  for(var i=0;i<adapters.length;i++){var found=adapters[i].resolve(c);if(found!==undefined)return found;}
  var p=(f[kind]||{})[cell];if(p){if(root.PIPE_COVERS&&!PIPE_COVERS.allows(p,side,kind,direction))return null;
   if(kind==='fluid')return pipeFluid(N,p,cell,f);
   return direction==='import'?{route:cell}:null;
  }
  var m=N.endpoint(idx[cell],cell,side,kind);
  if(m){if(kind==='item')return machineItems(c,m);if(direction==='export')return exposed(N,m,side,kind,direction)?machineFluid(N,m,'output'):null;
   if(!inputSide(N,m,side,kind))return null;return machineFluid(N,m,/^(steam|ic2steam)$/.test(payload)&&N.instance(m).steamPowered?'energy':'input');
  }
  // An occupied machine wall without a port is never a fallback container.
  if(idx[cell])return null;
  var chest=(f.chest||{})[cell];if(kind==='item'&&chest){if(typeof chest!=='object')chest=f.chest[cell]={slots:Array(27).fill(null)};if(!chest.slots)chest.slots=Array(27).fill(null);return itemHandler(chest.slots,CORE.slotBox(chest.slots));}
  return null;
 }
 function fluidResources(N,f,idx,tick){
  adapters.forEach(function(a){if(a.prepare)a.prepare({network:N,board:f,index:idx});});
  var out=[];Object.keys(f.fluid||{}).forEach(function(cell){var p=f.fluid[cell];if(typeof p!=='object')p=f.fluid[cell]={};out.push(pipeFluid(N,p,cell,f));});
  N.machines(f).forEach(function(m){if(!ENTITIES.isGrid(m))return;var d=N.instance(m);if(!d)return;['input','energy','output'].forEach(function(role){if(role==='energy'&&!d.steamPowered)return;var h=machineFluid(N,m,role,d);if(h)out.push(h);});});
  adapters.forEach(function(a){if(a.resources)out.push.apply(out,a.resources({network:N,board:f,index:idx,tick:tick})||[]);});return out;
 }
 function covers(N,f,kind){
  var out=[];function collect(cell,list,fallback,m){Object.entries(list||{}).forEach(function(entry){var c=entry[1],side=Array.isArray(list)?c&&c.side:+entry[0];if(!c||coverKind(c,fallback)!==kind||!Number.isInteger(side)||side<0||side>=4)return;if(m&&!MACHINE_COVERS.applies(m,side,c))return;out.push({cell:cell,side:side,cover:c});});}
  N.machines(f).forEach(function(m){if(!ENTITIES.isGrid(m))return;var list=m.covers;if(!list||!Object.keys(list).length)return;var d=N.instance(m);if(!d||d.supportsCovers!==false)collect(m.x+','+m.y,list,null,m);});
  Object.keys(f[kind]||{}).forEach(function(cell){collect(cell,f[kind][cell].covers,kind);});
  adapters.forEach(function(a){if(a.covers)out.push.apply(out,a.covers({network:N,board:f,kind:kind})||[]);});return out;
 }
 function moveItem(from,index,to,n,min){
  if(to&&to.receiveItem)return to.receiveItem(from,index,n,min);
  if(!from||!to||!from.box||!to.box||from.arr===to.arr)return{moved:0,reason:'SAME_STORAGE'};
  var item=from.box.arr[index];
  if(item&&to.limit){n=Math.min(n??GTTransactions.count(item),to.limit(item));if(n<=0)return{moved:0,reason:'TARGET_FULL'};}
  var result=CORE.transferSlot({from:from.box,index:index,to:to.box,n:n,min:min});if(result.moved){if(from.box.kind==='stacks')from.box.arr.splice.apply(from.box.arr,[0,from.box.arr.length].concat(from.box.arr.filter(Boolean)));if(from.commit)from.commit('export');if(to.commit)to.commit('import');}return result;
 }
 function fluidParts(h){return !h?[]:h.parts?h.parts.reduce(function(a,p){return a.concat(fluidParts(p));},[]):[h];}
 function sameFluidStorage(a,b){return fluidParts(a).some(function(p){return fluidParts(b).some(function(q){return p.tanks===q.tanks;});});}
 // Both storage owners commit in this synchronous operation. A network sink
 // may own its own atomic source debit (receiveFrom), as a physical tank does.
 function moveFluid(from,index,to,fluid,amount){
  if(!from||!to||sameFluidStorage(from,to)||from.valid&&!from.valid())return 0;
  var current=from.tanks[index];if(!current||current.f!==fluid)return 0;amount=Math.floor(Math.min(amount,current.mb));if(amount<=0)return 0;
  if(to.parts){var moved=0;fluidParts(to).forEach(function(p){if(moved<amount)moved+=moveFluid(from,index,p,fluid,amount-moved);});return moved;}
  if(to.valid&&!to.valid())return 0;
  if(to.receiveFrom)return to.receiveFrom(from,index,fluid,amount);
  var dest=fluidPlan(to,fluid,amount,true),n=dest.moved;if(!n)return 0;
  dest.commit();current.mb-=n;if(!current.mb)from.tanks[index]=null;return n;
 }
 function fluidSlots(h,fluid,inserting){var out=[],seen=new WeakMap();fluidParts(h).forEach(function(p){
  if(inserting&&!p.inputPlan&&p.tanks.length===1&&p.tanks[0]&&
     (p.tanks[0].f!==fluid||p.tanks[0].mb>=p.caps[0]))return;
  if(inserting&&p.accepts&&!p.accepts(fluid))return;if(inserting&&p.inputPlan||!inserting&&p.outputPlan){if(seen.has(p.tanks))return;seen.set(p.tanks,new Set());var room=inserting?p.inputRoom(fluid):p.outputAmount(fluid);if(room>0)out.push({arr:p.tanks,handler:p,amount:room});return;}var caps=p.capsFor?p.capsFor(fluid):p.caps,used=seen.get(p.tanks);if(!used){used=new Set();seen.set(p.tanks,used);}
  (p.indices||caps.map(function(_,i){return i;})).forEach(function(i){if(used.has(i))return;used.add(i);var t=p.tanks[i];if(t&&t.f!==fluid)return;var n=inserting?Math.max(0,(caps[i]||0)-(t?t.mb:0)):t?t.mb:0;if(n>0)out.push({arr:p.tanks,index:i,amount:n,tank:t});});
 });return out;}
 function fluidPlan(h,fluid,amount,inserting){fluid=CONTENT.canonicalFluid(fluid);if(!Number.isSafeInteger(amount)||amount<0)return{moved:0,commit:function(){}};var slots=fluidSlots(h,fluid,inserting),left=amount,changes=[];slots.forEach(function(s){var n=Math.min(left,s.amount);if(n<=0)return;if(s.handler){var p=inserting?s.handler.inputPlan(fluid,n):s.handler.outputPlan(fluid,n);changes.push({transaction:p});left-=p.moved;return;}var mb=(s.tank?s.tank.mb:0)+(inserting?n:-n);changes.push({arr:s.arr,index:s.index,value:mb?{f:fluid,mb:mb}:null});left-=n;});return{moved:amount-left,commit:function(){changes.forEach(function(s){if(s.transaction)s.transaction.commit();else s.arr[s.index]=s.value;});}};}
 function manualFluid(N,S,m,kind,index){
  var c={network:N,state:S,machine:m,kind:kind,index:index};for(var i=0;i<adapters.length;i++)if(adapters[i].manual){var h=adapters[i].manual(c);if(h!==undefined)return h;}
  var d=N.instance(m),role=kind==='energy'?'energy':kind==='fout'&&!d.sharedFluidStorage?'output':'input',h=machineFluid(N,m,role);if(h)h.indices=[index];return h;
 }
 root.TRANSPORT_PORTS={register:register,supports:supports,relay:relay,resolve:resolve,fluidResources:fluidResources,covers:covers,near:near,coverKind:coverKind,coverAllows:coverAllows,inputSide:inputSide,outputSide:outputSide,box:box,acceptsItem:acceptsItem,acceptsFluid:acceptsFluid,inputTankCaps:inputTankCaps,itemHandler:itemHandler,itemSlotCap:itemSlotCap,capacityForItem:capacityForItem,moveItem:moveItem,moveFluid:moveFluid,sameFluidStorage:sameFluidStorage,machineFluid:machineFluid,fluidParts:fluidParts,fluidSlots:fluidSlots,fluidPlan:fluidPlan,manualFluid:manualFluid};
})(typeof window!=='undefined'?window:globalThis);
