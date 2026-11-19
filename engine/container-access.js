/* Common container facade. Transport engines never borrow each other's routes. */
(function(root){
 'use strict';
 var api={content:CONTENT,instance:function(m){return m._portDef||STRUCTURES.instance(m);},
  machines:function(b){return MULTIBLOCKS.networkMachines(b);},grid:function(b){return MULTIBLOCKS.index(b);},
  endpoint:function(m,cell,side,kind){if(!m)return null;var xy=cell.split(',').map(Number);return MULTIBLOCKS.endpoint(m,xy[0],xy[1],side,kind);}
 };
 function networkCell(b,cell){return GRID_TRANSPORTS.at(b,cell).some(function(kind){return kind!=='wire';});}
 function get(b,idx,cell,side,kind,direction,payload){if(networkCell(b,cell))return null;return TRANSPORT_PORTS.resolve(api,b,idx,cell,side,kind,direction,payload);}
 function supports(b,idx,cell,side,kind){if(networkCell(b,cell))return false;var value=TRANSPORT_PORTS.supports(api,b,idx,cell,side,kind);if(value!==undefined)return value;
  if(kind==='item'&&b.chest&&b.chest[cell])return true;
  var m=api.endpoint(idx[cell],cell,side,kind),d=m&&api.instance(m);if(!d||d.manualLogistics||d.pipeOnly)return false;
  if(m._port){var s=MULTIBLOCKS.spec(m._port.k);return m._side===side&&!!(kind==='item'?s.itemIn||s.itemOut:s.fluidIn||s.fluidOut);}
  if(d.generator&&!d.multiblock&&side===(m.outFace==null?1:m.outFace))return false;
  return kind==='item'?!!(d.slots.in||d.slots.out):!!((d.fluidInputTanks||[]).length||(d.fluidOutputTanks||[]).length||d.steamPowered||d.sharedFluidStorage);
 }
 root.CONTAINER_ACCESS={api:api,index:api.grid,resolve:get,supports:supports,networkCell:networkCell};
})(typeof window!=='undefined'?window:globalThis);
