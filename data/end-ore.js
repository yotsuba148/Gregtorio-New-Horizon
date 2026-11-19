(function (root) {
  'use strict';
  var A = root.ACTIVITIES, GD = root.GD, C = root.CONTENT;
  if (!A || !GD) return;
  /* 末影矿石：HardcoreEnderExpansion 在末地生成的矿，直接做采集动作 */
  var source = {
    id: 'end_endium_ore', name: '开采末影矿石', dim: 'end', time: 4,
    icon: 'HardcoreEnderExpansion:endium_ore@0',
    out: [['HardcoreEnderExpansion:endium_ore@0', 1]]
  };
  if (!(GD.sources || []).some(function (s) { return s.id === source.id; })) {
    GD.sources.push(source);
    A.register(source);
  }

  /* 末影粘浆：末地随处可取，装进单元；再用流体灌装机把单元里的粘浆放出来 */
  var goo = { id: 'end_ender_goo', name: '装取末影粘浆', dim: 'end', time: 3,
    icon: 'HardcoreEnderExpansion:bucket_ender_goo@0', out: [['gregtech:gt.metaitem.98@4', 1]] };
  if (!(GD.sources || []).some(function (s) { return s.id === goo.id; })) { GD.sources.push(goo); A.register(goo); }
  C.customRecipes = C.customRecipes || [];
  C.data.customRecipes = C.data.customRecipes || [];
  if (!C.customRecipes.some(function (r) { return r.id === 'custom:endergoo_cell'; })) {
    var rec = { id: 'custom:endergoo_cell', map: 'gt.recipe.fluidcanner', enabled: true, eut: 30, durationTicks: 20,
      in: [{ k: 'gregtech:gt.metaitem.98@4', n: 1 }], out: [{ k: 'gregtech:gt.metaitem.01@32000', n: 1 }],
      fout: [{ f: 'endergoo', mb: 1000 }], fin: [], req: [], conditions: {}, fake: false };
    C.registerRecipe(rec);
    C.data.customRecipes.push(rec);
  }
  if (C.maps) C.maps = {};
  if (window.RECIPE_QUERY && RECIPE_QUERY.invalidate) RECIPE_QUERY.invalidate();
})(typeof window !== 'undefined' ? window : globalThis);

