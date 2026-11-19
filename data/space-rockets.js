(function () {
 'use strict';
 // GalaxySpace 1.1.121-GTNH RocketRecipes: no-cargo variants and EntityTierNRocket fuel capacities.
 var medium='MediumFuelCanister',large='LargeFuelCanister',extra='ExtraLargeFuelCanister';
 var nose='HeavyDutyNoseConeTier',plate='HeavyDutyPlateTier',engine='HeavyDutyRocketEngineTier',fins='HeavyDutyRocketFinsTier';
 var asteroid='GalacticraftMars:item.itemBasicAsteroids@';
 var specs=[
  {tier:4,capacity:2000,parts:[[medium,4],['GalacticraftMars:item.heavyNoseCone@0',1],[plate+4,12],[asteroid+1,2],[asteroid+2,6],['GalacticraftCore:item.engine@1',4]]},
  {tier:5,capacity:2300,parts:[[medium,2],[large,2],[nose+3,1],[plate+5,12],[engine+3,4],[fins+3,6],['Tier2Booster',4]]},
  {tier:6,capacity:2300,parts:[[large,4],[nose+3,1],[plate+6,12],[engine+3,5],[fins+3,8],['Tier2Booster',6]]},
  {tier:7,capacity:2300,parts:[[large,2],[extra,2],[nose+4,1],[plate+7,12],[engine+4,6],[fins+4,8],['Tier3Booster',8]]},
  {tier:8,capacity:2300,parts:[[extra,4],[nose+4,1],[plate+8,18],[engine+4,7],[fins+4,10],['Tier4Booster',10]]}
 ];
 specs.forEach(function(spec){
  var tier=spec.tier,id='t'+tier,itemId='GalaxySpace:item.Tier'+tier+'Rocket';
  var parts=[['GalaxySpace:item.ModuleLander3@0',1],['GalaxySpace:item.RocketControlComputer@'+tier,1]].concat(spec.parts);
  var slots=parts.flatMap(function(part){
   var key=part[0].includes(':')?part[0]:'dreamcraft:item.'+part[0]+'@0';
   return Array.from({length:part[1]},function(){return[key];});
  });
  SPACEFLIGHT_CONTENT.rockets.push({id:id,itemId:itemId,entity:'galaxyspace.core.entity.rocket.EntityTier'+tier+'Rocket',tier:tier,maxMeta:3,baseCapacity:spec.capacity});
  GD.craft.push({id:'craft:nasa_'+id+':0',out:itemId+'@0',n:1,slots:slots,shapeless:true,width:0,height:0,
   flags:{station:'nasa',stationSlots:slots.length+1},source:'native:GalaxySpace1.1.121:RocketRecipes',station:'nasa',rocketTier:tier,research:'space:rocket:'+id});
 });
})();
