(function(root){
 'use strict';
 var specs=Object.create(null),hopper='minecraft:hopper@0';
 var rows=[['minecraft:chest@0',27],['minecraft:trapped_chest@0',27],['IronChest:BlockIronChest@0',54],['IronChest:BlockIronChest@1',81],['IronChest:BlockIronChest@2',108],['IronChest:BlockIronChest@3',45],['IronChest:BlockIronChest@4',72],['IronChest:BlockIronChest@5',108],['IronChest:BlockIronChest@6',108],['IronChest:BlockIronChest@7',1,'minecraft:dirt@0'],['IronChest:BlockIronChest@9',135],['dreamcraft:BabyChest@0',1],['ExtraUtilities:chestMini@0',1],['appliedenergistics2:tile.BlockSkyChest@0',36],['appliedenergistics2:tile.BlockSkyChest@1',36],['avaritiaddons:CompressedChest@0',243],[hopper,5]];
 rows.forEach(function(row){var k=row[0],item=CONTENT.item(k);if(!item||!GD.items[k]||!CONTENT_SCOPE.allowed(k))return;var name=GD.items[k],id='line_container_'+Object.keys(specs).length,slots={in:row[1],out:0,fluid:0};specs[k]={slots:row[1],only:row[2],hopper:k===hopper};
  GD.extraMachineDefinitions.push({key:k,cat:id,cn:name,entityName:name,tag:k===hopper?'漏斗':'箱子',tier:0,volt:0,behavior:'item_container',recipeMap:'none:storage',slots:slots,storage:true,preserveItemSlots:true,fluidInputTanks:[],fluidOutputTanks:[],energyCapacity:0,startEnergy:0,amperage:0,autoItems:false,autoFluids:false,noFaceSettings:true,supportsCovers:false,runSwitch:false,controlCircuit:false,resetOnDismantle:true,windowWidth:380});
  GD.machines.cats.push({id:id,cn:name,slots:slots,tiers:[{t:0,k:k,name:name,tag:k===hopper?'漏斗':'箱子'}]});
 });DEFS.rebuild();
 function spec(m){return m&&specs[CONTENT.canonicalKey(m.k)];}
 function accepts(m,k){var s=spec(m);return!!s&&(!s.only||CONTENT.canonicalKey(k)===s.only);}
 function ensure(m){var s=spec(m);if(!s)return;var arr=m.ins||(m.ins=[]);while(arr.length<s.slots)arr.push(null);m.autoItems=m.autoFluids=m.auto=false;m.hopperCooldown=Math.max(0,Math.min(8,Math.floor(m.hopperCooldown||0)));}
 function handle(m){ensure(m);return TRANSPORT_PORTS.itemHandler(m.ins,CORE.slotBox(m.ins),m,function(direction){if(spec(m).hopper&&direction==='import')m.hopperCooldown=8;});}
 TRANSPORT_PORTS.register({
  supports:function(c){var m=c.index[c.cell];return spec(m)?c.kind==='item':undefined;},
  resolve:function(c){var m=c.index[c.cell];if(!spec(m))return undefined;if(c.kind!=='item'||!TRANSPORT_PORTS.coverAllows(m,c.side,'item',c.direction)||c.direction==='import'&&(!c.payload||!accepts(m,c.payload.k)))return null;return handle(m);}
 });
 function transfer(N,b,idx,fromCell,fromSide,toCell,toSide,tick,budgets){
  var from=N.port(b,idx,fromCell,fromSide,'item','export');if(!from||!from.box)return 0;
  for(var i=0;i<from.box.arr.length;i++){var item=from.box.arr[i];if(!item)continue;var to=N.port(b,idx,toCell,toSide,'item','import',item);if(!to||to.route!=null&&!PIPE_CONNECTIONS.connected(b,'item',toCell,toSide,idx))continue;var n=N.sendItem(b,tick,idx,budgets,from,i,to,null,1);if(n)return n;}return 0;
 }
 function tick(f,tick){
  var boards=f.blueprints?BLUEPRINTS.networkViews(f):[f],N=ENGINE.networks,moved=0;
  boards.forEach(function(b){var list=(b.machines||[]).filter(function(m){return ENTITIES.isGrid(m)&&spec(m)&&spec(m).hopper;});if(!list.length)return;
   list.forEach(function(m){ensure(m);if(m.hopperCooldown>0)m.hopperCooldown--;});
   var ready=list.filter(function(m){return!m.hopperCooldown;});if(!ready.length)return;var idx=N.grid(b),budgets=N.itemBudgets(b,tick);
   ready.sort(function(a,b){return b.y-a.y||a.x-b.x;}).forEach(function(m){if(m.hopperCooldown)return;var cell=m.x+','+m.y,n=transfer(N,b,idx,cell,2,m.x+','+(m.y+1),0,tick,budgets);n+=transfer(N,b,idx,m.x+','+(m.y-1),2,cell,0,tick,budgets);if(n){m.hopperCooldown=8;moved+=n;}});
  });return moved;
 }
 ENGINE.registerBehavior('item_container',{
  slotAccepts:function(m,i,s){return LINE_STORAGE.accepts(m,s.k);},ensure:ensure,tick:function(m){m.status={code:'STORAGE',text:spec(m).hopper?'从上方取物，向下方送出':'储存物品'};return false;},acceptsItem:accepts});
 root.LINE_STORAGE={spec:spec,ensure:ensure,keys:Object.keys(specs),accepts:accepts,tick:tick};
})(typeof window!=='undefined'?window:globalThis);
