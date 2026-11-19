(function(root){
 'use strict';
 var current=null,names=['上','右','下','左'],labels={item:'物品管道',fluid:'流体管道',wire:'电缆'};
 function esc(value){return String(value).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
 function name(k,kind){return kind==='fluid'?FLUID_PRESENTATION.name(k):GD.items[k]||CONTENT.item(k)&&CONTENT.item(k).name||k;}
 function fit(host,S){var box=host.closest('.pipe-window');if(!box)return;var z=(S.zoom||100)/100;box.style.width=Math.min(420,root.innerWidth/z-24)+'px';box.style.height=Math.max(140,Math.min(550,root.innerHeight/z-200))+'px';box.style.maxHeight=box.style.height;}
 function mount(host,cell,S,save){
  var f=FACTORY.ensure(S),boardId=BLUEPRINTS.active(S).id,kinds=['item','fluid','wire'].filter(function(k){return !!f[k][cell];}),kind=kinds[0],side=0,signature='';
  host.innerHTML='<div class="pipe-summary"></div><div class="pipe-face-grid"></div><nav class="pipe-kind-tabs"></nav><div class="pipe-side-title"></div><div class="pipe-cover-config"><div class="pipe-cover-modes"><button class="btn" data-pipe-direction="import">抽入管道</button><button class="btn" data-pipe-direction="export">从管道输出</button></div><label><input type="checkbox" data-pipe-opposite>允许反向通过</label><label><input type="checkbox" data-pipe-input>允许流体从此面进入</label><div class="pipe-plate-gates"><label><input type="checkbox" data-pipe-plate="passItems">允许物品通过</label><label><input type="checkbox" data-pipe-plate="passFluids">允许流体通过</label></div></div><details class="pipe-filter"><summary>筛选</summary><div class="pipe-filter-body"><select data-pipe-filter-mode><option value="whitelist">只通过样本</option><option value="blacklist">排除样本</option></select><div data-pipe-samples></div><input type="search" data-pipe-search placeholder="搜索物品／流体名称"><div data-pipe-candidates></div></div></details>';
  var tabs=host.querySelector('.pipe-kind-tabs'),grid=host.querySelector('.pipe-face-grid');
  kinds.forEach(function(k){var b=document.createElement('button');b.className='btn';b.dataset.pipeKind=k;b.textContent=labels[k];tabs.appendChild(b);});
  for(var d=0;d<4;d++){var face=document.createElement('div');face.className='pipe-face pipe-face-'+d;face.innerHTML='<button class="pipe-face-title" data-pipe-face="'+d+'">'+names[d]+'侧</button><div class="mslot resource-slot" data-pipe-side="'+d+'"></div><button class="btn pipe-link" data-pipe-link="'+d+'"></button>';grid.appendChild(face);}
  var center=document.createElement('div');center.className='pipe-center';grid.appendChild(center);
  function pipe(){return f[kind]&&f[kind][cell];}
  function changed(r){if(!r.ok){if(typeof toast==='function')toast(({TARGET:'此面没有可连接的接口',COVER:'这里不能安装这块覆盖板',FILTER:'最多设置 9 个样本'})[r.code]||'无法更改');return;}if(save)save();if(typeof markInv==='function')markInv();update();}
  function candidates(){var p=pipe(),q=host.querySelector('[data-pipe-search]').value.trim(),keys=[];
   function push(k){if(k&&!keys.includes(k)&&!(p.filter||[]).includes(k))keys.push(k);}
   if(q){if(kind==='item')Object.keys(CONTENT.items).some(function(k){var i=CONTENT.item(k);if(i.meta!==32767&&CONTENT.canonicalKey(k)===k&&CONTENT_SCOPE.allowed(k)&&SEARCH_TEXT.matches(SEARCH_TEXT.index(name(k,kind),null,k),q))push(k);return keys.length>=20;});
    else if(kind==='fluid')CONTENT.fluids.some(function(v){if(SEARCH_TEXT.matches(SEARCH_TEXT.index(name(v.id,kind),null,v.id),q))push(v.id);return keys.length>=20;});
   }else COMMANDS.owned(S).forEach(function(v){if(kind==='item')push(v.k);else GD.containerRegistry.forEach(function(c){if(c.filled===v.k)push(c.fluid);});});
   UI_KIT.patch(host.querySelector('[data-pipe-candidates]'),keys.slice(0,20).map(function(k){return'<button class="btn" data-pipe-add="'+esc(k)+'">'+esc(name(k,kind))+'</button>';}).join('')||'<span class="dim">'+(q?'没有匹配的物品／流体':'输入名称搜索')+'</span>');
  }
  function update(){var p=pipe();if(!p||!host.isConnected)return;if(typeof p!=='object')p=f[kind][cell]={};var spec=ENGINE.networks.def(p,kind),cover=PIPE_COVERS.at(p,side),wire=kind==='wire';fit(host,S);var heading=host.closest('.pipe-window')?.querySelector('header h3');if(heading)heading.textContent=(wire?(spec.insulated?'电缆设置':'导线设置'):labels[kind]+'设置');
   host.querySelectorAll('[data-pipe-kind]').forEach(function(n){n.setAttribute('aria-pressed',String(n.dataset.pipeKind===kind));});
   var title=name(p.pipeKey,'item'),info=kind==='item'?spec.slots+' 叠 / '+spec.period+' tick，路由值 '+spec.cost:kind==='fluid'?spec.capacity.toLocaleString()+' mB / 通道，'+spec.channels+' 通道':spec.voltage+' V，'+spec.amperage+' A，损耗 '+spec.loss+' EU / 格';
   if(kind==='fluid'){var fluids=(p.tanks||[]).filter(Boolean);info+='，'+(fluids.length?fluids.map(function(t){return name(t.f,'fluid')+' '+t.mb.toLocaleString()+' mB';}).join('、'):'空管道');}
   var blocked=Object.keys(p.blockedFluids||{}).map(function(k){return name(k,'fluid')+'：'+p.blockedFluids[k];}).join('，');
   UI_KIT.patch(host.querySelector('.pipe-summary'),'<strong>'+esc(title||labels[kind])+'</strong><span>'+esc(info)+'</span>'+(blocked?'<span class="pipe-warning">'+esc(blocked)+'</span>':''));
   var centerKey=p.pipeKey||kind;if(center.dataset.key!==centerKey){center.dataset.key=centerKey;center.innerHTML=p.pipeKey?iconHtml(p.pipeKey,44):labels[kind];}
   host.querySelectorAll('.pipe-face').forEach(function(face,d){face.classList.toggle('selected',side===d);var connected=PIPE_CONNECTIONS.connected(f,kind,cell,d),available=PIPE_CONNECTIONS.target(f,kind,cell,d),link=face.querySelector('[data-pipe-link]'),c=PIPE_COVERS.at(p,d),slot=face.querySelector('.mslot');link.textContent=connected?'已连接':'未连接';link.disabled=!available;link.setAttribute('aria-pressed',String(connected));slot.hidden=wire;slot.dataset.pipeCoverSlot=wire?'':kind;slot.dataset.pipeCell=cell;slot.dataset.pipeBoard=boardId;slot.dataset.pipeMode=c&&c.mode||'import';slot.dataset.tip=names[d]+'侧，'+(c?name(c.k,'item'):'放入覆盖板');var key=c&&c.k||'';if(slot.dataset.key!==key||!slot.hasChildNodes()){slot.dataset.key=key;slot.innerHTML=c?iconHtml(c.k,30):'<span class="mplus">+</span>';if(root.ITEM_DRAG)ITEM_DRAG.refresh(slot);}});
   host.querySelector('.pipe-side-title').textContent=names[side]+'侧，'+(cover?name(cover.k,'item'):'未安装覆盖板');
   host.querySelector('.pipe-cover-config').hidden=wire;
   host.querySelectorAll('[data-pipe-direction]').forEach(function(b){b.disabled=!cover||cover.type==='plate';b.setAttribute('aria-pressed',String(!!cover&&cover.mode===b.dataset.pipeDirection));});
   var opposite=host.querySelector('[data-pipe-opposite]');opposite.checked=!!(cover&&cover.allowOpposite);opposite.disabled=!cover||cover.type==='plate';
   var input=host.querySelector('[data-pipe-input]');input.checked=!((p.disabledInputs||0)&1<<side);input.parentElement.style.visibility=kind==='fluid'?'visible':'hidden';input.disabled=kind!=='fluid';
   host.querySelector('.pipe-plate-gates').style.visibility=cover&&cover.type==='plate'?'visible':'hidden';host.querySelectorAll('[data-pipe-plate]').forEach(function(n){n.checked=!!(cover&&cover[n.dataset.pipePlate]);n.disabled=!cover||cover.type!=='plate';});
   host.querySelector('.pipe-filter').hidden=wire;host.querySelector('[data-pipe-filter-mode]').value=p.filterMode||'whitelist';
   var sig=JSON.stringify([kind,p.filter]);if(sig!==signature){signature=sig;UI_KIT.patch(host.querySelector('[data-pipe-samples]'),(p.filter||[]).map(function(k){return'<button class="btn" data-pipe-remove="'+esc(k)+'">'+esc(name(k,kind))+' ×</button>';}).join('')||'<span class="dim">未设置样本</span>');candidates();}
  }
  host.addEventListener('click',function(e){var n=e.target.closest('[data-pipe-kind],[data-pipe-face],[data-pipe-link],[data-pipe-direction],[data-pipe-add],[data-pipe-remove]');if(!n)return;e.preventDefault();e.stopPropagation();var p=pipe();
   if(n.dataset.pipeKind){kind=n.dataset.pipeKind;update();return;}if(n.dataset.pipeFace!=null){side=+n.dataset.pipeFace;update();return;}
   if(n.dataset.pipeLink!=null){var d=+n.dataset.pipeLink;changed(PIPE_CONNECTIONS.set(S,kind,cell,d,!PIPE_CONNECTIONS.connected(f,kind,cell,d)));return;}
   if(n.dataset.pipeDirection){changed(PIPE_COVERS.configure(p,side,{mode:n.dataset.pipeDirection}));return;}
   var values=p.filter||[];values=n.dataset.pipeAdd?values.concat(n.dataset.pipeAdd):values.filter(function(k){return k!==n.dataset.pipeRemove;});changed(COMMANDS.setPipeFilter(S,kind,cell,values,p.filterMode||'whitelist'));
  });
  host.addEventListener('change',function(e){var p=pipe(),n=e.target;if(n.matches('[data-pipe-filter-mode]'))changed(COMMANDS.setPipeFilter(S,kind,cell,p.filter||[],n.value));else if(n.matches('[data-pipe-opposite]'))changed(PIPE_COVERS.configure(p,side,{allowOpposite:n.checked}));else if(n.matches('[data-pipe-input]'))changed(PIPE_COVERS.setInput(p,side,n.checked));else if(n.dataset.pipePlate){var v={};v[n.dataset.pipePlate]=n.checked;changed(PIPE_COVERS.configure(p,side,v));}});
  host.querySelector('[data-pipe-search]').addEventListener('input',candidates);current={host:host,update:update};update();
 }
 root.PIPE_UI={mount:mount,refresh:function(){if(current&&current.host.isConnected)current.update();else current=null;}};
 if(root.addEventListener)root.addEventListener('resize',function(){root.PIPE_UI.refresh();});
})(typeof window!=='undefined'?window:globalThis);
