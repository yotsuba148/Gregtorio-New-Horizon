(function(){
 'use strict';
 var zpm={chap:'ZPMVoltage',chapcn:'第7阶-零点压(ZPM)',chapi:10};
 var uv={chap:'UltimateVoltage',chapcn:'第8阶-极限压(UV)',chapi:11};
 var structures={chap:'MultiblockGoals',chapcn:'多方块结构',chapi:22};
 var space={chap:'SpaceRace',chapcn:'太空竞赛',chapi:29};
 var entries=[
  {"id":950098,"pre":[950013],"name":"地狱接口","desc":"为地狱接口装上输入总线、输出总线、输入仓、输出仓和能源仓。向输入仓供给蒸馏水，接通电力后，机器会随机产出下界战利品，还有机会获得熔融地狱金属。","items":[["gregtech:gt.blockmachines@19077",1]],"structure":true},
  {"id":950079,"pre":[5284030059264,1493],"name":"培育红藻","desc":"用 IV 机械方块搭建藻类农场的底板，配上 IV 或更高等级的输入仓和多格输出总线。向池塘注满水，再投入堆肥，每批至少产出 3 份红藻生物质。","items":[["miscutils:item.BasicAgrichemItem@4",32]]},
  {"id":950080,"pre":[2610],"name":"从硅岩中提取精金","desc":"用中子活化器处理硅岩-精金溶液，设在 200–230 MeV。电解氧化精金粉，再用工业高炉和真空冷冻机得到精金锭。中子活化还会产出浓缩富集硅岩矿泥粉。","items":[["gregtech:gt.metaitem.01@11319",8]],"optional":[["bartworks:gt.bwMetaGenerateddust@10066",4],["bartworks:gt.bwMetaGenerateddust@10070",1]]},
  {"id":950085,"pre":[2610,950079],"name":"海晶石碎片","desc":"用红藻生物质、赛特斯石英粉和一级净化水在高压釜里制取海晶石碎片。","items":[["Botania:manaResource@10",64]],"optional":[["miscutils:item.BasicAgrichemItem@4",256],["gregtech:gt.metaitem.01@2516",256]]},
  {"id":950086,"pre":[950085],"name":"海晶石溶液","desc":"在你获取了一些海晶石之后，你必须用在溶解罐中用工业氢氟酸和过氧化氢来处理它。使用这些原料你可以获取你的第一批海晶石溶液。\n\n在您成功制造出第一批工业氢氟酸后，强烈建议您检查化工厂配方以进一步制造它！","items":[["gregtech:gt.metaitem.01@30135",8],["gregtech:gt.metaitem.01@2516",4]],"optional":[["Botania:manaResource@10",24],["IC2:itemCellEmpty@15",4],["miscutils:HydrogenPeroxide@0",4]]},
  {"id":950087,"pre":[950086],"name":"富海晶硝基苯溶液","desc":"在获得一定量的海晶石溶液后，将其与硝基苯置于化学浸洗机中进行反应，即可制得富海晶硝基苯溶液。\n\n此外，此过程还将产生一些海晶参杂的过氧化氢。","items":[["gregtech:gt.metaitem.01@30136",1],["gregtech:gt.metaitem.01@30137",2]],"optional":[["gregtech:gt.metaitem.01@30135",1],["miscutils:nitrobenzene@0",2]]},
  {"id":950088,"pre":[950087],"name":"海晶沉淀","desc":"在制得富海晶硝基苯溶液后，你需要将其置于化工厂中，并使用氢氧化锶对其进行处理。处理完毕后，即可成功获得你的第一份海晶沉淀。\n\n这条处理线中锶是净产出的，因此无需费心向产线中持续添加它。\n\n如果你还没有取得锶，你可以从稀土(III)或锰铝榴石泡沫中获取氧化锶。","items":[["gregtech:gt.metaitem.03@32248",8],["gregtech:gt.metaitem.01@30138",12],["miscutils:nitrobenzene@0",4]],"optional":[["miscutils:itemDustStrontiumHydroxide@0",48],["gregtech:gt.metaitem.01@30137",16]]},
  {"id":950089,"pre":[950088],"name":"海晶晶体","desc":"在成功制得海晶沉淀后，合乎逻辑的下一步是将其晶体化为海晶晶体。为此，我们可以使用磁共振石透镜，并在熔融晶化合金的辅助下通过激光蚀刻机完成这过程。","items":[["gregtech:gt.metaitem.03@32249",1],["gregtech:gt.metaitem.99@44",2]],"optional":[["gregtech:gt.metaitem.03@32248",1],["gregtech:gt.metaitem.99@403",1],["bartworks:gt.bwMetaGeneratedlens@36",1]]},
  {"id":950090,"pre":[950089],"name":"海晶气","desc":"之后，在真空干燥炉中用硼等离子体处理海晶晶体，将其转化为人们狂热追求的海晶气。","items":[["gregtech:gt.metaitem.01@30161",1]],"optional":[["gregtech:gt.metaitem.03@32249",1],["gregtech:gt.metaitem.01@31009",1]]},
  {"id":950091,"pre":[950090],"name":"海晶酸","desc":"我保证，真的快到头了！\n\n你已经得到了海晶气，现在你必须在真空冷冻机中借助液氮将它冷却下来。这样你就能得到海晶酸。\n\n除了能够继续推进这条任务线，海晶酸还可用于稍后对盖亚块的处理。\n","items":[["gregtech:gt.metaitem.01@30162",16]],"optional":[["gregtech:gt.metaitem.01@30161",4],["gregtech:gt.metaitem.01@30494",12]]},
  {"id":950092,"pre":[950091,2919],"name":"海晶硅岩","desc":"哇，一种新的金属？\n\n将你新制得的富集硅岩和海晶酸在合金冶炼炉中结合，你会发现形成了一种新型金属：海晶硅岩。\n\n这种极其坚固但又柔韧异常的材料，后续将会被用于多种不同的结构和材料之中。","items":[["gregtech:gt.metaitem.99@163",16]],"optional":[["gregtech:gt.metaitem.01@2326",32],["gregtech:gt.metaitem.01@30162",8]]},
  {"id":950093,"pre":[950092],"name":"海晶硅岩混合砂浆","desc":"何必止步于海晶硅岩？有鉴于其良好的韧性和强度，你猜测它可以用于制作耐久度高得多的新型片状材料。\n\n在搅拌机中将海晶硅岩与你自选的结合剂混合，就能制造出你所想的那种物质——可制作出片状材料的海晶硅岩混合砂浆。","items":[["gregtech:gt.metaitem.01@30164",2]],"optional":[["gregtech:gt.metaitem.99@163",4],["kekztech:kekztech_crafting_item@9",4],["gregtech:gt.metaitem.01@2901",32],["gregtech:gt.metaitem.99@163",4],["kekztech:kekztech_crafting_item@9",4],["bartworks:gt.bwMetaGenerateddust@102",24]]},
  {"id":950094,"pre":[950093],"name":"海晶硅岩复合片","desc":"在碳化钨和铅箔之上对海晶硅岩混合砂浆进行脱水处理，即可制得完全的防辐射海晶硅岩复合片。该材料在屏蔽辐射性结构所产生的辐射、保护周边环境安全方面非常实用。","items":[["gregtech:gt.metaitem.03@32250",16]],"optional":[["gregtech:gt.metaitem.01@29370",16],["gregtech:gt.metaitem.01@29089",16],["gregtech:gt.metaitem.01@30164",8]]},
  {"id":950095,"pre":[950094],"name":"硅岩通用绝缘箔","desc":"最终，你可以在冲压机床中将防辐射海晶硅岩复合片、下界合金箔和玛玉灵结合，得到硅岩通用绝缘箔。得益于其无可匹敌的辐射与热抗性，这种强得可怕的片状材料会出现在未来的所有线圈中，用于将各部分结合在一起。","items":[["gregtech:gt.metaitem.03@32251",8]],"optional":[["gregtech:gt.metaitem.01@29132",4],["gregtech:gt.metaitem.03@32250",16],["gregtech:gt.metaitem.99@386",8]]},
  {"id":2610,"pre":[1493,1213],"name":"第7阶段(ZPM)","desc":"ZPM阶段。说到ZPM，你知道这个名字是来自美剧《星际之门-SG1》的零点模块（Zero-Point-Module）吗？这是部很棒的电视剧，延续了电影的情节，快去看吧！也许你已经在世界中找到一个电量几乎耗尽的零点模块了。如果你能找到些帮助，或许甚至能创造一个全新的。","items":[["gregtech:gt.blockmachines@17",1]]},
  {"id":2611,"pre":[2610],"name":"ZPM 零件（一）","desc":"在装配线制造 ZPM 电动马达、活塞、泵、传送带和机械臂。马达会用到细铕导线和硅岩合金。","items":[["gregtech:gt.metaitem.01@32607",1],["gregtech:gt.metaitem.01@32646",1],["gregtech:gt.metaitem.01@32636",1],["gregtech:gt.metaitem.01@32616",1],["gregtech:gt.metaitem.01@32656",1]]},
  {"id":2612,"pre":[2611],"name":"ZPM 零件（二）","desc":"继续制造 ZPM 发射器和传感器。","items":[["gregtech:gt.metaitem.01@32686",1],["gregtech:gt.metaitem.01@32696",1]]},
  {"id":2625,"pre":[2611],"name":"ZPM组装机","desc":"制造一台 ZPM 组装机。6 阶火箭的控制电脑也可以在达到 ZPM 加工功率的多方块组装机里制造。","items":[["gregtech:gt.blockmachines@10781",1]]},
  {"id":2619,"pre":[2625],"name":"ZPM超导(131,072 EU/t)","desc":"你能自己弄清楚如何制作，对吧？","items":[["gregtech:gt.blockmachines@2420",64]]},
  {"id":2630,"pre":[950081,1213],"name":"铕掺杂的晶圆","desc":"在工业高炉中制作铕掺杂的单晶硅，炉温需达到 6,484 K。再向切割机供三级净化水，切成晶圆。","items":[["gregtech:gt.metaitem.03@32151",96]],"optional":[["gregtech:gt.metaitem.03@32150",1]]},
  {"id":2632,"pre":[2630],"name":"纳米功率IC","desc":"用铕掺杂的晶圆制作纳米功率 IC 晶圆，再在切割机中切出纳米功率 IC。","items":[["gregtech:gt.metaitem.03@32161",1]],"optional":[["gregtech:gt.metaitem.03@32160",1]]},
  {"id":2627,"pre":[2632,2619],"name":"ZPM能源仓","desc":"下一阶的聚变反应堆需要这种能源仓，这样你就能制造镅和三钛了，同时能源仓还可用于升级多方块机器。","items":[["gregtech:gt.blockmachines@47",1]]},
  {"id":2622,"pre":[2612,1710],"name":"力场发生器(ZPM)","desc":"在装配线制作 ZPM 力场发生器。可以用 LuV 阶段完成的晶体主机作为 UV 电路板。","items":[["gregtech:gt.metaitem.01@32676",1]]},
  {"id":2631,"pre":[2632],"name":"皮米功率IC晶圆","desc":"皮米功率 IC 晶圆会用于核聚变反应堆 MK-II。配方可在 JEI 查看。","items":[["gregtech:gt.metaitem.03@32162",1]],"optional":[["gregtech:gt.metaitem.03@32160",1],["gregtech:gt.metaitem.01@2981",64],["gregtech:gt.metaitem.99@318",10]]},
  {"id":1197,"pre":[2627,950082,2631,1213,2622],"name":"聚变反应堆MK2-更大,更好,更强","desc":"核聚变反应堆 MK-II 使用聚变机械方块和聚变线圈方块。至少装 10 个 ZPM 能源仓就能把储能上限提到约 2 亿 EU，达到镅和三钛的点火要求。给能源仓供电，让反应堆充能，再送入配方所需的流体。","items":[["gregtech:gt.blockmachines@1194",1]],"structure":true},
  {"id":1199,"pre":[1197],"name":"制造镅","desc":"在核聚变反应堆 MK-II 中投入熔融镥和熔融铬，制成熔融镅，再铸成锭。","items":[["gregtech:gt.metaitem.01@11103",48]],"optional":[["gregtech:gt.metaitem.01@11078",48],["gregtech:gt.metaitem.01@11030",48]]},
  {"id":2658,"pre":[1197],"name":"制造三钛","desc":"先用熔融镓和氡聚变制取熔融铿铀，再和熔融钛一起送进聚变 MK-II，得到熔融三钛。装满一个单元即可提交。","items":[["gregtech:gt.metaitem.99@329",1]],"optional":[["gregtech:gt.metaitem.01@30093",3],["gregtech:gt.metaitem.99@37",2],["gregtech:gt.metaitem.99@328",2],["gregtech:gt.metaitem.99@28",3]]},
  {"id":2669,"pre":[2640,950097],"name":"中子锭","desc":"乘六阶火箭前往海卫八或海卫一，开采中子矿。把中子粉与氦等离子体混合成粗制中子素粉，在达到 9,000 K 和 UV 加工功率的工业高炉中冶炼，再用真空冷冻机冷却。","items":[["gregtech:gt.metaitem.01@11129",16]]},
  {"id":2919,"pre":[2947],"name":"富集硅岩锭","desc":"硫酸富集硅岩粉可在工业高炉里与锌粉冶炼，也可先用电解机取得富集硅岩粉。","items":[["gregtech:gt.metaitem.01@11326",1],["gregtech:gt.metaitem.01@2326",1]]},
  {"id":2945,"pre":[950080],"name":"浓缩富集硅岩","desc":"中子活化硅岩-精金溶液时会产出浓缩富集硅岩矿泥粉。也可以把高纯富集硅岩溶液和氢氧化钠粉送进高压釜。","items":[["bartworks:gt.bwMetaGenerateddust@10070",1]]},
  {"id":2947,"pre":[2945],"name":"中子活化富集硅岩","desc":"用中子活化器处理浓缩富集硅岩矿泥粉，按 JEI 配方设置中子动能。","items":[["bartworks:gt.bwMetaGenerateddust@10071",1]]},
  {"id":2950,"pre":[2610],"name":"提取超能硅岩","desc":"处理硅岩矿时收集副产物，再制取低纯磷酸超能硅岩粉。","items":[["bartworks:gt.bwMetaGenerateddust@10074",1]]},
  {"id":2953,"pre":[950083],"name":"中子活化超能硅岩","desc":"用中子活化器处理高纯超能硅岩溶液。硫酸超能硅岩粉可以用来冶炼，低纯产物可以回到前面的工序继续富集。","items":[["bartworks:gt.bwMetaGenerateddust@10078",1]]},
  {"id":2954,"pre":[2953],"name":"回收低纯超能硅岩","desc":"把中子活化得到的低纯硫酸超能硅岩粉继续提纯。回收产物可以重新送入中子活化器。","items":[["bartworks:gt.bwMetaGenerateddust@10076",1]]},
  {"id":2955,"pre":[2953],"name":"超能硅岩锭","desc":"将硫酸超能硅岩粉和镁粉送入工业高炉。热锭冷却后可用于下一阶段的零件和电路。","items":[["gregtech:gt.metaitem.01@11327",1],["gregtech:gt.metaitem.01@2327",1]]},
  {"id":2613,"pre":[2610,2955,2669,1710,1199],"name":"第8阶段(UV)","desc":"虽然名为“极限压”,但这远远称不上是最终阶段.倒不如说,接下来的这些电压等级中的\"极\"字正是你接下来游戏基调的贴切形容词,因为你的力量和基础设施将不断突破极限.","items":[["gregtech:gt.blockmachines@18",1]],"uv":true},
  {"id":950082,"pre":[2611,2919,1710],"name":"热等静压装置","desc":"用热等静压装置将铕板压成超致密铕板。机器工作时会升温，可用更好的线圈减慢升温。过热时先冷却，再继续做超致密板。","items":[["gregtech:gt.blockmachines@3006",1]],"structure":true},
  {"id":950081,"pre":[2611,950063,1710,950080],"name":"絮凝净化单元","desc":"把絮凝净化单元连接到同一张画布上的净水厂。两个 LuV 能源仓可以提供加工所需的功率。将 900,000 mB 聚氯化铝分到两个输入仓，再用另一个输入仓送入二级净化水。用一个输出仓收集三级净化水，另外两个 LuV 输出仓锁定絮凝废液，再用蒸馏塔回收废液。","items":[["gregtech:gt.blockmachines@9405",1]],"structure":true},
  {"id":950083,"pre":[2950],"name":"纯化超能硅岩","desc":"钡会与硫酸发生反应，变成不溶性的粉，这样我们就可以将其除去。","items":[["bartworks:gt.bwMetaGeneratedcell@10075",1]]},
  {"id":950084,"pre":[2954],"name":"精炼低纯超能硅岩","desc":"所以它是一个圈？","items":[["bartworks:gt.bwMetaGeneratedcell@10077",1]]},
  {"id":950097,"pre":[950095],"name":"三元金属线圈","desc":"用硅岩通用绝缘箔和三元金属导线制作线圈，再更换工业高炉里的线圈。需要三元金属粉时，可以离心土卫六尘。三元金属线圈的基础炉温是 9,001 K。","items":[["gregtech:gt.blockcasings5@10",1]]},
  {"id": 2639, "pre": [2752, 2658, 2627], "name": "6阶重型装甲板", "desc": "在达到 UV 加工功率的装配线上，用五阶重型装甲板、压缩奥利哈钢铅板和三钛螺栓制成六阶重型合金锭。两个 ZPM 能源仓可以提供所需功率。再用聚爆压缩机压成装甲板。", "items": [["dreamcraft:item.HeavyDutyPlateTier6@0", 13]], "space": true},
  {"id": 2751, "pre": [2639], "name": "6阶火箭控制电脑", "desc": "把六阶重型装甲板和其它零件送入达到 ZPM 加工功率的组装机，制作六阶火箭控制电脑。", "items": [["GalaxySpace:item.RocketControlComputer@6", 1]], "space": true}
 ];
 function stacks(items){return items.map(function(p){return {k:CONTENT.canonicalKey(p[0]),n:p[1]};});}
 function group(items,id,optional){return {id:id,type:'retrieval',ignoreNBT:true,optional:!!optional,items:items};}
 entries.forEach(function(r){
  var chapter=r.structure?structures:r.space?space:r.uv?uv:zpm;
  var q=Object.assign({},chapter,{id:r.id,name:r.name,pre:r.pre,desc:r.desc,items:[]});
  var items=stacks(r.items),groups=[group(items,'goal')];
  if(r.optional)groups.push(group(stacks(r.optional),'materials',true));
  var existing=GD.quests.find(function(q){return q.id===r.id;});
  if(existing)Object.assign(existing,q);else GD.quests.push(q);
  GD.questRules.rules[r.id]={pre:r.pre,preLogic:'AND',taskLogic:'AND',groups:groups,resolved:true};
 });
 var rocket=GD.quests.find(function(q){return q.id===2640;});
 rocket.pre=[2751];GD.questRules.rules[2640].pre=rocket.pre;
 var algae=GD.quests.find(function(q){return q.id===5284030059264;});
 algae.desc='藻类农场靠水就能工作。底板使用同等级的机械方块，进水仓至少要与底板同级。注入 98,000 mB 水后，池塘会持续产出藻类。堆肥可让产出提高一阶。';
})();
