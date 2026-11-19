 
 
 
 
 
 
 
(function () {
  'use strict';

  window.GD = window.GD || {};
  window.GD.fuels = {
     
    'gregtech:gt.metaitem.01@30003': { eu: 192000, verified: true, cn: '乙醇单元' },
    'gregtech:gt.metaitem.01@30013': { eu: 320000, verified: true, cn: '生物柴油单元' },

    /* 固体燃料：数值未核，先按 GT 常见值放这儿，别当真 */
    'minecraft:coal@0': { eu: 1600, verified: false, cn: '煤' },
    'minecraft:charcoal@0': { eu: 1600, verified: false, cn: '木炭' }
  };
})();
