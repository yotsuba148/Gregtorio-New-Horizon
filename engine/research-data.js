(function(root){
 'use strict';
 var sessions=new WeakMap(),pending=new WeakMap(),receivers=new WeakMap(),C=CONTENT,K=function(n){return 'gregtech:gt.blockmachines@'+n;};
 function stable(v){return v&&typeof v==='object'?Array.isArray(v)?'['+v.map(stable).join(',')+']':'{'+Object.keys(v).sort().map(function(k){return JSON.stringify(k)+':'+stable(v[k]);}).join(',')+'}':JSON.stringify(v);}
 function outputId(out){return stable({id:out.id,damage:out.Damage||0,tag:out.tag||null});}
 var nativeOutputs=new Map();C.recipes(ASSEMBLY_LINES.researchMap,true).forEach(function(r){var out=ASSEMBLY_LINES.outputTag(r);if(!out)return;var key=outputId(out),list=nativeOutputs.get(key)||new Set();list.add(r.out[0].k);nativeOutputs.set(key,list);});
 // Research identifiers are data, never material inventories or AE orders.
 function channels(S){var value=sessions.get(S);if(!value){value=new Map();sessions.set(S,value);}return value;}
 function publish(S,id,channel,values,valid){var all=channels(S);all.delete(id);if(channel>0)all.set(id,{channel:channel,values:new Set(values),expires:(ENGINE.tick||0)+40,valid:valid});}
 function receive(S,channel){var values=new Set();if(!S||!(channel>0))return values;for(var source of channels(S).values())if(source.channel===channel&&(ENGINE.tick||0)<=source.expires&&source.valid())source.values.forEach(function(v){values.add(v);});return values;}
 function readPort(S,p){var channel=p.dataChannel||0,now=ENGINE.tick||0,cache=receivers.get(p);if(!cache||cache.channel!==channel){cache={channel:channel,expires:now+40};receivers.set(p,cache);if(p.receivedData&&p.receivedData.channel!==channel)delete p.receivedData;}
  var fresh=false,expires=0,values=new Set();for(var source of channels(S).values())if(channel>0&&source.channel===channel&&now<=source.expires&&source.valid()){fresh=true;expires=Math.max(expires,source.expires);source.values.forEach(function(v){values.add(v);});}
  if(fresh){p.receivedData={channel:channel,values:Array.from(values)};cache.expires=expires;return values;}
  if(p.receivedData&&now<=cache.expires)return new Set(p.receivedData.values);delete p.receivedData;return new Set();
 }
 function values(stacks){var outputs=new Set();(stacks||[]).forEach(function(s){var i=s&&C.item(s.k);if(i&&i.assemblyOutput)outputs.add(i.assemblyOutput);else if(ASSEMBLY_LINES.stick(s)){var tag=i.nbt&&SNBT.parse(i.nbt);if(!tag||!tag.output)return;var found=nativeOutputs.get(outputId(tag.output));if(found)found.forEach(function(k){outputs.add(k);});}});return outputs;}
 function local(m,S){var out=values([m.installedItems&&m.installedItems.researchData]);MULTIBLOCKS.ports(m).forEach(function(p){var spec=MULTIBLOCKS.spec(p.k);if(spec.type!=='data')return;var entries=spec.dataReceiver?readPort(S,p):values(p.items);entries.forEach(function(v){out.add(v);});});return out;}
 function setting(m,p,S){var spec=MULTIBLOCKS.spec(p.k),n=p.dataChannel||0,count=spec.dataReceiver?readPort(S,p).size:0;return '<label class="mb-data-channel">频道 <input type="number" min="0" max="2147483647" step="1" data-mb-setting="dataChannel" data-mb-setting-port="'+p.uid+'" value="'+n+'"></label><p class="dim">'+(n?spec.dataReceiver?'已接收 '+count+' 项研究数据':'频道 '+n:'未连接')+'</p>';}
 function configure(p,field,value){if(field!=='dataChannel'||!Number.isSafeInteger(value)||value<0||value>2147483647)return{ok:false,code:'CHANNEL',text:'频道需要是0至2147483647的整数'};p.dataChannel=value;return{ok:true};}
 MULTIBLOCKS.registerPort(K(15442),{type:'data',dataReceiver:true,uiHtml:setting,configure:configure});
 MULTIBLOCKS.registerPort(K(15443),{type:'dataOut',dataEmitter:true,uiHtml:setting,configure:configure});
 var al=STRUCTURES.profiles.assemblyline;
 al.filterCandidates=function(m,recipes,world){var available=local(m,world&&world.state||ENGINE.state);return available.size?recipes.filter(function(r){return available.has(r.out[0].k);}):recipes;};
 al.prepareRecipe=function(m,r,context){return local(m,context.world&&context.world.state||ENGINE.state).has(r.out[0].k)?r:{ok:false,code:'RESEARCH',text:'需要这项配方的研究闪存'};};
 var casing0='tectech:gt.blockcasingsTT@0',casing1='tectech:gt.blockcasingsTT@1',casing2='tectech:gt.blockcasingsTT@2';
 STRUCTURES.add('databank',GD.items[K(15313)]||'数据库',15313,'idle:databank',function(){return{parts:[{k:casing0,n:7},{k:casing1,n:18},{k:casing2,n:18},{k:K(90),n:1}]};},{behavior:'research_bank',structureFields:[],windowWidth:740,compactMultiblock:true,slots:{in:0,out:0,fluid:0},fluidInputTanks:[],fluidOutputTanks:[],controllerCircuit:false,runSwitch:true});
 var profile=STRUCTURES.profiles.databank;profile.fields=[];MULTIBLOCKS.registerShape('databank',{w:5,h:3,cx:2,cy:1});profile.visualPattern=['baaab','baCab','baaab'];profile.controllerIcon='modicons/assembly-lines/15313.png';
 profile.materialKey=function(m,c){return c.dx===0||c.dx===4?casing2:c.dy===0?casing0:casing1;};profile.casingKeys=function(){return[casing0,casing1];};
 profile.portBacking=function(m,s){return s.type==='energy'?casing0:casing1;};
 profile.allowedFace=function(m,f,s){return s.type==='energy'||s.type==='data'||s.type==='dataOut';};
 profile.limits=function(m,list){return list.filter(function(p){return MULTIBLOCKS.spec(p.k).type==='energy';}).length<=7&&list.filter(function(p){return MULTIBLOCKS.spec(p.k).type!=='energy';}).length<=15;};
 profile.portRequirements={data:{min:1,label:'数据访问仓或装配线数据库接口'},dataOut:1};
 function queued(S){var queue=pending.get(S);if(!queue){queue=new Map();pending.set(S,queue);(S.fx.machines||[]).forEach(function(m){var outputs=MULTIBLOCKS.ports(m).filter(function(p){return MULTIBLOCKS.spec(p.k).dataEmitter&&Array.isArray(p.dataPacket);});if(outputs.length)queue.set(m.uid,{machine:m,outputs:outputs});});}return queue;}
 function transport(S,tick){var queue=queued(S);if(tick%20!==4||!queue.size)return false;queue.forEach(function(entry){var m=entry.machine;if(ENTITIES.get(S,m.uid)!==m||!ENTITIES.active(m))return;entry.outputs.filter(function(p){return MULTIBLOCKS.byUid(m,p.uid)===p&&MULTIBLOCKS.spec(p.k).dataEmitter;}).forEach(function(p){var channel=p.dataChannel||0;publish(S,p.uid,channel,p.dataPacket||[],function(){return ENTITIES.get(S,m.uid)===m&&ENTITIES.active(m)&&MULTIBLOCKS.byUid(m,p.uid)===p&&(p.dataChannel||0)===channel;});delete p.dataPacket;});});queue.clear();return true;}
 function tick(m,context){var S=context.state,list=MULTIBLOCKS.ports(m),ins=list.filter(function(p){return MULTIBLOCKS.spec(p.k).type==='data';}),outs=list.filter(function(p){return MULTIBLOCKS.spec(p.k).dataEmitter;});
  if(!MULTIBLOCKS.live(m)||!m.structure.formed){m.status={code:'STRUCTURE',text:'结构不完整'};return false;}
  if(!m.job){if(!MACHINE_CONTROL.allowed(m,context.definition))return false;var slave=ins.some(function(p){return MULTIBLOCKS.spec(p.k).dataReceiver;}),cost=DEFS.voltOf(slave?6:4)*(1+ins.length*outs.length);
   m.job={recipeId:'databank:broadcast',recipe:{id:'databank:broadcast',eut:cost,in:[],out:[],fin:[],fout:[],req:[],conditions:{}},durationTicks:20,progressTicks:0,EUt:cost,inputs:[],fluidInputs:[],outputs:[],fluidOutputs:[]};
  }
  if(m.eu<m.job.EUt){m.status={code:'ENERGY',text:'电量不足'};return false;}m.eu-=m.job.EUt;m.job.progressTicks=GAME_TIME.advance(S,m.job.progressTicks,m.job.durationTicks,1);m.status={code:'RUNNING',text:'提供研究数据'};
  if(m.job.progressTicks>=m.job.durationTicks){var queue=queued(S),payload=Array.from(local(m,S));outs.forEach(function(p){p.dataPacket=payload.slice();});queue.set(m.uid,{machine:m,outputs:outs.slice()});m.job=null;}
  return true;
 }
 ENGINE.registerBehavior('research_bank',{batchProcessing:false,personalStorage:false,tick:tick,signature:function(m){return m.job&&m.job.progressTicks;},status:function(m,d,make){if(m.status&&m.status.code==='RUNNING')return make('running',m,'提供研究数据');}});
 SIMULATION.registerAfterMachines('research-data',transport);
 root.RESEARCH_DATA={values:values,local:local,receive:receive,readPort:readPort,publish:publish,transport:transport};
})(typeof window!=='undefined'?window:globalThis);
