(function(root){
 'use strict';
 function esc(s){return String(s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
 function target(bundle,field,i){return '<small>第 '+ORDERED_DISTRIBUTOR.destinationSegment(bundle,field,i)+' 段</small>';}
 var directions=['上','右','下','左'],arrows=['↑','→','↓','←'];
 function nearbyInterfaces(m,S,head,faces){
  var board=m.location.blueprintId,neighbors=new Map(faces.map(function(face){
   return [TRANSPORT_PORTS.near(head.x+','+head.y,face.side),face.side];
  })),result={};
  for(var neighbor of S.fx.machines){
   if(!ENTITIES.isGrid(neighbor)||neighbor.location.blueprintId!==board)continue;
   var side=neighbors.get(neighbor.x+','+neighbor.y);
   if(side==null)continue;
   var spec=AE_DEVICES.spec(neighbor);
   if(spec&&spec.role==='interface'&&spec.fluids){
    result[side]={key:neighbor.k,aligned:neighbor.outFace==null||neighbor.outFace<0||neighbor.outFace===(side+2)%4};
   }
  }
  return result;
 }
 function inletControls(m,side,faces,interfaces){
  var cells=faces.map(function(face){
   var selected=face.side===side;
   var label=arrows[face.side]+' '+directions[face.side],adjacent=interfaces[face.side];
   var hint='接料面朝'+directions[face.side]+(adjacent?' · 有 ME 二合一接口':'');
   return '<button type="button" class="btn'+(selected?' on':'')+'" data-distributor-inlet="'+face.localSide+'" data-direction="'+face.side+'" aria-pressed="'+selected+'" aria-label="'+hint+'">'+label+
    (adjacent?'<span class="distribution-neighbor" aria-hidden="true">'+FACTORY.face(adjacent.key,12)+'</span>':'')+'</button>';
  });
  var bodySide=[0,1,2,3].find(function(direction){return !faces.some(function(face){return face.side===direction;});});
  var neighbor=interfaces[side],otherSides=Object.keys(interfaces).map(function(direction){return directions[direction];}).join('、');
  var hint=neighbor?(neighbor.aligned?'已对准 ME 二合一接口':'将 ME 二合一接口朝向控制器'):
   otherSides?'ME 二合一接口在'+otherSides+'侧':'将 ME 二合一接口贴在接料面';
  return '<div class="distribution-inlet-options"><div class="distribution-compass" role="group" aria-label="接料面">'+cells.join('')+
   '<span class="distribution-controller" data-tip="分料器控制器">'+FACTORY.face(m.k,28)+'</span>'+
   '<span class="distribution-body" data-direction="'+bodySide+'" data-tip="分料器机身">'+FACTORY.face(DISTRIBUTOR_CONTENT.casing,20)+'</span></div>'+
   '<div class="distribution-inlet-status"><strong>接料面朝'+directions[side]+'</strong><span'+(neighbor&&neighbor.aligned?' class="aligned"':'')+'>'+hint+'</span></div></div>';
 }
 function mount(host,m,S,save){
  if(!host)return;
  var b=ORDERED_DISTRIBUTOR.ensure(m).bundle,head=ORDERED_DISTRIBUTOR.head(m),faces=ORDERED_DISTRIBUTOR.inlets(m);
  var interfaces=nearbyInterfaces(m,S,head,faces),waiting=[];
  if(b)for(var i=0;i<Math.max(b.items.length,b.fluids.length);i++){
   if(b.items[i]||b.fluids[i])waiting.push(i);
  }
  var pages=Math.max(1,Math.ceil(waiting.length/2)),page=Math.min(host._distributionPage||0,pages-1);
  host._distributionPage=page;
  var signature=JSON.stringify([m.rotation,head.side,interfaces,b,page]);
  if(host._distribution===signature&&host.firstElementChild)return;host._distribution=signature;
  var controls=inletControls(m,head.side,faces,interfaces);
  host.onclick=function(event){
   var pager=event.target.closest('[data-distributor-page]');
   if(pager&&!pager.disabled){host._distributionPage=page+Number(pager.dataset.distributorPage);mount(host,m,S,save);return;}
   var button=event.target.closest('[data-distributor-inlet]');
   if(!button||button.getAttribute('aria-pressed')==='true'||!ORDERED_DISTRIBUTOR.setInlet(m,Number(button.dataset.distributorInlet)))return;
   if(save)save();mount(host,m,S,save);
  };
  if(!b){UI_KIT.patch(host,controls);return;}
  var rows='';waiting.slice(page*2,page*2+2).forEach(function(i){
   var s=b.items[i],t=b.fluids[i];
   rows+='<div class="distribution-row"><b>'+(i+1)+'</b><span>'+(s?iconHtml(s.k,24)+'<span>'+esc(GD.items[s.k]||s.k)+'</span>'+target(b,'items',i)+'<strong>'+s.n+'</strong>':'—')+'</span><span>'+(t?FLUID_PRESENTATION.html(t.f,24)+'<span>'+esc(FLUID_PRESENTATION.name(t.f))+'</span>'+target(b,'fluids',i)+'<strong>'+t.mb+' mB</strong>':'—')+'</span></div>';
  });
  var nav=pages>1?'<div class="mb-material-nav" data-item-controls="true"><button type="button" class="btn" data-distributor-page="-1" aria-label="上一页"'+(page===0?' disabled':'')+'>‹</button><output>'+(page+1)+' / '+pages+'</output><button type="button" class="btn" data-distributor-page="1" aria-label="下一页"'+(page+1>=pages?' disabled':'')+'>›</button></div>':'';
  UI_KIT.patch(host,controls+'<div class="distribution-heading"><strong>待分发</strong><span>物品</span><span>流体</span></div><div class="distribution-buffer">'+rows+'</div>'+nav);
 }
 var profile=STRUCTURES.profiles.ordered_distributor;
 profile.faceHtml=function(m,id){if(id.split(',')[1]!=='0')return;return '<div class="distribution-inlet">在下方选择接料面</div>';};
 profile.faceHint=function(m,f){var cell=f.id.split(',');return cell[1]==='0'?'控制器外侧':cell[2]==='2'?'此处不安装仓室':'第 '+cell[1]+' 段';};
 ENGINE.behaviors.ordered_distributor.mount=mount;
})(typeof window!=='undefined'?window:globalThis);
