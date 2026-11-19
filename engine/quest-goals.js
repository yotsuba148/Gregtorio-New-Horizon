/* Quest goals read public exploration progress. */
(function(root){
 'use strict';
 QUESTS.registerTask('spaceLanding',{met:function(S,g){return SPACE_DESTINATIONS.landed(S,g.destination);}});
 QUESTS.registerTask('spaceKnowledge',{met:function(S,g){return !!(S.mechanisms&&S.mechanisms.knowledge&&S.mechanisms.knowledge[g.knowledge]);}});
})(typeof window!=='undefined'?window:globalThis);
