/* TiC reinforcement and Iguana tool levels share the tool's saved InfiTool. */
(function(root){
 'use strict';
 var TX=GTTransactions,T=TINKER_TOOLS,levels=[2,3,5,7,9,11,14,17,20,24,28,32,36,40,45,50,55,60,65,70,75,80,85,90,95,99];
 var rules={reinforced:{key:'TConstruct:materials@43',effect:16}};
 function rule(key){return Object.keys(rules).find(function(id){return CONTENT.matches(rules[id].key,key,{ignoreNBT:true});})||null;}
 function experience(s,xp){var t=T.init(s);if(!t||!Number.isFinite(t.ToolLevel)||!Number.isFinite(t.ToolEXP)||t.ToolLevel<1||t.ToolLevel>=99)return{leveled:false,modifiers:0};t.ToolEXP+=xp;var required=TINKER_PARTS.requiredXp(s,false);if(!(required>0)||t.ToolEXP<required)return{leveled:false,modifiers:0};t.ToolLevel++;t.ToolEXP=0;var gained=levels.filter(function(n){return n===t.ToolLevel;}).length;t.Modifiers=(t.Modifiers||0)+gained;return{leveled:true,level:t.ToolLevel,modifiers:gained};}
 function plan(tool,key){var id=rule(key),next=tool&&TX.clone(tool),t=next&&T.init(next);if(!t)return{ok:false,code:'TOOL'};if(!id)return{ok:false,code:'MODIFIER_ITEM'};if(!(t.Modifiers>0))return{ok:false,code:'NO_MODIFIER_SLOT'};if((t.Unbreaking||0)>=10)return{ok:false,code:'REINFORCED_MAX'};
  if(!Object.prototype.hasOwnProperty.call(t,'Reinforced')){for(var i=1;i<=6;i++)if(!Object.prototype.hasOwnProperty.call(t,'Effect'+i)){t['Effect'+i]=rules[id].effect;break;}}
  t.Reinforced=(t.Reinforced||0)+1;t.Unbreaking=(t.Unbreaking||0)+1;t.Modifiers--;
  for(var n=1;n<1000;n++){if(!Object.prototype.hasOwnProperty.call(t,'Tooltip'+n)||String(t['ModifierTip'+n]||'').includes('Reinforced')){t['Tooltip'+n]='';t['ModifierTip'+n]='§5Reinforced '+['','I','II','III','IV','V','VI','VII','VIII','IX','X'][Math.min(10,t.Reinforced)];break;}}
  T.init(next);return{ok:true,tool:next,kind:id};
 }
 function apply(S,m){if(!m||!ENTITIES.active(m)||TINKER_WORKSTATIONS.family(m.k)!=='toolstation')return{ok:false,code:'STATION'};if(m.job)return{ok:false,code:'RUNNING'};var w=TINKER_WORKSTATIONS.ensure(m),input=w.modifierInput;if(!input||input.entityUid||ITEM_TRANSFER.count(input)<1)return{ok:false,code:'MODIFIER_ITEM'};var result=plan(m.installedItems&&m.installedItems.tool,input.k);if(!result.ok)return result;var rest=TX.clone(input);rest.n=ITEM_TRANSFER.count(rest)-1;w.modifierInput=rest.n?rest:null;m.installedItems.tool=result.tool;return result;}
 root.TINKER_MODIFIERS={rule:rule,plan:plan,apply:apply,experience:experience,levels:levels};
})(typeof window!=='undefined'?window:globalThis);
