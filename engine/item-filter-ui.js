(function(root){
 'use strict';var opened=null;
 function esc(s){return String(s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
 function slot(ref,item,tip){return'<button class="filter-slot" data-transfer-ref="'+esc(JSON.stringify(ref))+'" data-tip="'+esc(item?nameOf(item.k):tip)+'"'+(item?' data-lookup-key="'+esc(item.k)+'"':'')+'>'+(item?iconHtml(item.k,28)+'<b>'+((item.n||1)>1?item.n:'')+'</b>':'')+'</button>';}
 function toggle(action,text,on){return'<button class="btn filter-toggle" data-filter-toggle="'+action+'" aria-pressed="'+on+'">'+text+'：'+(on?'开':'关')+'</button>';}
 function changed(){if(opened.save)opened.save();refresh();}
 function open(uid,S,save){var m=ENTITIES.get(S,uid);if(!ITEM_FILTERS.supported(m))return;var popup=document.getElementById('popup');if(opened&&opened.uid===uid&&!popup.hidden&&popup.querySelector('.item-filter-window')){refresh();return;}FACTORY.close();opened={uid:uid,S:S,save:save};popup.hidden=false;popup.classList.add('noback');
  popup.innerHTML='<div class="box mxwin machine-window item-filter-window"><h3 class="machine-heading">'+iconHtml(m.k,28)+'<span>'+esc(nameOf(m.k))+'</span></h3><div class="machine-body"><div class="filter-grids"><section><h4>过滤样板</h4><div class="filter-samples"></div></section><span class="filter-arrow">→</span><section><h4>物品缓存</h4><div class="filter-inventory"></div></section></div><p class="filter-help">拿着物品左键设置样板，右键清除。</p><div class="filter-options"></div><label class="filter-count">每次输出数量 <input type="number" min="0" max="64" step="1" data-filter-count><small>0 为不限</small></label><div class="filter-energy"><span></span><i><b></b></i></div><div class="filter-covers machine-io-host"></div></div><div class="foot"><button class="btn" data-popclose="1">关闭</button></div></div>';
  var box=popup.querySelector('.item-filter-window');FACTORY.mountMove(box.querySelector('.foot'),m,S,save);
  box.addEventListener('pointerdown',function(e){var sample=e.target.closest('[data-filter-sample]');if(!sample||e.button!==0&&e.button!==2)return;e.preventDefault();e.stopImmediatePropagation();var held=ITEM_CURSOR.held(S);if(e.button===2||held){ITEM_FILTERS.setSample(m,+sample.dataset.filterSample,e.button===2?null:held);changed();}},true);
  box.addEventListener('contextmenu',function(e){if(e.target.closest('[data-filter-sample]')){e.preventDefault();e.stopPropagation();}});
  box.onclick=function(e){var button=e.target.closest('[data-filter-toggle]');if(!button)return;var s=ITEM_FILTERS.ensure(m),action=button.dataset.filterToggle;
   if(action==='invert'||action==='ignoreNBT'||action==='sort'||action==='autoOutput')s[action]=!s[action];else if(action==='energy')m.emitEnergy=!m.emitEnergy;
   changed();
  };
  box.querySelector('[data-filter-count]').onchange=function(e){var n=Number(e.target.value);if(Number.isInteger(n)&&n>=0&&n<=64)ITEM_FILTERS.ensure(m).stackSize=n;e.target.value=ITEM_FILTERS.ensure(m).stackSize;changed();};refresh();
 }
 function refresh(){if(!opened)return;var popup=document.getElementById('popup'),box=popup&&!popup.hidden&&popup.querySelector('.item-filter-window');if(!box){opened=null;return;}var m=ENTITIES.get(opened.S,opened.uid);if(!m||!ENTITIES.active(m)){FACTORY.close();opened=null;return;}var s=ITEM_FILTERS.ensure(m);MACHINE_COVERS.ensure(m);FACTORY.positionWindow(m,popup,DEFS.of(m.k));
  UI_KIT.patch(box.querySelector('.filter-samples'),s.samples.slice(0,9).map(function(sample,i){return'<button class="filter-slot filter-sample" data-filter-sample="'+i+'" data-tip="'+esc(sample?nameOf(sample.k)+'，右键清除样板':'拿着物品左键设置样板')+'"'+(sample?' data-lookup-key="'+esc(sample.k)+'"':'')+'>'+(sample?iconHtml(sample.k,28):'<span>+</span>')+'</button>';}).join(''));
  UI_KIT.patch(box.querySelector('.filter-inventory'),m.ins.map(function(item,i){return slot({type:'machine',uid:m.uid,kind:'in',index:i},item,'空槽位');}).join(''));
  UI_KIT.patch(box.querySelector('.filter-options'),'<button class="btn filter-toggle" data-filter-toggle="invert" aria-pressed="'+s.invert+'">'+(s.invert?'黑名单':'白名单')+'</button>'+toggle('ignoreNBT','忽略 NBT',s.ignoreNBT)+toggle('autoOutput','自动输出',s.autoOutput)+toggle('sort','合并堆叠',s.sort)+toggle('energy','电力输出',m.emitEnergy));
  var count=box.querySelector('[data-filter-count]');if(document.activeElement!==count)count.value=s.stackSize;
  var d=DEFS.of(m.k),energy=box.querySelector('.filter-energy'),meter=energy.querySelector('i');
  var pct=Math.max(0,Math.min(100,100*(m.eu||0)/d.energyCapacity));
  energy.firstElementChild.textContent='电量';
  meter.setAttribute('role','progressbar');meter.setAttribute('aria-label','电量');meter.setAttribute('aria-valuenow',Math.round(pct));
  meter.firstElementChild.style.width=pct+'%';
  MACHINE_IO.mount(box.querySelector('.filter-covers'),m,opened.S,opened.save);
 }
 root.ITEM_FILTER_UI={open:open,refresh:refresh};
})(typeof window!=='undefined'?window:globalThis);
