/* Native BQ AND/OR and optional tasks; confirmation remains a non-consuming milestone. */
(function(root){
 'use strict';var C=CONTENT,data=GD.questRules||{rules:{}},snapshotState=null,snapshotItems=null,taskTypes=new Map(),achievementStates=new WeakSet();
 function registerTask(type,handler){if(taskTypes.has(type)||!handler||typeof handler.met!=='function')throw Error('Invalid quest task type: '+type);taskTypes.set(type,handler);}
 function taskInfo(S,g){var h=taskTypes.get(g.type);return h?{text:g.label||'',met:!!h.met(S,g)}:null;}
 function withSnapshot(S,fn){if(snapshotState===S)return fn();var priorState=snapshotState,priorItems=snapshotItems;snapshotItems=null;snapshotState=S;countIndex=null;countIndexState=null;try{return fn();}finally{snapshotState=priorState;snapshotItems=priorItems;}}
 function checkedRule(rule,q){
  if(!rule.resolved&&root.QUEST_RULE_PATCH)rule=root.QUEST_RULE_PATCH(rule,q)||rule;
  for(var group of rule.groups||[]){
   if(group.type==='checkbox'&&!group.qid)group.qid=String(q.id);
  }
  return rule;
 }
 function rule(q){
  var hit=data.rules[q.id];
  if(hit)return checkedRule(hit,q);
  hit={pre:q.pre||[],preLogic:'AND',taskLogic:'AND',groups:[{type:'retrieval',ignoreNBT:true,items:(q.items||[]).map(function(p){return{k:p[0].includes('@')?p[0]:p[0]+'@'+p[1],n:p[2]||1};})}]};
  hit=checkedRule(hit,q);
  data.rules[q.id]=hit;
  return hit;
 }
 function aggregate(values,logic){if(logic==='XOR')return values.filter(Boolean).length===1;return logic==='OR'?values.length===0||values.some(Boolean):values.every(Boolean);}
 function ready(S,q){var r=rule(q);return aggregate(r.pre.map(function(id){return !!(S.qever&&S.qever[id]);}),r.preLogic);}
 function groups(q,optional){var selected=rule(q).groups.filter(function(g){return !!g.optional===!!optional;});if(!optional||!root.CONTENT_SCOPE)return selected;return selected.map(function(g){return Object.assign({},g,{items:g.items.filter(function(p){return root.CONTENT_SCOPE.ingredientAllowed(p.k);})});}).filter(function(g){return g.type!=='retrieval'||g.items.length;});}
 function subset(expected,actual,partial){if(expected===null||typeof expected!=='object')return expected===actual;if(!actual||typeof actual!=='object')return false;if(Array.isArray(expected)){return Array.isArray(actual)&&expected.every(function(v,i){return subset(v,actual[i],partial);})&&(partial||expected.length===actual.length);}var keys=Object.keys(expected);return(partial||keys.length===Object.keys(actual).length)&&keys.every(function(k){return subset(expected[k],actual[k],partial);});}
 var oreMatches=new Map();
 function matchesOre(tag,key){
  var members=C.data.ore[tag],cached=oreMatches.get(tag);
  if(!members)return false;
  if(!cached||cached.members!==members){
   cached={members:members,match:C.ingredientMatcher(members.map(function(i){return C.data.items[i].k;}),function(){return true;})};
   oreMatches.set(tag,cached);
  }
  return cached.match(key);
 }
 function matches(p,s,g){var a=C.item(s.k);if(!a)return false;var key=C.canonicalKey(p.k),at=key.lastIndexOf('@'),id=key.slice(0,at),meta=Number(key.slice(at+1));var same=p.ore?matchesOre(p.ore,s.k):C.canonicalKey(s.k)===key||a.id===id&&(meta===32767||a.meta===meta);
  if(!same)return false;if(!g.ignoreNBT&&p.nbt){var n=a.nbt&&SNBT.tryParse(a.nbt);if(!subset(p.nbt,n,!!g.partialNBT))return false;}return true;}
 function stacks(S){return ITEM_STORES.items(S,'quest');}
 function inventory(S){if(snapshotState!==S)return stacks(S);if(!snapshotItems)snapshotItems=stacks(S);return snapshotItems;}
 /* 同一次快照里按物品身份累计一次，避免每件需求物品都重扫库存。 */
 var countIndex=null,countIndexState=null;
 function stackIdentity(s){var it=C.item(s&&s.k);return it?it.id+'@'+it.meta:null;}
 function indexFor(S){
  if(snapshotState!==S)return null;
  if(countIndexState===S&&countIndex)return countIndex;
  countIndex=new Map();countIndexState=S;
  inventory(S).forEach(function(s){
   var key=stackIdentity(s);if(!key)return;
   countIndex.set(key,(countIndex.get(key)||0)+(s.n==null?1:s.n));
  });
  return countIndex;
 }
 function count(S,p,g){
  var conf=g||{ignoreNBT:true};
  var it=C.item(p.k);
  if(it&&!p.ore&&!p.nbt&&it.meta!==32767){
   var index=indexFor(S);
   if(index)return index.get(it.id+'@'+it.meta)||0;
  }
  return inventory(S).reduce(function(n,s){return n+(matches(p,s,conf)?(s.n==null?1:s.n):0);},0);
 }
 function retrievalMet(stock,g){
  return GTTransactions.hasIngredients(stock,g.items,function(p,s){return matches(p,s,g);});
 }
 function groupMet(S,g){if(g.optional)return true;if(g.type==='checkbox')return !!(g.qid&&S.questChecks&&S.questChecks[g.qid]);var h=taskTypes.get(g.type);if(h)return !!h.met(S,g);if(g.type==='location'){var dim=g.dimension===-1?'nether':g.dimension===0?'overworld':null;return !!dim&&TRAVEL.can(S,dim);}if(g.type!=='retrieval')return false;if(g.requireOnlyOneItem)return g.items.some(function(p){return count(S,p,g)>=p.n;});return retrievalMet(inventory(S),g);}
 function progressKey(g,p){return JSON.stringify([g.id||g.items,g.items.indexOf(p),g.ignoreNBT!==false,!!g.partialNBT,p]);}
 function achieved(S,q,g,p){return !!(S.questAchievements&&S.questAchievements[q.id]&&S.questAchievements[q.id][progressKey(g,p)]);}
 function progress(S,q,g,p){return achieved(S,q,g,p)?p.n:Math.min(p.n,count(S,p,g));}
 function migrateAchievements(S){if(achievementStates.has(S))return false;achievementStates.add(S);var changed=false;(GD.questProgressMigrations||[]).forEach(function(m){var old=S.questAchievements&&S.questAchievements[m.fromQuest];if(!(old&&old[m.from])&&!(S.quests&&S.quests[m.fromQuest]))return;if(!S.questAchievements)S.questAchievements={};var next=S.questAchievements[m.toQuest]||(S.questAchievements[m.toQuest]={});if(!next[m.to]){next[m.to]=true;changed=true;}});return changed;}
 function observe(S,list){return withSnapshot(S,function(){var changed=migrateAchievements(S);(list||GD.quests).forEach(function(q){if(S.quests&&S.quests[q.id]||!ready(S,q))return;groups(q).forEach(function(g){if(g.type!=='retrieval'||g.optional)return;
   g.items.forEach(function(p){if(achieved(S,q,g,p)||count(S,p,g)<p.n)return;
    if(!S.questAchievements)S.questAchievements={};if(!S.questAchievements[q.id])S.questAchievements[q.id]={};S.questAchievements[q.id][progressKey(g,p)]=true;changed=true;
   });});});return changed;});}
 function rememberedGroup(S,q,g){
  if(g.type!=='retrieval'||g.optional)return groupMet(S,g);
  if(g.requireOnlyOneItem)return g.items.some(function(p){return achieved(S,q,g,p)||count(S,p,g)>=p.n;});
  if(g.items.every(function(p){return achieved(S,q,g,p);}))return true;
  var remaining=inventory(S).filter(function(s){return g.items.some(function(p){return matches(p,s,g);});});
  if(retrievalMet(remaining,g))return true;
  return g.items.every(function(p){
   var plan=GTTransactions.planIngredients(remaining,[Object.assign({},p,{consumed:true})],function(p,s){return matches(p,s,g);});
   if(plan)remaining=plan.remaining;
   return !!plan||achieved(S,q,g,p);
  });
 }
 function met(S,q){if(S.quests&&S.quests[q.id])return true;var r=rule(q);return aggregate(groups(q).map(function(g){return rememberedGroup(S,q,g);}),r.taskLogic);}
 function status(S,q){if(S.quests&&S.quests[q.id])return{done:true,ready:true,can:false,kind:'done'};var r=ready(S,q),can=r&&met(S,q);return{done:false,ready:r,can:!!can,kind:can?'can':r?'now':'lock'};}
 function recordCompletion(S,q){
  S.quests[q.id]=1;
  S.qever[q.id]=1;
  return true;
 }
 function complete(S,q){return status(S,q).can&&recordCompletion(S,q);}
 function canCompleteFromDeveloper(S,q){return root.DEVELOPER_MODE.active(S)&&!S.quests[q.id]&&ready(S,q);}
 function completeFromDeveloper(S,q){return canCompleteFromDeveloper(S,q)&&recordCompletion(S,q);}
 function overview(S,list){return withSnapshot(S,function(){var result={states:{},chapters:{},done:0,pending:0};(list||GD.quests).forEach(function(q){var state=status(S,q),chapter=result.chapters[q.chap]||(result.chapters[q.chap]={total:0,done:0,pending:0});result.states[q.id]=state;chapter.total++;if(state.done){chapter.done++;result.done++;}if(state.can){chapter.pending++;result.pending++;}});return result;});}
 function displayKey(S,p,g,staticOnly){var key=C.canonicalKey(p.k);if(staticOnly||!p.ore)return key;var owned=inventory(S).find(function(s){return matches(p,s,g);});return owned?C.canonicalKey(owned.k):key;}
 function label(p){return p.ore==='bedWood'?'任意颜色的床':null;}
 GD.quests.forEach(function(q){var r=rule(q);q.pre=r.pre.slice();});
 root.QUESTS={registerTask:registerTask,taskInfo:taskInfo,observe:observe,progress:progress,achieved:achieved,data:data,rule:rule,ready:ready,groups:groups,met:met,count:count,groupMet:groupMet,matches:matches,withSnapshot:withSnapshot,status:status,complete:complete,canCompleteFromDeveloper:canCompleteFromDeveloper,completeFromDeveloper:completeFromDeveloper,overview:overview,displayKey:displayKey,label:label};
})(typeof window!=='undefined'?window:globalThis);

STATE_SCHEMA.register("quests",["quests", "qever", "questAchievements", "questChecks"]);
