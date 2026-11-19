(function () {
 'use strict';
 var dungeonIds=[1433,1446,1530,1723,2752,2750,2708],rocketIds=[810,1429,1454,1535,1726,2640,2642,2644];
 function quest(id,name,pre,desc,groups){
  var q=GD.quests.find(function(q){return q.id===id;});
  if(!q){q={id:id,chap:'SpaceRace',chapcn:'太空竞赛',chapi:29,items:[]};GD.quests.push(q);}
  Object.assign(q,{name:name,pre:pre,desc:desc});
  GD.questRules.rules[id]={pre:pre,preLogic:'AND',taskLogic:'AND',groups:groups,resolved:true};
 }
 SPACE_DESTINATIONS.list().forEach(function(p){
  p.actions.filter(function(a){return a.unlock;}).forEach(function(a){
   var tier=Number(a.unlock.slice(-1)),id=dungeonIds[tier-2],existing=GD.quests.find(function(q){return q.id===id;});
   quest(id,a.name,existing?existing.pre:[rocketIds[tier-2]],'前往'+p.name+'挑战地牢，获得图纸并解锁NASA工作台的'+tier+'阶火箭。',
    [{type:'spaceKnowledge',knowledge:a.unlock,label:'解锁T'+tier+'火箭'}]);
   if(tier<6)return;
   var rocket=SPACEFLIGHT_CONTENT.rockets.find(function(r){return r.tier===tier;});
   var destinations=SPACEFLIGHT_CONTENT.planets.filter(function(body){return body.tier===tier;}).map(function(body){return body.name;});
   quest(rocketIds[tier-1],tier+'阶火箭',[id],'在NASA工作台组装火箭，前往'+destinations.join('、')+'。',
    [{type:'retrieval',ignoreNBT:true,items:[{k:rocket.itemId+'@0',n:1}]}]);
  });
 });
})();
