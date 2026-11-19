/* 类型过滤器浮窗：布局与物品过滤器一致——类型选左边，物品缓存右边，下面是选项、电量与覆盖板。 */
(function(root){
 'use strict';
 var opened=null;
 function esc(s){return String(s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
 function nameOf(k){return String(GD.items[k]||CONTENT.item(k)?.name||k).replace(/§[0-9a-fk-or]/gi,'');}
 function iconHtml(k,n){return root.iconOrText?iconOrText(k,n||28):'';}
 function slot(ref,item){
  return '<button class="filter-slot" data-transfer-ref="'+esc(JSON.stringify(ref))+'" data-tip="'+esc(item?nameOf(item.k):'空槽位')+'"'+(item?' data-lookup-key="'+esc(item.k)+'"':'')+'>'+(item?iconHtml(item.k,28)+'<b>'+(item.n>1?item.n:'')+'</b>':'')+'</button>';
 }
 function toggle(action,text,on){return '<button class="btn filter-toggle" data-type-toggle="'+action+'" aria-pressed="'+on+'">'+text+'</button>';}
 function changed(){if(!opened)return;if(opened.save)opened.save();refresh();}
 function choices(prefixes){
  return TYPE_FILTERS.candidates().map(function(c){
   var on=prefixes.includes(c.id);
   return '<button type="button" class="type-pick type-filter-option'+(on?' on':'')+'" data-ui-key="type:'+esc(c.id)+'" data-type-prefix="'+esc(c.id)+'" aria-pressed="'+on+'" data-tip="'+esc(c.name+'，'+c.count+' 种物品')+'">'+iconHtml(c.key,22)+'<span>'+esc(c.name)+'</span></button>';
  }).join('');
 }

 function open(uid,S,save){
  var m=ENTITIES.get(S,uid);if(!TYPE_FILTERS.supported(m))return;
  var popup=document.getElementById('popup');
  if(opened&&opened.uid===uid&&!popup.hidden&&popup.querySelector('.type-filter-window'))return refresh();
  opened={uid:uid,S:S,save:save};
  popup.hidden=false;popup.removeAttribute('hidden');popup.classList.add('noback');
  popup.innerHTML='<div class="box mxwin machine-window item-filter-window type-filter-window">'+
   '<h3 class="machine-heading">'+iconHtml(m.k,28)+'<span>'+esc(nameOf(m.k))+'</span></h3>'+
   '<div class="machine-body"><div class="filter-grids">'+
   '<section><h4>过滤类型</h4><div class="type-picks type-filter-list" role="group" aria-label="过滤类型"></div></section>'+
   '<span class="filter-arrow">→</span>'+
   '<section><h4>物品缓存</h4><div class="filter-inventory"></div></section></div>'+
   '<p class="filter-help" data-type-help></p>'+
   '<div class="filter-options"></div><div class="filter-covers machine-io-host"></div>'+

   '</div>'+
   '<div class="foot"><button class="btn" data-popclose="1">关闭</button></div>';
  var box=popup.querySelector('.type-filter-window');
  FACTORY.mountMove(box.querySelector('.foot'),m,S,save);
  box.onclick=function(e){
   var pick=e.target.closest('[data-type-prefix]');
   if(pick){var s=TYPE_FILTERS.ensure(m),id=pick.dataset.typePrefix;
    var at=s.prefixes.indexOf(id);
    if(at>=0){if(s.prefixes.length>1)s.prefixes.splice(at,1);}else s.prefixes.push(id);
    changed();return;}
   var button=e.target.closest('[data-type-toggle]');
   if(!button)return;
   var st=TYPE_FILTERS.ensure(m),action=button.dataset.typeToggle;
   if(action==='invert'||action==='autoOutput')st[action]=!st[action];
   changed();
  };
  refresh();
 }

 function refresh(){
  if(!opened)return;
  var popup=document.getElementById('popup'),box=popup&&!popup.hidden&&popup.querySelector('.type-filter-window');
  if(!box){opened=null;return;}
  var m=ENTITIES.get(opened.S,opened.uid);
  if(!m||!ENTITIES.active(m)){FACTORY.close();opened=null;return;}
  var s=TYPE_FILTERS.ensure(m);
  var help=box.querySelector('[data-type-help]');if(help)help.textContent=s.invert?'阻挡所选类型的物品':'通过所选类型的物品';
  MACHINE_COVERS.ensure(m);
  FACTORY.positionWindow(m,popup,DEFS.of(m.k));
  UI_KIT.patch(box.querySelector('.type-filter-list'),choices(s.prefixes));
  UI_KIT.patch(box.querySelector('.filter-inventory'),m.ins.map(function(item,i){return slot({type:'machine',uid:m.uid,kind:'in',index:i},item);}).join(''));
  UI_KIT.patch(box.querySelector('.filter-options'),
   '<button class="btn filter-toggle" data-type-toggle="invert" aria-pressed="'+s.invert+'">'+(s.invert?'黑名单':'白名单')+'</button>'+
   toggle('autoOutput','自动输出 '+(s.autoOutput?'开':'关'),s.autoOutput));
  MACHINE_IO.mount(box.querySelector('.filter-covers'),m,opened.S,opened.save);
 }

 root.TYPE_FILTER_UI={open:open,refresh:refresh,choices:choices};
})(typeof window!=='undefined'?window:globalThis);
