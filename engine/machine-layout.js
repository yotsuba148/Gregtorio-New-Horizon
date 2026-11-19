(function(root){
 'use strict';
 function grid(n,x,y,cols){return Array.from({length:n},function(_,i){return[x+i%cols*18,y+Math.floor(i/cols)*18];});}
 function items(n,out){var cols=n===4?2:Math.min(n,3)||1;return grid(n,out?106:n===1?52:n===2||n===4?34:16,n<=3?24:n<=6?15:6,cols);}
 function plan(d){
  var hook=root.ENGINE&&ENGINE.behaviors?ENGINE.behaviors[d.behavior]:null;
  if(hook&&hook.layout){var custom=hook.layout(d,{grid:grid,items:items});if(custom)return custom;}

  if(d.containerProcessing)return{cells:[{kind:'in',index:0,x:16,y:10},{kind:'out',index:0,x:106,y:10},{kind:'fin',index:0,x:62,y:10,w:18,h:54}],circuit:null,progress:null,width:132,height:72};
    var counts=[d.slots.in,d.slots.out,(d.fluidInputTanks||[]).length,(d.fluidOutputTanks||[]).length],raw=(root.GD.jeiLayouts||{}).maps||{},front=(raw[d.recipeMap]||{}).frontend,positions;
  if(front==='LargeNEIFrontend'||Math.max(counts[0],counts[1])>9||Math.max(counts[2],counts[3])>3){var rows=Math.ceil(Math.max(counts[0],counts[1])/3);positions=[grid(counts[0],16,8,3),grid(counts[1],106,8,3),grid(counts[2],16,8+rows*18,3),grid(counts[3],106,8+rows*18,3)];}
  else if(front==='FluidOnlyFrontend'&&!counts[0]&&!counts[1])positions=[[],[],items(counts[2],false),items(counts[3],true)];
  else positions=[items(counts[0],false),items(counts[1],true),grid(counts[2],Math.max(70-counts[2]*18,16),62,3),grid(counts[3],106,62,3)];
  if(front==='DistillationTowerFrontend'){positions[1]=grid(counts[1],106,62,1);positions[3]=Array.from({length:counts[3]},function(_,i){i++;return[106+i%3*18,62-Math.floor(i/3)*18];});}
  var kinds=['in','out','fin','fout'],cells=[];positions.forEach(function(a,group){a.forEach(function(p,i){cells.push({kind:kinds[group],index:i,x:p[0],y:p[1]});});});
  if(d.generator){cells.forEach(function(c){var p={in:[79,16],out:[79,52],fin:[58,41],fout:[106,52]}[c.kind];c.x=p[0]+c.index*18;c.y=p[1];});}
  var extra=(hook&&hook.adjust)?(hook.adjust(d,cells)||{}):{};
  var shift=Math.max(0,4-Math.min(4,...cells.map(function(c){return c.y;})));cells.forEach(function(c){c.y+=shift;});
  var bottom=Math.max(80,...cells.map(function(c){return c.y+18;})),circuit={x:153,y:62+shift};
  if(cells.some(function(c){return c.x<circuit.x+18&&c.x+18>circuit.x&&c.y<circuit.y+18&&c.y+18>circuit.y;}))circuit.y=bottom+4;
  if(d.controlCircuit!==false)bottom=Math.max(bottom,circuit.y+18);
  return{cells:cells,circuit:d.controlCircuit!==false&&extra.circuit!==false&&!d.generator?circuit:null,progress:extra.progress!==false&&!d.generator?{x:78,y:24+shift}:null,heat:!!extra.heat,width:176,height:bottom+7};
 }
 function frame(p){
  if(p.viewport)return p.viewport;
  var cells=p.cells.slice();
  if(p.circuit)cells.push(p.circuit);
  if(p.progress)cells.push(Object.assign({w:23,h:18},p.progress));
  if(p.heat)cells.push({x:96,y:25,w:10,h:54});
  if(!cells.length)return{left:0,top:0,width:36,height:18};
  var left=Math.max(0,Math.min.apply(null,cells.map(function(c){return c.x;}))-4),top=Math.max(0,Math.min.apply(null,cells.map(function(c){return c.y;}))-4);
  return{left:left,top:top,width:Math.max.apply(null,cells.map(function(c){return c.x+(c.w||18);}))+4-left,height:Math.max.apply(null,cells.map(function(c){return c.y+(c.h||18);}))+4-top};
 }
 function compact(p){
  var q=Object.assign({},p,{cells:p.cells.map(function(c){return Object.assign({},c);}),circuit:p.circuit&&Object.assign({},p.circuit),progress:p.progress&&Object.assign({},p.progress)}),parts=q.cells.concat(q.circuit?[q.circuit]:[],q.progress?[q.progress]:[]),intervals=parts.map(function(c){return[c.y,c.y+(c.h||18)];}).sort(function(a,b){return a[0]-b[0];}),gaps=[],end=intervals.length?intervals[0][1]:0;
  intervals.forEach(function(r){if(r[0]-end>4)gaps.push({at:r[0],size:r[0]-end-4});end=Math.max(end,r[1]);});
  parts.forEach(function(c){var original=c.y;c.y-=gaps.reduce(function(n,g){return n+(original>=g.at?g.size:0);},0);});
  if(q.circuit&&q.cells.length){var all=frame(q),core=frame(Object.assign({},q,{circuit:null})),shift=all.left+all.width/2-core.left-core.width/2;
   if(shift>0)q.cells.forEach(function(c){if(c.y<q.circuit.y+18&&c.y+(c.h||18)>q.circuit.y&&c.x+(c.w||18)<=q.circuit.x)shift=Math.min(shift,Math.max(0,q.circuit.x-c.x-(c.w||18)-3));});
   q.cells.forEach(function(c){c.x+=shift;});if(q.progress)q.progress.x+=shift;q.viewport=all;
  }
  return q;
 }
 root.MACHINE_LAYOUT={plan:plan,frame:frame,compact:compact};
})(typeof window!=='undefined'?window:globalThis);
