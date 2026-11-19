/* IC2 核反应堆（真空堆）：3×3×3 多方块，发电机，动力仓出电。
 * 内部 40 根四联棒 + 14 个冷却单元固定布局，界面只读；补料走输入总线。 */
(function () {
  'use strict';
  var GD = window.GD = window.GD || {};
  GD.machines = GD.machines || { cats: [] };
  GD.extraMachineDefinitions = GD.extraMachineDefinitions || [];

  var KEY = 'IC2:blockGenerator@5';
  var CASING = 'IC2:blockReactorChamber@0';
  var IN_BUS = 'gregtech:gt.blockmachines@73';
  var OUT_BUS = 'gregtech:gt.blockmachines@83';
  var DYNAMO = 'gregtech:gt.blockmachines@34';

  GD.items[KEY] = '核反应堆';
  if (!GD.items[CASING]) GD.items[CASING] = '反应堆舱室';

  function part(k, n) { return { k: k, n: n || 1 }; }

  // 3×3×3 外壳，控制器占正面中央；其余外壳由舱室方块补足，端口占三个口
  var reactorDef = ({
    key: KEY,
    cat: 'ic2reactor',
    cn: '核反应堆',
    tag: '多方块',
    tier: 3,
    volt: 512,
    behavior: 'gt_ic2_reactor',
    multiblock: true,
    requiresStructure: true,
    structureProfile: 'ic2reactor',
    generator: true,
    energyCapacity: 0,
    slots: { in: 0, out: 0, fluid: 0 },
    fluidInputTanks: [],
    fluidOutputTanks: [],
    wallThickness: 1,
    windowWidth: 820
  });
  GD.extraMachineDefinitions.push(reactorDef);
  if (window.DEFS && DEFS.register) DEFS.register(reactorDef);

  if (window.STRUCTURES && STRUCTURES.register) {
    STRUCTURES.register({
      id: 'ic2reactor',
      name: '核反应堆',
      key: KEY,
      visualId: 'ic2reactor',
      controllerIcon: 'modicons/ic2/reactor-front64.png',
      visualPattern: ['sss', 'sCs', 'sss'],
      build: function () {
        return {
          parts: [
            part(CASING, 26), part(IN_BUS, 2), part(OUT_BUS, 1), part(DYNAMO, 1)
          ],
          power: 0,
          voltage: 2048,
          amperage: 1
        };
      },
      allowedFace: function (m, f, s) {
        if(f.x===1&&f.y===1)return false;
        return s.type === 'itemIn' || s.type === 'itemOut' || s.type === 'dynamo';
      },
      portRequirements: { itemIn: 2, itemOut: 1, dynamo: 1 },
      portReplacesCasing: function(){return false;},
      capability: function(m,c){c.energyCapacity=MULTIBLOCK_POWER.dynamos(m).reduce(function(n,d){return n+d.energyCapacity;},0);},
      options: {}
    });
  }

  if (window.MULTIBLOCKS && MULTIBLOCKS.registerShape) MULTIBLOCKS.registerShape('ic2reactor', { w: 3, h: 3, cx: 1, cy: 1 });

  if (GD.machines && Array.isArray(GD.machines.cats) && !GD.machines.cats.some(function (c) { return c.id === 'ic2reactor'; })) {
    GD.machines.cats.push({ id: 'ic2reactor', cn: '核电', slots: { in: 0, out: 0, fluid: 0 }, tiers: [{ t: 3, tag: '多方块', k: KEY, name: '核反应堆' }] });
  }
})();
