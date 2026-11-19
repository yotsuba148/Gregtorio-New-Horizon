(function(root){
 'use strict';
 var TX=root.GTTransactions,hooks={};
 function report(S,receipts){var lost=(receipts||[]).filter(function(p){return p.discarded>0;});if(lost.length&&hooks.onDiscard)hooks.onDiscard(S,lost);}
 function forgetDiscarded(S,item){if(!item.entityUid)return;var ids=new Set([item.entityUid]);(S.fx&&S.fx.machines||[]).forEach(function(m){if(m.location&&ids.has(m.location.parentUid))ids.add(m.uid);});if(S.fx)S.fx.machines=(S.fx.machines||[]).filter(function(m){return !ids.has(m.uid);});}
 function placeReward(boxes,item,exclude){var remaining=[TX.clone(item)],count=item.n==null?1:item.n,receipt={k:CONTENT.canonicalKey(item.k),n:count,toBag:0,toWarehouse:0,discarded:0};remaining[0].k=receipt.k;
  for(var b=0;b<boxes.length&&remaining[0];b++){if(b===exclude)continue;var r=CORE.transferSlot({from:CORE.slotBox(remaining),index:0,to:CORE.slotBox(boxes[b]),n:count});receipt[b?'toWarehouse':'toBag']+=r.moved;}
  receipt.discarded=count-receipt.toBag-receipt.toWarehouse;return receipt;
 }

 function copyStorage(S){return ENTITIES.storage(S).map(TX.clone);}
 function availableCosts(S,requirements){
  var keys=new Set(requirements.map(function(p){return CONTENT.canonicalKey(p.k);}));
  var counts=new Map(owned(S,function(k){return keys.has(k);}).map(function(p){return[p.k,p.n];}));
  var paid=[],missing=[];
  requirements.forEach(function(p){
   var k=CONTENT.canonicalKey(p.k),have=Math.min(p.n,counts.get(k)||0);
   if(have){paid.push({k:k,n:have});counts.set(k,counts.get(k)-have);}
   if(have<p.n)missing.push({k:k,need:p.n,have:have});
  });
  return {paid:paid,missing:missing};
 }
 function commit(S,boxes){ENTITIES.storage(S).forEach(function(a,i){a.splice.apply(a,[0,a.length].concat(boxes[i]));});}
 // Manual input always searches the bag before warehouse chests. A selected slot
 // is a real capacity constraint; no input operation spawns a catalogue item.
 function owned(S,filter){
  var found={};ENTITIES.storage(S).forEach(function(a,b){a.forEach(function(s){if(!s||s.entityUid)return;var k=CONTENT.canonicalKey(s.k);if(filter&&!filter(k))return;
   var v=found[k]||(found[k]={k:k,n:0,bag:0,warehouse:0});var n=s.n==null?1:s.n;v.n+=n;v[b?'warehouse':'bag']+=n;});});return Object.keys(found).map(function(k){return found[k];});
 }
 function deposit(S,target,key,n,opt){
  opt=opt||{};key=CONTENT.canonicalKey(key);if(!Number.isSafeInteger(n)||n<=0)return{ok:false,code:'QUANTITY'};
  var original=ENTITIES.storage(S),boxes=copyStorage(S),next=TX.clone(target.arr),selected=Number.isInteger(opt.index),at=opt.index;
  if(selected&&(at<0||at>=(target.kind==='stacks'?target.limit:next.length)))return{ok:false,code:'SLOT'};
  var partial=selected?[next[at]||null]:next,box=selected?CORE.slotBox(partial):target.kind==='stacks'?CORE.stackBox(partial,target.limit):CORE.slotBox(partial);
  var remaining=n,fromBag=0,fromWarehouse=0;
  boxes.forEach(function(a,b){if(!remaining||original[b]===target.arr||(opt.onlyBag&&b))return;
   // Packed machines are entities, not consumable ingredients.
   var eligible=a.map(function(s){return s&&s.entityUid?null:s;});
   for(var i=0;i<eligible.length&&remaining;i++){if(!eligible[i]||CONTENT.canonicalKey(eligible[i].k)!==key)continue;
    var r=CORE.transferSlot({from:CORE.slotBox(a),index:i,to:box,n:remaining});remaining-=r.moved;if(b)fromWarehouse+=r.moved;else fromBag+=r.moved;
   }
  });
  if(remaining===n)return{ok:false,code:CORE.roomFor(box,key)>0?'INPUT':'SLOTS',moved:0};
  if(selected){while(next.length<=at)next.push(null);next[at]=partial[0];}
  // Commit sources first, then the target, including warehouse-to-warehouse input.
  commit(S,boxes);target.arr.splice.apply(target.arr,[0,target.arr.length].concat(next));
  return{ok:true,k:key,moved:n-remaining,remaining:remaining,fromBag:fromBag,fromWarehouse:fromWarehouse};
 }
 function exchange(S,consume,produce,opt){
  var original=ENTITIES.storage(S),boxes=copyStorage(S),consumed=[],produced=[],source=opt&&opt.source,sourceItem=source&&source.endpoint.get(),sourceRest=sourceItem&&TX.clone(sourceItem),sourceBox=source?original.indexOf(source.endpoint.arr):-1,sourceUsed=0;
  for(var i=0;i<consume.length;i++){
   var r=consume[i],left=r.n,receipt={k:CONTENT.canonicalKey(r.k),n:r.n,fromBag:0,fromWarehouse:0};
   if(sourceRest&&CONTENT.canonicalKey(sourceRest.k)===receipt.k&&!sourceRest.entityUid){var take=Math.min(left,source.n-sourceUsed,sourceRest.n==null?1:sourceRest.n);if(take>0){sourceUsed+=take;left-=take;var rest=(sourceRest.n==null?1:sourceRest.n)-take;sourceRest=rest?Object.assign({},sourceRest,{n:rest}):null;if(sourceBox>=0)boxes[sourceBox][source.endpoint.index]=sourceRest;receipt.fromSource=take;}}
   for(var b=0;b<boxes.length&&left;b++){var n=CORE.extract(CORE.slotBox(boxes[b]),r.k,left,{noEntity:true});left-=n;receipt[b?'fromWarehouse':'fromBag']+=n;}
   if(left)return{ok:false,code:'INPUT',missing:[{k:receipt.k,n:left}]};
   consumed.push(receipt);
  }
  for(var p of produce){if(!Number.isSafeInteger(p.n)||p.n<=0)return{ok:false,code:'QUANTITY'};produced.push(placeReward(boxes,p));}
  if(opt&&opt.requireOutputSpace&&produced.some(function(p){return p.discarded>0;}))return{ok:false,code:'OUTPUT'};
  var spill=[];if(opt&&opt.drops)produced.forEach(function(p,i){if(p.discarded){spill.push(Object.assign({},produce[i],{n:p.discarded}));p.toDrops=p.discarded;p.discarded=0;}});
  if(spill.length&&!DROPPED_ITEMS.valid(spill))return{ok:false,code:'QUANTITY'};if(!opt||opt.commit!==false){if(spill.length)DROPPED_ITEMS.ensure(S);commit(S,boxes);if(source&&sourceBox<0)source.endpoint.set(sourceRest);if(spill.length)DROPPED_ITEMS.add(S,spill);report(S,produced);}return{ok:true,consumed:consumed,produced:produced,moved:sourceUsed,remaining:sourceRest?(sourceRest.n==null?1:sourceRest.n):0,toDrops:produced.reduce(function(n,p){return n+(p.toDrops||0);},0),discarded:produced.reduce(function(n,p){return n+p.discarded;},0)};
 }

 function placePipe(S,kind,cell,pipeKey,opt){
  var def=GD.logisticsDefinitions[pipeKey];if(!def||def.kind!==kind)return{ok:false,code:'DEFINITION'};
  var f=FACTORY_STATE.ensure(S),xy=String(cell).split(',').map(Number);if(xy.length!==2)return{ok:false,code:'BOUNDS'};var space=GRID_SPACE.check(S,{x:xy[0],y:xy[1]},{kind:kind});if(!space.ok)return space;
  var result;
  if(opt&&Number.isInteger(opt.bagIndex)){var boxes=copyStorage(S),item=boxes[0][opt.bagIndex];if(!item||item.entityUid||CONTENT.canonicalKey(item.k)!==pipeKey||!(item.n>0))return{ok:false,code:'INPUT'};if(--item.n===0)boxes[0][opt.bagIndex]=null;commit(S,boxes);result={ok:true};}
  else result=exchange(S,[{k:pipeKey,n:1}],[]);if(!result.ok)return result;
  if(root.PIPE_CONNECTIONS)PIPE_CONNECTIONS.prepare(S,cell);
  f[kind][cell]={pipeKey:pipeKey,connections:0};if(root.PIPE_CONNECTIONS)PIPE_CONNECTIONS.placed(S,cell,kind);return{ok:true,placed:true};
 }
 function removePipe(S,kind,cell){
  var f=FACTORY_STATE.ensure(S),old=f[kind][cell];if(!old)return{ok:false,code:'EMPTY'};
   var result=returnItems(S,(old.pipeKey?[{k:old.pipeKey,n:1}]:[]).concat((old.covers||[]).filter(function(c){return c.k;}).map(function(c){return{k:c.k,n:1};})),{drops:true});if(!result.ok)return result;
   if(kind==='item'&&old.k&&old.n>0){var contents=returnItems(S,[{k:old.k,n:old.n}],{ground:true});if(!contents.ok)return contents;result.toDrops=(result.toDrops||0)+(contents.toDrops||0);result.produced=result.produced.concat(contents.produced||[]);}
   if(root.PIPE_CONNECTIONS)PIPE_CONNECTIONS.detach(S,cell,kind);delete f[kind][cell];return result;
 }
 function setPipeFilter(S,kind,cell,values,mode){
  var f=FACTORY_STATE.ensure(S),p=f[kind]&&f[kind][cell];if(!p||kind==='wire')return{ok:false,code:'PIPE'};
  if(!Array.isArray(values)||values.length>9||!['whitelist','blacklist'].includes(mode))return{ok:false,code:'FILTER'};
  var keys=[];for(var value of values){var k=kind==='item'?CONTENT.canonicalKey(value):CONTENT.canonicalFluid(value);
   if(kind==='item'?!CONTENT.item(k):!CONTENT.data.fluids.some(function(d){return d.id===k;}))return{ok:false,code:'DEFINITION'};
   if(keys.indexOf(k)<0)keys.push(k);
  }
  if(typeof p!=='object')p=f[kind][cell]={};p.filter=keys;p.filterMode=mode;return{ok:true};
 }
 function coverSpec(k){
  var match=/^gregtech:gt.metaitem.01@(\d+)$/.exec(k);if(!match)return null;var meta=+match[1];
  if(meta>=32630&&meta<=32639){var tier=meta-32629;return{k:k,type:'conveyor',kind:'item',tier:tier,period:[400,100,20,4,1][Math.min(4,tier-1)],maxStacks:Math.pow(2,Math.max(0,tier-5))};}
  if(meta>=32610&&meta<=32619){var tier=meta-32609;return{k:k,type:'pump',kind:'fluid',tier:tier,period:1,rate:tier<=8?32*Math.pow(4,tier-1):1048576*Math.pow(2,tier-9)};}
  return null;
 }
 function setPipeCover(S,kind,cell,k,side,mode){
  var f=FACTORY_STATE.ensure(S),p=f[kind]&&f[kind][cell];if(!p||kind==='wire')return{ok:false,code:'PIPE'};
  if(!Number.isInteger(side)||side<0||side>3)return{ok:false,code:'SIDE'};
  var old=typeof p==='object'&&(root.PIPE_COVERS?PIPE_COVERS.at(p,side):(p.covers||[]).find(function(c){return c.side===side;})),spec=k&&(root.PIPE_COVERS?PIPE_COVERS.spec(k,kind):coverSpec(k));
  if(k&&(!spec||spec.kind!==kind&&spec.kind!=='both'||!['import','export'].includes(mode)))return{ok:false,code:'COVER'};
  var result=exchange(S,k&&(!old||old.k!==k)?[{k:k,n:1}]:[],old&&old.k&&old.k!==k?[{k:old.k,n:1}]:[],{drops:true});if(!result.ok)return result;
  if(typeof p!=='object')p=f[kind][cell]={};var value=k?Object.assign({},old&&old.k===k?old:{},spec,{side:side,mode:mode}):null;if(root.PIPE_COVERS)PIPE_COVERS.write(p,side,value);else p.covers=value?[value]:[];return result;
 }
 function loadRecipe(S,m,r){
  if(m.job)return{ok:false,code:'RUNNING'};
  if(root.CONTENT_SCOPE&&!root.CONTENT_SCOPE.recipeAllowed(r))return{ok:false,code:'CONTENT_SCOPE'};
  var d=ENGINE.ensure(m);if(!d||!r||r.map!==d.recipeMap)return{ok:false,code:'RECIPE_MAP'};var boxes=copyStorage(S),flat=m.ins.map(TX.clone),positions=flat.map(function(){return null;});
  boxes.forEach(function(a,b){a.forEach(function(s,i){if(s){flat.push(s);positions.push([b,i]);}});});
  var needs=r.in.concat(r.req.filter(function(q){return q.k;})).map(function(q){return Object.assign({},q,{consumed:true});});
  var plan=TX.planIngredients(flat,needs,function(q,s){return !s.entityUid&&ENGINE.batch.matches(q,s,r);});if(!plan)return{ok:false,code:'INPUT'};
  var moved={},additions=[];
  plan.allocations.forEach(function(a){if(positions[a.slot])moved[a.slot]=(moved[a.slot]||0)+a.n;});
  Object.keys(moved).forEach(function(slot){var source=flat[slot],n=moved[slot];additions.push(Object.assign({},source,{k:CONTENT.canonicalKey(source.k),n:n}));
   var p=positions[slot],s=boxes[p[0]][p[1]];s.n=(s.n==null?1:s.n)-n;if(!s.n)boxes[p[0]][p[1]]=null;});
  var inputs=TX.planOutput(m.ins,additions,d.slots.in,function(k){return CORE.maxStack(k);});if(!inputs)return{ok:false,code:'SLOTS'};
  commit(S,boxes);m.ins=inputs;ENGINE.selectRecipe(m,r);return{ok:true,moved:additions.reduce(function(n,a){return n+a.n;},0)};
 }
 function pourPlan(S,m,k,opt){
  if(DEFS.of(m.k)&&DEFS.of(m.k).pipeOnly)return{ok:false,code:"PIPE_ONLY"};
  opt=opt||{};if(opt.kind!=null&&opt.kind!=='fin'&&opt.kind!=='energy')return{ok:false,code:'OUTPUT_SLOT'};
  if(opt.index!=null&&(!Number.isInteger(opt.index)||opt.index<0))return{ok:false,code:'SLOT'};
  k=CONTENT.canonicalKey(k);var pair=GD.containerRegistry.find(function(p){return p.filled===k&&Number.isSafeInteger(p.amount)&&p.amount>0;});if(!pair)return{ok:false,code:'CONTAINER'};
  var d=root.STRUCTURES?STRUCTURES.instance(m):DEFS.of(m.k),energy=opt.kind==='energy'||(!opt.kind&&d.steamPowered&&/^(steam|ic2steam)$/.test(pair.fluid));
  if(!ENGINE.networks.fluidAccepted(m,pair.fluid)||energy&&!/^(steam|ic2steam)$/.test(pair.fluid))return{ok:false,code:'FLUID'};
  var field=energy?'tanksEnergy':'tanksIn',tanks=m[field]||[],caps=energy?[d.steamCapacity]:ENGINE.networks.inputTankCaps(m,pair.fluid),room=0;
  caps.forEach(function(cap,i){if(opt.index!=null&&i!==opt.index)return;var t=tanks[i];if(!t||t.f===pair.fluid)room+=Math.max(0,cap-(t?t.mb:0));});
  var have=owned(S,function(x){return x===k;}).reduce(function(n,x){return n+x.n;},0),max=Math.min(have,Math.floor(room/pair.amount));
  return{ok:max>0,code:room<pair.amount?'TANK':'INPUT',max:max,pair:pair,field:field,caps:caps};
 }
 // Compatibility actions use the same container transaction as pointer/Shift input.
 function transferContainers(S,m,kind,indices,key,n,pair){
  var moved=0,mb=0,last={ok:false,code:'INPUT'},stores=ENTITIES.storage(S);
  for(var index of indices)for(var box=0;box<stores.length&&moved<n;box++)for(var slot=0;slot<stores[box].length&&moved<n;slot++){
   var stack=stores[box][slot];if(!stack||CONTENT.canonicalKey(stack.k)!==CONTENT.canonicalKey(key))continue;
   var source=ITEM_TRANSFER.endpoint(S,box?{type:'chest',box:box-1,index:slot}:{type:'bag',index:slot});
   var result=ITEM_TRANSFER.container(S,source,{machine:m,kind:kind,index:index},{n:n-moved,containerKey:pair.filled});
   last=result;if(result.ok){moved+=result.moved;mb+=result.mb;}
  }
  return moved?{ok:true,k:pair.filled,moved:moved,mb:mb,remaining:n-moved,fluid:pair.fluid}:last;
 }
 function pour(S,m,k,n,opt){
  n=n==null?1:n;if(!Number.isSafeInteger(n)||n<=0)return{ok:false,code:'QUANTITY'};
  var p=pourPlan(S,m,k,opt);if(!p.ok)return p;n=Math.min(n,p.max);
  return transferContainers(S,m,p.field==='tanksEnergy'?'energy':'fin',opt&&opt.index!=null?[opt.index]:p.caps.map(function(_,i){return i;}),p.pair.filled,n,p.pair);
 }
 function collectOptions(S,m,kind,index){
  if(DEFS.of(m.k)&&DEFS.of(m.k).pipeOnly)return{ok:false,code:'PIPE_ONLY'};
  index=index==null?0:index;if(!['fin','fout','energy'].includes(kind)||!Number.isInteger(index)||index<0)return{ok:false,code:'SLOT'};
  var d=DEFS.of(m.k),arr=kind==='fin'||kind==='fout'&&d&&d.sharedFluidStorage?m.tanksIn:kind==='energy'?m.tanksEnergy:m.tanksOut,tank=arr&&arr[index];if(!tank||!(tank.mb>0))return{ok:false,code:'EMPTY'};
  var choices=[],minimum=Infinity;owned(S).sort(function(a,b){return Number(b.bag>0)-Number(a.bag>0);}).forEach(function(o){GD.containerRegistry.forEach(function(p){if(p.empty!==o.k||p.fluid!==tank.f||!Number.isSafeInteger(p.amount)||p.amount<=0)return;minimum=Math.min(minimum,p.amount);if(p.amount<=tank.mb)choices.push({pair:p,max:Math.min(o.n,Math.floor(tank.mb/p.amount))});});});
  return{ok:choices.length>0,code:choices.length?null:minimum===Infinity?'CONTAINER':'FLUID_AMOUNT',minimum:minimum===Infinity?null:minimum,choices:choices,arr:arr,tank:tank};
 }
 function collectFluid(S,m,kind,index,n,filledKey){
  var p=collectOptions(S,m,kind,index);if(!p.ok)return p;
  var choice=filledKey?p.choices.find(function(c){return c.pair.filled===filledKey;}):p.choices[0];if(!choice)return{ok:false,code:'CONTAINER'};
  n=n==null?1:n;if(!Number.isSafeInteger(n)||n<=0)return{ok:false,code:'QUANTITY'};
  return transferContainers(S,m,kind,[index==null?0:index],choice.pair.empty,Math.min(n,choice.max),choice.pair);
 }
 function setCircuit(S,m,n){
  if(!Number.isFinite(n))return{ok:false,code:'CIRCUIT'};
  n=Math.max(-1,Math.min(24,Math.floor(n)));
  if(root.MULTIBLOCKS&&MULTIBLOCKS.managed(m)){
   if(DEFS.of(m.k).largeBoiler){var bus=MULTIBLOCKS.members(m,'ins')[0];return bus?MULTIBLOCKS.setCircuit(m,bus.uid,n):{ok:false,code:'CIRCUIT'};}
   return MULTIBLOCKS.setControllerCircuit(m,n);
  }
  if(m.circuitItem){var returned=returnItems(S,[m.circuitItem],{drops:true});if(!returned.ok)return returned;delete m.circuitItem;}
  m.circuitConfigured=n>=0;m.circ=n>=0?n:0;delete m.configurationItem;delete m.configurationItems;
  delete m.legacyCircuit;return{ok:true};
 }
 function withdraw(S,arr,index,n){
  var item=arr[index];if(!item)return{ok:false,code:'EMPTY'};var total=item.n==null?1:item.n,want=n==null?total:Math.min(total,n);
  if(!Number.isSafeInteger(want)||want<=0)return{ok:false,code:'QUANTITY'};
  var original=ENTITIES.storage(S),boxes=copyStorage(S),reward=Object.assign({},item,{n:want}),r=placeReward(boxes,reward,original.indexOf(arr)),spill=r.discarded?Object.assign({},reward,{n:r.discarded}):null;
  if(spill&&!DROPPED_ITEMS.valid([spill]))return{ok:false,code:'QUANTITY'};
  commit(S,boxes);arr[index]=total>want?Object.assign({},item,{n:total-want}):null;
  if(spill){DROPPED_ITEMS.add(S,[spill]);r.toDrops=r.discarded;r.discarded=0;}
  return Object.assign({ok:true,moved:r.toBag+r.toWarehouse,removed:want,remaining:total-want},r);
 }

 function loadFurnace(S,f,key,src,kind,capacity,quantity){
  key=CONTENT.canonicalKey(key);var field=kind==='in'?'input':'fuel',cur=f[field],boxes=copyStorage(S),indices=src==='inv'?[0]:typeof src==='string'&&src.indexOf('chest:')===0?[1+(+src.slice(6))]:boxes.map(function(_,i){return i;});
  if(quantity!=null&&(!Number.isSafeInteger(quantity)||quantity<=0))return{ok:false,code:'QUANTITY'};
  if(field==='fuel')capacity=Math.min(capacity,FURNACES.fuelSlotLimit(key));
  var room=capacity-(cur&&cur.k===key?cur.n:0),available=indices.reduce(function(n,i){return n+(boxes[i]?CORE.count(boxes[i],key):0);},0),got=Math.min(room,available,quantity==null?Infinity:quantity);
  if(!(got>0))return{ok:false,code:'INPUT'};var left=got;
  indices.forEach(function(i){if(left&&boxes[i])left-=CORE.extract(CORE.slotBox(boxes[i]),key,left);});if(left)return{ok:false,code:'INPUT'};
  if(cur&&cur.k!==key){var refund=cur.n;boxes.forEach(function(a){if(refund)refund-=CORE.insert(CORE.slotBox(a),cur.k,refund);});if(refund)report(S,[{k:cur.k,n:cur.n,discarded:refund}]);}
  commit(S,boxes);f[field]={k:key,n:got+(cur&&cur.k===key?cur.n:0)};if(field==='input'&&cur&&cur.k!==key)f.progressTicks=0;return{ok:true,moved:got};
 }
 // Multiple destinations and source release commit in one synchronous operation.
 function returnGroups(S,groups,opt){
  opt=opt||{};var boxes=copyStorage(S),produced=[],sources=[],spill=[];
  for(var group of groups)for(var item of group.items){
   if(!item)continue;var n=item.n==null?1:item.n;if(!Number.isSafeInteger(n)||n<=0)return{ok:false,code:'QUANTITY'};
   var receipt=group.ground?{k:item.k,n:n,toBag:0,toWarehouse:0,discarded:n}:placeReward(boxes,item);
   if((group.ground||group.drops)&&receipt.discarded){spill.push(Object.assign({},item,{n:receipt.discarded}));receipt.toDrops=receipt.discarded;receipt.discarded=0;}
   produced.push(receipt);sources.push(item);
  }
  if(spill.length&&!DROPPED_ITEMS.valid(spill))return{ok:false,code:'QUANTITY'};
  if(opt.valid&&!opt.valid())return{ok:false,code:'SOURCE_CHANGED'};
  if(opt.commit!==false){
   if(spill.length)DROPPED_ITEMS.ensure(S);commit(S,boxes);if(spill.length)DROPPED_ITEMS.add(S,spill);
   if(opt.release)opt.release();produced.forEach(function(p,i){if(p.discarded)forgetDiscarded(S,sources[i]);});report(S,produced);
  }
  return{ok:true,produced:produced,consumed:[],moved:produced.reduce(function(n,p){return n+p.toBag+p.toWarehouse;},0),toDrops:produced.reduce(function(n,p){return n+(p.toDrops||0);},0),discarded:produced.reduce(function(n,p){return n+p.discarded;},0),toBag:produced.reduce(function(n,p){return n+p.toBag;},0),toWarehouse:produced.reduce(function(n,p){return n+p.toWarehouse;},0)};
 }
 function returnItems(S,items,opt){return returnGroups(S,[{items:items,ground:opt&&opt.ground,drops:opt&&opt.drops}],opt);}
 function debugGive(S,key,n){
  if(!DEVELOPER_MODE.active(S))return{ok:false,code:'DEVELOPER_MODE'};
  key=CONTENT.canonicalKey(key);var item=CONTENT.item(key);
  if(!item||item.meta===32767||root.CONTENT_SCOPE&&!CONTENT_SCOPE.allowed(key))return{ok:false,code:'DEFINITION'};
  if(!Number.isSafeInteger(n)||n<=0||n>CORE.maxStack(key))return{ok:false,code:'QUANTITY'};
  var stack=hooks.createStack?hooks.createStack(key,n):{k:key,n:n};if(!stack)return{ok:false,code:'DEFINITION'};
  var source=[Object.assign({},stack,{k:key,n:n})],r=CORE.transferSlot({from:CORE.slotBox(source),index:0,to:CORE.slotBox(S.inv),n:n});
  return{ok:r.moved>0,code:r.moved?'OK':'SLOTS',k:key,moved:r.moved,remaining:n-r.moved,toBag:r.moved,toWarehouse:0};
 }
 function storeBagSlot(S,index){
  var item=S.inv&&S.inv[index];if(!Number.isInteger(index)||!item)return{ok:false,code:'EMPTY'};
  var boxes=copyStorage(S),n=item.n==null?1:item.n,moved=0;
  for(var b=1;b<boxes.length&&boxes[0][index];b++)moved+=CORE.transferSlot({from:CORE.slotBox(boxes[0]),index:index,to:CORE.slotBox(boxes[b])}).moved;
  if(!moved)return{ok:false,code:'SLOTS',k:item.k,moved:0,remaining:n};
  commit(S,boxes);return{ok:true,k:item.k,moved:moved,remaining:n-moved,toBag:0,toWarehouse:moved};
 }
 function moveBagSlot(S,from,to){
  var bag=S.inv;if(!Array.isArray(bag)||!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=bag.length||to>=bag.length||from===to||!bag[from])return{ok:false,code:'SLOT'};
  var source=TX.clone(bag[from]),target=TX.clone(bag[to]),same=target&&CONTENT.canonicalKey(source.k)===CONTENT.canonicalKey(target.k)&&!TX.isInstance(source)&&!TX.isInstance(target);
  if(target&&!same){bag[from]=target;bag[to]=source;return{ok:true,k:source.k,moved:source.n||1,swapped:true};}
  var a=[source],b=[target],result=CORE.transferSlot({from:CORE.slotBox(a),index:0,to:CORE.slotBox(b)});
  if(!result.moved)return{ok:false,code:'SLOTS'};bag[from]=a[0];bag[to]=b[0];return{ok:true,k:source.k,moved:result.moved,remaining:a[0]?a[0].n||1:0};
 }

 root.COMMANDS={configure:function(h){hooks=h||{};},reportLoss:report,placeReward:placeReward,returnItems:returnItems,returnGroups:returnGroups,debugGive:debugGive,storeBagSlot:storeBagSlot,moveBagSlot:moveBagSlot,owned:owned,availableCosts:availableCosts,deposit:deposit,pourPlan:pourPlan,collectOptions:collectOptions,loadFurnace:loadFurnace,withdraw:withdraw,exchange:exchange,placePipe:placePipe,removePipe:removePipe,loadRecipe:loadRecipe,pourContainer:pour,collectFluid:collectFluid,setCircuit:setCircuit,setPipeFilter:setPipeFilter,coverSpec:coverSpec,setPipeCover:setPipeCover};
})(typeof window!=='undefined'?window:globalThis);
