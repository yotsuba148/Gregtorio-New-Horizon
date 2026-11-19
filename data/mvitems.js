/* ============================================================================
 * data/mvitems.js —— 物品补丁
 *
 * 两件事，都是"导出表缺东西"而不是规则缺：
 *
 * 1 编程电路带号。GT 的电路号存在 NBT 里，物品表只有一个
 *   gregtech:gt.integrated_circuit@0。这里用 `#号` 后缀把它拆成可区分的键，
 *   配方就能写"要 4 号电路"而不是"要任意电路"。
 *
 * 2 单元类物品。GT 的电解配方用 `gt.metaitem.01@30460` 这种带 damage 的注册名，
 *   本工程的物品表里没有对应条目，这里按实测配方的原文补上，名字照抄。
 *
 * 只补键和名字；图标沿用同族基础物品（见 game.js 的 keyBase）。
 * ==========================================================================*/
(function () {
  'use strict';

  window.GD = window.GD || {};
  var items = window.GD.items = window.GD.items || {};

  function put(k, cn) { if (!items[k]) items[k] = cn; }

  /* 编程电路不再拆成 24 个物品：机器面板上有一格专门设号，
   * 和 GT 的 GUI 一样，不用往槽里塞东西。 */

  /* 实测配方里出现、但物品表缺的单元与粉 */
  put('IC2:itemCellEmpty@0', '空单元');
  put('gregtech:gt.metaitem.01@30001', '氢单元');
  put('gregtech:gt.metaitem.01@30460', '硫化氢单元');
  put('gregtech:gt.metaitem.01@2022', '硫粉');
  put('gregtech:gt.metaitem.01@11345', '退火铜锭');
  put('gregtech:gt.metaitem.01@11304', '锻铁锭');
put('GalacticraftCore:item.key@0', '地牢钥匙');
})();
