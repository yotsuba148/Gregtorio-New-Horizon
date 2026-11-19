(function(root){
 'use strict';
 var CORE=STRUCTURE_CORE,clone=GTTransactions.clone,types={};
 function type(m){return types[m.k];}
 function size(m){MULTIBLOCKS.lockSize(m);return m.structureSize;}
 function capacity(m){var s=size(m);return s.width*s.width*s.height*type(m).unit;}
 function candidates(m){var s=size(m),a=[];for(var x=1;x<s.width-1;x++){a.push(x+',0,0');a.push(x+','+(s.height-1)+',2');}for(var y=1;y<s.height-1;y++){a.push('0,'+y+',3');a.push((s.width-1)+','+y+',1');}return a;}
 function defaultValve(m){return '0,'+(size(m).height-2)+',3';}
 function ensure(m){if(!m.rcTank){var id=defaultValve(m);m.rcTank={schema:2,valves:[id],holes:[],modes:{}};m.rcTank.modes[id]='input';}var r=m.rcTank;if(!r.modes)r.modes={};r.valves.forEach(function(id){if(!['input','output','both'].includes(r.modes[id]))r.modes[id]='both';});r.schema=2;return r;}
 function mode(m,id){return ensure(m).modes[id];}
 function setMode(m,id,value){if(!['input','output','both'].includes(value)||!ensure(m).valves.includes(id))return{ok:false,code:'MODE'};m.rcTank.modes[id]=value;return{ok:true};}
 function ledger(m){return m.structure&&m.structure.installedParts||[];}
 function amount(parts,k){k=CONTENT.canonicalKey(k);return parts.reduce(function(n,p){return n+(CONTENT.canonicalKey(p.k)===k?p.n:0);},0);}
 function adjust(parts,k,n){return CORE.counts(parts.filter(function(p){return CONTENT.canonicalKey(p.k)!==CONTENT.canonicalKey(k);}).concat([{k:k,n:amount(parts,k)+n}]));}
 function plan(m){var s=size(m),t=type(m),r=ensure(m),shell=s.width*s.width*s.height-(s.width-2)*(s.width-2)*(s.height-2),windows=(s.width-2)*(s.height-2);return {parts:CORE.counts([{k:t.wall,n:shell-windows-r.valves.length},{k:t.gauge,n:windows},{k:m.k,n:r.valves.length-1}]),power:0,fluidInputTanks:[capacity(m)],fluidOutputTanks:[]};}
 function structure(m,parts){m.structure={profile:DEFS.of(m.k).structureProfile,variant:clone(size(m)),installedParts:parts,formed:false};validate(m);}
 function validate(m){if(!m.structure)return false;var r=ensure(m);m.structure.formed=!r.holes.length&&!CORE.missing(ledger(m),plan(m).parts).length;return m.structure.formed;}
 function refreshConnections(S,m,ids,added){ids.forEach(function(id){MULTIBLOCKS.detachFace(S,m,id);});if(S.fx.autoConnect&&m.structure&&m.structure.formed)(added||[]).forEach(function(id){MULTIBLOCKS.connectPort(S,m,id,false);});}
 function assemble(S,m,v){return build(S,m,v);}
 function fillFixed(S,m,v){
  var t=type(m);return build(S,m,v,function(k){return k===t.wall||k===t.gauge;});
 }
 function build(S,m,v,freeBlock){if(v&&Object.keys(size(m)).some(function(k){return v[k]!=null&&v[k]!==size(m)[k];}))return{ok:false,code:'SIZE_LOCKED'};var p=plan(m),r=CORE.exchange(S,ledger(m),p.parts,freeBlock);if(!r.ok)return r;var rct=ensure(m),join=!rct.hasBuilt&&rct.connectOnBuild;rct.holes=[];rct.hasBuilt=true;delete rct.connectOnBuild;structure(m,p.parts);if(join)rct.valves.forEach(function(id){MULTIBLOCKS.connectPort(S,m,id,false);});return r;}
 function disassemble(S,m){var r=COMMANDS.returnItems(S,ledger(m),{drops:true});if(!r.ok)return r;var ids=ensure(m).valves.slice();delete m.rcTank;ensure(m);m.structure=null;m.tanksIn=[null];ids.forEach(function(id){MULTIBLOCKS.detachFace(S,m,id);});return r;}
 function valve(S,m,op,id,target){
  if(!ENTITIES.isGrid(m)||!type(m))return{ok:false,code:'LOCATION'};var r=ensure(m),valid=candidates(m);if(!valid.includes(id))return{ok:false,code:'FACE'};
  var index=r.valves.indexOf(id),before=ledger(m),after=clone(before),wall=type(m).wall,next=clone(r),result;
  if(op==='install'){if(index>=0)return{ok:false,code:'OCCUPIED'};next.valves.push(id);next.modes[id]='input';after=adjust(after,m.k,1);if(!next.holes.includes(id)&&amount(after,wall)>0)after=adjust(after,wall,-1);next.holes=next.holes.filter(function(f){return f!==id;});}
  else if(op==='remove'){if(index<0)return{ok:false,code:'FACE'};if(r.valves.length===1)return{ok:false,code:'LAST_VALVE'};next.valves.splice(index,1);delete next.modes[id];next.holes.push(id);after=adjust(after,m.k,-1);}
  else if(op==='move'){if(index<0||!valid.includes(target))return{ok:false,code:'FACE'};if(r.valves.includes(target))return{ok:false,code:'OCCUPIED'};next.valves[index]=target;next.modes[target]=next.modes[id];delete next.modes[id];if(next.holes.includes(target))next.holes=next.holes.filter(function(f){return f!==target;}).concat([id]);}
  else return{ok:false,code:'COMMAND'};
  result=CORE.exchange(S,before,after);if(!result.ok)return result;m.rcTank=next;structure(m,after);refreshConnections(S,m,[id],op==='install'?[id]:[]);return result;
 }
 function instance(m,d){ensure(m);var cap=capacity(m);return Object.assign({},d,{slots:{in:0,out:0,fluid:cap},fluidInputTanks:[cap],fluidOutputTanks:[],fluidOutputRate:5000*ensure(m).valves.length,fluidOutputPerFaceRate:5000,autoFluidPeriodTicks:5});}
 function endpoint(m,x,y,side,kind,make){var id=MULTIBLOCKS.localFace(m,x,y,side).id;if(kind!=='fluid'||!(m.structure&&m.structure.formed)||!ensure(m).valves.includes(id))return null;var v=make(m,x,y,side),value=mode(m,id);v.allowInputFromOutputSide=true;v._inputKinds=value==='output'?[]:['fluid'];v._outputKinds=value==='input'?[]:['fluid'];return v;}
 [false,true].forEach(function(steel){
  var meta=steel?13:0,t={wall:'Railcraft:machine.beta@'+meta,gauge:'Railcraft:machine.beta@'+(meta+1),valve:'Railcraft:machine.beta@'+(meta+2),unit:steel?32000:16000,steel:steel},id=steel?'rcsteelTank':'rcironTank',name='RC'+(steel?'钢质':'铁质')+'储罐';types[t.valve]=t;
  GD.extraMachineDefinitions.push({key:t.valve,cat:id,cn:name,entityName:name,windowWidth:440,tag:'RC多方块',tier:0,volt:0,behavior:'fluid_storage',slots:{in:0,out:0,fluid:36*t.unit},fluidInputTanks:[36*t.unit],fluidOutputTanks:[],energyCapacity:0,startEnergy:0,amperage:0,sharedFluidStorage:true,resetOnDismantle:true,runSwitch:false,autoItems:false,autoFluids:true,defaultAutoFluids:true,fluidOutputRate:5000,autoFluidPeriodTicks:5,multiblock:true,requiresStructure:true,structureProfile:id,noFaceSettings:true,controlCircuit:false});
  GD.machines.cats.push({id:id,cn:name,slots:{in:0,out:0,fluid:36*t.unit},tiers:[{t:0,k:t.valve,name:name,tag:'RC多方块'}]});
  STRUCTURES.register({id:id,key:t.valve,name:name,fields:[],anchor:function(m){var p=ensure(m).valves[0].split(',').map(Number);return{x:p[0],y:p[1]};},dimensions:[{key:'width',label:'底边长',min:3,max:9,step:2,initial:3,choices:[3,5,7,9].map(function(w){return[w,w+' × '+w];})},{key:'height',label:'高度',min:4,max:8,initial:4}],plan:plan,assemble:assemble,fillFixed:fillFixed,disassemble:disassemble,instance:instance,onDeploy:function(S,m){ensure(m).connectOnBuild=S.fx.autoConnect===true;},endpoint:endpoint,networkViews:function(m,make){if(!(m.structure&&m.structure.formed))return[];return ensure(m).valves.map(function(id){var f=MULTIBLOCKS.worldFace(m,id);return endpoint(m,f.x,f.y,f.side,'fluid',make);});},autoOutput:function(m,x,y,side,kind){var id=MULTIBLOCKS.localFace(m,x,y,side).id;return kind==='fluid'&&!!m.autoFluids&&!!(m.structure&&m.structure.formed)&&ensure(m).valves.includes(id)&&mode(m,id)!=='input';}});
  MULTIBLOCKS.registerShape(id,{builtin:true,builtinFaces:true,w:3,h:4,cx:0,cy:2,resize:function(v){return{w:v.width||3,h:v.height||4,cx:0,cy:(v.height||4)-2};}});
 });
 root.RC_TANKS={type:type,size:size,capacity:capacity,ensure:ensure,mode:mode,setMode:setMode,plan:plan,validate:validate,valve:valve,candidates:candidates,amount:amount};DEFS.rebuild();
})(typeof window!=='undefined'?window:globalThis);
