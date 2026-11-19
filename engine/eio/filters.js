(function(root){
 'use strict';
 var TX=GTTransactions;
 function config(stack){var spec=stack&&EIO_CONTENT.filter(stack.k);if(!spec)return null;
  if(!stack.eioFilter)stack.eioFilter={samples:Array(spec.slots).fill(null),whitelist:true};return stack.eioFilter;
 }
 function identity(stack,nbt){var item=CONTENT.item(stack.k),key=CONTENT.baseKey(stack.k);if(!nbt)return key;
  var rest=TX.clone(stack);delete rest.n;delete rest.k;delete rest.chance;delete rest.slot;return JSON.stringify([key,item&&item.nbt||null,rest]);
 }
 function pass(stack,item){if(!stack)return true;var c=config(stack);if(!c)return false;
  var found=c.samples.filter(Boolean).some(function(sample){return identity(sample)===identity(item);});return c.whitelist?found:!found;
 }
 function fluidPass(c,fluid){var list=(c.samples||[]).filter(Boolean);if(!list.length)return true;var found=list.includes(CONTENT.canonicalFluid(fluid));return c.whitelist===false?!found:found;}
 function setSample(S,ref,index,held){var p=EIO_STATE.get(S,ref.blueprintId,ref.kind,ref.cell),f=p&&p.faces[ref.side];if(!f)return{ok:false,code:'INTERFACE'};
  var data,limit;if(ref.kind==='eioItem'){var st=f.filters[ref.flow==='insert'?0:1];data=config(st);if(!data)return{ok:false,code:'FILTER'};limit=EIO_CONTENT.filter(st.k).slots;}else{data=f[ref.flow];limit=5;}
  if(!Number.isInteger(index)||index<0||index>=limit)return{ok:false,code:'SLOT'};
  var value=null;if(held){if(ref.kind==='eioItem'){value=TX.clone(held);value.n=1;}else{var pair=GD.containerRegistry.find(function(c){return c.filled===CONTENT.canonicalKey(held.k)&&c.amount>0;});if(!pair)return{ok:false,code:'FLUID_CONTAINER'};value=pair.fluid;}}
  data.samples[index]=value;return{ok:true};
 }
 function configure(S,ref,values){var p=EIO_STATE.get(S,ref.blueprintId,ref.kind,ref.cell),f=p&&p.faces[ref.side];if(!f)return{ok:false,code:'INTERFACE'};
  var stack=ref.kind==='eioItem'&&f.filters[ref.flow==='insert'?0:1],c=ref.kind==='eioItem'?config(stack):f[ref.flow];if(!c)return{ok:false,code:'FILTER'};
  if(Object.keys(values).some(function(k){return k!=='whitelist';}))return{ok:false,code:'CONFIG'};
  Object.assign(c,values);return{ok:true};
 }
 ITEM_TRANSFER.register('eio:upgrade',function(S,r){var p=EIO_STATE.get(S,r.blueprintId,r.kind,r.cell),f=p&&p.faces[r.side],field=r.field,i=r.index;if(!f||r.kind!=='eioItem'||!['filters','upgrades'].includes(field)||!Number.isInteger(i)||i<0||i>=(field==='filters'?2:1))return null;var arr=f[field];
  return{arr:arr,index:i,get:function(){return arr[i];},set:function(v){arr[i]=v;if(v&&field==='filters')config(v);},accepts:function(s){return !s.entityUid&&!!(field==='filters'?EIO_CONTENT.filter(s.k):EIO_CONTENT.speed(s.k));},cap:function(s){return field==='filters'||EIO_CONTENT.speed(s.k)==='down'?1:15;}};
 });
 root.EIO_FILTERS={identity:identity,config:config,pass:pass,fluidPass:fluidPass,setSample:setSample,configure:configure};
})(typeof window!=='undefined'?window:globalThis);
