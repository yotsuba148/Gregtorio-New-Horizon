(function(root){
 'use strict';
 var caches=new WeakMap(),localRoutes=new WeakMap(),near=TRANSPORT_PORTS.near;
 function compatible(a,b){var x=EIO_CONTENT.spec(a.pipeKey),y=EIO_CONTENT.spec(b.pipeKey);return x.kind===y.kind&&(x.kind==='eioItem'||x.tier===y.tier);}
 function target(b,kind,cell,d,idx){var p=b[kind]&&b[kind][cell];if(!p)return false;var n=near(cell,d),xy=n.split(',').map(Number);if(xy[0]<0||xy[1]<0||xy[0]>=b.width||xy[1]>=b.height)return false;
  if(b[kind][n])return compatible(p,b[kind][n]);if(!p.faces[d].insert.enabled&&!p.faces[d].extract.enabled)return false;return CONTAINER_ACCESS.supports(b,idx||CONTAINER_ACCESS.index(b),n,(d+2)%4,EIO_CONTENT.spec(p.pipeKey).medium);
 }
 function connected(b,kind,cell,d,idx){if(!target(b,kind,cell,d,idx)||!(b[kind][cell].connections&1<<d))return false;var p=b[kind][near(cell,d)];return !p||!!(p.connections&1<<((d+2)%4));}
 function components(b,kind,idx){var nodes=b[kind],signature=Object.keys(nodes).map(function(c){return[c,nodes[c].pipeKey,nodes[c].connections].join(':');}).join('|'),old=caches.get(nodes),groups;
  if(old&&old.signature===signature)groups=old.groups;else{groups=[];var seen=new Set();Object.keys(nodes).sort().forEach(function(c){if(seen.has(c))return;var list=[c];seen.add(c);for(var i=0;i<list.length;i++)for(var d=0;d<4;d++){var n=near(list[i],d);if(nodes[n]&&!seen.has(n)&&compatible(nodes[list[i]],nodes[n])&&(nodes[list[i]].connections&1<<d)&&(nodes[n].connections&1<<((d+2)%4))){seen.add(n);list.push(n);}}groups.push({cells:list,distances:new Map()});});caches.set(nodes,{signature:signature,groups:groups});}
  return groups.map(function(g){var ports=[];g.cells.forEach(function(cell){for(var d=0;d<4;d++){var n=near(cell,d);if(nodes[n]||!connected(b,kind,cell,d,idx))continue;ports.push({id:kind+':'+cell+':'+d,kind:kind,cell:cell,side:d,target:n,targetSide:(d+2)%4,node:nodes[cell],face:nodes[cell].faces[d],spec:EIO_CONTENT.spec(nodes[cell].pipeKey)});}});return{cells:g.cells,ports:ports,distances:g.distances};});
 }
 function distance(b,group,source,target){var map=group.distances.get(source);if(!map){map=new Map([[source,0]]);var todo=[source],kind=group.ports[0].kind;for(var i=0;i<todo.length;i++)for(var d=0;d<4;d++){var n=near(todo[i],d);if(b[kind][n]&&!map.has(n)&&connected(b,kind,todo[i],d,{})){map.set(n,map.get(todo[i])+1);todo.push(n);}}group.distances.set(source,map);}return map.get(target)||0;}
 function ingress(board,kind,cell,side){
  var nodes=board[kind],node=nodes[cell];
  if(!node||!(node.connections&1<<side)||!node.faces[side].extract.enabled||nodes[near(cell,side)])return null;
  var byCell=localRoutes.get(nodes);
  if(!byCell){byCell=new Map();localRoutes.set(nodes,byCell);}
  var group=byCell.get(cell);
  if(!group){
   var cells=[cell],seen=new Set(cells),ports=[],faces=new Map();
   for(var coordinate of cells){
    var pipe=nodes[coordinate],spec=EIO_CONTENT.spec(pipe.pipeKey);
    for(var d=0;d<4;d++){
     if(!(pipe.connections&1<<d))continue;
     var next=near(coordinate,d),other=nodes[next],opposite=(d+2)%4;
     if(other){
      if(!seen.has(next)&&(other.connections&1<<opposite)&&compatible(pipe,other)){cells.push(next);seen.add(next);}
      continue;
     }
     // Machine ownership and port settings are resolved at the time of transfer.
     var id=kind+':'+coordinate+':'+d,port={id:id,kind:kind,cell:coordinate,side:d,target:next,targetSide:opposite,node:pipe,face:pipe.faces[d],spec:spec};
     ports.push(port);faces.set(id,port);
    }
   }
   group={cells:cells,ports:ports,faces:faces,distances:new Map()};
   cells.forEach(function(c){byCell.set(c,group);});
  }
  return {group:group,port:group.faces.get(kind+':'+cell+':'+side)};
 }
 function edited(board,kind,cell){
  var byCell=localRoutes.get(board[kind]);if(!byCell)return;
  var affected=new Set([byCell.get(cell)]);
  for(var side=0;side<4;side++)affected.add(byCell.get(near(cell,side)));
  affected.forEach(function(group){if(group)group.cells.forEach(function(c){byCell.delete(c);});});
 }
 root.EIO_TOPOLOGY={target:target,connected:connected,components:components,distance:distance,ingress:ingress,edited:edited};
})(typeof window!=='undefined'?window:globalThis);
