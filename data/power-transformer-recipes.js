/* 变压器的图标与合成配方。
 * 配方来自 GT5U MTERecipeLoader（GTModHandler.addCraftingRecipe）：
 *   LV->ULV  " BB" / "CM " / " BB"   M=ULV外壳 C=锡线 B=铅线
 *   MV->LV   同上                    M=LV外壳  C=铜线   B=锡线
 *   HV->MV   "KBB" / "CM " / "KBB"   M=MV外壳  C=金线   B=铜线 K=电感
 * 外壳 meta 10–19 对应 ULV…UHV。 */
(function (root) {
  'use strict';
  var GD = root.GD = root.GD || {};
  GD.iconOverrides = GD.iconOverrides || {};
  GD.faceIcons = GD.faceIcons || {};
  GD.gridFaceIcons = GD.gridFaceIcons || {};
  GD.craft = GD.craft || [];

  var TIN = 'gregtech:gt.blockmachines@1246';
  var LEAD = 'gregtech:gt.blockmachines@1226';
  var COPPER = ['gregtech:gt.blockmachines@1286', 'gregtech:gt.blockmachines@1386'];
  var GOLD = 'gregtech:gt.blockmachines@1426';
  var INDUCTOR = 'gregtech:gt.metaitem.01@32744';

  /* 网格顺序：0..8，-1 为空；slots 存可选材料组 */
  function shaped(out, slots, grid) {
    GD.craft.push({ out: out, n: 1, slots: slots, grid: grid });
  }

  function build(tier, hull, wireC, wireB, inductor) {
    var key = 'gregtech:gt.blockmachines@' + (20 + tier);
    /* 同一输出只保留一条，脚本重复执行也不会叠加 */
    for (var i = GD.craft.length - 1; i >= 0; i--) if (GD.craft[i].out === key) GD.craft.splice(i, 1);
    var slots = [wireC, [hull], wireB];
    if (inductor) slots.push([inductor]);
    var iC = 0, iM = 1, iB = 2, iK = 3;
    var grid = inductor
      ? [iK, iB, iB, iC, iM, -1, iK, iB, iB]
      : [-1, iB, iB, iC, iM, -1, -1, iB, iB];
    shaped(key, slots, grid);
  }

  // build(0, ...) 停用：先确认原版配方的实际来源
  // 0:
  // 1:
  // 2:

  for (var t = 0; t < 9; t++) {
    var key = 'gregtech:gt.blockmachines@' + (20 + t);
    var icon = 'modicons/transformer/transformer-' + t + '.png?v=20261104_tfico';
    GD.iconOverrides[key] = icon;
    GD.faceIcons[key] = icon;
    GD.gridFaceIcons[key] = icon;
  }
})(typeof window !== 'undefined' ? window : globalThis);
