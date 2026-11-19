(function(root){
 'use strict';
 ['dreamcraft:item.WoodenBrickForm@0','dreamcraft:item.WoodenBrickForm@32767','dreamcraft:item.WoodenBrickForm@1'].forEach(function(k){GD.toolRules[k]=Object.assign({},GD.toolRules[k],{unbreakable:true,maxUses:0,craftWear:0,containerTool:true});});
})(typeof window!=='undefined'?window:globalThis);
