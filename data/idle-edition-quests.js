(function(){
 var id=910110,ulv='gregtech:gt.blockmachines@9240',lv='gregtech:gt.blockmachines@9241';
 if(GD.quests.some(function(q){return q.id===id;}))return;
 GD.quests.push({id:id,chap:'IdleEdition',chapcn:'Gregtorio 任务',chapi:100,name:'给物品分个路',pre:[],desc:'物品过滤器能从混合物资中筛选出你需要的物品。制作一个超低压或低压物品过滤器，把它放在产线上。\n\n打开过滤器，拿着物品左键点击蓝色的“过滤样板”槽设置条件，右键清除。样板不消耗手里的物品。白名单模式下，九个样板槽与右侧九个缓存槽一一对应。\n\n白名单只接收样板中的物品；黑名单接收样板之外的物品。默认区分 NBT，打开“忽略 NBT”后，同种物品的不同 NBT 也能通过。\n\n用物品管道、传送带或漏斗把物品送入过滤器。点击方向按钮选择出口，其余三侧可输入。“自动输出”开启后，会把缓存物品送到出口旁的容器或已连接的物品管道，搬运不耗电。\n\n“每次输出数量”设为 0 时尽可能输出一组；设为 1～64 时，凑齐指定数量并且接收端放得下才会送出。“合并堆叠”会整理缓存中的同类物品。\n\n过滤器还可以暂存电量；打开“电力输出”后，从所选出口按自身电压向外供电。',items:[['gregtech:gt.blockmachines',9240,1],['gregtech:gt.blockmachines',9241,1]]});
 GD.questRules.rules[id]={pre:[],preLogic:'AND',taskLogic:'AND',groups:[{type:'retrieval',ignoreNBT:true,requireOnlyOneItem:true,items:[{k:ulv,n:1},{k:lv,n:1}]}]};
})();
