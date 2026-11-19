(function(root){
 'use strict';
 var key='Railcraft:machine.alpha@7';
 // A native hollow 3x3x3 oven costs 26 blocks: the placed block plus 25.
 // It has shared inventories, not GT hatches or nine independent machines.
 MULTIBLOCKS.registerShape('railcraft_cokeoven',{w:3,h:3,cx:1,cy:1,builtin:true,builtinFaces:true});
 function migrate(S){(S.fx&&S.fx.machines||[]).forEach(function(m){if(m.k===key)m.cokeGridSchema=1;});}
 root.COKE_OVEN={key:key,migrate:migrate};
})(typeof window!=='undefined'?window:globalThis);
