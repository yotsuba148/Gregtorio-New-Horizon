(function(root){
 'use strict';
 var queueOpen=false,selected=null,discoveryOpen=null;
 let mapActionsHtml;
 function button(label,attrs,disabled){return '<button class="btn" '+attrs+(disabled?' disabled':'')+'>'+label+'</button>';}
 function actionTile(key,label,icon,attributes,deployed=false){
  const tag=deployed?'div':'button type="button"';
  return '<'+tag+' class="world-action-tile" data-ui-key="'+esc(key)+'" '+attributes+'>'
   +'<span aria-hidden="true">'+iconHtml(icon,30)+'</span><span>'+esc(label)+'</span>'
   +(deployed?'</div>':'</button>');
 }
 function sourceTile(S,s){return actionTile('source:'+s.id,s.name,s.icon||s.out?.[0]?.[0]||'@dim/'+S.ui.dim,'data-psrc="'+esc(s.id)+'"');}
 function actionLink(id,label,icon,attributes){return actionTile('link:'+id,label,icon,attributes);}
 function facilityTile(entry){
  return actionTile('facility:'+entry.id,entry.name,entry.icon,entry.deployed
   ?'data-facility-unlock="'+esc(entry.id)+'"'
   :'data-wp-open="'+esc(entry.id)+'"',entry.deployed);
 }
 function tileList(html){return '<div class="world-action-tiles">'+html+'</div>';}
 function mapLink(S,id){
  switch(id){
   case 'veins': return DIMENSIONS.hasVeins(S.ui.dim)?actionLink(id,'寻找矿脉','minecraft:iron_ore@0','data-discovery="veins"'):'';
   case 'oil': return actionLink(id,'油泉','gregtech:gt.blockmachines@1140','data-discovery="oil"');
   case 'hammer': return actionLink(id,'手锤砸矿','gregtech:gt.metatool.01@12','data-wp-open="hammer"');
   case 'legacy-villages':
    return WORLD_DISCOVERY.villages(S).found.length?actionLink(id,'已找到的村庄','minecraft:carrot@0','data-discovery="villages"'):'';
   case 'slime': return discoveryLink(id,'slime_island_search');
   case 'end':
    if(!TRAVEL.can(S,id)){
     if(!TRAVEL.ensure(S).discoveries.stronghold)return discoveryLink(id,'locate_stronghold');
     return actionLink(id,'激活末地门','minecraft:end_portal_frame@0','data-discovery="travel:end"');
    }
    return actionLink(id,'前往末地','@dim/end','data-dimtab="end"');
   case 'nether': case 'twilight': {
    const open=TRAVEL.can(S,id),name=TRAVEL.definitions[id].name;
    return actionLink(id,open?'前往'+name:'开通'+name,'@dim/'+id,open?'data-dimtab="'+id+'"':'data-discovery="travel:'+id+'"');
   }
   case 'processing': return WORLD_MAP_CONTENT.processing(S.ui.dim).map(s=>sourceTile(S,s)).join('');
   default: return '';
  }
 }
 function discoveryLink(id,sourceId){
  const activity=ACTIVITIES.definitions[sourceId];
  return activity?actionLink(id,activity.name,activity.icon||'@dim/'+S.ui.dim,'data-discovery="'+esc(sourceId)+'"'):'';
 }
 function renderMapActions(S,region){
  const entries=WORLD_MAP_CONTENT.get(S.ui.dim,region.id);
  const facilities=entries.facilities.map(WORLD_PANELS.entryFor).filter(Boolean).map(facilityTile).join('');
  const sources=entries.sources.filter(source=>{
   if(WORLD_SCENES.groupOf(source)!=='processing'||!source.conditions?.ownedItemId)return true;
   return COMMANDS.owned(S,key=>CONTENT.item(key)?.id===source.conditions.ownedItemId).length>0;
  });
  const actions=$('#actions'),location=S.ui.dim+':'+region.id,title=$('#world-region-title');
  if(title.textContent!==region.name)title.textContent=region.name;
  const html=tileList(facilities+sources.map(source=>sourceTile(S,source)).join('')
   +entries.links.map(id=>mapLink(S,id)).join(''));
  if(mapActionsHtml!==html){
   UI_KIT.patch(actions,html);
   mapActionsHtml=html;
  }
  if(actions.dataset.location!==location){
   actions.dataset.location=location;
   actions.scrollTop=0;
  }
 }
 function render(S){
  renderDimTabs();
  const canOpen=DIMENSIONS.open(S,S.ui.dim);
  const map=WORLD_MAP_UI.render(S,canOpen,()=>{
   if(S.ui.pick&&!S.ui.pick.popup)S.ui.pick=null;
   renderSlot();
  });
  const fieldwork=$('#world-fieldwork');
  const fieldworkHidden=!!map||!canOpen;
  if(fieldwork&&fieldwork.hidden!==fieldworkHidden)fieldwork.hidden=fieldworkHidden;
  if(map){if(map.region)renderMapActions(S,map.region);WORLD_MAP_UI.refreshArt(S,env('overworld',true));return;}
  mapActionsHtml=undefined;
  if(!canOpen){TRAVEL_UI.render($('#actions'),S,save);return;}
  var all=GD.sources.filter(inDim),resource=all.filter(function(s){return !['exploration','processing','veinSources'].includes(WORLD_SCENES.groupOf(s));}),groups=Array.from(new Set(resource.map(WORLD_SCENES.groupOf))),order=['forest','cave','river','pasture','meadow','smallOres','wilds','nether','fortress','adventure'];groups.sort(function(a,b){var x=order.indexOf(a),y=order.indexOf(b);return(x<0?99:x)-(y<0?99:y);});
  if(!groups.includes(S.ui.worldScene))S.ui.worldScene=groups[0];
  var h='<h3 class="sub">资源采集</h3><div class="world-scenes">'+groups.map(function(id){return '<button class="btn'+(S.ui.worldScene===id?' on':'')+'" data-worldscene="'+id+'">'+UI_KIT.glyph(({forest:'tree',cave:'cave',river:'river',pasture:'grass',wilds:'sword',meadow:'flower',adventure:'flag',smallOres:'ore',nether:'flask',fortress:'home'})[id]||'leaf')+'<span>'+esc(WORLD_SCENES.names[id]||id)+'</span>'+'</button>';}).join('')+'</div>'+tileList(resource.filter(s=>WORLD_SCENES.groupOf(s)===S.ui.worldScene).map(s=>sourceTile(S,s)).join(''));
  const exploration=mapLink(S,'veins')+all.filter(s=>WORLD_SCENES.groupOf(s)==='exploration')
   .map(s=>discoveryLink(s.id,s.id)).join('');
  if(exploration)h+='<h3 class="sub">探索发现</h3>'+tileList(exploration);
  const processing=mapLink(S,'processing');
  if(processing)h+='<details class="world-extra"><summary>就地转化</summary>'+tileList(processing)+'</details>';
  UI_KIT.patch($('#actions'),h);
 }
 function popup(title,body){var box=$('#popup');if(FACTORY.isOpen&&FACTORY.isOpen())FACTORY.close();box.hidden=false;box.classList.add('noback');var win=box.querySelector('.world-discovery'),view=discoveryOpen||title;if(win&&win._worldView===view){var host=win.querySelector('.discovery-body'),top=win.scrollTop,bodyTop=host.scrollTop;win.querySelector('h3').textContent=title;if(host._html!==body){UI_KIT.patch(host,body);host._html=body;}win.scrollTop=top;host.scrollTop=bodyTop;}else{box.innerHTML='<div class="box world-discovery"><header class="wp-heading"><div><h3>'+esc(title)+'</h3></div>'+button('关闭','data-popclose="1"')+'</header><div class="discovery-body">'+body+'</div></div>';win=box.firstElementChild;win._worldView=view;win.querySelector('.discovery-body')._html=body;}var zoom=uiZoom(),top=document.getElementById('top').getBoundingClientRect().bottom+8,bottom=Math.max(top+160,Math.min(window.innerHeight-8,document.getElementById('bottom').getBoundingClientRect().top-8));box.style.setProperty('--world-area-top',top/zoom+'px');box.style.setProperty('--world-area-bottom',(window.innerHeight-bottom)/zoom+'px');win.style.width=Math.min(620,(window.innerWidth-32)/zoom)+'px';win.style.maxHeight=Math.floor((bottom-top)/zoom)+'px';}
 function discovery(S,id){discoveryOpen=id;
  if(id==='slime_island_search'){openPicker('gather',id,ACTIVITIES.definitions[id].name);return;}
  if(id==='ruins'){popup('寻找遗迹','<p class="dim">遗迹探索与 LootGames 小游戏尚未开放。</p>');return;}
  if(id.startsWith('travel:')){var target=id.slice(7),d=TRAVEL.definitions[target];if(!d||TRAVEL.can(S,target))return;popup(target==='end'?'激活末地门':'开通'+d.name,'<div class="travel-popup-host"></div>');TRAVEL_UI.render(document.querySelector('.travel-popup-host'),S,save,target);return;}
  if(id.startsWith('vein:')){var uid=id.slice(5),v=WORLD_DISCOVERY.veins(S,S.ui.dim).find(function(v){return v.id===uid;});if(!v){discovery(S,'veins');return;}var stock=MINING.ensureVein(v);if(!S.ui.pick||S.ui.pick.id!==uid)openPicker('mine',uid,'采掘'+v.name);S.ui.pick.popup=true;
   var rows=MINING.oreKinds(v).map(function(o){var off=MINING.excluded(v,o.key),level=MINING.level(o.key);return '<div class="vein-ore'+(off?' excluded':'')+'">'+iconHtml(o.key,28)+'<span class="vein-ore-label">'+esc(nameOf(o.key))+'<small>挖掘等级 '+(level==null?'未知':level)+(level!=null&&!MINING.findPick(S,level)?'，当前工具不足':'')+'</small></span><b>'+esc(stock[o.key])+'</b>'+button(off?'恢复采集':'排除此矿','data-vein-filter="'+esc(uid)+'" data-ore-key="'+esc(o.key)+'" aria-pressed="'+off+'"')+'</div>';}).join('');
   popup(v.name,button('← 矿脉列表','data-discovery="veins"')+'<p class="dim">可采 '+MINING.remaining(v)+' 块，矿脉剩余 '+esc(v.left)+' 块</p><div class="vein-ores">'+rows+'</div>'+pickerHtml(S.ui.pick).replace('data-gostart="1"','data-vein-start="1"').replace('data-pkcancel="1"','data-discovery="veins"'));
   document.querySelectorAll('.world-discovery [data-num],.world-discovery [data-range]').forEach(function(input){input.value=String(S.ui.pick.n);});return;
  }
  if(id.startsWith('loot:')){var uid=id.slice(5),v=WORLD_DISCOVERY.villages(S).found.find(function(v){return v.id===uid;});if(!v){discovery(S,'villages');return;}popup(v.name+'，搜刮黑名单',button('← 村庄列表','data-discovery="villages"')+'<p class="dim">选中表示排除。只过滤原本掷出的奖励，不会补抽其他物品。</p><div class="loot-filter-grid">'+WORLD_DISCOVERY.lootPool().map(function(k){var off=(v.blacklist||[]).includes(k);return button(iconHtml(k,24)+esc(nameOf(k)),'data-loot-filter="'+esc(uid)+'" data-loot-key="'+esc(k)+'" aria-pressed="'+off+'"');}).join('')+'</div>');return;}
  if(id==='villages'){
   var v=WORLD_DISCOVERY.villages(S).found;
   const queued=new Set(ACTION_QUEUE.ensure(S).filter(a=>a.src==='village_plunder').map(a=>a.siteId));
   popup('已找到的村庄','<div class="discovery-list">'+v.map(function(f){return '<div class="discovery-row"><b>'+esc(f.name)+'</b><span class="spacer"></span>'+button('黑名单','data-village-filter="'+esc(f.id)+'"')+button(queued.has(f.id)?'已安排':'搜刮','data-village-loot="'+esc(f.id)+'"',queued.has(f.id))+button('放弃','data-village-abandon="'+esc(f.id)+'"')+'</div>';}).join('')+(v.length?'':'<p class="dim">已收集完毕。</p>')+'</div>');return;
  }
  if(id==='veins'){
   var list=WORLD_DISCOVERY.veins(S,S.ui.dim);
   popup('矿脉，当前共 '+list.length+' / '+WORLD_DISCOVERY.limit,button('寻找矿脉','data-discovery-search="veins"',!WORLD_DISCOVERY.discoveryRoom(S,'veins',S.ui.dim))+'<div class="discovery-list">'+list.map(function(v){var uid=WORLD_DISCOVERY.veinId(S,v);return '<div class="discovery-row"><div class="orestack">'+v.ores.map(function(o){return iconHtml(o.key,24);}).join('')+'</div><div class="discovery-description"><b>'+esc(v.name)+'</b><small>'+v.ores.map(function(o){return esc(nameOf(o.key));}).join('、')+'，剩余 '+esc(v.left)+'</small></div>'+button('采掘','data-vein-mine="'+esc(uid)+'"')+button('放弃','data-vein-abandon="'+esc(uid)+'"')+'</div>';}).join('')+(list.length?'':'<p class="dim">本维度尚未发现矿脉。</p>')+'</div>');return;
  }
  if(id==='oil'){
   var fields=PUMPS.ensure(S).fields.filter(function(f){return f.type==='oil';});popup('油泉',button('寻找油泉','data-discovery-search="find_liquid_oil"',fields.length>=16)+'<div class="discovery-list">'+fields.map(function(f){return '<article class="discovery-row oil-row"><div class="discovery-description"><b>'+esc(f.name)+'</b><small>'+esc(f.remaining.toLocaleString())+' / '+esc(f.initial.toLocaleString())+' mB</small></div><div class="discovery-actions">'+button('设备与储油','data-oil-field="'+esc(f.id)+'"')+button('放弃','data-oil-abandon="'+esc(f.id)+'"')+'</div></article>';}).join('')+(fields.length?'':'<p class="dim">尚未找到油泉。</p>')+'</div>');return;
  }
  var d=ACTIVITIES.definitions[id];if(d){var detail=id==='locate_stronghold'?'<p>需要持有末影之眼。</p>':'';popup(d.name,(d.outputDescription?'<p class="dim">'+esc(d.outputDescription)+'</p>':'')+detail+button('安排寻找','data-discovery-search="'+id+'"'));}
 }
 function oilField(S,id){var f=PUMPS.field(S,id);if(!f)return;discoveryOpen='field:'+id;
  popup(f.name,'<div class="site-setup"></div>');var host=document.querySelector('#popup .site-setup'),win=host.closest('.world-discovery');win.style.width=Math.min(740,(window.innerWidth-32)/uiZoom())+'px';WORLD_SITES_UI.mount(host,S,id,save);
 }
 function nasa(S){SPACE_UI.openNasa();}
 function queue(S){var list=ACTION_QUEUE.ensure(S),host=document.getElementById('action-queue-popover');if(!host){host=document.createElement('div');host.id='action-queue-popover';document.body.appendChild(host);}host.hidden=!queueOpen;if(!queueOpen)return;
  if(!list.some(function(a){return a.queueId===selected;}))selected=list[0]&&list[0].queueId;
  host.innerHTML='<h3>动作队列 <small>'+list.length+' 项</small></h3>'+list.map(function(a,i){var id=esc(a.queueId),progress=a.repeat?'持续挂机':a.type==='mine'?(a.done||0)+' / '+a.target+' 块':(a.done||0)+' / '+(a.target||a.cycles||1);return '<div class="queue-row'+(selected===a.queueId?' selected':'')+'"><button class="queue-select" data-queue-select="'+id+'"><b>'+esc(actName(a))+'</b><small>'+(i===0?'进行中':'等待')+'，'+esc(progress)+(a.blocked?'，'+esc(actFrac(a,0).txt):'')+'</small></button>'+(selected===a.queueId?'<div class="queue-controls">'+button('前移','data-queue-move="'+id+'" data-queue-delta="-1"',i===0)+button('后移','data-queue-move="'+id+'" data-queue-delta="1"',i===list.length-1)+button('取消','data-queue-cancel="'+id+'"')+'</div>':'')+'</div>';}).join('')+(list.length?'':'<p class="dim">队列为空。</p>');
 }
 function queueButton(S){var n=ACTION_QUEUE.ensure(S).length;return n?button('队列 '+n+' ▾','data-queue-toggle="1"'):'';}
 if(typeof document.addEventListener==='function'){document.addEventListener('click',function(e){if(e.target.closest('.world-discovery [data-psrc]'))closePopup();var t=e.target.closest('[data-vein-start],[data-vein-filter],[data-village-filter],[data-loot-filter],[data-discovery],[data-discovery-search],[data-village-loot],[data-village-abandon],[data-vein-mine],[data-vein-abandon],[data-oil-field],[data-oil-abandon],[data-site-install],[data-site-remove],[data-world-device],[data-queue-toggle],[data-queue-select],[data-queue-move],[data-queue-cancel],[data-tool-store],[data-craft-more],[data-nasa-open],[data-nasa-make]');if(!t)return;e.stopImmediatePropagation();var d=t.dataset;if(!Object.keys(d).some(k=>k.startsWith('queue'))&&queueOpen){queueOpen=false;queue(S);}
  if(d.nasaOpen){nasa(S);return;}
  if(d.nasaMake){var recipe=GD.craft.find(r=>r.id===d.nasaMake&&r.station==='nasa');if(recipe){make(recipe,1);markInv();save();nasa(S);}return;}
  if(d.veinFilter){var v=S.veins.find(function(v){return v.id===d.veinFilter;});if(v){var p=S.ui.pick,all=p&&p.type==='mine'&&p.id===v.id&&p.n===MINING.remaining(v);MINING.setExcluded(S,v,d.oreKey,!MINING.excluded(v,d.oreKey));if(all)p.n=MINING.remaining(v);discovery(S,'vein:'+v.id);markDynamic();save();}return;}
  if(d.veinStart){pickerGo();discovery(S,'veins');renderDyn();return;}
  if(d.veinStart){pickerGo();discovery(S,'veins');renderDyn();return;}
  if(d.veinSurvey){var pick={type:'explore',id:'explore',name:'寻找矿脉',dim:d.veinSurvey,n:4};S.ui.pick=pick;var html=pickerHtml(pick).replace('data-gostart="1"','data-survey-start="1"').replace('data-pkcancel="1"','data-discovery="veins" data-discovery-dim="'+d.veinSurvey+'"');popup('寻找矿脉',html);document.querySelectorAll('.world-discovery [data-num],.world-discovery [data-range]').forEach(function(i){i.value=String(S.ui.pick.n);});return;}
  if(d.surveyStart){pickerGo();discovery(S,'veins',d.discoveryDim);renderDyn();return;}
  if(d.villageFilter){discovery(S,'loot:'+d.villageFilter);return;}
  if(d.lootFilter){var v=WORLD_DISCOVERY.villages(S).found.find(function(v){return v.id===d.lootFilter;});if(v){WORLD_DISCOVERY.setLootExcluded(S,v.id,d.lootKey,!(v.blacklist||[]).includes(d.lootKey));discovery(S,'loot:'+v.id);save();}return;}
  if(d.discovery){if(d.discovery==='veins'&&S.ui.pick&&S.ui.pick.popup)S.ui.pick=null;discovery(S,d.discovery);markDynamic();return;}
  if(d.discoverySearch){var id=d.discoverySearch;if(id==='village_search')return;closePopup();openPicker(id==='veins'?'explore':'gather',id==='veins'?'explore':id,id==='veins'?'寻找矿脉':ACTIVITIES.definitions[id].name);renderDyn();return;}
  if(d.villageLoot){if(WORLD_DISCOVERY.villages(S).found.some(v=>v.id===d.villageLoot)&&!ACTION_QUEUE.ensure(S).some(function(a){return a.siteId===d.villageLoot;})){startAct({type:'gather',src:'village_plunder',siteId:d.villageLoot,target:1,done:0,prog:0});toastAt(null,'搜刮已加入队列');}discovery(S,'villages');save();return;}
  if(d.villageAbandon){WORLD_DISCOVERY.abandonVillage(S,d.villageAbandon);discovery(S,'villages');markDynamic();save();return;}
  if(d.veinMine){discovery(S,'vein:'+d.veinMine);renderDyn();return;}
  if(d.veinAbandon){WORLD_DISCOVERY.abandonVein(S,d.veinAbandon);discovery(S,'veins');markDynamic();save();return;}
  if(d.oilAbandon){var r=WORLD_SITES.abandon(S,d.oilAbandon);toastAt(null,r.ok?'油泉已放弃':'先拆除设备并解除泵的绑定');discovery(S,'oil');save();return;}
  if(d.oilField){oilField(S,d.oilField);return;}
  if(d.siteInstall||d.siteRemove){var r=d.siteInstall?WORLD_SITES.install(S,d.siteId,d.siteInstall,d.siteKey):WORLD_SITES.remove(S,d.siteId,d.siteRemove);transferTip(r,d.siteInstall?'安装':'拆除');markInv();oilField(S,d.siteId);save();return;}
  if(d.worldDevice){FACTORY.openDetail(d.worldDevice,S.fx,S,save);return;}
  if(d.queueToggle){queueOpen=!queueOpen;queue(S);return;}
  if(d.queueSelect){selected=d.queueSelect;queue(S);return;}
  if(d.queueMove){ACTION_QUEUE.move(S,d.queueMove,+d.queueDelta);markDynamic();renderDyn();queue(S);save();return;}
  if(d.queueCancel){ACTION_QUEUE.cancel(S,d.queueCancel);markDynamic();renderDyn();queue(S);save();return;}
  if(d.toolStore!=null){var c=S.inv[+d.toolStore];if(c){var moved=0;for(var ch of S.chests){var r=CORE.transferSlot({from:CORE.slotBox(S.inv),index:+d.toolStore,to:CORE.slotBox(ch.slots)});moved+=r.moved;if(!S.inv[+d.toolStore])break;}toastAt(null,moved?'工具已存入仓库':'仓库放不下，工具仍在物品栏');markInv();save();}return;}
  if(d.craftMore){S.ui.recipePage=(S.ui.recipePage||1)+1;renderDetail();return;}
 });
 document.addEventListener('click',function(e){if(queueOpen&&!e.target.closest('#action-queue-popover,[data-queue-toggle]')){queueOpen=false;queue(S);}});
 }
 root.WORLD_UI={dismissDiscovery:function(){discoveryOpen=null;if(typeof S!=='undefined'&&S.ui.pick&&S.ui.pick.popup)S.ui.pick=null;},dismissQueue:function(){queueOpen=false;var host=document.getElementById('action-queue-popover');if(host)host.hidden=true;},nasa:nasa,render:render,queue:queue,queueButton:queueButton,discovery:discovery,oilField:oilField,refresh:function(S){if(discoveryOpen&&document.querySelector('#popup:not([hidden]) .world-discovery')){if(discoveryOpen.startsWith('field:'))oilField(S,discoveryOpen.slice(6));else discovery(S,discoveryOpen);}}};
})(typeof window!=='undefined'?window:globalThis);
