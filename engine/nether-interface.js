(function(root) {
  'use strict';
  var catalog = MULTIBLOCK_CATALOG;
  var key = catalog.key(19077);
  var map = 'tst.recipe.NetherInterfaceVisualRecipeMap';
  var preview = CONTENT.recipes(map, true)[0];
  var cycleTicks = preview.durationTicks;
  var unitPower = 7680;
  var parallelLimit = 64;
  var drawsPerCycle = 3;
  var metalChance = 3000;
  var rewards = preview.out;
  var waste = preview.fout[0];
  var metal = preview.fout[1];
  var steel = catalog.block(2, 0);
  var frame = 'gregtech:gt.blockframes@804';
  var reinforced = 'TwistSpaceTechnology:MetaBlockCasing02@5';
  var obsidian = 'minecraft:obsidian@0';

  function batchPower(parallel) {
    return (parallel + 2) * unitPower;
  }

  function powerCapacity(m, capability) {
    // The source sums work amps at each installed hatch's own voltage.
    capability.power = catalog.counted(m, 'energy').reduce(function(total, port) {
      var spec = MULTIBLOCKS.spec(port.k);
      return total + spec.voltage * (spec.workingAmperage ?? spec.amperage);
    }, 0);
    var maxParallel = Math.max(1, Math.min(parallelLimit, Math.floor(capability.power / unitPower) - 2));
    capability.definition = { recipeParallelLimit: function() { return maxParallel; } };
  }

  // The first non-empty block on each line of sight gives the placed footprint.
  var pillar = ' fb         bf ';
  var profile = catalog.basic({
    id: 'netherinterface',
    name: GD.items[key],
    meta: 19077,
    map: map,
    pattern: [
      ' sssssssssssss ',
      ' sbbbbbbbbbbbs ',
      ' fbbbbbbbbbbbf ',
      pillar, pillar, pillar, pillar, pillar, pillar, pillar, pillar, pillar, pillar,
      ' fbbbbsCsbbbbf ',
      'sssssssssssssss',
      'sssssssssssssss'
    ],
    portTiles: ['s'],
    parts: function() {
      return [catalog.part(steel, 128), catalog.part(frame, 48), catalog.part(reinforced, 134), catalog.part(obsidian, 42)];
    },
    materialKey: function(m, cell, tile) {
      return tile === 'b' ? reinforced : tile === 'f' ? frame : null;
    },
    defaultEnergy: false,
    defaultPorts: [],
    maintenance: false,
    allowed: function(m, face, spec) {
      return HATCH_RULES.isOrdinary(spec) && !spec.steamComponent && !spec.dual;
    },
    portRequirements: { itemIn: 1, itemOut: 1, fluidIn: 1, fluidOut: 1, energy: 1 },
    definition: {
      inputIsolationFixed: false,
      showInputIsolation: false,
      supportsVoidProtection: false,
      fixedVoidingMode: 'all',
      batchProcessing: false,
      processingTiming: function(recipe, parallel) {
        return { durationTicks: cycleTicks, EUt: batchPower(parallel), overclocks: 0 };
      }
    },
    capability: powerCapacity
  });
  profile.multiAmpEnergy = true;
  profile.largerPortMap = true;

  // The native NEI row lists possible rewards. The executable batch rolls its
  // outputs once, after the processor has selected the parallel count.
  preview.eut = batchPower(1);
  preview.patternEncodable = false;
  profile.prepareRecipe = function(m, recipe, options) {
    return Object.assign({}, recipe, { eut: batchPower(options.parallel), out: [], fout: [] });
  };
  profile.rollBatchOutputs = function(checked, randomInt) {
    var parallel = checked.parallel;
    var items = [];
    for (var i = 0; i < drawsPerCycle; i++) {
      var roll = randomInt(10000);
      for (var reward of rewards) {
        if (roll < reward.chance) {
          items.push({ k: reward.k, n: reward.n * parallel });
          break;
        }
        roll -= reward.chance;
      }
    }
    var fluids = [{ f: waste.f, mb: waste.mb * parallel }];
    if (randomInt(10000) < metalChance) fluids.unshift({ f: metal.f, mb: metal.mb * parallel });
    return { items: items, fluids: fluids };
  };

  if (root.JEI) JEI.registerParameter(function(recipe, add) {
    if (recipe.id !== preview.id) return;
    add('并行功率', '基础 15,360 EU/t，每并行 7,680 EU/t');
    add('物品产出', '每批独立抽取 3 组，数量随并行增加');
    add('熔融地狱金属', '每批 30% 概率产出');
  });
  DEFS.rebuild();
})(typeof window !== 'undefined' ? window : globalThis);
