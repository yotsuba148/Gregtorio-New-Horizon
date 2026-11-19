/* Source-backed predicate recipes from measured item properties and IC2 lists. */
(function(root){
 'use strict';
 var C=root.CONTENT,native=C.data.native;if(!native||!Object.keys(native.properties||{}).length)return;
 var byKey=Object.create(null);
 Object.keys(native.properties).forEach(function(i){byKey[C.data.items[i].k]=native.properties[i];});
 function properties(k){return byKey[C.canonicalKey(k)]||byKey[k]||null;}
 function container(k){var p=properties(k);return p&&p.container>=0?C.canonicalKey(C.data.items[p.container].k):null;}
 // ItemSoup.onEaten returns a bowl, independently of crafting containers.
 function consumedFoodReturn(k){var i=C.item(k);return i&&i.id==='minecraft:mushroom_stew'?C.canonicalKey('minecraft:bowl@0'):container(k);}
 function index(patterns){var exact=Object.create(null),wild=Object.create(null);patterns.forEach(function(i){var p=C.data.items[i];
   if(p.meta===32767){wild[p.id]=true;(C.byRawId[p.id]||[]).forEach(function(k){exact[C.baseKey(C.canonicalKey(k))]=true;});}
   else exact[C.baseKey(C.canonicalKey(p.k))]=true;
  });return{exact:exact,wild:wild};}
 var black=index(native.recycler.blacklist),white=index(native.recycler.whitelist),whiteMode=native.recycler.whitelist.length>0;
 var oreIndices={};
 function hasOre(k,tag){var idx=oreIndices[tag]||(oreIndices[tag]=index(C.data.ore[tag]||[]));return listed(idx,k);}
 function listed(idx,k){var item=C.item(k);return !!item&&(!!idx.exact[C.baseKey(k)]||!!idx.wild[item.id]);}
 function scrapAllowed(k){return whiteMode?listed(white,k):!listed(black,k);}
 var allKeys=Object.keys(C.items).filter(function(k){return C.items[k].meta!==32767;});
 var scrap=C.canonicalKey('IC2:itemScrap@0');
 C.registerDynamicFamily('gt.recipe.recycler',{idPrefix:'adapter:recycler:',keys:allKeys,eut:1,
  searchText:function(k){return(GD.items[k]||k)+' '+k+(scrapAllowed(k)?' 废料 scrap':' 仅销毁原料');},
  resolve:function(k){var item=C.item(k);if(!item||item.meta===32767)return null;var allowed=scrapAllowed(k);
   return{in:[{k:k,n:1}],out:allowed?[{k:scrap,n:1,chance:1250}]:[],durationTicks:45,eut:1,automationAllowed:allowed,
    notes:allowed?['每件原料有12.5%概率获得废料']:['回收黑名单：只销毁原料，不产废料；自动管道不送入此物品'],provenance:{backend:'GT5U RecyclerBackend',lists:'IC2 runtime recyclerBlacklist/recyclerWhitelist'}};
  }
 });
 var explosives=['minecraft:netherrack','minecraft:tnt','minecraft:egg','minecraft:firework_charge','minecraft:fireworks','minecraft:fire_charge'];
 function danger(k){if(!k)return null;var item=C.item(k),p=properties(k);
  if(!item||!p||!p.verified)return{code:'UNKNOWN_PROPERTY',text:'缺少该物品的微波属性'};
  if(explosives.indexOf(item.id)>=0||p.flags&3)return{code:'EXPLOSION',text:'含金属或爆炸物，微波炉已停机'};
  if(p.flags&4||p.burn>0)return{code:'FIRE',text:'含可燃物，微波炉已停机'};return null;
 }
 function microwave(k){var r=FURNACES.find(k);if(!r)return null;
  var sequence=[container(k),k,container(r.out),r.out],hazard=null;
  for(var part of sequence){hazard=danger(part);if(hazard)break;}
  if(hazard&&hazard.code==='UNKNOWN_PROPERTY')return null;
  return{in:[{k:k,n:1}],out:[{k:r.out,n:r.n||1}],durationTicks:32,eut:4,hazard:hazard,automationAllowed:!hazard,
   notes:hazard?[hazard.text]:[],provenance:{backend:'GT5U MicrowaveBackend',itemProperties:'runtime measured burn/container/material flags'}};
 }
 var microwaveKeys=allKeys.filter(function(k){return !!properties(k)&&!!microwave(k);});
 C.registerDynamicFamily('gt.recipe.microwave',{idPrefix:'adapter:microwave:',keys:microwaveKeys,eut:4,
  searchText:function(k){var r=FURNACES.find(k);return(GD.items[k]||k)+' '+k+' '+(GD.items[r.out]||r.out)+' '+r.out;},resolve:microwave});
 // Keep useful predicate outputs discoverable without eagerly allocating a
 // separate recipe object for every item in the pack.
 ['minecraft:dirt@0','minecraft:leather@0','minecraft:wheat@0','minecraft:cobblestone@0'].forEach(function(k){if(C.item(k))C.resolveDynamic('gt.recipe.recycler',k);});
 root.NATIVE_RULES={properties:properties,container:container,consumedFoodReturn:consumedFoodReturn,hasOre:hasOre,scrapAllowed:scrapAllowed,danger:danger,microwave:microwave,keys:allKeys};
})(typeof window!=='undefined'?window:globalThis);
