(function(){
 'use strict';
 var id='idle:me_type_stocking_bus',key=id+'@0',name='ME类型过滤存储输入总线',questId=990302;
 CONTENT.registerItem({k:key,base:key,id:id,meta:0,name:name,maxStack:64});
 GD.catalog.push(key);
 GD.faceIcons[key]=GD.gridFaceIcons[key]='modicons/ae/type-stocking-bus.png';
 MULTIBLOCKS.registerPort(key,{type:'itemIn',tier:4,me:true,itemIn:true,stocking:true,stockingTypes:true});
 CONTENT.registerRecipe({id:id,map:'gt.recipe.assembler',eut:480,durationTicks:100,
  in:[{k:'gregtech:gt.blockmachines@2718',n:1},{k:'gregtech:gt.blockmachines@9254',n:1}],
  req:[{circuit:1}],out:[{k:key,n:1}]});

 var prerequisites=[1421];
 GD.quests.push({id:questId,chap:'IdleEdition',chapcn:'Gregtorio 任务',chapi:100,
  name:'假如你不会正则表达式…',pre:prerequisites,items:[[id,0,1]],
  desc:'我受够了矿典过滤卡了，我相信你也受够了。我将它集成在了存储输入总线上，你可以像刚开始做矿石处理使用的类型过滤器那样使用它，只需要选择你想要的物品类型，他就可以拉取所有那些类型的物品，和矿典过滤卡几乎一样。我相信你会喜欢它的。'});
 GD.questRules.rules[questId]={pre:prerequisites,preLogic:'AND',taskLogic:'AND',resolved:true,
  groups:[{type:'retrieval',ignoreNBT:true,items:[{k:key,n:1}]}]};
 var washer=GD.quests.find(function(q){return q.id===1422;});
 washer.pre=washer.pre.concat(questId);
 var washerRule=QUESTS.rule(washer);
 washerRule.pre=washerRule.pre.concat(questId);
})();
