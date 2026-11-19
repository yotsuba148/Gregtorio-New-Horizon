(function(root){
 'use strict';
 var gd=root.GD,extra=gd.extraMachineDefinitions||(gd.extraMachineDefinitions=[]);gd.items=gd.items||{};
 var family=[['e_furnace','蒸汽炉',103,104,1],['macerator','蒸汽研磨机',106,107,1],['extractor','蒸汽提取机',109,110,1],['hammer','蒸汽锻造锤',112,113,1],['compressor','蒸汽压缩机',115,116,1],['alloysmelter','蒸汽合金炉',118,119,2]];
 family.forEach(function(row){
  var cat={id:'steam_'+row[0],cn:row[1],slots:{in:row[4],out:1,fluid:0},tiers:[]};
  root.CONTENT.alias(cat.id,root.CONTENT.mapId(row[0]));
  [false,true].forEach(function(high){var k='gregtech:gt.blockmachines@'+row[high?3:2],name=(high?'高压':'青铜')+row[1];
   cat.tiers.push({t:0,tag:high?'高压蒸汽':'蒸汽',k:k,name:name});gd.items[k]=name;
   extra.push({key:k,cat:cat.id,recipeMap:root.CONTENT.mapId(row[0]),cn:name,tag:high?'高压蒸汽':'蒸汽',tier:0,volt:32,maxRecipeEUt:32,
    behavior:'batch_processor',slots:{in:row[4],out:1,fluid:0},energyCapacity:0,startEnergy:0,amperage:0,
    steamPowered:true,steamCapacity:16000,startSteam:500,powerMultiplier:high?2:1,durationMultiplier:high?1:2,
    fluidInputTanks:[],fluidOutputTanks:[],autoItems:false,autoFluids:false,outputPolicy:'first_slots',venting:true});
  });gd.machines.cats.unshift(cat);
 });
 var boilers=[{meta:100,name:'小型燃煤锅炉',capacity:16000,production:120,maxTemperature:500,cooldown:45,heatConsumption:1},
  {meta:101,name:'高压燃煤锅炉',capacity:32000,production:300,maxTemperature:1000,cooldown:40,heatConsumption:2}];
 boilers.forEach(function(b){var k='gregtech:gt.blockmachines@'+b.meta;gd.items[k]=b.name;
  extra.push({key:k,cat:'boiler',recipeMap:'none:boiler',cn:b.name,tag:'蒸汽',tier:0,volt:0,behavior:'boiler',slots:{in:1,out:1,fluid:b.capacity},
   energyCapacity:0,startEnergy:0,amperage:0,fluidInputTanks:[b.capacity],fluidOutputTanks:[b.capacity],autoItems:false,autoFluids:true,thermal:b});
 });
 gd.machines.cats.unshift({id:'boiler',cn:'燃煤锅炉',slots:{in:1,out:1,fluid:16000},tiers:boilers.map(function(b){return{t:0,tag:'蒸汽',k:'gregtech:gt.blockmachines@'+b.meta,name:b.name};})});
 root.BURN_TICKS={
  'minecraft:coal@0':1600,'minecraft:coal@1':1600,'minecraft:coal_block@0':16000,'minecraft:log@0':300,'minecraft:log@1':300,'minecraft:log@2':300,'minecraft:log@3':300,
  'minecraft:log2@0':300,'minecraft:log2@1':300,'minecraft:planks@0':300,'minecraft:stick@0':100,'minecraft:lava_bucket@0':20000,'minecraft:sapling@0':100
 };
 Object.keys(root.BURN_TICKS).forEach(function(k){root.BURN_TICKS[root.CONTENT.canonicalKey(k)]=root.BURN_TICKS[k];});
 function Boiler(content){this.content=content;}
 Boiler.prototype.fuel=function(k){
  var p=root.NATIVE_RULES&&root.NATIVE_RULES.properties(k);
  if(p&&p.verified&&p.isBlock!=null&&p.materials){
   if(p.burn<10||(GD.containerRegistry||[]).some(function(c){return c.filled===CONTENT.canonicalKey(k);}))return null;
   var name=String(p.blockName||'').toLowerCase(),material=p.materials[0],dark=material==='Coal'||material==='Lignite'||/^tile\..+compressedcoal$/.test(name);
   var regular=material==='Charcoal'||material==='Diamond'||/^tile\..+(?:charcoal|coke|railcraft\.cube)$/.test(name)||['fuelCoke','fuelCactusCharcoal','fuelCactusCoke','fuelSugarCharcoal','fuelSugarCoke'].some(function(tag){return root.NATIVE_RULES.hasOre(k,tag);})||p.burn>=2000;
   return dark||regular?{ticks:p.burn,ash:dark?'DarkAsh':'Ash',isBlock:p.isBlock}:null;
  }
  var tag=this.content.tag(k)||'',base=this.content.baseKey(k),ticks=root.BURN_TICKS[base]||0;
  if(/Coke/.test(tag))ticks=3200;
  if(/Charcoal|Coal$/.test(tag)&&!ticks)ticks=1600;
  if(/Lignite/.test(tag))ticks=400;
  if(!(/Coal|Charcoal|Lignite|Coke|Diamond/.test(tag)||/^minecraft:coal(@|_block)/.test(base)))return null;
  return ticks>0?{ticks:ticks,ash:/Charcoal|Coke/.test(tag)||base==='minecraft:coal@1'?'Ash':'DarkAsh'}:null;
 };
 Boiler.prototype.tick=function(m,tick){
  var d=root.DEFS.of(m.k),p=d.thermal;if(m.enabled===false)return false;
  if(m.temperature==null)m.temperature=20;
  m.cooldownTicks=(m.cooldownTicks||0)+1;
  if(m.cooldownTicks>p.cooldown){m.temperature=Math.max(20,m.temperature-1);m.cooldownTicks=0;}
  if(m.thermalFault){m.status={code:'THERMAL_SHOCK',text:'停机冷却，'+m.temperature+' °C'+(m.temperature<=100?'，可复位':'')};return false;}
  var state=root.ENGINE&&root.ENGINE.state;
  if(tick%(root.GAME_TIME?GAME_TIME.real(state,10):10)===0&&m.temperature>100){
   var water=m.tanksIn[0];
   if(!water||!/^(water|ic2distilledwater)$/.test(water.f)||water.mb<=0){m.hadNoWater=true;m.status={code:'NO_WATER_HOT',text:'缺水，等待冷却'};}
   else if(m.hadNoWater){m.thermalFault=true;m.status={code:'THERMAL_SHOCK',text:'热炉补水触发停机，需要冷却检修'};return false;}
   else{
    var steam=p.production/2,credit=(m.waterCredit||0)-steam,consume=credit<0?Math.floor(-credit/160):0;
    if(consume<=water.mb){water.mb-=consume;m.waterCredit=credit+consume*160;
     var old=m.tanksOut[0];m.tanksOut[0]={f:'steam',mb:(old?old.mb:0)+steam};m.steamProduced=(m.steamProduced||0)+steam;
     if(m.tanksOut[0].mb>p.capacity){var left=Math.floor(p.capacity*3/4);m.steamVented=(m.steamVented||0)+m.tanksOut[0].mb-left;m.tanksOut[0].mb=left;}}
   }
  }else if(m.temperature<=100)m.hadNoWater=false;
  if(!(m.heatFuel>0)){
   for(var i=0;i<m.ins.length;i++){var s=m.ins[i];if(!s||s.entityUid)continue;var fuel=this.fuel(s.k);if(!fuel)continue;
    var isBlock=fuel.isBlock==null?/_block@/.test(this.content.baseKey(s.k)):fuel.isBlock,prefix=isBlock||fuel.ticks>100000?'dust':fuel.ticks>10000?'dustSmall':'dustTiny';
    var ash=this.content.data.ore[prefix+fuel.ash]||[],ashKey=ash.length?this.content.canonicalKey(this.content.data.items[ash[0]].k):null;
    // GT combustion ashes are probabilistic. The saved PRNG is advanced only when fuel is consumed.
    m.randomState=(Math.imul(m.randomState||1234567,1664525)+1013904223)>>>0;
    var bound=7-Math.floor(Math.min(fuel.ticks,2000)/400);
    var outputs=ashKey&&(isBlock||m.randomState%bound===0)?[{k:ashKey,n:1}]:[];
    var c=this.content,out=root.GTTransactions.planOutput(m.outs,outputs,d.slots.out,function(k){return c.maxStack(k);});
    if(!out){m.status={code:'ITEM_OUTPUT',text:'灰烬输出已满'};return false;}
    s.n--;if(s.n<=0)m.ins.splice(i,1);m.heatFuel=Math.floor(fuel.ticks/10);m.outs=out;break;
   }
  }
  if(tick%(root.GAME_TIME?GAME_TIME.real(state,12):12)===0&&m.heatFuel>0&&m.temperature<p.maxTemperature){m.heatFuel-=p.heatConsumption;m.temperature=root.GAME_TIME?GAME_TIME.advance(state,m.temperature,p.maxTemperature,1):m.temperature+1;}
  if(!m.hadNoWater)m.status={code:m.temperature>100?'BOILING':'HEATING',text:(m.temperature>100?'产汽中':'升温中')+'，'+m.temperature+' °C'};
  return true;
 };
 root.BoilerProcessor=Boiler;
 root.BOILER=new Boiler(root.CONTENT);
 root.declareBehavior('boiler',{
  personalStorage:true,
  tick:function(m,context){return root.BOILER.tick(m,context.tick);},
  acceptsItem:function(m,k){return !!root.BOILER.fuel(k);},
  acceptsFluid:function(m,f){return /^(water|ic2distilledwater)$/.test(f);},
  status:function(m,d,make){
   var code=m.status&&m.status.code;
   if(m.thermalFault)return make((m.temperature||0)>100?'cooling':'repair',m);
   if(code==='NO_WATER_HOT')return make('water',m);
   if(code==='ITEM_OUTPUT')return make('blocked',m);
   if((m.temperature||0)>100)return make('boiling',m);
   var fuel=m.heatFuel>0||(m.ins||[]).some(function(p){return p&&root.BOILER.fuel(p.k);});
   return make(fuel?'heating':'fuel',m,fuel?'锅炉升温中':'没有适用燃料');
  },
  adjust:function(d,cells){
   cells.forEach(function(c){var p={in:[115,61],out:[115,25],fin:[83,25],fout:[70,25]}[c.kind];c.x=p[0];c.y=p[1];if(c.kind==='fin'||c.kind==='fout'){c.w=10;c.h=54;}});
   return {heat:true,circuit:false,progress:false};
  }
 });
})(typeof window!=='undefined'?window:globalThis);
