/* 真实节奏登记：这些机器在 1tick 模式下仍按真实 tick 推进，不进入瞬完批次。 */
(function (root) {
  'use strict';

  function table() {
    return (root.GD && GD.realTimeMachines) || [];
  }

  function isRealTime(key) {
    if (!key) return false;
    return table().indexOf(key) >= 0;
  }

  function isRealTimeMachine(m) {
    return !!m && isRealTime(m.k);
  }

  root.REAL_TIME = { isRealTime: isRealTime, isRealTimeMachine: isRealTimeMachine };
  if (typeof module === 'object' && module.exports) module.exports = root.REAL_TIME;
})(typeof window !== 'undefined' ? window : globalThis);
