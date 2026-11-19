(function (root) {
  'use strict';
  var GD = root.GD;
  if (!GD) return;
  /* 太空竞赛章节：EV 主线里跟 T2 火箭/火星相关的航天任务移过去，前置不变 */
  var MOVE = { '186': 1, '187': 1, '188': 1 };
  function apply() {
    var n = 0;
    (GD.quests || []).forEach(function (q) {
      if (!MOVE[String(q.id)]) return;
      q.chap = 'SpaceRace';
      q.chapcn = '\u592a\u7a7a\u7ade\u8d5b';
      q.chapi = 29;
      n++;
    });
    GD.spaceQuestMoved = n;
    return n;
  }
  apply();
  if (typeof setTimeout === 'function') setTimeout(apply, 0);
})(typeof window !== 'undefined' ? window : globalThis);

