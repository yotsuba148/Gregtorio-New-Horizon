(function(root){
 'use strict';
 var providers=new Map(),navigator=null,revision=0,cache=new Map();
 var input=new Map(),output=new Map(),craftGroups=new Map(),groupMembers=new Map(),pending=null,built=false,customCount=0,generation=0;
 function lookupItemKey(key){return CONTENT.canonicalKey(GD.jeiItemAliases?.[key]||key);}
 function canonical(key,target){if(target==='fluid')return CONTENT.canonicalFluid(String(key));key=lookupItemKey(key);var item=CONTENT.item(key);if(item&&item.meta===32767&&/Coolantcell$/.test(item.id)&&CONTENT.item(item.id+'@0'))return item.id+'@0';return key;}
 function register(id,provider){providers.set(id,provider);revision++;cache.clear();}
 function open(key,mode,context){context=context||{};var target=context.target==='fluid'?'fluid':'item';var request={key:canonical(key,target),target:target,mode:mode==='uses'?'uses':'recipes',context:context};return navigator?navigator(request):request;}
 function openFromElement(element,key,mode,context){
  if(!element||typeof element.closest!=='function')return false;
  var detail=element.closest('#detail'),page=element.closest('#page-craft'),search=element.closest('#jei .jei-search-results'),preview=element.closest('#jei .jei-detail [data-jei-key]'),jei=element.closest('#jei');
  var chip=element.closest('[data-quest-item]'),book=element.closest('#quests'),list=element.closest('#questlist'),tip=element.closest('#qtip'),quest=chip&&((book&&!book.hidden&&list&&!list.hidden)||(tip&&!tip.hidden));
  var ore=element.closest('#ore-guide'),mineral=ore&&!ore.hidden&&element.closest('[data-ore-item],[data-ore-fluid]');
  if(!mineral&&!(detail&&page&&!page.hidden)&&!((search||preview)&&jei&&!jei.hidden)&&!quest)return false;
  return open(key,mode,context);
 }
 function add(table,key,ref){var a=table.get(key);if(!a)table.set(key,a=[]);a.push(ref);}
 function itemKey(k){return 'item:'+CONTENT.canonicalKey(k);}
 function itemInputs(keys){var result=new Set();keys.forEach(function(k){result.add(itemKey(k));(CONTENT.ingredientAlternatives[CONTENT.canonicalKey(k)]||[]).forEach(function(a){result.add(itemKey(a));});});return result;}
 function custom(r){var ref={kind:'custom',id:r.id,map:r.map,group:r.map};
  itemInputs(r.in.concat(r.req).flatMap(function(p){return p.alternatives||p.k&&[p.k]||[];})).forEach(function(k){add(input,k,ref);});
  new Set(r.out.map(function(p){return itemKey(p.k);})).forEach(function(k){add(output,k,ref);});
  new Set(r.fin.map(function(p){return p.f;})).forEach(function(f){add(input,'fluid:'+f,ref);});
  new Set(r.fout.map(function(p){return p.f;})).forEach(function(f){add(output,'fluid:'+f,ref);});
 }
 function syncCustom(){while(customCount<CONTENT.customRecipes.length)custom(CONTENT.customRecipes[customCount++]);}
 function yieldIndex(){return root.scheduler&&root.scheduler.yield?root.scheduler.yield():new Promise(function(done){setTimeout(done,0);});}
 async function build(){var C=CONTENT,ins=new Map(),outs=new Map(),groups=new Map(),members=new Map(),work=0,stamp=generation,deadline=performance.now()+4;
  function pause(){return (++work&255)===0&&performance.now()>deadline;}
  for(var map of Object.keys(C.data.maps))for(var pos=0;pos<C.data.maps[map].length;pos++){
   var row=C.data.maps[map][pos];if((row[9]||0)&35)continue;
   var ref={kind:'machine',map:map,index:pos,id:'gt:'+map+':'+row[0],group:map};
   var keys=(row[1]||[]).map(function(p){return C.data.items[p[0]].k;}).concat((row[7]||[]).filter(function(p){return p[0]!=='circuit';}).map(function(p){return C.data.items[p[1]].k;}));
   itemInputs(keys).forEach(function(k){add(ins,k,ref);});
   var imprint=root.ASSEMBLY_LINES&&ASSEMBLY_LINES.imprintFromSpecial(map,row[10]);
   if(imprint)add(ins,itemKey(imprint),ref);
   new Set((row[2]||[]).map(function(p){return itemKey(C.data.items[p[0]].k);})).forEach(function(k){add(outs,k,ref);});
   new Set((row[5]||[]).map(function(p){return C.canonicalFluid(C.data.fluids[p[0]].id);})).forEach(function(f){add(ins,'fluid:'+f,ref);});
   new Set((row[6]||[]).map(function(p){return C.canonicalFluid(C.data.fluids[p[0]].id);})).forEach(function(f){add(outs,'fluid:'+f,ref);});if(pause()){await yieldIndex();deadline=performance.now()+4;}
  }
  for(var i=0;i<C.data.crafting.length;i++){
   var row=C.data.crafting[i],ref={kind:'craft',index:i,rid:row[0],id:'craft:'+row[0],group:'craft:'+((row[7]||{}).station||'workbench')};
   new Set((row[3]||[]).filter(function(g){return g>=0;})).forEach(function(g){add(groups,g,ref);});
  add(outs,itemKey(C.data.items[row[1]].k),ref);if(pause()){await yieldIndex();deadline=performance.now()+4;}
  }
  for(var recipe of C.extraStationCrafting){
   var ref={kind:'craft',recipe:recipe,id:recipe.id,group:'craft:'+recipe.station};
   itemInputs(recipe.slots.flat()).forEach(function(k){add(ins,k,ref);});
   add(outs,itemKey(recipe.out),ref);
  }
  for(var i=0;i<C.data.furnace.length;i++){var row=C.data.furnace[i],ref={kind:'furnace',index:i,id:'furnace:'+i,group:'furnace'};add(ins,itemKey(C.data.items[row[0]].k),ref);add(outs,itemKey(C.data.items[row[1]].k),ref);if(pause()){await yieldIndex();deadline=performance.now()+4;}}
  for(var g=0;g<C.data.ingredientGroups.length;g++){var seen=new Set();for(var i of C.data.ingredientGroups[g]){var key=itemKey(C.data.items[i].k);if(!seen.has(key)){seen.add(key);add(members,key,g);}if(pause()){await yieldIndex();deadline=performance.now()+4;}}}
  if(stamp!==generation)return;
  craftGroups=groups;groupMembers=members;
  input=ins;output=outs;customCount=0;syncCustom();built=true;
 }
 async function ready(){while(!built){if(!pending){var job=build();pending=job;job.then(clear,clear);function clear(){if(pending===job)pending=null;}}await pending;}syncCustom();}
 function resolve(ref){var C=CONTENT;
  if(ref.kind==='machine')return{kind:'machine',recipe:C.decode(ref.map,C.data.maps[ref.map][ref.index])};
  if(ref.kind==='custom')return{kind:'machine',recipe:C.recipe(ref.id)};
  if(ref.kind==='craft')return{kind:'craft',recipe:ref.recipe||C.crafting(ref.index)};
  var row=C.data.furnace[ref.index];return{kind:'furnace',recipe:{id:ref.id,input:C.canonicalKey(C.data.items[row[0]].k),out:C.canonicalKey(C.data.items[row[1]].k),n:row[2],durationTicks:200}};
 }
 function allowed(ref,key,mode,target){var entry=resolve(ref),r=entry.recipe;if(!r||root.CONTENT_SCOPE&&!CONTENT_SCOPE.recipeAllowed(r))return false;
  if(entry.kind==='machine'&&(!r.enabled||r.fake||r.dataError))return false;
  if(mode==='recipes'||target==='fluid')return true;
  if(entry.kind==='machine'&&root.ASSEMBLY_LINES&&ASSEMBLY_LINES.imprintForRecipe(r)===key)return true;
  var keys=entry.kind==='craft'?r.slots.flat():entry.kind==='furnace'?[r.input]:r.in.concat(r.req).flatMap(function(p){return p.alternatives||p.k&&[p.k]||[];});
  return keys.some(function(k){return CONTENT.matches(k,key,{ignoreNBT:!!(GD.toolRules&&GD.toolRules[CONTENT.baseKey(k)])});});
 }
 register('registry',{
  find:async function(key,mode,target){var C=CONTENT;
   if(target!=='fluid'&&root.CONTENT_SCOPE&&!CONTENT_SCOPE.allowed(key))return [];
   if(target!=='fluid'&&mode==='uses')Object.keys(C.dynamicFamilies).forEach(function(map){C.resolveDynamic(map,key);});
   await ready();var table=mode==='uses'?input:output,keys=[target+':'+key];
   if(target!=='fluid'&&mode==='uses'){var item=C.item(key);keys.push(itemKey(C.baseKey(key)));if(item)keys.push(itemKey(item.id+'@32767'));}
   var rows=[],seen=new Set();keys.forEach(function(k){(table.get(k)||[]).forEach(function(ref){if(!seen.has(ref.id)){seen.add(ref.id);rows.push(ref);}});});
   if(mode==='uses'&&target!=='fluid')keys.forEach(function(k){(groupMembers.get(k)||[]).forEach(function(g){(craftGroups.get(g)||[]).forEach(function(ref){if(!seen.has(ref.id)){seen.add(ref.id);rows.push(ref);}});});});
   var matched=[],deadline=performance.now()+4;
   for(var i=0;i<rows.length;i++){
    if(allowed(rows[i],key,mode,target))matched.push(rows[i]);
    if((i&31)===31&&performance.now()>deadline){await yieldIndex();deadline=performance.now()+4;}
   }
   return matched;
  },resolve:resolve
 });
 function groupOf(row){return row.ref.group||row.ref.map||(row.ref.kind==='custom'?'machine':row.ref.kind);}
 function kindOf(row){return row.ref.kind==='custom'?'machine':row.ref.kind;}
 function sections(result,kind){
  var view=result.views.get(kind);
  if(view)return view;
  var all=kind==='all'?result.rows:result.rows.filter(function(row){return kindOf(row)===kind;});
  var groups=new Map(),ids=new Map();
  all.forEach(function(row){
   var id=groupOf(row),group=groups.get(id);
   if(!group){group={id:id,kind:kindOf(row),rows:[]};groups.set(id,group);}
   group.rows.push(row);
   if(!ids.has(row.ref.id))ids.set(row.ref.id,row);
  });
  view={all:all,groups:groups,ids:ids,summaries:Array.from(groups.values(),function(g){return{id:g.id,kind:g.kind,count:g.rows.length};})};
  result.views.set(kind,view);return view;
 }
 async function findRows(key,mode,target){
  var all=[],craftSeen=new Set();
  for(var entry of providers){
   var rows=await entry[1].find(key,mode,target),deadline=performance.now()+4;
   for(var i=0;i<rows.length;i++){
    var ref=rows[i],signature=ref.kind==='craft'&&root.CRAFT_TOOLS&&CRAFT_TOOLS.signature(entry[1].resolve(ref).recipe);
    if(!signature||!craftSeen.has(signature)){
     if(signature)craftSeen.add(signature);
     all.push({provider:entry[0],ref:ref});
    }
    if((i&31)===31&&performance.now()>deadline){await yieldIndex();deadline=performance.now()+4;}
   }
  }
  return all;
 }
 async function query(request){
  var target=request.target==='fluid'?'fluid':'item',key=canonical(request.key,target),mode=request.mode==='uses'?'uses':'recipes';
  var sourceRevision=revision,count=CONTENT.customRecipes.length,stamp=sourceRevision+':'+count+':'+target+':'+key+':'+mode,result=cache.get(stamp);
  if(!result){
   result={rows:await findRows(key,mode,target),views:new Map()};
   if(sourceRevision!==revision)return query(request);
   if(count===CONTENT.customRecipes.length){cache.set(stamp,result);while(cache.size>64)cache.delete(cache.keys().next().value);}
  }
  var view=sections(result,request.kind||'all'),group=request.group,chosen=request.recipeId&&view.ids.get(request.recipeId);
  if(chosen)group=groupOf(chosen);
  if(request.grouped&&!view.groups.has(group))group=view.groups.size?view.groups.keys().next().value:null;
  var list=group?(view.groups.get(group)?.rows||[]):view.all;
  var limit=Math.max(1,Math.min(100,request.limit||20)),offset=Math.max(0,request.offset||0);
  if(chosen)offset=Math.floor(list.indexOf(chosen)/limit)*limit;
  offset=Math.min(offset,Math.max(0,Math.floor((list.length-1)/limit)*limit));
  return{key:key,target:target,mode:mode,total:list.length,allTotal:view.all.length,groups:view.summaries.slice(),group:group,offset:offset,records:list.slice(offset,offset+limit).map(function(row){var entry=providers.get(row.provider).resolve(row.ref);return Object.assign({},entry,{group:groupOf(row)});})};
 }
 root.RECIPE_QUERY={lookupItemKey:lookupItemKey,prepare:ready,register:register,query:query,open:open,openFromElement:openFromElement,openFluid:function(f,mode){return open(f,mode,{target:'fluid'});},setNavigator:function(fn){navigator=fn;},invalidate:function(){generation++;built=false;pending=null;cache.clear();revision++;}};
})(typeof window!=='undefined'?window:globalThis);

