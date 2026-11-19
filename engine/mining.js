/* Regular vein ores follow the instance's ore-drop configuration. A geology
 * block, a raw ore item and a crushed ore are different forms, not aliases. */
(function(root){
 'use strict';var raw={},C=CONTENT,rules=GD.miningRules||{mode:'FortuneItem'};
 // 粗矿对照来自 GD.rawOres（本机内容数据生成，覆盖主世界与各星球矿石）；矿石字典仅作旧数据兜底。
 Object.keys(GD.rawOres||{}).forEach(function(k){raw[C.canonicalKey(k)]=C.canonicalKey(GD.rawOres[k]);});
 (GD.veins||[]).forEach(function(v){v.ores.forEach(function(o){var k=C.canonicalKey(o.key);if(raw[k])return;var group=C.data.ore['rawOre'+o.mat];if(group&&group.length)raw[k]=C.canonicalKey(C.data.items[group[0]].k);});});
 function drop(key,dim){
  key=C.canonicalKey(key);var rich=dim==='nether'&&rules.netherRich||dim==='end'&&rules.endRich,n=rich?2:1,mode=rules.mode;
  if((mode==='FortuneItem'||mode==='Item')&&raw[key])return{k:raw[key],n:n};
  if(mode==='UnifiedBlock'||mode==='PerDimBlock'&&!rich)return{k:key.replace(/@(\d+)$/,function(_,n){return'@'+(+n%1000);}),n:mode==='UnifiedBlock'?n:1};
  return{k:key,n:1};
 }
 function level(k){var p=root.NATIVE_RULES&&NATIVE_RULES.properties(k);return p&&Number.isSafeInteger(p.oreHarvestLevel)?p.oreHarvestLevel:p&&Number.isSafeInteger(p.blockHarvestLevel)?p.blockHarvestLevel:null;}
 function materialOre(mat){var group=C.data.ore['ore'+mat]||[];return group.map(function(i){return C.data.items[i].k;}).find(function(k){return /^gregtech:gt\.blockores\d*@/.test(k)&&level(k)!=null;})||null;}
 function toolLevel(s){if(!s||s.entityUid)return null;if(root.TINKER_TOOLS&&TINKER_TOOLS.isPick(s.k)){var t=TINKER_TOOLS.info(s);return t&&!t.broken?t.level:null;}
  var types=GD.tools.types.filter(function(t){return t.id==='pick';});if(!types.some(function(t){return t.keys.includes(C.baseKey(s.k));})||s.dur!=null&&s.dur<=0)return null;
  var p=root.NATIVE_RULES&&NATIVE_RULES.properties(s.k);if(!p)return null;return Number.isSafeInteger(p.gtToolHarvestLevel)?p.gtToolHarvestLevel:Number.isSafeInteger((p.toolHarvestLevels||{}).pickaxe)?p.toolHarvestLevels.pickaxe:null;
 }
 function findPick(S,needed){var arrays=[S.inv||[],Object.values(S.tools||{})];for(var a of arrays){var best=null;for(var s of a){var l=toolLevel(s);if(l==null||l<needed)continue;if(!best||(s.dur==null?999999:s.dur)<(best.inst.dur==null?999999:best.inst.dur))best={k:s.k,inst:s,index:a.indexOf(s),id:Object.keys(S.tools||{}).find(function(id){return S.tools[id]===s;}),where:a===S.inv?'inv':'tool',level:l};}if(best)return best;}return null;}
 function smallLevel(mat){var k=materialOre(mat),v=k&&level(k);return v==null?null:Math.max(0,v-1);}
 function ensureVein(v){if(v.oreStock)return v.oreStock;var n=Math.max(0,Math.floor(v.left||0)),total=v.ores.reduce(function(n,o){return n+o.w;},0),assigned=0;v.oreStock={};v.ores.forEach(function(o){var count=Math.floor(n*o.w/total);v.oreStock[o.key]=(v.oreStock[o.key]||0)+count;assigned+=count;});for(var i=0;assigned<n;i++,assigned++)v.oreStock[v.ores[i%v.ores.length].key]++;return v.oreStock;}
 function oreKinds(v){var seen=new Set();return v.ores.filter(function(o){if(seen.has(o.key))return false;seen.add(o.key);return true;});}
 function start(S,vein,quantity){
  if(!vein||!root.ACTION_QUEUE)return null;
  var total=remaining(vein),n=Math.min(quantity||total,total);
  if(!(n>=1))return null;
  var id=vein.id||('vein'+(S.veinSequence=(S.veinSequence||0)+1));vein.id=id;
  return ACTION_QUEUE.enqueue(S,{type:'mine',veinId:id,vi:(S.veins||[]).indexOf(vein),veinName:vein.name,vein:vein,prog:0,done:0,target:n,vol:n});
 }
 function excluded(v,k){return (v.blacklist||[]).includes(C.canonicalKey(k));}
 function remaining(v){var stock=ensureVein(v);return oreKinds(v).reduce(function(n,o){return n+(excluded(v,o.key)?0:stock[o.key]||0);},0);}
 function setExcluded(S,v,k,on){k=C.canonicalKey(k);if(!v.ores.some(function(o){return C.canonicalKey(o.key)===k;}))return false;v.blacklist=Array.from(new Set((v.blacklist||[]).filter(function(p){return p!==k;}).concat(on?[k]:[])));return true;}
 function eligible(S,v){var stock=ensureVein(v);return oreKinds(v).filter(function(o){var needed=level(o.key);return !excluded(v,o.key)&&stock[o.key]>0&&needed!=null&&findPick(S,needed);});}
 function random(a,n){var seed=a.randomState;if(seed==null)seed=(Math.random()*4294967296)>>>0;seed=seed||123456789;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;a.randomState=seed>>>0;return a.randomState%n;}
 function choose(candidates,stock,rng){var total=candidates.reduce(function(n,o){return n+stock[o.key];},0),roll=random(rng,total),selected=candidates[0];for(var o of candidates){roll-=stock[o.key];if(roll<0){selected=o;break;}}return selected;}
 function duration(S,tool,key){var ticks=root.WORK_TIME&&WORK_TIME.breakTicks(key,tool),seconds=ticks>0?ticks/20:1;return root.GAME_TIME?GAME_TIME.seconds(S,seconds):seconds;}
 function previewPeriod(S,a){if(!a||!a.vein||!(a.vein.left>0))return null;var candidates=eligible(S,a.vein);if(!candidates.length)return null;var selected=a.randomState==null?candidates[0]:choose(candidates,ensureVein(a.vein),{randomState:a.randomState}),p=findPick(S,level(selected.key));return p?duration(S,p.inst,selected.key):null;}
 function stepVein(S,a,dt,hooks){
  hooks=hooks||{};var v=a.vein,receipts=[];if(!DIMENSIONS.open(S,v.dim)){a.blocked='DIMENSION';return receipts;}var stock=ensureVein(v);if(!(v.left>0))return receipts;if(!remaining(v)){a.done=a.target;a.blocked='FILTERED';return receipts;}
  var candidates=eligible(S,v);if(!candidates.length){a.blocked='HARVEST_LEVEL';return receipts;}a.prog=(a.prog||0)+dt;
  if(a.randomState==null)a.randomState=(Math.random()*4294967296)>>>0||123456789;
  for(var guard=0;guard<5000&&v.left>0&&(a.target==null||(a.done||0)+receipts.length<a.target);guard++){
   if(!remaining(v)){a.done=a.target-receipts.length;a.blocked='FILTERED';break;}candidates=eligible(S,v);if(!candidates.length){a.blocked='HARVEST_LEVEL';break;}
   var rng={randomState:a.randomState},selected=choose(candidates,stock,rng);
   var p=findPick(S,level(selected.key)),period=hooks.duration?hooks.duration(p.inst,selected.key):duration(S,p.inst,selected.key);if(root.GAME_TIME&&GAME_TIME.oneTick(S))a.prog=period;a.period=period;if(a.prog+1e-9<period)break;
   var result=COMMANDS.exchange(S,[],[drop(selected.key,v.dim)]);if(!result.ok){a.blocked=result.code;break;}
   a.randomState=rng.randomState;p.inst=p.where==='inv'?S.inv[p.index]:S.tools[p.id];if(root.TINKER_TOOLS&&TINKER_TOOLS.isPick(p.k))result.tool=TINKER_TOOLS.mine(p.inst,true,S);else if(hooks.wear)hooks.wear(p);
   stock[selected.key]=Math.max(0,stock[selected.key]-1);v.left--;a.prog=Math.max(0,a.prog-period);receipts.push(result);delete a.blocked;if(root.GAME_TIME&&GAME_TIME.oneTick(S))break;
  }return receipts;
 }

 root.MINING={rawOres:raw,rules:rules,drop:drop,start:start,level:level,materialOre:materialOre,smallLevel:smallLevel,toolLevel:toolLevel,findPick:findPick,ensureVein:ensureVein,eligible:eligible,oreKinds:oreKinds,excluded:excluded,remaining:remaining,setExcluded:setExcluded,duration:duration,previewPeriod:previewPeriod,stepVein:stepVein};
})(typeof window!=='undefined'?window:globalThis);
