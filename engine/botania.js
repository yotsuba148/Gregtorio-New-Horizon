/* Botania stations reuse owned inputs, ordinary pipes, resource links and batch transactions. */
(function(root){
 'use strict';var C=CONTENT,TX=GTTransactions;
 function add(cat,name,key,map,options){var d=Object.assign({key:key,cat:cat,cn:name,tag:'植物魔法',tier:0,volt:0,maxRecipeEUt:0,behavior:'batch_processor',recipeMap:map,slots:{in:17,out:17,fluid:0},fluidInputTanks:[],fluidOutputTanks:[],energyCapacity:0,startEnergy:0,amperage:0,noOverclock:true,controlCircuit:false,autoItems:true,autoFluids:true},options||{});
  GD.extraMachineDefinitions.push(d);var group=GD.machines.cats.find(function(v){return v.id===cat;});if(!group){group={id:cat,cn:name,slots:d.slots,tiers:[]};GD.machines.cats.push(group);}group.tiers.push({t:0,k:key,name:name,tag:d.tag});CONTENT.alias(cat,map);
 }
 function flower(type){return(C.byRawId['Botania:specialFlower']||[]).find(function(k){var n=C.item(k).nbt;return n&&SNBT.parse(n).type===type;});}
 var daisy=flower('puredaisy'),endo=flower('endoflame');
 (C.byRawId['Botania:altar']||[]).filter(function(k){var item=C.item(k);return item.meta!==32767&&!item.nbt;}).forEach(function(k){add('botania_petals',GD.items[k]||'花药台',k,'botania:petals',{slots:{in:17,out:1,fluid:1000},fluidInputTanks:[1000]});});
 if(daisy)add('botania_puredaisy','白雏菊',daisy,'botania:puredaisy',{behavior:'parallel_transformer',parallelLimit:8,slots:{in:8,out:8,fluid:8000},fluidInputTanks:[8000]});
 ['Botania:pool@0','Botania:pool@2'].forEach(function(k){add('botania_mana_pool',GD.items[k]||'魔力池',k,'botania:manainfusion',{
  slots:{in:1,out:1,fluid:0},resourceCapacities:{mana:k.endsWith('@2')?10000:1000000},resourceRole:'mana_pool',resourceOutputs:{mana:{range:1,roles:['spreader'],maxAmount:1000,period:1}},componentSlots:{catalyst:['Botania:alchemyCatalyst@0','Botania:conjurationCatalyst@0']}
 });});
 add('botania_runealtar','符文祭坛','Botania:runeAltar@0','botania:runealtar',{resourceCapacities:{mana:Math.max(10000,...C.recipes('botania:runealtar').map(function(r){return r.costs.start.mana;}))},resourceRole:'mana_altar',activationTool:'Botania:twigWand',activationToolName:'森林法杖'});
 add('botania_spreader','魔力发射器','Botania:spreader@0','none:mana_spreader',{behavior:'resource_relay',slots:{in:0,out:0,fluid:0},resourceCapacities:{mana:1000},resourceRole:'spreader',resourceLinkTool:'Botania:twigWand',resourceOutputs:{mana:{range:16,roles:['mana_pool','mana_altar'],maxAmount:160,quantum:160,period:4}}});
 if(endo)add('botania_endoflame','火红莲',endo,'botania:endoflame',{behavior:'mana_fuel_flower',slots:{in:1,out:0,fluid:0},resourceCapacities:{mana:300},resourceRole:'generating_flower',resourceLinkTool:'Botania:twigWand',resourceOutputs:{mana:{range:6,roles:['spreader'],maxAmount:300,period:1}}});
 ['daybloom','nightshade'].forEach(function(type){var k=flower(type);if(k)add('botania_passive_flower',type==='daybloom'?'太阳花':'夜颠茄',k,'none:passive_mana',{behavior:'passive_mana_flower',slots:{in:0,out:1,fluid:0},passiveFlower:{day:type==='daybloom',period:12,amount:1,lifetime:72000},resourceCapacities:{mana:20},resourceRole:'generating_flower',resourceLinkTool:'Botania:twigWand',resourceOutputs:{mana:{range:6,roles:['spreader'],maxAmount:20,period:1}}});});
 function endoFuel(k){var p=NATIVE_RULES.properties(k),item=C.item(k);return p&&p.verified&&p.burn>1&&p.container<0&&item.id!=='Botania:spreader'?p:null;}
 C.registerDynamicFamily('botania:endoflame',{idPrefix:'botania:endoflame:fuel:',keys:NATIVE_RULES.keys.filter(endoFuel),eut:0,searchText:function(k){return(GD.items[k]||k)+' '+k+' 魔力 mana';},resolve:function(k){var p=endoFuel(k);if(!p)return null;return{in:[{k:k,n:1}],out:[],durationTicks:Math.floor(Math.min(32000,p.burn)/2),eut:0,notes:['每2个燃烧tick产生3魔力，内部最多300；先绑定魔力发射器。']};}});
 function parallelCheck(m,r,world){var max=DEFS.of(m.k).parallelLimit||1,last;
  for(var n=max;n>=1;n--){var scaled=Object.assign({},r,{in:r.in.map(function(p){return Object.assign({},p,{n:p.n*n});}),out:r.out.map(function(p){return Object.assign({},p,{n:p.n*n});}),fin:r.fin.map(function(p){return Object.assign({},p,{mb:p.mb*n});}),parallel:n});last=ENGINE.batch.check(m,scaled,world);if(last.ok)return last;}return last;
 }
 ENGINE.registerBehavior('parallel_transformer',{
  check:parallelCheck,summary:function(m){return['最多8个位置同时转化，每轮1200tick'+(m.job?'，本轮 '+(m.job.recipe.parallel||1)+' 个':'')];},
  tick:function(m,ctx){if(!m.job){var candidates=m.recipeLock?[C.recipe(m.recipeLock)]:C.candidates(DEFS.of(m.k).recipeMap,m.ins,m.tanksIn),last;for(var r of candidates){if(!r)continue;last=parallelCheck(m,r,ctx.world);if(last.ok){ENGINE.batch.start(m,last.recipe,ctx.world);break;}}if(!m.job){m.status=last||{code:'WAITING_INPUT',text:'等待周围方块原料'};return false;}}return ENGINE.batch.tick(m,ctx.world);}
 });
 ENGINE.registerBehavior('resource_relay',{acceptsItem:function(){return false;},tick:function(m){m.status={code:'RESOURCE_LINK',text:'按绑定目标发射魔力'};return false;},summary:function(m){return['普通魔力发射器，缓冲1000，魔力束160'];}});
 ENGINE.registerBehavior('passive_mana_flower',{
  acceptsItem:function(){return false;},summary:function(m){return['已生长 '+(m.passiveAge||0)+' / 72000 tick','累计产生 '+(m.manaProduced||0)+' 魔力'];},
  tick:function(m,ctx){var spec=ctx.definition.passiveFlower;
   if(m.wilted){m.status={code:'WILTED',text:'已枯萎'};return false;}
   if((m.passiveAge||0)>spec.lifetime){m.wilted=true;m.outs.push({k:'minecraft:deadbush@0',n:1});m.status={code:'WILTED',text:'已枯萎，可取回枯灌木'};return true;}
   m.passiveAge=(m.passiveAge||0)+1;var e=ctx.state.env||{},day=(e.elapsed||0)%1200<600,clear=!e.weather||e.weather==='clear',ready=spec.day?day&&clear:!day;
   if(!ready){m.status={code:'ENVIRONMENT',text:spec.day?'等待白天晴朗天空':'等待夜晚'};return false;}
   var pool=m.resourceBuffers.mana;if(m.passiveAge%(root.GAME_TIME?GAME_TIME.ticks(ctx.state,spec.period):spec.period)===0&&pool.amount<pool.capacity){pool.amount++;m.manaProduced=(m.manaProduced||0)+1;}
   m.status={code:'GENERATING_MANA',text:'自然产魔，每12tick一份'};return true;
  }
 });
 ENGINE.registerBehavior('mana_fuel_flower',{
  consumesFuelDuringBatch:true,
  acceptsItem:function(m,k){return !!endoFuel(k);},summary:function(m){return['燃烧剩余 '+(m.job?m.job.durationTicks-m.job.progressTicks:0)+' tick','累计产生 '+(m.manaProduced||0)+' 魔力'];},
  tick:function(m,ctx){var target=m.resourceLinks&&ENTITIES.get(ctx.state,m.resourceLinks.mana);if(!target||!MECHANISMS.canLinkResource(ctx.state,m,target,'mana')){m.status={code:'RESOURCE_LINK',text:'先绑定附近魔力发射器'};return false;}
   var pool=m.resourceBuffers.mana;if(pool.amount+3>pool.capacity){m.status={code:'RESOURCE_FULL',text:'魔力缓存已满，燃烧暂停'};return false;}
   if(!m.job){var r=m.recipeLock?C.recipe(m.recipeLock):C.candidates('botania:endoflame',m.ins,[])[0];if(!r){m.status={code:'FUEL',text:'等待固体燃料'};return false;}if(!ENGINE.batch.start(m,r,ctx.world))return false;return true;}
   m.manaClock=(m.manaClock||0)+1;if(m.manaClock%(root.GAME_TIME?GAME_TIME.ticks(ctx.state,2):2)===0){pool.amount+=3;m.manaProduced=(m.manaProduced||0)+3;}
   m.job.progressTicks++;m.status={code:'GENERATING_MANA',text:'燃烧中，每2tick产生3魔力'};if(m.job.progressTicks>=m.job.durationTicks){m.job=null;m.completedBatches=(m.completedBatches||0)+1;}return true;
  }
 });
 root.BOTANIA={flower:flower,endoflameFuel:endoFuel,daisy:daisy,endoflame:endo};DEFS.rebuild();
 [
  {id:'gather_mystical_flowers',name:'寻找神秘花丛',dim:'overworld',scene:'神秘花丛',time:20,out:[['Botania:flower@0',1]],outputDescription:'随机颜色神秘花 ×1',randomOutputs:Array.from({length:16},function(_,i){return{k:'Botania:flower@'+i,n:1,weight:1};})},
  {id:'gather_white_tulips',name:'花卉草原采摘白色郁金香',dim:'overworld',scene:'花卉草原',time:12,out:[['minecraft:red_flower@6',1]]},
  {id:'gather_goldenrod',name:'花卉草原采摘麒麟草',dim:'overworld',scene:'花卉草原',time:15,out:[['BiomesOPlenty:flowers2@4',1]]},
  {id:'gather_glowflower',name:'寻找乐矿花',dim:'overworld',scene:'洞穴',time:25,out:[['BiomesOPlenty:flowers2@6',1]]},
  {id:'gather_burning_blossom',name:'采摘火焰花',dim:'nether',scene:'下界岩地',time:30,out:[['BiomesOPlenty:flowers2@2',1]]}
 ].forEach(function(d){d.timing='search';d.effortTimeIsIdleDesign=true;d.sourceNotes='Native natural flower item; scene effort time and random-colour selection are idle-game parameters.';if(!GD.sources.some(function(s){return s.id===d.id;}))GD.sources.push(d);ACTIVITIES.register(d);});
})(typeof window!=='undefined'?window:globalThis);
