/* Explicit idle-game identities requested by the player; coloured/fused quartz stay distinct. */
GD.contentData.idleItemAliases={
 'dreamcraft:item.HeavyDutyPlateTier3@0':'GalacticraftMars:item.itemBasicAsteroids@0',
 'EnderIO:blockFusedQuartz@1':'minecraft:glass@0',
 'TConstruct:GlassBlock@0':'minecraft:glass@0',
 'TConstruct:GlassPane@0':'minecraft:glass_pane@0',
 'TConstruct:blankPattern@2':'TConstruct:blankPattern@1',
 'IC2:blockMachine@1':'etfuturum:blast_furnace@0',
 'Railcraft:fluid.creosote.cell@0':'gregtech:gt.metaitem.01@30712',
 'miscutils:itemCellNeon@0':'bartworks:gt.bwMetaGeneratedcell@41',
 'miscutils:itemCellKrypton@0':'bartworks:gt.bwMetaGeneratedcell@42',
 'miscutils:itemCellXenon@0':'bartworks:gt.bwMetaGeneratedcell@37',
 'IC2:itemCellEmpty@14':'gregtech:gt.metaitem.98@0',
 'IC2:itemBatLamaCrystal@32767':'IC2:itemBatLamaCrystal@26',
 'appliedenergistics2:item.ItemMultiPart@440':'appliedenergistics2:tile.BlockInterface@0',
 'ae2fc:part_fluid_interface@0':'ae2fc:fluid_interface@0',
 'ae2fc:fluid_interface@77':'ae2fc:fluid_interface@0',
 'EnderIO:itemMaterial@12':'gregtech:gt.metaitem.01@23364',
 'programmablehatches:proghatches.storageproxy.part@0':'programmablehatches:proghatches.proxy@0',
 'programmablehatches:proghatches.storageproxy.part@1':'programmablehatches:proghatches.proxy@1',
 'programmablehatches:proghatches.storageproxy.part@2':'programmablehatches:proghatches.proxy@2'
};
GD.contentData.idleFluidAliases={ic2steam:'steam'};
// dustSpace is a shared recipe ingredient. Each source dust has its own centrifuge recipe.
Object.keys(GD.contentData.equivalences).forEach(function(index){
 if(GD.contentData.equivalences[index]==='dustSpace')delete GD.contentData.equivalences[index];
});
// Structure glass retains its native identity before any recipe is decoded.
GD.contentData.idleDistinctItems=Array.from({length:16},function(_,i){return 'bartworks:BW_GlasBlocks@'+i;})
 .concat(['bartworks:BW_GlasBlocks2@0','EnderIO:blockFusedQuartz@0','EnderIO:blockFusedQuartz@2'])
 .concat(Array.from({length:6},function(_,i){return 'gregtech:gt.blockglass1@'+i;}));
GD.contentData.idleItemNames={
'EMT:EMTItems@16':'龙芯图纸',
'EMT:EMTItems@17':'双足飞龙核心图纸',
'EMT:EMTItems@18':'觉醒核心图纸',
'EMT:EMTItems@19':'混沌核心图纸',
'GalacticraftCore:item.schematic@0':'1 阶火箭图纸',
'GalacticraftCore:item.schematic@1':'2 阶火箭图纸',
'GalacticraftMars:item.schematic@0':'3 阶火箭图纸',
 'gregtech:gt.metaitem.98@0':'蒸汽单元',
 'GalacticraftCore:item.heavyPlating@0':'1阶重型装甲板',
 'GalacticraftMars:item.null@3':'2阶重型装甲板'
};
