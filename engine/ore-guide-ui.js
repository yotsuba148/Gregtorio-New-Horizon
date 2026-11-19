(function(root){
 'use strict';
 var S,save,host,U,serial=0,timer,observer,resizeFrame=0;
 function E(s){return root.esc(String(s==null?'':s));}
 function label(k){return String(GD.items[k]||CONTENT.item(k)?.name||k).replace(/§[0-9a-fk-or]/gi,'');}
 function dimName(id){return(GD.dims||[]).find(function(d){return d.key===id;})?.name||(root.DIMENSIONS?DIMENSIONS.name(id):id);}
 function persist(){clearTimeout(timer);timer=setTimeout(function(){if(save)save();},200);}
 function item(k,n,chance,cls,size){var tip=label(k)+(n!=null?' ×'+n:'')+(chance!=null&&chance<10000?'，'+chance/100+'%':'');return '<button type="button" class="ore-slot '+(cls||'')+'" data-ore-item="'+E(k)+'" data-lookup-key="'+E(k)+'" data-tip="'+E(tip)+'" aria-label="'+E(tip)+'">'+iconOrText(k,size||30)+(n!=null&&n>1?'<span class="ore-amount">'+n+'</span>':'')+'</button>';}
 function fluid(f,mb,cls,size){var tip=(GD.fluids[f]||f)+(mb!=null?' '+mb+' mB':'');return '<button type="button" class="ore-slot fluid '+(cls||'')+'" data-ore-fluid="'+E(f)+'" data-lookup-fluid="'+E(f)+'" data-tip="'+E(tip)+'" aria-label="'+E(tip)+'">'+FLUID_PRESENTATION.html(f,size||30)+'</button>';}
 function choose(id){if(!ORE_GUIDE.get(id))return;U.material=id;paintResults();detail();persist();}
 function paintResults(){var rows=ORE_GUIDE.search(U.search),list=host.querySelector('.ore-results'),scroll=list.scrollTop;UI_KIT.patch(list,rows.map(function(m){return '<button type="button" data-ore-select="'+E(m.id)+'" class="'+(m.id===U.material?'on':'')+'" data-tip="'+E(m.name)+'" aria-label="'+E(m.name)+'">'+iconOrText(m.k,30)+'</button>';}).join(''));list.scrollTop=scroll;host.querySelector('.ore-count').textContent=rows.length+' 种矿物';}
 var DIM_CODES=null;
 function dimCodes(){
  if(DIM_CODES)return DIM_CODES;
  DIM_CODES={};
  Object.keys(GD.items||{}).forEach(function(k){
   var hit=/^gtneioreplugin:blockDimensionDisplay_(.+?)@/.exec(k);if(!hit)return;
   var name=String(GD.items[k]||'').replace(/^T\d+:\s*/,'');
   if(name&&!DIM_CODES[name])DIM_CODES[name]={code:hit[1],tier:/^T(\d+):/.exec(String(GD.items[k]))?Number(/^T(\d+):/.exec(String(GD.items[k]))[1]):null};
  });
  return DIM_CODES;
 }
 function dimInfo(id){
  var faces=(root.GD&&GD.dimensionFaces)||{},codes=dimCodes(),name=dimName(id),hit=codes[name];
  var code=hit?hit.code:(id==='overworld'?'Ow':id==='nether'?'Ne':id==='twilight'?'TF':id==='end'?'ED':null);
  var src=code&&faces[code];
  return {name:name,tier:hit?hit.tier:null,src:src||faces._unknown||null};
 }
 function dimChip(id){
  var d=dimInfo(id),tag=d.tier==null?'':'T'+d.tier;
  return '<span class="ore-dim">'+(d.src?'<img class="ore-dim-face" src="'+E(d.src)+'" alt="">':'')+
   '<span class="ore-dim-text"><b>'+E(d.name)+'</b>'+(tag?'<em>'+tag+'</em>':'')+'</span></span>';
 }
 function sources(m){
  var list=ORE_GUIDE.sources(m.id),seen={},veins=[];
  list.veins.forEach(function(v){
   var key=v.name;
   if(!seen[key]){seen[key]={name:v.name,dims:[],height:v.heightRange,weight:v.weight};veins.push(seen[key]);}
   if(!seen[key].dims.some(function(x){return x.id===v.dim;}))seen[key].dims.push({id:v.dim});
  });
  var out=veins.map(function(v){
   return '<section class="ore-vein"><header class="ore-vein-head"><b>'+E(v.name)+'</b>'+
    '<span class="ore-meta">高度 '+v.height[0]+'～'+v.height[1]+'，权重 '+v.weight+'</span></header>'+
    '<div class="ore-dims">'+v.dims.map(function(d){return dimChip(d.id);}).join('')+'</div></section>';
  }).join('');
  out+=list.small.map(function(v){
   return '<section class="ore-vein"><header class="ore-vein-head"><b>零散小矿</b>'+
    '<span class="ore-meta">高度 '+v.heightRange[0]+'～'+v.heightRange[1]+'</span></header>'+
    '<div class="ore-dims">'+dimChip(v.dim)+'</div></section>';
  }).join('');
  return out||'<p class="ore-empty">没有这种矿物的矿脉记录</p>';
 }
 function machineKey(map){var id=map==='furnace'?'e_furnace':map.replace(/^gt\.recipe\./,''),cat=GD.machines.cats.find(function(c){return c.id===id;}),tiers=cat&&cat.tiers||[];return tiers.find(function(t){return t.t===3;})?.k||tiers[0]?.k||JEI.groupInfo(map).key;}
 function diagramHtml(d){var top=20,height=d.height-top,paths=d.paths.map(function(p){return '<path d="'+p.points.map(function(v,i){return(i?'L':'M')+v.x+','+v.y;}).join(' ')+'"'+(p.arrow?' marker-end="url(#ore-native-arrow)"':'')+'/>';}).join(''),slots='';
  function slot(p,x,y,big){var cls='ore-native-slot'+(big?' ore-big':'');return '<div class="ore-native-cell" style="left:'+x+'px;top:'+(y-top)+'px">'+(p?(p.target==='fluid'?fluid(p.key,p.amount,cls,16):item(p.key,p.amount,p.chance,cls,16)):'<span class="ore-slot '+cls+' ore-empty-slot" aria-hidden="true"></span>')+'</div>';}
  d.inputs.forEach(function(p){slots+=slot(p,p.x,p.y,true);});d.groups.forEach(function(g){slots+='<div data-ore-group="'+g.id+'">';for(var i=0;i<g.width*g.height;i++)slots+=slot(g.items[i],g.x+i%g.width*18,g.y+Math.floor(i/g.width)*18,false);slots+='</div>';});
  var machines=d.machines.filter(function(p){return !p.additional;}).map(function(p){var info=JEI.groupInfo(p.map),k=machineKey(p.map),tip=info.name+(p.additional?'':'，'+p.recipe.eut+' EU/t，'+p.recipe.durationTicks/20+' s');return '<button type="button" class="ore-native-machine" style="left:'+p.x+'px;top:'+(p.y-top)+'px" data-ore-recipe="'+E(p.recipe.id)+'" data-ore-base="'+E(p.recipe.in[0].k)+'" data-ore-map="'+E(p.map)+'" data-tip="'+E(tip)+'" aria-label="'+E(info.name)+'">'+iconOrText(k,16)+'</button>';}).join('');
  return '<div class="ore-native" style="height:'+height+'px" aria-label="'+E(d.material.name)+'加工流程"><svg width="166" height="'+height+'" viewBox="0 '+top+' 166 '+height+'" aria-hidden="true"><defs><marker id="ore-native-arrow" markerWidth="4" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L4,2.5 L0,5 Z"/></marker></defs><g>'+paths+'</g></svg>'+slots+machines+'</div>';
 }
 // 供 JEI 复用的两种内容
 async function flowHtml(mat){var d=await ORE_GUIDE.diagram(mat);return diagramHtml(d);}
 function sourceHtml(mat){var m=ORE_GUIDE.get(mat);return m?sources(m):'';}
 function resize(){var body=host.querySelector('.ore-body');var scale=String(Math.max(0.1,Math.min(2,(body.clientWidth-4)/166)));if(host.style.getPropertyValue('--ore-scale')!==scale)host.style.setProperty('--ore-scale',scale);}
 async function detail(){var token=++serial,m=ORE_GUIDE.get(U.material),body=host.querySelector('.ore-body');host.querySelector('.ore-selected').textContent=m?m.name:'选择矿物';host.querySelectorAll('[data-ore-mode]').forEach(function(b){b.classList.toggle('on',b.dataset.oreMode===U.mode);b.setAttribute('aria-selected',String(b.dataset.oreMode===U.mode));});body.scrollTop=0;body.removeAttribute('aria-busy');if(!m){UI_KIT.patch(body,'');return;}if(U.mode==='source'){UI_KIT.patch(body,sources(m));return;}
  body.setAttribute('aria-busy','true');UI_KIT.patch(body,'<p class="ore-empty">正在查找加工配方…</p>');try{var diagram=await ORE_GUIDE.diagram(m.id);if(token!==serial)return;UI_KIT.patch(body,diagramHtml(diagram));resize();}catch(error){if(token===serial)UI_KIT.patch(body,'<p class="ore-empty">配方读取失败</p>');console.error(error);}finally{if(token===serial)body.removeAttribute('aria-busy');}
 }
 function init(state,onSave){S=state;save=onSave;host=document.getElementById('ore-guide');if(!host)return;if(observer)observer.disconnect();U=S.oreGuide=S.oreGuide||{};U.search=typeof U.search==='string'?U.search:'';U.dim=(GD.dims||[]).some(function(d){return d.key===U.dim;})?U.dim:'';U.mode=U.mode==='source'?'source':'process';
  host.innerHTML='<div class="ore-search"><input type="search" aria-label="搜索矿物" placeholder="搜索矿物" autocomplete="off"></div><div class="ore-count"></div><div class="ore-results"></div><div class="ore-selected"></div><nav class="ore-modes"><button data-ore-mode="process">加工</button><button data-ore-mode="source">来源</button></nav><div class="ore-body"></div>';
  host.querySelector('input').value=U.search;host.querySelector('input').oninput=function(e){if(e.isComposing)return;U.search=e.target.value;paintResults();persist();};host.querySelector('input').oncompositionend=function(e){U.search=e.target.value;paintResults();persist();};
  host.onclick=function(e){var b=e.target.closest('button');if(!b)return;e.stopPropagation();var d=b.dataset;if(d.oreSelect)return choose(d.oreSelect);if(d.oreMode){U.mode=d.oreMode;detail();persist();return;}if(d.oreRecipe)return JEI.open({key:d.oreBase,target:'item',mode:'uses',group:d.oreMap,recipeId:d.oreRecipe});if(d.oreItem||d.oreFluid)return RECIPE_QUERY.openFromElement(b,d.oreItem||d.oreFluid,'recipes',{target:d.oreFluid?'fluid':'item'});};
  host.oncontextmenu=function(e){var b=e.target.closest('[data-ore-item],[data-ore-fluid]');if(!b)return;e.preventDefault();e.stopPropagation();RECIPE_QUERY.openFromElement(b,b.dataset.oreItem||b.dataset.oreFluid,'uses',{target:b.dataset.oreFluid?'fluid':'item'});};
  observer=new ResizeObserver(function(){
   if(resizeFrame)return;
   resizeFrame=requestAnimationFrame(function(){resizeFrame=0;if(host.getClientRects().length)resize();});
  });
  observer.observe(host.querySelector('.ore-body'));
 }
 function show(){if(!host)return;paintResults();if(!ORE_GUIDE.get(U.material)){var first=ORE_GUIDE.search(U.search)[0];if(first)return choose(first.id);}detail();}
 root.ORE_GUIDE_UI={flowHtml:flowHtml,sourceHtml:sourceHtml,init:init,show:show};
})(typeof window!=='undefined'?window:globalThis);
