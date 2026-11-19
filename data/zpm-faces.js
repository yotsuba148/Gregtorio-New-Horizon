(function(){
 'use strict';
 var dir='modicons/zpm/',machines={9405:'flocculation',3006:'hip',997:'algae-pond'};
 Object.keys(machines).forEach(function(meta){
  var key='gregtech:gt.blockmachines@'+meta,face=dir+machines[meta];
  GD.faceIcons[key]=GD.gridFaceIcons[key]=face+'.png';
  GD.workingFaces[key]={idle:face+'.png',active:face+'-active.png'};
 });
 Object.assign(GD.nativeBlockFaces,{
  'gregtech:gt.blockcasings9@6':dir+'flocculation-casing.png',
  'gregtech:gt.blockcasings10@9':dir+'coolant-duct.png',
  'gregtech:gt.blockcasings10@10':dir+'heating-duct.png',
  'gregtech:gt.blocktintedglass@0':dir+'tinted-industrial-glass.png'
 });
})();
