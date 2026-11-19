(function(root){
 'use strict';
 var current=null,dirs=['上','右','下','左'],arrows=['↑','→','↓','←'];
 function esc(v){return String(v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
 function button(attr,text,tip,on){return'<button class="btn" '+attr+' data-tip="'+esc(tip||text)+'"'+(on==null?'':' aria-pressed="'+on+'"')+'>'+text+'</button>';}
 function open(cell,S,save,chosenKind,chosenSide){var popup=document.getElementById('popup');if(!popup)return;var b=EIO_STATE.board(S),boardId=b.id,kinds=EIO_STATE.kinds.filter(function(k){return !!b[k][cell];}),kind=kinds.includes(chosenKind)?chosenKind:kinds[0],side=chosenSide==null?0:chosenSide,signature='';if(!kind)return;
  popup.hidden=false;popup.classList.add('noback');popup.innerHTML='<div class="box mxwin eio-window" data-uses-inventory="true" data-item-controls><header><h3>EIO导管</h3><button class="btn" data-popclose="1">关闭</button></header><div class="eio-body"><div class="eio-top"><div class="eio-faces">'+arrows.map(function(a,i){return button('data-eio-side="'+i+'"',a,dirs[i]+'侧',i===side);}).join('')+'<div class="eio-center"></div></div><div><nav class="eio-kinds"></nav><b class="eio-title"></b><div class="eio-contact dim"></div></div></div><div class="eio-flows"></div></div></div>';
  var host=popup.querySelector('.eio-window');
  function ref(flow){return{blueprintId:boardId,kind:kind,cell:cell,side:side,flow:flow};}
  function slot(field,i,stack,tip){var r=Object.assign({type:'eio:upgrade',field:field,index:i},ref('extract'));return'<button class="mslot resource-slot eio-slot" data-transfer-ref="'+esc(JSON.stringify(r))+'" data-tip="'+esc(stack?nameOf(stack.k):tip)+'">'+(stack?iconHtml(stack.k,30)+(stack.n>1?'<span class="n">'+stack.n+'</span>':''):'<span class="mplus">+</span>')+'</button>';}
  function flowToggle(flow,cfg){var label=flow==='insert'?'加入':'提取',state=cfg.enabled?'开':'关';
   return button('data-eio-enabled="'+flow+'" aria-label="'+label+'：'+state+'"','<span class="eio-flow-label">'+label+'</span><span class="eio-switch-track" aria-hidden="true"><span></span></span><span class="eio-toggle-state">'+state+'</span>',label+'：'+state+'，点击'+(cfg.enabled?'关闭':'开启'),cfg.enabled);
  }
  function colorButton(flow,col){var label=flow==='insert'?'加入':'提取';
   return button('data-eio-color="'+flow+'" aria-label="'+label+'颜色通道：'+col[0]+'"','<i class="eio-color-swatch" style="background:'+col[1]+'" aria-hidden="true"></i><span class="eio-color-label"><small class="eio-color-caption">颜色通道</small><span class="eio-color-name">'+col[0]+'</span></span>',label+'通道：'+col[0]+'；左键下一色，右键上一色，滚轮切换');
  }
  function panel(flow,p){var item=kind==='eioItem',f=p.faces[side],cfg=f[flow],stack=item?f.filters[flow==='insert'?0:1]:null,filter=item?EIO_FILTERS.config(stack):cfg,col=EIO_CONTENT.colors[cfg.color];
   var html='<section class="eio-flow" data-flow="'+flow+'"><div class="eio-flow-head">'+flowToggle(flow,cfg)+colorButton(flow,col)+'</div><div class="eio-tools">';
   if(item)html+=slot('filters',flow==='insert'?0:1,stack,'放入物品过滤器');
   html+='<div class="eio-options">';if(filter)html+=button('data-eio-filter="whitelist" data-flow="'+flow+'"',filter.whitelist?'白名单':'黑名单',null,filter.whitelist);
   html+='</div></div><div class="eio-samples">';if(filter)filter.samples.forEach(function(s,i){html+='<button class="mslot eio-slot" data-eio-sample="'+i+'" data-flow="'+flow+'" data-tip="'+esc(s?(item?nameOf(s.k):FLUID_PRESENTATION.name(s)):'标记'+(item?'物品':'流体'))+'">'+(s?(item?iconHtml(s.k,30):FLUID_PRESENTATION.html(s,30)):'<span class="mplus">+</span>')+'</button>';});
   html+='</div><div class="eio-footer">';if(item&&flow==='insert')html+='<label>优先级 <input type="number" data-eio-priority value="'+(cfg.priority||0)+'" step="1"></label>';if(item&&flow==='extract')html+='<span>速度升级</span>'+slot('upgrades',0,f.upgrades[0],'放入速度升级或降级');return html+'</div></section>';
  }
  function update(force){if(!host.isConnected)return;var p=EIO_STATE.get(S,boardId,kind,cell);if(!p){popup.hidden=true;return;}var z=(S.zoom||100)/100;host.style.width=Math.min(720,innerWidth/z-24)+'px';host.querySelector('.eio-title').textContent=nameOf(p.pipeKey);host.querySelector('.eio-center').innerHTML=iconHtml(p.pipeKey,42);host.querySelector('.eio-contact').textContent=dirs[side]+'侧';host.querySelectorAll('[data-eio-side]').forEach(function(n){n.setAttribute('aria-pressed',String(+n.dataset.eioSide===side));});
   UI_KIT.patch(host.querySelector('.eio-kinds'),kinds.length>1?kinds.map(function(k){return button('data-eio-kind="'+k+'"',k==='eioItem'?'物品':'流体',null,k===kind);}).join(''):'');
   var sig=JSON.stringify([kind,side,p.faces[side].insert,p.faces[side].extract,p.faces[side].filters,p.faces[side].upgrades]);if(force||sig!==signature){signature=sig;UI_KIT.patch(host.querySelector('.eio-flows'),panel('insert',p)+panel('extract',p));ITEM_DRAG.refresh(host);}
   var inventory=document.getElementById('inventory'),top=inventory?inventory.getBoundingClientRect().top:innerHeight-100,available=(top-42*z-12)/z;host.style.zoom=String(Math.min(1,Math.max(.3,available/host.scrollHeight)));
  }
  function changed(r){if(!r.ok){if(typeof toast==='function')toast(r.code==='FLUID_CONTAINER'?'请拿起装有流体的容器':'无法更改');return;}if(save)save();if(typeof markInv==='function')markInv();update();}
  function color(n,delta){var flow=n.dataset.eioColor,p=EIO_STATE.get(S,boardId,kind,cell);changed(EIO_STATE.configure(S,boardId,kind,cell,side,flow,{color:(p.faces[side][flow].color+delta+16)%16}));}
  host.addEventListener('click',function(e){var n=e.target.closest('[data-eio-side],[data-eio-kind],[data-eio-enabled],[data-eio-color],[data-eio-filter],[data-eio-sample]');if(!n)return;e.preventDefault();e.stopPropagation();var p=EIO_STATE.get(S,boardId,kind,cell),flow=n.dataset.flow;
   if(n.dataset.eioSide!=null){side=+n.dataset.eioSide;update();}else if(n.dataset.eioKind){kind=n.dataset.eioKind;update();}else if(n.dataset.eioEnabled){flow=n.dataset.eioEnabled;changed(EIO_STATE.configure(S,boardId,kind,cell,side,flow,{enabled:!p.faces[side][flow].enabled}));}else if(n.dataset.eioColor)color(n,1);else if(n.dataset.eioSample!=null)changed(EIO_FILTERS.setSample(S,ref(flow),+n.dataset.eioSample,ITEM_CURSOR.held(S)));else {var filter=kind==='eioItem'?EIO_FILTERS.config(p.faces[side].filters[flow==='insert'?0:1]):p.faces[side][flow];changed(EIO_FILTERS.configure(S,ref(flow),{whitelist:!filter.whitelist}));}
  });
  host.addEventListener('contextmenu',function(e){var n=e.target.closest('[data-eio-color],[data-eio-sample]');if(!n)return;e.preventDefault();e.stopPropagation();if(n.dataset.eioColor)color(n,-1);else changed(EIO_FILTERS.setSample(S,ref(n.dataset.flow),+n.dataset.eioSample,null));});
  host.addEventListener('wheel',function(e){var n=e.target.closest('[data-eio-color]');if(!n)return;e.preventDefault();e.stopPropagation();color(n,e.deltaY>0?1:-1);},{passive:false});
  host.addEventListener('change',function(e){if(e.target.matches('[data-eio-priority]')){var n=Number(e.target.value);changed(EIO_STATE.configure(S,boardId,kind,cell,side,'insert',{priority:n}));}});
  current={host:host,update:update};update(true);
 }
 root.EIO_UI={open:open,refresh:function(){if(current&&current.host.isConnected)current.update();else current=null;}};
})(typeof window!=='undefined'?window:globalThis);
