(function() {
  'use strict';
  var key = 'gregtech:gt.blockmachines@19077';
  var dir = 'modicons/nether-interface/';
  var idle = dir + 'front.png';
  GD.faceIcons[key] = GD.gridFaceIcons[key] = idle;
  GD.workingFaces[key] = { idle: idle, active: dir + 'active.png' };
  Object.assign(GD.nativeBlockFaces, {
    'gregtech:gt.blockframes@804': dir + 'obsidian-frame.png',
    'TwistSpaceTechnology:MetaBlockCasing02@5': dir + 'reinforced-obsidian.png'
  });
})();
