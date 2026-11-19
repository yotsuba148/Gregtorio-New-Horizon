/* Expeditions are preparation + timed outcomes, sharing stock, PRNG and save rules. */
(function(root){
 'use strict';var C=CONTENT,areas={},encounters={};
 var rationIds=['minecraft:baked_potato','minecraft:bread','minecraft:cooked_fished','minecraft:cooked_beef','minecraft:cooked_porkchop','minecraft:cooked_chicken','minecraft:mushroom_stew'];
 var rationKeys=rationIds.flatMap(function(id){return(C.byRawId[id]||[]).filter(function(k){var i=C.item(k);return i.meta!==32767&&!i.nbt;});});
 var meleeTypes=['knife','butcheryknife','axe','sword','hammer'];
 var equipmentKeys=GD.tools.types.filter(function(t){return meleeTypes.includes(t.id);}).flatMap(function(t){return t.keys;}).concat(['wooden','stone','iron','golden','diamond'].map(function(m){return'minecraft:'+m+'_sword@0';}));
 function state(S){return MECHANISMS.ensure(S).adventure;}
 MECHANISMS.registerStateInitializer(function(S,m){if(!m.adventure)m.adventure={areas:{},kills:{}};});
 function weapon(S){var boxes=[S.inv||[],Object.values(S.tools||{})];for(var arr of boxes)for(var s of arr){if(!s||s.entityUid)continue;var i=C.item(s.k);if(!i)continue;
  var nbt=i.nbt&&SNBT.tryParse(i.nbt),infi=s.tinker||nbt&&nbt.InfiTool;if(infi&&/^TConstruct:(broadsword|longsword|rapier|cleaver|hatchet|mattock)$/.test(i.id)&&!infi.Broken)return s;
  if(equipmentKeys.includes(C.baseKey(s.k))&&!(s.dur!=null&&s.dur<=0))return s;
 }return null;}
 function rations(S){return COMMANDS.owned(S,function(k){return rationKeys.includes(k);});}
 function ration(S,a){if(a&&a.cycleCosts){var k=a.cycleCosts[0]&&a.cycleCosts[0][0];return rations(S).find(function(p){return p.k===k;})||null;}return rations(S).find(function(p){return p.bag>0;})||rations(S)[0]||null;}
 function registerArea(d){if(!d.id||areas[d.id]||!(d.seconds>0))throw Error('Invalid expedition area');areas[d.id]=d;var source={id:'adventure_find_'+d.id,name:d.name,dim:d.dim,scene:'冒险地点',time:d.seconds,icon:d.icon,outputDescription:'发现1处可挑战地点',out:[],effortTimeIsIdleDesign:true,
  check:function(S){return d.afterKill&&!state(S).kills[d.afterKill]?{ok:false,code:'LOCATION'}:{ok:true};},effect:function(S){var t=state(S);t.areas[d.id]=(t.areas[d.id]||0)+1;}};GD.sources.push(source);ACTIVITIES.register(source);return source;}
 function available(S,d,a){var t=state(S);if(d.once&&t.kills[d.id])return{ok:false,code:'DONE'};if(d.area&&!(t.areas[d.area]>0)||d.afterKill&&!t.kills[d.afterKill])return{ok:false,code:'LOCATION'};if(!d.noSupplies){if(!weapon(S))return{ok:false,code:'TOOL'};if(!ration(S,a))return{ok:false,code:'SUPPLIES'};}return{ok:true};}
 function registerEncounter(d){if(!d.id||encounters[d.id]||(d.area&&!areas[d.area])||!(d.seconds>0)||!Array.isArray(d.rewards)||!d.rewards.length)throw Error('Invalid expedition encounter');d.rewards.forEach(function(p){if(!C.item(p.k)||!Number.isSafeInteger(p.min)||!Number.isSafeInteger(p.max)||p.min<1||p.max<p.min)throw Error('Invalid native encounter reward');});encounters[d.id]=d;var source={id:'adventure_fight_'+d.id,name:d.name,dim:d.dim||areas[d.area].dim,scene:'冒险挑战',time:d.seconds,icon:d.rewards[0].k,out:d.rewards.map(function(p){return[p.k,p.min];}),adventure:{encounter:d.id,area:d.area},effortTimeIsIdleDesign:true,
  outputDescription:d.rewards.map(function(p){return(GD.items[p.k]||p.k)+'×'+(p.min===p.max?p.min:p.min+'～'+p.max);}).join('、'),
  requirementDescription:function(S){if(d.noSupplies)return'随时可挑战';return'可挑战地点 '+(state(S).areas[d.area]||0)+'，库存熟食 '+rations(S).reduce(function(n,p){return n+p.n;},0)+'，'+(weapon(S)?'已携带武器':'需要随身近战工具或剑');},
  cycleLimit:function(S){return d.noSupplies?1:Math.min(state(S).areas[d.area]||0,rations(S).reduce(function(n,p){return n+p.n;},0));},
  check:function(S,a){return available(S,d,a);},costs:function(S,a){if(d.noSupplies)return [];var p=ration(S,a);return p?[[p.k,1]]:null;},
  outcome:function(S,a){var out=d.rewards.map(function(p){return{k:p.k,n:p.min+(p.max>p.min?ACTIVITIES.random(a,p.max-p.min+1):0)};});if(a.cycleCosts&&a.cycleCosts[0]){var k=a.cycleCosts[0][0],empty=NATIVE_RULES.consumedFoodReturn(k);if(empty)out.push({k:empty,n:1});}return out;},
  effect:function(S){var t=state(S);if(d.area)t.areas[d.area]--;t.kills[d.id]=(t.kills[d.id]||0)+1;}};GD.sources.push(source);ACTIVITIES.register(source);return source;}
 registerArea({id:'naga_courtyard',name:'寻找新的娜迦庭院',dim:'twilight',seconds:120,icon:'TwilightForest:item.nagaScale@0'});
 registerEncounter({id:'naga',name:'挑战娜迦',area:'naga_courtyard',seconds:90,rewards:[{k:'TwilightForest:item.nagaScale@0',min:6,max:11},{k:'TwilightForest:item.trophy@1',min:1,max:1}],provenance:'TwilightForest 2.7.13 EntityTFNaga.dropFewItems; preparation/time are idle rules'});
 root.ADVENTURES={reset:function(S,id){var t=state(S);if(id){delete t.kills[id];}else{t.areas={};t.kills={};}return true;},state:state,areas:areas,encounters:encounters,weapon:weapon,rations:rations,ration: ration,available:available,registerArea:registerArea,registerEncounter:registerEncounter,equipmentKeys:equipmentKeys,rationKeys:rationKeys};
})(typeof window!=='undefined'?window:globalThis);
