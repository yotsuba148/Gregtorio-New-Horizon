(function(root){
 'use strict';
 const path='bg/world-map/';
 const background=key=>path+key+'-extended.webp';
 const backgrounds=Object.fromEntries(['day','night','rain','night-rain','snow','night-snow'].map(key=>[key,background(key)]));
 const frameSize={width:1672,height:941,backgroundWidth:2520};
 const layer=(file,x,y,width,height,night,rain,order=1,clip=null)=>({file:path+file+'.webp',x,y,width,height,night,rain,order,clip});
 // Both broken pillars are cutouts of the complete frame. Their footing and painting are identical.
 const frame=(clip=null)=>layer('nether-frame',1409,672,100,88,.69,.83,2,clip);
 root.WORLD_MAP_ART={
  overworld:{...frameSize,backgrounds,layers:{
   'nether-left':frame('polygon(0 37%, 33% 48%, 33% 100%, 0 100%)'),
   'nether-right':frame('polygon(45% 79%, 100% 73%, 100% 100%, 45% 100%)'),
   'nether-frame':frame(),
   'nether-active':layer('nether-active',1412,696,43,81,.87,.91),
   'twilight-active':layer('twilight-active',171,601,76,37,.81,.93),
   cauldron:layer('cauldron',524,499,48,39,.68,.83)
  }},
  nether:{...frameSize,backgrounds:{day:background('nether')},layers:{}},
  twilight:{...frameSize,backgrounds:{day:background('twilight')},layers:{}},
  end:{...frameSize,backgrounds:{day:background('end')+'?v=arena-20261118'},layers:{}}
 };
})(globalThis);
