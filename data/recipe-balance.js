(function () {
  'use strict';
  var recipe = CONTENT.recipe('gt:gt.recipe.autoclave:91');
  recipe.out.find(function (output) {
    return output.k === 'bartworks:gt.bwMetaGeneratedItem0@3';
  }).chance = 10000;
})();
