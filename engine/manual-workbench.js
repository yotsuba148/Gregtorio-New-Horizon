(function(root){
 'use strict';
 var TX=GTTransactions,indices=new Map(),recipes=null,cache=new WeakMap(),anchorTerms=new WeakMap();
 function ensure(S){if(!S.workbench)S.workbench={schema:1,slots:Array(9).fill(null)};var b=S.workbench;if(!Array.isArray(b.slots)||b.slots.length!==9)throw Error('手摆工作台槽位数据无效');b.schema=1;return b;}
 function enabled(S,i){return i>=0&&i<9&&(S.bench>0||i%3<2&&Math.floor(i/3)<2);}
 function keys(k){var base=CONTENT.baseKey(k),out=[CONTENT.canonicalKey(k),base.replace(/@\d+$/,'@32767')],type=CRAFT_TOOLS.type(k);if(type&&CRAFT_TOOLS.rule(k).containerTool)out.push('tool:'+type);return out;}
 function acceptsRecipe(r){return !!r&&!r.station&&r.width<=3&&r.height<=3&&r.slots.length>0&&r.slots.length<=9&&CONTENT_SCOPE.recipeAllowed(r);}
 function termsFor(anchor){
  var terms=anchorTerms.get(anchor);
  if(terms)return terms;
  terms=new Set();
  anchor.forEach(function(k){
   terms.add(CONTENT.canonicalKey(k));
   var type=CRAFT_TOOLS.type(k);
   if(type&&CRAFT_TOOLS.rule(k).containerTool)terms.add('tool:'+type);
  });
  if(Object.isFrozen(anchor))anchorTerms.set(anchor,terms);
  return terms;
 }
 function indexFor(slotCount){
  if(recipes!==GD.craft){recipes=GD.craft;indices.clear();anchorTerms=new WeakMap();}
  if(indices.has(slotCount))return indices.get(slotCount);
  var index=new Map();
  recipes.forEach(function(recipe,rank){
   if(recipe.slots.length!==slotCount||recipe.station||recipe.width>3||recipe.height>3)return;
   var anchor=recipe.slots.reduce(function(a,b){return a.length<=b.length?a:b;}),entry={recipe:recipe,rank:rank};
   termsFor(anchor).forEach(function(k){if(!index.has(k))index.set(k,[]);index.get(k).push(entry);});
  });
  indices.set(slotCount,index);
  return index;
 }
 function accepts(alts,s){return !!s&&!s.entityUid&&CRAFT_TOOLS.accepts(alts,s);}
 function binding(S,r){var slots=ensure(S).slots,occupied=slots.map(function(s,i){return s?i:-1;}).filter(function(i){return i>=0;}),size=S.bench>0?3:2;
  if(occupied.length!==r.slots.length||occupied.some(function(i){return !enabled(S,i);})||r.width>size||r.height>size)return null;
  if(r.shapeless){var stacks=occupied.map(function(i){return Object.assign({},slots[i],{n:1});}),needs=r.slots.map(function(a){return{alternatives:a,n:1};}),plan=TX.planIngredients(stacks,needs,function(a,s){return accepts(a.alternatives,s);});if(!plan)return null;var b=[];plan.allocations.forEach(function(a){b[a.requirement]=occupied[a.slot];});return b;}
  var pattern=r.grid;if(!pattern)return null;var allowMirror=!Object.keys(r.flags||{}).some(function(k){return /mirrored$/i.test(k)&&r.flags[k]===false;});
  for(var oy=0;oy<=size-r.height;oy++)for(var ox=0;ox<=size-r.width;ox++)for(var mirror=0;mirror< (allowMirror?2:1);mirror++){
   var b=[],valid=true;for(var y=0;y<3&&valid;y++)for(var x=0;x<3;x++){var px=x-ox,py=y-oy,ri=px>=0&&px<r.width&&py>=0&&py<r.height?pattern[py*3+(mirror?r.width-px-1:px)]:-1,s=slots[y*3+x];if(ri>=0){if(!accepts(r.slots[ri],s)){valid=false;break;}b[ri]=y*3+x;}else if(s){valid=false;break;}}
   if(valid&&r.slots.every(function(_,i){return Number.isInteger(b[i]);}))return b;
  }return null;
 }
 function match(S){var slots=ensure(S).slots,signature=JSON.stringify([S.bench>0,slots]),old=cache.get(S);if(old&&old.signature===signature&&old.recipes===GD.craft)return old.result;
  var result=null,occupied=slots.filter(Boolean);
  if(occupied.length){
   var index=indexFor(occupied.length),candidates=new Set();
   occupied.forEach(function(s){keys(s.k).forEach(function(k){(index.get(k)||[]).forEach(function(entry){candidates.add(entry);});});});
   for(var entry of Array.from(candidates).sort(function(a,b){return a.rank-b.rank;})){
    if(!acceptsRecipe(entry.recipe))continue;
    var b=binding(S,entry.recipe);
    if(b){result={recipe:entry.recipe,bindings:b};break;}
   }
  }
  cache.set(S,{signature:signature,recipes:GD.craft,result:result});return result;
 }
 function take(S,processor,bulk){if(root.QUESTS)QUESTS.observe(S);var made=0,last=null,output=null,limit=bulk?64:1,batchRecipe=null;
  for(var i=0;i<limit;i++){var hit=match(S);if(!hit||batchRecipe&&hit.recipe!==batchRecipe){last={ok:false,code:'RECIPE'};break;}batchRecipe=hit.recipe;var cursor=[ITEM_CURSOR.held(S)],boxes=[ensure(S).slots,S.inv,cursor],plan=processor.plan(hit.recipe,boxes,{}, {state:S,bench:S.bench>0,bindings:hit.bindings,outputBoxes:[bulk?1:2],returnBoxes:[1],returnContainersToSource:true,requireOutputSpace:true});if(!plan.ok){last=plan;break;}
   processor.commit(plan,boxes,{});if(!bulk){if(!S.itemCursor)S.itemCursor={};S.itemCursor.stack=cursor[0];}made++;output=plan.output;
  }return{ok:made>0,made:made,k:output&&output.k,moved:made*(output&&output.n||0),code:made?null:last&&last.code};
 }
 function clear(S){var moved=0;ensure(S).slots.forEach(function(s,i){if(!s)return;var r=ITEM_TRANSFER.move(S,{type:'workbench',index:i},{type:'bag',group:true},{swap:false});if(r.ok)moved+=r.moved;});return{ok:moved>0,moved:moved,remaining:ensure(S).slots.some(Boolean)};}
 function fill(S,r){if(!acceptsRecipe(r))return{ok:false,code:'RECIPE'};if(!S.bench&&(r.width>2||r.height>2||r.slots.length>4))return{ok:false,code:'WORKBENCH'};
  var grid=TX.clone(ensure(S).slots),bag=TX.clone(S.inv),tools=TX.clone(S.tools),entries=[];
  grid.forEach(function(s,i){if(s)entries.push({stack:s,position:{box:0,slot:i}});});CRAFT_TOOLS.ordered([bag],tools).forEach(function(e){entries.push({stack:e.stack,position:e.position.tool?{tool:e.position.tool}:{box:1,slot:e.position.slot}});});
  var needs=r.slots.map(function(a){return{alternatives:a,n:1};}),plan=TX.planIngredients(entries.map(function(e){return e.stack;}),needs,function(a,s){return accepts(a.alternatives,s);});if(!plan)return{ok:false,code:'INPUT'};
  var next=Array(9).fill(null),cells=Array.from({length:9},function(_,i){return i;}).filter(function(i){return enabled(S,i);}),layout=r.shapeless?cells.slice(0,r.slots.length):r.slots.map(function(_,i){return r.grid.indexOf(i);});if(layout.some(function(i){return i<0;}))return{ok:false,code:'RECIPE'};
  plan.allocations.forEach(function(a){var e=entries[a.slot],s=e.stack,p=e.position;next[layout[a.requirement]]=Object.assign(TX.clone(s),{n:1});s.n=ITEM_TRANSFER.count(s)-1;if(!s.n){if(p.tool)delete tools[p.tool];else(p.box===0?grid:bag)[p.slot]=null;}});
  var returned=TX.planOutput(bag,grid.filter(Boolean),bag.length,function(k){return CONTENT.maxStack(k);},true);if(!returned)return{ok:false,code:'OUTPUT'};
  S.inv.splice.apply(S.inv,[0,S.inv.length].concat(returned));Object.keys(S.tools).forEach(function(k){delete S.tools[k];});Object.assign(S.tools,tools);ensure(S).slots.splice.apply(ensure(S).slots,[0,9].concat(next));return{ok:true};
 }
 root.MANUAL_WORKBENCH={acceptsRecipe:acceptsRecipe,ensure:ensure,enabled:enabled,match:match,binding:binding,take:take,clear:clear,fill:fill};
})(typeof window!=='undefined'?window:globalThis);

STATE_SCHEMA.register("manual-workbench",["workbench"]);

ITEM_STORES.registerState('workbench',function(S){var w=S.workbench;return w?[ITEM_STORES.view('player:workbench',w.slots,w.slots)]:[];});
