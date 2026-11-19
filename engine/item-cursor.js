(function(root){
 'use strict';
 var T=ITEM_TRANSFER,TX=GTTransactions,CURSOR={type:'cursor'};
 function held(S){return S.itemCursor&&S.itemCursor.stack||null;}
 function normalize(S){var p=S.itemCursor;if(!p||!p.stack){S.itemCursor=null;return;}p.stack.k=CONTENT.canonicalKey(p.stack.k);if(p.sourceIdentity){var source=JSON.parse(p.sourceIdentity);source[0]=CONTENT.canonicalKey(source[0]);p.sourceIdentity=JSON.stringify(source);}if(!Number.isSafeInteger(T.count(p.stack))||T.count(p.stack)<1||T.count(p.stack)>T.endpoint(S,CURSOR).cap(p.stack))throw Error('鼠标物品数量无效');}
 function sourceRef(S,r){var next=TX.clone(r);if(next.type==='chest'){var c=(S.chests||[])[next.box];if(c){if(!c.itemStoreId)c.itemStoreId='store-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);next.storeId=c.itemStoreId;}}return next;}
 function clear(S){if(!held(S))S.itemCursor=null;}
 function same(a,b){return !!a&&!!b&&CONTENT.canonicalKey(a.k)===CONTENT.canonicalKey(b.k)&&!TX.isInstance(a)&&!TX.isInstance(b);}
 function pickup(S,ref,button){
  if(held(S))return{ok:false,code:'HOLDING'};
  var from=sourceRef(S,ref),e=T.endpoint(S,from),s=e&&e.get&&e.get();if(!s)return{ok:false,code:'EMPTY'};
  var n=Math.min(T.count(s),TX.isInstance(s)?1:CORE.maxStack(s.k));if(button===2)n=Math.ceil(n/2);
  var old=S.itemCursor;S.itemCursor={stack:null,origin:from,pickedAt:Date.now(),sourceIdentity:T.identity(s),sourceConfiguration:e.snapshot&&e.snapshot()};
  var r=T.move(S,from,CURSOR,{n:n,swap:false});if(!r.ok)S.itemCursor=old;return r;
 }
 function place(S,ref,button,options){
  var s=held(S);if(!s)return pickup(S,ref,button);
  var e=T.endpoint(S,ref);if(!e)return{ok:false,code:'TARGET'};
  var t=e.get&&e.get(),r;
  if(!e.fluid&&!e.accepts(s)&&same(s,t))r=T.move(S,ref,CURSOR,{n:CORE.maxStack(s.k)-T.count(s),swap:false});
  else r=T.move(S,CURSOR,ref,{n:options&&options.n!=null?options.n:button===2&&(!t||same(s,t)||e.fluid)?1:T.count(s)});
  if(r.ok&&r.swapped){S.itemCursor.origin=sourceRef(S,ref);S.itemCursor.sourceIdentity=T.identity(held(S));}
  clear(S);return r;
 }
 function returnHeld(S){
  var s=held(S);if(!s)return{ok:true,moved:0,remaining:0};var total=0,origin=S.itemCursor.origin,k=s.k;
  if(origin&&origin.type!=='trash'){var r=T.move(S,CURSOR,origin,{swap:false,restore:true});if(r.ok)total+=r.moved;}
  var targets=[{type:'bag',group:true}].concat((S.chests||[]).map(function(_,box){return{type:'chest',box:box,group:true};}));
  targets.forEach(function(to){if(held(S)){var r=T.move(S,CURSOR,to,{swap:false});if(r.ok)total+=r.moved;}});
  var remaining=T.count(held(S));clear(S);return{ok:remaining===0,k:k,moved:total,remaining:remaining,code:remaining?'SLOTS':null};
 }
 function distribution(S,refs,button){
  var s=held(S);if(!s)return[];var seen=new Set(),valid=[];
  refs.forEach(function(ref){var e=T.endpoint(S,ref),id=e&&e.id,t=e&&e.get&&e.get();if(!e||e.group||e.fluid||e.locked()||seen.has(id)||!e.accepts(s)||t&&!same(s,t)||e.cap(s)<=T.count(t))return;seen.add(id);valid.push({ref:ref,cap:e.cap(s)-T.count(t),previous:T.count(t)});});
  var each=button===2?1:Math.floor(T.count(s)/Math.max(1,valid.length));return valid.map(function(v){return{ref:v.ref,n:Math.min(v.cap,each),total:v.previous+Math.min(v.cap,each)};}).filter(function(v){return v.n>0;});
 }
 function distribute(S,refs,button){var plan=distribution(S,refs,button),total=0,k=held(S)&&held(S).k;plan.forEach(function(p){if(held(S)){var r=T.move(S,CURSOR,p.ref,{n:p.n,swap:false});if(r.ok)total+=r.moved;}});clear(S);return{ok:total>0,k:k,moved:total,remaining:T.count(held(S)),code:total?null:'ITEM'};}
 function collect(S,refs){var s=held(S);if(!s||TX.isInstance(s))return{ok:false,code:'ITEM'};var total=0,k=s.k;
  refs.forEach(function(ref){var e=T.endpoint(S,ref),t=e&&e.get&&e.get(),room=CORE.maxStack(k)-T.count(held(S));if(room>0&&same(held(S),t)){var r=T.move(S,ref,CURSOR,{n:room,swap:false});if(r.ok)total+=r.moved;}});return{ok:total>0,k:k,moved:total};
 }
 function quick(S,from,targets,options){
  options=options||{};var e=T.endpoint(S,from),s=e&&e.get&&e.get();if(!s)return{ok:false,code:'EMPTY'};var moved=0,k=s.k,remaining=Math.min(options.n||T.count(s),T.count(s));
  var list=[];targets.forEach(function(to){var b=T.endpoint(S,to);if(!b)return;if(options.emptyOnly&&b.group)b.arr.forEach(function(t,index){if(!t)list.push(Object.assign({},to,{group:false,index:index}));});else if(!options.emptyOnly||b.get&&!b.get())list.push(to);});
  list.sort(function(a,b){var ea=T.endpoint(S,a),eb=T.endpoint(S,b);return Number(!(ea.get&&same(s,ea.get())))-Number(!(eb.get&&same(s,eb.get())));});
  list.forEach(function(to){if(remaining>0){var r=T.move(S,from,to,{n:remaining,swap:false});if(r.ok){moved+=r.moved;remaining-=r.moved;}}});return{ok:moved>0,k:k,moved:moved,remaining:remaining,code:moved?null:'SLOTS'};
 }
 root.ITEM_CURSOR={held:held,normalize:normalize,pickup:pickup,place:place,returnHeld:returnHeld,distribution:distribution,distribute:distribute,collect:collect,quick:quick,same:same};
})(typeof window!=='undefined'?window:globalThis);

STATE_SCHEMA.register("item-cursor",["itemCursor"]);

ITEM_STORES.registerState('cursor',function(S){return S.itemCursor&&S.itemCursor.stack?[ITEM_STORES.view('player:cursor',S.itemCursor,[S.itemCursor.stack])]:[];});
