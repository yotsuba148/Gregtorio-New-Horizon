/* 变压器行为：只做换包，不参与加工。注册空行为，避免引擎报「设备暂不能运行」 */
(function (root) {
  'use strict';
  if (!root.ENGINE || !root.ENGINE.registerBehavior) return;
  root.ENGINE.registerBehavior('transformer', {
    tick: function () { return false; },
    status: function (m, d, make) {
      var up = m.tfMode === 'up';
      var v = root.POWER_TRANSFORMER ? root.POWER_TRANSFORMER.volts(m, d) : { inVolt: 0, outVolt: 0 };
      var detail = (up ? '升压 ' : '降压 ') + (v.inVolt || 0) + 'V → ' + (v.outVolt || 0) + 'V' + ((m.eu || 0) > 0 ? '，正在换包' : '，等待输入');
      return make((m.eu || 0) > 0 ? 'running' : 'waiting', m, detail);
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
