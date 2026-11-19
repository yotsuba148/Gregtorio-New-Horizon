/* 工业压模机的预览图案：5×3，控制器在左中。 */
(function () {
  'use strict';
  if (!window.STRUCTURES || !STRUCTURES.profiles) return;
  var profile = STRUCTURES.profiles.industrialextruder;
  if (!profile) return;
  profile.visualPattern = ['sssss', 'Cssss', 'sssss'];
  profile.visualId = 'industrialextruder';
})();
