/* 玻璃等级表：来源 GT5U 5.09.51.482 的 gregtech/api/util/GlassTier.java
 * 与 bartworks/API/BorosilicateGlass.java 的 getAllLevels()。
 * 数值是电压档序号：3=HV 4=EV 5=IV 6=LuV 7=ZPM 8=UV 9=UHV 10=UEV 11=UIV 12=UMV。
 * 普通玻璃不算分档玻璃，记 0。
 */
(function () {
  'use strict';
  var GD = window.GD;
  if (!GD) return;

  var tiers = {
    'minecraft:glass@0': 0
  };

  /* bartworks bw_realglas（BW_GlasBlocks） */
  var bw = {
    0: 3, 1: 4, 2: 5, 3: 6, 4: 7, 5: 8,
    6: 3, 7: 3, 8: 3, 9: 3, 10: 3, 11: 3,
    12: 5, 13: 9, 14: 10, 15: 11
  };
  Object.keys(bw).forEach(function (meta) {
    tiers['bartworks:BW_GlasBlocks@' + meta] = bw[meta];
  });

  /* 其他模组的玻璃：EnderIO 熔融石英按 HV 档 */
  tiers['EnderIO:blockFusedQuartz@0'] = 3;
  tiers['EnderIO:blockFusedQuartz@2'] = 3;

  /* GT 分档玻璃：sBlockGlass1 metas 0..5 -> 4,9,9,10,11,12 */
  tiers['gregtech:gt.blockglass1@0'] = 4;
  tiers['gregtech:gt.blockglass1@1'] = 9;
  tiers['gregtech:gt.blockglass1@2'] = 9;
  tiers['gregtech:gt.blockglass1@3'] = 10;
  tiers['gregtech:gt.blockglass1@4'] = 11;
  tiers['gregtech:gt.blockglass1@5'] = 12;

  /* 第二组玻璃块：bw_realglas2 meta 0 记 12 档 */
  tiers['bartworks:BW_GlasBlocks2@0'] = 12;

  GD.glassTiers = tiers;
  GD.glassTierOf = function (key) {
    if (!key) return 0;
    var k = key.indexOf('@') >= 0 ? key : key + '@0';
    return Object.prototype.hasOwnProperty.call(tiers, k) ? tiers[k] : 0;
  };
  GD.glassTierLabel = function (tier) {
    if (!tier) return '无等级';
    return DEFS && DEFS.tagOf ? DEFS.tagOf(tier) : String(tier);
  };

  /* 悬停显示等级 */
  function registerTip() {
    if (!window.ITEM_DESCRIPTIONS) return false;
    if (ITEM_DESCRIPTIONS.set) {
      Object.keys(tiers).forEach(function (key) {
        var tier = tiers[key];
        if (tier) ITEM_DESCRIPTIONS.set(key, '玻璃等级：' + GD.glassTierLabel(tier));
      });
    }
    if (!ITEM_DESCRIPTIONS.register) return true;
    ITEM_DESCRIPTIONS.register('glass-tier', function (stack) {
      var key = stack && (stack.k || stack);
      var tier = GD.glassTierOf(key);
      if (!tier) return '';
      return '玻璃等级：' + GD.glassTierLabel(tier);
    });
    return true;
  }
  if (!registerTip() && typeof document !== 'undefined') {
    if (document.readyState === 'complete') setTimeout(registerTip, 0);
    else window.addEventListener('load', registerTip, { once: true });
  }
})();
