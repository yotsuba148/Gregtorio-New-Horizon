/* NEI Custom Diagram 1.7.5: Grid, LayoutHandler and DiagramBuilder. */
(function(root){
 'use strict';
 var G=ORE_GUIDE,C=CONTENT,cache=new Map(),stone=new Set(),furnaces=null;
 var M={macerator:'gt.recipe.macerator',washer:'gt.recipe.orewasher',thermal:'gt.recipe.thermalcentrifuge',bath:'gt.recipe.chemicalbath',centrifuge:'gt.recipe.centrifuge',sifter:'gt.recipe.sifter',separator:'gt.recipe.electromagneticseparator',blast:'gt.recipe.blastfurnace',chemical:'gt.recipe.chemicalreactor',mixer:'gt.recipe.mixer',autoclave:'gt.recipe.autoclave'};
 // Grid centers are 11 + 12*n; each output slot is 18 px, each ore slot 26 px.
 var layouts={
  oreMacerate:{at:[4,7],label:[4,5],map:M.macerator,paths:[[[4,2],[4,7,0,-1]]]},
  rawMacerate:{at:[6,7],label:[6,5],map:M.macerator,paths:[[[6,2],[6,7,0,-1]],[[4,7],[6,7]]],plain:[1]},
  crushedMacerate:{at:[2,14],label:[2,12],map:M.macerator,paths:[[[4,7],[3,7],[3,10],[2,10],[2,14,0,-1]]]},
  wash:{at:[8,10],label:[8,8],map:M.washer,paths:[[[4,7],[8,7],[8,10,0,-1]]]},
  mercury:{at:[0,6],height:3,dir:-1,label:[0,8],map:M.bath,paths:[[[4,7],[3,7],[3,10],[0,10],[0,6,0,1]]]},
  persulfate:{at:[2,6],height:3,dir:-1,label:[2,8],map:M.bath,paths:[[[4,7],[3,7],[3,10],[2,10],[2,6,0,1]]]},
  pureMacerate:{at:[10,14],label:[10,12],map:M.macerator,paths:[[[8,10],[10,10],[10,14,0,-1]]]},
  sift:{at:[10,5],width:3,height:3,dir:-1,label:[10,8],map:M.sifter,paths:[[[8,10],[10,10],[10,5,0,1]]]},
  impureCentrifuge:{at:[0,16],label:[0,14],map:M.centrifuge,paths:[[[2,14],[0,14],[0,16,0,-1]]]},
  pureCentrifuge:{at:[8,16],label:[8,14],map:M.centrifuge,paths:[[[10,14],[8,14],[8,16,0,-1]]]},
  separate:{at:[12,12],height:3,dir:-1,label:[12,14],map:M.separator,paths:[[[10,14],[12,14],[12,12,0,1]]]},
  thermal:{at:[6,14],label:[6,12],map:M.thermal,paths:[[[4,7],[5,7],[5,12],[7,12],[7,10],[8,10]],[[6,12],[6,14,0,-1]]],plain:[0]},
  thermalMacerate:{at:[4,16],label:[4,14],map:M.macerator,paths:[[[6,14],[4,14],[4,16,0,-1]]]}
 };
 function point(p){return{x:11+p[0]*12+(p[2]||0)*9,y:11+p[1]*12+(p[3]||0)*9};}
 function outputs(r){return r.out.map(function(p){return{key:C.canonicalKey(p.k),target:'item',amount:p.n,chance:p.chance==null?10000:p.chance};}).concat(r.fout.map(function(p){return{key:p.f,target:'fluid',amount:p.mb,chance:10000};}));}
 function withoutStone(rows){return rows.filter(function(p){return p.target!=='item'||!stone.has(p.key);});}
 function firstItem(rows){return rows.length&&rows[0].target==='item'?rows[0].key:null;}
 function unique(rows,withFluid){var found=null,signature=null;for(var r of rows){var out=outputs(r),stamp=JSON.stringify(withFluid?[r.fin,out]:out);if(signature!==null&&signature!==stamp)return null;signature=stamp;found={recipe:r,outputs:out};}return found;}
 async function pick(key,map,fluid){if(!key)return null;return unique((await G.recipes(key)).filter(function(r){return r.map===map&&(!fluid||r.fin.length===1&&r.fin[0].f===fluid);}),!!fluid);}
 function group(model,id,rows,recipe,extra){var spec=layouts[id],w=spec.width||1,h=spec.height||2,p=point(spec.at),x=p.x-(w-1)*9,y=p.y+(spec.dir===-1?-(h-1)*18:0);model.groups.push({id:id,x:x,y:y,width:w,height:h,items:rows,recipe:recipe});
  var at=point(spec.label);model.machines.push({x:at.x,y:at.y,map:spec.map,recipe:recipe});
  spec.paths.forEach(function(path,i){model.paths.push({points:path.map(point),arrow:!(spec.plain||[]).includes(i)});});
  if(extra)model.paths.push(extra);
 }
 async function branch(model,id,input,fluid){var result=await pick(input,layouts[id].map,fluid);if(!result)return null;var rows=withoutStone(result.outputs);if(!rows.length)return null;
  if(fluid)rows.unshift({key:fluid,target:'fluid',amount:result.recipe.fin[0].mb,chance:10000});group(model,id,rows,result.recipe);return firstItem(withoutStone(result.outputs));
 }
 function furnaceRecipes(){if(furnaces)return furnaces;furnaces=new Map();C.data.furnace.forEach(function(row,i){var key=C.canonicalKey(C.data.items[row[0]].k);furnaces.set(key,{id:'furnace:'+i,map:'furnace',in:[{k:key,n:1}],out:[{k:C.canonicalKey(C.data.items[row[1]].k),n:row[2]}],fout:[]});});return furnaces;}
 async function build(mat){var m=G.get(mat);if(!m)return null;(C.data.ore.dustStone||[]).forEach(function(i){stone.add(C.canonicalKey(C.data.items[i].k));});
  var model={material:m,width:166,height:232,inputs:[],groups:[],machines:[],paths:[]},ore=m.stages.find(function(s){return s.id==='ore';}),raw=m.stages.find(function(s){return s.id==='rawOre';}),oreKey=ore&&m.k,rawKey=raw&&raw.keys[0];
  if(oreKey)model.inputs.push({key:oreKey,target:'item',x:59,y:35,kind:'ore'});if(rawKey)model.inputs.push({key:rawKey,target:'item',x:83,y:35,kind:'rawOre'});
  var crushed=await branch(model,'oreMacerate',oreKey),rawCrushed=await branch(model,'rawMacerate',rawKey);
  // The shared line is meaningful only when both ores lead into the processing tree.
  if(!crushed&&rawCrushed){model.paths.pop();crushed=rawCrushed;model.paths.push({points:[point([6,7]),point([4,7])],arrow:false});}
  var impure=await branch(model,'crushedMacerate',crushed),purified=await branch(model,'wash',crushed),pure=await branch(model,'pureMacerate',purified);
  var thermalInput=purified||crushed,thermalResult=await pick(thermalInput,M.thermal);
  if(purified&&crushed){var crushedThermal=await pick(crushed,M.thermal);if(!crushedThermal||JSON.stringify(withoutStone(crushedThermal.outputs))!==JSON.stringify(withoutStone(thermalResult?thermalResult.outputs:[])))thermalResult=null;}
  if(thermalResult){var thermalRows=withoutStone(thermalResult.outputs);if(thermalRows.length){group(model,'thermal',thermalRows,thermalResult.recipe);await branch(model,'thermalMacerate',firstItem(thermalRows));}}
  await branch(model,'mercury',crushed,'mercury');await branch(model,'persulfate',crushed,'sodiumpersulfate');
  await branch(model,'sift',purified);await branch(model,'impureCentrifuge',impure);await branch(model,'pureCentrifuge',pure);await branch(model,'separate',pure);
  var centrifuged=thermalResult&&firstItem(withoutStone(thermalResult.outputs)),extras=[
   {map:'furnace',at:[2,0],inputs:[oreKey,crushed,purified,centrifuged,impure,pure]},
   {map:M.blast,at:[4,0],inputs:[oreKey,crushed]},
   {map:M.bath,at:[6,0],inputs:[crushed,purified]},
   {map:M.chemical,at:[8,0],inputs:[crushed,purified]},
   {map:M.mixer,at:[10,0],inputs:[crushed,purified,impure,pure]},
   {map:M.autoclave,at:[12,0],inputs:[impure,pure]}],additional=new Map();
  for(var extra of extras){var recipes=[],seen=new Set();for(var key of extra.inputs){if(!key)continue;var rows=extra.map==='furnace'?[furnaceRecipes().get(key)].filter(Boolean):(await G.recipes(key)).filter(function(r){return r.map===extra.map;});rows.forEach(function(r){if(!seen.has(r.id)){seen.add(r.id);recipes.push(r);}});}
   if(!recipes.length)continue;var at=point(extra.at);model.machines.push({x:at.x,y:at.y,map:extra.map,recipe:recipes[0],additional:true});recipes.forEach(function(r){withoutStone(outputs(r)).forEach(function(p){additional.set(p.target+':'+p.key,{key:p.key,target:p.target});});});
  }
  if(additional.size){model.groups.push({id:'additional',x:11,y:251,width:9,height:Math.max(2,Math.ceil(additional.size/9)),items:Array.from(additional.values()),recipe:null});model.height=251+(Math.max(2,Math.ceil(additional.size/9))-1)*18+12;}
  return model;
 }
 G.diagram=async function(mat){if(!cache.has(mat)){var pending=build(mat);cache.set(mat,pending);try{return await pending;}catch(error){cache.delete(mat);throw error;}}return cache.get(mat);};
 G.diagramLayouts=layouts;
})(typeof window!=='undefined'?window:globalThis);
