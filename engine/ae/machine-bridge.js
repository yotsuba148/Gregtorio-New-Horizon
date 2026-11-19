/* AE logistics hands resources to receiver-owned input capabilities. */
(function(root) {
  'use strict';
  var R=AE_RESOURCES,ST=AE_STORAGE,TX=GTTransactions;
  function targets(c, node) {
    if (node.role === 'port' && node.spec.patterns) return [{machine: node.entity, bus: node.port, side: node.side}];
    if (node.role === 'assembler') return [{machine: node.entity, side: node.side}];
    var board = BLUEPRINTS.view(c.state.fx, c.state.fx.blueprints.find(function(b) { return b.id === node.board; })),
      index = c.indices&&c.indices.get(board.id), result = [],
      sides = node.side < 0 ? [0, 1, 2, 3] : [node.side];
    if(!index){index=ENGINE.networks.grid(board);if(c.indices)c.indices.set(board.id,index);}
    sides.forEach(function(direction) {
      var cell = TRANSPORT_PORTS.near(node.x + ',' + node.y, direction), side = (direction + 2) % 4,
        value = index[cell], receiver = value && (ENGINE.networks.endpoint(value, cell, side, 'item') ||
          ENGINE.networks.endpoint(value, cell, side, 'fluid'));
      if (receiver && AE_DEVICES.spec(receiver) && AE_DEVICES.spec(receiver).role==='interface' &&
        c.graph.component(receiver.uid)===c.graph.component(node.id))return;
      if (receiver) result.push({machine: value || receiver._owner || receiver, board:board, cell:cell,
        bus: receiver._port || null,
        side: side, direction: direction, receiver: receiver});
      else if(node.role==='interface'&&(TRANSPORT_PORTS.relay(board,cell,side,'item')||TRANSPORT_PORTS.relay(board,cell,side,'fluid')))
        result.push({id:node.board+'@'+cell+':'+side,board:board,index:index,cell:cell,side:side,direction:direction,relay:true});
      else if(AE_ADAPTERS.at(c,board,cell,side).length)result.push({id:node.board+'@'+cell,
        board:board,cell:cell,side:side,direction:direction});
    });
    return result;
  }

  function target(c, node) {
    return targets(c, node)[0] || null;
  }

  function deliveryPort(sender, receiver) {
    return sender.id + ':' + (receiver.bus ? receiver.bus.uid : receiver.machine ? receiver.machine.uid : receiver.id);
  }

  function previousReceiver(c, port) {
    for (var i = port.lastIndexOf(':'); i > 0; i = port.lastIndexOf(':', i - 1)) {
      var sender = c.byId.get(port.slice(0, i));
      if (!sender) continue;
      var neighbors = targets(c, sender);
      var exact = neighbors.find(function(r) { return port === deliveryPort(sender, r); });
      if (exact) return exact;
      var legacy = neighbors.filter(function(r) { return r.machine && port === sender.id + ':' + r.machine.uid; });
      return legacy.length === 1 ? legacy[0] : null;
    }
    return null;
  }

  function bindingsFor(inlet,cache) {
    return inlet.bindings.map(function(port){
      if(cache.has(port.array))return cache.get(port.array);
      var id='inlet:'+port.owner.uid+':'+port.kind,adapter;
      if(port.kind==='buffer')adapter=ST.buffer(id,port.array);
      else if(port.kind==='item')adapter=ST.slots(id,port.array,{slots:port.slots,accepts:function(s){return port.accepts(s.k);}});
      else adapter=ST.tanks(id,port.array,{capacities:port.capacities,fluidPolicy:port.fluidPolicy,accepts:port.accepts});
      adapter.valid=port.valid;
      var binding={adapter:adapter,ignoreBlockingItems:PROCESSING_ACCESS.isProcessingOwner(port.owner.k),accepts:function(resource){
        return port.kind==='buffer'?port.accepts(resource.kind,resource.key):resource.kind===port.kind&&port.accepts(resource.key);
      }};
      cache.set(port.array,binding);return binding;
    });
  }

  function configure(c,tx,instructions,receiving,missingOnly){
    var prepared=PROCESSING_CONFIGURATION.plan(receiving.machine,receiving.bus,receiving.side,
      instructions.map(function(v){return v.kind==='item'?{kind:'item',item:R.native(v.resource)}:v;}),{missingOnly:missingOnly});
    if(!prepared.ok)return prepared;
    if(prepared.fields.length){
      var adapter=ST.properties('configuration:'+(prepared.target.uid||receiving.machine.uid),prepared.target,prepared.fields);
      adapter.valid=prepared.valid;tx.stage(adapter,prepared.values);
    }
    return {ok:true};
  }

  function handoffToInterface(c,node,tx,packet,receiving,receiver){
    var status=c.network.status(receiver.id);
    if(!status.ok)return status;
    if(c.graph.component(receiver.id)===c.graph.component(node.id))return {ok:false,code:'MACHINE_INPUT'};
    if(packet.inputs.some(function(r){return r.kind==='fluid';})&&!receiver.spec.fluids)return {ok:false,code:'FLUID_INTERFACE'};
    if(AE_BLOCKING.interfaceBlocked(c,node,packet,receiver))return {ok:false,code:'BLOCKING'};
    var configured=configure(c,tx,packet.virtual||[],receiving,false);
    if(!configured.ok)return configured;
    var stocked=(receiver.state.stock||[]).some(Boolean),local=[],network=[];
    packet.inputs.forEach(function(r){(stocked&&r.kind==='item'?local:network).push(r);});
    if(local.length){
      var stockedItems=AE_ADAPTERS.insert(tx,AE_ADAPTERS.at(c,receiving.board,receiving.cell,receiving.side),local);
      if(!stockedItems.ok)return stockedItems;
    }
    if(network.length){
      var inserted=c.network.insert(tx,receiver.id,network);
      if(!inserted.ok)return {ok:false,code:inserted.code||'SLOTS'};
    }
    AE_BLOCKING.sent(node,tx,packet,c,receiving);
    return {ok:true,fakeFinal:AE_UPGRADES.count(node.entity,'fakeCrafting')>0};
  }

  function prepare(c,node,tx,packet,receiving) {
    if(PROCESSING_CONFIGURATION.circuitConflict(packet.virtual||[]))return {ok:false,code:'CIRCUIT_CONFLICT'};
    var locked=AE_BLOCKING.lockReason(node);if(locked)return {ok:false,code:locked};
    receiving=receiving||target(c,node);
    if(!receiving)return {ok:false,code:'MACHINE'};
    if(packet.mode==='crafting'){
      /* 合成样板必须交给旁边的分子装配室，不能当成普通机器灌料 */
      var d0=receiving&&receiving.machine&&AE_DEVICES.spec(receiving.machine);
      if(!d0||d0.role!=='assembler'){
        var pick=targets(c,node).find(function(r){var d=r.machine&&AE_DEVICES.spec(r.machine);return d&&d.role==='assembler';});
        if(pick)receiving=pick; else return {ok:false,code:'RECIPE_MAP'};
      }
      var crafted=AE_CRAFTING.prepare(c,node,tx,packet,receiving);
      if(crafted.ok){AE_BLOCKING.sent(node,tx,packet,c,receiving);crafted.fakeFinal=AE_UPGRADES.count(node.entity,'fakeCrafting')>0;}
      return crafted;
    }
    if(packet.inputs.some(function(r){return r.kind==='fluid';})&&!node.spec.fluids&&!node.spec.dual)return {ok:false,code:'FLUID_INTERFACE'};
    if(receiving.relay){
      var queued=AE_RELAY_DELIVERY.prepare(c,node,tx,packet,receiving);
      if(queued.ok)AE_BLOCKING.sent(node,tx,packet,c,receiving);
      return queued;
    }
    var m=receiving.machine,receiver=m&&c.byId.get(m.uid);
    if(receiver&&receiver.role==='interface')return handoffToInterface(c,node,tx,packet,receiving,receiver);
    var custom=m&&root.PATTERN_RECEIVERS&&PATTERN_RECEIVERS.at(m,receiving.cell,receiving.side);
    if(custom){
      var source={type:node.spec.role==='interface'&&node.spec.fluids?'me_dual_interface':'me_interface',board:node.board,x:node.x,y:node.y,side:receiving.direction};
      var offered=custom.offer(packet,source);if(!offered.ok)return offered;
      var bundle=ST.properties('pattern-receiver:'+m.uid,offered.owner,offered.fields);bundle.valid=offered.valid;bundle.resources=custom.resources;
      if(AE_BLOCKING.blocked(node,tx,packet,[{adapter:bundle,accepts:function(){return true;}}]))return {ok:false,code:'BLOCKING'};
      tx.stage(bundle,offered.values);AE_BLOCKING.sent(node,tx,packet,c,receiving);return {ok:true};
    }
    var inlet=m&&PROCESSING_ACCESS.inlet(m,receiving.bus,receiving.side);
    if(inlet&&inlet.code)return {ok:false,code:inlet.code};
    var cache=new Map(),bindings=inlet?bindingsFor(inlet,cache):AE_ADAPTERS.at(c,receiving.board,receiving.cell,receiving.side);
    var blockingBindings=bindings;
    if(node.state.blocking&&node.spec.fluids&&node.side<0){
      blockingBindings=targets(c,node).flatMap(function(other){
        var capability=other.machine&&PROCESSING_ACCESS.inlet(other.machine,other.bus,other.side);
        return capability?capability.code?[]:bindingsFor(capability,cache):AE_ADAPTERS.at(c,other.board,other.cell,other.side);
      });
    }
    if(AE_BLOCKING.blocked(node,tx,packet,blockingBindings))return {ok:false,code:'BLOCKING'};
    var instructions=packet.virtual||[];
    var insertion=AE_ADAPTERS.insert(tx,bindings,packet.inputs);
    if(!insertion.ok)return insertion;
    var configured=configure(c,tx,instructions,receiving,false);if(!configured.ok)return configured;
    AE_BLOCKING.sent(node,tx,packet,c,receiving);
    return {ok:true,fakeFinal:AE_UPGRADES.count(node.entity,'fakeCrafting')>0};
  }
  root.AE_MACHINE_BRIDGE={receivers:targets,target:target,prepare:prepare,configure:configure,
    deliveryPort:deliveryPort,previousReceiver:previousReceiver};
})(typeof window!=='undefined'?window:globalThis);
