/* Idle adaptation: consolidated acquisition and repeatable village exploration. */
(function(root){
 'use strict';var C=CONTENT;
 var names={forest:'林地',river:'河岸',meadow:'草地花丛',village:'村庄',pasture:'牧场',cave:'岩壁洞穴',wilds:'荒野狩猎',smallOres:'零散小矿石',nether:'下界荒野',fortress:'下界要塞',adventure:'冒险挑战'};
 var removed=new Set(['harvest_sapling','gather_rubber_sapling','gather_carrots','gather_potatoes','forage_grass','forage_cotton_seed','dig_surface_dirt','mine_training_stone']);
 GD.sources=GD.sources.filter(function(s){return !removed.has(s.id);});
 function tree(id,sapling,chance){var d=ACTIVITIES.definitions[id];d.name=id==='chop_tree'?'砍伐橡树':'砍伐橡胶树';d.outputDescription=(id==='chop_tree'?'橡木原木':'橡胶原木')+' ×1，伴生树苗';d.outcome=function(S,a){var out=d.out.map(function(p){return{k:p[0],n:p[1]};});if(ACTIVITIES.random(a,1000)<chance)out.push({k:sapling,n:1});return out;};}
 tree('chop_tree','minecraft:sapling@0',250);tree('gather_rubberwood','IC2:blockRubSapling@0',134);
 ACTIVITIES.definitions.mine_cobble.name='开采石头';
 ACTIVITIES.definitions.gather_white_tulips.name='采摘白色郁金香';
 ACTIVITIES.definitions.gather_goldenrod.name='采摘麒麟草';
 ['gather_poppies','gather_dandelions','gather_white_tulips','gather_goldenrod'].forEach(function(id){ACTIVITIES.definitions[id].worldAdvanced=true;});
 function add(d){d.effortTimeIsIdleDesign=true;GD.sources.push(d);ACTIVITIES.register(d);}
 add({id:'forage_meadow',name:'草地搜集',dim:'overworld',time:12,scene:'草地花丛',out:[['minecraft:wheat_seeds@0',1],['Natura:barley.seed@1',1]],outputDescription:'小麦种子、棉花种子各 ×1，另有一株普通花',
  outcome:function(S,a){var flower=['minecraft:red_flower@0','minecraft:yellow_flower@0','minecraft:red_flower@6','BiomesOPlenty:flowers2@4'][ACTIVITIES.random(a,4)];return[{k:'minecraft:wheat_seeds@0',n:1},{k:'Natura:barley.seed@1',n:1},{k:flower,n:1}];}});
 add({id:'village_forage',name:'搜集村庄农田',dim:'overworld',scene:'村庄',time:20,out:[['minecraft:carrot@0',2],['minecraft:potato@0',2]],outputDescription:'胡萝卜、马铃薯各 ×2，可带回种植'});
 // Native furnace/casting component catalogue. Villages salvage individual
 // parts using world-flow.js; no whole-kit reward or guarantee is registered.
 var kit=[['TConstruct:Smeltery@0',1],['TConstruct:Smeltery@2',18],['TConstruct:Smeltery@1',1],['TConstruct:LavaTank@0',1],['TConstruct:SearedBlock@0',1],['TConstruct:SearedBlock@2',1],['TConstruct:SearedBlock@1',2],['TConstruct:Smeltery@11',2],['TConstruct:metalPattern@0',1],['TConstruct:metalPattern@2',1]];
 add({id:'village_search',name:'寻找村庄',dim:'overworld',scene:'村庄',icon:'minecraft:carrot@0',time:90,out:[]});
 function search(id,name,dim,scene,output){
  add({id:id,name:name,dim:dim,scene:scene,time:GD.looseOreSearchSeconds,timing:'search',
   repeatable:false,out:[[output,1]]});
 }
 search('find_poor_realgar','寻找贫瘠雄黄矿石','nether',names.nether,'gregtech:gt.metaitem.01@5913');
 search('find_poor_amethyst','寻找贫瘠紫水晶矿石','twilight',names.smallOres,'gregtech:gt.metaitem.01@5509');
 add({id:'slime_island_search',name:'搜刮黏黏',icon:'TConstruct:slime.sapling@0',time:300,dim:'overworld',group:'exploration',
  out:[['TConstruct:slime.gel@1',16],['TConstruct:slime.gel@0',8],['TConstruct:slime.sapling@0',1]]});
 add({id:'gather_wild_resin',name:'采集野生橡胶树脂',time:24,dim:'overworld',group:'forest',
  icon:'IC2:itemHarz@0',out:[['IC2:itemHarz@0',1]]});
 add({id:'gather_vines',name:'寻找藤蔓',time:60,dim:'overworld',group:'forest',
  icon:'minecraft:vine@0',out:[['minecraft:vine@0',1]]});
 add({id:'gather_glowflower_seed',name:'寻找夜光花',time:60,dim:'overworld',group:'forest',
  icon:'BiomesOPlenty:flowers@3',out:[['BiomesOPlenty:flowers@3',1]]});
 var debris='etfuturum:ancient_debris@0';
 search('find_ancient_debris','寻找远古残骸','nether',names.nether,debris);
 GD.faceIcons=GD.faceIcons||{};
 GD.faceIcons[debris]='modicons/front/ancient_debris.png';
 function groupOf(s){var id=s.id;
  if(id.startsWith('tc_wand_'))return'processing';
  if(s.group==='exploration'||id.startsWith('find_liquid_')||id==='locate_stronghold')return'exploration';
  if(s.weightedDrops||s.scene===names.smallOres)return'smallOres';if(s.adventure||id.startsWith('adventure_')||id==='summon_wither')return'adventure';
  if(id.startsWith('village_'))return'village';
  if(s.group==='forest'||['chop_tree','gather_rubberwood'].includes(id))return'forest';
  if(['dig_gravel','dig_sand','dig_clay','cut_reed','get_water'].includes(id))return'river';
  if(['forage_meadow','gather_mystical_flowers','gather_poppies','gather_dandelions','gather_white_tulips','gather_goldenrod'].includes(id))return'meadow';
  if(['gather_wool','hunt_cattle','gather_feathers','gather_eggs'].includes(id))return'pasture';
  if(['mine_cobble','mine_obsidian','dig_dirt','get_lava','gather_glowflower'].includes(id))return'cave';
  if(s.dim==='nether')return['hunt_blazes','hunt_wither_skeletons','gather_netherwart'].includes(id)?'fortress':'nether';
  return'wilds';
 }
 root.WORLD_SCENES={names:names,groupOf:groupOf,villageState:function(S){return WORLD_DISCOVERY.villages(S);},smelteryKit:kit};
})(typeof window!=='undefined'?window:globalThis);
