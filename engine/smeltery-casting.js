/* Native casting recipes, manual one-batch faucets and explicit hopper automation. */
(function(root){
 'use strict';var C=CONTENT,TX=GTTransactions,key='TConstruct:Smeltery@0',faucet='TConstruct:SearedBlock@1',hopper='minecraft:hopper@0',kinds={table:'TConstruct:SearedBlock@0',basin:'TConstruct:SearedBlock@2'};
 function parent(S,c){return c&&c.location&&c.location.kind==='attached'&&ENTITIES.get(S,c.location.parentUid);}
 var stationCache=new WeakMap(),recipeCache=new Map(),fluidIndex={};
 function stations(S,m){if(!S||!m||m.k!==key)return[];var repo=S.fx&&S.fx.machines||[],stamp=(m.castingStations||[]).join('|'),cached=stationCache.get(m);if(cached&&cached.repo===repo&&cached.size===repo.length&&cached.stamp===stamp)return cached.items;var items=repo.filter(function(c){return Object.values(kinds).includes(c.k)&&c.location&&c.location.kind==='attached'&&c.location.parentUid===m.uid;});stationCache.set(m,{repo:repo,size:repo.length,stamp:stamp,items:items});return items;}
 function ensureChild(c){
  if(!c.castingSchema){c.castingSchema=2;c.castingRecovery=c.castingRecovery||[];var old=c.ins||[];c.ins=[old[0]||null];old.slice(1).filter(Boolean).forEach(function(s){c.castingRecovery.push(TX.clone(s));});if(c.ins[0]&&c.ins[0].n>1){var extra=TX.clone(c.ins[0]);extra.n--;c.castingRecovery.push(extra);c.ins[0]=Object.assign({},c.ins[0],{n:1});}}
  if(!Array.isArray(c.ins))c.ins=[null];if(!Array.isArray(c.outs))c.outs=[null];if(!Array.isArray(c.castingRecovery))c.castingRecovery=[];if(!c.castingParts)c.castingParts=[];if(!c.attachments)c.attachments={};c.auto=c.autoItems=c.autoFluids=false;if(c.automaticCasting==null)c.automaticCasting=false;c.enabled=true;return c;
 }
 function ensure(m,S){
  if(!m||m.k!==key)return null;if(!Array.isArray(m.ins))m.ins=[];if(!m.smelterySchema){m.smelterySchema=2;delete m.recipeLock;delete m.stopAfterBatch;m.workAllowed=true;m.workStopped=false;m.enabled=true;}
  while(m.ins.length<9)m.ins.push(null);var w=m.smelteryCasting;if(!w)w=m.smelteryCasting={schema:2,rows:[],sequence:0,activeRow:null};
  var list=S?stations(S,m):[];if(S)w.rows.forEach(function(r){if(r.uid&&!list.some(function(c){return c.uid===r.uid;}))r.uid=null;});list.forEach(function(c){ensureChild(c);if(!w.rows.some(function(r){return r.uid===c.uid;})){var empty=w.rows.find(function(r){return !r.uid;});if(empty)empty.uid=c.uid;else w.rows.push({id:'c'+(++w.sequence),uid:c.uid});}});
  if(!w.rows.length)w.rows.push({id:'c'+(++w.sequence),uid:null});if(!w.rows.some(function(r){return r.id===w.activeRow;}))w.activeRow=w.rows[0].id;return w;
 }
 function row(m,id,S){return ensure(m,S).rows.find(function(r){return r.id===id;});}
 function child(S,m,r){return r&&r.uid&&stations(S,m).find(function(c){return c.uid===r.uid;})||null;}
 function hasFaucet(c){return !!c&&(c.castingParts||[]).some(function(p){return p.k===faucet&&p.n>0;});}
 function hasHopper(c){return !!(c&&c.attachments&&c.attachments.castingHopper===hopper);}
 function addRow(S,m){var w=ensure(m,S);if(w.rows.length>=32)return{ok:false,code:'LIMIT'};var r={id:'c'+(++w.sequence),uid:null};w.rows.push(r);w.activeRow=r.id;return{ok:true,row:r};}
 function attach(S,m,kind,r,existing){var c=existing||ENTITIES.create(S,kinds[kind],{kind:'attached',parentUid:m.uid});c.location={kind:'attached',parentUid:m.uid};c.x=c.y=null;ensureChild(c);r.uid=c.uid;if(!m.castingStations)m.castingStations=[];if(!m.castingStations.includes(c.uid))m.castingStations.push(c.uid);return c;}
 function install(S,m,kind,legacyUid){
  if(!m||m.k!==key||!m.location||m.location.kind!=='world'||!kinds[kind])return{ok:false,code:'MACHINE'};var w=ensure(m,S),r=w.rows.find(function(r){return !r.uid;}),c=legacyUid&&ENTITIES.get(S,legacyUid);
  if(legacyUid&&(!c||c.k!==kinds[kind]||!c.location||c.location.kind!=='world'||c.location.dim!==m.location.dim))return{ok:false,code:'LOCATION'};
  if(!r&&w.rows.length>=32)return{ok:false,code:'LIMIT'};var result=legacyUid?{ok:true}:COMMANDS.exchange(S,[{k:kinds[kind],n:1},{k:faucet,n:1}],[]);if(!result.ok)return result;
  if(!r)r=addRow(S,m).row;c=attach(S,m,kind,r,c);if(!legacyUid)c.castingParts.push({k:faucet,n:1});return Object.assign(result,{station:c,row:r});
 }
 function remove(S,m,uid){var c=stations(S,m).find(function(c){return c.uid===uid;});if(!c)return{ok:false,code:'MACHINE'};var result=ENTITIES.pack(S,c.uid,{fromParent:true});if(result.ok)ensure(m,S);return result;}
 function removeRow(S,m,id){var w=ensure(m,S),r=row(m,id,S);if(!r)return{ok:false,code:'ROW'};var result=r.uid?remove(S,m,r.uid):{ok:true};if(!result.ok)return result;w.rows=w.rows.filter(function(v){return v.id!==id;});if(!w.rows.length)w.rows.push({id:'c'+(++w.sequence),uid:null});if(w.activeRow===id)w.activeRow=w.rows[0].id;return result;}
 function clean(c){return !c||!c.job&&!c.ins.some(Boolean)&&!c.outs.some(Boolean)&&!c.castingRecovery.some(Boolean)&&!(c.tanksIn||[]).some(Boolean)&&!hasFaucet(c)&&!hasHopper(c);}
 function outputMax(job,k){return Math.max(C.maxStack(k),...(job.outputs||[]).filter(function(p){return p.k===k;}).map(function(p){return p.n;}));}
 function candidate(c,f){var map=DEFS.of(c.k).recipeMap,id=JSON.stringify([map,f,c.ins.map(function(s){return s&&s.k;})]);if(recipeCache.has(id))return recipeCache.get(id);if(!fluidIndex[map]){var index=fluidIndex[map]=new Map();C.recipes(map).forEach(function(r){if(r.fin.length!==1)return;var key=r.fin[0].f;if(!index.has(key))index.set(key,[]);index.get(key).push(r);});}var result=(fluidIndex[map].get(f)||[]).filter(function(r){var needs=r.in.concat(r.req.filter(function(p){return p.k;}));return c.ins.filter(Boolean).every(function(s){return needs.some(function(p){return C.matches(p.k,s.k,{exact:!!r.nbtSensitive});});})&&(!needs.length||c.ins.some(Boolean));});if(recipeCache.size>=64)recipeCache.delete(recipeCache.keys().next().value);recipeCache.set(id,result);return result;}

 function plan(m,c){
  ensureChild(c);if(c.job)return{ok:false,code:'RUNNING'};if(c.outs.some(Boolean))return{ok:false,code:'OUTPUT'};if(!(m.structure&&m.structure.formed))return{ok:false,code:'STRUCTURE'};if(!hasFaucet(c))return{ok:false,code:'FAUCET'};
  var pool=(m.tanksOut||[]).filter(Boolean),local=(c.tanksIn||[]).filter(Boolean),bottom=pool[0]||local[0];if(!bottom)return{ok:false,code:'FLUID'};var rs=candidate(c,bottom.f),last='RECIPE';
  for(var r of rs){var req=r.in.map(function(p){return Object.assign({},p,{consumed:true});}).concat(r.req.filter(function(p){return p.k;}).map(function(p){return Object.assign({},p,{n:p.n||1,consumed:false});})),items=TX.planIngredients(c.ins,req,function(p,s){return ENGINE.batch.matches(p,s,r);},true);if(!items)continue;
   if(local.some(function(t){return t.f!==bottom.f;}))return{ok:false,code:'LOCAL_FLUID'};var have=local.reduce(function(n,t){return n+t.mb;},0),needed=Math.max(0,r.fin[0].mb-have);if(needed&&(!pool[0]||pool[0].f!==bottom.f||pool[0].mb<needed)){last='FLUID_AMOUNT';continue;}
   return{ok:true,recipe:r,itemPlan:items,needed:needed,localUsed:Math.min(have,r.fin[0].mb),fluid:bottom.f};
  }return{ok:false,code:last,fluid:bottom.f};
 }
 function pour(S,m,c){if(!m||!c||!stations(S,m).includes(c))return{ok:false,code:'MACHINE'};var p=plan(m,c);if(!p.ok)return p;
  if(p.needed){var drained=TX.planDrain(m.tanksOut,[{f:p.fluid,mb:p.needed}]);m.tanksOut=drained.tanks;}if(p.localUsed)c.tanksIn=TX.planDrain(c.tanksIn,[{f:p.fluid,mb:p.localUsed}]).tanks;SMELTERY.pool(m);
  c.ins=p.itemPlan.remaining;var r=p.recipe;c.job={casting:true,recipeId:r.id,recipe:TX.clone(r),progressTicks:0,durationTicks:r.durationTicks,EUt:0,inputs:p.itemPlan.consumed,fluidInputs:TX.clone(r.fin),outputs:TX.clone(r.out),fluidOutputs:[]};c.status={code:'CASTING_COOLING',text:'冷却中'};return{ok:true,fluid:p.fluid,mb:r.fin[0].mb,recipe:r.id};
 }
 function cool(S,c){var j=c.job;if(!j)return false;j.progressTicks=GAME_TIME.advance(S,j.progressTicks,j.durationTicks,1);if(j.progressTicks<j.durationTicks){c.status={code:'CASTING_COOLING',text:'冷却中'};return true;}
  var items=TX.planOutput(c.outs,j.outputs,Math.max(1,c.outs.length,j.outputs.length),function(k){return outputMax(j,k);},true);if(!items){c.status={code:'CASTING_OUTPUT',text:'取走产物后继续'};return false;}c.outs=items;c.job=null;c.completedBatches=(c.completedBatches||0)+1;delete c.recipeLock;c.status={code:'CASTING_READY',text:'产物已完成'};return true;
 }
 function store(S,c){if(!c.outs.some(Boolean))return false;var next=(S.chests||[]).map(function(ch){return TX.clone(ch.slots);});for(var s of c.outs.filter(Boolean)){var from=[TX.clone(s)];for(var a of next){if(!from[0])break;CORE.transferSlot({from:CORE.slotBox(from),index:0,to:CORE.slotBox(a)});}if(from[0]){c.status={code:'CASTING_WAREHOUSE',text:'仓库已满，产物留在工位'};return false;}}
  (S.chests||[]).forEach(function(ch,i){ch.slots.splice.apply(ch.slots,[0,ch.slots.length].concat(next[i]));});c.outs=c.outs.map(function(){return null;});return true;
 }
 function tickStations(S,m){ensure(m,S);var changed=false;for(var c of stations(S,m)){ensureChild(c);if(c.job){if(cool(S,c))changed=true;if(!c.job&&hasHopper(c)&&store(S,c))changed=true;continue;}if(hasHopper(c)&&c.outs.some(Boolean)){if(!store(S,c))continue;changed=true;}if(c.automaticCasting){if(!c.outs.some(Boolean)){var r=pour(S,m,c);if(r.ok){changed=true;cool(S,c);if(!c.job&&hasHopper(c))store(S,c);}else c.status={code:r.code,text:message(r.code)};}}else if(!c.outs.some(Boolean))c.status={code:'CASTING_MANUAL',text:'点击浇注口浇铸一次'};}return changed;}
 function message(code){return({FLUID:'熔池内没有熔液',FLUID_AMOUNT:'底层熔液不足一批',RECIPE:'底层熔液与当前铸模不匹配',LOCAL_FLUID:'工位里还有其他流体',FAUCET:'先放入浇注口',STRUCTURE:'先建成冶炼炉',OUTPUT:'先取走当前产物',RUNNING:'当前批次正在冷却'})[code]||code;}
 function endpoint(S,r){var m=ENTITIES.get(S,r.uid);if(!m||m.k!==key||!ENTITIES.active(m))return null;var w=ensure(m,S),rr=r.row&&row(m,r.row,S),c=child(S,m,rr),e={id:JSON.stringify(r),ref:r,locked:function(){return false;},cap:function(s){return TX.isInstance(s)?1:C.maxStack(s.k);},accepts:function(){return false;}};
  if(r.kind==='input'){var i=+r.index;if(!Number.isInteger(i)||i<0||i>=9)return null;e.arr=m.ins;e.index=i;e.get=function(){return m.ins[i]||null;};e.set=function(v){m.ins[i]=v;w.target='melt';};e.accepts=function(s){return !s.entityUid&&C.candidates('tconstruct:smelting',[s],[]).some(function(q){return q.in.some(function(p){return ENGINE.batch.matches(p,s,q);});});};return e;}
  if(!rr)return null;
  if(r.kind==='station'){e.lockCode='CASTING_CONTENTS';e.get=function(){return c?{k:c.k,n:1}:null;};e.locked=function(){return !clean(c);};e.accepts=function(s){return !s.entityUid&&Object.values(kinds).includes(s.k);};e.cap=function(){return 1;};e.set=function(v){if(c){S.fx.machines=S.fx.machines.filter(function(v){return v!==c;});m.castingStations=(m.castingStations||[]).filter(function(id){return id!==c.uid;});c.location={kind:'removed'};rr.uid=null;}if(v)c=attach(S,m,v.k===kinds.table?'table':'basin',rr);else c=null;w.activeRow=rr.id;w.target='casting';};return e;}
  if(!c)return null;ensureChild(c);
  if(r.kind==='faucet'){e.get=function(){return hasFaucet(c)?{k:faucet,n:1}:null;};e.set=function(v){c.castingParts=c.castingParts.filter(function(p){return p.k!==faucet;});if(v)c.castingParts.push({k:faucet,n:1});w.activeRow=rr.id;w.target='casting';};e.accepts=function(s){return !s.entityUid&&s.k===faucet;};e.cap=function(){return 1;};return e;}
  if(r.kind==='hopper'){e.get=function(){return hasHopper(c)?{k:hopper,n:1}:null;};e.set=function(v){if(v)c.attachments.castingHopper=hopper;else delete c.attachments.castingHopper;w.activeRow=rr.id;w.target='casting';};e.accepts=function(s){return !s.entityUid&&s.k===hopper;};e.cap=function(){return 1;};return e;}
  var arr=r.kind==='cast'?c.ins:r.kind==='output'?c.outs:r.kind==='recovery'?c.castingRecovery:null,i=Number(r.index)||0;if(!arr||!Number.isInteger(i)||i<0||i>=Math.max(arr.length,1))return null;e.arr=arr;e.index=i;e.get=function(){return arr[i]||null;};e.set=function(v){arr[i]=v;w.activeRow=rr.id;w.target='casting';};e.locked=function(){return r.kind==='cast'&&!!c.job;};if(r.kind==='cast'){e.cap=function(){return 1;};e.accepts=function(s){return !s.entityUid&&C.candidates(DEFS.of(c.k).recipeMap,[s],[]).some(function(q){return q.in.concat(q.req).some(function(p){return p.k&&ENGINE.batch.matches(p,s,q);});});};}return e;
 }
 function recovery(c){return c.castingRecovery||[];}
 var original=ENGINE.behaviors.tinkers_smeltery.tick;ENGINE.behaviors.tinkers_smeltery.ensure=function(m){ensure(m);};ENGINE.behaviors.tinkers_smeltery.tick=function(m,ctx){ensure(m,ctx.state);var changed=tickStations(ctx.state,m);return original(m,ctx)||changed;};
 ENGINE.registerBehavior('tinkers_casting',{ensure:ensureChild,tick:function(c){c.status={code:'INSTALL_IN_SMELTERY',text:'安装到冶炼炉后使用'};return false;},acceptsItem:function(c,k){return C.candidates(DEFS.of(c.k).recipeMap,[{k:k,n:1}],[]).some(function(r){return r.in.concat(r.req).some(function(p){return p.k&&C.matches(p.k,k,{exact:!!r.nbtSensitive});});});}});
 for(var d of GD.extraMachineDefinitions){if(d.key===key){d.uiPanels=[];d.worldOnly=true;}if(Object.values(kinds).includes(d.key)){d.attachmentOnly='smeltery';d.behavior='tinkers_casting';d.autoItems=d.autoFluids=false;}}DEFS.rebuild();
 function migrate(S){if(!S.fx)return;var furnaces=S.fx.machines.filter(function(m){return m.k===key&&ENTITIES.active(m);}),oldLocations=new Map();furnaces.forEach(function(m){if(m.location&&m.location.kind==='grid'){oldLocations.set(m.uid,TX.clone(m.location));m.location={kind:'world',dim:'overworld'};m.x=m.y=null;}ensure(m,S);SMELTERY.pool(m);});
  S.fx.machines.filter(function(c){return Object.values(kinds).includes(c.k)&&c.location&&c.location.kind==='grid';}).forEach(function(c){var old=c.location,list=furnaces.filter(function(m){var loc=oldLocations.get(m.uid);return loc&&loc.blueprintId===old.blueprintId;}).sort(function(a,b){var x=oldLocations.get(a.uid),y=oldLocations.get(b.uid);return Math.abs(x.x-old.x)+Math.abs(x.y-old.y)-Math.abs(y.x-old.x)-Math.abs(y.y-old.y);});c.location={kind:'world',dim:'overworld'};c.x=c.y=null;ensureChild(c);if(list.length===1)install(S,list[0],c.k===kinds.table?'table':'basin',c.uid);else if(list.length>1)throw Error('浇筑工位缺少唯一的冶炼炉引用：'+c.uid);});
 }
 Object.assign(SMELTERY,{key:key,kinds:kinds,faucet:faucet,hopper:hopper,ensure:ensure,ensureChild:ensureChild,stations:stations,parent:parent,child:child,row:row,addRow:addRow,removeRow:removeRow,install:install,removeStation:remove,hasFaucet:hasFaucet,hasHopper:hasHopper,planCast:plan,pour:pour,tickStations:tickStations,castingEndpoint:endpoint,castingRecovery:recovery,message:message,migrate:migrate,hasWork:function(m,S){return m.k===key&&stations(S,m).some(function(c){return !!c.job;});},deploy:function(S,dim){if(root.TRAVEL&&!TRAVEL.can(S,dim||'overworld'))return{ok:false,code:'DIMENSION'};return ENTITIES.deploy(S,key,{kind:'world',dim:dim||'overworld'});},worldFurnaces:function(S,dim){return(S.fx&&S.fx.machines||[]).filter(function(m){return m.k===key&&m.location&&m.location.kind==='world'&&m.location.dim===(dim||'overworld');});}});
 ITEM_TRANSFER.register('smeltery',endpoint);
})(typeof window!=='undefined'?window:globalThis);

ITEM_STORES.registerEntity('casting',function(S,m){
 var views=[];
 if(m.castingRecovery)views.push(ITEM_STORES.view(m.uid+':casting-recovery',m.castingRecovery,m.castingRecovery));
 if(m.castingParts)views.push(ITEM_STORES.view(m.uid+':casting-parts',m.castingParts,m.castingParts,{recover:false}));
 if(m.attachments&&m.attachments.castingHopper)views.push(ITEM_STORES.view(m.uid+':casting-hopper',null,[{k:m.attachments.castingHopper,n:1}],{recover:false}));
 return {views:views};
});
