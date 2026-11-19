(function(root){
 'use strict';
 var DAY=1200,YEAR_DAYS=360,MONTH_DAYS=30;
 function calendar(elapsed){var total=Math.floor(elapsed/DAY),month=Math.floor(total%YEAR_DAYS/MONTH_DAYS)+1;return {dayNo:total+1,year:Math.floor(total/YEAR_DAYS)+1,month:month,date:total%MONTH_DAYS+1,season:month>=3&&month<=5?'春':month>=6&&month<=8?'夏':month>=9&&month<=11?'秋':'冬'};}
 function setWeather(S,weather,duration){S.env.weather=weather;S.env.remaining=duration==null?90+Math.random()*150:duration;}
 function advance(S,dt){var e=S.env;e.elapsed+=dt;e.remaining-=dt;if(e.remaining>0)return;var r=Math.random();setWeather(S,calendar(e.elapsed).season==='冬'?(r<.6?'clear':'snow'):(r<.6?'clear':r<.9?'rain':'thunder'));}
 root.ENVIRONMENT={daySeconds:DAY,calendar:calendar,setWeather:setWeather,advance:advance};
 STATE_SCHEMA.register('environment',['env'],{env:function(value){return Object.assign({},value,{rate:1});}});
})(typeof window!=='undefined'?window:globalThis);
