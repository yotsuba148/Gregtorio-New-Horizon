/* Player inventory and page fields own their legacy representations. */
(function(root){
 'use strict';
 var zoomPolicy=Object.freeze({min:70,max:250,default:100});
 function migrate(S,metadata){
  if(!Array.isArray((metadata||S).actionQueue))S.actionQueue=S.act?[S.act]:[];
  if(Array.isArray(S.tools)){
   var tools={};S.tools.forEach(function(t){if(!t||!CONTENT.item(t.k))return;PLAYER_TOOLS.normalize(t);var id=CRAFT_TOOLS.type(t.k);if(!id||tools[id])throw Error('工具墙缺少唯一的工具位置');tools[id]=t;});S.tools=tools;
  }
  S.history=(S.history||[]).map(function(v){return typeof v==='string'?v:v&&v.k;}).filter(Boolean);
  S.qever=S.qever||{};Object.keys(S.quests||{}).forEach(function(id){S.qever[id]=1;});
  var old=S.chest;delete S.chest;
  if(old){
   S.chests=S.chests||[];var box=null;
   Object.keys(old).forEach(function(k){if(!CONTENT.item(k))return;var left=old[k];if(!Number.isSafeInteger(left)||left<0)throw Error('旧箱子物品数量无效');while(left){if(!box||box.slots.length>=27){box={name:'箱子'+(S.chests.length+1),slots:[]};S.chests.push(box);}var n=Math.min(left,CONTENT.maxStack(k));box.slots.push({k:k,n:n});left-=n;}});
  }
 }
 function restore(S){
  if(!Array.isArray(S.inv))throw Error('存档缺少物品栏');while(S.inv.length<46)S.inv.push(null);
  if(!S.tools)S.tools={};Object.values(S.tools).forEach(PLAYER_TOOLS.normalize);
  S.inv.forEach(function(t){if(t&&CRAFT_TOOLS.type(t.k))PLAYER_TOOLS.normalize(t);});
  if(!Array.isArray(S.chests))S.chests=[];
  S.chests.forEach(function(c){if(!Array.isArray(c.slots))throw Error('箱子槽位格式无效');while(c.slots.length<27)c.slots.push(null);if(!c.name)c.name='箱子';c.slots.forEach(function(t){if(t&&CRAFT_TOOLS.type(t.k))PLAYER_TOOLS.normalize(t);});});
  if(!S.chests.length)S.chests.push({name:'箱子1',slots:Array(27).fill(null)});
  S.msgs=Array.isArray(S.msgs)?S.msgs.filter(function(m){return m&&typeof m.s==='string'&&typeof m.k==='string'&&Number.isFinite(m.t)&&m.t>=0;}):[];
  S.msgNew=Number.isSafeInteger(S.msgNew)&&S.msgNew>=0?Math.min(S.msgNew,S.msgs.length):0;
  S.furs=Array.isArray(S.furs)?S.furs:[];
  S.furs.forEach(function(f){f.hop=!!f.hop;FURNACES.ensure(f);});
  S.bench=S.bench|0;S.ui=S.ui||{};if(S.ui.pg==null)S.ui.pg=0;
  if(!(S.zoom>=zoomPolicy.min&&S.zoom<=zoomPolicy.max))S.zoom=zoomPolicy.default;
  var e=S.env||{};S.env={rate:1,elapsed:Number(e.elapsed)>0?Number(e.elapsed):0,weather:['clear','rain','thunder','snow'].includes(e.weather)?e.weather:'clear',remaining:Number(e.remaining)>0?Number(e.remaining):60};
  var f=S.qfold||{};S.qfold={closed:!!f.closed,open:f.open===null||typeof f.open==='string'?f.open:undefined};
  DROPPED_ITEMS.normalize(S);MANUAL_WORKBENCH.ensure(S);ITEM_CURSOR.normalize(S);TRASH.normalize(S);
 }
 root.PAGE_SAVE={zoomPolicy:zoomPolicy,migrate:migrate,restore:restore};
})(typeof window!=='undefined'?window:globalThis);
