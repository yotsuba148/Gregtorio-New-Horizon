(function (root) {
  'use strict';
  var A = root.ADVENTURES;
  if (!A) return;
  /* 末影龙随时可挑战，不要求先探索地点、不要求武器口粮 */
  A.registerEncounter({
    id: 'ender_dragon', name: '挑战末影龙', dim: 'end', seconds: 300, once: true, noSupplies: true,
    rewards: [{ k: 'minecraft:dragon_egg@0', min: 1, max: 1 }],
    provenance: 'Minecraft 1.7.10 EntityDragon 掉落龙蛋；Gregtorio 中固定 300 秒、只能打一次'
  });
})(typeof window !== 'undefined' ? window : globalThis);

