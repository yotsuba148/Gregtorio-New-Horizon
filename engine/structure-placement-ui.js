(function(root){
 'use strict';
 function mount(host,opt){
  var win=document.createElement('section');win.className='fx-placement-window';win.hidden=true;win.setAttribute('aria-label','多方块放置设置');
  win.innerHTML='<div class="fx-plan-head"><strong></strong><button type="button" data-plan-cancel aria-label="取消放置">×</button></div><div class="fx-plan-footprint"></div><div class="fx-plan-fields"></div><div class="fx-plan-status" role="status"></div><div class="fx-plan-actions"><button type="button" class="btn fx-plan-confirm" data-plan-confirm>确认放置</button><button type="button" class="btn" data-plan-reposition>重新选位置</button><button type="button" class="btn" data-plan-cancel>取消</button></div>';
  host.appendChild(win);var current=null,preferred=null,manual=null,drag=null;
  win.addEventListener('click',function(e){e.stopPropagation();if(e.target.closest('[data-rotate]'))opt.change('rotation',((current.rotation||0)+Number(e.target.closest('[data-rotate]').dataset.rotate)+4)%4);else if(e.target.closest('[data-plan-cancel]'))opt.cancel();else if(e.target.closest('[data-plan-reposition]'))opt.reposition();else if(e.target.closest('[data-plan-confirm]'))opt.confirm();});
  win.addEventListener('change',function(e){var control=e.target.closest('[data-plan-field]');if(control)opt.change(control.dataset.planField,+control.value);});
  win.addEventListener('contextmenu',function(e){e.preventDefault();e.stopPropagation();});
  win.addEventListener('pointerdown',function(e){if(e.button===2){e.preventDefault();e.stopImmediatePropagation();opt.cancel();}},true);
  var head=win.querySelector('.fx-plan-head');head.addEventListener('pointerdown',function(e){if(e.button!==0||e.target.closest('button'))return;e.preventDefault();e.stopPropagation();drag={x:e.clientX,y:e.clientY,left:parseFloat(win.style.left),top:parseFloat(win.style.top)};head.setPointerCapture(e.pointerId);});
  head.addEventListener('pointermove',function(e){if(!drag)return;var z=opt.zoom();manual={left:drag.left+(e.clientX-drag.x)/z,top:drag.top+(e.clientY-drag.y)/z};position();});
  function endDrag(){drag=null;}head.addEventListener('pointerup',endDrag);head.addEventListener('pointercancel',endDrag);
  function position(){
   if(win.hidden)return;var z=opt.zoom(),view=opt.viewport.getBoundingClientRect(),box=opt.rect(),gap=10,bounds={left:view.left/z+4,top:view.top/z+4,right:view.right/z-4,bottom:view.bottom/z-4};
   win.style.maxWidth=Math.max(150,bounds.right-bounds.left)+'px';
   var top=document.getElementById('top'),screenTop=top?top.getBoundingClientRect().bottom/z+4:4,screenBottom=window.innerHeight/z-4;
   win.style.maxHeight=Math.max(100,screenBottom-screenTop)+'px';var w=win.offsetWidth,h=win.offsetHeight;
   if(h>bounds.bottom-bounds.top){bounds.top=screenTop;bounds.bottom=screenBottom;}
   function clamp(p){return{left:Math.max(bounds.left,Math.min(p.left,bounds.right-w)),top:Math.max(bounds.top,Math.min(p.top,bounds.bottom-h))};}
   var b={left:box.left/z,top:box.top/z,right:box.right/z,bottom:box.bottom/z},options={right:{left:b.right+gap,top:b.top},left:{left:b.left-gap-w,top:b.top},bottom:{left:b.left,top:b.bottom+gap},top:{left:b.left,top:b.top-gap-h}};
   function overlap(p){return Math.max(0,Math.min(p.left+w,b.right)-Math.max(p.left,b.left))*Math.max(0,Math.min(p.top+h,b.bottom)-Math.max(p.top,b.top));}
   var chosen;if(manual){bounds.left=4;bounds.right=window.innerWidth/z-4;chosen=clamp(manual);}else{var sides=preferred?[preferred].concat(Object.keys(options).filter(function(s){return s!==preferred;})):Object.keys(options),score=Infinity;
    sides.forEach(function(side){var p=clamp(options[side]),n=overlap(p);if(n<score){score=n;chosen=p;preferred=side;}});
    if(score>0){bounds.right=window.innerWidth/z-4;sides.forEach(function(side){var p=clamp(options[side]),n=overlap(p);if(n<score){score=n;chosen=p;preferred=side;}});}
   }win.classList.toggle('outside-canvas',chosen.left+w>view.right/z);win.style.left=chosen.left+'px';win.style.top=chosen.top+'px';
  }
  function update(plan,m,result,sourceAvailable){
   if(!plan||plan.phase!=='fixed'){win.hidden=true;current=null;manual=null;preferred=null;return;}
   win.hidden=false;if(current!==plan){current=plan;manual=null;preferred=null;win.querySelector('strong').textContent=opt.name(plan.k);var fields=win.querySelector('.fx-plan-fields');fields.replaceChildren();
    STRUCTURE_PLACEMENT.fields(plan.k).forEach(function(f){if(f.kind==='rotation'){var rotation=document.createElement('div');rotation.innerHTML=UI_KIT.rotation();fields.appendChild(rotation);return;}var label=document.createElement('label');label.appendChild(document.createTextNode(f.label));var select=document.createElement('select');select.dataset.planField=f.key;select.setAttribute('aria-label','放置'+f.label);f.choices.forEach(function(c){var option=document.createElement('option');option.value=c[0];option.textContent=c[1];select.appendChild(option);});label.appendChild(select);fields.appendChild(label);});
   }
   win.querySelectorAll('[data-plan-field]').forEach(function(select){var k=select.dataset.planField,value=k==='rotation'?plan.rotation||0:Object.prototype.hasOwnProperty.call(plan.size,k)?plan.size[k]:plan.variant[k];if(select.value!==String(value))select.value=value;});
   var shape=MULTIBLOCKS.bounds(m);win.querySelector('.fx-plan-footprint').textContent='占地 '+shape.w+' × '+shape.h+' 格';
   win.querySelector('.fx-plan-status').textContent=!sourceAvailable?'代表方块已不在物品栏，请取消后重新选择':result.ok?'位置可用，放置后补齐结构材料':result.code==='BOUNDS'?'结构超出产线边界，请调整或重新选位置':'结构与已有设施重叠，无法放置';
   win.querySelector('.fx-plan-status').classList.toggle('bad',!result.ok||!sourceAvailable);win.querySelector('[data-plan-confirm]').disabled=!result.ok||!sourceAvailable;position();
  }
  return{element:win,update:update,position:position};
 }
 root.STRUCTURE_PLACEMENT_UI={mount:mount};
})(typeof window!=='undefined'?window:globalThis);
