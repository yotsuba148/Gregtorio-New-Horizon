(function(root){
 'use strict';
 var TX=GTTransactions,plans=new WeakMap();
 function profile(m){return STRUCTURES.profile(m);}
 function groups(m){return (profile(m)||{}).upgrades||[];}
 function keys(group){var found=new Set();group.options.forEach(function(_,i){group.parts(i).forEach(function(p){found.add(CONTENT.canonicalKey(p.k));});});return Array.from(found);}
 function addCounts(list){return STRUCTURE_CORE.counts(list);}
 function signature(m){var s=m.structure;return JSON.stringify([m.k,m.structureSize,s&&s.revision,s&&s.variant,s&&s.fixedParts,s&&s.ports.map(function(p){return [p.uid,p.face,p.k];}),s&&s.wallHoles,m.processingMode]);}
 function parts(m,group,value){return addCounts(TX.clone(group.parts(value,m)));}
 function installed(m,field){
  var group=groups(m).find(function(g){return g.field===field;});if(!group)return null;
  var family=keys(group),actual=addCounts((m.structure&&m.structure.fixedParts||[]).filter(function(p){return family.includes(CONTENT.canonicalKey(p.k));})),value=m.structure&&m.structure.variant[field]||0,valid=Number.isInteger(value)&&value>=0&&value<group.options.length;
  var expected=valid?parts(m,group,value):[],complete=valid&&expected.every(function(p){return actual.some(function(a){return a.k===p.k&&a.n>=p.n;});});
  return {value:value,label:valid?group.options[value]:'无效等级',parts:actual,complete:complete,empty:actual.length===0};
 }
 function preview(S,m,field,value){
  var group=groups(m).find(function(g){return g.field===field;});
  if(!group||value!==null&&(!Number.isInteger(value)||value<0||value>=group.options.length))return {ok:false,code:'PROFILE'};
  if(group.allows&&!group.allows(m,value))return {ok:false,code:'UPGRADE_LIMIT'};
  if(!MULTIBLOCKS.managed(m)||m.structure&&!MULTIBLOCKS.live(m))return {ok:false,code:'STRUCTURE'};
  if(S&&!MULTIBLOCKS.areaFree(S,m))return {ok:false,code:'OCCUPIED'};
  var sig=signature(m),cache=plans.get(m),cacheKey=field+':'+value;
  if(!cache||cache.signature!==sig){cache={signature:sig,values:new Map()};plans.set(m,cache);}
  var prepared=cache.values.get(cacheKey);
  if(!prepared){
  var family=keys(group),current=installed(m,field),next=value===null?[]:parts(m,group,value);
  var delta=new Map();
  next.forEach(function(p){delta.set(p.k,(delta.get(p.k)||0)+p.n);});current.parts.forEach(function(p){delta.set(p.k,(delta.get(p.k)||0)-p.n);});
  var consume=[],refund=[];delta.forEach(function(n,k){if(n>0)consume.push({k:k,n:n});if(n<0)refund.push({k:k,n:-n});});
  // Contents, batch state and power buffers do not determine installed hardware.
  // Keep preview work independent of the amount of cargo in a running factory.
  var candidate={uid:m.uid,k:m.k,structureSize:TX.clone(m.structureSize),processingMode:m.processingMode};
  if(MULTIBLOCKS.live(m))candidate.structure={schema:2,variant:TX.clone(m.structure.variant),fixedParts:TX.clone(m.structure.fixedParts),ports:m.structure.ports.map(function(p){return {uid:p.uid,face:p.face,k:p.k};}),wallHoles:TX.clone(m.structure.wallHoles||[])};
  else MULTIBLOCKS.initializeEmpty(candidate);
  candidate.structure.fixedParts=candidate.structure.fixedParts.filter(function(p){return !family.includes(CONTENT.canonicalKey(p.k));}).concat(next);
  if(value!==null)candidate.structure.variant[field]=value;
  // Derive capabilities from installed parts on a detached entity, never from the player's bag.
  MULTIBLOCKS.invalidate(candidate);var capability=MULTIBLOCKS.validate(candidate);
  prepared={ok:true,field:field,value:value,consume:consume,refund:refund,formed:candidate.structure.formed,errors:candidate.structure.errors.slice(),capability:capability,current:current,changed:consume.length>0||refund.length>0||value!==null&&(!m.structure||m.structure.variant[field]!==value),signature:sig,next:next,family:family};cache.values.set(cacheKey,prepared);
  }
  var owned=new Map();
  if(S)COMMANDS.owned(S).forEach(function(p){owned.set(p.k,(owned.get(p.k)||0)+p.n);});
  var missing=S?prepared.consume.filter(function(p){return (owned.get(p.k)||0)<p.n;}).map(function(p){return {k:p.k,n:p.n-(owned.get(p.k)||0)};}):[];
  return Object.assign(TX.clone(prepared),{missing:missing});
 }
 function changed(m,text){
  if(!MULTIBLOCKS.live(m))return;
  m.structure.revision=(m.structure.revision||0)+1;MULTIBLOCKS.invalidate(m);MULTIBLOCKS.validate(m);
  if(m.job&&root.MACHINE_CONTROL)MACHINE_CONTROL.stop(m,{code:m.structure.formed?'HARDWARE_CHANGED':'STRUCTURE',text:(text||'结构部件已更换')+'，当前批次保留，开机后继续'});
 }
 function commit(S,m,field,value,expected){
  if(expected&&expected!==signature(m))return {ok:false,code:'STALE'};
  var plan=preview(S,m,field,value);if(!plan.ok)return plan;if(!plan.changed)return {ok:true,consumed:[],produced:[]};
  if(plan.missing.length)return {ok:false,code:'INPUT',missing:plan.missing};
  // exchange plans all storage withdrawals/refunds before committing any of them.
  // Returned hardware overflows into dropped items, never deletion or a hidden container.
  var result=COMMANDS.exchange(S,plan.consume,plan.refund,{drops:true});if(!result.ok)return result;
  if(!MULTIBLOCKS.live(m))MULTIBLOCKS.initializeEmpty(m);
  m.structure.fixedParts=m.structure.fixedParts.filter(function(p){return !plan.family.includes(CONTENT.canonicalKey(p.k));}).concat(plan.next);
  if(value!==null)m.structure.variant[field]=value;
  MULTIBLOCKS.reconcileCasings(S,m);changed(m,value===null?'结构部件已拆下':'结构部件已更换');
  return Object.assign(result,{formed:m.structure.formed,errors:m.structure.errors.slice(),batchRetained:!!m.job});
 }
 function register(id,definitions){var p=STRUCTURES.profiles[id];if(!p)throw Error('Unknown structure profile '+id);var fields=new Set(),materials=new Set();definitions.forEach(function(g){if(!g.field||fields.has(g.field)||(p.dimensions||[]).some(function(d){return d.key===g.field;})||!g.options||!g.options.length)throw Error('Invalid upgrade group: '+id);fields.add(g.field);g.options.forEach(function(_,i){addCounts(g.parts(i));});keys(g).forEach(function(k){if(materials.has(k))throw Error('Overlapping upgrade materials: '+id+' '+k);materials.add(k);});});p.upgrades=definitions;p.upgradableMaterialKeys=Array.from(new Set((p.upgradableMaterialKeys||[]).concat(Array.from(materials))));p.fields=Array.from(new Set((p.fields||[]).concat(Array.from(fields))));}
 function endpoint(S,m,field,partKey){
  const group=groups(m).find(g=>g.field===field);
  if(!group||!MULTIBLOCKS.live(m))return null;
  function current(){
   const list=installed(m,field).parts;
   return (partKey?list.find(p=>p.k===partKey):list[0])||null;
  }
  function value(k){
   const key=CONTENT.canonicalKey(k);
   return group.options.findIndex((_,i)=>group.parts(i,m).some(p=>CONTENT.canonicalKey(p.k)===key));
  }
  function amountLimit(){
   for(let i=group.options.length-1;i>0;i--)if(!group.allows||group.allows(m,i))return i;
   return 0;
  }
  return {
   id:JSON.stringify({type:'structureUpgrade',uid:m.uid,field}),machine:m,get:current,
   locked:()=>false,
   accepts(stack){return !TX.isInstance(stack)&&value(stack.k)>=0;},
   cap(stack){
    const i=value(stack.k);
    if(i<0)return 0;
    if(group.amounts)return amountLimit();
    return parts(m,group,i).find(p=>p.k===CONTENT.canonicalKey(stack.k)).n;
   },
   set(stack){
    const old=current();
    if(old)m.structure.fixedParts=m.structure.fixedParts.filter(p=>p.k!==old.k);
    if(stack)m.structure.fixedParts.push(TX.clone(stack));
    if(group.amounts)m.structure.variant[field]=stack?.n||0;
    changed(m,'部件已取出');
   },
   transfer(from,n,commit){
    const stack=from.get();
    let i=value(stack.k);
    if(i<0||TX.isInstance(stack))return {ok:false,code:'ITEM'};
    if(group.amounts){
     const prior=current()?.n||0;
     i=Math.min(amountLimit(),prior+Math.min(n,stack.n));
     if(i<=prior)return {ok:false,code:'SLOTS'};
    }
    const plan=preview(null,m,field,i);
    if(!plan.ok)return plan;
    if(!plan.changed)return {ok:false,code:'SLOTS'};
    const result=COMMANDS.exchange(S,plan.consume,plan.refund,{drops:true,source:{endpoint:from,n},commit});
    if(!result.ok||!commit)return result;
    m.structure.fixedParts=m.structure.fixedParts.filter(p=>!plan.family.includes(CONTENT.canonicalKey(p.k))).concat(plan.next);
    m.structure.variant[field]=i;
    MULTIBLOCKS.reconcileCasings(S,m);
    changed(m,'部件已更换');
    return Object.assign(result,{k:stack.k});
   }
  };
 }
 function coil(n,count){
  var grades=count==null?HEATING_COILS.grades:HEATING_COILS.grades.slice(0,count);
  return {field:'coil',label:'线圈',options:grades.map(function(g){return g.cn;}),
   parts:function(i){return [{k:(grades[i]||grades[0]).key,n:n}];}};
 }
 register('blastfurnace',[coil(16)]);register('pyrolyseoven',[coil(9,5)]);
 root.STRUCTURE_UPGRADES={endpoint:endpoint,groups:groups,keys:keys,installed:installed,preview:preview,commit:commit,changed:changed,register:register,signature:signature,coil:coil};
})(typeof window!=='undefined'?window:globalThis);
