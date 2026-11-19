/* Real elapsed time is input; integer 50 ms simulation ticks are the only work unit. */
(function(root){
 'use strict';
 var TICK_MS=50,MAX_GAP_MS=5000,EPS=1e-8;
 function debug(value,forceOff){
  return DEVELOPER_MODE.normalize(value,forceOff);
 }
 function rate(){return 1;}
 function oneTick(state){return DEVELOPER_MODE.oneTick(state);}
 function ticks(state,normal){return oneTick(state)?1:Math.max(1,Math.ceil(normal));}
 function real(state,normal){return Math.max(1,Math.ceil(normal));}
 function seconds(state,normal){return ticks(state,Math.ceil(normal*20-1e-9))/20;}
 function advance(state,progress,total,step){return oneTick(state)?total:Math.min(total,(progress||0)+(step==null?1:step));}
 function elapsed(state,progress,total,step){return oneTick(state)?total:(progress||0)+(step==null?1:step);}
 function environmentRate(state){return DEVELOPER_MODE.active(state)&&state.env&&state.env.rate===10?10:1;}
 function setEnvironmentRate(state,value){if(!state.env)state.env={elapsed:0,weather:'clear',remaining:0};state.env.rate=DEVELOPER_MODE.active(state)&&Number(value)===10?10:1;return state.env.rate;}
 function environmentSeconds(state,step){return step*environmentRate(state);}
 function Clock(){this.restore(null);}
 Clock.prototype.resetElapsed=function(now){this.pendingMs=0;this.developerTicks=0;this.lastNow=Number.isFinite(now)?now:null;};
 Clock.prototype.restore=function(s){s=s||{};this.tick=Number.isFinite(s.tick)?Math.max(0,Math.floor(s.tick)):0;this.resetElapsed();this.mode='off';this.rate=1;};
 Clock.prototype.collect=function(now){if(!Number.isFinite(now))return;if(this.lastNow!==null){var delta=now-this.lastNow;if(delta<0)return;if(delta>MAX_GAP_MS){this.resetElapsed(now);return;}this.pendingMs+=delta;}this.lastNow=now;};
 Clock.prototype.setMode=function(value){this.mode=oneTick({dbg:debug(value)})?'one_tick':'normal';this.developerTicks=0;this.rate=1;};
 Clock.prototype.hasPending=function(){return this.pendingMs+EPS>=TICK_MS;};
 Clock.prototype.next=function(){
  if(this.pendingMs+EPS>=TICK_MS){this.pendingMs=Math.max(0,this.pendingMs-TICK_MS);}
  else return false;
  this.tick++;return true;
 };
 Clock.prototype.snapshot=function(){return{schema:3,tick:this.tick};};
 Clock.prototype.status=function(){return{tick:this.tick,pendingMs:this.pendingMs,developerTicks:this.developerTicks,rate:this.rate};};
 Clock.prototype.interpolation=function(now){if(this.hasPending())return 0;var extra=this.lastNow===null?0:Math.max(0,now-this.lastNow);if(extra>MAX_GAP_MS)return 0;return Math.min(TICK_MS/1000,(this.pendingMs+extra)/1000*this.rate);};
 root.GAME_TIME={TICK_MS:TICK_MS,TPS:20,debug:debug,rate:rate,oneTick:oneTick,ticks:ticks,real:real,seconds:seconds,advance:advance,elapsed:elapsed,environmentRate:environmentRate,setEnvironmentRate:setEnvironmentRate,environmentSeconds:environmentSeconds,Clock:Clock};
})(typeof window!=='undefined'?window:globalThis);
