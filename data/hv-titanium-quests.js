 
 
(function(){
 'use strict';
 var list=[
  {id:1011,chap:"Tier3HV",chapcn:"第3阶-高压(HV)",chapi:6,name:"找到铝土矿脉",pre:[162],desc:"铝土矿脉蕴涵两种可以处理获得钛的矿石,铝土矿和钛铁矿. 铝土矿中还含有铝,而铝矿石这种也有铝(废话). 你需要成吨的钛,所以多挖点铝土矿脉吧.\n\n当你采矿的时候,肯定会挖到贫瘠矿并捡到一些陨铁矿,足够造火箭了. 要是还不够,或者你想多囤一点的话,可以挖掘那些从天而降的陨石.",items:[["gregtech:gt.metaitem.03", 5822, 32]]},
  {id:1424,chap:"Tier3HV",chapcn:"第3阶-高压(HV)",chapi:6,name:"寻找钛铁",pre:[162],desc:"事实上你可以从铝土矿脉中中获得更多的钛铁矿. 但是你可能是来寻找铬铁矿的？",items:[["gregtech:gt.metaitem.03", 5918, 32]]},
  {id:1012,chap:"Tier3HV",chapcn:"第3阶-高压(HV)",chapi:6,name:"金红石",pre:[1424, 1011],desc:"你已经从副产物中获得了一些金红石了对吧? 或者直接'工业高炉'了一些钛铁?\n\n使用金红石、氯和碳可以制成四氯化钛,以及一些一氧化碳.如果你想的话你可以电解一氧化碳回收碳粉。最好使用大型化学反应釜的完整配方来回收碳.\n\n使用HV电压的工业高炉将四氯化钛与镁结合煅烧,你就能获得热钛锭,以及氯化镁. 同样,你可以用钠将这些氯化镁处理后,回收所有的镁和氯.",items:[["gregtech:gt.metaitem.01", 12028, 16]]},
  {id:860,chap:"Tier3HV",chapcn:"第3阶-高压(HV)",chapi:6,name:"总算能炼钛了",pre:[81, 1012],desc:"金红石、氯和碳粉可制成四氯化钛. 把它与镁放入HV工业高炉,你将获得热钛锭.将其冷冻,你就能获得你的第一块钛锭了.\n\n如果你足够欧,在月球上还能找到钛铁矿石,稍稍简化制取钛的工序.",items:[["gregtech:gt.metaitem.01", 11028, 16]]}
 ];
 var ids={};list.forEach(function(q){ids[q.id]=1;});
 GD.quests=GD.quests.filter(function(q){return !ids[q.id];}).concat(list);
 Object.assign(GD.questRules.rules,{
  1011:{pre:[162],preLogic:"AND",taskLogic:"AND",groups:[{"type": "retrieval", "ignoreNBT": true, "requireOnlyOneItem": true, "items": [{"k": "gregtech:gt.metaitem.03@5822", "n": 32}, {"k": "gregtech:gt.metaitem.03@5918", "n": 48}, {"k": "gregtech:gt.metaitem.03@5019", "n": 32}]}]},
  1424:{pre:[162],preLogic:"AND",taskLogic:"AND",groups:[{"type": "retrieval", "ignoreNBT": true, "requireOnlyOneItem": true, "items": [{"k": "gregtech:gt.metaitem.03@5918", "n": 32}, {"k": "gregtech:gt.metaitem.03@5825", "n": 32}, {"k": "gregtech:gt.metaitem.03@5842", "n": 32}, {"k": "gregtech:gt.metaitem.03@5925", "n": 16}]}]},
  1012:{pre:[1424, 1011],preLogic:"AND",taskLogic:"AND",groups:[{"type": "retrieval", "ignoreNBT": true, "requireOnlyOneItem": true, "items": [{"k": "gregtech:gt.metaitem.01@12028", "n": 16}]}]},
  860:{pre:[81, 1012],preLogic:"AND",taskLogic:"AND",groups:[{"type": "retrieval", "ignoreNBT": true, "requireOnlyOneItem": true, "items": [{"k": "gregtech:gt.metaitem.01@11028", "n": 16}]}]}
 });
 // 目标:月球 排到高压章节末尾：原任务书前置是「HV阶段你最讨厌的另外2个物品」，
 // 描述里本来就写明 IV 电路板和 HV 组装机是这条线的前置，这里补上主机那条。
 var moon=GD.questRules.rules[162];
 if(moon&&moon.pre.indexOf(1225)<0)moon.pre=moon.pre.concat([1225]);
 var moonQuest=GD.quests.find(function(q){return q.id===162;});
 if(moonQuest&&moonQuest.pre.indexOf(1225)<0)moonQuest.pre=moonQuest.pre.concat([1225]);
})();
