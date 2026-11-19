/* Portable fluid containers expose contents and capacity independently of their destination. */
(function(root){
 'use strict';
 function inspect(S,stack){
  if(!stack)return null;
  var d=DEFS.of(CONTENT.canonicalKey(stack.k));
  if(!d||d.behavior!=='fluid_storage'||d.requiresStructure||!d.fluidInputTanks||d.fluidInputTanks.length!==1)return null;
  var m=stack.entityUid&&ENTITIES.get(S,stack.entityUid);
  if(stack.entityUid&&(!m||m.k!==stack.k||!m.location||m.location.kind!=='packed'))return null;
  var t=m?(m.tanksIn||[])[0]:stack.fluidContent;
  return {stack:stack,entity:m||null,capacity:d.fluidInputTanks[0],fluid:t&&t.f,amount:t&&t.mb||0};
 }
 function converted(info,fluid,amount){
  var stack=GTTransactions.clone(info.stack);stack.n=1;
  if(amount)stack.fluidContent={f:CONTENT.canonicalFluid(fluid),mb:amount};else delete stack.fluidContent;
  return stack;
 }
 function activate(item){return item.fluidContent?{tanksIn:[GTTransactions.clone(item.fluidContent)]}:null;}
 function manual(S,source,target,commit,limit){
  var stack=source.get(),info=inspect(S,stack);if(!info)return null;
  var h=TRANSPORT_PORTS.manualFluid(ENGINE.networks,S,target.machine,target.kind,target.index);if(!h)return {ok:false,code:'FLUID'};
  var fluid=info.fluid,collect=!info.amount;
  if(collect){var parts=TRANSPORT_PORTS.fluidParts(h);for(var p of parts){var t=p.tanks.find(function(t){return t&&t.mb>0;});if(t){fluid=t.f;break;}}}
  if(!fluid)return {ok:false,code:'FLUID_AMOUNT'};
  if(!collect&&target.kind==='fout')return {ok:false,code:'FLUID'};
  if(h.forFluid)h=h.forFluid(fluid);
  var count=Math.min(stack.n||1,limit==null?stack.n||1:limit),per=collect?info.capacity-info.amount:info.amount,wanted=per*count,plan=TRANSPORT_PORTS.fluidPlan(h,fluid,wanted,!collect);
  if(!plan.moved)return {ok:false,code:collect?'FLUID_AMOUNT':'TANK'};
  if(info.entity){
    var next=collect?info.amount+plan.moved:info.amount-plan.moved;
    if(commit){plan.commit();info.entity.tanksIn[0]=next?{f:fluid,mb:next}:null;}
    return {ok:true,k:stack.k,moved:1,remaining:1,mb:plan.moved,operation:collect?'装出':'倒入'};
  }
  var n=Math.ceil(plan.moved/per),left=plan.moved,changed=[];
  for(var i=0;i<n;i++){var part=Math.min(per,left);left-=part;changed.push(converted(info,fluid,info.amount+(collect?part:-part)));}
  var storages=ENTITIES.storage(S),boxes=storages.map(GTTransactions.clone),at=storages.indexOf(source.arr),rest=(stack.n||1)>n?Object.assign({},stack,{n:(stack.n||1)-n}):null;
  if(at>=0)boxes[at][source.index]=rest;
  changed.forEach(function(value){
    if(!rest&&source.accepts(value)&&source.cap(value)>=1){rest=value;if(at>=0)boxes[at][source.index]=value;return;}
    var temp=[value];for(var i=0;i<boxes.length&&temp[0];i++)CORE.transferSlot({from:CORE.slotBox(temp),index:0,to:CORE.slotBox(boxes[i])});if(temp[0])left++;
  });
  if(left)return {ok:false,code:'SLOTS'};
  if(commit){plan.commit();storages.forEach(function(a,i){a.splice.apply(a,[0,a.length].concat(boxes[i]));});if(at<0)source.set(rest);}
  return {ok:true,k:stack.k,moved:n,remaining:(stack.n||1)-n,mb:plan.moved,operation:collect?'装出':'倒入'};
 }
 root.FLUID_CONTAINER_ITEMS={inspect:inspect,converted:converted,activate:activate,manual:manual};
})(typeof window!=='undefined'?window:globalThis);
