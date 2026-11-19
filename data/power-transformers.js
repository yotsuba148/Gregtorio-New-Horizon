/* 单方块变压器：GT5U meta 20–28（transformer_LV_ULV … transformer_UHV_UV）。
 * 数值来自 MTETransformer 与 MetaTileEntityIDs：
 *   输入 = V[tier+1]，输出 = V[tier]，降压 1 包变 4 包，反向 4:1
 *   容量 = max(512, 1<<(tier+2)) + V[tier+1]*4
 * 名称沿用原版英文（GT 本体没有这批机器的中文名，按项目规则不自译）。 */
(function (root) {
  'use strict';
  var GD = root.GD = root.GD || {};
  var V = [8, 32, 128, 512, 2048, 8192, 32768, 131072, 524288, 2097152];
  var NAMES = [
    'Ultra Low Voltage Transformer',
    'Low Voltage Transformer',
    'Medium Voltage Transformer',
    'High Voltage Transformer',
    'Extreme Transformer',
    'Insane Transformer',
    'Ludicrous Transformer',
    'ZPM Voltage Transformer',
    'Ultimate Transformer'
  ];
  var TAGS = ['LV -> ULV', 'MV -> LV', 'HV -> MV', 'EV -> HV', 'IV -> EV', 'LuV -> IV', 'ZPM -> LuV', 'UV -> ZPM', 'UHV -> UV'];

  GD.items = GD.items || {};
  GD.extraMachineDefinitions = GD.extraMachineDefinitions || [];
  GD.transformers = GD.transformers || {};

  NAMES.forEach(function (name, tier) {
    var key = 'gregtech:gt.blockmachines@' + (20 + tier);
    var inVolt = V[tier + 1], outVolt = V[tier];
    var capacity = Math.max(512, Math.pow(2, tier + 2)) + inVolt * 4;
    // 名称已由原生数据提供，未核实前不覆盖
    // GD.items[key] = name;
    GD.transformers[key] = { tier: tier, inVolt: inVolt, outVolt: outVolt, ratio: 4, capacity: capacity, inverseCapacity: Math.max(512, Math.pow(2, tier + 2)) + outVolt * 4 };
    GD.extraMachineDefinitions.push({
      key: key,
      cat: 'transformer',
      cn: name,
      entityName: name,
      tag: TAGS[tier],
      tier: tier + 1,
      volt: inVolt,
      amperage: 1,
      energyCapacity: capacity,
      startEnergy: 0,
      slots: { in: 0, out: 0, fluid: 0 },
      fluidInputTanks: [],
      fluidOutputTanks: [],
      autoItems: false,
      autoFluids: false,
      generator: false,
      behavior: 'transformer',
      ui: 'transformer',
      recipeMap: 'none:transformer',
      transformer: GD.transformers[key]
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);
