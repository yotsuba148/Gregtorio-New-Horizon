(function(root){
 'use strict';
 var research=GD.assemblyResearch;research.items.forEach(function(i){CONTENT.registerItem(i);});var researchByRecipe=new Map(research.bindings.map(function(v){return[v.recipe,v];}));
 var C=CONTENT,TX=GTTransactions,AL='gt.recipe.fakeAssemblylineProcess',CAL='bw.recipe.cal',imprintId='bartworks:gt.bwMetaGeneratedItem0';
 var K=function(n){return 'gregtech:gt.blockmachines@'+n;},steel='gregtech:gt.blockcasings2@0',grate='gregtech:gt.blockcasings3@10',assembly='gregtech:gt.blockcasings2@5',assembler='gregtech:gt.blockcasings2@9';
 function stable(v){return v&&typeof v==='object'?Array.isArray(v)?'['+v.map(stable).join(',')+']':'{'+Object.keys(v).sort().map(function(k){return JSON.stringify(k)+':'+stable(v[k]);}).join(',')+'}':JSON.stringify(v);}
 function tags(k){var i=C.item(k);return i&&i.nbt?SNBT.parse(i.nbt):null;}
 function stick(s){var i=s&&C.item(s.k);return !!i&&i.id==='gregtech:gt.metaitem.01'&&i.meta===32708;}
 function outputTag(r){var s=r.extra&&r.extra.specialItems;if(Array.isArray(s))s=s[0];return s&&s.nbt?SNBT.parse(s.nbt).output:null;}
 function fail(code,text){return{ok:false,code:code,text:text};}
 var imprintKeys=new Map(),circuitByTag=new Map();
 C.data.items.forEach(function(item){
  if(item.id===imprintId&&item.meta===0&&item.nbt)imprintKeys.set(stable(SNBT.parse(item.nbt)),C.canonicalKey(item.k));
 });
 C.recipes('gt.recipe.slicer').forEach(function(recipe){
  var result=recipe.out[0]&&C.item(recipe.out[0].k);
  if(result&&result.id===imprintId&&result.meta===1&&result.nbt&&recipe.in[0])circuitByTag.set(stable(SNBT.parse(result.nbt)),recipe.in[0].k);
 });
 function imprintedCircuit(key,tag){
  var item=key&&C.item(key);
  if(!tag&&item&&item.id===imprintId&&(item.meta===0||item.meta===1))tag=tags(key);
  return tag&&circuitByTag.get(stable(tag));
 }
 var recipeImprints=new WeakMap();
 function imprintFromSpecial(map,extra){
  if(map!==CAL)return null;
  var special=extra&&extra.specialItems;
  return special&&special.id===imprintId&&special.nbt?imprintKeys.get(stable(SNBT.parse(special.nbt))):null;
 }
 function imprintForRecipe(recipe){
  if(recipe.map!==CAL)return null;
  if(!recipeImprints.has(recipe))recipeImprints.set(recipe,imprintFromSpecial(recipe.map,recipe.extra));
  return recipeImprints.get(recipe);
 }
 var installedImprints=new WeakMap();
 function activeImprint(m){
  var imprint=m.calImprint;
  if(!imprint)return null;
  if(!installedImprints.has(imprint))installedImprints.set(imprint,imprint.tag?imprintKeys.get(stable(imprint.tag)):imprint.k);
  return installedImprints.get(imprint)||null;
 }
 function len(m,min,max){return Math.max(min,Math.min(max,MULTIBLOCKS.dimensionsOf(m).length||min));}
 function parts(k,n){return{k:k,n:n};}
 function count(list,type){return list.filter(function(p){return HATCH_RULES.has(MULTIBLOCKS.spec(p.k),type);}).length;}
 function ordered(m,p,kind){return p?+p.face.split(',')[0]:-1;}
 function rows(n,h){return Array.from({length:h},function(_,y){return (y===h-2?'g':y===h-1?'s':'a').repeat(n);}).map(function(r,y){return y===h-2?'C'+r.slice(1):r;});}
 function backing(m,s){return s.type==='data'?grate:steel;}
 function commonProfile(id,meta,map,min,max,h,build,options){
  STRUCTURES.add(id,GD.items[K(meta)]||id,meta,map,build,Object.assign({structureFields:['length'],inputIsolationFixed:false,windowWidth:840,compactMultiblock:true},options));
  var p=STRUCTURES.profiles[id];p.dimensions=[{key:'length',label:'长度',min:min,max:max,initial:min}];p.fields=['length'];
  MULTIBLOCKS.registerShape(id,{w:min,h:h,cx:0,cy:h-2,resize:function(v){return{w:Math.max(min,Math.min(max,v.length||min))};}});
  p.visualPattern=function(m){return rows(len(m,min,max),h);};p.controllerIcon='modicons/assembly-lines/'+meta+'.png';
  p.casingKeys=function(){return[steel,grate];};p.portBacking=backing;p.inputOrder=ordered;
  p.orderedBusLayout=true;
  p.portNumber=function(m,port,s){if(s.itemIn)return '，'+(+port.face.split(',')[0]+1)+'号';};
  p.materialKey=function(m,c,ch){if(ch==='C')return null;if(c.dy===h-1)return steel;if(c.dy===h-2)return 'asset:modicons/assembly-lines/glass.png';return c.dy===0?grate:assembler;};
  p.limits=function(m,list){return count(list,'itemOut')<=1&&count(list,'data')<=1;};
  return p;
 }
 // The native AL display map contains the original ordered inputs. It becomes
 // executable only with this controller and its research/input policy.
 C.makeMapExecutable(AL);
 var al=commonProfile('assemblyline',1170,AL,5,16,4,function(v){var n=Math.max(5,Math.min(16,v.length||5));return{parts:[parts(steel,3*n-1),parts(grate,2*n-1),parts('minecraft:glass@0',2*n),parts(assembly,n),parts(assembler,n),parts(K(90),1)]};},{inputPolicy:'ordered',instanceSlots:{researchData:{ids:['gregtech:gt.metaitem.01'],policy:'assembly_data',label:'研究闪存',help:'在 JEI 的装配线配方里点「查看扫描配方」。用扫描仪加工研究物品和空白闪存，再把写好的闪存插在这里。'}}});
 al.allowedFace=function(m,f,s){var n=len(m,5,16);if(s.me&&s.patterns||s.dual||s.steamComponent)return false;
  if(s.itemIn)return f.side===2&&f.y===3;
  if(s.fluidIn)return f.side===0;
  if(s.type==='energy')return f.side===0||f.side===3&&f.y<2||f.side===1&&(f.y===0||f.y===3);
  if(s.itemOut)return f.x===n-1&&(f.side===1&&f.y===1||f.side===2&&f.y===3);
  return s.type==='data'&&f.x===n-1&&f.side===1&&f.y===2;
 };
 al.portReplacesCasing=function(m,s,face){return !s.itemIn&&!(s.itemOut&&face&&face.split(',')[2]==='2');};
 al.limits=function(m,list){return count(list,'itemOut')<=1&&count(list,'data')<=1&&count(list,'energy')<=len(m,5,16);};
 al.checkPortLayout=function(m,list,errors){
  var n=len(m,5,16),end=list.find(function(p){return MULTIBLOCKS.spec(p.k).itemOut;});
  if(!end)errors.push('末段缺少输出总线');
  var needed=end&&end.face===(n-1)+',3,2'?n-1:n;
  var installed=new Set(list.filter(function(p){return MULTIBLOCKS.spec(p.k).itemIn;}).map(function(p){return Number(p.face.split(',')[0])+1;}));
  var missing=Array.from({length:needed},function(_,i){return i+1;}).filter(function(i){return !installed.has(i);});
  if(missing.length)errors.push('第 '+missing.join('、')+' 段缺少输入总线');
 };
 al.portHint='按段号安装输入总线，末段可装输出总线。流体按已装输入仓的段号依次投入。';
 al.capability=function(m,c){c.power=Math.min(c.power,c.voltage*4);c.definition={inputPolicy:'ordered',maxRecipeEUt:c.power};};

 MECHANISMS.registerInstancePolicy('assembly_data',{prepare:function(s){return stick(s)&&tags(s.k)&&tags(s.k).output?{ok:true,item:s}:fail('ITEM','放入记录了配方的研究闪存');}});
 [145,146].forEach(function(id){MULTIBLOCKS.registerPort(K(id),{type:'data',slots:id===145?4:16,columns:id===145?2:4,manualInventory:true,accepts:function(s){return stick(s);},stackLimit:1});});
 ITEM_TRANSFER.register('componentInventory',function(S,r){var m=ENTITIES.get(S,r.uid),p=m&&MULTIBLOCKS.byUid(m,r.portUid),s=p&&MULTIBLOCKS.spec(p.k),i=Number(r.index);if(!s||!s.manualInventory||!Number.isInteger(i)||i<0||i>=s.slots)return null;
  return{arr:p.items,index:i,machine:m,get:function(){return p.items[i];},set:function(v){p.items[i]=v;},accepts:s.accepts,cap:function(){return s.stackLimit||1;}};
 });
 var cal=commonProfile('circuitassemblyline',12735,CAL,2,7,3,function(v){var n=Math.max(2,Math.min(7,v.length||2)),glass='bartworks:BW_GlasBlocks@'+Math.min(5,(v.glass||0)+1);return{parts:[parts(steel,3*n-3),parts(grate,3*n-1),parts(glass,2*n),parts(assembly,n),parts(K(90),1)]};},{perfectOverclock:true,maxTierSkips:0,defaultInputSeparation:false,controllerCircuit:true,uiPanels:['circuit_imprint']});
 cal.modes=[
  {name:'电路装配线',map:CAL,definition:{inputPolicy:'first_per_bus',inputIsolationFixed:true},
   portIssue:function(s){return s.patterns?'样板输入总线和总成需要切到电路组装机模式，或换成普通输入总线':null;},
   ready:function(m){return activeImprint(m)?null:fail('IMPRINT','放入与目标电路板对应的压印电路');}},
  {name:'电路组装机',map:'gt.recipe.circuitassembler',processingDimensions:{length:{min:5}},recipeVoltageFactor:0.25,
   definition:{inputPolicy:null,inputIsolationFixed:false}}
 ];
 cal.modeDuringWork=true;
 cal.portHint=function(m){
  if(MACHINE_MODES.current(m).map===CAL)return '每条输入总线只读取第一叠物品。';
  var failure=MACHINE_MODES.ready(m);
  return failure?failure.text+'。':'基础配方电压最高比能源仓低一级。';
 };
 cal.portNumber=function(){return '';};
 cal.showInputPosition=false;
 cal.portBacking=function(m,s){return s.type==='energy'?grate:steel;};
 cal.portReplacesCasing=function(m,s,face){var x=face&&+face.split(',')[0];return !(s.itemOut||s.itemIn&&x===0);};
 cal.allowedFace=function(m,f,s){var n=len(m,2,7);if(s.steamComponent)return false;
  if(s.itemIn)return f.side===2&&f.x<n-1;
  if(s.itemOut)return f.side===2&&f.x===n-1;
  if(s.fluidIn)return f.side===0||(f.side===3&&f.x===0&&f.y===2);
  return s.type==='energy'&&f.side===3&&f.y===0;
 };
 cal.limits=function(m,list){return count(list,'energy')<=1&&count(list,'itemOut')<=1;};
 cal.checkPortLayout=function(m,list,errors){if(!list.some(function(p){return MULTIBLOCKS.spec(p.k).itemIn&&+p.face.split(',')[0]===0;}))errors.push('第 1 段缺少输入总线');if(!count(list,'itemOut'))errors.push('末段缺少输出总线');};
 
 cal.materialKey=function(m,c,ch){return c.dy===1?'bartworks:BW_GlasBlocks@'+((m.structure&&m.structure.variant.glass||0)+1):c.dy===0?grate:steel;};
 STRUCTURE_UPGRADES.register('circuitassemblyline',[{field:'glass',label:'玻璃',options:['EV','IV','LuV','ZPM','UV'],parts:function(i,m){return[parts('bartworks:BW_GlasBlocks@'+(i+1),2*(m?len(m,2,7):2))];}}]);
 cal.prepareRecipe=function(m,r){
  if(r.map!==CAL)return r;
  var imprint=activeImprint(m);
  if(imprint&&imprint===imprintForRecipe(r))return r;
  return fail('IMPRINT',imprint?'所装压印电路与配方不符':'放入与目标电路板对应的压印电路');
 };
 cal.filterCandidates=function(m,recipes){
  var imprint=activeImprint(m);
  return recipes.filter(function(r){return imprintForRecipe(r)===imprint;});
 };
 ITEM_TRANSFER.register('assemblyImprint',function(S,r){
  var m=ENTITIES.get(S,r.uid);
  if(!m||m.k!==K(12735))return null;
  return{machine:m,get:function(){return null;},locked:function(){return !!m.calImprint||!!m.job||MACHINE_MODES.current(m).map!==CAL;},
   cap:function(){return 1;},accepts:function(s){var i=C.item(s.k);return !!i&&i.id===imprintId&&i.meta===0&&!!imprintedCircuit(s.k);},
   set:function(v){if(v)m.calImprint={k:C.canonicalKey(v.k),tag:tags(v.k)};}};
 });
 RESOURCE_UI.registerPanel('circuit_imprint',function(host,m){
  var row=document.createElement('div'),label=document.createElement('span'),slot=document.createElement('button');
  row.className='resource-slot-row';
  slot.type='button';slot.className='mb-slot';
  slot.dataset.transferRef=JSON.stringify({type:'assemblyImprint',uid:m.uid});
  row.append(label,slot);host.append(row);
  host._refresh=function(){
   var key=activeImprint(m),mode=MACHINE_MODES.current(m).map===CAL;
   host.hidden=!mode;
   slot.disabled=!!m.calImprint||!!m.job||!mode;
   if(host._imprint===key)return;
   host._imprint=key;
   var circuit=imprintedCircuit(key);
   var name=circuit&&(GD.items[circuit]||C.item(circuit).name);
   label.textContent=name||'压印电路';
   slot.dataset.tip=name?'已压印 '+name:'放入压印电路。每台机器只能压印一次。';
   slot.setAttribute('aria-label',slot.dataset.tip);
   slot.innerHTML=circuit?iconHtml(circuit,28):'<span>＋</span>';
  };
  host._refresh();
 });
 // Native scanner research consumes the research item and one blank data stick.
 // Encoded sticks already exist in the imported registry, including their NBT.

 C.recipes('gt.recipe.scanner',true).filter(function(r){return r.fake&&r.extra&&r.extra.specialItems&&outputTag(r);}).forEach(function(r){var binding=researchByRecipe.get(r.id),k=binding&&binding.item;if(!k)throw Error('Missing native research stick '+r.id);
  C.registerRecipe(Object.assign({},r,{id:'assembly-research:'+r.id,fake:false,in:r.in.concat([{k:'gregtech:gt.metaitem.01@32708',n:1}]),out:[{k:k,n:1}],assemblyResearch:true}));
 });
 var scannerIds=[341,342,343,344,345,11010,11011],scannerTiers=scannerIds.map(function(id,i){var tier=i+1,d={key:K(id),cat:'scanner',cn:GD.items[K(id)],tier:tier,tag:DEFS.tagOf(tier),volt:DEFS.voltOf(tier),recipeMap:'gt.recipe.scanner',behavior:'batch_processor',slots:{in:2,out:1,fluid:0},fluidInputTanks:[],fluidOutputTanks:[],energyCapacity:64*DEFS.voltOf(tier),startEnergy:8*DEFS.voltOf(tier),autoItems:true};
    GD.extraMachineDefinitions.push(d);DEFS.register(d);return{t:tier,k:K(id),name:d.cn,tag:d.tag};
  });GD.machines.cats.push({id:'scanner',cn:'扫描仪',tiers:scannerTiers,slots:{in:2,out:1,fluid:0}});C.alias('scanner','gt.recipe.scanner');

 root.ASSEMBLY_LINES={researchMap:AL,circuitMap:CAL,stick:stick,outputTag:outputTag,imprintedCircuit:imprintedCircuit,imprintForRecipe:imprintForRecipe,imprintFromSpecial:imprintFromSpecial,researchStickFor:function(recipeId){var entry=researchByRecipe.get(recipeId);return entry&&entry.item;}};
})(typeof window!=='undefined'?window:globalThis);
