(function(root){
 'use strict';var key='minecraft:obsidian@0',cells=[[1,0],[2,0],[0,1],[3,1],[0,2],[3,2],[0,3],[3,3],[1,4],[2,4]];
 function slots(S){var t=TRAVEL.ensure(S);if(!t.netherFrame)t.netherFrame=Array(10).fill(null);return t.netherFrame;}
 function count(S){return (TRAVEL.ensure(S).netherFrame||[]).filter(Boolean).length;}
 function endpoint(S,r){if(TRAVEL.can(S,'nether')||!Number.isInteger(r.index)||r.index<0||r.index>=10)return null;var arr=slots(S);return{id:JSON.stringify(r),ref:r,arr:arr,index:r.index,get:function(){return arr[r.index];},set:function(v){arr[r.index]=v;},accepts:function(s){return !s.entityUid&&CONTENT.canonicalKey(s.k)===key;},locked:function(){return false;},cap:function(){return 1;}};}
 function usable(s){var i=s&&CONTENT.item(s.k);return !!(i&&i.id==='minecraft:flint_and_steel'&&(s.equipmentDamage||0)+i.meta<64);}
 function wear(S,s){var n=TOOL_WEAR.amount(S,1);if(!n)return s;s.equipmentDamage=(s.equipmentDamage||0)+n;return s.equipmentDamage+CONTENT.item(s.k).meta>=64?null:s;}
 function complete(S){TRAVEL.ensure(S).netherFrame=Array.from({length:10},function(){return{k:key,n:1};});}
 function ignite(S){if(TRAVEL.can(S,'nether'))return{ok:false,code:'ALREADY_OPEN'};if(count(S)!==10)return{ok:false,code:'FRAME'};var s=ITEM_CURSOR.held(S);if(!usable(s))return{ok:false,code:'IGNITER'};S.itemCursor.stack=wear(S,s);if(!S.itemCursor.stack)S.itemCursor=null;TRAVEL.ensure(S).unlocked.nether={open:true,mode:'frame'};return{ok:true};}
 root.PORTAL_FRAME={key:key,cells:cells,slots:slots,count:count,endpoint:endpoint,usable:usable,wear:wear,complete:complete,ignite:ignite};
 ITEM_TRANSFER.register('portalFrame',endpoint);
})(typeof window!=='undefined'?window:globalThis);
