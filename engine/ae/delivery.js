/* All network injection paths share the same resource-only crafting claims. */
(function(root){
  'use strict';
  var R=AE_RESOURCES,ST=AE_STORAGE,TX=GTTransactions,transactions=new WeakMap();
  function state(tx,cpu){
    var cache=transactions.get(tx);if(!cache){cache=new Map();transactions.set(tx,cache);}
    var s=cache.get(cpu);
    if(!s){s={order:ST.properties('cpu:'+cpu.id+':incoming',cpu,['order']),buffer:ST.buffer('cpu:'+cpu.id,cpu.resources)};cache.set(cpu,s);}
    return s;
  }
  function insert(c,tx,node,resources,exclude){
    var status=c.network.status(node);
    if(!status.ok)return Object.assign(status,{moved:[],remaining:TX.clone(resources)});
    var moved=[],remaining=[],component=c.graph.component(node);
    for(var resource of R.merge(resources)){
      var left=resource.amount,id=R.identity(resource);
      for(var cpu of c.state.ae.cpus){
        if(!cpu.order||cpu.order.status!=='running'||c.graph.component(cpu.node)!==component)continue;
        var s=state(tx,cpu),order=tx.read(s.order).order;
        if(!order||order.status!=='running')continue;
        var changed=false;
        for(var flight of order.flights.slice()){
          if(flight.feeding)continue;
          var expected=flight.pending.find(function(r){return R.identity(r)===id;});
          if(!expected)continue;
          var count=Math.min(left,expected.amount),accepted=count;
          if(id===R.identity(order.target)){
            var stored=c.network.insertRaw(tx,node,[R.amount(resource,count)],exclude);
            accepted=ST.count(stored.moved,resource);
            order.outputBlocked=TX.clone(stored.remaining);changed=true;
          }else if(count&&!tx.edit(s.buffer,[],[R.amount(resource,count)]))throw Error('Crafting buffer rejected returned material');
          if(accepted){
            flight.pending=ST.remove(flight.pending,[R.amount(resource,accepted)]);
            if(!flight.pending.length){order.tasks[flight.task].completed++;order.flights=order.flights.filter(function(f){return f!==flight;});}
            left-=accepted;changed=true;
          }
          if(!left)break;
        }
        if(changed)tx.stage(s.order,{order:order});
        if(!left)break;
      }
      if(left){
        var normal=c.network.insertRaw(tx,node,[R.amount(resource,left)],exclude);
        left-=ST.count(normal.moved,resource);
      }
      if(left<resource.amount)moved.push(R.amount(resource,resource.amount-left));
      if(left)remaining.push(R.amount(resource,left));
    }
    if(moved.length&&root.AE_BLOCKING)AE_BLOCKING.returned(c,tx,node,moved);
    return {ok:!remaining.length,moved:moved,remaining:remaining};
  }
  function capacity(c,node,resource,exclude){
    var result=c.network.insert(c.network.transaction(),node,[R.amount(resource,2147483647)],exclude);
    return ST.count(result.moved,resource);
  }
  function deposit(c,node,source,resources){return c.network.store(node,source,R.merge(resources),true);}
  root.AE_DELIVERY={insert:insert,capacity:capacity,deposit:deposit};
})(typeof window!=='undefined'?window:globalThis);
