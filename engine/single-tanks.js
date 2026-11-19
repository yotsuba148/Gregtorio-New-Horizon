(function(root){
 'use strict';
 var tanks=[['BuildCraft|Factory:tankBlock@0',16000],['irontank:copperTank@0',27000],['irontank:ironTank@0',32000],['irontank:silverTank@0',43000],['irontank:goldTank@0',48000],['irontank:diamondTank@0',64000],['irontank:obsidianTank@0',64000],['irontank:emeraldTank@0',96000],['irontank:stainlesssteelTank@0',128000],['irontank:titaniumTank@0',256000],['irontank:tungstensteelTank@0',512000]];
 tanks.forEach(function(row,i){var k=row[0],cap=row[1],item=CONTENT.item(k);if(!item)return;var name=GD.items[k]||item.name,id='single_fluid_tank_'+i,slots={in:0,out:0,fluid:cap};
  GD.extraMachineDefinitions.push({key:k,cat:id,cn:name,entityName:name,tag:'储罐',tier:0,volt:0,behavior:'fluid_storage',recipeMap:'none:storage',slots:slots,sharedFluidStorage:true,fluidColumn:'buildcraft_tank',tankFront:'modicons/tanks/'+(i?k.split(':')[1].split('@')[0]:'tankBlock'),fluidInputTanks:[cap],fluidOutputTanks:[],energyCapacity:0,startEnergy:0,amperage:0,autoItems:false,autoFluids:false,defaultAutoFluids:false,canAutoFluidOutput:false,hideFluidOutput:true,noFaceSettings:true,allFluidInputs:true,runSwitch:false,controlCircuit:false});
  GD.machines.cats.push({id:id,cn:name,slots:slots,tiers:[{t:0,k:k,name:name,tag:'储罐'}]});
 });DEFS.rebuild();
 function board(S,m){var f=S&&S.fx;if(!f)return null;if(!f.blueprints)return f;var b=f.blueprints.find(function(b){return m.location&&m.location.blueprintId===b.id;});return b?BLUEPRINTS.view(f,b):null;}
 function family(N,m){var d=m&&N.instance(m);return d&&d.fluidColumn;}
 function linked(N,a,b){var side=a.y<b.y?2:0;return TRANSPORT_PORTS.coverAllows(a,side,'fluid','export')&&TRANSPORT_PORTS.coverAllows(a,side,'fluid','import')&&TRANSPORT_PORTS.coverAllows(b,(side+2)%4,'fluid','export')&&TRANSPORT_PORTS.coverAllows(b,(side+2)%4,'fluid','import');}
 function column(N,f,m,fluid,idx){
  idx=idx||N.grid(f);var all=[m],a=m,b,type=family(N,m);if(!type)return all;
  while((b=idx[a.x+','+(a.y+1)])&&family(N,b)===type&&linked(N,a,b)){all.push(b);a=b;}
  a=m;while((b=idx[a.x+','+(a.y-1)])&&family(N,b)===type&&linked(N,a,b)){all.push(b);a=b;}
  all.sort(function(a,b){return b.y-a.y;});if(!fluid){var own=m.tanksIn&&m.tanksIn[0],first=all.find(function(n){return n.tanksIn&&n.tanksIn[0];});fluid=own?own.f:first?first.tanksIn[0].f:null;}
  function compatible(n){var t=n.tanksIn&&n.tanksIn[0];return(!t||!fluid||t.f===fluid)&&(!n.lockedFluid||!fluid||n.lockedFluid===fluid);}
  if(!compatible(m))return[m];var at=all.indexOf(m),start=at,end=at;while(start>0&&compatible(all[start-1]))start--;while(end+1<all.length&&compatible(all[end+1]))end++;return all.slice(start,end+1);
 }
 function handler(N,f,m,fluid,idx){var group=column(N,f,m,fluid,idx);return{parts:group.map(function(n){return TRANSPORT_PORTS.machineFluid(N,n,'input');}),identity:group[0].tanksIn,forFluid:function(fluid){return handler(N,f,m,fluid,idx);}};}
 function balance(c){var N=c.network,done=new Set();(c.board.machines||[]).forEach(function(m){if(!ENTITIES.isGrid(m)||!family(N,m)||done.has(m))return;var group=column(N,c.board,m,null,c.index),first=group.find(function(n){return n.tanksIn[0];});group.forEach(function(n){done.add(n);});if(!first)return;var fluid=first.tanksIn[0].f,left=group.reduce(function(n,m){return n+(m.tanksIn[0]?m.tanksIn[0].mb:0);},0);
   group.forEach(function(m,i){var n=i===group.length-1?left:Math.min(left,N.instance(m).fluidInputTanks[0]);m.tanksIn[0]=n?{f:fluid,mb:n}:null;left-=n;});
  });}
 TRANSPORT_PORTS.register({
  resolve:function(c){var m=c.index[c.cell];if(c.kind!=='fluid'||!m||!family(c.network,m))return undefined;if(!(c.direction==='import'?c.network.inputSide(m,c.side,'fluid'):TRANSPORT_PORTS.coverAllows(m,c.side,'fluid','export')))return null;return handler(c.network,c.board,m,c.payload,c.index);},
  manual:function(c){if(!family(c.network,c.machine))return undefined;var f=board(c.state,c.machine);return f?handler(c.network,f,c.machine):undefined;},prepare:balance
 });
 root.SINGLE_TANKS={keys:tanks.map(function(row){return row[0];}).filter(function(k){return !!DEFS.of(k);}),column:column,board:board,handler:handler};
})(typeof window!=='undefined'?window:globalThis);
