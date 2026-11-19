/* TiC ToolBuilder and IguanaTweaks 2.6.6 part replacement; NH 2.8.0 config. */
(function(root){
 'use strict';
 var C=CONTENT,TX=GTTransactions,T=TINKER_TOOLS,D=T.data,F=Math.fround,roles=['Head','Handle','Accessory'],templates=new Map();
 var specs={pickaxe:{parts:['pickaxeHead','toolRod','binding'],attack:1},hatchet:{parts:['hatchetHead','toolRod'],attack:3},shovel:{parts:['shovelHead','toolRod'],attack:2},broadsword:{parts:['swordBlade','toolRod','wideGuard'],attack:4,durability:F(1.2)},mattock:{parts:['hatchetHead','toolRod','shovelHead'],attack:3,dual:true}};
 C.recipes('tconstruct:toolstation').forEach(function(r){var item=C.item(r.out[0].k),kind=item.id.split(':')[1],tag=SNBT.tryParse(item.nbt).InfiTool;if(!specs[kind])return;var id=kind+':'+tag.Head,old=templates.get(id);if(!old||tag.Handle===0&&(!specs[kind].parts[2]||tag.Accessory===0))templates.set(id,{k:r.out[0].k,tag:tag});});
 function kindOf(s){var item=s&&C.item(s.k),kind=item&&item.id.split(':')[1];return specs[kind]?kind:null;}
 function base(kind,tag){if(!tag)return null;var spec=specs[kind],template=templates.get(kind+':'+tag.Head);if(!spec||!template)return null;var mats=spec.parts.map(function(_,i){return D.materials[tag[roles[i]]];});if(mats.some(function(m,i){return !m||tag[roles[i]]===1;}))return null;
  var out=TX.clone(template.tag),head=mats[0],handle=mats[1],heads=spec.dual?2:1,durability=head.durability+(spec.dual?mats[2].durability:0),attack=Math.trunc((head.attack+(spec.dual?mats[2].attack:0))/heads)+spec.attack;
  // Integer head averaging precedes double/float multiplication in ToolBuilder.
  out.BaseDurability=out.TotalDurability=Math.trunc(Math.trunc(durability/heads)*(0.5+heads*0.5)*F(handle.handleModifier)*(spec.durability||1));
  if(attack%heads)attack++;out.BaseAttack=out.Attack=attack;
  spec.parts.forEach(function(_,i){out[roles[i]]=out['Render'+roles[i]]=tag[roles[i]];});
  out.MiningSpeed=template.tag.MiningSpeed;out.HarvestLevel=head.harvestLevel-(kind==='pickaxe'&&head.harvestLevel>0?1:0);
  if(spec.dual){out.MiningSpeed2=mats[2].miningspeed;out.HarvestLevel2=mats[2].harvestLevel;}
  out.Unbreaking=Math.max.apply(null,mats.map(function(m){return m.reinforced;}));if(spec.parts.every(function(_,i){return tag[roles[i]]===314;}))out.Unbreaking=10;out.Shoddy=F(mats.reduce(function(n,m){return F(n+F(m.stonebound));},0)/mats.length);
  return{tag:out,k:template.k};
 }
 function requiredXp(s,boost){var t=T.init(s),kind=kindOf(s);if(!t||!kind||boost&&!Object.prototype.hasOwnProperty.call(t,'HeadEXP'))return null;var value=F(100),level=t.HarvestLevel;
  if(kind==='broadsword'){value=F(F(140)*F(Math.max(1,t.Attack)*F(1.2)));value=F(value*F(1.25));}
  else{if(level<1)value=F(value-20);if(level<2)value=F(value-15);var speed=D.materials[t.Head].miningspeed,actual=t.MiningSpeed,divider=F(2.4);if(kind==='mattock'){speed+=D.materials[t.Accessory].miningspeed;actual+=t.MiningSpeed2;divider=F(divider+1);}value=F(value+F(F(F(speed)+F(F(actual-speed)/F(5)))/divider));if(kind==='shovel')value=F(value*F(1.2));if(kind==='hatchet')value=F(value*F(.66));value=F(value*F(1.25));}
  if(boost){if(level>=2)value=F(value*Math.pow(F(1.15),level-2));if(level===0)value=F(value/F(F(1.15)*F(1.15)));value=F(value*F(1.25));}
  else{if(t.ToolLevel>=1)value=F(value*Math.pow(F(1.2),t.ToolLevel-1));if(level===0)value=F(value/F(F(1.2)*F(1.2)));}
  return Math.min(2147483647,Math.floor(value+.5));
 }
 function part(s,key){var kind=kindOf(s),item=C.item(key);if(!kind||!item)return null;var spec=specs[kind],id=item.id,mat=item.meta;if(id==='minecraft:stick'){id='TConstruct:toolRod';mat=0;}if(id==='minecraft:bone'){id='TConstruct:toolRod';mat=5;}var index=spec.parts.indexOf(id.replace(/^TConstruct:/,''));if(!id.startsWith('TConstruct:')||index<0||!D.materials[mat]||mat===1)return null;return{role:roles[index],material:mat,index:index};}
 function extra(mat){return mat===9||mat===31?1:0;}
 function removeHeadBoost(t){if(!Object.prototype.hasOwnProperty.call(t,'Mining Level Boost'))return;delete t['Mining Level Boost'];var effects=[];for(var i=1;Object.prototype.hasOwnProperty.call(t,'Effect'+i);i++){if(t['Effect'+i]<20||t['Effect'+i]>26)effects.push(t['Effect'+i]);delete t['Effect'+i];}effects.forEach(function(v,i){t['Effect'+(i+1)]=v;});var tips=[];for(var j=1;Object.prototype.hasOwnProperty.call(t,'ModifierTip'+j);j++){if(!String(t['ModifierTip'+j]).endsWith('Mining Level Boost'))tips.push([t['ModifierTip'+j],t['Tooltip'+j]]);delete t['ModifierTip'+j];delete t['Tooltip'+j];}tips.forEach(function(v,i){t['ModifierTip'+(i+1)]=v[0];t['Tooltip'+(i+1)]=v[1];});}
 function plan(s,key){var next=s&&TX.clone(s),t=next&&T.init(next),kind=kindOf(next);if(!t||!kind)return{ok:false,code:'TOOL'};var p=part(next,key);if(!p)return{ok:false,code:'PART'};if(t.Special)return{ok:false,code:'SPECIAL_TOOL'};if(t.Damage>0||t.Broken)return{ok:false,code:'REPAIR_FIRST'};if(t[p.role]===p.material)return{ok:false,code:'SAME_PART'};if(p.role==='Head'&&D.materials[p.material].harvestLevel===0&&Object.prototype.hasOwnProperty.call(t,'HeadEXP'))return{ok:false,code:'HEAD_LEVEL'};
  var modifiers=t.Modifiers-extra(t[p.role])+extra(p.material);if(modifiers<0)return{ok:false,code:'MODIFIERS'};
  var original=base(kind,t),changed=TX.clone(t);changed[p.role]=p.material;var built=base(kind,changed);if(!original||!built||built.tag.TotalDurability<1)return{ok:false,code:'PART'};
  var xpBefore=requiredXp(next,false),boostBefore=requiredXp(next,true),oldReinforced=t.Unbreaking,b=built.tag;
  ['Head','Handle','Accessory','RenderHead','RenderHandle','RenderAccessory','BaseDurability','BaseAttack','Attack','MiningSpeed','MiningSpeed2','HarvestLevel','HarvestLevel2','Shoddy'].forEach(function(k){if(Object.prototype.hasOwnProperty.call(t,k))t[k]=b[k];});
  t.TotalDurability=Math.max(1,Math.trunc(F(F(t.BaseDurability+(t.BonusDurability||0))*F(F(t.ModDurability||0)+1))));t.Unbreaking=b.Unbreaking+oldReinforced-original.tag.Unbreaking;t.Modifiers=modifiers;
  // Reapply ordinary TiC modifiers on the new base; retain every other tag.
  var red=Array.isArray(t.Redstone)?t.Redstone[0]:0,bonus=0;for(var n=1;n<=red;n++)bonus+=8+Math.trunc((n-1)/50)*2+(specs[kind].dual?2:0);t.MiningSpeed+=bonus;if(specs[kind].dual)t.MiningSpeed2+=bonus;
  if(Array.isArray(t.ModAttack)&&t.ModAttack[0]>0)t.Attack+=1+Math.trunc(t.ModAttack[0]/24);
  if(t['Silk Touch']){t.Attack=Math.max(0,t.Attack-3);t.MiningSpeed=Math.max(0,t.MiningSpeed-300);if(specs[kind].dual)t.MiningSpeed2=Math.max(0,t.MiningSpeed2-300);}
  if(p.role==='Head')removeHeadBoost(t);delete t.GemBoost;
  if(Object.prototype.hasOwnProperty.call(t,'ToolEXP')&&xpBefore>0)t.ToolEXP=Math.floor(F(F(F(t.ToolEXP)*F(requiredXp(next,false)/F(xpBefore)))*F(.67))+.5);
  if(Object.prototype.hasOwnProperty.call(t,'HeadEXP')){var required=requiredXp(next,true),xp=F(F(t.HeadEXP)*F(required/F(boostBefore)));if(p.role==='Head'){if(t.HarvestLevelModified){t.HarvestLevelModified=0;xp=F(required);}xp=F(xp*F(.33));}t.HeadEXP=Math.floor(xp+.5);if(t.HarvestLevelModified)t.HarvestLevel++;}
  else if(Object.prototype.hasOwnProperty.call(b,'HeadEXP')){t.HeadEXP=0;t.HarvestLevelModified=0;}
  // The registered key supplies the current head's name/icon; mutable InfiTool
  // owns the exact mixed parts, modifiers, experience and instance identity.
  next.k=built.k;T.init(next);return{ok:true,tool:next,role:p.role,material:p.material};
 }
 function replace(S,m){if(!m||!ENTITIES.active(m)||TINKER_WORKSTATIONS.family(m.k)!=='toolstation')return{ok:false,code:'STATION'};if(m.job)return{ok:false,code:'RUNNING'};var w=TINKER_WORKSTATIONS.ensure(m),src=w.replacementInput;if(!src||src.entityUid||ITEM_TRANSFER.count(src)<1)return{ok:false,code:'PART'};var result=plan(m.installedItems&&m.installedItems.tool,src.k);if(!result.ok)return result;var rest=TX.clone(src);rest.n=ITEM_TRANSFER.count(rest)-1;w.replacementInput=rest.n?rest:null;m.installedItems.tool=result.tool;return result;}
 root.TINKER_PARTS={part:part,base:base,requiredXp:requiredXp,plan:plan,replace:replace};
})(typeof window!=='undefined'?window:globalThis);
