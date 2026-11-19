/* Save data keys are pinned for this page lifetime, including unload handlers. */
(function(root){
 'use strict';
 var legacyKey='fangzhi-gtnh-v0',indexKey=legacyKey+'-slots',fresh={schema:10,newGame:true};
 function keyOf(id){return id==='original'?legacyKey:legacyKey+'-slot-'+id;}
 function nameOf(value){if(typeof value!=='string'||!value.trim()||value.trim().length>32)throw Error('存档名称需要 1～32 个字符');return value.trim();}
 function validate(index){
  if(!index||index.schema!==1||!Array.isArray(index.slots)||!index.slots.length)throw Error('存档列表格式无效，已保留原数据');
  var seen=new Set();index.slots.forEach(function(s){if(!s||!/^original$|^save-[a-z0-9-]+$/.test(s.id)||seen.has(s.id)||nameOf(s.name)!==s.name)throw Error('存档列表格式无效，已保留原数据');seen.add(s.id);});
  if(!seen.has('original')||!seen.has(index.active))throw Error('当前存档记录无效，已保留原数据');return index;
 }
 function isFresh(value){return !!value&&value.newGame===true&&Number.isInteger(value.schema)&&value.schema>=0&&value.schema<=fresh.schema&&Object.keys(value).length===2;}
 function validateData(raw){var data;try{data=JSON.parse(raw);}catch(_){throw Error('目标存档损坏，未切换');}if(!data||typeof data!=='object'||Array.isArray(data)||!isFresh(data)&&!Array.isArray(data.inv))throw Error('目标存档格式无效，未切换');return data;}
 function write(storage,key,raw){storage.setItem(key,raw);if(storage.getItem(key)!==raw)throw Error('存档写入未完成，请重试');}
 function open(storage,now,options){
  var raw=storage.getItem(indexKey),index=raw?validate(JSON.parse(raw)):{schema:1,active:'original',slots:[{id:'original',name:'存档 1',createdAt:now==null?Date.now():now}]};
  if(!raw)write(storage,indexKey,JSON.stringify(index));
  var id=index.active,key=keyOf(id),expectedRaw=storage.getItem(key),savedBody=null,writable=true,ready=Promise.resolve(true);
  if(root.navigator&&root.navigator.locks){
   writable=false;
   ready=new Promise(function(resolve,reject){root.navigator.locks.request('fangzhi-save:'+key,{ifAvailable:true},function(lock){
    if(!lock){resolve(false);return;}writable=true;resolve(true);return new Promise(function(){});
   }).catch(function(error){reject(error);});});
  }
  function readIndex(){var raw=storage.getItem(indexKey);if(!raw)throw Error('存档列表不存在，已停止写入');return validate(JSON.parse(raw));}
  function list(){return readIndex().slots.map(function(s){return Object.assign({},s,{current:s.id===id});});}
  function current(){var slot=list().find(function(s){return s.id===id;});if(!slot)throw Error('当前存档不存在，已停止写入');return slot;}
  function read(loading){current();var raw=storage.getItem(key);if(raw===null&&id!=='original')throw Error('当前存档数据缺失，已停止覆盖');if(loading){expectedRaw=raw;savedBody=null;}return raw;}
  function store(data,options){
   current();
   if(!writable)throw Error('此存档已在另一个页面打开');
   if(!data||!Array.isArray(data.inv))throw Error('存档数据无效，已停止写入');
   if(storage.getItem(key)!==expectedRaw)throw Error('此存档已在另一个页面更新，请刷新当前页面');
   var body=JSON.stringify(Object.assign({},data,{savedAt:undefined}));
   if(options&&options.skipUnchanged&&body===savedBody)return;
   var stamp=JSON.stringify(data.savedAt);
   var next=stamp===undefined?body:body.slice(0,-1)+',"savedAt":'+stamp+'}';
   write(storage,key,next);
   expectedRaw=next;savedBody=body;
  }
  function importSave(raw){
   var data;try{data=JSON.parse(raw);}catch(e){throw Error('文件不是有效的 JSON 存档');}
   if(!data||typeof data!=='object'||Array.isArray(data)||!Array.isArray(data.inv))throw Error('请选择游戏导出的 JSON 存档');
   var schema=data.schema==null?0:data.schema;
   if(!Number.isInteger(schema)||schema<0)throw Error('存档版本格式无效');
   if(schema>fresh.schema)throw Error('这个存档需要更新版本的游戏');
   if(data.fx!=null&&(typeof data.fx!=='object'||Array.isArray(data.fx)||data.fx.machines!=null&&!Array.isArray(data.fx.machines)))throw Error('产线存档格式无效');
   if(options&&options.validate)options.validate(data);
   return addSlot(data,function(index){var name='导入存档',n=1;while(index.slots.some(function(slot){return slot.name===name;}))name='导入存档 '+(++n);return name;},null,true);
  }
  function rename(value){var name=nameOf(value),index=readIndex(),slot=index.slots.find(function(s){return s.id===id;});if(!slot)throw Error('当前存档不存在');slot.name=name;write(storage,indexKey,JSON.stringify(index));return name;}
  function addSlot(data,nameFor,now,activateNew){
   var expectedIndex=storage.getItem(indexKey);if(!expectedIndex)throw Error('存档列表不存在');
   var index=validate(JSON.parse(expectedIndex)),name=nameFor(index),nextId,nextKey;
   do{nextId='save-'+(root.crypto&&root.crypto.randomUUID?root.crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));nextKey=keyOf(nextId);}while(storage.getItem(nextKey)!==null||index.slots.some(function(slot){return slot.id===nextId;}));
   var slot={id:nextId,name:name,createdAt:now==null?Date.now():now};index.slots.push(slot);if(activateNew)index.active=nextId;
   try{
    write(storage,nextKey,JSON.stringify(data));
    if(storage.getItem(indexKey)!==expectedIndex)throw Error('存档列表已更新，请重试');
    write(storage,indexKey,JSON.stringify(index));
   }catch(e){if(!readIndex().slots.some(function(slot){return slot.id===nextId;}))storage.removeItem(nextKey);throw e;}
   return slot;
  }
  function create(value,now){
   var requested=value==null?'':nameOf(value);
   return addSlot(fresh,function(index){var name=requested,n=1;if(!name){do{name='存档 '+(++n);}while(index.slots.some(function(slot){return slot.name===name;}));}return name;},now,false);
  }
  function activate(nextId){
   var index=readIndex(),slot=index.slots.find(function(s){return s.id===nextId;});if(!slot)throw Error('目标存档不存在，未切换');var raw=storage.getItem(keyOf(nextId));if(raw===null)throw Error('目标存档数据缺失，未切换');var data=validateData(raw);if(!isFresh(data)&&options&&options.validate)options.validate(data);index.active=nextId;write(storage,indexKey,JSON.stringify(index));return slot;
  }
  return{id:id,key:key,ready:ready,list:list,current:current,read:read,write:store,importSave:importSave,canWrite:function(){return writable;},rename:rename,create:create,activate:activate};
 }
 var api={open:open,isFresh:isFresh,legacyKey:legacyKey,indexKey:indexKey,keyOf:keyOf};root.SAVE_SLOTS=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
