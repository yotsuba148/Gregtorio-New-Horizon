/* GTNH 2.8.4 reactor fronts, compact coils, and hatch faces. */
(function(){
 'use strict';
 var dir='modicons/fusion/',key='gregtech:gt.blockmachines@';
 function face(k,file){GD.faceIcons[k]=GD.gridFaceIcons[k]=dir+file+'.png';}
 FUSION_STRUCTURE.machines.forEach(function(spec){
  var id=spec.level+1,k=key+spec.meta;
  face(k,id+'-idle');
  var frames=spec.level<3?4:spec.level===3?16:40;
  var ticks=spec.level<3||spec.level===4?8:1;
  GD.workingFaces[k]={idle:dir+id+'-idle.png',active:dir+id+'-active.png',
   activeStill:dir+id+'-still.png',animation:{frames:frames,durationMs:frames*ticks*50}};
  if(spec.parallel)GD.nativeBlockFaces[spec.coil]=dir+'coil-'+spec.level+'.png';
 });
 [13,14].forEach(function(meta){GD.nativeBlockFaces['bartworks:BW_GlasBlocks@'+meta]=dir+'glass-'+meta+'.png';});
 [11300,11301,11302,11303,12737,12799].forEach(function(meta){face(key+meta,String(meta));});
 [12097,12098,12099,12100,12102,12103,12104,12105,12106,12108].forEach(function(meta){
  GD.faceIcons[key+meta]=GD.gridFaceIcons[key+meta]='modicons/face/'+meta+'.png';
 });
 for(var tier=6;tier<=10;tier++)for(var ampIndex=0;ampIndex<3;ampIndex++){
  var meta=15095+tier+ampIndex*10;
  face(key+meta,String(meta));
 }
})();
