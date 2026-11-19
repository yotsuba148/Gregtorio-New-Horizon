(function(){
 'use strict';
 // The four fixed-volume buckets share the stack size of their empty forms.
 [
  'minecraft:water_bucket@0',
  'minecraft:lava_bucket@0',
  'IguanaTweaksTConstruct:clayBucketWater@0',
  'IguanaTweaksTConstruct:clayBucketLava@0'
 ].forEach(function(key){CONTENT.item(key).maxStack=16;});
})();
