(function(){
 'use strict';
 var chapter='EnderIO',rows=[
  {id:910401,name:'脉冲铁',pre:[1598,750],key:'gregtech:gt.metaitem.01@11378',count:3,
   desc:'脉冲铁是物品导管的基础材料。把铁粉、末影珍珠粉和红石合金粉混合成脉冲铁粉，再送入工业高炉冶炼。\n\n准备好脉冲铁板、小型琥珀金物品管道和熔融塑料，就可以在中压组装机中制作物品导管。'},
  {id:910402,name:'物品导管',pre:[910401],key:'EnderIO:itemItemConduit@0',count:8,
   desc:'导管将多种传输方式集成在一起，每一种都有一些特点。\n\n把物品导管放在容器之间，打开导管设置，点击上、下、左、右选择要设置的接口。来源容器一侧打开“提取”，目标容器一侧打开“加入”。两端颜色相同才会传输；同一条管线上可以设置多个颜色通道。\n\n每个方向独立设置。接收端的优先级越高，越先收到物品。物品导管与流体导管可以放在同一格，也可以与GT导线同格。EIO导管与GT物品、流体管道分别布线。\n\n点击画布上的导管，用方向按钮或键盘方向键调整连接。关闭连接会保留已安装的过滤器、升级和标记。'},
  {id:910403,name:'基础物品过滤器',pre:[910402],key:'EnderIO:itemBasicFilterUpgrade@0',count:1,
   desc:'导管本身非常有用，但你可以让它们变得更好。通过过滤器，可以更好地控制它们传输的物品。\n\n把基础物品过滤器放进“加入”或“提取”下方的过滤器槽。拿着物品点击五个标记槽之一，右键清除标记。标记不消耗手里的物品。\n\n白名单只允许标记的物品通过，黑名单排除标记的物品。加入侧与提取侧分别设置。'},
  {id:910404,name:'物品导管速度升级',pre:[910403],key:'EnderIO:itemExtractSpeedUpgrade@0',count:1,
   desc:'通过速度升级，可以提高物品导管提取物品的速度。\n\n把升级放进来源容器一侧“提取”下方的速度升级槽，每个接口最多安装15个。Shift点击物品栏中的升级可以快速安装。'},
  {id:910405,name:'物品导管速度降级',pre:[910404],key:'EnderIO:itemExtractSpeedUpgrade@1',count:1,
   desc:'需要缓慢供料时，可以用速度降级代替速度升级。把它放进提取侧的速度升级槽，导管每次只提取一个物品。\n\n速度升级和速度降级共用一个槽位，取下后可以更换。'},
  {id:910406,name:'充能合金',pre:[910401],key:'gregtech:gt.metaitem.01@11366',count:3,
   desc:'充能合金是通向脉冲合金的下一步。\n\n把导电铁粉、金粉和黑钢粉混合成充能合金粉，再送入工业高炉冶炼。'},
  {id:910407,name:'脉冲合金',pre:[910406,81],key:'gregtech:gt.metaitem.01@11367',count:3,
   desc:'把充能合金粉、末影之眼粉和铬粉混合成脉冲合金粉。工业高炉产出的热脉冲合金锭需要在真空冷冻机中冷却。\n\n脉冲合金板将用于制作末影流体导管。'},
  {id:910408,name:'末影流体导管',pre:[910402,910407,1814,160],key:'EnderIO:itemLiquidConduit@2',count:8,
   desc:'末影流体导管可以在同一条管线中运输多种流体。它由微型聚四氟乙烯流体管道、脉冲合金板与熔融塑料组装而成，需要高压组装能力。\n\n在来源容器一侧开启“提取”，接收端开启“加入”，并为两端选择相同颜色。每个方向都可以分别设置颜色和流体过滤。\n\n拿着装有流体的容器点击标记槽，指定允许通过的流体；右键清除。关闭接口后，过滤标记仍会保留。'},
  {id:910409,name:'晶化合金末影流体导管',pre:[910408,176],key:'EnderIO:itemLiquidConduit@3',count:8,
   desc:'晶化合金末影流体导管提高了流体运输速度，需要晶化合金板、聚四氟乙烯流体管道和熔融环氧树脂。\n\n连接整条管线时使用同一级别的流体导管。'},
  {id:910410,name:'晶化粉红史莱姆末影流体导管',pre:[910409],key:'EnderIO:itemLiquidConduit@4',count:8,
   desc:'用晶化粉红史莱姆板进一步提升流体运输速度。组装还需要聚四氟乙烯流体管道和熔融聚四氟乙烯。'},
  {id:910411,name:'旋律合金末影流体导管',pre:[910410,213],key:'EnderIO:itemLiquidConduit@5',count:8,
   desc:'旋律合金末影流体导管用于更大的流体吞吐量。它需要旋律合金板、聚苯并咪唑流体管道和熔融聚四氟乙烯，在IV组装能力下制作。'},
  {id:910412,name:'恒星合金末影流体导管',pre:[910411,1493],key:'EnderIO:itemLiquidConduit@6',count:8,
   desc:'恒星合金末影流体导管拥有更高的流量。用恒星合金板、聚苯并咪唑流体管道和熔融聚苯并咪唑组装，需要LuV组装能力。'}
 ];
 rows.forEach(function(row){
  if(GD.quests.some(function(q){return q.id===row.id;}))throw Error('Duplicate Ender IO quest: '+row.id);
  var item=CONTENT.item(row.key);
  if(!item||!CONTENT_SCOPE.allowed(row.key))throw Error('Invalid Ender IO quest item: '+row.key);
  GD.quests.push({id:row.id,chap:chapter,chapcn:'Ender IO',chapi:29,name:row.name,pre:row.pre.slice(),desc:row.desc,items:[[item.id,item.meta,row.count]]});
  GD.questRules.rules[row.id]={pre:row.pre.slice(),preLogic:'AND',taskLogic:'AND',groups:[{type:'retrieval',ignoreNBT:true,items:[{k:row.key,n:row.count}]}]};
 });
})();
