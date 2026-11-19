/* Data for the 2D structures and the original reactor tiers. */
(function(root){
 'use strict';
 var ringSize=15,rows=[],fluidFaces=new Set();
 var leftShoulder=[[3,1,0],[4,1,0],[1,3,3],[1,4,3]];
 var cornerFaces=[[3,1,3],[2,2,0],[2,2,3],[1,3,0]];
 function face(x,y,side){return x+','+y+','+side;}
 function rotatedFaces(positions){
  var result=new Set();
  positions.forEach(function(p){
   var x=p[0],y=p[1],side=p[2];
   for(var i=0;i<4;i++){
    result.add(face(x,y,side));
    var next=ringSize-1-y;y=x;x=next;side=(side+1)%4;
   }
  });
  return result;
 }
 for(var y=0;y<ringSize;y++){
  var row='';
  for(var x=0;x<ringSize;x++){
   var distance=Math.hypot(x-7,y-7);
   row+=x===7&&y===14?'C':distance>=5&&distance<=7.4?(distance<6.1?'h':'s'):' ';
  }
  rows.push(row);
 }
 for(var i=5;i<=9;i++){
  fluidFaces.add(face(i,0,0)).add(face(14,i,1)).add(face(0,i,3));
  if(i!==7)fluidFaces.add(face(i,14,2));
 }
 var normal=rotatedFaces(leftShoulder),compressed=rotatedFaces(leftShoulder.concat(cornerFaces));
 var cooled='gregtech:gt.blockcasings4@7';
 var casings=['gregtech:gt.blockcasings@6','gregtech:gt.blockcasings4@6','gregtech:gt.blockcasings4@8',
  'miscutils:gtplusplus.blockcasings.3@12','miscutils:gtplusplus.blockcasings.6@0'];
 var coils=['gregtech:gt.blockcasings@15',cooled,cooled,'miscutils:gtplusplus.blockcasings.3@13','miscutils:gtplusplus.blockcasings.6@1'];
 var standard=[1193,1194,1195,965,975],normalCapacity=[160003000,320006000,640010000,5120080000,20480320000];
 var ignitionCapacity=[160000000,320000000,640000000,5120000000,20480000000];
 var frameMetas=[325,263,129,394,397],glassMetas=[3,4,5,13,14];
 var machines=[];
 standard.forEach(function(meta,i){
  machines.push({meta:meta,id:'fusionmk'+['i','ii','iii','iv','v'][i],level:i,tier:i+6,energyFaces:normal,
   fullCapacity:normalCapacity[i],materials:[[casings[i],123],[coils[i],32]],coil:coils[i],parallel:false});
  var coil='GoodGenerator:compactFusionCoil@'+i,glass='bartworks:BW_GlasBlocks@'+glassMetas[i];
  machines.push({meta:32019+i,id:'compressedfusionmk'+['i','ii','iii','iv','v'][i],level:i,tier:i+6,energyFaces:compressed,
   fullCapacity:ignitionCapacity[i],materials:[[casings[i],1664],[coil,560],['gregtech:gt.blockframes@'+frameMetas[i],128],[glass,63]],
   coil:coil,glass:glass,parallel:true});
 });
 root.FUSION_STRUCTURE={pattern:rows,face:face,fluidFaces:fluidFaces,machines:machines,ignitionCapacity:ignitionCapacity};
})(typeof window!=='undefined'?window:globalThis);
