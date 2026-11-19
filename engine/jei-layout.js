(function(root){
 'use strict';
 function grid(count,x,y,cols){var a=[];for(var i=0;i<count;i++)a.push([x+i%cols*18,y+Math.floor(i/cols)*18]);return a;}
 function itemPositions(count,out){if(!count)return[];var cols=count===4?2:Math.min(count,3),x=out?106:count===1?52:count===2||count===4?34:16,y=count<=3?24:count<=6?15:6;return grid(count,x,y,cols);}
 function fluidPositions(count,out){return grid(count,out?106:Math.max(70-count*18,16),62,Math.min(count,3)||1);}
 function plan(entry){var r=entry.recipe,raw=GD.jeiLayouts?.maps[r.map],circuits=(r.req||[]).filter(function(p){return p.circuit!=null;}),items=circuits.map(function(p){return{type:'circuit',p:p};}).concat((r.in||[]).map(function(p,i){return{type:'item',p:p,id:'in:'+i};}),(r.req||[]).filter(function(p){return p.k;}).map(function(p,i){return{type:'item',p:p,id:'in:'+((r.in||[]).length+i)};})),outputs=(r.out||[]).map(function(p,i){return{type:'item',p:p,id:'out:'+i};}),fin=(r.fin||[]).map(function(p){return{type:'fluid',p:p};}),fout=(r.fout||[]).map(function(p){return{type:'fluid',p:p};});
  var actual=[items.length,outputs.length,fin.length,fout.length],caps=actual.map(function(n,i){return Math.max(n,raw?.maxIO[i]||0);}),front=raw?.frontend||'RecipeMapFrontend',positions;
  if(front==='LargeNEIFrontend'||(!['DistillationTowerFrontend','FluidOnlyFrontend'].includes(front)&&(Math.max(caps[0],caps[1])>9||Math.max(caps[2],caps[3])>3))||(!raw&&Math.max.apply(null,caps)>6)){var rows=Math.ceil(Math.max(caps[0],caps[1])/3);positions=[grid(caps[0],16,8,3),grid(caps[1],106,8,3),grid(caps[2],16,8+rows*18,3),grid(caps[3],106,8+rows*18,3)];}
  else if(front==='FluidOnlyFrontend')positions=[itemPositions(caps[0],false),itemPositions(caps[1],true),itemPositions(caps[2],false),itemPositions(caps[3],true)];
  else positions=[itemPositions(caps[0],false),itemPositions(caps[1],true),fluidPositions(caps[2],false),fluidPositions(caps[3],true)];
  if(front==='DistillationTowerFrontend'){positions[1]=grid(caps[1],106,62,1);positions[3]=Array.from({length:caps[3]},function(_,i){i++;return[106+i%3*18,62-Math.floor(i/3)*18];});}
  var all=positions.flat(),yMin=all.length?Math.min.apply(null,all.map(function(p){return p[1];})):0,yMax=all.length?Math.max.apply(null,all.map(function(p){return p[1];})):0,lists=[items,outputs,fin,fout],sides=[[],[]];
  positions.forEach(function(a,kind){var out=kind%2===1;for(var i=0;i<a.length;i++){var content=lists[kind][i],pos=a[i];sides[out?1:0].push(Object.assign({type:kind<2?'item':'fluid',col:(pos[0]-(out?106:16))/18,row:(pos[1]-yMin)/18,slot:i,group:kind<2?'item':'fluid'},content||{empty:true}));}});
  return{left:sides[0],right:sides[1],rows:(yMax-yMin)/18+1,frontend:front,source:raw?'native':'inferred',caps:caps};
 }
 root.JEI_LAYOUT={plan:plan,itemPositions:itemPositions,fluidPositions:fluidPositions};
})(typeof window!=='undefined'?window:globalThis);
