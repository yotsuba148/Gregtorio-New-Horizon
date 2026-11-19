/* 放置版任务规则调整。 */
(function () {
  'use strict';
  var rules = (window.GD && window.GD.questRules && window.GD.questRules.rules) || {};
  var rule = rules[1433];
  if (!rule || !Array.isArray(rule.groups)) return;
  rule.groups = rule.groups.filter(function (g) { return g.id !== '0:10' && g.id !== '1:10'; });
})();
