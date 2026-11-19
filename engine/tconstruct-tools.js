/* Native observed parts and pick presets share the ordinary device and stock APIs. */
(function(root){
 'use strict';var C=CONTENT,TX=GTTransactions,M=MECHANISMS,data=C.data.native.tconstructTools,observer=null;
 if(!data)return;
 var toolIds=['pickaxe','hatchet','shovel','broadsword','mattock'].map(function(id){return'TConstruct:'+id;});
 [['pick','pickaxe'],['axe','hatchet'],['shovel','shovel'],['sword','broadsword'],['hoe','mattock']].forEach(function(pair){CRAFT_TOOLS.register(pair[0],['TConstruct:'+pair[1]+'@0'],'剑');});
 function isPick(k){var i=C.item(k);return !!i&&i.id==='TConstruct:pickaxe';}
 function isTool(k){var i=C.item(k);return !!i&&toolIds.includes(i.id);}
 function nativeInfo(k){var i=C.item(k),nbt=i&&SNBT.tryParse(i.nbt);return isTool(k)&&nbt&&nbt.InfiTool||null;}
 function init(s){if(!s||!isTool(s.k))return null;var original=nativeInfo(s.k);if(!s.tinker){if(!original||!(original.TotalDurability>0))return null;s.tinker=TX.clone(original);}
  var t=s.tinker;if(!(t.TotalDurability>0)||!Number.isFinite(t.Damage))return null;
  s.mat=(data.materials[t.Head]||{}).displayName||C.item(s.k).name;s.dmax=t.TotalDurability;s.dur=Math.max(0,s.dmax-t.Damage);s.spd=Math.max(0.01,(t.MiningSpeed||100)/100);return t;
 }
 function boostRequirement(s){if(!root.TINKER_PARTS)return(data.pickStats[s.k]||{}).requiredBoostXp;var current=s;if(s.tinker&&s.tinker.HarvestLevelModified){current=TX.clone(s);current.tinker.HarvestLevel--;}return TINKER_PARTS.requiredXp(current,true);}
 function info(s){var t=init(s);if(!t)return null;return{level:t.HarvestLevel,broken:!!t.Broken,speed:s.spd,damage:t.Damage,total:t.TotalDurability,head:t.Head,boostXp:t.HeadEXP||0,requiredBoostXp:boostRequirement(s),boosted:!!t.HarvestLevelModified};}
 function random(s,n){var seed=s.tinkerRandomState;if(seed==null)seed=(Math.random()*4294967296)>>>0;seed=seed||123456789;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;s.tinkerRandomState=seed>>>0;return s.tinkerRandomState%n;}
 function mine(s,ore,state){var t=init(s);if(!t||t.Broken)return{ok:false,code:'TOOL'};var required=boostRequirement(s),xp=ore?2:1,boosted=false;
  // Both native onBlockChanged and damageTool apply their Unbreaking check.
  var unbreaking=Math.max(0,Math.min(10,t.Unbreaking||0));
  if(!TOOL_WEAR.preserved(state)&&random(s,10)<10-unbreaking&&random(s,10)>=unbreaking){if(t.Damage+1>t.TotalDurability)t.Broken=1;else t.Damage++;}
  var advance=TINKER_MODIFIERS.experience(s,xp);
  if(!t.HarvestLevelModified&&Object.prototype.hasOwnProperty.call(t,'HeadEXP')&&required>0){t.HeadEXP=(t.HeadEXP||0)+xp;if(t.HeadEXP>=required){t.HeadEXP=0;t.HarvestLevelModified=1;t.HarvestLevel++;boosted=true;}}
  init(s);if(observer&&(boosted||t.Broken||advance.leveled))observer(state,s,{boosted:boosted,broken:!!t.Broken,harvestLevel:t.HarvestLevel,leveled:advance.leveled,level:advance.level,modifiers:advance.modifiers});return{ok:true,xp:xp,boosted:boosted,broken:!!t.Broken,leveled:advance.leveled};
 }
 function material(s,k){var t=init(s);if(!t)return null;return data.materialInputs.find(function(p){return data.materialSets[p.set]&&data.materialSets[p.set].id===t.Head&&C.matches(p.k,k,{ignoreNBT:true});})||null;}
 function repairIncrease(s,k){var t=init(s),p=material(s,k);if(!t||!p)return 0;var f=Math.fround,n=Math.trunc(f(f(50)+f(f(f(t.BaseDurability)*f(0.4))*f(p.value))));
  var factor=t.Modifiers===0?0.7:t.Modifiers===1?0.8:t.Modifiers===2?0.9:1;n=Math.trunc(f(f(n)*f(factor)));return Math.trunc(f(f(n)*Math.max(f(0.5),f(f(100-(t.RepairCount||0))/f(100)))));
 }
 function repair(S,m,options){options=options||{};if(m.job)return{ok:false,code:'RUNNING'};var s=m.installedItems&&m.installedItems.tool,t=s&&init(s);if(!t)return{ok:false,code:'TOOL'};if(!(t.Damage>0))return{ok:false,code:'UNDAMAGED'};
  var source=options.inputs||m.ins,at=source.findIndex(function(p){return p&&!p.entityUid&&repairIncrease(s,p.k)>0;}),src=source[at];if(!src)return{ok:false,code:'INPUT'};
  var next=TX.clone(s),nt=init(next),increase=repairIncrease(next,src.k),used=src.k;nt.Damage=Math.max(0,nt.Damage-increase);nt.Broken=0;nt.RepairCount=(nt.RepairCount||0)+1;init(next);
  var inputs=TX.clone(source);inputs[at].n=(inputs[at].n==null?1:inputs[at].n)-1;if(!inputs[at].n)inputs[at]=null;if(options.commitInputs)options.commitInputs(inputs);else m.ins=inputs;m.installedItems.tool=next;
  return{ok:true,consumed:used,n:1,repaired:t.Damage-nt.Damage,repairCount:nt.RepairCount};
 }
 var definitions=[];
 function device(key,map,name,slots,repairable){if(!C.item(key))return;var d={key:key,cat:'tconstruct_'+map,cn:name,tag:'匠魂',tier:0,volt:0,maxRecipeEUt:0,behavior:repairable?'tconstruct_toolstation':'batch_processor',recipeMap:'tconstruct:'+map,slots:{in:slots,out:2,fluid:0},fluidInputTanks:[],fluidOutputTanks:[],energyCapacity:0,startEnergy:0,amperage:0,noOverclock:true,controlCircuit:false,autoItems:true,requiresRecipeSelection:true};
  if(repairable){d.instanceSlots={tool:{ids:toolIds,policy:'tconstruct_tool',label:'待修理工具'}};d.uiPanels=['tconstruct_tool'];}
  GD.extraMachineDefinitions.push(d);definitions.push(d);C.alias(d.cat,d.recipeMap);
 }
 [10,11,12,13].forEach(function(n){device('TConstruct:ToolStationBlock@'+n,'stencil','模具加工台',1,false);});device('TConstruct:CraftingSlab@3','stencil','模具加工台',1,false);
 [1,2,3,4].forEach(function(n){device('TConstruct:ToolStationBlock@'+n,'partbuilder','部件加工台',2,false);});device('TConstruct:CraftingSlab@2','partbuilder','部件加工台',2,false);
 device('TConstruct:ToolStationBlock@0','toolstation','工具装配台',3,true);device('TConstruct:CraftingSlab@1','toolstation','工具装配台',3,true);
 for(var n=0;n<14;n++)device('TConstruct:ToolForgeBlock@'+n,'toolstation','工具装配站',3,true);device('TConstruct:CraftingSlab@5','toolstation','工具装配站',3,true);
 ['stencil','partbuilder','toolstation'].forEach(function(map){var ds=definitions.filter(function(d){return d.recipeMap==='tconstruct:'+map;});if(ds.length)GD.machines.cats.push({id:ds[0].cat,cn:ds[0].cn,slots:ds[0].slots,tiers:ds.map(function(d){return{t:0,k:d.key,name:d.cn,tag:'匠魂'};})});});
 M.registerInstancePolicy('tconstruct_pick',{prepare:function(s){return init(s)?{ok:true,item:s}:{ok:false,code:'TOOL_PROPERTY'};}});
 M.registerInstancePolicy('tconstruct_tool',{prepare:function(s){return init(s)?{ok:true,item:s}:{ok:false,code:'TOOL_PROPERTY'};}});
 ENGINE.registerBehavior('tconstruct_toolstation',{
  slotAccepts:function(m,i,s){return !s.entityUid&&(ENGINE.networks.acceptsItem(m,s.k,{manual:true,index:i})||(m.installedItems&&m.installedItems.tool&&TINKER_TOOLS.repairIncrease(m.installedItems.tool,s.k)>0));},tick:function(m,ctx){if(m.installedItems&&m.installedItems.tool){m.status={code:'TOOL_REPAIR',text:'修理模式：将对应主部件材料放入输入槽'};return false;}return ENGINE.batch.tick(m,ctx.world);},acceptsItem:function(m,k){var s=m.installedItems&&m.installedItems.tool;if(s)return !!material(s,k);var rs=m.recipeLock?[C.recipe(m.recipeLock)]:C.candidates('tconstruct:toolstation',[{k:k,n:1}],[]);return rs.some(function(r){return r&&r.in.some(function(p){return ENGINE.batch.matches(p,{k:k,n:1},r);});});}});
 RESOURCE_UI.registerPanel('tconstruct_tool',function(host,m,S,save){var state=document.createElement('p');host.appendChild(state);host._refresh=function(){var s=m.installedItems&&m.installedItems.tool,i=s&&info(s);state.textContent=i?'耐久 '+(s.dur||0)+' / '+i.total+'，挖掘等级 '+i.level+'，'+(i.boosted?'采矿熟练度已提升':'采矿熟练度 '+i.boostXp+' / '+(i.requiredBoostXp||'?'))+(i.broken?'，已损坏，可修理':''):'装配时先锁定工具模板并投入部件；修理时装入真实工具，再向输入槽放入同主部件材料。';};host._refresh();var b=document.createElement('button');b.className='btn';b.dataset.tinkerRepair='1';b.textContent='使用输入槽的一份材料修理';b.onclick=function(){var r=repair(S,m);if(save)save();if(typeof markDynamic==='function')markDynamic();if(typeof toastAt==='function')toastAt(null,r.ok?'消耗 '+(GD.items[r.consumed]||r.consumed)+' ×1，恢复耐久 '+r.repaired:({TOOL:'先装入待修理工具',INPUT:'输入槽需要同主部件材料',UNDAMAGED:'工具无需修理',RUNNING:'等待当前批次完成'})[r.code]||r.code);};host.appendChild(b);});
 root.TINKER_TOOLS={setObserver:function(fn){observer=fn;},data:data,isPick:isPick,isTool:isTool,init:init,info:info,mine:mine,material:material,repairIncrease:repairIncrease,repair:repair,definitions:definitions};DEFS.rebuild();
 (root.SMALL_ORES&&SMALL_ORES.sources||[]).forEach(function(d){d.requiredHarvestLevel=MINING.smallLevel(d.material);d.check=function(S){return d.requiredHarvestLevel!=null&&MINING.findPick(S,d.requiredHarvestLevel)?{ok:true}:{ok:false,code:'HARVEST_LEVEL'};};});
 var stone={id:'mine_training_stone',name:'持镐开采石材',dim:'overworld',scene:'露天岩壁',time:2,out:[['minecraft:cobblestone@0',1]],toolTypes:['pick'],requiredHarvestLevel:0,effortTimeIsIdleDesign:true,check:function(S){return MINING.findPick(S,0)?{ok:true}:{ok:false,code:'HARVEST_LEVEL'};}};GD.sources.push(stone);ACTIVITIES.register(stone);
})(typeof window!=='undefined'?window:globalThis);
