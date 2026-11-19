/* Player actions share one saved queue. Automatic devices do not occupy it. */
(function(root){
 'use strict';
 function ensure(S){
  if(!Array.isArray(S.actionQueue))S.actionQueue=S.act?[S.act]:[];
  S.actionSequence=S.actionSequence||0;
  S.act=S.actionQueue[0]||null;return S.actionQueue;
 }
 function enqueue(S,a){var q=ensure(S);a.queueId='a'+(++S.actionSequence);q.push(a);S.act=q[0];return a;}
 function finish(S){var q=ensure(S);q.shift();S.act=q[0]||null;return S.act;}
 function cancel(S,id){var q=ensure(S),i=q.findIndex(function(a){return a.queueId===id;});if(i<0)return false;q.splice(i,1);S.act=q[0]||null;return true;}
 function move(S,id,delta){var q=ensure(S),i=q.findIndex(function(a){return a.queueId===id;}),j=i+delta;if(i<0||j<0||j>=q.length)return false;var a=q[i];q[i]=q[j];q[j]=a;S.act=q[0];return true;}
 function removeWhere(S,p){S.actionQueue=ensure(S).filter(function(a){return !p(a);});S.act=S.actionQueue[0]||null;}
 function relink(S){ensure(S).forEach(function(a){if(!a.queueId)a.queueId='a'+(++S.actionSequence);if(a.type==='gather')delete a.spd;if(a.type==='mine')delete a.period;});removeWhere(S,function(a){if(a.type!=='mine')return false;var v=(S.veins||[]).find(function(v){return v.id===a.veinId;});if(!v)throw Error('采矿任务找不到矿脉：'+a.veinId);a.vein=v;return false;});}
 root.ACTION_QUEUE={ensure:ensure,enqueue:enqueue,finish:finish,cancel:cancel,move:move,removeWhere:removeWhere,relink:relink};

 var unlockRules={world_nasa:{quests:[2744],mode:'all'}};MECHANISMS.stations.nasa.featureUnlock='world_nasa';
 root.FEATURE_UNLOCKS={rules:unlockRules,register:function(id,r){unlockRules[id]=r;},isOpen:function(S,id){var r=unlockRules[id];if(!r)return true;var done=function(q){return !!(S.qever&&S.qever[q]);};return r.mode==='any'?r.quests.some(done):r.quests.every(done);}};
 var C=CONTENT,oldGroup=WORLD_SCENES.groupOf,oldNames=WORLD_SCENES.names;
 oldNames.pasture='草原';oldNames.wilds='荒野冒险';oldNames.smallOres='零散小矿';oldNames.meadow='花丛';oldNames.adventure='Boss战';
 var hidden=new Set(['village_forage','village_search']);
 GD.sources=GD.sources.filter(function(d){return !hidden.has(d.id);});
 ACTIVITIES.definitions.find_liquid_oil.check=function(S){return PUMPS.ensure(S).fields.filter(function(f){return f.type==='oil';}).length<LIMIT?{ok:true}:{ok:false,code:'LIMIT'};};
 Object.keys(ACTIVITIES.definitions).forEach(function(id){var d=ACTIVITIES.definitions[id];if(id==='gather_wool')d.name='收集羊毛';if(id==='hunt_cattle')d.name='收集皮革';if(id==='gather_feathers')d.name='收集羽毛';if(id==='gather_eggs')d.name='寻找鸡蛋';if(d.weightedDrops)d.veinSource=true;if(/gather_(poppies|dandelions|white_tulips|goldenrod|glowflower)/.test(id))d.worldAdvanced=false;});
 WORLD_SCENES.groupOf=function(d){if(d.veinSource)return'veinSources';if(d.id==='village_search')return'exploration';if(d.id==='dig_dirt')return'forest';if(d.id==='gather_glowflower')return'meadow';if(d.gravelOre)return'smallOres';return oldGroup(d);};
 function add(d){d.effortTimeIsIdleDesign=true;GD.sources.push(d);ACTIVITIES.register(d);}
 [['iron','铁','TConstruct:GravelOre@0'],['gold','金','TConstruct:GravelOre@1'],['copper','铜','TConstruct:GravelOre@2'],['tin','锡','TConstruct:GravelOre@3'],['aluminium','铝','TConstruct:GravelOre@4'],['zinc','锌','dreamcraft:ZincGravelOre@0']].forEach(function(v){if(C.item(v[2]))add({id:'gather_gravel_ore_'+v[0],name:'挖掘'+v[1]+'矿砂砾',dim:'overworld',time:GD.looseOreSearchSeconds,timing:'search',gravelOre:true,conditions:{tool:'shovel'},toolTypes:['shovel'],out:[[v[2],1]]});});

 var LIMIT=16,kit=WORLD_SCENES.smelteryKit;
 function villages(S){if(!S.mechanisms)S.mechanisms={};var v=S.mechanisms.villages;if(!v||v.version!==2)v=S.mechanisms.villages={version:2,seq:0,found:[]};return v;}
 function findVillage(S,a){var v=villages(S);if(v.found.length>=LIMIT)return{ok:false,code:'LIMIT'};var id='village'+(++v.seq),site={id:id,name:'村庄 '+v.seq,seed:ACTIVITIES.random(a,4294967295)||1};v.found.push(site);return{ok:true,site:site};}
 function rollVillageLoot(seed,blacklist){var rng={randomState:seed},out=[];
  ['minecraft:carrot@0','minecraft:wheat@0','minecraft:potato@0','harvestcraft:peanutItem@0'].forEach(function(k){if(ACTIVITIES.random(rng,100)<80)out.push({k:k,n:4+ACTIVITIES.random(rng,9)});});
  if(!out.length)out.push({k:'minecraft:wheat@0',n:4});
  // No guarantee: a village has a 30% chance of 1–3 salvaged smeltery part types.
  if(ACTIVITIES.random(rng,100)<30){var count=1+ACTIVITIES.random(rng,3),parts=kit;for(var n=0;n<count;n++){var p=parts[ACTIVITIES.random(rng,parts.length)];out.push({k:p[0],n:p[0]==='TConstruct:Smeltery@2'?4+ACTIVITIES.random(rng,9):p[0]==='TConstruct:SearedBlock@1'||p[0]==='TConstruct:Smeltery@11'?1+ACTIVITIES.random(rng,3):1});}}
  if(ACTIVITIES.random(rng,100)<40)out.push({k:'minecraft:brick_block@0',n:16+ACTIVITIES.random(rng,33)});
  if(ACTIVITIES.random(rng,1000)<125)out.push({k:'minecraft:hardened_clay@0',n:32+ACTIVITIES.random(rng,33)});
  return blacklist?out.filter(function(p){return !blacklist.includes(C.canonicalKey(p.k));}):out;
 }
 function lootVillage(S,id){var v=villages(S).found.find(function(v){return v.id===id;});return v?rollVillageLoot(v.seed,v.blacklist):[];}
 function lootPool(){return Array.from(new Set(['minecraft:carrot@0','minecraft:wheat@0','minecraft:potato@0','harvestcraft:peanutItem@0','minecraft:brick_block@0','minecraft:hardened_clay@0'].concat(kit.map(function(p){return p[0];})).map(function(k){return C.canonicalKey(k);})));}
 function setLootExcluded(S,id,k,on){var v=villages(S).found.find(function(v){return v.id===id;});k=C.canonicalKey(k);if(!v||!lootPool().includes(k))return false;v.blacklist=Array.from(new Set((v.blacklist||[]).filter(function(p){return p!==k;}).concat(on?[k]:[])));return true;}
 function dimension(x){return x&&x.dim||'overworld';}
 function targetDimension(S,dim){return dim||S.ui&&S.ui.dim||'overworld';}
 function veins(S,dim){dim=targetDimension(S,dim);return(S.veins||[]).filter(function(v){return dimension(v)===dim;});}
 function veinRoom(S,dim){dim=targetDimension(S,dim);return DIMENSIONS.hasVeins(dim)?Math.max(0,LIMIT-veins(S,dim).length):0;}
 function startSurvey(S,dim,cycles){
  dim=targetDimension(S,dim);
  if(!DIMENSIONS.open(S,dim))return null;
  var room=discoveryRoom(S,'veins',dim);
  if(!room)return null;
  var n=Math.max(1,Math.min(Math.floor(cycles)||1,room));
  return ACTION_QUEUE.enqueue(S,{type:'explore',dim:dim,cycles:n,done:0,prog:0});
 }
 function discoveryRoom(S,src,dim){dim=targetDimension(S,dim);var queued=ACTION_QUEUE.ensure(S).filter(function(a){return src==='veins'?a.type==='explore'&&dimension(a)===dim:a.type==='gather'&&a.src==='village_search';}).reduce(function(n,a){return n+Math.max(0,(a.cycles||a.target||0)-(a.done||0));},0);return Math.max(0,(src==='veins'?veinRoom(S,dim):LIMIT-villages(S).found.length)-queued);}
 function abandonVillage(S,id){var v=villages(S),i=v.found.findIndex(function(v){return v.id===id;});if(i<0)return false;v.found.splice(i,1);ACTION_QUEUE.removeWhere(S,function(a){return a.siteId===id;});return true;}
 var search=ACTIVITIES.definitions.village_search;Object.assign(search,{name:'寻找村庄',out:[],outputDescription:'发现一座可搜刮的村庄，最多保留16座',outcome:undefined,check:function(S){return villages(S).found.length<LIMIT?{ok:true}:{ok:false,code:'LIMIT'};},effect:function(S,a){findVillage(S,a);}});
 add({id:'village_plunder',name:'搜刮村庄',time:20,dim:'overworld',out:[],check:function(S,a){return a&&villages(S).found.some(function(v){return v.id===a.siteId;})?{ok:true}:{ok:false,complete:true,code:'LOCATION'};},outcome:function(S,a){return lootVillage(S,a.siteId,a);},effect:function(S,a){var v=villages(S);v.found=v.found.filter(function(v){return v.id!==a.siteId;});}});
 // The plunder action is offered only from an existing village, never as a free source.
 GD.sources=GD.sources.filter(function(d){return d.id!=='village_plunder';});
 add({id:'village_supplies',name:'搜集村庄物资',icon:'minecraft:carrot@0',scene:'村庄',dim:'overworld',time:110,out:[],
  outputDescription:'作物、砖块、硬化黏土与匠魂冶炼炉部件',
  outcome:function(S,a){return rollVillageLoot(ACTIVITIES.random(a,4294967295)||1);}
 });
 function veinId(S,v){if(!v.id)v.id='vein'+(S.veinSequence=(S.veinSequence||0)+1);return v.id;}
 function abandonVein(S,id){var list=S.veins||[],i=list.findIndex(function(v){return veinId(S,v)===id;});if(i<0)return false;list.splice(i,1);ACTION_QUEUE.removeWhere(S,function(a){return a.veinId===id;});return true;}
 var retiredSources=new Set(['find_liquid_river','find_liquid_lava','tc_find_node','adventure_find_end_wilds','hunt_slimes']);
 function restore(S){
  ACTION_QUEUE.removeWhere(S,function(a){return a.type==='explore'&&!DIMENSIONS.hasVeins(dimension(a))||a.type==='gather'&&retiredSources.has(a.src);});
  ACTION_QUEUE.relink(S);
 }
 function migrate(S){
  (S.veins||[]).forEach(function(v){if(!v.dim)v.dim='overworld';veinId(S,v);});
  (S.actionQueue||[]).forEach(function(a){if(a.type==='mine'&&!a.veinId&&a.vein){var v=(S.veins||[]).find(function(v){return v===a.vein||v.id&&v.id===a.vein.id;});if(!v)throw Error('采矿任务缺少矿脉引用');a.veinId=v.id;}});
  S.worldFlowVersion=1;
  (S.veins||[]).forEach(function(v){if(/[A-Za-z]/.test(v.name||'')){var native=(GD.veins||[]).find(function(p){return p.enum===v.enum&&p.dim===dimension(v);})||(GD.veins||[]).find(function(p){return p.ores[0]&&v.ores&&v.ores[0]&&p.ores[0].key===v.ores[0].key&&p.dim===dimension(v);});if(native)v.name=native.name;}});
  villages(S);restore(S);
 }
 root.WORLD_DISCOVERY={limit:LIMIT,startSurvey:startSurvey,dimension:dimension,veins:veins,veinRoom:veinRoom,lootPool:lootPool,setLootExcluded:setLootExcluded,discoveryRoom:discoveryRoom,villages:villages,findVillage:findVillage,lootVillage:lootVillage,abandonVillage:abandonVillage,veinId:veinId,abandonVein:abandonVein,migrate:migrate,restore:restore};
})(typeof window!=='undefined'?window:globalThis);

STATE_SCHEMA.register("world-discovery",["act", "actionQueue", "actionSequence", "worldFlowVersion", "veinSequence", "veins"]);
