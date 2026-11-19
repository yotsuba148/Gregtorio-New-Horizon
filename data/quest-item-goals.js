/* Apply ownership requirements after the quest definitions have been assembled. */
(function () {
  'use strict';
  for (var rule of Object.values(GD.questRules.rules)) {
    for (var group of rule.groups || []) {
      if (group.type === 'crafting') group.type = 'retrieval';
    }
  }
})();
