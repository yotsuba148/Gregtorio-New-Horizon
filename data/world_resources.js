/* Acquisition scenes: native resources, with explicit idle-game effort times.
 * These times are design values, not Minecraft drop probabilities or tick costs.
 * Processing still follows the imported recipes; scenes do not produce metals,
 * circuit components or other manufactured products.
 */
(function(){
 GD.looseOreSearchSeconds=600;
 const resources=[
  {id:'gather_rubberwood',name:'橡胶林采伐',time:6,dim:'overworld',scene:'橡胶林',out:[['IC2:blockRubWood@0',1]]},
  {id:'gather_rubber_sapling',name:'寻找橡胶树苗',time:45,dim:'overworld',scene:'橡胶林',out:[['IC2:blockRubSapling@0',1]]},
  {id:'gather_wool',name:'草原寻羊',time:20,dim:'overworld',scene:'草原',out:[['minecraft:wool@0',1]]},
  {id:'gather_carrots',name:'村庄收集胡萝卜',time:20,dim:'overworld',scene:'村庄农田',out:[['minecraft:carrot@0',1]]},
  {id:'gather_potatoes',name:'村庄收集马铃薯',time:20,dim:'overworld',scene:'村庄农田',out:[['minecraft:potato@0',1]]},
  {id:'forage_cotton_seed',name:'草原寻找棉花种子',time:30,dim:'overworld',scene:'草原',out:[['Natura:barley.seed@1',1]],provenance:'Natura 2.8.9 NContent + Natura.cfg: grass seed enabled; search time is an idle rule'},
  {id:'hunt_spiders',name:'寻找蜘蛛',time:20,dim:'overworld',scene:'洞穴',out:[['minecraft:string@0',1]]},
  {id:'hunt_skeletons',name:'搜寻骷髅',time:20,dim:'overworld',scene:'洞穴',out:[['minecraft:bone@0',1]]},
  {id:'hunt_zombies',name:'夜间巡游',time:20,dim:'overworld',scene:'荒野',out:[['minecraft:rotten_flesh@0',1]]},
  {id:'hunt_endermen',name:'夜间寻找末影人',time:60,dim:'overworld',scene:'荒野',out:[['minecraft:ender_pearl@0',1]]},
  {id:'hunt_cattle',name:'牧场收集皮革',time:30,dim:'overworld',scene:'牧场',out:[['minecraft:leather@0',1]]},
  {id:'gather_feathers',name:'牧场收集羽毛',time:20,dim:'overworld',scene:'牧场',out:[['minecraft:feather@0',1]]},
  {id:'gather_eggs',name:'牧场寻找鸡蛋',time:30,dim:'overworld',scene:'牧场',out:[['minecraft:egg@0',1]]},
  {id:'hunt_blazes',name:'寻找烈焰人',time:45,dim:'nether',scene:'下界要塞',out:[['minecraft:blaze_rod@0',1]]},
  {id:'hunt_ghasts',name:'寻找恶魂',time:90,dim:'nether',scene:'下界峡谷',out:[['minecraft:ghast_tear@0',1]]},
  {id:'hunt_magma_cubes',name:'寻找岩浆怪',time:60,dim:'nether',scene:'熔岩湖岸',out:[['minecraft:magma_cream@0',1]]},
  {id:'gather_poppies',name:'采摘虞美人',time:4,timing:'search',dim:'overworld',scene:'草原',out:[['minecraft:red_flower@0',1]]},
  {id:'gather_dandelions',name:'采摘蒲公英',time:4,timing:'search',dim:'overworld',scene:'草原',out:[['minecraft:yellow_flower@0',1]]},
  {id:'gather_cactus',name:'采集仙人掌',time:6,timing:'search',dim:'overworld',scene:'沙漠',out:[['minecraft:cactus@0',1]]},
  {id:'gather_glowstone',name:'采集荧石',time:8,timing:'search',dim:'nether',scene:'下界洞穴',out:[['minecraft:glowstone_dust@0',1]]},
  {id:'hunt_wither_skeletons',name:'搜寻凋灵骷髅',time:120,dim:'nether',scene:'下界要塞',out:[['minecraft:skull@1',1]]},
  {id:'summon_wither',name:'召唤并击败凋灵',time:120,dim:'overworld',scene:'召唤场地',consume:[['minecraft:skull@1',3],['minecraft:soul_sand@0',4]],out:[['minecraft:nether_star@0',1]]}
 ];
 for(const r of resources){r.effortTimeIsIdleDesign=true;if(!GD.sources.some(s=>s.id===r.id))GD.sources.push(r);}
})();
