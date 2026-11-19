(function(){
  GD.gridFaceIcons=GD.gridFaceIcons||{};
  GD.workingFaces=GD.workingFaces||{};
  GD.faceIcons['GalacticraftMars:tile.creeperEgg@0']='modicons/egg-machines/creeper-egg.png';
  for(var meta=25001;meta<=25011;meta++){
    var key='gregtech:gt.blockmachines@'+meta;
    var face='modicons/egg-machines/'+meta;
    GD.faceIcons[key]=GD.gridFaceIcons[key]=face+'.png';
    GD.workingFaces[key]={idle:face+'.png',active:face+'-active.png'};
  }
})();
