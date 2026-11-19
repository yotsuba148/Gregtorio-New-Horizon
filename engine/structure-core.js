/* Shared physical-material ledger. Geometry and interface rules stay in profiles. */
(function(root){
 'use strict';
 function counts(parts){var out=new Map();(parts||[]).forEach(function(p){if(!p||!CONTENT.item(p.k)||!Number.isSafeInteger(p.n)||p.n<0)throw Error('Invalid structure material');var k=CONTENT.canonicalKey(p.k);var n=(out.get(k)||0)+p.n;if(!Number.isSafeInteger(n))throw Error("Structure material count overflow");out.set(k,n);});return Array.from(out,function(v){return {k:v[0],n:v[1]};}).filter(function(p){return p.n>0;});}
 function delta(before,after){var old=new Map(counts(before).map(function(p){return[p.k,p.n];})),next=new Map(counts(after).map(function(p){return[p.k,p.n];})),consume=[],refund=[];new Set(Array.from(old.keys()).concat(Array.from(next.keys()))).forEach(function(k){var n=(next.get(k)||0)-(old.get(k)||0);if(n>0)consume.push({k:k,n:n});if(n<0)refund.push({k:k,n:-n});});return {consume:consume,refund:refund};}
 function missing(installed,required){var have=new Map(counts(installed).map(function(p){return[p.k,p.n];}));return counts(required).filter(function(p){return (have.get(p.k)||0)<p.n;}).map(function(p){return {k:p.k,n:p.n-(have.get(p.k)||0)};});}
 function constructionCost(S,consume,isFixedBlock){
  if(!isFixedBlock||!DEVELOPER_MODE.active(S))return consume;
  return consume.filter(function(p){return !isFixedBlock(p.k);});
 }
 function exchange(S,before,after,isFixedBlock){var d=delta(before,after);return COMMANDS.exchange(S,constructionCost(S,d.consume,isFixedBlock),d.refund,{drops:true});}
 root.STRUCTURE_CORE={counts:counts,delta:delta,missing:missing,constructionCost:constructionCost,exchange:exchange};
})(typeof window!=='undefined'?window:globalThis);
