/* Private machine storage never enters the processing or pipe inventories. */
(function(root){
 'use strict';
 var rules=MACHINE_STORAGE_RULES,molds=new Set(rules.molds),dies=new Set(rules.dies),lenses=new Set(Object.keys(CONTENT.data.ore).filter(function(k){return /^lens[A-Z]/.test(k);}).flatMap(function(k){return CONTENT.data.ore[k].map(function(i){return CONTENT.data.items[i].base||CONTENT.data.items[i].k;});})),profiles=new WeakMap();
 function profile(d){if(!d)return null;if(profiles.has(d))return profiles.get(d);var p=null;
  if(/^gregtech:gt.blockmachines@/.test(d.key)&&!d.multiblock&&!d.requiresStructure&&!d.worldOnly&&root.ENGINE&&ENGINE.behaviors&&ENGINE.behaviors[d.behavior]&&ENGINE.behaviors[d.behavior].personalStorage){
   var electric=d.volt>0&&!d.steamPowered&&d.behavior!=='boiler',shape=d.recipeMap==='gt.recipe.laserengraver'?'lens':d.recipeMap==='gt.recipe.extruder'?'die':['gt.recipe.alloysmelter','gt.recipe.fluidsolidifier'].includes(d.recipeMap)?'mold':null;
   p={slots:electric?2:1,electric:electric,shape:shape,shapeSlots:shape?10:0};
  }profiles.set(d,p);return p;
 }
 function ensure(m){var p=profile(DEFS.of(m.k));if(!p)return null;if(!m.personalStorage)m.personalStorage={items:[],shapes:[]};['items','shapes'].forEach(function(k){if(!Array.isArray(m.personalStorage[k]))m.personalStorage[k]=[];});while(m.personalStorage.items.length<p.slots)m.personalStorage.items.push(null);while(m.personalStorage.shapes.length<p.shapeSlots)m.personalStorage.shapes.push(null);return p;}
 function battery(s){return s&&rules.batteries[CONTENT.baseKey(s.k)]||null;}
 function charge(s){
  var r=battery(s);if(!r)return 0n;
  var value=s.electricCharge;
  if(value==null){
   var item=CONTENT.item(s.k),nbt=item&&item.nbt;
   if(r.chargeTag){
    var tags=nbt&&SNBT.tryParse(nbt);
    value=Math.trunc(tags&&tags[r.chargeTag]||0);
   }else{
    var match=nbt&&/['"]?GT\.ItemCharge['"]?\s*:\s*(-?\d+)[lL]?/.exec(nbt);
    value=match?match[1]:'0';
   }
  }
  try{var n=BigInt(value),cap=BigInt(r.capacity);return n<0n?0n:n>cap?cap:n;}catch(_){return 0n;}
 }
 function endpoint(S,ref){var m=ENTITIES.get(S,ref.uid),p=m&&ensure(m),i=Number(ref.index);if(!p||!ENTITIES.active(m)||!['items','shapes'].includes(ref.kind)||!Number.isInteger(i)||i<0||i>=(ref.kind==='items'?p.slots:p.shapeSlots))return null;var arr=m.personalStorage[ref.kind];return{id:JSON.stringify(ref),ref:ref,arr:arr,index:i,get:function(){return arr[i]||null;},set:function(v){arr[i]=v;},locked:function(){return false;},accepts:function(s){return ref.kind==='items'||!s.entityUid&&(p.shape==='die'?dies:p.shape==='lens'?lenses:molds).has(CONTENT.baseKey(s.k));},cap:function(s){return GTTransactions.isInstance(s)||ref.kind==='items'&&i===0&&p.electric&&battery(s)?1:CORE.maxStack(s.k);}};}
 function contents(m){return m.personalStorage?(m.personalStorage.items||[]).concat(m.personalStorage.shapes||[]).filter(Boolean):[];}
 function energy(m,d){var p=ensure(m);if(!p||!p.electric)return false;var s=m.personalStorage.items[0],r=battery(s);if(!r||(s.n==null?1:s.n)!==1||r.tier>d.tier)return false;var stored=charge(s),cap=BigInt(r.capacity),eu=Math.max(0,Math.floor(m.eu||0)),limit=Math.max(0,Math.floor(r.transfer)),capacity=Math.max(0,Math.floor(d.energyCapacity||0)),n=0;
  if(eu<capacity/3&&[-2,-3].includes(r.mode)){n=Math.min(limit,capacity-eu,Number(stored>BigInt(limit)?BigInt(limit):stored));if(n>0){s.electricCharge=String(stored-BigInt(n));m.eu=eu+n;return true;}}
  else if(eu>capacity*2/3&&[-1,-3].includes(r.mode)){var room=cap-stored;n=Math.min(limit,eu,Number(room>BigInt(limit)?BigInt(limit):room));if(n>0){s.electricCharge=String(stored+BigInt(n));m.eu=eu-n;return true;}}
  return false;
 }
 function priority(ref,s){if(ref.type!=='machineStorage')return 1;if(ref.kind==='shapes')return 0;return ref.index===0&&battery(s)?0:2;}
 function slot(m,kind,i,label,glyph){var s=m.personalStorage[kind][i],r=battery(s),tip=s?nameOf(s.k)+(s.n>1?' ×'+s.n:''):label+'：空';if(r)tip+='，'+charge(s).toLocaleString()+' / '+BigInt(r.capacity).toLocaleString()+' EU';return '<span class="mslot'+(s?'':' mslot-empty')+'" data-transfer-ref="'+esc(JSON.stringify({type:'machineStorage',uid:m.uid,kind:kind,index:i}))+'" data-tip="'+esc(tip)+'" aria-label="'+esc(tip)+'">'+(s?iconHtml(s.k,30):glyph?'<span class="machine-storage-mark">'+UI_KIT.glyph(glyph,17)+'</span>':'<span class="mplus">+</span>')+(s&&s.n>1?'<span class="mn">'+s.n+'</span>':'')+'</span>';}
 function html(m,energy){
  var p=ensure(m);if(!p)return {personal:'',shapes:''};
  var h='<div class="machine-personal-storage'+(p.electric?' machine-powered-storage':'')+'">';
  if(p.electric)h+='<div class="machine-battery-slot">'+slot(m,'items',0,'电池／储物槽','wire')+'</div>'+(energy||'');
  h+='<div class="machine-spare-slot">'+slot(m,'items',p.electric?1:0,'储物槽','store')+'</div></div>';
  var title=p.shape==='die'?'模头存储槽':p.shape==='lens'?'透镜存储槽':'模具存储槽';
  var shapes=p.shape?'<div class="machine-shape-storage"><small>'+title+'</small><div>'+
    Array.from({length:p.shapeSlots},function(_,i){return slot(m,'shapes',i,title);}).join('')+'</div></div>':'';
  return {personal:h,shapes:shapes};
 }
 root.MACHINE_STORAGE={profile:profile,ensure:ensure,endpoint:endpoint,contents:contents,battery:battery,charge:charge,energy:energy,priority:priority,html:html};
 ITEM_TRANSFER.register('machineStorage',endpoint);
})(typeof window!=='undefined'?window:globalThis);

ITEM_STORES.registerEntity('machine-private',function(S,m){
 if(!m.personalStorage)return;
 return {views:['items','shapes'].map(function(field){var arr=m.personalStorage[field];return ITEM_STORES.view(m.uid+':private:'+field,arr,arr);})};
});
