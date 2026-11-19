/* IC2 真空堆：固定布局与燃料表。
 * 布局 6 行 × 9 列，R = 四联燃料棒，C = 冷却单元，共 40 + 14。
 * 数据来自 GTNH wiki 的真空堆最优设计；发热量由“14 个冷却单元的耐久 ÷ 平均寿命”反推。 */
(function () {
  'use strict';
  window.GD = window.GD || {};

  window.GD.reactor = {
    layout: [
      'CRRRCRRCR',
      'RRCRRRRCR',
      'CRRRRCRRR',
      'RRRCRRRRC',
      'RCRRRRCRR',
      'RCRRCRRRC'
    ],
    // 原版满配舱室数，用于舱室收益换算。
    baseChambers: 6,
    // 放置版福利系数：仅核反应堆使用。
    welfareMultiplier: 2,
    coolantProducts: {},
    fuels: [
      {
        id: 'thorium', cn: '钍', rod: 'gregtech:gt.rodThorium4@0',
        euPerTick: 8720, heatPerSecond: 2847, coolant: 'gregtech:gt.360k_Helium_Coolantcell@0'
      },
      {
        id: 'uranium', cn: '铀', rod: 'gregtech:gt.rodUranium4@0',
        euPerTick: 43600, heatPerSecond: 11403, coolant: 'gregtech:gt.360k_Helium_Coolantcell@0'
      },
      {
        id: 'mox', cn: 'MOX', rod: 'gregtech:gt.rodMOX4@0',
        euPerTick: 107910, heatPerSecond: 11403, coolant: 'gregtech:gt.360k_Helium_Coolantcell@0'
      },
      {
        id: 'hdPlutonium', cn: '高密度钚', rod: 'gregtech:gt.rodHighDensityPlutonium4@0',
        euPerTick: 302148, heatPerSecond: 11385, coolant: 'gregtech:gt.540k_Space_Coolantcell@0'
      },
      {
        id: 'excitedUranium', cn: '激发铀', rod: 'gregtech:gt.rodExcitedUranium4@0',
        euPerTick: 1046400, heatPerSecond: 182169, coolant: 'gregtech:gt.1080k_Space_Coolantcell@0'
      }
    ],
    rods: 40,
    coolants: 14
  };
})();
