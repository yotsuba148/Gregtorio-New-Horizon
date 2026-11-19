(function(root){
 'use strict';
 var parameterProviders=[];
 var S,save,host,J,result=null,serial=0,searchSerial=0,searchTimer,saveTimer,catalog=null,catalogJob=null,catalogCache=new Map(),groups=null,searchList=null,searchRange='',wheelRemainder=0,cheating=false,previousSearch=null;
 function esc(s){return UI_KIT.esc?UI_KIT.esc(s):String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
 function clean(s){return String(s||'').replace(/§[0-9a-fk-or]/gi,'');}
 function label(key,target){var item=target==='item'&&CONTENT.item(key);if(item&&item.meta===32767&&/Coolantcell$/.test(item.id))return clean(GD.items[item.id+'@0']||item.name)+'（待冷却）';return clean(target==='fluid'?GD.fluids[key]||key:GD.items[key]||CONTENT.item(key)?.name||key);}
 function number(n){var v=Number(n)||0,s=v<0?'-':'',a=Math.abs(v),u=['','K','M','B','T','Qa','Qi'],i=0;if(a<1000)return s+(a%1?+a.toFixed(2):String(a));while(a>=1000&&i<u.length-1){a/=1000;i++;}return s+(a>=100?Math.round(a):a>=10?+a.toFixed(1):+a.toFixed(2))+u[i];}
 function current(){return J.history[J.cursor]||null;}
 function persist(){clearTimeout(saveTimer);saveTimer=setTimeout(function(){if(save)save();},300);}
 function groupInfo(id){
  if(!groups){groups=new Map([['craft:workbench',{name:'工作台',key:'minecraft:crafting_table@0'}],['furnace',{name:'熔炉',key:'minecraft:furnace@0'}],['craft:nasa',{name:'NASA 工作台',key:MECHANISMS.stations.nasa.k}]]);
   (GD.machines.cats||[]).forEach(function(c){var id=CONTENT.mapId(c.id),k=(c.tiers||[])[0]?.k;if(!groups.has(id))groups.set(id,{name:clean(c.cn||c.name||c.id).replace(/^基础/,''),key:k});});
   DEFS.list().forEach(function(d){if(d.recipeMap&&!groups.has(d.recipeMap))groups.set(d.recipeMap,{name:clean(d.cn||d.cat),key:d.key});});
  }
  var found=groups.get(id);return{name:GD.recipeMapLabels?.[id]||found?.name||({nasa:'NASA 工作台',arcane:'奥术工作台',thaumcraft:'奥术工作台'})[id?.replace(/^craft:/,'')]||String(id||'配方').replace(/^gt\.recipe\./,'').replace(/^craft:/,''),key:found?.key||null};
 }
 function fluidIcon(key,size){return root.FLUID_PRESENTATION?FLUID_PRESENTATION.html(key,size||30):'';}
 function icon(key,target,size){return target==='fluid'?fluidIcon(key,size):root.iconOrText(key,size||30);}
 function shortAmount(n){return n>=1e9?number(Math.round(n/1e8)/10)+'G':n>=1e6?number(Math.round(n/1e5)/10)+'M':n>=1e4?number(Math.round(n/100)/10)+'k':number(n);}
 function querySlot(key,target,amount,meta){meta=meta||{};var title=label(key,target)+(amount!=null?' ×'+number(amount)+(target==='fluid'?' mB':''):'')+(meta.keep?'，不消耗':'')+(meta.tool?'，工具':'')+(meta.chance!=null&&meta.chance<10000?'，概率 '+number(meta.chance/100)+'%':'');
  var tag='button';return'<'+tag+' type="button"'+' class="jei-slot'+(target==='fluid'?' fluid':'')+'" data-jei-key="'+esc(key)+'" data-jei-target="'+target+'" title="'+esc(title)+'" aria-label="'+esc(title)+'">'+icon(key,target,30)+(amount!=null?'<span class="jei-amount">'+shortAmount(amount)+'</span>':'')+(meta.keep?'<span class="jei-marker">NC</span>':meta.tool?'<span class="jei-marker">工具</span>':'')+(meta.chance!=null&&meta.chance<10000?'<span class="jei-chance">'+number(meta.chance/100)+'%</span>':'')+'</'+tag+'>';
 }
 function normalize(raw){if(!raw||typeof raw.key!=='string')return null;var target=raw.target==='fluid'?'fluid':'item',key=target==='fluid'?raw.key:RECIPE_QUERY.lookupItemKey(raw.key);
  if(target==='item'&&!CONTENT.item(key)||target==='fluid'&&!Object.prototype.hasOwnProperty.call(GD.fluids,key))return null;
  if(target==='item'&&root.CONTENT_SCOPE&&!CONTENT_SCOPE.allowed(key))return null;
  return{key:key,target:target,mode:raw.mode==='uses'?'uses':'recipes',group:typeof raw.group==='string'?raw.group:null,recipeId:typeof raw.recipeId==='string'?raw.recipeId:null,offset:Math.max(0,raw.offset|0),scroll:Math.max(0,Number(raw.scroll)||0),alternatives:Object.assign({},raw.alternatives||{})};
 }
 function ensure(state){var j=state.jei||{};j.history=(Array.isArray(j.history)?j.history:[]).map(normalize).filter(Boolean).slice(-80);j.recent=(Array.isArray(j.recent)?j.recent:j.history.slice().reverse()).map(normalize).filter(Boolean).filter(function(v,i,a){return a.findIndex(function(x){return x.key===v.key&&x.target===v.target;})===i;}).slice(0,80);j.cursor=Math.min(j.history.length-1,Math.max(0,j.cursor|0));j.bookmarks=(Array.isArray(j.bookmarks)?j.bookmarks:[]).map(normalize).filter(Boolean);j.view=['jei','ore'].includes(j.view)?j.view:'quests';j.search=typeof j.search==='string'?j.search:'';j.searchScroll=Math.max(0,Number(j.searchScroll)||0);delete j.searchPage;j.searchType=['all','item','fluid'].includes(j.searchType)?j.searchType:'all';j.savedTab=['bookmarks','history','favorites'].includes(j.savedTab)?j.savedTab:'bookmarks';j.schema=2;state.jei=j;return j;}
 function view(v,opening){var wasHidden=host.hidden;J.view=v==='jei'?'jei':'quests';document.getElementById('quests').classList.toggle('jei-mode',J.view==='jei');host.hidden=J.view!=='jei';
  ['questchaps','questfinder','questtreepanel','questlist'].forEach(function(id){document.getElementById(id).hidden=J.view!=='quests';});
document.getElementById('questcount').hidden=J.view!=='quests';document.querySelectorAll('[data-side-view]').forEach(function(b){b.classList.toggle('on',b.dataset.sideView===J.view);b.setAttribute('aria-selected',String(b.dataset.sideView===J.view));});
  document.getElementById('qclose').title='收起右栏';document.getElementById('qopen').title='展开右栏';
  if(typeof root.hideQtip==='function')root.hideQtip();
  if(J.view!=='quests'){
   if(typeof root.closeQuestMarkers==='function')root.closeQuestMarkers();
   document.getElementById('quest-search-results').hidden=true;
  }
  if(J.view==='jei'){if(wasHidden||!searchList)search();if(!opening&&current()&&!result)renderQuery();}persist();
 }
 function capture(){var c=current(),box=host.querySelector('.jei-detail');if(c&&!box.hasAttribute('aria-busy'))c.scroll=box.scrollTop;}
 function remember(value){var old=J.recent.findIndex(function(s){return s.key===value.key&&s.target===value.target;});if(old>=0)J.recent.splice(old,1);J.recent.unshift(JSON.parse(JSON.stringify(value)));if(J.recent.length>80)J.recent.length=80;}
 function open(request){if(!host)return;var n=normalize(request);if(!n)return;capture();remember(n);var c=current();
  if(!c||c.key!==n.key||c.target!==n.target||c.mode!==n.mode||n.recipeId&&c.recipeId!==n.recipeId){J.history=J.history.slice(0,J.cursor+1);J.history.push(n);if(J.history.length>80)J.history.shift();J.cursor=J.history.length-1;}else if(n.recipeId)Object.assign(c,n);
  J.view='jei';view('jei',true);if(S.qfold?.closed&&typeof root.toggleQuests==='function')root.toggleQuests(false);renderQuery();renderSaved();persist();
 }
 function navigate(delta){var next=J.cursor+delta;if(next<0||next>=J.history.length)return;capture();J.cursor=next;renderQuery();renderSaved();persist();}
 function navigation(){var c=current();host.querySelector('.jei-navigation').innerHTML='<button data-jei-back="-1" title="后退"'+(J.cursor>0?'':' disabled')+'>‹</button><button data-jei-back="1" title="前进"'+(J.cursor<J.history.length-1?'':' disabled')+'>›</button><button class="'+(c?.mode!=='uses'?'on':'')+'" data-jei-mode="recipes">配方</button><button class="'+(c?.mode==='uses'?'on':'')+'" data-jei-mode="uses">用途</button><button class="jei-item-star" data-jei-item-star="1" title="收藏当前物品"'+(c?'':' disabled')+'>☆</button>';
  host.querySelector('.jei-target').innerHTML=c?icon(c.key,c.target,24)+'<strong title="'+esc(label(c.key,c.target))+'">'+esc(label(c.key,c.target))+'</strong>':'<strong>合成表查询</strong>';if(c&&c.target==='item'){var fluids=Array.from(new Set(GD.containerRegistry.filter(function(p){return p.filled===c.key;}).map(function(p){return p.fluid;})));host.querySelector('.jei-target').innerHTML+=fluids.map(function(f){return '<button class="jei-contained-fluid" data-jei-contained="'+esc(f)+'">'+esc(label(f,'fluid'))+'，流体配方</button>';}).join('');}
 }
 async function renderQuery(){var c=current(),token=++serial;navigation();if(!c){host.querySelector('.jei-detail').innerHTML='<div class="jei-empty">选择物品</div>';return;}
  // 矿物先出流程/来源，配方索引慢了也不空等
  var earlyOre=oreMaterialFor(c);
  if(earlyOre&&root.ORE_GUIDE_UI){c.oreMat=earlyOre;if(!c.group||c.group.indexOf('ore:')===0)c.group=c.mode==='uses'?'ore:flow':'ore:source';renderDetail();}
  result=null;host.querySelector('.jei-detail').setAttribute('aria-busy','true');host.querySelector('.jei-categories').setAttribute('aria-busy','true');if(!host.querySelector('.jei-detail').hasChildNodes())host.querySelector('.jei-detail').innerHTML='<div class="jei-empty">查询中…</div>';
  try{var next=await RECIPE_QUERY.query(Object.assign({},c,{grouped:true,limit:1}));if(token!==serial||c!==current())return;result=next;
   var chosen=c.group==='ore:flow'||c.group==='ore:source'||(next.groups||[]).some(function(g){return g.id===c.group;});
   if(!chosen)c.group=next.group;
   c.offset=next.offset;c.recipeId=next.records[0]?.recipe.id||null;
   var oreMat=oreMaterialFor(c);
   if(oreMat){var gid=c.mode==='uses'?'ore:flow':'ore:source';next.groups=[{id:gid,count:1}].concat(next.groups||[]);
    var real=(next.groups.slice(1).some(function(g){return g.id===c.group;}));
    if(!real)c.group=gid;
    c.oreMat=oreMat;if(!real)c.recipeId=null;}
   host.querySelector('.jei-categories').innerHTML=next.groups.map(function(g){var info=g.id.indexOf('ore:')===0?{name:oreGroupName(g.id)}:groupInfo(g.id);
    var glyph=g.id==='ore:source'?'<img class="jei-ore-glyph" src="modicons/phase135/dim-Ow.png" alt="">':g.id==='ore:flow'?UI_KIT.glyph('grid',20):(info.key?root.iconOrText(info.key,23):UI_KIT.glyph('grid',20));
    return'<button data-jei-group="'+esc(g.id)+'" class="'+(g.id===c.group?'on':'')+'" title="'+esc(info.name)+'">'+glyph+'<span>'+esc(info.name)+'</span></button>';}).join('');
   focusCategory();
   remember(c);renderDetail();renderSaved();persist();
  }catch(e){if(token!==serial)return;host.querySelector('.jei-categories').innerHTML='';host.querySelector('.jei-detail').innerHTML='<div class="jei-empty">查询失败<button data-jei-retry="1">重试</button></div>';console.error('JEI query',e);}
  finally{if(token===serial){host.querySelector('.jei-detail').removeAttribute('aria-busy');host.querySelector('.jei-categories').removeAttribute('aria-busy');}}
 }
 function focusCategory(){if(host.hidden)return;var active=host.querySelector('[data-jei-group].on'),bar=host.querySelector('.jei-categories');if(active){var top=active.offsetTop,bottom=top+active.offsetHeight;if(top<bar.scrollTop)bar.scrollTop=top;else if(bottom>bar.scrollTop+bar.clientHeight)bar.scrollTop=bottom-bar.clientHeight;}}
 function fitDetail(){if(!host||host.hidden)return;host.dataset.density=host.clientHeight<430?'small':host.clientHeight<660?'compact':'normal';var box=host.querySelector('.jei-detail'),article=box.querySelector('.jei-recipe'),head=box.querySelector('.jei-recipe-heading');if(!article||!head)return;article.style.zoom='1';var room=box.clientHeight-head.offsetHeight-3,height=article.offsetHeight;article.style.zoom=String(Math.min(1,Math.max(0,room)/Math.max(1,height)));box.scrollTop=0;}
 function alternatives(p){var a=Array.from(new Set((p.alternatives||[p.k]).map(function(k){return CONTENT.canonicalKey(k);}))).filter(function(k){return !root.CONTENT_SCOPE||CONTENT_SCOPE.ingredientAllowed(k);});return a.length?a:[CONTENT.canonicalKey(p.k)];}
 function ingredient(p,slotId){var c=current(),a=alternatives(p);
  var selected=c.alternatives[slotId],key=a.includes(selected)?selected:a.includes(c.key)?c.key:a[0];var tool=!!(GD.toolRules&&GD.toolRules[CONTENT.baseKey(key)]);
  return'<div class="jei-slot-wrap">'+querySlot(key,'item',p.n,{keep:p.consumed===false,tool:tool&&!slotId.startsWith('out:'),chance:p.chance})+(a.length>1?'<button class="jei-alt" data-jei-alt="'+esc(slotId)+'" title="切换替代原料（'+a.length+' 种）">↻</button>':'')+'</div>';
 }
 function section(title,items,fluids,side,craft){if(!items.length&&!fluids.length)return'';var grid;
  if(craft&&!craft.shapeless&&craft.width<=3&&craft.height<=3&&craft.grid){grid='<div class="jei-slots jei-craft-grid">'+craft.grid.map(function(i){return i<0?'<span class="jei-slot empty"></span>':ingredient({k:craft.slots[i][0],alternatives:craft.slots[i],n:1},'craft:'+i);}).join('')+'</div>';}
  else grid='<div class="jei-slots">'+items.map(function(p,i){return ingredient(p,side+':'+i);}).join('')+fluids.map(function(p){return querySlot(p.f,'fluid',p.mb,{keep:p.consumed===false||p.mb===0});}).join('')+'</div>';
  return'<section class="jei-flow-section"><h4>'+title+'</h4>'+grid+'</section>';
 }
 function circuitSlot(p){var key='gregtech:gt.integrated_circuit@'+p.circuit;if(!CONTENT.item(key))key='gregtech:gt.integrated_circuit@0';return'<button type="button" class="jei-slot jei-circuit" data-jei-key="'+esc(key)+'" data-jei-target="item" title="编程电路，配置 '+number(p.circuit)+'，不消耗" aria-label="编程电路，配置 '+number(p.circuit)+'">'+icon(key,'item',30)+'</button>';}
 function machineSection(title,cells,rows){return'<section class="jei-flow-section"><h4>'+title+'</h4><div class="jei-native-slots" style="--jei-native-rows:'+rows+'">'+cells.map(function(cell){var content=cell.empty?'<span class="jei-slot empty'+(cell.group==='fluid'?' fluid':'')+'"></span>':cell.type==='circuit'?circuitSlot(cell.p):cell.type==='fluid'?querySlot(cell.p.f,'fluid',cell.p.mb,{keep:cell.p.consumed===false||cell.p.mb===0}):ingredient(cell.p,cell.id);return'<div class="jei-native-cell" data-jei-kind="'+(cell.type==='circuit'?'circuit':cell.group)+'" data-jei-filled="'+(!cell.empty)+'" style="--jei-col:'+cell.col+';--jei-row:'+cell.row+'">'+content+'</div>';}).join('')+'</div></section>';}
 function parameters(entry){var r=entry.recipe,ps=[],cond=r.conditions||{};function add(a,b){ps.push('<div><dt>'+esc(a)+'</dt><dd>'+esc(b)+'</dd></div>');}
  if(entry.kind==='machine'&&r.eut>0){add('电压等级',DEFS.tagOf(DEFS.recipeTier(r.eut)));add('功率',number(r.eut)+' EU/t');}
  if(entry.kind==='furnace')add('能源','燃料');
  if(r.durationTicks>0)add('耗时',number(r.durationTicks/20)+' s，'+number(r.durationTicks)+' tick');
  if(r.extractionSource){var source=r.extractionSource;add('矿源',DIMENSIONS.name(source.dimension));if(source.depth)add('深度',String(source.depth));if(source.rate)add('基础流量',number(source.rate)+' mB/s');}
  if(r.workEnergyEU)add('工作步耗能',number(r.workEnergyEU.numerator/r.workEnergyEU.denominator)+' EU / '+r.workIntervalTicks+' tick');
  if(r.heat){var coil=root.GD&&GD.coilForHeat?GD.coilForHeat(r.heat):null;add('炉温',(coil?coil.cn+' ':'')+number(r.heat)+' K');}if(r.cleanroom)add('环境','洁净室');if(cond.lowGravity)add('环境','低重力');if(cond.compressionTier)add('压缩等级',String(cond.compressionTier));
  Object.keys(cond.attachment||{}).forEach(function(k){add('组件',label(cond.attachment[k],'item'));});
   if(r.needsEmptyOutput)add('输出条件','空输出槽');
   if(entry.kind==='machine')parameterProviders.forEach(function(render){render(r,add);});
  Object.keys(r.costs?.start||{}).forEach(function(id){add('消耗',root.RESOURCE_UI?RESOURCE_UI.resourceText(id,r.costs.start[id]):number(r.costs.start[id])+' '+id);});
  (r.research?.all||[]).forEach(function(id){add('研究',GD.tcLabels?.research[id.replace(/^tc:/,'')]||id);});
  var flash=root.ASSEMBLY_LINES&&ASSEMBLY_LINES.researchStickFor(r.id);
  if(flash)ps.push('<div><dt>研究闪存</dt><dd><button type="button" class="jei-param-link" data-jei-key="'+esc(flash)+'" data-jei-target="item">查看扫描配方</button></dd></div>');
  var imprint=root.ASSEMBLY_LINES&&ASSEMBLY_LINES.imprintForRecipe(r);
  if(imprint){var circuit=ASSEMBLY_LINES.imprintedCircuit(imprint);ps.push('<div><dt>所需压印</dt><dd><button type="button" class="jei-param-link" data-jei-key="'+esc(imprint)+'" data-jei-target="item" aria-label="'+esc(label(imprint,'item'))+'">'+esc(label(circuit,'item'))+'</button></dd></div>');}
  if(entry.kind==='craft')add('合成',r.shapeless?'无序':r.width+' × '+r.height);
  return'<dl class="jei-params">'+ps.join('')+'</dl>';
 }
 function recipeBookmark(entry){var r=entry.recipe,out=typeof r.out==='string'?{k:r.out}:r.out?.[0],fluid=r.fout?.[0],c=current(),same=c.mode==='recipes';return normalize({key:same?c.key:out?.k||fluid?.f||c.key,target:same?c.target:out?'item':fluid?'fluid':c.target,mode:same||out||fluid?'recipes':c.mode,group:entry.group,recipeId:r.id,alternatives:Object.assign({},c.alternatives)});}
 function isSaved(b){return J.bookmarks.some(function(s){return s.target===b.target&&s.key===b.key&&s.recipeId===b.recipeId;});}
 /* 矿物的来源与处理流程并进 JEI：按物品反查矿物材料。 */
 var oreMatIndex=null;
 function oreMaterialFor(c){
  if(!c||c.target!=='item'||!root.ORE_GUIDE||!ORE_GUIDE.catalog)return null;
  if(!oreMatIndex){
   oreMatIndex=new Map();
   (ORE_GUIDE.catalog()||[]).forEach(function(m){(m.stages||[]).forEach(function(st){(st.keys||[]).forEach(function(k){if(!oreMatIndex.has(k))oreMatIndex.set(k,m.id);});});});
  }
  return oreMatIndex.get(CONTENT.canonicalKey(c.key))||null;
 }
 function oreGroupName(id){return id==='ore:flow'?'矿石处理流程':'矿石来源';}
 function oreGroupKey(mat){var m=root.ORE_GUIDE&&ORE_GUIDE.get(mat);return m&&m.k;}
 function oreDetail(c,box){
  var mat=c.oreMat||oreMaterialFor(c)||'',name=oreGroupName(c.group);
  if(!mat){box.innerHTML='<div class="jei-empty">没有这种矿物的记录</div>';return;}
  if(c.group==='ore:source'){box.innerHTML='<div class="jei-recipe-heading"><strong>矿石来源</strong></div><div class="jei-ore-body">'+ORE_GUIDE_UI.sourceHtml(mat)+'</div>';return;}
  box.innerHTML='<div class="jei-recipe-heading"><strong>矿石处理流程</strong></div><div class="jei-ore-body" aria-busy="true"></div>';
  var target=box.querySelector('.jei-ore-body');
  ORE_GUIDE_UI.flowHtml(mat).then(function(html){if(current()===c&&target.isConnected){target.innerHTML=html;target.removeAttribute('aria-busy');}}).catch(function(e){if(target.isConnected){target.textContent='读取失败';target.removeAttribute('aria-busy');}console.error('JEI ore flow',e);});
 }
 function renderDetail(){var c=current(),entry=result?.records[0],box=host.querySelector('.jei-detail');
  box.classList.toggle('jei-source-detail',c?.group==='ore:source');
  if(c&&(c.group==='ore:flow'||c.group==='ore:source')&&root.ORE_GUIDE_UI){oreDetail(c,box);return;}
  if(!entry){box.innerHTML='<div class="jei-empty">没有相关配方</div>';return;}
  var r=entry.recipe,ins,outs,fin=[],fout=[];if(entry.kind==='craft'){ins=r.slots.map(function(a){return{k:a[0],alternatives:a,n:1};});outs=[{k:r.out,n:r.n}];}
  else if(entry.kind==='furnace'){ins=[{k:r.input,n:1}];outs=[{k:r.out,n:r.n}];}
  else{ins=r.in.concat(r.req.filter(function(p){return p.k;}));outs=r.out;fin=r.fin;fout=r.fout;}
  var arrow='<div class="jei-flow-arrow"><span>→</span>'+(root.AE_UI?AE_UI.tools(entry):'')+'</div>',plan=entry.kind==='machine'?JEI_LAYOUT.plan(entry):null,flow=plan?machineSection('原料',plan.left,plan.rows)+arrow+machineSection('产物',plan.right,plan.rows):section('原料',ins,fin,'in',entry.kind==='craft'?r:null)+arrow+section('产物',outs,fout,'out');
  var canCraft=entry.kind==='craft'&&MANUAL_WORKBENCH.acceptsRecipe(r);
  var b=recipeBookmark(entry);box.innerHTML='<div class="jei-recipe-heading">'+(canCraft?'<button type="button" class="jei-to-craft" data-jei-to-craft="1" title="转到合成页的对应配方">转到合成</button>':'<span class="jei-craft-placeholder" aria-hidden="true"></span>')+'<button data-jei-page="-1" title="上一条配方"'+(result.total>1?'':' disabled')+'>‹</button><span>'+number(result.offset+1)+' / '+number(result.total)+'</span><button data-jei-page="1" title="下一条配方"'+(result.total>1?'':' disabled')+'>›</button><button data-jei-recipe-star="1" class="jei-recipe-star'+(isSaved(b)?' on':'')+'" title="'+(isSaved(b)?'取消收藏配方':'收藏这条配方')+'">'+(isSaved(b)?'★':'☆')+'</button></div><article class="jei-recipe" data-jei-recipe="'+esc(r.id)+'"><div class="jei-io">'+flow+'</div>'+parameters(entry)+'</article>';
  fitDetail();
 }
 function bookmark(b){if(!b)return;var at=J.bookmarks.findIndex(function(s){return s.target===b.target&&s.key===b.key&&s.recipeId===b.recipeId;});if(at>=0)J.bookmarks.splice(at,1);else J.bookmarks.push(JSON.parse(JSON.stringify(b)));renderSaved();if(result)renderDetail();persist();}
 function renderSaved(){host.querySelectorAll('[data-jei-saved-tab]').forEach(function(b){var selected=b.dataset.jeiSavedTab===J.savedTab;b.classList.toggle('on',selected);b.setAttribute('aria-selected',String(selected));});if(J.savedTab==='favorites'){var favs=root.JEI_FAVORITES?JEI_FAVORITES.list(S):[];host.querySelector('.jei-saved-list').innerHTML=favs.map(function(s,i){var fluid=!!s.f,key=fluid?s.f:s.k,title=label(key,fluid?'fluid':'item')+(fluid?' '+(s.mb||1000)+'mB':(s.n>1?' ×'+s.n:''));return '<div class="jei-bookmark"><button data-fav-index="'+i+'" '+(fluid?'data-lookup-fluid':'data-lookup-key')+'="'+esc(key)+'" title="'+esc(title)+'（A 取消收藏）" aria-label="'+esc(title)+'">'+icon(key,fluid?'fluid':'item',30)+'</button></div>';}).join('')||'<div class="jei-empty">还没有收藏物品</div>';return;}var history=J.savedTab==='history',list=history?J.recent.map(function(s,i){return{s:s,i:i};}):J.bookmarks.map(function(s,i){return{s:s,i:i};});
  host.querySelector('.jei-saved-list').innerHTML=list.map(function(row){var s=row.s,info=s.recipeId?groupInfo(s.group):null,title=label(s.key,s.target)+(info?'，'+info.name:s.mode==='uses'?'，用途':'');return'<div class="jei-bookmark'+(history&&current()&&s.key===current().key&&s.target===current().target?' on':'')+'"><button data-jei-saved="'+row.i+'" title="'+esc(title)+'" aria-label="'+esc(title)+'">'+icon(s.key,s.target,30)+(s.target==='fluid'?'<span class="jei-bookmark-fluid">'+esc(label(s.key,s.target))+'</span>':'')+'</button>'+(!history?'<button class="jei-remove" data-jei-remove="'+row.i+'" title="移除收藏">×</button>':'')+'</div>';}).join('')||'<div class="jei-empty">'+(history?'暂无记录':'暂无收藏')+'</div>';
 }
 function yieldSearch(){return root.scheduler&&root.scheduler.yield?root.scheduler.yield():new Promise(function(done){setTimeout(done,0);});}
 async function buildCatalog(){if(catalog)return catalog;if(catalogJob)return catalogJob;catalogJob=(async function(){var list=[],seen=new Set(),deadline=performance.now()+8;for(var i=0;i<CONTENT.data.items.length;i++){var item=CONTENT.data.items[i],k=CONTENT.canonicalKey(item.k);if(CONTENT.catalogItem(item.k)&&!seen.has(k)&&CONTENT_SCOPE.allowed(k)){seen.add(k);list.push({key:k,target:'item'});}if((i&255)===0&&performance.now()>deadline){await yieldSearch();deadline=performance.now()+8;}}
   CONTENT.fluids.filter(function(f){return CONTENT_SCOPE.fluidAllowed(f.id);}).forEach(function(f){if(!seen.has('fluid:'+f.id)){seen.add('fluid:'+f.id);list.push({key:f.id,target:'fluid'});}});catalog=await ITEM_ORDER.prepareCatalog(list,function(v){return v.target==='item'?v.key:null;},yieldSearch);return catalog;})();return catalogJob;}
 async function prepareNames(){var all=await buildCatalog(),deadline=performance.now()+4;for(var i=0;i<all.length;i++){var row=all[i];if(row.text==null)row.text=SEARCH_TEXT.index(label(row.key,row.target),null,row.key);if((i&255)===0&&performance.now()>deadline){await yieldSearch();deadline=performance.now()+4;}}}
 async function search(){var token=++searchSerial,q=J.search.trim().toLowerCase(),type=J.searchType,stamp=type+':'+q;if(previousSearch&&previousSearch.q===q&&previousSearch.type===type&&searchList===previousSearch.list){host.querySelector('.jei-search-count').textContent=number(searchList.length)+' 项';host.querySelector('.jei-search-results').removeAttribute('aria-busy');paintSearch(J.searchScroll);return;}host.querySelector('.jei-search-count').textContent='…';host.querySelector('.jei-search-results').setAttribute('aria-busy','true');
  try{var list=catalogCache.get(stamp);if(!list){var all=await buildCatalog();if(token!==searchSerial)return;if(previousSearch&&previousSearch.type===type&&q.startsWith(previousSearch.q))all=previousSearch.list;var words=SEARCH_TEXT.words(q),deadline=performance.now()+8;list=[];
   if(!words.length)list=type==='all'?all:all.filter(function(row){return row.target===type;});else for(var i=0;i<all.length;i++){var row=all[i];if(type==='all'||row.target===type){if(row.text==null)row.text=SEARCH_TEXT.index(label(row.key,row.target),null,row.key);if(SEARCH_TEXT.matches(row.text,words))list.push(row);}if((i&255)===0){if(token!==searchSerial)return;if(performance.now()>deadline){await yieldSearch();deadline=performance.now()+8;}}}
   catalogCache.set(stamp,list);while(catalogCache.size>12)catalogCache.delete(catalogCache.keys().next().value);
  }if(token!==searchSerial)return;previousSearch={q:q,type:type,list:list};searchList=list;searchRange='';host.querySelector('.jei-search-count').textContent=number(list.length)+' 项';paintSearch(J.searchScroll);host.querySelector('.jei-search-results').removeAttribute('aria-busy');persist();
  }catch(e){if(token===searchSerial){host.querySelector('.jei-search-count').textContent='搜索失败';host.querySelector('.jei-search-results').removeAttribute('aria-busy');}console.error('JEI search',e);}
 }
 function searchMetrics(){var box=host.querySelector('.jei-search-results'),style=getComputedStyle(box),size=parseFloat(style.getPropertyValue('--jei-slot'))||36,gap=4,width=Math.max(0,box.clientWidth-parseFloat(style.paddingRight||0));return{box:box,size:size,stride:size+gap,cols:Math.max(1,Math.floor((width+gap)/(size+gap)))};}
 function paintSearch(top){if(!searchList||host.hidden)return;var m=searchMetrics(),space=m.box.querySelector('.jei-search-space'),items=m.box.querySelector('.jei-search-items'),count=searchList.length,rows=Math.ceil(count/m.cols);space.style.height=Math.max(count?rows*m.stride-4:40,0)+'px';if(typeof top==='number')m.box.scrollTop=top;var first=Math.max(0,Math.floor(m.box.scrollTop/m.stride)-1),last=Math.min(rows,Math.ceil((m.box.scrollTop+m.box.clientHeight)/m.stride)+1),stamp=[first,last,m.cols,m.size].join(':');if(stamp===searchRange)return;searchRange=stamp;items.style.gridTemplateColumns='repeat('+m.cols+','+m.size+'px)';items.style.top=first*m.stride+'px';items.innerHTML=searchList.slice(first*m.cols,last*m.cols).map(function(row,i){return'<div class="jei-search-cell" data-jei-search-index="'+(first*m.cols+i)+'">'+querySlot(row.key,row.target,null,{catalog:true})+'</div>';}).join('')||'<div class="jei-empty">没有找到物品</div>';}
 function searchWheel(e){if(!e.deltaY)return;e.preventDefault();e.stopPropagation();var m=searchMetrics(),dy=e.deltaY,steps;if(e.deltaMode===0&&Math.abs(dy)<40){wheelRemainder+=dy;steps=Math.trunc(wheelRemainder/40);wheelRemainder-=steps*40;}else{wheelRemainder=0;steps=Math.sign(dy)*Math.max(1,Math.round(Math.abs(dy)/(e.deltaMode===1?3:120)));}if(steps)m.box.scrollTop+=steps*m.stride;}
 function changeAlternative(id){var entry=result?.records[0];if(!entry)return;var r=entry.recipe,p;if(id.startsWith('craft:'))p={alternatives:r.slots[+id.split(':')[1]]};else p=(id.startsWith('in:')?r.in.concat(r.req.filter(function(p){return p.k;})):r.out)[+id.split(':')[1]];var a=alternatives(p),c=current(),now=c.alternatives[id]|| (a.includes(c.key)?c.key:a[0]);c.alternatives[id]=a[(a.indexOf(now)+1)%a.length];capture();renderDetail();persist();}
 function syncDeveloper(){if(!host||!S)return;var bar=host.querySelector('.jei-developer');if(!bar)return;
  if(!DEVELOPER_MODE.active(S)){cheating=false;bar.replaceChildren();host.classList.remove('jei-cheating');return;}
  if(!bar.firstChild)bar.innerHTML='<button data-jei-cheat="1" title="左键取一个，Shift 左键取一组"></button>';
  var toggle=bar.querySelector('[data-jei-cheat]');toggle.innerHTML='<img src="modicons/phase119/red-wrench.png" width="18" height="18" alt=""><span>红扳手享受者：'+(cheating?'开':'关')+'</span>';toggle.classList.toggle('on',cheating);toggle.setAttribute('aria-pressed',String(cheating));host.classList.toggle('jei-cheating',cheating);
 }
 function giveItem(key,stack){
   if(!DEVELOPER_MODE.active(S)||!cheating)return;
var n=stack?CORE.maxStack(key):1,r=COMMANDS.debugGive(S,key,n);
  if(!r.ok){if(root.toastAt)root.toastAt(null,r.code==='SLOTS'?'物品栏已满':'无法取得这件物品');return;}
  if(root.markInv)root.markInv();if(root.markDynamic)root.markDynamic();if(root.renderDyn)root.renderDyn();if(save)save();if(root.toastAt)root.toastAt(null,'取得 '+label(r.k,'item')+' ×'+r.moved+' → 物品栏');
 }
 function init(state,onSave){S=state;save=onSave;J=ensure(S);host=document.getElementById('jei');if(!host)return;ORE_GUIDE_UI.init(state,onSave);
  host.innerHTML='<div class="jei-navigation"></div><div class="jei-target"></div><nav class="jei-categories" aria-label="加工方式"></nav><div class="jei-detail"></div><div class="jei-developer"></div><section class="jei-search-area"><div class="jei-search-row"><input class="jei-search-input" aria-label="搜索物品和流体" placeholder="搜索物品 / 流体" autocomplete="off"><button data-jei-clear="1" title="清空搜索">×</button><select class="jei-search-type" aria-label="检索类型"><option value="all">全部</option><option value="item">物品</option><option value="fluid">流体</option></select></div><div class="jei-search-meta"><span class="jei-search-count"></span></div><div class="jei-search-results"><div class="jei-search-space"><div class="jei-search-items"></div></div></div></section><section class="jei-saved-area"><nav><button data-jei-saved-tab="favorites">物品收藏</button><button data-jei-saved-tab="bookmarks">配方收藏</button><button data-jei-saved-tab="history">最近查看</button></nav><div class="jei-saved-list"></div></section>';
  host.querySelector('.jei-search-input').value=J.search;host.querySelector('.jei-search-type').value=J.searchType;
  host.querySelector('.jei-search-input').oninput=function(e){if(e.isComposing)return;J.search=e.target.value;J.searchScroll=0;host.querySelector('.jei-search-count').textContent='…';host.querySelector('.jei-search-results').setAttribute('aria-busy','true');clearTimeout(searchTimer);searchSerial++;searchTimer=setTimeout(search,40);};
  host.querySelector('.jei-search-input').addEventListener('compositionend',function(e){e.target.dispatchEvent(new Event('input',{bubbles:true}));});
  host.querySelector('.jei-search-type').onchange=function(e){J.searchType=e.target.value;J.searchScroll=0;search();};
  host.querySelector('.jei-search-results').addEventListener('scroll',function(){J.searchScroll=this.scrollTop;paintSearch();persist();},{passive:true});
  host.querySelector('.jei-search-results').addEventListener('wheel',searchWheel,{passive:false});
  if(typeof ResizeObserver!=='undefined'){
   var frame=0;
   var resize=new ResizeObserver(function(){
    if(frame)return;
    frame=requestAnimationFrame(function(){
     frame=0;
     if(host.hidden)return;
     fitDetail();
     focusCategory();
     paintSearch();
    });
   });
   resize.observe(host);
   resize.observe(host.querySelector('.jei-detail'));
   resize.observe(host.querySelector('.jei-search-results'));
  }
  host.querySelector('.jei-detail').addEventListener('scroll',capture,{passive:true});
  document.querySelectorAll('[data-side-view]').forEach(function(b){b.onclick=function(e){e.stopPropagation();view(b.dataset.sideView);};});
  host.addEventListener('contextmenu',function(e){e.preventDefault();e.stopPropagation();var b=e.target.closest('.jei-search-results [data-jei-key],.jei-detail [data-jei-key]');if(b)RECIPE_QUERY.openFromElement(b,b.dataset.jeiKey,'uses',{target:b.dataset.jeiTarget});});
  host.addEventListener('click',function(e){e.stopPropagation();var b=e.target.closest('button');if(!b||b.disabled)return;var d=b.dataset,c=current();
   if(root.AE_UI&&AE_UI.jeiAction(e,result&&result.records[0],c&&c.alternatives))return;
   if(d.jeiContained)return open({key:d.jeiContained,target:'fluid',mode:'recipes'});
   if(d.jeiCheat){if(!DEVELOPER_MODE.active(S))return;cheating=!cheating;syncDeveloper();return;}
   if(d.jeiKey){if(!b.closest('.jei-search-results,.jei-detail'))return;if(b.closest('.jei-search-results')&&DEVELOPER_MODE.active(S)&&cheating&&d.jeiTarget==='item')return giveItem(d.jeiKey,e.shiftKey);return RECIPE_QUERY.openFromElement(b,d.jeiKey,'recipes',{target:d.jeiTarget});}
   if(d.jeiToCraft){var entry=result?.records[0];if(entry?.kind==='craft'&&MANUAL_WORKBENCH.acceptsRecipe(entry.recipe))return root.gotoCraftRecipe(entry.recipe);return;}
   if(d.jeiBack)return navigate(+d.jeiBack);
   if(d.jeiMode&&c)return open({key:c.key,target:c.target,mode:d.jeiMode});
   if(d.jeiGroup&&c){capture();c.group=d.jeiGroup;c.offset=0;c.recipeId=null;c.scroll=0;c.alternatives={};return renderQuery();}
   if(d.jeiPage&&c){c.offset=(c.offset+ +d.jeiPage+result.total)%result.total;c.recipeId=null;c.scroll=0;c.alternatives={};return renderQuery();}
   if(d.jeiRetry)return renderQuery();
   if(d.jeiAlt)return changeAlternative(d.jeiAlt);
   if(d.jeiItemStar&&c)return bookmark(normalize({key:c.key,target:c.target,mode:'recipes'}));
   if(d.jeiRecipeStar&&result?.records[0])return bookmark(recipeBookmark(result.records[0]));
   if(d.jeiSavedTab){J.savedTab=d.jeiSavedTab;renderSaved();return persist();}
   if(d.jeiRemove!=null){J.bookmarks.splice(+d.jeiRemove,1);renderSaved();if(result)renderDetail();return persist();}
   if(d.favIndex!=null){var fav=(root.JEI_FAVORITES?JEI_FAVORITES.list(S):[])[+d.favIndex];if(fav){if(fav.k&&DEVELOPER_MODE.active(S)&&cheating)return giveItem(fav.k,e.shiftKey);return open({key:fav.k||fav.f,target:fav.k?'item':'fluid',mode:'recipes'});}return;}if(d.jeiSaved!=null){var saved=J.savedTab==='history'?J.recent[+d.jeiSaved]:J.bookmarks[+d.jeiSaved];if(saved&&saved.target==='item'&&DEVELOPER_MODE.active(S)&&cheating)return giveItem(saved.key,e.shiftKey);if(saved)open(saved);return;}
   if(d.jeiClear){clearTimeout(searchTimer);J.search='';J.searchScroll=0;host.querySelector('.jei-search-input').value='';return search();}
  });
  syncDeveloper();navigation();renderSaved();view(J.view);
  /* 空闲时先把物品目录建好，打开 JEI 不用再等 */
  var warm=function(){buildCatalog().then(function(){return Promise.all([RECIPE_QUERY.prepare(),prepareNames()]);}).catch(function(e){console.error('JEI preparation',e);});};
  if(root.requestIdleCallback) root.requestIdleCallback(warm,{timeout:2500});
  else setTimeout(warm,1200);
 }
 root.JEI={init:init,open:open,view:view,groupInfo:groupInfo,syncDeveloper:syncDeveloper,snapshot:function(){return J;},refreshAE:function(){if(result)renderDetail();},refreshSaved:function(){renderSaved();},registerParameter:function(render){parameterProviders.push(render);}};
})(typeof window!=='undefined'?window:globalThis);

STATE_SCHEMA.register("jei",["jei"]);
