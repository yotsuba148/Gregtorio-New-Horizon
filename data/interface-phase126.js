(function(){
 'use strict';
 if(!GD.iconOverrides)GD.iconOverrides={};
 GD.iconOverrides['minecraft:skull@1']='modicons/phase126/wither-skull.png';
 GD.quests.forEach(function(q){if(q.chap==='Chemistry')q.chapi=25.5;});
 CONTENT.data.native.space.oxygenTanks.forEach(function(t){var key=t.states[String(t.capacity)],name=(GD.items[key]||CONTENT.item(key).name).replace(/\s*[（(][^）)]*[）)]\s*$/,'');GD.items[key]=name+'（空）';CONTENT.item(key).name=GD.items[key];});
})();
