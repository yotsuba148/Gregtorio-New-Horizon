/* Playable selection over preserved native records; legacy inventory keeps its identity. */
(function(root){
 'use strict';
 var omitted={
  StevesFactoryManager:'统一产线与物流已覆盖工厂管理',StevesAddons:'依赖未采用的工厂管理系统',StevesCarts:'统一农业、采集和物流代替模块矿车系统',
  Ztones:'纯建筑装饰',chiseltones:'装饰石材变体',BiblioCraft:'家具装饰',BiblioWoodsForestry:'家具木材变体',BiblioWoodsBoP:'家具木材变体',BiblioWoodsNatura:'家具木材变体',
  ArchitectureCraft:'建筑造型',littletiles:'微型建筑装饰',malisisdoors:'装饰门',modernmarkings:'建筑标记',catwalks:'建筑走道',FloodLights:'建筑照明'
 };
 var retainedMods=['appliedenergistics2','ae2fc','ae2stuff','ae2wct','neenergistics','ae2thing','thaumicenergistics','betterp2p','programmablehatches'];
 var allowedCache=Object.create(null),reasons=Object.create(null);
 function reason(k){
  k=CONTENT.canonicalKey(k);if(Object.prototype.hasOwnProperty.call(reasons,k))return reasons[k];
  var item=CONTENT.item(k),id=item?item.id:String(k).split('@')[0],ns=id.split(':')[0],name=id.slice(ns.length+1),meta=item?item.meta:Number(String(k).split('@')[1]),why=omitted[ns]||null;
  if(!why&&GD.idleDecorations&&GD.idleDecorations.has(k))why='建筑装饰变体';
  if(!why&&root.EIO_CONTENT&&EIO_CONTENT.excluded.has(k))why='未采用的导管及升级';
  if(!why&&/^miscutils:itemCustomMetaCover\./.test(id))why='只作外观包覆的装饰盖板';
  if(!why&&ns==='ggfab'&&name==='gt.ggfab.d1'&&[4,34].indexOf(meta)>=0)why='已移除的一次性锻造锤及其铸件';
  if(!why&&id==='witchery:bucketbrew'&&meta===0&&!item.nbt)why='通用酿造占位容器';
  if(!why&&id==='cb4bq:BlockDLB')why='按玩家要求移除默认加载方块';
  if(!why&&id==='OpenBlocks:genericUnstackable'&&meta===0)why='已移除四羊毛制作的指针';
  if(!why&&id==='TwistSpaceTechnology:Cardigan')why='已移除羊毛衫及其升级变体';
  if(!why&&id==='etfuturum:bark'&&meta===0)why='已移除四原木制作的六面树皮橡木';
  if(!why&&id==='IronChest:BlockIronChest'&&meta===7)why='已移除泥箱子9000';
  if(!why&&id==='Botany:misc'&&meta===6)why='未采用的花卉研磨支线；保留GT研钵';
  if(!why&&id==='gtnhlanth:item.photomask.error')why='原生错误占位掩膜，无配方、用途或任务';
  if(!why&&/^∅/.test(String(item&&item.name||'').replace(/§[0-9a-fk-or]/gi,'')))why='无有效材质的占位物品';
  if(!why){
   if(ns==='CarpentersBlocks'&&!(name==='blockCarpentersBlock'&&meta===0))why='木匠装饰（保留活塞所需结构材料）';
   if(ns==='chisel'&&!((name==='limestone'||name==='andesite'||name==='diorite'||name==='hempcretesand')&&meta===0))why='装饰石材、雕刻工具及花岗岩磨石支线';
   if(ns==='ForgeMicroblock'&&!(name==='stoneRod'&&meta===0))why='微型装饰方块与专用工具';
   if(ns==='Forestry'&&/^(slabs|stairs|fences)(Fireproof)?$/.test(name))why='林业建筑变体';
   if(ns==='ExtraTrees'&&/^(fence|slab|stairs|door|multifence)$/.test(name))why='更多树木建筑变体';
   if(ns==='Natura'&&(/^(plankSlab[12]|GrassSlab|Natura\.fence|redwoodDoorItem)$/.test(name)||/^(stair|trapdoor|fenceGate)\./.test(name)))why='自然建筑变体';
   if(ns==='BiomesOPlenty'&&(/^(woodenSingleSlab[12]|stoneSingleSlab)$/.test(name)||/Stairs$/.test(name)))why='超多生物群系建筑变体';
   if(ns==='StorageDrawers'&&/^(fullCustom[124]|halfCustom[24]|trimCustom)$/.test(name))why='抽屉装饰皮肤';
   if(ns==='Botania'&&(/^(stone3Stairs|stone11Stairs|stone11Slab)$/.test(name)||name==='stone0Wall'&&meta===3||name==='stone'&&[7,11,15].indexOf(meta)>=0))why='已移除花岗岩支线的建筑变体';
   if(ns==='OpenBlocks'&&name==='canvas'||ns==='OpenComputers'&&name==='carpetedCapacitor')why='依赖已移除装饰材料的画布或皮肤';
   if(ns==='bartworks'&&(/^(BWRotorBlock|BW_(Leather|Wool|Paper|Combined)Rotor)$/.test(name)||name==='craftingParts'&&meta>=0&&meta<=2))why='风车研磨支线';
   if(ns==='gregtech'&&name==='gt.blockmachines'&&meta===12698)why='风车研磨支线';
  }
  reasons[k]=why;return why;
 }
 function allowed(k){k=CONTENT.canonicalKey(k);if(Object.prototype.hasOwnProperty.call(allowedCache,k))return allowedCache[k];return allowedCache[k]=!reason(k);}
 function ingredientAllowed(k){
  if(allowed(k))return true;var item=CONTENT.item(k);
  return !!item&&item.meta===32767&&(CONTENT.byRawId[item.id]||[]).some(function(a){var actual=CONTENT.item(a);return actual&&actual.meta!==32767&&allowed(a);});
 }
 function recipeAllowed(r){
  if(!r||r.identityConversion)return false;
  if(Array.isArray(r.out)?!r.out.every(function(p){return allowed(p.k);}):typeof r.out==='string'&&!allowed(r.out))return false;
  // The generic recycler remains available for already-owned, retired items.
  if([].concat(r.fin||[],r.fout||[]).some(function(p){return p.f==='witchery:brew';}))return false;
  if(r.map==='gt.recipe.recycler')return true;
  if(r.slots&&!r.slots.every(function(a){return a.some(ingredientAllowed);}))return false;
  if(typeof r.in==='string'){if(!ingredientAllowed(r.in))return false;}
  else if(![].concat(r.in||[],r.req||[]).every(function(p){return !p.k||(p.alternatives||[p.k]).some(ingredientAllowed);}))return false;
  if(r.input&&!ingredientAllowed(r.input))return false;
  return Object.values(r.conditions&&r.conditions.attachment||{}).every(ingredientAllowed);
 }
 var prior=GD.craft.length,priorCatalog=GD.catalog.length,priorFurnace=GD.furnace.length;
 GD.craft=GD.craft.filter(recipeAllowed);GD.catalog=GD.catalog.filter(allowed);GD.furnace=GD.furnace.filter(recipeAllowed);
 root.CONTENT_SCOPE={version:4,fluidAllowed:function(f){return f!=='witchery:brew';},omittedMods:omitted,retainedMods:retainedMods,allowed:allowed,ingredientAllowed:ingredientAllowed,reason:reason,recipeAllowed:recipeAllowed,
  omittedCraftRecipes:prior-GD.craft.length,omittedCatalogItems:priorCatalog-GD.catalog.length,omittedFurnaceRecipes:priorFurnace-GD.furnace.length,
  retainedSource:true,omittedSystems:['独立于统一产线的物流控制器','纯建筑装饰玩法','花岗岩磨石风车研磨支线'],
  inclusionRule:'保留主线与有实际用途的加工、魔法、农业、物流和AE2及附属；混合模组逐项剥离装饰，必要材料保持原配方成本。'};
})(typeof window!=='undefined'?window:globalThis);
