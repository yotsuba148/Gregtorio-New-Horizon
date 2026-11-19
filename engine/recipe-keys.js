(function(root){
 'use strict';
 var state,point=null,installed=false;
 function target(node,S){
  if(!node||!node.closest||node.closest('[hidden]'))return null;
  var slot=root.ITEM_DRAG&&node.closest(ITEM_DRAG.selector),ref=slot&&ITEM_DRAG.ref(slot),endpoint=ref&&ITEM_TRANSFER.endpoint(S,ref),stack=endpoint&&endpoint.get&&endpoint.get();
  if(stack)return stack.k?{key:stack.k,target:'item'}:stack.f?{key:stack.f,target:'fluid'}:null;
  var item=node.closest('[data-jei-key],[data-lookup-key],[data-lookup-fluid],[data-quest-item],[data-go]');
  if(!item&&slot)item=slot.querySelector('[data-lookup-key],[data-lookup-fluid]');
  if(!item)return null;var d=item.dataset,key=d.jeiKey||d.lookupKey||d.lookupFluid||d.questItem||d.go,type=d.jeiTarget|| (d.lookupFluid?'fluid':'item');
  if(type==='item'&&!CONTENT.item(key)||type==='fluid'&&!Object.prototype.hasOwnProperty.call(GD.fluids,key))return null;
  return{key:key,target:type};
 }
 function init(getState){state=getState;if(installed)return;installed=true;
  document.addEventListener('pointermove',function(e){point={x:e.clientX,y:e.clientY};},{passive:true});
  window.addEventListener('blur',function(){point=null;});
  document.addEventListener('keydown',function(e){
   if(!point||e.defaultPrevented||e.repeat||e.isComposing||e.ctrlKey||e.altKey||e.metaKey||!['r','u'].includes(e.key.toLowerCase()))return;
   if(e.target&&e.target.closest&&e.target.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]'))return;
   var hit=target(document.elementFromPoint(point.x,point.y),state());if(!hit)return;
   e.preventDefault();e.stopPropagation();RECIPE_QUERY.open(hit.key,e.key.toLowerCase()==='u'?'uses':'recipes',{target:hit.target,source:'keyboard'});
  });
 }
 function stackOf(node,S){
  if(!node||!node.closest)return null;
  var slot=root.ITEM_DRAG&&node.closest(ITEM_DRAG.selector),ref=slot&&ITEM_DRAG.ref(slot),endpoint=ref&&ITEM_TRANSFER.endpoint(S,ref),stack=endpoint&&endpoint.get&&endpoint.get();
  return stack&&stack.k?stack:null;
 }
 root.RECIPE_KEYS={init:init,target:target,stackOf:stackOf};
})(typeof window!=='undefined'?window:globalThis);
