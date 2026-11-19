/* Shared world work: physical breaking time, planted trees and queued river washing. */
(function(root){
 'use strict';
 var C=CONTENT,TX=GTTransactions;
 var blocks={
  'minecraft:log':{hardness:2,tool:'axe',harvest:true},'minecraft:log2':{hardness:2,tool:'axe',harvest:true},
  'IC2:blockRubWood':{hardness:1,tool:'axe',harvest:true},'minecraft:dirt':{hardness:.5,tool:'shovel',harvest:true},
  'minecraft:sand':{hardness:.5,tool:'shovel',harvest:true},'minecraft:gravel':{hardness:.6,tool:'shovel',harvest:true},
  'minecraft:clay':{hardness:.6,tool:'shovel',harvest:true},'minecraft:soul_sand':{hardness:.5,tool:'shovel',harvest:true},
  'minecraft:reeds':{hardness:0,harvest:true},'minecraft:red_flower':{hardness:0,harvest:true},'minecraft:yellow_flower':{hardness:0,harvest:true},'minecraft:nether_wart':{hardness:0,harvest:true},'minecraft:cactus':{hardness:.4,harvest:true},'minecraft:glowstone':{hardness:.3,harvest:true},'minecraft:stone':{hardness:1.5,tool:'pick',harvest:false},
  'TConstruct:GravelOre':{hardness:3,tool:'shovel',harvest:false},'dreamcraft:ZincGravelOre':{hardness:3,tool:'shovel',harvest:false},
  'minecraft:obsidian':{hardness:50,tool:'pick',harvest:false},'TConstruct:slime.gel':{hardness:.5,harvest:true},
  'minecraft:end_stone':{hardness:3,tool:'pick',harvest:false},
  'TwilightForest:tile.TFAuroraBrick':{hardness:2,tool:'pick',harvest:false}
 };
 var sourceBlocks={chop_tree:'minecraft:log@0',gather_rubberwood:'IC2:blockRubWood@0',dig_dirt:'minecraft:dirt@0',dig_sand:'minecraft:sand@0',dig_gravel:'minecraft:gravel@0',dig_clay:'minecraft:clay@0',mine_training_stone:'minecraft:stone@0',gather_soulsand:'minecraft:soul_sand@0'};
 function toolType(k){var b=C.baseKey(k),d=GD.tools.types.find(function(t){return t.keys.includes(b);});return d&&d.id;}
 function usable(s){if(!s||s.entityUid)return false;if(root.TINKER_TOOLS&&TINKER_TOOLS.isTool(s.k)){var i=TINKER_TOOLS.info(s);return !!i&&!i.broken&&s.dur>0;}return s.dur==null||s.dur>0;}
 function speed(s,type){
  if(!usable(s)||toolType(s.k)!==type)return 1;
  if(root.TINKER_TOOLS&&TINKER_TOOLS.isTool(s.k))return Math.max(.01,s.spd||1);
  var item=C.item(s.k),id=item&&item.id||'',vanilla=/^minecraft:(wooden|stone|iron|diamond|golden)_/.exec(id);
  if(vanilla)return{wooden:2,stone:4,iron:6,diamond:8,golden:12}[vanilla[1]];
  var nbt=item&&SNBT.tryParse(item.nbt),primary=nbt&&nbt['GT.ToolStats']&&nbt['GT.ToolStats'].PrimaryMaterial||nbt&&nbt.PrimaryMaterial;
  var m=primary&&GD.nativeToolSpeeds&&GD.nativeToolSpeeds[primary];
  return Math.max(.01,m||s.spd||1);
 }
 function best(S,type){var found=null;[S.inv||[],Object.values(S.tools||{})].forEach(function(a){a.forEach(function(s,i){if(!usable(s)||toolType(s.k)!==type)return;var sp=speed(s,type);if(!found||sp>found.speed)found={k:s.k,inst:s,index:i,id:Object.keys(S.tools||{}).find(function(id){return S.tools[id]===s;}),where:a===S.inv?'inv':'tool',speed:sp};});});return found;}
 function profile(k){var item=C.item(k);if(!item)return null;if(/^gregtech:gt.blockores\d*$/.test(item.id))return{hardness:1,tool:'pick',harvest:false};return blocks[item.id]||null;}
 function breakTicks(k,s){var p=profile(k);if(!p)return null;var correct=usable(s)&&toolType(s.k)===p.tool,eff=correct?speed(s,p.tool):1;
  var enchant=0,item=s&&C.item(s.k),nbt=item&&SNBT.tryParse(item.nbt);(nbt&&nbt.ench||[]).forEach(function(e){if(e.id===32)enchant=Math.max(enchant,e.lvl||0);});
  if(eff>1&&enchant)eff+=enchant*enchant+1;
  return Math.max(1,Math.ceil((p.harvest||correct?30:100)*p.hardness/eff-1e-7));
 }
 function seconds(S,d,a){
  var k=sourceBlocks[d.id]||d.breakBlock;
  if(d.id==='mine_cobble'){var pick=best(S,'pick');return pick?breakTicks('minecraft:stone@0',pick.inst)/20:d.time;}
  if(!k)return d.time;
  if(d.requiredHarvestLevel!=null){var qualified=MINING.findPick(S,d.requiredHarvestLevel);return breakTicks(k,qualified&&qualified.inst)/20;}
  var p=profile(k),t=p&&p.tool&&best(S,p.tool);return breakTicks(k,t&&t.inst)/20;
 }
 Object.keys(sourceBlocks).forEach(function(id){var d=ACTIVITIES.definitions[id];if(d){d.breakBlock=sourceBlocks[id];d.time=breakTicks(d.breakBlock,null)/20;}});
 root.WORK_TIME={blocks:blocks,profile:profile,toolType:toolType,usable:usable,speed:speed,best:best,breakTicks:breakTicks,seconds:seconds};

 var washTicks=40;
 function washing(S){if(!S.riverWash){var old=MECHANISMS.ensure(S).deployments.cauldron;S.riverWash={version:1,seq:old?1:0,pots:old?[{id:'pot1',input:null,output:null,progress:0}]:[]};delete MECHANISMS.ensure(S).deployments.cauldron;}return S.riverWash;}
 function pot(S,id){return washing(S).pots.find(function(p){return p.id===id;});}
 function washRecipe(k){return FIELDWORK.lists.wash.find(function(r){return C.matches(r.input,k);});}
 function addPot(S){var w=washing(S);if(w.pots.length>=16)return{ok:false,code:'LIMIT'};var r=COMMANDS.exchange(S,[{k:'minecraft:cauldron@0',n:1}],[]);if(r.ok)w.pots.push({id:'pot'+(++w.seq),input:null,output:null,progress:0});return r;}
 function removePot(S,id){var w=washing(S),p=pot(S,id);if(!p)return{ok:false,code:'SLOT'};if(p.input||p.output||p.progress)return{ok:false,code:'CONTENTS'};var r=COMMANDS.returnItems(S,[{k:'minecraft:cauldron@0',n:1}],{drops:true});if(r.ok){w.pots=w.pots.filter(function(q){return q!==p;});ACTION_QUEUE.ensure(S).forEach(function(a){if(a.type==='riverwash'&&a.goals){a.target=Math.max(a.done||0,a.target-(a.goals[id]||0));delete a.goals[id];}});}return r;}
 function depositWash(S,id,k,n){var p=pot(S,id);if(!p)return{ok:false,code:'SLOT'};if(!washRecipe(k))return{ok:false,code:'RECIPE'};if(p.input&&p.input.k!==C.canonicalKey(k))return{ok:false,code:'CONTENTS'};var arr=[p.input],r=COMMANDS.deposit(S,CORE.slotBox(arr),k,n,{index:0});if(r.ok)p.input=arr[0];return r;}
 function takeWash(S,id,field,n){var p=pot(S,id);if(!p||!['input','output'].includes(field))return{ok:false,code:'SLOT'};var arr=[p[field]],r=COMMANDS.withdraw(S,arr,0,n);if(r.ok){p[field]=arr[0];if(field==='input'&&!p.input)p.progress=0;}return r;}
 function enqueueWash(S,repeat){if(!washing(S).pots.length)return{ok:false,code:'STATION'};if(ACTION_QUEUE.ensure(S).some(function(a){return a.type==='riverwash';}))return{ok:false,code:'QUEUED'};
  var goals={},keys={};washing(S).pots.forEach(function(p){if(p.input){goals[p.id]=p.input.n;keys[p.id]=p.input.k;}});if(!Object.keys(goals).length)return{ok:false,code:'INPUT'};
  var a={type:'riverwash',name:'河岸洗矿',done:0,target:Object.values(goals).reduce(function(n,v){return n+v;},0),goals:goals,keys:keys,repeat:!!repeat,prog:0};ACTION_QUEUE.enqueue(S,a);return{ok:true,action:a};}
 function stepWash(S,a,dt,seconds){var changed=false,running=0,full=0,remaining=0,period=seconds==null?washTicks/20:seconds;
  washing(S).pots.forEach(function(p){var wanted=a.repeat?Infinity:a.goals[p.id]||0;if(!wanted)return;
   if(!a.repeat&&(!p.input||a.keys&&p.input.k!==a.keys[p.id])){a.goals[p.id]=0;return;}
   var r=p.input&&washRecipe(p.input.k);if(!r)return;
   remaining+=wanted;var room=CORE.maxStack(r.output)-(p.output?p.output.n:0);if(p.output&&p.output.k!==r.output||room<r.n){full++;return;}
   running++;p.progress=root.GAME_TIME?GAME_TIME.elapsed(S,p.progress,period,dt):(p.progress||0)+dt;while(p.progress+1e-9>=period&&p.input&&(a.repeat||a.goals[p.id]>0)){
    if(p.output&&(p.output.k!==r.output||p.output.n+r.n>CORE.maxStack(r.output)))break;
    p.input.n--;if(!p.input.n)p.input=null;
    if(!p.output)p.output={k:r.output,n:0};p.output.n+=r.n;p.progress=p.input?Math.max(0,p.progress-period):0;a.done++;if(!a.repeat)a.goals[p.id]--;changed=true;
   }
  });
  if(!a.repeat&&!Object.values(a.goals).some(function(n){return n>0;})){a.complete=true;delete a.blocked;}
  else if(!running)a.blocked=full?'BUFFER':'INPUT';else delete a.blocked;
  return changed;
 }
 // Remove only the superseded natural-small-ore actions, preserving earned items.
 var removed=new Set(Object.values(ACTIVITIES.definitions).filter(function(d){return d.veinSource;}).map(function(d){return d.id;}));
 GD.sources=GD.sources.filter(function(d){return !removed.has(d.id);});removed.forEach(function(id){delete ACTIVITIES.definitions[id];});
 function migrate(S){washing(S);
  (S.fx&&S.fx.machines||[]).forEach(function(m){var d=DEFS.of(m.k);if(d&&d.worldWorkbench&&ENTITIES.isGrid(m)){m.location={kind:'world',dim:'overworld'};m.x=null;m.y=null;}});
 }
 ITEM_TRANSFER.register('wash',function(S,r){
  var p=pot(S,r.pot);if(!p||!['input','output'].includes(r.kind))return null;
  return {get:function(){return p[r.kind]||null;},set:function(v){var old=p[r.kind];p[r.kind]=v;if(r.kind==='input'&&(!v||old&&old.k!==v.k))p.progress=0;},accepts:function(s){return !s.entityUid&&r.kind==='input'&&!!washRecipe(s.k);}};
 });
 root.RIVER_WASH={ticksPerItem:washTicks,ensure:washing,pot:pot,recipe:washRecipe,add:addPot,remove:removePot,deposit:depositWash,take:takeWash,enqueue:enqueueWash,step:stepWash};
 (TINKER_TOOLS.definitions||[]).forEach(function(d){d.worldOnly=true;d.worldWorkbench=true;d.autoItems=false;});DEFS.rebuild();
 root.WORLD_WORK={migrate:migrate};
})(typeof window!=='undefined'?window:globalThis);

STATE_SCHEMA.register("river-wash",["riverWash"]);

ITEM_STORES.registerState('washing',function(S){var wash=S.riverWash;return wash?wash.pots.map(function(p){return ITEM_STORES.view('world:wash:'+p.id,p,[p.input,p.output]);}):[];});
