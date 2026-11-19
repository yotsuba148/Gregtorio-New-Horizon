/* World facilities use one catalogue and focused, stable secondary panels. */
(function(root){
 'use strict';
 var ctx=null,selection=null,treeView=false;
 function E(s){return esc(s);}function B(label,attr,disabled){return '<button class="btn" '+attr+(disabled?' disabled':'')+'>'+label+'</button>';}
 function icon(k,size){return iconHtml(k,size||32);}function owned(k){return COMMANDS.owned(S,function(key){return key===CONTENT.canonicalKey(k);}).reduce(function(n,o){return n+o.n;},0);}
 var groups=[{id:'bench',name:'工作台',icon:'minecraft:crafting_table@0',sub:'手工合成，3×3配方',unlockOnly:true},{id:'furnace',name:'熔炉',icon:'minecraft:furnace@0',sub:'燃料烧炼，独立运行'},
 {id:'smeltery',name:'匠魂冶炼炉',icon:'TConstruct:Smeltery@0',sub:'熔炼、合金与浇铸'},{id:'wash',name:'河岸炼药锅',icon:'minecraft:cauldron@0',sub:'沿河清洗，占用动作队列'},
 {id:'workshop',catalogueHidden:true,parent:'smeltery',name:'匠魂工具工作站',icon:'TConstruct:ToolStationBlock@0',sub:'模具、部件、装配与修理'},
 {id:'patternchest',catalogueHidden:true,parent:'smeltery',name:'模具箱',icon:'TConstruct:ToolStationBlock@5',sub:'存放匠魂模具'},
 {id:'stencil',catalogueHidden:true,parent:'smeltery',name:'模具加工台',icon:'TConstruct:ToolStationBlock@10',sub:'制作工具模具'},{id:'partbuilder',catalogueHidden:true,parent:'smeltery',name:'部件加工台',icon:'TConstruct:ToolStationBlock@1',sub:'制作工具部件'},
 {id:'toolstation',catalogueHidden:true,parent:'smeltery',name:'工具装配与修理',icon:'TConstruct:ToolStationBlock@0',sub:'装配工具，修复耐久'},{id:'nasa',catalogueHidden:true,name:'NASA工作台',icon:'GalacticraftCore:tile.rocketWorkbench@0',sub:'航天器装配',unlock:'world_nasa'}];
 function machines(id){return(S.fx&&S.fx.machines||[]).filter(function(m){var d=DEFS.of(m.k);return m.location&&m.location.kind==='world'&&m.location.dim===S.ui.dim&&d&&d.recipeMap==='tconstruct:'+id;});}
 function count(g){if(g.id==='workshop')return ['stencil','partbuilder','toolstation'].reduce(function(n,id){return n+machines(id).length;},0);return g.id==='bench'?S.bench:g.id==='furnace'?S.furs.length:g.id==='wash'?RIVER_WASH.ensure(S).pots.length:g.id==='smeltery'?SMELTERY.worldFurnaces(S,S.ui.dim).length:g.id==='nasa'?Number(!!MECHANISMS.stationFor(S,'nasa')):machines(g.id).length;}
 function card(g,n){return '<button class="facility-card" data-wp-open="'+g.id+'">'+icon(g.icon,40)+'<span><b>'+g.name+'</b><small>'+g.sub+'</small></span><em>'+n+(g.id==='wash'?' / 16':'')+'</em><span class="facility-chevron">›</span></button>';}
 function entryFor(id){var g=groups.find(function(entry){return entry.id===id;});if(!g||g.unlock&&!FEATURE_UNLOCKS.isOpen(S,g.unlock))return null;return {id:g.id,name:g.name,icon:g.icon,deployed:!!(g.unlockOnly&&count(g))};}
 function open(title,body,parent){if(FACTORY.isOpen&&FACTORY.isOpen())FACTORY.close();furnaceSelection=null;closeCount();var el=$('#popup');el.hidden=false;el.classList.add('noback');var key=JSON.stringify([ctx&&ctx.view,ctx&&ctx.uid,title,parent]),win=el.querySelector('.wp-window');if(win&&win._worldPanelView===key){var host=win.querySelector('.wp-body'),top=host.scrollTop,winTop=win.scrollTop;UI_KIT.patch(host,body);host.scrollTop=top;win.scrollTop=winTop;}else{el.innerHTML='<div class="box wp-window"><header class="wp-heading">'+(parent?B('‹ 返回','data-wp-open="'+parent+'"'):'')+'<div><h3>'+E(title)+'</h3></div>'+B('关闭','data-popclose="1"')+'</header><div class="wp-body">'+body+'</div></div>';el.firstElementChild._worldPanelView=key;}fit();}
 function addButton(g){return B('＋ 部署','data-wp-add="'+g.id+'"');}
 function openGroup(id){if(id!=='hammer'&&S.ui.dim!=='overworld')return;if(id==='bench'&&S.bench){closePopup();return;}if(id==='hammer')return hammer();if(id==='workshop')id='smeltery';if(['stencil','partbuilder','toolstation','patternchest'].includes(id)){var stations=TINKER_WORKSTATIONS.station(S,id);if(stations.length){ctx={view:'workstation',uid:stations[0].uid};return TINKER_WORKSTATIONS_UI.open(stations[0].uid,S,save);}return choices(id);}selection=null;ctx={view:id};var g=groups.find(function(g){return g.id===id;});if(!g)return;
  if(g.unlock&&!FEATURE_UNLOCKS.isOpen(S,g.unlock))return;
  if(id==='wash'){wash();return;}
  if(id==='nasa'&&count(g)){WORLD_UI.nasa(S);return;}
  var rows='';
  if(id==='bench')rows='<div class="wp-empty">'+icon(g.icon,48)+'<h4>'+(S.bench?'3×3合成已解锁':'部署工作台，解锁3×3合成')+'</h4><p>手工配方统一在合成页使用。</p>'+(!S.bench?B('部署工作台','data-wp-add="bench"'):'')+'</div>';
  else if(id==='furnace')rows=S.furs.map(function(f,i){return '<button class="facility-row facility-entry" data-wp-furnace="'+i+'">'+furnaceIcon(f)+'<span class="facility-description"><b>熔炉 '+(i+1)+'</b><small>'+(f.input?E(nameOf(f.input.k))+' ×'+f.input.n:'等待原料')+(f.out?'，产物 '+f.out.n:'')+'</small></span><span class="facility-chevron">›</span></button>';}).join('');
  else if(id==='smeltery')rows=SMELTERY.worldFurnaces(S,S.ui.dim).map(function(m,i){return entityRow(m,'冶炼炉 '+(i+1));}).join('');
  else rows=machines(id).map(function(m,i){return entityRow(m,g.name+' '+(i+1),id==='toolstation');}).join('');
  if(!rows)rows='<div class="wp-empty">'+icon(g.icon,48)+'<h4>尚未部署'+g.name+'</h4><p>使用库存中的实际方块部署。</p></div>';
  if(id==='smeltery')rows+='<section class="wp-stock"><div class="wp-toolbar"><h4>工具工作站</h4></div><div class="facility-catalogue">'+groups.filter(function(g){return ['stencil','partbuilder','toolstation','patternchest'].includes(g.id);}).map(function(g){return card(g,TINKER_WORKSTATIONS.station(S,g.id).length);}).join('')+'</div></section>';
  open(g.name,(id!=='bench'?'<div class="wp-toolbar"><p>'+g.sub+'，已部署 '+count(g)+'</p>'+addButton(g)+'</div>':'')+'<div class="facility-list">'+rows+'</div>',g.parent||(g.catalogueHidden?'workshop':null));
 }
 function entityRow(m,label,repairable){return '<article class="facility-row facility-device"><button class="facility-entry" data-wp-device="'+m.uid+'">'+icon(m.k,40)+'<span class="facility-description"><b>'+E(label)+'</b><small>'+E(m.status&&m.status.text||'等待操作')+'</small></span><span class="facility-chevron">›</span></button><div class="facility-actions">'+(repairable?B('修理','data-wp-repair="'+m.uid+'"'):'')+B('拆除','data-wp-pack="'+m.uid+'"')+'</div></article>';}
 function choices(id){var g=groups.find(function(g){return g.id===id;}),keys;
  if(id==='patternchest')keys=PATTERN_CHEST.keys;else if(['bench','furnace','smeltery','wash','nasa'].includes(id))keys=[g.icon];else keys=TINKER_TOOLS.definitions.filter(function(d){return d.recipeMap==='tconstruct:'+id;}).map(function(d){return d.key;});
  var stock=COMMANDS.owned(S,function(k){return keys.includes(k);});ctx={view:'add',parent:id};
  open('部署'+g.name,'<p class="wp-note">只列出物品栏和仓库中持有的方块，优先使用物品栏。</p><div class="wp-owned-grid">'+stock.map(function(o){return B(icon(o.k,28)+'<span>'+E(nameOf(o.k))+'<small>物品栏 '+o.bag+'，仓库 '+o.warehouse+'</small></span>','data-wp-place="'+id+'" data-key="'+E(o.k)+'"');}).join('')+(stock.length?'':'<div class="wp-empty">库存中还没有可部署的方块。</div>')+'</div>',g.parent||id);
 }
 function place(id,key){var r;
  if(id==='bench'){if(S.bench)return;var n=S.bench;deployBench();r={ok:S.bench>n};}
  else if(id==='furnace'){var n=S.furs.length;deployFurnace();r={ok:S.furs.length>n};}
  else if(id==='smeltery')r=SMELTERY.deploy(S,S.ui.dim);
  else if(id==='wash')r=RIVER_WASH.add(S);
  else if(id==='nasa')r=MECHANISMS.deployStation(S,'nasa');
  else r=ENTITIES.deploy(S,key,{kind:'world',dim:S.ui.dim});
  report(r,'已部署'+nameOf(key));openGroup(id);
 }
 function report(r,label){if(!r)return;if(r.ok){transferTip(r,label);markInv();markDynamic();save();renderDyn();}else toastAt(null,({INPUT:'库存材料不足',NO_MACHINE:'库存中没有这个方块',LIMIT:'已达到部署上限',QUEUED:'这个活动已在队列中',PLOT:'需要空种植位',GROWTH:'树木还在生长',RESIN:'树脂正在恢复',CONTENTS:'先取出槽位内物品',SLOTS:'所选槽位已满',RECIPE:'这个物品不能在炼药锅中清洗',STATION:'先部署一个炼药锅',RUNNING:'等待当前加工批次完成',UNDAMAGED:'工具无需修理',TOOL:'先放入待修理工具',OUTPUT:'仓库空间不足',LOCATION:'目标已不存在',FLUID_CONTENTS:'先取走炉内剩余流体'})[r.code]||r.code);}
 function returnBar(parent){var box=$('#popup .box');if(!box||box.querySelector('.wp-return'))return;var el=document.createElement('div');el.className='wp-return';el.innerHTML=B('‹ 返回'+(groups.find(function(g){return g.id===parent;})||{name:'世界设施'}).name,'data-wp-open="'+parent+'"');box.prepend(el);}
 function device(uid){var m=ENTITIES.get(S,uid);if(!m)return;if(m.k===SMELTERY.key){ctx={view:'smeltery-controller',uid:uid};return SMELTERY_UI.open(uid,S,save);}if(TINKER_WORKSTATIONS.family(m.k)){ctx={view:'workstation',uid:uid};return TINKER_WORKSTATIONS_UI.open(uid,S,save);}var parent=ctx&&ctx.view||'smeltery';ctx={view:'device',parent:parent,uid:uid};FACTORY.openDetail(uid,S.fx,S,save);returnBar(parent);}
 function washSlot(p,field){var s=p[field],sel=selection&&selection.id===p.id&&selection.field===field;return '<div class="wash-slot-cell"><button class="wash-slot'+(sel?' selected':'')+'" data-wp-wslot="'+p.id+'" data-field="'+field+'" title="'+(s?E(nameOf(s.k)):'')+'">'+(s?icon(s.k,28)+'<span>'+s.n+'</span>':'<span class="slot-placeholder">'+(field==='input'?'+':'产物')+'</span>')+'</button></div>';}

 function potRow(p,i){return '<article class="wash-pot" data-pot="'+p.id+'"><div class="wash-pot-title">'+icon('minecraft:cauldron@0',24)+'<b>'+(i+1)+'</b>'+B('拆除','data-wp-potremove="'+p.id+'"',!!(p.input||p.output||p.progress))+'</div><div class="wash-flow">'+washSlot(p,'input')+'<div class="wash-arrow">→<small data-pot-state="'+p.id+'"></small></div>'+washSlot(p,'output')+'</div><div class="bar"><i data-pot-progress="'+p.id+'"></i></div></article>';}
 function wash(){ctx={view:'wash'};var pots=RIVER_WASH.ensure(S).pots;if(selection&&!pots.some(function(p){return p.id===selection.id;}))selection=null;
  open('河岸炼药锅','<div class="river-vista" aria-hidden="true"><div class="river-water"></div><div class="river-trough"></div><span class="river-caption">沿河洗矿</span></div><div class="wp-toolbar"><div><b>已部署 '+pots.length+' / 16 锅</b><p>每锅 2秒／件，洗矿占用世界动作队列</p></div>'+B('＋ 部署炼药锅','data-wp-place="wash" data-key="minecraft:cauldron@0"',pots.length>=16||!owned('minecraft:cauldron@0'))+'</div><div class="wash-pots">'+pots.map(potRow).join('')+(pots.length?'':'<div class="wp-empty">先部署炼药锅，再放入含杂矿粉或粉碎矿石。</div>')+'</div><div class="wash-command"><span data-wash-queue></span>'+B('洗完这批','data-wp-washgo="once" data-tip="只清洗点击时锅里已有的原料，完成后继续下一项活动"')+B('持续洗矿','data-wp-washgo="repeat" data-tip="持续清洗后来加入的原料，无原料时等待；在活动队列中取消"')+'</div><p class="wp-note">每个槽位最多一组，产物槽满时暂停。</p>');refreshWash(true);
 }
 function refreshWash(force){var win=$('#popup .wp-window');if(!win)return;var pots=RIVER_WASH.ensure(S).pots,host=win.querySelector('.wash-pots');if(!host)return;
  pots.forEach(function(p,i){var row=host.querySelector('[data-pot="'+p.id+'"]'),sig=JSON.stringify([p.input,p.output,selection&&selection.id===p.id?selection:null]);if(row&&(force||row._sig!==sig)&&!countOpen()){var temp=document.createElement('div');temp.innerHTML=potRow(p,i);UI_KIT.sync(row,temp.firstElementChild);row._sig=sig;}
   if(row){var bar=row.querySelector('[data-pot-progress]'),state=row.querySelector('[data-pot-state]'),a=S.act,period=secs(RIVER_WASH.ticksPerItem/20);bar.style.width=Math.min(100,p.progress/period*100)+'%';state.textContent=p.output&&p.output.n>=CORE.maxStack(p.output.k)?'产物已满':!p.input?'待填料':a&&a.type==='riverwash'?'清洗中':'等待队列';}
  });
  var q=ACTION_QUEUE.ensure(S).findIndex(function(a){return a.type==='riverwash';}),qel=win.querySelector('[data-wash-queue]');qel.textContent=q<0?'尚未安排洗矿':q===0?'正在执行洗矿':'排队中，第 '+(q+1)+' 项';
  win.querySelectorAll('[data-wp-washgo]').forEach(function(b){b.disabled=q>=0||!pots.some(function(p){return p.input;});});

 }
 function repair(uid){var m=ENTITIES.get(S,uid);if(!m)return;ctx={view:'workstation',uid:uid};return TINKER_WORKSTATIONS_UI.open(uid,S,save,'repair');}
 function tools(){ctx={view:'tools'};var rows=[];ENTITIES.storage(S).slice(0,1).concat([Object.values(S.tools||{})]).forEach(function(a,box){a.forEach(function(s,i){if(!s||!isTool(s.k))return;var id=box?Object.keys(S.tools).find(function(id){return S.tools[id]===s;}):String(i);rows.push('<article class="facility-row">'+icon(s.k)+'<div><b>'+E(nameOf(s.k))+'</b><small>'+(box?'已装备':'物品栏')+'</small></div>'+B('存入仓库','data-wp-store="'+E(id)+'" data-equipped="'+box+'"')+(box?B('卸下','data-wp-unequip="'+id+'"'):B('装备','data-wp-equip="'+id+'"'))+'</article>');});});open('工具管理',''+rows.join('')+(rows.length?'':'<div class="wp-empty">物品栏和装备栏暂无工具。</div>'));}
 function store(id,equipped){var s=equipped?S.tools[id]:S.inv[+id];if(!s||!isTool(s.k))return;var arr=equipped?[s]:S.inv,index=equipped?0:+id,moved=0;for(var ch of S.chests){var r=CORE.transferSlot({from:CORE.slotBox(arr),index:index,to:CORE.slotBox(ch.slots),n:1});moved+=r.moved;if(!arr[index])break;}if(equipped&&!arr[0])delete S.tools[id];toastAt(null,moved?'工具已存入仓库':'仓库放不下，工具保留原位');markInv();save();tools();}
 function fit(){var el=$('#popup .wp-window');if(el){var wide=ctx&&['wash','repair','hammer'].includes(ctx.view);el.style.width=Math.min(wide?760:560,(window.innerWidth-32)/uiZoom())+'px';el.style.maxHeight=Math.max(180,(window.innerHeight-180)/uiZoom())+'px';}}
 function furnaceIcon(f){return '<img class="ic facility-furnace-face" width="40" height="40" src="modicons/phase82/furnace_'+(FURNACES.state(f).burning?'on':'off')+'.png" alt="'+(FURNACES.state(f).burning?'燃烧中':'未点燃')+'">';}
 function refresh(){fit();document.querySelectorAll('[data-wp-furnace] .facility-furnace-face').forEach(function(img){var f=S.furs[+img.closest('[data-wp-furnace]').dataset.wpFurnace];if(!f)return;var on=FURNACES.state(f).burning,src='modicons/phase82/furnace_'+(on?'on':'off')+'.png';if(img.getAttribute('src')!==src)img.setAttribute('src',src);img.alt=on?'燃烧中':'未点燃';});if(!ctx||$('#popup').hidden)return;if(ctx.view==='wash')refreshWash();if(ctx.view==='device')returnBar(ctx.parent);}
 if(document.addEventListener)document.addEventListener('click',function(e){var t=e.target.closest('[data-wp-open],[data-wp-add],[data-wp-place],[data-wp-furnace],[data-wp-device],[data-wp-pack],[data-wp-wslot],[data-wp-potremove],[data-wp-washgo],[data-wp-tools],[data-wp-store],[data-wp-equip],[data-wp-unequip],[data-wp-repair],[data-wp-repairtool],[data-wp-repairfill],[data-wp-repairgo],[data-wp-repairtake],[data-wp-repairinput]');
  if(!t)return;
  e.stopImmediatePropagation();var d=t.dataset;
  if(d.wpOpen)return openGroup(d.wpOpen);if(d.wpAdd)return choices(d.wpAdd);if(d.wpPlace)return place(d.wpPlace,d.key);
  if(d.wpFurnace!=null){ctx={view:'device',parent:'furnace'};openFurnace(+d.wpFurnace);returnBar('furnace');return;}
  if(d.wpDevice)return device(d.wpDevice);if(d.wpPack){var parent=ctx.view;report(ENTITIES.pack(S,d.wpPack),'拆除设施');return openGroup(parent);}
  if(d.wpWslot)return;

  if(d.wpPotremove){report(RIVER_WASH.remove(S,d.wpPotremove),'拆除炼药锅');return wash();}
  if(d.wpWashgo){report(RIVER_WASH.enqueue(S,d.wpWashgo==='repeat'),'洗矿已加入队列');return refreshWash(true);}
  if(d.wpTools)return tools();if(d.wpStore!=null)return store(d.wpStore,!!+d.equipped);if(d.wpEquip!=null){mountTool(S.inv[+d.wpEquip]);return tools();}if(d.wpUnequip){clickCell('tool',d.wpUnequip);return tools();}
  if(d.wpRepair)return repair(d.wpRepair);
  var m=ctx&&ctx.uid&&ENTITIES.get(S,ctx.uid);if(!m)return;
  if(d.wpRepairgo){var r=TINKER_TOOLS.repair(S,m);report(r,r.ok?'消耗1份材料，恢复 '+r.repaired+' 耐久':'修理');return repair(m.uid);}
 },true);
 root.WORLD_PANELS={choices:choices,entryFor:entryFor,open:openGroup,refresh:refresh,refreshDrag:function(){if(!ctx||$('#popup').hidden)return;if(ctx.view==='repair')repair(ctx.uid);else refresh();},usesInventory:function(){return !!ctx&&['wash','repair'].includes(ctx.view);},close:function(){ctx=null;selection=null;},fieldwork:function(){var el=$('#fieldwork');if(el&&!el.closest('[hidden]'))UI_KIT.patch(el,'<div class="cards">'+cardHtml(icon('gregtech:gt.metatool.01@12',36),'手锤砸矿','使用持有的锻造锤处理原矿','data-wp-open="hammer"','')+'</div>');},hammer:hammer};
 function hammer(){ctx={view:'hammer'};var tool=FIELDWORK.hammer(S),rows=FIELDWORK.available(S,'hammer');open('手锤砸矿','<div class="wp-toolbar"><p>'+(tool?'锻造锤耐久 '+tool.dur.toFixed(1):'需要一把可用的GT锻造锤')+'</p></div><div class="hammer-recipes">'+rows.map(function(r){return '<article class="facility-row">'+icon(r.input)+'<div><b>'+E(nameOf(r.input))+'</b><small>每个 → '+E(nameOf(r.output))+' ×'+r.n+'</small></div>'+B('处理','data-hammer-recipe="'+E(r.id)+'"',!tool)+'</article>';}).join('')+(rows.length?'':'<div class="wp-empty">库存暂无可用手锤处理的原矿。</div>')+'</div>');var body=$('#popup .wp-body');body.onclick=function(e){var b=e.target.closest('[data-hammer-recipe]');if(!b)return;var r=FIELDWORK.recipes[b.dataset.hammerRecipe],h=FIELDWORK.hammer(S),max=Math.min(64,FIELDWORK.count(S,r.input),h?(TOOL_WEAR.preserved(S)?64:Math.ceil(h.dur/2.5)):0);if(!max)return;askCount(b,{max:max,def:1,title:'手锤处理'+nameOf(r.input),action:'处理',icon:r.input},function(n){report(FIELDWORK.execute(S,r.id,n),'处理完成');hammer();});};}

})(typeof window!=='undefined'?window:globalThis);
