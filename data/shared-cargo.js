(function(){
 'use strict';
 var key=SHARED_CARGO.key,id=910120,pre=[770,1233];
 var circuits=(CONTENT.data.ore.circuitAdvanced||[]).map(function(i){return CONTENT.data.items[i].k;});
 CONTENT.registerRecipe({id:'idle:ender_cargo',map:'gt.recipe.assembler',eut:480,durationTicks:200,
  in:[{k:'gregtech:gt.blockmachines@13',n:2},{k:circuits[0],n:1,alternatives:circuits},
   {k:'minecraft:ender_eye@0',n:2},{k:'minecraft:chest@0',n:2},{k:'gregtech:gt.blockmachines@817',n:2}],
  out:[{k:key,n:2}]});
 GD.quests.push({id:id,chap:'IdleEdition',chapcn:'Gregtorio 任务',chapi:100,name:'我带来了全新的传送器，可惜不是传送你的',
  pre:pre,items:[['idle:ender_cargo',0,2]],
  desc:'着急登月吗？先拥有一个四维屁眼吧。在这里，末影箱子和末影储罐被合并并且下放到HV阶段了，整个游戏只有这一种跨维度传输物品和流体的方式（也可以不跨）。下面我将教你使用方法。\n首先，它的本质就是可以一个存储流体的末影箱子，通过自定义的频道名来连接，但是他只能存储最多一种流体。你可以把他摆进你在任意星球的产线，等你登了月，你就会发现没有它你甚至无法安心的喂饱给矿机供电的发电机。在确保你的矿机有源源不断的能源以后，你还需要确保它的排泄物能够源源不断的返回你的产线。这当然可以靠你自己辛苦搬运，但是如果这样，为什么不去玩真正的GTNH呢？因此你还需要一对跃迁货箱用来传送矿石或者你在月球深处发现的盐水（也许不需要）。我相信你一定能熟练使用它。'});
 GD.questRules.rules[id]={pre:pre,preLogic:'AND',taskLogic:'AND',groups:[{type:'retrieval',ignoreNBT:true,items:[{k:key,n:2}]}]};
 var nasa=GD.quests.find(function(q){return q.id===2744;});
 if(nasa)nasa.pre=nasa.pre.concat(id);
 var rule=GD.questRules.rules[2744];
 if(rule)rule.pre=rule.pre.concat(id);
})();
