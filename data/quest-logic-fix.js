(function (root) {
  'use strict';
  /* 原版这些任务是多选一（task_logic OR），导入时被并成了 AND */

  /* 无物品的确认类任务：原版是 checkbox/location，改成需要手动确认 */
  var CHECK_QUESTS = { '1696': 1, '1715': 1, '215': 1, '2311': 1, '2667': 1, '940031': 1, '940105': 1, '940112': 1 };
  var OR_QUESTS = { '212': 1, '1011': 1, '1242': 1, '1243': 1, '1244': 1, '1252': 1, '1415': 1, '1424': 1, '1480': 1, '1891': 1 };
  root.QUEST_RULE_PATCH = function (rule, quest) {
    var id = String(quest && quest.id);
    if (CHECK_QUESTS[id]) {
      rule.taskLogic = 'AND';
      rule.groups = [{ type: 'checkbox', qid: id }];
      return rule;
    }
    if (!OR_QUESTS[id]) return rule;
    rule.taskLogic = 'OR';
    (rule.groups || []).forEach(function (g) {
      if (g && g.items && g.items.length > 1) g.requireOnlyOneItem = true;
    });
    return rule;
  };
  function patchExisting() {
    var rules = root.GD && root.GD.questRules && root.GD.questRules.rules;
    if (!rules) return 0;
    var n = 0;
    Object.keys(rules).forEach(function (id) {
      if (!OR_QUESTS[id]) return;
      var r = rules[id];
      if (r.resolved) return;
      r.taskLogic = 'OR';
      (r.groups || []).forEach(function (g) { if (g && g.items && g.items.length > 1) g.requireOnlyOneItem = true; });
      n++;
    });
    return n;
  }
  patchExisting();
  if (typeof setTimeout === 'function') { setTimeout(patchExisting, 0); setTimeout(patchExisting, 300); }
})(typeof window !== 'undefined' ? window : globalThis);


(function(){var previous=QUEST_RULE_PATCH;window.QUEST_RULE_PATCH=function(rule,quest){rule=previous(rule,quest);if([1533,1534,1703].includes(+quest.id)){rule.taskLogic='OR';rule.groups=rule.groups.flatMap(function(g){return g.type==='retrieval'&&g.items.length>1?g.items.map(function(p){return Object.assign({},g,{items:[p]});}):[g];});}return rule;};})();
