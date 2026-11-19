(function(root){
 'use strict';
 var hooks,pendingPickup=null,placeSource=null,gesture=null,lastClick=null,lastPoint={x:0,y:0},ghost=null,observer,slotClick=false,captured=null,keys={space:false};
 var selector='[data-cell="inv"],[data-cell="tool"],[data-cslot],[data-ch],[data-ms],[data-fur],[data-wp-wslot],[data-drag-cover],[data-drag-instance],[data-drag-component],[data-pipe-cover-slot],[data-transfer-ref]';
 var navigation='[data-nav],[data-dimtab],[data-space-planet],[data-space-view],[data-space-action],[data-tab],[data-popclose],[data-wp-open],[data-wp-repair],[data-casting-back],[data-drop-open],[data-drop-close],[data-drop-take-all],[data-trash-open],[data-trash-close],#save-slots,[data-save-open],.ws-modal-close,#quests,#qopen,#qtip,.fluid-picker,input,textarea,select,[contenteditable="true"]';
 function S(){return hooks.state();}
 function held(){return hooks&&ITEM_CURSOR.held(S());}
 function worldStorage(e){var world=e.target.closest('.fx-m[data-uid]'),m=world?ENTITIES.get(S(),world.dataset.uid):root.FACTORY&&FACTORY.machineAtPointer?FACTORY.machineAtPointer(e):null,d=m&&STRUCTURES.instance(m);return d&&d.sharedFluidStorage&&!d.multiblock?m:null;}
 function visible(el){return !!el&&el.isConnected&&el.getClientRects().length>0&&!el.closest('[hidden]');}
 function ref(el){
  if(!el)return null;var d=el.dataset;
  if(d.transferRef){try{return JSON.parse(d.transferRef);}catch(_){return null;}}
  if(d.cell==='inv')return{type:'bag',index:+d.i};
  if(d.cell==='tool')return{type:'tool',slot:d.i};
  if(d.cslot!=null)return{type:'chest',box:+d.cslot,index:+d.i};
  if(d.ch!=null){var cell=FACTORY.chestKey();return cell?{type:'lineChest',cell:cell,blueprintId:BLUEPRINTS.active(S()).id,index:+d.ch}:null;}
  if(d.ms!=null)return{type:'machine',uid:d.ms,kind:d.mk,index:+(d.mj||0)};
  if(d.fur!=null)return{type:'furnace',furnace:+d.fur,kind:d.fk};
  if(d.wpWslot)return{type:'wash',pot:d.wpWslot,kind:d.field};
  if(d.dragCover)return{type:'cover',uid:d.dragCover,side:+d.dragSide};
  if(d.dragInstance)return{type:'instance',uid:d.dragInstance,slot:d.dragSlot};
  if(d.dragComponent)return{type:'component',uid:d.dragComponent,slot:d.dragSlot};
  if(d.pipeCoverSlot)return{type:'pipeCover',cell:d.pipeCell,blueprintId:d.pipeBoard,kind:d.pipeCoverSlot,side:+d.pipeSide,mode:d.pipeMode};
  return null;
 }
 function outsideRect(e,rect){if(!rect)return true;return e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom;}
 function slot(node){return node&&node.closest&&node.closest(selector);}
 function eventElement(e){return e.target.nodeType===1?e.target:e.target.parentElement;}
 function editableEvent(e){var node=eventElement(e);return node&&node.closest('input,textarea,[contenteditable="true"]');}
 function item(r){var e=ITEM_TRANSFER.endpoint(S(),r);return e&&e.get&&e.get();}
 function area(r){if(!r)return'';return r.type==='smeltery'?'smeltery:'+r.uid+':'+r.kind:r.type==='port'?'port:'+r.uid+':'+r.portUid+':'+r.kind:r.type==='bag'?'bag':r.type==='chest'?'chest:'+r.box:r.type==='machine'?'machine:'+r.uid+':'+r.kind:r.type==='furnace'?'furnace:'+(r.uid||r.furnace):r.type==='wash'?'wash:'+r.pot:r.type==='lineChest'?'lineChest:'+r.blueprintId+':'+r.cell:r.type+':'+(r.uid||r.slot);}
 function slotsIn(scope){return Array.from((scope||document).querySelectorAll(selector)).filter(visible);}
 function sources(r){return slotsIn().map(ref).filter(function(v){return area(v)===area(r);});}
 function targets(r){
  if(root.TRASH&&TRASH.active(S())&&['bag','chest','lineChest','drop','tool'].includes(r.type))return[TRASH.target(S())];
  if(root.AE_UI){var aeTargets=AE_UI.targets(r,S());if(aeTargets)return aeTargets;}
  if(root.SMELTERY_UI){var castingTargets=SMELTERY_UI.targets(r,S());if(castingTargets)return castingTargets;}
  if(root.TINKER_WORKSTATIONS_UI){var workstationTargets=TINKER_WORKSTATIONS_UI.targets(r,S());if(workstationTargets)return workstationTargets;}
  if(root.WORLD_SITES_UI){var siteTargets=WORLD_SITES_UI.targets(r,S());if(siteTargets)return siteTargets;}
  if(root.SPACE_UI){var spaceTargets=SPACE_UI.targets(r,S());if(spaceTargets)return spaceTargets;}
  if(root.SHARED_CARGO_UI){var cargoTargets=SHARED_CARGO_UI.targets(r,S());if(cargoTargets)return cargoTargets;}
  if(r.type!=='bag')return[{type:'bag',group:true}];
  var popup=document.getElementById('popup');
  if(popup&&!popup.hidden){var refs=slotsIn(popup).map(ref).filter(function(v){return v&&!['bag','tool','machineStorage','structurePort','structureMaterial','structureUpgrade'].includes(v.type)&&!(['machine','port'].includes(v.type)&&['out','fout','energy'].includes(v.kind))&&!(v.type==='machine'&&v.kind==='fin')&&!(v.type==='furnace'&&v.kind==='out')&&!(v.type==='wash'&&v.kind==='output');});return refs;}
  if(S().ui.page==='chest'){var target=WAREHOUSE.target(S());return target?[target]:[];}
  if(S().ui.page==='craft')return Array.from({length:9},function(_,i){return{type:'workbench',index:i};}).filter(function(r){return MANUAL_WORKBENCH.enabled(S(),r.index);});
  var s=item(r),type=s&&CRAFT_TOOLS.type(s.k);return type?[{type:'tool',slot:type}]:[];
 }
 function movePlacement(origin,target,button){
  FACTORY.cancelPlace(S(),hooks.save);if(origin.index===target.index)return;
  var taken=ITEM_CURSOR.pickup(S(),origin,0);if(!taken.ok){failure(taken);return;}
  var moved=ITEM_CURSOR.place(S(),target,button);if(moved.ok)notify(moved,origin,target);else{notify(taken,origin,{type:'cursor'});failure(moved);}render();
 }
 function reportRefunds(result,from,to){if([from,to].some(function(r){return r&&['structurePort','structureMaterial','structureUpgrade','cover','pipeCover','surfaceCover'].includes(r.type);}))return;if(hooks&&hooks.toast)(result.refunds||[]).forEach(function(p){hooks.toast(hooks.name(p.k)+' ×'+p.n+' 已放入'+(p.toBag?'物品栏':p.toWarehouse?'仓库':'掉落物'));});}
 function notify(result,from,to){if(result&&result.ok){hooks.commit(result,from,to);reportRefunds(result,from,to);render();}return result;}
 function failure(r){if(r&&r.missing&&hooks.toast){hooks.toast('缺少 '+r.missing.map(function(p){return hooks.name(p.k)+' ×'+p.n;}).join('、'));return;}var text={CONTROLLER_CONFLICT:'ME控制器冲突',NO_POWER:'ME网络断电',CASTING_CONTENTS:'先取出铸模、产物与组件，或拆除这个浇铸工位',SLOTS:'目标放不下，物品保留原处',CONTENTS:'该槽位不能交换这些物品',ITEM:'该槽位不接收这件物品',CONTAINER:'需要适合该流体的容器',FLUID:'该流体槽不接收此容器',FLUID_AMOUNT:'流体不足以装满一个容器',TANK:'流体槽空间不足',RUNNING:'等待当前批次完成',FLIGHT:'抵达后可以取回火箭和装备',OCCUPIED:'先拆除槽内的设备',OVERVOLTAGE:'发电机电压高于泵',DEPLETED:'这里的流体已抽干',DIMENSION:'尚未开通这个维度'}[r&&r.code];if(text&&hooks.toast)hooks.toast(text);}
 function quick(r,options,all,sample){var s=item(r)||sample;if(!s)return;var list=all?sources(r):[r],total=0,key=s.k;list.forEach(function(from){var v=item(from);if(!v||all==='same'&&(CONTENT.canonicalKey(v.k)!==CONTENT.canonicalKey(key)||GTTransactions.isInstance(s)&&ITEM_TRANSFER.identity(v)!==ITEM_TRANSFER.identity(s)))return;var result=ITEM_CURSOR.quick(S(),from,targets(from),options);if(result.ok)total+=result.moved;});var result={ok:total>0,k:key,moved:total};if(total)notify(result,r);else if(r.type==='bag'&&S().ui.page==='chest'&&!(root.TRASH&&TRASH.active(S()))&&hooks.toast)hooks.toast(WAREHOUSE.selected(S())?'目标箱子放不下，物品保留原处':'仓库中没有可存入的箱子');return result;}
 function circuit(node,e,scroll){var m=(S().fx.machines||[]).find(function(v){return String(v.uid)===String(node.dataset.cir);});if(!m)return;if(!scroll&&e.shiftKey&&e.button===0){FACTORY.toggleCircuit(m.uid,S(),hooks.save);return;}var copy=held()&&/^gregtech:gt.integrated_circuit@(\d+)$/.exec(held().k),n;if(copy)n=+copy[1];else if(!scroll&&e.shiftKey&&e.button===2)n=-1;else{var config=MULTIBLOCKS.managed(m)?MULTIBLOCKS.controllerCircuit(m):m,current=config.circuitConfigured?config.circ:-1,delta=scroll||(e.button===2?-1:1);n=current+delta;if(n>24)n=-1;if(n< -1)n=24;}FACTORY.setCircuit(m.uid,n,S(),hooks.save);render();}
 function render(){
  if(!hooks)return;var real=held(),placement=!real&&root.FACTORY&&FACTORY.placementCursor&&FACTORY.placementCursor(S()),s=real||placement;if(!ghost){ghost=document.createElement('div');ghost.className='item-cursor';ghost.setAttribute('aria-hidden','true');document.body.appendChild(ghost);}
  ghost.hidden=!s;if(s){ghost.dataset.mode=real?'item':placement.mode;ghost.dataset.item=s.k;ghost.dataset.demolition=String(!!(placement&&placement.demolition));var sig=JSON.stringify([s.k,ITEM_TRANSFER.count(s),real||null]);if(ghost._signature!==sig){ghost.innerHTML=hooks.icon(s.k,32)+'<span class="item-cursor-count">'+ITEM_TRANSFER.count(s)+'</span>';ghost._signature=sig;}var z=typeof root.uiZoom==='function'?root.uiZoom():1;ghost.style.left=(lastPoint.x/z+12)+'px';ghost.style.top=(lastPoint.y/z+12)+'px';}
 }
 function clearPreview(){if(!hooks)return;document.querySelectorAll('.item-distribution-target').forEach(function(el){el.classList.remove('item-distribution-target');delete el.dataset.dropCount;});}
 function end(){gesture=null;if(captured!=null){try{document.body.releasePointerCapture(captured);}catch(_){}captured=null;}clearPreview();render();}
 function refresh(node){if(!hooks)return;var list=[];node=node||document;if(node.matches&&node.matches(selector))list.push(node);if(node.querySelectorAll)list=list.concat(Array.from(node.querySelectorAll(selector)));list.forEach(function(el){el.draggable=false;});render();}
 function preview(){clearPreview();if(!gesture||gesture.kind!=='distribute')return;ITEM_CURSOR.distribution(S(),gesture.refs,0).forEach(function(p){var el=slotsIn().find(function(node){return JSON.stringify(ref(node))===JSON.stringify(p.ref);});if(el){el.classList.add('item-distribution-target');el.dataset.dropCount=p.total;}});}
 function returnHeld(){if(!hooks||!held())return true;end();var result=ITEM_CURSOR.returnHeld(S());if(result.moved||!result.remaining)hooks.commit(Object.assign({},result,{ok:true,operation:'退回'}),{type:'cursor'});else hooks.save();render();if(result.remaining&&hooks.toast)hooks.toast('库存已满，物品继续保留在鼠标上');return !result.remaining;}
 function command(target){var control=target.closest('button,[role="button"],select[data-item-controls]');return !!(control&&!control.disabled&&control.closest('[data-item-controls]')&&!slot(control));}
 function beforeOutside(e){
  if(!hooks||!held()||e.button===1||slot(e.target))return false;
  if(worldStorage(e)&&(e.button===0||e.button===2))return false;
  if(e.button===0&&e.target.closest('[data-demolition-toggle]'))return false;
  if(command(e.target))return false;
  if(e.target.closest('[data-cir],[data-cirset],[data-mb-face],[data-surface-face],[data-mb-circuit],[data-mb-cirset],[data-workbench-result],[data-tw-assemble],[data-travel-ignite],[data-filter-sample],[data-eio-sample],[data-trash-sample],[data-ae-sample],[data-ae-remove-entry],[data-ae-deposit]'))return false;
  // Cancel a held stack before production right-click can demolish anything.
  if(e.button===2){block(e);returnHeld();return true;}
  if(e.target.closest(navigation)){returnHeld();return false;}
  if(e.target.closest('.fx-viewport')){e.preventDefault();e.stopImmediatePropagation();return true;}
  var popup=document.getElementById('popup');if(popup&&!popup.hidden&&!e.target.closest('#popup,#inventory,#toolbar'))return false;
  e.preventDefault();e.stopImmediatePropagation();return true;
 }
 function block(e){e.preventDefault();e.stopImmediatePropagation();}
 function cancelPlacementGesture(e){var right=e.button===2||e.type==='pointermove'&&!!(e.buttons&2);if(!right||!gesture||gesture.kind!=='placement'||!root.FACTORY||!FACTORY.planning||!FACTORY.planning())return false;block(e);end();FACTORY.cancelPlace(S(),hooks.save);return true;}
 function point(e){lastPoint={x:e.clientX,y:e.clientY};render();}
 function init(options){
  hooks=options;ITEM_CURSOR.normalize(S());render();
  document.addEventListener('selectstart',function(e){if(!editableEvent(e))e.preventDefault();});
  document.addEventListener('contextmenu',function(e){e.preventDefault();if(slot(e.target))e.stopImmediatePropagation();},true);
  document.addEventListener('dragstart',function(e){var node=eventElement(e),path=e.composedPath?e.composedPath():[];var onSlot=!!slot(node)||path.some(function(n){return n&&n.matches&&n.matches(selector);});if(onSlot||!node||!node.closest('[draggable="true"]')){e.preventDefault();e.stopPropagation();}},true);
  document.addEventListener('dragover',function(e){if(!editableEvent(e))e.preventDefault();},true);
  document.addEventListener('drop',function(e){if(!editableEvent(e))block(e);},true);
  document.addEventListener('mousedown',function(e){if(cancelPlacementGesture(e))return;if(e.button===1)e.preventDefault();},true);
  document.addEventListener('pointerdown',function(e){
   if(cancelPlacementGesture(e))return;
   if(!held()&&slot(e.target)&&root.FACTORY&&FACTORY.planning&&FACTORY.planning()){FACTORY.cancelPlace(S(),hooks.save);}
   var worldMachine=held()&&worldStorage(e);
   if(worldMachine&&(e.button===0||e.button===2)){
    if(hooks.swallow&&hooks.swallow())return;slotClick=true;block(e);end();point(e);var target={type:'machine',uid:worldMachine.uid,kind:'fin',index:0},moved=ITEM_CURSOR.place(S(),target,e.button);if(moved.ok)notify(moved,{type:'cursor'},target);else failure(moved);return;
   }
   slotClick=false;point(e);var multiCircuit=e.target.closest('[data-mb-circuit]');if(multiCircuit&&(e.button===0||e.button===2)){slotClick=true;block(e);MULTIBLOCK_UI.circuitClick(multiCircuit,e,S(),hooks.save);return;}var cir=e.target.closest('[data-cir]');if(cir&&(e.button===0||e.button===2)){slotClick=true;block(e);circuit(cir,e);return;}var el=slot(e.target),r=el&&ref(el);if(!r||!visible(el)||hooks.swallow&&hooks.swallow())return;
   if(e.button===1){if(!held()&&(['bag','chest','lineChest'].includes(r.type)||r.type==='machine'&&root.LINE_STORAGE&&LINE_STORAGE.spec(ENTITIES.get(S(),r.uid)))){block(e);var endpoint=ITEM_TRANSFER.endpoint(S(),r);CORE.organize(endpoint.arr,function(a,b){return hooks.name(a).localeCompare(hooks.name(b),'zh-CN');});hooks.commit({ok:true,moved:0},r);render();}return;}
   if(e.button!==0&&e.button!==2)return;
   var s=item(r),now=performance.now(),previous=lastClick,double=e.button===0&&previous&&previous.button===0&&now-previous.time<300&&previous.id===JSON.stringify(r);lastClick={id:JSON.stringify(r),time:now,button:e.button,sample:s&&GTTransactions.clone(s)||double&&previous.sample};
   if(r.type==='cover'&&!held()&&!e.shiftKey&&e.button===0&&!e.ctrlKey&&!e.altKey&&!keys.space)return;
   slotClick=true;block(e);end();if(e.pointerId!=null){try{document.body.setPointerCapture(e.pointerId);captured=e.pointerId;}catch(_){}}
   var special=ITEM_TRANSFER.endpoint(S(),r);
   if(special&&special.cursorTransfer){if(held()){var result=ITEM_CURSOR.place(S(),r,e.button,{n:e.button===2||e.ctrlKey?1:ITEM_TRANSFER.count(held())});if(result.ok)notify(result,{type:'cursor'},r);else failure(result);}return;}
   if(e.ctrlKey){quick(r,{n:1,emptyOnly:e.button===2});gesture={kind:'quick',area:area(r),seen:new Set([JSON.stringify(r)]),options:{n:1,emptyOnly:e.button===2}};return;}
   if(e.altKey||keys.space){quick(r,{},e.altKey?'same':'all');return;}
   if(e.shiftKey){quick(r,{},double?'same':false,double&&previous.sample);gesture={kind:'quick',area:area(r),seen:new Set([JSON.stringify(r)]),options:{}};return;}
   if(double&&held()&&!GTTransactions.isInstance(held())&&CORE.maxStack(held().k)>1){notify(ITEM_CURSOR.collect(S(),slotsIn().map(ref)),r);return;}
    var placementSource=!held()&&r.type==='bag'&&e.button===0&&root.FACTORY&&FACTORY.placementSource&&FACTORY.placementSource(S());
    if(placementSource){movePlacement(placementSource,r,0);return;}
    if(!held()){
     if(e.button===0&&r.type==='bag'&&!s&&root.FACTORY&&FACTORY.planning&&FACTORY.planning()){FACTORY.cancelPlace(S(),hooks.save);return;}
     if(e.button===0&&s&&r.type==='bag'&&hooks.place&&hooks.place(r,s)){gesture={kind:'placement',index:r.index,x:e.clientX,y:e.clientY};return;}
     if(root.FACTORY&&FACTORY.planning&&FACTORY.planning())FACTORY.cancelPlace(S(),hooks.save);
     var result=ITEM_CURSOR.pickup(S(),r,e.button);if(result.ok){notify(result,r,{type:'cursor'});gesture={kind:'pickup'};}else failure(result);return;
    if(result.ok){notify(result,r,{type:'cursor'});gesture={kind:'pickup'};}else failure(result);
    return;
   }
   var endpoint=ITEM_TRANSFER.endpoint(S(),r);
   if(e.button===2||endpoint&&endpoint.fluid){var result=ITEM_CURSOR.place(S(),r,e.button);if(result.ok)notify(result,{type:'cursor'},r);else failure(result);gesture={kind:'right',last:JSON.stringify(r),button:e.button};return;}
   gesture={kind:'distribute',refs:[r],button:e.button};preview();
  },true);
  document.addEventListener('pointermove',function(e){if(cancelPlacementGesture(e))return;point(e);var el=slot(document.elementFromPoint(e.clientX,e.clientY)),r=el&&ref(el);if(!gesture||!r)return;
   var id=JSON.stringify(r);
   if(gesture.kind==='quick'&&area(r)===gesture.area&&!gesture.seen.has(id)){gesture.seen.add(id);quick(r,gesture.options);}
   else if(gesture.kind==='right'&&held()&&id!==gesture.last){gesture.last=id;var result=ITEM_CURSOR.place(S(),r,gesture.button);if(result.ok)notify(result,{type:'cursor'},r);}
   else if(gesture.kind==='distribute'&&!gesture.refs.some(function(v){return JSON.stringify(v)===id;})){gesture.refs.push(r);preview();}
  },true);
  document.addEventListener('pointerup',function(e){if(!gesture||e.button===1)return;var g=gesture;end();if(g.kind==='placement'&&Math.hypot(e.clientX-g.x,e.clientY-g.y)>6&&root.FACTORY){var target=document.elementFromPoint(e.clientX,e.clientY),bag=ref(slot(target));if(bag&&bag.type==='bag'){movePlacement({type:'bag',index:g.index},bag,0);return;}FACTORY.dragInventory({target:target,clientX:e.clientX,clientY:e.clientY},g.index,true);FACTORY.endInventoryDrag();}if(g.kind==='distribute'&&held()){var result=g.refs.length===1?ITEM_CURSOR.place(S(),g.refs[0],0):ITEM_CURSOR.distribute(S(),g.refs,0);if(result.ok)notify(result,{type:'cursor'},g.refs[0]);else failure(result);}},true);
  document.addEventListener('pointercancel',function(){pendingPickup=null;end();},true);
  document.addEventListener('dragstart',function(e){if(slot(e.target))e.preventDefault();},true);
  document.addEventListener('click',function(e){if(e.target.closest('[data-cir],[data-mb-circuit]')||slot(e.target)&&(!e.target.closest('[data-io-side]')||slotClick))block(e);else if(held()&&!command(e.target)&&!e.target.closest(navigation+',[data-demolition-toggle],#popup [data-cirset],[data-mb-face],[data-surface-face],[data-mb-cirset],[data-workbench-result],[data-tw-assemble],[data-travel-ignite],[data-filter-sample],[data-eio-sample],[data-trash-sample],[data-ae-sample],[data-ae-remove-entry],[data-ae-deposit]'))block(e);slotClick=false;},true);
  document.addEventListener('wheel',function(e){var multi=e.target.closest('[data-mb-circuit]');if(multi&&e.deltaY){block(e);MULTIBLOCK_UI.circuitClick(multi,e,S(),hooks.save,e.deltaY<0?1:-1);return;}var node=e.target.closest('[data-cir]');if(node&&e.deltaY){block(e);circuit(node,e,e.deltaY<0?1:-1);}}, {capture:true,passive:false});
  document.addEventListener('dblclick',function(e){if(slot(e.target))block(e);},true);
  document.addEventListener('keydown',function(e){
   if(e.key==='Escape'&&held()){block(e);returnHeld();return;}
   if(e.key==='Escape'&&root.FACTORY&&FACTORY.planning&&FACTORY.planning()){block(e);end();FACTORY.cancelPlace(S(),hooks.save);return;}
   if(e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
   if(e.code==='Space'){keys.space=true;if(slot(document.elementFromPoint(lastPoint.x,lastPoint.y)))e.preventDefault();}
   if(e.key==='Escape'){if(gesture)end();if(root.FACTORY&&FACTORY.cancelPlace&&FACTORY.cancelPlace(S(),hooks.save))block(e);return;}
   var el=slot(document.elementFromPoint(lastPoint.x,lastPoint.y)),r=el&&ref(el);if(!r||held())return;
   if(/^[1-9]$/.test(e.key)){block(e);var result=ITEM_TRANSFER.move(S(),r,{type:'bag',index:+e.key-1});if(result.ok)notify(result,r);}
  },true);
  document.addEventListener('keyup',function(e){if(e.code==='Space')keys.space=false;},true);
  window.addEventListener('blur',function(){keys.space=false;returnHeld();end();if(ghost)ghost.hidden=true;});
  document.addEventListener('visibilitychange',function(){if(document.hidden){returnHeld();end();}});
  window.addEventListener('pagehide',function(){returnHeld();hooks.save();});
  observer=new MutationObserver(function(changes){changes.forEach(function(c){if(c.target.closest&&c.target.closest('.item-cursor'))return;c.addedNodes.forEach(function(n){if(n.nodeType===1&&!n.matches('.item-cursor'))refresh(n);});});});observer.observe(document.body,{childList:true,subtree:true});refresh();
 }
 root.ITEM_DRAG={reportRefunds:reportRefunds,syncCursor:render,quickModifier:function(e){return e.shiftKey||e.ctrlKey||e.altKey||keys.space;},init:init,refresh:refresh,ref:ref,end:end,held:held,returnHeld:returnHeld,beforeOutside:beforeOutside,consumeClick:function(e){if(!slotClick)return false;slotClick=false;block(e);return true;},selector:selector,slots:slotsIn};
})(typeof window!=='undefined'?window:globalThis);
