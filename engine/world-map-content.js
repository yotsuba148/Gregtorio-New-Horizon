(function(root){
 'use strict';
 // Bind region IDs to existing actions and panels, independently of hit shapes and artwork.
 const bindings={
  overworld:{
   forest:{groups:['forest']},
   river:{groups:['river'],facilities:['wash']},
   cave:{groups:['cave'],sources:['hunt_spiders','hunt_skeletons']},
   mines:{groups:['smallOres'],links:['veins','hammer']},
   village:{groups:['village','processing'],facilities:['bench','furnace','smeltery'],links:['legacy-villages']},
   twilight:{links:['twilight']},
   flowers:{groups:['meadow']}, pasture:{groups:['pasture']},
   desert:{sources:['dig_sand','gather_cactus']}, oil:{links:['oil']},
   netherGate:{links:['nether']}, slime:{links:['slime']},
   wilds:{groups:['wilds'],links:['end']}, boss:{groups:['adventure']}
  },
  nether:{
   wilds:{groups:['nether','wilds'],links:['processing']},
   fortress:{groups:['fortress']},
   lava:{sources:['hunt_ghasts','hunt_magma_cubes']},
   mines:{groups:['smallOres','veinSources'],links:['veins']}
  },
  twilight:{
   courtyard:{groups:['adventure']},crystals:{groups:['wilds','smallOres']},
   mines:{groups:['veinSources'],sources:['mine_aurora_brick'],links:['veins','processing']}
  },
  end:{
   dragon:{groups:['adventure'],links:['processing']},
   stone:{sources:['mine_end_stone','end_endium_ore'],links:['veins']},
   outer:{groups:['wilds']}
  }
 };
 const discoveryOnly=new Set(['village_search','find_liquid_oil','slime_island_search','locate_stronghold']);
 const noSources=[];
 const empty={facilities:[],links:[],sources:noSources};
 const explicit=new Map();
 const groups=new Map();
 for(const [dimension,regions] of Object.entries(bindings)){
  const bySource=new Map(),byGroup=new Map();
  for(const [region,binding] of Object.entries(regions)){
   for(const id of binding.sources||[]){
    if(bySource.has(id))throw Error('Duplicate world map action: '+dimension+'/'+id);
    bySource.set(id,region);
   }
   for(const group of binding.groups||[])byGroup.set(group,region);
  }
  explicit.set(dimension,bySource);
  groups.set(dimension,byGroup);
 }
 function owner(dimension,source,group=WORLD_SCENES.groupOf(source)){
  if(discoveryOnly.has(source.id)||!bindings[dimension])return null;
  return explicit.get(dimension).get(source.id)||groups.get(dimension).get(group)||null;
 }
 let indexedSources,indexedLength=0,indexedGroupOf;
 let sourcesByRegion={},processingByDimension={};
 function indexSources(){
  const sources=GD.sources,groupOf=WORLD_SCENES.groupOf;
  if(sources===indexedSources&&sources.length===indexedLength&&groupOf===indexedGroupOf)return;
  sourcesByRegion={};
  processingByDimension={};
  for(const source of sources){
   const dimension=source.dim||'overworld',group=groupOf(source);
   if(group==='processing')(processingByDimension[dimension]??=[]).push(source);
   const region=owner(dimension,source,group);
   if(region)(sourcesByRegion[dimension+':'+region]??=[]).push(source);
  }
  indexedSources=sources;
  indexedLength=sources.length;
  indexedGroupOf=groupOf;
 }
 function processing(dimension){
  indexSources();
  return processingByDimension[dimension]||noSources;
 }
 function get(dimension,id){
  const region=bindings[dimension]?.[id];
  if(!region)return empty;
  indexSources();
  return {
   facilities:region.facilities||[],links:region.links||[],
   sources:sourcesByRegion[dimension+':'+id]||noSources
  };
 }
 function portalRegion(id){
  return Object.keys(bindings.overworld).find(region=>bindings.overworld[region].links?.includes(id));
 }
 root.WORLD_MAP_CONTENT={get,owner,processing,portalRegion,discoveryOnly:id=>discoveryOnly.has(id)};
})(globalThis);
