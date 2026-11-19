/* Canvas footprints, hardware admission, and machine-specific UI descriptions. */
(function () {
 'use strict';
 const B = MULTIBLOCK_CATALOG, MB = MULTIBLOCKS, I = INDUSTRIAL_ENERGY;
 const native = LUV_GENERATION;
 const K = B.key, casing = INDUSTRIAL_PROCESSING.block, part = INDUSTRIAL_PROCESSING.part;
 const shaft = 'miscutils:gtplusplus.blockspecialcasings.1@0';
 const gasShell = 'miscutils:gtplusplus.blockspecialcasings.1@3';
 const scShell = 'GoodGenerator:supercriticalFluidTurbineCasing@0';
 const pressure = 'GoodGenerator:pressureResistantWalls@0';
 const cylinder = 'GoodGenerator:titaniumPlatedCylinder@0';
 const glass = 'bartworks:BW_GlasBlocks@0';
 const frame = 'gregtech:gt.blockframes@81';
 const standard = {startEnergy:0, inputIsolationFixed:false, autoItems:false, autoFluids:true,
  showBatchTelemetry:false, compactMultiblock:true, runSwitch:true, supportsVoidProtection:false, portFluidPeriodTicks:5};
 const fluidKind = (s,direction) => !s.steamComponent && !s.stocking && HATCH_RULES.has(s,direction);
 const one = {min:1,max:1};
 GD.fluids.supercriticalsteam='超临界蒸汽';
 const directions = [[0,-1],[1,0],[0,1],[-1,0]];

 function define(spec) {
  const base = spec.parts[0].k, art = spec.art || {};
  const definition = Object.assign({},standard,spec.definition,{behavior:spec.id});
  const profile = B.basic({
   id:spec.id, meta:spec.meta, name:GD.items[K(spec.meta)], map:spec.map||'none:'+spec.id,
   pattern:spec.rows, portTiles:spec.portTiles||['s'], maintenance:true, defaultEnergy:false,
   parts:()=>spec.parts.map(p=>part(p.k,p.n)), defaultPorts:spec.defaultPorts,
   minCasing:spec.minCasing, portHint:spec.portHint, definition:definition,
   materialKey:(m,c,ch)=>art[ch]||base, portRequirements:spec.requirements, allowed:spec.allowed,
   capability:spec.capability
  });
  profile.portFace = (x,y,side) => {
   const [dx,dy] = directions[side], neighbor = spec.rows[y+dy]?.[x+dx];
   return !neighbor || neighbor===' ';
  };
  if(spec.mapUnit){profile.portMapUnit=spec.mapUnit;profile.largerPortMap=true;}
  return profile;
 }
 function preferredFaces(faces,ids) {
  return ids.map(id=>faces.find(f=>f.id===id)).filter(Boolean).concat(faces.filter(f=>!ids.includes(f.id)));
 }
 function outputCapacity(m,c) {c.energyCapacity=MULTIBLOCK_POWER.capacity(m);}
 function rotorFace(x,y,side) {return y>0 && (x===1&&side===3||x===5&&side===1);}
 MB.registerPort(K(30010),{type:'turbineRotor',aux:'xlTurbineRotor',slots:1});
 const gas = define({
  id:'xl_gas_turbine',meta:31073,mapUnit:22,map:'gt.recipe.gasturbinefuel',
  rows:[' ssCss ','sRsssRs','sRsXsRs','sRsXsRs','sRsXsRs','sRsXsRs','sRsXsRs'],
  portTiles:['s','R'], parts:[part(gasShell,406),part(shaft,30),part(K(91),4)],
  art:{X:shaft,R:gasShell},minCasing:360,
  defaultPorts:[...Array(native.rotorCount).fill(30010),51,71,34],
  portHint:'两列转子仓放入同材料、同规格的涡轮转子。输入总线可以自动补充转子。',
  requirements:{turbineRotor:{min:native.rotorCount,max:native.rotorCount,label:GD.items[K(30010)]},
   itemIn:1,fluidIn:1,dynamo:1},capability:outputCapacity,
  definition:{energyCapacity:0,generator:true,uiPanels:['xl_turbine_fit']},
  allowed:(m,f,s)=>{
   if (rotorFace(f.x,f.y,f.side)) return s.type==='turbineRotor';
   return fluidKind(s,'fluidIn')||!s.steamComponent&&!s.stocking&&s.type==='itemIn'||s.type==='dynamo';
  }
 });
 gas.faceHint=(m,f)=>rotorFace(f.x,f.y,f.side)?'转子仓':null;
 gas.portChoices=(m,k,faces)=>preferredFaces(faces,({'dynamo':['6,3,1'],'fluidIn':['0,2,3'],'itemIn':['0,4,3']})[MB.spec(k).type]||[]);
 const gasOutside = gas.portFace;
 gas.portFace = (x,y,side) => gasOutside(x,y,side) || rotorFace(x,y,side);

 const chem = define({
  id:'universal_chemical_engine',meta:32001,
  rows:[' sssssss ','ipDDDDDis','Cpgggggis','sssssssss'],
  portTiles:['s','i'],parts:[part(casing(4,2),109),part(casing(2,14),14),part(cylinder,14),
   part(casing(2,4),14),part(casing(4,13),14),part(K(91),14)],
  art:{i:casing(4,13),p:casing(2,14),D:cylinder,g:casing(2,4)},minCasing:93,
  defaultPorts:[51,51,34], requirements:{fluidIn:2,dynamo:one},capability:outputCapacity,
  definition:{energyCapacity:0,generator:true,uiPanels:['industrial_generation_rate']},
  portHint:'分别接入燃料和助燃剂。每秒取一次料，助燃剂比例决定发电效率。',
  allowed:(m,f,s)=>s.type==='dynamo'?f.id==='8,2,1':fluidKind(s,'fluidIn')
 });
 chem.portChoices=(m,k,faces)=>preferredFaces(faces,['0,1,3','3,0,0']);
 const exchanger = define({
  id:'extreme_heat_exchanger',meta:32017,map:native.heatMap,
  rows:[' sssssss ',' gpGWGpg ','CspWpWpss','sspspspss',' sssssss '],parts:[
   part(casing(4,0),125),part(glass,72),part(pressure,48),part(casing(2,15),60)],
  art:{g:glass,G:glass,W:pressure,p:casing(2,15)},minCasing:25,
  defaultPorts:[55,53,65,65,65],requirements:{fluidIn:2,fluidOut:3},
  definition:{energyCapacity:0,controllerCircuit:true,uiPanels:['extreme_heat_status']},
  portHint:'左侧接热流体，左下出口排出冷却流体。下侧接蒸馏水，上侧和右侧出汽。',
  allowed:(m,f,s)=>f.id===native.hotFace?fluidKind(s,'fluidIn'):f.id===native.coldFace?fluidKind(s,'fluidOut'):
   f.side===2?fluidKind(s,'fluidIn'):fluidKind(s,'fluidOut')
 });
 exchanger.portChoices = (m,k,faces) => {
  const preferred = MB.spec(k).fluidIn ? [native.hotFace,'4,4,2'] : [native.coldFace,'7,0,0','8,2,1'];
  return preferred.map(id=>faces.find(f=>f.id===id)).filter(Boolean);
 };
 exchanger.checkPortLayout = (m,ports,errors) => {
  if (!ports.some(p=>p.face===native.hotFace)) errors.push('缺少热流体输入仓');
  if (!ports.some(p=>p.face===native.coldFace)) errors.push('缺少冷却流体输出仓');
 };
 exchanger.faceHint=(m,f)=>f.id===native.hotFace?'热流体入口':f.id===native.coldFace?'冷却流体出口':
  f.side===2?'蒸馏水入口':'蒸汽出口';
 exchanger.fluidPortAccepts = native.exchangerPortAccepts;
 exchanger.outputFluids = (m,p) => native.exchangerOutputs(p.face);

 const pump = define({
  id:'deep_earth_pump',meta:12729,
  rows:['fff',' f ','fcf','fcf','fcf',' f ','sCs'],
  parts:[part(casing(1,11),11),part(frame,15)],art:{f:frame},minCasing:2,
  defaultPorts:[43,54,64],requirements:{energy:{min:1,label:'HV 或更高等级的能源仓'},fluidIn:1,fluidOut:1},
  definition:{energyCapacity:0,showInputIsolation:false,uiPanels:['geothermal_status']},
  allowed:(m,f,s)=>s.type==='energy'?s.tier>=3:fluidKind(s,'fluidIn')||fluidKind(s,'fluidOut')
 });
 pump.portChoices=(m,k,faces)=>preferredFaces(faces,({'energy':['0,6,0'],'fluidIn':['0,6,3'],'fluidOut':['2,6,1']})[MB.spec(k).type]||[]);
 pump.modes = native.pumpModes.map(mode => ({name:mode.name}));
 pump.outputFluids = () => native.pumpModes.map(mode=>mode.output);

 function rate(host,m,save,withFit) {
  const text = document.createElement('span');
  if (withFit) {
   const fit = document.createElement('button');
   fit.className='btn';
   fit.dataset.turbineFit='1';
   fit.onclick=()=>{m.looseFit=!m.looseFit;if(save)save();host._refresh();};
   host.append(fit,' ',text);
   host._refresh=()=>{fit.textContent=m.looseFit?'宽松配合':'紧密配合';text.textContent=powerText(m);};
  } else {
   host.append(text);
   host._refresh=()=>{text.textContent=powerText(m);};
  }
  host._refresh();
 }
 function powerText(m) {
  const s=I.state(m);
  return '输出 '+(m.enabled===false?0:s.power||0).toLocaleString()+' EU/t';
 }
 RESOURCE_UI.registerPanel('xl_turbine_fit',(host,m,S,save)=>rate(host,m,save,true));
 RESOURCE_UI.registerPanel('industrial_generation_rate',(host,m,S,save)=>rate(host,m,save,false));
 function flowPanel(host,m,getFluid) {
  const text = document.createElement('span');
  host.append(text);
  host._refresh=()=>{
   const flow = m.enabled!==false&&['RUNNING','BOILING'].includes(m.status?.code)?I.state(m).flow:0;
   text.textContent=flow?FLUID_PRESENTATION.name(getFluid(m))+' '+flow.toLocaleString()+' mB/t':'';
   text.hidden=!flow;
  };
  host._refresh();
 }
 RESOURCE_UI.registerPanel('extreme_heat_status',(host,m)=>flowPanel(host,m,v=>I.state(v).steamFluid));
 RESOURCE_UI.registerPanel('geothermal_status',(host,m)=>flowPanel(host,m,v=>native.pumpModes[v.processingMode||0].output));

 const icons=GD.faceIcons, grid=GD.gridFaceIcons, working=GD.workingFaces||(GD.workingFaces={});
 const shells=GD.nativeBlockFaces||(GD.nativeBlockFaces={});
 function icon(k,name,active) {
  const path='modicons/luv-generation/'+name;
  icons[k]=grid[k]=path+'.png';
  if (active) working[k]={idle:path+'.png',active:path+'-active.png'};
  else shells[k]=path+'.png';
 }
 [[31073,'xl-gas'],[32001,'chemical'],[32017,'exchanger'],[12729,'pump'],[32016,'critical']].forEach(
  ([meta,name])=>icon(K(meta),name,true));
 [[K(30010),'rotor'],[shaft,'shaft'],[gasShell,'gas-shell'],[scShell,'critical-shell'],[pressure,'pressure-wall'],
  [cylinder,'cylinder'],[frame,'tungsten-frame'],[casing(2,14),'titanium-pipe'],[casing(4,13),'intake'],
  [glass,'borosilicate'],[casing(2,15),'tungstensteel-pipe'],[casing(2,4),'titanium-gearbox']].forEach(([k,name])=>icon(k,name,false));
 DEFS.rebuild();
})();
