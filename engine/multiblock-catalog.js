(function(root){
 'use strict';
 // Native counts are the complete 3D structures. The visible cells are a 2D projection.
 var TX=GTTransactions,profiles=STRUCTURES.profiles;
 function key(n){return 'gregtech:gt.blockmachines@'+n;}
 function block(n,meta){return 'gregtech:gt.blockcasings'+(n===1?'':n)+'@'+meta;}
 function part(k,n){return {k:k,n:n};}
 function grade(v,k,max){return Math.max(0,Math.min(max||4,v[k]|0));}
 function def(m){return DEFS.of(m.k);}
 function variants(field,label,options,parts){return {field:field,label:label,options:options,parts:parts};}

 function upgrade(S,m,field,value){return STRUCTURE_UPGRADES.commit(S,m,field,value);}
 function basic(spec){
  var opts=Object.assign({windowWidth:spec.pattern[0].length>=5?660:520,inputIsolationFixed:true,outputPolicy:null,controlCircuit:false},spec.definition||{});
  var build=function(v){var parts=spec.parts(v),energy=opts.energyCapacity===0||spec.defaultEnergy===false?[]:[part(key(40+Math.max(1,v.energyTier|0)),1)],hatches=(spec.defaultPorts||[71,81]).map(function(n){return part(key(n),1);});
   // The shell budget includes hatch positions and hidden maintenance/muffler blocks.
   parts[0].n-=energy.length+hatches.length+(spec.maintenance===false?0:1)+(spec.muffler?1:0);
   return Object.assign({parts:parts.concat(energy,hatches,spec.maintenance===false?[]:[part(key(90),1)],spec.muffler?[part(key(91),1)]:[])},spec.build?spec.build(v):{});
  };
  STRUCTURES.add(spec.id,spec.name,spec.meta,spec.map,build,opts);var p=profiles[spec.id];
  STRUCTURE_UPGRADES.register(spec.id,spec.upgrades||[]);p.portHint=spec.portHint||'';
  if(spec.portRequirements)p.portRequirements=spec.portRequirements;
  p.allowedFace=function(m,f,s){var sh=MULTIBLOCKS.shape(m),pattern=spec.pattern,cell=pattern&&pattern[f.y]&&pattern[f.y][f.x];
   if(cell&&!(spec.portTiles||['s','b']).includes(cell))return false;if(f.x===sh.cx&&f.y===sh.cy)return false;
   return spec.allowed?spec.allowed(m,f,s):!s.steamComponent&&['energy','itemIn','itemOut','fluidIn','fluidOut'].includes(s.type);
  };
  p.limits=function(m,list,plan){if(plan.fixed[0].n<(spec.minCasing||0))return false;return !spec.limits||spec.limits(m,list,plan);};
  if(spec.materialKey)p.materialKey=spec.materialKey;
  p.capability=function(m,c,errors,raw){if(spec.capability)spec.capability(m,c,errors,raw);};
  p.casingKeys=function(m){return [spec.parts(m.structure&&m.structure.variant||{})[0].k];};
  var rows=spec.pattern,cy=rows.findIndex(function(r){return r.includes('C');}),cx=rows[cy].indexOf('C');
  var shp={w:rows[0].length,h:rows.length,cx:cx,cy:cy};if(spec.resize)shp.resize=spec.resize;MULTIBLOCKS.registerShape(spec.id,shp);p.visualPattern=rows;p.catalog=spec;
  return p;
 }
 var coils=variants('coil','线圈',['白铜','坎塔尔','镍铬','钨钢','HSS-G'],function(i){return [part(block(5,i),16)];});
 function coilUpgrade(n){return Object.assign({},coils,{parts:function(i){return [part(block(5,i),n)];}});}
 function counted(m,type){return MULTIBLOCKS.ports(m).filter(function(p){return HATCH_RULES.has(MULTIBLOCKS.spec(p.k),type);});}
 // Steam buses are real four-slot inventories; steam never shares process-liquid tanks.
 MULTIBLOCKS.registerPort(key(31040),{type:'steam',steam:true,steamComponent:true,fluidIn:true,capacity:64000});
 MULTIBLOCKS.registerPort(key(31046),{type:'itemIn',steamComponent:true,itemIn:true,slots:4});
 MULTIBLOCKS.registerPort(key(31047),{type:'itemOut',steamComponent:true,itemOut:true,slots:4});
 var steamSpecs=[
  ['steamgrinder','大型蒸汽研磨机',31041,'gt.recipe.macerator',['sss','srs','sCs'],25,14,0,0,0,0,0,''],
  ['steamsquasher','大型蒸汽压缩机',31078,'gt.recipe.compressor',['sss','shs','shs','sCs'],33,25,0,0,0,0,0,''],
  ['steamcentrifuge','大型蒸汽离心机',31080,'gt.recipe.centrifuge',['sssss','srrrs','ssCss'],69,60,4,8,3,0,0,'out'],
  ['steamwasher','大型蒸汽洗矿厂',31082,'gt.recipe.orewasher',['sssss','sgggs','sgggs','ssCss'],63,55,12,8,0,24,0,'in'],
  ['steamhammer','大型蒸汽锻造锤',31083,'gt.recipe.hammer',['sssss','shhhs','sfffs','ssCss'],42,35,2,0,0,0,2,''],
  ['steammixer','大型蒸汽搅拌机',31084,'gtpp.recipe.multimixer',['sssss','sgpgs','sgpgs','ssCss'],105,90,2,2,0,0,8,'both'],
  ['steamfuser','大型蒸汽合金炉',31086,'gt.recipe.alloysmelter',['sss','sgs','sgs','sCs'],29,25,2,0,0,4,0,'']
 ];
 steamSpecs.forEach(function(a){
  function set(i){return [part(i?block(2,0):block(1,10),a[5])].concat(a[7]?[part(block(2,i?13:12),a[7])]:[],a[8]?[part(block(2,i?3:2),a[8])]:[],a[9]?[part(block(3,i?14:13),a[9])]:[]);}
  var defaultPorts=[31040,31046,31047].concat(a[12]==='out'||a[12]==='both'?[61]:[],a[12]==='in'||a[12]==='both'?[51]:[]);
  var up=variants('pressure','结构等级',['青铜','钢制高压'],function(i){var list=set(i);list[0].n-=defaultPorts.length;return list;});
  var p=basic({id:a[0],name:a[1],meta:a[2],map:a[3],pattern:a[4],parts:function(v){return set(grade(v,'pressure',1)).concat(a[10]?[part('minecraft:glass@0',a[10])]:[],a[11]?[part('minecraft:iron_block@0',a[11])]:[]);},minCasing:a[6],maintenance:false,upgrades:[up],defaultPorts:defaultPorts,
   portHint:'物品总线仅支持输入总线(蒸汽)、输出总线(蒸汽)，升级钢制后仍相同。蒸汽使用一个蒸汽仓。'+(a[12]==='both'?'工艺流体使用普通输入仓、输出仓。':a[12]==='in'?'工艺流体使用普通输入仓。':a[12]==='out'?'工艺流体使用普通输出仓。':''),
   definition:{energyCapacity:0,startEnergy:0,volt:32,tier:1,steamPowered:true,steamCapacity:64000,startSteam:0,steamPerEU:1,durationMultiplier:1.6,powerMultiplier:1.25,maxParallel:8},
   allowed:function(m,f,s){return s.steamComponent||s.type==='fluidIn'&&(a[12]==='in'||a[12]==='both')||s.type==='fluidOut'&&(a[12]==='out'||a[12]==='both');},
   limits:function(m,list){return list.filter(function(p){return MULTIBLOCKS.spec(p.k).steam;}).length<=1;},
   portRequirements:Object.assign({steam:{min:1,max:1}},a[12]==='in'?{fluidIn:1}:a[12]==='out'?{fluidOut:1}:{}),
   capability:function(m,c){var t=1+grade(m.structure.variant,'pressure',1),steam=counted(m,'steam');c.voltage=32;c.power=32;c.durationMultiplier=1.6/t;c.definition={tier:1,steamCapacity:steam.length*64000,powerMultiplier:1.25*t,recipeMap:MACHINE_MODES.current(m)&&MACHINE_MODES.current(m).map||a[3]};}
  });if(a[0]==='steamwasher')p.modes=[{name:'洗矿',map:a[3]},{name:'简易洗矿',map:'gtpp.recipe.simplewasher'}];
 });
 basic({id:'industrialmultismelter',name:'工业熔炉',meta:1003,map:'gt.recipe.e_furnace',pattern:['sss','ccc','sCs'],parts:function(v){return [part(block(1,11),17),part(block(5,grade(v,'coil')),8)];},upgrades:[coilUpgrade(8)],muffler:true,minCasing:8,allowed:function(m,f,s){return ['energy','itemIn','itemOut'].includes(s.type)&&!s.steamComponent;},capability:function(m,c){var t=grade(m.structure.variant,'coil');c.definition={maxParallel:4*Math.pow(2,t)};}});
 basic({id:'industrialthermalcentrifuge',name:GD.items[key(849)],meta:849,map:'gt.recipe.thermalcentrifuge',
  pattern:['sCs','sss'],
  parts:function(){return [part('miscutils:gtplusplus.blockcasings.2@0',17)];},
  minCasing:8,muffler:true,
  allowed:function(m,f,s){return !s.steamComponent&&['energy','itemIn','itemOut'].includes(s.type);},
  definition:{slots:{in:4,out:4,fluid:0},fluidInputTanks:[],fluidOutputTanks:[],autoFluids:false,
   durationMultiplier:1/2.5,powerMultiplier:.8,parallelPerTier:8},
  capability:function(m,c){
   var voltage=counted(m,'energy').reduce(function(sum,p){return sum+MULTIBLOCKS.spec(p.k).voltage;},0);
   c.definition={maxParallel:Math.max(1,8*DEFS.recipeTier(voltage))};
  }
 });
 basic({id:'industrialsifter',name:'工业筛选机',meta:840,map:'gt.recipe.sifter',pattern:['sssss','sqqqs','ssCss'],parts:function(){return [part('miscutils:gtplusplus.blockcasings.2@5',56),part('miscutils:gtplusplus.blockcasings.2@6',18)];},minCasing:35,muffler:true,defaultPorts:[71,81,51,61],definition:{parallelPerTier:4,durationMultiplier:0.2,powerMultiplier:0.75}});
 basic({id:'industrialextractor',name:'工业提取机',meta:3010,map:'gt.recipe.extractor',pattern:['sssss','gpppg','ssCss'],parts:function(v){return [part(block(4,1),61),part(block(11,grade(v,'pipe',7)),19),part('minecraft:glass@0',8)];},minCasing:45,upgrades:[variants('pipe','物品管道',['锡','黄铜','琥珀金','铂','锇','量子','通流琥珀金','黑钚'],function(i){return [part(block(11,i),19)];})],allowed:function(m,f,s){return ['energy','itemIn','itemOut'].includes(s.type)&&!s.steamComponent;},definition:{durationMultiplier:1/3,powerMultiplier:0.85},capability:function(m,c){c.definition={maxParallel:8*(1+grade(m.structure.variant,'pipe',7))};}});
 basic({id:'industrialcanner',name:'工业装罐机',meta:360,map:'gt.recipe.fluidcanner',pattern:['sssss','sppps','ssCss'],parts:function(){return [part(block(2,0),97),part(block(2,13),24)];},minCasing:85,defaultPorts:[71,81,51,61],definition:{durationMultiplier:0.5,parallelPerTier:8}}).modes=[{name:'流体装罐',map:'gt.recipe.fluidcanner'},{name:'物品装罐',map:'gt.recipe.canner'}];
 // Existing structures keep their stored entities; this only changes the view and permissions.
 profiles.primitiveblastfurnace.options.manualLogistics=true;
 GD.extraMachineDefinitions.find(function(d){return d.structureProfile==='primitiveblastfurnace';}).manualLogistics=true;
 GD.extraMachineDefinitions.find(function(d){return d.structureProfile==='distillationtower';}).layeredOutputs=true;
 profiles.distillationtower.checkPortLayout=function(m,ports,errors){
  var levels=MULTIBLOCKS.shape(m).h-1;
  var installed=new Set(ports.filter(function(p){return MULTIBLOCKS.spec(p.k).fluidOut;}).map(function(p){return levels-Number(p.face.split(',')[1]);}));
  var missing=Array.from({length:levels},function(_,i){return i+1;}).filter(function(n){return !installed.has(n);});
  if(missing.length)errors.push('底座上方第 '+missing.join('、')+' 层缺少输出仓');
 };
   // 工业离心机：3×3×3，中间层中心空心，控制器在正面中层。
  basic({id:'industrialcentrifuge',name:'工业离心机',meta:790,map:'gtpp.recipe.multicentrifuge',
    pattern:['sss','sCs','sss'],
    parts:function(){return [part('miscutils:miscutils.blockcasings@0',25)];},
    minCasing:6,muffler:true,defaultPorts:[71,81,51,61],
    definition:{tier:4,volt:2048,energyCapacity:8192,durationMultiplier:1/2.25,powerMultiplier:0.9,parallelPerTier:6}});
  // 大型燃气涡轮：3×3×4，前端 3×3 留空进气，控制器正面中层。
  basic({id:'largegasturbine',name:'大型燃气涡轮',meta:1151,map:'gt.recipe.gasturbinefuel',
    pattern:['sss','sCs','sss'],
    parts:function(){return [part('gregtech:gt.blockcasings4@10',30)];},
    minCasing:8,muffler:true,defaultPorts:[71,81,51,61],
    definition:{tier:4,volt:2048,energyCapacity:8192}});
  // 大型内燃引擎：原版 3×3×4，画布保留横向投影。
  basic({id:'largecombustionengine',name:'大型内燃引擎',meta:1171,map:'gt.recipe.gasturbinefuel',
    pattern:['ssssssss','Csssssss','ssssssss'],
    parts:function(){return [part('gregtech:gt.blockcasings4@2',24),part('gregtech:gt.blockcasings2@4',2),part('gregtech:gt.blockcasings4@13',8)];},
    minCasing:16,muffler:true,defaultPorts:[71,81,51,61],
    definition:{tier:4,volt:2048,energyCapacity:8192}});
  // 工业粉碎机：3×3×6，上下实心、中间四层空心，控制器在底层正面中间。
  basic({id:'industrialmacerator',name:'工业粉碎机',meta:797,map:'gt.recipe.macerator',
    pattern:['sss','sss','sss','sss','sss','sCs'],
    parts:function(v){return [part(v.casing===1?'miscutils:miscutils.blockcasings@7':'gregtech:gt.blockcasings4@2',49)];},
    upgrades:[variants('casing','外壳',['gregtech:gt.blockcasings4@2','miscutils:miscutils.blockcasings@7'].map(function(k){return GD.items[k];}),function(i){return [part(i===1?'miscutils:miscutils.blockcasings@7':'gregtech:gt.blockcasings4@2',44)];})],
    minCasing:26,muffler:true,defaultPorts:[71,81],
    allowed:function(m,f,s){return !s.steamComponent&&['energy','itemIn','itemOut'].includes(s.type);},
    definition:{tier:4,volt:2048,energyCapacity:8192}});
  // 工业洗矿厂：5×3×7，首尾实心、中间五层是外壳框，控制器在 5 格边的正中。中间 3×5 是水槽。
  basic({id:'industriawashplant',name:'工业洗矿厂',meta:850,map:'gt.recipe.orewasher',
    pattern:['sssss','sssss','sssss','sssss','sssss','sssss','ssCss'],
    parts:function(){return [part('miscutils:gtplusplus.blockcasings.2@4',74)];},
    minCasing:40,muffler:true,defaultPorts:[71,81,51,61],
    materialKey:function(m,c){if(c.dy>=1&&c.dy<=5&&c.dx>=1&&c.dx<=3)return 'mcb:water';return null;},
    definition:{tier:4,volt:2048,energyCapacity:8192}});
  // 工业辊压机：3×3×3 中空，控制器正面中央，卷板与冲压共用一台。
  basic({id:'industrialmaterialpress',name:'工业辊压机',meta:792,map:'gt.recipe.metalbender',
    pattern:['sss','sss','sCs'],
    parts:function(){return [part('miscutils:miscutils.blockcasings@4',20)];},
    minCasing:6,muffler:true,defaultPorts:[71,81,51,61],
    definition:{tier:4,volt:2048,energyCapacity:8192,durationMultiplier:1/6,parallelPerTier:4}}).modes=[
      {name:'弯板',map:'gt.recipe.metalbender'},
      {name:'成型冲压',map:'gt.recipe.press'}
    ];
  // 大型热交换机：3×4×3，控制器正面底部中间，稳固钛外壳 20~28 块、钛管道外壳 2 块。
  basic({id:'largeheatexchanger',name:'大型热交换机',meta:1154,map:'gt.recipe.gasturbinefuel',
    pattern:['sss','sCs','sss','sss'],
    parts:function(){return [part('gregtech:gt.blockcasings4@2',28)];},
    minCasing:20,muffler:true,defaultPorts:[71,81,51,61],
    definition:{tier:4,volt:2048,energyCapacity:8192}});
  // Native 7×7 front and 9-block depth; stepped pressure casing around tiered glass.
  basic({id:'industrialautoclave',name:'工业高压釜',meta:687,map:'gt.recipe.autoclave',
    pattern:['  sss  ',' sgggs ','sgggggs','sgggggs','sgggggs','ssgggss','s sCs s'],
    parts:function(){return [
      part('gregtech:gt.blockcasings10@3',152),
      part('gregtech:gt.blockframes@473',42),
      part('minecraft:glass@0',42),
      part('gregtech:gt.blockcasings2@13',14),
      part('gregtech:gt.blockcasings5@0',7),
      part('gregtech:gt.blockcasings11@0',7)
    ];},
    minCasing:128,muffler:false,defaultPorts:[71,81,51,61],
    definition:{tier:6,volt:32768,energyCapacity:131072,environmentCapabilities:{lowGravity:true,cleanroom:true}}});
  // Native base: 49 casing/hatch positions; each middle slice adds 16 glass and 9 capacitors.
  var capacitorHeight={key:'height',label:'高度',min:4,max:50,initial:4};
  function capacitorLayers(v){return Math.max(capacitorHeight.min,Math.min(capacitorHeight.max,v.height||capacitorHeight.initial));}
  var capacitorProfile=basic({id:'lapotronicsupercapacitor',name:'兰波顿超级电容库',meta:13106,map:'gt.recipe.thermalcentrifuge',
    pattern:['sssss','sssss','sssss','ssCss'],
    parts:function(v){var extra=capacitorLayers(v)-capacitorHeight.min;return [
      part('kekztech:kekztech_lapotronicenergyunit_block@0',49),
      part('minecraft:glass@0',41+extra*16),
      part('kekztech:kekztech_lapotronicenergyunit_block@7',9+extra*9)
    ];},
    minCasing:17,defaultPorts:[71,81],
    resize:function(v){var h=capacitorLayers(v);return {h:h,cy:h-1};},
    materialKey:function(m,c){
      var h=MULTIBLOCKS.shape(m).h;
      if(c.dy>=h-2)return null;
      if(c.dy===0)return 'minecraft:glass@0';
      var inner=c.dx>=1&&c.dx<=3&&c.dy>=0;          // 中间 3 列
      return inner?'kekztech:kekztech_lapotronicenergyunit_block@7':'minecraft:glass@0';
    },
    definition:{tier:4,volt:2048,energyCapacity:8192}});
  capacitorProfile.dimensions=[capacitorHeight];
  capacitorProfile.visualPattern=function(m){var h=MULTIBLOCKS.shape(m).h;return ['ggggg'].concat(Array(h-3).fill('gcccg'),['sssss','ssCss']);};
    // 工业屠宰场：5×5×7，底层与顶层钢外壳，中段框架加玻璃，控制器正面底部中间。
  basic({id:'extremeentitycrusher',name:'工业屠宰场',meta:14201,map:'gt.recipe.macerator',
    pattern:['sssss','sssss','sssss','sssss','sssss','sssss','ssCss'],
    parts:function(){return [
      part('gregtech:gt.blockcasings2@0',70),
      part('minecraft:glass@0',60)
    ];},
    minCasing:35,muffler:true,defaultPorts:[71,81,51,61],
    definition:{tier:4,volt:2048,energyCapacity:8192}});  // Native 3 wide × 3 high × 5 deep; the visible front is 3 × 3.
  basic({id:'industrialcuttingmachine',name:'工业切割机',meta:992,map:'gt.recipe.cuttingsaw',
    pattern:['sss','sCs','sss'],
    parts:function(){return [part('miscutils:gtplusplus.blockcasings.2@13',41)];},
    minCasing:14,muffler:true,defaultPorts:[71,81,51],
    allowed:function(m,f,s){return !s.steamComponent&&['energy','itemIn','itemOut','fluidIn'].includes(s.type);},
    definition:{tier:4,volt:2048,energyCapacity:8192}});
  // EX 虚空矿机：3×3×7 塔状。底层 8 机壳 + 控制器，三层十字（4 框架 + 1 机械方块），顶层三层单柱框架。
  var exVoid=[
    {id:'exvoidminer1',name:'EX 虚空矿机 I',meta:26763,tier:1,volt:32,casing:'gregtech:gt.blockcasings2@0',frame:'gregtech:gt.blockframes@305',rate:8,face:'asset:modicons/multiblocks/frame_steel.png',casingFace:'asset:modicons/multiblocks/gregtech_gt.blockcasings2_0.png'},
    {id:'exvoidminer2',name:'EX 虚空矿机 II',meta:26764,tier:3,volt:512,casing:'gregtech:gt.blockcasings4@1',frame:'gregtech:gt.blockframes@306',rate:16,face:'asset:modicons/multiblocks/frame_stainlesssteel.png',casingFace:'asset:modicons/multiblocks/gregtech_gt.blockcasings4_1.png'},
    {id:'exvoidminer3',name:'EX 虚空矿机 III',meta:26765,tier:5,volt:8192,casing:'gregtech:gt.blockcasings4@0',frame:'gregtech:gt.blockframes@316',rate:32,face:'asset:modicons/multiblocks/frame_tungstensteel.png',casingFace:'asset:modicons/multiblocks/gregtech_gt.blockcasings4_0.png'}
  ];
  exVoid.forEach(function(e){
    basic({id:e.id,name:e.name,meta:e.meta,map:'gt.recipe.macerator',
      pattern:[' G ',' G ',' G ','GFG','GFG','GFG','sCs'],
      parts:function(){return [part(e.casing,8),part(e.frame,15)];},
      materialKey:function(m,c,ch){if(ch==='G')return e.face;if(ch==='F'||ch==='s')return e.casingFace;return null;},
      minCasing:0,muffler:false,defaultPorts:[71,81,51],
      definition:{tier:e.tier,volt:e.volt,energyCapacity:e.volt*8}});
  });
root.MULTIBLOCK_CATALOG={basic:basic,upgrade:upgrade,variants:variants,coilUpgrade:coilUpgrade,key:key,block:block,part:part,counted:counted};
})(typeof window!=='undefined'?window:globalThis);
