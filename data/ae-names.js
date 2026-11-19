/* GTNH txloader Chinese item names. Source mappings: engineering/sources/ae-names-20261030.json. */
(function(root) {
  var names = {
  "appliedenergistics2:item.ItemExtremeStorageCell.Container@0": "方块容器ME存储元件",
  "appliedenergistics2:item.ItemExtremeStorageCell.Singularity@0": "数字奇点ME存储元件",
  "appliedenergistics2:item.ItemExtremeStorageCell.Quantum@0": "量子ME存储元件",
  "appliedenergistics2:item.ItemExtremeStorageCell.Universe@0": "人造宇宙ME存储元件",
  "appliedenergistics2:item.ItemMultiMaterial@64": "黏性卡",
  "ae2fc:fluid_storage_housing@1": "ME高级流体存储外壳",
  "ae2fc:fluid_storage_housing@2": "ME多流体存储外壳",
  "ae2fc:fluid_storage_housing@3": "ME高级多流体存储外壳",
  "ae2fc:level_maintainer@0": "ME请求器",
  "ae2fc:portable_fluid_cell@0": "便携流体元件",
  "ae2fc:part_fluid_conversion_monitor@0": "ME流体交互监控器",
  "ae2fc:wireless_fluid_terminal@0": "ME无线流体终端",
  "ae2fc:wireless_fluid_pattern_terminal@0": "ME无线流体样板终端",
  "ae2fc:wireless_interface_terminal@0": "ME无线接口终端",
  "ae2fc:fluid_storage.quantum@0": "ME量子流体存储元件",
  "ae2fc:fluid_storage.Universe@0": "ME人造宇宙流体存储元件",
  "ae2fc:wireless_ultra_terminal@0": "无线通用终端 - 合成",
  "ae2fc:wireless_ultra_terminal@0~a6cfaf6e934ae756df5a": "无线通用终端 - 合成",
  "ae2fc:wireless_ultra_terminal@0~124f0a036b1b2a2f71ea": "无线通用终端 - 合成",
  "ae2fc:wireless_fluid_terminal@0~a6cfaf6e934ae756df5a": "ME无线流体终端",
  "ae2fc:wireless_fluid_terminal@0~124f0a036b1b2a2f71ea": "ME无线流体终端",
  "ae2fc:wireless_fluid_pattern_terminal@0~a6cfaf6e934ae756df5a": "ME无线流体样板终端",
  "ae2fc:wireless_fluid_pattern_terminal@0~124f0a036b1b2a2f71ea": "ME无线流体样板终端",
  "ae2fc:wireless_interface_terminal@0~a6cfaf6e934ae756df5a": "ME无线接口终端",
  "ae2fc:wireless_interface_terminal@0~124f0a036b1b2a2f71ea": "ME无线接口终端",
  "ae2fc:multi_fluid_storage16@0": "16k-ME多流体存储元件",
  "ae2fc:multi_fluid_storage1@0": "1k-ME多流体存储元件",
  "ae2fc:multi_fluid_storage64@0": "64k-ME多流体存储元件",
  "ae2fc:multi_fluid_storage4@0": "4k-ME多流体存储元件",
  "ae2fc:multi_fluid_storage256@0": "256k-ME多流体存储元件",
  "ae2fc:multi_fluid_storage1024@0": "1024k-ME多流体存储元件",
  "ae2fc:multi_fluid_storage16384@0": "16384k-ME多流体存储元件",
  "ae2fc:multi_fluid_storage4096@0": "4096k-ME多流体存储元件",
  "ae2fc:fluid_pattern_encoder@0": "流体样板编码台",
  "ae2fc:wireless_ultra_terminal@0~44136fa355b3678a1146": "无线通用终端 - 合成",
  "thaumicenergistics:storage.essentia@4": "魔导源质存储元件",
  "thaumicenergistics:part.base@0": "ME源质输入总线",
  "thaumicenergistics:part.base@3": "ME源质输出总线",
  "thaumicenergistics:thaumicenergistics.block.advanced.infusion.provider@0": "高级注魔供应器",
  "thaumicenergistics:part.base@2": "ME源质存储总线",
  "thaumicenergistics:part.base@6": "Vis中继接口"
};
  Object.keys(names).forEach(function(k) {
    if (!CONTENT.item(k)) return;
    GD.items[k] = names[k];
    CONTENT.item(k).name = names[k];
  });
  root.AE_NATIVE_NAMES = names;
})(typeof window !== 'undefined' ? window : globalThis);
