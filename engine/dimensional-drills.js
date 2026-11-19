(function(root){
 'use strict';
 var B=MULTIBLOCK_CATALOG,C=CONTENT,oilMap='native:fluid_drill',gasMap='native:gas_siphon';
 var oil=GD.dimensionalFluids,pipe=C.canonicalKey('IC2:blockMiningPipe@0');
 var pattern=[' f ',' f ',' f ','fcf','fcf','fcf','sCs'];
 var gas={
  jupiterstation:[['hydrogen',15000],['helium',500],['nitrogen',300],['oxygen',200]],
  saturnstation:[['hydrogen',18000],['helium',800],['oxygen',500],['liquidoxygen',150]],
  uranusstation:[['deuterium',5000],['neon',450],['argon',250],['krypton',100]],
  neptunestation:[['tritium',3000],['helium-3',500],['ammonia',400],['xenon',350]]
 };
 var where=ENTITIES.dimension;
 function structure(meta,map,min,casing,frame,middle,gasDrill,range){
  var id=(gasDrill?'gas_siphon_':'fluid_drill_')+meta,key='gregtech:gt.blockmachines@'+meta;
  var d={behavior:gasDrill?'planetary_gas_drill':'dimensional_fluid_drill',tier:min,volt:DEFS.voltOf(min),noOverclock:true,maxEnergyHatches:1,
   inputIsolationFixed:false,maxTierSkips:0,controllerCircuit:false,uiPanels:['dimensional_drill'],showBatchTelemetry:false,
   discardStoredFluidsDuringJob:true,drillTier:min,drillRange:range};
  B.basic({id:id,name:GD.items[key],meta:meta,map:map,pattern:pattern,defaultPorts:gasDrill?[73,63]:[62],
   parts:function(){return [{k:casing,n:gasDrill?7:11},{k:frame,n:15}].concat(gasDrill?[{k:middle,n:4}]:[]);},
   materialKey:function(m,c,ch){return ch==='f'?frame:ch==='c'?middle:casing;},
   allowed:function(m,f,s){return !s.steamComponent&&(s.type==='energy'||HATCH_RULES.has(s,'fluidOut')||gasDrill&&s.type==='itemIn');},
   portRequirements:Object.assign({energy:{min:1,max:1,label:DEFS.tagOf(min)+' 或更高等级的能源仓'},fluidOut:1},gasDrill?{itemIn:{min:1,max:1}}:{}),
   capability:function(m,c,errors){if(B.counted(m,'energy').length&&c.voltage<DEFS.voltOf(min))errors.push('能源仓需要 '+DEFS.tagOf(min)+' 或更高等级');},
   minCasing:3,definition:d});
  var icons=GD.faceIcons||(GD.faceIcons={}),grid=GD.gridFaceIcons||(GD.gridFaceIcons={});
  var face='modicons/front/dimensional_drill_'+meta;
  icons[key]=grid[key]=face+'.png';
  (GD.workingFaces||(GD.workingFaces={}))[key]={idle:face+'.png',active:face+'_active.png'};
 }
 [
  [1157,2,'gregtech:gt.blockcasings2@0','gregtech:gt.blockframes@305',1],
  [141,3,'gregtech:gt.blockcasings4@1','gregtech:gt.blockframes@306',2],
  [142,4,'gregtech:gt.blockcasings4@2','gregtech:gt.blockframes@28',4],
  [149,5,'gregtech:gt.blockcasings4@0','gregtech:gt.blockframes@316',8]
 ].forEach(function(r){structure(r[0],oilMap,r[1],r[2],r[3],r[2],false,r[4]);});
 structure(14002,gasMap,3,'gtnhintergalactic:gassiphoncasing@0','gregtech:gt.blockframes@316','bartworks:bw.werkstoffblockscasingadvanced.01@88',true);
 GD.faceIcons['gtnhintergalactic:gassiphoncasing@0']='modicons/front/gas_siphon_casing.png';
 DEFS.rebuild();
 function entries(m,kind){
  return kind==='gas'?gas[where(m)]||[]:oil[where(m)]||[];
 }
 function selected(m,kind,list){
  return kind==='gas'?(list[(m.gasDepth||1)-1]||list[0]):list.find(function(r){return r[0]===m.drillFluid;})||list[0];
 }
 function proposal(m,d,kind,list,row){
  var f=C.canonicalFluid(row[0]),tier=DEFS.recipeTier(d.volt),depth=list.indexOf(row)+1,duration,eut,mb,req=[],carry;
  if(kind==='gas'){
   var base=depth*4*Math.pow(2,2*SPACE_DESTINATIONS.get(where(m)).tier+2);
   duration=20;eut=base;mb=row[1];
   while(eut*4<=d.volt){eut*=4;mb*=2;}
   req=[{k:pipe,n:depth*64,consumed:false}];
  }else{
   var above=Math.max(0,tier-d.drillTier);
   duration=Math.max(1,Math.floor(8/Math.pow(2,above)));eut=7*Math.pow(4,tier);
   var units=Math.round(row[1]*d.drillRange*d.drillRange*(1+above/2));
   var sum=units+(m.drillRemainder&&m.drillRemainder.fluid===f?m.drillRemainder.units:0);
   mb=Math.floor(sum/1000);carry={fluid:f,units:sum%1000};
  }
  return {id:(kind==='gas'?gasMap:oilMap)+':'+where(m)+':'+f,map:kind==='gas'?gasMap:oilMap,
   enabled:true,fake:false,eut:eut,durationTicks:duration,in:[],out:[],fin:[],fout:[{f:f,mb:mb}],req:req,conditions:{},drillCarry:carry};
 }
 function registerSources(kind,table,definition){
  Object.entries(table).forEach(function(entry){
   var dim=entry[0],list=entry[1];
   if(dim!=='overworld'&&!SPACE_DESTINATIONS.get(dim))return;
   list.forEach(function(row){
    var preview=proposal({location:{dim:dim}},definition,kind,list,row);
   var source={dimension:dim};
   if(kind==='gas')source.depth=list.indexOf(row)+1;
   else source.rate=Math.round(row[1]*20/(1000*preview.durationTicks));
   C.registerRecipe(Object.assign({},preview,{automationAllowed:false,extractionSource:source}));
   });
  });
 }
 registerSources('oil',oil,DEFS.of('gregtech:gt.blockmachines@1157'));
 registerSources('gas',gas,DEFS.of('gregtech:gt.blockmachines@14002'));
 function behavior(kind){
  return {
   acceptsItem:function(m,k){return kind==='gas'&&C.canonicalKey(k)===pipe;},
   acceptsFluid:function(){return false;},
   status:function(m,d,make){
    var code=m.status&&m.status.code;
    if(code==='RUNNING'||code==='IDLE')return make('pumping',m,kind==='gas'?'采气中':'抽取中');
   },
   tick:function(m,ctx){
    if(!m.structure||!m.structure.formed)return false;
    if(!DIMENSIONS.open(ctx.state,where(m))){m.status={code:'SOURCE',text:'尚未开通这个维度'};return false;}
    if(!m.job){
     var list=entries(m,kind),row=selected(m,kind,list);
     if(!row){m.status={code:'SOURCE',text:kind==='gas'?'当地空间站没有可采气体':'当地没有地下流体'};return false;}
     var r=proposal(m,STRUCTURES.instance(m),kind,list,row),groups=MULTIBLOCKS.groups(m);
     if(!groups.length)groups=[{uid:null}];
     var best;
     for(var g of groups){
      var options={inputGroup:g.uid,parallelCount:1};
      if(ENGINE.batch.start(m,r,ctx.world,options)){if(r.drillCarry)m.drillRemainder=r.drillCarry;break;}
      best=m.status;
     }
     if(!m.job){m.status=best&&best.code==='ITEM_INPUT'&&kind==='gas'?{code:'MINING_PIPE',text:'需要 '+r.req[0].n+' 根采矿管道'}:best;return false;}
    }
    return ENGINE.batch.tick(m,ctx.world);
   }
  };
 }
 ENGINE.registerBehavior('dimensional_fluid_drill',behavior('oil'));
 ENGINE.registerBehavior('planetary_gas_drill',behavior('gas'));
 RESOURCE_UI.registerPanel('dimensional_drill',function(host,m,S,save){
  var kind=DEFS.of(m.k).behavior==='planetary_gas_drill'?'gas':'oil',list=entries(m,kind);
  var title=document.createElement('div');title.textContent='矿源 · '+DIMENSIONS.name(where(m));host.appendChild(title);
  if(!list.length){var empty=document.createElement('p');empty.textContent=kind==='gas'?'当地空间站没有可采气体':'当地没有地下流体';host.appendChild(empty);return;}
  var label=document.createElement('label'),select=document.createElement('select'),info=document.createElement('p');
  var supply=document.createElement('div'),power=document.createElement('span');power.dataset.powerInput='';
  supply.append('供电（近1秒） ',power);
  label.textContent=kind==='gas'?'深度 ':'流体 ';select.setAttribute('aria-label',kind==='gas'?'采气深度':'开采流体');
  list.forEach(function(row,i){var option=document.createElement('option');option.value=String(i);option.textContent=(kind==='gas'?(i+1)+'层 · ':'')+FLUID_PRESENTATION.name(row[0]);select.appendChild(option);});
  label.appendChild(select);host.append(label,info,supply);
  select.onchange=function(){
   var i=Number(select.value);
   if(kind==='gas')m.gasDepth=i+1;else m.drillFluid=list[i][0];
   if(save)save();host._refresh();
  };
  host._refresh=function(){
   var row=selected(m,kind,list),value=String(list.indexOf(row));if(select.value!==value)select.value=value;
   var d=STRUCTURES.instance(m),details=kind==='gas'?'需 '+(list.indexOf(row)+1)*64+' 根采矿管道':'';
   if(m.structure&&m.structure.formed){
    var r=proposal(m,d,kind,list,row),mb=r.fout[0].mb;
    if(r.drillCarry)mb+=r.drillCarry.units/1000-(m.drillRemainder&&m.drillRemainder.fluid===r.drillCarry.fluid?m.drillRemainder.units/1000:0);
    var rate=Math.round(mb*20/GAME_TIME.ticks(S,r.durationTicks));
    details+=(details?' · ':'')+'流量 '+rate.toLocaleString()+' mB/s · 功率 '+r.eut.toLocaleString()+' EU/t';
   }
   if(info.textContent!==details)info.textContent=details;
   var input=RESOURCE_UI.powerInputText(m);if(power.textContent!==input)power.textContent=input;
  };
  host._refresh();
 });
 root.DIMENSIONAL_DRILLS={entries:entries,proposal:proposal};
})(typeof window!=='undefined'?window:globalThis);
