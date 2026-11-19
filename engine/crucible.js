/* Primitive TC crucible: real water, heat, aspects and source-backed decay.
 * The 2D lava tank represents the block below it; mode choice replaces throwing
 * every item into the same 3D mouth. Flux is recorded, not spread as world blocks. */
(function(root){
 'use strict';if(!root.THAUMCRAFT)return;
 var T=THAUMCRAFT,C=CONTENT,M=MECHANISMS,TX=GTTransactions,prefix='essentia:';
 var capacities=Object.fromEntries(Object.keys(T.data.aspects).map(function(id){return[prefix+id,2147483647];}));
 var d={key:'Thaumcraft:blockMetalDevice@0',cat:'thaumcraft_crucible',cn:'坩埚',tag:'神秘时代',tier:0,volt:0,maxRecipeEUt:0,behavior:'thaumcraft_crucible',recipeMap:'thaumcraft:crucible',slots:{in:1,out:1,fluid:1000},fluidInputTanks:[1000,1000],inputTankFluids:[['water'],['lava']],fluidOutputTanks:[],energyCapacity:0,startEnergy:0,amperage:0,noOverclock:true,controlCircuit:false,autoItems:true,autoFluids:false,requiresRecipeSelection:true,resourceCapacities:capacities,uiPanels:['thaumcraft_crucible']};
 GD.extraMachineDefinitions.push(d);GD.machines.cats.push({id:d.cat,cn:d.cn,slots:d.slots,tiers:[{t:0,k:d.key,name:d.cn,tag:d.tag}]});C.alias(d.cat,d.recipeMap);
 function random(m,n){m.crucibleRandom=(Math.imul(m.crucibleRandom||1234567,1664525)+1013904223)>>>0;return m.crucibleRandom%n;}
 function ids(m){return Object.keys(m.resourceBuffers||{}).filter(function(id){return id.startsWith(prefix)&&m.resourceBuffers[id].amount>0;});}
 function total(m){return ids(m).reduce(function(n,id){return n+m.resourceBuffers[id].amount;},0);}
 function fluid(m,id){return(m.tanksIn||[]).reduce(function(n,p){return n+(p&&p.f===id?p.mb:0);},0);}
 function drainWater(m,n){n=Math.min(n,fluid(m,'water'));if(n)m.tanksIn=TX.planDrain(m.tanksIn,[{f:'water',mb:n}]).tanks;}
 function flux(m){m.essentiaLost=(m.essentiaLost||0)+1;if(random(m,4)===0)m.fluxEvents=(m.fluxEvents||0)+1;}
 function leak(m){var available=ids(m);if(total(m)>100&&m.crucibleClock%5===0){var id=available[random(m,available.length)];m.resourceBuffers[id].amount--;flux(m);}
  if(m.crucibleClock<=100||(m.crucibleHeat||0)<=150)return;m.crucibleClock=0;available=ids(m);if(!available.length)return;
  var id=available[random(m,available.length)],a=T.data.aspects[id.slice(prefix.length)];if(!a.components.length){id=available[random(m,available.length)];a=T.data.aspects[id.slice(prefix.length)];}
  drainWater(m,2);m.resourceBuffers[id].amount--;if(a.components.length){var component=a.components[random(m,a.components.length)];m.resourceBuffers[prefix+component].amount++;m.essentiaDecomposed=(m.essentiaDecomposed||0)+1;}else flux(m);
 }
 function warm(m){m.crucibleClock=(m.crucibleClock==null?-100:m.crucibleClock)+1;var water=fluid(m,'water');m.crucibleHeat=water&&fluid(m,'lava')>=1000?(root.GAME_TIME?GAME_TIME.advance(root.ENGINE&&root.ENGINE.state,m.crucibleHeat,200,1):Math.min(200,(m.crucibleHeat||0)+1)):Math.max(0,(m.crucibleHeat||0)-(water?1:2));leak(m);}
 function canBoil(m){return fluid(m,'water')>0&&(m.crucibleHeat||0)>150;}
 function tags(k){var item=C.item(k),nbt=item&&item.nbt&&SNBT.tryParse(item.nbt);if(!item||nbt&&(nbt.ench||nbt.StoredEnchantments))return null;var a=T.aspects(k);if(!a||!Object.keys(a).length||Object.keys(a).some(function(id){return !T.data.aspects[id]||T.data.aspects[id].unreadable;}))return null;return a;}
 function check(m,r,world,options){if(!canBoil(m))return{ok:false,code:'CRUCIBLE_HEAT',text:fluid(m,'water')?'等待水沸腾（需151热度）':'坩埚需要水'};var effective=Object.assign({},r,{fin:[{f:'water',mb:Math.min(50,fluid(m,'water'))}]});return ENGINE.batch.check(m,effective,world,options);}
 function dissolve(m){if(!canBoil(m)){m.status={code:'CRUCIBLE_HEAT',text:'分解需要沸水；供水并在另一槽装入1000mB岩浆'};return false;}
  var source=m.ins.find(function(s){return s&&!s.entityUid&&tags(s.k);});if(!source){m.status={code:'ITEM_INPUT',text:'等待可分解为要素的原料'};return false;}
  var a=tags(source.k),pools=TX.clone(m.resourceBuffers),plan=TX.planIngredients(m.ins,[{k:source.k,n:1}],function(r,s){return !s.entityUid&&r.k===s.k;});if(!plan)return false;
  for(var id of Object.keys(a)){var p=pools[prefix+id];if(p.amount+a[id]>p.capacity){m.status={code:'RESOURCE_FULL',text:'要素缓冲已满'};return false;}p.amount+=a[id];}
  m.ins=plan.remaining;M.commitResources(m,pools);m.crucibleClock=-150;m.dissolvedItems=(m.dissolvedItems||0)+1;m.status={code:'DISSOLVING',text:'分解原料，加入对应要素'};return true;
 }
 function clear(S,m){if(m.job)return{ok:false,code:'RUNNING'};if(!COMMANDS.owned(S,function(k){return C.item(k).id==='Thaumcraft:WandCasting';}).length)return{ok:false,code:'TOOL'};var n=total(m),water=fluid(m,'water');ids(m).forEach(function(id){m.resourceBuffers[id].amount=0;});drainWater(m,water);m.essentiaLost=(m.essentiaLost||0)+n;for(var i=0;i<Math.floor(n/2);i++)if(random(m,4)===0)m.fluxEvents=(m.fluxEvents||0)+1;return{ok:true,aspects:n,water:water};}
 ENGINE.registerBehavior(d.behavior,{check:check,recipeSelected:function(m){m.crucibleMode='craft';},acceptsFluid:function(m,f){return f==='water'||f==='lava';},acceptsItem:function(m,k){if(m.crucibleMode==='dissolve')return !!tags(k);var r=m.recipeLock&&C.recipe(m.recipeLock);return !!r&&r.in.some(function(p){return ENGINE.batch.matches(p,{k:k,n:1},r);});},
  summary:function(m){return['热度 '+(m.crucibleHeat||0)+' / 200，水 '+fluid(m,'water')+'mB','要素合计 '+total(m)+'，逸散 '+(m.essentiaLost||0)+'，污染事件 '+(m.fluxEvents||0)];},
  tick:function(m,ctx){warm(m);if(m.job)return ENGINE.batch.tick(m,ctx.world);if(m.crucibleMode==='dissolve')return dissolve(m);var r=m.recipeLock&&C.recipe(m.recipeLock);if(!r){m.status={code:'RECIPE_SELECTION',text:'选择制备配方，或切换分解模式'};return false;}var gate=check(m,r,ctx.world);if(!gate.ok){m.status=gate;return false;}if(!ENGINE.batch.start(m,gate.recipe,ctx.world))return false;m.crucibleClock=-250;return ENGINE.batch.tick(m,ctx.world);}
 });
 RESOURCE_UI.registerPanel('thaumcraft_crucible',function(host,m,S,save){var mode=document.createElement('label');mode.textContent='坩埚用途 ';var select=document.createElement('select');select.dataset.crucibleMode='1';[['craft','按锁定配方制备'],['dissolve','将输入原料分解为要素']].forEach(function(p){var o=document.createElement('option');o.value=p[0];o.textContent=p[1];select.appendChild(o);});select.value=m.crucibleMode||'craft';select.onchange=function(){if(m.job){select.value=m.crucibleMode||'craft';return;}m.crucibleMode=select.value;if(save)save();if(typeof markDynamic==='function')markDynamic();if(typeof toastAt==='function')toastAt(null,m.crucibleMode==='dissolve'?'坩埚开始分解投入的原料':'坩埚按锁定配方制备');};mode.appendChild(select);host.appendChild(mode);host._refresh=function(){select.value=m.crucibleMode||'craft';};var hint=document.createElement('p');hint.className='dim';hint.textContent='两个输入槽分别装水与1000mB岩浆；岩浆作为下方热源保留。热度151开始沸腾。分解每tick投入1件；制备消耗要素和水。超过100点要素会逸散，沸腾久置会分解或逸散要素。';host.appendChild(hint);var empty=document.createElement('button');empty.className='btn';empty.dataset.crucibleEmpty='1';empty.textContent='持杖倾倒要素与水';empty.onclick=function(){var r=clear(S,m);if(save)save();if(typeof markDynamic==='function')markDynamic();if(typeof toastAt==='function')toastAt(null,r.ok?'已倾倒 '+r.aspects+' 点要素与 '+r.water+'mB 水':r.code==='TOOL'?'需要实际持有法杖':'等待当前批次完成');};host.appendChild(empty);});
 root.TCRUCIBLE={total:total,fluid:fluid,tags:tags,warm:warm,check:check,dissolve:dissolve,clear:clear};DEFS.rebuild();
})(typeof window!=='undefined'?window:globalThis);
