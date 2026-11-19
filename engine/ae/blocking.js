/* Interface scheduling depends on container contents, never machine progress. */
(function(root){
  'use strict';
  var lastPatterns=new WeakMap(),R=AE_RESOURCES,ignored=new Set(MACHINE_STORAGE_RULES.molds.concat(MACHINE_STORAGE_RULES.dies));
  Object.keys(CONTENT.data.ore).filter(function(k){return /^lens[A-Z]/.test(k)&&!['lensSalt','lensRockSalt','lensSpodumene'].includes(k);}).forEach(function(k){
    CONTENT.data.ore[k].forEach(function(i){var item=CONTENT.data.items[i];ignored.add(item.base||item.k);});
  });
  [13,14,15,19,21].forEach(function(meta){ignored.add('appliedenergistics2:item.ItemMultiMaterial@'+meta);});
  function ignoredItem(r,fluidInterface){
    if(r.kind!=='item')return false;
    var item=CONTENT.item(r.key);
    if(PROCESSING_ACCESS.isConfigurationItem(item))return true;
    if(fluidInterface)return false;
    return ignored.has(CONTENT.baseKey(r.key))||item&&(/^(weakBloodOrb|apprenticeBloodOrb|magicianBloodOrb|masterBloodOrb|archmageBloodOrb|transcendentBloodOrb|Orb_Armok|EldritchOrb)$/.test(item.id.split(':')[1])||/item\.(ReinforcedGlassLense|MysteriousCrystalLens|RadoxPolymerLens|ChromaticLens)$/.test(item.id));
  }
  function signature(packet){return JSON.stringify([packet.mode,packet.ingredients||packet.inputs,packet.reusable||[],packet.virtual,packet.outputs,packet.gridKeys||null]);}
  function checksContents(node,packet){return node.state.blocking&&!(node.state.smartBlocking&&lastPatterns.get(node.state)===signature(packet));}
  function blocked(node,tx,packet,bindings){
    if(!checksContents(node,packet))return false;
    return bindings.some(function(binding){
      return binding.adapter.resources(tx.read(binding.adapter)).some(function(r){
        if(r.kind==='item'&&binding.ignoreBlockingItems&&ignoredItem(r,!!node.spec.fluids))return false;
        return (r.kind==='item'||node.spec.fluids&&r.kind==='fluid')&&binding.accepts(r,'write');
      });
    });
  }
  function interfaceBlocked(c,node,packet,receiver){
    if(!checksContents(node,packet))return false;
    var s=receiver.state,fluids=node.spec.fluids&&receiver.spec.fluids;
    if(s.items.some(Boolean)||fluids&&s.fluids.some(Boolean))return true;
    if(!AE_UPGRADES.count(receiver.entity,'advancedBlocking'))return false;
    var checkItems=!(s.stock||[]).some(Boolean),checkFluids=fluids&&!(s.fluidStock||[]).some(Boolean);
    return (checkItems||checkFluids)&&c.network.hasStored(receiver.id,function(r){
      return r.kind==='fluid'?checkFluids:checkItems&&!ignoredItem(r,false);
    });
  }
  function lockReason(node){
    if(!AE_UPGRADES.count(node.entity,'craftingLock'))return null;
    var s=node.state,mode=s.craftingLockMode||'NONE';
    if(mode==='LOCK_WHILE_HIGH'&&s.redstoneSignal||mode==='LOCK_WHILE_LOW'&&!s.redstoneSignal)return 'CRAFTING_LOCKED';
    if(mode==='LOCK_UNTIL_PULSE'&&s.craftingLockPending===true||mode==='LOCK_UNTIL_RESULT'&&(s.craftingLockPending||[]).length)return 'CRAFTING_LOCKED';
    return null;
  }
  function sent(node,tx,packet,c,receiving){
    var previous=tx.onCommit,key=signature(packet);
    if(AE_UPGRADES.count(node.entity,'craftingLock')){
      var mode=node.state.craftingLockMode,pending=mode==='LOCK_UNTIL_RESULT'?packet.outputs:mode==='LOCK_UNTIL_PULSE'?true:[];
      tx.stage(AE_STORAGE.properties('lock:'+node.id,node.state,['craftingLockPending']),{craftingLockPending:pending});
    }
    tx.onCommit=function(){
      if(previous)previous();
      if(node.state.smartBlocking)lastPatterns.set(node.state,key);
      var other=c&&receiving&&receiving.machine&&c.byId.get(receiving.machine.uid);
      if(other&&other.role==='interface'&&AE_UPGRADES.count(other.entity,'advancedBlocking')){
        var component=c.graph.component(other.id);
        c.nodes.forEach(function(host){
          if(host.role!=='interface'||c.graph.component(host.id)!==component||!AE_UPGRADES.count(host.entity,'advancedBlocking'))return;
          c.nodes.forEach(function(adjacent){
            if(adjacent.role==='interface'&&adjacent.id!==node.id&&adjacent.board===host.board&&Math.abs(adjacent.x-host.x)+Math.abs(adjacent.y-host.y)===1)lastPatterns.delete(adjacent.state);
          });
        });
      }
    };
  }
  function returned(c,tx,id,resources){
    var node=c.byId.get(id);if(!node||node.role!=='interface'||!AE_UPGRADES.count(node.entity,'craftingLock')||node.state.craftingLockMode!=='LOCK_UNTIL_RESULT')return;
    var prop=AE_STORAGE.properties('lock:'+node.id,node.state,['craftingLockPending']),pending=tx.read(prop).craftingLockPending||[];
    resources.forEach(function(r){var found=pending.find(function(p){return R.identity(p)===R.identity(r);});if(found)found.amount=Math.max(0,found.amount-r.amount);});
    tx.stage(prop,{craftingLockPending:pending.filter(function(r){return r.amount>0;})});
  }
  function signal(m,high){var s=AE_DEVICES.ensure(m),old=!!s.redstoneSignal;s.redstoneSignal=!!high;if(!old&&high&&s.craftingLockMode==='LOCK_UNTIL_PULSE')s.craftingLockPending=[];}
  function unlock(m){AE_DEVICES.ensure(m).craftingLockPending=[];}
  function toggle(m,field){
    var d=AE_DEVICES.spec(m);
    if(!d||d.role!=='interface'||!['blocking','smartBlocking'].includes(field))return false;
    var state=AE_DEVICES.ensure(m);state[field]=!state[field];lastPatterns.delete(state);return true;
  }
  root.AE_BLOCKING={blocked:blocked,checksContents:checksContents,interfaceBlocked:interfaceBlocked,sent:sent,returned:returned,lockReason:lockReason,signal:signal,unlock:unlock,toggle:toggle};
})(typeof window!=='undefined'?window:globalThis);
