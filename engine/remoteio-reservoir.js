(function(root){
 'use strict';
 var key='RIO:tile.machine@0', behavior='remoteio_reservoir', ports=TRANSPORT_PORTS;
 var perSecond=1000, period=20;
 var definition={
  key:key,cat:behavior,cn:GD.items[key],entityName:GD.items[key],behavior:behavior,recipeMap:'none:'+behavior,
  tag:'供水',tier:0,volt:0,energyCapacity:0,startEnergy:0,amperage:0,
  slots:{in:0,out:0,fluid:0},fluidInputTanks:[],fluidOutputTanks:[],
  noItemPort:true,noFaceSettings:true,supportsCovers:true,runSwitch:false,
  coverApplies:function(cover){return cover.type==='pump'&&cover.mode==='export';},
  autoItems:false,defaultAutoFluids:false,autoFluidPeriodTicks:period,windowWidth:330,uiPanels:[behavior]
 };
 GD.extraMachineDefinitions.push(definition);
 GD.machines.cats.push({id:behavior,cn:definition.cn,slots:definition.slots,tiers:[{t:0,k:key,name:definition.cn,tag:definition.tag}]});
 DEFS.rebuild();

 function source(m,id,amount,splitOutput){
  // These tanks represent the current transport offer. They never belong to the entity or save.
  return {id:id+m.uid,kind:'output',object:m,splitOutput:splitOutput,transient:true,
   tanks:[{f:'water',mb:amount}],caps:[amount],valid:function(){return ENTITIES.active(m);}};
 }
 function matches(m){return m&&m.k===key&&ENTITIES.active(m);}
 var pulls=new WeakMap();
 function pull(m){
  var tick=ENGINE.tick||0,entry=pulls.get(m);
  if(!entry||entry.tick!==tick){
   entry={tick:tick,port:source(m,'water-pull:',Number.MAX_SAFE_INTEGER,false)};
   pulls.set(m,entry);
  }
  return entry.port;
 }
 ports.register({
  supports:function(c){if(matches(c.index[c.cell]))return c.kind==='fluid';},
  resolve:function(c){
   var m=c.index[c.cell];
   if(!matches(m))return;
   return c.kind==='fluid'&&c.direction==='export'?pull(m):null;
  },
  resources:function(c){
   var result=[];
   for(var m of c.board.machines){
    if(!matches(m)||!ENTITIES.isGrid(m))continue;
    result.push(pull(m));
    if(m.autoFluids&&c.tick%period===0)result.push(source(m,'o:',perSecond,true));
   }
   return result;
  }
 });
 ENGINE.registerBehavior(behavior,{
  noItemPort:true,
  tick:function(m){m.status={code:'PRODUCING_WATER',text:'四面均可抽水'};return false;},
  acceptsItem:function(){return false;},
  acceptsFluid:function(){return false;}
 });
 RESOURCE_UI.registerPanel(behavior,function(host,m,S,save){
  var info=document.createElement('p'),button=document.createElement('button');
  info.textContent='四面均可抽水';
  button.type='button';
  button.className='io-toggle';
  button.dataset.reservoirPush='';
  button.setAttribute('role','switch');
  button.innerHTML='<span>自动供水 · 1,000 mB/s</span><i class="io-switch-track" aria-hidden="true"></i>';
  function refresh(){button.setAttribute('aria-checked',String(!!m.autoFluids));}
  button.onclick=function(){
   m.autoFluids=!m.autoFluids;
   m.auto=m.autoFluids;
   refresh();
   if(save)save();
  };
  host.append(info,button);
  refresh();
 });
})(typeof window!=='undefined'?window:globalThis);
