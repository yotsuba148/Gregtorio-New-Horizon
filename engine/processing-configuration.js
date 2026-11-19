/* Receiver-owned virtual configuration. Plans contain no AE storage or order state. */
(function(root){
 'use strict';
 var TX=GTTransactions;
 function owner(machine,port,side){
  if(port&&MULTIBLOCKS.live(machine)&&MULTIBLOCKS.byUid(machine,port.uid)!==port)return null;
  var inlet=PROCESSING_ACCESS.inlet(machine,port,side);
  if(inlet&&inlet.code)return null;
  return inlet&&inlet.configuration||(PROCESSING_ACCESS.isProcessingOwner(machine.k)?machine:null);
 }
 function sameValue(a,b){
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  var keys=Object.keys(a);
  return keys.length===Object.keys(b).length&&keys.every(function(key){
   return Object.hasOwn(b,key)&&sameValue(a[key],b[key]);
  });
 }
 function circuitConflict(instructions){
  var first;
  for(var instruction of instructions){
   if(instruction.kind!=='circuit'&&instruction.kind!=='resetCircuit')continue;
   var value=instruction.kind==='circuit'?instruction.number:null;
   if(first!==undefined&&first!==value)return true;
   first=value;
  }
  return false;
 }
 function plan(machine,port,side,instructions,options){
  if(!instructions.length)return {ok:true,values:{},fields:[]};
  if(circuitConflict(instructions))return {ok:false,code:'CIRCUIT_CONFLICT'};
  var target=owner(machine,port,side);if(!target)return {ok:false,code:'CONFIGURATION_SLOT'};
  var values={},items=[],circuitSeen=false,missingOnly=options&&options.missingOnly;
  for(var instruction of instructions){
   if(instruction.kind==='circuit'||instruction.kind==='resetCircuit'){
    if(instruction.kind==='circuit'&&(!Number.isInteger(instruction.number)||instruction.number<0||instruction.number>24))return {ok:false,code:'CIRCUIT'};
    if(circuitSeen)continue;circuitSeen=true;
    if(missingOnly&&target.circuitConfigured){
     if(instruction.kind!=='circuit'||target.circ!==instruction.number)return {ok:false,code:'CONFIG_CONFLICT'};
     continue;
    }
    values.circ=instruction.kind==='circuit'?instruction.number:0;values.circuitConfigured=instruction.kind==='circuit';
   }else if(instruction.kind==='item'){
    var item=instruction.item;if(!item||!CONTENT.item(item.k)||!Number.isSafeInteger(item.n)||item.n<1)return {ok:false,code:'CONFIGURATION_ITEM'};
    items.push(TX.clone(item));
   }else return {ok:false,code:'CONFIGURATION_TYPE'};
  }
  if(items.length){
   var current=target.configurationItems||(target.configurationItem?[target.configurationItem]:[]);
   if(missingOnly&&current.length){
    if(!sameValue(items,current))return {ok:false,code:'CONFIG_CONFLICT'};
   }else{
    values.configurationItems=items;values.configurationItem=items[0];
   }
  }
  return {ok:true,target:target,values:values,fields:Object.keys(values),
   valid:function(){return owner(machine,port,side)===target;}};
 }
 function commit(prepared){
  if(!prepared.ok)return prepared;if(prepared.valid&&!prepared.valid())return {ok:false,code:'SOURCE_CHANGED'};
  prepared.fields.forEach(function(k){prepared.target[k]=TX.clone(prepared.values[k]);});return {ok:true};
 }
 root.PROCESSING_CONFIGURATION={plan:plan,commit:commit,circuitConflict:circuitConflict};
})(typeof window!=='undefined'?window:globalThis);
