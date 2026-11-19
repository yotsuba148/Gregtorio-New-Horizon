(function(root){
 'use strict';
 function controlled(d){return !!(d&&d.multiblock&&d.runSwitch!==false);}
 function allowed(m,d){return !controlled(d)||(typeof m.workAllowed==='boolean'?m.workAllowed:m.enabled!==false&&!m.stopAfterBatch);}
 function ensure(m,d){
  if(!controlled(d))return;
  if(typeof m.workAllowed!=='boolean'){
   m.workAllowed=m.enabled!==false&&!m.stopAfterBatch;
   m.workStopped=m.enabled===false&&!!m.job;
  }
  if(typeof m.workStopped!=='boolean')m.workStopped=false;
 }
 function set(m,on){
  var d=root.DEFS.of(m.k);if(!controlled(d))return{ok:false,code:'NO_RUN_SWITCH'};
  if(typeof on!=='boolean')return{ok:false,code:'VALUE'};
  ensure(m,d);m.workAllowed=on;return{ok:true,allowed:on};
 }
 function stop(m,reason){
  m.workAllowed=false;m.workStopped=true;m.enabled=false;
  m.status=Object.assign({},reason,{text:(reason.text||'机器无法继续工作').replace(/已暂停|燃烧暂停/g,'已停机').replace('补水后继续','补水后手动开机')});
  m.workStopReason=Object.assign({},m.status);
 }
 function before(m,d){
  if(!controlled(d)){m.enabled=true;return true;}
  ensure(m,d);
  if(m.workAllowed&&m.workStopped){m.workStopped=false;delete m.workStopReason;if(m.job)m.status={code:'RUNNING',text:'加工中'};}
  m.enabled=!m.workStopped&&(m.workAllowed||!!m.job);
  if(!m.enabled){if(m.workStopReason)m.status=m.workStopReason;else if(!m.status||m.status.code!=='DISABLED')m.status={code:'DISABLED',text:'已关机'};return false;}
  if(m.job&&d.requiresStructure&&!(m.structure&&m.structure.formed)){stop(m,{code:'STRUCTURE',text:'结构不完整，已停机'});return false;}
  return true;
 }
 var interruptions=new Set(['FUEL','CULTURE','RADIATION','CATALYST','CAPABILITY','ENERGY','STEAM','STRUCTURE','HEAT','VOLTAGE','OVERVOLTAGE','CLEANROOM','GRAVITY','COMPRESSION','ATTACHMENT','RESOURCE','ITEM_OUTPUT','FLUID_OUTPUT','EMPTY_OUTPUT','COMPLETED_OUTPUT_BLOCKED','COMPLETED_RESOURCE_BLOCKED','NO_WATER_HOT','THERMAL_SHOCK','UNKNOWN_MACHINE','UNSUPPORTED_BEHAVIOR']);
 function after(m,d){
  if(!controlled(d))return false;
  var runningContinuously=!!(root.ENGINE&&ENGINE.behaviors&&ENGINE.behaviors[d.behavior]&&ENGINE.behaviors[d.behavior].runsContinuously);
  if((m.job||runningContinuously)&&m.status&&interruptions.has(m.status.code)){stop(m,m.status);return true;}
  if(!m.job&&!m.workAllowed){m.enabled=false;if(!m.workStopReason)m.status={code:'DISABLED',text:'已关机'};return true;}
  return false;
 }
 root.MACHINE_CONTROL={stop:stop,controlled:controlled,allowed:allowed,ensure:ensure,set:set,before:before,after:after};
})(typeof window!=='undefined'?window:globalThis);
