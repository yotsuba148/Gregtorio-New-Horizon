(function(root){
 'use strict';
 var TX=GTTransactions,providers=new Map();
 function registerStores(id,provider){if(providers.has(id))throw Error('Duplicate processing stores '+id);providers.set(id,provider);}
 function physical(m,world,group){var sources=PROCESSING_ACCESS.sources(m,group),views=sources.map(function(s){return{owner:s.owner.uid,kind:s.kind,items:s.kind==='item'?TX.clone(s.array):[],fluids:s.kind==='fluid'?TX.clone(s.array):[],source:s};});
  return{views:views,transact:function(allocations,dry){var pending=[];for(var v of views){var entries=allocations.filter(function(a){return a.owner===v.owner&&a.kind===v.kind;}),s=v.source;if(!entries.length)continue;if(!s.valid())return false;
   var plan=v.kind==='item'?TX.planIngredients(s.array,entries.map(function(a){return{k:a.k,n:a.n,consumed:true};}),function(r,t){return r.k===t.k;},true):TX.planDrain(s.array,entries.map(function(a){return{f:a.f,mb:a.mb};}));if(!plan)return false;pending.push({array:s.array,values:v.kind==='item'?plan.remaining:plan.tanks});
  }if(!dry)pending.forEach(function(p){p.array.splice(0,p.array.length,...p.values);});return true;}};
 }
 function stores(m,world,group){for(var fn of providers.values()){var v=fn(m,world,group);if(v!==undefined)return v;}return physical(m,world,group);}
 function policy(m){return STRUCTURES.instance(m).inputPolicy;}
 function orderedViews(m,access,kind){var p=STRUCTURES.profile(m),views=access.views.filter(function(s){return s.kind===kind;});return views.sort(function(a,b){return p.inputOrder(m,MULTIBLOCKS.byUid(m,a.owner),kind)-p.inputOrder(m,MULTIBLOCKS.byUid(m,b.owner),kind);});}
 function input(m,recipe,world,options){var rule=policy(m);if(!rule)return;var access=stores(m,world,options.inputGroup),items=orderedViews(m,access,'item'),fluids=orderedViews(m,access,'fluid'),allocations=[];
  function allocate(v,r,kind){if(!v)return false;var stack=(kind==='item'?v.items:v.fluids).find(Boolean);if(!stack||stack.entityUid)return false;
   if(kind==='item'){if(!CONTENT.matches(r.k,stack.k,{ignoreNBT:!recipe.nbtSensitive})&&!(r.alternatives||[]).some(function(k){return CONTENT.matches(k,stack.k,{ignoreNBT:!recipe.nbtSensitive});}))return false;if(stack.n<r.n)return false;allocations.push({owner:v.owner,kind:kind,k:stack.k,n:r.n});}
   else{if(stack.f!==r.f||stack.mb<r.mb)return false;allocations.push({owner:v.owner,kind:kind,f:stack.f,mb:r.mb});}return true;
  }
  var itemSlots=items.map(function(v){return{owner:v.owner,stack:v.items.find(Boolean)};}).filter(function(v){return !!v.stack;}),
   fluidSlots=fluids.flatMap(function(v){return v.fluids.filter(Boolean).map(function(t){return{owner:v.owner,tank:t};});}),
   available=itemSlots.map(function(v){return v.stack;}),liquids=fluidSlots.map(function(v){return v.tank;});
  return{items:available,fluids:liquids,circuits:MULTIBLOCKS.input(m,options.inputGroup).circuits,
   planItems:function(reqs,matches){if(rule==='ordered'){for(var i=0;i<(recipe.in||[]).length;i++)if(!allocate(items[i],recipe.in[i],'item'))return null;
     var reusable=TX.planIngredients(available,reqs.filter(function(r){return !r.consumed;}),matches,true);if(!reusable)return null;
     return{consumed:allocations.filter(function(a){return a.kind==='item';}).map(function(a){return{k:a.k,n:a.n};}),remaining:[]};
    }
    var p=TX.planIngredients(available,reqs,matches,true);if(!p)return null;
    p.allocations.forEach(function(a){if(a.consumed){var v=itemSlots[a.slot];allocations.push({owner:v.owner,kind:'item',k:v.stack.k,n:a.n});}});return p;
   },
   planFluids:function(reqs){if(rule!=='ordered'){
     var p=TX.planDrain(liquids,reqs);if(!p)return null;
     fluidSlots.forEach(function(v,i){var mb=v.tank.mb-(p.tanks[i]?p.tanks[i].mb:0);if(mb>0)allocations.push({owner:v.owner,kind:'fluid',f:v.tank.f,mb:mb});});
     return access.transact(allocations,true)?p:null;
    }
    for(var i=0;i<reqs.length;i++)if(!allocate(fluids[i],reqs[i],'fluid'))return null;if(!access.transact(allocations,true))return null;return{tanks:[],consumed:reqs.map(TX.clone)};
   },commit:function(){return access.transact(allocations,false);}
  };
 }
 function candidates(m,definition,group,world){if(!definition.inputPolicy)return;if(!MULTIBLOCKS.live(m))return[];var uid=group&&group.uid||null,access=stores(m,world,uid),items=access.views.filter(function(v){return v.kind==='item';}).map(function(v){return v.items.find(Boolean);}).filter(Boolean),fluids=access.views.flatMap(function(v){return v.fluids;}).filter(Boolean),recipes=CONTENT.processingCandidates(definition.recipeMap,items,fluids),profile=STRUCTURES.profile(m);return profile.filterCandidates?profile.filterCandidates(m,recipes,world):recipes;}
 root.PROCESSING_INPUT_POLICY={registerStores:registerStores,input:input,candidates:candidates};
})(typeof window!=='undefined'?window:globalThis);
