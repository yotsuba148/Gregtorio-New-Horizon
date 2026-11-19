/* Industrial conversion owns fuel, heat and stored EU. Ports own transport buffers. */
(function(root){
 'use strict';
 var TX=GTTransactions,MB=MULTIBLOCKS,sourceKeys={gas:1151,diesel:1171,exchanger:1154,capacitor:13106};
 var capByMeta={1:'600000000',2:'6000000000',3:'60000000000',4:'600000000000',5:'9223372036854775807',6:'0',7:'60000000',8:'9223372036854775807',9:'9223372036854775807',10:'85070591730234615847396907784232501249'};
 var coolants={lava:{cold:'ic2pahoehoelava',steam:.2,threshold:.25},ic2hotcoolant:{cold:'ic2coolant',steam:.5,threshold:.2},'molten.solarsalthot':{cold:'molten.solarsaltcold',steam:2.5,threshold:.04}};
 function ports(m,type){return MB.ports(m).filter(function(p){return HATCH_RULES.has(MB.spec(p.k),type);});}
 function state(m){return m.industrialEnergy||(m.industrialEnergy={efficiency:0,runtime:0,power:0,fuelFraction:0,stored:'0'});}
 function sumFluid(m,f){return (m.tanksIn||[]).reduce(function(n,t){return n+(t&&t.f===f?t.mb:0);},0);}
 function fuelValue(d,f){return ENGINE.generators.fuels(d).fluids[f]||0;}
 function drain(m,requirements){var p=TX.planDrain(m.tanksIn,requirements.filter(function(r){return r.mb>0;}));return p&&p.tanks;}
 function outputLimit(m){return ports(m,'dynamo').reduce(function(n,p){var s=MB.spec(p.k);return n+s.voltage*s.amperage;},0);}
 function generate(m,power){var made=MULTIBLOCK_POWER.offer(m,power);m.euMade=(m.euMade||0)+made;return made;}
 var rotorStats=new WeakMap();
 function rotor(stack){
  var item=stack&&CONTENT.item(stack.k);if(!item||item.id!=='gregtech:gt.metatool.01'||item.meta<170||item.meta>177)return null;
  if(rotorStats.has(item))return rotorStats.get(item);
  var tag=SNBT.tryParse(item.nbt||'{}'),stats=tag&&tag['GT.ToolStats'];if(!stats)return null;
  var mat=GD.industrialTurbineMaterials[stats.PrimaryMaterial],size=Math.floor((item.meta-170)/2);if(!mat||size>3)return null;
  var efficiency=.55+(.1*([0,2.5,5,7.5][size]+mat.quality)),baseFlow=(size+1)*mat.speed*50;
  var result={efficiency:efficiency,flow:baseFlow*mat.gas,baseFlow:baseFlow,material:stats.PrimaryMaterial,size:size,
   overflow:1+Math.min(2,Math.floor(mat.quality/3)),durability:Number(stats.MaxDamage)||0};
  rotorStats.set(item,result);return result;
 }
 function ready(m){
  if(!MB.live(m)){m.status={code:'STRUCTURE',text:'结构不完整'};return false;}
  MB.validate(m);if(!m.structure.formed){m.status={code:'STRUCTURE',text:m.structure.errors[0]||'结构不完整'};return false;}
  return true;
 }
 function restoreLegacyBatch(m,S){
  if(!m.job)return true;var j=m.job,done=j.progressTicks>=j.durationTicks,items=done?j.outputs||[]:j.inputs||[],fluids=done?j.fluidOutputs||[]:j.fluidInputs||[],next;
  if(fluids.length){next=done?MB.fluidOutput(m,fluids,false):TX.planFill(m.tanksIn,fluids,STRUCTURES.instance(m).fluidInputTanks,false);if(!next){m.status={code:'OUTPUT',text:'输出受阻'};return false;}}
  if(items.length){var result=COMMANDS.returnItems(S,items,{drops:true});if(!result.ok)return false;}
  if(next){if(done)MB.commitFluidOutput(m,next);else m.tanksIn=next;}m.job=null;return true;
 }
 function gas(m,context){
  if(!ready(m)||!restoreLegacyBatch(m,context.state))return false;
  var s=state(m),d=DEFS.of(m.k),stack=m.installedItems&&m.installedItems.rotor,t=rotor(stack);
  if(!t){m.status={code:'INPUT',text:'缺少涡轮转子'};return false;}
  var fuel=(m.tanksIn||[]).find(function(t){return t&&fuelValue(d,t.f)>0;});if(!fuel){s.power=0;s.efficiency=0;m.status={code:'FUEL',text:'缺少燃料'};return false;}
  var value=fuelValue(d,fuel.f),eff=m.looseFit?(-.2+Math.round(t.efficiency*85)*.01)*.95:t.efficiency;
  var flow=m.looseFit?2*t.flow*Math.pow(1.05,(t.efficiency-.8)*20):t.flow;
  var optimal=Math.floor(flow/value),available=sumFluid(m,fuel.f),used=0,power=0;
  if(t.flow*t.efficiency<value){used=Math.min(1,available);power=used?Math.floor(t.flow*t.efficiency):0;}
  else if(optimal>0){used=Math.min(available,Math.floor(optimal*1.5*t.overflow));var ratio=used>optimal?1-Math.abs(used-optimal)/(optimal*(t.overflow*3-1)):used/optimal;power=Math.floor(used*value*Math.max(0,ratio)*eff);}
  var next=drain(m,[{f:fuel.f,mb:used}]);if(!next||!used){m.status={code:'FUEL',text:'缺少燃料'};return false;}
  m.tanksIn=next;s.fuelUsed=(s.fuelUsed||0)+used;power=Math.min(power,outputLimit(m));
  var difference=power-s.power,change=Math.max(10,Math.floor(Math.abs(difference)/100));s.power+=Math.abs(difference)>change?Math.sign(difference)*change:difference;
  generate(m,s.power*s.efficiency/10000);s.efficiency=Math.min(10000,s.efficiency+10);s.runtime++;
  if((s.maintenanceRuntime||0)>1000){s.maintenanceRuntime=0;if(Math.random()<.5){stack.dmg=(stack.dmg||0)+Math.floor(Math.min(Math.abs(s.power)/5,Math.pow(Math.abs(s.power),.6)));if(stack.dmg>=t.durability)delete m.installedItems.rotor;}}else s.maintenanceRuntime=(s.maintenanceRuntime||0)+1;
  m.status={code:'RUNNING',text:'运行中'};return true;
 }
 function diesel(m,context){
  if(!ready(m)||!restoreLegacyBatch(m,context.state))return false;
  var s=state(m),d=DEFS.of(m.k),fuel=(m.tanksIn||[]).find(function(t){return t&&fuelValue(d,t.f)>0;});
  if(!fuel){s.efficiency=0;m.status={code:'FUEL',text:'缺少燃料'};return false;}
  var boosted=sumFluid(m,'oxygen')>=2,value=fuelValue(d,fuel.f);if(!boosted&&value>2048){m.status={code:'FUEL',text:'燃料需要氧气助燃'};return false;}
  var used=Math.floor((s.boosted?4096:2048)/value);if(s.boosted){var boostedValue=Math.floor(value*1.5);if(boostedValue*2>6144){var fraction=6144/boostedValue;if(Math.random()<fraction-Math.floor(fraction))used++;}}var requirements=[{f:fuel.f,mb:used}];
  if(boosted)requirements.push({f:'oxygen',mb:2});if(s.runtime%72===0)requirements.push({f:'lubricant',mb:boosted?2:1});
  var next=drain(m,requirements);if(!next){m.status={code:sumFluid(m,'lubricant')===0?'INPUT':'FUEL',text:sumFluid(m,'lubricant')===0?'缺少润滑油':'缺少燃料'};return false;}
  var power=s.efficiency<2000?0:Math.floor(2048*s.efficiency/10000);m.tanksIn=next;s.boosted=boosted;s.runtime++;s.fuelUsed=(s.fuelUsed||0)+used;
  generate(m,Math.min(power,outputLimit(m)));s.efficiency=Math.min(boosted?30000:10000,s.efficiency+15);s.power=power;m.status={code:'RUNNING',text:'运行中'};return true;
 }
 function exchanger(m,context){
  if(!ready(m)||!restoreLegacyBatch(m,context.state))return false;
  var s=state(m),job=s.heat;
  if(!job){
   var hot=(m.tanksIn||[]).find(function(t){return t&&coolants[t.f];});if(!hot){m.status={code:'INPUT',text:'缺少热流体'};return false;}
   var spec=coolants[hot.f],circ=m.controllerCircuit&&m.controllerCircuit.circ||0,reduction=circ>=1&&circ<=25?circ-1:0;
   var threshold=Math.floor((4000-150*reduction)*spec.threshold),used=Math.min(sumFluid(m,hot.f),threshold*2),cold=MB.fluidOutput(m,[{f:spec.cold,mb:used}],false),next=drain(m,[{f:hot.f,mb:used}]);
   if(!cold||!next){m.status={code:'OUTPUT',text:'输出受阻'};return false;}
   m.tanksIn=next;MB.commitFluidOutput(m,cold);job=s.heat={ticks:0,total:20,power:Math.floor(used*20*spec.steam*(1-.015*reduction)),superheated:sumFluid(m,hot.f)+used>=threshold};
  }
  var steam=Math.floor(job.power*2*s.efficiency/10000/(job.superheated?2:1)),waterCredit=s.waterCredit||0,water=Math.ceil(Math.max(0,steam-waterCredit)/160),next=water?drain(m,[{f:'ic2distilledwater',mb:water}]):TX.clone(m.tanksIn);
  if(!next){m.status={code:'WATER',text:'缺少蒸馏水'};return false;}
  var outputs=steam?MB.fluidOutput(m,[{f:job.superheated?'ic2superheatedsteam':'steam',mb:steam}],false):TX.clone(m.tanksOut);
  if(!outputs){m.status={code:'OUTPUT',text:'输出受阻'};return false;}
  m.tanksIn=next;MB.commitFluidOutput(m,outputs);s.waterCredit=waterCredit+water*160-steam;
  job.ticks=GAME_TIME.advance(context.state,job.ticks,job.total,1);if(job.ticks>=job.total){delete s.heat;s.efficiency=Math.min(10000,s.efficiency+80);}
  m.status={code:'RUNNING',text:'运行中'};return true;
 }
 function capacity(m){return (m.structure&&m.structure.fixedParts||[]).reduce(function(n,p){var match=/^kekztech:kekztech_lapotronicenergyunit_block@(\d+)$/.exec(p.k);return n+(match&&capByMeta[match[1]]?BigInt(capByMeta[match[1]])*BigInt(p.n):0n);},0n);}
 function passiveLoss(m){var upper={'5':1000000n,'8':100000000n,'9':10000000000n,'10':1000000000000n},n=0n,found=false;(m.structure&&m.structure.fixedParts||[]).forEach(function(p){var meta=p.k.split('@')[1];if(p.k.indexOf('kekztech:kekztech_lapotronicenergyunit_block@')===0&&upper[meta]){found=true;n+=upper[meta]*BigInt(p.n);}});return found?n:capacity(m)/172800000n;}
 function capacitor(m,context){
  if(!ready(m)||!restoreLegacyBatch(m,context.state))return false;
  var s=state(m),cap=capacity(m),stored=BigInt(s.stored),input=0,output=0;
  ports(m,'energy').forEach(function(p){var spec=MB.spec(p.k),n=Number([BigInt(Math.floor(p.eu||0)),BigInt(spec.voltage*spec.amperage),cap>stored?cap-stored:0n].reduce(function(a,b){return a<b?a:b;}));p.eu=(p.eu||0)-n;stored+=BigInt(n);input+=n;});
  ports(m,'dynamo').forEach(function(p){var spec=MB.spec(p.k),n=Number([BigInt(Math.max(0,spec.energyCapacity-Math.floor(p.eu||0))),BigInt(spec.voltage*spec.amperage),stored].reduce(function(a,b){return a<b?a:b;}));p.eu=(p.eu||0)+n;stored-=BigInt(n);output+=n;});
  var loss=passiveLoss(m);stored=stored>loss?stored-loss:0n;s.stored=stored.toString();s.capacity=cap.toString();s.input=input;s.output=output;m.status={code:'STORAGE',text:'储能 '+s.stored+' / '+s.capacity+' EU'};return input>0||output>0||loss>0n;
 }
 function mount(host,m,S,save){
  if(host._industrialOwner!==m){
   host._industrialOwner=m;host.innerHTML='<div class="resource-host"></div><p class="industrial-energy-info"></p>';
   RESOURCE_UI.mount(host.querySelector('.resource-host'),m,S,save);
   if(DEFS.of(m.k).behavior==='industrial_gas_turbine'){
    var button=document.createElement('button');button.className='btn';button.dataset.industrialFit='true';button.onclick=function(){m.looseFit=!m.looseFit;if(save)save();mount(host,m,S,save);};host.appendChild(button);
   }
  }else RESOURCE_UI.refresh(host.querySelector('.resource-host'),m);
  var s=state(m),fit=host.querySelector('[data-industrial-fit]');if(fit)fit.textContent=m.looseFit?'宽松配合':'紧密配合';
  var info=host.querySelector('.industrial-energy-info');
  info.textContent=DEFS.of(m.k).behavior==='industrial_capacitor'?'输入 '+(s.input||0)+' EU/t · 输出 '+(s.output||0)+' EU/t':DEFS.of(m.k).behavior==='industrial_heat_exchanger'?'效率 '+(s.efficiency/100).toFixed(1)+'%':'输出 '+Math.floor(s.power*s.efficiency/10000)+' EU/t · 效率 '+(s.efficiency/100).toFixed(1)+'%';
 }
 function register(id,behavior,tick){
  var p=STRUCTURES.profiles[id],d=GD.extraMachineDefinitions.find(function(d){return d.structureProfile===id;});
  Object.assign(d,{behavior:behavior,generator:id!=='largeheatexchanger',inputIsolationFixed:false,recipeMap:'none:'+behavior,startEnergy:0,energyCapacity:0,energyRelay:false});
  p.allowedFace=function(m,f,s){var sh=MB.shape(m);if(f.x===sh.cx&&f.y===sh.cy||s.steamComponent)return false;return id==='lapotronicsupercapacitor'?f.y>=sh.h-2&&['energy','dynamo'].includes(s.type):id==='largeheatexchanger'?['fluidIn','fluidOut'].includes(s.type):['fluidIn','dynamo'].includes(s.type);};
  p.portRequirements=id==='lapotronicsupercapacitor'?{energy:1,dynamo:1}:
   id==='largeheatexchanger'?{fluidIn:2,fluidOut:2}:{dynamo:{min:1,max:1},fluidIn:id==='largecombustionengine'?2:1};
  var build=p.build;p.build=function(v){var spec=build(v);var removed=0;spec.parts=spec.parts.filter(function(p){var remove=/^gregtech:gt.blockmachines@[4-8]\d$/.test(p.k);if(remove)removed+=p.n;return !remove;});var defaults=id==='lapotronicsupercapacitor'?[44,34]:id==='largeheatexchanger'?[51,51,61,61]:id==='largecombustionengine'?[51,51,34]:[51,34];spec.parts[0].n+=removed-defaults.length;return Object.assign({},spec,{parts:spec.parts.concat(defaults.map(function(n){return {k:'gregtech:gt.blockmachines@'+n,n:1};}))});};
  p.capability=function(m,c){c.energyCapacity=ports(m,'dynamo').reduce(function(n,p){return n+MB.spec(p.k).energyCapacity;},0);if(id==='largeheatexchanger')c.energyCapacity=0;};
  ENGINE.registerBehavior(behavior,{ensure:state,tick:tick,mount:mount,acceptsFluid:function(m,f){var d=DEFS.of(m.k);return id==='largeheatexchanger'?!!coolants[f]||f==='ic2distilledwater':id==='largecombustionengine'?f==='lubricant'||f==='oxygen'||fuelValue(d,f)>0:fuelValue(d,f)>0;},signature:function(m){var s=state(m);return JSON.stringify([s.stored,s.input,s.output,s.power,m.status]);}});
  return d;
 }
 var gasDef=register('largegasturbine','industrial_gas_turbine',gas);gasDef.fuelMap='gt.recipe.gasturbinefuel';gasDef.instanceSlots={rotor:{ids:['gregtech:gt.metatool.01'],policy:'industrial_turbine_rotor',label:'涡轮转子'}};
 var dieselDef=register('largecombustionengine','industrial_diesel_engine',diesel);dieselDef.fuelMap='gt.recipe.dieselgeneratorfuel';
 var dieselProfile=STRUCTURES.profiles.largecombustionengine;
 dieselProfile.portReplacesCasing=function(m,s){return s.type!=='dynamo';};
 dieselProfile.build=function(){return {parts:[
  {k:'gregtech:gt.blockcasings4@2',n:20},{k:'gregtech:gt.blockcasings2@4',n:2},{k:'gregtech:gt.blockcasings4@13',n:8},
  {k:'gregtech:gt.blockmachines@90',n:1},{k:'gregtech:gt.blockmachines@91',n:1},
  {k:'gregtech:gt.blockmachines@51',n:2},{k:'gregtech:gt.blockmachines@34',n:1}]};};
 var exchangerDef=register('largeheatexchanger','industrial_heat_exchanger',exchanger);exchangerDef.controllerCircuit=true;
 register('lapotronicsupercapacitor','industrial_capacitor',capacitor);
 MECHANISMS.registerInstancePolicy('industrial_turbine_rotor',{prepare:function(stack){return rotor(stack)?{ok:true,item:stack}:{ok:false,code:'ITEM'};}});
 DEFS.rebuild();
 root.INDUSTRIAL_ENERGY={rotor:rotor,capacity:capacity,passiveLoss:passiveLoss,coolants:coolants,generate:generate,gas:gas,diesel:diesel,exchanger:exchanger,capacitor:capacitor,state:state,ready:ready,drain:drain,sumFluid:sumFluid,fuelValue:fuelValue,outputLimit:outputLimit};
})(typeof window!=='undefined'?window:globalThis);
