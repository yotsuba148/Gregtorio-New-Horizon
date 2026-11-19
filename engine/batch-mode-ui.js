(function(root){
 'use strict';
 function refresh(button,m){
  if(!button)return;
  var on=BATCH_MODE.enabled(m),value=on?'on':'off';if(button.dataset.mode===value)return;
  button.dataset.mode=value;button.setAttribute('aria-pressed',String(on));
  button.firstChild.src='modicons/multiblocks/batch/batch_mode_'+value+'.png';
  button.dataset.tip='批处理：'+(on?'开':'关');button.setAttribute('aria-label',button.dataset.tip);
 }
 function mount(host,m,save){
  if(!host||!BATCH_MODE.capability(m))return;
  var button=document.createElement('button');button.type='button';button.className='mb-batch-button';button.dataset.machineBatch=m.uid;
  var icon=document.createElement('img');icon.alt='';icon.draggable=false;button.appendChild(icon);
  function toggle(e){e.preventDefault();e.stopPropagation();BATCH_MODE.set(m,!BATCH_MODE.enabled(m));refresh(button,m);if(save)save();}
  button.onclick=toggle;button.oncontextmenu=toggle;host.appendChild(button);refresh(button,m);
 }
 root.BATCH_MODE_UI={mount:mount,refresh:refresh};
})(typeof window!=='undefined'?window:globalThis);
