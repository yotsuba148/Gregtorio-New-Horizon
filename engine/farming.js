(function (root) {
  'use strict';
  const rack = 'cropsnh:cropSticks@0';
  const limit = FARM_FIELDS.cells.length;
  const revisions = new WeakMap();
  const growth = CROP_GROWTH;
  const soilKeys = new Set(Object.values(growth.soils).flat());
  const bottomKeys = new Set(Object.values(growth.crops).flatMap(crop=>crop.bottom?.flat()||[]));
  const lensKey='cropsnh:plantLens@0', spadeKey='cropsnh:spade@0';
  const preparation = {
    water:{input:'minecraft:water_bucket@0',points:100,maximum:200},
    fertilizer:{input:'cropsnh:fertilizer@0',points:100,maximum:100}
  };
  const handWater=new Set([preparation.water.input,'IC2:itemCellEmpty@1','IguanaTweaksTConstruct:clayBucketWater@0']);
  const emptyWaterContainers=new Map(GD.containerRegistry
    .filter(pair=>pair.fluid==='water'&&pair.amount===1000&&handWater.has(pair.filled))
    .map(pair=>[CONTENT.canonicalKey(pair.filled),CONTENT.canonicalKey(pair.empty)]));
  const ensure=FARM_FIELDS.active;
  function plotAt(S,pos) {
    return ensure(S).plots[pos];
  }
  function revision(S,farm=ensure(S)) {
    return revisions.get(farm)||0;
  }
  function changed(farm) {
    revisions.set(farm,(revisions.get(farm)||0)+1);
  }
  function newPlot(soil=null,bottom=null) {
    return {rack:0,soil,bottom,seed:null,points:0,water:0,fertilizer:0};
  }
  function randomFrom(farm) {
    let value=farm.random;
    return {
      roll:function (max) {
        value=(Math.imul(value,1664525)+1013904223)>>>0;
        return Math.floor(value/4294967296*max);
      },
      commit:function () { farm.random=value; }
    };
  }
  function place(S,pos,layer,key,source) {
    if (!Number.isInteger(pos)||pos<0||pos>=limit) return {ok:false,code:'PLOT'};
    const farm=ensure(S), plot=farm.plots[pos]||newPlot();
    key=CONTENT.canonicalKey(key);
    if (layer==='soil'||layer==='bottom') {
      const allowed=layer==='soil'?soilKeys:bottomKeys;
      if (key&&!allowed.has(key)||layer==='soil'&&plot.seed&&!growth.soilFits(plot.seed,key)) return {ok:false,code:'SOIL'};
      const selected=key||null;
      if (plot[layer]===selected) return {ok:true};
      plot[layer]=selected;
      farm.plots[pos]=plot.rack||plot.soil||plot.bottom?plot:null;
      changed(farm);
      return {ok:true};
    }
    if (layer!=='rack') return {ok:false,code:'PLOT'};
    if (plot.seed||key&&plot.rack>=2||!key&&!plot.rack||key&&key!==rack) return {ok:false,code:'RACK'};
    const consume=key?[{k:rack,n:1}]:[],refund=key?[]:[{k:rack,n:1}];
    const result=COMMANDS.exchange(S,consume,refund,{source,requireOutputSpace:true});
    if (result.ok) {
      const count=plot.rack+(key?1:-1);
      const next=plot.rack&&count?plot:newPlot(plot.soil,plot.bottom);
      next.rack=count;
      farm.plots[pos]=count||next.soil||next.bottom?next:null;
      changed(farm);
    }
    return result;
  }
  function plant(S,pos,key,source) {
    const seed=CROP_SEEDS.fromItem(key);
    if (!seed) return {ok:false,code:'PLANT_ITEM'};
    const crop=growth.crops[seed.species],farm=ensure(S),p=farm.plots[pos];
    if (crop.bedTier) return {ok:false,code:'FARM'};
    if (p?.weeds) return {ok:false,code:'PLANT_WEEDS'};
    if (p?.seed) return {ok:false,code:'PLANT_OCCUPIED'};
    if (p?.rack!==1) return {ok:false,code:'PLANT_RACK'};
    const soil=growth.soilFits(seed,p.soil)?null:growth.soils[crop.soil];
    const bottom=growth.bottomFits(crop.bottom,p.bottom)?null:crop.bottom;
    if (soil||bottom) return {ok:false,code:'SOIL',soil,bottom};
    const result=COMMANDS.exchange(S,[{k:key,n:1}],[],{source});
    if (result.ok) {
      p.seed=seed;
      p.points=0;
      changed(farm);
    }
    return result;
  }
  function canHarvest(p) {
    return !!p?.seed&&!p.weeds&&growth.progress(p)>=1&&growth.bottomFits(growth.crops[p.seed.species].bottom,p.bottom);
  }
  function harvestTo(S,pos,receive,options={}) {
    const farm=options.farm||ensure(S),p=farm.plots[pos];
    if (!p?.seed) return {ok:false,code:'SEED'};
    const crop=growth.crops[p.seed.species];
    const ready=canHarvest(p);
    if (!ready&&!options.remove) return {ok:false,code:'GROWTH'};
    const rng=randomFrom(farm);
    const items=ready?growth.harvest(p.seed,rng.roll,options.multiplier):[];
    if ((options.remove||options.spade&&ready)&&p.seed.resistance>rng.roll(31)) items.push({k:CROP_SEEDS.encode(p.seed),n:1});
    const result=receive(items);
    if (result.ok) {
      rng.commit();
      if (options.remove) {p.seed=null;p.points=0;}
      else {
        p.points=Math.floor(crop.regrowth*crop.duration);
      }
      changed(farm);
    }
    return result;
  }
  function harvest(S,pos,remove) {
    const spade=COMMANDS.owned(S,k=>k===spadeKey).length>0;
    return harvestTo(S,pos,items=>COMMANDS.exchange(S,[],items,{drops:true}),{remove,spade});
  }
  function treat(farm,p,field,value) {
    p[field]=value;
    if (field==='weedEx'&&value>0) delete p.weeds;
    changed(farm);
  }
  function tend(S,pos,field,options={}) {
    const farm=ensure(S),p=farm.plots[pos],rule=preparation[field];
    if (!rule) return {ok:false,code:'PLOT'};
    if (!p?.rack) return {ok:false,code:'CARE_RACK'};
    const current=p[field]||0;
    if (current>=rule.maximum) return {ok:false,code:field==='water'?'WATER_FULL':'FERTILIZER_FULL'};
    const input=options.input||rule.input,empty=field==='water'&&emptyWaterContainers.get(input);
    if (field==='water'&&!empty) return {ok:false,code:'PLANT_ITEM'};
    const result=COMMANDS.exchange(S,[{k:input,n:1}],empty?[{k:empty,n:1}]:[],
      {source:options.source,requireOutputSpace:true});
    if (result.ok) treat(farm,p,field,Math.min(rule.maximum,current+rule.points));
    return result;
  }
  function useItem(S,pos,key,source) {
    const item=CONTENT.canonicalKey(key);
    if (item===rack) return place(S,pos,'rack',item,source);
    if (emptyWaterContainers.has(item)) return tend(S,pos,'water',{input:item,source});
    if (item===preparation.fertilizer.input) return tend(S,pos,'fertilizer',{source});
    return plant(S,pos,key,source);
  }
  function trim(S,pos) {
    const p=plotAt(S,pos);
    if (!p?.rack||!p.weeds) return {ok:false,code:'PLOT'};
    delete p.weeds;
    changed(ensure(S));
    return {ok:true};
  }
  function analyze(S,pos) {
    const p=plotAt(S,pos);
    if (!p?.seed||p.seed.scanned) return {ok:false,code:'SEED'};
    if (!COMMANDS.owned(S,k=>k===lensKey).length) return {ok:false,code:'LENS'};
    p.seed.scanned=true;
    changed(ensure(S));
    return {ok:true};
  }
  function tickField(S,farm,fast) {
    if (!fast && ++farm.cycle<256) return;
    farm.cycle=0;
    const rng=randomFrom(farm),children=[];
    let updated=false;
    farm.plots.forEach(function (p,i) {
      if (p?.rack===2&&!p.seed&&!p.weeds) {
        const child=growth.breed(farm,i,rng.roll);
        if (child) children.push({p,child});
        else if (!fast&&p.soil&&!p.weedEx&&rng.roll(100)===0) {p.weeds=true;updated=true;}
      }
    });
    farm.plots.forEach(function (p) {
      if (!p?.rack) return;
      if (p.seed&&!p.weeds) {
        const crop=growth.crops[p.seed.species];
        if (growth.bottomFits(crop.bottom,p.bottom)&&growth.soilFits(p.seed,p.soil)&&growth.lightFits(crop,S)) {
          const points=Math.min(crop.duration,p.points+(fast?crop.duration:growth.rate(p.seed,p.water,p.fertilizer)));
          if (points!==p.points) {p.points=points;updated=true;}
        }
      }
      if (p.water===preparation.water.maximum||p.fertilizer===preparation.fertilizer.maximum) updated=true;
      if (p.water>0) p.water--;
      if (p.fertilizer>0) p.fertilizer--;
      if (p.weedEx>0) p.weedEx--;
    });
    for (const {p,child} of children) {
      p.seed=child;
      p.rack=1;
      p.points=0;
    }
    rng.commit();
    if (updated||children.length) changed(farm);
  }
  function tick(S) {
    const fast=GAME_TIME.oneTick(S);
    for(const farm of FARM_FIELDS.list(S)) tickField(S,farm,fast);
  }
  root.FARMING={ensure,plotAt,revision,rack,limit,soilKeys,bottomKeys,place,plant,useItem,canHarvest,harvest,harvestTo,treat,tend,trim,analyze,tick};
})(typeof window !== 'undefined' ? window : globalThis);
