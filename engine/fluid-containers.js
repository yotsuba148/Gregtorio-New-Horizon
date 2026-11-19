(function(root){
 'use strict';
 var cached=null,length=-1,filled=new Map(),empty=new Map();
 function registry(){var source=GD.containerRegistry||[];if(source===cached&&source.length===length)return;cached=source;length=source.length;filled=new Map();empty=new Map();source.forEach(function(p){if(!Number.isSafeInteger(p.amount)||p.amount<=0)return;var pair={filled:CONTENT.canonicalKey(p.filled),empty:CONTENT.canonicalKey(p.empty),fluid:p.fluid,amount:p.amount};if(!filled.has(pair.filled))filled.set(pair.filled,[]);filled.get(pair.filled).push(pair);if(!empty.has(pair.empty))empty.set(pair.empty,new Map());var fluids=empty.get(pair.empty);if(!fluids.has(pair.fluid))fluids.set(pair.fluid,[]);fluids.get(pair.fluid).push(pair);});}
 function config(m){return(STRUCTURES.instance(m)||{}).containerProcessing;}
 function ensure(m){var d=STRUCTURES.instance(m);if(!d||!d.containerProcessing)return;['in','out'].forEach(function(kind){var field=kind==='in'?'ins':'outs';if(!Array.isArray(m[field]))m[field]=[];while(m[field].length<d.slots[kind])m[field].push(null);});}
 function accepts(m,k){var c=config(m);if(!c)return false;registry();k=CONTENT.canonicalKey(k);return c.empty!==false&&filled.has(k)||c.fill!==false&&empty.has(k);}
 function plan(m){
  var c=config(m),s=c&&m.ins[c.input||0];if(!s||!Number.isSafeInteger(s.n)||s.n<1||s.entityUid||GTTransactions.isInstance(s))return null;registry();var k=CONTENT.canonicalKey(s.k),input=c.input||0,output=c.output||0;
  var h=TRANSPORT_PORTS.manualFluid(ENGINE.networks,ENGINE.state,m,'fin',c.tank||0);if(!h)return null;
  var candidates=c.empty!==false&&filled.get(k),inserting=!!candidates;
  if(!candidates&&c.fill!==false&&empty.has(k)){var types=new Set(),pairs=empty.get(k);candidates=[];TRANSPORT_PORTS.fluidParts(h).forEach(function(p){(p.indices||p.tanks.map(function(_,i){return i;})).forEach(function(i){var t=p.tanks[i];if(t&&t.mb>0&&!types.has(t.f)){types.add(t.f);candidates.push.apply(candidates,pairs.get(t.f)||[]);}});});}
  if(!candidates||!candidates.length)return null;
  for(var i=0;i<candidates.length;i++){var pair=candidates[i],handler=h.forFluid?h.forFluid(pair.fluid):h,liquid=TRANSPORT_PORTS.fluidPlan(handler,pair.fluid,pair.amount,inserting);if(liquid.moved!==pair.amount)continue;
   var converted={k:inserting?pair.empty:pair.filled,n:1},target=CORE.slotBox([m.outs[output]||null]),temp=CORE.slotBox([converted]);if(CORE.transferSlot({from:temp,index:0,to:target,n:1}).moved!==1)continue;
   return{pair:pair,inserting:inserting,commit:function(){liquid.commit();var rest=(s.n==null?1:s.n)-1;m.ins[input]=rest?Object.assign({},s,{n:rest}):null;m.outs[output]=target.arr[0];}};
  }return null;
 }
 // One whole registered container per live tick, with no access to player storage.
 function tick(m){var transaction=plan(m);if(!transaction)return false;transaction.commit();return true;}
 root.FLUID_CONTAINERS={ensure:ensure,migrate:function(S){(S.fx&&S.fx.machines||[]).forEach(ensure);},accepts:accepts,plan:plan,tick:tick};
})(typeof window!=='undefined'?window:globalThis);
