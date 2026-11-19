/* The neutron source and the recipe processor share the machine's measured beam energy. */
(function(root){
 'use strict';
 var P=INDUSTRIAL_PROCESSING,B=MULTIBLOCK_CATALOG,MB=MULTIBLOCKS;
 var eVPerMeV=1000000,maxTarget=1200,defaultTarget=220,decay=72000,loweringRate=10000000,eVPerEU=10;
 var mevFormat=new Intl.NumberFormat('en-US',{maximumFractionDigits:3});
 var casing=P.block(4,1),processor='GoodGenerator:impreciseUnitCasing@0',steelFrame='gregtech:gt.blockframes@305',speedPipe='GoodGenerator:speedingPipe@0';
 for(var tier=1;tier<=8;tier++){
  var voltage=DEFS.voltOf(tier);
  MB.registerPort(B.key(32003+tier),{type:'neutronAccelerator',powerInput:true,tier:tier,voltage:voltage,amperage:1,energyCapacity:voltage*64});
 }
 MB.registerPort(B.key(32012),{type:'neutronSensor',uiHtml:sensorControls,configure:configureSensor});
 var p=P.install({
  id:'neutronactivator',meta:32013,map:'gg.recipe.neutron_activator',
  pattern:['sssss','sgggs','sgpgs','sgpgs','sgpgs','sgggs','ssCss'],
  materials:[[casing,31],[processor,18],[steelFrame,16],[speedPipe,4],['bartworks:BW_GlasBlocks@0',32]],
  art:{p:speedPipe},defaultPorts:[71,81,51,61,32012],minCasing:7,portTiles:['s'],
  portHint:'用 GT 线缆给中子加速器供电，在中子传感器里设置目标动能。',
  definition:{energyCapacity:0,startEnergy:0,noOverclock:true,inputIsolationFixed:false,runSwitch:true,compactMultiblock:true,uiPanels:['neutron_beam']},
  allowed:function(m,f,s){return !s.steamComponent&&['itemIn','itemOut','fluidIn','fluidOut','neutronSensor','neutronAccelerator'].includes(s.type);},
  limits:function(m,ports){return ports.filter(function(h){return MB.spec(h.k).type==='neutronSensor';}).length<=1;},
  portRequirements:{neutronAccelerator:1,neutronSensor:{min:1,max:1},fluidIn:1,fluidOut:1}
 });
 function beam(m){return m.neutronBeam||0;}
 function validTarget(value){return Number.isInteger(value)&&value>=0&&value<=maxTarget;}
 function target(m){return validTarget(m.neutronTarget)?m.neutronTarget:defaultTarget;}
 function energyRange(r){
  var range=r.extra&&r.extra.metadata&&r.extra.metadata.nke_range;
  return range?{min:range%10000,max:Math.floor(range/10000)}:null;
 }
 function charge(m,value,goal){
  for(var hatch of MB.ports(m)){
   if(!hatch.eu)continue;
   var spec=MB.spec(hatch.k);
   if(spec.type!=='neutronAccelerator')continue;
   var amount=Math.min(spec.voltage,hatch.eu,Math.ceil((goal-value)/eVPerEU));
   hatch.eu-=amount;
   value+=amount*eVPerEU;
   if(value>=goal)return goal;
  }
  return value;
 }
 p.passiveTick=function(m,context){
  var value=beam(m),goal=target(m)*eVPerMeV;
  var active=MB.live(m)&&m.structure.formed&&MACHINE_CONTROL.allowed(m,DEFS.of(m.k));
  var decayTick=context.tick%20===0;
  var next=value;
  if(active&&value>goal)next=Math.max(goal,value-loweringRate);
  else{
   if(active&&value<goal)next=charge(m,value,goal);
   if(next===value&&decayTick&&value>0)next=Math.max(0,value-decay);
  }
  // The existing periodic save and telemetry also cover passive state changes.
  if(next!==value)m.neutronBeam=next;
 };
 function rangeText(range){return range.min+'–'+range.max+' MeV';}
 if(root.JEI)JEI.registerParameter(function(r,add){
  if(r.map!==p.catalog.map)return;
  var range=energyRange(r);
  if(range)add('中子动能',rangeText(range));
 });
 p.checkRecipe=function(m,r,job){
  var range=energyRange(r);
  if(!range)return null;
  var goal=target(m),measured=beam(m);
  var text='';
  if(!job&&(goal<range.min||goal>range.max))text='请将目标动能设为 '+rangeText(range);
  else if(measured<range.min*eVPerMeV||measured>range.max*eVPerMeV)text='等待中子动能达到 '+rangeText(range);
  return text?Object.assign(P.error('NEUTRON_BEAM',text),{neutronRange:range}):null;
 };
 function sensorControls(m,hatch){
  return '<label class="mb-neutron-target">目标动能 <input type="number" required min="0" max="'+maxTarget+'" step="1" data-mb-setting="neutronTarget" data-mb-setting-port="'+hatch.uid+'" value="'+target(m)+'"> MeV</label>';
 }
 function configureSensor(hatch,field,value,m){
  if(field!=='neutronTarget'||!validTarget(value))return P.error('VALUE','请输入 0–'+maxTarget+' MeV 内的整数');
  m.neutronTarget=value;
  return {ok:true};
 }
 RESOURCE_UI.registerPanel('neutron_beam',function(host,m){
  host.innerHTML='<div class="neutron-summary"><span>当前动能 <b data-neutron-beam></b></span><span>目标 <b data-neutron-goal></b></span><span hidden>配方要求 <b data-neutron-range></b></span></div>';
  var live=host.querySelector('[data-neutron-beam]'),goal=host.querySelector('[data-neutron-goal]'),recipe=host.querySelector('[data-neutron-range]');
  function show(node,value){if(node.textContent!==value)node.textContent=value;}
  host._refresh=function(){
   var range=m.job?energyRange(m.job.recipe):m.status&&m.status.neutronRange;
   show(live,mevFormat.format(beam(m)/eVPerMeV)+' MeV');
   show(goal,mevFormat.format(target(m))+' MeV');
   recipe.parentElement.hidden=!range;
   if(range)show(recipe,rangeText(range));
  };
  host._refresh();
 });
 DEFS.rebuild();
})(typeof window!=='undefined'?window:globalThis);
