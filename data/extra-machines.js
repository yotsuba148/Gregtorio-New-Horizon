window.GD=window.GD||{};
/* GT++ 机器补充定义：这些机器原版 jar 里有，但不在生成的 registry 里 */
(window.GD.extraMachineDefinitions=window.GD.extraMachineDefinitions||[]).push(
  {key:'gregtech:gt.blockmachines@992', cat:'cutter', cn:'工业切割机', tag:'EV',
   tier:4, volt:2048,
   slots:{in:4, out:4, fluid:16000},
   fluidInputTanks:[16000], fluidOutputTanks:[16000,16000],
   energyCapacity:8192, startEnergy:256, amperage:4,
   autoItems:true, autoFluids:true,
   port:'idle2d_four_sides_gt_like', interrupt:'pause', generator:false,
   behavior:'batch_processor', recipeMap:'gt.recipe.cutter',
   multiblock:true, requiresStructure:true, structureProfile:'industrialcuttingmachine'}
  ,{key:'gregtech:gt.blockmachines@26763', cat:'macerator', cn:'EX 虚空矿机 I', tag:'LV',
   tier:1, volt:32, slots:{in:4,out:4,fluid:16000},
   fluidInputTanks:[16000], fluidOutputTanks:[16000],
   energyCapacity:256, startEnergy:32, amperage:2,
   autoItems:true, autoFluids:true,
   port:'idle2d_four_sides_gt_like', interrupt:'pause', generator:false,
   behavior:'void_miner', recipeMap:'gt.recipe.macerator',
   multiblock:true, requiresStructure:true, structureProfile:'exvoidminer1'}
  ,{key:'gregtech:gt.blockmachines@26764', cat:'macerator', cn:'EX 虚空矿机 II', tag:'HV',
   tier:3, volt:512, slots:{in:4,out:4,fluid:16000},
   fluidInputTanks:[16000], fluidOutputTanks:[16000],
   energyCapacity:4096, startEnergy:512, amperage:2,
   autoItems:true, autoFluids:true,
   port:'idle2d_four_sides_gt_like', interrupt:'pause', generator:false,
   behavior:'void_miner', recipeMap:'gt.recipe.macerator',
   multiblock:true, requiresStructure:true, structureProfile:'exvoidminer2'}
  ,{key:'gregtech:gt.blockmachines@26765', cat:'macerator', cn:'EX 虚空矿机 III', tag:'IV',
   tier:5, volt:8192, slots:{in:4,out:4,fluid:16000},
   fluidInputTanks:[16000], fluidOutputTanks:[16000],
   energyCapacity:65536, startEnergy:8192, amperage:2,
   autoItems:true, autoFluids:true,
   port:'idle2d_four_sides_gt_like', interrupt:'pause', generator:false,
   behavior:'void_miner', recipeMap:'gt.recipe.macerator',
   multiblock:true, requiresStructure:true, structureProfile:'exvoidminer3'}

  ,{key:'gregtech:gt.blockmachines@1127', cat:'generator', cn:'LV 新手魔法能源吸收器', tag:'LV',
   tier:1, volt:32, slots:{in:1,out:1,fluid:0},
   fluidInputTanks:[], fluidOutputTanks:[],
   energyCapacity:512512, startEnergy:0, amperage:1,
   autoItems:true, autoFluids:false,
   port:'idle2d_four_sides_gt_like', interrupt:'pause', generator:true,
   behavior:'magic_absorber',  orderFamily:'魔法能源机器'}
  ,{key:'gregtech:gt.blockmachines@1128', cat:'generator', cn:'MV 学徒魔法能源吸收器', tag:'MV',
   tier:2, volt:128, slots:{in:1,out:1,fluid:0},
   fluidInputTanks:[], fluidOutputTanks:[],
   energyCapacity:2048512, startEnergy:0, amperage:1,
   autoItems:true, autoFluids:false,
   port:'idle2d_four_sides_gt_like', interrupt:'pause', generator:true,
   behavior:'magic_absorber',  orderFamily:'魔法能源机器'}
  ,{key:'gregtech:gt.blockmachines@1129', cat:'generator', cn:'HV 大师魔法能源吸收器', tag:'HV',
   tier:3, volt:512, slots:{in:1,out:1,fluid:0},
   fluidInputTanks:[], fluidOutputTanks:[],
   energyCapacity:8192512, startEnergy:0, amperage:1,
   autoItems:true, autoFluids:false,
   port:'idle2d_four_sides_gt_like', interrupt:'pause', generator:true,
   behavior:'magic_absorber',  orderFamily:'魔法能源机器'}
  ,{key:'gregtech:gt.blockmachines@1130', cat:'generator', cn:'EV 宗师魔法能源吸收器', tag:'EV',
   tier:4, volt:2048, slots:{in:1,out:1,fluid:0},
   fluidInputTanks:[], fluidOutputTanks:[],
   energyCapacity:32768512, startEnergy:0, amperage:1,
   autoItems:true, autoFluids:false,
   port:'idle2d_four_sides_gt_like', interrupt:'pause', generator:true,
   behavior:'magic_absorber',  orderFamily:'魔法能源机器'}

  ,{key:'gregtech:gt.blockmachines@1123', cat:'generator', cn:'LV 新手魔法能源转换器', tag:'LV',
   tier:1, volt:32, slots:{in:0,out:0,fluid:0},
   fluidInputTanks:[], fluidOutputTanks:[],
   energyCapacity:0, startEnergy:0, amperage:0,
   autoItems:false, autoFluids:false, unplaceable:true,
   behavior:'batch_processor', orderFamily:'魔法能源机器'}
  ,{key:'gregtech:gt.blockmachines@1124', cat:'generator', cn:'MV 学徒魔法能源转换器', tag:'MV',
   tier:2, volt:128, slots:{in:0,out:0,fluid:0},
   fluidInputTanks:[], fluidOutputTanks:[],
   energyCapacity:0, startEnergy:0, amperage:0,
   autoItems:false, autoFluids:false, unplaceable:true,
   behavior:'batch_processor', orderFamily:'魔法能源机器'}
  ,{key:'gregtech:gt.blockmachines@1125', cat:'generator', cn:'HV 大师魔法能源转换器', tag:'HV',
   tier:3, volt:512, slots:{in:0,out:0,fluid:0},
   fluidInputTanks:[], fluidOutputTanks:[],
   energyCapacity:0, startEnergy:0, amperage:0,
   autoItems:false, autoFluids:false, unplaceable:true,
   behavior:'batch_processor', orderFamily:'魔法能源机器'}
);

// NH Utilities 1.6.0 registers these eleven egg machines from EV through MAX.
(function(){
  var creeperEgg = 'GalacticraftMars:tile.creeperEgg';
  CONTENT.registerItem({id:creeperEgg,k:creeperEgg+'@0',base:creeperEgg+'@0',meta:0,name:'苦力怕蛋',maxStack:64});
  for (var tier = 4; tier <= 14; tier++) {
    var meta = 25001 + tier - 4;
    var key = 'gregtech:gt.blockmachines@' + meta;
    var voltage = DEFS.voltOf(tier);
    var tag = DEFS.tagOf(tier);
    var name = tag + ' ' + GD.items[key];
    GD.items[key] = CONTENT.item(key).name = name;
    GD.extraMachineDefinitions.push({
      key: key, cat: 'generator', cn: name, tag: tag,
      tier: tier, volt: voltage, slots: {in:2,out:0,fluid:0},
      energyCapacity: voltage * 114514, startEnergy: 0, amperage: 1, windowWidth: 350,
      generator: true, behavior: 'egg_generator', recipeMap:'none:egg',
      autoItems: false, controlCircuit: false, preserveItemSlots: true, orderFamily: '蛋机能源吸收器'
    });
  }
})();
