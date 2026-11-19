(function(root){
 'use strict';
 // Modes describe processing and hardware requirements. They never own items,
 // progress, ports, or a second copy of the structure.
 function current(m){var p=STRUCTURES.profile(m);return p&&p.modes&&p.modes[m.processingMode|0]||p&&p.modes&&p.modes[0]||null;}
 function definition(m,base){var mode=current(m);return mode?Object.assign({},base,mode.definition||{},mode.map?{recipeMap:mode.map}:{}):base;}
 function plan(m,base){var mode=current(m),structure=mode&&mode.structure;if(!structure||!structure.materials)return base;var parts=typeof structure.materials==='function'?structure.materials(m,base):structure.materials;return Object.assign({},base,{parts:STRUCTURE_CORE.counts(parts)});}
 function validate(m,ports,errors){var mode=current(m);if(!mode)return;var need=mode.structure||{};
  Object.keys(need.dimensions||{}).forEach(function(k){var n=MULTIBLOCKS.dimensionsOf(m)[k]||0,range=need.dimensions[k];if(n<range.min||range.max!=null&&n>range.max)errors.push((range.label||k)+'需要 '+range.min+(range.max!=null?'–'+range.max:'')+' 节');});
  if(need.ports)HATCH_RULES.check(ports,need.ports,errors);
 }
 function set(m,value){var p=STRUCTURES.profile(m);if(!p||!p.modes||!Number.isInteger(value)||!p.modes[value])return{ok:false,code:'PROFILE'};
  if(current(m)===p.modes[value])return{ok:true};
  if(m.job&&!p.modeDuringWork)return{ok:false,code:'RUNNING'};
  m.processingMode=value;MULTIBLOCKS.invalidate(m);MULTIBLOCKS.validate(m);return{ok:true};
 }
 function portIssue(m,spec){var mode=current(m);return mode&&mode.portIssue?mode.portIssue(spec):null;}
 function ready(m){var mode=current(m);if(!mode)return null;
  if(mode.processingDimensions)for(var key of Object.keys(mode.processingDimensions)){var rule=mode.processingDimensions[key],n=MULTIBLOCKS.dimensionsOf(m)[key];if(n<rule.min)return{ok:false,code:'LENGTH',text:mode.name+'模式至少需要 '+rule.min+' 节，当前 '+n+' 节',required:rule.min,available:n};}
  return mode.ready?mode.ready(m):null;
 }
 function check(m,recipe){var failure=ready(m);if(failure)return failure;var mode=current(m);if(!mode)return null;
  if(mode.recipeVoltageFactor!=null){var available=m.structure.voltage*mode.recipeVoltageFactor;if(recipe.eut>available)return{ok:false,code:'VOLTAGE',text:'当前模式的配方电压不足：最高 '+available+' EU/t',required:recipe.eut,available:available};}
  return null;
 }
 root.MACHINE_MODES={current:current,definition:definition,plan:plan,validate:validate,portIssue:portIssue,ready:ready,check:check,set:set};
})(typeof window!=='undefined'?window:globalThis);
