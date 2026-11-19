/* EIO routes connect container capabilities, never another transport's graph. */
(function(root){
 'use strict';
 var ports=TRANSPORT_PORTS;
 var inletUsage=new WeakMap(),liveGroups=new WeakMap();
 function sameContainer(a,b){var ownerA=a.machine||a.object,ownerB=b.machine||b.object;return !!ownerA&&ownerA===ownerB;}
 function resolve(b,idx,p,flow,item){return CONTAINER_ACCESS.resolve(b,idx,p.target,p.targetSide,p.spec.medium,flow,item);}
 function livePorts(b,idx,group){
  var epoch=BLUEPRINTS.networkEpoch(b),cached=epoch&&liveGroups.get(group);
  if(!cached||cached.epoch!==epoch||cached.index!==idx){
   cached={epoch:epoch,index:idx,value:{ports:group.ports.filter(function(p){
    return CONTAINER_ACCESS.supports(b,idx,p.target,p.targetSide,p.spec.medium);
   }),distances:group.distances,ordered:new Map()}};
   if(epoch)liveGroups.set(group,cached);
  }
  return cached.value;
 }
 function targets(b,g,src,kind,payload){
  return orderedPorts(b,g,src).filter(function(p){
   return kind==='item'?EIO_FILTERS.pass(p.face.filters[0],payload):EIO_FILTERS.fluidPass(p.face.insert,payload);
  });
 }
 function orderedPorts(b,g,src){
  var old=g.ordered&&g.ordered.get(src.id);
  if(old)return old;
  var candidates=g.ports.filter(function(p){return p.id!==src.id&&p.face.insert.enabled&&p.face.insert.color===src.face.extract.color;});
  candidates.sort(function(a,c){return (c.face.insert.priority||0)-(a.face.insert.priority||0)||EIO_TOPOLOGY.distance(b,g,src.cell,a.cell)-EIO_TOPOLOGY.distance(b,g,src.cell,c.cell)||a.id.localeCompare(c.id);});
  if(g.ordered)g.ordered.set(src.id,candidates);
  return candidates;
 }
 function maxItems(f){var s=f.upgrades[0];return !s?4:EIO_CONTENT.speed(s.k)==='down'?1:4+4*Math.min(15,s.n);}
 function budget(port,limit){
  var used=inletUsage.get(port.face);
  if(!used||used.tick!==ENGINE.tick){used={tick:ENGINE.tick,amount:0};inletUsage.set(port.face,used);}
  return {left:Math.max(0,limit-used.amount),debit:function(n){used.amount+=n;}};
 }
 function sendItem(b,idx,g,src,from,index,amount,min,allows){var item=from.box.arr[index];if(!item||!EIO_FILTERS.pass(src.face.filters[1],item))return 0;var moved=0;
  for(var p of targets(b,g,src,'item',item)){if(allows&&!allows(p.target,p.targetSide))continue;var to=resolve(b,idx,p,'import',item);if(to&&to.arr!==from.arr&&!sameContainer(from,to)){var r=ports.moveItem(from,index,to,amount-moved,min);moved+=r.moved||0;if(moved>=amount||!from.box.arr[index])break;}}
  return moved;
 }
 function sendFluid(b,idx,g,src,from,index,fluid,amount,allows){if(!EIO_FILTERS.fluidPass(src.face.extract,fluid))return 0;var moved=0;
  for(var p of targets(b,g,src,'fluid',fluid)){if(allows&&!allows(p.target,p.targetSide))continue;var to=resolve(b,idx,p,'import',fluid);if(to&&!sameContainer(from,to))moved+=ports.moveFluid(from,index,to,fluid,amount-moved);if(moved>=amount)break;}return moved;
 }
 function relay(board,cell,side,kind){
  var layer=kind==='item'?'eioItem':'eioFluid',node=board[layer][cell];
  if(!node||!(node.connections&1<<side)||!node.faces[side].extract.enabled)return null;
  return {
   send:function(idx,source,allows){
    var at=EIO_TOPOLOGY.ingress(board,layer,cell,side);if(!at)return 0;
    var quota=budget(at.port,kind==='fluid'?at.port.spec.io:maxItems(at.port.face));
    if(!quota.left)return 0;
    var group=livePorts(board,idx,at.group);
    var moved=0;
    if(kind==='fluid'){
     for(var i=0;i<source.tanks.length&&moved<quota.left;i++){
      var fluid=source.tanks[i];if(fluid)moved+=sendFluid(board,idx,group,at.port,source,i,fluid.f,Math.min(quota.left-moved,fluid.mb),allows);
     }
    }else for(var j=0;j<source.box.arr.length&&moved<quota.left;j++){
     var stack=source.box.arr[j];if(stack)moved+=sendItem(board,idx,group,at.port,source,j,Math.min(quota.left-moved,GTTransactions.count(stack)),1,allows);
    }
    quota.debit(moved);return moved;
   },
   destinations:function(idx,payload){
    var at=EIO_TOPOLOGY.ingress(board,layer,cell,side);
    if(!at||!(kind==='item'?EIO_FILTERS.pass(at.port.face.filters[1],payload):EIO_FILTERS.fluidPass(at.port.face.extract,payload)))return [];
    return targets(board,livePorts(board,idx,at.group),at.port,kind,payload).filter(function(p){return resolve(board,idx,p,'import',payload);});
   }
  };
 }
 function snapshot(sources,kind){var map=new WeakMap();sources.forEach(function(s){var list=kind==='item'?[s.handler]:ports.fluidParts(s.handler);list.forEach(function(h){var arr=kind==='item'?h.arr:h.tanks;if(map.has(arr))return;var amounts=new Map();(kind==='item'?h.arr:h.tanks).forEach(function(t){if(!t)return;var key=kind==='item'?EIO_FILTERS.identity(t,true):t.f;amounts.set(key,(amounts.get(key)||0)+(kind==='item'?t.n:t.mb));});map.set(arr,amounts);});});return map;}
 function available(map,arr,key){return map.get(arr)?.get(key)||0;}
 function debit(map,arr,key,n){var m=map.get(arr);m.set(key,Math.max(0,(m.get(key)||0)-n));}
 function items(b,idx,groups){var sources=[];groups.forEach(function(g){g.ports.forEach(function(p){if(p.face.extract.enabled){var h=resolve(b,idx,p,'export');if(h&&h.box)sources.push({group:g,port:p,handler:h});}});});var amounts=snapshot(sources,'item'),total=0;
  sources.forEach(function(s){var f=s.port.face;if(f.cooldown>0){f.cooldown--;return;}var h=s.handler,a=h.box.arr,max=maxItems(f),moved=0;
   for(var step=0;step<a.length;step++){var i=(f.nextSlot+step)%a.length,t=a[i];if(!t)continue;var key=EIO_FILTERS.identity(t,true),n=Math.min(t.n,max,available(amounts,h.arr,key));if(n<=0)continue;moved=sendItem(b,idx,s.group,s.port,h,i,n,1);if(moved){debit(amounts,h.arr,key,moved);f.nextSlot=(i+1)%Math.max(1,a.length);break;}}
   f.cooldown=moved?Math.max(0,Math.round(moved*10/max)-1):20;total+=moved;
  });return total;
 }
 function fluids(b,idx,groups,tick){var sources=[];groups.forEach(function(g){g.ports.forEach(function(p){if(p.face.extract.enabled){var h=resolve(b,idx,p,'export');if(h)sources.push({group:g,port:p,handler:h});}});});var amounts=snapshot(sources,'fluid'),total=0;
  sources.forEach(function(s){var f=s.port.face;if(f.failed>=25&&tick%10!==0)return;var left=s.port.spec.extract,moved=0;
   ports.fluidParts(s.handler).forEach(function(h){for(var i=0;i<h.tanks.length&&left>0;i++){var t=h.tanks[i];if(!t)continue;var fluid=t.f,n=Math.min(left,t.mb,available(amounts,h.tanks,fluid));if(n<=0)continue;var got=sendFluid(b,idx,s.group,s.port,h,i,fluid,n);debit(amounts,h.tanks,fluid,got);moved+=got;left-=got;}});f.failed=moved?0:(f.failed||0)+1;total+=moved;
  });return total;
 }
 function context(b,idx){return{board:b,index:idx||CONTAINER_ACCESS.index(b),item:EIO_TOPOLOGY.components(b,'eioItem',idx),fluid:EIO_TOPOLOGY.components(b,'eioFluid',idx)};}
 function tick(S,t){var f=EIO_STATE.ensure(S),total=0;BLUEPRINTS.networkViews(f).forEach(function(b){var idx=CONTAINER_ACCESS.index(b),c=context(b,idx);total+=items(b,idx,c.item)+fluids(b,idx,c.fluid,t);});return total>0;}
 function fluidReceiver(b,idx,cell,side){var node=b.eioFluid[cell],spec=EIO_CONTENT.spec(node.pipeKey),usedTick=-1,location={board:b,index:idx};
  return{location:location,id:'eio-fluid:'+b.id+':'+cell+':'+side,tanks:[],caps:[],kind:'sink',object:node,
   inputRoom:function(fluid,source){if(source&&source.kind==='pipe'||usedTick===ENGINE.tick)return 0;var b=location.board,idx=location.index,at=EIO_TOPOLOGY.ingress(b,'eioFluid',cell,side);if(!at||!EIO_FILTERS.fluidPass(at.port.face.extract,fluid))return 0;var quota=budget(at.port,spec.io);return Math.min(quota.left,targets(b,at.group,at.port,'fluid',fluid).reduce(function(n,p){var to=resolve(b,idx,p,'import',fluid);if(!to||source&&ports.sameFluidStorage(source,to))return n;return n+(to.inputRoom?to.inputRoom(fluid,source):ports.fluidPlan(to,fluid,quota.left,true).moved);},0));},
   receiveFrom:function(from,index,fluid,n){if(from.kind==='pipe'||usedTick===ENGINE.tick)return 0;var b=location.board,idx=location.index,at=EIO_TOPOLOGY.ingress(b,'eioFluid',cell,side);if(!at)return 0;usedTick=ENGINE.tick;var quota=budget(at.port,spec.io);if(!quota.left)return 0;var moved=sendFluid(b,idx,at.group,at.port,from,index,fluid,Math.min(quota.left,n));quota.debit(moved);return moved;}};
 }
 // Passive machine outputs and covers use the same public capability calls.
 var receivers=new WeakMap();function receiver(b,idx,cell,side){var node=b.eioFluid[cell],map=receivers.get(node);if(!map)receivers.set(node,map=new Map());if(!map.has(side))map.set(side,fluidReceiver(b,idx,cell,side));var h=map.get(side);h.location.board=b;h.location.index=idx;return h;}
 ports.register({relay:relay,supports:function(c){if(c.board.eioItem?.[c.cell]||c.board.eioFluid?.[c.cell])return false;},resolve:function(c){var k=c.kind==='item'?'eioItem':'eioFluid',node=c.board[k]?.[c.cell];if(!node)return undefined;
   if(c.direction!=='import'||!CONTAINER_ACCESS.supports(c.board,c.index,ports.near(c.cell,c.side),(c.side+2)%4,c.kind))return null;
   if(c.kind==='fluid')return receiver(c.board,c.index,c.cell,c.side);
   return{receiveItem:function(from,index,n,min){var at=EIO_TOPOLOGY.ingress(c.board,k,c.cell,c.side);return{moved:at?sendItem(c.board,c.index,at.group,at.port,from,index,n,min):0};}};
  },resources:function(c){var out=[];Object.keys(c.board.eioFluid||{}).forEach(function(cell){for(var side=0;side<4;side++)out.push(receiver(c.board,c.index,cell,side));});return out;}});
 SIMULATION.registerAfterMachines('eio',tick);
 root.EIO_TRANSPORT={tick:tick};
})(typeof window!=='undefined'?window:globalThis);
