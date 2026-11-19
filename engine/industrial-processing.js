/* Structure layouts and recipe capabilities. Processing and I/O use the shared engine. */
(function(root){
 'use strict';
 var catalog=MULTIBLOCK_CATALOG, key=catalog.key;
 var glassKeys=[2,3,4,5,12,13,14,15].map(function(i){return 'bartworks:BW_GlasBlocks@'+i;});
 var arcCasing='miscutils:gtplusplus.blockcasings.4@3';
 var frame='gregtech:gt.blockframes@';
 function block(group,id){return 'gregtech:gt.blockcasings'+(group===1?'':group)+'@'+id;}
 function part(k,n){return {k:k,n:n};}
 function grade(m,field){return m.structure&&m.structure.variant[field]||0;}
 function install(spec){
  var roles=spec.roles||['energy','itemIn','itemOut','fluidIn','fluidOut'];
  spec.name=GD.items[key(spec.meta)];
  spec.allowed=spec.allowed||function(m,f,s){return !s.steamComponent&&roles.includes(s.type);};
  spec.parts=spec.parts||function(){return spec.materials.map(function(p){return part(p[0],p[1]);});};
  var profile=catalog.basic(spec);
  if(spec.required)profile.portRequirements=Object.assign({},profile.portRequirements,Object.fromEntries(spec.required.map(function(role){return [role,1];})));
  profile.acceptsFluid=spec.acceptsFluid;
  if(spec.art)profile.materialKey=function(m,c,tile){
   var value=spec.art[tile];return typeof value==='function'?value(m):value;
  };
  return profile;
 }
 function metalCoils(n){return catalog.variants('coil','线圈',Array.from({length:14},function(_,i){
  return GD.items[block(5,i)]||block(5,i);
 }),function(i){return [part(block(5,i),n)];});}
 function glass(n){return catalog.variants('glass','玻璃',glassKeys.map(function(k){return GD.items[k]||k;}),function(i){return [part(glassKeys[i],n)];});}
 function error(code,text){return {ok:false,code:code,text:text};}
 function hasFluid(m,f){return m.tanksIn.some(function(t){return t&&t.f===f&&t.mb>0;});}
 var ref={
  blastShell:'miscutils:miscutils.blockcasings@15',blastCoil:'miscutils:miscutils.blockcasings@14',
  alloyShell:'miscutils:gtplusplus.blockcasings.3@1',encasement:'miscutils:gtplusplus.blocktieredcasings.1@4',
  cokeShell:'miscutils:miscutils.blockcasings@1',cokeWalls:['miscutils:miscutils.blockcasings@2','miscutils:miscutils.blockcasings@3'],
  rockShell:'miscutils:gtplusplus.blockcasings.2@0',rockCore:'miscutils:gtplusplus.blockcasings.2@11',
  compressor:block(10,4),compressorPipe:block(10,5),
  bulk:'miscutils:gtplusplus.blockcasings.2@12',
  molShell:block(4,0),molContainment:'miscutils:gtplusplus.blockspecialcasings.1@11',
  molCap:'miscutils:gtplusplus.blockspecialcasings.1@12',molParticle:'miscutils:gtplusplus.blockspecialcasings.1@13',
  molResonance:'miscutils:gtplusplus.blockspecialcasings.3@0',molModulator:'miscutils:gtplusplus.blockspecialcasings.3@4'
 };
 var blast=install({id:'alloyblastsmelter',meta:810,map:'gtpp.recipe.alloyblastsmelter',
  pattern:['sss','hhh','hhh','sCs'],materials:[[ref.blastShell,17],[ref.blastCoil,16]],
  art:{h:ref.blastCoil},minCasing:3,muffler:true,defaultPorts:[71,51,81,61],
  required:['itemIn','itemOut','fluidIn','fluidOut'],definition:{controllerCircuit:true,controlCircuit:true,inputIsolationFixed:false}
 });
 blast.recipeRequirements=[{label:'输入电压等级',code:'VOLTAGE',
  required:function(r){return DEFS.recipeTier(r.eut);},available:function(m){return DEFS.recipeTier(m.structure.voltage);}
 }];
 install({id:'industrialalloysmelter',meta:31023,map:'gt.recipe.alloysmelter',
  pattern:['sss','hhh','vvv','hhh','sCs'],upgrades:[metalCoils(16)],
  parts:function(v){return [part(ref.alloyShell,17),part(ref.encasement,8),part(block(5,v.coil||0),16)];},
  art:{h:function(m){return block(5,grade(m,'coil'));},v:ref.encasement},
  minCasing:8,muffler:true,roles:['energy','itemIn','itemOut'],
  definition:{parallelPerTier:1},
  capability:function(m,c){c.definition={maxParallel:(1+grade(m,'coil'))*Math.max(1,DEFS.recipeTier(c.voltage))};}
 });
 install({id:'industrialcokeoven',meta:791,map:'gtpp.recipe.cokeoven',
  pattern:['sss','hhh','sCs'],defaultPorts:[71,81,51,61],minCasing:8,muffler:true,
  upgrades:[catalog.variants('ovenWall','炉壁',ref.cokeWalls.map(function(k){return GD.items[k];}),function(i){return [part(ref.cokeWalls[i],8)];})],
  parts:function(v){return [part(ref.cokeShell,17),part(ref.cokeWalls[v.ovenWall||0],8)];},
  art:{h:function(m){return ref.cokeWalls[grade(m,'ovenWall')];}},
  definition:{controllerCircuit:true},
  capability:function(m,c){c.definition={maxParallel:6+12*(1+grade(m,'ovenWall')),powerMultiplier:1-.04*DEFS.recipeTier(c.voltage)};}
 });
 var rock=install({id:'industrialrockbreaker',meta:31065,map:'gt.recipe.multiblockrockbreaker',
  pattern:['sss','hhh','hhh','sCs'],materials:[[ref.rockShell,17],[ref.rockCore,16]],
  art:{h:ref.rockCore},minCasing:9,muffler:true,defaultPorts:[71,81,51,51],required:['fluidIn'],
  definition:{parallelPerTier:8,durationMultiplier:1/3,powerMultiplier:.75,controllerCircuit:true},
  acceptsFluid:function(m,f){return f==='water'||f==='lava';}
 });
 rock.checkRecipe=function(m){
  if(!hasFluid(m,'water'))return error('FLUID_INPUT','缺少水');
  if(!hasFluid(m,'lava'))return error('FLUID_INPUT','缺少熔岩');
  return null;
 };
 install({id:'industrialelectriccompressor',meta:3005,map:'gt.recipe.compressor',
  pattern:['  ppp  ',' psssp ','psspssp','psspssp','psspssp','psspssp','psspssp',' ssCss '],
  materials:[[ref.compressor,110],[ref.compressorPipe,45],[glassKeys[0],6]],art:{p:ref.compressorPipe},
  upgrades:[glass(6)],parts:function(v){return [part(ref.compressor,110),part(ref.compressorPipe,45),part(glassKeys[v.glass||0],6)];},
  minCasing:95,roles:['energy','itemIn','itemOut'],definition:{parallelPerTier:2,durationMultiplier:.5,powerMultiplier:.9}
 });
 install({id:'largescaleautocrafter',meta:876,map:'gt.recipe.assembler',
  pattern:['sss','sCs','sss'],materials:[[ref.bulk,25]],defaultPorts:[71,81,51],minCasing:10,
  definition:{parallelPerTier:2,durationMultiplier:1/3,controllerCircuit:true}
 });
 install({id:'largemoleculartransformer',meta:31072,map:'gtpp.recipe.moleculartransformer',
  pattern:['  sCs  ',' sqqqs ',' sqkqs ',' sqqqs ','bsqqqsb',' bhhhb ','bbbbbbb'],
  materials:[[ref.molShell,49],[ref.molContainment,52],[ref.molCap,32],[ref.molParticle,4],
   [ref.molResonance,5],[ref.molModulator,4],[block(5,3),16]],
  art:{s:ref.molContainment,b:ref.molShell,h:block(5,3),q:ref.molCap,k:ref.molParticle},
  minCasing:40,roles:['energy','itemIn','itemOut'],definition:{maxParallel:1}
 });
 var arc=install({id:'industrialarcfurnace',meta:862,map:'gt.recipe.arcfurnace',
  pattern:['sssssss','sssCsss','sssssss'],materials:[[arcCasing,83]],defaultPorts:[71,81,51,61],
  minCasing:10,muffler:true,definition:{parallelPerTier:8,durationMultiplier:1/3,controllerCircuit:true}
 });
 arc.modes=[
  {name:'电弧炉',map:'gt.recipe.arcfurnace'},
  {name:'等离子电弧炉',map:'gt.recipe.plasmaarcfurnace'}
 ];
 var preciseKeys=Array.from({length:4},function(_,i){return 'GoodGenerator:preciseUnitCasing@'+i;});
 var precise=install({id:'preciseassembler',meta:32018,map:'gg.recipe.precise_assembler',
  pattern:['sssssssss','sgggggggs','smmmmmmms','sgggggggs','ssssCssss'],
  parts:function(v){return [part(preciseKeys[v.precision||0],86),part(glassKeys[v.glass||0],42),part(block(1,6),21)];},
  art:{m:block(1,6)},minCasing:42,defaultPorts:[71,81,51,61],required:['fluidIn'],
  upgrades:[catalog.variants('precision','精密电子单元',preciseKeys.map(function(k){return GD.items[k];}),function(i){return [part(preciseKeys[i],80)];}),glass(42)],
  definition:{controllerCircuit:true},
  capability:function(m,c){c.definition={maxParallel:m.processingMode===1?Math.pow(2,5+grade(m,'precision')):1};}
 });
 precise.modes=[{name:'精密组装',map:'gg.recipe.precise_assembler'},{name:'普通组装',map:'gt.recipe.assembler'}];
 precise.recipeRequirements=[{label:'精密电子单元等级',required:function(r){
  return r.extra&&r.extra.metadata&&r.extra.metadata.precise_assembler_casing_tier;
 },available:function(m){return grade(m,'precision')+1;}}];
 var lasers=Object.keys(GD.items).filter(function(k){return /激光源仓$/.test(GD.items[k])&&/\d+A\/t/.test(GD.items[k].replace(/,/g,''));});
 lasers.forEach(function(k){
  var name=GD.items[k].replace(/,/g,''),tier=DEFS.ORDER.indexOf(name.split(' ')[0])+1,amps=Number(/(\d+)A\/t/.exec(name)[1]);
  if(tier>0)MULTIBLOCKS.registerPort(k,{type:'laserSource',tier:tier,laserAmps:amps});
 });
 install({id:'industriallaserengraver',meta:3004,map:'gt.recipe.laserengraver',
  pattern:['sssss','sgggs','sfhfs','ssCss'],parts:function(v){
   return [part(block(10,1),43),part(frame+'316',9),part(glassKeys[v.glass||0],3),part('gregtech:gt.blockcasings10@3',1)];
  },art:{f:frame+'316',h:block(10,3)},upgrades:[glass(3)],defaultPorts:[71,81,51,61,15230],
  roles:['energy','itemIn','itemOut','fluidIn','fluidOut','laserSource'],
  minCasing:35,required:['laserSource','fluidIn','fluidOut'],definition:{durationMultiplier:1/3.5,powerMultiplier:.8},
  capability:function(m,c){
   var source=catalog.counted(m,'laserSource')[0];if(!source)return;
   var spec=MULTIBLOCKS.spec(source.k);
   c.power=Math.min(c.power,DEFS.voltOf(spec.tier)*Math.max(1,Math.floor(Math.cbrt(spec.laserAmps))));
   c.definition={maxParallel:Math.max(1,Math.floor(Math.cbrt(spec.laserAmps)))};
  },limits:function(m,ports){return ports.filter(function(p){return MULTIBLOCKS.spec(p.k).type==='laserSource';}).length<=1;}
 });
 root.INDUSTRIAL_PROCESSING={install:install,part:part,block:block,glass:glass,glassKeys:glassKeys,grade:grade,error:error};
 DEFS.rebuild();
})(typeof window!=='undefined'?window:globalThis);
