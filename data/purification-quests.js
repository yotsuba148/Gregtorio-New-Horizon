(function(){
 'use strict';
 var chapter={chap:'WaterPurification',chapcn:'净化水',chapi:23};
 var purificationIds=new Set([950061,950062,950063,950081]);

 // Move the quests after their multiblock construction requirements are set.
 GD.quests.forEach(function(quest){
  if(purificationIds.has(quest.id))Object.assign(quest,chapter);
 });
})();
