(function(root){
 'use strict';var D=SPACE_DESTINATIONS,hooks,host,cinema=null,dialog=null,launchEffect=null;
 var tiers=D.tiers(),tierOptions=tiers.map(function(t){return '<option value="'+t+'">T'+t+'</option>';}).join(''),planetTabs=new Map(),destinationOptions=tiers.map(function(t){return '<optgroup label="T'+t+'">'+D.list().filter(function(p){return p.tier===t;}).map(function(p){return '<option value="'+p.id+'">'+esc(p.name)+'</option>';}).join('')+'</optgroup>';}).join('');
 tiers.forEach(function(t){planetTabs.set(t,[D.home].concat(D.list().filter(function(p){return p.tier===t;})).map(function(p){return '<button class="btn" data-space-planet="'+p.id+'">'+esc(p.name)+'</button>';}).join(''));});
 var nasaRecipes=SPACE_FACILITIES.nasaRecipes,surfaceTiles=new Map();
 function S(){return hooks.state();}
 function esc(s){return String(s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
 function patch(node,html){if(node&&node._spaceMarkup!==html){UI_KIT.patch(node,html);node._spaceMarkup=html;}}
 function text(node,value){if(node&&node.textContent!==String(value))node.textContent=value;}
 function change(){hooks.changed();refresh();}
 function vessel(){return SPACE_VEHICLE.ensure(S());}
 function actionTile(attributes,icon,label){
  return '<button type="button" class="world-action-tile space-action-tile" '+attributes+'><span aria-hidden="true">'+icon+'</span><span class="space-tile-name">'+esc(label)+'</span></button>';
 }
 function actionName(name,value){text(host.querySelector('[data-space-action="'+name+'"] .space-tile-name'),value);}
 function resources(p){
  if(!surfaceTiles.has(p.id)){
   var buttons=(p.actions||[]).map(function(a){return actionTile('data-item-controls="true" data-space-activity="'+esc(a.id)+'"',hooks.icon(a.icon||a.out[0][0],28),a.name);});
   if(DIMENSIONS.hasVeins(p.id))buttons.push(actionTile('data-item-controls="true" data-spacesurvey="'+esc(p.id)+'"',hooks.icon('minecraft:iron_ore@0',28),'寻找矿脉'));
   surfaceTiles.set(p.id,buttons.join(''));
  }
  return surfaceTiles.get(p.id);
 }
 function slot(ref,item,label,fluid){
  return '<button class="space-slot" data-transfer-ref="'+esc(JSON.stringify(ref))+'" data-tip="'+esc(item&&!fluid?hooks.name(item.k):label)+'" aria-label="'+esc(label)+'">'+(item?(fluid?FLUID_PRESENTATION.html(item.f,30):hooks.icon(item.k,32))+(item.n>1?'<b>'+item.n+'</b>':''):'<span>+</span>')+'</button>';
 }
 function machineSlots(m,kind){
  var d=STRUCTURES.instance(m),arr=kind==='in'?m.ins:kind==='out'?m.outs:m.tanksIn,count=kind==='in'?d.slots.in:kind==='out'?d.slots.out:d.fluidInputTanks.length;
  return Array.from({length:count},function(_,i){var item=arr[i];return slot({type:'machine',uid:m.uid,kind:kind,index:i},item,kind==='fin'?(item?FLUID_PRESENTATION.name(item.f)+' '+item.mb+' mB':'燃料单元'):kind==='in'?'燃料':'产物',kind==='fin');}).join('');
 }
 function equipment(kind,item,id){return item?'<span class="space-slot" data-tip="'+esc(hooks.name(item.k))+'">'+hooks.icon(item.k,32)+'</span>':slot({type:'spaceFacility',kind:kind,uid:id},null,kind==='nasa'?'放入NASA工作台':kind==='port'?'放入燃料注入器':'放入LV发电机');}
 function background(state){var p=D.get(SPACEFLIGHT.planet(state));if(p.id!==D.home.id)return SPACEFLIGHT.cabin(state)&&p.cabinBackground||destinationBackground(p.id);var m=SPACEFLIGHT.selected(state),v=SPACE_VEHICLE.ensure(state),stages=p.spaceport;return !m||!v.platform||v.platform.n<9?stages.site:v.rocket?stages.ready:stages.empty;}
 function destinationBackground(id){var p=D.get(id),list=p?.backgrounds;if(list&&list.length>1){var i=Math.floor(Date.now()/300000)%list.length;return list[i];}return p?.background||'';}
 function mount(){
  if(!host){host=document.getElementById('space-host');
   host.innerHTML='<header class="panel space-heading"><h2>航天</h2><select data-space-tier aria-label="火箭等级"></select><nav class="space-planets" aria-label="星球"></nav></header>'+
   '<div class="space-layout"><section class="space-info"><div class="space-scene-caption panel"><h3 data-space-title></h3><p data-space-stage></p></div>'+
   '<div class="panel space-route"><label>目的地<select data-space-destination aria-label="目的地"></select></label><p data-space-reason role="status"></p></div>'+
   '<section class="space-action-picker" hidden></section></section><nav class="space-action-dock" aria-label="航天操作">'+
   actionTile('data-space-action="supplies"',UI_KIT.glyph('store',26),'火箭与航天物资')+
   '<div class="space-earth-deck">'+
   actionTile('data-space-action="nasa"',hooks.icon(SPACE_FACILITIES.keys.nasa,28),'NASA工作台')+
   actionTile('data-space-action="station"',hooks.icon(SPACE_FACILITIES.keys.port,28),'发射站')+
   actionTile('data-space-action="launch"',UI_KIT.glyph('rocket',26),'开始发射')+'</div>'+
   '<div class="space-surface" hidden><div class="space-resource-cards"></div>'+
   actionTile('data-space-action="base"',UI_KIT.glyph('factory',26),'建设基地')+
   actionTile('data-space-action="cabin"',UI_KIT.glyph('home',26),'回到登陆仓')+'</div>'+
   actionTile('data-space-action="replay" hidden',UI_KIT.glyph('monitor',26),'回看发射')+'</nav></div>'+
   '<section class="space-cabin" hidden><nav class="space-action-dock" aria-label="登陆仓操作">'+
   actionTile('data-space-action="explore"',UI_KIT.glyph('world',26),'探索月球')+
   actionTile('data-space-action="return"',UI_KIT.glyph('rocket',26),'发射返回舱')+'</nav></section>';
   host.addEventListener('click',click);host.querySelector('[data-space-tier]').onchange=function(e){SPACEFLIGHT.ensure(S()).tier=+e.target.value;change();};
   host.querySelector('[data-space-destination]').onchange=function(e){SPACEFLIGHT.chooseDestination(S(),e.target.value);change();};
   new ResizeObserver(fitBackground).observe(document.getElementById('main'));
   new ResizeObserver(fitBackground).observe(document.getElementById('app'));
  }refresh();fitBackground();
  var pending=SPACEFLIGHT.flight(S());if(pending&&!D.get(pending.destination).film&&!cinema&&!launchEffect)openCinema(pending.uid,false);
 }
 function fitBackground(){
  if(!hooks||!host||S().ui.page!=='space')return;var app=document.getElementById('app'),main=document.getElementById('main'),a=app.getBoundingClientRect(),r=main.getBoundingClientRect(),z=a.width/app.offsetWidth;
  Object.entries({'--space-bg-left':r.left-a.left,'--space-bg-top':r.top-a.top,'--space-bg-width':r.width,'--space-bg-height':r.height}).forEach(function(p){var value=p[1]/z+'px';if(app.style.getPropertyValue(p[0])!==value)app.style.setProperty(p[0],value);});
  if(dialog&&dialog.node.isConnected){var box=dialog.node;box.style.left=(r.left+r.width/2)/z+'px';box.style.top=(r.top+r.height/2)/z+'px';box.style.maxWidth=Math.max(180,r.width/z-24)+'px';box.style.maxHeight=Math.max(66,r.height/z-8)+'px';}
 }
 var surveyDim=null;
 function surveyBody(state,dim){
  var list=WORLD_DISCOVERY.veins(state,dim),room=WORLD_DISCOVERY.discoveryRoom(state,'veins',dim),limit=WORLD_DISCOVERY.limit;
  var rows=list.map(function(v){
   var uid=WORLD_DISCOVERY.veinId(state,v);
   return '<article class="space-survey-row"><div class="space-survey-face">'+v.ores.slice(0,4).map(function(o){return hooks.icon(o.key,24);}).join('')+'</div>'
    +'<div class="space-survey-text"><b>'+esc(v.name)+'</b><small>'+v.ores.map(function(o){return esc(hooks.name(o.key));}).join('、')+'，剩余 '+v.left+'</small></div>'
    +'<div class="space-survey-actions"><button class="btn" data-survey-mine="'+esc(uid)+'">采掘</button><button class="btn" data-survey-abandon="'+esc(uid)+'">放弃</button></div></article>';
  }).join('');
  return '<div class="space-survey"><p class="space-survey-count">已发现 '+list.length+' / '+limit+' 条'+(list.length>=limit?'，这里的矿脉已满':'')+'</p>'
   +(list.length?rows:'<p class="space-survey-empty">这里还没有发现矿脉。</p>')
   +'<footer class="space-survey-foot"><label>探测次数<input type="number" min="0" max="'+room+'" value="'+Math.min(4,Math.max(0,room))+'" data-survey-count'+(room?'':' disabled')+'></label>'
   +'<button class="btn space-primary" data-survey-start="'+esc(dim)+'"'+(room?'':' disabled')+'>寻找矿脉</button></footer></div>';
 }
 function openSurvey(dim){
  if(dim!==SPACEFLIGHT.planet(S())||!DIMENSIONS.hasVeins(dim))return;
  surveyDim=dim;
  openDialog('survey','矿脉 · '+((root.DIMENSIONS&&DIMENSIONS.name(dim))||dim),surveyBody(S(),dim));
 }
 function openDialog(kind,title,body){
  if(!ITEM_DRAG.returnHeld())return false;hooks.closePopup();var popup=document.getElementById('popup');popup.hidden=false;popup.classList.add('noback');
  popup.innerHTML='<section class="box space-dialog" role="dialog" aria-label="'+esc(title)+'"><header><h3>'+esc(title)+'</h3><button class="btn" data-popclose="1">关闭</button></header><div class="space-dialog-body">'+body+'</div></section>';
  dialog={kind:kind,node:popup.querySelector('.space-dialog')};var style=getComputedStyle(host);['--scene-opacity','--panel','--scene-slot','--scene-card','--dim'].forEach(function(k){dialog.node.style.setProperty(k,style.getPropertyValue(k));});dialog.node.style.textShadow=style.textShadow;
  dialog.node.addEventListener('click',click);fitBackground();return true;
 }
 function openSupplies(){
  if(!openDialog('supplies','火箭与航天物资','<div class="space-vehicle-grid"><label>火箭<div data-vehicle-rocket></div></label><label>发射平台<div data-vehicle-platform></div></label></div><div class="space-fuel-bar"><i data-vehicle-fuel-bar></i></div><p data-vehicle-fuel></p><div class="space-equipment-grid"></div><p class="space-flight-lock"></p>'))return;refreshDialog();
 }
 function openStation(){
  if(!openDialog('station','发射站','<div class="space-station-deploy"></div><div class="space-station-live"><section class="space-machine-line"><div data-fuel-slot></div><div><h4>火箭燃料</h4><p data-loader-tank></p><p data-loader-power></p></div></section><section class="space-machine-line"><div data-generator-slot></div><div><h4 data-generator-name></h4><p data-generator-status></p></div><button class="btn" data-space-action="deploy-generator">放入发电机</button><button class="btn" data-space-action="remove-generator">拆除</button></section><div class="space-generator-content"><div class="space-generator-inputs"></div><div class="space-generator-fluids"></div><div class="space-generator-outputs"></div><div class="space-fuel-bar"><i data-generator-power-bar></i></div><p data-generator-power></p></div><button class="btn" data-space-action="remove-port">拆除燃料注入器</button></div>'))return;refreshDialog();
 }
 function nasaRecipe(){return nasaRecipes.find(function(r){return r.id===SPACEFLIGHT.ensure(S()).nasaRecipe;})||nasaRecipes[0];}
 function openNasa(){
  if(!SPACEFLIGHT.unlocked(S())||!SPACEFLIGHT.choosePlanet(S(),D.home.id))return;hooks.navigate('space');mount();
  if(!openDialog('nasa','NASA工作台','<div class="space-nasa-deploy"></div><div class="space-nasa-workbench"><header><select data-space-nasa-recipe aria-label="火箭配置"></select><div class="space-nasa-schematics"></div></header><div class="space-nasa-requirements"></div><footer><div data-space-nasa-result></div><div><h3 data-space-nasa-name></h3><p data-space-nasa-reason></p></div><button class="btn space-primary" data-space-action="craft-rocket">组装火箭</button></footer></div>'))return;
  var select=dialog.node.querySelector('select');patch(select,nasaRecipes.map(function(r){var tier=r.rocketTier||1,meta=CONTENT.item(r.out).meta;return '<option value="'+esc(r.id)+'">T'+tier+'，'+(meta===0?'无货舱':hooks.name(r.slots[r.slots.length-1][0]).replace(/箱子$/,'箱')+'货舱')+'</option>';}).join(''));select.value=nasaRecipe().id;select.onchange=function(){SPACEFLIGHT.ensure(S()).nasaRecipe=this.value;change();};refreshDialog();
 }
 function refreshDialog(){
  if(!dialog||!dialog.node.isConnected)return;var box=dialog.node,state=S(),v=vessel(),m=SPACEFLIGHT.selected(state),g=m&&SPACE_FACILITIES.generator(state,m),q=function(sel){return box.querySelector(sel);};
  if(dialog.kind==='supplies'){
   patch(q('[data-vehicle-rocket]'),slot({type:'spaceVehicle',slot:'rocket'},v.rocket,'火箭'));patch(q('[data-vehicle-platform]'),slot({type:'spaceVehicle',slot:'platform'},v.platform,'发射平台 ×9'));
   var fuel=v.rocket&&v.rocket.resourceBuffers[SPACE.fuelKey];text(q('[data-vehicle-fuel]'),fuel?'火箭燃料 '+fuel.amount+' / '+fuel.capacity+' mB':'放入火箭');q('[data-vehicle-fuel-bar]').style.width=(fuel?fuel.amount/fuel.capacity*100:0)+'%';
   patch(q('.space-equipment-grid'),SPACE_VEHICLE.requirements(state).map(function(p,i){return '<label>'+esc(p.name)+slot({type:'spaceVehicle',slot:'supplies',index:i},v.supplies[i],p.name)+'<small>'+(p.ready?'已备齐':'未备齐')+'</small></label>';}).join(''));
   text(q('.space-flight-lock'),SPACE_VEHICLE.busy(state)?'航程中，抵达后可以取回火箭和装备':'');
  }else if(dialog.kind==='station'){
   q('.space-station-live').hidden=!m;q('.space-station-deploy').hidden=!!m;patch(q('.space-station-deploy'),equipment('port',null)+'<span>放入燃料注入器</span><button class="btn" data-space-action="deploy-port">部署发射站</button>');if(!m)return;
   patch(q('[data-fuel-slot]'),machineSlots(m,'fin'));var tank=m.tanksIn[0];text(q('[data-loader-tank]'),tank?FLUID_PRESENTATION.name(tank.f)+' '+tank.mb+' / 12000 mB':'放入火箭燃料单元');text(q('[data-loader-power]'),'燃料注入器 '+Math.floor(m.eu||0)+' / '+DEFS.of(m.k).energyCapacity+' EU');
   patch(q('[data-generator-slot]'),equipment('generator',g,m.uid));text(q('[data-generator-name]'),g?hooks.name(g.k):'供电设备');text(q('[data-generator-status]'),g?g.status?.text||'放入燃料':'放入一台LV发电机');
   q('[data-space-action="deploy-generator"]').hidden=!!g;q('[data-space-action="remove-generator"]').hidden=!g;q('.space-generator-content').hidden=!g;
   if(g){patch(q('.space-generator-inputs'),machineSlots(g,'in'));patch(q('.space-generator-fluids'),machineSlots(g,'fin'));patch(q('.space-generator-outputs'),machineSlots(g,'out'));text(q('[data-generator-power]'),Math.floor(g.eu||0)+' / '+DEFS.of(g.k).energyCapacity+' EU');q('[data-generator-power-bar]').style.width=Math.min(100,g.eu/DEFS.of(g.k).energyCapacity*100)+'%';}
  }else if(dialog.kind==='nasa'){
   var deployed=!!MECHANISMS.stationFor(state,'nasa'),r=nasaRecipe();q('.space-nasa-workbench').hidden=!deployed;q('.space-nasa-deploy').hidden=deployed;
   patch(q('.space-nasa-deploy'),equipment('nasa',null)+'<span>放入NASA工作台</span><button class="btn" data-space-action="deploy-nasa">部署工作台</button>');
   if(!deployed)return;
   var progress=SPACE_FACILITIES.nasaStatus(state,r);
   patch(q('.space-nasa-schematics'),progress.known?'<span class="space-schematic-known">已解锁</span>':progress.available?'<button class="btn" data-space-action="unlock-rocket">投入图纸</button>':'<span class="dim">未解锁</span>');
   var stamp=JSON.stringify([r.id,progress.known,progress.available,hooks.stockVersion()]);
   if(dialog.nasaStamp===stamp)return;
   dialog.nasaStamp=stamp;
   var needs=new Map();r.slots.forEach(function(options){var k=options.find(function(k){return hooks.have(k)>0;})||options[0];needs.set(k,(needs.get(k)||0)+1);});
   patch(q('.space-nasa-requirements'),Array.from(needs,function(p){var k=p[0],n=p[1],owned=hooks.have(k);return '<div class="space-nasa-part '+(owned>=n?'ready':'missing')+'" data-item="'+esc(k)+'" data-tip="'+esc(hooks.name(k))+'"><div class="space-part-icon">'+hooks.icon(k,32)+'<b>'+n+'</b></div><div><b>'+esc(hooks.name(k))+'</b><small>持有 '+owned+' / '+n+'</small></div></div>';}).join(''));
   patch(q('[data-space-nasa-result]'),hooks.icon(r.out,64));text(q('[data-space-nasa-name]'),hooks.name(r.out));
   var plan=progress.known?hooks.plan(r):null;
   q('[data-space-action="craft-rocket"]').disabled=!plan?.ok;
   text(q('[data-space-nasa-reason]'),plan?(plan.ok?'部件已备齐':plan.code==='OUTPUT'?'物品栏空间不足':'准备所需部件'):
    progress.available?'投入图纸解锁':progress.source?'挑战'+progress.source.name+'获得图纸':'需要对应的火箭图纸');
  }
 }
 function refresh(){
  if(!hooks)return;var state=S(),open=SPACEFLIGHT.unlocked(state),nav=document.querySelector('[data-nav="space"]');if(nav){nav.disabled=!open;nav.setAttribute('aria-disabled',String(!open));if(open)nav.removeAttribute('data-tip');}
  if(!host||state.ui.page!=='space')return;var s=SPACEFLIGHT.ensure(state),p=D.get(SPACEFLIGHT.planet(state)),dest=SPACEFLIGHT.destination(state),m=SPACEFLIGHT.selected(state),f=s.flight,inCabin=SPACEFLIGHT.cabin(state),surface=p.id!==D.home.id;
  host.querySelector('.space-heading').hidden=!!cinema||inCabin;host.querySelector('.space-layout').hidden=!!cinema||inCabin;host.querySelector('.space-cabin').hidden=!!cinema||!inCabin;
  host.querySelector('.space-earth-deck').hidden=surface;host.querySelector('.space-route').hidden=surface;host.querySelector('.space-surface').hidden=!surface;host.querySelector('[data-space-action="explore"]').disabled=!!s.returnFlight;actionName('explore','探索'+p.name);actionName('return',s.returnFlight?'继续返航':'发射返回舱');
  var baseButton=host.querySelector('[data-space-action="base"]');baseButton.hidden=!surface||!SPACEFLIGHT.landed(state,p.id);baseButton.disabled=!!f||!!s.returnFlight;
  if(!baseButton.hidden)actionName('base',BLUEPRINTS.at(state,p.id)?'打开当地工厂':'建设基地');
  var tier=host.querySelector('[data-space-tier]');patch(tier,tierOptions);tier.value=s.tier;tier.hidden=D.tiers().length<2;
  patch(host.querySelector('.space-planets'),planetTabs.get(s.tier));
  var gate=SPACEFLIGHT.navigationLock(state);host.querySelectorAll('[data-space-planet]').forEach(function(b){b.disabled=!SPACEFLIGHT.landed(state,b.dataset.spacePlanet)||!!gate&&gate.id!==b.dataset.spacePlanet||SPACE_VEHICLE.busy(state);b.classList.toggle('on',b.dataset.spacePlanet===p.id);});
  patch(host.querySelector('[data-space-destination]'),destinationOptions);host.querySelector('[data-space-destination]').value=dest.id;host.querySelector('[data-space-destination]').disabled=SPACE_VEHICLE.busy(state);
  text(host.querySelector('[data-space-title]'),surface?p.name:'向星空出发');
  text(host.querySelector('[data-space-stage]'),p.id===D.initial.id?'这是你的一小步，是人类的一大步':'');
  if(!surface){
   var ready=SPACEFLIGHT.ready(state,m,dest.id),visited=SPACEFLIGHT.landed(state,dest.id),launch=host.querySelector('[data-space-action="launch"]');
   launch.disabled=!!launchEffect||!f&&!visited&&!ready.ok;
   actionName('launch',f?f.phase==='orbit'?'登陆'+D.get(f.destination).name:'继续航程':visited?'前往'+dest.name:'开始发射');
   text(host.querySelector('[data-space-reason]'),!f&&!visited&&!ready.ok?ready.text:'');
  }
  host.querySelector('[data-space-action="replay"]').hidden=!dest.film||!SPACEFLIGHT.landed(state,dest.id);
  if(surface)patch(host.querySelector('.space-resource-cards'),resources(p));
  var picker=host.querySelector('.space-action-picker'),markup=surface?hooks.picker():'';picker.hidden=!markup;if(markup)patch(picker,markup);
  var bg=background(state);if(host.dataset.background!==bg){host.dataset.background=bg;hooks.theme();}refreshDialog();
 }
 function confirmation(returning){
  var dest=returning?D.get(SPACEFLIGHT.planet(S())):SPACEFLIGHT.destination(S()),film=returning?dest.returnFilm:dest.film,duration=film?Math.round(film.duration/10)*10:0,min=Math.floor(duration/60),sec=duration%60;
  var fuel=returning?'':'<p>本次发射消耗 '+dest.mission.fuel.toLocaleString('zh-CN')+' mB 燃料</p>';
  if(!openDialog('confirm',returning?'发射返回舱':'开始发射','<p>'+(film?'观看阿波罗11号'+(returning?'返航':'登月')+'影片，时长约'+min+'分'+(sec?sec+'秒':'钟'):'前往'+(returning?D.home.name:dest.name))+'</p>'+fuel+'<footer class="space-confirm-actions"><button class="btn" data-popclose="1">取消</button><button class="btn space-primary" data-space-action="'+(returning?'confirm-return':'confirm-launch')+'">出发</button></footer>'))return;
 }
 function click(e){
  var planet=e.target.closest('[data-space-planet]');if(planet){if(!planet.disabled&&ITEM_DRAG.returnHeld()){hooks.closePopup();SPACEFLIGHT.choosePlanet(S(),planet.dataset.spacePlanet);change();hooks.theme();}return;}
    var activity=e.target.closest('[data-space-activity]');if(activity){if(!ITEM_DRAG.returnHeld())return;hooks.activity(activity.dataset.spaceActivity);refresh();return;}
  var surveyOpen=e.target.closest('[data-spacesurvey]');if(surveyOpen){openSurvey(surveyOpen.dataset.spacesurvey);return;}
  var surveyStart=e.target.closest('[data-survey-start]');if(surveyStart){
   var box=dialog&&dialog.node,input=box&&box.querySelector('[data-survey-count]'),n=input?Math.max(1,+input.value||1):1;
   if(surveyDim!==SPACEFLIGHT.planet(S()))return;
   if(!WORLD_DISCOVERY.startSurvey(S(),surveyDim,n)){openSurvey(surveyDim);return;}
   hooks.closePopup();dialog=null;change();return;
  }
  var surveyMine=e.target.closest('[data-survey-mine]');if(surveyMine){
   var state0=S(),vein=WORLD_DISCOVERY.veins(state0,surveyDim).find(function(v){return v.id===surveyMine.dataset.surveyMine;});
   if(vein&&MINING.start(state0,vein,MINING.remaining(vein))){hooks.closePopup();dialog=null;change();}
   return;
  }
  var surveyAbandon=e.target.closest('[data-survey-abandon]');if(surveyAbandon){WORLD_DISCOVERY.abandonVein(S(),surveyAbandon.dataset.surveyAbandon);openSurvey(surveyDim);hooks.save();return;}
  var b=e.target.closest('[data-space-action]');if(!b||b.disabled)return;var action=b.dataset.spaceAction,state=S(),m=SPACEFLIGHT.selected(state),result;
  if(action==='base'&&ITEM_DRAG.returnHeld()){
   result=BLUEPRINTS.openBase(state,SPACEFLIGHT.planet(state));if(result.ok){FACTORY.resetBoardInteraction();hooks.navigate('line');}return;
  }
  if(action==='supplies')return openSupplies();if(action==='station')return openStation();if(action==='nasa')return openNasa();
  if(action==='replay')return openCinema(null,true);
  if(action.startsWith('deploy-')){result=SPACE_FACILITIES.deploy(state,action.slice(7),m&&m.uid);if(!result.ok)hooks.toast(result.text||'需要适用的设备');change();return;}
  if(action==='remove-generator'||action==='remove-port'){var target=action==='remove-port'?m:m&&SPACE_FACILITIES.generator(state,m);if(target){result=SPACE_FACILITIES.remove(state,target.uid);hooks.toast(result.ok?'设备已拆除':'无法拆除设备');change();}return;}
  if(action==='unlock-rocket'){
   var status=SPACE_FACILITIES.nasaStatus(state,nasaRecipe());
   if(status.available&&MECHANISMS.unlock(state,status.schematic.knowledge).ok)change();
   return;
  }
  if(action==='craft-rocket'){if(hooks.craft(nasaRecipe()))change();return;}
  if(action==='cabin'||action==='explore'){if(!ITEM_DRAG.returnHeld())return;hooks.closePopup();if(action==='cabin')SPACEFLIGHT.enterCabin(state);else SPACEFLIGHT.explore(state);change();hooks.theme();return;}
  if(action==='return'){if(SPACEFLIGHT.ensure(state).returnFlight)openCinema(null,false,'return');else confirmation(true);return;}
  if(action==='launch'){var f=SPACEFLIGHT.flight(state);if(f){openCinema(f.uid,false);return;}if(SPACEFLIGHT.landed(state,SPACEFLIGHT.destination(state).id)){SPACEFLIGHT.choosePlanet(state,SPACEFLIGHT.destination(state).id);change();hooks.theme();return;}confirmation(false);return;}
  if(action==='confirm-return'||action==='confirm-launch'){if(!ITEM_DRAG.returnHeld())return;result=action==='confirm-return'?SPACEFLIGHT.startReturn(state):SPACEFLIGHT.start(state,m);if(!result.ok){hooks.toast(result.text||'航程尚未准备好');change();return;}hooks.closePopup();change();if(action==='confirm-launch'&&!D.get(result.destination).film)playLaunch(SPACEFLIGHT.flight(state));else openCinema(action==='confirm-return'?null:SPACEFLIGHT.flight(state).uid,false,action==='confirm-return'?'return':null);}
 }
 function land(id){var result=SPACEFLIGHT.land(S(),id);if(!result.ok){hooks.toast(result.text||'当前航程无法登陆');return;}dismiss();change();hooks.navigationChanged();hooks.theme();hooks.landed(D.get(result.destination));}
 function dismiss(){
  if(dialog)hooks.closePopup();if(launchEffect){launchEffect.cancel();launchEffect=null;refresh();}if(!cinema)return;var box=cinema,v=box.querySelector('video');cinema=null;clearTimeout(box._idle);
  if(v){if(box.dataset.returnDestination)SPACEFLIGHT.returnPosition(S(),box.dataset.returnDestination,v.currentTime);else if(box.dataset.flightUid)SPACEFLIGHT.position(S(),box.dataset.flightUid,v.currentTime);v.pause();v.removeAttribute('src');v.load();}box.remove();if(box._returnFocus&&box._returnFocus.isConnected)box._returnFocus.focus({preventScroll:true});refresh();hooks.save();
 }
 function playLaunch(f){
  var state=S();
  launchEffect=SPACE_LAUNCH_FX.play({anchor:host.querySelector('[data-space-action="launch"]'),bounds:document.getElementById('main'),onFinish:function(){
   launchEffect=null;if(S()===state&&SPACEFLIGHT.flight(state)===f&&state.ui.page==='space')openCinema(f.uid,false);
  }});refresh();
 }
 function openArrival(id,p){
  var box=document.createElement('section');box.className='space-cinema-overlay';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','抵达'+p.name);box.tabIndex=-1;box._returnFocus=document.activeElement;
  box.innerHTML='<div class="space-cinema space-arrival"><header><span>抵达'+esc(p.name)+'</span><button class="btn" data-arrival-close>稍后登陆</button></header><div class="space-film-screen"><div class="space-orbit"><div><small>首次抵达</small><h2></h2><button class="btn space-primary" data-film-land></button></div></div></div></div>';
  var orbit=box.querySelector('.space-orbit'),bg=destinationBackground(p.id);
  if(bg)orbit.style.backgroundImage='linear-gradient(#0002,#0007),url('+JSON.stringify(bg)+')';
  else if(p.mapIcon){orbit.classList.add('space-map-scene');orbit.insertAdjacentHTML('beforeend','<img class="space-map-body'+(p.id==='kuiperbelt'?' belt':'')+'" alt="" src="'+esc(p.mapIcon)+'">');}
  text(orbit.querySelector('h2'),p.id.endsWith('station')?p.name:p.name+'就在脚下');text(orbit.querySelector('button'),'登陆'+p.name);
  box.querySelector('[data-film-land]').onclick=function(){land(id);};box.querySelector('[data-arrival-close]').onclick=dismiss;
  box.addEventListener('keydown',function(e){e.stopPropagation();if(e.key==='Escape'){e.preventDefault();dismiss();}else if(e.key==='Tab'){var buttons=Array.from(box.querySelectorAll('button')),i=buttons.indexOf(document.activeElement),next=e.shiftKey?(i<=0?buttons.length-1:i-1):(i+1)%buttons.length;e.preventDefault();buttons[next].focus();}});
  document.getElementById('app').appendChild(box);cinema=box;refresh();box.querySelector('[data-film-land]').focus({preventScroll:true});
 }
 function openCinema(id,replay,mode){
  if(!ITEM_DRAG.returnHeld())return;hooks.prepareCinema();dismiss();var state=S(),returning=mode==='return',f=returning?SPACEFLIGHT.ensure(state).returnFlight:SPACEFLIGHT.flight(state),p=returning&&f?D.get(f.destination):!replay&&f?D.get(f.destination):SPACEFLIGHT.destination(state),film=returning?p.returnFilm:p.film;
  if(!replay&&(!f||!returning&&!['launch','orbit'].includes(f.phase)))return;
  if(!film){if(!replay&&!returning&&SPACEFLIGHT.finishFilm(state,id).ok){hooks.save();openArrival(id,p);}return;}
  var box=document.createElement('section');box.className='space-cinema-overlay';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.tabIndex=-1;box._returnFocus=document.activeElement;box.setAttribute('aria-label','阿波罗11号影院');box.innerHTML='<div class="space-cinema"><header><span data-film-caption></span><button class="btn" data-film-close>'+(replay?'关闭回放':'稍后继续')+'</button></header><div class="space-film-screen"><video muted playsinline preload="auto"></video><div class="space-orbit" hidden><div><h2></h2><button class="btn space-primary" data-film-land></button></div></div></div><footer><button class="btn" data-film-play>暂停</button><button class="btn" data-film-sound aria-pressed="false">声音：关</button><input type="range" class="space-film-volume" data-film-volume min="0" max="100" step="1" value="0" aria-label="音量"><input type="range" class="space-film-progress" data-film-progress min="0" max="1000" step="1" value="0" aria-label="进度"><span class="space-film-time" data-film-time>0:00</span><button class="btn" data-film-skip>跳过影片</button></footer></div>';
  if(returning)box.dataset.returnDestination=p.id;else if(!replay)box.dataset.flightUid=id;document.getElementById('app').appendChild(box);cinema=box;refresh();
  var video=box.querySelector('video'),play=box.querySelector('[data-film-play]'),caption=box.querySelector('[data-film-caption]'),orbitPanel=box.querySelector('.space-orbit'),volumeInput=box.querySelector('[data-film-volume]'),soundBtn=box.querySelector('[data-film-sound]'),progressInput=box.querySelector('[data-film-progress]'),timeLabel=box.querySelector('[data-film-time]');
  // 音量设置跟着存档走，默认静音、音量为 0
  var cinemaSetting=SPACEFLIGHT.cinemaSettings(state);
  video.src=film.src;
  function applyVolume(){
    video.volume=Math.max(0,Math.min(1,(cinemaSetting.volume||0)/100));
    video.muted=!cinemaSetting.volume||cinemaSetting.muted!==false;
    volumeInput.value=String(cinemaSetting.volume||0);
    soundBtn.textContent=video.muted?'声音：关':'声音：开';
    soundBtn.setAttribute('aria-pressed',String(!video.muted));
  }
  applyVolume();orbitPanel.style.backgroundImage='linear-gradient(#0003,#0007),url('+JSON.stringify(p.background)+')';text(orbitPanel.querySelector('h2'),p.name+'就在脚下');text(orbitPanel.querySelector('button'),'登陆'+p.name);
  function wake(){if(cinema!==box)return;clearTimeout(box._idle);box.classList.remove('controls-hidden');if(!video.paused&&!video.hidden)box._idle=setTimeout(function(){if(cinema===box&&!video.paused&&!box.querySelector('button:focus'))box.classList.add('controls-hidden');},3000);}
  function finish(){if(cinema!==box)return;if(replay){dismiss();return;}if(returning){var r=SPACEFLIGHT.finishReturn(state,p.id);dismiss();if(r.ok){change();hooks.navigationChanged();hooks.theme();hooks.toast('已返回地球');}return;}if(!SPACEFLIGHT.finishFilm(state,id).ok){dismiss();return;}video.pause();video.hidden=true;orbitPanel.hidden=false;box.querySelector('footer').hidden=true;caption.textContent='';wake();hooks.save();}
  function startVideo(){var promise=video.play();if(promise)promise.catch(function(){play.textContent='播放';caption.textContent='点击播放，继续航程';wake();});}
  video.addEventListener('loadedmetadata',function(){progressInput.max=String(Math.max(1,Math.round(video.duration||0)));if(!replay&&f.position)video.currentTime=Math.min(f.position,video.duration-.05);});
  function updateCaption(){text(caption,returning?'返回地球':'前往'+p.name);}
  function clockText(t){t=Math.max(0,Math.round(t||0));return Math.floor(t/60)+':'+('0'+(t%60)).slice(-2);}
  function syncProgress(){
    if(!progressInput._dragging){
      progressInput.value=String(Math.round(video.currentTime||0));
    }
    text(timeLabel,clockText(video.currentTime)+' / '+clockText(video.duration));
  }
  progressInput.addEventListener('input',function(){progressInput._dragging=true;});
  progressInput.addEventListener('change',function(){
    var t=Number(progressInput.value);
    if(Number.isFinite(t)&&video.duration)t=Math.max(0,Math.min(t,video.duration-.05));
    else return;
    video.currentTime=t;
    progressInput._dragging=false;
    syncProgress();
    wake();
  });
  progressInput.addEventListener('pointerup',function(){progressInput._dragging=false;});
  video.addEventListener('durationchange',function(){progressInput.max=String(Math.max(1,Math.round(video.duration||0)));});
  updateCaption();video.addEventListener('timeupdate',function(){syncProgress();if(cinema!==box||!replay&&!returning&&f.phase!=='launch')return;updateCaption();if(returning)SPACEFLIGHT.returnPosition(state,p.id,video.currentTime);else if(!replay)SPACEFLIGHT.position(state,id,video.currentTime);});
  video.addEventListener('ended',finish);video.addEventListener('play',function(){play.textContent='暂停';wake();});video.addEventListener('pause',function(){play.textContent='播放';wake();});video.addEventListener('error',function(){caption.textContent='影片未能播放，可重试或跳过';play.textContent='重试播放';wake();});
  box.addEventListener('pointermove',wake);box.addEventListener('pointerdown',wake);box.addEventListener('keydown',function(e){wake();e.stopPropagation();if(e.key==='Escape'){e.preventDefault();dismiss();return;}if(e.key==='Tab'){var buttons=Array.from(box.querySelectorAll('button')).filter(function(n){return !n.closest('[hidden]')&&!n.disabled;}),i=buttons.indexOf(document.activeElement),next=e.shiftKey?(i<=0?buttons.length-1:i-1):(i+1)%buttons.length;e.preventDefault();buttons[next].focus();}else if(e.code==='Space'&&!e.target.closest('button')){e.preventDefault();play.click();}});
  play.onclick=function(){if(video.error){video.load();startVideo();}else if(video.paused)startVideo();else video.pause();box.focus({preventScroll:true});};
  box.querySelector('[data-film-skip]').onclick=finish;box.querySelector('[data-film-close]').onclick=dismiss;box.querySelector('[data-film-land]').onclick=function(){land(id);};
  box.querySelector('[data-film-sound]').onclick=function(){
    if(video.muted){cinemaSetting.muted=false;if(!(cinemaSetting.volume>0))cinemaSetting.volume=60;}
    else cinemaSetting.muted=true;
    applyVolume();
    hooks.save();box.focus({preventScroll:true});wake();
  };
  volumeInput.oninput=function(){
    cinemaSetting.volume=Math.max(0,Math.min(100,Math.round(Number(this.value)||0)));
    cinemaSetting.muted=!(cinemaSetting.volume>0);
    applyVolume();
    hooks.save();wake();
  };
  box.focus({preventScroll:true});if(!replay&&f.phase==='orbit')finish();else startVideo();
 }
 function targets(ref,state){
  if(!hooks||state!==S()||state.ui.page!=='space'||ref.type!=='bag'||cinema)return null;var item=state.inv[ref.index];if(!item)return[];
  if(dialog&&dialog.node.isConnected&&dialog.kind==='supplies'){var at=SPACE_VEHICLE.supplyIndex(item);return SPACE.rocketInfo(item)?[{type:'spaceVehicle',slot:'rocket'}]:CONTENT.canonicalKey(item.k)===SPACE_VEHICLE.pad?[{type:'spaceVehicle',slot:'platform'}]:at>=0?[{type:'spaceVehicle',slot:'supplies',index:at}]:[];}
  var popup=document.getElementById('popup');if(popup&&!popup.hidden&&(!dialog||dialog.kind!=='station'&&dialog.kind!=='nasa'))return null;
  if(SPACEFLIGHT.planet(state)!==D.home.id)return[];
  if(!MECHANISMS.stationFor(state,'nasa')&&SPACE_FACILITIES.accepts('nasa',item))return[{type:'spaceFacility',kind:'nasa'}];
  var m=SPACEFLIGHT.selected(state);if(!m&&SPACE_FACILITIES.accepts('port',item))return[{type:'spaceFacility',kind:'port'}];if(!m||!dialog||dialog.kind!=='station')return[];
  var g=SPACE_FACILITIES.generator(state,m);if(!g&&SPACE_FACILITIES.accepts('generator',item))return[{type:'spaceFacility',kind:'generator',uid:m.uid}];
  if(GD.containerRegistry.some(function(p){return p.filled===CONTENT.canonicalKey(item.k)&&SPACE.fuels.includes(p.fluid);}))return[{type:'machine',uid:m.uid,kind:'fin',index:0}];
  if(g){var d=DEFS.of(g.k),key=CONTENT.canonicalKey(item.k);if(GD.containerRegistry.some(function(p){return p.filled===key&&ENGINE.networks.fluidAccepted(g,p.fluid);}))return[{type:'machine',uid:g.uid,kind:'fin',index:0}];if(ENGINE.generators.fuels(d).items[key])return Array.from({length:d.slots.in},function(_,i){return{type:'machine',uid:g.uid,kind:'in',index:i};});}
  return[];
 }
 root.SPACE_UI={init:function(options){hooks=options;document.addEventListener('keydown',function(e){if(e.key==='Escape'&&cinema){e.preventDefault();dismiss();}});document.addEventListener('click',function(e){if(e.target.closest('[data-space-open]')&&SPACEFLIGHT.unlocked(S()))hooks.navigate('space');});},mount:mount,refresh:refresh,background:background,destinationBackground:destinationBackground,targets:targets,dismiss:dismiss,closeSupplies:function(){dialog=null;},openCinema:openCinema,openNasa:openNasa};
})(typeof window!=='undefined'?window:globalThis);

