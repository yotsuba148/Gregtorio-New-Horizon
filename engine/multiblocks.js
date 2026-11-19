(function(root){
 'use strict';
 var TX=GTTransactions,DIR=[[0,-1],[1,0],[0,1],[-1,0]],aliases=new WeakMap(),derived=new WeakMap(),outputMembers=new WeakMap();
 var shapes={
  railcraft_water_collector:{w:3,h:3,cx:1,cy:1,builtin:true},
  primitiveblastfurnace:{w:3,h:4,cx:1,cy:2,builtin:true},
  blastfurnace:{w:3,h:4,cx:1,cy:3},vacuumfreezer:{w:3,h:3,cx:1,cy:1},
  implosioncompressor:{w:3,h:3,cx:1,cy:1},distillationtower:{w:3,h:4,cx:1,cy:3},
  largechemicalreactor:{w:3,h:3,cx:1,cy:1},pyrolyseoven:{w:5,h:4,cx:2,cy:3},
  largeboiler_bronze:{w:3,h:5,cx:1,cy:4},largeboiler_steel:{w:3,h:5,cx:1,cy:4},
  cleanroom:{w:5,h:5,cx:2,cy:0,room:true},industrialextruder:{w:5,h:3,cx:0,cy:1}
 };
 function registerShape(id, shape){if(!id||!shape)return;shapes[id]=shape;}
 function base(m){return DEFS.of(m.k);}
 function dimensions(m){var p=STRUCTURES.profile(m);return p&&p.dimensions||[];}
 function placementSize(m,requested){var out={},fields=dimensions(m);requested=requested||{};for(var i=0;i<fields.length;i++){var f=fields[i],n=requested[f.key];if(n==null)n=f.initial;if(!Number.isSafeInteger(n)||n<f.min||n>f.max||(n-f.min)%(f.step||1))return null;out[f.key]=n;}var p=STRUCTURES.profile(m);return p&&p.validSize&&!p.validSize(out)?null:out;}
 function dimensionsOf(m){var saved=m.structureSize||m.structure&&m.structure.variant||{},out={};dimensions(m).forEach(function(f){var n=saved[f.key];out[f.key]=Number.isSafeInteger(n)?Math.max(f.min,Math.min(f.max,n)):f.initial;});return out;}
 function lockSize(m){if(dimensions(m).length&&!m.structureSize)m.structureSize=dimensionsOf(m);return m.structureSize;}
 function variantFor(m,variant){return Object.assign({},m.buildPlan||{},m.structure&&m.structure.variant||{},variant||{},m.structureSize||{});}
 function shape(m,variant){var d=base(m),s=d&&shapes[d.structureProfile];if(!s)return null;var p=STRUCTURES.profile(m),variable=s.resize||s.room||d.structureProfile==='distillationtower';if(!variable&&!(p&&p.anchor))return s;var out=Object.assign({},s),v=variable&&variantFor(m,variant);if(s.resize)Object.assign(out,s.resize(v));if(d.structureProfile==='distillationtower'){out.h=Math.max(3,Math.min(12,v.height||4));out.cy=out.h-1;}if(s.room){out.w=Math.max(3,Math.min(15,v.width||5));out.h=Math.max(3,Math.min(15,v.depth||5));out.cx=Math.floor(out.w/2);}if(p&&p.anchor){var anchor=p.anchor(m);out.cx=anchor.x;out.cy=anchor.y;}return out;}
 function turn(m){return (m.rotation||0)&3;}
 function localPoint(m,x,y){var s=shape(m);if(!s)return{x:x,y:y};switch(turn(m)){case 1:return{x:y,y:s.h-1-x};case 2:return{x:s.w-1-x,y:s.h-1-y};case 3:return{x:s.w-1-y,y:x};default:return{x:x,y:y};}}
 function rotatedPoint(s,r,x,y){if(!s)return{x:x,y:y};switch(r){case 1:return{x:s.h-1-y,y:x};case 2:return{x:s.w-1-x,y:s.h-1-y};case 3:return{x:y,y:s.w-1-x};default:return{x:x,y:y};}}
 function point(m,x,y){return rotatedPoint(shape(m),turn(m),x,y);}
 function worldFace(m,id){var f=typeof id==='string'?id.split(',').map(Number):[id.x,id.y,id.side],p=point(m,f[0],f[1]);return{x:m.x+p.x,y:m.y+p.y,dx:p.x,dy:p.y,side:(f[2]+turn(m))%4};}
 function localFace(m,x,y,side){var p=localPoint(m,x-m.x,y-m.y);return{x:p.x,y:p.y,side:(side-turn(m)+4)%4,id:faceId(p.x,p.y,(side-turn(m)+4)%4)};}
 function bounds(m,variant){var s=shape(m,variant);if(!s)return null;var p=rotatedPoint(s,turn(m),s.cx,s.cy),v=Object.assign({},s,{cx:p.x,cy:p.y});if(turn(m)%2){v.w=s.h;v.h=s.w;}return v;}
 function managed(m){var d=base(m),s=d&&shapes[d.structureProfile];return !!s&&!s.builtin;}
 function live(m){return !!(m.structure&&m.structure.schema===2);}
 function hole(m,x,y){return !!(m.structure&&(m.structure.wallHoles||[]).includes(x+','+y));}
 function cells(m,variant,includeHoles){var s=shape(m,variant);if(!s)return[{x:m.x,y:m.y}];var out=[];var prof0=STRUCTURES.profile(m),pat0=prof0&&(typeof prof0.visualPattern==='function'?prof0.visualPattern(m):prof0.visualPattern);for(var y=0;y<s.h;y++)for(var x=0;x<s.w;x++)if((!pat0||!pat0[y]||pat0[y][x]!==' ')&&(!s.room||x===0||y===0||x===s.w-1||y===s.h-1)&&(includeHoles||!hole(m,x,y))){var p=rotatedPoint(s,turn(m),x,y);out.push({x:m.x+p.x,y:m.y+p.y,dx:p.x,dy:p.y,lx:x,ly:y});}return out;}
 function occupies(m,x,y){var s=shape(m),p=s&&localPoint(m,x-m.x,y-m.y);if(!s)return m.x===x&&m.y===y;if(p.x<0||p.y<0||p.x>=s.w||p.y>=s.h||hole(m,p.x,p.y))return false;var profile=STRUCTURES.profile(m),pattern=profile&&(typeof profile.visualPattern==='function'?profile.visualPattern(m):profile.visualPattern);return (!pattern||!pattern[p.y]||pattern[p.y][p.x]!==' ')&&(!s.room||p.x===0||p.y===0||p.x===s.w-1||p.y===s.h-1);}

 function faceId(x,y,d){return x+','+y+','+d;}
 function faces(m,variant){var s=shape(m,variant),out=[];if(!s)return out;var prof=STRUCTURES.profile(m),pat=prof&&(typeof prof.visualPattern==='function'?prof.visualPattern(m):prof.visualPattern);for(var y=0;y<s.h;y++)for(var x=0;x<s.w;x++){if(pat&&pat[y]&&pat[y][x]&&(pat[y][x]===' '||pat[y][x]==='G'||pat[y][x]==='F'))continue;for(var d=0;d<4;d++)if(prof&&prof.portFace?prof.portFace(x,y,d,m):d===0&&y===0||d===1&&x===s.w-1||d===2&&y===s.h-1||d===3&&x===0)out.push({id:faceId(x,y,d),x:x,y:y,side:d});}return out;}
 var extraSpecs={},nativeSpecs=new Map();
 // Definitions contain no inventory or running state. Runtime registrations
 // take precedence; unknown keys are never cached during bootstrap.
 function spec(k){k=CONTENT.canonicalKey(k);if(extraSpecs[k])return extraSpecs[k];if(nativeSpecs.has(k))return nativeSpecs.get(k);var value=nativeSpec(k);if(value)nativeSpecs.set(k,value);return value;}
 function nativeSpec(k){var a=/^gregtech:gt.blockmachines@(\d+)$/.exec(k);if(!a)return null;var dynSpec=root.MULTIBLOCK_POWER&&MULTIBLOCK_POWER.spec(k);if(dynSpec)return dynSpec;var n=+a[1],type,t,diode=false,maxAmps=1,fluidCapacity;
  if(n>=40&&n<=49||n>=11300&&n<=11303){type='energy';t=n<50?n-40:n-11290;}
  else if(n>=15100&&n<=15129){
   var tierIndex=(n-15100)%10;
   var tier=tierIndex===9?4:tierIndex+5,amperes=[4,16,64][Math.floor((n-15100)/10)],volts=DEFS.voltOf(tier);
   return {k:k,type:'energy',tier:tier,voltage:volts,multiAmp:true,amperage:amperes+(amperes>>2),workingAmperage:amperes,
    energyCapacity:512+volts*4*amperes,slots:0,capacity:0};
  }
  else if(n>=50&&n<=59||n>=12097&&n<=12100||n===12102){type='fluidIn';t=n<60?n-50:n===12102?14:n-12087;}
  else if(n>=60&&n<=69||n>=12103&&n<=12106||n===12108){type='fluidOut';t=n<70?n-60:n===12108?14:n-12093;}
  else if(n===12799){type='fluidIn';t=13;fluidCapacity=2000000000;}
  else if(n===12737){type='fluidOut';t=0;fluidCapacity=100000000;}
  else if(n>=70&&n<=79){type='itemIn';t=n-70;}
  else if(n>=80&&n<=89){type='itemOut';t=n-80;}
  else if(n>=10&&n<=19){type='feedthrough';t=n-10;}
  else if(n>=12617&&n<=12695&&(n-12617)%16<15){type='feedthrough';t=(n-12617)%16;diode=true;maxAmps=[2,4,8,12,16][Math.floor((n-12617)/16)];}
  else return null;
  var voltage=DEFS.voltOf(t),slots=type==='itemIn'||type==='itemOut'?(t<=0?1:t===1?4:t===2?9:16):0;
  return{k:k,type:type,tier:t,voltage:voltage,diode:diode,amperage:type==='energy'?2:maxAmps,energyCapacity:type==='energy'?512+voltage*8:type==='feedthrough'?512+voltage*50:0,
   slots:slots,capacity:type==='fluidIn'||type==='fluidOut'?fluidCapacity||8000*Math.pow(2,t):0,itemIn:type==='itemIn',itemOut:type==='itemOut',fluidIn:type==='fluidIn',fluidOut:type==='fluidOut'};
 }
 function ports(m){return live(m)?m.structure.ports:[];}
 function at(m,id){return ports(m).find(function(p){return p.face===id;})||null;}
 function byUid(m,uid){return ports(m).find(function(p){return p.uid===uid;})||null;}
 function members(m,field){var ordered=field==='outs'||field==='tanksOut',memo=ordered&&outputMembers.get(m);if(memo&&memo.structure===m.structure&&memo[field])return memo[field];var list=ports(m).filter(function(p){var s=spec(p.k);return s&&(field==='ins'?s.itemIn:field==='outs'?s.itemOut:field==='tanksEnergy'?s.steam:field==='tanksIn'?s.fluidIn&&!s.steam:s.fluidOut);});var profile=STRUCTURES.profile(m);if(!ordered&&profile.inputOrder)list.sort(function(a,b){return profile.inputOrder(m,a,field==='ins'?'item':'fluid')-profile.inputOrder(m,b,field==='ins'?'item':'fluid');});if(ordered){list.sort(function(a,b){var x=a.face.split(',').map(Number),y=b.face.split(',').map(Number);return (base(m).layeredOutputs?y[1]-x[1]:x[1]-y[1])||x[0]-y[0]||x[2]-y[2];});if(!memo||memo.structure!==m.structure){memo={structure:m.structure};outputMembers.set(m,memo);}memo[field]=list;}return list;}
 function tankCaps(s){return s.capacity?Array(s.fluidSlots||1).fill(s.capacity):[];}
 function length(p,field){var s=spec(p.k);return field==='ins'||field==='outs'?s.slots:tankCaps(s).length;}
 function array(p,field){var name=field==='ins'||field==='outs'?'items':'tanks',n=length(p,field);if(!Array.isArray(p[name]))p[name]=Array(n).fill(null);while(p[name].length<n)p[name].push(null);return p[name];}
 function locate(m,field,index){for(var p of members(m,field)){var n=length(p,field);if(index<n)return{port:p,arr:array(p,field),index:index};index-=n;}return null;}
 function size(m,field){return members(m,field).reduce(function(n,p){return n+length(p,field);},0);}
 function joined(m,field){var entries=[];members(m,field).forEach(function(p){for(var i=0;i<length(p,field);i++)entries.push({port:p,index:i});});var count=entries.length,target=Array(count).fill(null);return new Proxy(target,{
  get:function(a,k,r){if(k==='length')return count;if(typeof k==='string'&&/^\d+$/.test(k)){var v=entries[+k];return v?array(v.port,field)[v.index]||null:undefined;}return Reflect.get(a,k,r);},
  set:function(a,k,v){if(k==='length'){if(v<count)for(var i=v;i<count;i++){var found=entries[i];array(found.port,field)[found.index]=null;}return true;}if(typeof k==='string'&&/^\d+$/.test(k)){var found=entries[+k];if(!found){if(v!=null)throw Error('Multiblock slot capacity exceeded');return true;}array(found.port,field)[found.index]=v;return true;}return Reflect.set(a,k,v);}
 });}
 function bind(m){if(!live(m)||aliases.get(m)===m.structure)return;aliases.set(m,m.structure);
  ['ins','outs','tanksIn','tanksOut'].concat(base(m).steamPowered?['tanksEnergy']:[]).forEach(function(field){var view=joined(m,field);Object.defineProperty(m,field,{configurable:true,enumerable:false,get:function(){return view;},set:function(values){if(!Array.isArray(values))values=[];if(values.slice(view.length).some(Boolean))throw Error('Multiblock contents exceed installed slots');for(var i=0;i<view.length;i++)view[i]=values[i]||null;}});});
  Object.defineProperty(m,'eu',{configurable:true,enumerable:false,get:function(){return ports(m).reduce(function(n,p){var t=spec(p.k).type;return n+((t==='energy'||t==='dynamo')?p.eu||0:0);},0);},set:function(v){v=Math.max(0,Number(v)||0);var list=ports(m).filter(function(p){var t=spec(p.k).type;return t==='energy'||t==='dynamo';}),current=list.reduce(function(n,p){return n+(p.eu||0);},0),delta=v-current;if(delta<0){var left=-delta;list.forEach(function(p){var take=Math.min(left,p.eu||0);p.eu=(p.eu||0)-take;left-=take;});}else list.forEach(function(p){var take=Math.min(delta,Math.max(0,spec(p.k).energyCapacity-(p.eu||0)));p.eu=(p.eu||0)+take;delta-=take;});}});
  Object.defineProperty(m.structure,'installedParts',{configurable:true,enumerable:false,get:function(){return (this.fixedParts||[]).concat(this.ports.map(function(p){return{k:p.k,n:1};}));}});
 }
 function invalidate(m){if(!live(m))return;m.structure.dirty=true;aliases.delete(m);derived.delete(m);outputMembers.delete(m);bind(m);}
 function physicalFace(m,id,s,face){
  var f=face||faces(m).find(function(f){return f.id===id;});
  return !!(s&&f)&&(!s.multiAmp||STRUCTURES.profile(m).multiAmpEnergy)&&HATCH_RULES.allows(s,function(view){return allowedSingle(m,f,view);});
 }
 function portIssue(m,s){return root.MACHINE_MODES?MACHINE_MODES.portIssue(m,s):null;}
 function allowedFace(m,id,key){return allowsPort(m,id,spec(key));}
 function allowsPort(m,id,s){return physicalFace(m,id,s)&&!portIssue(m,s);}
 var catalog;
 function portOptions(m){
  if(!catalog)catalog=Object.keys(GD.items).flatMap(function(k){
   if(!extraSpecs[k]&&!k.startsWith('gregtech:gt.blockmachines@'))return [];
   var s=spec(k);
   return s&&(s.k||s.key)===k&&CONTENT_SCOPE.allowed(k)?[{spec:s,label:HATCH_RULES.label(s,GD.items[k])}]:[];
  });
  var modes=catalog.filter(function(row){return !portIssue(m,row.spec);}),out=new Map();
  var installed=ports(m),max=STRUCTURES.profile(m).maxPorts,plan=fixedPlan(m,m.structure?.variant||{});
  faces(m).forEach(function(f){
   var supported=new Set(),available=new Set(),others=installed.filter(function(p){return p.face!==f.id;});
   modes.forEach(function(row){
    if(available.has(row.label)||!physicalFace(m,f.id,row.spec,f))return;
    supported.add(row.label);
    if((max==null||others.length<max)&&limits(m,others.concat({k:row.spec.k,face:f.id}),plan))available.add(row.label);
   });
   out.set(f.id,{supported:Array.from(supported),available:Array.from(available)});
  });
  return out;
 }
 function allowedSingle(m,f,s){var id=f.id,d=base(m);var profile=STRUCTURES.profile(m);if(profile.allowedFace)return profile.allowedFace(m,f,s);if(s.steamComponent)return false;if(shape(m).room){var sh=shape(m);if(f.x===sh.cx&&f.y===sh.cy||ports(m).some(function(p){var q=p.face.split(',').map(Number);return p.face!==id&&q[0]===f.x&&q[1]===f.y;}))return false;if(s.type==='feedthrough'&&(f.x===0||f.x===sh.w-1)&&(f.y===0||f.y===sh.h-1))return false;return s.type==='energy'||s.type==='feedthrough';}if(!HATCH_RULES.isOrdinary(s)||shape(m).builtin)return false;if(d.structureProfile==='implosioncompressor'&&(s.fluidIn||s.fluidOut))return false;
  if(d.structureProfile==='distillationtower'&&(s.itemIn||s.itemOut&&!s.fluidOut||s.fluidIn))return f.y===shape(m).h-1;
  if(d.structureProfile==='distillationtower'&&s.fluidOut)return f.y<shape(m).h-1&&!ports(m).some(function(p){return p.face!==id&&spec(p.k).fluidOut&&+p.face.split(',')[1]===f.y;});
  if((d.structureProfile==='largeboiler_bronze'||d.structureProfile==='largeboiler_steel')&&s.type==='energy')return false;return true;
 }
 function makePort(m,face,k){var s=spec(k),p={uid:m.uid+':p'+(++m.structure.portSeq),face:face,k:CONTENT.canonicalKey(k)};if(s.slots)p.items=Array(s.slots).fill(null);if(s.capacity)p.tanks=Array(tankCaps(s).length).fill(null);if(HATCH_RULES.takesPower(s)||s.type==='feedthrough')p.eu=0;if(s.type==='feedthrough'){p.flow='in';p.amps=s.amperage;}if(s.itemIn){p.circ=0;p.circuitConfigured=true;}return p;}
 // Structure material ownership is independent of installed hatches.
 function casingKeys(m){var profile=STRUCTURES.profile(m),raw=profile.build(m.structure&&m.structure.variant||{}),keys=profile.casingKeys?profile.casingKeys(m):[raw.parts[0].k],d=base(m);if(d.largeBoiler)keys.push('gregtech:gt.blockcasings3@'+(d.structureProfile==='largeboiler_bronze'?13:14));return keys;}
 function casingKey(m,k,face){var d=base(m),s=spec(k),keys=casingKeys(m),profile=STRUCTURES.profile(m);if(profile.portBacking)return profile.portBacking(m,s,face);return d.largeBoiler&&s&&(s.fluidIn||s.itemIn)?keys[1]:keys[0];}
 function casingItem(S,k){k=CONTENT.canonicalKey(k);return !!(S.fx&&(S.fx.machines||[]).some(function(m){return live(m)&&casingKeys(m).includes(k);}));}
 function casingRepair(m,id,S){
  if(!live(m)||at(m,id)||!faces(m).some(function(f){return f.id===id;}))return null;
  var q=id.split(',').map(Number),sh=shape(m);if(sh.room&&(q[0]===sh.cx&&q[1]===sh.cy||ports(m).some(function(p){var v=p.face.split(',');return +v[0]===q[0]&&+v[1]===q[1];})))return null;
  if(S&&!portFree(S,m,id))return null;
  var need=required(m),keys=casingKeys(m);if(!need)return null;
  var missing=keys.filter(function(k){var n=need.fixed.find(function(p){return p.k===k;});return n&&materialCount(m,k)<n.n;});
  var holes=sh.room?(m.structure.wallHoles||[]).length:0,k=hole(m,q[0],q[1])?missing[0]:missing.find(function(k){var n=need.fixed.find(function(p){return p.k===k;});return n.n-materialCount(m,k)>holes;});return k?{k:k,n:1}:null;
 }
 function restoreCasing(S,m,id,k){var repair=casingRepair(m,id,S);if(!repair||CONTENT.canonicalKey(k)!==repair.k)return false;
  var part=m.structure.fixedParts.find(function(p){return p.k===repair.k;});if(part)part.n++;else m.structure.fixedParts.push({k:repair.k,n:1});
  var q=id.split(',');if(shape(m).room)m.structure.wallHoles=(m.structure.wallHoles||[]).filter(function(h){return h!==q[0]+','+q[1];});
  reconcileCasings(S,m);invalidate(m);validate(m);return true;
 }
 function casingCapacity(S,m,k,n){var have=materialCount(m,k);if(shape(m).room&&k===casingKeys(m)[0]){var blocked=(m.structure.wallHoles||[]).filter(function(cell){var f=faces(m).find(function(f){return f.x+','+f.y===cell;});return !f||!portFree(S,m,f.id);}).length;n-=blocked;}return Math.max(have,n);}
 function reconcileCasings(S,m){
  if(!live(m)||!shape(m).room||!S)return;var need=required(m);if(!need)return;
  var body=casingKeys(m)[0],want=need.fixed.find(function(p){return p.k===body;}),missing=Math.max(0,(want?want.n:0)-materialCount(m,body)),holes=m.structure.wallHoles||[],all=faces(m),kept=new Set();
  holes.forEach(function(cell){var face=all.find(function(f){return f.x+','+f.y===cell;});if(!face||!portFree(S,m,face.id))kept.add(cell);});
  var budget=Math.max(0,missing-kept.size);holes.forEach(function(cell){if(budget>0&&!kept.has(cell)){kept.add(cell);budget--;}});m.structure.wallHoles=holes.filter(function(cell){return kept.has(cell);});
 }
 function casingTarget(S,x,y,k){k=CONTENT.canonicalKey(k);var list=(S.fx.machines||[]).filter(function(m){return live(m)&&ENTITIES.isGrid(m)&&m.location.blueprintId===S.fx.activeBlueprintId&&(occupies(m,x,y)||shape(m).room&&hole(m,localPoint(m,x-m.x,y-m.y).x,localPoint(m,x-m.x,y-m.y).y));});
  for(var m of list){var local=localFace(m,x,y,0),f=faces(m).find(function(f){var repair=f.x===local.x&&f.y===local.y&&casingRepair(m,f.id,S);return repair&&repair.k===k;});if(f)return{m:m,face:f.id};}return null;
 }
 function placeCasing(S,x,y,k,source){var to=casingTarget(S,x,y,k),i=source&&source.bagIndex,item=Number.isInteger(i)&&S.inv[i];if(!to)return{ok:false,code:'WALL'};if(!item||item.entityUid||CONTENT.canonicalKey(item.k)!==CONTENT.canonicalKey(k)||!(item.n>0))return{ok:false,code:'INPUT'};return ITEM_TRANSFER.move(S,{type:'bag',index:i},{type:'structurePort',uid:to.m.uid,face:to.face},{n:1,swap:false});}
 function fixedPlan(m,variant){var p=STRUCTURES.profile(m),raw=root.MACHINE_MODES?MACHINE_MODES.plan(m,p.build(variantFor(m,variant))):p.build(variantFor(m,variant)),fixed=[],legacy=[];raw.parts.forEach(function(v){var s=spec(v.k);if(s&&s.type!=='feedthrough')for(var i=0;i<v.n;i++)legacy.push(v.k);else fixed.push(TX.clone(v));});
  if(variant&&variant.emptyPorts)legacy=[];

  var overbooked=fixed.some(function(p){return p.n<0;});
  return{raw:raw,fixed:fixed.map(function(p){return {k:p.k,n:Math.max(0,p.n)};}),legacy:legacy,overbooked:overbooked};
 }
 function required(m){return fixedPlan(m,m.structure.variant);}
 function limits(m,list,p){p=p||fixedPlan(m,m.structure&&m.structure.variant||{});if(!p||p.overbooked)return false;var profile=STRUCTURES.profile(m);if(profile.limits&&!profile.limits(m,list,p))return false;var d=base(m),id=d.structureProfile,min=id==='distillationtower'?7*shape(m).h-5:({vacuumfreezer:16,implosioncompressor:16,largechemicalreactor:8,pyrolyseoven:60,industrialextruder:14,cleanroom:20,largeboiler_bronze:24,largeboiler_steel:24}[id]||0);if(p.fixed[0].n<min)return false;if(d.largeBoiler){var fire='gregtech:gt.blockcasings3@'+(id==='largeboiler_bronze'?13:14);if((p.fixed.find(function(v){return v.k===fire;})||{}).n<3)return false;}if(id==='blastfurnace'&&list.filter(function(p){return HATCH_RULES.roles(spec(p.k)).some(function(role){return role!=='fluidOut';});}).length>7)return false;if(id==='cleanroom'&&list.filter(function(p){return spec(p.k).type==='energy';}).length>1)return false;return true;}
 function distribute(m,legacy){var available=faces(m),list=legacy.slice().sort(function(a,b){return(spec(a).type==='fluidOut'?1:0)-(spec(b).type==='fluidOut'?1:0);});
  for(var k of list){var choices=base(m).structureProfile==='distillationtower'&&spec(k).fluidOut?available.slice().sort(function(a,b){return b.y-a.y;}):available;var profile=STRUCTURES.profile(m);if(profile.portChoices)choices=profile.portChoices(m,k,choices);var f=choices.find(function(f){return !at(m,f.id)&&allowedFace(m,f.id,k);});if(!f)throw Error('Not enough multiblock faces for installed components');m.structure.ports.push(makePort(m,f.id,k));}
 }
 function fillLegacy(m,old){['ins','outs','tanksIn','tanksOut'].forEach(function(field){var values=old[field]||[],view=m[field],overflow=values.slice(view.length).filter(Boolean);if(overflow.length){var recovery=field==='ins'||field==='outs'?'recoveryItems':'recoveryFluids';m.structure[recovery]=(m.structure[recovery]||[]).concat(TX.clone(overflow));}for(var i=0;i<view.length;i++)view[i]=values[i]||null;});var left=old.eu||0;ports(m).filter(function(p){return spec(p.k).type==='energy';}).forEach(function(p,i,list){var n=i===list.length-1?left:Math.min(left,spec(p.k).energyCapacity);p.eu=n;left-=n;});if(left)m.structure.retiredEU=left;var bus=members(m,'ins')[0];if(bus){bus.circ=old.circ|0;bus.circuitConfigured=!!old.circuitConfigured;}}
 function initializeEmpty(m){if(live(m))return;if(m.structure)throw Error('Migrate existing structure before installing parts');lockSize(m);var old={ins:TX.clone(m.ins||[]),outs:TX.clone(m.outs||[]),tanksIn:TX.clone(m.tanksIn||[]),tanksOut:TX.clone(m.tanksOut||[]),eu:m.eu||0,circ:m.circ,circuitConfigured:m.circuitConfigured};m.structure={schema:2,materialSchema:1,profile:base(m).structureProfile,variant:Object.assign({},m.buildPlan||{},m.structureSize||{}),fixedParts:[],ports:[],portSeq:0,inputSeparation:base(m).defaultInputSeparation!==false,nextInput:0,dirty:true};bind(m);fillLegacy(m,old);}
 function upgrade(m){if(!managed(m)||live(m)||!m.structure)return false;var prior=m.structure,all=TX.clone(prior.installedParts&&prior.installedParts.length?prior.installedParts:prior.fixedParts||[]);if(!all.length)return false;var old={ins:TX.clone(m.ins||[]),outs:TX.clone(m.outs||[]),tanksIn:TX.clone(m.tanksIn||[]),tanksOut:TX.clone(m.tanksOut||[]),eu:m.eu||0,circ:m.circ,circuitConfigured:m.circuitConfigured},fixed=[],parts=[];
  all.forEach(function(v){var s=spec(v.k);if(s&&s.type!=='feedthrough')for(var i=0;i<v.n;i++)parts.push(v.k);else fixed.push(v);});
  m.structure={schema:2,profile:base(m).structureProfile,variant:TX.clone(prior.variant||{}),fixedParts:fixed,ports:[],portSeq:0,inputSeparation:prior.inputSeparation!==false,nextInput:0,formed:false,dirty:true};
  if(prior.recoveryItems)m.structure.recoveryItems=TX.clone(prior.recoveryItems);if(prior.recoveryFluids)m.structure.recoveryFluids=TX.clone(prior.recoveryFluids);
  distribute(m,parts);bind(m);fillLegacy(m,old);validate(m);return true;
 }
 function materialCount(m,k){return(m.structure.fixedParts||[]).filter(function(p){return CONTENT.canonicalKey(p.k)===CONTENT.canonicalKey(k);}).reduce(function(n,p){return n+p.n;},0);}
 function validate(m){if(!live(m))return;bind(m);if(!m.structure.dirty&&derived.has(m))return;var s=m.structure,need=required(m),errors=[],def=root.MACHINE_MODES?MACHINE_MODES.definition(m,base(m)):base(m),room=shape(m).room;
  var profile=STRUCTURES.profile(m),installed=ports(m),validPorts=[];
  (profile.upgrades||[]).forEach(function(g){var v=s.variant[g.field];if(v!=null&&(!Number.isInteger(v)||v<0||v>=g.options.length))errors.push(g.label+'等级无效');});
  var seen=new Set();installed.forEach(function(p){var specForPort=spec(p.k);
   if(seen.has(p.face)||!physicalFace(m,p.face,specForPort)){
    var f=worldFace(m,p.face),side=['上','右','下','左'][f.side];
    errors.push((GD.items[p.k]||'仓室')+'装在了无效位置'+(side?'（'+side+'侧 '+(f.dx+1)+', '+(f.dy+1)+'）':''));
   }
   else{
    var issue=portIssue(m,specForPort);
    if(!issue)validPorts.push(p);
    else if(!errors.includes(issue))errors.push(issue);
   }
   seen.add(p.face);
  });
  var dyn=root.MULTIBLOCK_POWER?MULTIBLOCK_POWER.dynamos(m):[],energy=validPorts.filter(function(p){return spec(p.k).type==='energy';}),requirements={};
  if(room)requirements.energy={min:1,max:1};
  else if(def.energyCapacity>0&&!(def.generator&&dyn.length))requirements.energy=1;
  if(def.inputIsolationFixed&&!profile.orderedBusLayout){
   requirements.itemIn=def.steamPowered?{min:1,label:'输入总线(蒸汽)'}:1;
   requirements.itemOut=def.steamPowered?{min:1,label:'输出总线(蒸汽)'}:1;
  }
  Object.assign(requirements,profile.portRequirements);
  HATCH_RULES.check(validPorts,requirements,errors);
  if(profile.maxPorts!=null&&installed.length>profile.maxPorts)errors.push('最多安装 '+profile.maxPorts+' 个仓室');
  if(profile.checkPortLayout)profile.checkPortLayout(m,validPorts,errors);
  if(!need||!limits(m,installed))errors.push('仓室数量超过结构上限');
  if(need)STRUCTURE_CORE.missing(s.fixedParts,need.fixed).forEach(function(p){errors.push('缺少'+(GD.items[p.k]||p.k)+' ×'+p.n);});
  if((s.wallHoles||[]).length)errors.push('墙体缺口 ×'+s.wallHoles.length);
  var inputVoltage=energy.reduce(function(n,p){return n+spec(p.k).voltage;},0);
  var voltage=energy.length?Math.floor(inputVoltage/energy.length):0,amps=energy.length===1?1:energy.reduce(function(n,p){return n+spec(p.k).amperage;},0),power=voltage*amps;
  var dynamos=dyn;
  if(def.generator&&dynamos.length){voltage=dynamos.reduce(function(n,p){return Math.max(n,DEFS.voltOf(p.tier));},0);amps=dynamos.reduce(function(n,p){return n+p.amperage;},0);power=voltage*amps;}
  var raw=need&&need.raw||{};
  var genOutputs=(def.generator&&dynamos.length)?dynamos.map(function(p){return {volt:DEFS.voltOf(p.tier),amps:p.amperage,face:p.face};}):null;
  var capability={voltage:voltage,inputVoltage:inputVoltage,amperage:(def.generator&&dynamos.length)?amps:energy.reduce(function(n,p){return n+spec(p.k).amperage;},0),power:power,heat:raw.heat||0,energyCapacity:energy.reduce(function(n,p){return n+spec(p.k).energyCapacity;},0),
   fluidInputTanks:members(m,'tanksIn').flatMap(function(p){return tankCaps(spec(p.k));}),fluidOutputTanks:members(m,'tanksOut').flatMap(function(p){return tankCaps(spec(p.k));}),slots:{in:size(m,'ins'),out:size(m,'outs')},durationMultiplier:raw.durationMultiplier||def.durationMultiplier||1};
  if(genOutputs)capability.outputs=genOutputs;
  if(profile.capability)profile.capability(m,capability,errors,raw);if(root.MACHINE_MODES)MACHINE_MODES.validate(m,validPorts,errors);
  if(def.maxTierSkips===0)capability.power=Math.min(capability.power,voltage);
  s.formed=errors.length===0;s.errors=errors;s.processingPowerEUt=capability.power;s.voltage=capability.voltage;s.amperage=capability.amperage;s.heat=capability.heat;s.dirty=false;derived.set(m,capability);return capability;
 }
 function instance(m,d){if(!live(m))return Object.assign({},d,{volt:0,amperage:0,maxRecipeEUt:0,energyCapacity:0,startEnergy:0,slots:{in:0,out:0},fluidInputTanks:[],fluidOutputTanks:[],controlCircuit:false});validate(m);var c=derived.get(m);if(c.instance&&c.instanceMode===m.processingMode&&c.instanceBase===d)return c.instance;c.instanceMode=m.processingMode;c.instanceBase=d;return c.instance=Object.assign({},root.MACHINE_MODES?MACHINE_MODES.definition(m,d):d,c.definition||{},{outputs:c.outputs,volt:c.voltage,amperage:c.amperage,maxRecipeEUt:c.power,energyCapacity:c.energyCapacity,startEnergy:0,tier:DEFS.recipeTier(c.power),slots:Object.assign({},d.slots,c.slots),fluidInputTanks:c.fluidInputTanks,fluidOutputTanks:c.fluidOutputTanks,durationMultiplier:c.durationMultiplier,outputPolicy:null,controlCircuit:false});}
 function plan(m,variant){var p=fixedPlan(m,variant);if(!p)return null;var parts=[],counts={};p.fixed.concat(live(m)?ports(m).map(function(p){return{k:p.k,n:1};}):p.legacy.map(function(k){return{k:k,n:1};})).forEach(function(v){if(!counts[v.k]){counts[v.k]={k:v.k,n:0};parts.push(counts[v.k]);}counts[v.k].n+=v.n;});return Object.assign({},p.raw,{parts:parts});}
 function areaFree(S,m,variant){return !ENTITIES.isGrid(m)||GRID_SPACE.check(S,m,{blueprintId:m.location.blueprintId,excludeUid:m.uid,variant:variant,includeHoles:true}).ok;}
 function fixedMaterial(m,k){k=CONTENT.canonicalKey(k);if(k==='gregtech:gt.blockmachines@90'||/^gregtech:gt.blockmachines@9[1-9]$/.test(k))return true;if(/^gregtech:gt.blockmachines@/.test(k)||spec(k))return false;var p=STRUCTURES.profile(m);return !(p.upgradableMaterialKeys||[]).includes(k)&&!(p.upgradableMaterialPrefixes||[]).some(function(prefix){return k.indexOf(prefix)===0;});}
 function fillFixed(S,m,variant){
  return build(S,m,Object.assign({},variant||{},{fixedOnly:true}),function(k){return fixedMaterial(m,k);});
 }
 function assemble(S,m,variant){return build(S,m,variant);}
 function build(S,m,variant,freeBlock){lockSize(m);var requested=variant||{};if(dimensions(m).some(function(f){return Object.prototype.hasOwnProperty.call(requested,f.key)&&requested[f.key]!==m.structureSize[f.key];}))return{ok:false,code:'SIZE_LOCKED'};variant=variantFor(m,variant);var fixedOnly=variant.fixedOnly===true;var upgradeGroups=STRUCTURES.profile(m).upgrades||[];if(upgradeGroups.some(function(g){var value=variant[g.field];return value!=null&&(!Number.isInteger(value)||value<0||value>=g.options.length);} ))return{ok:false,code:'PROFILE'};if(live(m)&&!fixedOnly&&upgradeGroups.some(function(g){return Object.prototype.hasOwnProperty.call(requested,g.field)&&requested[g.field]!== (m.structure.variant[g.field]||0);} ))return{ok:false,code:'UPGRADE_REQUIRED'};delete variant.fixedOnly;if(fixedOnly&&live(m))(STRUCTURES.profile(m).fields||[]).forEach(function(k){if(['width','depth','height'].includes(k))return;if(Object.prototype.hasOwnProperty.call(m.structure.variant,k))variant[k]=m.structure.variant[k];else delete variant[k];});if(fixedOnly&&!live(m))variant.emptyPorts=true;if(!areaFree(S,m,variant))return{ok:false,code:'OCCUPIED'};
  var p=plan(m,variant);if(!p)return{ok:false,code:'PROFILE'};var before=m.structure&&m.structure.installedParts||[],priorFixed=live(m)?TX.clone(m.structure.fixedParts):[],nextFixed=fixedPlan(m,variant).fixed;if(fixedOnly){nextFixed=nextFixed.filter(function(p){return fixedMaterial(m,p.k);}).concat(priorFixed.filter(function(p){return !fixedMaterial(m,p.k);}));p.parts=p.parts.filter(function(p){return fixedMaterial(m,p.k);}).concat(before.filter(function(p){return !fixedMaterial(m,p.k);}));}var delta={};p.parts.forEach(function(v){delta[v.k]=(delta[v.k]||0)+v.n;});before.forEach(function(v){delta[v.k]=(delta[v.k]||0)-v.n;});var take=[],give=[];Object.keys(delta).forEach(function(k){if(delta[k]>0)take.push({k:k,n:delta[k]});if(delta[k]<0)give.push({k:k,n:-delta[k]});});
  if(live(m)&&!fixedOnly&&root.STRUCTURE_UPGRADES){var upgradeKeys=new Set(upgradeGroups.flatMap(STRUCTURE_UPGRADES.keys));if(take.concat(give).some(function(p){return upgradeKeys.has(CONTENT.canonicalKey(p.k));}))return{ok:false,code:'UPGRADE_REQUIRED'};}
  take=STRUCTURE_CORE.constructionCost(S,take,freeBlock);
  var shortGap=[];
  if(take.length){
   var supply=COMMANDS.availableCosts(S,take);
   shortGap=supply.missing;take=supply.paid;
   if(shortGap.length&&(!fixedOnly||!take.length))return{ok:false,code:'MATERIAL',gaps:shortGap};
  }
  var result=COMMANDS.exchange(S,take,give,{drops:true});if(!result.ok)return Object.assign(result,{gaps:take});
  if(shortGap.length){
    if(!live(m))initializeEmpty(m);
    var acc={};take.forEach(function(p){var k=CONTENT.canonicalKey(p.k);acc[k]=(acc[k]||0)+p.n;});
    give.forEach(function(p){var item=m.structure.fixedParts.find(function(v){return CONTENT.canonicalKey(v.k)===p.k;});if(item)item.n-=p.n;});
    Object.keys(acc).forEach(function(k){var item=m.structure.fixedParts.find(function(v){return CONTENT.canonicalKey(v.k)===k;});if(item)item.n+=acc[k];else m.structure.fixedParts.push({k:k,n:acc[k]});});
    m.structure.fixedParts=STRUCTURE_CORE.counts(m.structure.fixedParts);validate(m);
    m.structure.formed=false;invalidate(m);
    return {ok:false,code:'PARTIAL',gaps:shortGap,taken:acc};
  }
  if(live(m)){m.structure.variant=TX.clone(variant);m.structure.fixedParts=nextFixed;m.structure.wallHoles=[];delete m.structure.casingGaps;invalidate(m);}
  else{var old={ins:TX.clone(m.ins||[]),outs:TX.clone(m.outs||[]),tanksIn:TX.clone(m.tanksIn||[]),tanksOut:TX.clone(m.tanksOut||[]),eu:m.eu||0,circ:m.circ,circuitConfigured:m.circuitConfigured},split=fixedPlan(m,variant);m.structure={schema:2,materialSchema:1,profile:base(m).structureProfile,variant:TX.clone(variant),fixedParts:fixedOnly?nextFixed:split.fixed,ports:[],portSeq:0,inputSeparation:true,nextInput:0,dirty:true};distribute(m,fixedOnly?[]:split.legacy);bind(m);fillLegacy(m,old);}
  validate(m);return Object.assign(result,{ok:true});
 }
 function hasContents(p){var s=spec(p.k);return(p.items||[]).some(Boolean)||(p.tanks||[]).some(function(t){return t&&t.mb>0;})||!!(s.hasExtraContents&&s.hasExtraContents(p));}
 function extraContents(m){return ports(m).filter(function(p){return !!spec(p.k).aux;}).flatMap(function(p){return (p.items||[]).filter(Boolean);});}
 function replaceCoil(S,m,coil){return STRUCTURE_UPGRADES.commit(S,m,'coil',coil);}
 function canSetPort(m,id,k,S){var face=live(m)&&faces(m).find(function(f){return f.id===id;});if(!face)return false;var old=at(m,id),s=k&&spec(k);if(!k)return !old||!hasContents(old)||!!S;if(hole(m,face.x,face.y)||!allowedFace(m,id,k)||S&&!portFree(S,m,id))return false;
  var max=STRUCTURES.profile(m).maxPorts;
  if(!old&&max!=null&&ports(m).length>=max)return false;
  if(old&&hasContents(old)){var prev=spec(old.k);if(prev.type!==s.type||prev.canReplace&&!prev.canReplace(old,k)||(old.items||[]).slice(s.slots).some(Boolean)||(old.tanks||[]).slice(tankCaps(s).length).some(function(t){return t&&t.mb>0;})||(old.tanks||[]).some(function(t){return t&&t.mb>s.capacity;}))return false;}
  if(old&&(HATCH_RULES.takesPower(spec(old.k))||spec(old.k).type==='feedthrough')&&(HATCH_RULES.takesPower(s)||s.type==='feedthrough')&&(old.eu||0)>s.energyCapacity)return false;
  if(!limits(m,ports(m).filter(function(p){return p!==old;}).concat([{k:k,face:id}])))return false;
  return true;
 }
 function detachFace(S,m,id){if(!S||!root.PIPE_CONNECTIONS||!ENTITIES.isGrid(m))return;var f=BLUEPRINTS.view(S.fx,S.fx.blueprints.find(function(b){return b.id===m.location.blueprintId;})),v=worldFace(m,id),cell=v.x+','+v.y,sides=shape(m).room?[v.side,(v.side+2)%4]:[v.side];sides.forEach(function(side){var near=PIPE_CONNECTIONS.near(cell,side),op=(side+2)%4;['item','fluid','wire'].forEach(function(kind){var node=f[kind][near];if(node&&typeof node==='object')node.connections=PIPE_CONNECTIONS.mask(f,kind,near)&~(1<<op);});});}
 function portStores(p){var stores=[],s=spec(p.k);if(p.items)stores.push(ITEM_STORES.view(p.uid+':items',p.items,p.items));return stores.concat(s.itemStores?s.itemStores(p):[]);}
 // Displaced-wall bookkeeping is obsolete; physical material counts stay unchanged.
 function normalizeCasings(S,m){
  if(!live(m)||m.structure.materialSchema===1)return;
  var body=m.structure,gaps=body.casingGaps||{},oldHoles=new Set();
  Object.keys(gaps).forEach(function(id){oldHoles.add(id.split(',').slice(0,2).join(','));});
  body.wallHoles=(body.wallHoles||[]).filter(function(cell){return !oldHoles.has(cell);});
  delete body.casingGaps;body.materialSchema=1;invalidate(m);
 }
 function setPort(S,m,id,k,receipt){
  if(!canSetPort(m,id,k,S))return false;
  var old=at(m,id);
  var recovery=old&&!k?ITEM_STORES.recoveryPlan(function(){return portStores(old);}):null;
  if(!S&&recovery&&recovery.items.length)return false;
  var release=function(){if(recovery)recovery.release();};
  var returned=S?COMMANDS.returnGroups(S,[{items:recovery?recovery.items:[],ground:true}],{valid:recovery&&recovery.valid,release:release}):{ok:true};
  if(!returned.ok)return false;if(!S)release();if(receipt)Object.assign(receipt,returned);
  if(old&&!k){var oldSpec=spec(old.k);if(oldSpec.detached)oldSpec.detached(S,m,old);}
  if(!old||!k||spec(old.k).type!==spec(k).type)detachFace(S,m,id);if(old){if(k){var previous=spec(old.k);old.k=CONTENT.canonicalKey(k);var s=spec(k);if(previous.type!==s.type)old.eu=0;if(s.slots){if(!old.items)old.items=[];while(old.items.length<s.slots)old.items.push(null);old.items.length=s.slots;}if(s.capacity){array(old,s.fluidIn?'tanksIn':'tanksOut');old.tanks.length=tankCaps(s).length;}if(s.type==='feedthrough'){old.flow=old.flow==='out'?'out':'in';old.amps=Math.min(s.amperage,old.amps==null?s.amperage:old.amps);}}else m.structure.ports=m.structure.ports.filter(function(p){return p!==old;});}else if(k){var p=makePort(m,id,k);if(spec(k).type==='energy'&&m.structure.retiredEU){p.eu=m.structure.retiredEU;delete m.structure.retiredEU;}m.structure.ports.push(p);}if(root.STRUCTURE_UPGRADES)STRUCTURE_UPGRADES.changed(m,'接口部件已更换');else{invalidate(m);validate(m);}if(k&&!old&&S&&S.fx.autoConnect)connectPort(S,m,id,spec(k).type==='feedthrough');return true;}
 function setCircuit(m,uid,n){var p=byUid(m,uid);if(!p||!spec(p.k).itemIn||!Number.isInteger(n)||n< -1||n>24)return{ok:false,code:'CIRCUIT'};p.circ=n<0?0:n;p.circuitConfigured=n>=0;delete p.configurationItem;delete p.configurationItems;if(base(m).largeBoiler&&members(m,'ins')[0]===p){m.circ=p.circ;m.circuitConfigured=p.circuitConfigured;}return{ok:true};}
 function allowsFluid(m,p,f,direction){var rule=STRUCTURES.profile(m)?.fluidPortAccepts;return !rule||rule(p.face,f,direction);}
 function setLock(m,uid,f){f=CONTENT.canonicalFluid(f);var p=byUid(m,uid),s=p&&spec(p.k);if(!s||!s.fluidOut||f&&!allowsFluid(m,p,f,'output')||f&&!CONTENT.data.fluids.some(function(q){return q.id===f;}))return{ok:false,code:'FLUID'};if(f&&p.tanks&&p.tanks[0]&&p.tanks[0].f!==f)return{ok:false,code:'CONTENTS'};p.lockedFluid=f||null;return{ok:true};}
 function hasClearableTanks(s){
  return !!(s&&s.capacity&&(s.fluidIn||s.fluidOut)&&!s.me&&!s.outputFluidBuffer);
 }
 function clearPortFluid(m,uid,index){
  var p=byUid(m,uid),s=p&&spec(p.k);
  if(!hasClearableTanks(s)||!Number.isInteger(index)||index<0||index>=(s.fluidSlots||1)||!(p.tanks?.[index]?.mb>0))return false;
  p.tanks[index]=null;
  return true;
 }
 function fluidOutput(m,additions,voidExcess){
  var list=members(m,'tanksOut'),next=TX.clone(m.tanksOut),fraction=0,buffers=new Map();
  list.forEach(function(p){var s=spec(p.k);if(s.outputFluidBuffer)buffers.set(p,TX.clone(s.outputFluidBuffer(p)));});
  for(var r of additions){var left=r.mb;if(!Number.isSafeInteger(left)||left<=0)return null;var order=list.map(function(p,i){return i;}).sort(function(a,b){return(list[a].lockedFluid?0:1)-(list[b].lockedFluid?0:1);});
   if(base(m).layeredOutputs){var layer=shape(m).h-2-(r.slot==null?fraction:r.slot);fraction++;order=order.filter(function(i){return +list[i].face.split(',')[1]===layer;});}
   for(var i of order){var p=list[i],s=spec(p.k),buffer=buffers.get(p);if(p.lockedFluid&&p.lockedFluid!==r.f||!allowsFluid(m,p,r.f,'output'))continue;
    if(buffer){var used=buffer.reduce(function(n,t){return n+(t?t.mb:0);},0),put=Math.min(left,Math.max(0,s.capacity-used));if(put){var existing=buffer.find(function(t){return t&&t.f===r.f;});if(existing)existing.mb+=put;else buffer.push({f:r.f,mb:put});left-=put;}}
    else{var t=next[i];if(t&&t.f!==r.f)continue;var n=Math.min(left,Math.max(0,s.capacity-(t?t.mb:0)));if(n){next[i]={f:r.f,mb:(t?t.mb:0)+n};left-=n;}}
    if(!left)break;
   }if(left&&!voidExcess)return null;
  }
  if(buffers.size)Object.defineProperty(next,'portBuffers',{value:Array.from(buffers,function(pair){return{port:pair[0],fluids:pair[1].filter(Boolean)};})});return next;
 }
 function commitFluidOutput(m,plan){m.tanksOut=plan;(plan.portBuffers||[]).forEach(function(p){spec(p.port.k).commitOutputFluids(p.port,p.fluids);});}

 var emptyControllerCircuit=Object.freeze({circ:0,circuitConfigured:false});
 function supportsControllerCircuit(m){var d=root.MACHINE_MODES?MACHINE_MODES.definition(m,base(m)):base(m);return !!(managed(m)&&!d.generator&&d.behavior!=='boiler'&&d.behavior!=='large_boiler'&&(d.controllerCircuit==null?CONTENT.hasCircuitInput(d.recipeMap):d.controllerCircuit));}
 function controllerCircuit(m){return m.controllerCircuit||emptyControllerCircuit;}
 function setControllerCircuit(m,n){if(!supportsControllerCircuit(m)||!Number.isInteger(n)||n< -1||n>24)return{ok:false,code:'CIRCUIT'};m.controllerCircuit={circ:n<0?0:n,circuitConfigured:n>=0};return{ok:true};}
 function groups(m){
  if(!live(m))return[];var list=members(m,'ins'),controller=controllerCircuit(m),shared=supportsControllerCircuit(m)&&controller.circuitConfigured?[controller.circ]:[];
  function circuits(buses){return Array.from(new Set(shared.concat(buses.filter(function(p){return p.circuitConfigured;}).map(function(p){return p.circ;}))));}
  if(!list.length||STRUCTURES.instance(m).inputPolicy||m.structure.inputSeparation===false&&!STRUCTURES.instance(m).inputIsolationFixed)return[{uid:null,items:m.ins,circuits:circuits(list)}];
  return list.map(function(p){return{uid:p.uid,items:p.items,circuits:circuits([p])};});
 }
 function input(m,uid){return groups(m).find(function(g){return g.uid===uid;})||{uid:null,items:[],circuits:[]};}
 function commitInput(m,uid,values){if(uid){var p=byUid(m,uid);if(!p)throw Error('Missing input bus');p.items=values;}else m.ins=values;}
 function glassTier(m){var definition=STRUCTURES.instance(m)||(m&&m.def);var id=definition&&definition.id,profile=definition&&definition.structureProfile;if(id!=='biovat'&&profile!=='biovat')return null;var v=m&&m.structure&&m.structure.variant||{};var idx=Math.max(0,Math.min(5,v.glass|0));return root.GD&&GD.glassTierOf?GD.glassTierOf('bartworks:BW_GlasBlocks@'+idx):null;}
 function startNext(processor,m,world){
  var definition=STRUCTURES.instance(m);
  if(definition.requiresStructure&&!m.structure.formed){m.status={code:'STRUCTURE',text:m.structure.errors[0]||'结构未完成'};return false;}
  var modeFailure=root.MACHINE_MODES&&MACHINE_MODES.ready(m);
  if(modeFailure){m.status=modeFailure;return false;}
  var attempt=processor.retry&&processor.retry.begin(m,definition,world);
  if(attempt===false)return false;
  var glassLimit=glassTier(m),list=groups(m);
  if(!list.length)list=[{uid:null,items:[],circuits:[]}];
  var offset=(m.structure.nextInput||0)%list.length,best=null;
  for(var n=0;n<list.length;n++){
   var group=list[(n+offset)%list.length],recipes=root.PROCESSING_ACCESS&&PROCESSING_ACCESS.candidates(m,definition,group,world);
   if(recipes===undefined)recipes=CONTENT.processingCandidates(definition.recipeMap,group.items,m.tanksIn);
   for(var r of recipes){
    if(glassLimit!==null&&(r.eut||0)>DEFS.voltOf(glassLimit)){
     if(processor.retry)processor.retry.observed(attempt,{code:'GLASS_TIER'});
     if(!best)best={code:'GLASS_TIER',text:'玻璃等级不足'};
     continue;
    }
    var checked=processor.check(m,r,world,{inputGroup:group.uid});
    if(processor.retry)processor.retry.observed(attempt,checked);
    if(checked.ok&&processor.start(m,r,world,{inputGroup:group.uid})){
     m.structure.nextInput=(n+offset+1)%list.length;
     if(processor.retry)processor.retry.forget(m);
     return true;
    }
    if(!best||checked.code!=='ITEM_INPUT'&&checked.code!=='FLUID_INPUT')best=checked;
   }
  }
  m.status=best||{code:'WAITING_INPUT',text:'等待原料'};
  if(processor.retry)processor.retry.failed(m,attempt,m.status);
  return false;
 }
 function portAt(m,x,y,side){if(!live(m))return null;var q=localFace(m,x,y,side);return at(m,q.id)||(shape(m).room?ports(m).find(function(p){var f=p.face.split(',').map(Number);return spec(p.k).type==='feedthrough'&&f[0]===q.x&&f[1]===q.y&&(f[2]+2)%4===q.side;}):null);}
 function accepts(m,x,y,side,kind){if(hole(m,localPoint(m,x-m.x,y-m.y).x,localPoint(m,x-m.x,y-m.y).y))return false;var p=portAt(m,x,y,side),s=p&&spec(p.k);return !!(s&&(kind==='wire'?HATCH_RULES.takesPower(s)||s.type==='dynamo'||s.type==='feedthrough':kind==='item'?s.itemIn||s.itemOut||s.aux&&root.AUX_INVENTORIES&&AUX_INVENTORIES.inputSlots(s.aux)>0:s.fluidOut||s.fluidIn&&s.externalFluidIn!==false));}
 function builtinView(m,x,y,side){
  var view=Object.create(m);view.x=x;view.y=y;view._owner=m;view._builtinSide=side;view._portDef=STRUCTURES.instance(m);
  ['ins','outs','tanksIn','tanksOut','eu','_lastOutputBatch','_lastFluidBatch'].forEach(function(field){Object.defineProperty(view,field,{get:function(){return m[field];},set:function(value){m[field]=value;}});});
  var profile=STRUCTURES.profile(m),surface=root.SURFACE_IO&&SURFACE_IO.supported(m);if(surface)SURFACE_IO.decorate(m,view,x,y,side);else if(profile&&profile.autoOutput)view.outFace=side;
  Object.defineProperty(view,'autoItems',{get:function(){return profile&&profile.autoOutput?profile.autoOutput(m,x,y,side,'item'):(surface?view._surfaceFace===m.outputSurface:side===m.outFace)&&!!m.autoItems;}});
  Object.defineProperty(view,'autoFluids',{get:function(){return profile&&profile.autoOutput?profile.autoOutput(m,x,y,side,'fluid'):(surface?view._surfaceFace===m.outputSurface:side===m.outFace)&&!!m.autoFluids;}});
  Object.defineProperty(view,'covers',{get:function(){var out={},c=surface?SURFACE_IO.cover(m,view._surfaceFace):m.covers&&m.covers[side];if(c)out[side]=c;return out;}});
  return view;
 }
 function endpoint(m,x,y,side,kind){var custom=STRUCTURES.profile(m);if(custom&&custom.endpoint){var result=custom.endpoint(m,x,y,side,kind,builtinView);if(result!==undefined)return result;}if(!managed(m)){if(base(m).manualLogistics)return null;var sh=shape(m),profile=STRUCTURES.profile(m);if(profile&&profile.endpoint)return profile.endpoint(m,x,y,side,kind,builtinView);return sh&&sh.builtinFaces?faces(m).some(function(f){var p=worldFace(m,f);return p.x===x&&p.y===y&&p.side===side;})?builtinView(m,x,y,side):null:m;}if(!live(m))return null;var p=portAt(m,x,y,side),s=p&&spec(p.k);if(!p||!accepts(m,x,y,side,kind))return null;return proxy(m,p);}
 function proxy(m,p){var s=spec(p.k),f0=worldFace(m,p.face),f=[f0.dx,f0.dy,f0.side],d={key:p.k,cat:'multiblock_port',behavior:base(m).behavior,generator:false,recipeMap:base(m).recipeMap,autoFluidPeriodTicks:base(m).portFluidPeriodTicks,tier:s.tier,volt:s.voltage,amperage:s.amperage,energyCapacity:s.energyCapacity,startEnergy:0,inputTankFluids:s.steam?[["steam","ic2steam"]]:null,slots:{in:s.itemIn?s.slots:0,out:s.itemOut?s.slots:0},fluidInputPolicy:s.fluidInputPolicy,fluidInputTanks:s.fluidIn?tankCaps(s):[],fluidOutputTanks:s.fluidOut?tankCaps(s):[],canAutoFluidOutput:true};
  if(s.type==='dynamo'){d.generator=true;d.minimumOutputEnergy=s.minimumOutputEnergy;d.outputDrain=s.voltage+Math.pow(2,Math.max(s.tier-1,0));d.behavior='multiblock_dynamo';d.fuelFamily='external';}
  if(s.type==='feedthrough')d.amperage=Math.max(0,Math.min(s.amperage,p.amps==null?s.amperage:p.amps));
  var v={uid:p.uid,k:m.k,x:m.x+f[0],y:m.y+f[1],location:m.location,_owner:m,_port:p,_portDef:d,_side:f[2],autoItems:s.itemOut,autoFluids:s.fluidOut,covers:{},outFace:f[2],allowInputFromOutputSide:true},empty=[];
  [['ins',s.itemIn,'items'],['outs',s.itemOut,'items'],['tanksIn',s.fluidIn,'tanks'],['tanksOut',s.fluidOut,'tanks']].forEach(function(entry){Object.defineProperty(v,entry[0],{enumerable:true,get:function(){return entry[1]?p[entry[2]]:empty;}});});
  Object.defineProperty(v,'completedBatches',{enumerable:true,get:function(){return m.completedBatches;}});
  if(s.type==='feedthrough'){v._powerRelay=true;v._powerIn=p.flow==='out'?(f[2]+2)%4:f[2];v._powerOut=(v._powerIn+2)%4;v.outFace=v._powerOut;}
  Object.defineProperty(v,'eu',{get:function(){return p.eu||0;},set:function(n){p.eu=n;}});['_lastOutputBatch','_lastFluidBatch'].forEach(function(k){Object.defineProperty(v,k,{get:function(){return p[k];},set:function(n){p[k]=n;}});});return v;
 }
 var networkLists=new WeakMap();
 function networkMachines(f,kind){
  var epoch=root.BLUEPRINTS&&BLUEPRINTS.networkEpoch(f),cache=epoch&&networkLists.get(epoch),key=kind||'all';
  if(cache&&cache.has(key))return cache.get(key).slice();
  var list=enumerateNetworkMachines(f,kind);
  if(epoch){if(!cache)networkLists.set(epoch,cache=new Map());cache.set(key,list);}
  return list.slice();
 }
 // The synchronous simulation step fixes membership; resource getters above
 // still read their owners after a transfer replaces an inventory array.
 function enumerateNetworkMachines(f,kind){
  var list=[];
  (f.machines||[]).forEach(function(m){
   var profile=STRUCTURES.profile(m);
   if(profile&&profile.networkViews){list.push.apply(list,profile.networkViews(m,builtinView));return;}
   if(managed(m)){
    if(live(m))ports(m).forEach(function(p){
     var s=spec(p.k);
     if(kind==='power'&&!(s.energyCapacity>0||s.type==='dynamo'||s.type==='feedthrough'))return;
     var point=p.face.split(',').map(Number);
     if(!hole(m,point[0],point[1]))list.push(proxy(m,p));
    });
   }else if(!base(m)||!base(m).manualLogistics){
    var sh=shape(m);
    if(sh&&sh.builtinFaces){faces(m).forEach(function(p){var w=worldFace(m,p);list.push(builtinView(m,w.x,w.y,w.side));});}
    else list.push(m);
   }
  });
  return list;
 }
 var boardIndexes=new WeakMap(), footprints=new WeakMap();
 function footprint(m){
  var s=shape(m),p=s&&STRUCTURES.profile(m),visual=p&&p.visualPattern;
  var pattern=typeof visual==='function'?visual(m):visual,holes=m.structure&&m.structure.wallHoles;
  var patternKey=pattern&&pattern.join('|'),holesKey=holes&&holes.join('|'),r=turn(m);
  var prior=footprints.get(m);
  if(prior&&prior.x===m.x&&prior.y===m.y&&prior.rotation===r&&prior.w===(s&&s.w)&&prior.h===(s&&s.h)&&prior.room===(s&&s.room)&&prior.pattern===patternKey&&prior.holes===holesKey)return prior;
  var occupied=cells(m),coordinates=occupied.map(function(c){return c.x+','+c.y;});
  var value={machine:m,x:m.x,y:m.y,rotation:r,w:s&&s.w,h:s&&s.h,room:s&&s.room,pattern:patternKey,holes:holesKey,cells:occupied,coordinates:coordinates};
  footprints.set(m,value);return value;
 }
 function index(f){
  var board=root.BLUEPRINTS?BLUEPRINTS.boardSource(f):f,epoch=root.BLUEPRINTS&&BLUEPRINTS.networkEpoch(f),prior=boardIndexes.get(board);
  // Each simulation step owns a short-lived view with fixed membership.
  if(epoch&&prior&&prior.epoch===epoch)return prior.index;
  var machines=f.machines||[],entries=[],same=!!prior;
  for(var m of machines)if(ENTITIES.isGrid(m)){
   var entry=footprint(m);
   if(same&&prior.entries[entries.length]!==entry)same=false;
   entries.push(entry);
  }
  if(same&&entries.length===prior.entries.length){prior.epoch=epoch;return prior.index;}
  var idx={};
  for(var entry of entries)for(var coordinate of entry.coordinates)idx[coordinate]=entry.machine;
  boardIndexes.set(board,{epoch:epoch,entries:entries,index:idx});return idx;
 }
 function powerBoard(f){return f;}
 function feedKey(k){var s=spec(k);return !!s&&s.type==='feedthrough';}
 function setFeed(m,uid,flow,amps){var p=byUid(m,uid),s=p&&spec(p.k);if(!s||s.type!=='feedthrough'||!['in','out'].includes(flow)||!Number.isInteger(amps)||amps<0||amps>s.amperage)return{ok:false,code:'FEED'};p.flow=flow;p.amps=amps;return{ok:true};}
 function wallTarget(S,x,y,k){if(!feedKey(k))return null;var m=(S.fx.machines||[]).find(function(m){return live(m)&&shape(m).room&&ENTITIES.isGrid(m)&&m.location.blueprintId===S.fx.activeBlueprintId&&(occupies(m,x,y)||hole(m,localPoint(m,x-m.x,y-m.y).x,localPoint(m,x-m.x,y-m.y).y));});if(!m)return null;var local=localFace(m,x,y,0),f=faces(m).find(function(f){return f.x===local.x&&f.y===local.y&&canSetPort(m,f.id,k,S)&&!at(m,f.id);});return f?{m:m,face:f.id}:null;}
 function placeFeed(S,x,y,k,source){var to=wallTarget(S,x,y,k),i=source&&source.bagIndex,item=Number.isInteger(i)&&S.inv[i];if(!to)return{ok:false,code:'WALL'};if(!item||item.entityUid||CONTENT.canonicalKey(item.k)!==CONTENT.canonicalKey(k)||item.n<1)return{ok:false,code:'INPUT'};var moved=ITEM_TRANSFER.move(S,{type:'bag',index:i},{type:'structurePort',uid:to.m.uid,face:to.face},{n:1,swap:false});if(!moved.ok)return moved;
  return{ok:true};}
 function portFree(S,m,id){var q=id.split(',').map(Number);if(!hole(m,q[0],q[1]))return true;var b=S.fx.blueprints.find(function(b){return b.id===m.location.blueprintId;}),f=BLUEPRINTS.view(S.fx,b),world=worldFace(m,id),x=world.x,y=world.y,k=x+','+y;return !BLUEPRINTS.gridLayers().some(function(layer){return f[layer]&&f[layer][k];})&&!f.machines.some(function(v){return v!==m&&ENTITIES.isGrid(v)&&occupies(v,x,y);});}
 function connectPort(S,m,id,feed){var w=worldFace(m,id),q=[w.dx,w.dy,w.side],b=S.fx.blueprints.find(function(b){return b.id===m.location.blueprintId;}),f=BLUEPRINTS.view(S.fx,b),cell=(m.x+q[0])+','+(m.y+q[1]);(feed?[q[2],(q[2]+2)%4]:[q[2]]).forEach(function(d){var near=PIPE_CONNECTIONS.near(cell,d);['wire','item','fluid'].forEach(function(kind){if(f[kind][near]&&PIPE_CONNECTIONS.target(f,kind,near,(d+2)%4))f[kind][near].connections=PIPE_CONNECTIONS.mask(f,kind,near)|(1<<((d+2)%4));});});}
 function feedStatus(S,m,p){var w=worldFace(m,p.face),q=[w.dx,w.dy,w.side],b=S.fx.blueprints.find(function(b){return b.id===m.location.blueprintId;}),f=BLUEPRINTS.view(S.fx,b),cell=(m.x+q[0])+','+(m.y+q[1]);function connected(d){var near=PIPE_CONNECTIONS.near(cell,d);if(f.wire[near])return PIPE_CONNECTIONS.connected(f,'wire',near,(d+2)%4);var xy=near.split(',').map(Number),other=index(f)[near];if(!other)return false;var v=endpoint(other,xy[0],xy[1],(d+2)%4,'wire');return !!v;}
  return{outer:connected(q[2]),inner:connected((q[2]+2)%4),input:p._powerIO&&p._powerIO.input||0,output:p._powerIO&&p._powerIO.output||0};}
 function roomFor(m,S){if(!S||!S.fx||!ENTITIES.isGrid(m))return null;return S.fx.machines.find(function(c){if(c===m||!managed(c)||!shape(c).room||!live(c)||!c.structure.formed||!ENTITIES.isGrid(c)||c.location.blueprintId!==m.location.blueprintId)return false;var s=bounds(c),ms=bounds(m)||{w:1,h:1};return m.x>c.x&&m.y>c.y&&m.x+ms.w<c.x+s.w&&m.y+ms.h<c.y+s.h;})||null;}
 function roomHole(S,x,y){return(S.fx.machines||[]).find(function(m){return live(m)&&shape(m).room&&ENTITIES.isGrid(m)&&m.location.blueprintId===S.fx.activeBlueprintId&&hole(m,localPoint(m,x-m.x,y-m.y).x,localPoint(m,x-m.x,y-m.y).y);})||null;}
 function removeWall(S,m,x,y){var s=shape(m),local=localPoint(m,x-m.x,y-m.y),dx=local.x,dy=local.y;if(!live(m)||!s.room||dx===s.cx&&dy===s.cy||!occupies(m,x,y))return{ok:false,code:'WALL'};var port=ports(m).find(function(p){var q=p.face.split(',').map(Number);return q[0]===dx&&q[1]===dy;});if(port){var returned=COMMANDS.returnItems(S,[{k:port.k,n:1}],{drops:true});if(returned.ok&&!setPort(S,m,port.face,null))throw Error('Cannot remove cleanroom hatch');return returned;}var k='gregtech:gt.blockreinforced@2',part=m.structure.fixedParts.find(function(p){return p.k===k&&p.n>0;});if(!port&&!part)return{ok:false,code:'INPUT'};var result=COMMANDS.returnItems(S,[{k:k,n:1}],{drops:true});if(!result.ok)return result;if(port)m.structure.ports=m.structure.ports.filter(function(p){return p!==port;});else part.n--;if(!m.structure.wallHoles)m.structure.wallHoles=[];m.structure.wallHoles.push(dx+','+dy);faces(m).filter(function(f){return f.x===dx&&f.y===dy;}).forEach(function(f){detachFace(S,m,f.id);});m.cleanliness=0;invalidate(m);validate(m);return result;}
 function repairWall(S,m,x,y,source){if(!roomHole(S,x,y))return{ok:false,code:'WALL'};return placeCasing(S,x,y,'gregtech:gt.blockreinforced@2',source);}
 function migrate(S){
  if(!S.fx)return;
  BLUEPRINTS.ensure(S);
  S.fx.machines.forEach(function(m){
   lockSize(m);upgrade(m);STRUCTURE_STATE.migrate(m);normalizeCasings(S,m);
   if(base(m)&&base(m).structureProfile==='cleanroom'&&m.structureSize){
    delete m.structureSize.height;if(m.structure&&m.structure.variant)delete m.structure.variant.height;
   }
  });
  restore(S);
 }
 function pruneInstalled(S){
  (S.fx&&S.fx.machines||[]).forEach(function(m){
   if(!live(m))return;
   var kept=[],seen=new Set(),hasPlan=!!fixedPlan(m,m.structure.variant||{});
   ports(m).forEach(function(p){
    if(seen.has(p.face)||!physicalFace(m,p.face,spec(p.k))||hasPlan&&!limits(m,kept.concat([p])))return;
    seen.add(p.face);kept.push(p);
   });
   m.structure.ports=kept;invalidate(m);validate(m);
  });
 }
 function restore(S){
  (S.fx&&S.fx.machines||[]).forEach(function(m){if(live(m)){ports(m).forEach(function(p){var s=spec(p.k);if(s&&s.capacity)array(p,s.fluidIn?'tanksIn':'tanksOut');});bind(m);invalidate(m);validate(m);}});
 }
 GD.extraMachineDefinitions.push({key:'gregtech:gt.blockreinforced@2',behavior:'structure_wall',placementRepairOnly:true,energyCapacity:0,slots:{in:0,out:0},fluidInputTanks:[],fluidOutputTanks:[]});
 // 扩展钩子：核心不认具体扩展模块，扩展启动时自己注册
var glassTierOf=glassTier;
root.MULTIBLOCKS={glassTier:function(m){return glassTierOf(m);},registerShape:registerShape,turn:turn,bounds:bounds,point:point,localPoint:localPoint,worldFace:worldFace,localFace:localFace,supportsControllerCircuit:supportsControllerCircuit,controllerCircuit:controllerCircuit,setControllerCircuit:setControllerCircuit,detachFace:detachFace,connectPort:connectPort,initializeEmpty:initializeEmpty,registerShape:function(id,shape){shapes[id]=shape;},registerPort:function(k,spec){catalog=null;extraSpecs[k]=Object.assign({k:k,tier:0,voltage:0,amperage:0,energyCapacity:0,slots:0,capacity:0},spec);},allowedFace:allowedFace,portOptions:portOptions,dimensions:dimensions,placementSize:placementSize,dimensionsOf:dimensionsOf,lockSize:lockSize,managed:managed,live:live,shape:shape,cells:cells,occupies:occupies,faces:faces,spec:spec,tankCaps:tankCaps,ports:ports,at:at,byUid:byUid,members:members,locate:locate,bind:bind,invalidate:invalidate,upgrade:upgrade,validate:validate,instance:instance,plan:plan,assemble:assemble,areaFree:areaFree,required:required,materialCount:materialCount,canSetPort:canSetPort,setPort:setPort,portStores:portStores,normalizeCasings:normalizeCasings,hasContents:hasContents,extraContents:extraContents,replaceCoil:replaceCoil,setCircuit:setCircuit,setLock:setLock,hasClearableTanks:hasClearableTanks,clearPortFluid:clearPortFluid,allowsFluid:allowsFluid,fluidOutput:fluidOutput,commitFluidOutput:commitFluidOutput,groups:groups,input:input,commitInput:commitInput,startNext:startNext,accepts:accepts,endpoint:endpoint,proxy:proxy,networkMachines:networkMachines,index:index,footprint:footprint,powerBoard:powerBoard,fixedMaterial:fixedMaterial,fillFixed:fillFixed,casingCapacity:casingCapacity,casingRepair:casingRepair,restoreCasing:restoreCasing,reconcileCasings:reconcileCasings,casingItem:casingItem,casingTarget:casingTarget,placeCasing:placeCasing,feedKey:feedKey,setFeed:setFeed,wallTarget:wallTarget,placeFeed:placeFeed,feedStatus:feedStatus,roomFor:roomFor,roomHole:roomHole,removeWall:removeWall,repairWall:repairWall,restore:restore,pruneInstalled:pruneInstalled,migrate:migrate};
})(typeof window!=='undefined'?window:globalThis);

ITEM_STORES.registerEntity('multiblock',function(S,m){
 var s=m.structure;if(!s)return;var views=[];
 if(MULTIBLOCKS.live(m)){
  views.push(ITEM_STORES.view(m.uid+':fixed',s.fixedParts,s.fixedParts,{recover:false}));
  views.push(ITEM_STORES.view(m.uid+':ports',null,s.ports.map(function(p){return{k:p.k,n:1};}),{recover:false}));
  s.ports.forEach(function(p){views.push.apply(views,MULTIBLOCKS.portStores(p));});
 }else if(s.installedParts)views.push(ITEM_STORES.view(m.uid+':installed',s.installedParts,s.installedParts,{recover:false}));
 if(s.recoveryItems)views.push(ITEM_STORES.view(m.uid+':recovery',s.recoveryItems,s.recoveryItems));
 return {replaceSlots:MULTIBLOCKS.live(m),views:views};
});
