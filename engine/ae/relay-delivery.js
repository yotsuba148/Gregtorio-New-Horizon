/* Pending pattern materials belong to the sending interface. The relay sees physical stacks only. */
(function(root) {
  'use strict';
  var R=AE_RESOURCES, ST=AE_STORAGE, TX=GTTransactions, ports=TRANSPORT_PORTS;
  var sessions=new WeakMap(), retryDelay=20;

  function state(S) {
    var session=sessions.get(S.fx);
    if(!session){
      session=new Map();
      for(var machine of S.fx.machines)if(machine.me?.relayDelivery){
        var row=machine.me.relayDelivery;
        row.resources=row.resources.filter(Boolean).map(R.normalize);
        session.set(machine,{due:0});
      }
      sessions.set(S.fx,session);
    }
    return session;
  }

  function target(board,cell,side,kind) {
    return ports.relay(board,cell,side,kind);
  }

  function destination(index,p,kind) {
    var machine=index[p.target];
    var endpoint=machine&&CONTAINER_ACCESS.api.endpoint(machine,p.target,p.targetSide,kind);
    return endpoint?{machine:machine,bus:endpoint._port||null,side:p.targetSide}:null;
  }

  function configuration(board,index,cell,side,packet) {
    var owners;
    var byBus=new Map();
    var hasItems=packet.inputs.some(function(r){return r.kind==='item';});
    for(var input of packet.inputs){
      var next=new Set();
      for(var p of target(board,cell,side,input.kind).destinations(index,input.kind==='item'?R.native(input):input.key)){
        var v=destination(index,p,input.kind);
        if(!v)continue;
        next.add(v.machine);
        if(input.kind==='item'||!hasItems){
          var inlet=PROCESSING_ACCESS.inlet(v.machine,v.bus,v.side);
          if(inlet?.configuration)byBus.set(inlet.configuration,v);
        }
      }
      owners=owners?new Set(Array.from(owners).filter(function(m){return next.has(m);})):next;
    }
    if(!owners||owners.size!==1)return null;
    var options=Array.from(byBus.values()).filter(function(v){return owners.has(v.machine);});
    return options.length===1?options[0]:null;
  }

  function prepare(c,node,tx,packet,receiver) {
    var S=c.state, board=receiver.board, host=node.state;
    if(host.relayDelivery)return {ok:false,code:'RELAY_BUSY'};
    if(!packet.inputs.length||packet.inputs.some(function(r){return !target(board,receiver.cell,receiver.side,r.kind);}))
      return {ok:false,code:'RELAY_INPUT'};
    var selected=null;
    if(!packet.outputs.length)return {ok:false,code:'PATTERN'};
    if(packet.virtual.length){
      selected=configuration(board,receiver.index,receiver.cell,receiver.side,packet);
      if(!selected)return {ok:false,code:'RELAY_CONFIG'};
    }
    var fields=ST.properties('relay:'+node.id,host,['relayDelivery']);
    tx.stage(fields,{relayDelivery:{
      token:packet.id,cpu:packet.cpu,order:packet.order,direction:receiver.direction,resources:packet.inputs,
      configuration:selected?{machine:selected.machine.uid,bus:selected.bus?.uid||null,side:selected.side,
        instructions:packet.virtual.map(function(v){return v.kind==='item'?{kind:'item',item:R.native(v.resource)}:v;})}:null,
      blocking:AE_BLOCKING.checksContents(node,packet)
    }});
    var previous=tx.onCommit;
    tx.onCommit=function(){if(previous)previous();state(S).set(node.entity,{due:ENGINE.tick+1});};
    return {ok:true,feeding:true};
  }

  function configure(c,row,board,index,cell,side) {
    var v=row.configuration;
    var machine=ENTITIES.get(c.state,v.machine);
    if(!machine||!ENTITIES.isGrid(machine))return false;
    var bus=v.bus&&MULTIBLOCKS.byUid(machine,v.bus);
    if(v.bus&&!bus)return false;
    if(bus){
      var face=MULTIBLOCKS.worldFace(machine,bus.face);
      if(!face||face.side!==v.side||index[face.x+','+face.y]!==machine)return false;
    }
    var inlet=PROCESSING_ACCESS.inlet(machine,bus,v.side);
    if(!inlet?.configuration)return false;
    // Check the selected slot again after moves, disconnects or port changes.
    if(!row.resources.some(function(r){
      var relay=target(board,cell,side,r.kind);
      return relay&&relay.destinations(index,r.kind==='item'?R.native(r):r.key)
        .some(function(p){return index[p.target]===machine;});
    }))return false;
    var plan=PROCESSING_CONFIGURATION.plan(machine,bus,v.side,v.instructions);
    if(!plan.ok)return false;
    var changed=plan.fields.some(function(field){return JSON.stringify(R.stable(plan.target[field]))!==JSON.stringify(R.stable(plan.values[field]));});
    if(!changed)return true;
    if(PROCESSING_ACCESS.sources(machine).some(function(src){return src.array?.some(Boolean);}))return false;
    return PROCESSING_CONFIGURATION.commit(plan).ok;
  }

  function occupied(board,index,cell,side,resources,allows) {
    var slots=new Set();
    for(var r of resources){
      var relay=target(board,cell,side,r.kind);
      if(!relay)continue;
      for(var p of relay.destinations(index,r.kind==='item'?R.native(r):r.key)){
        if(allows&&!allows(p.target))continue;
        var payload=r.kind==='item'?R.native(r):r.key;
        var handler=CONTAINER_ACCESS.resolve(board,index,p.target,p.targetSide,r.kind,'import',payload);
        if(r.kind==='item'&&handler?.arr)slots.add(handler.arr);
        if(r.kind==='fluid')for(var part of ports.fluidParts(handler))if(part.tanks)slots.add(part.tanks);
      }
    }
    return Array.from(slots).some(function(array){return array.some(Boolean);});
  }

  function source(resources,kind,owner) {
    var arr=resources.map(R.native);
    if(kind==='item')return {arr:arr,box:CORE.slotBox(arr),object:owner};
    return {tanks:arr,caps:resources.map(function(r){return r.amount;}),object:owner};
  }

  function step(c,tick) {
    var active=state(c.state);
    if(!active.size)return false;
    var changed=false,boardViews=new Map(),configured=new Map(),attempts=0;
    for(var sender of active.keys()){
      var config=sender.me?.relayDelivery?.configuration;
      if(config?.applied)configured.set(config.machine,sender);
    }
    for(var [machine,attempt] of active){
      if(attempt.due>tick)continue;
      // Spread concurrent dispatch over ticks so one burst cannot monopolize the game thread.
      if(attempts>=2)break;
      attempts++;
      attempt.due=tick+retryDelay;
      active.delete(machine);
      active.set(machine,attempt);
      var node=c.byId.get(machine.uid), row=machine.me?.relayDelivery;
      if(!row){active.delete(machine);continue;}
      var cpu=c.state.ae.cpus.find(function(v){return v.id===row.cpu;});
      var order=cpu?.order,flight=order?.id===row.order&&order.flights.find(function(f){return f.id===row.token;});
      if(!flight){
        if(node&&c.network.status(node.id).ok){
          var receipt=AE_DELIVERY.deposit(c,node.id,ST.buffer('relay-return:'+node.id,row.resources),row.resources);
          if(receipt.moved?.length)changed=true;
        }
        if(!row.resources.length){
          delete machine.me.relayDelivery;
          if(node)AE_BLOCKING.unlock(machine);
          active.delete(machine);changed=true;
        }
        else attempt.due=tick+retryDelay;
        continue;
      }
      if(!node||cpu.suspended||!c.network.status(node.id).ok||
        c.graph.component(cpu.node)!==c.graph.component(node.id)||node.side>=0&&node.side!==row.direction){
        attempt.due=tick+retryDelay;
        continue;
      }
      var view=boardViews.get(node.board);
      if(!view){
        var board=BLUEPRINTS.view(c.state.fx,c.state.fx.blueprints.find(function(b){return b.id===node.board;}));
        var idx=c.indices.get(board.id);
        if(!idx){idx=CONTAINER_ACCESS.index(board);c.indices.set(board.id,idx);}
        view={board:board,index:idx};
        boardViews.set(node.board,view);
      }
      var cell=ports.near(node.x+','+node.y,row.direction),side=(row.direction+2)%4;
      var sourceGroup=c.graph.component(node.id),config=row.configuration;
      var allows=function(to){
        var owner=view.index[to];
        if(config)return owner?.uid===config.machine;
        var receiver=owner&&c.byId.get(owner.uid);
        return receiver?.role!=='interface'||c.graph.component(receiver.id)!==sourceGroup;
      };
      var configOwner=config&&configured.get(config.machine);
      if(row.blocking&&machine.me.blocking&&occupied(view.board,view.index,cell,side,row.resources,allows)||
        config&&(configOwner&&configOwner!==machine||!configure(c,row,view.board,view.index,cell,side))){
        attempt.due=tick+retryDelay;
        continue;
      }
      if(config&&!config.applied){config.applied=true;configured.set(config.machine,machine);changed=true;}
      var moved=0;
      for(var kind of ['item','fluid']){
        var resources=row.resources.filter(function(r){return r.kind===kind;});
        if(!resources.length)continue;
        var relay=target(view.board,cell,side,kind);
        if(!relay)continue;
        var payload=source(resources,kind,machine),sent=relay.send(view.index,payload,allows);
        if(!sent)continue;
        moved+=sent;
        var remaining=kind==='item'?payload.arr:payload.tanks;
        for(var i=0;i<resources.length;i++)resources[i].amount=kind==='item'?TX.count(remaining[i]):remaining[i]?.mb||0;
      }
      if(moved){row.resources=row.resources.filter(function(r){return r.amount>0;});row.blocking=false;changed=true;}
      if(!row.resources.length){
        if(config)configured.delete(config.machine);
        delete machine.me.relayDelivery;
        delete flight.feeding;
        active.delete(machine);
      }else attempt.due=tick+(moved?1:retryDelay);
    }
    return changed;
  }

  function refund(engine,cpu) {
    var S=engine.state,active=state(S),pending=[];
    for(var m of active.keys()){
      var row=m.me?.relayDelivery;
      if(row&&row.cpu===cpu.id&&row.order===cpu.order.id)pending.push(m);
    }
    if(!pending.length)return {ok:true};
    var tx=new ST.Transaction(),buffer=ST.buffer('cpu:'+cpu.id,cpu.resources);
    for(var machine of pending){
      if(!tx.edit(buffer,[],machine.me.relayDelivery.resources))return {ok:false,code:'SLOTS'};
      var config=machine.me,fields=['relayDelivery'];
      var next={};
      if(AE_UPGRADES.count(machine,'craftingLock')){
        fields.push('craftingLockPending');next.craftingLockPending=[];
      }
      tx.stage(ST.properties('relay:'+machine.uid,config,fields),next);
    }
    var result=tx.commit();
    if(result.ok)pending.forEach(function(m){active.delete(m);});
    return result;
  }

  ENTITIES.registerLifecycle('ae-relay-delivery',{
    beforeRemove:function(S,m){
      if(m.me?.relayDelivery)return {ok:false,code:'RELAY_BUSY'};
      if(AE_DEVICES.spec(m)?.role==='cpu'){
        for(var owner of state(S).keys())if(owner.me?.relayDelivery?.cpu===m.uid)return {ok:false,code:'RELAY_BUSY'};
      }
    }
  });
  AE_FACTORY.register('relay-delivery',{after:step});
  root.AE_RELAY_DELIVERY={prepare:prepare,refund:refund};
})(typeof window!=='undefined'?window:globalThis);
