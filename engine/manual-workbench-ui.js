(function(root){
 'use strict';
 var hooks,host,signature='';
 function refresh(){if(!hooks||hooks.state().ui.page!=='craft')return;var S=hooks.state(),b=MANUAL_WORKBENCH.ensure(S),hit=MANUAL_WORKBENCH.match(S),next=JSON.stringify([S.bench>0,b.slots,hit&&hit.recipe.id]);if(next===signature)return;signature=next;
  host.querySelectorAll('[data-workbench-slot]').forEach(function(el){var i=+el.dataset.workbenchSlot,s=b.slots[i],locked=!MANUAL_WORKBENCH.enabled(S,i),tip=s?hooks.name(s.k):locked?'放置工作台后解锁':'放入材料';el.classList.toggle('locked',locked);el.setAttribute('aria-disabled',String(locked));el.setAttribute('data-tip',tip);el.removeAttribute('title');el.setAttribute('aria-label','工作台第 '+(i+1)+' 格：'+tip);UI_KIT.patch(el,s?hooks.icon(s.k,30)+'<span class="n">'+ITEM_TRANSFER.count(s)+'</span>':'');});
  var result=host.querySelector('[data-workbench-result]'),tip=hit?'取出 '+hooks.name(hit.recipe.out)+'；Shift 批量合成到背包':'按配方摆入材料';result.disabled=!hit;result.setAttribute('data-tip',tip);result.removeAttribute('title');result.setAttribute('aria-label',tip);UI_KIT.patch(result,hit?hooks.icon(hit.recipe.out,32)+'<span class="n">'+hit.recipe.n+'</span>':'');
 }
 function init(options){hooks=options;host=document.getElementById('manual-workbench');signature='';if(!host)return;
  host.innerHTML='<div class="workbench-heading"><strong>手动摆放</strong><button type="button" class="btn" data-workbench-clear="1">材料收回背包</button></div><div class="workbench-row"><div class="workbench-grid">'+Array.from({length:9},function(_,i){return'<button type="button" class="workbench-slot" data-workbench-slot="'+i+'" data-transfer-ref=\'{"type":"workbench","index":'+i+'}\' aria-label="工作台第 '+(i+1)+' 格"></button>';}).join('')+'</div><span class="workbench-arrow">→</span><button type="button" class="workbench-slot workbench-result" data-workbench-result="1" aria-label="取出合成产物"></button></div>';
  host.addEventListener('pointerdown',function(e){var result=e.target.closest('[data-workbench-result]');if(!result||result.disabled||e.button!==0&&e.button!==2)return;e.preventDefault();e.stopImmediatePropagation();var r=MANUAL_WORKBENCH.take(hooks.state(),hooks.processor,e.shiftKey);if(r.ok)hooks.changed();else hooks.toast(r.code==='OUTPUT'?'放不下产物，材料未消耗':'当前材料不能完成合成');refresh();ITEM_DRAG.refresh();});
  host.addEventListener('click',function(e){if(e.target.closest('[data-workbench-result]')){e.preventDefault();e.stopPropagation();return;}if(e.target.closest('[data-workbench-clear]')){var r=MANUAL_WORKBENCH.clear(hooks.state());if(r.moved)hooks.changed();if(r.remaining)hooks.toast('背包已满，未收回的材料保留在工作台');refresh();}});refresh();
 }
 root.MANUAL_WORKBENCH_UI={init:init,refresh:refresh};
})(typeof window!=='undefined'?window:globalThis);
