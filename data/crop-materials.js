(function () {
  'use strict';
  const C=CONTENT;
  const g=(id,meta)=>'gregtech:gt.'+id+'@'+meta;
  const m=(id,meta=0)=>'minecraft:'+id+'@'+meta;
  const item=(id,meta=0)=>'cropsnh:'+id+'@'+meta;
  const rack=item('cropSticks'), fert=item('fertilizer'), lens=item('plantLens'), spade=item('spade');
  const soil=m('farmland'), enrich='cropsnh.enrichedFertilizer', liquid='cropsnh.fertilizer';
  const casing=item('cropsnh.casings1'), bed=t=>item('cropsnh.seedBed',t-2);
  const key=n=>g('blockmachines',n), part=(k,n=1)=>({k,n}), fluid=(f,mb)=>({f,mb});
  const catalog=new Set(GD.catalog);
  const ore=tag=>Array.from(new Set((C.data.ore[tag]||[]).map(i=>C.canonicalKey(C.data.items[i].k))));
  const file=g('metatool.01',18), mallet=g('metatool.01',14), hammer=g('metatool.01',12);
  function add(k,name,icon,maxStack=64) {
    const [id,meta]=k.split('@');
    C.registerItem({k,base:k,id,meta:+meta,maxStack,name});
    if (icon) GD.faceIcons[k]='modicons/cropsnh/'+icon+'.png';
    if (!catalog.has(k)) {catalog.add(k);GD.catalog.push(k);}
  }
  function shaped(id,out,n,rows,materials) {
    const chars=Object.keys(materials), slots=chars.map(c=>[materials[c]].flat());
    if (slots.some(list=>!list.length)) throw Error('缺少农业合成原料 '+id);
    if (!GD.craft.some(r=>r.id==='craft:cropsnh_'+id)) {
      GD.craft.push({id:'craft:cropsnh_'+id,out,n,slots,grid:rows.join('').split('').map(c=>chars.indexOf(c)),width:3,height:3});
    }
  }
  function batch(id,map,eut,seconds,ins,out,fin=[],fout=[],req=[]) {
    C.registerRecipe({id:'cropsnh:'+id,map:'gt.recipe.'+map,eut,durationTicks:Math.floor(seconds*20),in:ins,out,fin,fout,req});
  }
  GD.faceIcons=GD.faceIcons||{};
  GD.gridFaceIcons=GD.gridFaceIcons||{};
  GD.workingFaces=GD.workingFaces||{};
  GD.cropsNH.machineFaces={};
  for(const [k,[name,icon]] of Object.entries(GD.cropsNH.produce||{})) {
    add(k,name,icon?.slice(0,-4));
  }
  function machineFace(k,name) {
    const src='modicons/cropsnh/'+name;
    GD.cropsNH.machineFaces[k]={idle:src+'.png',active:src+'-active.png'};
  }
  GD.modIcons[CROP_SEEDS.key]='modicons/cropsnh/grains1.png';
  add(rack,'作物架','cropSticks');
  add(fert,'肥料','fertilizer');
  add(lens,'植物透镜','plantLens',1);
  add(spade,'铲子','spade',1);
  add(soil,'耕地','farmland');
  add(casing,'砖砌农业机械方块','brickedAgriculturalCasing');
  C.itemAliases['IC2:blockCrop@0']=rack;
  GD.fluids[liquid]='肥料';
  GD.fluids[enrich]='富集肥料';
  shaped('sticks',rack,4,['L L','L L','   '],{L:ore('stickLongWood')});
  shaped('lens',lens,1,[' fL',' Sr','S  '],{f:file,L:ore('lensGlass'),S:m('stick'),r:mallet});
  shaped('spade',spade,1,['fPh','PSP',' T '],{f:file,P:ore('plateTripleSteel'),h:hammer,S:m('iron_shovel'),T:ore('stickLongWood')});
  batch('sticks','assembler',7,2,[part(ore('stickLongWood')[0],8)],[part(rack,16)],[],[],[{circuit:2}]);
  batch('fertilizer','mixer',30,5,[part(m('dirt')),part(ore('dustWood')[0],2),part(m('sand'),4)],[part(fert,4)],[fluid('water',1000)]);
  batch('liquid_fertilizer','fluidextractor',16,1,[part(fert)],[],[],[fluid(liquid,144)]);
  for (const first of ['Magnesium','Phosphate']) {
    batch('enriched_'+first.toLowerCase(),'mixer',120,5,
      [part(ore('dust'+first)[0],3),part(ore('dustCalcium')[0],2),part(ore('dustSaltpeter')[0]),part(ore('dustSulfur')[0])],
      [],[fluid(liquid,1000)],[fluid(enrich,1000)]);
  }
  batch('fertilized_dirt','chemicalreactor',30,5,[part(m('dirt')),part(fert,2)],[part('RandomThings:fertilizedDirt@0')],[fluid('water',1000)]);
  const voltage=['ULV','LV','MV','HV','EV','IV','LuV','ZPM','UV','UHV','UEV','UIV','UMV','UXV'];
  const tech=[null,
    ['Tin','Steel','Basic','Bronze'],['Copper','Aluminium','Good','Steel'],['Gold','StainlessSteel','Advanced','StainlessSteel'],
    ['Aluminium','Titanium','Data','Titanium'],['Tungsten','TungstenSteel','Elite','TungstenSteel'],
    ['VanadiumGallium','Rhodium-PlatedPalladium','Master','Enderium'],['Naquadah','Iridium','Ultimate','Naquadah'],
    ['ElectrumFlux','Osmium','Superconductor','Neutronium'],['Bedrockium','Neutronium','Infinite','Neutronium'],
    ['Draconium','Infinity','Bio','Infinity'],['NetherStar','TranscendentMetal','Optical','TranscendentMetal'],
    ['Quantium','SpaceTime','Exotic','SpaceTime'],['BlackPlutonium','MHDCSM','Cosmic','SpaceTime']];
  const manager=key(28002), controller=key(28055), tillable='RandomThings:fertilizedDirt@0';
  const managerIds=[], genTiers=[], bedTiers=[];
  const upgradeTypes=[
    {id:'growthAccelerationUnit',name:'生长加速单元',min:2,max:12,rows:['RPE','CHC','WBW']},
    {id:'fertilizerUnit',name:'施肥单元',min:2,max:1,rows:['RPS','CHC','WBW']},
    {id:'advancedHarvestingUnit',name:'高级收获单元',min:2,max:2,rows:['RSR','CHC','WBW']},
    {id:'environmentalEnhancementUnit',name:'环境强化单元',min:2,max:2,rows:['EEE','CHC','WBW']},
    {id:'overclockedGrowthAccelerationUnit',name:'超频生长加速单元',min:7,max:1,rows:['FAF','CGC','WBW']}
  ];
  const upgradeKey=(id,t)=>item('cropsnh.'+id,t);
  const component=(oldStart,newStart,t)=>g('metaitem.01',t<=10?oldStart+t-1:newStart+t-11);
  const arm=t=>component(32650,32033,t), sensor=t=>component(32690,32041,t);
  const emitter=t=>component(32680,32037,t), field=t=>component(32670,32045,t), pump=t=>component(32610,32025,t);
  function available(inputs) {return Object.values(inputs).every(v=>[v].flat().some(k=>k&&C.item(k)));}
  for (let t=1;t<=13;t++) {
    const [wire,metal,circuit,pipe]=tech[t], tier=voltage[t];
    const A=arm(t), S=sensor(t), P=ore('plate'+metal), H=key(10+t),
      circuitKeys=ore('circuit'+circuit), W=ore('cableGt01'+wire), I=key(50+t), B=key(70+t);
    const common={A,C:circuitKeys,H,W,D:tillable};
    const generator=key(28012+t), breeder=key(28024+t);
    const waterCan='ExtraUtilities:watering_can@1';
    if (t<=12&&available({ ...common,waterCan })) {
      genTiers.push(t);
      add(generator,tier+' 种子生成机','seed-generator-'+t);
      add(breeder,tier+' 作物培育机','crop-breeder-'+t);
      machineFace(generator,'seed-generator-'+t);
      machineFace(breeder,'crop-breeder-'+t);
      shaped('seed_'+tier,generator,1,['SAK','CHC','WDW'],{...common,S:spade,K:waterCan});
      shaped('breed_'+tier,breeder,1,['SAS','CHC','WDW'],{...common,S:rack});
    }
    const managerParts={A,S,P,H,C:W,I};
    if (t<=12&&available(managerParts)) {
      const id=key(28000+t);
      add(id,tier+' 作物管理机','crop-manager-'+t);
      machineFace(id,'crop-manager-'+t);
      shaped('manager_'+tier,id,1,['ASA','PHP','CIC'],managerParts);
      managerIds.push([t,id]);
    }
    if (t===2) {
      add(controller,'工业农场','industrial-farm');
      machineFace(controller,'industrial-farm');
      GD.faceIcons[manager]='modicons/cropsnh/crop-manager-2.png';
      shaped('farm',controller,1,['AKS','CMC','BCB'],{A,S,C:circuitKeys,K:waterCan,M:manager,B});
      shaped('casing',casing,4,['PPP','BFB','PPP'],{P:ore('plateAluminium'),B:m('brick_block'),F:ore('frameGtWood')});
    }
    if (t>=2) {
      const bedParts={D:tillable,C:circuitKeys,H,P:ore((t>=6?'pipeMedium':'pipeSmall')+pipe),I};
      if (available(bedParts)) {
        bedTiers.push(t);
        add(bed(t),tier+' 苗床','seedBed');
        shaped('bed_'+tier,bed(t),1,['DDD','CHC','PIP'],bedParts);
      }
      const materials={R:A,P:pump(t),S,E:emitter(t),C:circuitKeys,H,W,B:casing,
        F:field(t),A:key(11100+Math.min(t,8)-1),G:upgradeKey('growthAccelerationUnit',t)};
      for (const type of upgradeTypes) {
        const ingredients=Object.fromEntries(Array.from(new Set(type.rows.join('')),c=>[c,materials[c]]));
        if (t<type.min||!bedTiers.includes(t)||!available(ingredients)) continue;
        const id=upgradeKey(type.id,t);
        add(id,tier+' '+type.name,type.id+'-'+t);
        shaped(type.id+'_'+tier,id,1,type.rows,ingredients);
      }
    }
  }
  const geneTiers=[];
  for (let t=4;t<=12;t++) {
    const [wire,,circuit]=tech[t], tier=voltage[t];
    const H=key(10+t), C=ore('circuit'+circuit), S=sensor(t), E=emitter(t), F=field(t), W=ore('cableGt01'+wire);
    if (!available({H,C,S,E,F,W})) continue;
    const ext=key(28033+t), synth=key(28042+t);
    geneTiers.push([t,ext,synth]);
    add(ext,tier+' 作物基因提取器','gene-extractor-'+t);
    add(synth,tier+' 作物合成器','crop-synthesizer-'+t);
    machineFace(ext,'gene-extractor-'+t); machineFace(synth,'crop-synthesizer-'+t);
    shaped('extract_'+tier,ext,1,['SES','WHW','CSC'],{S,E,W,H,C});
    shaped('synth_'+tier,synth,1,['FCF','CHC','EEE'],{F,C,H,E});
  }
  const fertilizerItems={
    [m('dye',15)]:{units:5,potency:30},[fert]:{units:1,potency:100},
    'Forestry:fertilizerCompound@0':{units:1,potency:25},'Forestry:fertilizerBio@0':{units:1,potency:50}
  };
  const feedFluids={water:{water:1,ic2distilledwater:2},fertilizer:{[liquid]:1,[enrich]:10},weedEx:{'potion.poison.strong':1,weedex9000:10}};
  const biomeCards=[
    ['HOT','炎热',[],[fluid('lava',8000)]],['COLD','寒冷',[[m('ice')]]],['SPARSE','稀疏',[[m('dirt')]]],
    ['DENSE','茂密',[[m('sapling',5)]]],['WET','潮湿',[],[fluid('water',8000)]],['DRY','干燥',[],[fluid('air',8000)]],
    ['SAVANNA','热带草原',[[m('sapling',4)]]],['CONIFEROUS','针叶林',[[m('sapling',1)]]],['JUNGLE','丛林',[[m('sapling',3)]]],
    ['SPOOKY','阴森',[[m('soul_sand')]]],['DEAD','荒死',[[m('rotten_flesh')]]],['LUSH','繁茂',[[m('tallgrass',1)]]],
    ['NETHER','下界',[[m('netherrack')]]],['END','末地',[[m('end_stone')]]],
    ['MUSHROOM','蘑菇',[[m('red_mushroom'),4],[m('brown_mushroom'),4]]],
    ['MAGICAL','魔法',[[ 'Thaumcraft:blockCustomPlant@0' ]]],['OCEAN','海洋',[[m('dye')]],[],[[m('fish',3)],[m('fish',2)]]],
    ['RIVER','河流',[[m('fish')]],[],[[m('fish',1)],[item('goldfish')]]],
    ['MESA','平顶山',[[m('hardened_clay')]],[],[[m('sand',1)]]],['FOREST','森林',[[m('sapling')]]],
    ['PLAINS','平原',[[m('grass')]]],['MOUNTAIN','山地',[[m('stained_hardened_clay',9)]]],
    ['HILLS','丘陵',[[m('cobblestone')]]],['SWAMP','沼泽',[[m('waterlily')]]],['SANDY','沙地',[[m('sand')]]],
    ['SNOWY','积雪',[[m('snow')]]],['WASTELAND','荒地',[[m('deadbush')]]],['BEACH','海滩',[[m('reeds')]]]
  ];
  const card=item('environmentalModule'), biomeByKey={};
  add(card,'空白环境模块','biome-blank');
  batch('environmental_module','assembler',120,15,[part(casing,4),{k:ore('circuitGood')[0],n:1,alts:ore('circuitGood')}],[part(card)]);
  biomeCards.forEach(([tag,label,raw,fluids=[],other=[]],i)=>{
    const id=item('environmentalModule',i+1);
    biomeByKey[id]=tag;
    add(id,label+'环境模块','biome-'+tag);
    [raw,...other.map(v=>[v])].forEach((ingredients,variant)=>{
      if (ingredients.some(([k])=>!C.item(k))) return;
      batch('environmental_'+tag.toLowerCase()+'_'+variant,'assembler',120,15,
        [part(card),...ingredients.map(([k,n])=>part(k,n||8))],[part(id)],fluids);
    });
  });
  GD.cropsNH.equipment={managerIds,genTiers,bedTiers,geneTiers,upgradeTypes,upgradeKey,fertilizerItems,feedFluids,biomeByKey};
  GD.cropsNH.devices={enrich,liquid,voltage,bed,controller,casing,manager,part};
  const supported=new Set(Object.keys(C.data.maps));
  for (const recipe of GD.cropsNH.processing) {
    if (!supported.has(recipe.map)) continue;
    if (![...recipe.fin,...recipe.fout].every(({f})=>Object.hasOwn(GD.fluids,C.canonicalFluid(f)))) continue;
    if (![...recipe.in,...recipe.out,...recipe.req].every(p=>p.circuit!=null||C.item(p.k))) continue;
    C.registerRecipe(recipe);
  }
  delete GD.cropsNH.processing;
})();
