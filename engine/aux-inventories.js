/* Auxiliary hatch inventories own acceptance, capacity and presentation. */
(function(root){
 'use strict';var kinds=new Map();
 function register(id,rule){if(kinds.has(id))throw Error('Duplicate auxiliary inventory '+id);kinds.set(id,rule);}
 function rule(id){var r=kinds.get(id);if(!r)throw Error('Unknown auxiliary inventory '+id);return r;}
 function accepts(id,s,index){return !s.entityUid&&rule(id).accepts(s,index);}
 function capacity(id,s,index){var r=rule(id);return r.capacity?r.capacity(s,index):CORE.maxStack(s.k);}
 function locked(id,m,index){var r=rule(id);return !!(r.locked&&r.locked(m,index));}
 function prepare(id,s,S){var r=rule(id);return r.prepare?r.prepare(s,S):s;}
 function inputSlots(id){return rule(id).inputSlots||0;}
 function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
 function html(m,p){var spec=MULTIBLOCKS.spec(p.k),r=rule(spec.aux),h='<div class="mb-item-grid" style="--mb-cols:'+(spec.slots===1?1:4)+'">';
  for(var i=0;i<spec.slots;i++){var s=p.items[i],label=s&&r.label?r.label(s,i):s&&s.n>1?s.n:'',ref=esc(JSON.stringify({type:'auxPort',uid:m.uid,portUid:p.uid,index:i}));
   h+='<button type="button" class="mb-slot" data-transfer-ref="'+ref+'"'+(s?' title="'+esc((GD.items[s.k]||s.k)+(label?'，'+label:''))+'"':'')+'>'+(s?iconHtml(s.k,28)+(label?'<b>'+esc(label)+'</b>':''):'<span>＋</span>')+'</button>';
  }return h+'</div>'+(r.extraHtml?r.extraHtml(m,p):'');
 }
 function at(c){var m=c.index[c.cell];if(!m||!MULTIBLOCKS.live(m))return;var xy=c.cell.split(',').map(Number),f=MULTIBLOCKS.localFace(m,xy[0],xy[1],c.side),p=MULTIBLOCKS.at(m,f.id),s=p&&MULTIBLOCKS.spec(p.k);if(s&&s.aux)return {machine:m,port:p,spec:s};}
 TRANSPORT_PORTS.register({supports:function(c){var a=at(c);if(a)return c.kind==='item'&&inputSlots(a.spec.aux)>0;},resolve:function(c){
  var a=at(c);if(!a)return;var n=inputSlots(a.spec.aux);if(c.kind!=='item'||c.direction!=='import'||!n||!c.payload||!accepts(a.spec.aux,c.payload,0))return null;
  var p=a.port,indices=Array.from({length:n},function(_,i){return i;}),view=CORE.slotBox(p.items.slice(0,n));
  return TRANSPORT_PORTS.itemHandler(p.items,view,a.machine,function(){indices.forEach(function(i){p.items[i]=view.arr[i];});},indices);
 }});
 PROCESSING_ACCESS.registerInlet('auxiliary_inventory',function(m,p){var s=p&&MULTIBLOCKS.spec(p.k);if(!s||!s.aux)return;var n=inputSlots(s.aux);return {bindings:n?[{kind:'item',owner:p,array:p.items,slots:n,valid:function(){return ENTITIES.active(m)&&MULTIBLOCKS.byUid(m,p.uid)===p;},accepts:function(k){return accepts(s.aux,{k:k,n:1},0);}}]:[],configuration:null};});
 root.AUX_INVENTORIES={register:register,accepts:accepts,capacity:capacity,locked:locked,prepare:prepare,html:html,inputSlots:inputSlots};
})(typeof window!=='undefined'?window:globalThis);
