(function(root){
 'use strict';
 var tiers=['ULV','LV','MV','HV','EV','IV','LuV','ZPM','UV','UHV','UEV','UIV','UMV','UXV','MAX'],cache=new Map();
 var pattern=/(^|[^A-Za-z])(ULV|UHV|UEV|UIV|UMV|UXV|LuV|ZPM|MAX|LV|MV|HV|EV|IV|UV)(?=$|[^A-Za-z])/;
 function name(k){return String(GD.items[k]||CONTENT.item(k)?.name||k);}
 function info(k){var n=name(k),old=cache.get(k);if(old&&old.name===n)return old;var hit=pattern.exec(n),base=n,tier=-1,definition=DEFS.of(k);if(definition&&definition.orderFamily){tier=definition.tier;base=definition.orderFamily;}else if(hit){tier=tiers.indexOf(hit[2]);base=n.slice(0,hit.index+hit[1].length)+n.slice(hit.index+hit[0].length);base=base.replace(/[()（）\s，]+/g,'');}var out={name:n,base:base,tier:tier};cache.set(k,out);return out;}
 var collator=new Intl.Collator('zh-Hans-CN');
 function compareInfo(x,y){return collator.compare(x.base,y.base)||x.tier-y.tier||collator.compare(x.name,y.name);}
 function compare(a,b){return compareInfo(info(a),info(b));}
 function sort(keys){return keys.map(function(k){return {key:k,order:info(k)};}).sort(function(a,b){return compareInfo(a.order,b.order);}).map(function(entry){return entry.key;});}
 // Keep unrelated catalogue positions, ordering members of each voltage family together.
 function* familySteps(list,keyOf){
  var groups=new Map(),out=list.slice(),work=0;
  for(var i=0;i<list.length;i++){
   if((i&127)===0)yield;
   var value=list[i],k=keyOf(value);
   if(!k)continue;
   var d=info(k);
   if(d.tier<0)continue;
   var g=groups.get(d.base);
   if(!g)groups.set(d.base,g=[]);
   g.push({value:value,index:i,tier:d.tier});
  }
  for(var group of groups.values()){
   if((work++&127)===0)yield;
   var sorted=group.slice().sort(function(a,b){return a.tier-b.tier||a.index-b.index;});
   group.forEach(function(p,i){out[p.index]=sorted[i].value;});
  }
  return out;
 }
 function identity(value){return value;}
 function finish(steps){var step;do{step=steps.next();}while(!step.done);return step.value;}
 function families(list,keyOf){return finish(familySteps(list,keyOf||identity));}
 function rename(k,n){GD.items[k]=n;var item=CONTENT.item(k);if(item)item.name=n;}
 // Resolve formula-only and untranslated cell names through their registered fluid.
 var cellNames=new Map();
 (GD.containerRegistry||[]).forEach(function(p){if(p.empty!=='IC2:itemCellEmpty@0'||p.amount<=0)return;var k=CONTENT.canonicalKey(p.filled),old=name(k),material=old.replace(/单元$/,''),fluid=String(GD.fluids[p.fluid]||'');if(!/单元$/.test(old)||/[\u3400-\u9fff]/.test(material)||!/[\u3400-\u9fff]/.test(fluid))return;var labels=cellNames.get(k);if(!labels)cellNames.set(k,labels={old:old,names:new Set()});labels.names.add(fluid+'单元');});
 cellNames.forEach(function(labels,k){if(labels.names.size!==1)return;var label=Array.from(labels.names)[0];rename(k,label);GD.itemSearchAliases=GD.itemSearchAliases||{};var plain=labels.old.replace(/[₀-₉]/g,function(n){return String(n.charCodeAt(0)-8320);});GD.itemSearchAliases[k]=[GD.itemSearchAliases[k]||'',labels.old,plain].filter(Boolean).join(' ');});
 Object.keys(CONTENT.data.idleItemNames||{}).forEach(function(k){rename(k,CONTENT.data.idleItemNames[k]);});
 rename('gregtech:gt.metaitem.01@11880','橡胶条');
 CONTENT.data.items.forEach(function(item){if(!/^gregtech:gt\.blockmachines@(2710|2713)~/.test(item.k)||!item.nbt)return;var match=/baseCapacity\s*:\s*(\d+)L?/.exec(item.nbt);if(!match)return;var base=CONTENT.baseKey(item.k),amount=BigInt(match[1]).toLocaleString('en-US'),unit=base.endsWith('@2710')?'件':'mB';rename(item.k,name(base)+'（缓存 '+amount+' '+unit+'）');});
 Object.keys(GD.logisticsDefinitions).forEach(function(k){var d=GD.logisticsDefinitions[k];if(d.kind!=='wire')return;var tag=DEFS.tagOf(DEFS.recipeTier(d.voltage));var label=name(k).replace(pattern,function(_,prefix){return prefix;}).replace(/[（(]\s*[）)]/g,'').trim();rename(k,label+'（'+tag+'）');});
 (GD.quests||[]).forEach(function(q){q.name=q.name.replace(/电力高炉/g,'工业高炉').replace(/洁净室/g,'超净间');q.desc=(q.desc||'').replace(/电力高炉/g,'工业高炉').replace(/洁净室/g,'超净间');});
 rename('gregtech:gt.metaitem.01@2902','滑石粉');
 Object.keys(GD.items).forEach(function(k){var n=GD.items[k].replace(/电力高炉/g,'工业高炉').replace(/洁净室/g,'超净间').replace(/Al₂O₃/g,'氧化铝').replace(/Na₃AlF₆/g,'冰晶石').replace(/NiZnFe₄O₈/g,'镍锌铁氧体').replace(/C₆H₄S/g,'聚苯硫醚');if(n!==GD.items[k])rename(k,n);});
 var circuitGrades={Primitive:'ULV',Basic:'LV',Good:'MV',Advanced:'HV',Data:'EV',Elite:'IV',Master:'LuV',Ultimate:'ZPM',Superconductor:'UV',Infinite:'UHV',Bio:'UEV',Optical:'UIV',Exotic:'UMV',Cosmic:'UXV',Transcendent:'MAX'};
 Object.keys(circuitGrades).forEach(function(grade){(CONTENT.data.ore['circuit'+grade]||[]).forEach(function(i){var k=CONTENT.canonicalKey(CONTENT.data.items[i].k),n=name(k);if(!pattern.test(n))rename(k,n+'（'+circuitGrades[grade]+'）');});});
 var catalogGroups=new Map();
 function register(id,classify){catalogGroups.set(id,classify);}
 var numericCollator=new Intl.Collator('zh-Hans-CN',{numeric:true});
 function compareRanks(a,b){for(var i=0;i<Math.max(a.rank.length,b.rank.length);i++){var x=a.rank[i]||0,y=b.rank[i]||0;if(x!==y)return x-y;}return numericCollator.compare(a.name,b.name)||a.index-b.index;}
 function* catalogSteps(list,keyOf){
  var ordered=yield* familySteps(list,keyOf),buckets=new Map(),membership=new Map();
  for(var index=0;index<ordered.length;index++){
   if((index&127)===0)yield;
   var value=ordered[index],key=keyOf(value);
   if(!key)continue;
   for(var entry of catalogGroups){
    var rank=entry[1](key);
    if(!rank)continue;
    var bucket=buckets.get(entry[0]);
    if(!bucket)buckets.set(entry[0],bucket=[]);
    bucket.push({value:value,name:name(key),rank:rank,index:index});membership.set(index,entry[0]);break;
   }
  }
  for(var bucket of buckets.values()){yield;bucket.sort(compareRanks);}
  var out=[],emitted=new Set();
  for(var index=0;index<ordered.length;index++){
   if((index&255)===0)yield;
   var group=membership.get(index);
   if(group==null){out.push(ordered[index]);continue;}
   if(emitted.has(group))continue;
   emitted.add(group);buckets.get(group).forEach(function(entry){out.push(entry.value);});
  }
  return out;
 }
 function catalog(list,keyOf){return finish(catalogSteps(list,keyOf||identity));}
 async function prepareCatalog(list,keyOf,pause){
  var steps=catalogSteps(list,keyOf||identity),deadline=performance.now()+5,step;
  do{step=steps.next();if(!step.done&&performance.now()>=deadline){await pause();deadline=performance.now()+5;}}while(!step.done);
  return step.value;
 }
 root.ITEM_ORDER={register:register,catalog:catalog,prepareCatalog:prepareCatalog,info:info,compare:compare,sort:sort,families:families,tiers:tiers};
})(typeof window!=='undefined'?window:globalThis);
