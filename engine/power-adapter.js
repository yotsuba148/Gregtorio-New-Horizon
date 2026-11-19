/* 从产线的导线格取数据，交给 POWER_GRAPH。
 * 依赖都从参数传进来：导线定义、连接位掩码、格子键的解析，模块自身不知道工厂结构。 */
(function (root) {
  'use strict';

  var DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

  // f: 产线视图（f.wire 以 "x,y" 为键）
  // defOf(value) -> {loss, amperage, voltage}
  // maskOf(f, cell) -> 0..15 连接位
  function wires(f, defOf, maskOf) {
    var out = [];
    Object.keys((f && f.wire) || {}).forEach(function (cell) {
      var value = f.wire[cell];
      if (!value) return;
      var def = defOf(value) || {};
      var mask = maskOf ? maskOf(f, cell) : 15;
      var parts = cell.split(',');
      out.push({
        x: +parts[0],
        y: +parts[1],
        loss: def.loss || 0,
        amps: def.amperage || 1,
        voltage: def.voltage || 0,
        dirs: [!!(mask & 1), !!(mask & 2), !!(mask & 4), !!(mask & 8)]
      });
    });
    return out;
  }

  // 找出与某格导线的某个方向相邻、且可作为终端的设备坐标
  function terminalAt(x, y) { return x + ',' + y; }

  root.POWER_ADAPTER = { wires: wires, terminalAt: terminalAt, DIRS: DIRS };
})(typeof window !== 'undefined' ? window : globalThis);
