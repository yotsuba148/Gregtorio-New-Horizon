/* 配方数据修改完成后，统一发布供合成、查询和样板使用的配方。 */
(function (root) {
  'use strict';
  var C = root.CONTENT, GD = root.GD;
  C.refreshCrafting(GD);
  if(root.RECIPE_QUERY)root.RECIPE_QUERY.invalidate();
})(typeof window !== 'undefined' ? window : globalThis);
