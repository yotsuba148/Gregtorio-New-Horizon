(function(root){
 'use strict';
 var selected=null,names=['上','右','下','左'];
 function toast(message){if(typeof root.toastAt==='function')root.toastAt(null,message);}
 function esc(s){return String(s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
 function selection(uid){return selected&&String(selected.uid)===String(uid)?selected:null;}
 function button(text,action,on){return'<button class="btn'+(on?' on':'')+'" data-io-action="'+action+'" aria-pressed="'+!!on+'">'+text+'</button>';}
 function toggle(text,action,on,title,disabled){return'<button type="button" class="io-toggle" data-io-action="'+action+'" role="switch" aria-checked="'+!!on+'" title="'+(title||text)+'"'+(disabled?' disabled':'')+'><span>'+text+'</span><i class="io-switch-track" aria-hidden="true"></i></button>';}
 function options(d,m,side,generator){
  if(d.noFaceSettings)return '';
  var items=!d.hideIOToggles&&!generator&&d.slots.out>0;
  var fluids=!d.hideIOToggles&&!generator&&!d.hideFluidOutput&&d.canAutoFluidOutput!==false&&d.fluidOutputTanks.length>0;
  var h=items?toggle('物品自动输出','items',m.autoItems):'';
  if(fluids)h+=toggle('流体自动输出','fluids',m.autoFluids);
  if(!d.hideIOToggles&&!generator&&!d.inputOnly)h+=toggle('出口侧输入','allow',m.allowInputFromOutputSide,'允许从出口输入物品和流体');
  if(!d.inputOnly){
   var on=m.outFace===side;
   var text=generator?'设为电力出口':'设为出口';
   h+=toggle(text,'exit',on,on&&!DEFS.canClearOutput(d)?'选择另一面切换出口':text,on&&!DEFS.canClearOutput(d));
  }
  return h;
 }
 function faceHtml(m,definition,side,selectedSide,generator){
  var c=m.covers[side],exit=!definition.noFaceSettings&&!definition.inputOnly&&m.outFace===side;
  var name=names[side]+'侧',outlet=exit?(generator?'，电力出口':'，出口'):'';
  var label=name+(c?'，'+(GD.items[c.k]||c.k):'')+outlet;
  var contents=c?iconHtml(c.k,26):generator&&exit?UI_KIT.glyph('wire',18):'<span class="io-direction" aria-hidden="true"></span>';
  return '<button type="button" class="io-cover-slot io-side-'+side+(selectedSide===side?' selected':'')+(exit?' outlet':'')+
   '" data-io-side="'+side+'"'+(!generator||!exit||c?' data-drag-cover="'+esc(m.uid)+'" data-drag-side="'+side+'"':'')+
   ' aria-pressed="'+(selectedSide===side)+'" aria-label="'+esc(label)+'" data-tip="'+esc(label)+'"><span class="io-cover-item">'+contents+
   '</span>'+(exit?'<i class="io-exit-mark" aria-hidden="true"></i>':'')+'</button>';
 }
 function accepts(k){return MACHINE_COVERS.accepts(k);}
 function finish(host,m,S,save,result){if(result&&!result.ok){toast(({INPUT:'库存没有这块覆盖板',COVER:'这件物品不能作为覆盖板',SIDE:'没有选中覆盖板槽'})[result.code]||result.code);return;}if(result)transfer(result);if(save)save();if(typeof markInv==='function')markInv();FACTORY.openDetail(m.uid,S.fx,S,save);mount(host,m,S,save);}
 function transfer(result){var n=(result.consumed||[]).reduce(function(n,p){return n+p.n;},0),out=(result.produced||[]).reduce(function(n,p){return n+p.toBag+p.toWarehouse;},0);if(n||out||result.discarded)toast((n?'覆盖板已装入':'覆盖板已取出')+(result.discarded?'，丢弃覆盖板 ×'+result.discarded:''));}
 function mount(host,m,S,save){
  if(!host)return;
  var early=DEFS.of(m.k);if(early&&early.ui==='transformer'&&root.TRANSFORMER_UI)return root.TRANSFORMER_UI.mount(host,m,S,save);
  if(root.SURFACE_IO&&SURFACE_IO.supported(m))return SURFACE_IO_UI.mount(host,m,S,save);var definition=DEFS.of(m.k);if(definition.pipeOnly||definition.manualLogistics||definition.supportsCovers===false){host.innerHTML='';return;}MACHINE_COVERS.ensure(m);var generator=definition.generator&&!definition.multiblock;var at=selection(m.uid),sig=JSON.stringify([m.outFace,m.autoItems,m.autoFluids,m.allowInputFromOutputSide,m.covers,at&&at.side,!!m.thermalFault,m.temperature<=100,m.lockFluid,m.lockedFluid,m.voidOverflow,m.voidAll]);if(host._ioSignature===sig)return;host._ioSignature=sig;
  var side=at?at.side:(definition.inputOnly||definition.noFaceSettings?-1:(m.outFace>=0?m.outFace:1));
  var c=at&&m.covers[at.side],toggles=options(definition,m,side,generator);
  var h='<div class="machine-io io-standard'+(toggles?'':' io-faces-only')+'"><div class="io-cross" role="group" aria-label="选择机器一面">'+
   names.map(function(_,i){return faceHtml(m,definition,i,side,generator);}).join('')+
   '<div class="io-machine-face">'+FACTORY.face(m.k,32)+'</div></div>'+
   (toggles?'<div class="io-toggles">'+toggles+'</div>':'')+'</div>';
  if(c&&(c.type==='pump'||c.type==='conveyor'))h+='<div class="io-mode-row"><div class="io-cover-mode" role="group" aria-label="覆盖板方向">'+
   button('输入','import',c.mode==='import')+button('输出','export',c.mode==='export')+'</div>'+
   toggle('允许反向通过','opposite',c.allowOpposite,c.type==='pump'?'允许流体从相反方向通过覆盖板':'允许物品从相反方向通过覆盖板')+'</div>';
  if(root.DIGITAL_TANKS)h+=DIGITAL_TANKS.controls(m);
  if(m.thermalFault)h+='<button class="btn" data-io-action="boilerReset"'+(m.temperature>100?' disabled':'')+'>锅炉冷却复位</button>';
  UI_KIT.patch(host,h);
  function search(e){var input=e.target.closest('[data-tank-fluid]');if(!input)return;FLUID_PICKER.open(input,{preferred:m.tanksIn[0]?[m.tanksIn[0].f]:[],onSelect:function(f){var result=DIGITAL_TANKS.configure(m,'fluid',f);if(!result.ok){toast('先取出罐内的另一种流体');return;}finish(host,m,S,save);}});}
  host.oninput=search;host.onfocusin=function(e){if(e.target.matches('[data-tank-fluid]')){e.target.value='';search(e);}};host.onfocusout=function(e){if(e.target.matches('[data-tank-fluid]'))e.target.value=m.lockedFluid?FLUID_PRESENTATION.name(m.lockedFluid):'';};
  host.onclick=function(e){var node=e.target.closest('[data-io-side],[data-io-action],[data-tank-action]');if(!node)return;e.preventDefault();e.stopPropagation();if(node.dataset.tankAction){var action=node.dataset.tankAction,field={lock:'lockFluid',overflow:'voidOverflow',all:'voidAll'}[action];return finish(host,m,S,save,DIGITAL_TANKS.configure(m,action,!m[field]));}if(node.dataset.ioSide!=null){selected=at&&at.side===+node.dataset.ioSide?null:{uid:m.uid,side:+node.dataset.ioSide};finish(host,m,S,save);return;}
   var action=node.dataset.ioAction,result,current=selection(m.uid);
   if(action==='exit'){
    if(definition.noFaceSettings||definition.inputOnly||side<0)return;
    if(m.outFace===side){if(!DEFS.canClearOutput(definition))return;m.outFace=-1;}
    else{if(generator&&m.covers[side]){toast('先取下这一面的覆盖板');return;}m.outFace=side;}
    selected={uid:m.uid,side:side};
   }else if(action==='items')m.autoItems=!m.autoItems;else if(action==='fluids')m.autoFluids=!m.autoFluids;else if(action==='allow')m.allowInputFromOutputSide=!m.allowInputFromOutputSide;else if(action==='boilerReset'&&m.temperature<=100){m.thermalFault=false;m.hadNoWater=false;}
   else if(current){if(action==='remove')result=MACHINE_COVERS.set(S,m,current.side,null);else if(action==='import'||action==='export')result=MACHINE_COVERS.configure(m,current.side,{mode:action});else if(action==='opposite'&&m.covers[current.side])result=MACHINE_COVERS.configure(m,current.side,{allowOpposite:!m.covers[current.side].allowOpposite});else if(action==='passItems'||action==='passFluids'){var values={};values[action]=!m.covers[current.side][action];result=MACHINE_COVERS.configure(m,current.side,values);}}
   m.auto=!!(m.autoItems||m.autoFluids);finish(host,m,S,save,result);
  };
 }
 root.MACHINE_IO={mount:mount,selection:selection,accepts:accepts,clear:function(){selected=null;if(root.SURFACE_IO_UI)SURFACE_IO_UI.clear();}};
})(typeof window!=='undefined'?window:globalThis);
