(function(root){
 'use strict';
 var panels={};
 function powerInputText(m){
  var values=ENGINE.networks.powerInput(m,ENGINE.tick||0);
  return values.length?values.map(function(v){return v.voltage.toLocaleString()+' V，'+v.amps.toLocaleString(undefined,{maximumFractionDigits:2})+' A';}).join(' · '):'无输入';
 }
 function resourceText(id,n){return id==='gc:rocket_fuel'?n+' mB 火箭燃料':id.startsWith('vis:')?(n/100)+' Vis '+((GD.tcLabels&&GD.tcLabels.aspects[id.slice(4)])||id.slice(4)):id.startsWith('essentia:')?n+' '+((GD.tcLabels&&GD.tcLabels.aspects[id.slice(9)])||id.slice(9))+' 要素':n+' '+(id==='mana'?'魔力':id);}
 function refresh(host,m){var resourceHost=host.classList&&host.classList.contains('resource-host')?host:host.querySelector('.resource-host');if(resourceHost&&resourceHost._refreshOwned)resourceHost._refreshOwned();var node=host.querySelector('.mx-resource-state');if(node)node.textContent=Object.keys(m.resourceBuffers||{}).filter(function(id){return !id.startsWith('essentia:')||m.resourceBuffers[id].amount>0;}).map(function(id){var p=m.resourceBuffers[id];return resourceText(id,p.amount)+(id.startsWith('essentia:')?'':' / '+(id.startsWith('vis:')?p.capacity/100:p.capacity));}).join('，');host.querySelectorAll('.mechanism-panel').forEach(function(p){if(p._refresh)p._refresh();});}
 function ownedSignature(m){return JSON.stringify([m.attachments,Object.keys(m.installedItems||{}).map(function(slot){var s=m.installedItems[slot];return[slot,s.k,s.instanceUid];})]);}
 function itemSlot(host,m,kind,slot,label,current){var row=document.createElement('div');row.className='resource-slot-row';var text=document.createElement('span');text.textContent=label;row.appendChild(text);var cell=document.createElement('div');cell.className='mslot resource-slot'+(current?'':' mslot-empty');cell.dataset[kind==='instance'?'dragInstance':'dragComponent']=m.uid;cell.dataset.dragSlot=slot;cell.title=current?(GD.items[current.k]||current.k):label;cell.innerHTML=current?iconHtml(current.k,30):'<span class="mplus">+</span>';row.appendChild(cell);host.appendChild(row);}
 function mount(host,m,S,save){if(!host)return;var d=STRUCTURES.instance(m);host._refreshOwned=null;host.innerHTML='';if(!Object.keys(d.resourceCapacities||{}).length&&!Object.keys(d.componentSlots||{}).length&&!Object.keys(d.instanceSlots||{}).length&&!(d.uiPanels||[]).length)return;
  var state=document.createElement('p');state.className='mx-resource-state';host.appendChild(state);refresh(host,m);
  function report(r,ok){if(typeof toastAt==='function')toastAt(null,r.ok?ok:({LINK:'目标需要在同一蓝图的有效范围内',TOOL:'库存需要森林法杖',INPUT:'库存组件不足',OUTPUT:'物品栏与仓库没有回收空间',RUNNING:'等待当前批次完成'})[r.code]||r.code);if(save)save();if(typeof markInv==='function')markInv();mount(host,m,S,save);}
  Object.keys(d.resourceOutputs||{}).forEach(function(id){var row=document.createElement('label');row.textContent=(id==='mana'?'魔力':id)+'目标 ';var select=document.createElement('select');select.dataset.resourceLink=id;var empty=document.createElement('option');empty.value='';empty.textContent='未绑定';select.appendChild(empty);
   (S.fx.machines||[]).filter(function(to){return MECHANISMS.canLinkResource(S,m,to,id);}).forEach(function(to){var o=document.createElement('option');o.value=to.uid;o.textContent=(GD.items[to.k]||to.k)+'，'+to.uid+' ('+to.x+','+to.y+')';select.appendChild(o);});select.value=m.resourceLinks&&m.resourceLinks[id]||'';
   select.onchange=function(){report(MECHANISMS.linkResource(S,m.uid,id,select.value),'资源目标已更新');};row.appendChild(select);host.appendChild(row);
   var info=document.createElement('p');info.className='dim';info.textContent='同图范围 '+d.resourceOutputs[id].range+' 格'+(d.resourceLinkTool?'，使用森林法杖绑定':'');host.appendChild(info);
  });
  Object.keys(d.componentSlots||{}).forEach(function(slot){var key=m.attachments&&m.attachments[slot];itemSlot(host,m,'component',slot,'工艺组件',key?{k:key,n:1}:null);});
  Object.keys(d.instanceSlots||{}).forEach(function(slot){
   var spec=d.instanceSlots[slot],s=m.installedItems&&m.installedItems[slot];
   if(!spec.help){itemSlot(host,m,'instance',slot,spec.label||slot,s);return;}
   var group=document.createElement('div'),help=document.createElement('small');group.className='resource-slot-group';help.textContent=spec.help;
   itemSlot(group,m,'instance',slot,spec.label||slot,s);group.appendChild(help);host.appendChild(group);
  });
  if(!host._panelState)host._panelState={};
  (d.uiPanels||[]).forEach(function(id){if(panels[id]){var section=document.createElement('section');section.className='mechanism-panel';host.appendChild(section);panels[id](section,m,S,save,host._panelState[id]||(host._panelState[id]={}));}});
  var signature=ownedSignature(m);host._refreshOwned=function(){var current=ownedSignature(m),active=document.activeElement,editing=active&&host.contains(active)&&/^(INPUT|SELECT|TEXTAREA)$/.test(active.tagName);if(current!==signature&&!editing)mount(host,m,S,save);};
 }
 root.RESOURCE_UI={mount:mount,refresh:refresh,resourceText:resourceText,powerInputText:powerInputText,registerPanel:function(id,f){if(panels[id])throw Error('Duplicate resource panel '+id);panels[id]=f;}};
})(typeof window!=='undefined'?window:globalThis);
