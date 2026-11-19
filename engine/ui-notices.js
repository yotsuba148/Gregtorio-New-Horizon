/* One bounded, non-interactive stack for transient notifications. */
(function(root){
 'use strict';
 var serial=0;
 function host(){return document.getElementById('toast');}
 function show(html,options){
  options=options||{};var box=host();if(!box)return null;
  var node=options.key&&Array.from(box.children).find(function(n){return n.dataset.noticeKey===options.key;});
  if(!node){node=document.createElement('div');node.className='notice-bubble '+(options.kind||'');if(options.key)node.dataset.noticeKey=options.key;box.appendChild(node);}
  if(node._timer)clearTimeout(node._timer);if(node._fadeTimer)clearTimeout(node._fadeTimer);node.classList.remove('leaving');
  node.innerHTML=html;node.classList.add('on');node.dataset.noticeVersion=String(++serial);
  // A repeated receipt becomes newest; old timers cannot erase the renewed one.
  box.appendChild(node);
  while(box.children.length>5){var oldest=box.firstElementChild;clearTimeout(oldest._timer);clearTimeout(oldest._fadeTimer);oldest.remove();}
  var version=node.dataset.noticeVersion;
  node._timer=setTimeout(function(){if(node.dataset.noticeVersion===version){node.classList.add('leaving');node._fadeTimer=setTimeout(function(){if(node.dataset.noticeVersion===version)node.remove();},150);}},options.duration||4600);
  return node;
 }
 function text(message,options){return show(String(message).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}),options);}
 function clear(){var box=host();if(!box)return;Array.from(box.children).forEach(function(n){clearTimeout(n._timer);clearTimeout(n._fadeTimer);n.remove();});}
 root.UI_NOTICES={show:show,text:text,clear:clear};
})(typeof window!=='undefined'?window:globalThis);
