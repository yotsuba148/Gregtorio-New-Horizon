/* One-time ownership migration from the former machine-bound AE requests. */
(function(root){
  'use strict';
  var R=AE_RESOURCES,TX=GTTransactions,migrated=new WeakSet();
  function retain(S,p){
    var resources=R.merge(p.realConfigs||[]);
    if(resources.length){
      var a=AE_STATE.ensure(S);
      (a.legacyReturns||(a.legacyReturns=[])).push({sender:p.sender,resources:resources});
    }
  }
  function migrate(S,m){
    if(migrated.has(m))return;
    var a=AE_STATE.ensure(S),p=m.meRequest||a.deliveries&&a.deliveries[m.uid];
    if(p){
      var spec=AE_DEVICES.spec(m);
      if(spec&&spec.role==='assembler'){
        var state=AE_DEVICES.ensure(m);
        state.craftRequest={virtual:TX.clone(p.virtual||[]),remainingStarts:p.remainingStarts||0};
      }else{
        var instructions=(p.virtual||[]).map(function(v){return v.kind==='item'?{kind:'item',item:R.native(v.resource)}:v;});
        var prepared=PROCESSING_CONFIGURATION.plan(m,p.inputGroup&&MULTIBLOCKS.byUid(m,p.inputGroup),0,instructions);
        if(!prepared.ok||!PROCESSING_CONFIGURATION.commit(prepared).ok)return false;
      }
      retain(S,p);
      delete m.meRequest;
      if(a.deliveries)delete a.deliveries[m.uid];
    }
    if(m.job){delete m.job.meToken;delete m.job.meCPU;}
    migrated.add(m);
  }
  function flush(c){
    var a=c.state.ae,changed=false;
    if(a.deliveries){Object.keys(a.deliveries).forEach(function(uid){if(ENTITIES.get(c.state,uid))return;retain(c.state,a.deliveries[uid]);delete a.deliveries[uid];});if(!Object.keys(a.deliveries).length)delete a.deliveries;}
    (a.legacyReturns||[]).forEach(function(row){
      var node=c.byId.get(row.sender);
      if(node){
        var moved=AE_DELIVERY.deposit(c,row.sender,AE_STORAGE.buffer('legacy-return:'+row.sender,row.resources),row.resources.slice());
        if(moved.moved&&moved.moved.length)changed=true;
      }else{
        var returned=COMMANDS.returnItems(c.state,row.resources.filter(function(r){return r.kind==='item';}).map(R.native),{drops:true});
        if(returned.ok){row.resources=[];changed=true;}
      }
    });
    if(a.legacyReturns){a.legacyReturns=a.legacyReturns.filter(function(row){return row.resources.length;});if(!a.legacyReturns.length)delete a.legacyReturns;}
    return changed;
  }
  ITEM_STORES.registerState('ae-legacy-returns',function(S){
    return (S.ae&&S.ae.legacyReturns||[]).map(function(row,i){return ITEM_STORES.view('ae:legacy:'+i,row.resources,row.resources.filter(function(r){return r.kind==='item';}).map(R.native));});
  });
  root.AE_LEGACY={migrate:migrate,flush:flush};
})(typeof window!=='undefined'?window:globalThis);
