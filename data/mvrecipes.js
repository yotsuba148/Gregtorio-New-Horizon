 
 
 
 
 
 
 
 
 
 
(function () {
  'use strict';

  var DATA = {
    /* 电弧炉：沙子烧成玻璃，HV 才能跑（256 EU/t） */
    arcfurnace: [
      {
        id: 'arc.glass', cn: '沙子烧成玻璃',
        in: [{ id: 'minecraft:sand@0', n: 1 }],
        out: [{ id: 'minecraft:glass@0', n: 2 }],
        fin: [{ f: 'oxygen', mb: 20 }], fout: [],
        dur: 20, eut: 256, req: []
      },
      {
        id: 'arc.annealed_copper', cn: '铜锭退火',
        in: [{ id: 'gregtech:gt.metaitem.01@11035', n: 1 }],
        out: [{ id: 'gregtech:gt.metaitem.01@11345', n: 1 }],
        fin: [{ f: 'oxygen', mb: 63 }], fout: [],
        dur: 63, eut: 90, req: []
      },
      {
        id: 'arc.wrought_iron', cn: '铁锭炼成熟铁',
        in: [{ id: 'minecraft:iron_ingot@0', n: 1 }],
        out: [{ id: 'gregtech:gt.metaitem.01@11304', n: 1 }],
        fin: [{ f: 'oxygen', mb: 56 }], fout: [],
        dur: 56, eut: 90, req: []
      }
    ],

    /* 高炉那类配方（氧化铝→铝，要 2054K 炉温）暂时没进来：
     * 这份导出里没有任何高炉/多方块机器（机器表里搜不到“高炉”），
     * 也没有氧化铝粉这个物品。炉温机制已经写好并且能判，
     * 等把多方块高炉和相应物品补上，这些配方直接加就行。 */

    /* 电解：这条是"非消耗条件"的样板。
     * 实测原文里 3 号编程电路 count=0 —— 要有，但不消耗。 */
    electrolyzer: [
      {
        id: 'elec.water_cells', cn: '水电解成氢氧',
        in: [{ id: 'IC2:itemCellEmpty@0', n: 2 }],
        out: [{ id: 'gregtech:gt.metaitem.01@30001', n: 2 }],
        fin: [{ f: 'water', mb: 1000 }],
        fout: [{ f: 'oxygen', mb: 1000 }],
        dur: 2000, eut: 30,
        req: [{ circuit: 3 }]
      },
      {
        id: 'elec.h2s_cells', cn: '硫化氢电解回氢',
        in: [
          { id: 'gregtech:gt.metaitem.01@30460', n: 1 },
          { id: 'IC2:itemCellEmpty@0', n: 1 }
        ],
        out: [
          { id: 'gregtech:gt.metaitem.01@2022', n: 1 },
          { id: 'gregtech:gt.metaitem.01@30001', n: 2 }
        ],
        fin: [], fout: [],
        dur: 72, eut: 120, req: []
      }
    ]
  };

  window.GD = window.GD || {};
  window.GD.mvrecipes = DATA;
  window.GD.mvrecipesMeta = {
    source: 'GTNH 2.8.4 / GT 5.09.51.482 运行时实测',
    note: '同批次的概率产出与 count:0 条件从这里进来；导入器以后可以整表替换。'
  };
})();
