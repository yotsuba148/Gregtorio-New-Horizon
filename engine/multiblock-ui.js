(function(root){
 'use strict';
 var selection=new Map(),circuitOpen=new Map(),names=['上','右','下','左'];
 function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
 function fc(n){return typeof fmtCount==='function'?fmtCount(n):String(n);}
 function name(k){return typeof root.nameOf==='function'?root.nameOf(k):GD.items[k]||k;}
 function icon(k,n){return typeof root.iconHtml==='function'?root.iconHtml(k,n):'';}
 var textures={'gregtech:gt.blockcasings@11':'machine_casing_heat_proof','gregtech:gt.blockcasings2@1':'machine_casing_frost_proof','gregtech:gt.blockcasings2@0':'machine_casing_solid_steel','gregtech:gt.blockcasings4@1':'machine_casing_clean_stainlesssteel','gregtech:gt.blockcasings8@0':'machine_casing_chemically_inert','gregtech:gt.blockcasings4@15':'machine_casing_densebricks','gregtech:gt.blockreinforced@2':'block_plascrete','gregtech:gt.blockcasings@10':'machine_bronzeplatedbricks'};
 ['cupronickel','kanthal','nichrome','tungstensteel','hssg'].forEach(function(n,i){textures['gregtech:gt.blockcasings5@'+i]='machine_coil_'+n;});
 // 结构外壳单面图：按机壳英文名精确对应 modicons/multiblocks 里的素材
textures['gregtech:gt.blockcasings2@0']='machine_casing_solid_steel';
textures['gregtech:gt.blockcasings8@0']='machine_casing_chemically_inert';
textures['gregtech:gt.blockcasings4@1']='machine_casing_clean_stainlesssteel';
textures['gregtech:gt.blockcasings@10']='machine_bronzeplatedbricks';
textures['miscutils:miscutils.blockcasings@4']='machine_casing_stable_titanium';
// 老结构主机壳：与 materialKey 的 keys 表一致，逐台对过
textures['gregtech:gt.blockcasings4@15']='machine_casing_densebricks';
textures['gregtech:gt.blockcasings2@1']='machine_casing_frost_proof';
textures['gregtech:gt.blockreinforced@2']='machine_casing_solid_steel';
textures['miscutils:miscutils.blockcasings@7']='machine_casing_tumbaga';
textures['mcb:water']='water_fluid';
textures['miscutils:gtplusplus.blockcasings.2@4']='machine_casing_grisium';
textures['gregtech:gt.blockframes@28']='frame_titanium';
textures['miscutils:miscutils.blockcasings@0']='machine_casing_centrifuge';
// 老结构主机壳：与 materialKey 的 keys 表一致，逐台对过
textures['gregtech:gt.blockcasings4@15']='machine_casing_densebricks';
textures['gregtech:gt.blockcasings2@1']='machine_casing_frost_proof';
textures['gregtech:gt.blockreinforced@2']='machine_casing_solid_steel';
textures['miscutils:miscutils.blockcasings@7']='machine_casing_tumbaga';
textures['miscutils:gtplusplus.blockcasings.2@15']='machine_casing_sterile_farm';
textures['gregtech:gt.blockcasings@11']='machine_casing_heat_proof';
textures['gregtech:gt.blockcasingsNH@2']='pyrolyse_casing';textures['miscutils:gtplusplus.blockcasings.3@1']='industrial_extruder_casing';textures['gregtech:gt.blockmachines@859']='industrial_extruder';
 // 批量机壳单面图（按 BlockIcons 常量从 jar 提取）
textures['gregtech:gt.blockcasings2@0']='gregtech_gt.blockcasings2_0';
textures['gregtech:gt.blockcasings8@0']='gregtech_gt.blockcasings8_0';
textures['gregtech:gt.blockcasings4@1']='gregtech_gt.blockcasings4_1';
textures['gregtech:gt.blockcasings4@0']='gregtech_gt.blockcasings4_0';
textures['gregtech:gt.blockcasings4@2']='gregtech_gt.blockcasings4_2';
textures['gregtech:gt.blockcasings4@10']='gregtech_gt.blockcasings4_10';
textures['gregtech:gt.blockcasings2@2']='gregtech_gt.blockcasings2_2';
textures['gregtech:gt.blockcasings2@12']='gregtech_gt.blockcasings2_12';
textures['gregtech:gt.blockcasings2@13']='gregtech_gt.blockcasings2_13';
textures['gregtech:gt.blockcasings3@13']='gregtech_gt.blockcasings3_13';
textures['gregtech:gt.blockcasings11@0']='gregtech_gt.blockcasings11_0';
textures['gregtech:gt.blockcasings@11']='gregtech_gt.blockcasings_11';
textures['gregtech:gt.blockcasings10@15']='gregtech_gt.blockcasings10_15';
textures['gregtech:gt.blockcasings10@3']='gregtech_gt.blockcasings10_3';
function face(k,n,wall){if(k==='gregtech:gt.blockmachines@859')return '<span class="mb-extruder-face" style="width:'+n+'px;height:'+n+'px;background-image:url(modicons/multiblocks/industrial_extruder.png);background-size:100% 1000%;display:block"></span>';if(k.indexOf('asset:')===0)return '<img src="'+esc(k.slice(6))+'" width="'+n+'" height="'+n+'" alt="">';var src=(root.MULTIBLOCK_VISUALS&&MULTIBLOCK_VISUALS.texture(k))||wall&&GD.gridCasingIcons&&GD.gridCasingIcons[k]|| (textures[k]?'modicons/multiblocks/'+textures[k]+'.png':GD.gridFaceIcons&&GD.gridFaceIcons[k]||GD.faceIcons&&GD.faceIcons[k]);return src?'<img src="'+esc(src)+'" width="'+n+'" height="'+n+'" alt="">':icon(k,n);}
 function material(m,c){if(c.lx!=null)c=Object.assign({},c,{dx:c.lx,dy:c.ly,lx:undefined,ly:undefined});if(root.MULTIBLOCK_VISUALS){var visual=MULTIBLOCK_VISUALS.tile(m,c);if(visual)return visual;}return m.k;
 }
 function bodyHtml(m,unit,preview){var s=MULTIBLOCKS.bounds(m);if(!s)return'';var profile=STRUCTURES.profile(m);var incomplete=!preview&&MULTIBLOCKS.managed(m)&&!(m.structure&&m.structure.formed);if(!incomplete&&profile&&profile.bodyHtml)return profile.bodyHtml(m,unit);var need=MULTIBLOCKS.live(m)&&MULTIBLOCKS.required(m),missing=new Map();(m.structure&&m.structure.wallHoles||[]).forEach(function(cell){missing.set(cell,'gregtech:gt.blockreinforced@2');});Object.keys(m.structure&&m.structure.casingGaps||{}).forEach(function(id){if(!MULTIBLOCKS.at(m,id))missing.set(id.split(',').slice(0,2).join(','),m.structure.casingGaps[id]);});
  // Older saves recorded only a shortage count. Show it at the selected compatible face.

  var h=MULTIBLOCKS.cells(m,null,true).map(function(c){var x=c.dx,y=c.dy,controller=x===s.cx&&y===s.cy,port=MULTIBLOCKS.ports(m).find(function(p){var q=p.face.split(',').map(Number);return q[0]===c.lx&&q[1]===c.ly&&MULTIBLOCKS.spec(p.k).type==='feedthrough';}),k=port?port.k:controller?(root.MULTIBLOCK_VISUALS&&MULTIBLOCK_VISUALS.controller(m)||m.k):material(m,c),actual=root.MULTIBLOCK_VISUALS&&MULTIBLOCK_VISUALS.materialKey(m,c)||k,absent=!controller&&!port&&(incomplete||missing.has(c.lx+','+c.ly)||need&&need.fixed.some(function(p){return p.k===actual&&p.n>0&&MULTIBLOCKS.materialCount(m,actual)<p.n&&(MULTIBLOCKS.materialCount(m,actual)===0||!MULTIBLOCKS.fixedMaterial(m,actual));}));return'<span class="mb-block'+(controller?' mb-controller':'')+(absent?' mb-gap':'')+'"'+(absent?' data-mb-gap="'+x+','+y+'"':'')+' style="left:'+x*unit+'px;top:'+y*unit+'px;width:'+unit+'px;height:'+unit+'px">'+(absent?'<span class="mb-gap-mark">＋</span>':face(missing.get(c.lx+','+c.ly)||k,unit,!controller))+'</span>';}).join('')+(root.MACHINE_VISUALS?MACHINE_VISUALS.bodyHtml(m,unit,unit>=64&&!preview):'');if(unit>=64)MULTIBLOCKS.ports(m).forEach(function(p){var w=MULTIBLOCKS.worldFace(m,p.face),f=[w.dx,w.dy,w.side];if(!MULTIBLOCKS.occupies(m,w.x,w.y))return;var x=f[0]*unit+(f[2]===1?unit-20:f[2]===3?0:unit/2-10),y=f[1]*unit+(f[2]===2?unit-20:f[2]===0?0:unit/2-10);h+='<span class="mb-world-port" data-world-mb-face="'+p.face+'" data-tip="'+esc(name(p.k))+'" style="left:'+x+'px;top:'+y+'px">'+icon(p.k,18)+'</span>';});return h;}
 function slot(ref,stack,kind){
  var tip=stack?(kind==='fluid'?FLUID_PRESENTATION.name(stack.f)+' '+(stack.mb||0)+' mB':name(stack.k)+((stack.n||1)>1?' ×'+stack.n:'')):'';
  return '<button type="button" class="mb-slot'+(kind==='fluid'?' mb-fluid':'')+'" data-transfer-ref="'+esc(JSON.stringify(ref))+'"'+(tip?' data-tip="'+esc(tip)+'"':'')+'>'
   +(kind==='fluid'?stack?FLUID_PRESENTATION.html(stack.f,28):'<span>≈</span>':stack?icon(stack.k,28)+'<b>'+((stack.n||1)>1?stack.n:'')+'</b>':'<span>＋</span>')+'</button>';
 }
 function current(m,options){
  var id=selection.get(m.uid);
  if(options&&!options.has(id)){
   id=MULTIBLOCKS.ports(m)[0]?.face||Array.from(options).find(function(slot){return slot[1].available.length;})?.[0]||options.keys().next().value;
   selection.set(m.uid,id);
  }
  return id;
 }
 function portTypesText(options){
  if(options.available.length)return '可安装 '+options.available.join('、');
  return options.supported.length?'仓室数量已达上限':'此处无仓室槽';
 }
 function mapHtml(m,S,options){
  var profile=STRUCTURES.profile(m),ordered=profile.orderedBusLayout,s=MULTIBLOCKS.bounds(m);
  var unit=34,id=current(m);
  var h='<div class="mb-map" style="width:'+(s.w+2)*unit+'px;height:'+(s.h+2)*unit+'px"><div class="mb-map-body" style="left:'+unit+'px;top:'+unit+'px;width:'+s.w*unit+'px;height:'+s.h*unit+'px">'+bodyHtml(m,unit)+'</div>';
  var occupiedPositions=new Map(),faces=MULTIBLOCKS.faces(m).map(function(face){
   var w=MULTIBLOCKS.worldFace(m,face),x=w.dx+DIRX(w.side),y=w.dy+DIRY(w.side),key=x+','+y;
   occupiedPositions.set(key,(occupiedPositions.get(key)||0)+1);
   return {face:face,x:x,y:y,side:w.side,key:key};
  });
  faces.forEach(function(position){
   var f=position.face,side=position.side;
   var p=MULTIBLOCKS.at(m,f.id),repair=MULTIBLOCKS.casingRepair(m,f.id,S),fit=options.get(f.id),hint=profile.faceHint&&profile.faceHint(m,f);
   if(ordered&&!p&&!repair&&!fit.supported.length&&!hint)return;
   var spec=p&&MULTIBLOCKS.spec(p.k),hasOutput=spec&&(spec.itemOut||spec.fluidOut)&&((p.items||[]).some(Boolean)||(p.tanks||[]).some(function(t){return t&&t.mb>0;}));
   var number=ordered&&profile.showInputPosition!==false&&fit.available.includes('输入总线')?f.x+1:null;
   var overlap=occupiedPositions.get(position.key)>1;
   var size=overlap?Math.floor(unit/2)+1:unit-4, inset=overlap?unit/2+2:0;
   var left=(position.x+1)*unit+(unit-size)/2-DIRX(side)*inset;
   var top=(position.y+1)*unit+(unit-size)/2-DIRY(side)*inset;
   var location=portLocation(profile,f.id,side);
   var tip=[p?name(p.k)+(ordered?portNumber(m,p,spec):''):'',location,
     repair?'缺少 '+name(repair.k):hint,portTypesText(fit)].filter(Boolean).join('\n');
   var unavailable=!p&&!repair&&!fit.available.length;
   h+='<button type="button" class="mb-face'+(id===f.id?' on':'')+(p?' occupied':'')+(repair?' missing':'')+(unavailable?' no-hatch':'')+'" data-mb-face="'+f.id+'" data-tip="'+esc(tip)+'" aria-label="'+esc(tip)+'" style="width:'+size+'px;height:'+size+'px;left:'+left+'px;top:'+top+'px">'+(p?icon(p.k,Math.min(22,size-2)):'<span>'+(unavailable?'·':number||['↑','→','↓','←'][side])+'</span>')+(hasOutput?'<i class="mb-output-dot" aria-label="有产物"></i>':'')+'</button>';
  });return h+'</div>';
 }
 function DIRX(d){return d===1?1:d===3?-1:0;}function DIRY(d){return d===0?-1:d===2?1:0;}
 function portLocation(profile,id,side){return (profile.orderedBusLayout?'第 '+(Number(id.split(',')[0])+1)+' 段 ':'')+names[side]+'侧';}
 function portNumber(m,p,s){var profile=STRUCTURES.profile(m),number=profile.portNumber&&profile.portNumber(m,p,s);if(number!==undefined)return number;if(s.itemOut&&s.fluidOut)return '，物品 '+(MULTIBLOCKS.members(m,'outs').indexOf(p)+1)+'号 / 流体 '+(MULTIBLOCKS.members(m,'tanksOut').indexOf(p)+1)+'号';return (s.itemIn||s.fluidIn||s.itemOut||s.fluidOut)?'，'+(MULTIBLOCKS.members(m,s.itemIn?'ins':s.fluidIn?'tanksIn':s.itemOut?'outs':'tanksOut').indexOf(p)+1)+'号':'';}
 function portHtml(m,S,fit){var profile=STRUCTURES.profile(m),id=current(m),custom=profile.faceHtml&&profile.faceHtml(m,id,S);if(custom!==undefined)return custom;
  var p=MULTIBLOCKS.at(m,id),s=p&&MULTIBLOCKS.spec(p.k),world=MULTIBLOCKS.worldFace(m,id),repair=MULTIBLOCKS.casingRepair(m,id,S);
  var location=portLocation(profile,id,world.side)+(profile.orderedBusLayout?'':' '+(world.dx+1)+','+(world.dy+1));
  var installSlot=p||fit.available.length||repair?slot({type:'structurePort',uid:m.uid,face:id},p&&{k:p.k,n:1}):'';
  var h='<div class="mb-port-heading">'+installSlot+'<div><strong>'+(p?esc(name(p.k))+portNumber(m,p,s):repair?'缺少结构方块':fit.available.length?'空仓室槽':portTypesText(fit))+'</strong><small>'+location+'</small>'+(!p&&fit.available.length?'<small class="mb-port-fit">'+esc(portTypesText(fit))+'</small>':'')+'</div></div><div class="mb-port-contents">';
  var modeIssue=s&&MACHINE_MODES.portIssue(m,s);
  if(modeIssue)h+='<div class="dim">'+esc(modeIssue)+'</div>';
  if(!p)return h+(repair?'<div class="mb-casing-hint">'+icon(repair.k,28)+'<span>放入 '+esc(name(repair.k))+' ×1</span></div>':'')+'</div>';
  if(s.uiHtml)h+=s.uiHtml(m,p,S);
  if(s.manualInventory){h+='<div class="mb-item-grid" style="--mb-cols:'+(s.columns||4)+'">';for(var di=0;di<s.slots;di++)h+=slot({type:'componentInventory',uid:m.uid,portUid:p.uid,index:di},p.items[di]);return h+'</div></div>';}
  if(s.aux)return h+AUX_INVENTORIES.html(m,p)+'</div>';
  if(s.me&&root.AE_UI)return h+AE_UI.portHtml(m,p,S)+(s.itemIn?circuitHtml(m,p):'')+'</div>';
  var itemGrid='';if(s.itemIn||s.itemOut){itemGrid='<div class="mb-item-grid" style="--mb-cols:'+(s.slots===1?1:s.slots<=4?2:s.slots<=9?3:4)+'">';for(var i=0;i<s.slots;i++)itemGrid+=slot({type:'port',uid:m.uid,portUid:p.uid,kind:s.itemIn?'in':'out',index:i},p.items[i]);itemGrid+='</div>';h+=itemGrid;}
  if(s.fluidIn||s.fluidOut){
   var caps=MULTIBLOCKS.tankCaps(s),kind=s.fluidIn?'fin':'fout',clearable=MULTIBLOCKS.hasClearableTanks(s);
   if(caps.length>1)h+='<div class="mb-fluid-grid">';
   caps.forEach(function(cap,i){
    var t=p.tanks[i];if(caps.length>1)h+='<div class="mb-fluid-cell">';
    h+='<div class="mb-fluid-name">'+esc(t?FLUID_PRESENTATION.name(t.f):'空')+'</div><div class="mb-tank-row">'+slot({type:'port',uid:m.uid,portUid:p.uid,kind:kind,index:i},t,'fluid')+'<span>'+((t&&t.mb)||0).toLocaleString()+' / '+cap.toLocaleString()+' mB</span></div>';
    if(clearable)h+='<button type="button" class="btn" data-mb-clear-fluid="'+p.uid+'" data-mb-clear-index="'+i+'"'+(t&&t.mb>0?'':' disabled')+'>清空余液</button>';
    if(caps.length>1)h+='</div>';
   });if(caps.length>1)h+='</div>';
  }
  if(HATCH_RULES.takesPower(s))h+='<div class="mb-port-energy"><strong>'+fc(Math.floor(p.eu||0))+' EU</strong><span>'+fc(s.voltage)+' V，'+s.amperage+' A</span></div>';
  if(s.type==='feedthrough'){var status=MULTIBLOCKS.feedStatus(S,m,p),amps=p.amps==null?s.amperage:p.amps;h+='<div class="mb-feed"><div class="mb-feed-rating">'+fc(s.voltage)+' V，'+amps+' A <span>'+fc(Math.floor(p.eu||0))+' / '+fc(s.energyCapacity)+' EU</span></div><div class="mb-feed-links"><span class="'+(status.outer?'connected':'')+'">● 外侧'+(status.outer?'已连接':'未连接')+'</span><span class="'+(status.inner?'connected':'')+'">● 内侧'+(status.inner?'已连接':'未连接')+'</span></div><div class="mb-feed-controls"><button type="button" class="btn" data-mb-feed-flow="'+p.uid+'">'+(p.flow==='out'?'室内 → 室外':'室外 → 室内')+'</button>'+(s.diode?'<label>电流 <select data-mb-feed-amps="'+p.uid+'">'+Array.from({length:s.amperage+1},function(_,n){return'<option value="'+n+'"'+(n===amps?' selected':'')+'>'+n+' A</option>';}).join('')+'</select></label>':'')+'</div><div class="mb-feed-rate">输入 '+fc(status.input)+' EU/t <span>输出 '+fc(status.output)+' EU/t</span></div></div>';}

  if(s.itemIn)h+=circuitHtml(m,p);
  if(s.fluidOut)h+='<label class="mb-lock-row"><span>锁定流体</span><span class="mb-lock-input"><input type="search" autocomplete="off" data-mb-fluid-search="'+p.uid+'" placeholder="搜索流体" value="'+esc(p.lockedFluid?FLUID_PRESENTATION.name(p.lockedFluid):'')+'"><button type="button" data-mb-unlock="'+p.uid+'" data-tip="取消流体锁定"'+(p.lockedFluid?'':' disabled')+'>×</button></span></label>';
  return h+'</div>';
 }
 function circuitHtml(m,p){var item=PROCESSING_ACCESS.configuration(p),h='';h+='<div class="mb-circuit-row"><span>'+(item?'虚拟配置':'编程电路')+'</span><button type="button" class="mb-slot mb-circuit'+(p.circuitConfigured?' configured':'')+'" data-mb-circuit="'+m.uid+'" data-mb-port="'+p.uid+'">'+icon(item?item.k:'gregtech:gt.integrated_circuit@'+(p.circuitConfigured?p.circ:0),28)+'</button></div>';if(circuitOpen.get(m.uid)===p.uid){h+='<div class="mb-circuit-palette">';for(var n=-1;n<=24;n++)h+='<button type="button" data-mb-cirset="'+n+'" data-mb-port="'+p.uid+'">'+(n<0?'空':n)+'</button>';h+='</div>';}return h;}
 function fluidChoices(m,p){var profile=STRUCTURES.profile(m),set=new Set(profile.outputFluids?profile.outputFluids(m,p):[]);if(DEFS.of(m.k).largeBoiler)set.add('steam');if(p.lockedFluid)set.add(p.lockedFluid);if(p.tanks[0])set.add(p.tanks[0].f);CONTENT.recipes(DEFS.of(m.k).recipeMap).forEach(function(r){(r.fout||[]).forEach(function(f){set.add(f.f);});});return Array.from(set).filter(function(f){return MULTIBLOCKS.allowsFluid(m,p,f,'output');}).sort(function(a,b){return a.localeCompare(b);});}
 function report(r,S,save){var changed=r.ok||r.code==='PARTIAL';if(!changed&&typeof toastAt==='function')toastAt(null,({INPUT:'缺少结构材料',MATERIAL:'缺少结构材料',OCCUPIED:'结构范围内有其他设备或管线',SIZE_LOCKED:'尺寸已固定，需要拆除后重新放置',CONTENTS:'先取出受影响的物品或流体',RUNNING:'先完成当前批次',STALE:'部件已发生变化，请重新选择'})[r.code]||'无法执行');if(changed){if(save)save();if(typeof markInv==='function')markInv();if(root.__fxRepaint)root.__fxRepaint();}return changed;}
 function mount(host,m,S,save){if(!host)return;if(!MULTIBLOCKS.live(m)&&!m.structure)MULTIBLOCKS.initializeEmpty(m);host._multi={m:m,S:S,save:save};host.toggleAttribute('data-mb-large-map',!!STRUCTURES.profile(m).largerPortMap);if(host.dataset.mbUid!==m.uid){host._fieldsReady=false;host.dataset.mbUid=m.uid;host.classList.add('multiblock-panel');host.classList.toggle('mb-ordered-ports',!!STRUCTURES.profile(m).orderedBusLayout);host.innerHTML='<div class="mb-structure-heading"><span class="mb-formed"></span><div class="mb-options"></div></div><p class="mb-port-guide" hidden></p><div class="mb-interface"><div class="mb-preview"><div class="mb-map-host"><div class="mb-map-layer"></div></div>'+MULTIBLOCK_LAYOUT.toolbar+'</div><div class="mb-port-pane"></div></div><div class="mb-material-zone" data-ui-preserve="1">'+MULTIBLOCK_LAYOUT.column('固定','mb-fixed-section')+MULTIBLOCK_LAYOUT.column('可更换','mb-build-fields')+'</div><div class="mb-structure-tail"><div class="mb-recovered"></div><div class="mb-build-actions"><button type="button" class="btn" data-mb-build>填入结构方块</button></div></div>';
   host.onclick=function(e){var f=e.target.closest('[data-mb-face]');if(f){selection.set(m.uid,f.dataset.mbFace);circuitOpen.delete(m.uid);var held=ITEM_CURSOR.held(S),ref={type:'structurePort',uid:m.uid,face:f.dataset.mbFace},endpoint=held&&ITEM_TRANSFER.endpoint(S,ref);if(held&&endpoint&&endpoint.accepts(held)){var result=ITEM_CURSOR.place(S,ref,0);report(result,S,save);if(root.ITEM_DRAG)ITEM_DRAG.syncCursor();}refresh(host,true);return;}var n=e.target.closest('[data-mb-cirset]');if(n){MULTIBLOCKS.setCircuit(m,n.dataset.mbPort,+n.dataset.mbCirset);circuitOpen.delete(m.uid);if(save)save();refresh(host,true);return;}if(e.target.closest('[data-mb-isolation]')){if(!STRUCTURES.instance(m).inputIsolationFixed)m.structure.inputSeparation=!m.structure.inputSeparation;if(save)save();refresh(host,true);return;}if(e.target.closest('[data-mb-build]')){var variant=Object.assign({},m.structure&&m.structure.variant||m.buildPlan||{});variant.emptyPorts=!MULTIBLOCKS.live(m);if(report(MULTIBLOCKS.fillFixed(S,m,variant),S,save)){ENGINE.ensure(m);host._fieldsReady=false;refresh(host,true);}}};
   var mainClick=host.onclick;host.onclick=function(e){var pager=e.target.closest('[data-mb-page]');if(pager){MULTIBLOCK_LAYOUT.activatePage(pager);return;}var clearFluid=e.target.closest('[data-mb-clear-fluid]');if(clearFluid){
    if(MULTIBLOCKS.clearPortFluid(m,clearFluid.dataset.mbClearFluid,Number(clearFluid.dataset.mbClearIndex))){if(save)save();refresh(host,true);}return;}mainClick(e);var flow=e.target.closest('[data-mb-feed-flow]');if(flow){var p=MULTIBLOCKS.byUid(m,flow.dataset.mbFeedFlow);report(MULTIBLOCKS.setFeed(m,p.uid,p.flow==='out'?'in':'out',p.amps==null?MULTIBLOCKS.spec(p.k).amperage:p.amps),S,save);refresh(host,true);}var clear=e.target.closest('[data-mb-unlock]');if(clear){report(MULTIBLOCKS.setLock(m,clear.dataset.mbUnlock,''),S,save);refresh(host,true);}};
   function search(e){var input=e.target.closest('[data-mb-fluid-search]');if(!input)return;var p=MULTIBLOCKS.byUid(m,input.dataset.mbFluidSearch);if(!p)return;FLUID_PICKER.open(input,{preferred:fluidChoices(m,p),allowed:STRUCTURES.profile(m).fluidPortAccepts?function(f){return MULTIBLOCKS.allowsFluid(m,p,f,'output');}:null,onSelect:function(f){report(MULTIBLOCKS.setLock(m,p.uid,f),S,save);input.value=p.lockedFluid?FLUID_PRESENTATION.name(p.lockedFluid):'';input.blur();refresh(host,true);}});}
   host.onchange=function(e){var setting=e.target.closest('[data-mb-setting]');if(setting){var port=MULTIBLOCKS.byUid(m,setting.dataset.mbSettingPort),spec=port&&MULTIBLOCKS.spec(port.k),value=setting.value===''&&!setting.required?0:setting.valueAsNumber,result=spec&&spec.configure?spec.configure(port,setting.dataset.mbSetting,value,m):{ok:false,code:'VALUE'};if(result.ok){setting.defaultValue=setting.value=String(value);if(save)save();}else{setting.value=setting.defaultValue;if(typeof toastAt==='function')toastAt(null,result.text||'频道无效');}refresh(host,true);return;}if(e.target.matches('[data-mb-shield]')){var radiation=MULTIBLOCKS.byUid(m,e.target.dataset.mbShield),coverage=+e.target.value;if(radiation&&MULTIBLOCKS.spec(radiation.k).aux==='radiation'&&Number.isInteger(coverage)&&coverage>=0&&coverage<=100){radiation.coverage=coverage;if(save)save();}else if(radiation)e.target.value=radiation.coverage||0;refresh(host,true);return;}if(e.target.matches('[data-mb-mode]')){var result=MULTIBLOCK_RULES.setMode(m,+e.target.value);if(!result.ok)e.target.value=m.processingMode||0;report(result,S,save);refresh(host,true);return;}var n=e.target.closest('[data-mb-feed-amps]');if(n){var p=MULTIBLOCKS.byUid(m,n.dataset.mbFeedAmps);report(MULTIBLOCKS.setFeed(m,p.uid,p.flow==='out'?'out':'in',+n.value),S,save);refresh(host,true);}};
   host.addEventListener('focusin',function(e){if(e.target.matches('[data-mb-fluid-search]')){e.target.value='';search(e);}});
   host.oninput=search;
   host.addEventListener('focusout',function(e){if(e.target.matches('[data-mb-fluid-search]')){var p=MULTIBLOCKS.byUid(m,e.target.dataset.mbFluidSearch);if(p)e.target.value=p.lockedFluid?FLUID_PRESENTATION.name(p.lockedFluid):'';}});
  }
  if(root.AE_UI)AE_UI.bindPorts(host,m,S,save);refresh(host,false);
 }
 function materialRow(cell,label,count,required,missing,hint){
  return '<div class="mb-material-row'+(missing?' missing':'')+'">'+cell+'<span data-tip="'+esc(hint?label+'\n'+hint:label)+'">'+esc(label)+'</span><b>'+count+' / '+required+'</b></div>';
 }
 function refreshStructureStatus(host,m,live){
  var status=host.querySelector('.mb-formed'),errors=live?m.structure.errors:null,ready=live&&m.structure.formed;
  var text=ready?'已建成':'未建成';
  if(status.textContent!==text)status.textContent=text;
  if(status.hidden!==!!ready)status.hidden=!!ready;
  var issues=host.querySelector('.mb-issues');
  if(!issues){
   issues=document.createElement('ul');issues.className='mb-issues';issues.setAttribute('aria-label','待完成的结构要求');
   host.querySelector('.mb-structure-heading').after(issues);
  }
  if(issues._errors!==errors){
   issues._errors=errors;
   UI_KIT.patch(issues,(errors||[]).map(function(error){return '<li>'+esc(error)+'</li>';}).join(''));
   issues.hidden=!(errors&&errors.length);
  }
 }
 function refresh(host,force){if(!host||!host._multi)return;var state=host._multi,m=state.m,live=MULTIBLOCKS.live(m);if(live)MULTIBLOCKS.validate(m);refreshStructureStatus(host,m,live);var guide=host.querySelector('.mb-port-guide'),hint=STRUCTURES.profile(m).portHint;hint=(typeof hint==='function'?hint(m):hint)||'';guide.hidden=!hint;if(guide.textContent!==hint)guide.textContent=hint;
  if(force){var windowHost=host.closest('.machine-window');if(windowHost)RESOURCE_UI.refresh(windowHost,m);}
  var worldSignature=JSON.stringify([m.processingMode,m.structure&&m.structure.variant,MULTIBLOCKS.ports(m).map(function(p){return[p.k,p.face];}),m.structure&&m.structure.wallHoles,m.structure&&m.structure.casingGaps,m.structure&&m.structure.fixedParts]);if(host._worldSignature!==worldSignature){if(host._worldSignature!=null&&root.__fxRepaint)root.__fxRepaint();host._worldSignature=worldSignature;}
  var map=host.querySelector('.mb-map-host'),layer=map.firstElementChild,shape=MULTIBLOCKS.shape(m),ports=MULTIBLOCKS.ports(m);
  var preview=MULTIBLOCK_LAYOUT.preview(map,layer,host.querySelector('.mb-view-tools'));
  var optionsSignature=JSON.stringify([m.k,shape.w,shape.h,m.processingMode,m.structure?.variant,ports.map(function(p){return[p.face,p.k];})]);
  if(map._optionsSignature!==optionsSignature){
   map._options=MULTIBLOCKS.portOptions(m);
   map._optionsSignature=optionsSignature;
  }
  var id=current(m,map._options);
  var mapSignature=JSON.stringify([optionsSignature,id,m.rotation,m.structure?.formed,ports.map(function(p){return (p.items||[]).some(Boolean)||(p.tanks||[]).some(function(t){return t&&t.mb>0;});}),m.structure?.fixedParts,m.structure?.wallHoles,m.structure?.casingGaps]);
  if(map._signature!==mapSignature){
   UI_KIT.patch(layer,mapHtml(m,state.S,map._options));preview.draw();
   map._signature=mapSignature;
   map._controllerFace=null;
  }
  if(root.MACHINE_VISUALS)MACHINE_VISUALS.refreshController(m,map);
  var pane=host.querySelector('.mb-port-pane'),p=MULTIBLOCKS.at(m,current(m)),signature=JSON.stringify([optionsSignature,id,m.rotation,live,p,p&&MULTIBLOCKS.spec(p.k).dataReceiver&&root.RESEARCH_DATA?RESEARCH_DATA.readPort(state.S,p).size:null,MULTIBLOCKS.casingRepair(m,current(m),state.S),p&&MULTIBLOCKS.spec(p.k).type==='feedthrough'?MULTIBLOCKS.feedStatus(state.S,m,p):null,circuitOpen.get(m.uid)]);if((force||pane._signature!==signature)&&!(document.activeElement&&pane.contains(document.activeElement)&&document.activeElement.matches('select,input'))){var temp=document.createElement('div');temp.innerHTML=live?portHtml(m,state.S,map._options.get(id)):'<div class="mb-port-contents"><span class="dim">先建造结构</span></div>';if(root.UI_KIT&&pane.firstChild){var wrapper=document.createElement('div');wrapper.className='mb-port-inner';wrapper.innerHTML=temp.innerHTML;UI_KIT.sync(pane.firstChild,wrapper);}else pane.innerHTML='<div class="mb-port-inner">'+temp.innerHTML+'</div>';pane._signature=signature;MULTIBLOCK_LAYOUT.fitDetail(pane);}
  if(p&&MULTIBLOCKS.spec(p.k).stockingTypes&&root.AE_UI)AE_UI.refreshPort(pane,p,state.S);
  var options=host.querySelector('.mb-options'),profile=STRUCTURES.profile(m),definition=DEFS.of(m.k);
  var isolation='<button type="button" class="io-toggle" data-mb-isolation role="switch"><span>输入隔离</span><i class="io-switch-track" aria-hidden="true"></i></button>';
  if(profile.modes){
   var modeDefinition=STRUCTURES.instance(m),modeSig=m.processingMode||0;
   if(options._modeSig!==modeSig){
    options.innerHTML='<label>工作模式 <select data-mb-mode>'+profile.modes.map(function(v,i){return '<option value="'+i+'"'+(i===(m.processingMode||0)?' selected':'')+'>'+esc(v.name)+'</option>';}).join('')+'</select></label>'+(!modeDefinition.inputPolicy&&!modeDefinition.inputIsolationFixed&&modeDefinition.showInputIsolation!==false?isolation:'');
    options._modeSig=modeSig;
   }
  }else if(live&&definition.behavior==='batch_processor'&&!definition.inputIsolationFixed&&definition.showInputIsolation!==false){
   if(!options.firstChild)options.innerHTML=isolation;
  }else options.innerHTML='';
  var isolationButton=options.querySelector('[data-mb-isolation]');
  if(isolationButton){
   var checked=String(m.structure.inputSeparation!==false);
   if(isolationButton.getAttribute('aria-checked')!==checked)isolationButton.setAttribute('aria-checked',checked);
  }
  var variant=m.structure&&m.structure.variant||m.buildPlan||{},plan=STRUCTURES.plan(m,Object.assign({},variant,{emptyPorts:!live}));
  var requirements=(live?MULTIBLOCKS.required(m).fixed:plan.parts).filter(function(p){return MULTIBLOCKS.fixedMaterial(m,p.k);}),owned={};
  if(live)m.structure.fixedParts.forEach(function(p){if(MULTIBLOCKS.fixedMaterial(m,p.k)&&!requirements.some(function(q){return q.k===p.k;}))requirements.push({k:p.k,n:0});});
  else COMMANDS.owned(state.S).forEach(function(p){owned[p.k]=p.n;});
  var materials=host.querySelector('.mb-fixed-section'),matSig=JSON.stringify([live,requirements,live?m.structure.fixedParts:owned]);
  if(materials._signature!==matSig){
   MULTIBLOCK_LAYOUT.page(materials,requirements.map(function(v){var count=live?MULTIBLOCKS.materialCount(m,v.k):owned[v.k]||0;
    var iconHtml=live?slot({type:'structureMaterial',uid:m.uid,key:v.k},count?{k:v.k,n:count}:null):'<span class="mb-material-icon">'+icon(v.k,24)+'</span>';
    return materialRow(iconHtml,name(v.k),count,v.n,live&&count<v.n);
   }));materials._signature=matSig;
  }
  var recovered=host.querySelector('.mb-recovered'),recoverySignature=JSON.stringify(live?[m.structure.recoveryItems,m.structure.recoveryFluids]:null);if(recovered._signature!==recoverySignature){recovered.innerHTML=live?(m.structure.recoveryItems||[]).map(function(p,i){return p?slot({type:'structureRecovery',uid:m.uid,index:i},p):'';}).join('')+(m.structure.recoveryFluids||[]).map(function(p,i){return p?slot({type:'structureRecoveryFluid',uid:m.uid,index:i},p,'fluid'):'';}).join(''):'';recovered._signature=recoverySignature;}
  var fields=host.querySelector('.mb-build-fields'),upgradeRows=STRUCTURE_UPGRADES.groups(m).flatMap(function(group){
   var current=STRUCTURE_UPGRADES.installed(m,group.field),next=STRUCTURE_UPGRADES.preview(null,m,group.field,current.value).next||group.parts(current.value,m),list=current.parts.slice();
   if(group.amounts&&!next.length)next=group.parts(1,m);
   next.forEach(function(p){if(!list.some(function(a){return a.k===p.k;}))list.push({k:p.k,n:0});});
   return list.map(function(actual){var need=next.find(function(p){return p.k===actual.k;});
    var cell=slot({type:'structureUpgrade',uid:m.uid,field:group.field,partKey:actual.k},actual.n?actual:null);
    return materialRow(cell,name(actual.k),actual.n,need?need.n:0,false,group.label+'：手持材料点击更换');
   });
  });
  MULTIBLOCK_LAYOUT.page(fields,upgradeRows);
  var heat=host.querySelector('.mb-current-heat');if(!heat){heat=document.createElement('div');heat.className='mb-current-heat';options.before(heat);}heat.textContent=profile.heatLabel?profile.heatLabel+' '+(m.structure&&m.structure.heat||0).toLocaleString()+' K':'';
  var build=host.querySelector('[data-mb-build]');
  var formed=!!(m.structure&&m.structure.formed);
  if(build.hidden!==formed)build.hidden=build.disabled=formed;
 }
 function circuitClick(node,e,S,save,scroll){var m=ENTITIES.get(S,node.dataset.mbCircuit),p=m&&MULTIBLOCKS.byUid(m,node.dataset.mbPort);if(!p)return;var held=root.ITEM_CURSOR&&ITEM_CURSOR.held(S),copy=held&&/^gregtech:gt.integrated_circuit@(\d+)$/.exec(held.k),n;if(!scroll&&e.shiftKey&&e.button===0){circuitOpen.set(m.uid,circuitOpen.get(m.uid)===p.uid?null:p.uid);}else{if(copy)n=+copy[1];else if(!scroll&&e.shiftKey&&e.button===2)n=-1;else{n=(p.circuitConfigured?p.circ:-1)+(scroll||(e.button===2?-1:1));if(n>24)n=-1;if(n< -1)n=24;}MULTIBLOCKS.setCircuit(m,p.uid,n);if(save)save();}var host=node.closest('.multiblock-panel');refresh(host,true);}
 root.MULTIBLOCK_UI={mount:mount,refresh:refresh,circuitHtml:circuitHtml,bodyHtml:bodyHtml,material:material,circuitClick:circuitClick,select:function(uid,id){selection.set(uid,id);}};
})(typeof window!=='undefined'?window:globalThis);
