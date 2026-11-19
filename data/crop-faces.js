/* Publish crop visuals after the shared face registries have loaded. */
(function () {
  'use strict';
  for (const [key, faces] of Object.entries(GD.cropsNH.machineFaces)) {
    GD.gridFaceIcons[key] = faces.idle;
    GD.workingFaces[key] = faces;
  }
  const { bed, casing } = GD.cropsNH.devices;
  GD.nativeBlockFaces = GD.nativeBlockFaces || {};
  for (const key of [casing, ...GD.cropsNH.equipment.bedTiers.map(bed)]) {
    GD.nativeBlockFaces[key] = GD.faceIcons[key];
  }
})();
