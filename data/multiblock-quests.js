/* Multiblock construction goals use the public structure bill once at registration. */
(function(root){
 'use strict';
 var records=[
 {
  "id": 77,
  "name": "工业高炉时代",
  "pre": [
   88
  ],
  "desc": "为了得到铝锭,你需要一个工业高炉.这是通向胜利的另一重要步骤.让我们开始吧.\n\n加热线圈所需的云母可能会很棘手,但一阶线圈有替代方案.\n你需要两个LV级能源仓并提供总共4A的LV电流,或者如果你没有修复全部的故障,你就需要三个LV级能源仓和更多的电流.\n为了不被镍卡住,查看\"魔法学徒\"任务栏的\"镍的来源\"任务. \n\n一些高炉配方会产生CO2/SO2.这种流体可以通过在工业高炉顶层放置一个输出仓来收集.你也可以在工业高炉的控制器GUI中启用销毁流体.对于这些产出CO2/SO2的配方,你必须进行上面提到的两种操作之一,否则工业高炉就不会运行.\n能收集到的流体比例与消声仓的等级有关.\n\n Bart的铂系处理配方,流体将在底层输出,且不受消声仓等级的回收比例影响.\n\n启动之前,别忘了修复所有的维护问题,并且如果需要的话,放入正确的编程电路.\n\n如果你需要一台完美的工业高炉,你可以添加更多的输入仓,在其中存储不同的气体.\n\n译者注:前期氧与氮两种气体,中期陆续加入氦和氩,后期会有氡,至于氢气用得非常少,不建议常备.到了EV阶段后可以试试四重输入仓!\n\n工业高炉还会根据电压调整炉温,从MV开始,每提升一个电压等级,实际炉温将提高100K(LV将降低100K). 虽然目前你只能制造LV能源仓,但同时安装两个LV能源仓即可将高炉超频到MV,避免降低100K的惩罚,并且初始炉温可以达到1801K.\n\n随着游戏的进程,你的工业高炉不断升级,你就可以获得更多的炉温奖励. 两个MV能源仓(超频到HV)可以增加100K,两个HV能源仓(超频到EV)可以增加200K... 线圈本身仅仅决定了基础炉温.这种炉温调整不适用于炽焱高炉.\n\n如果污染变得非常严重,请查看GT++的污染清理机,或者升级你的消声仓.\n\n中文WIKI 工业高炉：[url]https://gtnh.huijiwiki.com/p/11\n\nPS：在本游戏中，所有机器的废气都被你的肺过滤干净了，因此没有污染。",
  "controllers": [
   "gregtech:gt.blockmachines@1000"
  ]
 },
 {
  "id": 81,
  "name": "真空冷冻机",
  "pre": [
   1014,
   940
  ],
  "desc": "...宇宙终将热寂.但要等待宇宙的死亡未免需要太长的时间了.因此,我们向你推荐真空冷冻机.它应该足以冷却你炽热的材料.\n\n经过工业高炉熔炼的各种锭,相当一部分会以热x锭的形式输出,而它需要冷冻.\n\n你需要至少16个防冻机械方块,剩下的部分取决于你配置的仓室.",
  "controllers": [
   "gregtech:gt.blockmachines@1002"
  ]
 },
 {
  "id": 876,
  "name": "大型化学反应釜",
  "pre": [
   160,
   10969491143682
  ],
  "desc": "已经厌倦使用小单元处理化学品了？建造一个大型化学反应釜吧，这样你就能直接用管道输送流体，或使用大型流体单元搬运流体。\n\n大型化学反应釜有一些专属配方，有时候你还可以跳过一两步化学反应，记得多查看配方表。\n\n此外，作为一个多方块机器，大型化学反应釜可视为超净间环境，可以执行超净间配方。\n\n你还需要：\n1x维护仓\n1-2x能源仓\n0+输入总线（如果配方需要输入物品的话；搭建全自动产线时，你大概应当为每种材料准备一个输入总线）\n0-1x输出总线（如果配方会输出物品的话）\n2+输入仓（每种流体一个输入仓）\n1+输出仓（同上）\n\n在输出仓设置中搜索并锁定一种流体，就能指定它从哪个接口输出。多个流体产物可以分别安排出口，这样布线方便得多。",
  "controllers": [
   "gregtech:gt.blockmachines@1169"
  ]
 },
 {
  "id": 768,
  "name": "蒸馏塔",
  "pre": [
   160,
   10969491143682
  ],
  "desc": "在你处理裂解燃料或热解炉配方时,这个狠角色会极大地提高副产率.如此一来你就可以更有效率的制造工业TNT、塑料、聚四氟乙烯,以及其他塑料产品.你也需要这台机器来完成你的铂线.\n\n你需要在超净间中制造EV电路板,然后才能制做这台机器.\n\n至于仓室,你可以自由选择.一个MV能源仓就可以胜任大多数有用的配方.两个MV能源仓或者一个HV能源仓就可以覆盖除了污染物或丙酮外几乎所有的配方.\n\n你还需要一个输入仓、至少五个输出仓,以及一个输出总线用于收集那些固体产出.\n\n在放置预览中选择塔高，每层安排一个流体输出仓。最底层安装输入仓和物品输出总线，再连接能源仓。",
  "controllers": [
   "gregtech:gt.blockmachines@1126"
  ]
 },
 {
  "id": 1412,
  "name": "装配线",
  "pre": [
   1890,
   1707
  ],
  "desc": "LuV 零部件需要装配线制造。各输入总线按配方顺序放入原料，流体由对应片层的输入仓接收。\n\n在数据访问仓放入研究闪存，或选择数据库频道，取得配方研究数据。",
  "controllers": [
   "gregtech:gt.blockmachines@1170"
  ]
 },
 {
  "id": 2601,
  "name": "电路装配线",
  "pre": [
   1680,
   1493,
   1683,
   1412,
   2606
  ],
  "desc": "电路装配线按片层顺序接收原料，使用铭刻指定要生产的电路。\n\n在结构浮窗切换电路装配线与电路组装机模式，再按当前模式安装仓室。",
  "controllers": [
   "gregtech:gt.blockmachines@12735"
  ]
 },
 {
  "id": 940,
  "name": "超净间",
  "pre": [
   1231
  ],
  "desc": "更加先进(也更加洁净!)的电路板需要在无尘环境下才能制作.为了得到无尘环境我们需要超净间.超净间是个有趣的多方块结构,因为你将在它的内部放置其他机器!\n\n超净间是整体大小在3x4x3到15x15x15之间的中空多方块结构.超净间的底部并不需要是正方形,长方形也可以.顶层由过滤机外壳构成,除了边缘,它是塑料混凝土方块.控制器必须位于顶层的中心.如果超净间的长或宽是双数,那么控制器可以放在中心两块(或四块)中的任意一块.结构的其余部分均由塑料混凝土方块搭建而成.\n\n其中最多30%的塑料混凝土方块可以用其它的方块或材料代替：\n\n一扇防爆门可以让你进出无尘室.请确保门是关着的,否则超净间会迅速失去洁净度.旅行锚和电梯也可以使用,如果需要,甚至可以将它们嵌入地板中.\n\n你可以使用线缆二极管或机器外壳,来自动通过墙壁输送电力和材料.但是在为你的内部机器更新换代时你要万分小心.务必拆下旧的机器外壳和线缆二级管,然后用新的更高电压的替换,否则你一定会很伤心的.如果只是用于传输物品,那就不用管等级的事.\n\n如果你想看到内部,可以使用任何EV级别以上的玻璃,例如防爆玻璃和魔力玻璃.如果超净间没有成型,请注意30%的限制：问题往往由你放置了太多玻璃导致的.这个多方块结构的耗电量有点不同寻常,一开始是40EU/t,然后逐渐降低.但即使是在使用40EU/t的情况下,要给它足够的电,单个LV能源仓就足够了,你往往会用MV电的.请记住,这只适用于超净间,并不是一个普适规则.\n\n让我们现在先造一个5x5x5大小的超净间,你以后可以根据需要对它进行扩建.给它通电,让它运行,直到洁净度达到100%.如果洁净度低于100%,超净间内的机器就有几率吞掉在其中制作的物品,因此您要让超净间始终保持运行状态!\n\n任何维护问题都会使洁净度上限降低10%.使用便携式扫描仪,工业信息屏,或使用维护提示覆盖板配上红石",
  "controllers": [
   "gregtech:gt.blockmachines@1172"
  ]
 },
 {
  "id": 2028,
  "name": "我感觉我要吐了",
  "pre": [
   176
  ],
  "desc": "用多方块采矿场获得的数以千计的矿石可以交给工业离心机处理.\n\n译者注：建议根据自己的需要选择打粉-离心、洗矿-打粉-离心、洗矿-热离-打粉这些工序.",
  "controllers": [
   "gregtech:gt.blockmachines@790"
  ]
 },
 {
  "id": 2034,
  "name": "嗞...嗞...嗞...",
  "pre": [
   213
  ],
  "desc": "需要大量的氧和氢,或是只是想要电解材料获得成吨的铝?",
  "controllers": [
   "gregtech:gt.blockmachines@796"
  ]
 },
 {
  "id": 2030,
  "name": "搅拌/搅拌/巧克力",
  "pre": [
   1410,
   213
  ],
  "desc": "奶奶,你能教我们巧克力之歌吗?\n乐意之至!\n你会跟我们一起唱巧克力之歌吗?\n太棒了,跟着奶奶一起唱!\n\n搅拌,搅拌,巧克力\n搅拌,搅拌,巧克力\n搅拌,搅拌,巧克力\n搅拌,搅拌,巧克力\n\n搅拌好吃的巧克力,巧克力\n搅拌好吃的巧克力,巧克力\n搅拌,搅拌,巧克力\n搅拌,搅拌,巧克力\n\n译者注:《搅拌,搅拌,巧克力》(Bate-Bate-Chocolate)是墨西哥传统儿歌.任务书原文歌词部分均为西班牙文.",
  "controllers": [
   "gregtech:gt.blockmachines@811"
  ]
 },
 {
  "id": 2032,
  "name": "最好的切面包机",
  "pre": [
   1416
  ],
  "desc": "当你有了一台装满了小刀的机器,你看啥都像面包了.使用螺丝刀可切换板材切割机模式和食材切片机模式.\n\nBluebine-2019!",
  "controllers": [
   "gregtech:gt.blockmachines@992"
  ]
 },
 {
  "id": 1421,
  "name": "绿巨人重拳粉碎!",
  "pre": [
   176
  ],
  "desc": "大规模破坏!或者至少,可以粉碎很多很多的矿石.建造一台工业粉碎机来处理你获得的所有矿石.在IV阶段,你可以通过升级芯片和更好的机械方块来升级它.",
  "controllers": [
   "gregtech:gt.blockmachines@797"
  ]
 },
 {
  "id": 1422,
  "name": "洗矿厂里的矿石...",
  "pre": [
   176
  ],
  "desc": "...转啊转,转了一整天.一个大型的洗矿厂可以将你的矿石变得干净又整洁.通过螺丝刀可切换洗矿/简易洗矿模式和化学浸洗模式.",
  "controllers": [
   "gregtech:gt.blockmachines@850"
  ]
 },
 {
  "id": 2038,
  "name": "弯曲、辊压",
  "pre": [
   176
  ],
  "desc": "当你需要成千上万的板子时。可通过螺丝刀切换卷板机模式和冲压机床模式。",
  "controllers": [
   "gregtech:gt.blockmachines@792"
  ]
 },
 {
  "id": 2031,
  "name": "大男孩大女孩的大玩具",
  "pre": [
   213
  ],
  "desc": "我不想长大,我想跟大压模机玩.\n以防你没在NEI看过主方块的tooltip,提醒一下：你可以在工业压模机上放置多个输入总线,每个总线可放入不同的模头,进入相应总线的材料会被加工成模头对应的成品.",
  "controllers": [
   "gregtech:gt.blockmachines@859"
  ]
 },
 {
  "id": 960687,
  "name": "大型高压釜",
  "pre": [
   1493
  ],
  "desc": "工业高压釜使用高压釜配方，可以在主世界加工晶体芯片原料。\n\n在工厂画布放置控制器，安装结构材料、输入与输出仓室，并接入电力。",
  "controllers": [
   "gregtech:gt.blockmachines@687"
  ]
 },
 {
  "id": 3144,
  "name": "铟太多了?",
  "pre": [
   2760
  ],
  "desc": "研磨处理线是另一种可选的产铟方式，为LuV及以上阶段的玩家设计。它不会无理由地销毁铝和方铅，并且使你可以高效地从闪锌中提取出铟。而代价就是相关机器和基础设施的投入。",
  "controllers": [
   "gregtech:gt.blockmachines@31027",
   "gregtech:gt.blockmachines@31028"
  ]
 },
 {
  "id": 2760,
  "name": "这到底是啥?",
  "pre": [
   1493
  ],
  "desc": "它不单是台多方块脱水机，也是台真空干燥炉，不过真空干燥炉没有单方块机器。它应该配合艾萨研磨机和工业浮选机这两台多方块机器，用于矿物研磨处理，这是一套进阶矿物处理系统，它需要一系列的配套机器，不过对于支持的矿石也可以提供许多新产出。\n\n这台多方块机器现在可以在LuV阶段制造了！",
  "controllers": [
   "gregtech:gt.blockmachines@995"
  ]
 },
 {
  "id": 3041,
  "name": "获得独居石浊溶液",
  "pre": [
   1890
  ],
  "desc": "很快你就会用到镧系元素，大量的镧系元素。\n然而，它们可不是轻易就能分离的……\n\n制造一台煮解池以解锁IV任务页中相应的任务线。\n\n请注意：如果不安装消声仓，这台多方块机器就无法正常工作。",
  "controllers": [
   "gregtech:gt.blockmachines@10500"
  ]
 },
 {
  "id": 3042,
  "name": "溶解罐",
  "pre": [
   3041,
   1406
  ],
  "desc": "基本上就是专为稀释而设计的一种特殊搅拌机。\n\n你需要为其按比例（NEI所示）提供输入，否则就无法获得输出。\n\n不管怎么说，溶解罐在镧系处理中扮演了相当重要的角色，所以赶紧制造一台吧。",
  "controllers": [
   "gregtech:gt.blockmachines@10501"
  ]
 },
 {
  "id": 2397,
  "name": "化工厂",
  "pre": [
   5284030059264,
   943
  ],
  "desc": "该设施将为你处理稍后需要的某些化学配方.比如火箭燃料. 注意,只有达到配方所需化工厂等级才能运行相应配方.\n\n而且化工厂需要大量资源,开始采矿吧! 某些配方需要催化剂,将它们放在催化剂仓内. 催化剂消耗耐久,包括看起来没有耐久的.\n\n碳化硅可在搅拌机中获得,不一定需要合金冶炼炉.\n\n可用的固体外壳:(决定可处理的配方等级)\n1 强化青铜机械方块\n2 脱氧钢机械方块\n3 强化铝机械方块\n4 洁净不锈钢机械方块\n5 加强钛机械方块\n6 强化钨钢机械方块\n7 强化劳伦姆合金机械方块\n8 强化博特姆合金机械方块\n\n可用的机械方块:(决定仓室/总线的等级上限)\nULV-UHV机械方块(UHV即可解锁所有仓室/总线)\n\n可用的管道方块:(从2并行,100％催化剂消耗几率开始,每级管道方块提升+2并行,-20％催化剂消耗几率)\n青铜\n钢\n钛\n钨钢\n\n从白铜线圈到永恒线圈,所有等级线圈都可用.每个等级提速+50％,初始速度(白铜线圈)为50％.\n\n另外:使用觉醒龙锭及以上等级的线圈+钨钢管道方块,不会消耗催化剂耐久.",
  "controllers": [
   "gregtech:gt.blockmachines@998"
  ]
 },
 {
  "id": 2732,
  "name": "开充!(Take charge!)",
  "pre": [
   805,
   1261
  ],
  "desc": "兰波顿超级电容库是大规模储电的最佳选择。\n\n它可能会出现故障，每个维护问题将增加20%能量损失，所以尽量不要忽视问题。不过就算这样，它的最高能量损失也就2.2%。\n\n最初也是最小的超级电容库需要任务里的这些舱室，再加上能源仓和动力仓。别忘了解包器可以将制成电容的兰波顿电池拆出来。终于有理由做一个了！\n\n你可以使用激光仓，这种仓室能输出相当高的电流。安装至少UV等级的玻璃才能解锁激光仓。\n\n只用EV电容的兰波顿超级电容库可以存储300M到25.38GEU。请记住，你需要保证超过一半的方块是非空电容，这样多方块结构才能正常工作。",
  "controllers": [
   "gregtech:gt.blockmachines@13106"
  ]
 }
],byId=new Map(GD.quests.map(function(q){return [q.id,q];}));
 var chapter={chap:'MultiblockGoals',chapcn:'多方块结构',chapi:22};
 function kit(keys){
  var totals=new Map();function add(k,n){k=CONTENT.canonicalKey(k);totals.set(k,(totals.get(k)||0)+n);}
  keys.forEach(function(k){
   var m={k:k,uid:'quest-kit:'+k,x:0,y:0},minimum=Object.fromEntries(MULTIBLOCKS.dimensions(m).map(function(f){return [f.key,f.min];}));m.structureSize=MULTIBLOCKS.placementSize(m,minimum);MULTIBLOCKS.initializeEmpty(m);
   add(k,1);MULTIBLOCKS.required(m).fixed.forEach(function(p){add(p.k,p.n);});
  });
  return Array.from(totals,function(pair){return {k:pair[0],n:pair[1]};});
 }
 records.forEach(function(record){
  var q=byId.get(record.id);if(!q){q={id:record.id};GD.quests.push(q);byId.set(q.id,q);}
  Object.assign(q,chapter,{name:record.name,pre:record.pre.slice(),desc:record.desc,items:[]});
  GD.questRules.rules[q.id]={pre:record.pre.slice(),preLogic:'AND',taskLogic:'AND',resolved:true,groups:[{id:'structure-kit',type:'retrieval',ignoreNBT:true,items:kit(record.controllers)}]};
 });
 [1212,3090,2936,950061,950062,950063,1200].forEach(function(id){var q=byId.get(id);if(q)Object.assign(q,chapter);});
 var crystal=byId.get(1687);if(crystal)crystal.desc='用铕和精致的绿宝石或精致的橄榄石，在高压釜中制造晶体芯片原料，再用激光蚀刻机加工。\n\n工业高压釜可以在主世界完成这道工序。使用单方块高压釜时，需要超净间和低重力环境。';
 var targets=Object.fromEntries(records.map(function(r){return [r.id,r.controllers.slice()];}));
 GD.quests.forEach(function(q){
  if(q.chap==='MassProcessing')Object.assign(q,chapter);
  if(q.chap!==chapter.chap||targets[q.id])return;
  var rule=QUESTS.rule(q);if(rule.groups.some(function(g){return !['retrieval','optional_retrieval'].includes(g.type);}))return;
  var keys=Array.from(new Set(rule.groups.filter(function(g){return !g.optional;}).flatMap(function(g){return g.items||[];}).map(function(p){return CONTENT.canonicalKey(p.k);}).filter(function(k){return MULTIBLOCKS.managed({k:k});})));
  if(!keys.length)return;
  GD.questRules.rules[q.id]=Object.assign({},rule,{taskLogic:'AND',groups:[{id:'structure-kit',type:'retrieval',ignoreNBT:true,items:kit(keys)}]});q.items=[];targets[q.id]=keys;
 });
 GD.multiblockQuestControllers=targets;
})(typeof window!=='undefined'?window:globalThis);
