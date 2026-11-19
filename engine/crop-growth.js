(function (root) {
  'use strict';
  const {crops,soils,mutations,pools} = GD.cropsNH;
  const traitNames = ['growth','gain','resistance'];
  const variations = {
    spreading:[[-1,0,0],[0],[0,0,0,1,2,3,4]],
    breeding:[[-1,-1,0,1,1],[-2,-1,0,1,2],[0,0,0,1,2,3,4]]
  };
  function soilFits(seed, key) {
    return !!crops[seed?.species] && (soils[crops[seed.species].soil]||[]).includes(key);
  }
  function bottomFits(requirements,key) {
    return !(requirements?.length)||requirements.every(group=>group.includes(key));
  }
  function lightFits(crop,S) {
    const day=ENVIRONMENT.daySeconds;
    const light=(S.env?.elapsed||0)%day<day/2?15:7;
    return light>=(crop.minLight||0)&&light<=(crop.maxLight??15);
  }
  function nutrients(liked,water,fertilizer) {
    return 7+Math.min(2,liked)*14+Math.ceil(Math.min(100,water)/10)+Math.ceil(Math.min(100,fertilizer)/10);
  }
  function rate(seed,water,fertilizer,tags) {
    const crop = crops[seed.species];
    const liked=crop.liked.reduce((n,tag)=>n+(tag==='PLAINS'||tags?.has(tag)?1:0),0);
    const surplus = nutrients(liked,water,fertilizer)*5-crop.tier*10;
    return Math.max(0,Math.floor((6+seed.growth)*(100+surplus*(surplus<0?4:1))/100));
  }
  function progress(plot) {
    return plot.seed ? Math.min(1,plot.points/crops[plot.seed.species].duration) : 0;
  }
  function parents(farm,pos) {
    return (FARM_FIELDS.neighbors[pos]||[]).map(index=>({plot:farm.plots[index],index}))
      .filter(entry=>entry.plot?.seed&&!entry.plot.weeds&&progress(entry.plot)>=(crops[entry.plot.seed.species].crossing??0.8));
  }
  const mutationsByParent=new Map();
  const poolsByParent=new Map();
  for(const [rows,index,members] of [[mutations,mutationsByParent,row=>row.parents],[pools,poolsByParent,row=>row]]) {
    for(const row of rows) for(const id of members(row)) {
      const list=index.get(id)||[];
      list.push(row);
      index.set(id,list);
    }
  }
  function choices(ids,machine) {
    return [...new Set(Array.from(ids.keys()).flatMap(id=>mutationsByParent.get(id)||[]))]
      .filter(row=>(machine||!row.machineOnly)&&row.parents.every(id=>ids.has(id)));
  }
  function offspring(list,species,roll,machine) {
    const spreading = list.length===1;
    const fert = Math.min(...list.map(p=>p.fertilizer||0));
    const variation = variations[spreading?'spreading':'breeding'][fert>=101?2:fert>=50?1:0];
    const child = {species,scanned:false};
    for (const trait of traitNames) {
      const average = Math.floor(list.reduce((n,p)=>n+p.seed[trait],0)/list.length);
      child[trait] = Math.max(1,Math.min(31,average+(machine?0:variation[roll(variation.length)])));
    }
    return child;
  }
  function breed(farm,pos,roll) {
    if (roll(3)!==0) return null;
    const candidates = parents(farm,pos).map(entry=>entry.plot);
    if (!candidates.length) return null;
    const ids = new Set(candidates.map(p=>p.seed.species));
    let group, species;
    if (roll(2)===0) {
      species=candidates[roll(candidates.length)].seed.species;
      group=candidates.filter(p=>p.seed.species===species);
    } else if (candidates.length>=2) {
      const matched = choices(ids,false).filter(row=>bottomFits(row.bottom,farm.plots[pos].bottom));
      if (matched.length) {
        const row=matched[roll(matched.length)];
        species=row.to;
        group=candidates.filter(p=>row.parents.includes(p.seed.species));
      } else {
        const available=[...new Set([...ids].flatMap(id=>poolsByParent.get(id)||[]))]
          .filter(pool=>Array.from(ids).every(id=>pool.includes(id)));
        if (available.length) {
          const pool=available[roll(available.length)];
          species=pool[roll(pool.length)];
          group=candidates.filter(p=>pool.includes(p.seed.species));
        }
      }
    }
    return group&&soilFits({species},farm.plots[pos].soil)&&!(crops[species].bedTier)
      ? offspring(group,species,roll,false) : null;
  }
  function harvest(seed, roll, multiplier=1) {
    const out=new Map(), expected=harvestRounds(seed)*multiplier;
    const rounds=Math.floor(expected)+(roll(10000)<(expected%1)*10000?1:0);
    for (let i=0;i<rounds;i++) for (const [k,n,chance=10000] of crops[seed.species].drops) {
      if (roll(10000)<chance) out.set(k,(out.get(k)||0)+n+(roll(100)<=seed.gain?1:0));
    }
    return Array.from(out,([k,n])=>({k,n}));
  }
  function harvestRounds(seed) {
    const crop=crops[seed.species];
    return (crop.dropChance||0.95**crop.tier)*1.03**seed.gain;
  }
  root.CROP_GROWTH = {crops,soils,mutations,soilFits,bottomFits,lightFits,parents,progress,nutrients,rate,breed,choices,offspring,harvest,harvestRounds};
})(typeof window !== 'undefined' ? window : globalThis);
