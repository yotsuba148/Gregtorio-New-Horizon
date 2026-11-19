(function(root){
 'use strict';
 var id='idle:ender_cargo',key=id+'@0',name='末影跃迁货箱',slots=10,capacity=32000;
 var C=CONTENT,P=TRANSPORT_PORTS;
 C.registerItem({id:id,k:key,base:key,meta:0,name:name,maxStack:64});
 GD.catalog.push(key);
 (GD.faceIcons||(GD.faceIcons={}))[key]='modicons/front/ender_cargo.png';
 (GD.gridFaceIcons||(GD.gridFaceIcons={}))[key]=GD.faceIcons[key];
 var def={key:key,cat:'ender_cargo',cn:name,entityName:name,tag:'物流',tier:0,volt:0,
  recipeMap:'none:storage',behavior:'ender_cargo',slots:{in:0,out:0},storage:true,fluidInputTanks:[],
  fluidOutputTanks:[],energyCapacity:0,startEnergy:0,amperage:0,autoItems:false,autoFluids:false,
  noFaceSettings:true,supportsCovers:false,runSwitch:false,controlCircuit:false,resetOnDismantle:true,windowWidth:440};
 GD.extraMachineDefinitions.push(def);DEFS.register(def);
 function isCargo(m){return !!m&&m.k===key;}
 function normalize(raw){return String(raw||'').trim().slice(0,48);}
 function stock(S,channel){
  var table=S&&S.sharedCargo;
  return channel&&table&&Object.hasOwn(table,'#'+channel)?table['#'+channel]:null;
 }
 function bind(S,m,raw){
  if(!isCargo(m)||!ENTITIES.isGrid(m))return false;
  var channel=normalize(raw);
  if(channel&&!stock(S,channel)){
   if(!S.sharedCargo)S.sharedCargo=Object.create(null);
   S.sharedCargo['#'+channel]={slots:Array(slots).fill(null),tanks:[null]};
  }
  if(channel)m.cargoChannel=channel;else delete m.cargoChannel;
  return true;
 }
 function live(m){return isCargo(m)&&ENTITIES.isGrid(m);}
 function item(store){return P.itemHandler(store.slots,CORE.slotBox(store.slots));}
 function fluid(store,channel){
  return {id:'cargo:'+channel,kind:'storage',object:store,tanks:store.tanks,caps:[capacity],rate:Infinity};
 }
 P.register({
  supports:function(c){return isCargo(c.index[c.cell])?true:undefined;},
  resolve:function(c){
   var m=c.index[c.cell];if(!isCargo(m))return undefined;
   var store=live(m)&&stock(root.ENGINE.state,m.cargoChannel);
   if(!store)return null;
   if(c.kind==='fluid')return fluid(store,m.cargoChannel);
   if(c.direction==='import'&&(!c.payload||c.payload.entityUid))return null;
   return item(store);
  },
  resources:function(c){
   var found=new Map();
   c.board.machines.forEach(function(m){
    if(!live(m)||found.has(m.cargoChannel))return;
    var store=stock(root.ENGINE.state,m.cargoChannel);
    if(store)found.set(m.cargoChannel,fluid(store,m.cargoChannel));
   });
   return Array.from(found.values());
  },
  manual:function(c){
   var m=c.machine;if(!isCargo(m))return undefined;
   var store=live(m)&&stock(c.state,m.cargoChannel);
   return store&&c.index===0?fluid(store,m.cargoChannel):null;
  }
 });
 ITEM_TRANSFER.register('cargoItem',function(S,r){
  var store=stock(S,r.channel),i=r.index;if(!store||!Number.isInteger(i)||i<0||i>=slots)return null;
  return {arr:store.slots,index:i,get:function(){return store.slots[i];},set:function(v){store.slots[i]=v;},
   accepts:function(s){return !s.entityUid;}};
 });
 ITEM_TRANSFER.register('cargoFluid',function(S,r){
  var m=ENTITIES.get(S,r.uid);
  if(!live(m)||!stock(S,m.cargoChannel)||m.cargoChannel!==r.channel)return null;
  return {machine:m,fluid:true,kind:'fin',index:0};
 });
 ENGINE.registerBehavior('ender_cargo',{
  gridTick:false,
  status:function(m,d,make){return m.cargoChannel?make('stored',m,'频道 '+m.cargoChannel):make('binding',m,'设置频道');}
 });
 STATE_SCHEMA.register('shared-cargo',['sharedCargo']);
 ITEM_STORES.registerState('shared-cargo',function(S){
  return Object.entries(S.sharedCargo||{}).map(function(entry){
   var items=entry[1].slots;return ITEM_STORES.view('cargo:'+entry[0],items,items,{recover:false});
  });
 });
 root.SHARED_CARGO={key:key,slots:slots,capacity:capacity,isCargo:isCargo,stock:stock,bind:bind};
})(typeof window!=='undefined'?window:globalThis);
