(function () {
  'use strict';
  const tasks=[
    [990930,'第一块苗圃','做出作物架，打开农业页，选一块地放入作物架。小麦、胡萝卜和马铃薯选择耕地，树苗选择泥土。种植土和底土可以在地块详情里切换。',[],[['cropsnh:cropSticks',0,4]]],
    [990931,'给作物鉴定','相邻作物长到八成后，可以在它们之间的地块叠上两层作物架。丛林树盆栽和甘蔗可以育出黏性甘蔗，记得给中间的地块铺泥土或沙子。用植物透镜鉴定三项属性。',[990930],[['cropsnh:plantLens',0,1]]],
    [990932,'复制种子','给种子生成机放一颗种子和富集肥料。种子的生长、产量、抗性每一点需要 36 mB 富集肥料。原来的种子留在输入槽。',[990930],[['gregtech:gt.blockmachines',28013,1]]],
    [990933,'把苗圃接进产线','在产线摆放工业农场。给输入总线提供同一种种子，给输入仓通水，接上电，产物会进入输出总线。种植需要底土的作物时，在机器窗口选择底土。',[990932],[['gregtech:gt.blockmachines',28055,1],['cropsnh:cropsnh.seedBed',0,3]]],
    [990934,'有人照看苗圃','在主世界产线摆放作物管理机，打开机器并选择管理主世界苗圃。通电后会把成熟的产物收到机器里，也可以供水、施肥和除草。',[990930],[['gregtech:gt.blockmachines',28001,1]]],
    [990935,'把作物写进数据球','给作物基因提取器放入种子和空白数据球。编号电路 1 到 4 依次提取品种、生长、产量、抗性。把四种数据球和 UU 物质一起送入作物合成器，合成带有这四项属性的种子。数据球可以重复使用。',[990932],[['gregtech:gt.blockmachines',28037,1],['gregtech:gt.blockmachines',28046,1]]],
    [990936,'给工业农场加一层','每层苗床可以安装一个同级的升级单元。生长加速单元提高生长速度，施肥单元需要富集肥料，高级收获单元提高产量。环境强化单元读取输入总线上的环境模块。超频生长加速单元从 ZPM 开始使用。',[990933],[['cropsnh:cropsnh.growthAccelerationUnit',2,1]]]
  ];
  for(const [id,name,desc,pre,items] of tasks) {
    GD.quests.push({id,chap:'IdleEdition',chapcn:'Gregtorio 任务',chapi:100,name,desc,pre,items});
    GD.questRules.rules[id]={pre,preLogic:'AND',taskLogic:'AND',groups:[
      {type:'retrieval',ignoreNBT:true,items:items.map(([key,meta,n])=>({k:key+'@'+meta,n}))}
    ]};
  }
})();
