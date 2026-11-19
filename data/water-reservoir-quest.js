/* GTNH 原任务 954「解决'用水问题'」：前置是 HV 泵任务，成品是蓄水库。 */
(function(){
 'use strict';
 var ID=910160;
 if((GD.quests||[]).some(function(q){return q.id===ID;}))return;
 var KEY='EnderIO:blockReservoir@0';
 GD.quests.push({
  id:ID, chap:'MultiblockGoals', chapcn:'多方块目标', chapi:22,
  name:'解决“用水问题”', pre:[1231],
  desc:'进入高压时代后，你找到了一种解决水资源的方法。制造一些石英玻璃、HV泵和坩埚。',
  items:[['EnderIO:blockReservoir',0,4]]
 });
 if(GD.questRules&&GD.questRules.rules){
  GD.questRules.rules[ID]={
   pre:[1231], preLogic:'AND', taskLogic:'AND',
   groups:[
    {type:'optional_retrieval',optional:true,ignoreNBT:true,items:[{k:'EnderIO:blockFusedQuartz@0',n:12}]},
    {type:'optional_retrieval',optional:true,ignoreNBT:true,items:[{k:'gregtech:gt.metaitem.01@32612',n:4}]},
    {type:'optional_retrieval',optional:true,ignoreNBT:true,items:[{k:'minecraft:cauldron@0',n:2}]},
    {type:'retrieval',ignoreNBT:true,items:[{k:KEY,n:4}]}
   ]
  };
 }
})();
