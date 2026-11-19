(function(root){
 'use strict';
 var opened=null,C=SHARED_CARGO;
 function esc(s){return String(s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
 function ref(r){return ' data-transfer-ref="'+esc(JSON.stringify(r))+'"';}
 function fluidRef(m){return {type:'cargoFluid',uid:m.uid,channel:m.cargoChannel};}
 function open(m,S,save){
  FACTORY.close();
  var popup=document.getElementById('popup');
  opened={uid:m.uid,state:S,save:save};
  popup.hidden=false;popup.classList.add('noback');
  popup.innerHTML='<div class="box mxwin machine-window shared-cargo-window" data-item-controls><h3 class="machine-heading">'+iconHtml(m.k,28)+'<span>'+nameOf(m.k)+'</span></h3><div class="machine-body"><form class="cargo-channel"><label>频道<input aria-label="频道" name="channel" type="text" maxlength="48" autocomplete="off" placeholder="输入频道名"></label><button type="submit" class="btn">连接</button></form><div class="cargo-stock"></div></div><div class="foot"><button class="btn" data-popclose="1">关闭</button></div></div>';
  var form=popup.querySelector('form'),input=form.elements.channel;
  input.value=m.cargoChannel||'';
  form.onsubmit=function(e){e.preventDefault();if(!ITEM_DRAG.returnHeld())return;C.bind(S,m,input.value);input.value=m.cargoChannel||'';save();refresh();};
  FACTORY.mountMove(popup.querySelector('.foot'),m,S,save);
  refresh();
 }
 function refresh(){
  if(!opened)return;
  var popup=document.getElementById('popup'),box=!popup.hidden&&popup.querySelector('.shared-cargo-window');
  if(!box){opened=null;return;}
  var m=ENTITIES.get(opened.state,opened.uid);
  if(!m||!ENTITIES.isGrid(m)){FACTORY.close();opened=null;return;}
  FACTORY.positionWindow(m,popup,DEFS.of(m.k));
  var host=box.querySelector('.cargo-stock'),channel=m.cargoChannel,store=C.stock(opened.state,channel);
  var sig=JSON.stringify([channel,store]);if(host._cargoSignature===sig)return;host._cargoSignature=sig;
  if(!store){UI_KIT.patch(host,'<div class="cargo-offline">输入频道名即可连接货箱</div>');return;}
  var tank=store.tanks[0],title=tank?FLUID_PRESENTATION.name(tank.f):'空';
  var items=store.slots.map(function(item,i){
   var label=item?nameOf(item.k):'物品槽 '+(i+1);
   return '<button type="button" class="line-storage-slot"'+ref({type:'cargoItem',channel:channel,index:i})+
    ' aria-label="'+esc(label)+'" data-tip="'+esc(label)+'"'+(item?' data-lookup-key="'+esc(item.k)+'"':'')+'>'+
    (item?iconHtml(item.k,28)+(item.n>1?'<b>'+item.n+'</b>':''):'<span>+</span>')+'</button>';
  }).join('');
  UI_KIT.patch(host,'<div class="cargo-contents"><div class="line-storage-grid" style="--storage-columns:5">'+items+
   '</div><div class="cargo-tank"><button type="button" class="line-storage-slot"'+ref(fluidRef(m))+
   ' aria-label="流体槽" data-tip="'+esc(title)+'">'+(tank?FLUID_PRESENTATION.html(tank.f,28):'≈')+
   '</button><div><strong>'+esc(title)+'</strong><div class="cargo-volume">'+ (tank?tank.mb.toLocaleString():'0')+' / '+C.capacity.toLocaleString()+' mB</div></div></div></div>');
 }
 function targets(r,S){
  if(!opened||opened.state!==S||r.type!=='bag'||!document.querySelector('#popup:not([hidden]) .shared-cargo-window'))return;
  var m=ENTITIES.get(S,opened.uid),store=m&&C.stock(S,m.cargoChannel);
  if(!store)return [];
  var endpoint=ITEM_TRANSFER.endpoint(S,r),item=endpoint&&endpoint.get();
  if(!item)return [];
  var k=CONTENT.canonicalKey(item.k),dynamic=FLUID_CONTAINER_ITEMS.inspect(S,item);
  if(dynamic||GD.containerRegistry.some(function(p){return p.filled===k||p.empty===k&&store.tanks[0]&&p.fluid===store.tanks[0].f;}))return [fluidRef(m)];
  return store.slots.map(function(_,i){return {type:'cargoItem',channel:m.cargoChannel,index:i};});
 }
 root.SHARED_CARGO_UI={open:open,refresh:refresh,targets:targets};
})(window);
