/* Format transformations run once; restoring runtime links runs on every load. */
(function(root){
 'use strict';
 var modules=new Map();
 function register(id,options){
  if(!id||modules.has(id)||!options||!Array.isArray(options.steps))throw Error('Invalid save format owner: '+id);
  modules.set(id,options);
 }
 function versions(S){
  if(S.saveFormats==null)S.saveFormats={};
  if(typeof S.saveFormats!=='object'||Array.isArray(S.saveFormats))throw Error('存档模块版本格式无效');
  return S.saveFormats;
 }
 function migrate(S,metadata){
  var current=versions(S);
  Object.keys(current).forEach(function(id){if(!modules.has(id))throw Error('未知存档模块：'+id);});
  modules.forEach(function(module,id){
   var version=current[id]==null?0:current[id];
   if(!Number.isSafeInteger(version)||version<0||version>module.steps.length)throw Error('存档模块版本不受支持：'+id);
   while(version<module.steps.length){module.steps[version](S,metadata||{});current=versions(S);current[id]=++version;}
  });
 }
 function restore(S){modules.forEach(function(module){if(module.restore)module.restore(S);});}
 function validate(S){modules.forEach(function(module){if(module.validate)module.validate(S);});}
 root.SAVE_MIGRATIONS={register:register,migrate:migrate,restore:restore,validate:validate,versions:function(){return Object.fromEntries(Array.from(modules,function(entry){return[entry[0],entry[1].steps.length];}));}};
 STATE_SCHEMA.register('save-formats',['saveFormats']);
})(typeof window!=='undefined'?window:globalThis);
