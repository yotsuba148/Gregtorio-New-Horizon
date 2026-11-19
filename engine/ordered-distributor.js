/* Ordered logistics: owns only its received bundle and its output hatch buffers. */
(function(root){
 'use strict';
 var D=DISTRIBUTOR_CONTENT,TX=GTTransactions,prepared=new WeakSet(),DIR=[[0,-1],[1,0],[0,1],[-1,0]],inletSides=[0,1,3];
 function is(m){return !!m&&m.k===D.key;}
 function length(m){return MULTIBLOCKS.dimensionsOf(m).length||1;}
 function segment(face){return Number(face.split(',')[1]);}
 function orderedOutputs(m){
  var outputs={items:[],fluids:[]},ports=MULTIBLOCKS.ports(m).slice();
  ports.sort(function(a,b){return segment(a.face)-segment(b.face);});
  ports.forEach(function(p){var s=MULTIBLOCKS.spec(p.k);if(s.itemOut)outputs.items.push(p);if(s.fluidOut)outputs.fluids.push(p);});
  return outputs;
 }
 function destinationSegment(bundle,field,index){return bundle.faces?segment(bundle.faces[field][index]):index+1;}
 function ensure(m){
  if(!m.distribution)m.distribution={version:1,bundle:null,lastReceipt:null};var state=m.distribution;
  if(prepared.has(state))return state;
  if(state.version!==1||state.lastReceipt!=null&&typeof state.lastReceipt!=='string')throw Error('Invalid distributor save');
  var b=state.bundle;if(b){
   if(!Array.isArray(b.items)||!Array.isArray(b.fluids)||b.items.length>D.maxPositions||b.fluids.length>D.maxPositions)throw Error('Invalid distributor bundle');
   if(b.faces&&['items','fluids'].some(function(field){
    var faces=b.faces[field];
    return !Array.isArray(faces)||faces.length!==b[field].length||faces.some(function(face){return typeof face!=='string'||!/^0,[1-9]\d*,[13]$/.test(face)||segment(face)>length(m);});
   }))throw Error('Invalid distributor output faces');
   b.items.forEach(function(s){if(s&&(!CONTENT.item(s.k)||!Number.isSafeInteger(s.n)||s.n<1))throw Error('Invalid distributor item');});
   b.fluids.forEach(function(t){if(t&&(typeof t.f!=='string'||!Number.isSafeInteger(t.mb)||t.mb<1))throw Error('Invalid distributor fluid');});
  }
  prepared.add(state);return state;
 }
 function inletFace(side){return '0,0,'+side;}
 function head(m){var side=m.distribution&&m.distribution.inletSide;return MULTIBLOCKS.worldFace(m,inletFace(inletSides.includes(side)?side:0));}
 function inlets(m){return inletSides.map(function(side){return{localSide:side,side:MULTIBLOCKS.worldFace(m,inletFace(side)).side};});}
 function setInlet(m,side){if(!is(m)||!inletSides.includes(side))return false;ensure(m).inletSide=side;return true;}
 function live(m){return ENTITIES.active(m)&&ENTITIES.isGrid(m);}
 function headMatches(m,cell,side){var p=head(m);return p.x+','+p.y===cell&&p.side===side;}
 function senderMatches(m,source){var p=head(m),d=DIR[p.side];return live(m)&&source.type==='me_dual_interface'&&source.board===m.location.blueprintId&&source.x===p.x+d[0]&&source.y===p.y+d[1]&&source.side===(p.side+2)%4;}
 function hasBundle(m){var b=ensure(m).bundle;return !!b&&(b.items.some(Boolean)||b.fluids.some(Boolean));}
 function resource(stack,kind){if(kind==='fluid')return {kind:'fluid',key:stack.f,amount:stack.mb};var attributes=TX.clone(stack);delete attributes.k;delete attributes.n;return {kind:'item',key:stack.k,amount:stack.n||1,attributes:attributes};}
 function identity(r){return JSON.stringify([r.kind,r.key,r.attributes||{}]);}
 function totals(list){var map=new Map();list.forEach(function(r){var id=identity(r);map.set(id,(map.get(id)||0)+r.amount);});return Array.from(map).sort(function(a,b){return a[0].localeCompare(b[0]);});}
 function pendingResources(b){return b?b.items.filter(Boolean).map(function(s){return resource(s,'item');}).concat(b.fluids.filter(Boolean).map(function(t){return resource(t,'fluid');})):[];}
 function offer(m,cell,side,packet,source){
  var state=ensure(m);if(!senderMatches(m,source)||!headMatches(m,cell,side))return {ok:false,code:'MACHINE_INPUT'};
  if(!MACHINE_CONTROL.allowed(m,DEFS.of(m.k)))return {ok:false,code:'DISABLED'};
  MULTIBLOCKS.validate(m);if(!m.structure.formed)return {ok:false,code:'STRUCTURE'};
  if(hasBundle(m))return {ok:false,code:'BLOCKING'};
  if(packet.id===state.lastReceipt)return {ok:false,code:'CHANGED'};
  var positions=packet.positions,items=[],fluids=[],received=[];
  if(!Array.isArray(positions))return {ok:false,code:'PATTERN'};
  for(var position of positions){
   // One concrete resource per original input slot. Split alternatives cannot
   // stand for one ordered machine input; the sender retains the complete offer.
   if(position.length!==1)return {ok:false,code:'MACHINE_INPUT'};
   var r=position[0];if(!r||!['item','fluid'].includes(r.kind)||!Number.isSafeInteger(r.amount)||r.amount<1)return {ok:false,code:'PATTERN'};
   received.push(r);
   if(r.kind==='item')items.push(Object.assign({k:r.key,n:r.amount},TX.clone(r.attributes||{})));
   else fluids.push({f:r.key,mb:r.amount});
  }
  if(!received.length||items.length>length(m)||fluids.length>length(m))return {ok:false,code:'MACHINE_INPUT'};
  if(JSON.stringify(totals(received))!==JSON.stringify(totals(packet.inputs)))return {ok:false,code:'PATTERN'};
  var outputs=orderedOutputs(m);
  if(outputs.items.length<items.length||outputs.fluids.length<fluids.length)return {ok:false,code:'MACHINE_INPUT'};
  var faces={items:outputs.items.slice(0,items.length).map(function(p){return p.face;}),fluids:outputs.fluids.slice(0,fluids.length).map(function(p){return p.face;})};
  var layout=JSON.stringify(MULTIBLOCKS.ports(m).map(function(p){return[p.uid,p.k,p.face];})),geometry=JSON.stringify([m.x,m.y,m.rotation,m.location]);
  return {ok:true,owner:state,fields:['bundle','lastReceipt'],values:{bundle:{items:items,fluids:fluids,faces:faces},lastReceipt:packet.id},
   valid:function(){return is(m)&&senderMatches(m,source)&&MACHINE_CONTROL.allowed(m,DEFS.of(m.k))&&m.structure.formed&&JSON.stringify([m.x,m.y,m.rotation,m.location])===geometry&&JSON.stringify(MULTIBLOCKS.ports(m).map(function(p){return[p.uid,p.k,p.face];}))===layout;}};
 }
 function output(m,position,kind){return MULTIBLOCKS.ports(m).find(function(p){var s=MULTIBLOCKS.spec(p.k);return segment(p.face)===position&&(kind==='item'?s.itemOut:s.fluidOut);});}
 function destinationPort(m,bundle,field,index){
  var item=field==='items';
  // Orders accepted before output faces were saved still use their original segment numbers.
  if(!bundle.faces)return output(m,index+1,item?'item':'fluid');
  var p=MULTIBLOCKS.at(m,bundle.faces[field][index]),s=p&&MULTIBLOCKS.spec(p.k);
  return s&&(item?s.itemOut:s.fluidOut)?p:null;
 }
 function tick(m,context){
  if(!m.structure||!m.structure.formed){m.status={code:'STRUCTURE',text:'结构不完整'};return false;}
  if(!hasBundle(m)){m.status={code:'ITEM_INPUT',text:'等待ME二合一接口投料'};return false;}
  if(context.tick%5)return false;
  var b=ensure(m).bundle,changed=false,blocked=false,missing='';
  b.items.forEach(function(s,i){if(!s)return;var p=destinationPort(m,b,'items',i);if(!p){if(!missing)missing='第 '+destinationSegment(b,'items',i)+' 段缺少物品出口';blocked=true;return;}var result=CORE.transferSlot({from:CORE.slotBox(b.items),index:i,to:CORE.slotBox(p.items)});changed=!!result.moved||changed;if(b.items[i])blocked=true;});
  b.fluids.forEach(function(t,i){if(!t)return;var p=destinationPort(m,b,'fluids',i);if(!p){if(!missing)missing='第 '+destinationSegment(b,'fluids',i)+' 段缺少流体出口';blocked=true;return;}var s=MULTIBLOCKS.spec(p.k);if(p.lockedFluid&&p.lockedFluid!==t.f){blocked=true;return;}var amount=Math.min(t.mb,CORE.fluidRoom(p.tanks[0],t.f,s.capacity));if(amount){var fill=TRANSPORT_PORTS.fluidPlan({tanks:p.tanks,caps:[s.capacity]},t.f,amount,true);fill.commit();b.fluids[i]=t.mb===amount?null:{f:t.f,mb:t.mb-amount};changed=true;}if(b.fluids[i])blocked=true;});
  if(!hasBundle(m))ensure(m).bundle=null;
  m.status=blocked?{code:'ITEM_OUTPUT',text:missing||'等待出料空间'}:{code:'DISTRIBUTING',text:'分发物料'};return changed;
 }
 var profile={id:'ordered_distributor',name:'分料器',key:D.key,fields:['length'],dimensions:[{key:'length',label:'分料位置',min:1,max:D.maxPositions,initial:1}],upgrades:[],
  build:function(v){return {parts:[{k:D.casing,n:v.length||1}]};},casingKeys:function(){return[D.casing];},portReplacesCasing:function(){return false;},
  visualPattern:function(m){return ['C'].concat(Array(length(m)).fill('s'));},controllerIcon:'modicons/distributor/controller.svg',
  checkPortLayout:function(m,ports,errors){if(!ports.length)errors.push('装一个输出总线、输出仓或输出总成');},
  portNumber:function(m,p){var outputs=orderedOutputs(m),labels=['第 '+segment(p.face)+' 段'];
   var item=outputs.items.indexOf(p),fluid=outputs.fluids.indexOf(p);
   if(item>=0)labels.push('物品 '+(item+1));if(fluid>=0)labels.push('流体 '+(fluid+1));
   return '，'+labels.join(' · ');
  },
  materialKey:function(m,c,ch){return ch==='C'?null:D.casing;},
  allowedFace:function(m,f,s){return f.y>0&&(f.side===1||f.side===3)&&!s.me&&!s.steamComponent&&['itemOut','fluidOut'].includes(s.type);},
  limits:function(m,list){var positions=new Set();for(var p of list){var i=+p.face.split(',')[1],s=MULTIBLOCKS.spec(p.k);for(var kind of ['itemOut','fluidOut'])if(s[kind]){var id=i+':'+kind;if(positions.has(id))return false;positions.add(id);}}return true;},
  endpoint:function(m,x,y,side,kind){if(!is(m)||!['item','fluid'].includes(kind)||!headMatches(m,x+','+y,side))return;return {uid:m.uid+':inlet',k:m.k,x:x,y:y,location:m.location,_owner:m,_inputKinds:[],_outputKinds:[],_portDef:DEFS.of(m.k),ins:[],outs:[],tanksIn:[],tanksOut:[]};},
  onDisassemble:function(m){ensure(m).bundle=null;}
 };
 STRUCTURES.register(profile);MULTIBLOCKS.registerShape(profile.id,{w:1,h:2,cx:0,cy:0,resize:function(v){return {h:1+(v.length||1)};}});
 ENGINE.registerBehavior('ordered_distributor',{voidProtection:false,signature:function(m){return ensure(m).bundle;},ensure:ensure,tick:tick,acceptsItem:function(){return false;},acceptsFluid:function(){return false;},status:function(m,d,make){return make(hasBundle(m)?m.status&&m.status.code==='ITEM_OUTPUT'?'blocked':'running':'waiting',m,m.status&&m.status.text);}});
 PATTERN_RECEIVERS.register('ordered_distributor',function(m,cell,side){if(!is(m))return;return {offer:function(packet,source){return offer(m,cell,side,packet,source);},resources:function(value){var list=pendingResources(value.bundle);MULTIBLOCKS.ports(m).forEach(function(p){(p.items||[]).filter(Boolean).forEach(function(s){list.push(resource(s,'item'));});(p.tanks||[]).filter(Boolean).forEach(function(t){list.push(resource(t,'fluid'));});});return list;}};});
 ITEM_STORES.registerEntity('ordered-distributor',function(S,m){if(!is(m))return;var b=ensure(m).bundle;return {views:b?[ITEM_STORES.view(m.uid+':distribution',b.items,b.items,{clear:function(){ensure(m).bundle=null;}})]:[]};});
 root.ORDERED_DISTRIBUTOR={is:is,head:head,inlets:inlets,setInlet:setInlet,ensure:ensure,output:output,pending:hasBundle,destinationSegment:destinationSegment};
})(typeof window!=='undefined'?window:globalThis);
