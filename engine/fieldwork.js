/* World interactions that are not crafting-table or powered-machine recipes. */
(function(root){
 'use strict';
 var C=root.CONTENT,recipes={},lists={hammer:[],wash:[]};
 function register(d){
  if(!d.id||!lists[d.kind]||recipes[d.id])throw Error('Invalid fieldwork recipe '+d.id);
  recipes[d.id]=d;lists[d.kind].push(d);
  C.registerRecipe({id:d.id,map:'world:'+d.kind,in:[{k:d.input,n:1}],out:[{k:d.output,n:d.n}],durationTicks:d.kind==='wash'?40:1,eut:0,fieldwork:d.kind,provenance:d.provenance});
 }
 // ToolHardHammer.convertBlockDrops consumes the first forge-hammer output,
 // without electricity; restrict this adapter to GT ore blocks with tile data.
 var rawOres=new Set();Object.keys(C.data.ore).filter(function(tag){return /^rawOre/.test(tag);}).forEach(function(tag){C.data.ore[tag].forEach(function(i){rawOres.add(C.canonicalKey(C.data.items[i].k));});});
 C.recipes('hammer').forEach(function(r){
  if(r.in.length!==1||r.in[0].n!==1||r.req.length||r.fin.length||!r.out[0]||!(/^gregtech:gt\.blockores\d*@/.test(r.in[0].k)||rawOres.has(r.in[0].k)))return;
  register({id:'field:hammer:'+r.id,kind:'hammer',input:r.in[0].k,output:r.out[0].k,n:r.out[0].n,provenance:{recipe:r.id,class:'ToolHardHammer.convertBlockDrops'}});
 });
 // MetaGeneratedItem01.onEntityItemUpdate: one whole stack costs one of the
 // cauldron's three water levels. Five late-game material remaps are excluded.
 var remapped=new Set(['Cerium','Samarium','Naquadah','NaquadahEnriched','Naquadria']);
 Object.keys(C.data.ore).forEach(function(tag){
  var m=/^(dustImpure|dustPure|crushed)([A-Z].*)$/.exec(tag);if(!m||remapped.has(m[2]))return;
  var target=(m[1]==='crushed'?'crushedPurified':'dust')+m[2],outs=C.data.ore[target];if(!outs||!outs.length)return;
  C.data.ore[tag].forEach(function(i){var item=C.data.items[i];if(item.id!=='gregtech:gt.metaitem.01'||item.nbt)return;
   var input=C.canonicalKey(item.k),output=C.canonicalKey(C.data.items[outs[0]].k),id='field:wash:'+input;if(recipes[id])return;
   register({id:id,kind:'wash',input:input,output:output,n:1,provenance:{class:'MetaGeneratedItem01.onEntityItemUpdate',from:tag,to:target}});
  });
 });
 MECHANISMS.registerStation({id:'cauldron',name:'炼药锅',k:'minecraft:cauldron@0',width:0,height:0,maxSlots:0});
 function cauldron(S){return root.RIVER_WASH?RIVER_WASH.ensure(S).pots[0]:MECHANISMS.ensure(S).deployments.cauldron;}
 function fill(S){return{ok:false,code:'WATER_NOT_REQUIRED'};}
 function hammer(S){var boxes=ENTITIES.storage(S).concat([Object.values(S.tools||{})]),found=null;
  boxes.some(function(a){return a.some(function(s){if(s&&C.baseKey(s.k)==='gregtech:gt.metatool.01@12'&&s.dur>0){found=s;return true;}return false;});});return found;
 }
 // One render reads storage once. Matching still uses the registry's original
 // alias, ore-tag, wildcard and NBT rules; the buckets only narrow candidates.
 // Keep this snapshot local to the render so transfers cannot leave stale counts.
 function inventorySnapshot(S){
  var amounts=new Map(),ids=new Map(),tags=new Map(),cache=new Map();
  function add(index,key,k){if(!index.has(key))index.set(key,[]);index.get(key).push(k);}
  ENTITIES.storage(S).forEach(function(a){a.forEach(function(s){
   if(!s||s.entityUid)return;var k=C.canonicalKey(s.k);amounts.set(k,(amounts.get(k)||0)+(s.n||1));
  });});
  amounts.forEach(function(n,k){var item=C.item(k),tag=C.tag(k);if(item)add(ids,item.id,k);if(tag)add(tags,tag,k);});
  return {count:function(k){
   if(cache.has(k))return cache.get(k);
   var canonical=C.canonicalKey(k),item=C.item(canonical),tag=C.tag(canonical),keys=new Set([canonical]);
   if(item)(ids.get(item.id)||[]).forEach(function(a){keys.add(a);});
   if(tag)(tags.get(tag)||[]).forEach(function(a){keys.add(a);});
   // A wildcard can canonicalize to a different mod's representative. Preserve
   // matches against the raw wildcard's own registry ID as well.
   var raw=C.rawItems[k];if(raw&&raw.meta===32767)(C.byRawId[raw.id]||[]).forEach(function(a){keys.add(C.canonicalKey(a));});
   var n=0;keys.forEach(function(a){if(amounts.has(a)&&C.matches(k,a))n+=amounts.get(a);});cache.set(k,n);return n;
  }};
 }
 function count(S,k,snapshot){return snapshot?snapshot.count(k):ENTITIES.storage(S).reduce(function(n,a){return n+a.reduce(function(n,s){return n+(s&&!s.entityUid&&C.matches(k,s.k)?s.n||1:0);},0);},0);}
 function execute(S,id,n){
  var d=recipes[id];if(!d)return{ok:false,code:'RECIPE'};
  if(d.kind==='wash'&&root.RIVER_WASH)return{ok:false,code:'QUEUE_REQUIRED'};
  if(!Number.isSafeInteger(n)||n<1||n>64)return{ok:false,code:'COUNT'};
  var tool=d.kind==='hammer'?hammer(S):null;
  if(d.kind==='hammer'&&!tool)return{ok:false,code:'TOOL'};
  // Each breaking/conversion operation costs 50+200 native durability units.
  var wear=TOOL_WEAR.amount(S,d.kind==='hammer'?2.5*n:0);if(tool&&wear>0&&Math.ceil(tool.dur/2.5)<n)return{ok:false,code:'DURABILITY'};
  var r=COMMANDS.exchange(S,[{k:d.input,n:n}],[{k:d.output,n:d.n*n}]);if(!r.ok)return r;
  // exchange commits cloned inventory stacks. Resolve the retained hammer again
  // before charging wear; the pre-transaction object is no longer the owned tool.
  if(tool&&wear>0){tool=hammer(S);tool.dur-=wear;if(tool.dur<=0){for(var a of ENTITIES.storage(S))for(var i=0;i<a.length;i++)if(a[i]===tool)a[i]=null;for(var id in S.tools||{})if(S.tools[id]===tool)delete S.tools[id];}}
  return Object.assign(r,{n:n,output:{k:d.output,n:d.n*n}});
 }
 function available(S,kind,snapshot){snapshot=snapshot||inventorySnapshot(S);return lists[kind].filter(function(r){return count(S,r.input,snapshot)>0;});}
 root.FIELDWORK={recipes:recipes,lists:lists,register:register,count:count,inventorySnapshot:inventorySnapshot,available:available,execute:execute,fill:fill,cauldron:cauldron,hammer:hammer};
})(typeof window!=='undefined'?window:globalThis);
