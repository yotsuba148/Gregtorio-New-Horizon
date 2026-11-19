(function (root) {
  'use strict';
  const {upgradeTypes,upgradeKey,bedTiers,biomeByKey}=GD.cropsNH.equipment;
  const [growth,fertilizer,harvest,environment,overclock]=upgradeTypes;
  const count=(variant,type)=>variant?.[type.id]||0;
  const tier=m=>(m.structureSize?.sections||1)+1;
  const total=v=>upgradeTypes.reduce((sum,type)=>sum+count(v,type),0);
  const conflict=v=>count(v,growth)>0&&count(v,overclock)>0;

  const groups=upgradeTypes.map(type=>({
    field:type.id,label:type.name,amounts:true,
    options:Array.from({length:type.max+1},(_,i)=>i?String(i):'未安装'),
    allows(m,value){
      if (!value) return true;
      const t=tier(m);
      const next={...m.structure?.variant,[type.id]:value};
      return CONTENT.item(upgradeKey(type.id,t))&&total(next)<t&&!conflict(next);
    },
    parts(n,m){
      if (!n) return [];
      const tiers=m?[tier(m)]:bedTiers;
      return tiers.map(t=>upgradeKey(type.id,t)).filter(k=>CONTENT.item(k)).map(k=>({k,n}));
    }
  }));

  function parts(variant) {
    const t=(variant.sections||1)+1;
    return groups.flatMap(g=>g.parts(variant[g.field]||0,{structureSize:{sections:t-1}}));
  }
  function validate(m,c,errors) {
    const v=m.structure?.variant;
    const oc=count(v,overclock), t=tier(m);
    if (c.voltage<DEFS.voltOf(t)) errors.push('能源仓等级低于苗床');
    if (total(v)>=t) errors.push('升级单元数量超过苗床层数');
    if (conflict(v)) errors.push('普通和超频生长加速单元不能同时安装');
    if (upgradeTypes.some(type=>count(v,type)&&!CONTENT.item(upgradeKey(type.id,t)))) errors.push('升级单元等级与苗床不匹配');
    const energy=MULTIBLOCKS.ports(m).map(p=>MULTIBLOCKS.spec(p.k)).filter(p=>p.type==='energy');
    const multi=energy.filter(p=>p.amperage>2);
    if (multi.length&&(!oc||multi.length!==1||energy.length!==1)) errors.push('多安能源仓需要超频单元且只能单独安装');
    if(oc&&multi.length===1) c.power=multi[0].voltage*multi[0].amperage;
  }
  function parameters(m,groups,power) {
    const v=m.structure?.variant;
    const t=tier(m), nGrowth=count(v,growth), nFert=count(v,fertilizer),
      nHarvest=count(v,harvest), nEnv=count(v,environment);
    const base=DEFS.voltOf(t)*15/16;
    const eu=Math.floor(base*(1+1.25*nGrowth+0.5*(nFert+nHarvest+nEnv)));
    const oc=count(v,overclock)&&power>=eu?Math.floor(Math.log(power/eu)/Math.log(4)):0;
    const tags=new Set();
    if (nEnv) for (const group of groups) for (const s of group.items) {
      const tag=s&&biomeByKey[s.k];
      if (tag&&tags.size<nEnv) tags.add(tag);
    }
    return {eut:eu*4**oc,extraFluids:2**oc,speed:(1+nGrowth)*2**oc*(nFert?1.5:1),
      harvesting:(1+0.2*t+0.5*nFert)*(1+0.2*nHarvest),requiresEnriched:!!nFert,tags};
  }
  root.CROP_FARM_UPGRADES={groups,parts,validate,parameters};
})(typeof window!=='undefined'?window:globalThis);
