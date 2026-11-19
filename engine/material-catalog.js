(function(root){
 'use strict';
 var shapes=[
  ['plate','板'],['stick','杆'],['bolt','螺栓'],['ring','环'],['cell','单元'],['ingot','锭'],['wireGt01','导线'],['itemCasing','外壳'],
  ['pipeTiny','微型管道'],['pipeSmall','小型管道'],['pipeMedium','管道'],['pipeLarge','大型管道'],['pipeHuge','巨型管道'],['block','块'],
  ['toolHeadSword','剑刃'],['toolHeadPickaxe','镐头'],['toolHeadShovel','铲头'],['toolHeadAxe','斧头'],['toolHeadHoe','锄头'],['toolHeadHammer','锤头'],['toolHeadFile','锉刀头'],['toolHeadSaw','锯刃'],
  ['gearGt','齿轮'],['bottle','瓶子'],['rotor','转子'],['gearGtSmall','小型齿轮'],['turbineBlade','涡轮扇叶'],['toolHeadDrill','钻头'],
  ['plateDouble','双重板'],['plateTriple','三重板'],['plateQuadruple','四重板'],['plateQuintuple','五重板'],['plateDense','致密板'],['foil','箔'],['stickLong','长杆'],['screw','螺丝'],['round','滚珠'],['wireFine','细导线'],['springSmall','小型弹簧'],['spring','弹簧'],
  ['toolHeadChainsaw','链锯刃'],['toolHeadWrench','扳手顶'],['toolHeadBuzzSaw','圆锯锯刃'],['lens','透镜'],['nugget','粒'],['gem','宝石'],['gemChipped','破碎宝石'],['gemFlawed','有瑕宝石'],['gemFlawless','无瑕宝石'],['gemExquisite','精致宝石'],
  ['dust','粉'],['dustSmall','小堆粉'],['dustTiny','小撮粉'],['dustImpure','含杂粉'],['dustPure','洁净粉'],['crushed','粉碎矿石'],['crushedPurified','纯净粉碎矿石'],['crushedCentrifuged','离心矿石']
 ].map(function(p){return{id:p[0],name:p[1],outline:'modicons/presentation/shapes/'+p[0]+'.svg'};});
 var hiddenShapes=new Set(['ingot','toolHeadChainsaw','toolHeadWrench','toolHeadBuzzSaw','turbineBlade','toolHeadDrill','lens','nugget','gem','gemChipped','gemFlawed','gemFlawless','dustTiny','dustImpure','dustPure','crushed']);
 var progression=('Wood Stone Flint Copper Tin Lead Zinc Bronze Brass Iron WroughtIron Gold Silver Nickel Cobalt Antimony RedAlloy SolderingAlloy TinAlloy Steel MagneticIron MagneticSteel AnnealedCopper Cupronickel Electrum Invar BatteryAlloy CobaltBrass Rubber Polyethylene Aluminium Gallium Silicon Lithium Sodium Magnesium Manganese Chrome StainlessSteel Kanthal Nichrome Polytetrafluoroethylene Epoxy Polycaprolactam Titanium EnergeticAlloy VibrantAlloy DarkSteel Enderium Tungsten TungstenSteel BlackSteel BlueSteel RedSteel Molybdenum Niobium Vanadium Palladium Platinum Iridium Osmium HSSG HSSE HSSS TungstenCarbide NiobiumTitanium VanadiumGallium ChromeDioxide Polybenzimidazole Naquadah NaquadahAlloy NaquadahEnriched Naquadria Europium Americium Neutronium Infinity CosmicNeutronium TranscendentMetal SpaceTime Eternity').split(' ');
 var cache=null,signature='',orderedPrefixes=shapes.slice().sort(function(a,b){return b.id.length-a.id.length;});
 function oreItem(prefix,material){var ids=CONTENT.data.ore[prefix+material]||[];for(var i of ids){var item=CONTENT.data.items[i];if(item&&item.meta!==32767&&!item.nbt){var key=CONTENT.canonicalKey(item.k);if(CONTENT_SCOPE.allowed(key))return key;}}return null;}
 function material(id,fallback){var key=oreItem('ingot',id),kind='ingot';if(!key){key=oreItem('gem',id);kind='gem';}if(!key){key=oreItem('dust',id);kind='dust';}if(!key){key=oreItem('block',id)||fallback;kind='other';}var name=GD.items[key]||(CONTENT.item(key)||{}).name||id;if(kind==='ingot')name=name.replace(/锭$/,'');if(kind==='dust')name=name.replace(/粉$/,'');if(id==='Wood'){name='木';key='minecraft:planks@0';}return{id:id,key:key,name:name,kind:kind};}
 function rank(m){var i=progression.indexOf(m.id);return i<0?(m.kind==='ingot'?progression.indexOf('Titanium')-0.5:1000):i;}
 function build(keys){
  var next=keys.join('|');if(cache&&signature===next)return cache;
  var allowed=new Set(keys),cells=new Map(),materials=new Map(),usedShapes=new Set(),byKey=new Map();
  Object.keys(CONTENT.data.ore).forEach(function(ore){var shape=orderedPrefixes.find(function(s){return ore.startsWith(s.id)&&ore.length>s.id.length;});if(!shape||hiddenShapes.has(shape.id))return;var id=ore.slice(shape.id.length);if(id.startsWith('Any')||id==='Stone'||id==='Flint')return;
   for(var index of CONTENT.data.ore[ore]){var item=CONTENT.data.items[index];if(!item||item.meta===32767||item.nbt)continue;var key=CONTENT.canonicalKey(item.k);if(!allowed.has(key))continue;var mat=materials.get(id)||material(id,key);if(mat.kind==='other'&&!id.startsWith('Superconductor'))continue;var cell=shape.id+'|'+id,prev=cells.get(cell);if(prev&&prev!==key)continue;cells.set(cell,key);usedShapes.add(shape.id);if(!materials.has(id))materials.set(id,mat);if(!byKey.has(key))byKey.set(key,[]);byKey.get(key).push({shape:shape.id,material:id});}
  });
  signature=next;cache={columns:Array.from(materials.values()).sort(function(a,b){return rank(a)-rank(b)||a.name.localeCompare(b.name,'zh-Hans-CN');}),rows:shapes.filter(function(s){return usedShapes.has(s.id);}),cells:cells,byKey:byKey};return cache;
 }
 function select(keys){var allowed=new Set(keys),data=cache,columns=new Set(),rows=new Set(),count=0;if(!data)return null;data.cells.forEach(function(key,id){if(!allowed.has(key))return;var parts=id.split('|');rows.add(parts[0]);columns.add(parts[1]);count++;});return{columns:data.columns.filter(function(m){return columns.has(m.id);}),rows:data.rows.filter(function(s){return rows.has(s.id);}),cells:data.cells,allowed:allowed,count:count};}
 root.MATERIAL_CATALOG={shapes:shapes,progression:progression,build:build,select:select,has:function(key){return !!cache&&cache.byKey.has(key);}};
})(typeof window!=='undefined'?window:globalThis);
