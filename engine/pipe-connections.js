(function(root){
 'use strict';
 var kinds=['item','fluid','wire'],dirs=[[0,-1],[1,0],[0,1],[-1,0]];
 function point(cell){return String(cell).split(',').map(Number);}
 function near(cell,side){var p=point(cell);return(p[0]+dirs[side][0])+','+(p[1]+dirs[side][1]);}
 function machine(f,cell,idx){if(idx)return idx[cell]||null;var p=point(cell);return(f.machines||[]).find(function(m){return ENTITIES.isGrid(m)&&(root.MULTIBLOCKS?MULTIBLOCKS.occupies(m,p[0],p[1]):m.x===p[0]&&m.y===p[1]);})||null;}
 function capable(m,kind){var d=root.STRUCTURES?STRUCTURES.instance(m):DEFS.of(m.k);if(!d||d.manualLogistics)return false;if(kind==='wire')return !!d.generator||d.energyCapacity>0;return kind==='item'?!!(d.slots&&(d.slots.in||d.slots.out)):!!((d.fluidInputTanks||[]).length||(d.fluidOutputTanks||[]).length||d.steamPowered||d.sharedFluidStorage);}
 function target(f,kind,cell,side,idx){if(!kinds.includes(kind)||!Number.isInteger(side)||side<0||side>3||!f[kind]||!f[kind][cell])return false;var n=near(cell,side),p=point(n);if(p[0]<0||p[1]<0||p[0]>=f.w||p[1]>=f.h)return false;if(f[kind][n])return true;if(kind!=='wire'&&root.TRANSPORT_PORTS&&root.ENGINE&&ENGINE.networks){var registered=TRANSPORT_PORTS.supports(ENGINE.networks,f,idx||ENGINE.networks.grid(f),n,(side+2)%4,kind);if(registered!==undefined)return registered;}if(kind==='item'&&f.chest&&f.chest[n])return true;var m=machine(f,n,idx);if(m&&root.MULTIBLOCKS&&MULTIBLOCKS.managed(m))return MULTIBLOCKS.accepts(m,p[0],p[1],(side+2)%4,kind);if(m&&STRUCTURES.profile(m)&&STRUCTURES.profile(m).endpoint)return !!MULTIBLOCKS.endpoint(m,p[0],p[1],(side+2)%4,kind);var d=m&&DEFS.of(m.k);if(d&&d.generator&&!d.multiblock){var power=(side+2)%4===(m.outFace==null?1:m.outFace);if(kind==='wire'&&!power||kind!=='wire'&&power)return false;}return !!m&&capable(m,kind);}
 function mask(f,kind,cell,idx){var p=f[kind]&&f[kind][cell];if(!p)return 0;if(Number.isInteger(p.connections))return p.connections&15;var bits=0;for(var d=0;d<4;d++)if(target(f,kind,cell,d,idx))bits|=1<<d;return bits;}
 function connected(f,kind,cell,side,idx){if(!target(f,kind,cell,side,idx)||!(mask(f,kind,cell,idx)&1<<side))return false;var n=near(cell,side);return !f[kind][n]||!!(mask(f,kind,n,idx)&1<<((side+2)%4));}
 function freeze(f,kind,cell,idx){var p=f[kind]&&f[kind][cell];if(!p)return null;var bits=mask(f,kind,cell,idx);if(typeof p!=='object')p=f[kind][cell]={};p.connections=bits;return p;}
 function set(f,kind,cell,side,on,idx){if(!target(f,kind,cell,side,idx))return{ok:false,code:'TARGET'};var p=freeze(f,kind,cell,idx),n=near(cell,side),q=freeze(f,kind,n,idx),bit=1<<side,opposite=1<<((side+2)%4);p.connections=on?p.connections|bit:p.connections&~bit;if(q)q.connections=on?q.connections|opposite:q.connections&~opposite;return{ok:true,connected:!!on};}
 function board(S,id){var f=BLUEPRINTS.ensure(S),b=id?f.blueprints.find(function(b){return b.id===id;}):BLUEPRINTS.activeRepo(f);return b?BLUEPRINTS.view(f,b):null;}
 function prepare(S,cell,id){var f=board(S,id);if(!f)return;kinds.forEach(function(kind){freeze(f,kind,cell);for(var d=0;d<4;d++)freeze(f,kind,near(cell,d));});}
 function placed(S,cell,kind,id){if(!S.fx||S.fx.autoConnect!==true)return;var f=board(S,id);if(!f)return;(kind?[kind]:kinds).forEach(function(k){if(kind){for(var d=0;d<4;d++)if(target(f,k,cell,d))set(f,k,cell,d,true);}else for(var d=0;d<4;d++){var n=near(cell,d),op=(d+2)%4;if(target(f,k,n,op))set(f,k,n,op,true);}});}
 function detach(S,cell,only,id){var f=board(S,id);if(!f)return;(only?[only]:kinds).forEach(function(kind){if(!only&&f[kind][cell])return;for(var d=0;d<4;d++){var n=near(cell,d),p=freeze(f,kind,n);if(p)p.connections&=~(1<<((d+2)%4));}});}
 function migrate(S){
  if(!S.fx)return;
  BLUEPRINTS.views(BLUEPRINTS.ensure(S)).forEach(function(b){
   var idx=root.MULTIBLOCKS?MULTIBLOCKS.index(b):{};
   kinds.forEach(function(kind){Object.keys(b[kind]).forEach(function(cell){var p=b[kind][cell];if(!Number.isInteger(p.connections))freeze(b,kind,cell,idx);});});
  });
 }
 function pruneCovers(S){
  if(!S.fx)return;
  BLUEPRINTS.views(BLUEPRINTS.ensure(S)).forEach(function(b){
   kinds.forEach(function(kind){Object.values(b[kind]||{}).forEach(function(node){
    if(!node||!node.covers)return;var seen=new Set(),list=Array.isArray(node.covers)?node.covers:Object.entries(node.covers).map(function(entry){var c=entry[1];return c&&Object.assign({},c,{side:c.side==null?Number(entry[0]):c.side});});
    node.covers=list.filter(function(c){
     var spec=c&&COMMANDS.coverSpec(c.k);
     if(!spec||spec.kind!==kind||!Number.isInteger(c.side)||c.side<0||c.side>3||seen.has(c.side))return false;
     seen.add(c.side);var period=Math.max(spec.period,c.period||0);Object.assign(c,spec,{period:period});return true;
    });
   });});
  });
 }
 function command(S,kind,cell,side,on){var f=board(S);return f?set(f,kind,cell,side,!!on):{ok:false,code:'BLUEPRINT'};}
 function kindsAt(S,cell){var f=board(S);if(!f)return [];return kinds.filter(function(k){return !!(f[k]&&f[k][cell]);});}
 function maskAt(S,kind,cell){var f=board(S);return f?mask(f,kind,cell):0;}
 root.PIPE_CONNECTIONS={near:near,mask:mask,target:target,connected:connected,set:command,kindsAt:kindsAt,maskAt:maskAt,prepare:prepare,placed:placed,detach:detach,pruneCovers:pruneCovers,migrate:migrate};
})(typeof window!=='undefined'?window:globalThis);
