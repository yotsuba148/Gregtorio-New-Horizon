/* 发电机输出项：统一多方块与单方块。
 * 多方块由动力仓提供多项；单方块发电机只有一项，电压电流取定义，输出面取 outFace。 */
(function (root) {
  'use strict';

  /* 变压器：按模式把存下的电换包发出。
     降压时三面出低压、总电流受 ratio 限制；升压时只有特殊面出高压、一次一包。
     三个输出面共享总电流额度，由 runner 按面顺序贪心分配，和原版一致。 */
  function transformerOutputs(m, d) {
    if (!d.transformer || !root.POWER_TRANSFORMER) return [];
    var v = root.POWER_TRANSFORMER.volts(m, d);
    var f = root.POWER_TRANSFORMER.faces(m, d);
    var outVolt = v.outVolt || 0;
    if (!outVolt) return [];
    var total = Math.min(v.outAmps, Math.floor((m.eu || 0) / outVolt));
    if (total <= 0) return [];
    return f.outputs.map(function (side) {
      return { volt: outVolt, amps: v.outAmps, group: 'tf:' + m.uid, groupTotal: total, face: String(side) };
    });
  }

  function of(m, d) {
    if (!m || !d) return [];
    if (d.transformer) return transformerOutputs(m, d);
    if (Array.isArray(d.outputs) && d.outputs.length) return d.outputs;
    if (m.outFace === -1) return [];
    var volt = d.volt || 0;
    if (!volt) return [];
    var behavior = root.ENGINE && ENGINE.behavior(d.behavior);
    var amps = behavior && behavior.outputAmps ? behavior.outputAmps(m, d) : d.amperage;
    return [{ volt: volt, amps: amps == null ? 1 : amps, face: m.outFace == null ? null : String(m.outFace) }];
  }

  root.POWER_OUTPUTS = { of: of };
})(typeof window !== 'undefined' ? window : globalThis);
