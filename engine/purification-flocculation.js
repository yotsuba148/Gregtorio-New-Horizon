(function(root){
 'use strict';
 var P=INDUSTRIAL_PROCESSING,block=P.block;
 var chemical='polyaluminiumchloride',waste='flocculationwasteliquid',dose=100000;
 var water='grade2purifiedwater',glass='gregtech:gt.blocktintedglass@0';
 var reinforced=block(9,5),plant=block(9,4),filter=block(3,11);
 var unit=PURIFICATION_UNITS.register({
  id:'purificationflocculation',meta:9405,map:'gt.recipe.purificationplantflocculation',
  pattern:[' sssCsss ',' srrrrrs ',' graaarg ',' graaarg ',' graaarg ',' srrrrrs ','psssssssp','pp     pp'],
  materials:[[block(9,6),65],[plant,30],[reinforced,16],['gregtech:gt.blockframes@319',12],[filter,9],[glass,6]],
  art:{p:plant,r:reinforced,a:filter,g:glass},voltage:DEFS.voltOf(7),maintenance:false,
  definition:{compactMultiblock:true,largerPortMap:true},
  defaultPorts:[51,51,61,61,81],minCasing:56,
  portRequirements:{fluidIn:{min:1,max:3},fluidOut:{min:1,max:3},itemOut:1},
  acceptsFluid:function(m,f){return f===water||f===chemical;},
  prepare:function(m,recipe){
   var amount=m.tanksIn.reduce(function(sum,t){return sum+(t&&t.f===chemical?t.mb:0);},0);
   var levels=Math.floor(amount/dose);
   return Object.assign({},recipe,{
    fin:amount?recipe.fin.concat({f:chemical,mb:amount}):recipe.fin,
    fout:levels?recipe.fout.concat({f:waste,mb:levels*dose}):recipe.fout
   });
  },
  result:function(recipe,outputs,seed,baseChance){
   var reagent=recipe.fin.find(function(f){return f.f===chemical;});
   var amount=reagent?reagent.mb:0,levels=Math.floor(amount/dose);
   var chance=Math.min(100,baseChance+10*levels)*Math.pow(2,-10*(amount%dose)/dose);
   return seed%10000<chance*100?outputs:outputs.filter(function(f){return f.f===waste;});
  }
 });
 unit.portFace=function(x,y,dir){
  if(unit.visualPattern[y][x]!=='s')return false;
  var nx=x+[0,1,0,-1][dir],ny=y+[-1,0,1,0][dir];
  return !unit.visualPattern[ny]||!unit.visualPattern[ny][nx]||unit.visualPattern[ny][nx]===' ';
 };
 unit.portHint='每批加入 900,000 mB 聚氯化铝可保证成功。把三级净化水和絮凝废液锁给不同的输出仓。';
 DEFS.rebuild();
})(typeof window!=='undefined'?window:globalThis);
