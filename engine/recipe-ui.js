(function(root){
 'use strict';
 function esc(v){return String(v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
 function name(k){return GD.items[k]||k;}
 function badge(p){return'<span class="rb-chip" title="'+esc(p.k)+'">'+(typeof iconOrText==='function'?iconOrText(p.k,22):'')+esc(name(p.k))+' ×'+p.n+(p.chance!=null&&p.chance<10000?' ('+(p.chance/100)+'%)':'')+'</span>';}
 function fluid(p){return'<span class="rb-chip rb-fluid">'+esc(GD.fluids[p.f]||p.f)+' '+p.mb+' mB</span>';}
 function mount(host,m,S,save){
  if(!host)return;var cat=DEFS.of(m.k).recipeMap,family=CONTENT.dynamicFamilies[cat],all=CONTENT.recipes(cat).filter(function(r){return !family||r.id.indexOf(family.idPrefix)!==0;}),page=0,q='',tierOnly=false;
  host.innerHTML='<div class="rb-tools"><input class="rb-search" placeholder="搜索原料、产物或流体名称"><label><input type="checkbox" class="rb-tier"> 只看本机电压</label><button class="btn rb-unlock">取消配方锁定</button></div><div class="rb-count"></div><div class="rb-results"></div><div class="rb-pages"></div>';
  function render(){
   var definition=STRUCTURES.instance(m),limit=definition.maxRecipeEUt||definition.volt,handler=ENGINE.behaviors[definition.behavior];
   var words=q.toLowerCase().trim().split(/\s+/).filter(Boolean),list=all.filter(function(r){
    if(tierOnly&&r.eut>limit)return false;if(!words.length)return true;
    var text=r.in.concat(r.out,r.req.filter(function(x){return x.k;})).map(function(p){return name(p.k);}).join(' ')+' '+r.fin.concat(r.fout).map(function(p){return FLUID_PRESENTATION.name(p.f);}).join(' ');
    return SEARCH_TEXT.matches(SEARCH_TEXT.index(text),words);
   });
   if(family&&family.keys){var keys=typeof family.keys==='function'?family.keys():family.keys;list=list.concat(keys.filter(function(k){if(tierOnly&&(family.eut||0)>limit)return false;if(!words.length)return true;return SEARCH_TEXT.matches(SEARCH_TEXT.index(name(k),null,k),words);}));}
   var pages=Math.max(1,Math.ceil(list.length/20));page=(page%pages+pages)%pages;host.querySelector('.rb-count').textContent=list.length+' 条配方，'+(page+1)+' / '+pages+' 页';
   host.querySelector('.rb-results').innerHTML=list.slice(page*20,page*20+20).map(function(r){
    if(typeof r==='string')r=CONTENT.resolveDynamic(cat,r);if(!r)return'';
    var effective=DEFS.effective(definition,r),conds=[];
    r.req.forEach(function(p){conds.push(p.circuit!=null?'编程电路 '+p.circuit:'保留 '+name(p.k)+' ×'+p.n);});
    if(r.heat)conds.push(r.heat+' K');if(r.cleanroom)conds.push('超净间');if(r.conditions.lowGravity)conds.push('低重力');
    if(r.fermentation)conds.push('此处为肥料／普通植株基准；堆肥每步48 mB，基因树苗按多汁属性增产。肥料效力跨批次保留，每植株共耗 '+(8400/3.6).toFixed(3)+' EU');
    if(r.notes)conds=conds.concat(r.notes);
    if(r.costs&&r.costs.start)Object.keys(r.costs.start).forEach(function(id){conds.push('基础消耗 '+(root.RESOURCE_UI?RESOURCE_UI.resourceText(id,r.costs.start[id]):r.costs.start[id]+' '+id));});
    if(r.research&&r.research.all)r.research.all.forEach(function(id){var key=id.startsWith('tc:')?id.slice(3):id;conds.push('研究：'+((GD.tcLabels&&GD.tcLabels.research[key])||key));});
    if(r.conditions.attachment)Object.keys(r.conditions.attachment).forEach(function(slot){conds.push('组件：'+name(r.conditions.attachment[slot]));});
    var energyText=r.workEnergyEU?'，'+ +(r.workEnergyEU.numerator/r.workEnergyEU.denominator).toFixed(3)+' EU / '+r.workIntervalTicks+' tick':r.eut||definition.energyCapacity>0?'，'+r.eut+' EU/t':'';
    var details=handler&&handler.recipeSummary?esc(handler.recipeSummary(m,r)):r.durationTicks+' tick'+energyText+(effective.overclocks||effective.durationTicks!==r.durationTicks?' → 本机 '+effective.durationTicks+' tick / '+effective.EUt+' EU/t':'');
    return'<article class="rb-recipe'+(m.recipeLock===r.id?' selected':'')+'"><div>'+r.in.map(badge).join('')+r.fin.map(fluid).join('')+'</div><span>↓</span><div>'+r.out.map(badge).join('')+r.fout.map(fluid).join('')+'</div><div class="dim">'+details+(conds.length?'，'+esc(conds.join('，')):'')+'</div><button class="btn" data-rb-lock="'+esc(r.id)+'">锁定</button></article>';
   }).join('')||'<p>没有匹配的配方。</p>';
   host.querySelector('.rb-pages').innerHTML='<button class="btn" data-rb-page="-1">上一页</button> <button class="btn" data-rb-page="1">下一页</button>';
  }
  host.querySelector('.rb-search').oninput=function(e){q=e.target.value;page=0;render();};
  host.querySelector('.rb-tier').onchange=function(e){tierOnly=e.target.checked;page=0;render();};
  host.querySelector('.rb-unlock').onclick=function(){delete m.recipeLock;if(save)save();render();};
  host.onclick=function(e){var b=e.target.closest('[data-rb-lock],[data-rb-page]');if(!b)return;
   if(b.dataset.rbPage){page+=+b.dataset.rbPage;render();return;}
   if(b.dataset.rbLock)ENGINE.selectRecipe(m,CONTENT.recipe(b.dataset.rbLock));
   if(save)save();if(typeof markInv==='function')markInv();render();
  };render();
 }
 function mapName(map){var cat=(GD.machines.cats||[]).find(function(c){return CONTENT.mapId(c.id)===map;});return cat&&(cat.cn||cat.label||cat.name)||map;}
 function queryItem(k,n){return '<button class="recipe-item" data-recipe-key="'+esc(k)+'">'+iconOrText(k,32)+'<span>'+esc(name(k))+(n!=null?' ×'+n:'')+'</span></button>';}
 function queryCard(entry,key){var r=entry.recipe,ins,outs,label;
  if(entry.kind==='craft'){var grouped=new Map();r.slots.forEach(function(a){var chosen=a.find(function(k){return CONTENT.matches(k,key);})||a[0];if(CONTENT.matches(chosen,key))chosen=key;grouped.set(chosen,(grouped.get(chosen)||0)+1);});ins=Array.from(grouped).map(function(p){return queryItem(p[0],p[1]);}).join('');outs=queryItem(r.out,r.n);label=r.station||'工作台';}
  else if(entry.kind==='furnace'){ins=queryItem(r.input,1);outs=queryItem(r.out,r.n);label='熔炉';}
  else{ins=r.in.concat(r.req.filter(function(p){return p.k;})).map(function(p){return queryItem(p.k,p.n);}).join('')+r.fin.map(fluid).join('');outs=r.out.map(function(p){return queryItem(p.k,p.n);}).join('')+r.fout.map(fluid).join('');label=mapName(r.map);}
  return '<article class="query-recipe"><b>'+esc(label)+'</b><div class="query-flow"><div>'+ins+'</div><span>→</span><div>'+outs+'</div></div>'+(r.durationTicks?'<small>'+r.durationTicks+' tick'+(r.eut?'，'+r.eut+' EU/t':'')+'</small>':'')+'</article>';
 }
 function mountItem(host,request){var state={key:request.key,mode:request.mode,kind:'all',offset:0},pageCount=1,token={};host._queryToken=token;
  host.innerHTML='<div class="dhead">'+iconOrText(state.key,56)+'<span class="nm">'+esc(name(state.key))+'</span></div><div class="query-tabs"><button class="btn" data-query-mode="recipes">配方</button><button class="btn" data-query-mode="uses">用途</button><select class="query-kind" aria-label="配方类型"><option value="all">全部</option><option value="craft">手搓</option><option value="machine">机器</option><option value="furnace">熔炉</option></select><span class="query-count">…</span></div><div class="query-results"></div><div class="query-pages"></div>';
  var revision=0;
  async function render(){var current=++revision;host.querySelector('.query-count').textContent='…';var result=await RECIPE_QUERY.query({key:state.key,mode:state.mode,kind:state.kind,offset:state.offset,limit:20});if(host._queryToken!==token||!host.isConnected||current!==revision)return;
   host.querySelectorAll('[data-query-mode]').forEach(function(b){b.classList.toggle('on',b.dataset.queryMode===state.mode);});
   host.querySelector('.query-count').textContent=result.total+' 条';host.querySelector('.query-results').innerHTML=result.records.map(function(entry){return queryCard(entry,state.key);}).join('')||'<div class="query-empty">没有相关配方</div>';
   state.offset=result.offset;pageCount=Math.max(1,Math.ceil(result.total/20));host.querySelector('.query-pages').innerHTML='<button class="btn" data-query-page="-1"'+(pageCount>1?'':' disabled')+'>上一页</button><span>'+ (Math.floor(state.offset/20)+1)+' / '+Math.max(1,Math.ceil(result.total/20))+'</span><button class="btn" data-query-page="1"'+(pageCount>1?'':' disabled')+'>下一页</button>';
  }
  host.querySelector('.query-kind').onchange=function(e){state.kind=e.target.value;state.offset=0;render();};
  host.onclick=function(e){var b=e.target.closest('[data-query-mode],[data-query-page],[data-recipe-key]');if(!b)return;e.stopPropagation();if(b.dataset.recipeKey){RECIPE_QUERY.openFromElement(b,b.dataset.recipeKey,'recipes');return;}if(b.dataset.queryMode){RECIPE_QUERY.openFromElement(b,state.key,b.dataset.queryMode);return;}else state.offset=((state.offset/20+ +b.dataset.queryPage+pageCount)%pageCount)*20;render();};render();
 }
 root.RECIPE_UI={mount:mount,mountItem:mountItem};
})(typeof window!=='undefined'?window:globalThis);
