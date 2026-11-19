/* GT5U 5.09.51.482 steam water pump and algae pond. No power or input shortcuts. */
(function(root){
 'use strict';var B=MULTIBLOCK_CATALOG,TX=GTTransactions,C=CONTENT;
 function part(k,n){return {k:k,n:n};}function variant(m,k){return m.structure&&m.structure.variant[k]||0;}
 function fail(m,code,text){m.status={code:code,text:text};return false;}
 function recipe(id,map,duration,out,fin){return {id:id,map:map,enabled:true,fake:false,eut:0,durationTicks:duration,in:[],out:out||[],fin:fin||[],fout:[],req:[],conditions:{}};}
 var frames=['gregtech:gt.blockframes@300','gregtech:gt.blockframes@305'];
 var pump=B.basic({id:'steampump',name:'蒸汽水泵',meta:31085,map:'native:steampump',pattern:['fff','fpf','fpf','sCs'],parts:function(v){return [part('gregtech:gt.blockcasings9@2',11),part(frames[Math.min(1,v.frame||0)],10)];},defaultPorts:[31040,61],maintenance:false,minCasing:9,
  upgrades:[B.variants('frame','框架',['青铜','钢'],function(i){return [part(frames[i],10)];})],
  definition:{behavior:'steam_water_pump',inputIsolationFixed:false,energyCapacity:0,startEnergy:0,volt:0,steamPowered:true,steamCapacity:64000,startSteam:0,steamPerEU:0,noOverclock:true,uiPanels:['steam_water_pump']},
  allowed:function(m,f,s){return s.steam||s.type==='fluidOut';},
  portRequirements:{steam:{min:1,max:1},fluidOut:{min:1,max:1}},
  capability:function(m,c){c.voltage=0;c.power=0;}
 });
 pump.materialKey=function(m,c,ch){return ch==='f'?frames[Math.min(1,variant(m,'frame'))]:ch==='s'?'gregtech:gt.blockcasings9@2':null;};
 function waterAmount(m){var climate=WATER.climates[m.waterClimate]||WATER.climates.temperate,dim=m.location&&m.location.dim||'overworld',n=Math.floor(Math.fround(Math.fround(climate.humidity*1500)*(1+variant(m,'frame'))));return ['nether','moon','mars','venus','mercury'].includes(dim)?n:Math.max(250,n);}
 function pumpRecipe(m){var r=recipe('native:steampump:water','native:steampump',20);r.fout=[{f:'water',mb:waterAmount(m)}];return r;}
 ENGINE.registerBehavior('steam_water_pump',{acceptsItem:function(){return false;},acceptsFluid:function(m,f){return /^(steam|ic2steam)$/.test(f);},tick:function(m,ctx){
  if(!m.structure||!m.structure.formed)return fail(m,'STRUCTURE','蒸汽水泵结构未完成');
  if(!m.job){var steam=(m.tanksEnergy||[]).reduce(function(n,t){return n+(t&&/^(steam|ic2steam)$/.test(t.f)?t.mb:0);},0);if(steam<1500)return fail(m,'STEAM','每次需要1500 mB蒸汽');
   if(!ENGINE.batch.start(m,pumpRecipe(m),ctx.world,{inputGroup:null,parallelCount:1}))return false;
   var left=1500;for(var i=0;i<m.tanksEnergy.length&&left;i++){var t=m.tanksEnergy[i];if(!t||!/^(steam|ic2steam)$/.test(t.f))continue;var n=Math.min(left,t.mb);t.mb-=n;left-=n;if(!t.mb)m.tanksEnergy[i]=null;}m.job.fluidInputs=[{f:'steam',mb:1500}];
  }return ENGINE.batch.tick(m,ctx.world);
 }});
 RESOURCE_UI.registerPanel('steam_water_pump',function(host,m,S,save){var label=document.createElement('label');label.textContent='环境 ';var select=document.createElement('select');select.dataset.steamPumpClimate='1';Object.keys(WATER.climates).filter(function(k){return !WATER.climates[k].covered;}).forEach(function(k){var o=document.createElement('option');o.value=k;o.textContent=WATER.climates[k].name;select.appendChild(o);});select.value=m.waterClimate||'temperate';select.onchange=function(){m.waterClimate=select.value;if(save)save();};label.appendChild(select);host.appendChild(label);var info=document.createElement('p');info.className='dim';host.appendChild(info);host._refresh=function(){info.textContent='每20 tick消耗1500 mB蒸汽，产水 '+waterAmount(m)+' mB；钢框架使湿度产水翻倍，普通维度最低250 mB。蒸汽与清水分别使用真实仓室。';};host._refresh();});
 var floors=Array.from({length:10},function(_,i){return 'gregtech:gt.blockcasings@'+i;});
 var algae=B.basic({id:'algae',name:'藻类农场',meta:997,map:'native:algae',pattern:['sssss','saaas','saaas','saaas','ssCss'],parts:function(v){return [part(floors[Math.min(9,v.floor||0)],80),part('miscutils:gtplusplus.blockcasings.2@15',64)];},defaultPorts:[71,81,51],maintenance:false,minCasing:64,
  upgrades:[B.variants('floor','底板等级',floors.map(function(_,i){return DEFS.tagOf(i);}),function(i){return [part(floors[i],77)];})],
  definition:{behavior:'algae_pond',storedFluidFields:{algaeWaterMb:'water'},inputIsolationFixed:false,energyCapacity:0,startEnergy:0,volt:0,noOverclock:true,maxParallel:2,uiPanels:['algae_pond']},
  allowed:function(m,f,s){return !s.steamComponent&&['itemIn','itemOut','fluidIn'].includes(s.type);},
  portRequirements:{fluidIn:{min:1,label:'进水仓'},itemOut:1},
  capability:function(m,c,errors){var ins=B.counted(m,'fluidIn');if(ins.some(function(p){return MULTIBLOCKS.spec(p.k).tier<variant(m,'floor');}))errors.push('进水仓等级低于底板');c.voltage=0;c.power=0;}
 });
 algae.onDisassemble=function(m){m.algaeWaterMb=0;};
 algae.materialKey=function(m,c,ch){return ch==='s'?'miscutils:gtplusplus.blockcasings.2@15':null;};
 var compost='miscutils:item.BasicAgrichemItem@8',biomass='miscutils:item.BasicAgrichemItem@0',durations=[2000,1800,1600,1400,1200,1000,512,256,128,64,32,16,8,4,2,1];
 function random(seed,n){seed.value=(Math.imul(seed.value||1234567,1664525)+1013904223)>>>0;return seed.value%n;}
 function compostNeeded(tier){return tier>1?Math.min(64,Math.pow(2,tier-1)):1;}
 function proposal(m,group,guaranteedOnly,bonus){
  var tier=variant(m,'floor'),need=compostNeeded(tier),use=group.items.reduce(function(n,p){return n+(p&&p.k===compost?p.n:0);},0)>=need,seed={value:m.randomState||1234567};
  if(use)tier++;
  var outputs=[];
  function stack(meta,n){return part(meta===0?biomass:'miscutils:item.BasicAgrichemItem@'+meta,n);}
  function out(meta,n){outputs.push(stack(meta,n));}
  function rare(meta,n){
   if(bonus)bonus.push(Object.assign(stack(meta,n),{chance:909}));
   if(!guaranteedOnly&&random(seed,11)===10)out(meta,n);
  }
  out(0,6);rare(1,2);if(tier>=1){out(0,4);out(1,2);rare(1,4);}if(tier>=2){out(1,5);rare(1,8);}if(tier>=3){out(1,4);out(2,1);rare(2,4);}if(tier>=4){out(2,5);rare(3,4);}if(tier>=5){out(2,4);out(3,2);rare(4,4);}if(tier>=6){out(3,4);out(4,2);rare(4,8);for(var i=0;i<20&&tier>=6+i;i++){out(1,(i+1)*4);out(2,(i+1)*3);out(3,(i+1)*2);out(4,i+1);}}
  var roll=guaranteedOnly?0:random(seed,1000000)/1000000,mult=roll<.96237624?1:roll<.9912871?2:3,r=recipe('native:algae:'+tier+':'+(use?1:0),'native:algae',Math.floor(durations[tier]*mult/2),STRUCTURE_CORE.counts(outputs));if(use)r.in=[part(compost,need)];return {recipe:r,seed:seed.value};
 }
 function fillPool(m){var wanted=Math.max(0,98000-(m.algaeWaterMb||0)),taken=0;for(var i=0;i<m.tanksIn.length&&wanted;i++){var t=m.tanksIn[i];if(!t||t.f!=='water')continue;var n=Math.min(t.mb,wanted);t.mb-=n;wanted-=n;taken+=n;if(!t.mb)m.tanksIn[i]=null;}m.algaeWaterMb=(m.algaeWaterMb||0)+taken;return taken;}
 ENGINE.registerBehavior('algae_pond',{acceptsItem:function(m,k){return C.canonicalKey(k)===compost;},acceptsFluid:function(m,f){return f==='water';},tick:function(m,ctx){
  if(!m.structure||!m.structure.formed)return fail(m,'STRUCTURE','藻类农场结构未完成');fillPool(m);if((m.algaeWaterMb||0)<98000)return fail(m,'NO_WATER','水池需要98000 mB水，已注入 '+(m.algaeWaterMb||0)+' mB');
  if(!m.job){var groups=MULTIBLOCKS.groups(m);if(!groups.length)groups=[{uid:null,items:[]}];var last;for(var group of groups){var p=proposal(m,group);last=ENGINE.batch.check(m,p.recipe,ctx.world,{inputGroup:group.uid});if(last.ok&&ENGINE.batch.start(m,p.recipe,ctx.world,{inputGroup:group.uid})){m.randomState=p.seed;break;}}if(!m.job){m.status=last||{code:'ITEM_OUTPUT',text:'藻类输出空间不足'};return false;}}
  return ENGINE.batch.tick(m,ctx.world);
 }});
 RESOURCE_UI.registerPanel('algae_pond',function(host,m){var info=document.createElement('p');info.className='dim';host.appendChild(info);host._refresh=function(){info.textContent='水池 '+(m.algaeWaterMb||0).toLocaleString()+' / 98,000 mB；首次填满后保留水，不持续耗水。底板决定藻类与生长时间，可选投入实际堆肥提高一级产出；无需电力或维护仓。';};host._refresh();});
 floors.forEach(function(_,floor){
  [false,true].forEach(function(boosted){
   var bonus=[],group={items:boosted?[part(compost,compostNeeded(floor))]:[]};
   var preview=proposal({structure:{variant:{floor:floor}}},group,true,bonus).recipe;
   preview.id=floor===5&&boosted?'algae-pond:iv-compost':'algae-pond:'+floor+':'+(boosted?'compost':'plain');
   preview.algaeFloor=floor;
   preview.out=preview.out.concat(bonus);
   preview.automationAllowed=false;
   preview.patternEncodable=false;
   C.registerRecipe(preview);
  });
 });
 if(root.JEI)JEI.registerParameter(function(r,add){
  if(r.algaeFloor==null)return;
  add('底板等级',DEFS.tagOf(r.algaeFloor));
  add('首次注水','98,000 mB');
 });
 root.UTILITY_MULTIBLOCKS={waterAmount:waterAmount,algaeProposal:proposal,compost:compost};DEFS.rebuild();
})(typeof window!=='undefined'?window:globalThis);
