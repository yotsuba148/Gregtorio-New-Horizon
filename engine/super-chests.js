(function(root){
 'use strict';
 function signature(p){if(!p)return null;var v=GTTransactions.clone(p);delete v.n;return JSON.stringify(v);}
 function accepts(m,s){if(!s||s.entityUid)return false;var key=signature(s);return [m.itemStore].concat(m.ins||[],m.outs||[]).filter(Boolean).every(function(p){return signature(p)===key;});}
 function total(m){return [m.itemStore].concat(m.ins||[],m.outs||[]).filter(Boolean).reduce(function(n,p){return n+(p.n==null?1:p.n);},0);}
 ENGINE.registerBehavior('item_storage',{
  slotAccepts:function(m,i,s){return !s.entityUid&&SUPER_CHESTS.accepts(m,s);},
  retainsContents:true,
  panel:'superChest',
  status:function(m,d,make){return make('stored',m,'已存储 '+(typeof fmtCount==='function'?fmtCount(SUPER_CHESTS.total(m)):SUPER_CHESTS.total(m))+' 件');},

  acceptsItem:function(m,k){return [m.itemStore].concat(m.ins||[],m.outs||[]).filter(Boolean).every(function(p){return CONTENT.canonicalKey(p.k)===CONTENT.canonicalKey(k);});},
  tick:function(m){var d=DEFS.of(m.k),input=m.ins[0],store=m.itemStore,out=m.outs[0],changed=false;
   if(input&&(!store||signature(input)===signature(store))){var cap=GTTransactions.isInstance(input)?1:d.itemCapacity,n=Math.min(input.n==null?1:input.n,Math.max(0,cap-(store&&store.n||0)));if(n){if(!store)store=m.itemStore=Object.assign({},GTTransactions.clone(input),{n:0});store.n+=n;input.n=(input.n==null?1:input.n)-n;if(!input.n)m.ins[0]=null;changed=true;}}
   if(store&&(!out||signature(out)===signature(store))){var cap=GTTransactions.isInstance(store)?1:CORE.maxStack(store.k),n=Math.min(store.n,Math.max(0,cap-(out&&out.n||0)));if(n){if(!out)out=m.outs[0]=Object.assign({},GTTransactions.clone(store),{n:0});out.n+=n;store.n-=n;if(!store.n)m.itemStore=null;changed=true;}}
   m.status={code:'STORAGE',text:'已存储 '+(typeof fmtCount==='function'?fmtCount(total(m)):total(m))+' 件'};return changed;
  }
 });
 for(var tier=1;tier<=5;tier++){var key='gregtech:gt.blockmachines@'+(134+tier),def={key:key,cat:'super_chest_'+tier,cn:GD.items[key]||'超级箱 '+DEFS.tagOf(tier),tag:'储物',tier:tier,volt:0,behavior:'item_storage',recipeMap:'none:item_storage',slots:{in:1,out:1,fluid:0},fluidInputTanks:[],fluidOutputTanks:[],energyCapacity:0,startEnergy:0,amperage:0,controlCircuit:false,autoItems:true,autoFluids:false,itemCapacity:4000000*Math.pow(2,tier-1)};GD.extraMachineDefinitions.push(def);GD.machines.cats.push({id:def.cat,cn:def.cn,slots:def.slots,tiers:[{t:tier,tag:'储物',k:key,name:def.cn}]});}
 DEFS.rebuild();root.SUPER_CHESTS={accepts:accepts,total:total};
})(typeof window!=='undefined'?window:globalThis);
