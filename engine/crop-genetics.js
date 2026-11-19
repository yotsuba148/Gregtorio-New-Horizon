(function (root) {
  'use strict';
  const C=CONTENT, seeds=CROP_SEEDS, types=['species','growth','gain','resistance'];
  const names={species:'品种',growth:'生长',gain:'产量',resistance:'抗性'};
  const base='gregtech:gt.metaitem.01@32707', uu='ic2uumatter';
  const geneKey=new RegExp('^'+base.replace(/[.*+?^$${}()|[\]\\]/g,'\\$&')+'~crop-(species|growth|gain|resistance)-([a-zA-Z0-9_-]+)$');
  const crops=GD.cropsNH.crops;

  function decode(key) {
    const m=geneKey.exec(key);
    if (!m) return null;
    if (m[1]==='species') return Object.hasOwn(crops,m[2])?{type:m[1],value:m[2]}:null;
    const n=Number(m[2]);
    return /^[1-9][0-9]?$/.test(m[2])&&n<=31?{type:m[1],value:n}:null;
  }
  function encode(type,value) {
    return base+'~crop-'+type+'-'+value;
  }
  function tooltip(key) {
    const gene=decode(key);
    if (!gene) return '';
    return names[gene.type]+' '+(gene.type==='species'?crops[gene.value].name:gene.value);
  }
  C.registerItemFamily(base,key=>{
    const gene=decode(key);
    if (!gene) return null;
    const item=C.item(base);
    return {...item,k:key,base,name:'作物基因数据球',nbt:{cropGene:gene}};
  });
  const extractor='cropsnh.recipe.cropGeneExtractor', synthesizer='cropsnh.recipe.cropSynthesizer';
  const item=k=>({k,n:1});
  const input=k=>({...item(k),exact:true});
  function minimumTier(crop){return Math.min(12,Math.max(4,crop.machineTier||1));}
  function recipeVoltage(tier){return DEFS.voltOf(tier)*15/16;}
  function recipe(id,map,eut,durationTicks,fields) {
    return Object.assign({id:'cropsnh:'+id,map,eut,durationTicks,enabled:true,fake:false,in:[],req:[],out:[],fin:[],fout:[],conditions:{}},fields);
  }
  function extract(m) {
    const type=m.circuitConfigured&&types[m.circ-1];
    if (!type) return [];
    const seedStack=m.ins.find(p=>p&&seeds.fromItem(p.k));
    const seed=seedStack&&seeds.fromItem(seedStack.k);
    if (!seed||!m.ins.some(p=>p?.k===base)) return [];
    const tier=minimumTier(crops[seed.species]);
    if (DEFS.of(m.k).tier<tier) return [];
    return [recipe('extract:'+type,extractor,recipeVoltage(tier),type==='species'?6000:3000,{
      in:[input(seedStack.k),input(base)],req:[{circuit:m.circ}],out:[item(encode(type,seed[type]))]
    })];
  }
  function synthesize(m) {
    const genes=new Map();
    for (const stack of m.ins) {
      const gene=stack&&decode(stack.k);
      if (gene&&!genes.has(gene.type)) genes.set(gene.type,{...gene,k:stack.k});
    }
    if (genes.size!==types.length) return [];
    const seed=Object.fromEntries(types.map(t=>[t,genes.get(t).value]));
    seed.scanned=true;
    const crop=crops[seed.species], tier=minimumTier(crop);
    if (DEFS.of(m.k).tier<tier) return [];
    const fluid=750*crop.tier+100*(seed.growth+seed.gain+seed.resistance);
    return [recipe('synthesize:'+seed.species,synthesizer,recipeVoltage(tier)*3,
      Math.floor(6000*(1+Math.log(crop.tier)/Math.log(16))),{
        req:types.map(t=>input(genes.get(t).k)),out:[item(seeds.encode(seed))],fin:[{f:uu,mb:fluid}]
      })];
  }
  function define(key,tier,map,fluid,amps,slots) {
    const volt=DEFS.voltOf(tier);
    GD.extraMachineDefinitions.push({key,cn:GD.items[key],tier,volt,amperage:amps,maxRecipeEUt:volt*amps,
      energyCapacity:volt*64*amps,recipeMap:map,behavior:map,slots:{in:slots,out:1,fluid:fluid?32000:0},
      fluidInputTanks:fluid?[32000]:[],fluidOutputTanks:[],controlCircuit:!fluid,noOverclock:true,
      showBatchTelemetry:true,runSwitch:true});
  }
  function register(map,candidates,valid,fluid) {
    ENGINE.registerBehavior(map,{batchProcessing:true,waitsForInput:true,personalStorage:true,
      acceptsItem:(m,k)=>valid(k),acceptsFluid:(m,f)=>!!fluid&&f===fluid,
      tick:(m,ctx)=>ENGINE.batch.tick(m,ctx.world,{...ctx.definition,recipeCandidates:candidates})});
  }
  for (const [tier,extractorKey,synthesizerKey] of GD.cropsNH.equipment.geneTiers) {
    define(extractorKey,tier,extractor,null,1,2);
    define(synthesizerKey,tier,synthesizer,uu,3,4);
  }
  register(extractor,extract,k=>k===base||!!seeds.fromItem(k),null);
  register(synthesizer,synthesize,k=>!!decode(k),uu);
  DEFS.rebuild();
  root.CROP_GENETICS={base,decode,encode,tooltip};
})(typeof window!=='undefined'?window:globalThis);
