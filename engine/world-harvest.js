/* Natural exposed obsidian, using the running pack's actual harvest requirement. */
(function(root){
 'use strict';
 var key='minecraft:obsidian@0',properties=NATIVE_RULES.properties(key),level=properties&&properties.blockHarvestLevel;
 if(!Number.isSafeInteger(level))throw Error('Missing native obsidian harvest level');
 var source={id:'mine_obsidian',name:'开采黑曜石',dim:'overworld',scene:'岩壁洞穴',icon:key,breakBlock:key,time:WORK_TIME.breakTicks(key,null)/20,
  out:[[key,1]],toolTypes:['pick'],requiredHarvestLevel:level,effortTimeIsIdleDesign:false,
  outputDescription:'熔岩池边缘的天然黑曜石 ×1',
  requirementDescription:function(S){return '需要挖掘等级 '+level+' 的镐'+(MINING.findPick(S,level)?'，工具可用':'，当前工具不足');},
  check:function(S){return MINING.findPick(S,level)?{ok:true}:{ok:false,code:'HARVEST_LEVEL'};}};
 GD.sources.push(source);ACTIVITIES.register(source);
 [
  {id:'mine_end_stone',name:'挖末地石',dim:'end',key:'minecraft:end_stone@0'},
  {id:'mine_aurora_brick',name:'挖极光方块(beta)',dim:'twilight',key:'TwilightForest:tile.TFAuroraBrick@0'}
 ].forEach(function(block){
  var action={id:block.id,name:block.name,dim:block.dim,icon:block.key,breakBlock:block.key,
   time:WORK_TIME.breakTicks(block.key,null)/20,out:[[block.key,1]],conditions:{tool:'pick'},toolTypes:['pick']};
  GD.sources.push(action);ACTIVITIES.register(action);
 });
 root.WORLD_HARVEST={obsidian:source};
})(typeof window!=='undefined'?window:globalThis);
