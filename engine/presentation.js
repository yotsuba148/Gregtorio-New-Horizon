/* Presentation-only assets. Source item identities and simulation data remain unchanged. */
(function(root){
 'use strict';
 var data=root.PRESENTATION_DATA,C=root.CONTENT,G=root.GD,info=root.CONTENT_BUNDLE_INFO;
 if(!data)return;
 /* 物品表只在末尾追加新物品时，原有索引不变，贴图仍然有效 */
 var grew=C.data.items.length>=data.itemCount;
 if(!info||(!grew&&data.registryJsonSha256!==info.jsonSha256)||!grew){
  root.GT_PRESENTATION={active:false,reason:'REGISTRY_MISMATCH'};delete root.PRESENTATION_DATA;return;
 }
 var indices=new Int32Array(data.icons),pages=data.pages,cols=data.cols,rows=data.rows,size=data.tile,perPage=cols*rows;
 Object.keys(data.names).forEach(function(index){var item=C.data.items[+index];if(item&&C.canonicalKey(item.k)===item.k)G.items[item.k]=data.names[index];});
 Object.keys(data.legacyNames||{}).forEach(function(k){if(Object.prototype.hasOwnProperty.call(G.items,k))G.items[k]=data.legacyNames[k];});
 Object.keys(data.fluids).forEach(function(id){G.fluids[id]=data.fluids[id];});
 G.machineViews=G.machineViews||{};G.faceIcons=G.faceIcons||{};
 Object.keys(data.machineViews||{}).forEach(function(k){G.machineViews[k]=data.machineViews[k];if(!G.faceIcons[k])G.faceIcons[k]=data.machineViews[k].front;});
 Object.keys(G.items).forEach(function(k){G.items[k]=String(G.items[k]).replace(/§[0-9a-fk-or]/gi,'');});
 G.itemSearchAliases=G.itemSearchAliases||{};
 C.data.items.forEach(function(item){
  if(item.id==='gregtech:gt.metatool.01'&&item.meta===14&&/PrimaryMaterial:"Wood"/.test(item.nbt||'')){
   G.items[item.k]='木头软锤';G.itemSearchAliases[item.k]='木软锤 木制软锤 木质软锤';
  }
 });
 Object.keys(G.fluids).forEach(function(k){G.fluids[k]=String(G.fluids[k]).replace(/§[0-9a-fk-or]/gi,'');});
 function icon(k){
  k=C.canonicalKey(G.itemIconAliases?.[k]||k);var index=C.itemIndices[k],sprite=index==null?-1:indices[index],exact=sprite!==-1&&index!=null;
  if(sprite===-2)return{url:'modicons/presentation/unresolved.svg',standalone:true,exact:true,unresolved:true};
  if(!(sprite>=0)){var base=C.baseKey(k);index=C.itemIndices[base];sprite=index==null?-1:indices[index];}
  if(!(sprite>=0))return null;
  var page=Math.floor(sprite/perPage),cell=sprite%perPage;
  return{url:pages[page],x:cell%cols,y:Math.floor(cell/cols),cols:cols,rows:rows,tile:size,exact:exact};
 }
 root.GT_PRESENTATION={active:true,registryJsonSha256:data.registryJsonSha256,icons:icon,itemCount:indices.length,spriteCount:data.spriteCount,pageCount:pages.length};
 delete root.PRESENTATION_DATA;
})(typeof window!=='undefined'?window:globalThis);
