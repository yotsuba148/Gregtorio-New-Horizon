/* 物品耐久登记：key -> {max, spent}。spent 为用尽后变成的物品，null 表示直接消失。 */
(function () {
  'use strict';
  window.GD = window.GD || {};
  var table = window.GD.itemDurability = window.GD.itemDurability || {};

  function add(key, max, spent) {
    if (!key) return;
    table[key] = { max: max, spent: spent === undefined ? null : spent };
  }

  // IC2 冷却单元（耐久单位为热单位，数值取自原版档位）
  add('IC2:reactorCoolantSimple@1', 10000, 'IC2:itemCellEmpty@10');
  add('IC2:reactorCoolantTriple@1', 30000, 'IC2:itemCellEmpty@10');
  add('IC2:reactorCoolantSix@1', 60000, 'IC2:itemCellEmpty@10');
  add('gregtech:gt.180k_Helium_Coolantcell@0', 180000, null);
  add('gregtech:gt.180k_NaK_Coolantcell@0', 180000, null);
  add('gregtech:gt.360k_Helium_Coolantcell@0', 360000, null);
  add('gregtech:gt.180k_Space_Coolantcell@0', 180000, null);
  add('gregtech:gt.360k_Space_Coolantcell@0', 360000, null);

  add('gregtech:gt.540k_Space_Coolantcell@0',540000,null);
  add('gregtech:gt.1080k_Space_Coolantcell@0',1080000,null);
  add('gregtech:gt.rodMOX4@0',10000,'gregtech:gt.depletedRodMOX4@0');
  add('gregtech:gt.rodHighDensityPlutonium4@0',70000,'gregtech:gt.depletedRodHighDensityPlutonium4@0');
  add('gregtech:gt.rodExcitedUranium4@0',6000,'gregtech:gt.depletedRodExcitedUranium4@0');

  // 燃料棒：寿命按秒记；贫铀棒在物品表里还没有对应 key，spent 先留占位
  add('gregtech:gt.rodThorium@0', 50000, 'gregtech:gt.depletedRodThorium@0');
  add('gregtech:gt.rodThorium2@0', 50000, 'gregtech:gt.depletedRodThorium2@0');
  add('gregtech:gt.rodThorium4@0', 50000, 'gregtech:gt.depletedRodThorium4@0');
  add('gregtech:gt.rodUranium@0', 20000, 'gregtech:gt.depletedRodUranium@0');
  add('gregtech:gt.rodUranium2@0', 20000, 'gregtech:gt.depletedRodUranium2@0');
  add('gregtech:gt.rodUranium4@0', 20000, 'gregtech:gt.depletedRodUranium4@0');

  // 燃料棒与冷却单元：满耐久时可以堆叠，磨损由机器内部记录，不写进物品。
  GD.isStackableDurable = function (k) {
    var fuels = (GD.reactor && GD.reactor.fuels) || [];
    for (var i = 0; i < fuels.length; i++) {
      if (fuels[i].rod === k || fuels[i].coolant === k) return true;
    }
    return false;
  };
})();
