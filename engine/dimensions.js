/* 维度索引：一处回答“这个维度叫什么、有哪些矿脉、能不能去”。
   主世界、下界、末地、暮色的矿脉以 data/veins.js 为准；其余星球读 data/planet-veins.js，
   星球矿脉本身没有名称和维度字段，在这里补成和旧矿脉一样的形状，供探矿、采掘、虚空矿机共用。
   维度通道开通看 TRAVEL，星球看是否已经登陆。 */
(function(root){
 'use strict';
 var LEGACY = {overworld: true, nether: true, end: true, twilight: true};
 var NAMES = {'overworld': '主世界', 'nether': '下界', 'end': '末地', 'twilight': '暮色森林'};
 var veinSources=new Map(),dimensionBySource=new Map();
 (root.SPACEFLIGHT_CONTENT?.planets||[]).forEach(function(p){
  if(!p.veinSources)return;
  veinSources.set(p.id,p.veinSources);
  p.veinSources.forEach(function(source){dimensionBySource.set(source,p.id);});
 });

 function veinDimension(dim){return dimensionBySource.get(dim)||dim;}

 function isLegacy(dim){ return !!LEGACY[dim]; }

 function legacyVeins(dim){
  return (root.GD && root.GD.veins || []).filter(function(v){ return (v.dim || 'overworld') === dim; });
 }

 function planetVeins(dim){
  var all=root.GD?.planetVeins,sources=veinSources.get(dim);
  if(!all)return null;
  if(!sources)return all[dim]||null;
  for(var source of sources)if(all[source]?.length)return all[source];
  return null;
 }

 // 星球矿脉的显示名：用游戏里显示的中文物品名，实在没有才用材料名。
 function veinName(def, dim){
  var first = def.ores && def.ores[0];
  var key = first && first.key;
  var shown = (root.GD && root.GD.items && root.GD.items[key]) || (root.CONTENT && root.CONTENT.item && root.CONTENT.item(key) || {}).name || (first && first.name) || def.name || (first && first.mat) || dim;
  return String(shown).replace(/\s*Ore$/i, '').replace(/(矿石|矿)$/, '') + '矿脉';
 }

 // 所有维度的矿脉：旧维度原样给出，星球矿脉补上维度与名称。
 function all(){
  var list = (root.GD && root.GD.veins || []).slice();
  var planets = root.GD && root.GD.planetVeins || {};
  var dims=new Set(Object.keys(planets).map(veinDimension));
  dims.forEach(function(dim){
   if(LEGACY[dim]) return;
   (planetVeins(dim)||[]).forEach(function(def){ list.push(normalize(def, dim)); });
  });
  return list;
 }

 function normalize(def, dim){
  if(def.dim === dim && def.name && def.enum) return def;
  return {
   enum: def.variable || (dim + ':' + ((def.ores[0] && def.ores[0].key) || 'ore')),
   dim: dim,
   name: veinName(def, dim),
   weight: def.weight,
   density: def.density,
   size: def.size,
   heightRange: def.heightRange,
   ores: def.ores
  };
 }

 function veins(dim){
  dim=veinDimension(dim);
  var list = legacyVeins(dim);
  if(list.length) return list;
  var planet = planetVeins(dim);
  return planet ? planet.map(function(def){ return normalize(def, dim); }) : [];
 }

 function hasVeins(dim){
  dim=veinDimension(dim);
  return !!planetVeins(dim)?.length||(root.GD?.veins||[]).some(function(v){return (v.dim||'overworld')===dim;});
 }

 function name(dim){
  var found = (root.GD && root.GD.dims || []).filter(function(d){ return d.key === dim; })[0];
  if(found) return found.name;
  var planets = root.GD && root.GD.planetNames || {};
  var destination=root.SPACE_DESTINATIONS&&SPACE_DESTINATIONS.get(dim);
  return destination&&destination.name||planets[dim] || NAMES[dim] || dim;
 }

 // 能不能在这个维度活动：旧维度看通道，星球看有没有登陆过。
 function open(S, dim){
  if(!dim || dim === 'overworld') return true;
  if(isLegacy(dim)) return root.TRAVEL ? !!TRAVEL.can(S, dim) : true;
  if(root.SPACE_DESTINATIONS && SPACE_DESTINATIONS.get(dim) && SPACE_DESTINATIONS.landed(S, dim)) return true;
  return false;
 }

  root.DIMENSIONS = {
  veins: veins,
  hasVeins: hasVeins,
  all: all,
  name: name,
  open: open,
  isLegacy: isLegacy,
  lowGravity: function(dim){return !!(root.SPACE_DESTINATIONS&&SPACE_DESTINATIONS.get(dim)&&/station$/.test(dim));},
  isSpace: function(dim){ return !isLegacy(dim)&&!!(root.SPACE_DESTINATIONS?.get(dim)?.mission||planetVeins(veinDimension(dim))); },
  dims: function(){ return (root.GD && root.GD.dims) || []; }
 };
})(typeof window !== 'undefined' ? window : globalThis);
