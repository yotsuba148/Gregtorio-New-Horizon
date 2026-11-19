(function(root){
 'use strict';
 var states={mining:['采矿','run','pick'],
  disconnected:['未连接','idle','plug'],networkConflict:['网络冲突','bad','warning'],off:['关机','idle','power'],empty:['空置','idle','empty'],waiting:['等待','ready','hourglass'],running:['运行','run','play'],power:['断电','bad','plug'],steam:['缺蒸汽','bad','steam'],blocked:['堵塞','full','blocked'],voltage:['欠压','bad','voltage'],temperature:['欠温','bad','temperature'],cleanroom:['不洁净','bad','filter'],structure:['结构不完整','bad','structure'],
  culture:['缺菌种','bad','leaf'],radiation:['辐射不符','bad','warning'],catalyst:['缺催化剂','bad','fuel'],capability:['部件不符','bad','structure'],fuel:['缺燃料','ready','fuel'],water:['缺水','bad','water'],heating:['升温','run','temperature'],boiling:['产汽','run','steam'],generating:['发电','run','bolt'],generationReady:['待发电','ready','hourglass'],energyFull:['储能满','full','battery'],storageEmpty:['空罐','idle','tank'],storing:['储液','idle','tank'],storageFull:['储罐满','full','tank'],stored:['储物','idle','empty'],cleaning:['净化','run','filter'],clean:['洁净','run','check'],cooling:['冷却','ready','temperature'],repair:['待检修','bad','wrench'],warming:['预热','run','temperature'],collecting:['集水','run','water'],producingWater:['供水','run','water'],pumping:['抽取','run','water'],depleted:['抽干','idle','tank'],source:['待选地点','ready','target'],miningPipe:['缺采矿管','ready','structure'],setup:['待配置','ready','wrench'],mana:['产魔','run','spark'],relay:['传魔','run','spark'],binding:['待绑定','ready','target'],environment:['待时机','ready','hourglass'],wilted:['枯萎','idle','leaf'],resource:['缺资源','ready','spark'],resourceFull:['储量满','full','tank'],reagent:['缺肥料','ready','leaf'],dissolving:['分解','run','spark'],loading:['加注','run','water'],toolRepair:['修理','ready','wrench'],overvoltage:['过压','bad','voltage'],error:['异常','bad','warning']
 };
 var paths={
  power:'M12 3v9M6.3 5.8a8 8 0 1 0 11.4 0',empty:'M3 8h18v13H3ZM3 8l5-5h8l5 5M8 3v5m8-5v5M8 14h8',hourglass:'M6 3h12M6 21h12M7 3v4l10 10v4M17 3v4L7 17v4',play:'m8 4 12 8-12 8Z',plug:'M8 3v4m8-4v4M6 7h12v4a6 6 0 0 1-6 6m0 0v4M3 21 21 3',steam:'M5 20h14M6 16c-5-5 5-5 0-10m6 10c-5-5 5-5 0-12m6 12c-5-5 5-5 0-10',blocked:'M3 12h12m-5-5 5 5-5 5M19 4v16',voltage:'m10 2-6 11h6l-2 9 8-12h-6l2-8M19 14v7m-3-3 3 3 3-3',temperature:'M7 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0m3-7v11m7-13h4m-4 5h3',filter:'M3 4h18l-7 8v8l-4-2v-6ZM4 15h1m13 0h1M5 20h1',structure:'M3 9V3h6m6 0h6v6m0 6v6h-6m-6 0H3v-6m5-7h8v8H8Z',fuel:'M12 2c1 5-6 7-6 13a6 6 0 0 0 12 0c0-4-2-6-3-8 0 4-3 4-3 0',water:'M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13ZM8 15c0 2 1 3 3 3',bolt:'m14 2-9 12h7l-2 8 9-12h-7Z',battery:'M3 6h16v12H3Zm16 4h2v4h-2M7 10v4m4-4v4m4-4v4',tank:'M4 5c0-4 16-4 16 0v14c0 4-16 4-16 0Zm0 0c0 4 16 4 16 0M4 15c0 4 16 4 16 0',check:'m4 12 5 5L20 5',wrench:'M14 3a6 6 0 0 0-7 7L2 19l3 3 9-9a6 6 0 0 0 7-7l-4 4-3-3Z',target:'M12 2v4m0 12v4M2 12h4m12 0h4M5 12a7 7 0 1 0 14 0 7 7 0 0 0-14 0Zm5 0h4',spark:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z',leaf:'M20 3C8 2 2 7 5 15s16 4 15-12ZM4 21 17 7',warning:'m12 3 10 18H2Zm0 6v5m0 3v1'
 };
 var codes={STARTUP_POWER:'waiting',ME_DISCONNECTED:'disconnected',ME_CONTROLLER_CONFLICT:'networkConflict',CULTURE:'culture',RADIATION:'radiation',CATALYST:'catalyst',CAPABILITY:'capability',NEUTRON_BEAM:'waiting',NO_WATER:'water',DISABLED:'off',RUNNING:'running',GENERATING:'generating',BOILING:'boiling',HEATING:'heating',WARMING:'warming',CLEANING:'cleaning',ENERGY:'power',STEAM:'steam',ITEM_OUTPUT:'blocked',FLUID_OUTPUT:'blocked',EMPTY_OUTPUT:'blocked',COMPLETED_OUTPUT_BLOCKED:'blocked',AMPERAGE:'power',VOLTAGE:'voltage',OVERVOLTAGE:'overvoltage',HEAT:'temperature',CRUCIBLE_HEAT:'temperature',CLEANROOM:'cleanroom',STRUCTURE:'structure',FUEL:'fuel',ENERGY_FULL:'energyFull',NO_WATER_HOT:'water',THERMAL_SHOCK:'repair',COLLECTING_WATER:'collecting',PRODUCING_WATER:'producingWater',PUMPING:'pumping',PUMPED:'pumping',DEPLETED:'depleted',SOURCE:'source',MINING_PIPE:'miningPipe',SITE_SETUP:'setup',INSTALL_IN_SMELTERY:'setup',GENERATING_MANA:'mana',RESOURCE_LINK:'binding',ENVIRONMENT:'environment',WILTED:'wilted',RESOURCE:'resource',RESOURCE_FULL:'resourceFull',REAGENT:'reagent',DISSOLVING:'dissolving',ROCKET_FUEL_LOADING:'loading',TOOL_REPAIR:'toolRepair',UNKNOWN_MACHINE:'error',UNSUPPORTED_BEHAVIOR:'error'};
 function make(id,m,detail){var row=states[id]||states.waiting;return{key:id,label:row[0],tone:row[1],glyph:row[2],detail:detail||(m.status&&m.status.text)||row[0]};}
 function read(m){
  var d=root.STRUCTURES?STRUCTURES.instance(m):DEFS.of(m.k),s=m.status||{},code=s.code;
  if(!d)return make('error',m,'缺少设备定义');
  if(MACHINE_CONTROL.controlled(d)){
   if(m.workStopped&&m.workStopReason&&codes[m.workStopReason.code])return make(codes[m.workStopReason.code],m,m.workStopReason.text);
   if(m.workStopped||!MACHINE_CONTROL.allowed(m,d)&&!m.job)return make('off',m,'玩家已关闭机器');
  }else if(code==='DISABLED')code=null;
  if(d.requiresStructure&&!(m.structure&&m.structure.formed))return make('structure',m,m.structure?.errors?.[0]||'结构未完成');
  var modeFailure=!m.job&&root.MACHINE_MODES&&MACHINE_MODES.ready(m);
  if(modeFailure)return make('setup',m,modeFailure.text);
  var hook=root.ENGINE&&ENGINE.behaviors?ENGINE.behaviors[d.behavior]:null;if(hook&&hook.status){var custom=hook.status(m,d,make,codes);if(custom)return custom;}
    if(d.storage)return make('stored',m,(m.ins||[]).filter(Boolean).length+' / '+d.slots.in+' 格');
  var batch=!!(hook&&hook.waitsForInput),hasInput=(m.ins||[]).some(function(p){return p&&(p.n==null||p.n>0);})||(m.tanksIn||[]).some(function(t){return t&&t.mb>0;});
  if(batch&&!m.job&&!hasInput)return make('empty',m,'没有投入原料');
  if(code==='RESOURCE_LINK'&&Object.values(m.resourceLinks||{}).some(Boolean))return make('relay',m);
  if(codes[code])return make(codes[code],m);
  if(m.job)return make('running',m);
  if(batch)return make(hasInput?'waiting':'empty',m);
  return make('waiting',m);
 }
 function icon(state,size){return '<svg viewBox="0 0 24 24" width="'+(size||24)+'" height="'+(size||24)+'" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(paths[state.glyph]||paths.warning)+'"/></svg>';}
 function html(state){return icon(state,24)+'<span>'+state.label+'</span>';}
 root.MACHINE_STATUS={read:read,icon:icon,html:html,states:states};
})(typeof window!=='undefined'?window:globalThis);
