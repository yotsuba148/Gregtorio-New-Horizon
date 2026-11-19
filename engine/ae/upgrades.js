(function(root) {
  'use strict';
  var prefix='appliedenergistics2:item.ItemMultiMaterial@',cards={
    54:{type:'patternCapacity'},53:{type:'crafting'},63:{type:'advancedBlocking'},
    65:{type:'craftingLock'},66:{type:'fakeCrafting'},29:{type:'fuzzy'},
    30:{type:'speed'},56:{type:'superSpeed'},67:{type:'superluminalSpeed'},
    27:{type:'capacity'},31:{type:'inverter'}
  };
  // Registration.java defines separate limits for each host.
  var hosts={
    interface:{slots:4,patternCapacity:3,crafting:1,advancedBlocking:1,craftingLock:1,fakeCrafting:1,fuzzy:3},
    import:{slots:4,fuzzy:1,capacity:2,speed:4},
    export:{slots:4,fuzzy:1,capacity:2,speed:4,crafting:1},
    storage_bus:{slots:5,fuzzy:1,capacity:5,inverter:1},
    assembler:{slots:5,speed:5},
    ioport:{slots:3,speed:3,superSpeed:3,superluminalSpeed:3}
  };
  function host(m){var d=m&&AE_DEVICES.spec(m);return d&&hosts[d.role];}
  function card(s){if(!s)return null;var k=CONTENT.canonicalKey(s.k);return k.indexOf(prefix)===0?cards[k.slice(prefix.length)]||null:null;}
  function ensure(m){
    if(!m.me)m.me={version:1};if(!m.me.upgrades)m.me.upgrades=[];
    while(m.me.upgrades.length<((host(m)||{}).slots||0))m.me.upgrades.push(null);
    return m.me.upgrades;
  }
  function slots(m){return ensure(m).slice(0,(host(m)||{}).slots||0);}
  function count(m,type,except){
    var h=host(m);if(!h||!h[type])return 0;
    return Math.min(h[type],slots(m).reduce(function(n,s,i){var c=card(s);return n+(i!==except&&c&&c.type===type?1:0);},0));
  }
  function patternSlots(m){return 9*(1+count(m,'patternCapacity'));}
  function sampleSlots(m){var d=AE_DEVICES.spec(m);return d&&d.role==='storage_bus'?18+9*count(m,'capacity'):1+4*count(m,'capacity');}
  function period(){return 5;}
  function transferLimit(m,fluid){var n=[1,8,32,64,96][count(m,'speed')];return fluid?n*1000:n;}
  function ioLimit(m){return 256*[1,2,4,8][count(m,'speed')]*[1,16,128,1024][count(m,'superSpeed')]*[1,131072,8388608,536870912][count(m,'superluminalSpeed')];}
  function samples(m){return (m.me.samples||[]).slice(0,sampleSlots(m)).filter(Boolean);}
  function matches(m,r){
    var list=samples(m),fuzzy=count(m,'fuzzy')>0;
    var found=list.some(function(s){return AE_RESOURCES.identity(s)===AE_RESOURCES.identity(r)||fuzzy&&s.kind==='item'&&r.kind==='item'&&s.key===r.key;});
    return count(m,'inverter')>0?!found:!list.length||found;
  }
  function supports(m){return !!host(m);}
  function accepts(m,index,s){var h=host(m),c=card(s);return !!h&&!!c&&index>=0&&index<h.slots&&!s.entityUid&&!!h[c.type]&&count(m,c.type,index)<h[c.type];}
  function reconcile(S,m){
    var h=host(m);if(!h)return false;
    var changed=false,arr=ensure(m),seen={};
    arr.forEach(function(s,i){if(!s)return;var c=card(s),n=c?(seen[c.type]||0)+1:0;if(c)seen[c.type]=n;
      if(i>=h.slots||!c||!h[c.type]||n>h[c.type]){DROPPED_ITEMS.add(S,[s]);arr[i]=null;changed=true;}});
    arr.length=h.slots;
    if(m.me.patterns&&AE_DEVICES.spec(m).role==='interface'){
      var enabled=patternSlots(m),returned=m.me.patterns.slice(enabled).filter(Boolean);
      if(returned.length){DROPPED_ITEMS.add(S,returned);for(var i=enabled;i<m.me.patterns.length;i++)m.me.patterns[i]=null;changed=true;}
    }
    return changed;
  }
  ITEM_TRANSFER.register('ae:upgrade',function(S,ref){
    var m=ENTITIES.get(S,ref.uid),h=host(m),i=ref.index;
    if(!h||!ENTITIES.isGrid(m)||!Number.isInteger(i)||i<0||i>=h.slots)return null;
    var arr=ensure(m);return {arr:arr,index:i,get:function(){return arr[i];},set:function(s){arr[i]=s;AE_FACTORY.invalidate(S);},accepts:function(s){return accepts(m,i,s);},cap:function(){return 1;}};
  });
  root.AE_UPGRADES={card:card,ensure:ensure,slots:slots,count:count,patternSlots:patternSlots,period:period,sampleSlots:sampleSlots,
    samples:samples,matches:matches,transferLimit:transferLimit,ioLimit:ioLimit,invert:function(m){return count(m,'inverter')>0;},supports:supports,accepts:accepts,reconcile:reconcile};
})(typeof window!=='undefined'?window:globalThis);
