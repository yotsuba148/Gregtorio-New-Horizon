(function(){
 'use strict';
 var refinery='gregtech:gt.blockmachines@849',reservoir='RIO:tile.machine@0',base='modicons/native-utilities/';
 var idle=base+'thermal-refinery-idle.png';
 GD.workingFaces[refinery]={
  front:idle,idle:idle,active:base+'thermal-refinery-active.png',
  activeStill:base+'thermal-refinery-active-still.png',animation:{frames:8,durationMs:1200}
 };
 GD.faceIcons[refinery]=GD.gridFaceIcons[refinery]=idle;
 GD.faceIcons[reservoir]=GD.gridFaceIcons[reservoir]=base+'remoteio-reservoir.png';
 STRUCTURES.profile({k:refinery}).controllerIcon=idle;
})();
