(function(root){
 'use strict';var errors={INPUT:'材料不足',DISCOVERY:'先寻找末地要塞',ALREADY_OPEN:'传送门已经开通',FRAME:'先放齐10块黑曜石',IGNITER:'拿起可用的打火石，点击门中间'};
 function E(s){return root.esc(String(s));}
 function notify(r){if(!r.ok&&typeof toastAt==='function')toastAt(null,errors[r.code]||r.code);}
 function changed(host){if(host._save)host._save();if(typeof markInv==='function')markInv();if(typeof markDynamic==='function')markDynamic();if(typeof renderDyn==='function')renderDyn();if(root.ITEM_DRAG)ITEM_DRAG.syncCursor();}
 function completed(host,id){host._activating=true;paint(host,true);changed(host);if(typeof toastAt==='function')toastAt(null,id==='end'?'已激活末地门':'已开通'+TRAVEL.definitions[id].name);setTimeout(function(){if(!host.isConnected)return;host._activating=false;if(host.closest('#popup'))closePopup();else host.innerHTML='';if(typeof markDynamic==='function')markDynamic();},id==='nether'?1000:0);}
 function materials(S,spec){return (spec.items||[]).map(function(p){var ks=p.alternatives||[p.k],stock=COMMANDS.owned(S,function(k){return ks.some(function(expected){return CONTENT.matches(expected,k,{ignoreNBT:true});});}),k=stock.length?stock[0].k:ks[0],n=stock.reduce(function(n,o){return n+o.n;},0);return '<span>'+iconHtml(k,24)+'<span>'+E(stock.length?nameOf(k):ks.slice(0,2).map(nameOf).join(' / '))+' ×'+p.n+'<small>持有 '+n+'</small></span></span>';}).concat((spec.fluids||[]).map(function(p){var icon=TRAVEL.fluidPairs(p.f)[0]?.filled;return '<span>'+(icon?iconHtml(icon,24):'')+'<span>'+E(GD.fluids[p.f]||p.f)+' '+p.mb+' mB'+(p.consumed===false?'（保留）':'')+'</span></span>';})).join('');}
 function nether(S,active){var placed=PORTAL_FRAME.slots(S);return '<section class="portal-manual"><div class="portal-frame" aria-label="下界传送门门框">'+PORTAL_FRAME.cells.map(function(c,i){var filled=active||placed[i];return '<button class="portal-block'+(filled?' filled':'')+'" style="grid-column:'+(c[0]+1)+';grid-row:'+(c[1]+1)+'" data-transfer-ref="'+E(JSON.stringify({type:'portalFrame',index:i}))+'" data-tip="'+(filled?'黑曜石':'放入黑曜石')+'" aria-label="门框 '+(i+1)+'"'+(active?' disabled':'')+'>'+(filled?'':'＋')+'</button>';}).join('')+'<button class="portal-center'+(active?' active':'')+'" data-travel-ignite data-tip="'+(active?'下界传送门':'用打火石点火')+'" aria-label="用打火石点火"'+(active?' disabled':'')+'><span>'+(active?'':UI_KIT.glyph('plus',24))+'</span></button></div><p class="portal-instruction">'+(active?'已开通下界':'拿起黑曜石，放入门框的10个格子；再拿打火石点火。')+'</p><div class="portal-frame-count">'+(active?10:PORTAL_FRAME.count(S))+' / 10</div></section>';}
 function paint(host,active){
  var S=host._state,id=host.dataset.travelView,h='<div class="travel-panel">';
  if(id==='nether'){
   var zoom=uiZoom(),top=document.getElementById('top').getBoundingClientRect().bottom,bottom=document.getElementById('bottom').getBoundingClientRect().top;
   host.style.setProperty('--portal-block',Math.max(22,Math.min(40,Math.floor(((bottom-top)/zoom-140)/5)))+'px');
   h+=nether(S,active);
  }else for(var [mode,spec] of Object.entries(TRAVEL.definitions[id].modes)){
   var ready=!active&&TRAVEL.plan(S,id,mode);
   h+='<section class="portal-method">'+(id==='end'?'':'<h4>'+E(spec.name)+'</h4>')+'<p>'+E(spec.description)+'</p><div class="portal-materials">'+materials(S,spec)+'</div><button class="btn" data-portal-build="'+id+'" data-portal-mode="'+mode+'"'+(!ready.ok?' disabled':'')+'>'+(id==='end'?'激活末地门':'投入材料并开通')+'</button></section>';
  }
  UI_KIT.patch(host,h+'</div>');
 }
 function render(host,S,save,target){var id=target||S.ui.dim;if(!host||!TRAVEL.definitions[id]||TRAVEL.can(S,id)&&!host._activating)return false;host.dataset.travelView=id;host._state=S;host._save=save;if(host._activating)return true;paint(host,false);host.onclick=function(e){var b=e.target.closest('[data-travel-ignite],[data-portal-build]');if(!b)return;e.preventDefault();e.stopPropagation();var r=b.hasAttribute('data-travel-ignite')?PORTAL_FRAME.ignite(S):TRAVEL.build(S,id,b.dataset.portalMode);if(r.ok)completed(host,id);else notify(r);};return true;}
 function refresh(){document.querySelectorAll('[data-travel-view]').forEach(function(host){if(host._state&&!host._activating&&!TRAVEL.can(host._state,host.dataset.travelView))paint(host,false);});}
 root.TRAVEL_UI={render:render,refresh:refresh};
})(typeof window!=='undefined'?window:globalThis);
