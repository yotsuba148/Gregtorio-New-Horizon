(function(root){
 'use strict';
 // This module plans copies and time. Storage adapters own input transactions;
 // the processor owns jobs, power payment, output and interruption handling.
 function capability(m,def){
  def=def||STRUCTURES.instance(m);
  if(!def||def.behavior!=='batch_processor'||!def.multiblock)return null;
  if(def.batchProcessing===false)return null;
  return def.batchProcessing||(GD.batchModes&&GD.batchModes.machines[m.k])||null;
 }
 function defaultEnabled(rule){return rule.defaultEnabled??!!GD.batchModes.defaultEnabled;}
 function enabled(m,def){var rule=capability(m,def);return !!rule&&!!(m.batchMode??defaultEnabled(rule));}
 function ensure(m,def){var rule=capability(m,def);if(rule&&m.batchMode==null)m.batchMode=defaultEnabled(rule);}
 function set(m,value){if(!capability(m))return false;m.batchMode=!!value;return true;}
 function duration(t,p,copies){
  // ParallelHelper stores this multiplier as a Java float before multiplying.
  var ratio=Math.fround(Math.fround(copies-p)/Math.fround(p));
  return Math.max(1,Math.trunc(t*Math.fround(1+ratio)));
 }
 function upper(t,p,size){return t<128?p+Math.floor(p*Math.min(128/t-1,size-1)):p;}
 function largest(low,high,probe,initial){
  var best=initial;
  while(low<high){var mid=Math.floor((low+high+1)/2),trial=probe(mid);if(trial.ok){low=mid;best=trial;}else high=mid-1;}
  return {copies:low,checked:best};
 }
 function expand(m,def,initial,probe){
  if(!enabled(m,def))return initial;
  var rule=capability(m,def),p=initial.parallel,t=initial.effective.durationTicks,size=rule.maxSize||128;
  if(t>=128)return initial;
  var limit=rule.strategy==='fractional_window'?(initial.parallelLimit||p)*size:upper(t,p,size);
  limit=Math.min(2147483646,limit);
  if(limit<=p)return initial;
  var found=largest(p,limit,probe,initial),copies=found.copies,result=found.checked,dt;
  if(rule.strategy==='fractional_window'){
   var before=initial.parallelLimit||p;
   if(copies<=before)return initial;
   var multiplier=Math.min(size/t,copies/before);
   copies=Math.trunc(multiplier*p);
   result=copies===found.copies?result:copies===p?initial:probe(copies);
   dt=Math.max(1,Math.trunc(t*multiplier));
  }else dt=duration(t,p,copies);
  if(copies===p&&dt===t)return initial;
  return Object.assign({},result,{recipeCopies:copies,effective:Object.assign({},initial.effective,{durationTicks:dt})});
 }
 root.BATCH_MODE={capability:capability,enabled:enabled,ensure:ensure,set:set,expand:expand,duration:duration,upper:upper};
})(typeof window!=='undefined'?window:globalThis);
