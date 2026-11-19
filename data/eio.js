(function(root){
 'use strict';
 var conduits=Object.create(null),filters=Object.create(null),speed='EnderIO:itemExtractSpeedUpgrade@';
 conduits['EnderIO:itemItemConduit@0']={kind:'eioItem',medium:'item',family:'eio'};
 [[2,200,800],[3,1000,4000],[4,2000,8000],[5,10000,40000],[6,20000,80000]].forEach(function(r){conduits['EnderIO:itemLiquidConduit@'+r[0]]={kind:'eioFluid',medium:'fluid',family:'eio',tier:r[0],extract:r[1],io:r[2]};});
 filters['EnderIO:itemBasicFilterUpgrade@0']={slots:5};
 var excluded=new Set(['EnderIO:itemBasicFilterUpgrade@1','EnderIO:itemBigFilterUpgrade@0','EnderIO:itemBigFilterUpgrade@1','EnderIO:itemLiquidConduit@0','EnderIO:itemLiquidConduit@1','EnderIO:itemItemConduit@1','EnderIO:itemLimitedItemFilter@0','EnderIO:itemExistingItemFilter@0','EnderIO:itemModItemFilter@0','EnderIO:itemPowerItemFilter@0','EnderIO:itemFunctionUpgrade@0']);
 var colors=[['黑色','#1e1b1b'],['红色','#b3312c'],['绿色','#3b511a'],['棕色','#51301a'],['蓝色','#253192'],['紫色','#7b2fbe'],['青色','#287697'],['淡灰色','#ababab'],['灰色','#434343'],['粉红色','#d88198'],['黄绿色','#41cd34'],['黄色','#dede2a'],['淡蓝色','#6689d3'],['品红色','#c354cd'],['橙色','#eb8844'],['白色','#f0f0f0']];
 root.EIO_CONTENT={spec:function(k){return conduits[CONTENT.canonicalKey(k)]||null;},filter:function(k){return filters[CONTENT.canonicalKey(k)]||null;},keys:Object.keys(conduits),filterKeys:Object.keys(filters),speedKey:speed,
  speed:function(k){return k===speed+'0'?'up':k===speed+'1'?'down':null;},colors:colors,excluded:excluded};
})(typeof window!=='undefined'?window:globalThis);
