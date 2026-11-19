/* Fuel conversion owns its cycle state; hatch buffers and power delivery remain shared. */
(function(root){
 'use strict';
 var I=INDUSTRIAL_ENERGY, B=MULTIBLOCK_CATALOG, MB=MULTIBLOCKS, C=CONTENT;
 var block=INDUSTRIAL_PROCESSING.block, part=INDUSTRIAL_PROCESSING.part;
 var steamFlowMultiplier={Alduorite:6,Duranium:16,Tartarite:1120,Vulcanite:40,Chrysotile:280,Mithril:22,Ichorium:6};
 function status(m,code,text){m.status={code:code,text:text};return false;}
 function fitPanel(host,m,S,save){
  var row=document.createElement('p'),button=document.createElement('button'),power=document.createElement('span');
  button.className='btn';button.dataset.turbineFit='1';row.append(button,' ',power);host.append(row);
  button.onclick=function(){m.looseFit=!m.looseFit;if(save)save();host._refresh();};
  host._refresh=function(){
   button.textContent=m.looseFit?'宽松配合':'紧密配合';
   power.textContent='输出 '+Math.floor(I.state(m).power||0)+' EU/t';
  };
  host._refresh();
 }
 RESOURCE_UI.registerPanel('industrial_turbine_fit',fitPanel);
 function transferCycle(m,input,used,out,amount){
  var next=I.drain(m,[{f:input,mb:used}]);
  var product=amount?MB.fluidOutput(m,[{f:out,mb:amount}]):null;
  if(!next||amount&&!product)return false;
  m.tanksIn=next;if(product)MB.commitFluidOutput(m,product);return true;
 }
 function turbineFuel(d,f){
  if(d.turbineFuel==='steam')return f==='steam'?.5:0;
  if(d.turbineFuel==='highSteam')return f==='ic2superheatedsteam'?1:0;
  if(d.turbineFuel==='supercritical')return f==='supercriticalsteam'?1:0;
  return I.fuelValue(d,f)/20;
 }
 function turbine(m,ctx){
  if(!I.ready(m))return false;
  var d=ctx.definition, s=I.state(m), stack=m.installedItems&&m.installedItems.rotor, rotor=I.rotor(stack);
  if(!rotor){s.power=0;return status(m,'INPUT','缺少涡轮转子');}
  var plasma=d.turbineFuel==='plasma',critical=d.turbineFuel==='supercritical';
  var period=plasma?20:1;
  if(s.turbineCycle==null||s.runtime%period===0){
   var fuel=m.tanksIn.find(function(t){return t&&turbineFuel(d,t.f)>0;});
   if(!fuel){s.power=0;return status(m,'FUEL','缺少适用流体');}
   var value=turbineFuel(d,fuel.f);
   var baseFlow=rotor.baseFlow*(plasma?42*(rotor.material==='Ichorium'?3:1):(steamFlowMultiplier[rotor.material]||1));
   if(m.looseFit)baseFlow*=(plasma?2:3)*Math.pow(plasma?1.03:1.1,(rotor.efficiency-.8)*20);
   var flow=Math.max(1,plasma?Math.ceil(baseFlow/value):Math.floor(baseFlow));
   var overflow=critical?1.25:plasma?1+1.5*rotor.overflow:d.turbineFuel==='highSteam'?1.5+.5*rotor.overflow:1+.5*rotor.overflow;
   var amount=Math.min(I.sumFluid(m,fuel.f),Math.floor(flow*overflow));
   var tolerance=critical?1:plasma?rotor.overflow*3+1:d.turbineFuel==='highSteam'?rotor.overflow+2:rotor.overflow+1;
   var efficiency=amount<flow?amount/flow:Math.max(0,1-(amount-flow)/(flow*tolerance));
   var product, produced=amount, remainder=s.condensate||0;
   if(d.turbineFuel==='steam'){product='ic2distilledwater';produced=Math.floor((remainder+amount)/160);remainder=(remainder+amount)%160;}
   else if(d.turbineFuel==='highSteam')product='steam';
   else if(critical){product='ic2superheatedsteam';produced=amount;}
   else {var element=fuel.f.split('.')[1];product=GD.fluids[element]?element:GD.fluids['molten.'+element]?'molten.'+element:null;}
   if(!transferCycle(m,fuel.f,amount,product,product?produced:0)){s.power=0;return status(m,'FLUID_OUTPUT','流体输出空间不足');}
   var fit=m.looseFit?(-.2+Math.round(rotor.efficiency*85)*.01)*(plasma?1:.9):rotor.efficiency;
   s.turbineCycle=Math.max(1,Math.floor(amount*value*efficiency*fit));
   s.condensate=remainder;s.fuelUsed=(s.fuelUsed||0)+amount;
  }
  s.runtime++;s.efficiency=Math.min(10000,s.efficiency+10);
  s.power=Math.min(I.outputLimit(m),Math.floor(s.turbineCycle*s.efficiency/10000));
  I.generate(m,s.power);
  if(s.runtime%1000===0&&rotor.durability>0){
   stack.dmg=(stack.dmg||0)+Math.max(1,Math.floor(Math.min(s.power/5,Math.pow(s.power,.6))));
   if(stack.dmg>=rotor.durability)delete m.installedItems.rotor;
  }
  m.status={code:'GENERATING',text:'发电中'};return true;
 }
 function engine(m,ctx){
  if(!I.ready(m))return false;
  var d=ctx.definition,s=I.state(m),fuel=m.tanksIn.find(function(t){return t&&I.fuelValue(d,t.f)>0;});
  if(!fuel){s.power=0;s.efficiency=0;return status(m,'FUEL','缺少燃料');}
  var nominal=d.nominalOutput,boost=I.sumFluid(m,d.boostFluid)>=d.boostRate;
  var value=I.fuelValue(d,fuel.f),used=Math.floor(nominal*(boost?2:1)/value);
  if(!boost&&used===0)return status(m,'FUEL','该燃料需要助燃');
  var debit=s.fuelFraction||0;
  if(boost&&d.boostBase===1&&value*3>nominal*3){
   var ideal=nominal*2/value;debit+=ideal-Math.floor(ideal);
   if(debit>=1){used++;debit-=1;}
  }
  var requirements=[{f:fuel.f,mb:used}];
  var lubricant=boost?2:1;
  if(I.sumFluid(m,'lubricant')<lubricant){s.power=0;return status(m,'FUEL','缺少润滑油');}
  if(boost)requirements.push({f:d.boostFluid,mb:d.boostRate});
  if(s.runtime%72===0)requirements.push({f:'lubricant',mb:lubricant});
  var next=I.drain(m,requirements);if(!next){s.power=0;return status(m,'FUEL',I.sumFluid(m,'lubricant')?'缺少燃料':'缺少润滑油');}
  m.tanksIn=next;s.runtime++;s.fuelFraction=debit;s.fuelUsed=(s.fuelUsed||0)+used;
  var power=s.efficiency>=2000?nominal*(boost?d.boostBase:1):0;
  s.efficiency=Math.min(boost?d.boostEfficiency:10000,s.efficiency+d.warmup);
  s.power=Math.min(I.outputLimit(m),Math.floor(power*s.efficiency/10000));
  I.generate(m,s.power);m.status={code:'GENERATING',text:'发电中'};return true;
 }
 function install(spec){
  var d=Object.assign({portFluidPeriodTicks:spec.turbine?5:20,behavior:spec.turbine?'industrial_fluid_turbine':'industrial_liquid_engine',
   generator:true,energyCapacity:0,startEnergy:0,runSwitch:true,inputIsolationFixed:false,
   autoItems:false,autoFluids:true},spec.definition);
  if(spec.turbine)Object.assign(d,{uiPanels:['industrial_turbine_fit'],instanceSlots:{
   rotor:{ids:['gregtech:gt.metatool.01'],policy:'industrial_turbine_rotor',label:'涡轮转子'}
  }});
  var id=spec.id, p=B.basic({
   id:id,name:GD.items[B.key(spec.meta)],meta:spec.meta,map:'none:'+id,pattern:spec.rows,portTiles:['s','i'],
   definition:d,defaultPorts:spec.turbine?[51,61,34]:[51,51,34],parts:function(){
    return spec.materials.map(function(p){return part(p[0],p[1]);});
   },allowed:function(m,f,s){
    if(s.steamComponent)return false;
    if(s.type==='dynamo')return f.x===spec.rows[0].length-1&&f.y===1&&f.side===1;
    return s.type==='fluidIn'||spec.turbine&&s.type==='fluidOut';
   }
  });
  if(spec.id==='supercriticalsteamturbine')p.portChoices=function(m,k,faces){
   var role=MB.spec(k).type,top=role==='fluidIn'?'0,0,0':role==='fluidOut'?'4,0,0':null;
   return top?faces.slice().sort(function(a,b){return Number(b.id===top)-Number(a.id===top);}):faces;
  };
  p.materialKey=function(m,c,ch){return spec.art[ch]||null;};
  p.portRequirements={dynamo:{min:1,max:1},fluidIn:spec.turbine?1:2,fluidOut:spec.turbine?1:0};
  p.capability=function(m,c){c.energyCapacity=MULTIBLOCK_POWER.capacity(m);};
 }
 function registerTurbine(id,meta,casing,core,fuel,fuelMap){
  install({id:id,meta:meta,turbine:true,rows:['sssss','Cttts','sssss'],
   materials:[[casing,31]],art:{t:core},definition:{turbineFuel:fuel,fuelMap:fuelMap}});
 }
 function registerEngine(id,meta,casing,gear,intake,rules){
  install({id:id,meta:meta,rows:['isss','Cggs','isss'],
   materials:[[casing,24],[gear,2],[intake,8]],art:{g:gear,i:intake},definition:rules});
 }
 registerTurbine('largesteamturbine',1131,block(4,9),block(2,3),'steam');
 registerTurbine('largehpsteamturbine',1152,block(4,11),block(2,4),'highSteam');
 registerTurbine('supercriticalsteamturbine',32016,'GoodGenerator:supercriticalFluidTurbineCasing@0',block(2,15),'supercritical');
 registerTurbine('largeplasmaturbine',1153,block(4,12),block(1,15),'plasma','gt.recipe.plasmageneratorfuels');
 registerEngine('largesemifluidgenerator',31026,block(4,2),block(2,3),block(4,13),
  {fuelMap:'gtpp.recipe.semifluidgeneratorfuels',nominalOutput:2048,boostFluid:'oxygen',boostRate:4,boostBase:2,boostEfficiency:15000,warmup:15});
 registerEngine('extremecombustionengine',2105,block(4,0),block(2,4),block(8,4),
  {fuelMap:'gt.recipe.extremedieselgeneratorfuel',nominalOutput:10900,boostFluid:'liquidoxygen',boostRate:2,boostBase:1,boostEfficiency:30000,warmup:20});
 ENGINE.registerBehavior('industrial_fluid_turbine',{tick:turbine,ensure:I.state,
  acceptsFluid:function(m,f){return turbineFuel(DEFS.of(m.k),f)>0;}});
 ENGINE.registerBehavior('industrial_liquid_engine',{tick:engine,ensure:I.state,
  acceptsFluid:function(m,f){var d=DEFS.of(m.k);return f==='lubricant'||f===d.boostFluid||I.fuelValue(d,f)>0;}});
 DEFS.rebuild();
})(typeof window!=='undefined'?window:globalThis);
