(function(root){
 'use strict';
 var size=54,ui=null,hooks=null;
 function ensure(S){if(!S.trash)S.trash={schema:1,session:0,open:false,slots:Array(size).fill(null)};return S.trash;}
 function active(S){return !!(S.trash&&S.trash.open);}
 function discard(S){var d=ensure(S),old=d.slots;d.slots=Array(size).fill(null);old.filter(Boolean).forEach(function(p){DROPPED_ITEMS.expireEntity(S,p);});}
 function normalize(S){var d=ensure(S);if(d.schema!==1||!Number.isSafeInteger(d.session)||d.session<0||!Array.isArray(d.slots)||d.slots.length!==size||!DROPPED_ITEMS.valid(d.slots.filter(Boolean)))throw Error('垃圾桶存档无效');d.slots.filter(Boolean).forEach(function(p){if(ITEM_TRANSFER.count(p)>CORE.maxStack(p.k))throw Error('垃圾桶物品数量无效');if(p.entityUid){var m=ENTITIES.get(S,p.entityUid);if(!m||!m.location||m.location.kind!=='packed')throw Error('垃圾桶设备引用无效');}});d.open=false;discard(S);}
 function open(S){var d=ensure(S);if(d.open)return;d.session++;d.open=true;}
 function close(S){var d=ensure(S);if(!d.open)return false;d.open=false;discard(S);return true;}
 function target(S){var d=ensure(S);return{type:'trash',session:d.session,group:true};}
 function refresh(S){if(!ui)return;ui.hidden=!active(S);if(ui.hidden)return;var d=ensure(S),html=d.slots.map(function(p,i){var label=p?(typeof nameOf==='function'?nameOf(p.k):GD.items[p.k]||p.k):'空槽',ref={type:'trash',session:d.session,index:i};return '<button type="button" class="trash-slot" data-transfer-ref="'+DROPPED_ITEMS.escape(JSON.stringify(ref))+'" data-tip="'+DROPPED_ITEMS.escape(label)+'">'+(p?root.iconHtml(p.k,32)+'<b>'+p.n+'</b>':'')+'</button>';}).join('');UI_KIT.patch(ui.querySelector('.trash-grid'),html);}
 function dismiss(){if(!hooks)return;ui.hidden=true;if(!close(hooks.S))return;if(root.ITEM_DRAG)ITEM_DRAG.returnHeld();if(typeof markInv==='function')markInv();hooks.save();refresh(hooks.S);}
 function init(S,save){hooks={S:S,save:save};ensure(S);ui=document.createElement('section');ui.id='trash-items';ui.className='trash-panel';ui.hidden=true;ui.innerHTML='<div class="drops-heading"><strong>垃圾桶</strong><button type="button" class="btn" data-trash-close>关闭</button></div><div class="trash-grid"></div><div class="trash-note">Shift 快速放入，关窗立即清空</div>';document.body.appendChild(ui);document.addEventListener('click',function(e){if(e.target.closest('[data-trash-open]')){if(active(S))dismiss();else{open(S);save();refresh(S);}}else if(e.target.closest('[data-trash-close]'))dismiss();});window.addEventListener('keydown',function(e){if(e.key==='Escape')dismiss();});window.addEventListener('pagehide',dismiss);refresh(S);}
 root.TRASH={ensure:ensure,normalize:normalize,active:active,open:open,close:close,target:target,refresh:refresh,dismiss:dismiss,init:init};
})(typeof window!=='undefined'?window:globalThis);

STATE_SCHEMA.register("trash",["trash"]);
