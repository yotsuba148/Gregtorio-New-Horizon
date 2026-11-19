(function () {
  'use strict';
  const {managerIds,fertilizerItems,feedFluids}=GD.cropsNH.equipment;
  const opts=[['harvest','收获'],['water','浇水'],['fertilizer','施肥'],['weedEx','除草']];
  function local(S,m) {
    const board=(S.fx.blueprints||[]).find(board=>board.id===m.location?.blueprintId);
    return (board?.dimension||board?.dim||m.location?.dim||'overworld')==='overworld';
  }
  function applyFluid(m,p,field,cap,step) {
    for (let i=0;i<m.tanksIn.length;i++) {
      const tank=m.tanksIn[i], potency=tank&&feedFluids[field][tank.f];
      if (!potency) continue;
      const amount=Math.min(tank.mb,Math.ceil((step||cap-(p[field]||0))/potency));
      if (field==='weedEx'&&amount*potency<step) continue;
      m.tanksIn[i]=amount<tank.mb?{f:tank.f,mb:tank.mb-amount}:null;
      return field==='weedEx'?Math.min(cap,(p[field]||0)+75):Math.min(cap,(p[field]||0)+potency*amount);
    }
    return 0;
  }
  function fertilize(m,p) {
    const current=p.fertilizer||0, liquid=applyFluid(m,p,'fertilizer',200);
    if (liquid) return liquid;
    if (current>75) return 0;
    const index=m.ins.findIndex(s=>s&&(fertilizerItems[s.k]?.units||Infinity)<=s.n);
    if (index<0) return 0;
    const item=m.ins[index], spec=fertilizerItems[item.k];
    m.ins[index]=item.n>spec.units?{k:item.k,n:item.n-spec.units}:null;
    return Math.min(200,current+spec.potency);
  }
  function tick(m,ctx) {
    if (ctx.tick%50!==0 || !local(ctx.state,m)) return false;
    const S=ctx.state, farm=FARM_FIELDS.managedBy(S,m.uid);
    if (!farm) return false;
    const def=ctx.definition, primary=def.volt/8, secondary=def.volt/32;
    if (m.eu<def.volt) {m.status={code:'ENERGY',text:'作物管理机缺少电力'};return false;}
    const flags=m.cropManager||{};
    let changed=false,blocked=false;
    for (let i=0;i<farm.plots.length;i++) {
      const p=farm.plots[i];
      if (!p?.rack) continue;
      for (const [field,cap,threshold,step] of [['water',200,180,0],['fertilizer',200,180,0],['weedEx',150,75,10]]) {
        if (flags[field]===false||m.eu<secondary||(p[field]||0)>threshold) continue;
        const value=field==='fertilizer'?fertilize(m,p):applyFluid(m,p,field,cap,step);
        if (value) {
          FARMING.treat(farm,p,field,value);
          m.eu-=secondary;
          changed=true;
        }
      }
      if (flags.harvest===false||m.eu<primary||!p.seed||p.points<GD.cropsNH.crops[p.seed.species].duration) continue;
      const r=FARMING.harvestTo(S,i,items=>{
        const output=GTTransactions.planOutput(m.outs,items,def.slots.out,k=>CONTENT.maxStack(k),true,false);
        if (!output) return {ok:false,code:'OUTPUT'};
        m.outs=output;
        return {ok:true};
      },{farm,multiplier:1+0.05*def.tier});
      if (r.ok) {m.eu-=primary;changed=true;}
      else if (r.code==='OUTPUT') blocked=true;
    }
    m.status=blocked?{code:'ITEM_OUTPUT',text:'输出槽已满'}:changed?{code:'RUNNING',text:'正在打理苗圃'}:{code:'IDLE',text:'等待作物'};
    return changed;
  }
  ENGINE.registerBehavior('crop_manager',{
    waitsForInput:true,personalStorage:true,
    acceptsItem:(m,k)=>Object.hasOwn(fertilizerItems,k),
    acceptsFluid:(m,f)=>Object.values(feedFluids).some(fluids=>Object.hasOwn(fluids,f)),
    tick
  });
  for (const [tier,key] of managerIds) {
    const volt=DEFS.voltOf(tier),cap=2000*tier;
    GD.extraMachineDefinitions.push({key,cn:GD.items[key],tier,volt,amperage:1,energyCapacity:volt*64,
      behavior:'crop_manager',recipeMap:'cropsnh.recipe.cropManager',slots:{in:6,out:15,fluid:cap},
      fluidInputTanks:[cap,cap,cap],fluidOutputTanks:[],uiPanels:['crop_manager'],runSwitch:true});
  }
  RESOURCE_UI.registerPanel('crop_manager',function(host,m,S,save){
    const fields=document.createElement('select'),bind=document.createElement('button'),actions=document.createElement('div');
    fields.setAttribute('aria-label','管理的田地');
    bind.type='button';bind.className='btn';bind.dataset.cropManagerBind='';host.append(fields,bind,actions);
    let selected=FARM_FIELDS.managedBy(S,m.uid)?.id||FARM_FIELDS.active(S).id,fieldOptions='';
    const modes=opts.map(([field,label])=>{
      const node=document.createElement('label'),toggle=document.createElement('input');
      toggle.type='checkbox';toggle.checked=m.cropManager?.[field]!==false;
      toggle.onchange=function(){(m.cropManager||(m.cropManager={}))[field]=toggle.checked;save?.();};
      node.append(toggle,label);actions.append(node);
      return toggle;
    });
    function update(){
      const allowed=local(S,m);
      const farms=FARM_FIELDS.list(S),signature=JSON.stringify(farms.map(({id,name})=>[id,name]));
      if(signature!==fieldOptions){
        fields.replaceChildren(...farms.map(f=>new Option(f.name,f.id)));
        fields.value=selected;
        fieldOptions=signature;
      }
      fields.disabled=!allowed;
      bind.disabled=!allowed;
      const text=!allowed?'需要主世界产线':FARM_FIELDS.get(S,selected)?.managerUid===m.uid?'取消管理':'管理此田地';
      if(bind.textContent!==text)bind.textContent=text;
      modes.forEach(btn=>{btn.disabled=!allowed;});
    }
    fields.onchange=function(){selected=fields.value;update();};
    bind.onclick=function(){
      if(!local(S,m))return;
      FARM_FIELDS.bind(S,selected,m.uid);
      save?.();update();
    };
    host._refresh=update;update();
  });
  DEFS.rebuild();
})();
