(function(root){
 'use strict';
  var panel,button,hooks,busy=false,reading=false,sequence=0;
 function position(){if(!panel||panel.hidden)return;var z=typeof root.uiZoom==='function'?root.uiZoom():1,w=innerWidth/z,h=innerHeight/z,r=button.getBoundingClientRect(),top=r.bottom/z+6;panel.style.width=Math.min(340,w-16)+'px';panel.style.right=Math.max(8,(innerWidth-r.right)/z)+'px';panel.style.top=top+'px';panel.style.maxHeight=Math.max(80,h-top-8)+'px';}
  function dismiss(){if(!panel)return;sequence++;if(reading){reading=false;setBusy(false);}panel.hidden=true;button.setAttribute('aria-expanded','false');}
  function error(e){var node=panel.querySelector('.saves-error');node.textContent=e&&e.name==='QuotaExceededError'?'浏览器存储空间不足':e&&e.message||'操作失败';node.hidden=false;}
  function setBusy(value){busy=value;panel.querySelectorAll('button,input').forEach(function(n){n.disabled=value;});if(!value)refresh();}
  async function importFile(file){
   if(!file||busy)return;var token=++sequence;reading=true;setBusy(true);
   try{var raw=await file.text();if(token!==sequence)return;if(!hooks.beforeSwitch())throw Error('当前进度保存失败');hooks.session.importSave(raw);reading=false;root.location.reload();}
   catch(e){if(token!==sequence)return;reading=false;setBusy(false);error(e);}
  }
 function refresh(){
  if(!hooks.session)return;var current=hooks.session.current();button.querySelector('.save-current-name').textContent=current.name;button.setAttribute('data-tip','存档：'+current.name);button.setAttribute('aria-label','存档：'+current.name);
  if(panel.hidden)return;var input=panel.querySelector('[data-save-name]');if(document.activeElement!==input)input.value=current.name;
  var list=panel.querySelector('.saves-list');list.innerHTML='';hooks.session.list().forEach(function(s){var row=document.createElement('div');row.className='saves-row'+(s.current?' current':'');var name=document.createElement('span');name.textContent=s.name;row.appendChild(name);var action=document.createElement('button');action.type='button';action.className='btn';if(s.current){action.textContent='当前';action.disabled=true;}else{action.textContent='切换';action.dataset.saveSwitch=s.id;}row.appendChild(action);list.appendChild(row);});position();
 }
 function isOpen(){return !!panel&&!panel.hidden;}
 function transition(create,id){
  if(busy)return;busy=true;panel.querySelectorAll('button,input').forEach(function(n){n.disabled=true;});
  try{if(!hooks.beforeSwitch())throw Error('当前进度保存失败，未切换存档');var slot=create?hooks.session.create():null;hooks.session.activate(slot?slot.id:id);root.location.reload();}
  catch(e){busy=false;panel.querySelectorAll('button,input').forEach(function(n){n.disabled=false;});error(e);refresh();}
 }
 function init(options){
  hooks=options;button=document.getElementById('saveopen');if(!button)return;panel=document.createElement('section');panel.id='save-slots';panel.className='saves-panel';panel.hidden=true;panel.setAttribute('aria-label','存档管理');panel.innerHTML='<div class="saves-heading"><strong>存档</strong><button type="button" class="btn" data-save-close>关闭</button></div><form class="saves-rename"><label for="save-name">当前存档名称</label><div><input id="save-name" data-save-name maxlength="32" autocomplete="off"><button type="submit" class="btn">改名</button></div></form><div class="saves-list"></div><div class="saves-error" role="status" hidden></div><div class="saves-foot"><button type="button" class="btn" data-save-create>新建存档</button><button type="button" class="btn" data-save-import>导入存档</button></div><input type="file" accept=".json,application/json" data-save-file hidden>';document.body.appendChild(panel);
  button.onclick=function(){if(isOpen()){dismiss();return;}panel.hidden=false;button.setAttribute('aria-expanded','true');panel.querySelector('.saves-error').hidden=true;try{if(!hooks.session)throw Error('存档列表无法读取，原数据已保留');refresh();}catch(e){error(e);}position();};
  panel.querySelector('form').onsubmit=function(e){e.preventDefault();if(busy)return;try{hooks.session.rename(panel.querySelector('[data-save-name]').value);panel.querySelector('.saves-error').hidden=true;refresh();}catch(e){error(e);}};
  panel.onclick=function(e){if(e.target.closest('[data-save-close]'))dismiss();else if(e.target.closest('[data-save-import]')){if(!busy)panel.querySelector('[data-save-file]').click();}else if(e.target.closest('[data-save-create]'))transition(true);else{var target=e.target.closest('[data-save-switch]');if(target)transition(false,target.dataset.saveSwitch);}};
  panel.querySelector('[data-save-file]').onchange=function(e){var file=e.target.files[0];e.target.value='';importFile(file);};
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&isOpen()){e.preventDefault();e.stopPropagation();dismiss();button.focus();}});
  window.addEventListener('resize',position);window.addEventListener('storage',function(e){if(e.key===SAVE_SLOTS.indexKey){try{refresh();}catch(e){if(isOpen())error(e);}}});
  try{refresh();}catch(e){button.setAttribute('aria-label','存档管理');}
 }
 root.SAVE_SLOTS_UI={init:init,refresh:refresh,dismiss:dismiss,isOpen:isOpen};
})(typeof window!=='undefined'?window:globalThis);
