/* Mod machine families use the same inventories, jobs, ports and storage transactions. */
(function(root){
 'use strict';
 function add(id,name,key,map,options){
  var d=Object.assign({key:key,cat:id,cn:name,tag:'设备',tier:1,volt:2147483647,behavior:'batch_processor',
   recipeMap:map,slots:{in:9,out:9,fluid:10000},fluidInputTanks:[10000],fluidOutputTanks:[10000],
   energyCapacity:0,startEnergy:0,amperage:32,autoItems:true,autoFluids:true,noOverclock:true,controlCircuit:false},options||{});
  GD.extraMachineDefinitions.push(d);GD.machines.cats.push({id:id,cn:name,slots:d.slots,tiers:[{t:1,tag:d.tag,k:key,name:name}]});
  GD.items[key]=name;CONTENT.alias(id,map);
 }
 // GT5U 5.09.51.482 MTEPotionBrewer: one item input, no item output;
 // MTEBasicMachine.getCapacityForTier supplies the one input/output fluid tank.
 // Static brewingRecipes share the ordinary processor. Potion-name fallback
 // transformations in checkRecipe are not represented by those static records.
 CONTENT.alias('brewery','gt.recipe.brewer');
 GD.machines.cats.push({id:'brewery',cn:'酿造机',en:'Brewery',slots:{in:1,out:0,fluid:1},tiers:[1,2,3,4].map(function(t){
  var k='gregtech:gt.blockmachines@'+(490+t),name=DEFS.tagOf(t)+' 酿造机';GD.items[k]=name;
  if(GD.faceIcons)GD.faceIcons[k]='modicons/face/gt_brewery_'+(490+t)+'.png';
  return{t:t,tag:DEFS.tagOf(t),k:k,name:name,fluidCapacity:8000*Math.pow(2,t)};
 })});
 [
  ['carpenter','木工机',1,4000,1100,9,1,true,false],
  ['centrifuge','离心机',2,5000,800,1,9,false,false],
  ['squeezer','榨汁机',5,5000,1100,9,1,false,true],
  ['still','蒸馏器',6,8000,1100,0,0,true,true]
 ].forEach(function(a){add('forestry_'+a[0],'林业'+a[1],'Forestry:factory@'+a[2],'forestry:'+a[0],{
  volt:32,energyCapacity:2048,startEnergy:256,amperage:2,tag:'LV',requiresRecipeSelection:a[0]==='carpenter',
  slots:{in:a[5],out:a[6],fluid:10000},fluidInputTanks:a[7]?[10000]:[],fluidOutputTanks:a[8]?[10000]:[]
 });});
 add('forestry_fermenter','林业发酵机','Forestry:factory@3','forestry:fermenter',{
  behavior:'charged_fermenter',tag:'LV',volt:32,maxRecipeEUt:128,energyCapacity:4445,startEnergy:584,amperage:4,
  slots:{in:2,out:0,fluid:10000},fluidInputTanks:[10000],fluidOutputTanks:[10000],autoFluids:true
 });
 add('enderio_sagmill','Ender IO SAG磨粉机','EnderIO:blockSagMill@0','enderio:sagmill',{
  volt:32,energyCapacity:27778,startEnergy:6,amperage:1,tag:'LV',noOverclock:true,
  slots:{in:1,out:4,fluid:0},fluidInputTanks:[],fluidOutputTanks:[],nativeCapacitor:'BASIC_CAPACITOR'
 });
 add('enderio_alloysmelter','Ender IO合金炉','EnderIO:blockAlloySmelter@0','enderio:alloysmelter',{
  volt:32,energyCapacity:27778,startEnergy:6,amperage:1,tag:'LV',noOverclock:true,
  slots:{in:3,out:1,fluid:0},fluidInputTanks:[],fluidOutputTanks:[],nativeCapacitor:'BASIC_CAPACITOR'
 });
 add('casting_table','匠魂浇铸台','TConstruct:SearedBlock@0','tconstruct:table',{tag:'浇铸',tier:0,castBasedCapacity:true,slots:{in:1,out:1,fluid:144},fluidInputTanks:[144],fluidOutputTanks:[]});
 add('casting_basin','匠魂浇铸盆','TConstruct:SearedBlock@2','tconstruct:basin',{tag:'浇铸',tier:0,castBasedCapacity:true,slots:{in:1,out:1,fluid:144},fluidInputTanks:[144],fluidOutputTanks:[]});
 add('railcraft_cokeoven','焦炉','Railcraft:machine.alpha@7','railcraft:cokeoven',{tag:'多方块',tier:0,
  slots:{in:1,out:1,fluid:64000},fluidInputTanks:[],fluidOutputTanks:[64000],multiblock:true,requiresStructure:true,structureProfile:'railcraft_cokeoven'});
 STRUCTURES.register({id:'railcraft_cokeoven',name:'焦炉',key:'Railcraft:machine.alpha@7',build:function(){return{parts:[{k:'Railcraft:machine.alpha@7',n:25}],power:0};}});

 [0,1,2,3].forEach(function(t){var cap=32000*Math.pow(2,t),name=['超低压','低压','中压','高压'][t]+'流体储罐',k='gregtech:gt.blockmachines@'+(817+t);add('portable_tank_'+t,name,k,'none:storage',{
  behavior:'fluid_storage',tag:'储罐',tier:t,entityName:name,slots:{in:1,out:1,fluid:cap},preserveItemSlots:true,containerProcessing:{empty:true,fill:true},sharedFluidStorage:true,canAutoFluidOutput:false,fluidInputTanks:[cap],fluidOutputTanks:[],autoFluids:false});var item=CONTENT.item(k);if(item)item.name=name;});
 [1,2,3,4,5].forEach(function(t){var cap=4000000*Math.pow(2,t-1),pumpTier=t===1?2:t<=3?3:4;
  add('super_tank_'+t,'超级缸 '+DEFS.tagOf(t),'gregtech:gt.blockmachines@'+(129+t),'none:storage',{
  behavior:'fluid_storage',digitalTank:true,tag:'储罐',tier:t,slots:{in:1,out:1,fluid:cap},preserveItemSlots:true,containerProcessing:{empty:true,fill:true},sharedFluidStorage:true,fluidInputTanks:[cap],fluidOutputTanks:[],
  fluidOutputRate:20*Math.pow(2,3+2*pumpTier),autoFluids:true});var k='gregtech:gt.blockmachines@'+(129+t),face='modicons/presentation/faces/gt_'+(129+t)+'_top.png';GD.faceIcons[k]=face;if(GD.gridFaceIcons)GD.gridFaceIcons[k]=face;if(GD.iconOverrides)GD.iconOverrides[k]=face;if(GD.workingFaces)GD.workingFaces[k]={idle:face,active:'modicons/presentation/faces/gt_'+(129+t)+'_topActive.png'};var item=CONTENT.item(k);if(item)item.name=GD.items[k];});
 DEFS.rebuild();
})(typeof window!=='undefined'?window:globalThis);

