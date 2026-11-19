/* One physical component ledger; upgrades and validation read fixedParts + ports. */
(function(root){
 'use strict';
 function inventoryCounts(inv){
  var out={};(inv||[]).forEach(function(s){if(s&&!s.entityUid){var k=CONTENT.canonicalKey(s.k);out[k]=(out[k]||0)+(s.n==null?1:s.n);}});return out;
 }
 function components(m){return STRUCTURE_CORE.counts(m.structure&&(MULTIBLOCKS.live(m)?m.structure.fixedParts:m.structure.installedParts)||[]);}
 function fixedCounts(m){return inventoryCounts(components(m));}
 function state(m){
  if(!MULTIBLOCKS.live(m))return null;
  var required=MULTIBLOCKS.required(m),variable=STRUCTURE_UPGRADES.groups(m).map(function(g){
   return {id:g.field,label:g.label,installed:STRUCTURE_UPGRADES.installed(m,g.field)};
  }).filter(function(g){return !g.installed.complete;});
  var fixed=required?STRUCTURE_CORE.missing(components(m),required.fixed):[];
  return {formed:fixed.length===0&&variable.length===0,fixed:fixed,variable:variable};
 }
 function migrate(m){
  if(!Object.prototype.hasOwnProperty.call(m,'structureSlots')&&!Object.prototype.hasOwnProperty.call(m,'structureSlotsEnabled'))return false;
  var old=Object.values(m.structureSlots||{}).filter(Boolean).map(GTTransactions.clone);
  if(old.length){
   if(!m.structure&&MULTIBLOCKS.managed(m))MULTIBLOCKS.initializeEmpty(m);
   if(!m.structure)m.structure={installedParts:[],formed:false};
   var s=m.structure,recovery=GTTransactions.clone(s.recoveryItems||[]),fixed=components(m);
   // Old slot entries were separately withdrawn. Two entries mean two owned sets.
   old.forEach(function(stack){
    var n=stack.n==null?1:stack.n;if(!Number.isSafeInteger(n)||n<1||!CONTENT.item(stack.k))throw Error('Invalid legacy structure component');
    var k=CONTENT.canonicalKey(stack.k),group=MULTIBLOCKS.live(m)&&STRUCTURE_UPGRADES.groups(m).find(function(g){return STRUCTURE_UPGRADES.keys(g).includes(k);});
    if(group&&Object.keys(stack).every(function(key){return key==='k'||key==='n';})){
     var family=STRUCTURE_UPGRADES.keys(group);
     if(!fixed.some(function(p){return family.includes(p.k);})){s.variant[group.field]=group.options.findIndex(function(_,i){return group.parts(i).some(function(p){return CONTENT.canonicalKey(p.k)===k;});});}
     var need=MULTIBLOCKS.required(m).fixed.find(function(p){return p.k===k;}),current=fixed.find(function(p){return p.k===k;}),take=Math.min(n,Math.max(0,(need?need.n:0)-(current?current.n:0)));
     if(take){if(current)current.n+=take;else fixed.push({k:k,n:take});n-=take;}
    }
    if(n)recovery.push(Object.assign({},stack,{k:k,n:n}));
   });
   if(MULTIBLOCKS.live(m))s.fixedParts=STRUCTURE_CORE.counts(fixed);
   s.recoveryItems=recovery;
   if(MULTIBLOCKS.live(m))MULTIBLOCKS.invalidate(m);
  }
  delete m.structureSlots;delete m.structureSlotsEnabled;return true;
 }
 root.STRUCTURE_STATE={components:components,inventoryCounts:inventoryCounts,fixedCounts:fixedCounts,state:state,migrate:migrate};
})(typeof window!=='undefined'?window:globalThis);
