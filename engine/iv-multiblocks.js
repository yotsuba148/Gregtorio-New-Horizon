/* Native IV processing machines. Transport and AE only see their physical ports. */
(function(root){
 'use strict';var B=MULTIBLOCK_CATALOG,C=CONTENT,TX=GTTransactions;
 function part(k,n){return {k:k,n:n};}
 function fail(code,text){return {ok:false,code:code,text:text};}
 function nativeName(id){return GD.items[B.key(id)];}
 function electrical(m,f,s){return !s.steamComponent&&['energy','itemIn','itemOut','fluidIn','fluidOut'].includes(s.type);}
 function requirePorts(p,roles){p.portRequirements=Object.fromEntries(roles.map(function(role){return [role,1];}));}
 function voltageParallel(p,n){var previous=p.capability;p.capability=function(m,c,errors,raw){if(previous)previous(m,c,errors,raw);c.definition=Object.assign({},c.definition,{maxParallel:Math.max(1,n*DEFS.recipeTier(c.voltage))});};}
 function add(spec){spec.name=nativeName(spec.meta);spec.definition=Object.assign({windowWidth:spec.pattern[0].length>=5?660:520},spec.definition||{});spec.defaultPorts=spec.defaultPorts||[71,81,51,61];spec.allowed=spec.allowed||electrical;var p=B.basic(spec);p.controllerIcon='modicons/iv-machines/'+spec.meta+'-idle.png';return p;}
 function coilKey(v){return HEATING_COILS.at(v.coil).key;}
 function coilHeat(m){var installed=MULTIBLOCKS.live(m)&&STRUCTURE_UPGRADES.installed(m,'coil');return installed&&installed.complete?HEATING_COILS.at(installed.value).heat:0;}
 function coilMaterial(m,c,ch){return ch==='c'?coilKey(m.structure&&m.structure.variant||m.buildPlan||{}):null;}
 function heatCapability(m,c){c.heat=coilHeat(m);c.definition={processingHeat:c.heat};}
 function heatRequirement(p){p.heatLabel='当前炉温';p.recipeRequirements=[{label:'炉温',code:'HEAT',required:function(r){return r.heat||r.extra&&r.extra.special||0;},available:coilHeat}];}

 var mixer=add({id:'industrialmixer',meta:811,map:'gtpp.recipe.multimixer',pattern:['sss','srs','sCs','sss'],
  parts:function(){return [part('miscutils:gtplusplus.blockcasings.3@2',33),part(B.block(4,11),2)];},minCasing:5,muffler:true,
  materialKey:function(m,c,ch){return ch==='r'?B.block(4,11):null;},definition:{parallelPerTier:8,durationMultiplier:1/3.5}});
 requirePorts(mixer,['itemIn','itemOut','fluidIn','fluidOut']);
 voltageParallel(mixer,8);
 var electro=add({id:'industrialelectrolyzer',meta:796,map:'gtpp.recipe.multielectro',pattern:['sss','sCs','sss'],
  parts:function(){return [part('miscutils:miscutils.blockcasings@5',25)];},minCasing:6,muffler:true,
  definition:{parallelPerTier:2,durationMultiplier:1/2.8,powerMultiplier:.9}});
 requirePorts(electro,['itemIn','itemOut','fluidIn','fluidOut']);
 voltageParallel(electro,2);

 var mill=add({id:'isamill',meta:31027,map:'gtpp.recipe.oremill',pattern:['ppp','srs','srs','srs','srs','srs','sCs'],
  parts:function(){return [part('miscutils:gtplusplus.blockcasings.5@0',49),part('miscutils:gtplusplus.blockcasings.5@1',8),part('miscutils:gtplusplus.blockcasings.5@2',5)];},minCasing:40,muffler:true,defaultPorts:[71,81,31029],
  allowed:function(m,f,s){return electrical(m,f,s)||s.type==='milling';},
  limits:function(m,list){return list.filter(function(p){return MULTIBLOCKS.spec(p.k).type==='milling';}).length<=1;},
  materialKey:function(m,c,ch){return ch==='p'?'miscutils:gtplusplus.blockcasings.5@1':ch==='r'?'miscutils:gtplusplus.blockcasings.5@2':null;},
  definition:{perfectOverclock:true}});
 mill.portRequirements={milling:{min:1,max:1}};
 MULTIBLOCKS.registerPort(B.key(31029),{type:'milling',aux:'milling',slots:8});
 var balls=new Set(['miscutils:item.BasicGenericChemItem@7','miscutils:item.BasicGenericChemItem@8']);
 function isBall(k){return !!k&&balls.has(C.baseKey(k));}
 AUX_INVENTORIES.register('milling',{inputSlots:8,accepts:function(s){return isBall(s.k);}});
 mill.prepareRecipe=function(m,r){
  var required=(r.req||[]).filter(function(q){return isBall(q.k);});
  if(!required.length)return r;
  var stores=B.counted(m,'milling');
  if(required.some(function(q){
   return !stores.some(function(p){return p.items.some(function(s){return s&&TX.count(s)>0&&C.matches(q.k,s.k);});});
  }))return fail('MILLING_BALL','研磨球仓内缺少所需研磨球');
  return Object.assign({},r,{req:r.req.filter(function(q){return !isBall(q.k);})});
 };

 var flotation=add({id:'flotationcell',meta:31028,map:'gtpp.recipe.flotationcell',pattern:['  sCs  ','  fff  ','  fff  ','  fff  ','  fff  ','  fff  ','  fff  ','sssssss','sssssss'],
  parts:function(){return [part('miscutils:gtplusplus.blockcasings.3@1',78),part('miscutils:gtplusplus.blockspecialcasings.1@9',52)];},minCasing:64,defaultPorts:[71,51,61],
  allowed:function(m,f,s){return f.y>=7&&!s.steamComponent&&['energy','itemIn','fluidIn','fluidOut'].includes(s.type);},
  materialKey:function(m,c,ch){return ch==='f'?'miscutils:gtplusplus.blockspecialcasings.1@9':null;},definition:{perfectOverclock:true,inputIsolationFixed:false}});
 requirePorts(flotation,['itemIn','fluidIn','fluidOut']);
 function milled(r){var p=(r.in||[]).find(function(i){return /^miscutils:milled/.test(C.baseKey(i.k));});return p&&C.baseKey(p.k);}
 flotation.checkRecipe=function(m,r){var k=milled(r);return !k?fail('INVALID_RECIPE','配方缺少研磨矿物'):m.flotationMaterial&&m.flotationMaterial!==k?fail('MATERIAL_LOCK','此工业浮选机已锁定'+(GD.items[m.flotationMaterial]||m.flotationMaterial)):null;};
 flotation.commitBatch=function(m,r){m.flotationMaterial=milled(r);};
 flotation.portHint='仓室安装在底部两层。首次加工后锁定矿物。';

 var vacuum=add({id:'industrialdehydrator',meta:995,map:'gtpp.recipe.vacfurnace',pattern:['sss','ccc','ccc','ccc','sCs'],
  parts:function(v){return [part('miscutils:gtplusplus.blockcasings.4@10',17),part(coilKey(v),24)];},minCasing:5,muffler:true,upgrades:[STRUCTURE_UPGRADES.coil(24)],materialKey:coilMaterial,
  definition:{maxParallel:4,durationMultiplier:1/2.2,powerMultiplier:.5,heatOverclock:true,heatDiscount:true},capability:heatCapability});
 vacuum.modes=[{name:'真空干燥炉',map:'gtpp.recipe.vacfurnace'},{name:'脱水机',map:'gtpp.recipe.multidehydrator'}];requirePorts(vacuum,['itemIn','itemOut','fluidIn','fluidOut']);heatRequirement(vacuum);
 var digester=add({id:'digester',meta:10500,map:'gtnhlanth.recipe.digester',pattern:[' sssss ','sssssss','scccccs','sssCsss'],
  parts:function(v){return [part(B.block(4,0),59),part(B.block(1,11),16),part(B.block(4,1),9),part(coilKey(v),16)];},muffler:true,upgrades:[STRUCTURE_UPGRADES.coil(16)],materialKey:function(m,c,ch){return ch==='h'?B.block(1,11):coilMaterial(m,c,ch);},
  definition:{perfectOverclock:true},capability:heatCapability});requirePorts(digester,['itemIn','itemOut','fluidIn','fluidOut']);heatRequirement(digester);
 var dissolution=add({id:'dissolutiontank',meta:10501,map:'gtnhlanth.recipe.disstank',pattern:['sssss','sgggs','sgggs','ssCss','s   s'],
  parts:function(){return [part(B.block(4,1),42),part('bartworks:BW_GlasBlocks@0',24),part(B.block(1,11),9)];},
  materialKey:function(m,c,ch){return ch==='g'?'bartworks:BW_GlasBlocks@0':null;}});requirePorts(dissolution,['itemIn','itemOut','fluidIn','fluidOut']);
 dissolution.checkFluidRemainder=function(r,tanks){
  var ratio=r.extra&&r.extra.special;
  if(r.fin.length!==2||!(ratio>0))return fail('INVALID_RECIPE','配方缺少流体比例');
  var major=r.fin[0].f,minor=r.fin[1].f,majorAmount=0,minorAmount=0;
  for(var tank of tanks){
   if(!tank)continue;
   if(tank.f===major)majorAmount+=tank.mb;
   else if(tank.f===minor)minorAmount+=tank.mb;
  }
  if(majorAmount!==minorAmount*ratio)return fail('FLUID_RATIO','输入仓的流体比例不符：'+ratio+' : 1');
 };
 dissolution.portHint='两种流体按配方比例装入输入仓。';

 var washer=STRUCTURES.profiles.industriawashplant;
 washer.modes=[{name:'洗矿',map:'gt.recipe.orewasher'},{name:'简易洗矿',map:'gtpp.recipe.simplewasher'},{name:'化学浸洗',map:'gt.recipe.chemicalbath'}];
 var cutter=STRUCTURES.profiles.industrialcuttingmachine;cutter.modes=[{name:'切割',map:'gt.recipe.cuttingsaw'},{name:'切片',map:'gt.recipe.slicer'}];
 [[washer,5,1],[cutter,3,.75]].forEach(function(a){Object.assign(a[0].options,{durationMultiplier:1/a[1],powerMultiplier:a[2],parallelPerTier:4});var d=GD.extraMachineDefinitions.find(function(d){return d.key===a[0].key;});Object.assign(d,a[0].options);});
 voltageParallel(washer,4);voltageParallel(cutter,4);voltageParallel(STRUCTURES.profiles.industrialcentrifuge,6);
 root.IV_MULTIBLOCKS={coilHeat:coilHeat,coilMetas:HEATING_COILS.grades.map(function(coil){return coil.meta;})};DEFS.rebuild();
})(typeof window!=='undefined'?window:globalThis);
