(function(root){
 'use strict';
 var fields={
  energyTier:{label:'能源仓等级',initial:1,choices:[1,2,3,4,5].map(function(t){return[t,DEFS.tagOf(t)];})},
  energyHatches:{label:'能源仓数量',initial:2,choices:[[1,'1 个，2 A'],[2,'2 个，4 A']]},
  coil:{label:'线圈',initial:0,choices:['白铜','坎塔尔','镍铬','TPV合金','HSS-G'].map(function(n,i){return[i,n];})},
  height:{label:'塔高',initial:4,min:3,max:12},
  fluidTier:{label:'蒸汽输出仓等级',initial:1,choices:[1,2,3].map(function(t){return[t,DEFS.tagOf(t)+'，'+8000*Math.pow(2,t)+' mB'];})},
  fluidInputs:{label:'流体输入仓数量',initial:4,choices:[1,2,3,4].map(function(n){return[n,n+' 个'];})},
  fluidOutputs:{label:'流体输出仓数量',initial:4,choices:[1,2,3,4].map(function(n){return[n,n+' 个'];})}
 };
 function mount(host,m,S,save){
  if(root.MULTIBLOCK_UI&&MULTIBLOCKS.managed(m))return MULTIBLOCK_UI.mount(host,m,S,save);
  if(!host)return;var p=STRUCTURES.profile(m);
  if(p&&p.mount)return p.mount(host,m,S,save);
  if(host._structureContext&&host._structureContext.m===m){host._refresh();return;}
  host.innerHTML='';
  if(p){
   var builtin=root.MULTIBLOCK_WINDOW&&MULTIBLOCK_WINDOW.supported(m);
   var variant=Object.assign({},m.buildPlan||{},m.structure&&m.structure.variant||{});
   host._structureContext={m:m,S:S};
   var tag=builtin?'section':'details',heading=builtin?'div':'summary';
   host.innerHTML='<'+tag+' class="structure-panel"><'+heading+' class="legacy-structure-status">结构，'+(m.structure&&m.structure.formed?'已建成':'未建成')+'</'+heading+'><div class="sb-fields"></div><div class="mb-material-zone"><section class="mb-material-column"><div class="mb-material-head">固定</div><div class="sb-parts '+(builtin?'mb-material-list':'mb-materials')+'"></div></section><section class="mb-material-column"><div class="mb-material-head">可更换</div><div class="mb-material-list mb-material-empty">—</div></section></div><button class="btn sb-build">搭建结构</button><p class="dim"></p></'+tag+'>';
   if(builtin&&!(root.SURFACE_IO&&SURFACE_IO.supported(m))){
    var shell=document.createElement('div'),shape=MULTIBLOCKS.bounds(m),unit=34;
    shell.className='mb-interface';shell.innerHTML='<div class="mb-preview"><div class="mb-map-host"><div class="mb-map-layer"><div class="mb-map" style="width:'+(shape.w*unit)+'px;height:'+(shape.h*unit)+'px">'+MULTIBLOCK_UI.bodyHtml(m,unit)+'</div></div></div>'+MULTIBLOCK_LAYOUT.toolbar+'</div><div class="mb-port-pane"></div>';
    host.prepend(shell);
    var viewport=shell.querySelector('.mb-map-host');MULTIBLOCK_LAYOUT.preview(viewport,viewport.firstElementChild,shell.querySelector('.mb-view-tools')).draw();
   }
   (p.fields||[]).forEach(function(key){var spec=fields[key];if(!spec)return;if(variant[key]==null)variant[key]=spec.initial;
    var label=document.createElement('label');label.textContent=spec.label+' ';var control=document.createElement(spec.choices?'select':'input');control.className='sb-'+key;
    if(spec.choices)spec.choices.forEach(function(choice){var o=document.createElement('option');o.value=choice[0];o.textContent=choice[1];control.appendChild(o);});
    else{control.type='number';control.min=spec.min;control.max=spec.max;control.style.width='50px';}control.value=variant[key];
    control.onchange=function(){variant[key]=Math.max(spec.min==null?-Infinity:spec.min,Math.min(spec.max==null?Infinity:spec.max,+control.value));refresh();};label.appendChild(control);host.querySelector('.sb-fields').appendChild(label);
   });
   function refresh(){var plan=STRUCTURES.plan(m,variant),node=host.querySelector('.sb-parts'),next=document.createElement('div');
    var installed=m.structure&&m.structure.installedParts||[],owned=COMMANDS.owned(S);
    plan.parts.forEach(function(part){
     var k=CONTENT.canonicalKey(part.k),count=function(parts){return parts.reduce(function(n,p){return n+(CONTENT.canonicalKey(p.k)===k?p.n:0);},0);};
     var row=document.createElement('div'),icon=document.createElement('span'),name=document.createElement('span'),amount=document.createElement('b');
     row.className='mb-material-row';icon.className='mb-material-icon';icon.innerHTML=root.iconOrText(k,24);
     name.textContent=GD.items[k]||k;amount.textContent=(m.structure?'已装 '+count(installed):'持有 '+count(owned))+' / '+part.n;
     row.append(icon,name,amount);next.appendChild(row);
    });
    if(plan.durationMultiplier){var text=document.createElement('p');text.className='dim';text.textContent='当前线圈工时倍率 ×'+Number(plan.durationMultiplier.toFixed(3));next.appendChild(text);}
    UI_KIT.patch(node,next.innerHTML);
    host.querySelector('.legacy-structure-status').textContent='结构，'+(m.structure&&m.structure.formed?'已建成':'未建成');
   }
   host._refresh=refresh;
   function report(result){
    var msg=({INPUT:'缺少结构材料',OUTPUT:'库存没有回收空间',RUNNING:'等待当前批次完成',CONTENTS:'先取出受影响的内部物品与流体'})[result.code]||result.code;
    if(result.ok){ENGINE.ensure(m);if(root.__fxRepaint)root.__fxRepaint();}
    if(!result.ok&&typeof toastAt==='function')toastAt(null,msg);if(save)save();if(typeof markInv==='function')markInv();
    refresh();
    if(result.ok&&root.FACTORY&&FACTORY.refreshInventory)FACTORY.refreshInventory(S,save);
   }
   if(DEFS.of(m.k).structureProfile==='railcraft_cokeoven')host.querySelector('.dim').textContent='占地3×3，放置的一块加另外25块焦炉砖构成完整炉体；内部物品和杂酚油共用一套槽位。自动出口与覆盖板位于所选方向的外墙中间。';
   if(DEFS.of(m.k).pipeOnly){if(!builtin)host.querySelector('details').open=true;host.querySelector('.dim').textContent='放置的壁板与另外25块共同构成集水器，外侧水管可直接连接。';}
   if(p.showStructure&&!builtin)host.querySelector('details').open=true;if(p.help)host.querySelector('.dim').textContent=p.help;
   host.querySelector('.sb-build').onclick=function(){report(STRUCTURES.fillFixed(S,m,variant));};refresh();
  }
  if(!root.MULTIBLOCKS&&m.k!=='gregtech:gt.blockmachines@1172'){
   var cleanrooms=(S.fx.machines||[]).filter(function(c){return c.k==='gregtech:gt.blockmachines@1172'&&ENTITIES.active(c)&&c.location&&m.location&&c.location.blueprintId===m.location.blueprintId&&c.structure&&c.structure.formed;});
   if(cleanrooms.length){var label=document.createElement('label');label.textContent='所在洁净室 ';var select=document.createElement('select');select.innerHTML='<option value="">未关联</option>'+cleanrooms.map(function(c){return'<option value="'+c.uid+'">'+c.uid+'，'+((c.cleanliness||0)/100)+'%</option>';}).join('');select.value=m.cleanroomUid||'';select.onchange=function(){m.cleanroomUid=select.value;if(save)save();};label.appendChild(select);host.appendChild(label);}
  }
 }
 root.STRUCTURE_UI={mount:mount};
})(typeof window!=='undefined'?window:globalThis);
