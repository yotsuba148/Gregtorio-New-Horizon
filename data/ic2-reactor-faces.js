/* 核反应堆正面图标：用 IC2 原版方块贴图。 */
(function () {
  'use strict';
  window.GD = window.GD || {};
  GD.faceIcons = GD.faceIcons || {};
  GD.gridFaceIcons = GD.gridFaceIcons || {};
  var front = 'modicons/ic2/reactor-front64.png';
  GD.faceIcons['IC2:blockGenerator@5'] = front;
  GD.gridFaceIcons['IC2:blockGenerator@5'] = front;
  var side = 'modicons/ic2/reactor-side64.png';
  GD.faceIcons['IC2:blockReactorChamber@0'] = side;
  GD.gridFaceIcons['IC2:blockReactorChamber@0'] = side;
  GD.nativeBlockFaces = GD.nativeBlockFaces || {};
  GD.nativeBlockFaces['IC2:blockReactorChamber@0'] = 'modicons/ic2/reactor-side64.png';
})();

/* 自绘外形的多方块，不走图案预览。 */
GD.selfDrawnMultiblocks = GD.selfDrawnMultiblocks || [
  'TConstruct:Smeltery@0',
  'Railcraft:machine.beta@5',
  'Railcraft:machine.beta@6',
  'Railcraft:machine.beta@2',
  'Railcraft:machine.beta@15'
];
