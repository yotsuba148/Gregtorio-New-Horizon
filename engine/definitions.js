(function(root){
  'use strict';
  var TAGS=['ULV','LV','MV','HV','EV','IV','LuV','ZPM','UV','UHV','UEV','UIV','UMV','UXV','MAX'];
  var VOLT={};TAGS.forEach(function(tag,i){VOLT[tag]=i===14?2147483640:8*Math.pow(4,i);});
  var definitions=Object.create(null), initialized=false;
  function voltOf(tier){return VOLT[TAGS[Math.max(0,Math.min(14,Math.floor(tier)))]];}
  function tagOf(tier){return TAGS[Math.max(0,Math.min(14,Math.floor(tier)))];}
  function recipeTier(eut){
    for(var i=0;i<TAGS.length;i++)if(eut<=voltOf(i))return i;
    return 14;
  }
  function register(def){
    if(!def||!def.key||!def.behavior)throw new Error('设备定义需要 key 和 behavior');
    definitions[def.key]=Object.assign({
      tier:1,volt:32,slots:{in:1,out:1,fluid:0},fluidInputTanks:[],fluidOutputTanks:[],
      energyCapacity:2048,startEnergy:256,amperage:2,autoItems:true,autoFluids:false,
      port:'idle2d_four_sides_gt_like',interrupt:'pause',generator:false
    },def);
    return definitions[def.key];
  }
  function build(){
    if(initialized)return definitions;
    initialized=true;
    var gd=root.GD||{}, ms=gd.machines||{}, slots=gd.machslot||{};
    (ms.cats||[]).forEach(function(cat){
      (cat.tiers||[]).forEach(function(t){
        var tier=t.t|0, voltage=voltOf(tier);
        var pair=(slots[cat.id]||{})[String(tier)];
        var input=pair?pair[0]:(cat.slots||{}).in;
        var output=pair?pair[1]:(cat.slots||{}).out;if(cat.id==='assembler'&&tier===1)input=6;
        var usesFluid=!!((cat.slots||{}).fluid);
        var capacity=t.fluidCapacity||cat.fluidCapacity||(usesFluid?8000*Math.pow(2,tier):0);
        register({key:t.k,cat:cat.id,recipeMap:root.CONTENT?root.CONTENT.mapId(cat.id):'gt.recipe.'+cat.id,
          cn:t.name||cat.cn,en:cat.en||'',tier:tier,tag:t.tag||tagOf(tier),volt:voltage,
          behavior:cat.behavior||'batch_processor',slots:{in:input|0,out:output|0,fluid:capacity},
          fluidInputTanks:capacity?[capacity]:[],fluidOutputTanks:capacity?[capacity]:[],
          energyCapacity:voltage*64,startEnergy:voltage*8,amperage:2,
          autoItems:true,autoFluids:usesFluid,controlCircuit:true,outputPolicy:'first_slots'});
      });
    });
    (ms.gens||[]).forEach(function(t){
      var tier=t.t|0,voltage=voltOf(tier);
      var name=t.name||'',family=/蒸汽/.test(name)?'steam':/内燃|化学能释放/.test(name)?'diesel':/燃气/.test(name)?'gas':/半流质/.test(name)?'semifluid':/能源转换/.test(name)?'magic':/等离子|恒星/.test(name)?'plasma':/地热/.test(name)?'geothermal':null;
      var rule=(root.FUEL_RULES||{})[family]||{};
      var efficiency=family==='semifluid'?100-tier*5:(rule.efficiency||[])[tier]||100;
      register({key:t.k,cat:'generator',cn:t.name,tag:t.tag||tagOf(tier),tier:tier,volt:voltage,
        behavior:t.behavior||'fuel_generator',generator:true,slots:{in:1,out:1,fluid:family==='steam'?24000*tier:16000},
        fluidInputTanks:[family==='steam'?24000*tier:16000],fluidOutputTanks:[],energyCapacity:voltage*80+512,
        startEnergy:0,amperage:1,minimumOutputEnergy:512,outputDrain:voltage+Math.pow(2,Math.max(tier-1,0)),autoItems:true,autoFluids:false,fuelMap:t.fuelMap||rule.map||null,fuelFamily:family,
        efficiency:t.efficiency==null?efficiency:t.efficiency});
    });
    (gd.extraMachineDefinitions||[]).forEach(register);
    return definitions;
  }
  function of(k){build();return definitions[CONTENT.canonicalKey(k)]||null;}
  function list(){build();return Object.keys(definitions).map(function(k){return definitions[k];});}
  function effective(def,recipe,parallel){
    parallel=parallel||1;
    if(def.processingTiming)return def.processingTiming(recipe,parallel);
    if(def.noOverclock)return{durationTicks:recipe.durationTicks,EUt:(recipe.eut||0)*parallel,overclocks:0};
    if(def.steamPowered){
      var steamPower=recipe.eut*def.powerMultiplier*parallel;
      return{durationTicks:Math.max(1,Math.ceil((recipe.durationTicks||Math.round(recipe.dur*20))*def.durationMultiplier)),EUt:steamPower,overclocks:0,steamMbTick:steamPower*(def.steamPerEU==null?2:def.steamPerEU)};
    }
    var tier=typeof def==='number'?def:def.tier;
    var baseTier=Math.max(1,recipeTier(recipe.eut||0));
    var power=(recipe.eut||0)*(def.powerMultiplier==null?1:def.powerMultiplier);
    var heatSurplus=Math.max(0,(def.processingHeat||0)-(recipe.heat||0));
    if(def.heatDiscount)power*=Math.pow(.95,Math.floor(heatSurplus/900));
    var duration=(recipe.durationTicks==null?Math.round(recipe.dur*20):recipe.durationTicks)*(def.durationMultiplier||1);
    var n=0;
    var heatOverclocks=def.heatOverclock?Math.floor(heatSurplus/1800):0;
    var powerLimit=def.maxRecipeEUt==null?voltOf(tier):def.maxRecipeEUt;
    while(tier>baseTier+n&&duration>=2&&power*4<=powerLimit){
      var speed=def.perfectOverclock||n<heatOverclocks?4:2;
      power*=4;duration=Math.max(1,Math.floor(duration/speed));n++;
    }
    return {durationTicks:Math.max(1,Math.ceil(duration)),EUt:Math.max(0,power)*parallel,overclocks:n};
  }
  function resolveItem(ref){
    if(!ref)return null;
    var names=(root.GD||{}).items||{};
    if(ref.id){if(names[ref.id])return ref.id;if(names[ref.id+'@0'])return ref.id+'@0';return null;}
    if(ref.name){var keys=Object.keys(names).filter(function(k){return names[k]===ref.name;});return keys.length===1?keys[0]:null;}
    return null;
  }
  function canClearOutput(d){
    return !!d&&!d.inputOnly&&!d.energyRelay&&!d.transformer&&!d.hideIOToggles&&
      !d.multiblock&&!d.requiresStructure&&!d.noFaceSettings&&!d.manualLogistics&&
      !d.pipeOnly&&d.supportsCovers!==false;
  }
  function outputFace(d,side){
    if (Number.isInteger(side)&&side>=0&&side<=3) return side;
    if (side===-1&&canClearOutput(d)) return -1;
    return d&&d.directionless?-1:1;
  }

  root.DEFS={
    VOLT:VOLT,ORDER:TAGS.slice(1),voltOf:voltOf,tagOf:tagOf,tierOfEut:function(e){return Math.max(1,recipeTier(e));},
    recipeTier:recipeTier,of:of,list:list,register:register,effective:effective,resolveItem:resolveItem,
    canClearOutput:canClearOutput,outputFace:outputFace,
    overclock:function(mt,rt){var n=Math.max(0,mt-Math.max(1,rt));return {n:n,durMul:Math.pow(2,-n),eutMul:Math.pow(4,n)};},
    rebuild:function(){definitions=Object.create(null);initialized=false;return build();}
  };
  if(typeof module==='object'&&module.exports)module.exports=root.DEFS;
})(typeof window!=='undefined'?window:globalThis);
