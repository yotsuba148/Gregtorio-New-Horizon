(function(root){
 'use strict';
 function Generators(content,definitions){this.content=content;this.definitions=definitions;this.indices={};}
 Generators.prototype.fuels=function(def){
  var family=def.fuelMap||(def.fuelFamily==='steam'?'family:steam':null);
  if(!family)return{items:{},fluids:{},containers:{}};
  if(this.indices[family])return this.indices[family];
  var idx={items:{},fluids:{},containers:{}},c=this.content;
  var containers=c.data.containers.map(function(row){return{empty:c.canonicalKey(c.data.items[row[0]].k),filled:c.canonicalKey(c.data.items[row[1]].k),f:c.canonicalFluid(c.data.fluids[row[2]].id),mb:row[3]};});
  if(def.fuelMap)c.recipes(def.fuelMap).forEach(function(r){
   var value=r.extra.special||r.extra.metadata&&r.extra.metadata.fuel_value||0;
   r.fin.forEach(function(p){idx.fluids[p.f]=value;});
   r.in.forEach(function(p){
    idx.items[p.k]={value:value,outputs:r.out};
    var container=containers.find(function(t){return t.filled===p.k;});
    if(container)idx.fluids[container.f]=value;
   });
  });
  containers.forEach(function(p){if(idx.fluids[p.f]||def.fuelFamily==='steam'&&/^(steam|ic2steam)$/.test(p.f))idx.containers[p.filled]=p;});
  this.indices[family]=idx;return idx;
 };
 Generators.prototype.accepts=function(m,key){
  var def=this.definitions.of(m.k);if(!def||!def.generator)return false;
  key=this.content.canonicalKey(key);
  var idx=this.fuels(def);if(idx.items[key])return true;
  var item=this.content.data.containers.find(function(r){return this.content.canonicalKey(this.content.data.items[r[1]].k)===key;},this);
  return !!item&&(def.fuelFamily==='steam'?/^(steam|ic2steam)$/.test(this.content.canonicalFluid(this.content.data.fluids[item[2]].id)):!!idx.fluids[this.content.canonicalFluid(this.content.data.fluids[item[2]].id)]);
 };
 Generators.prototype.tick=function(m,tick){
  var def=this.definitions.of(m.k);if(!def||!def.generator)return false;
  if(!def.multiblock)m.enabled=true;else if(m.enabled===false)return false;
  var cap=def.energyCapacity,idx=this.fuels(def),made=0,blocked=null,changed=false;
  var state=root.ENGINE&&root.ENGINE.state;
  var input=m.ins[0],pair=input&&!input.entityUid&&idx.containers[this.content.canonicalKey(input.k)];
  // MTEBasicTank.onPreTick empties a container before the generator's ten-tick fuel operation.
  if(pair){var tank=TRANSPORT_PORTS.manualFluid(ENGINE.networks,state,m,'fin',0),liquid=tank&&TRANSPORT_PORTS.fluidPlan(tank,pair.f,pair.mb,true),shell=root.GTTransactions.planOutput(m.outs,[{k:pair.empty,n:1}],def.slots.out,function(k){return root.CONTENT.maxStack(k);});
   if(liquid&&liquid.moved===pair.mb&&shell){liquid.commit();m.outs=shell;if(input.n<=1)m.ins[0]=null;else input.n--;m.fuelUsed=(m.fuelUsed||0)+1;changed=true;}else if(!shell)blocked={code:'ITEM_OUTPUT',text:'空单元输出已满'};
  }
  if(tick%(root.GAME_TIME?GAME_TIME.real(state,10):10)!==0)return changed;
  // Older saves split a paid fuel item's energy into a second balance. Restore it once.
  if(m.fuelEnergyCredit){made+=m.fuelEnergyCredit;delete m.fuelEnergyCredit;}
  var t=m.tanksIn[0];
  if(t){
   var consumed=def.fuelFamily==='steam'?6+def.tier:1;
   var value=def.fuelFamily==='steam'?(/^(steam|ic2steam)$/.test(t.f)?3:0):Math.floor((idx.fluids[t.f]||0)*def.efficiency/100);
   if(value>0){var times=Math.min(Math.floor(t.mb/consumed),Math.floor((cap-m.eu-made)/value));
    if(times>0){t.mb-=times*consumed;made+=times*value;m.fuelMb=(m.fuelMb||0)+times*consumed;if(!t.mb)m.tanksIn[0]=null;}}
  }
  var minimum=def.minimumOutputEnergy||0,refillAt=def.multiblock?cap:def.volt*20+minimum;
  if(m.eu+made<refillAt)for(var i=0;i<m.ins.length;i++){
   var stack=m.ins[i];if(!stack||stack.entityUid)continue;
   var fuel=idx.items[this.content.canonicalKey(stack.k)];if(!fuel)continue;var value=Math.floor(fuel.value*10*def.efficiency);if(!value)continue;
   var self=this,out=root.GTTransactions.planOutput(m.outs,fuel.outputs,def.slots.out,function(k){return self.content.maxStack(k);});if(!out){blocked={code:'ITEM_OUTPUT',text:'产物槽已满'};break;}
   stack.n--;if(stack.n<=0)m.ins[i]=null;m.outs=out;m.fuelUsed=(m.fuelUsed||0)+1;made+=value;break;
  }
  if(made){m.eu+=made;m.euMade=(m.euMade||0)+made;m.status={code:'GENERATING',text:'发电中'};}
  else m.status=blocked||{code:m.eu>=cap?'ENERGY_FULL':'FUEL',text:m.eu>=cap?'电量已满':'等待适用燃料'};
  return made>0||changed;
 };
 root.GeneratorProcessor=Generators;
 root.declareBehavior('fuel_generator',{
  gridTick:false,
  personalStorage:true,
  generatorTick:true,
  status:function(m,d,make){
   var code=m.status&&m.status.code;
   if(code==='ITEM_OUTPUT')return make('blocked',m);
   if((m.eu||0)>=d.energyCapacity)return make('energyFull',m);
   if(code==='GENERATING')return make('generating',m);
   var fuels=root.GeneratorProcessor?root.ENGINE.generators.fuels(d):null;
   var ready=(m.tanksIn||[]).some(function(t){return t&&(d.fuelFamily==='steam'?/^(steam|ic2steam)$/.test(t.f)&&t.mb>=6+d.tier:fuels&&fuels.fluids[t.f]>0&&t.mb>0);})
     ||(m.ins||[]).some(function(p){return p&&root.ENGINE.generators.accepts(m,p.k);});
   if(ready)return make('generationReady',m,'燃料就绪');
   return make(d.fuelFamily==='steam'?'steam':'fuel',m);
  }
 });
 if(typeof module==='object'&&module.exports)module.exports=Generators;
})(typeof window!=='undefined'?window:globalThis);
