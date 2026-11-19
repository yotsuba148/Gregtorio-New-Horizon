(function(root){
 'use strict';
 var LIMIT=2147483647;
 function supported(m){return !!(m&&DEFS.of(m.k)&&DEFS.of(m.k).digitalTank);}
 function ensure(m){if(!supported(m))return;if(m.lockFluid==null)m.lockFluid=!!m.lockedFluid;if(!m.tanksIn)m.tanksIn=[null];if(m.voidAll){m.tanksIn[0]=null;m.lockFluid=false;m.lockedFluid=null;m.voidOverflow=false;}}
 function accepts(m,f){ensure(m);return (!m.lockedFluid||m.lockedFluid===f)&&(!m.tanksIn[0]||m.tanksIn[0].f===f);}
 function room(m,f){if(!accepts(m,f))return 0;return m.voidAll||m.voidOverflow?LIMIT:Math.max(0,STRUCTURES.instance(m).fluidInputTanks[0]-(m.tanksIn[0]?m.tanksIn[0].mb:0));}
 function plan(m,f,n){var moved=Math.min(n,room(m,f));if(!Number.isSafeInteger(n)||n<0)moved=0;return{moved:moved,commit:function(){if(!moved)return;var t=m.tanksIn[0],cap=STRUCTURES.instance(m).fluidInputTanks[0];if(!m.voidAll)m.tanksIn[0]={f:f,mb:Math.min(cap,(t?t.mb:0)+moved)};if(m.lockFluid&&!m.lockedFluid)m.lockedFluid=f;}};}
 function decorate(h,m,input){if(!input||!supported(m))return h;ensure(m);h.accepts=function(f){return accepts(m,f);};h.inputRoom=function(f){return room(m,f);};h.inputPlan=function(f,n){return plan(m,f,n);};return h;}
 function configure(m,action,value){if(!supported(m))return{ok:false,code:'MACHINE'};ensure(m);
  if(action==='lock'){m.lockFluid=!!value;m.lockedFluid=m.lockFluid&&m.tanksIn[0]?m.tanksIn[0].f:null;if(m.lockFluid)m.voidAll=false;}
  else if(action==='fluid'){value=CONTENT.canonicalFluid(value);if(value&&!Object.prototype.hasOwnProperty.call(GD.fluids,value))return{ok:false,code:'FLUID'};if(value&&m.tanksIn[0]&&m.tanksIn[0].f!==value)return{ok:false,code:'CONTENTS'};m.lockedFluid=value||null;m.lockFluid=!!value;if(value)m.voidAll=false;}
  else if(action==='overflow'){m.voidOverflow=!!value;if(value)m.voidAll=false;}
  else if(action==='all'){m.voidAll=!!value;ensure(m);}
  else return{ok:false,code:'ACTION'};return{ok:true};
 }
 function controls(m){if(!supported(m))return'';ensure(m);var E=function(s){return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});};function button(id,label,on,tip){return'<button type="button" class="btn'+(on?' on':'')+'" data-tank-action="'+id+'" aria-pressed="'+!!on+'" data-tip="'+tip+'">'+label+'：'+(on?'开':'关')+'</button>';}
  return'<section class="digital-tank-controls">'+button('lock','锁定流体',m.lockFluid,'空罐开启时，锁定下一种流入的流体')+button('overflow','溢出销毁',m.voidOverflow,'保留罐内流体，销毁超出容量的部分')+button('all','全部销毁',m.voidAll,'清空罐内流体，并销毁之后流入的流体')+'<label>锁定种类<input type="search" data-tank-fluid="1" placeholder="'+(m.lockFluid?'等待下一种流体':'搜索流体')+'" value="'+E(m.lockedFluid?FLUID_PRESENTATION.name(m.lockedFluid):'')+'"'+(m.voidAll?' disabled':'')+'></label></section>';
 }
 root.DIGITAL_TANKS={supported:supported,ensure:ensure,accepts:accepts,room:room,plan:plan,decorate:decorate,configure:configure,controls:controls};
})(typeof window!=='undefined'?window:globalThis);
