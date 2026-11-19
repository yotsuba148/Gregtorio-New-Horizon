(function (root) {
  'use strict';
  const crops = GD.cropsNH.crops;
  const key = 'cropsnh:genericSeed@0';
  const wire = /^cropsnh:genericSeed@0~([A-Za-z][A-Za-z0-9_-]*)\.([1-9]|[12][0-9]|3[01])\.([1-9]|[12][0-9]|3[01])\.([1-9]|[12][0-9]|3[01])\.([01])$/;
  const alternatives = new Map();
  CONTENT.registerItem({k:key,base:key,id:'cropsnh:genericSeed',meta:0,maxStack:64,name:'作物种子袋'});
  CONTENT.registerItemFamily(key, function (id) {
    const parsed = decode(id);
    if (!parsed) return null;
    return {k:id,base:key,id:'cropsnh:genericSeed',meta:0,maxStack:64,
      nbt:{species:parsed.species,growth:parsed.growth,gain:parsed.gain,resistance:parsed.resistance,analyzed:parsed.scanned},
      name:crops[parsed.species].name+'种子袋'};
  });
  for (const [species,crop] of Object.entries(crops)) {
    for (const key of crop.alternates || (crop.alternate?[crop.alternate]:[])) alternatives.set(CONTENT.canonicalKey(key),species);
  }
  function decode(id) {
    const match = wire.exec(id);
    if (!match || !Object.hasOwn(crops,match[1])) return null;
    return {species:match[1],growth:+match[2],gain:+match[3],resistance:+match[4],scanned:match[5]==='1'};
  }
  function fromItem(id) {
    const species = alternatives.get(CONTENT.canonicalKey(id));
    return species ? {species,growth:1,gain:1,resistance:1,scanned:true} : decode(id);
  }
  function encode(seed) {
    return key+'~'+[seed.species,seed.growth,seed.gain,seed.resistance,seed.scanned?1:0].join('.');
  }
  function tooltip(stack) {
    const seed=decode(stack.k);
    if (!seed) return '';
    return seed.scanned?'生长 '+seed.growth+'　产量 '+seed.gain+'　抗性 '+seed.resistance:'未鉴定';
  }
  root.CROP_SEEDS = {fromItem,decode,encode,key,tooltip};
})(typeof window !== 'undefined' ? window : globalThis);
