(function (root) {
  'use strict';
  var GD = root.GD, SF = root.SPACEFLIGHT_CONTENT;
  if (!GD) return;
  /* GalaxySpace 1.1.121-GTNH，RocketRecipes 的无货舱 T3 槽位 1–28。 */
  var parts = [
    ['GalaxySpace:item.ModuleLander3@0', 1],
    ['GalaxySpace:item.RocketControlComputer@3', 1],
    ['GalaxySpace:item.ModuleSmallFuelCanister@0', 2],
    ['dreamcraft:item.MediumFuelCanister@0', 2],
    ['GalacticraftMars:item.heavyNoseCone@0', 1],
    ['GalacticraftMars:item.null@3', 2],
    ['GalacticraftMars:item.itemBasicAsteroids@0', 12],
    ['GalacticraftMars:item.itemBasicAsteroids@1', 1],
    ['GalacticraftMars:item.itemBasicAsteroids@2', 4],
    ['GalacticraftCore:item.engine@1', 2]
  ];
  if (!GD.craft.some(function (r) { return r.id === 'craft:nasa_t3:0'; })) {
    var slots = [];
    parts.forEach(function (p) { for (var i = 0; i < p[1]; i++) slots.push([p[0]]); });
    GD.craft.push({ id: 'craft:nasa_t3:0', out: 'GalacticraftMars:item.itemTier3Rocket@0', n: 1, slots: slots,
      shapeless: true, width: 0, height: 0, flags: { station: 'nasa', stationSlots: 32 },
      source: 'native:GalaxySpace1.1.121:RocketRecipes', station: 'nasa', rocketTier: 3, research: 'space:rocket:t3' });
  }

  /* 火箭登记 */
  if (SF && Array.isArray(SF.rockets) && !SF.rockets.some(function (r) { return r.tier === 3; })) {
    SF.rockets.push({ id: 't3', itemId: 'GalacticraftMars:item.itemTier3Rocket', entity: 'micdoodle8.mods.galacticraft.planets.asteroids.entities.EntityTier3Rocket', tier: 3, maxMeta: 3, baseCapacity: 1500 });
  }
})(typeof window !== 'undefined' ? window : globalThis);

