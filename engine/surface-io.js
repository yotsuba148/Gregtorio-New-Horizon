/* Shared inventories exposed at individual faces of a built-in multiblock. */
(function(root){
 'use strict';
 function supported(m){var s=root.MULTIBLOCKS&&MULTIBLOCKS.shape(m),p=s&&STRUCTURES.profile(m),d=s&&DEFS.of(m.k);return !!(s&&s.builtinFaces&&!MULTIBLOCKS.managed(m)&&!p.endpoint&&!d.noFaceSettings);}
 function face(m,id){return MULTIBLOCKS.faces(m).find(function(f){return f.id===id;})||null;}
 function middle(m,side){var s=MULTIBLOCKS.shape(m),p=[[Math.floor(s.w/2),0],[s.w-1,Math.floor(s.h/2)],[Math.floor(s.w/2),s.h-1],[0,Math.floor(s.h/2)]][side];return p[0]+','+p[1]+','+side;}
 function ensure(m){if(!supported(m))return;if(!m.surfaceCovers)m.surfaceCovers={};if(m.surfaceIoVersion!==1){Object.keys(m.covers||{}).forEach(function(side){var c=m.covers[side];if(c&&+side>=0&&+side<4)m.surfaceCovers[middle(m,+side)]=c;});m.covers={};m.surfaceIoVersion=1;}Object.values(m.surfaceCovers).forEach(MACHINE_COVERS.normalizeCover);if(!face(m,m.outputSurface))m.outputSurface=middle(m,Number.isInteger(m.outFace)?m.outFace:1);}
 function output(m,id){ensure(m);var f=face(m,id);if(!f)return false;m.outputSurface=id;m.outFace=f.side;return true;}
 function decorate(m,v,x,y,side){ensure(m);var id=MULTIBLOCKS.localFace(m,x,y,side).id,exit=id===m.outputSurface;v._surfaceFace=id;v.outFace=exit?side:(side+2)%4;return v;}
 function cover(m,id){ensure(m);return m.surfaceCovers[id]||null;}
 function endpoint(S,r){var m=ENTITIES.get(S,r.uid);if(!m||!ENTITIES.active(m)||!supported(m)||!face(m,r.face))return null;ensure(m);return{id:JSON.stringify(r),ref:r,get:function(){var c=cover(m,r.face);return c?{k:c.k,n:1}:null;},snapshot:function(){return GTTransactions.clone(cover(m,r.face));},restoreConfiguration:function(c){if(c&&cover(m,r.face)?.k===c.k)m.surfaceCovers[r.face]=GTTransactions.clone(c);},set:function(v){if(!v)delete m.surfaceCovers[r.face];else{var d=MACHINE_COVERS.spec(v.k),old=cover(m,r.face);m.surfaceCovers[r.face]=Object.assign({},d,{side:face(m,r.face).side,mode:old&&old.k===v.k?old.mode:'export'});}},accepts:function(s){return !s.entityUid&&MACHINE_COVERS.accepts(s.k);},locked:function(){return false;},cap:function(){return 1;}};}
 function configure(m,id,values){return MACHINE_COVERS.configureCover(cover(m,id),typeof values==='string'?{mode:values}:values).ok;}
 root.SURFACE_IO={supported:supported,face:face,middle:middle,ensure:ensure,output:output,decorate:decorate,cover:cover,endpoint:endpoint,configure:configure};
 ITEM_TRANSFER.register('surfaceCover',endpoint);
})(typeof window!=='undefined'?window:globalThis);
