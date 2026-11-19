(function(root){
 'use strict';
 var definitions=[],cache=new Map();
 function register(resolve){definitions.push(resolve);cache.clear();}
 function spec(k){k=CONTENT.canonicalKey(k);if(cache.has(k))return cache.get(k);var value=null;for(var i=definitions.length-1;i>=0&&!value;i--)value=definitions[i](k);cache.set(k,value);return value;}
 register(function(k){return COMMANDS.coverSpec(k);});
 register(function(k){var i=CONTENT.itemIndices[k],tag=CONTENT.data.equivalences&&CONTENT.data.equivalences[i];return /^plate(?:Double|Triple|Quadruple|Quintuple|Dense)?[A-Z]/.test(tag||'')?{k:k,type:'plate',kind:'both',passItems:false,passFluids:false}:null;});
 function normalizeCover(c){if(c&&(c.type==='pump'||c.type==='conveyor'))c.allowOpposite=!!c.allowOpposite;return c;}
 function ensure(m){if(!m.covers)m.covers={};Object.keys(m.covers).forEach(function(side){var c=m.covers[side],d=c&&spec(c.k);if(d){Object.keys(d).forEach(function(k){if(k!=='passItems'&&k!=='passFluids'||c[k]==null)c[k]=d[k];});c.side=+side;if(!c.mode)c.mode='export';normalizeCover(c);}});return m.covers;}
 function canAttach(m,side,d=DEFS.of(m.k)){if(!d)return true;if(d.supportsCovers===false)return false;if(d.generator&&!d.multiblock&&side===(m.outFace==null?1:m.outFace))return false;if(d.transformer&&root.POWER_TRANSFORMER)return root.POWER_TRANSFORMER.acceptsCover(m,d,side);return true;}
 function applies(m,side,cover){
  var d=DEFS.of(m.k);
  return canAttach(m,side,d)&&(!d?.coverApplies||d.coverApplies(cover));
 }
 function pruneInstalled(S){
  (S.fx&&S.fx.machines||[]).forEach(function(m){
   [m].concat(m.structure&&m.structure.ports||[]).forEach(function(owner){Object.keys(owner.covers||{}).forEach(function(side){var c=owner.covers[side];if(!c||!Number.isInteger(Number(side))||Number(side)<0||Number(side)>3||!spec(c.k)||!canAttach(owner,Number(side)))delete owner.covers[side];});});
  });
 }
 function set(S,m,side,k,mode){
  if(k)k=CONTENT.canonicalKey(k);
  if(!Number.isInteger(side)||side<0||side>3||!m||!ENTITIES.active(m))return{ok:false,code:'SIDE'};
  if(k&&!canAttach(m,side))return{ok:false,code:'POWER_OUTPUT'};var old=ensure(m)[side],d=k&&spec(k);if(k&&!d||mode&&!['import','export'].includes(mode))return{ok:false,code:'COVER'};
  var result=COMMANDS.exchange(S,k&&(!old||old.k!==k)?[{k:k,n:1}]:[],old&&old.k!==k?[{k:old.k,n:1}]:[],{drops:true});if(!result.ok)return result;
  if(!k)delete m.covers[side];else m.covers[side]=normalizeCover(Object.assign({},old&&old.k===k?old:{},d,{side:side,mode:mode||old&&old.k===k&&old.mode||'export'}));
  return result;
 }
 function configureCover(c,values){if(!c||!values)return{ok:false,code:'COVER'};
  if(values.mode!=null&&(!['import','export'].includes(values.mode)||c.type==='plate'))return{ok:false,code:'MODE'};
  if(values.allowOpposite!=null&&(typeof values.allowOpposite!=='boolean'||!['pump','conveyor'].includes(c.type)))return{ok:false,code:'VALUE'};
  if(values.mode!=null)c.mode=values.mode;if(values.allowOpposite!=null)c.allowOpposite=values.allowOpposite;
  if(c.type==='plate'){if(values.passItems!=null)c.passItems=!!values.passItems;if(values.passFluids!=null)c.passFluids=!!values.passFluids;}return{ok:true};
 }
 function configure(m,side,values){return configureCover(ensure(m)[side],values);}
 function turns(c,tick){var period=c.period||20;return Math.max(0,Math.floor(tick/period)-Math.floor(Math.max(0,tick-5)/period))*(c.maxStacks||1);}
 function accepts(k){var d=spec(k);return !!d&&(d.type==='pump'||d.type==='conveyor');}
 root.MACHINE_COVERS={accepts:accepts,canAttach:canAttach,applies:applies,pruneInstalled:pruneInstalled,register:register,spec:spec,ensure:ensure,normalizeCover:normalizeCover,set:set,configure:configure,configureCover:configureCover,turns:turns};
})(typeof window!=='undefined'?window:globalThis);
