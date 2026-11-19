/* Shared presentation primitives. No inventory, clock or gameplay state. */
(function(root){
 'use strict';
 var paths={
  rocket:'M14 3c3-1 5-1 7 0 1 5-1 9-5 12l-7-7c1-2 3-4 5-5ZM9 8l-5 2-2 6 7-1m7 0-2 7-6-2 2-5m-4 3-3 3m10-12h.01',
  world:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM2 12h20M12 2c-5 5-5 15 0 20 5-5 5-15 0-20Z',
  craft:'M3 3h18v18H3ZM3 9h18M3 15h18M9 3v18M15 3v18',
  factory:'M3 21V10l6 3V8l7 4V3h4v18ZM6 17h2m3 0h2m3 0h2',
  search:'M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14m5-2 6 6',
  settings:'M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6M10 15v6',
  cursor:'m5 3 14 9-7 1-3 7Z',pan:'M8 11V5a2 2 0 0 1 4 0v6-7a2 2 0 0 1 4 0v7-5a2 2 0 0 1 4 0v10c0 4-3 6-7 6-3 0-5-2-6-4l-3-5a2 2 0 0 1 3-2l1 2',
  item:'M3 8h18v8H3ZM7 5v14m10-14v14',fluid:'M3 8h18v8H3ZM12 4l3 5a3 3 0 0 1-6 0Z',
  wire:'m14 2-9 12h7l-2 8 9-12h-7Z',cut:'m4 20 8-8m4-8 4 4-7 7-4-4ZM3 3l18 18',
  grid:'M3 3h18v18H3Zm0 6h18M3 15h18M9 3v18m6-18v18',
  plus:'M12 4v16M4 12h16',sort:'M4 6h16M4 12h11M4 18h6m10-7v10m-3-3 3 3 3-3',
  store:'M4 8h16v13H4ZM2 3h20v5H2Zm10 7v7m-3-3 3 3 3-3',
  book:'M12 5C9 3 5 3 2 4v16c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Zm0 0v16',
  monitor:'M3 3h18v14H3Zm5 18h8m-4-4v4',
  terminal:'m4 6 5 5-5 5m8 0h8',clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l4 2',
  home:'m3 11 9-8 9 8M6 9v12h12V9',tree:'m12 2-6 6h3l-5 6h5l-4 5h14l-4-5h5l-5-6h3Zm0 17v4',
  leaf:'M20 3C8 2 2 7 5 15s16 4 15-12ZM4 21 17 7',
  cave:'m2 21 4-13 6-6 6 6 4 13Zm6 0 2-8h4l2 8',river:'M3 7c3-4 5 4 9 0s6 4 9 0M3 12c3-4 5 4 9 0s6 4 9 0M3 17c3-4 5 4 9 0s6 4 9 0',
  grass:'m4 21-1-9 6 9-1-16 4 16 3-18 1 18 5-9-2 9',flower:'M12 13v9m0-3-5-4m5 1 5-3M12 3c6-6 10 4 4 6 6 5-4 10-4 4-3 6-12 0-5-4-6-3-1-11 5-6Z',
  sword:'m14 3 7 0 0 7-12 12-7-7ZM6 13l5 5M2 22l5-5',flag:'M4 22V3h15l-3 4 3 4H4',
  village:'m2 11 6-6 6 6M4 9v12h8V9m2-3h6v15h-6m0-12h6m-2 5h1M7 16h2v5',
  ore:'m3 9 6-6h8l4 8-5 10H7Zm0 0 7 3 7-9m-7 9 6 9m-6-9-3 9',
  flask:'M8 2h8m-6 0v7L4 20c0 1 1 2 2 2h12c1 0 2-1 2-2L14 9V2M7 15h10'
 };
 function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
 function glyph(id,size){return '<svg class="ui-glyph" viewBox="0 0 24 24" width="'+(size||16)+'" height="'+(size||16)+'" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(paths[id]||paths.grid)+'"/></svg>';}
 function rotation(){return '<span class="rotation-control"><span>方向</span><button type="button" class="btn" data-rotate="-1" aria-label="逆时针旋转90度">↶</button><button type="button" class="btn" data-rotate="1" aria-label="顺时针旋转90度">↷</button></span>';}
 function item(k,size){size=size||32;return '<span class="ui-item-frame" style="--icon-size:'+size+'px">'+(typeof root.iconOrText==='function'?root.iconOrText(k,size):'')+'</span>';}
 function title(k,title,sub){return '<div class="ui-section-title">'+item(k,32)+'<div><h2>'+esc(title)+'</h2>'+(sub?'<p>'+esc(sub)+'</p>':'')+'</div></div>';}
 function empty(k,title,sub){return '<div class="ui-empty">'+item(k,32)+'<b>'+esc(title)+'</b><p>'+esc(sub||'')+'</p></div>';}
 function mount(scope){(scope||document).querySelectorAll('[data-ui-glyph]:empty').forEach(n=>{n.innerHTML=glyph(n.dataset.uiGlyph);});(scope||document).querySelectorAll('[data-ui-item]:empty').forEach(n=>{n.innerHTML=item(n.dataset.uiItem,32);});}
 function sync(node,next){
  if(node.nodeType!==next.nodeType||node.nodeName!==next.nodeName){node.replaceWith(next.cloneNode(true));return;}
  if(node.nodeType===3){if(node.nodeValue!==next.nodeValue)node.nodeValue=next.nodeValue;return;}
  if(node.nodeType!==1||node.hasAttribute('data-ui-preserve'))return;
  // The tooltip controller has already taken ownership of title. Keep that
  // ownership when refreshing values, rather than restoring a native tooltip.
  if(node.hasAttribute('data-tip')&&!node.hasAttribute('title')&&next.hasAttribute('title')){next.setAttribute('data-tip',next.getAttribute('title'));next.removeAttribute('title');}
  Array.from(node.attributes).forEach(function(a){if(!next.hasAttribute(a.name))node.removeAttribute(a.name);});
  Array.from(next.attributes).forEach(function(a){if(node.getAttribute(a.name)!==a.value)node.setAttribute(a.name,a.value);});
  children(node,next);
 }
 function children(host,next){
  var old=Array.from(host.childNodes),wanted=Array.from(next.childNodes),key=function(n){return n.nodeType===1&&n.getAttribute('data-ui-key');};
  if(!wanted.some(key)){wanted.forEach(function(child,i){if(old[i])sync(old[i],child);else host.appendChild(child.cloneNode(true));});old.slice(wanted.length).forEach(function(child){child.remove();});return;}
  var keyed=new Map(old.filter(key).map(function(n){return[key(n),n];})),used=new Set();
  wanted.forEach(function(child,i){var id=key(child),node=id?keyed.get(id):old[i];if(node&&(used.has(node)||(!id&&key(node))))node=null;
   if(node){used.add(node);if(host.childNodes[i]!==node)host.insertBefore(node,host.childNodes[i]||null);sync(node,child);}else host.insertBefore(child.cloneNode(true),host.childNodes[i]||null);
  });old.forEach(function(node){if(!used.has(node))node.remove();});
 }
 function patch(host,html){if(!host)return;var next=document.createElement('div');next.innerHTML=html;children(host,next);}
 root.UI_KIT={rotation:rotation,glyph:glyph,item:item,title:title,empty:empty,mount:mount,sync:sync,patch:patch};
})(typeof window!=='undefined'?window:globalThis);
