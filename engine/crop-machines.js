(function () {
  'use strict';
  const crops=CROP_GROWTH.crops, C=CONTENT, B=MULTIBLOCK_CATALOG, MB=MULTIBLOCKS;
  const {enrich,liquid,voltage,bed,controller,casing,part}=GD.cropsNH.devices;
  const cloneMap='cropsnh.recipe.seedGenerator', breedMap='cropsnh.recipe.cropBreeder', farmMap='cropsnh.recipe.industrialFarm';
  const f=(id,mb)=>({f:id,mb});
  const energy=t=>DEFS.voltOf(t)*15/16;
  const tank=t=>t===5?256000:1600*2**(t-1);
  const equipment=GD.cropsNH.equipment, upgrades=CROP_FARM_UPGRADES;
  const key=B.key;
  function recipe(id,map,eut,durationTicks,fields) {
    return Object.assign({id:'cropsnh:'+id,map,eut,durationTicks,enabled:true,fake:false,in:[],req:[],out:[],fin:[],fout:[],conditions:{}},fields);
  }
  function cloneSeeds(m) {
    for (const stack of m.ins) {
      const seed=stack&&CROP_SEEDS.fromItem(stack.k);
      if (!seed) continue;
      const crop=crops[seed.species];
      const catalysts=crop.catalysts||[];
      const item=catalysts.find(([k,n])=>m.ins.some(s=>s?.k===k&&s.n>=n));
      if (catalysts.length&&!item) continue;
      const rate=36*(seed.growth+seed.gain+seed.resistance);
      return [recipe('duplicate:'+seed.species,cloneMap,30,160,{
        req:[{k:stack.k,n:1,exact:true}],in:item?[part(...item)]:[],out:[part(stack.k)],fin:[f(enrich,rate)]
      })];
    }
    return [];
  }
  function breedSeeds(m) {
    const stock=new Map();
    for (const stack of m.ins) {
      const seed=stack&&CROP_SEEDS.decode(stack.k);
      if (seed?.scanned&&!stock.has(seed.species)) stock.set(seed.species,{seed,k:stack.k});
    }
    return CROP_GROWTH.choices(stock,true).flatMap(row=>{
      const hasSetting=Object.hasOwn(m,'cropBottom');
      if(hasSetting&&!CROP_GROWTH.bottomFits(row.bottom,m.cropBottom)) return [];
      const bottom=hasSetting?[]:(row.bottom||[]).map(group=>m.ins.find(s=>s&&group.includes(s.k)));
      if(bottom.some(s=>!s)) return [];
      const catalysts=(row.catalysts||[]).map(([name,n])=>{
        const matches=name.startsWith('ore:')?(C.data.ore[name.slice(4)]||[]).map(i=>C.canonicalKey(C.data.items[i].k))
          :name==='Bricks'?['minecraft:brick_block@0']:[];
        return {k:m.ins.find(s=>s&&matches.includes(s.k)&&s.n>=+n)?.k,n:+n};
      });
      if(catalysts.some(s=>!s.k))return [];
      const parents=row.parents.map(k=>stock.get(k)),
        seed=CROP_GROWTH.offspring(parents,row.to,null,true);
      seed.scanned=true;
      const rate=144*crops[row.to].tier+72*(seed.growth+seed.gain+seed.resistance);
      const tier=crops[row.to].machineTier||1;
      return [recipe('breed:'+row.to,breedMap,energy(tier),Math.floor(400*1.3**(tier-1)),{
        in:parents.map(p=>part(p.k)).concat(catalysts),req:bottom.map(s=>({k:s.k,n:1,exact:true})),
        out:[{k:CROP_SEEDS.encode(seed),n:1,chance:100*Math.min(100,30+10*DEFS.of(m.k).tier)}],fin:[f(enrich,rate)]
      })];
    });
  }
  function addSmall(t,id,behavior,map,slots) {
    GD.extraMachineDefinitions.push({
      key:id,cn:GD.items[id],tier:t,volt:DEFS.voltOf(t),behavior,recipeMap:map,
      energyCapacity:DEFS.voltOf(t)*64,startEnergy:0,slots:{in:slots,out:1,fluid:tank(t)},
      fluidInputTanks:[tank(t)],fluidOutputTanks:[],showBatchTelemetry:true,runSwitch:true,
      uiPanels:map===breedMap?['crop_bottom']:[]
    });
  }
  for (const t of equipment.genTiers) {
    addSmall(t,key(28012+t),'crop_seed_generator',cloneMap,2);
    addSmall(t,key(28024+t),'crop_breeder',breedMap,t<3?3:6);
  }
  function dynamicBehavior(map,candidates,acceptsItem) {
    ENGINE.registerBehavior(map,{
      batchProcessing:true,waitsForInput:true,personalStorage:true,acceptsItem,
      acceptsFluid:(m,f)=>f===enrich,
      tick:function (m,ctx) {
        return ENGINE.batch.tick(m,ctx.world,Object.assign({},ctx.definition,{recipeCandidates:candidates}));
      }
    });
  }
  const catalysts=new Set(Object.values(crops).flatMap(c=>(c.catalysts||[]).map(([k])=>k)));
  const breederItems=new Set();
  for (const row of CROP_GROWTH.mutations) {
    for (const group of row.bottom||[]) for (const k of group) breederItems.add(k);
    for (const [name] of row.catalysts||[]) {
      if (name==='Bricks') breederItems.add('minecraft:brick_block@0');
      else if (name.startsWith('ore:')) for (const i of C.data.ore[name.slice(4)]||[]) breederItems.add(C.canonicalKey(C.data.items[i].k));
    }
  }
  dynamicBehavior('crop_seed_generator',cloneSeeds,(m,k)=>!!CROP_SEEDS.fromItem(k)||catalysts.has(k));
  dynamicBehavior('crop_breeder',breedSeeds,(m,k)=>!!CROP_SEEDS.decode(k)?.scanned||breederItems.has(k));
  const frame='gregtech:gt.blockframes@809', glass='minecraft:glass@0';
  const farm=B.basic({
    id:'crop_industrial_farm',name:GD.items[controller],meta:28055,map:farmMap,
    pattern:['sssss','sgggs','ssCss','sssss'],portTiles:['s'],maintenance:true,
    defaultEnergy:true,defaultPorts:[72,82,52],minCasing:8,
    parts:v=>[part(casing,22),part(glass,4+8*(v.sections||1)),part(bed((v.sections||1)+1),3*(v.sections||1)),part(frame,4+(v.sections||1)),...upgrades.parts(v)],
    upgrades:upgrades.groups,
    resize:v=>({h:3+(v.sections||1),cx:2,cy:2+(v.sections||1)}),
    allowed:(m,face,s)=>!s.steamComponent&&['energy','itemIn','itemOut','fluidIn'].includes(s.type),
    portRequirements:{energy:1,itemIn:1,itemOut:1,fluidIn:1},
    materialKey:(m,cell,ch)=>ch==='g'?glass:ch==='b'?bed(m.structureSize.sections+1):casing,
    definition:{behavior:'crop_industrial_farm',tier:2,volt:128,energyCapacity:8192,showBatchTelemetry:true,
      inputIsolationFixed:false,noOverclock:true,controlCircuit:false,runSwitch:true,autoFluids:false,slots:{in:0,out:0,fluid:0},
      uiPanels:['crop_industrial_farm','crop_bottom']},
    capability:upgrades.validate
  });
  farm.dimensions=[{key:'sections',label:'苗床等级',min:1,max:Math.max(...equipment.bedTiers)-1,initial:1,
    choices:equipment.bedTiers.map(t=>[t-1,voltage[t]])}];
  farm.visualPattern=m=>['sssss','sgggs',...Array(m.structureSize?.sections||1).fill('sbbbs'),'ssCss'];
  farm.anchor=m=>({x:2,y:2+(m.structureSize?.sections||1)});
  farm.materialKey=(m,c,ch)=>ch==='g'?glass:ch==='b'?bed((m.structureSize?.sections||1)+1):casing;
  farm.acceptsFluid=(m,id)=>['water','ic2distilledwater',liquid,enrich].includes(id);
  // All seeds with matching traits are counted together. They remain in the input buses.
  function seedStock(groups) {
    const stock=new Map();
    for (const group of groups) for (const s of group.items) {
      if (!s) continue;
      const seed=CROP_SEEDS.fromItem(s.k);
      if (!seed) continue;
      const entry=stock.get(s.k)||{seed,k:s.k,n:0,group};
      entry.n+=s.n;
      stock.set(s.k,entry);
    }
    return stock.size===1?stock.values().next().value:null;
  }
  function capacity(t) {return (7+4*t)**2;}
  function liquidPlan(tanks,types,points) {
    const plan=[];
    let left=points;
    for (const [id,potency] of types) {
      let total=0;
      for (const tank of tanks) if (tank?.f===id) total+=tank.mb;
      const used=Math.min(total,Math.ceil(left/potency));
      if (used>0) {plan.push(f(id,used));left-=used*potency;}
      if (left<=0) return plan;
    }
    return null;
  }
  function grow(m,ctx) {
    if (!m.structure?.formed) return false;
    if (!m.job) {
      const fail=(code,text)=>{m.status={code,text};return false;};
      if (!GAME_TIME.oneTick(ctx.state)&&ctx.tick%20!==0) return false;
      const tier=(m.structureSize?.sections||1)+1;
      const groups=MB.groups(m), stock=seedStock(groups);
      if (!stock) return fail('SEED','放入一种作物种子');
      const crop=crops[stock.seed.species];
      const n=Math.min(capacity(tier),stock.n);
      if (crop.bedTier>tier) return fail('BED','苗床等级不足');
      if (Object.hasOwn(m,'cropBottom')) {
        if (!CROP_GROWTH.bottomFits(crop.bottom,m.cropBottom)) return fail('SUBSOIL','请选择合适的底土');
      } else {
        for (const accepted of crop.bottom||[]) {
          let bottoms=0;
          for (const group of groups) for (const s of group.items) if (s&&accepted.includes(s.k)) bottoms+=s.n;
          if (bottoms<n) return fail('SUBSOIL','请选择合适的底土');
        }
      }
      const settings=upgrades.parameters(m,groups,MB.validate(m)?.power||0);
      const points=Math.ceil(capacity(tier)*100/256)*settings.extraFluids, tanks=m.tanksIn;
      const water=liquidPlan(tanks,[['ic2distilledwater',2],['water',1]],points);
      if (!water) return fail('WATER','水量不足');
      const fertilizer=liquidPlan(tanks,settings.requiresEnriched?[[enrich,1]]:[[enrich,10],[liquid,1]],points);
      if (settings.requiresEnriched&&!fertilizer) return fail('FERTILIZER','需要富集肥料');
      const speed=CROP_GROWTH.rate(stock.seed,200,fertilizer?200:0,settings.tags);
      if (!speed) return fail('GROWTH','作物无法在当前苗床生长');
      const previous=m.cropYield?.seed===stock.k?m.cropYield.fraction:{};
      const next={},out=[];
      const cycles=100/256/Math.ceil(crop.duration/speed)*settings.speed, rounds=settings.harvesting*cycles*n*CROP_GROWTH.harvestRounds(stock.seed);
      for (const [k,count,chance=10000] of crop.drops) {
        const exact=(previous[k]||0)+rounds*(count+(stock.seed.gain+1)/100)*(chance/10000);
        const amount=Math.floor(exact);
        next[k]=exact-amount;
        if (amount) out.push(part(k,amount));
      }
      const r=recipe('farm:'+stock.seed.species,farmMap,settings.eut,100,
        {out,fin:water.concat(fertilizer||[]),cropYield:{seed:stock.k,fraction:next}});
      if (!ENGINE.batch.start(m,r,ctx.world,{inputGroup:stock.group.uid,parallelCount:1,skipBatch:true})) return false;
    }
    const job=m.job;
    const changed=ENGINE.batch.tick(m,ctx.world,ctx.definition);
    if (job&&!m.job) m.cropYield=job.recipe.cropYield;
    return changed;
  }
  ENGINE.registerBehavior('crop_industrial_farm',{
    batchProcessing:true,acceptsItem:(m,k)=>!!CROP_SEEDS.fromItem(k)||FARMING.bottomKeys.has(k)||Object.hasOwn(equipment.biomeByKey,k),tick:grow
  });
  RESOURCE_UI.registerPanel('crop_industrial_farm',function (host,m) {
    const info=document.createElement('span');
    info.className='dim';
    host.appendChild(info);
    host._refresh=function () {
      const tier=(m.structureSize?.sections||1)+1, stock=seedStock(MB.groups(m));
      const name=stock?crops[stock.seed.species].name:'种子';
      const value=name+' '+Math.min(capacity(tier),stock?.n||0).toLocaleString()+' / '+capacity(tier).toLocaleString();
      if (info.textContent!==value) info.textContent=value;
    };
    host._refresh();
  });
  RESOURCE_UI.registerPanel('crop_bottom',function(host,m,S,save){
    const label=document.createElement('label'), select=document.createElement('select');
    label.className='crop-bottom-setting';
    select.dataset.cropBottom='';
    const options=Array.from(FARMING.bottomKeys,k=>new Option(GD.items[k]||k,k));
    options.sort((a,b)=>a.text.localeCompare(b.text,'zh-CN'));
    select.append(new Option('无',''),...options);
    select.value=m.cropBottom||'';
    select.onchange=function(){
      const key=select.value;
      if (key&&!FARMING.bottomKeys.has(key)) return;
      m.cropBottom=key;
      save?.();
    };
    label.append('底土',select);
    host.append(label);
  });
  DEFS.rebuild();
})();
