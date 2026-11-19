(function(root){
 'use strict';var recipes={},wild={};GD.furnace.forEach(function(r){if(!recipes[r.in])recipes[r.in]=r;var item=CONTENT.item(r.in);if(item&&item.meta===32767)wild[item.id]=r;});
 function find(k){k=CONTENT.canonicalKey(k);var item=CONTENT.item(k);return recipes[k]||(item&&wild[item.id])||null;}
 function fuelTicks(k){var p=root.NATIVE_RULES&&root.NATIVE_RULES.properties(k);if(p&&p.verified)return p.burn;var base=CONTENT.baseKey(k),tag=CONTENT.tag(k)||'';if(root.BURN_TICKS[base])return root.BURN_TICKS[base];if(/Lignite/.test(tag))return 400;if(/Coke/.test(tag))return 3200;if(/Coal|Charcoal/.test(tag))return 1600;return 0;}
 function fuelSlotLimit(k){return CONTENT.canonicalKey(k)==='minecraft:lava_bucket@0'?1:Infinity;}
 function ensure(f){
  var legacy=f.furnaceSchema!==1;
  if(legacy||!Number.isFinite(f.burnTicks)||f.burnTicks<0)f.burnTicks=Number.isFinite(f.burn)&&f.burn>0?Math.round(f.burn*20):0;
  if(legacy||!Number.isFinite(f.progressTicks)||f.progressTicks<0)f.progressTicks=Number.isFinite(f.prog)&&f.prog>0?Math.round(f.prog*20):0;
  f.burnTicks=Math.floor(f.burnTicks);f.progressTicks=Math.min(200,Math.floor(f.progressTicks));f.furnaceSchema=1;
  f.burn=f.burnTicks/20;f.prog=f.progressTicks/20;return f;
 }
 function state(f){ensure(f);var r=f.input&&find(f.input.k),cap=f.hop?3456:64,can=!!r&&f.input.n>0&&(!f.out||f.out.k===r.out)&&(!f.out||f.out.n+(r.n||1)<=cap),burning=f.burnTicks>0;
  return{recipe:r,can:can,burning:burning,progress:can&&burning?Math.min(1,f.progressTicks/200):0};
 }
 function tick(f,S){
  var current=state(f),r=current.recipe,can=current.can;delete f.status;
  if(can&&f.burnTicks<=0&&f.fuel&&fuelTicks(f.fuel.k)>0){var k=f.fuel.k,empty=(GD.containerRegistry||[]).find(function(c){return c.filled===k;});if(empty&&f.fuel.n>1){f.status='燃料槽需要留空间放空容器';return;}f.burnTicks=fuelTicks(k);f.fuel.n--;if(f.fuel.n<=0)f.fuel=empty?{k:empty.empty,n:1}:null;}
  if(can&&f.burnTicks>0){f.progressTicks=root.GAME_TIME?GAME_TIME.advance(S,f.progressTicks,200,1):f.progressTicks+1;if(f.progressTicks>=200){if(!f.out)f.out={k:r.out,n:0};f.out.n+=r.n||1;f.input.n--;if(f.input.n<=0)f.input=null;f.progressTicks-=200;}}else f.progressTicks=0;
  if(f.burnTicks>0)f.burnTicks--;
  f.burn=f.burnTicks/20;f.prog=f.progressTicks/20;
 }
 root.FURNACES={tick:tick,ensure:ensure,state:state,fuelTicks:fuelTicks,fuelSlotLimit:fuelSlotLimit,recipes:recipes,find:find};
})(typeof window!=='undefined'?window:globalThis);

STATE_SCHEMA.register("furnaces",["furs"]);

ITEM_STORES.registerState('world-furnaces',function(S){return (S.furs||[]).flatMap(function(f,i){return [ITEM_STORES.view('world:furnace:'+i,null,[{k:'minecraft:furnace@0',n:1}]),ITEM_STORES.view('world:furnace-items:'+i,f,[f.input,f.fuel,f.out])];});});
