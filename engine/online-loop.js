(function(root){
 'use strict';
 // A worker supplies wakeups; the game state and its one simulation clock stay on the main thread.
 function heartbeat(){
  var waiting=false;
  setInterval(function(){if(waiting)return;waiting=true;postMessage(performance.timeOrigin+performance.now());},50);
  onmessage=function(){waiting=false;};
 }
 function create(options){
  var worker=null,timer=0,channel=null,running=false,queued=false,generation=0;
  function run(){if(!running)return;options.advance();if(options.pending()&&!queued){queued=true;channel.port2.postMessage(generation);}}
  function fallback(error){
   if(worker){worker.terminate();worker=null;}
   options.error(error);if(running&&!timer)timer=setInterval(run,50);
  }
  function start(){
   if(running)return;running=true;generation++;options.reset();
   channel=new MessageChannel();channel.port1.onmessage=function(e){if(!running||e.data!==generation)return;queued=false;run();};
   var url;
   try{
    url=URL.createObjectURL(new Blob(['('+heartbeat.toString()+')()'],{type:'text/javascript'}));
    worker=new Worker(url);
    var current=worker;
    worker.onmessage=function(e){
     if(!running||worker!==current)return;
     // Queued messages from a suspended renderer are wakeups, never time credits.
     run();if(worker===current)current.postMessage('ack');
    };
    worker.onerror=function(e){if(worker===current)fallback(e.message||'Online heartbeat worker failed');};
   }catch(e){fallback(e);}
   finally{if(url)URL.revokeObjectURL(url);}
  }
  function stop(){running=false;generation++;queued=false;if(worker)worker.terminate();worker=null;if(timer)clearInterval(timer);timer=0;if(channel){channel.port1.close();channel.port2.close();channel=null;}}
  function resync(){if(!running)return;generation++;queued=false;options.reset();}
  return{start:start,stop:stop,resync:resync};
 }
 root.ONLINE_LOOP={create:create};
})(typeof window!=='undefined'?window:globalThis);
