/* Presentation for the structure preview, port detail and material lists. */
(function(root){
 'use strict';
 var pageSize=3, previews=new WeakMap(), watched=null;
 var observer=typeof ResizeObserver==='function'?new ResizeObserver(function(entries){
  entries.forEach(function(entry){var view=previews.get(entry.target);if(view)view.draw();});
 }):null;
 var toolbar='<div class="mb-view-tools" data-item-controls="true" aria-label="预览比例">'+
  '<button type="button" class="btn" data-mb-zoom="-1" aria-label="缩小">−</button>'+
  '<button type="button" class="btn" data-mb-zoom="1" aria-label="放大">+</button>'+
  '<button type="button" class="btn" data-mb-zoom="0">看全</button></div>';

 function preview(viewport,layer,tools){
  if(previews.has(viewport))return previews.get(viewport);
  var scale=0,x=0,y=0,fit=1,atFit=true,drag=null,skipClick=false;
  function clamp(n,low,high){return Math.max(low,Math.min(high,n));}
  function align(n,room,used){
   return used<=room-12?(room-used)/2:clamp(n,room-used-6,6);
  }
  function draw(){
   var w=viewport.clientWidth,h=viewport.clientHeight,map=layer.firstElementChild;
   if(!w||!h||!map||!map.offsetWidth||!map.offsetHeight)return;
   fit=Math.min(1,(w-12)/map.offsetWidth,(h-12)/map.offsetHeight);
   scale=atFit?fit:clamp(scale,fit,2);
   x=align(x,w,map.offsetWidth*scale);y=align(y,h,map.offsetHeight*scale);
   var transform='translate('+x+'px,'+y+'px) scale('+scale+')';
   if(layer.style.transform!==transform)layer.style.transform=transform;
   if(tools){
    tools.querySelector('[data-mb-zoom="-1"]').disabled=scale<=fit;
    tools.querySelector('[data-mb-zoom="1"]').disabled=scale>=2;
   }
  }
  function zoom(step,clientX,clientY){
   var box=viewport.getBoundingClientRect(),unit=box.width/viewport.offsetWidth||1;
   var px=clientX==null?viewport.clientWidth/2:(clientX-box.left)/unit-viewport.clientLeft;
   var py=clientY==null?viewport.clientHeight/2:(clientY-box.top)/unit-viewport.clientTop;
   if(!scale)return;
   var next=clamp(scale*Math.pow(1.22,step),fit,2),factor=next/scale;
   x=px-(px-x)*factor;y=py-(py-y)*factor;scale=next;atFit=next===fit;draw();
  }
  function reset(){atFit=true;x=0;y=0;draw();}
  viewport.addEventListener('wheel',function(e){if(!e.deltaY)return;e.preventDefault();e.stopPropagation();zoom(e.deltaY>0?-1:1,e.clientX,e.clientY);},{passive:false});
  viewport.addEventListener('pointerdown',function(e){
   skipClick=false;
   if(drag||!e.isPrimary||e.button!==1&&(e.button!==0||e.target.closest('button,[data-rc-cell],[data-transfer-ref]')))return;
   var rect=viewport.getBoundingClientRect();
   drag={id:e.pointerId,button:e.button,startX:e.clientX,startY:e.clientY,x:x,y:y,unit:rect.width/viewport.offsetWidth||1,moved:false};
   viewport.setPointerCapture(e.pointerId);
   if(e.button===1)e.preventDefault();
  });
  viewport.addEventListener('pointermove',function(e){
   if(!drag||drag.id!==e.pointerId)return;
   var dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
   if(!drag.moved&&Math.hypot(dx,dy)<5)return;
   drag.moved=true;viewport.classList.add('panning');
   x=drag.x+dx/drag.unit;y=drag.y+dy/drag.unit;draw();
  });
  function end(e){
   if(!drag||e.pointerId!==drag.id)return;
   skipClick=drag.button===0&&drag.moved;drag=null;viewport.classList.remove('panning');
  }
  ['pointerup','pointercancel','lostpointercapture'].forEach(function(type){viewport.addEventListener(type,end);});
  viewport.addEventListener('click',function(e){if(!skipClick||!e.detail)return;skipClick=false;e.preventDefault();e.stopPropagation();},true);
  viewport.addEventListener('auxclick',function(e){if(e.button===1)e.preventDefault();});
  if(tools)tools.addEventListener('click',function(e){
   var button=e.target.closest('[data-mb-zoom]');if(!button)return;
   var step=Number(button.dataset.mbZoom);if(step)zoom(step);else reset();
  });
  var view={draw:draw,reset:reset};previews.set(viewport,view);
  if(observer){
   if(watched)observer.unobserve(watched);
   watched=viewport;observer.observe(viewport);
  }
  return view;
 }

 function page(panel,rows){
  var total=Math.max(1,Math.ceil(rows.length/pageSize));
  var n=Math.min(panel._materialPage||0,total-1);panel._materialPage=n;
  var controls=panel.querySelector('.mb-material-nav');
  controls.hidden=total===1;
  if(total>1){
   controls.querySelector('output').textContent=(n+1)+' / '+total;
   controls.firstElementChild.disabled=n===0;
   controls.lastElementChild.disabled=n+1>=total;
  }
  var list=panel.querySelector('.mb-material-list');
  if(panel.hidden!==!rows.length)panel.hidden=!rows.length;
  var html=rows.slice(n*pageSize,(n+1)*pageSize).join('');
  var visibleRows=Math.min(rows.length,pageSize);
  if(list._visibleRows!==visibleRows){
   list._visibleRows=visibleRows;
   list.style.setProperty('--mb-material-rows',visibleRows);
  }
  if(list._pageHtml!==html){UI_KIT.patch(list,html);list._pageHtml=html;}
  panel._materialRows=rows;
 }
 function activatePage(button){
  var panel=button.closest('.mb-material-column');
  if(!panel||button.disabled||!panel._materialRows)return;
  panel._materialPage+=Number(button.dataset.mbPage);page(panel,panel._materialRows);
  if(button.disabled)panel.querySelector('[data-mb-page]:not(:disabled)')?.focus({preventScroll:true});
 }
 function column(label,name){
  return '<section class="mb-material-column '+name+'"><div class="mb-material-head"><span>'+label+'</span>'+
   '<div class="mb-material-nav" data-item-controls="true" hidden><button type="button" class="btn" data-mb-page="-1" aria-label="上一页">‹</button>'+
   '<output></output><button type="button" class="btn" data-mb-page="1" aria-label="下一页">›</button></div></div>'+
   '<div class="mb-material-list"></div></section>';
 }
 function fitDetail(pane){
  var inner=pane.firstElementChild;
  if(!inner||!pane.clientHeight)return;
  inner.style.zoom='';
  var height=pane.clientHeight-10;
  var scale=Math.min(1,height/Math.max(1,inner.scrollHeight));
  if(scale<1)inner.style.zoom=String(Math.floor(scale*100)/100);
 }
 var observedWindow=null,windowFrame=0;
 var windowObserver=typeof ResizeObserver==='function'?new ResizeObserver(scheduleFit):null;
 function scheduleFit(){
  if(!windowFrame)windowFrame=requestAnimationFrame(function(){
   windowFrame=0;
   var view=observedWindow;
   if(!view||!view.body.isConnected||!view.body.clientHeight)return;
   var win=view.win,body=view.body,content=view.content;
   if(view.allowScroll){if(content.style.zoom)content.style.zoom='';return;}
   var height=parseFloat(win.style.maxHeight);
   if(!height)return;
   var css=getComputedStyle(body), frame=getComputedStyle(win);
   var available=height-parseFloat(frame.borderTopWidth)-parseFloat(frame.borderBottomWidth)
    -parseFloat(css.paddingTop)-parseFloat(css.paddingBottom)-2;
   Array.from(win.children).forEach(function(node){if(node!==body)available-=node.offsetHeight;});
   Array.from(body.children).forEach(function(node){if(node!==content&&node.offsetHeight)available-=node.offsetHeight+parseFloat(css.rowGap||0);});
   if(available<=0)return;
   if(content.style.zoom)content.style.zoom='';
   if(content.offsetHeight>available)content.style.zoom=String(Math.floor(100*available/content.offsetHeight)/100);
  });
 }
 function fitWindow(win,allowScroll){
  if(!windowObserver)return;
  if(observedWindow&&observedWindow.win===win){
   if(observedWindow.allowScroll!==allowScroll){observedWindow.allowScroll=allowScroll;scheduleFit();}
   return;
  }
  windowObserver.disconnect();
  var body=win.querySelector('.machine-body'),content=win.querySelector('.mx-operate');
  if(!body||!content)return;
  observedWindow={win:win,body:body,content:content,allowScroll:allowScroll};
  windowObserver.observe(body);windowObserver.observe(content);scheduleFit();
 }
 root.MULTIBLOCK_LAYOUT={preview:preview,toolbar:toolbar,page:page,column:column,activatePage:activatePage,fitDetail:fitDetail,fitWindow:fitWindow};
})(typeof window!=='undefined'?window:globalThis);
