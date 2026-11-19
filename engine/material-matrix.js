(function(root){
 'use strict';
 var active=null,cellSize=64;
 function E(s){return UI_KIT?String(s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];}):s;}
 function stop(){if(!active)return;if(active.observer)active.observer.disconnect();if(active.timer)clearTimeout(active.timer);active=null;}
 function mount(host,data,options){
  var old=active&&active.host===host?{x:active.body.scrollLeft,y:active.body.scrollTop,signature:active.signature}:null;stop();
  var signature=data.columns.map(function(m){return m.id;}).join('|')+'/'+data.rows.map(function(s){return s.id;}).join('|');
  host.innerHTML='<div class="material-matrix" role="grid" aria-label="材料与形态" aria-rowcount="'+(data.rows.length+1)+'" aria-colcount="'+(data.columns.length+1)+'"><div class="matrix-corner"><span>材料 →</span><span>形态 ↓</span></div><div class="matrix-top"><div></div></div><div class="matrix-left"><div></div></div><div class="matrix-scroll"><div class="matrix-space"><div class="matrix-cells"></div></div></div></div>';
  var grid=host.firstElementChild,body=grid.querySelector('.matrix-scroll'),space=grid.querySelector('.matrix-space');space.style.width=data.columns.length*cellSize+'px';space.style.height=data.rows.length*cellSize+'px';
  active={host:host,grid:grid,body:body,data:data,options:options,signature:signature,top:grid.querySelector('.matrix-top>div'),left:grid.querySelector('.matrix-left>div'),cells:grid.querySelector('.matrix-cells'),range:'',timer:null};
  if(old&&old.signature===signature){body.scrollLeft=old.x;body.scrollTop=old.y;}
  var view=active;
  function schedule(){if(view.timer||active!==view)return;view.timer=setTimeout(function(){view.timer=null;paint(view);},0);}
  body.addEventListener('scroll',schedule,{passive:true});
  body.addEventListener('wheel',function(e){if(!e.shiftKey)return;e.preventDefault();body.scrollLeft+=(e.deltaX||e.deltaY)*(e.deltaMode===1?16:e.deltaMode===2?body.clientWidth:1);},{passive:false});
  if(typeof ResizeObserver!=='undefined'){view.observer=new ResizeObserver(schedule);view.observer.observe(body);}
  grid.querySelectorAll('.matrix-top,.matrix-left').forEach(function(axis){axis.addEventListener('wheel',function(e){e.preventDefault();if(axis.classList.contains('matrix-top')||e.shiftKey)body.scrollLeft+=e.deltaX||e.deltaY;else body.scrollTop+=e.deltaY;},{passive:false});});
  body.addEventListener('pointermove',function(e){var el=e.target.closest('.matrix-slot');grid.querySelectorAll('.matrix-focus').forEach(function(n){n.classList.remove('matrix-focus');});if(el){var col=grid.querySelector('[data-matrix-col="'+el.dataset.col+'"]'),row=grid.querySelector('[data-matrix-row="'+el.dataset.row+'"]');if(col)col.classList.add('matrix-focus');if(row)row.classList.add('matrix-focus');}});
  body.addEventListener('pointerleave',function(){grid.querySelectorAll('.matrix-focus').forEach(function(n){n.classList.remove('matrix-focus');});});
  grid.addEventListener('contextmenu',function(e){if(e.target.closest('.matrix-top,.matrix-left,.matrix-corner'))e.stopPropagation();});
  paint(view);
 }
 function paint(v){
  if(active!==v||!v.host.isConnected)return;var d=v.data,x=v.body.scrollLeft,y=v.body.scrollTop,c0=Math.max(0,Math.floor(x/cellSize)-1),r0=Math.max(0,Math.floor(y/cellSize)-1),c1=Math.min(d.columns.length,Math.ceil((x+v.body.clientWidth)/cellSize)+1),r1=Math.min(d.rows.length,Math.ceil((y+v.body.clientHeight)/cellSize)+1),range=[c0,c1,r0,r1].join(':');
  v.top.style.transform='translateX('+(-x)+'px)';v.left.style.transform='translateY('+(-y)+'px)';
  if(v.range===range)return;v.range=range;
  var top='',left='',cells='';
  for(var c=c0;c<c1;c++){var m=d.columns[c];top+='<div class="matrix-axis" role="columnheader" data-matrix-col="'+c+'" style="left:'+c*cellSize+'px" title="'+E(m.name)+'">'+v.options.icon(m.key,30)+'<span>'+E(m.name)+'</span></div>';}
  for(var r=r0;r<r1;r++){var s=d.rows[r];left+='<div class="matrix-axis" role="rowheader" data-matrix-row="'+r+'" style="top:'+r*cellSize+'px" title="'+E(s.name)+'"><img src="'+E(s.outline)+'" width="30" height="30" alt=""><span>'+E(s.name)+'</span></div>';for(var c=c0;c<c1;c++){var key=d.cells.get(s.id+'|'+d.columns[c].id);cells+='<div class="matrix-slot" role="gridcell" data-col="'+c+'" data-row="'+r+'" aria-colindex="'+(c+2)+'" aria-rowindex="'+(r+2)+'" style="left:'+c*cellSize+'px;top:'+r*cellSize+'px">'+(key&&d.allowed.has(key)?v.options.cell(key):'')+'</div>';}}
  v.top.innerHTML=top;v.left.innerHTML=left;v.cells.innerHTML=cells;
 }
 root.MATERIAL_MATRIX={mount:mount,clear:stop};
})(typeof window!=='undefined'?window:globalThis);
