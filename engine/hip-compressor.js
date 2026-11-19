(function(root){
 'use strict';
 var P=INDUSTRIAL_PROCESSING,block=P.block;
 var pipe=block(10,5),cold=block(10,9),hot=block(10,10),thermal=new WeakMap();
 var layout=[' cccccc hhhhhh ',' c    c h    h ',' c   ppppp   h ',' c  sssssss  h ',
  ' c  skpppks  h ',' c  bkpgpkb  h ','sss bkpgpkb sss','ggg bkpgpkb ggg','ggg skpppks ggg','sss sssCsss sss'];
 var profile=P.install({
  id:'hipcompressor',meta:3006,map:'gt.recipe.compressor',
  pattern:layout,
  materials:[[block(10,4),125],[pipe,63],[cold,12],[hot,12],[P.glassKeys[0],22],[HEATING_COILS.at(0).key,30]],
  art:{p:pipe,b:pipe,c:cold,h:hot,g:function(m){return P.glassKeys[P.grade(m,'glass')];},
   k:function(m){return HEATING_COILS.at(P.grade(m,'coil')).key;}},
  upgrades:[P.glass(22),STRUCTURE_UPGRADES.coil(30)],minCasing:95,defaultPorts:[71,81,51],
  portRequirements:{energy:1,itemIn:1,itemOut:1,fluidIn:1},
  allowed:function(m,f,s){
   if(s.steamComponent)return false;
   var tile=layout[f.y][f.x];
   return tile==='b'?['itemIn','itemOut','fluidIn'].includes(s.type):
    tile==='s'&&s.type==='energy';
  },
  definition:{runSwitch:true,inputIsolationFixed:false,compactMultiblock:true,largerPortMap:true,
   uiPanels:['hip_temperature'],batchProcessing:{maxSize:128},
   environmentCapabilities:{lowGravity:true,compressionTier:1}},
  capability:function(m,c){
   var tier=Math.max(1,DEFS.recipeTier(c.inputVoltage));
   var timing={tier:tier,maxRecipeEUt:c.power,powerMultiplier:m.hipOverheated?1.1:.75,
    durationMultiplier:m.hipOverheated?2.5:1/3.5};
   c.definition={
    recipeParallelLimit:function(recipe){
     var cost=DEFS.effective(timing,recipe).EUt;
     var limit=Math.min(tier*(m.hipOverheated?1:4),cost?Math.floor(c.power/cost):Infinity);
     return m.job?Math.max(limit,m.job.parallel):limit;
    },
    powerMultiplier:timing.powerMultiplier
   };
   c.durationMultiplier=timing.durationMultiplier;
  }
 });
 profile.portFace=function(x,y,dir){
  if(!['s','b'].includes(layout[y][x]))return false;
  var nx=x+[0,1,0,-1][dir],ny=y+[-1,0,1,0][dir];
  return !layout[ny]||!layout[ny][nx]||layout[ny][nx]===' ';
 };
 profile.portHint='能源仓装在压缩机外壳，输入和输出装在管道外壳。';
 profile.checkRecipe=function(m,r,job){
  if(!job&&m.hipOverheated&&r.conditions?.compressionTier===1)return P.error('HEAT','压机过热，等温度降到 0%');
  return null;
 };
 profile.passiveTick=function(m,context){
  if(context.tick%20!==0||!MULTIBLOCKS.live(m))return;
  var spent=m.energySpent||0,prior=thermal.get(m)??spent;
  thermal.set(m,spent);
  var running=spent>prior&&m.enabled!==false;
  var heat=m.hipHeat||0;
  if(!heat&&!running)return;
  var cooling=m.hipCooling||0;
  m.hipHeat=Math.min(100,Math.max(0,heat+(running?5*Math.pow(.9,P.grade(m,'coil')):-2-cooling)));
  m.hipCooling=running||!m.hipHeat?0:cooling+2;
  var overheated=m.hipHeat>=100||m.hipHeat>0&&!!m.hipOverheated;
  if(overheated!==!!m.hipOverheated){
   m.hipOverheated=overheated;
   m.hipCooling=0;
   MULTIBLOCKS.invalidate(m);
  }
 };
 RESOURCE_UI.registerPanel('hip_temperature',function(host,m){
  var readout=document.createElement('span');
  host.append('压机温度 ',readout);
  host._refresh=function(){
   var text=(m.hipHeat||0).toFixed(0)+'%'+(m.hipOverheated?' · 冷却中':'');
   if(readout.textContent!==text)readout.textContent=text;
  };
  host._refresh();
 });
 DEFS.rebuild();
})(typeof window!=='undefined'?window:globalThis);
