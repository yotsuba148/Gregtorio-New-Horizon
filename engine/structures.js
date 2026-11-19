(function(root){
 'use strict';
 var profiles={},extra=GD.extraMachineDefinitions||(GD.extraMachineDefinitions=[]);
 function part(meta,n){return{k:'gregtech:gt.blockmachines@'+meta,n:n||1};}
 function block(type,meta,n){return{k:'gregtech:gt.blockcasings'+(type===1?'':type)+'@'+meta,n:n};}
 function add(id,name,meta,map,build,options){
  profiles[id]={id:id,name:name,key:'gregtech:gt.blockmachines@'+meta,build:build,options:options||{}};
  GD.items[profiles[id].key]=name;
  var def=Object.assign({key:profiles[id].key,cat:id,cn:name,tag:'多方块',tier:1,volt:32,behavior:'batch_processor',recipeMap:map,slots:{in:4,out:4,fluid:16000},
   fluidInputTanks:[16000],fluidOutputTanks:[16000,16000],energyCapacity:4096,startEnergy:256,amperage:4,multiblock:true,requiresStructure:true,structureProfile:id,autoItems:true,autoFluids:true,environmentCapabilities:{lowGravity:true}},options||{});
  profiles[id].fields=options&&options.structureFields||((def.energyCapacity>0)?['energyTier']:[]);
  // 同一台机器可能先由 data 手写、再被结构模板登记一次；手写定义优先，模板只补缺失字段，不另推一份。
  var prior=extra.find(function(d){return d.key===def.key;});
  if(prior)Object.keys(def).forEach(function(k){if(prior[k]===undefined)prior[k]=def[k];});
  else extra.push(def);
  GD.machines.cats.push({id:id,cn:name,slots:def.slots,tiers:[{t:1,tag:'多方块',k:def.key,name:name}]});CONTENT.alias(id,map);
 }
 add('primitiveblastfurnace','高炉（耐火砖）',140,'gt.recipe.primitiveblastfurnace',function(){return{parts:[block(4,15,32)],heat:0,power:0};},
  {energyCapacity:0,startEnergy:0,volt:0,amperage:0,tier:0,slots:{in:3,out:3,fluid:0},fluidInputTanks:[],fluidOutputTanks:[]});
 function blastHeat(coil,inputVoltage){return coil.heat+100*(DEFS.recipeTier(inputVoltage)-2);}
 add('blastfurnace','工业高炉',1000,'gt.recipe.blastfurnace',function(v){
  var coil=HEATING_COILS.at(v.coil),tier=Math.max(1,Math.min(5,v.energyTier|0)),hatches=Math.max(1,Math.min(2,v.energyHatches==null?2:v.energyHatches|0));
  var voltage=DEFS.voltOf(tier);
  return{parts:[block(1,11,8),{k:coil.key,n:16},part(40+tier,hatches),part(51),part(61,2),part(71),part(81),part(90),part(91)],
   heat:blastHeat(coil,voltage*hatches),power:voltage*hatches*2,voltage:voltage,amperage:hatches*2,coil:coil.id-1,energyHatches:hatches};
 },{structureFields:['energyTier','energyHatches','coil'],heatOverclock:true,heatDiscount:true});
 profiles.blastfurnace.heatLabel='当前炉温';
 profiles.blastfurnace.materialKey=function(m,cell,tile){
  var variant=m.structure&&m.structure.variant||m.buildPlan||{};
  return tile==='c'?HEATING_COILS.at(variant.coil).key:null;
 };
 profiles.blastfurnace.capability=function(m,c){
  var coil=STRUCTURE_UPGRADES.installed(m,'coil');
  c.heat=coil.complete?blastHeat(HEATING_COILS.at(coil.value),c.inputVoltage):0;
  c.definition={processingHeat:c.heat};
 };
 add('vacuumfreezer','真空冷冻机',1002,'gt.recipe.vacuumfreezer',function(v){var tier=Math.max(1,Math.min(5,v.energyTier|0));
  return{parts:[block(2,1,19),part(40+tier),part(51),part(61),part(71),part(81),part(90)],power:DEFS.voltOf(tier)*2,voltage:DEFS.voltOf(tier),amperage:2};
 },{fluidOutputTanks:[16000]});
 profiles.vacuumfreezer.maxPorts=8;
 add('implosioncompressor','聚爆压缩机',1001,'gt.recipe.implosioncompressor',function(v){var tier=Math.max(1,Math.min(5,v.energyTier|0));
  return{parts:[block(2,0,20),part(40+tier),part(71),part(81),part(90),part(91)],power:DEFS.voltOf(tier)*2,voltage:DEFS.voltOf(tier),amperage:2};
 },{fluidInputTanks:[],fluidOutputTanks:[],slots:{in:4,out:4,fluid:0}});
 add('distillationtower','蒸馏塔',1126,'gt.recipe.distillationtower',function(v){var tier=Math.max(1,Math.min(5,v.energyTier|0)),height=Math.max(3,Math.min(12,v.height||4));
  return{parts:[block(4,1,7*height-5),part(40+tier),part(51),part(61,height-1),part(71),part(81),part(90)],
   power:DEFS.voltOf(tier)*2,voltage:DEFS.voltOf(tier),amperage:2,fluidOutputTanks:Array(height-1).fill(16000),height:height};
 },{fluidOutputTanks:Array(3).fill(16000),structureFields:['energyTier','height']});
 add('largechemicalreactor','大型化学反应釜',1169,'gt.recipe.largechemicalreactor',function(v){
  var tier=Math.max(1,Math.min(5,v.energyTier|0)),hatches=Math.max(1,Math.min(2,v.energyHatches==null?2:v.energyHatches|0));
  var inputs=Math.max(1,Math.min(4,v.fluidInputs==null?4:v.fluidInputs|0)),outputs=Math.max(1,Math.min(4,v.fluidOutputs==null?4:v.fluidOutputs|0));
  return{parts:[block(8,0,11),block(8,1,1),block(5,0,1),part(40+tier,hatches),part(51,inputs),part(61,outputs),part(71),part(81),part(90)],
   power:DEFS.voltOf(tier)*hatches*2,voltage:DEFS.voltOf(tier),amperage:hatches*2,fluidInputTanks:Array(inputs).fill(16000),fluidOutputTanks:Array(outputs).fill(16000)};
 },{perfectOverclock:true,controlCircuit:true,fluidInputTanks:Array(4).fill(16000),fluidOutputTanks:Array(4).fill(16000),structureFields:['energyTier','energyHatches','fluidInputs','fluidOutputs']});
 add('pyrolyseoven','热解炉',1159,'gt.recipe.pyro',function(v){var tier=Math.max(1,Math.min(5,v.energyTier|0)),coil=Math.max(0,Math.min(4,v.coil|0));
  return{parts:[{k:'gregtech:gt.blockcasingsNH@2',n:65},block(5,coil,9),part(40+tier),part(51),part(61),part(71),part(81),part(90),part(91)],
   power:DEFS.voltOf(tier)*2,voltage:DEFS.voltOf(tier),amperage:2,durationMultiplier:2/(1+coil)};
 },{controlCircuit:true,slots:{in:4,out:4,fluid:16000},fluidOutputTanks:[16000],structureFields:['energyTier','coil']});
 add('industrialextruder','工业压模机',859,'gt.recipe.extruder',function(v){var tier=Math.max(1,Math.min(5,v.energyTier|0));return{parts:[{k:'miscutils:gtplusplus.blockcasings.3@1',n:36},part(40+tier),part(71),part(81),part(90),part(91)],power:DEFS.voltOf(tier),voltage:DEFS.voltOf(tier),amperage:2};},
  {slots:{in:4,out:4,fluid:0},fluidInputTanks:[],fluidOutputTanks:[],inputIsolationFixed:true,parallelPerTier:4,durationMultiplier:Math.fround(1/3.5),structureFields:[]});
 [
  {id:'largeboiler_bronze',meta:1020,name:'大型青铜锅炉',casing:block(1,10,32),pipe:12,firebox:13,power:400,boost:2,increase:16},
  {id:'largeboiler_steel',meta:1021,name:'大型钢锅炉',casing:block(2,0,32),pipe:13,firebox:14,power:1000,boost:1,increase:12}
 ].forEach(function(b){add(b.id,b.name,b.meta,'idle:largeboiler',function(v){var tier=Math.max(1,Math.min(3,v.fluidTier|0));
   return{parts:[b.casing,block(2,b.pipe,3),block(3,b.firebox,3),part(51,2),part(60+tier),part(71),part(90),part(91)],power:0,fluidOutputTanks:[8000*Math.pow(2,tier)]};
  },{behavior:'large_boiler',tier:0,volt:0,amperage:0,energyCapacity:0,startEnergy:0,noOverclock:true,controlCircuit:true,slots:{in:4,out:1,fluid:16000},fluidInputTanks:[16000,16000],fluidOutputTanks:[16000],structureFields:['fluidTier'],largeBoiler:{power:b.power,boost:b.boost,increase:b.increase}});});
 add('cleanroom','超净间',1172,'none:cleanroom',function(v){var width=Math.max(3,Math.min(15,v.width||5)),depth=Math.max(3,Math.min(15,v.depth||5)),height=5,inner=(width-2)*(depth-2);return{parts:[{k:'gregtech:gt.blockreinforced@2',n:(2*width+2*depth-4)*height+inner-4},block(3,11,inner-1),{k:'minecraft:iron_door@0',n:1},part(41),part(90)].filter(function(p){return p.n>0;}),
  power:64,voltage:32,amperage:2,cleanroom:true,height:height};},
  {behavior:'cleanroom',slots:{in:0,out:0,fluid:0},fluidInputTanks:[],fluidOutputTanks:[],amperage:2,structureFields:['width','depth','height']});
 // Geometry is chosen before placement. Upgrades below never change it.
 profiles.cleanroom.dimensions=[{key:'width',label:'宽度',min:3,max:15,initial:5},{key:'depth',label:'高度',min:3,max:15,initial:5}];
 profiles.distillationtower.dimensions=[{key:'height',label:'塔高',min:3,max:12,initial:4}];
 // These materials belong to explicit upgrades, not automatic fixed-body repair.
 ['blastfurnace','pyrolyseoven'].forEach(function(id){profiles[id].upgradableMaterialPrefixes=['gregtech:gt.blockcasings5@'];});
 function profile(m){var d=DEFS.of(m.k);return d&&profiles[d.structureProfile];}
 function plan(m,variant){variant=Object.assign({},m.buildPlan||{},variant||{});if(root.MULTIBLOCKS&&MULTIBLOCKS.managed(m))return MULTIBLOCKS.plan(m,variant);var p=profile(m);return p?p.plan?p.plan(m,variant):p.build(variant):null;}
 function fillFixed(S,m,variant){
  if(root.MULTIBLOCKS&&MULTIBLOCKS.managed(m))return MULTIBLOCKS.fillFixed(S,m,variant);
  var p=profile(m);
  if(p&&p.fillFixed)return p.fillFixed(S,m,variant);
  var shape=root.MULTIBLOCKS&&MULTIBLOCKS.shape(m);
  if(!p||p.assemble||(!p.fixedBuildMaterial&&!(shape&&shape.builtin)))return assemble(S,m,variant);
  return build(S,m,variant,p.fixedBuildMaterial||function(k){return MULTIBLOCKS.fixedMaterial(m,k);});
 }
 function assemble(S,m,variant){
  var custom=profile(m);if(custom&&custom.assemble)return custom.assemble(S,m,variant);
  if(root.MULTIBLOCKS&&MULTIBLOCKS.managed(m))return MULTIBLOCKS.assemble(S,m,variant);
  return build(S,m,variant);
 }
 function build(S,m,variant,freeBlock){
  if(root.MULTIBLOCKS){MULTIBLOCKS.lockSize(m);if(MULTIBLOCKS.dimensions(m).some(function(f){return variant&&Object.prototype.hasOwnProperty.call(variant,f.key)&&variant[f.key]!==m.structureSize[f.key];}))return {ok:false,code:'SIZE_LOCKED'};variant=Object.assign({},m.structure&&m.structure.variant||{},variant||{},m.structureSize||{});}
  var p=plan(m,variant);if(!p)return{ok:false,code:'PROFILE'};
  if(m.job)return{ok:false,code:'RUNNING'};
  var prior=m.structure&&m.structure.installedParts||[];
  // Reuse installed components when changing a structure. Only the net increase
  // is taken from storage; retired parts return in the same transaction.
  var delta={};p.parts.forEach(function(v){var k=CONTENT.canonicalKey(v.k);delta[k]=(delta[k]||0)+v.n;});prior.forEach(function(v){var k=CONTENT.canonicalKey(v.k);delta[k]=(delta[k]||0)-v.n;});
  var inputs=[],refund=[];Object.keys(delta).forEach(function(k){if(delta[k]>0)inputs.push({k:k,n:delta[k]});if(delta[k]<0)refund.push({k:k,n:-delta[k]});});
  var base=DEFS.of(m.k);
  if([['tanksIn','fluidInputTanks'],['tanksOut','fluidOutputTanks']].some(function(fields){return(m[fields[0]]||[]).some(function(t,i){var cap=(p[fields[1]]||base[fields[1]])[i]||0;return t&&t.mb>cap;});}))return{ok:false,code:'CONTENTS'};
  var result=COMMANDS.exchange(S,STRUCTURE_CORE.constructionCost(S,inputs,freeBlock),refund,{drops:true});if(!result.ok)return result;
  m.structure={formed:true,profile:DEFS.of(m.k).structureProfile,variant:GTTransactions.clone(variant||{}),installedParts:p.parts,
   processingPowerEUt:p.power,voltage:p.voltage||0,amperage:p.amperage||0,heat:p.heat||0,cleanroom:!!p.cleanroom,height:p.height||0,
   fluidInputTanks:p.fluidInputTanks||null,fluidOutputTanks:p.fluidOutputTanks||null,durationMultiplier:p.durationMultiplier||1,maintenance:{wrench:true,screwdriver:true,softHammer:true,hardHammer:true,solderingTool:true,crowbar:true}};
  m.environment={heat:p.heat||0};return Object.assign(result,{ok:true});
 }
 function disassemble(S,m){
  var custom=profile(m);if(custom&&custom.disassemble)return custom.disassemble(S,m);
  if(!m.structure)return{ok:false,code:'STRUCTURE'};
   var contents=ENTITIES.recovery(m,S),parts=GTTransactions.clone(m.structure.installedParts||[]);
   var result=COMMANDS.returnGroups(S,[{items:parts,drops:true},{items:contents.items,ground:true}],{valid:contents.valid,release:contents.release});if(!result.ok)return result;
   m.tanksIn=[];m.tanksOut=[];if(m.tanksEnergy)m.tanksEnergy=[];m.workEnergyCredit=0;

  if(root.MULTIBLOCKS&&MULTIBLOCKS.live(m)){MULTIBLOCKS.faces(m).forEach(function(f){MULTIBLOCKS.setPort(S,m,f.id,null);});['ins','outs','tanksIn','tanksOut','tanksEnergy','eu'].forEach(function(k){delete m[k];});m.ins=[];m.outs=[];m.tanksIn=[];m.tanksOut=[];m.eu=0;}
  if(custom&&custom.onDisassemble)custom.onDisassemble(m);m.structure=null;m.environment={};m.eu=0;m.itemStore=null;return Object.assign(result,{ok:true});
 }
 function instance(m){
  var d=DEFS.of(m.k),s=m.structure;if(!d)return d;
  var custom=profile(m);if(custom&&custom.instance)return custom.instance(m,d);
  if(d.smelteryPooledMelt)d=Object.assign({},d,{fluidOutputTanks:Array(Math.max(9,(m.tanksOut||[]).filter(Boolean).length+1)).fill(d.totalFluidOutputCapacity)});
  if(root.MULTIBLOCKS&&MULTIBLOCKS.managed(m)){MULTIBLOCKS.upgrade(m);return MULTIBLOCKS.instance(m,d);}
  if(d.castBasedCapacity){
   var r=m.job&&m.job.recipe||m.recipeLock&&CONTENT.recipe(m.recipeLock);
   if(!r){var fluid=(m.tanksIn||[]).find(Boolean);r=CONTENT.recipes(d.recipeMap).find(function(q){return(!fluid||q.fin.some(function(p){return p.f===fluid.f;}))&&q.in.concat(q.req).every(function(p){return(m.ins||[]).some(function(i){return CONTENT.matches(p.k,i.k,{exact:!!q.nbtSensitive});});});});}
   var amount=r&&r.fin[0]?r.fin[0].mb:144;return Object.assign({},d,{fluidInputTanks:[Math.max(amount,(m.tanksIn&&m.tanksIn[0]||{}).mb||0)]});
  }
  if(!s||!s.formed)return d;
  return Object.assign({},d,{volt:s.voltage||d.volt,amperage:s.amperage||d.amperage,maxRecipeEUt:s.processingPowerEUt||d.volt,
   energyCapacity:Math.max(d.energyCapacity,(s.voltage||0)*64),tier:DEFS.recipeTier(s.voltage||d.volt),fluidInputTanks:s.fluidInputTanks||d.fluidInputTanks,fluidOutputTanks:s.fluidOutputTanks||d.fluidOutputTanks,durationMultiplier:s.durationMultiplier||d.durationMultiplier||1});
 }
 function environment(m,S){
  var env={heat:m.structure&&m.structure.formed?m.structure.heat||0:0,
   lowGravity:ENTITIES.isGrid(m)&&root.DIMENSIONS?DIMENSIONS.lowGravity(ENTITIES.dimension(m)):!!(S&&S.dimensionProperties&&S.dimensionProperties.lowGravity)};
  if(root.MULTIBLOCKS&&S){var room=MULTIBLOCKS.roomFor(m,S);env.cleanroom=!!(room&&room.enabled&&(room.cleanliness||0)>=10000);if(room)env.cleanness=room.cleanliness||0;return env;}
  if(m.cleanroomUid&&S){var clean=ENTITIES.get(S,m.cleanroomUid);env.cleanroom=!!(clean&&ENTITIES.active(clean)&&clean.location&&m.location&&clean.location.blueprintId===m.location.blueprintId&&clean.k==='gregtech:gt.blockmachines@1172'&&clean.structure&&clean.structure.formed&&clean.enabled&&clean.eu>=4&&(clean.cleanliness||0)>0);if(env.cleanroom)env.cleanness=clean.cleanliness;}
  return env;
 }
 function tickCleanroom(m,tick){
  if(!m.structure||!m.structure.formed){m.status={code:'STRUCTURE',text:'需要建造洁净室'};return false;}
  var cost=(m.cleanliness||0)>=10000?4:40;if(m.eu<cost){m.status={code:'ENERGY',text:'洁净室缺电'};return false;}
  var state=root.ENGINE&&root.ENGINE.state;m.eu-=cost;m.cleanCycle=root.GAME_TIME?GAME_TIME.advance(state,m.cleanCycle,180,1):(m.cleanCycle||0)+1;if(m.cleanCycle>=180){m.cleanliness=root.GAME_TIME?GAME_TIME.advance(state,m.cleanliness,10000,100):Math.min(10000,(m.cleanliness||0)+100);m.cleanCycle-=180;}
  m.status={code:'CLEANING',text:'洁净度 '+((m.cleanliness||0)/100).toFixed(1)+'%'};return true;
 }
 root.STRUCTURES={profiles:profiles,profile:profile,plan:plan,assemble:assemble,fillFixed:fillFixed,disassemble:disassemble,instance:instance,environment:environment,tickCleanroom:tickCleanroom,
  add:add,register:function(def){profiles[def.id]=def;}};
 ENGINE.registerBehavior('cleanroom',{
  runsContinuously:true,
  voidProtection:false,
  tick:function(m){return root.STRUCTURES.tickCleanroom(m);},
  status:function(m,d,make){if((m.cleanliness||0)>=10000)return make('clean',m);return make('cleaning',m);}
 });
})(typeof window!=='undefined'?window:globalThis);
