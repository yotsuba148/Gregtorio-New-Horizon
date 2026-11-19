(function(root){
 'use strict';
 var kinds=['eioItem','eioFluid'],prepared=new WeakSet();
 BLUEPRINTS.registerLayers(kinds);
 function face(){return{insert:{enabled:true,color:2},extract:{enabled:false,color:2},upgrades:[null],filters:[null,null],cooldown:0,nextSlot:0};}
 function node(k){return{pipeKey:k,connections:15,faces:[face(),face(),face(),face()],schema:1};}
 function ensureNode(p,kind){
  var spec=p&&EIO_CONTENT.spec(p.pipeKey);if(!spec||spec.kind!==kind)throw Error('Invalid EIO conduit');
  if(!p.faces)p.faces=[face(),face(),face(),face()];
  if(p.faces.length!==4)throw Error('Invalid EIO interfaces');
  p.faces.forEach(function(f){if(!f.insert||!f.extract||!Array.isArray(f.filters)||!Array.isArray(f.upgrades))throw Error('Invalid EIO interface');
   ['insert','extract'].forEach(function(flow){if(!Number.isInteger(f[flow].color)||f[flow].color<0||f[flow].color>15)throw Error('Invalid EIO channel');});
   if(kind==='eioFluid'){['insert','extract'].forEach(function(flow){if(!f[flow].samples)f[flow].samples=Array(5).fill(null);if(f[flow].whitelist==null)f[flow].whitelist=true;});}
  });return p;
 }
 function ensure(S){var f=BLUEPRINTS.ensure(S);f.blueprints.forEach(function(b){kinds.forEach(function(kind){Object.keys(b[kind]).forEach(function(cell){var p=b[kind][cell];if(!prepared.has(p)){ensureNode(p,kind);prepared.add(p);}});});});return f;}
 function board(S,id){var f=ensure(S);return f.blueprints.find(function(b){return b.id===(id||f.activeBlueprintId);});}
 function get(S,id,kind,cell){var b=board(S,id);return b&&b[kind]&&b[kind][cell]||null;}
 function contents(p){var out=[{k:p.pipeKey,n:1}];p.faces.forEach(function(f){f.filters.concat(f.upgrades).forEach(function(s){if(s)out.push(GTTransactions.clone(s));});});return out;}
 function place(S,kind,cell,k,source){var spec=EIO_CONTENT.spec(k);if(!spec||spec.kind!==kind)return{ok:false,code:'DEFINITION'};var xy=cell.split(',').map(Number),space=GRID_SPACE.check(S,{x:xy[0],y:xy[1]},{kind:kind});if(!space.ok)return space;
  var r;if(source&&Number.isInteger(source.bagIndex)){var s=S.inv[source.bagIndex];if(!s||s.entityUid||CONTENT.canonicalKey(s.k)!==k||!(s.n>0))return{ok:false,code:'INPUT'};if(--s.n===0)S.inv[source.bagIndex]=null;r={ok:true};}else r=COMMANDS.exchange(S,[{k:k,n:1}],[]);if(!r.ok)return r;
   var b=board(S);b[kind][cell]=node(k);ensureNode(b[kind][cell],kind);EIO_TOPOLOGY.edited(b,kind,cell);return{ok:true,placed:true};
 }
  function remove(S,kind,cell){var b=board(S),p=b[kind][cell];if(!p)return{ok:false,code:'EMPTY'};var items=contents(p);return COMMANDS.returnGroups(S,[{items:[items[0]],drops:true},{items:items.slice(1),ground:true}],{release:function(){delete b[kind][cell];EIO_TOPOLOGY.edited(b,kind,cell);}});}
 function cfg(S,id,kind,cell,side,flow,values){var p=get(S,id,kind,cell);if(!p||!Number.isInteger(side)||side<0||side>3||!['insert','extract'].includes(flow))return{ok:false,code:'INTERFACE'};
  if(values.color!=null&&(!Number.isInteger(values.color)||values.color<0||values.color>15)||values.priority!=null&&(!Number.isSafeInteger(values.priority)||flow!=='insert'||kind!=='eioItem'))return{ok:false,code:'CONFIG'};
  var c=p.faces[side][flow];['enabled','color','priority','whitelist'].forEach(function(k){if(values[k]!=null)c[k]=values[k];});return{ok:true};
 }
 ITEM_STORES.registerState('eio-upgrades',function(S){var out=[];if(!S.fx)return out;ensure(S).blueprints.forEach(function(b){kinds.forEach(function(k){Object.entries(b[k]).forEach(function(entry){var p=entry[1];out.push(ITEM_STORES.view('eio-node:'+b.id+':'+k+':'+entry[0],null,[{k:p.pipeKey,n:1}],{recover:false}));p.faces.forEach(function(f,d){['filters','upgrades'].forEach(function(field){out.push(ITEM_STORES.view('eio:'+b.id+':'+k+':'+entry[0]+':'+d+':'+field,f[field],f[field]));});});});});});return out;});
 root.EIO_STATE={kinds:kinds,node:node,ensure:ensure,board:board,get:get,place:place,remove:remove,configure:cfg,contents:contents};
 GRID_TRANSPORTS.register({id:'eio',layers:kinds,definition:EIO_CONTENT.spec,place:place,remove:remove,
   target:function(b,k,c,d,idx){return EIO_TOPOLOGY.target(b,k,c,d,idx);},connected:function(b,k,c,d,idx){return EIO_TOPOLOGY.connected(b,k,c,d,idx);},
   set:function(S,k,c,d,on){
    var b=board(S),p=b[k][c];if(!p)return{ok:false,code:'EMPTY'};
    if(!EIO_TOPOLOGY.target(b,k,c,d))return{ok:false,code:'TARGET'};
    var bit=1<<d,n=b[k][TRANSPORT_PORTS.near(c,d)],opposite=1<<((d+2)%4);
    if(!!(p.connections&bit)!==on||n&&!!(n.connections&opposite)!==on){
     p.connections=on?p.connections|bit:p.connections&~bit;
     if(n)n.connections=on?n.connections|opposite:n.connections&~opposite;
     EIO_TOPOLOGY.edited(b,k,c);
    }
    return{ok:true};
   }
 });
 GRID_SPACE.registerConstraint('eio-pipe-family',function(S,m,opt,b,all){var kind=opt.kind;
  if(!['eioItem','eioFluid','item','fluid'].includes(kind))return null;
  var opposite=kind==='item'||kind==='fluid'?['eioItem','eioFluid']:['item','fluid'];
  return all.some(function(c){return opposite.some(function(k){return !!b[k][c.x+','+c.y];});})?{ok:false,code:'EIO_GT_CONFLICT'}:null;
 });
})(typeof window!=='undefined'?window:globalThis);
