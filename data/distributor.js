(function(root){
 'use strict';
 var controller='idle:distributor@0',casing='gregtech:gt.blockcasings2@0';
 function item(k,name){CONTENT.registerItem({k:k,base:k,id:k.split('@')[0],meta:Number(k.split('@')[1]),name:name,maxStack:64});if(!GD.catalog.includes(k))GD.catalog.push(k);}
 item(controller,'分料器');
 var definition={key:controller,cat:'ordered_distributor',cn:'分料器',tag:'多方块物流',behavior:'ordered_distributor',structureProfile:'ordered_distributor',multiblock:true,requiresStructure:true,compactMultiblock:true,windowWidth:660,energyCapacity:0,startEnergy:0,volt:0,tier:0,amperage:0,slots:{in:0,out:0},fluidInputTanks:[],fluidOutputTanks:[],controlCircuit:false,controllerCircuit:false,inputIsolationFixed:false,supportsCovers:false,supportsVoidProtection:false,logisticsDevice:true};
 GD.extraMachineDefinitions.push(definition);DEFS.register(definition);
 var faces=GD.faceIcons||(GD.faceIcons={}),grid=GD.gridFaceIcons||(GD.gridFaceIcons={});
 faces[controller]=grid[controller]='modicons/distributor/controller.svg';
 for(var t=0;t<=9;t++){
  var key='idle:output_assembly@'+t,bus=MULTIBLOCKS.spec('gregtech:gt.blockmachines@'+(80+t)),tank=MULTIBLOCKS.spec('gregtech:gt.blockmachines@'+(60+t));
  item(key,'输出总成('+DEFS.tagOf(t)+')');faces[key]=grid[key]='modicons/distributor/output-'+t+'.svg';
  MULTIBLOCKS.registerPort(key,{type:'outputAssembly',hatchRoles:['itemOut','fluidOut'],itemOut:true,fluidOut:true,slots:bus.slots,capacity:tank.capacity,tier:t,voltage:bus.voltage});
  CONTENT.registerRecipe({id:'idle:output-assembly:'+t,map:'gt.recipe.assembler',in:[{k:bus.k,n:1},{k:tank.k,n:1}],out:[{k:key,n:1}],durationTicks:100,eut:30});
 }
 CONTENT.registerRecipe({id:'idle:distributor',map:'gt.recipe.assembler',in:[{k:'gregtech:gt.blockmachines@14',n:1},{k:'gregtech:gt.metaitem.01@32633',n:2},{k:'gregtech:gt.metaitem.01@32613',n:1},{k:'appliedenergistics2:item.ItemMultiMaterial@24',n:2}],out:[{k:controller,n:1}],durationTicks:400,eut:1920});
 GD.quests.push({id:990301,chap:'IdleEdition',chapcn:'Gregtorio 任务',chapi:100,name:'按顺序分料',pre:[],desc:'制作分料器，放在产线上。0号控制器位于长条的一端，放置时选择1至16个分料位置。\n\n在分料器浮窗选择接料面，把ME二合一接口紧贴这一面，将加工样板放入接口。从控制器一端开始，已装好的物品出口和流体出口各自排序，按样板的输入顺序出料，空段跳过。输出总成同时作为物品和流体出口。同一种原料写在不同位置时，各处的数量分别保留。\n\n用管道把各处输出接到装配线。样板扩写后，每处用量随之增加，位置不变。接料后，这批物料的出口就定了；拆下仓室后，剩余物料等原位补上仓室再发。分料器不耗电，关闭开关后保留尚未发出的物料。\n\n虚拟编号电路、模具和透镜不参与分料。',items:[['idle:distributor',0,1]]});
 root.DISTRIBUTOR_CONTENT={key:controller,casing:casing,maxPositions:16};
})(typeof window!=='undefined'?window:globalThis);
