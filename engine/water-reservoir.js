/* 蓄水库：单方块，每秒产 1 桶水，四面都能输出；自带自动输出开关。 */
(function(root){
 'use strict';
 var C=CONTENT, TX=GTTransactions;
 var CAPACITY=1000, PER_SECOND=1000;
 var def={
  key:'EnderIO:blockReservoir@0', cat:'enderio_reservoir', cn:'蓄水库', entityName:'蓄水库',
  behavior:'enderio_reservoir', recipeMap:'none:enderio_reservoir',
  tag:'供水', tier:0, volt:0, energyCapacity:0, startEnergy:0, amperage:0,
  noOverclock:true, controlCircuit:false, noItemPort:true, pipeOnly:true,
  slots:{in:0,out:0,fluid:CAPACITY},
  fluidInputTanks:[], fluidOutputTanks:[CAPACITY],
  autoItems:false, autoFluids:true, defaultAutoFluids:true, autoFluidPeriodTicks:5,
  supportsCovers:true, windowWidth:330
 };
 GD.extraMachineDefinitions.push(def);
 GD.machines.cats.push({id:def.cat,cn:def.cn,slots:def.slots,tiers:[{t:0,k:def.key,name:def.cn,tag:def.tag}]});
 DEFS.rebuild();

 function tank(m){
  if(!Array.isArray(m.tanksOut))m.tanksOut=[];
  var t=m.tanksOut[0];
  if(t&&t.f!=='water')return null;
  if(!t)t=m.tanksOut[0]={f:'water',mb:0};
  return t;
 }
 function tick(m,ctx){
  var t=tank(m);
  if(!t){m.status={code:'FLUID_OUTPUT',text:'输出罐里是别的流体'};return false;}
  var period=root.GAME_TIME?GAME_TIME.ticks(ctx.state,20):20;
  m.reservoirClock=(m.reservoirClock||0)+1;
  var made=0;
  if(m.reservoirClock>=period){
   m.reservoirClock=0;
   made=Math.max(0,Math.min(PER_SECOND,CAPACITY-t.mb));
   t.mb+=made;
   m.waterProduced=(m.waterProduced||0)+made;
  }
  m.status={code:'PRODUCING_WATER',text:'每秒 '+PER_SECOND+' mB，存量 '+Math.floor(t.mb)+' / '+CAPACITY};
  return true;
 }
 ENGINE.registerBehavior('enderio_reservoir',{
  noItemPort:true,
  ensure:function(m){m.autoItems=false;if(m.autoFluids==null)m.autoFluids=true;},
  tick:tick,
  acceptsItem:function(){return false;},
  acceptsFluid:function(){return false;}
 });
 if(root.RESOURCE_UI&&RESOURCE_UI.registerPanel){
  RESOURCE_UI.registerPanel('enderio_reservoir',function(host,m){
   var p=document.createElement('p');host.appendChild(p);
   host._refresh=function(){
    var t=(m.tanksOut||[])[0];
    p.textContent='不需要燃料或原料；每秒产 '+PER_SECOND+' mB 水，罐容 '+CAPACITY+' mB，当前 '+Math.floor(t?t.mb:0)+' mB。四面都能接管，自动输出在下方开关。';
   };
   host._refresh();
  });
 }
 root.ENDERIO_RESERVOIR={key:def.key,capacity:CAPACITY,perSecond:PER_SECOND};
})(typeof window!=='undefined'?window:globalThis);
