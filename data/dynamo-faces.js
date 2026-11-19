/* 动力仓正面图标：机壳底 + 电压色边框 + 安数条。 */
(function () {
  'use strict';
  window.GD = window.GD || {};
  GD.faceIcons = GD.faceIcons || {};
  GD.gridFaceIcons = GD.gridFaceIcons || {};
  var map = {
  "gregtech:gt.blockmachines@30": "modicons/dynamo/dynamo-ULV-1A.png",
  "gregtech:gt.blockmachines@31": "modicons/dynamo/dynamo-LV-1A.png",
  "gregtech:gt.blockmachines@32": "modicons/dynamo/dynamo-MV-1A.png",
  "gregtech:gt.blockmachines@33": "modicons/dynamo/dynamo-HV-1A.png",
  "gregtech:gt.blockmachines@34": "modicons/dynamo/dynamo-EV-1A.png",
  "gregtech:gt.blockmachines@35": "modicons/dynamo/dynamo-IV-1A.png",
  "gregtech:gt.blockmachines@36": "modicons/dynamo/dynamo-LuV-1A.png",
  "gregtech:gt.blockmachines@37": "modicons/dynamo/dynamo-ZPM-1A.png",
  "gregtech:gt.blockmachines@38": "modicons/dynamo/dynamo-UV-1A.png",
  "gregtech:gt.blockmachines@39": "modicons/dynamo/dynamo-UHV-1A.png",
  "gregtech:gt.blockmachines@11290": "modicons/dynamo/dynamo-UEV-1A.png",
  "gregtech:gt.blockmachines@11291": "modicons/dynamo/dynamo-UIV-1A.png",
  "gregtech:gt.blockmachines@11292": "modicons/dynamo/dynamo-UMV-1A.png",
  "gregtech:gt.blockmachines@11293": "modicons/dynamo/dynamo-UXV-1A.png",
  "gregtech:gt.blockmachines@15200": "modicons/dynamo/dynamo-IV-4A.png",
  "gregtech:gt.blockmachines@15201": "modicons/dynamo/dynamo-LuV-4A.png",
  "gregtech:gt.blockmachines@15202": "modicons/dynamo/dynamo-ZPM-4A.png",
  "gregtech:gt.blockmachines@15203": "modicons/dynamo/dynamo-UV-4A.png",
  "gregtech:gt.blockmachines@15204": "modicons/dynamo/dynamo-UHV-4A.png",
  "gregtech:gt.blockmachines@15205": "modicons/dynamo/dynamo-UEV-4A.png",
  "gregtech:gt.blockmachines@15206": "modicons/dynamo/dynamo-UIV-4A.png",
  "gregtech:gt.blockmachines@15207": "modicons/dynamo/dynamo-UMV-4A.png",
  "gregtech:gt.blockmachines@15208": "modicons/dynamo/dynamo-UXV-4A.png",
  "gregtech:gt.blockmachines@15209": "modicons/dynamo/dynamo-EV-4A.png",
  "gregtech:gt.blockmachines@15210": "modicons/dynamo/dynamo-IV-16A.png",
  "gregtech:gt.blockmachines@15211": "modicons/dynamo/dynamo-LuV-16A.png",
  "gregtech:gt.blockmachines@15212": "modicons/dynamo/dynamo-ZPM-16A.png",
  "gregtech:gt.blockmachines@15213": "modicons/dynamo/dynamo-UV-16A.png",
  "gregtech:gt.blockmachines@15214": "modicons/dynamo/dynamo-UHV-16A.png",
  "gregtech:gt.blockmachines@15215": "modicons/dynamo/dynamo-UEV-16A.png",
  "gregtech:gt.blockmachines@15216": "modicons/dynamo/dynamo-UIV-16A.png",
  "gregtech:gt.blockmachines@15217": "modicons/dynamo/dynamo-UMV-16A.png",
  "gregtech:gt.blockmachines@15218": "modicons/dynamo/dynamo-UXV-16A.png",
  "gregtech:gt.blockmachines@15219": "modicons/dynamo/dynamo-EV-16A.png",
  "gregtech:gt.blockmachines@15220": "modicons/dynamo/dynamo-IV-64A.png",
  "gregtech:gt.blockmachines@15221": "modicons/dynamo/dynamo-LuV-64A.png",
  "gregtech:gt.blockmachines@15222": "modicons/dynamo/dynamo-ZPM-64A.png",
  "gregtech:gt.blockmachines@15223": "modicons/dynamo/dynamo-UV-64A.png",
  "gregtech:gt.blockmachines@15224": "modicons/dynamo/dynamo-UHV-64A.png",
  "gregtech:gt.blockmachines@15225": "modicons/dynamo/dynamo-UEV-64A.png",
  "gregtech:gt.blockmachines@15226": "modicons/dynamo/dynamo-UIV-64A.png",
  "gregtech:gt.blockmachines@15227": "modicons/dynamo/dynamo-UMV-64A.png",
  "gregtech:gt.blockmachines@15228": "modicons/dynamo/dynamo-UXV-64A.png",
  "gregtech:gt.blockmachines@15229": "modicons/dynamo/dynamo-EV-64A.png"
  };
  Object.keys(map).forEach(function (k) { GD.faceIcons[k] = map[k]; GD.gridFaceIcons[k] = map[k]; });
})();
