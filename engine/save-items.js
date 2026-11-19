/* Unknown physical item IDs are discarded; known items keep their owner and slot. */
(function(root){
 'use strict';
 function prune(S){
  var removed=0;
  function visit(value,field){
   if(!value||typeof value!=='object')return value;
   if(value.k&&typeof value.n==='number'&&!CONTENT.item(value.k)||value.kind==='item'&&typeof value.key==='string'&&typeof value.amount==='number'&&!CONTENT.item(value.key)){removed++;return null;}
   // Recipe snapshots and patterns describe work, not owned physical stacks.
   if(['recipe','pattern','aePattern'].includes(field))return value;
   if(Array.isArray(value)){for(var i=0;i<value.length;i++)value[i]=visit(value[i],'');return value;}
   Object.keys(value).forEach(function(k){var v=value[k];if(k==='covers'&&v&&typeof v==='object'){
    Object.keys(v).forEach(function(side){var c=v[side];if(c&&c.k&&!CONTENT.item(c.k)){if(Array.isArray(v))v[side]=null;else delete v[side];removed++;}else visit(c,'');});
   }else value[k]=visit(v,k);});return value;
  }
  visit(S,'');
  if(S.tools)Object.keys(S.tools).forEach(function(k){if(!S.tools[k])delete S.tools[k];});
  if(S.itemCursor&&!S.itemCursor.stack)S.itemCursor=null;
  if(S.droppedItems&&Array.isArray(S.droppedItems.items))S.droppedItems.items=S.droppedItems.items.filter(function(p){return p&&p.stack;});
  if(S.fx){
   (S.fx.machines||[]).forEach(function(m){if(!m||!m.structure)return;var body=m.structure;['fixedParts','installedParts','recoveryItems'].forEach(function(k){if(Array.isArray(body[k]))body[k]=body[k].filter(Boolean);});if(Array.isArray(body.ports))body.ports=body.ports.filter(function(p){return p&&CONTENT.item(p.k)&&MULTIBLOCKS.spec(p.k);});});
   S.fx.machines=(S.fx.machines||[]).filter(function(m){if(m&&CONTENT.item(m.k))return true;removed++;return false;});
   (S.fx.blueprints||[S.fx]).forEach(function(b){['item','fluid','wire','eioItem','eioFluid'].forEach(function(kind){Object.keys(b[kind]||{}).forEach(function(cell){var p=b[kind][cell],key=p&&(p.pipeKey||p.k);if(key&&!CONTENT.item(key)){delete b[kind][cell];removed++;}});});});
  }
  return removed;
 }
 root.SAVE_ITEMS={prune:prune,migrate:function(S){CONTENT.normalizeState(S,{preserveSlots:true});return prune(S);}};
})(typeof window!=='undefined'?window:globalThis);
