(function(root){
 'use strict';
 var TX=root.GTTransactions;if(typeof module==='object'&&module.exports)TX=require('./transactions.js');
 function Crafting(content,hooks){this.content=content;this.hooks=hooks||{};this.slotKinds=new WeakMap();}
 Crafting.prototype.slotKind=function(alternatives){
  var kind=this.slotKinds.get(alternatives),self=this;
  if(kind)return kind;
  kind={tool:alternatives.some(function(k){return self.hooks.isTool&&self.hooks.isTool(k);}),retained:alternatives.some(function(k){var rules=(root.GD&&root.GD.toolRules||{})[self.content.baseKey(k)];return rules&&rules.containerTool;})};
  if(Object.isFrozen(alternatives))this.slotKinds.set(alternatives,kind);
  return kind;
 };
 Crafting.prototype.plan=function(recipe,storages,tools,options){
  options=options||{};var self=this,h=this.hooks;
  if(!recipe||!recipe.slots.length)return{ok:false,code:'RECIPE'};
  if(options.bindings&&(!storages[0]||!recipe.slots.every(function(_,i){return Number.isInteger(options.bindings[i])&&options.bindings[i]>=0&&options.bindings[i]<storages[0].length;})))return{ok:false,code:'RECIPE'};
  if(root.CONTENT_SCOPE&&!root.CONTENT_SCOPE.recipeAllowed(recipe))return{ok:false,code:'CONTENT_SCOPE'};
  if(recipe.research&&!(options.state&&options.state.mechanisms&&options.state.mechanisms.knowledge&&options.state.mechanisms.knowledge[recipe.research]))return{ok:false,code:'RESEARCH'};
  if(recipe.station&&(!options.station||options.station.id!==recipe.station))return{ok:false,code:'STATION'};
  var grid=options.station||{width:3,height:3,maxSlots:9};
  if(recipe.width>grid.width||recipe.height>grid.height||recipe.slots.length>grid.maxSlots)return{ok:false,code:'LARGE_GRID'};
  if(!recipe.station&&options.bench===false&&(recipe.width>2||recipe.height>2||recipe.slots.length>4))return{ok:false,code:'WORKBENCH'};
  var stacks=[],positions=[];
  if(root.CRAFT_TOOLS)(options.checkOnly&&options.orderedStock||CRAFT_TOOLS.ordered(storages,tools)).forEach(function(e){stacks.push(options.checkOnly?e.stack:TX.clone(e.stack));positions.push(e.position);});
  else {storages.forEach(function(arr,box){arr.forEach(function(s,slot){if(s){stacks.push(TX.clone(s));positions.push({box:box,slot:slot});}});});
  Object.keys(tools||{}).forEach(function(id){if(tools[id]){stacks.push(TX.clone(tools[id]));positions.push({tool:id});}});}
  var reqs=recipe.slots.map(function(alts,i){var kind=self.slotKind(alts);return{alternatives:alts,n:1,consumed:!kind.retained&&!((recipe.flags||{}).nonConsumedSlots||[]).includes(i),tool:kind.tool,binding:options.bindings&&options.bindings[i]};});
  if(options.snapshot)stacks=options.snapshot;
  var locations=new Map();stacks.forEach(function(s,i){locations.set(s,positions[i]);});
  function accepts(r,s){
   if(r.binding!=null){var at=locations.get(s);if(!at||at.box!==0||at.slot!==r.binding)return false;}
   if(s.entityUid)return false;var pos=locations.get(s);if(pos&&options.toolOnlyBoxes&&options.toolOnlyBoxes.includes(pos.box)&&(r.consumed||!r.tool||!root.CRAFT_TOOLS||!CRAFT_TOOLS.rule(s.k).containerTool))return false;
   if(r.tool&&s.dur!=null&&s.dur<=0&&!(root.GD&&root.GD.toolRules&&root.GD.toolRules[self.content.baseKey(s.k)]||{}).unbreakable)return false;
   if(r.tool)return root.CRAFT_TOOLS?CRAFT_TOOLS.accepts(r.alternatives,s):r.alternatives.some(function(k){return self.content.matches(k,s.k,{ignoreNBT:true});});
   if(root.CRAFT_TOOLS&&self.content===root.CONTENT)return CRAFT_TOOLS.matchesIngredient(r.alternatives,s.k);
   return r.alternatives.some(function(k){return self.content.matches(k,s.k);});
  }
  if(options.checkOnly)return TX.hasIngredients(stacks,reqs,accepts)?{ok:true}:{ok:false,code:'INPUT'};
  var plan=TX.planIngredients(stacks,reqs,accepts);
  if(!plan)return{ok:false,code:'INPUT'};
  plan.allocations.forEach(function(a){var r=reqs[a.requirement];if(!r.consumed&&r.tool&&root.CRAFT_TOOLS&&!CRAFT_TOOLS.rule(stacks[a.slot].k).containerTool)a.consumed=true;});
  plan.consumed=plan.allocations.filter(function(a){return a.consumed;}).map(function(a){return Object.assign({},stacks[a.slot],{n:a.n});});
  var next=storages.map(TX.clone),nextTools=TX.clone(tools||{}),used=[];
  plan.allocations.forEach(function(a){var p=positions[a.slot],s=p.tool?nextTools[p.tool]:next[p.box][p.slot];
   if(a.consumed){s.n=(s.n==null?1:s.n)-a.n;if(!s.n){if(p.tool)delete nextTools[p.tool];else next[p.box][p.slot]=null;}}
   else {if(used.indexOf(a.slot)<0)used.push(a.slot);}
  });
  used.forEach(function(i){var p=positions[i],s=p.tool?nextTools[p.tool]:next[p.box][p.slot];
   if((root.GD&&root.GD.toolRules&&root.GD.toolRules[self.content.baseKey(s.k)]||{}).unbreakable){delete s.dur;delete s.dmax;}
   else if(s.dur!=null){var wear=h.craftWear?h.craftWear(s.k):1;if(root.TOOL_WEAR)wear=TOOL_WEAR.amount(options.state,wear);if(wear>0){s.dur-=wear;if(s.dur<=0){if(p.tool)delete nextTools[p.tool];else next[p.box][p.slot]=null;}}}
  });
  var additions=[{k:recipe.out,n:recipe.n||1}];
  // Container items from consumed ingredients are returned to the same transaction.
  plan.allocations.filter(function(a){return a.consumed;}).forEach(function(a){var s=stacks[a.slot],row=self.content.data.containers.find(function(r){return self.content.canonicalKey(self.content.data.items[r[1]].k)===self.content.canonicalKey(s.k);});
   if(row)additions.push({k:self.content.canonicalKey(self.content.data.items[row[0]].k),n:a.n,source:positions[a.slot]});});
  var produced=[];
  for(var ai=0;ai<additions.length;ai++){
   var a=additions[ai],left=a.n;
   var receipt={k:a.k,n:a.n,toBag:0,toWarehouse:0};
   if(ai&&options.returnContainersToSource&&a.source&&!a.source.tool){var p=a.source,target=next[p.box],previous=target[p.slot];if(!previous||previous.k===a.k&&!TX.isInstance(previous)){var put=Math.min(left,self.content.maxStack(a.k)-(previous?previous.n||1:0));if(put>0){target[p.slot]={k:a.k,n:(previous?previous.n||1:0)+put};left-=put;}}}
   var destinations=(ai?options.returnBoxes:options.outputBoxes)||next.map(function(_,i){return i;});
   for(var di=0;di<destinations.length&&left;di++){
    var bi=destinations[di];
    var arr=next[bi],limit=arr.length,compact=arr.filter(Boolean),room=limit-compact.length;
    var max=self.content.maxStack(a.k),available=room*max+compact.filter(function(s){return s.k===a.k&&!s.entityUid&&Object.keys(s).every(function(k){return k==='k'||k==='n';});}).reduce(function(n,s){return n+Math.max(0,max-(s.n==null?1:s.n));},0);
    var put=Math.min(left,available);if(!put)continue;
    var output=h.createStack?h.createStack(a.k,put):{k:a.k,n:put};output.n=put;
    var result=TX.planOutput(arr,[output],limit,function(k){return self.content.maxStack(k);},true);
    if(!result)continue;
    next[bi]=result;left-=put;if(bi)receipt.toWarehouse+=put;else receipt.toBag+=put;
   }
   receipt.discarded=left;
   if(left&&options.requireOutputSpace)return{ok:false,code:'OUTPUT'};
   produced.push(receipt);
  }
  var result={ok:true,storages:next,tools:nextTools,output:additions[0],produced:produced,consumed:plan.consumed};return result;
 };
 Crafting.prototype.commit=function(plan,storages,tools){
  if(!plan.ok)return false;
  storages.forEach(function(a,i){a.splice.apply(a,[0,a.length].concat(plan.storages[i]));});
  Object.keys(tools).forEach(function(k){delete tools[k];});Object.assign(tools,plan.tools);return true;
 };
 root.CraftingProcessor=Crafting;
 if(typeof module==='object'&&module.exports)module.exports=Crafting;
})(typeof window!=='undefined'?window:globalThis);
