/* Fusion owns ignition and its internal energy store. The processor owns each batch. */
(function(root){
 'use strict';
 var P=INDUSTRIAL_PROCESSING,B=MULTIBLOCK_CATALOG,MB=MULTIBLOCKS,L=FUSION_STRUCTURE;
 var recipeMap='gt.recipe.fusionreactor',profiles=new Map();
 function threshold(r){return r.extra?.metadata?.fusion_threshold||0;}
 function recipeLevel(r){
  for(var level=0;level<L.ignitionCapacity.length;level++)
   if(threshold(r)<=L.ignitionCapacity[level]&&r.eut<=DEFS.voltOf(level+6))return level;
  return L.ignitionCapacity.length;
 }
 function parallels(spec,eu){
  var count=1;
  for(var i=0;i<spec.level;i++)if(eu<L.ignitionCapacity[i])count++;
  return 64*count;
 }
 function processing(spec){
  var voltage=DEFS.voltOf(spec.tier),powerBudget=voltage*(spec.parallel?parallels(spec,100):1);
  var factor=spec.level>=3?4:2;
  function fusionLimit(r){return Math.max(0,spec.level-recipeLevel(r));}
  function powerOverclocks(power){
   var ratio=Math.floor(powerBudget/Math.max(power,32));
   return ratio<4?0:Math.floor(Math.log2(ratio)/2);
  }
  function timing(r,parallel){
   var power=r.eut*parallel;
   var limit=spec.parallel?fusionLimit(r):Math.min(fusionLimit(r),spec.tier-DEFS.tierOfEut(r.eut));
   var overclocks=Math.max(0,Math.min(limit,powerOverclocks(power)));
   var multiplier=Math.pow(factor,overclocks);
   return {durationTicks:Math.max(1,Math.floor(r.durationTicks/multiplier)),EUt:power*multiplier,overclocks:overclocks};
  }
  function parallelLimit(r){
   var base=spec.parallel?parallels(spec,threshold(r)):1;
   var limit=spec.parallel?powerOverclocks(r.eut*base):Math.max(0,spec.tier-DEFS.tierOfEut(r.eut));
   var extra=Math.max(1,Math.ceil(Math.pow(factor,Math.min(fusionLimit(r),limit))/r.durationTicks));
   return Math.min(base*extra,Math.floor(powerBudget/Math.max(r.eut,1)));
  }
  return {powerBudget:powerBudget,timing:timing,parallelLimit:parallelLimit};
 }
 function powerStore(spec){
  var voltage=DEFS.voltOf(spec.tier),maxHatches=spec.energyFaces.size;
  var rate=spec.parallel?voltage*parallels(spec,100)/maxHatches:voltage/16;
  function hatches(m){return B.counted(m,'energy');}
  function capacity(m){return Math.floor(spec.fullCapacity*Math.min(hatches(m).length,maxHatches)/maxHatches);}
  function stored(m){return Math.min(capacity(m),m.fusionEU||0);}
  return {label:'聚变储能',capacity:capacity,rate:rate,available:stored,waitForFirstWork:true,
   startup:function(m,r){return m.fusionIgnited?0:threshold(r);},
   spend:function(m,n){m.fusionEU=stored(m)-n;},
   onStart:function(m){m.fusionIgnited=true;},
   onIdle:function(m){delete m.fusionIgnited;},
   charge:function(m){
    if(!MB.live(m)||!m.structure.formed)return;
    var limit=capacity(m),energy=stored(m);
    hatches(m).forEach(function(h){
     var amount=Math.min(rate,h.eu||0,limit-energy);energy+=amount;h.eu=(h.eu||0)-amount;
    });
    m.fusionEU=energy;
   }};
 }
 function access(spec,f){
  var id=L.face(f.x,f.y,f.side);
  return spec.energyFaces.has(id)?'energy':L.fluidFaces.has(id)?'fluid':null;
 }
 function install(spec){
  var account=powerStore(spec),work=processing(spec),voltage=DEFS.voltOf(spec.tier),tier=DEFS.tagOf(spec.tier);
  var tag=tier+' 或更高等级的能源仓';
  var definition={tier:spec.tier,runSwitch:true,inputIsolationFixed:false,fixedRecipeVoltage:voltage,showInputIsolation:false,
   windowWidth:820,structureFields:[],processingTiming:work.timing,recipeParallelLimit:work.parallelLimit,
   batchProcessing:spec.parallel?{maxSize:128,defaultEnabled:false}:false};
  var profile=P.install({id:spec.id,meta:spec.meta,map:recipeMap,pattern:L.pattern,
   materials:spec.materials,portTiles:['s','h'],maintenance:false,defaultEnergy:false,minCasing:0,
   defaultPorts:spec.tier===10?[11300,12097,12097,12103]:[40+spec.tier,50+spec.tier,50+spec.tier,60+spec.tier],
   definition:definition,
   allowed:function(m,f,s){
    var role=access(spec,f);
    if(s.steamComponent)return false;
    if(role==='energy')return s.type==='energy'&&s.tier>=spec.tier;
    return role==='fluid'&&(s.type==='fluidIn'||s.type==='fluidOut')&&s.externalFluidIn!==false;
   },
   portRequirements:{energy:{min:1,max:spec.energyFaces.size,label:tag},fluidIn:{min:spec.parallel?1:2},fluidOut:{min:1}},
   capability:function(m,c){c.voltage=voltage;c.power=work.powerBudget;c.energyCapacity=account.capacity(m);}
  });
  profile.portFace=function(x,y,side){return !!access(spec,{x:x,y:y,side:side});};
  profile.multiAmpEnergy=spec.parallel;
  profile.portMapUnit=19;
  profile.materialKey=function(m,c,tile){
   if(tile==='h')return spec.coil;
   var edge=c.dx===0||c.dx===14?c.dy:c.dy===0||c.dy===14?c.dx:-1;
   return spec.glass&&edge>=5&&edge<=9?spec.glass:null;
  };
  profile.portHint='拐角安装能源仓，四条直边安装流体仓。';
  profile.faceHint=function(m,f){return access(spec,f)==='energy'?tag:'';};
  profile.passiveTick=account.charge;
  profile.checkRecipe=function(m,r,job){
   if(job)return null;
   if(r.eut>voltage)return P.error('VOLTAGE','配方电压超过控制器等级');
   var required=threshold(r);
   return required>account.capacity(m)?P.error('ENERGY','启动需要 '+required.toLocaleString()+' EU，请增加能源仓'):null;
  };
  profile.processingEnergy=account;
  profiles.set(B.key(spec.meta),profile);
 }
 L.machines.forEach(install);
 function migrate(S){
  (S.fx?.machines||[]).forEach(function(m){
   if(!profiles.has(m.k)||!MB.live(m))return;
   if(m.job)m.fusionIgnited=true;
   var ports=MB.ports(m),reserved=new Set(ports.map(function(p){return p.face;})),moved=[];
   var faces=MB.faces(m);
   ports.forEach(function(p){
    if(MB.allowedFace(m,p.face,p.k)||!L.fluidFaces.has(p.face)||MB.spec(p.k)?.type!=='energy')return;
    var position=p.face.split(',').map(Number);
    var distance=function(f){return Math.abs(f.x-position[0])+Math.abs(f.y-position[1]);};
    var candidate=faces.filter(function(f){return !reserved.has(f.id)&&MB.allowedFace(m,f.id,p.k);})
      .sort(function(a,b){return distance(a)-distance(b);})[0];
    if(!candidate)return;
    MB.detachFace(S,m,p.face);
    reserved.add(candidate.id);p.face=candidate.id;moved.push(p.face);
   });
   if(!moved.length)return;
   MB.invalidate(m);
   if(S.fx.autoConnect&&ENTITIES.isGrid(m))moved.forEach(function(face){MB.connectPort(S,m,face,false);});
  });
 }
 function retireMaintenance(S){
  var key=B.key(90);
  (S.fx?.machines||[]).forEach(function(m){
   var profile=profiles.get(m.k);
   if(!profile||profile.multiAmpEnergy||!MB.live(m))return;
   var structure=m.structure;
   var retired=structure.fixedParts.filter(function(part){return CONTENT.canonicalKey(part.k)===key;});
   if(!retired.length)return;
   structure.fixedParts=structure.fixedParts.filter(function(part){return !retired.includes(part);});
   structure.recoveryItems=(structure.recoveryItems||[]).concat(retired);
   MB.invalidate(m);
  });
 }
 root.FUSION_REACTORS={migrate:migrate,retireMaintenance:retireMaintenance};
 if(root.JEI)JEI.registerParameter(function(r,add){
  if(r.map===recipeMap&&threshold(r))add('启动电量',threshold(r).toLocaleString()+' EU');
 });
 DEFS.rebuild();
})(typeof window!=='undefined'?window:globalThis);
