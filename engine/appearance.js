(function(root){
 'use strict';
 var S,save,layer,host=null,mode='',page='',dimension='',weather='clear',particles=[];
 var defaults={skin:'light',panelTransparency:44,weatherEffects:true};
 function bounded(value,fallback,min,max){return typeof value==='number'&&Number.isFinite(value)?Math.max(min,Math.min(max,Math.round(value))):fallback;}
 function ensure(state){
  var p=state.appearance&&typeof state.appearance==='object'&&!Array.isArray(state.appearance)?state.appearance:{};
  state.appearance={
   skin:p.skin==='dark'?'dark':defaults.skin,
   panelTransparency:bounded(p.panelTransparency,defaults.panelTransparency,0,100),
   weatherEffects:typeof p.weatherEffects==='boolean'?p.weatherEffects:defaults.weatherEffects
  };
  return state.appearance;
 }
 function preferences(){return S.appearance;}
 function applyPanel(){document.documentElement.style.setProperty('--panel-opacity',String((100-preferences().panelTransparency)/100));}
 function applySkin(){var skin=preferences().skin,link=document.getElementById('light-skin');document.documentElement.dataset.uiSkin=skin;if(link)link.media=skin==='light'?'all':'not all';}
 function visibility(){if(layer)layer.toggleAttribute('data-paused',document.hidden);}
 function resize(){if(!mode||!layer)return;var box=layer.getBoundingClientRect(),count=Math.max(20,Math.min(64,Math.round(box.width*box.height/(mode==='rain'?34000:40000))));while(particles.length>count)particles.pop().remove();while(particles.length<count){var p=document.createElement('i'),duration=mode==='rain'?2.7+Math.random()*1.4:16+Math.random()*10;p.style.setProperty('--wx-x',(2+Math.random()*96)+'%');p.style.setProperty('--wx-duration',duration+'s');p.style.setProperty('--wx-delay',(-Math.random()*duration)+'s');p.style.setProperty('--wx-opacity',String(mode==='rain'?.4+Math.random()*.2:.5+Math.random()*.24));p.style.setProperty('--wx-size',(mode==='rain'?14+Math.random()*8:2.1+Math.random()*1.8)+'px');p.style.setProperty('--wx-width',(1+Math.random()*.4)+'px');p.style.setProperty('--wx-drift',(-20+Math.random()*40)+'px');layer.appendChild(p);particles.push(p);}}
 function sync(nextPage,nextDimension,nextWeather){page=nextPage;dimension=nextDimension;weather=nextWeather;if(!S)return;var allowed=page==='agri'||page==='line'||page==='world'&&dimension==='overworld',next=preferences().weatherEffects&&allowed?(weather==='snow'?'snow':weather==='rain'||weather==='thunder'?'rain':''):'';visibility();if(next===mode)return;mode=next;layer.hidden=!mode;layer.dataset.weather=mode;layer.replaceChildren();particles=[];if(mode)resize();}
 function updateControls(){if(!host||!host.isConnected)return;var p=preferences();host.querySelectorAll('[data-appearance-skin]').forEach(function(button){var selected=button.dataset.appearanceSkin===p.skin;button.classList.toggle('on',selected);button.setAttribute('aria-pressed',String(selected));});host.querySelectorAll('[data-appearance]').forEach(function(input){var key=input.dataset.appearance;if(input.type==='checkbox')input.checked=p[key];else input.value=String(p[key]);});host.querySelector('[data-panel-value]').value=p.panelTransparency+'%';}
 function render(target){if(!S||!target)return;host=target;host.innerHTML='<div class="appearance-skin-row"><span id="appearance-skin-label">界面皮肤</span><div class="appearance-skin-options" role="group" aria-labelledby="appearance-skin-label"><button type="button" class="btn" data-appearance-skin="light" aria-pressed="false">浅色</button><button type="button" class="btn" data-appearance-skin="dark" aria-pressed="false">深色</button></div></div><div class="appearance-panel-control"><label for="appearance-panel">面板透明度</label><div class="appearance-range-row"><input id="appearance-panel" data-appearance="panelTransparency" type="range" min="0" max="100" step="1"><output for="appearance-panel" data-panel-value></output><button class="btn" data-appearance-reset="1">默认</button></div><div class="appearance-range-ends"><span>不透明</span><span>透明</span></div></div><div class="appearance-preview" aria-label="面板透明度预览"><div class="appearance-preview-panel">'+root.iconOrText('minecraft:chest@0',28)+'<div><b>文字预览</b><span>世界，合成，仓库，农业，工厂</span></div></div></div><div class="appearance-switch-row"><label class="appearance-switch" for="appearance-weather"><input id="appearance-weather" data-appearance="weatherEffects" type="checkbox"><span class="appearance-switch-track" aria-hidden="true"></span><b>雨雪粒子</b></label><span class="appearance-scope">世界，农业，工厂</span></div>';
  host.querySelector('.appearance-preview').style.backgroundImage='url("bg/overworld_day.jpg")';updateControls();
  host.oninput=function(e){
   if(e.target.dataset.appearance!=='panelTransparency')return;
   var p=preferences();
   p.panelTransparency=bounded(Number(e.target.value),defaults.panelTransparency,0,100);
   applyPanel();
   host.querySelector('[data-panel-value]').value=p.panelTransparency+'%';
  };
  host.onchange=function(e){
   var key=e.target.dataset.appearance;
   if(key==='weatherEffects'){preferences().weatherEffects=e.target.checked;sync(page,dimension,weather);}
   else if(key!=='panelTransparency')return;
   if(save)save();
   updateControls();
  };
  host.onclick=function(e){var skinButton=e.target.closest('[data-appearance-skin]');if(skinButton){e.stopPropagation();var skin=skinButton.dataset.appearanceSkin;if(skin!=='light'&&skin!=='dark'||preferences().skin===skin)return;preferences().skin=skin;applySkin();updateControls();if(save)save();return;}if(!e.target.closest('[data-appearance-reset]'))return;e.stopPropagation();preferences().panelTransparency=defaults.panelTransparency;applyPanel();updateControls();if(save)save();};
 }
 function init(state,onSave){S=state;save=onSave;ensure(S);applySkin();applyPanel();layer=document.getElementById('weather-particles');GAME_TIME.setEnvironmentRate(S,GAME_TIME.environmentRate(S));root.addEventListener('resize',resize);document.addEventListener('visibilitychange',visibility);visibility();}
 root.APPEARANCE={init:init,render:render,sync:sync,ensure:ensure,snapshot:function(){return{weather:mode,particles:particles.length,running:!!mode&&!document.hidden};}};
})(typeof window!=='undefined'?window:globalThis);

STATE_SCHEMA.register("appearance",["appearance"]);
