/* Lab machines use normal item and fluid processing. Replicator selection reads its data orb. */
(function(root){
 'use strict';
 var key=MULTIBLOCK_CATALOG.key, C=CONTENT;
 var orbPolicy='elemental_data_orb', replicatorMap='gt.recipe.replicator';
 function element(id,damage,nbt){
  if(id!=='gregtech:gt.metaitem.01'||damage!==32707||!nbt)return null;
  var value=SNBT.tryParse(nbt);
  return value&&value.mDataTitle==='Elemental-Scan'&&value.mDataName||null;
 }
 function encoded(stack){
  var item=stack&&C.item(stack.k);
  return item&&element(item.id,item.meta,item.nbt);
 }
 function recipeElement(r){
  var item=r.extra&&r.extra.specialItems;
  return item&&element(item.id,item.damage,item.nbt);
 }
 var byElement=new Map();
 C.recipes(replicatorMap).forEach(function(r){
  var e=recipeElement(r);if(!e)return;
  var rows=byElement.get(e)||[];rows.push(r);byElement.set(e,rows);
 });
 var blankOrb='gregtech:gt.metaitem.01@32707', scanMap='gt.recipe.scanner';
 var encodedOrbs=new Map();
 C.data.items.forEach(function(item){
  var e=element(item.id,item.meta,item.nbt);if(e&&!encodedOrbs.has(e))encodedOrbs.set(e,item.k);
 });
 var cellsByFluid=new Map();
 C.data.containers.forEach(function(row){
  var item=C.data.items[row[1]],fluid=C.canonicalFluid(C.data.fluids[row[2]].id);
  if(row[3]===1000&&item&&/cell/i.test(item.en||item.name||'')&&!cellsByFluid.has(fluid))cellsByFluid.set(fluid,item.k);
 });
 byElement.forEach(function(rows,e){
  var r=rows[0],mass=GD.scannerElementMass[e],out=encodedOrbs.get(e);
  var sample=r.out[0]&&r.out[0].k||r.fout[0]&&cellsByFluid.get(r.fout[0].f);
  if(!mass||!out||!sample)return;
  C.registerRecipe({id:'native:element_scan:'+e,map:scanMap,nbtSensitive:true,eut:30,
   durationTicks:mass*8192,in:[{k:sample,n:1},{k:blankOrb,n:1}],out:[{k:out,n:1}]});
 });
 DEFS.list().filter(function(d){return d.recipeMap===scanMap&&d.slots.in<2;}).forEach(function(d){
  GD.extraMachineDefinitions.push(Object.assign({},d,{slots:Object.assign({},d.slots,{in:2})}));
 });
 MECHANISMS.registerInstancePolicy(orbPolicy,{prepare:function(s){
  return encoded(s)?{ok:true,item:s}:{ok:false,code:'ITEM',text:'需要已写入元素数据的数据球'};
 }});
 function selected(m){return encoded(m.installedItems&&m.installedItems.elementOrb);}
 var orb={
  recipeCandidates:function(m){return byElement.get(selected(m))||[];},
  recipeCheck:function(m,r){
   return selected(m)!==recipeElement(r)?{ok:false,code:'RESEARCH',text:'需要对应元素的数据球'}:null;
  },
  instanceSlots:{elementOrb:{ids:['gregtech:gt.metaitem.01'],policy:orbPolicy,label:'元素数据球'}}
 };
 function family(id,map,metas,start,slots,rules){
  var label=GD.items[key(metas[0])];
  var category={id:id,cn:label,slots:slots,tiers:[]};
  metas.forEach(function(meta,i){
   var k=key(meta),tier=start+i,volt=DEFS.voltOf(tier),tank=8000*Math.pow(2,tier),cn=GD.items[k];
   GD.extraMachineDefinitions.push(Object.assign({
    key:k,cat:id,cn:cn,tag:DEFS.tagOf(tier),recipeMap:map,tier:tier,volt:volt,
    slots:{in:slots.in,out:slots.out,fluid:tank},fluidInputTanks:[tank],fluidOutputTanks:[],
    behavior:'batch_processor',energyCapacity:volt*64,startEnergy:volt,controlCircuit:false,autoItems:true
   },rules));
   category.tiers.push({t:tier,k:k,name:cn,tag:DEFS.tagOf(tier)});
  });
  GD.machines.cats.push(category);C.alias(id,map);
 }
 family('biolab','bw.recipe.biolab',[12699,12700,12701,12702],3,{in:6,out:2,fluid:1},{});
 family('replicator',replicatorMap,[481,482,483,484,485,11000],1,{in:0,out:1,fluid:1},orb);
 var intakePeriod=20, intakeByKey=new Map();
 function intakeFluid(m){return ENTITIES.dimension(m)==='nether'?'netherair':'air';}
 var intakeCategory={id:'airIntake',cn:GD.items[key(861)],slots:{in:0,out:0,fluid:128000},tiers:[]};
 [
  {meta:861,tier:5,perCycle:5000,capacity:128000},
  {meta:31070,tier:7,perCycle:40000,capacity:256000},
  {meta:32765,tier:9,perCycle:2000000000,capacity:2000000000}
 ].forEach(function(intake){
  var k=key(intake.meta),cn=GD.items[k],tag=DEFS.tagOf(intake.tier);
  intakeByKey.set(k,intake);
  GD.extraMachineDefinitions.push({
   key:k,cn:cn,cat:intakeCategory.id,recipeMap:'none:airIntake',behavior:'air_intake',
   tier:intake.tier,tag:tag,volt:0,energyCapacity:0,startEnergy:0,amperage:0,controlCircuit:false,
   slots:{in:0,out:0,fluid:intake.capacity},fluidInputTanks:[],fluidOutputTanks:[intake.capacity],
   intakePerCycle:intake.perCycle,autoFluids:true,defaultAutoFluids:true,uiPanels:['air_intake']
  });
  MULTIBLOCKS.registerPort(k,{type:'fluidIn',tier:intake.tier,fluidIn:true,externalFluidIn:false,capacity:intake.capacity});
  intakeCategory.tiers.push({t:intake.tier,k:k,name:cn,tag:tag});
 });
 GD.machines.cats.push(intakeCategory);
 function collectGas(tanks,fluid,capacity,perCycle){
  var tank=tanks[0];
  if(tank&&tank.f!==fluid)return 'MIXED';
  var stored=tank?tank.mb:0,amount=Math.min(perCycle,capacity-stored);
  if(amount<=0)return 'FULL';
  tanks[0]={f:fluid,mb:stored+amount};
  return 'COLLECTED';
 }
 ENGINE.registerBehavior('air_intake',{
  tick:function(m,ctx){
   if(ctx.tick%intakePeriod!==0)return false;
   var fluid=intakeFluid(m),d=ctx.definition,result=collectGas(m.tanksOut,fluid,d.fluidOutputTanks[0],d.intakePerCycle);
   if(result!=='COLLECTED'){m.status={code:'FLUID_OUTPUT',text:result==='MIXED'?'请先排出原有气体':'气体缓存已满'};return false;}
   m.status={code:'RUNNING',text:'采集 '+FLUID_PRESENTATION.name(fluid)};return true;
  }
 });
 SIMULATION.registerAfterMachines('air_intake_ports',function(S,tick){
  if(tick%intakePeriod!==0)return false;
  var changed=false;
  S.fx.machines.forEach(function(m){
   if(!ENTITIES.isGrid(m)||!MULTIBLOCKS.live(m))return;
   MULTIBLOCKS.ports(m).forEach(function(p){
    var intake=intakeByKey.get(p.k);
    if(intake&&collectGas(p.tanks,intakeFluid(m),intake.capacity,intake.perCycle)==='COLLECTED')changed=true;
   });
  });
  return changed;
 });
 RESOURCE_UI.registerPanel('air_intake',function(host,m){
  var line=document.createElement('p');
  line.textContent=DIMENSIONS.name(ENTITIES.dimension(m))+' · '+FLUID_PRESENTATION.name(intakeFluid(m));
  host.append(line);
 });
 DEFS.rebuild();
})(typeof window!=='undefined'?window:globalThis);
