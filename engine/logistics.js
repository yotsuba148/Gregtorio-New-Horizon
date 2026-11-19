(function(root){
 'use strict';
 var DIR=[[0,-1],[1,0],[0,1],[-1,0]],TX=root.GTTransactions;
 function pos(k){return k.split(',').map(Number);}function key(x,y){return x+','+y;}
 function near(k,d){var p=pos(k);return key(p[0]+DIR[d][0],p[1]+DIR[d][1]);}
 function linked(f,kind,k,d,idx){return !root.PIPE_CONNECTIONS||PIPE_CONNECTIONS.connected(f,kind,k,d,idx);}
 function pipeAllows(p,side,kind,direction){return !root.PIPE_COVERS||PIPE_COVERS.allows(p,side,kind,direction);}
 function passage(f,kind,k,side,idx){var other=f[kind][near(k,side)];return linked(f,kind,k,side,idx)&&pipeAllows(f[kind][k],side,kind,'export')&&(!other||pipeAllows(other,(side+2)%4,kind,'import'));}
 // Stable priority queue: equal-cost routes retain the previous sort/shift order.
 function Heap(compare){this.a=[];this.compare=compare;this.seq=0;}
 Heap.prototype.push=function(n){n.seq=this.seq++;var a=this.a,i=a.length;a.push(n);while(i){var p=(i-1)>>1;if(this.order(a[p],n)<=0)break;a[i]=a[p];i=p;}a[i]=n;};
 Heap.prototype.order=function(a,b){return this.compare(a,b)||a.seq-b.seq;};
 Heap.prototype.pop=function(){var a=this.a,first=a[0],last=a.pop();if(a.length){var i=0;while(i*2+1<a.length){var j=i*2+1;if(j+1<a.length&&this.order(a[j+1],a[j])<0)j++;if(this.order(last,a[j])<=0)break;a[i]=a[j];i=j;}a[i]=last;}return first;};
 // Exact (non-hashed) topology check includes electrical properties and enabled
 // cells. Membership is rebuilt only after actual cable edits/material changes.
 function powerTopology(network,wire){
  if(!network._powerPaths)network._powerPaths=new WeakMap();
  var old=network._powerPaths.get(wire),keys=Object.keys(wire),values=[],same=!!old&&old.keys.length===keys.length;
  keys.forEach(function(k,i){var d=network.def(wire[k],'wire'),v=[!!wire[k],d.voltage,d.amperage,d.loss,wire[k]&&wire[k].connections];values.push(v);
   if(same&&(old.keys[i]!==k||v.some(function(n,j){return n!==old.values[i][j];})))same=false;
  });
  if(same)return old;
  var components=new Map(),seq=0;
  keys.forEach(function(k){if(!wire[k]||components.has(k))return;var todo=[k];components.set(k,++seq);
   for(var i=0;i<todo.length;i++)for(var d=0;d<4;d++){var nk=near(todo[i],d);if(wire[nk]&&linked({wire:wire,machines:[]},'wire',todo[i],d,{})&&!components.has(nk)){components.set(nk,seq);todo.push(nk);}}
  });
  var cache={keys:keys,values:values,components:components,routes:new Map(),routeCells:0};network._powerPaths.set(wire,cache);return cache;
 }
 function powerSide(m,d,output){if(output&&root.MULTIBLOCK_POWER&&m.structure&&m.structure.ports&&MULTIBLOCK_POWER.dynamos(m).length)return MULTIBLOCK_POWER.outputSide(m,d);var definition=DEFS.of(m.k);if(definition&&definition.energyRelay)return output?d===(m.outFace==null?1:m.outFace):d!==(m.outFace==null?1:m.outFace);if(output&&definition&&definition.generator&&!definition.multiblock&&!m._port&&!m._powerRelay)return d===(m.outFace==null?1:m.outFace);return m._powerRelay?d===(output?m._powerOut:m._powerIn):!m._port||m._side===d;}
 function touching(m,components,f,idx,output){var out=new Set();for(var d=0;d<4;d++){if(!powerSide(m,d,output))continue;var k=key(m.x+DIR[d][0],m.y+DIR[d][1]),id=components.get(k);if(id!=null&&linked(f,'wire',k,(d+2)%4,idx))out.add(id);}return out;}
 var powerSampleTicks=20;
 function Network(content,definitions,pipeDefinitions){this.content=content;this.definitions=definitions;this.pipes=pipeDefinitions||{};this.powerSamples=new WeakMap();}
 function recordPowerInput(network,m,tick,voltage,amps){
  var owner=m._owner||m,windowId=Math.floor((tick-1)/powerSampleTicks),sample=network.powerSamples.get(owner);
  if(!sample||sample.windowId!==windowId){
   sample={windowId:windowId,packets:new Map(),previous:sample&&sample.windowId===windowId-1?sample.packets:null};
   network.powerSamples.set(owner,sample);
  }
  sample.packets.set(voltage,(sample.packets.get(voltage)||0)+amps);
 }
 Network.prototype.powerInput=function(m,tick){
  var windowId=Math.floor(tick/powerSampleTicks)-1,sample=this.powerSamples.get(m);
  if(!sample)return [];
  var packets=sample.windowId===windowId?sample.packets:sample.windowId===windowId+1?sample.previous:null;
  return packets?Array.from(packets,function(entry){return {voltage:entry[0],amps:entry[1]/powerSampleTicks};}).sort(function(a,b){return b.voltage-a.voltage;}):[];
 };
 Network.prototype.def=function(pipe,kind){
  if(pipe&&pipe._feedSpec)return pipe._feedSpec;
  if(pipe&&pipe.pipeKey&&this.pipes[pipe.pipeKey])return this.pipes[pipe.pipeKey];
  // Existing saves had no material identity. Keep an explicit legacy definition without inventing an owned item.
  return{kind:kind,legacy:true,slots:1,period:20,cost:65536,capacity:1000,rate:250,channels:1,voltage:32,amperage:1,loss:0,color:'#c5d9e8'};
 };
 Network.prototype.instance=function(m){return m._portDef||(root.STRUCTURES?root.STRUCTURES.instance(m):this.definitions.of(m.k));};
 Network.prototype.grid=function(f){if(root.MULTIBLOCKS)return MULTIBLOCKS.index(f);var idx={};(f.machines||[]).forEach(function(m){if(root.ENTITIES.isGrid(m))idx[key(m.x,m.y)]=m;});return idx;};
 Network.prototype.machines=function(f,kind){return root.MULTIBLOCKS?MULTIBLOCKS.networkMachines(f,kind):f.machines||[];};
 Network.prototype.endpoint=function(m,cell,side,kind){if(!m)return null;var p=pos(cell);return root.MULTIBLOCKS?MULTIBLOCKS.endpoint(m,p[0],p[1],side,kind):m;};
 Network.prototype.box=function(m,kind){return TRANSPORT_PORTS.box(this,m,kind);};
 Network.prototype.coverAllows=function(m,side,kind,direction){return TRANSPORT_PORTS.coverAllows(m,side,kind,direction);};
 Network.prototype.inputSide=function(m,side,kind){return TRANSPORT_PORTS.inputSide(this,m,side,kind);};
 Network.prototype.outputSide=function(m,side,kind){return TRANSPORT_PORTS.outputSide(this,m,side,kind);};
 Network.prototype.port=function(f,idx,cell,side,kind,direction,payload){return TRANSPORT_PORTS.resolve(this,f,idx,cell,side,kind,direction,payload);};
 Network.prototype.allowed=function(pipe,k,fluid){
  if(!pipe||!pipe.filter||!pipe.filter.length)return true;
  var self=this,match=pipe.filter.some(function(expected){return fluid?expected===k:self.content.matches(expected,k);});
  return pipe.filterMode==='blacklist'?!match:match;
 };
 Network.prototype.acceptsItem=function(m,k,options){return TRANSPORT_PORTS.acceptsItem(this,m,k,options);};
 Network.prototype.sink=function(f,idx,k,side,item){var h=this.port(f,idx,k,side,'item','import',item);return h&&h.box?h:null;};
 // GT item pipes route a transaction to the lowest routing value; they do not autonomously extract a chest.
 Network.prototype.routes=function(f,start,item,idx,tick,budgets){
  var queue=new Heap(function(a,b){return a.cost-b.cost||a.k.localeCompare(b.k);}),seen={},out=[];queue.push({k:start,cost:0,path:[]});
  while(queue.a.length){
   var n=queue.pop();
   if(seen[n.k])continue;seen[n.k]=1;
   var p=f.item[n.k];if(!p||!this.allowed(p,item.k,false))continue;
   var d=this.def(p,'item'),b=budgets[n.k];
   if(!b||b.remaining<=0)continue;
   var path=n.path.concat(n.k),cost=n.cost+d.cost;
   for(var side=0;side<4;side++){
    if(!passage(f,'item',n.k,side,idx))continue;
    var nk=near(n.k,side);if(f.item[nk]&&!seen[nk])queue.push({k:nk,cost:cost,path:path});
    else {var sink=this.sink(f,idx,nk,(side+2)%4,item);if(sink&&root.CORE.roomFor(sink.box,item.k)>0)out.push({sink:sink,path:path,cost:cost});}
   }
  }
  out.sort(function(a,b){return a.cost-b.cost;});return out;
 };
 Network.prototype.itemBudgets=function(f,tick){
  var self=this,budgets={};
  Object.keys(f.item).forEach(function(k){var p=f.item[k];if(typeof p!=='object')p=f.item[k]={};var d=self.def(p,'item');
   if(p.windowStart!=null&&(tick<p.windowStart||tick-p.windowStart>=d.period)){delete p.windowStart;p.transfers=0;}
   if(p.windowStart==null&&p.transfers>0)p.windowStart=tick;
   budgets[k]={remaining:Math.max(0,d.slots-(p.transfers||0))};
  });
  return budgets;
 };
 Network.prototype.sendItem=function(f,tick,idx,budgets,from,slot,target,cover,limit,min){
   var self=this;
   var item=from.box.arr[slot];if(!item||!target)return 0;
   var routes=target.route!=null?self.routes(f,target.route,item,idx,tick,budgets):[{sink:target,path:[],cost:0}];
   for(var i=0;i<routes.length;i++){
    var r=routes[i];if(r.sink.arr===from.arr)continue;
    var n=Math.min(item.n==null?1:item.n,self.content.maxStack(item.k),limit==null?Infinity:limit);
    if(cover&&cover.keep!=null)n=Math.min(n,Math.max(0,CORE.count(from.box.arr,item.k)-cover.keep));
    if(r.sink.limit)n=Math.min(n,r.sink.limit(item));if(n<=0||min&&n<min)continue;
    var result=TRANSPORT_PORTS.moveItem(from,slot,r.sink,n,min);
    if(result.moved){r.path.forEach(function(k){budgets[k].remaining--;if(!f.item[k].transfers)f.item[k].windowStart=tick;f.item[k].transfers=(f.item[k].transfers||0)+1;});return result.moved;}
   }
   return 0;
 };
 Network.prototype.items=function(f,tick){
  if(root.BLUEPRINTS&&f.blueprints){var self=this;return BLUEPRINTS.networkViews(f).reduce(function(n,b){return n+self.items(b,tick);},0);}
  var self=this,idx=this.grid(f),budgets=this.itemBudgets(f,tick),moved=0;
  function send(from,slot,target,cover){var n=self.sendItem(f,tick,idx,budgets,from,slot,target,cover);moved+=n;return n;}
  this.machines(f).forEach(function(m){if(!ENTITIES.isGrid(m)||!m.autoItems)return;
   if(tick%20!==0&&m._lastOutputBatch===m.completedBatches)return;m._lastOutputBatch=m.completedBatches;
   for(var side=0;side<4;side++)if((m._port||side===(m.outFace==null?1:m.outFace))&&self.outputSide(m,side,'item')){
    var cell=key(m.x,m.y),nk=near(cell,side),from=self.port(f,idx,cell,side,'item','export');if(!from||!from.box)continue;
    for(var i=from.box.arr.length-1;i>=0;i--){var item=from.box.arr[i];if(!item)continue;var to=self.port(f,idx,nk,(side+2)%4,'item','import',item);
     if(to&&(to.route==null||linked(f,'item',nk,(side+2)%4,idx)))send(from,i,to);
    }
   }
  });
  // A conveyor operates the same pair of sided capabilities on any host.
  TRANSPORT_PORTS.covers(this,f,'item').forEach(function(mount){
   var c=mount.cover,left=root.MACHINE_COVERS?MACHINE_COVERS.turns(c,tick):tick%(c.period||20)===0?c.maxStacks||1:0;if(!left)return;
   var other=near(mount.cell,mount.side),exporting=c.mode==='export',sourceCell=exporting?mount.cell:other,sourceSide=exporting?mount.side:(mount.side+2)%4,destCell=exporting?other:mount.cell,destSide=(sourceSide+2)%4;
   var from=self.port(f,idx,sourceCell,sourceSide,'item','export');if(!from||!from.box)return;
   for(var i=from.box.arr.length-1;i>=0&&left>0;i--){var item=from.box.arr[i];if(!item||!self.allowed(c,item.k,false))continue;
    while(left>0&&from.box.arr[i]){var to=self.port(f,idx,destCell,destSide,'item','import',from.box.arr[i]);if(!to||!send(from,i,to,c))break;left--;}
   }
  });
  Object.keys(f.item).sort().forEach(function(k){var p=f.item[k];
   if(p.k&&p.n>0){var a=[{k:p.k,n:p.n}];send(TRANSPORT_PORTS.itemHandler(a,CORE.stackBox(a,1)),0,{route:k});p.n=a[0]?a[0].n:0;if(!p.n)delete p.k;}
  });return moved;
 };
 Network.prototype.canCarry=function(def,fluid){
  var properties=(root.GD.fluidProperties||{})[String(fluid).split('~')[0]];if(!properties)return null;
  if(properties.temperature>def.temperature)return '温度超过管道耐热';
  if(properties.gas&&!def.gasProof)return '管道不能密封此气体';return null;
 };
 Network.prototype.fluidAccepted=function(m,f){return TRANSPORT_PORTS.acceptsFluid(this,m,f);};
 Network.prototype.inputTankCaps=function(m,f){return TRANSPORT_PORTS.inputTankCaps(this,m,f);};
 Network.prototype.fluids=function(f,tick){
  if(root.BLUEPRINTS&&f.blueprints){var self=this;return root.BLUEPRINTS.networkViews(f).reduce(function(n,b){return n+self.fluids(b,tick);},0);}
  var self=this,idx=this.grid(f),sources=[],endpoints={},budgets={},storages=new WeakMap(),moved=0;
  function add(h){
   if(endpoints[h.id])return endpoints[h.id];
   var tanks=h.tanks,storage=storages.get(tanks);if(!storage){storage={initial:TX.clone(tanks)};storage.available=storage.initial.map(function(t){return t?t.mb:0;});storages.set(tanks,storage);}
   var e=Object.assign({},h,{initial:storage.initial,storage:storage});endpoints[h.id]=e;budgets[h.id]=h.rate==null?Infinity:h.rate;sources.push(e);
   if(e.kind==='pipe'){e.incoming=(e.object.receivedFrom||0)&15;e.sent=Array(e.caps.length).fill(0);e.object.receivedFrom=0;}return e;
  }
  TRANSPORT_PORTS.fluidResources(this,f,idx,tick).forEach(add);
  function fluidEnd(cell,side,output,fluid){var h=self.port(f,idx,cell,side,'fluid',output?'export':'import',fluid);return !h?null:h.parts?{parts:TRANSPORT_PORTS.fluidParts(h).map(function(p){return endpoints[p.id];}).filter(Boolean),storage:h.identity}:endpoints[h.id];}
  // Existing fluid only moves once in this phase; incoming fluid cannot cascade down a long row.
  var available={};sources.forEach(function(e){available[e.id]=e.storage.available;});
  function receiving(b,fluid,side,source){
   if(b&&b.parts){var seen=new Set(),room=0;b.parts.forEach(function(p){if(seen.has(p.storage))return;seen.add(p.storage);var r=receiving(p,fluid,side,source);if(r)room+=r.room;});return{room:room};}
   if(!b||!self.allowed(b.object,fluid,true))return null;
   if(b.kind==='pipe'&&side!=null&&!pipeAllows(b.object,side,'fluid','import'))return null;
   if(b.kind==='pipe'){var problem=self.canCarry(self.def(b.object,'fluid'),fluid);if(problem){if(!b.object.blockedFluids)b.object.blockedFluids={};b.object.blockedFluids[fluid]=problem;return null;}if(b.object.blockedFluids)delete b.object.blockedFluids[fluid];}
   if(b.accepts&&!b.accepts(fluid))return null;if(b.receiveFrom)return{room:b.inputRoom(fluid,source),direct:true};if(b.inputPlan)return{room:b.inputRoom(fluid),custom:true};
   var caps=b.capsFor?b.capsFor(fluid):b.caps,slots=[],room=0;
   if(b.kind==='pipe'){var at=b.tanks.findIndex(function(t){return t&&t.f===fluid;});if(at<0)at=b.tanks.findIndex(function(t){return !t;});if(at>=0)slots.push(at);}
   else for(var i=0;i<caps.length;i++)if(!b.tanks[i]||b.tanks[i].f===fluid)slots.push(i);
   slots.forEach(function(i){room+=Math.max(0,(caps[i]||0)-(b.tanks[i]?b.tanks[i].mb:0));});return{caps:caps,slots:slots,room:room};
  }
  function outputRoom(a,index){var initial=a.initial[index],live=a.tanks[index];return initial&&live&&live.f===initial.f?Math.max(0,Math.min(available[a.id][index],live.mb,a.kind==='pipe'?a.rate-a.sent[index]:budgets[a.id])):0;}
  function transfer(a,b,index,limit,side){
   if(!a||!b||a.storage===b.storage)return 0;
   if(b.parts){var total=0;b.parts.forEach(function(p){if(total<limit)total+=transfer(a,p,index,limit-total,side);});return total;}
   var initial=a.initial[index];if(!initial)return 0;var receive=receiving(b,initial.f,side,a);if(!receive)return 0;
   var amount=Math.floor(Math.min(outputRoom(a,index),receive.room,limit)),movedHere=0;
   // A transactional receiver owns both its acceptance and the matching source debit.
   if(receive.direct){var requested=Math.floor(Math.min(outputRoom(a,index),limit));if(!requested)return 0;var accepted=b.receiveFrom(a,index,initial.f,requested);if(!accepted)return 0;available[a.id][index]-=accepted;if(a.kind==='pipe')a.sent[index]+=accepted;else budgets[a.id]-=accepted;moved+=accepted;return accepted;}
   if(amount<=0)return 0;
   if(receive.custom){var accepted=b.inputPlan(initial.f,amount);if(!accepted.moved)return 0;accepted.commit();a.tanks[index].mb-=accepted.moved;if(!a.tanks[index].mb)a.tanks[index]=null;available[a.id][index]-=accepted.moved;if(a.kind==='pipe')a.sent[index]+=accepted.moved;else budgets[a.id]-=accepted.moved;moved+=accepted.moved;return accepted.moved;}
   for(var slot=0;slot<receive.slots.length&&amount>0;slot++){var j=receive.slots[slot];
    var to=b.tanks[j];if(to&&to.f!==initial.f)continue;
    var take=Math.floor(Math.min(amount,Math.max(0,receive.caps[j]-(to?to.mb:0))));if(!take)continue;
    b.tanks[j]={f:initial.f,mb:(to?to.mb:0)+take};a.tanks[index].mb-=take;
    if(!a.tanks[index].mb)a.tanks[index]=null;
    available[a.id][index]-=take;if(a.kind==='pipe')a.sent[index]+=take;else budgets[a.id]-=take;moved+=take;movedHere+=take;amount-=take;
   }
   if(movedHere&&b.kind==='pipe'&&side!=null)b.object.receivedFrom|=1<<side;
   return movedHere;
  }
  var pipeKeys=Object.keys(f.fluid).sort();if(pipeKeys.length){var rotate=Math.floor(tick/5)%pipeKeys.length;pipeKeys=pipeKeys.slice(rotate).concat(pipeKeys.slice(0,rotate));}
  pipeKeys.forEach(function(k){var a=endpoints['p:'+k];
   a.initial.forEach(function(t,i){if(!t)return;
    var targets=[],seen=new Set(),room=0;
    for(var offset=0;offset<4;offset++){var d=(offset+Math.floor(tick/5))%4,nk=near(k,d);
     if((a.incoming|a.object.receivedFrom)&1<<d||!linked(f,'fluid',k,d,idx)||!pipeAllows(a.object,d,'fluid','export'))continue;
     var b=endpoints['p:'+nk]||fluidEnd(nk,(d+2)%4,false,t.f),receive=b&&a.storage!==b.storage&&receiving(b,t.f,(d+2)%4,a);
     if(receive&&receive.room>0&&!seen.has(b.storage)){seen.add(b.storage);targets.push({endpoint:b,side:(d+2)%4,room:receive.room});room+=receive.room;}
    }
    var amount=Math.min(outputRoom(a,i),room);targets.forEach(function(target){var share=room>amount?Math.max(1,Math.floor(target.room*amount/room)):target.room;transfer(a,target.endpoint,i,share,target.side);});
   });
  });
  this.machines(f).forEach(function(m){if(!root.ENTITIES.isGrid(m)||!m.autoFluids)return;var d=self.instance(m);if(!d||d.canAutoFluidOutput===false)return;
   if(tick%(d.autoFluidPeriodTicks||20)!==0&&m._lastFluidBatch===m.completedBatches)return;m._lastFluidBatch=m.completedBatches;
   var a=endpoints['o:'+m.uid];if(!a)return;
   if(a.splitOutput){
    a.initial.forEach(function(t,i){
     if(!t)return;
     var targets=[];
     for(var side=0;side<4;side++){
      if(!self.outputSide(m,side,'fluid'))continue;
      var next=near(key(m.x,m.y),side),opposite=(side+2)%4;
      if(f.fluid[next]&&!linked(f,'fluid',next,opposite,idx))continue;
      var target=fluidEnd(next,opposite,false,t.f);
      if(target)targets.push({endpoint:target,side:opposite});
     }
     if(!targets.length)return;
     var share=Math.floor(outputRoom(a,i)/targets.length);
     targets.forEach(function(to){transfer(a,to.endpoint,i,share,to.side);});
    });
    return;
   }
   if(d.perimeterFluidOutput){var contacts=[];MULTIBLOCKS.cells(m).forEach(function(c){DIR.forEach(function(v,side){if(MULTIBLOCKS.occupies(m,c.x+v[0],c.y+v[1]))return;var nk=key(c.x+v[0],c.y+v[1]);if(endpoints['p:'+nk]&&linked(f,'fluid',nk,(side+2)%4,idx))contacts.push({endpoint:endpoints['p:'+nk],side:(side+2)%4});});});if(contacts.length){var rotate=Math.floor(tick/5)%contacts.length;contacts=contacts.slice(rotate).concat(contacts.slice(0,rotate));a.initial.forEach(function(t,i){if(t)contacts.forEach(function(b,j){transfer(a,b.endpoint,i,Math.ceil(budgets[a.id]/(contacts.length-j)),b.side);});});}return;}
   var perFace=d.fluidOutputPerFaceRate||Infinity;
   a.initial.forEach(function(t,i){if(!t)return;for(var d=0;d<4;d++)if((m._port||d===(m.outFace==null?1:m.outFace))&&self.outputSide(m,d,'fluid')){
    var nk=key(m.x+DIR[d][0],m.y+DIR[d][1]);if(endpoints['p:'+nk]){if(linked(f,'fluid',nk,(d+2)%4,idx))transfer(a,endpoints['p:'+nk],i,perFace,(d+2)%4);}
    else transfer(a,fluidEnd(nk,(d+2)%4,false,t.f),i,perFace);
   }});
  });
  // Pumps ask for fluid capabilities; mounting on a machine or pipe is immaterial.
  TRANSPORT_PORTS.covers(this,f,'fluid').forEach(function(mount){
   var c=mount.cover,other=near(mount.cell,mount.side),exporting=c.mode==='export',sourceCell=exporting?mount.cell:other,sourceSide=exporting?mount.side:(mount.side+2)%4,destCell=exporting?other:mount.cell,destSide=(sourceSide+2)%4;
   var source=fluidEnd(sourceCell,sourceSide,true);if(!source)return;
   var budget=(c.rate||32)*5;(source.parts||[source]).forEach(function(a){a.initial.forEach(function(t,i){if(!t||budget<=0||!self.allowed(c,t.f,true))return;var dest=fluidEnd(destCell,destSide,false,t.f);if(!dest||source.parts&&dest.parts&&source.storage===dest.storage)return;budget-=transfer(a,dest,i,budget,destSide);});});
  });
  Object.keys(f.fluid).forEach(function(k){var p=f.fluid[k],t=p.tanks.find(Boolean);p.f=t?t.f:null;p.mb=t?t.mb:0;});
  return moved;
 };
 Network.prototype.power=function(f,tick){
  if(root.BLUEPRINTS&&f.blueprints){var self=this;return root.BLUEPRINTS.networkViews(f).reduce(function(n,b){return n+self.power(b,tick);},0);}
  if(root.MULTIBLOCKS)f=MULTIBLOCKS.powerBoard(f);
  var self=this,active=this.machines(f,'power').filter(root.ENTITIES.active),wireUse={},inputUse={},sent={},changed=0;
  function bufferSource(m){return!!(m._powerRelay||self.instance(m).energyRelay);}
  var gens=active.filter(function(m){var d=self.instance(m);if(!d)return false;return !!d.generator||!!m._powerRelay||!!(d.energyRelay&&m.emitEnergy)||!!(root.MULTIBLOCK_POWER&&m.structure&&m.structure.ports&&MULTIBLOCK_POWER.dynamos(m).length);});
  var fuelGens={};gens.forEach(function(g){var d=self.instance(g),hook=root.ENGINE&&ENGINE.behavior?ENGINE.behavior(d.behavior):null;if(hook&&hook.generatorTick)fuelGens[g.uid]=1;});
  var available={};active.filter(function(m){return self.instance(m)&&bufferSource(m);}).forEach(function(m){available[m.uid]=Math.max(0,m.eu-(self.instance(m).minimumOutputEnergy||0));if(m._port)Object.defineProperty(m._port,'_powerIO',{value:{input:0,output:0},configurable:true,writable:true,enumerable:false});});
  gens.forEach(function(g){if(!fuelGens[g.uid])return;if(!bufferSource(g))root.ENGINE.generators.tick(g,tick);});
  var consumers=active.filter(function(m){var d=self.instance(m);return d&&!d.generator&&!d.steamPowered&&d.energyCapacity>0;});
  // 推电：发电机按输出项往相邻导线推，导线建图转发，终端被动接收。
  if(root.POWER_ADAPTER&&root.POWER_PACKET_RUNNER&&root.GD&&GD.powerPush){
    var emitters=gens.concat(consumers.filter(function(m){var d=self.instance(m);return !gens.includes(m)&&d&&(d.transformer||d.energyRelay);}));
    if(!emitters.length)return 0;
    var idx=Object.keys(f.wire||{}).length?this.grid(f):{};
    var wires=root.POWER_ADAPTER.wires(f,function(v){var kk=v&&v.pipeKey||v;return (root.GD&&GD.logisticsDefinitions&&GD.logisticsDefinitions[kk])||self.def(kk,'wire')||{};},function(b,c){return root.PIPE_CONNECTIONS?PIPE_CONNECTIONS.mask(b,'wire',c,idx):15;});
    var wmap={};wires.forEach(function(w){wmap[w.x+','+w.y]=w;});
    consumers.forEach(function(m){m._accAmps=0;});
    active.forEach(function(m){if(m._port)Object.defineProperty(m._port,'_powerIO',{value:{input:0,output:0},configurable:true,writable:true,enumerable:false});});
    function endpointOf(m,d){
      function maxAmps(){
        if(d.transformer&&root.POWER_TRANSFORMER){root.POWER_TRANSFORMER.ensure(m,d);return root.POWER_TRANSFORMER.volts(m,d).inAmps||1;}
        return d.amperage==null?2:d.amperage;
      }
      if(d.energySink)return {
        canAccept:function(){return true;},
        offer:function(volt,a){var n=Math.max(1,a|0);m.energyDisposed=(m.energyDisposed||0)+n*volt;recordPowerInput(self,m,tick,volt,n);return n;}
      };
      return {
        canAccept:function(volt,a){var cap=d.volt;if(d.transformer&&root.POWER_TRANSFORMER)cap=root.POWER_TRANSFORMER.volts(m,d).inVolt||cap;if(volt>cap)return false;if((m._accAmps||0)>=maxAmps())return false;var room=(d.energyCapacity||0)-(m.eu||0);return room>=volt;},
        offer:function(volt,a){var maxA=maxAmps();var n=Math.min(a,maxA-(m._accAmps||0),Math.floor(((d.energyCapacity||0)-(m.eu||0))/volt));if(n<=0)return 0;m._accAmps=(m._accAmps||0)+n;m.eu=(m.eu||0)+n*volt;if(m._powerRelay&&m._port&&m._port._powerIO)m._port._powerIO.input+=n*volt;recordPowerInput(self,m,tick,volt,n);return n;}
      };
    }
    var terms=[],direct={};
    consumers.forEach(function(m){var d=self.instance(m);if(!d||!d.volt)return;
      var ep=endpointOf(m,d);
      var directCell=m.x+','+m.y;if(!direct[directCell])direct[directCell]={sided:{}};
      var inputs=null;
      if(d.transformer&&root.POWER_TRANSFORMER){root.POWER_TRANSFORMER.ensure(m,d);inputs=root.POWER_TRANSFORMER.faces(m,d).inputs;}
      else if(d.energyRelay){var relayOut=m.outFace==null?1:m.outFace;inputs=[0,1,2,3].filter(function(s2){return s2!==relayOut;});}
      for(var ds=0;ds<4;ds++)if((!inputs||inputs.includes(ds))&&powerSide(m,ds,false))direct[directCell].sided[ds]={canAccept:ep.canAccept,accept:ep.offer};
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(v,si){var side=si===0?1:si===1?3:si===2?2:0;if(inputs&&inputs.indexOf(side)<0||!powerSide(m,side,false))return;var k=(m.x+v[0])+','+(m.y+v[1]);if(!wmap[k]||!linked(f,'wire',k,(side+2)%4,idx))return;
        terms.push({id:m.uid+':'+side,cell:k,canAccept:ep.canAccept,offer:ep.offer});
      });
    });
    var DIRS=[[0,-1],[1,0],[0,1],[-1,0]];
    function cellOf(g,face){
      if(face==null)return null;
      if(root.MULTIBLOCKS&&typeof face==='string'&&face.split(',').length===3){var w=MULTIBLOCKS.worldFace(g,face);return (w.x+DIRS[w.side][0])+','+(w.y+DIRS[w.side][1]);}
      var side=Number(face);if(!Number.isInteger(side)||side<0||side>3)return null;
      return (g.x+DIRS[side][0])+','+(g.y+DIRS[side][1]);
    }
    function output(g,o){
      var face=o.face,direction=typeof face==='string'&&face.split(',').length===3?MULTIBLOCKS.worldFace(g,face).side:Number(face),cell=cellOf(g,face);
      if(!cell||!Number.isInteger(direction)||!powerSide(g,direction,true))return null;
      if(wmap[cell]&&!linked(f,'wire',cell,(direction+2)%4,idx))return null;
      if(!wmap[cell]&&!(direct[cell]&&direct[cell].sided[(direction+2)%4]))return null;
      return Object.assign({},o,{face:cell,direction:direction});
    }
    var transmitted=new Map(),cableLoss=0;
    var list=emitters.map(function(g){
      var inst=self.instance(g),outs=POWER_OUTPUTS.of(g,inst).map(function(o){return output(g,o);}).filter(Boolean);
      var owner=g._owner||g,source=g._port||g;
      transmitted.set(owner,0);
      return {m:g,d:Object.assign({},inst,{outputs:outs}),available:bufferSource(g)?function(){return Math.min(available[g.uid],Math.max(0,(g.eu||0)-(inst.minimumOutputEnergy||0)));}:null,draw:function(sentEU,receivedEU,cost){
        if(cost>(g.eu||0))throw Error('Power source paid more than its stored energy');
        g.eu-=cost;
        if(bufferSource(g))available[g.uid]-=cost;
        if(g._port&&g._port._powerIO)g._port._powerIO.output+=cost;
        if(cost>sentEU)source.energyOutputLoss=(source.energyOutputLoss||0)+(cost-sentEU);
        cableLoss+=sentEU-receivedEU;
        transmitted.set(owner,transmitted.get(owner)+sentEU);
      }};
    });
    var run=root.POWER_PACKET_RUNNER.tick({wires:wires,generators:list,terminals:terms,direct:direct});
    if(cableLoss)f.energyLoss=(f.energyLoss||0)+cableLoss;
    transmitted.forEach(function(sentEU,owner){owner._pushed=sentEU;});
    return run.delivered?1:0;
  }
  /* ===== 以下整段是旧「拉模式」电网，默认不再执行（GD.powerPush 为 true 时上面已 return）。
     保留它只是为了 GD.powerPush=false 时能回退；新逻辑一律在 POWER_PACKETS / POWER_PACKET_RUNNER 里。 ===== */
  if(root.GD&&GD.powerPush)return changed;
  if(!gens.length||!consumers.length)return changed;
  var idx=this.grid(f);
  if(consumers.length){var shift=tick%consumers.length;consumers=consumers.slice(shift).concat(consumers.slice(0,shift));}
  // Cache only the uncongested shortest route. Packet amperage is checked
  // again on every use; congested routes still use the original search.
  var cached=powerTopology(self,f.wire),byComponent=new Map(),byPosition=new Map(),byWorkshop=new Map();
  function add(map,k,i){if(!map.has(k))map.set(k,[]);map.get(k).push(i);}
  gens.forEach(function(g,i){if(g.location&&g.location.kind==='workshop')add(byWorkshop,g.location.areaId,i);
   else if(root.ENTITIES.isGrid(g)){add(byPosition,key(g.x,g.y),i);touching(g,cached.components,f,idx,true).forEach(function(c){add(byComponent,c,i);});}
  });
  function candidates(m){
   if(m.location&&m.location.kind==='workshop')return byWorkshop.get(m.location.areaId)||[];
   if(!root.ENTITIES.isGrid(m))return[];
   var ids=new Set();function include(a){if(a)a.forEach(function(i){ids.add(i);});}
   touching(m,cached.components,f,idx).forEach(function(c){include(byComponent.get(c));});
   for(var d=0;d<4;d++)include(byPosition.get(key(m.x+DIR[d][0],m.y+DIR[d][1])));
   return Array.from(ids).sort(function(a,b){return a-b;});
  }
  function path(g,m){
   var gd=self.instance(g),id=[g.uid,g.location&&g.location.kind,g.location&&g.location.areaId,g.x,g.y,g._powerOut,g.outFace,gd.volt,g.tfMode,g.tfFace,m.uid,m._side,m._powerIn,m.location&&m.location.kind,m.location&&m.location.areaId,m.x,m.y].join('|');
   var route;
   if(cached.routes.has(id))route=cached.routes.get(id);
   else{route=search(g,m,{});var weight=route?route.path.length+1:1;
    // Bound both route entries and total retained path cells, including on
    // large serpentine networks. Eviction affects speed only, never transfers.
    if(weight<=131072){while(cached.routes.size>=8192||cached.routeCells+weight>131072){var oldest=cached.routes.keys().next().value,prior=cached.routes.get(oldest);cached.routeCells-=prior?prior.path.length+1:1;cached.routes.delete(oldest);}cached.routes.set(id,route);cached.routeCells+=weight;}
   }
   if(!route)return null;
   if(route.path.every(function(k){return( wireUse[k]||0)<self.def(f.wire[k],'wire').amperage;}))return route;
   return search(g,m,wireUse);
  }
  function search(g,m,usedAmps){
   if(g.location&&g.location.kind==='workshop'||m.location&&m.location.kind==='workshop')return g.location&&m.location&&g.location.kind==='workshop'&&m.location.kind==='workshop'&&g.location.areaId===m.location.areaId?{path:[],loss:0}:null;
   if(!root.ENTITIES.isGrid(g)||!root.ENTITIES.isGrid(m))return null;
   // Adjacent devices can also be reached by a cable path around another side.
   if(Math.abs(g.x-m.x)+Math.abs(g.y-m.y)===1){var side=DIR.findIndex(function(v){return m.x+v[0]===g.x&&m.y+v[1]===g.y;});if(powerSide(m,side,false)&&powerSide(g,(side+2)%4,true)&&g.uid!==m.uid)return{path:[],loss:0};}
   var queue=new Heap(function(a,b){return a.loss-b.loss;}),seen={};for(var i=0;i<4;i++){var k=key(g.x+DIR[i][0],g.y+DIR[i][1]);if(powerSide(g,i,true)&&f.wire[k]&&linked(f,'wire',k,(i+2)%4,idx))queue.push({k:k,path:[],loss:0});}
   while(queue.a.length){var at=queue.pop();if(seen[at.k])continue;seen[at.k]=1;
    var def=self.def(f.wire[at.k],'wire'),gv=self.instance(g).volt;if(def.voltage<gv||(usedAmps[at.k]||0)>=def.amperage)continue;
    var p=pos(at.k),loss=at.loss+def.loss,used=at.path.concat(at.k);
    if(DIR.some(function(v,d){return powerSide(m,(d+2)%4,false)&&p[0]+v[0]===m.x&&p[1]+v[1]===m.y&&linked(f,'wire',at.k,d,idx);}))return{path:used,loss:loss};
    for(var d=0;d<4;d++){var nk=near(at.k,d);if(f.wire[nk]&&!seen[nk]&&linked(f,'wire',at.k,d,idx))queue.push({k:nk,path:used,loss:loss});}
   }
   return null;
  }
  consumers.forEach(function(m){var d=self.instance(m);function room(){return d.energySink?Number.MAX_SAFE_INTEGER:d.energyCapacity-m.eu;}if(room()<=0)return;
   var possible=candidates(m);for(var gi=0;gi<possible.length;gi++){if(room()<=0||(inputUse[m.uid]||0)>=d.amperage)break;var g=gens[possible[gi]],gd=self.instance(g),maxPackets=gd.amperage,debit=gd.outputDrain||gd.volt;
    while((sent[g.uid]||0)<maxPackets&&(inputUse[m.uid]||0)<d.amperage&&g.eu>=debit+(gd.minimumOutputEnergy||0)&&(!bufferSource(g)||available[g.uid]>=gd.volt)&&room()>0){
     if(g.uid===m.uid)break;var route=path(g,m);if(!route)break;var voltage=gd.volt-route.loss;
     if(voltage<=0)break;
     if(voltage>d.volt){m.status={code:'OVERVOLTAGE',text:'输入电压过高，已隔离',required:voltage,available:d.volt};break;}
     // GT sends a full packet; wait until the receiving buffer has room for it.
     if(room()<voltage)break;
     g.eu-=debit;g.energyOutputLoss=(g.energyOutputLoss||0)+debit-gd.volt;if(d.energySink)m.energyDisposed=(m.energyDisposed||0)+voltage;else m.eu+=voltage;if(bufferSource(g)){available[g.uid]-=gd.volt;if(g._port)g._port._powerIO.output+=gd.volt;}if(m._powerRelay)m._port._powerIO.input+=voltage;changed+=voltage;sent[g.uid]=(sent[g.uid]||0)+1;inputUse[m.uid]=(inputUse[m.uid]||0)+1;
     recordPowerInput(self,m,tick,voltage,1);
     route.path.forEach(function(k){wireUse[k]=(wireUse[k]||0)+1;});
     f.energyLoss=(f.energyLoss||0)+route.loss;
    }
   }
  });
  return changed;
 };
 root.LogisticsNetwork=Network;
 if(typeof module==='object'&&module.exports)module.exports=Network;
})(typeof window!=='undefined'?window:globalThis);
