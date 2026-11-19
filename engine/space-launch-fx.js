(function(root){
 'use strict';
 // Visual feedback only. The caller owns the flight, resource payment and landing.
 function play(options){
  var bounds=options.bounds.getBoundingClientRect(),anchor=options.anchor.getBoundingClientRect();
  var x=Math.max(24,Math.min(bounds.width-24,anchor.left+anchor.width/2-bounds.left));
  var y=Math.max(24,Math.min(bounds.height-24,anchor.top+anchor.height/2-bounds.top));
  var reduced=root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var layer=document.createElement('div'),trail=document.createElement('i'),flash=document.createElement('i'),animations=[],finished=false;
  layer.className='space-launch-fx';layer.setAttribute('aria-hidden','true');
  layer.style.zoom=String(1/Number(getComputedStyle(document.documentElement).zoom));
  Object.assign(layer.style,{left:bounds.left+'px',top:bounds.top+'px',width:bounds.width+'px',height:bounds.height+'px'});
  layer.style.setProperty('--launch-x',x+'px');layer.style.setProperty('--launch-y',y+'px');
  trail.className='space-launch-trail';flash.className='space-launch-flash';layer.append(flash,trail);document.body.appendChild(layer);
  function clear(){layer.remove();animations.forEach(function(a){a.cancel();});}
  function finish(){if(finished)return;finished=true;clear();options.onFinish();}
  var rise=Math.max(180,y+180),duration=reduced?140:1050;
  animations.push(flash.animate([{opacity:0,transform:'translate(-50%,-50%) scale(.2)'},{opacity:.65,offset:.2},{opacity:0,transform:'translate(-50%,-50%) scale(1.7)'}],{duration:reduced?140:420,fill:'forwards'}));
  var flight=trail.animate(reduced?[{opacity:.35},{opacity:0}]:[
   {opacity:0,transform:'translateY(12px) scale(.6)',offset:0},
   {opacity:1,transform:'translateY(0) scale(.85)',offset:.12},
   {opacity:1,transform:'translateY('+(-rise*.25)+'px) scale(1)',offset:.5},
   {opacity:0,transform:'translateY('+(-rise)+'px) scale(.65)',offset:1}
  ],{duration:duration,easing:'cubic-bezier(.45,0,.85,.5)',fill:'forwards'});animations.push(flight);
  if(!reduced)for(var i=0;i<10;i++){
   var spark=document.createElement('i');spark.className='space-launch-spark';layer.appendChild(spark);
   var side=(i%2?1:-1)*(12+i*5),up=22+(i%4)*19;
   animations.push(spark.animate([{opacity:0,transform:'translate(0,0) scale(1)'},{opacity:.9,offset:.18},{opacity:0,transform:'translate('+side+'px,'+(-up)+'px) scale(.2)'}],{duration:560+i*22,delay:i*18,fill:'both',easing:'ease-out'}));
  }
  flight.onfinish=finish;
  return{cancel:function(){if(finished)return;finished=true;clear();}};
 }
 root.SPACE_LAUNCH_FX={play:play};
})(typeof window!=='undefined'?window:globalThis);
