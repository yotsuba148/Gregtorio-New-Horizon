/* Linked units own the recipe and resources. The plant owns the shared power supply. */
(function(root){
 'use strict';
 var P=INDUSTRIAL_PROCESSING,B=MULTIBLOCK_CATALOG,MB=MULTIBLOCKS,block=P.block,part=P.part;
 var concrete=block(9,3),plantCasing=block(9,4),reinforced=block(9,5),filter=block(3,11),ptfePipe=block(8,1),inert=block(9,10),reactive=block(9,9);
 var quartz='bartworks:BW_GlasBlocks@0',frames='gregtech:gt.blockframes@';
 var plant=P.install({
  id:'purificationplant',meta:9402,map:'none:purificationplant',
  pattern:['sssssss','sgsgsgs','sgsgsgs','sgsgsgs','sssCsss'],
  materials:[[plantCasing,78],[concrete,56],[reinforced,77],[frames+'81',30],[quartz,6]],
  art:{g:quartz},roles:['energy'],defaultPorts:[],minCasing:71,
  definition:{behavior:'purification_plant',inputIsolationFixed:false,runSwitch:true,uiPanels:['purification_plant']}
 });
 var plantKey=plant.key;
 var spent=new WeakMap();
 function supplies(unit,S){
  var host=S&&unit.purificationPlant&&ENTITIES.get(S,unit.purificationPlant);
  return host&&host.k===plantKey&&ENTITIES.isGrid(host)&&ENTITIES.isGrid(unit)&&host.location.blueprintId===unit.location.blueprintId?host:null;
 }
 function usable(host){
  if(!host||!MB.live(host))return false;
  MB.validate(host);
  return host.structure.formed&&MACHINE_CONTROL.allowed(host,DEFS.of(host.k));
 }
 var power={
  available:function(m,world){
   var host=supplies(m,world&&world.state);if(!usable(host))return 0;
   var tick=ENGINE.tick||0,prev=spent.get(host),remaining=host.structure.processingPowerEUt-(prev&&prev.tick===tick?prev.amount:0);
   return Math.max(0,Math.min(host.eu,remaining));
  },
  spend:function(m,n,world){
   var host=supplies(m,world.state),tick=ENGINE.tick||0,prev=spent.get(host);
   host.eu-=n;host.energySpent=(host.energySpent||0)+n;
   spent.set(host,{tick:tick,amount:n+(prev&&prev.tick===tick?prev.amount:0)});
  }
 };
 ENGINE.registerBehavior('purification_plant',{tick:function(m){
  if(!MB.live(m)||!m.structure.formed){m.status={code:'STRUCTURE',text:'结构不完整'};return false;}
  m.status={code:m.eu>0?'RUNNING':'ENERGY',text:m.eu>0?'净水厂供电中':'电量不足'};return false;
 }});
 function random(seed){return (Math.imul(seed||742991,1664525)+1013904223)>>>0;}
 function unit(spec){
  spec.definition=Object.assign({energyCapacity:0,startEnergy:0,inputIsolationFixed:false,runSwitch:true,noOverclock:true,uiPanels:['purification_unit']},spec.definition);
  spec.roles=['itemIn','itemOut','fluidIn','fluidOut'];
  var p=P.install(spec);
  p.processingEnergy=power;
  p.capability=function(m,c){c.voltage=spec.voltage||32768;c.power=c.voltage;};
  p.checkRecipe=function(m,r,job){
   var host=supplies(m,ENGINE.state);
   if(!usable(host))return P.error('PURIFICATION_LINK','连接一台运行中的净水厂');
   if(spec.ozone&&!job){
    var available=INDUSTRIAL_ENERGY.sumFluid(m,'ozone'),limit=1024000;
    if(available>limit)return P.error('FLUID_INPUT','臭氧超过 1,024,000 mB');
    var required=r.fin.find(function(f){return f.f==='ozone';}).mb;
    if(required<limit&&available>=2*required)return P.error('FLUID_INPUT','使用当前臭氧浓度对应的配方');
   }
   return null;
  };
  p.prepareRecipe=function(m,r){
   if(spec.prepare)return spec.prepare(m,r);
   if(!spec.filter)return r;
   var seed=random(m.purificationRandom);
   if(seed%100<spec.filter)return r;
   var clone=GTTransactions.clone(r);
   clone.req=clone.req.concat(clone.in.map(function(p){return Object.assign({},p,{consumed:false});}));
   clone.in=[];return clone;
  };
  p.commitBatch=function(m,r,job){
   var seed=random(random(m.purificationRandom)), chance=r.extra.metadata.purification_plant_base_chance;
   m.purificationRandom=seed;
   if(spec.result)job.fluidOutputs=spec.result(r,job.fluidOutputs,seed,chance);
   else if(seed%100>=chance)job.fluidOutputs=[];
  };
  return p;
 }
 unit({
  id:'purificationclarifier',meta:9403,map:'gt.recipe.purificationplantclarifier',
  pattern:[' sssss ','sswwwss','sfwpwfs','sswwwss',' ssCss '],
  materials:[[reinforced,131],[filter,21],[frames+'84',12],[frames+'335',12],[ptfePipe,3]],
  art:{w:'asset:modicons/remaining-industry/clarifier-water.png',f:filter,p:ptfePipe},defaultPorts:[71,81,51,61],minCasing:123,maintenance:false,
  limits:function(m,ports){return ports.length<=8;},
  required:['itemIn','itemOut','fluidIn','fluidOut'],filter:20
 });
 unit({
  id:'purificationozone',meta:9404,map:'gt.recipe.purificationplantozonation',
  pattern:[' sss ','sgggs','sgggs','sgggs','sppps','sgggs','ssCss'],
  materials:[[inert,68],[reactive,28],[quartz,9],[frames+'316',6],[block(3,11),3]],
  art:{g:quartz,p:reactive},defaultPorts:[51,51,61,81],required:['fluidIn','fluidOut','itemOut'],ozone:true
 });
 root.PURIFICATION_UNITS={register:unit};
 RESOURCE_UI.registerPanel('purification_plant',function(host,m,S){
  var line=document.createElement('p');host.append(line);
  host._refresh=function(){
   line.textContent='供电上限 '+(m.structure&&m.structure.processingPowerEUt||0).toLocaleString()+' EU/t';
  };host._refresh();
 });
 RESOURCE_UI.registerPanel('purification_unit',function(host,m,S,save){
  var field=document.createElement('label'),select=document.createElement('select'),hint=document.createElement('p'),signature='';
  select.dataset.purificationLink='1';field.append('净水厂 ',select);host.append(field,hint);
  select.onchange=function(){if(!m.job){m.purificationPlant=select.value||null;if(save)save();}host._refresh();};
  host._refresh=function(){
   var options=(S.fx&&S.fx.machines||[]).filter(function(p){return p.k===plantKey&&ENTITIES.isGrid(p)&&p.location.blueprintId===m.location.blueprintId;});
   var values=options.map(function(p){return [p.uid,p.note||('净水厂 '+(p.x+1)+', '+(p.y+1))];});
   var next=JSON.stringify(values);
   if(next!==signature){
    signature=next;select.replaceChildren(new Option('选择净水厂',''));
    values.forEach(function(p){select.append(new Option(p[1],p[0]));});
   }
   select.disabled=!!m.job;select.value=m.purificationPlant||'';
   hint.textContent=usable(supplies(m,S))?'已连接':'等待净水厂';
  };host._refresh();
 });
 DEFS.rebuild();
})(typeof window!=='undefined'?window:globalThis);
