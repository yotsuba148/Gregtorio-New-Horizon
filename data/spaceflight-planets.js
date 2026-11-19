/* GTNH 2.8.4 · Galacticraft、GalaxySpace 和 BartWorks 的可到达目的地。 */
(function (root) {
  'use strict';
  var C = root.SPACEFLIGHT_CONTENT;
  if (!C || !C.planets) return;
  var mission=C.mission;
  var add = [
    {
      id: 'mars', name: '火星', tier: 2, dimension: 29, background: 'bg/mars.webp',
      mission: mission('first_mars',2),
      actions: [
        { id: 'mars_rock', name: '开采火星岩石', time: 3, toolTypes: ['pick'], out: [['GalacticraftMars:tile.mars@5', 1], ['GalacticraftMars:tile.mars@6', 1], ['GalacticraftMars:tile.mars@4', 1]] },
        { id: 'mars_sludge', name: '采集菌泥', time: 5, fluidSource: 'bacterialsludge', out: [['GalacticraftMars:item.bucketSludge@0', 1]] },
        C.dungeon('mars_dungeon', '火星地牢', 'GalacticraftMars:tile.mars@7', 3, [['GalacticraftMars:tile.creeperEgg@0', 1]])
      ]
    },
    {
      id: 'phobos', name: '火卫一', tier: 2, dimension: 38, background: 'bg/phobos-a.webp', backgrounds: ['bg/phobos-a.webp', 'bg/phobos-b.webp'],
      parent: 'mars',
      mission: mission('first_phobos',2),
      actions: [{ id: 'phobos_rock', name: '开采火卫一岩石', time: 3, toolTypes: ['pick'], out: [['GalaxySpace:phobosblocks@0', 1], ['GalaxySpace:phobosblocks@1', 1], ['GalaxySpace:phobosblocks@2', 1]] }]
    },
    {
      id: 'deimos', name: '火卫二', tier: 2, dimension: 40, background: 'bg/deimos-a.webp', backgrounds: ['bg/deimos-a.webp', 'bg/deimos-b.webp'],
      parent: 'mars',
      mission: mission('first_deimos',2),
      actions: [{ id: 'deimos_rock', name: '开采火卫二岩石', time: 3, toolTypes: ['pick'], out: [['GalaxySpace:deimosblocks@0', 1], ['GalaxySpace:deimosblocks@1', 1]] }]
    },
    {
      id: 'asteroids', name: '小行星带', tier: 3, dimension: 30, background: 'bg/asteroids.webp',
      mission: mission('first_asteroids',3),
      actions: [{ id: 'asteroids_rock', name: '开采小行星岩石', time: 3, toolTypes: ['pick'], out: [['GalacticraftMars:tile.asteroidsBlock@0', 1], ['GalacticraftMars:tile.asteroidsBlock@1', 1], ['GalacticraftMars:tile.asteroidsBlock@2', 1]] }]
    },
    {
      id: 'ceres', name: '谷神星', tier: 3, dimension: 42, background: 'bg/ceres.webp',
      mission: mission('first_ceres',3),
      actions: [{ id: 'ceres_rock', name: '开采谷神星岩石', time: 3, toolTypes: ['pick'], out: [['GalaxySpace:ceresblocks@0', 1], ['GalaxySpace:ceresblocks@1', 1]] },
        { id: 'find_poor_naquadah', name: '寻找贫瘠硅岩矿石', time: GD.looseOreSearchSeconds, timing: 'search', repeatable: false, out: [['gregtech:gt.metaitem.01@5324', 1]] },
        C.dungeon('ceres_dungeon', '谷神星地牢', 'GalaxySpace:ceresblocks@2', 4)
      ]
    },
    {
      id: 'europa', name: '木卫二', tier: 3, dimension: 35, background: 'bg/europa.webp',
      mission: mission('first_europa',3),
      actions: [{ id: 'europa_rock', name: '开采木卫二岩石', time: 3, toolTypes: ['pick'], out: [['GalaxySpace:europagrunt@0', 1], ['GalaxySpace:europagrunt@1', 1]] }]
    },
    {
      id: 'ganymede', name: '木卫三', tier: 3, dimension: 43, background: 'bg/ganymede.webp',
      mission: mission('first_ganymede',3),
      actions: [{ id: 'ganymede_rock', name: '开采木卫三岩石', time: 3, toolTypes: ['pick'], out: [['GalaxySpace:ganymedeblocks@0', 1], ['GalaxySpace:ganymedeblocks@1', 1]] }]
    },
    {
      id: 'callisto', name: '木卫四', tier: 3, dimension: 45, background: 'bg/callisto.webp',
      mission: mission('first_callisto',3),
      actions: [{ id: 'callisto_rock', name: '开采木卫四岩石', time: 3, toolTypes: ['pick'], out: [['GalaxySpace:callistoblocks@0', 1], ['GalaxySpace:callistoblocks@1', 1]] }]
    },
    {
      id: 'mercury', name: '水星', tier: 4, dimension: 37, background: 'bg/mercury.webp',
      mapIcon: 'bg/space-map/mercury.png',
      mission: mission('first_mercury',4),
      actions: [{ id: 'mercury_rock', name: '开采水星岩石', time: 3, toolTypes: ['pick'], out: [['GalaxySpace:mercuryblocks@0', 1], ['GalaxySpace:mercuryblocks@1', 1], ['GalaxySpace:mercuryblocks@2', 1]] }]
    },
    {
      id: 'venus', name: '金星', tier: 4, dimension: 39, background: 'bg/venus.webp',
      mapIcon: 'bg/space-map/venus.png',
      mission: mission('first_venus',4),
      actions: [{ id: 'venus_rock', name: '开采金星岩石', time: 3, toolTypes: ['pick'], out: [['GalaxySpace:venusblocks@0', 1], ['GalaxySpace:venusblocks@1', 1]] }]
    },
    {
      id: 'io', name: '木卫一', tier: 4, dimension: 36, background: 'bg/io.webp',
      mapIcon: 'bg/space-map/io.png',
      mission: mission('first_io',4),
      actions: [{ id: 'io_rock', name: '开采木卫一岩石', time: 3, toolTypes: ['pick'], out: [['GalaxySpace:ioblocks@0', 1], ['GalaxySpace:ioblocks@2', 1]] },
        C.dungeon('io_dungeon', '木卫一地牢', 'GalaxySpace:ioblocks@3', 5)
      ]
    },
    {
      id: 'enceladus', name: '土卫二', tier: 5, dimension: 41, background: 'bg/enceladus-saturn.webp',
      mapIcon: 'bg/space-map/enceladus.png',
      mission: mission('first_enceladus',5),
      actions: [{ id: 'enceladus_rock', name: '开采土卫二岩石', time: 3, toolTypes: ['pick'], out: [['GalaxySpace:enceladusblocks@0', 1], ['GalaxySpace:enceladusblocks@1', 1], ['GalaxySpace:enceladusblocks@3', 1]] },
        C.dungeon('enceladus_dungeon', '土卫二地牢', 'GalaxySpace:enceladusblocks@2', 6)
      ]
    },
    {
      id: 'titan', name: '土卫六', tier: 5, dimension: 44, background: 'bg/titan.webp',
      mapIcon: 'bg/space-map/titan.png',
      mission: mission('first_titan',5),
      actions: [{ id: 'titan_rock', name: '开采土卫六岩石', time: 3, toolTypes: ['pick'], out: [['GalaxySpace:titanblocks@0', 1], ['GalaxySpace:titanblocks@1', 1], ['GalaxySpace:titanblocks@2', 1]] }]
    },
    {
      id: 'miranda', name: '天卫五', tier: 5, dimension: 86, background: 'bg/miranda.webp',
      mapIcon: 'bg/space-map/miranda.png',
      mission: mission('first_miranda',5),
      actions: [{ id: 'miranda_rock', name: '开采天卫五岩石', time: 3, toolTypes: ['pick'], out: [['GalaxySpace:mirandablocks@0', 1], ['GalaxySpace:mirandablocks@1', 1], ['GalaxySpace:mirandablocks@2', 1]] }]
    },
    {
      id: 'oberon', name: '天卫四', tier: 5, dimension: 46, background: 'bg/oberon.webp',
      mapIcon: 'bg/space-map/oberon.png',
      mission: mission('first_oberon',5),
      actions: [{ id: 'oberon_rock', name: '开采天卫四岩石', time: 3, toolTypes: ['pick'], out: [['GalaxySpace:oberonblocks@0', 1], ['GalaxySpace:oberonblocks@1', 1], ['GalaxySpace:oberonblocks@2', 1]] }]
    },
    {
      id: 'proteus', name: '海卫八', tier: 6, dimension: 47,
      mapIcon: 'bg/space-map/proteus.png',
      mission: mission('first_proteus',6),
      actions: [{ id: 'proteus_rock', name: '开采海卫八岩石', time: 3, toolTypes: ['pick'], out: [['GalaxySpace:proteusblocks@0', 1], ['GalaxySpace:proteusblocks@1', 1], ['GalaxySpace:proteusblocks@2', 1]] },
        C.dungeon('proteus_dungeon', '海卫八地牢', 'GalaxySpace:proteusblocks@3', 7)
      ]
    },
    {
      id: 'triton', name: '海卫一', tier: 6, dimension: 48,
      mapIcon: 'bg/space-map/triton.png',
      mission: mission('first_triton',6),
      actions: [{ id: 'triton_rock', name: '开采海卫一岩石', time: 3, toolTypes: ['pick'], out: [['GalaxySpace:tritonblocks@0', 1], ['GalaxySpace:tritonblocks@1', 1], ['GalaxySpace:tritonblocks@2', 1]] }]
    },
    {
      id: 'pluto', name: '冥王星', tier: 7, dimension: 49,
      mapIcon: 'bg/space-map/pluto.png',
      mission: mission('first_pluto',7),
      actions: [{ id: 'pluto_rock', name: '开采冥王星岩石', time: 3, toolTypes: ['pick'], out: [['GalaxySpace:plutoblocks@0', 1], ['GalaxySpace:plutoblocks@4', 1], ['GalaxySpace:plutoblocks@5', 1]] },
        C.dungeon('pluto_dungeon', '冥王星地牢', 'GalaxySpace:plutoblocks@6', 8, [['kubatech:kubaitems@38', 1]])
      ]
    },
    {
      id: 'haumea', name: '妊神星', tier: 7, dimension: 83,
      mapIcon: 'bg/space-map/haumea.png',
      mission: mission('first_haumea',7),
      actions: [{ id: 'haumea_rock', name: '开采妊神星岩石', time: 3, toolTypes: ['pick'], out: [['GalaxySpace:haumeablocks@0', 1]] }]
    },
    {
      id: 'makemake', name: '鸟神星', tier: 7, dimension: 25,
      mapIcon: 'bg/space-map/makemake.png',
      mission: mission('first_makemake',7),
      actions: [{ id: 'makemake_rock', name: '开采鸟神星岩石', time: 3, toolTypes: ['pick'], out: [['GalaxySpace:makemakegrunt@0', 1], ['GalaxySpace:makemakegrunt@1', 1]] }]
    },
    {
      id: 'barnardae', name: '巴纳德E', tier: 8, dimension: 81,
      mapIcon: 'bg/space-map/barnarda4.png',
      veinSources: ['barnarde'],
      mission: mission('first_barnardae',8),
      actions: [{ id: 'barnardae_rock', name: '开采巴纳德E岩石', time: 3, toolTypes: ['pick'], out: [['GalaxySpace:barnardaEgrunt@0', 1], ['GalaxySpace:barnardaEsubgrunt@0', 1]] }]
    },
    {
      id: 'barnardaf', name: '巴纳德F', tier: 8, dimension: 82,
      mapIcon: 'bg/space-map/barnarda5.png',
      veinSources: ['barnardf'],
      mission: mission('first_barnardaf',8),
      actions: [{ id: 'barnardaf_rock', name: '开采巴纳德F岩石', time: 3, toolTypes: ['pick'], out: [['GalaxySpace:barnardaFsubgrunt@0', 1], ['GalaxySpace:barnardaFgrunt@0', 1]] }]
    },
    {
      id: 'centauribb', name: '半人马座Bb', tier: 8, dimension: 31,
      mapIcon: 'bg/space-map/centauribb.png',
      veinSources: ['centauria','centaurialpha'],
      mission: mission('first_centauribb',8),
      actions: [{ id: 'centauribb_rock', name: '开采半人马座Bb岩石', time: 3, toolTypes: ['pick'], out: [['GalaxySpace:acentauribbgrunt@0', 1], ['GalaxySpace:acentauribbsubgrunt@0', 1]] }]
    },
    {
      id: 'vegab', name: '织女一B', tier: 8, dimension: 84,
      mapIcon: 'bg/space-map/vega1.png',
      mission: mission('first_vegab',8),
      actions: [{ id: 'vegab_rock', name: '开采织女一B岩石', time: 3, toolTypes: ['pick'], out: [['GalaxySpace:vegabgrunt@0', 1], ['GalaxySpace:vegabsubgrunt@0', 1]] }]
    },
    {
      id: 'marsstation', name: '火星空间站', tier: 2, dimension: 34, background: 'bg/marsstation.webp',
      parent: 'mars',
      mission: mission('first_marsstation',2),
      actions: []
    },
    {
      id: 'jupiterstation', name: '木星空间站', tier: 3, dimension: 72, background: 'bg/jupiterstation.webp',
      mission: mission('first_jupiterstation',3),
      actions: []
    },
    {
      id: 'venusstation', name: '金星空间站', tier: 4, dimension: 87, background: 'bg/venusstation.webp',
      mapIcon: 'bg/space-map/venus.png',
      parent: 'venus',
      mission: mission('first_venusstation',4),
      actions: []
    },
    {
      id: 'saturnstation', name: '土星空间站', tier: 5, dimension: 78, background: 'bg/saturnstation.webp',
      mapIcon: 'bg/space-map/saturn.png',
      mission: mission('first_saturnstation',5),
      actions: []
    },
    {
      id: 'uranusstation', name: '天王星空间站', tier: 5, dimension: 52, background: 'bg/uranusstation.webp',
      mapIcon: 'bg/space-map/uranus.png',
      mission: mission('first_uranusstation',5),
      actions: []
    },
    {
      id: 'neptunestation', name: '海王星空间站', tier: 6, dimension: 75,
      mapIcon: 'bg/space-map/neptune.png',
      mission: mission('first_neptunestation',6),
      actions: []
    },
    {
      id: 'earthstation', name: '地球空间站', tier: 1, dimension: 27, background: 'bg/earthstation.webp',
      mapIcon: 'bg/space-map/earth.png',
      mission: mission('first_earthstation',1),
      actions: []
    },
    {
      id: 'ross128b', name: '罗斯128b', tier: 3, dimension: 64,
      background: 'bg/ross128b.webp',
      mission: mission('first_ross128b',3),
      actions: [{ id: 'ross128b_rock', name: '开采罗斯128b岩石', time: 3, toolTypes: ['pick'], out: [['minecraft:stone@0', 1]] }]
    },
    {
      id: 'ross128ba', name: '罗斯128ba', tier: 5, dimension: 63, background: 'bg/ross128ba.webp',
      mapIcon: 'bg/space-map/ross128ba.png',
      mission: mission('first_ross128ba',5),
      actions: [{ id: 'ross128ba_rock', name: '开采罗斯128ba岩石', time: 3, toolTypes: ['pick'], out: [['GalacticraftCore:tile.moonBlock@4', 1]] }]
    },
    {
      id: 'kuiperbelt', name: '柯伊伯带', tier: 7, dimension: 33,
      mapIcon: 'bg/space-map/kuiperbelt.png',
      mission: mission('first_kuiperbelt',7),
      actions: [{ id: 'kuiperbelt_rock', name: '开采柯伊伯带岩石', time: 3, toolTypes: ['pick'], out: [['GalacticraftMars:tile.asteroidsBlock@0', 1], ['GalacticraftMars:tile.denseIce@0', 1]] }]
    },
    {
      id: 'barnardac', name: '巴纳德C', tier: 8, dimension: 32,
      mapIcon: 'bg/space-map/barnarda2.png',
      veinSources: ['barnardc'],
      mission: mission('first_barnardac',8),
      actions: [
        { id: 'barnardac_rock', name: '开采巴纳德C岩石', time: 3, toolTypes: ['pick'], out: [['minecraft:stone@0', 1], ['GalaxySpace:barnardaCgrass@0', 1]] },
        { id: 'barnardac_tree', name: '砍伐巴纳德C树木', time: 12, toolTypes: ['axe'], out: [['GalaxySpace:barnardaClog@0', 4], ['GalaxySpace:barnardaCsapling@0', 1]] }
      ]
    },
    {
      id: 'tcetie', name: '鲸鱼座T星E', tier: 8, dimension: 85,
      mapIcon: 'bg/space-map/tcetie.png',
      mission: mission('first_tcetie',8),
      actions: [
        { id: 'tcetie_rock', name: '开采鲸鱼座T星E岩石', time: 3, toolTypes: ['pick'], out: [['GalaxySpace:tcetieblocks@0', 1], ['GalaxySpace:tcetieblocks@1', 1], ['GalaxySpace:tcetieblocks@2', 1]] },
        { id: 'tcetie_algae', name: '采集鲸鱼座T星E藻类', time: 8, out: Array.from({length:6},function(_,meta){return['GalaxySpace:tcetiedandelions@'+meta,1];}) }
      ]
    },
  ];
  add.forEach(function (p) { if (!C.planets.some(function (q) { return q.id === p.id; })) C.planets.push(p); });
})(typeof window !== 'undefined' ? window : globalThis);
