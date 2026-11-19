(function(root){
 'use strict';
 var keys=[],C=CONTENT,TX=GTTransactions,labels=['超低压','低压','中压','高压','超高压','强导压','剧差压','零点压','极限压','极高压'];
 for(var tier=0;tier<=9;tier++){
  var k='gregtech:gt.blockmachines@'+(9240+tier),item=C.item(k);
  if(!item||!GD.items[k]||!CONTENT_SCOPE.allowed(k))continue;
  var cat='item_filter_'+tier,slots={in:9,out:0,fluid:0},name=labels[tier]+'物品过滤器';keys.push(k);
  GD.extraMachineDefinitions.push({key:k,cat:cat,cn:name,entityName:name,tag:DEFS.tagOf(tier),tier:tier,volt:DEFS.voltOf(tier),behavior:'item_filter',orderFamily:'物品过滤器',recipeMap:'none:item_filter',slots:slots,preserveItemSlots:true,storage:true,fluidInputTanks:[],fluidOutputTanks:[],energyCapacity:512+DEFS.voltOf(tier)*50,startEnergy:0,amperage:2,energyRelay:true,minimumOutputEnergy:512,autoItems:false,autoFluids:false,hideFluidOutput:true,hideIOToggles:true,runSwitch:false,controlCircuit:false,resetOnDismantle:true,windowWidth:430});
  GD.machines.cats.push({id:cat,cn:name,slots:slots,tiers:[{t:tier,k:k,name:name,tag:DEFS.tagOf(tier)}]});
 }DEFS.rebuild();
 function supported(m){return!!m&&keys.includes(C.canonicalKey(m.k));}
 function integer(value,max){return Number.isSafeInteger(value)?Math.max(0,Math.min(max,value)):0;}
 function ensure(m){if(!supported(m))return null;
  if(!Array.isArray(m.ins))m.ins=[];while(m.ins.length<9)m.ins.push(null);
  if(!m.filterSettings||typeof m.filterSettings!=='object')m.filterSettings={};var s=m.filterSettings;
  if(!Array.isArray(s.samples))s.samples=Array(9).fill(null);while(s.samples.length<9)s.samples.push(null);
  s.invert=!!s.invert;s.ignoreNBT=!!s.ignoreNBT;s.sort=!!s.sort;s.stackSize=integer(s.stackSize,64);
  if(s.autoOutput==null)s.autoOutput=true;else s.autoOutput=!!s.autoOutput;
  m.emitEnergy=!!m.emitEnergy;m.autoItems=false;m.autoFluids=false;return s;
 }
 function stable(value){if(!value||typeof value!=='object')return value;if(Array.isArray(value))return value.map(stable);var out={};Object.keys(value).sort().forEach(function(k){out[k]=stable(value[k]);});return out;}
 function identity(s){var item=s&&C.item(s.k);if(!item)return null;var nbt=item.nbt&&SNBT.tryParse(item.nbt)||null;
  if(s.tinker){nbt=TX.clone(nbt)||{};nbt.InfiTool=TX.clone(s.tinker);}
  if(s.electricCharge!=null){nbt=TX.clone(nbt)||{};nbt['GT.ItemCharge']=String(s.electricCharge);}
  else if(nbt&&nbt['GT.ItemCharge']!=null){nbt=TX.clone(nbt);nbt['GT.ItemCharge']=String(nbt['GT.ItemCharge']);}
  return{id:item.id,meta:s.equipmentDamage==null?item.meta:s.equipmentDamage,nbt:stable(nbt)};
 }
 function matches(sample,item,ignoreNBT){if(!sample)return false;var a=sample.identity,b=identity(item);return!!a&&!!b&&a.id===b.id&&(a.meta===b.meta||a.meta===32767||b.meta===32767)&&(ignoreNBT||JSON.stringify(a.nbt)===JSON.stringify(b.nbt));}
 function setSample(m,index,item){var s=ensure(m);if(!s||!Number.isInteger(index)||index<0||index>=9)return false;var id=item&&identity(item);if(item&&!id)return false;s.samples[index]=item?{k:C.canonicalKey(item.k),identity:id}:null;return true;}
 function acceptsAt(m,item,index){var s=ensure(m);if(!s||!item||index<0||index>=9)return false;return s.invert?!s.samples.some(function(p){return matches(p,item,s.ignoreNBT);}):matches(s.samples[index],item,s.ignoreNBT);}
 function handle(m,indices){var selected=indices&&CORE.slotBox(indices.map(function(i){return m.ins[i]||null;}));return TRANSPORT_PORTS.itemHandler(m.ins,selected||CORE.slotBox(m.ins),m,selected?function(){indices.forEach(function(i,n){m.ins[i]=selected.arr[n];});}:null,indices);}
 TRANSPORT_PORTS.register({
  supports:function(c){var m=c.index[c.cell];return supported(m)?c.kind==='item':undefined;},
  resolve:function(c){var m=c.index[c.cell];if(!supported(m))return undefined;ensure(m);
   if(c.kind!=='item'||!TRANSPORT_PORTS.coverAllows(m,c.side,'item',c.direction))return null;
   if(c.direction==='export')return handle(m);
   if(c.side===(m.outFace==null?1:m.outFace)||!c.payload)return null;
   var indices=[];for(var i=0;i<9;i++)if(acceptsAt(m,c.payload,i))indices.push(i);return indices.length?handle(m,indices):null;
  }
 });
 function sort(m){var before=JSON.stringify(m.ins),order={};m.ins.forEach(function(item,i){if(item&&order[C.canonicalKey(item.k)]==null)order[C.canonicalKey(item.k)]=i;});CORE.organize(m.ins,function(a,b){return order[C.canonicalKey(a)]-order[C.canonicalKey(b)];});return before!==JSON.stringify(m.ins);}
 function tick(f,tick){var boards=f.blueprints?BLUEPRINTS.networkViews(f):[f],N=ENGINE.networks,moved=0;
  boards.forEach(function(b){var list=(b.machines||[]).filter(function(m){return ENTITIES.isGrid(m)&&supported(m);});if(!list.length)return;var idx=N.grid(b),budgets=N.itemBudgets(b,tick);
   list.forEach(function(m){var s=ensure(m);if(s.sort&&sort(m))moved++;if(!s.autoOutput)return;var side=m.outFace==null?1:m.outFace,cell=m.x+','+m.y,other=TRANSPORT_PORTS.near(cell,side),from=N.port(b,idx,cell,side,'item','export');if(!from)return;
    for(var i=0;i<9;i++){var item=m.ins[i];if(!item)continue;var to=N.port(b,idx,other,(side+2)%4,'item','import',item);if(!to||to.route!=null&&!PIPE_CONNECTIONS.connected(b,'item',other,(side+2)%4,idx))continue;
     var n=s.stackSize;if(n&&(n>CORE.maxStack(item.k)||(item.n==null?1:item.n)<n))continue;
     var count=N.sendItem(b,tick,idx,budgets,from,i,to,null,n||undefined,n||undefined);if(count){moved+=count;break;}
    }
   });
  });return moved;
 }
 ENGINE.registerBehavior('item_filter',{
  slotAccepts:function(){return true;},ensure:ensure,acceptsItem:function(m,k,options){return!!(options&&options.manual)||ensure(m).samples.some(function(_,i){return acceptsAt(m,{k:k,n:1},i);});},tick:function(m){var s=ensure(m);m.status={code:'STORAGE',text:s.invert?'按黑名单过滤物品':'按白名单过滤物品'};return false;}});
 root.ITEM_FILTERS={keys:keys,supported:supported,ensure:ensure,identity:identity,matches:matches,setSample:setSample,acceptsAt:acceptsAt,tick:tick};
})(typeof window!=='undefined'?window:globalThis);
