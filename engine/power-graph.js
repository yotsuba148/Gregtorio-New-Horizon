/* 把导线格子变成推电网用的节点图。
 * 输入只描述“哪格是导线、这格能往哪几个方向接、这段线损和安数”，
 * 不读存档、不碰工厂；输出可直接交给 POWER_NET.create。 */
(function (root) {
  'use strict';

  var DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // 上 右 下 左

  function key(x, y) { return x + ',' + y; }

  // wires: [{x, y, loss, amps, dirs:[bool,bool,bool,bool]}]
  function build(wires) {
    var at = {};
    (wires || []).forEach(function (w) { at[key(w.x, w.y)] = w; });
    var nodes = [], edges = {};
    Object.keys(at).forEach(function (k) {
      var w = at[k];
      nodes.push({ id: k, x: w.x, y: w.y, loss: w.loss || 0, amps: w.amps || 1 });
      edges[k] = [];
    });
    Object.keys(at).forEach(function (k) {
      var w = at[k];
      for (var d = 0; d < 4; d++) {
        if (!(w.dirs && w.dirs[d])) continue;
        var nx = w.x + DIRS[d][0], ny = w.y + DIRS[d][1], nk = key(nx, ny);
        var other = at[nk];
        if (!other) continue;
        if (!(other.dirs && other.dirs[(d + 2) % 4])) continue;
        if (edges[k].indexOf(nk) < 0) edges[k].push(nk);
        if (edges[nk].indexOf(k) < 0) edges[nk].push(k);
      }
    });
    return { nodes: nodes, edges: edges };
  }

  root.POWER_GRAPH = { build: build, key: key, DIRS: DIRS };
})(typeof window !== 'undefined' ? window : globalThis);
