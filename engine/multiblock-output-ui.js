(function(root){
 'use strict';
 function refresh(button,m){
  if(!button)return;
  var mode=MULTIBLOCK_OUTPUT.mode(m);
  if(button.dataset.mode===mode.id)return;
  button.dataset.mode=mode.id;
  button.style.backgroundImage='url("modicons/multiblocks/voiding/standard'+(mode.id==='none'?'':'_pressed')+'.png")';
  button.firstChild.src='modicons/multiblocks/voiding/void_excess_'+mode.id+'.png';
  button.dataset.tip='销毁模式：'+mode.text+'\n左键切换，右键反向切换';
  button.setAttribute('aria-label','销毁模式：'+mode.text);
 }
 function mount(host,m,save){
  if(!host||!MULTIBLOCK_OUTPUT.supported(m))return;
  var button=document.createElement('button');
  button.type='button';button.className='mb-voiding-button';button.dataset.multiblockVoiding=m.uid;
  var img=document.createElement('img');img.alt='';img.draggable=false;button.appendChild(img);
  function change(e,which){e.preventDefault();e.stopPropagation();if(MULTIBLOCK_OUTPUT.cycle(m,which)){refresh(button,m);if(save)save();}}
  button.onclick=function(e){change(e,0);};
  button.oncontextmenu=function(e){change(e,2);};
  host.appendChild(button);refresh(button,m);
 }
 root.MULTIBLOCK_OUTPUT_UI={mount:mount,refresh:refresh};
})(typeof window!=='undefined'?window:globalThis);
