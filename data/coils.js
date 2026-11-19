/* 炉温档位（线圈）；数值取 GT HeatingCoilLevel.getHeat() = 1 + 900 × 序号。 */
(function () {
  'use strict';
  window.GD = window.GD || {};
  window.GD.coils = [
    { id: 0, cn: '无', tier: '', heat: 0 },
    { id: 1, meta: 0, cn: '白铜', tier: 'LV', heat: 1801 },
    { id: 2, meta: 1, cn: '坎塔尔合金', tier: 'MV', heat: 2701 },
    { id: 3, meta: 2, cn: '镍铬合金', tier: 'HV', heat: 3601 },
    { id: 4, meta: 3, cn: '钛铂钒合金', tier: 'EV', heat: 4501 },
    { id: 5, meta: 4, cn: '高速钢-G', tier: 'IV', heat: 5401 },
    { id: 6, meta: 9, cn: '高速钢-S', tier: 'LuV', heat: 6301 },
    { id: 7, meta: 5, cn: '硅岩', tier: 'ZPM', heat: 7201 },
    { id: 8, meta: 6, cn: '硅岩合金', tier: 'UV', heat: 8101 },
    { id: 9, meta: 10, cn: '三钛', tier: 'UHV', heat: 9001 },
    { id: 10, meta: 7, cn: '琥珀金', tier: 'UEV', heat: 9901 },
    { id: 11, meta: 8, cn: '觉醒龙', tier: 'UIV', heat: 10801 },
    { id: 12, meta: 11, cn: '无尽催化剂', tier: 'UMV', heat: 11701 },
    { id: 13, meta: 12, cn: '海伯根', tier: 'UXV', heat: 12601 },
    { id: 14, meta: 13, cn: '永恒', tier: 'MAX', heat: 13501 }
  ];
  // Structure grades follow heat order, while the item's metadata follows BlockCasings5.
  var grades = window.GD.coils.slice(1).map(function (coil) {
    return Object.assign({ key: 'gregtech:gt.blockcasings5@' + coil.meta }, coil);
  });
  window.HEATING_COILS = { grades: grades, at: function (index) { return grades[index] || grades[0]; } };
  // 达到某个炉温所需的最低线圈
  window.GD.coilForHeat = function (heat) {
    var need = Number(heat) || 0, list = window.GD.coils;
    for (var i = 1; i < list.length; i++) if (list[i].heat >= need) return list[i];
    return null;
  };
})();
