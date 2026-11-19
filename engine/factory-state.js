(function(root){
 'use strict';
 var prepared=new WeakMap();
 function chest(value){
  if(!value)return null;
  if(value.slots){while(value.slots.length<27)value.slots.push(null);return value;}
  throw Error('产线箱子槽位格式无效');
 }
 function prepare(S){
  WORLD_SIMULATION.prepare(S);
  if(!S.fx||typeof S.fx!=='object')S.fx={};
  var f=S.fx;
  if(!(f.w>0))f.w=128;if(!(f.h>0))f.h=128;
  if(!Array.isArray(f.machines))f.machines=[];
  if(!(f.uidSeq>=0))f.uidSeq=0;
  f.machines.forEach(function(m){
   if(!m||!m.k)return;
   if(!m.uid)m.uid='e'+(++f.uidSeq);
   f.uidSeq=Math.max(f.uidSeq,parseInt(String(m.uid).slice(1),10)||0);
   if(!m.b)m.b={};if(!m.ins)m.ins=[];if(!m.outs)m.outs=[];
   ENGINE.ensure(m);
  });
  ['item','fluid','wire','chest','belt'].forEach(function(kind){if(!f[kind]||typeof f[kind]!=='object')f[kind]={};});
  BLUEPRINTS.ensure(S);
  Object.keys(f.chest).forEach(function(cell){f.chest[cell]=chest(f.chest[cell]);});
  prepared.set(S,{repo:f,machines:f.machines,count:f.machines.length});return f;
 }
 function migrate(S){
  if(!S.fx)return;
  var f=S.fx;
  (f.machines||[]).forEach(function(m){
   if(m.x==null&&m.gx!=null)m.x=m.gx;if(m.y==null&&m.gy!=null)m.y=m.gy;
   if(!m.ins)m.ins=m.in?[m.in]:[];if(!m.outs)m.outs=m.out&&m.out.k?[m.out]:[];
   delete m.gx;delete m.gy;delete m.in;delete m.out;
  });
  BLUEPRINTS.views(BLUEPRINTS.ensure(S)).forEach(function(b){Object.keys(b.chest||{}).forEach(function(cell){
   var value=b.chest[cell];if(!value||value.slots)return;
   var next={slots:Array(27).fill(null)},left=value.k&&value.n>0?value.n:0;
   if(!Number.isSafeInteger(left))throw Error('旧产线箱子的物品数量无效');
   for(var i=0;i<27&&left>0;i++){var n=Math.min(left,CONTENT.maxStack(value.k));next.slots[i]={k:value.k,n:n};left-=n;}
   if(left)throw Error('旧产线箱子的物品超出槽位容量');b.chest[cell]=next;
  });});
 }
 function ensure(S){
  ENGINE.state=S;
  var prior=prepared.get(S),f=S.fx;
  return prior&&prior.repo===f&&prior.machines===f.machines&&prior.count===f.machines.length?f:prepare(S);
 }
 function chestSlots(S,cell,blueprintId){var f=ensure(S),board=blueprintId?f.blueprints.find(function(b){return b.id===blueprintId;}):f;if(!board||!board.chest[cell])return null;var value=chest(board.chest[cell]);board.chest[cell]=value;return value.slots;}
 root.FACTORY_STATE={ensure:ensure,migrate:migrate,prepare:prepare,chest:chest,chestSlots:chestSlots};
})(typeof window!=='undefined'?window:globalThis);
