/* GT 类型过滤器：按矿物词缀（前缀）收物，9 个缓存槽 + 一个类型选择。
   类型候选由物品的真实词缀索引得出，选中即生效；不沿用原版逐个点击循环的方式。 */
(function(root){
 'use strict';
 var C=CONTENT,TX=GTTransactions,keys=[],tiers=['超低压','低压','中压','高压','超高压','强导压','剧差压','零点压','极限压','极高压'];
 var PREFIXES=[
  ['ore','矿石'],['rawOre','粗矿'],['crushed','碎矿'],['crushedPurified','洗净矿'],['crushedCentrifuged','离心矿'],
  ['dust','粉'],['dustImpure','含杂粉'],['dustPure','纯净粉'],['dustSmall','小撮粉'],['ingot','锭'],['nugget','粒'],
  ['plate','板'],['plateDouble','双重板'],['foil','箔'],['rod','杆'],['gem','宝石'],['lens','透镜'],['screw','螺丝'],
  ['bolt','螺栓'],['ring','环'],['spring','弹簧'],['gear','齿轮'],['wire','线'],['block','块'],['cell','单元']
 ];
 var prefixName={};PREFIXES.forEach(function(p){prefixName[p[0]]=p[1];});
 var byItem=null,byPrefix=null,shown=null,indexSteps=null;

 function canonical(k){return C.canonicalKey(k);}
 function material(name){return !!root.GD&&GD.materialInfo&&GD.materialInfo[name];}
 function* buildIndex(){
  var items=new Map(),prefixes=new Map(),ore=C.data.ore||{},count=0;
  for(var kc of Object.keys(ore)){
   if((++count&127)===0)yield;
   var hit=null;
   for(var p of PREFIXES){
    if(kc.startsWith(p[0])&&material(kc.slice(p[0].length))){hit=p[0];break;}
   }
   if(!hit)continue;
   var members=prefixes.get(hit);
   var list=ore[kc]||[];
   list.forEach(function(i){
    var entry=C.data.items[i];if(!entry)return;
    if(!members)prefixes.set(hit,members=new Set());
    var k=canonical(entry.k),set=items.get(k);
    if(!set){set=new Set();items.set(k,set);}
    set.add(hit);
    members.add(k);
   });
  }
  byItem=items;byPrefix=prefixes;
  shown=PREFIXES.filter(function(p){return byPrefix.has(p[0]);});
 }
 function advanceIndex(until){
  if(byItem)return;
  if(!indexSteps)indexSteps=buildIndex();
  do{
   if(indexSteps.next().done){indexSteps=null;return;}
  }while(performance.now()<until);
 }
 function index(){
  advanceIndex(Infinity);
  return byItem;
 }
 async function prepareIndex(pause){
  while(!byItem){
   await pause();
   advanceIndex(performance.now()+5);
  }
 }
 function prefixesOf(k){
  index();
  var key=canonical(k),set=byItem.get(key);
  if(!set&&/^gregtech:gt\.blockores@/.test(key))set=new Set(['ore']);
  return set||null;
 }
 function candidates(){index();return shown.map(function(p){return{id:p[0],name:p[1],count:(byPrefix.get(p[0])||new Set()).size,key:firstKey(p[0])};});}
 function firstKey(prefix){var set=byPrefix.get(prefix);if(!set)return null;var it=set.values().next();return it.done?null:it.value;}

 for(var tier=0;tier<=9;tier++){
  var k='gregtech:gt.blockmachines@'+(9250+tier),item=C.item(k);
  if(!item||!GD.items[k]||!CONTENT_SCOPE.allowed(k))continue;
  var cat='type_filter_'+tier,slots={in:9,out:0,fluid:0},name=tiers[tier]+'类型过滤器';keys.push(k);
  GD.extraMachineDefinitions.push({key:k,cat:cat,cn:name,entityName:name,tag:DEFS.tagOf(tier),tier:tier,volt:DEFS.voltOf(tier),behavior:'type_filter',orderFamily:'类型过滤器',recipeMap:'none:type_filter',slots:slots,preserveItemSlots:true,storage:true,fluidInputTanks:[],fluidOutputTanks:[],energyCapacity:0,startEnergy:0,amperage:0,energyRelay:false,minimumOutputEnergy:0,autoItems:false,autoFluids:false,hideFluidOutput:true,hideIOToggles:true,runSwitch:false,controlCircuit:false,resetOnDismantle:true,windowWidth:430});
  GD.machines.cats.push({id:cat,cn:name,slots:slots,tiers:[{t:tier,k:k,name:name,tag:DEFS.tagOf(tier)}]});
 }DEFS.rebuild();

 function supported(m){return!!m&&keys.indexOf(canonical(m.k))>=0;}
 function ensure(m){
  if(!supported(m))return null;
  if(!Array.isArray(m.ins))m.ins=[];while(m.ins.length<9)m.ins.push(null);
  if(!m.filterSettings||typeof m.filterSettings!=='object')m.filterSettings={};
  var s=m.filterSettings;
  // 多选类型；旧存档的单个 prefix 迁移过来
  if(!Array.isArray(s.prefixes)){
   s.prefixes=(s.prefix&&prefixName[s.prefix])?[s.prefix]:['ore'];
  }
  s.prefixes=s.prefixes.filter(function(p){return !!prefixName[p];});
  if(!s.prefixes.length)s.prefixes=['ore'];
  delete s.prefix;
  s.invert=!!s.invert;
  if(s.autoOutput==null)s.autoOutput=true;else s.autoOutput=!!s.autoOutput;
  m.emitEnergy=!!m.emitEnergy;m.autoItems=false;m.autoFluids=false;
  return s;
 }
 function matches(m,item){
  var s=ensure(m),set=item&&prefixesOf(item.k);
  var hit=!!(set&&s.prefixes.some(function(p){return set.has(p);}));
  return s.invert?!hit:hit;
 }
 function describe(m){var s=ensure(m);return(s.invert?'排除 ':'只要 ')+s.prefixes.map(function(p){return prefixName[p]||p;}).join('、');}

 TRANSPORT_PORTS.register({
  supports:function(c){var m=c.index[c.cell];return supported(m)?c.kind==='item':undefined;},
  resolve:function(c){
   var m=c.index[c.cell];if(!supported(m))return undefined;ensure(m);
   if(c.kind!=='item'||!TRANSPORT_PORTS.coverAllows(m,c.side,'item',c.direction))return null;
   if(c.direction==='export')return TRANSPORT_PORTS.itemHandler(m.ins,CORE.slotBox(m.ins),m,null);
   if(c.side===(m.outFace==null?1:m.outFace)||!c.payload)return null;
   return matches(m,c.payload)?TRANSPORT_PORTS.itemHandler(m.ins,CORE.slotBox(m.ins),m,null):null;
  }
 });

 function tick(f,tick){
  var boards=f.blueprints?BLUEPRINTS.networkViews(f):[f],N=ENGINE.networks,moved=0;
  boards.forEach(function(b){
   var list=(b.machines||[]).filter(function(m){return ENTITIES.isGrid(m)&&supported(m);});if(!list.length)return;
   var idx=N.grid(b),budgets=N.itemBudgets(b,tick);
   list.forEach(function(m){
    var s=ensure(m);if(!s.autoOutput)return;
    var side=m.outFace==null?1:m.outFace,cell=m.x+','+m.y,other=TRANSPORT_PORTS.near(cell,side);
    var from=N.port(b,idx,cell,side,'item','export');if(!from)return;
    for(var i=0;i<9;i++){
     var item=m.ins[i];if(!item)continue;
     var to=N.port(b,idx,other,(side+2)%4,'item','import',item);
     if(!to||to.route!=null&&!PIPE_CONNECTIONS.connected(b,'item',other,(side+2)%4,idx))continue;
     var count=N.sendItem(b,tick,idx,budgets,from,i,to,null);if(count){moved+=count;break;}
    }
   });
  });
  return moved;
 }

 ENGINE.registerBehavior('type_filter',{
  slotAccepts:function(){return true;},
  ensure:ensure,
  acceptsItem:function(m,k,options){return!!(options&&options.manual)||matches(m,{k:k,n:1});},
  tick:function(m){var s=ensure(m);m.status={code:'STORAGE',text:(s.invert?'阻挡：':'通过：')+s.prefixes.map(function(p){return prefixName[p]||p;}).join('、')};return false;}
 });

 root.TYPE_FILTERS={keys:keys,supported:supported,ensure:ensure,matches:matches,candidates:candidates,prefixesOf:prefixesOf,prepareIndex:prepareIndex,describe:describe,tick:tick,prefixName:prefixName};
})(typeof window!=='undefined'?window:globalThis);
