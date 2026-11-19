(function(root){
 'use strict';
 var schematics=[
  {tier:2,knowledge:'space:rocket:t2',item:'GalacticraftCore:item.schematic@1'},
  {tier:3,knowledge:'space:rocket:t3',item:'GalacticraftMars:item.schematic@0',alternative:'dreamcraft:item.SchematicsTier3@0'}
 ];
 for(var tier=4;tier<=8;tier++){
  schematics.push({tier:tier,knowledge:'space:rocket:t'+tier,item:'GalaxySpace:item.SchematicTier'+tier+'@0'});
 }
 // Earth launch costs rounded from the GTNH 2.8.4 ascent of each minimum rocket tier.
 var launchFuelByTier={1:2100,2:1500,3:1100,4:1400,5:1400,6:1400,7:1400,8:1400};
 function mission(id,tier){return{id:id,fuel:launchFuelByTier[tier]};}
 function dungeon(id,name,icon,rocketTier,bonus){
  var schematic=schematics.find(function(s){return s.tier===rocketTier;});
  if(!schematic)throw Error('Missing rocket schematic for '+id);
  return {id:id,name:name,icon:icon,time:180,combat:true,limit:1,
   out:[[schematic.item,1]].concat(bonus||[]),unlock:schematic.knowledge,unlockText:'已解锁T'+rocketTier+'火箭'};
 }
 root.SPACEFLIGHT_CONTENT={quest:2744,home:'earth',initialDestination:'moon',schematics:schematics,mission:mission,dungeon:dungeon,equipment:[{k:'GalacticraftCore:item.oxygenMask@0',n:1},{k:'GalacticraftCore:item.oxygenGear@0',n:1},{k:'GalacticraftCore:item.parachute@0',alternatives:Array.from({length:16},function(_,i){return'GalacticraftCore:item.parachute@'+i;}),n:1}],rockets:[
  {id:'t1',itemId:'GalacticraftCore:item.spaceship',entity:'micdoodle8.mods.galacticraft.core.entities.EntityTier1Rocket',tier:1,maxMeta:3,baseCapacity:1000},
  {id:'t2',itemId:'GalacticraftMars:item.spaceshipTier2',entity:'micdoodle8.mods.galacticraft.planets.mars.entities.EntityTier2Rocket',tier:2,maxMeta:3,baseCapacity:1500}
 ],planets:[
  {id:'earth',name:'地球',tier:0,background:'bg/spaceport-site-v2.webp',spaceport:{site:'bg/spaceport-site-v2.webp',empty:'bg/spaceport-empty-v2.webp',ready:'bg/spaceport-ready-v2.webp'}},
  {id:'moon',name:'月球',tier:1,dimension:28,background:'bg/moon.webp',
   film:{src:'media/apollo11-moon-journey-720.mp4',duration:229.353417,countdown:10},
   cabinBackground:'bg/moon-cabin.webp',navigationUntilReturn:true,
   returnFilm:{src:'media/apollo11-return-720.mp4',duration:180.503991,countdown:0},
   mission:mission('first_moon',1),
   actions:[
    {id:'moon_dirt',name:'挖月球泥土',time:2,out:[['GalacticraftCore:tile.moonBlock@3',1]]},
    {id:'moon_stone',name:'开采月球石头',time:3,toolTypes:['pick'],conditions:{tool:['pick']},out:[['GalacticraftCore:tile.moonBlock@4',1]]},
    {id:'moon_meteor',name:'寻找陨铁',time:30,toolTypes:['pick'],conditions:{tool:['pick']},out:[['GalacticraftCore:item.meteoricIronRaw@0',1]]},
    dungeon('moon_dungeon','月球地牢','GalacticraftCore:tile.moonBlock@14',2)
   ],
   legacy:{mission:'first_moon',landed:'landed',landings:'landings',stationTrips:'moonTrips'},
   source:'https://github.com/GTNewHorizons/Galacticraft/blob/master/src/main/java/micdoodle8/mods/galacticraft/core/GalacticraftCore.java#L283'}
 ]};
 GD.craft.filter(function(r){return r.station==='nasa';}).forEach(function(r){r.rocketTier=1;});
// 只保留无货仓的默认火箭：带铁箱货仓的配方不参与
GD.craft=GD.craft.filter(function(r){return !(r.station==='nasa'&&(r.slots||[]).some(function(s){return /BlockIronChest/.test(s[0]||'');}));});
// 原版 SchematicTier1Rocket.getRequiredItem() 返回空，部署工作台即可组装。
 var parts=[['GalaxySpace:item.ModuleLander2@0',1],['GalaxySpace:item.RocketControlComputer@2',1],['GalaxySpace:item.ModuleSmallFuelCanister@0',3],['GalacticraftCore:item.noseCone@0',1],['GalacticraftMars:item.null@3',10],['GalacticraftCore:item.engine@0',2],['GalacticraftCore:item.rocketFins@0',4],['GalacticraftCore:item.engine@1',2]];
 [null].forEach(function(chest,i){
  var slots=parts.flatMap(function(p){return Array.from({length:p[1]},function(){return[p[0]];});});if(chest)slots.push([chest]);
  GD.craft.push({id:'craft:nasa_t2:'+i,out:'GalacticraftMars:item.spaceshipTier2@'+i,n:1,slots:slots,shapeless:true,width:0,height:0,flags:{station:'nasa',stationSlots:32},source:'native:GalaxySpace1.1.121:RocketRecipes',station:'nasa',rocketTier:2,research:'space:rocket:t2'});
 });
})(typeof window!=='undefined'?window:globalThis);
