(function(){
 'use strict';
 var id=910111, miner='gregtech:gt.blockmachines@679', voidMiner='gregtech:gt.blockmachines@26763';

 // 合成台把 LV 单方块采矿机（Basic Miner）换成 EX 虚空矿机 I
 if(!GD.craft.some(function(r){return r.out===voidMiner;}))GD.craft.push({out:voidMiner,n:1,slots:[[miner]],shapeless:true});

 if(GD.quests.some(function(q){return q.id===id;}))return;
 GD.quests.push({id:id,chap:'IdleEdition',chapcn:'Gregtorio 任务',chapi:100,name:'你的ass坐在工位就像矿机扎进地底',pre:[],
  desc:'为了你的屁股着想，Gregtorio 加入了 EX 虚空矿机。你可以将LV单方块采矿机直接在合成台转换成1级的EX虚空矿机，把他放在产线上吧，他可以拯救你的ass。另外，千万别忘了这个机器还有HV 和IV版本。',
  items:[['gregtech:gt.blockmachines',26763,1]]});
 GD.questRules.rules[id]={pre:[],preLogic:'AND',taskLogic:'AND',groups:[{type:'retrieval',ignoreNBT:true,items:[{k:voidMiner,n:1}]}]};
})();
