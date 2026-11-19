/* Finite scene deposits. Pump instances own actual reusable mining-pipe columns. */
(function(root){
 'use strict';var rules=GD.pumpRules,TX=GTTransactions,C=CONTENT;if(!rules)return;
 // Volumes, depth and search effort replace 3D world geometry in this idle game.
 var profiles={oil:{name:'地表原油泉',f:'oil',depth:8,time:90,icon:'gregtech:gt.blockmachines@1140'}};
 function ensure(S){if(!S.mechanisms)S.mechanisms={};return S.mechanisms.worldLiquids||(S.mechanisms.worldLiquids={version:1,seq:0,fields:[]});}
 function field(S,id){return ensure(S).fields.find(function(f){return f.id===id;});}
 function discover(S,type){var p=profiles[type];if(!p)return{ok:false,code:'SOURCE'};var w=ensure(S),n=++w.seq,mb=250000+ACTIVITIES.random(w,51)*10000,f={id:'liquid'+n,type:type,name:p.name+' '+n,dim:'overworld',f:p.f,initial:mb,remaining:mb,depth:p.depth,extracted:0};w.fields.push(f);return{ok:true,field:f};}
 function definition(m){var d=DEFS.of(m.k);return d&&d.behavior==='world_fluid_pump'?d:null;}
 function fail(m,code,text){m.status={code:code,text:text};return false;}
 function column(m){return m.installedItems&&m.installedItems.pipeColumn;}
 function retract(m){var d=definition(m);if(!d)return{ok:false,code:'MACHINE'};var p=column(m),outputs=p?TX.planOutput(m.outs,[TX.clone(p)],d.slots.out,function(k){return C.maxStack(k);}):m.outs;if(!outputs)return{ok:false,code:'ITEM_OUTPUT'};
  m.outs=outputs;if(m.installedItems)delete m.installedItems.pipeColumn;m.pumpFieldId=null;m.pumpClock=0;return{ok:true,moved:p?p.n:0};}
 function bind(S,m,id){if(!definition(m))return{ok:false,code:'MACHINE'};if(m.location&&m.location.kind==='world-site'&&id&&id!==m.location.siteId)return{ok:false,code:'SOURCE'};if(!id)return retract(m);var f=field(S,id);if(!f)return{ok:false,code:'SOURCE'};if(root.TRAVEL&&!TRAVEL.can(S,f.dim))return{ok:false,code:'DIMENSION'};if(!(f.remaining>0))return{ok:false,code:'DEPLETED'};if(m.pumpFieldId===id)return{ok:true,moved:0};var r=retract(m);if(!r.ok)return r;m.pumpFieldId=id;return r;}
 function install(m,f){var old=column(m),held=old?old.n:0;if(old&&old.k!==rules.miningPipe)return false;var need=f.depth-held;if(need<=0)return true;
  var plan=TX.planIngredients(m.ins,[{k:rules.miningPipe,n:need}],function(r,s){return !TX.isInstance(s)&&C.canonicalKey(s.k)===r.k;});if(!plan)return false;
  m.ins=plan.remaining;if(!m.installedItems)m.installedItems={};m.installedItems.pipeColumn={k:rules.miningPipe,n:f.depth};return true;
 }
 function tick(m,ctx){var S=ctx.state,d=ctx.definition,f=S&&field(S,m.pumpFieldId);if(!f)return fail(m,'SOURCE','先在世界寻找原油泉，再选择抽取地点');if(root.TRAVEL&&!TRAVEL.can(S,f.dim))return fail(m,'DIMENSION','尚未开通液池所在维度');if(!(f.remaining>0))return fail(m,'DEPLETED','液池已抽干，可回收采矿管道');if(m.eu<d.energyPerDraw)return fail(m,'ENERGY','每次抽取需要 '+d.energyPerDraw+' EU');
  var n=Math.min(d.bucketMb,f.remaining),fluid=TX.planFill(m.tanksOut,[{f:f.f,mb:n}],d.fluidOutputTanks);if(!fluid)return fail(m,'FLUID_OUTPUT','流体输出堵塞，保留液池和进度');if(!install(m,f))return fail(m,'MINING_PIPE','输入槽需要采矿管道 '+f.depth+' 根，作为可回收的下探管柱');
  m.pumpClock=root.GAME_TIME?GAME_TIME.advance(S,m.pumpClock,d.intervalTicks,1):(m.pumpClock||0)+1;if(m.pumpClock<d.intervalTicks){m.status={code:'PUMPING',text:'抽取 '+(GD.fluids[f.f]||f.f)+'，'+m.pumpClock+'/'+d.intervalTicks+' tick'};return false;}
  m.pumpClock=0;m.tanksOut=fluid;m.eu-=d.energyPerDraw;m.energySpent=(m.energySpent||0)+d.energyPerDraw;m.pumpProduced=(m.pumpProduced||0)+n;m.pumpDraws=(m.pumpDraws||0)+1;f.remaining-=n;f.extracted=(f.extracted||0)+n;m.status={code:'PUMPED',text:'已抽取 '+n+' mB，液池剩余 '+f.remaining+' mB'};return true;
 }
 // Production slot helpers must reject payload instances, not just packed entities.
 var defs=rules.tiers.map(function(p){var d=Object.assign({},p,{cat:'world_fluid_pump',cn:({LV:'基础泵',MV:'优质泵',HV:'进阶泵'})[p.tag],behavior:'world_fluid_pump',recipeMap:'none:world_fluid_pump',volt:DEFS.voltOf(p.tier),maxRecipeEUt:0,energyCapacity:DEFS.voltOf(p.tier)*64,startEnergy:0,amperage:2,noOverclock:true,controlCircuit:false,autoItems:true,autoFluids:true,slots:{in:2,out:2,fluid:p.fluidCapacity},fluidInputTanks:[],fluidOutputTanks:[p.fluidCapacity],uiPanels:['world_fluid_pump']});GD.extraMachineDefinitions.push(d);return d;});
 defs.forEach(function(d){GD.items[d.key]=d.cn;});GD.machines.cats.push({id:'world_fluid_pump',cn:'天然液池泵',slots:{in:2,out:2,fluid:16000},tiers:defs.map(function(d){return{t:d.tier,k:d.key,name:d.cn,tag:d.tag};})});
 ENGINE.registerBehavior('world_fluid_pump',{
  gate:function(m,d){if(m.location&&m.location.kind==='world-site'&&!m.siteReady)return{status:{code:'SITE_SETUP',text:'先安装供电设备和储罐'}};return null;},
  tick:tick,acceptsItem:function(m,k){return C.canonicalKey(k)===rules.miningPipe;},acceptsFluid:function(){return false;}});
 var oilSearch={id:'find_liquid_oil',name:'寻找'+profiles.oil.name,time:profiles.oil.time,dim:'overworld',scene:'天然液池',icon:profiles.oil.icon,out:[],outputDescription:'发现一处原油泉（250,000～750,000 mB），需部署泵和投入采矿管道',effortTimeIsIdleDesign:true,effect:function(S){discover(S,'oil');}};
 GD.sources.push(oilSearch);ACTIVITIES.register(oilSearch);
 RESOURCE_UI.registerPanel('world_fluid_pump',function(host,m,S,save){var row=document.createElement('label');row.textContent='抽取地点 ';var select=document.createElement('select');select.dataset.pumpField='1';row.appendChild(select);host.appendChild(row);var button=document.createElement('button');button.className='btn';button.dataset.pumpRetract='1';button.textContent='停抽并回收采矿管至输出槽';host.appendChild(button);var info=document.createElement('p');host.appendChild(info);var signature='';
  function options(){var fields=ensure(S).fields,next=JSON.stringify(fields.map(function(f){return[f.id,f.name,f.remaining>0];}));if(next===signature)return;signature=next;select.innerHTML='';var empty=document.createElement('option');empty.value='';empty.textContent='选择已发现的油泉';select.appendChild(empty);fields.filter(function(f){return !m.location||m.location.kind!=='world-site'||f.id===m.location.siteId;}).forEach(function(f){var o=document.createElement('option');o.value=f.id;o.textContent=f.name+'，'+(GD.fluids[f.f]||f.f)+(f.remaining>0?'':'（已抽干）');o.disabled=f.remaining<=0&&f.id!==m.pumpFieldId;select.appendChild(o);});select.value=m.pumpFieldId||'';}
  function report(r){if(typeof markInv==='function')markInv();if(save)save();if(typeof toastAt==='function')toastAt(null,r.ok?(r.moved?'采矿管道 '+r.moved+' 根已回收到机器输出槽':'抽取地点已更新'):({SOURCE:'先在世界寻找原油泉',DEPLETED:'该液池已抽干',DIMENSION:'尚未开通液池所在维度',ITEM_OUTPUT:'输出槽没有回收采矿管的空间'})[r.code]||r.code);select.value=m.pumpFieldId||'';host._refresh();}
  select.onchange=function(){report(bind(S,m,select.value));};button.onclick=function(){report(retract(m));};host._refresh=function(){options();var d=definition(m),f=field(S,m.pumpFieldId),p=column(m);info.textContent=(f?f.name+'，剩余 '+f.remaining+'/'+f.initial+' mB，需下探 '+f.depth+' 根管道':'前往世界寻找原油泉')+'；已装管道 '+(p?p.n:0)+' 根；每 '+d.intervalTicks+' tick 抽取至多1000 mB，耗 '+d.energyPerDraw+' EU；累计 '+(m.pumpProduced||0)+' mB。输出堵塞、停用或收回设备时保留余量与进度。';};host._refresh();
 });
 root.PUMPS={rules:rules,profiles:profiles,ensure:ensure,field:field,discover:discover,bind:bind,retract:retract,install:install,definitions:defs};DEFS.rebuild();
})(typeof window!=='undefined'?window:globalThis);
