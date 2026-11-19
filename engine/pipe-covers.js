(function(root){
 'use strict';
 function valid(side){return Number.isInteger(side)&&side>=0&&side<4;}
 function at(pipe,side){return (pipe.covers||[]).find(function(c){return c.side===side;})||null;}
 function spec(k,kind){var s=root.MACHINE_COVERS?MACHINE_COVERS.spec(k):COMMANDS.coverSpec(k);return s&&(s.kind===kind||s.kind==='both')?s:null;}
 function write(pipe,side,value){pipe.covers=(pipe.covers||[]).filter(function(c){return c.side!==side;});if(value)pipe.covers.push(Object.assign({},value,{side:side}));pipe.covers.sort(function(a,b){return a.side-b.side;});}
 function configure(pipe,side,values){var c=at(pipe,side);if(!valid(side)||!c)return{ok:false,code:'COVER'};
  if(values.mode!=null&&!['import','export'].includes(values.mode))return{ok:false,code:'MODE'};
  if(values.mode!=null)c.mode=values.mode;if(values.allowOpposite!=null)c.allowOpposite=!!values.allowOpposite;
  if(c.type==='plate'){if(values.passItems!=null)c.passItems=!!values.passItems;if(values.passFluids!=null)c.passFluids=!!values.passFluids;}
  return{ok:true};
 }
 function allows(pipe,side,kind,direction){
  if(kind==='fluid'&&direction==='import'&&((pipe.disabledInputs||0)&1<<side))return false;
  var c=at(pipe,side);if(!c)return true;if(c.type==='plate')return !!c[kind==='item'?'passItems':'passFluids'];
  var media=root.TRANSPORT_PORTS?TRANSPORT_PORTS.coverKind(c,kind):c.kind;return media!==kind||!!c.allowOpposite||c.mode===direction;
 }
 function setInput(pipe,side,allow){if(!valid(side))return{ok:false,code:'SIDE'};pipe.disabledInputs=allow?(pipe.disabledInputs||0)&~(1<<side):(pipe.disabledInputs||0)|1<<side;return{ok:true};}
 root.PIPE_COVERS={at:at,spec:spec,write:write,configure:configure,allows:allows,setInput:setInput};
})(typeof window!=='undefined'?window:globalThis);
