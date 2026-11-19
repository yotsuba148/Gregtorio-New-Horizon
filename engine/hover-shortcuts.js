/* 画布快捷键：鼠标停在单方块机器/发电机上时，方向键改出口面或变压器特殊面；
   停在管道或线缆格上时，方向键开关该侧连接。多方块与仓室不参与。
   这里只负责指针跟踪、键位和提示；改数据一律走 FACTORY.setFace / GRID_TRANSPORTS.set。 */
(function(root){
 'use strict';
 var SIDE = {ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3};
 var NAMES = ['上侧', '右侧', '下侧', '左侧'];
 var hover = null, hoverKey = '', frame = 0, lastPoint = null, highlighted = null;

 // 游戏状态在页面里是顶层绑定（let），不一定是 window 属性，所以按标识符取。
 function state(){
  try { return (typeof S !== 'undefined' && S) ? S : null; } catch (e) { return null; }
 }
 function saveState(){ if(typeof root.save === 'function') root.save(); }
 function toast(text){ if(root.UI_NOTICES && root.UI_NOTICES.show) root.UI_NOTICES.show(text); }

 function typing(el){
  if(!el) return false;
  var tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
 }
 function inPopup(el){
  return !!(el && el.closest && el.closest('#popup'));
 }
 function blocked(e){
  if(typing(e.target)) return true;
  // 光标停在浮窗里时不抢方向键；停在画布上照常生效
  if(inPopup(lastPoint && lastPoint.target) || inPopup(e.target)) return true;
  if(document.body.classList.contains('dragging') || document.body.classList.contains('item-drag')) return true;
  return false;
 }

 function paint(el){
  if(highlighted === el) return;
  if(highlighted) highlighted.classList.remove('hs-hover');
  highlighted = el || null;
  if(highlighted) highlighted.classList.add('hs-hover');
 }
 function targetAt(e){
  var F = root.FACTORY;
  if(!F || !F.hoverTarget) return null;
  var s=state(),selected=e.target&&e.target.closest&&e.target.closest('.fx-connection-editor')&&F.selectedTransport&&F.selectedTransport(s);
  if(selected){var xy=selected.cell.split(',').map(Number);return{x:xy[0],y:xy[1],machine:null,el:null,pipes:[selected.kind]};}
  var t = F.hoverTarget(e);
  if(!t) return null;
  var pipes = root.GRID_TRANSPORTS && s ? GRID_TRANSPORTS.at(BLUEPRINTS.view(BLUEPRINTS.ensure(s)),t.x+','+t.y) : [];
  return {x: t.x, y: t.y, machine: t.machine, el: t.el, pipes: pipes};
 }
 function refresh(){
  frame = 0;
  if(!lastPoint) return;
  var t = targetAt(lastPoint);
  var key = t ? (t.x + ',' + t.y + ':' + (t.machine ? 'm' : t.pipes.join('+'))) : '';
  hover = t;
  paint(t && t.machine ? t.el : null);
  hoverKey = key;
 }

 function facingDefinition(m){
  var d = (root.STRUCTURES && STRUCTURES.instance(m)) || (root.DEFS && DEFS.of(m.k));
  return d && !d.multiblock && !d.requiresStructure ? d : null;
 }
 function applyFace(side){
  var s = state(), m = hover && hover.machine;
  if(!s || !m) return false;
  var d = facingDefinition(m);
  if(!d || !FACTORY.setFace(m.uid, side, s, saveState)) return false;
  toast((d.transformer ? '特殊面：' : '出口面：') + NAMES[side]);
  return true;
 }
 function applyPipe(side){
  var s = state();
  if(!s || !root.GRID_TRANSPORTS) return false;
  var cell = hover.x + ',' + hover.y;
  var board=BLUEPRINTS.view(BLUEPRINTS.ensure(s)),selected=FACTORY.selectedTransport&&FACTORY.selectedTransport(s,cell);
  var kinds = selected?[selected.kind]:GRID_TRANSPORTS.at(board,cell);
  if(!kinds.length) return false;
  var on = false, changed = false;
  kinds.forEach(function(kind){
   var next = !GRID_TRANSPORTS.connected(board,kind,cell,side);
   var r = GRID_TRANSPORTS.set(s,kind,cell,side,next);
   if(r && r.ok){ changed = true; on = next; }
  });
  if(changed){saveState();if(FACTORY.refreshTransportConnections)FACTORY.refreshTransportConnections(s);toast(NAMES[side] + '：' + (on ? '已连接' : '已断开'));}
  return changed;
 }

 function overCanvas(){
  return !!(lastPoint && lastPoint.target && lastPoint.target.closest && lastPoint.target.closest('.fx-viewport'));
 }
 function onKey(e){
  if(!(e.key in SIDE)) return;
  if(blocked(e)) return;
  if(e.repeat){if(overCanvas())e.preventDefault();return;}
  if(lastPoint)refresh();
  var handled = false;
  if(hover && hover.machine) handled = applyFace(SIDE[e.key]);
  else if(hover && hover.pipes && hover.pipes.length) handled = applyPipe(SIDE[e.key]);
  // 画布上不再用方向键平移视图
  if(handled || overCanvas()) e.preventDefault();
 }

 function onMove(e){
  var target = e.target && e.target.closest ? e.target : document.body;
  lastPoint = {clientX: e.clientX, clientY: e.clientY, target: target};
  if(frame) return;
  frame = root.requestAnimationFrame ? requestAnimationFrame(refresh) : setTimeout(refresh, 16);
 }

 function install(){
  document.addEventListener('pointermove', onMove, {passive: true});
  document.addEventListener('keydown', onKey);
  if(root.document) document.addEventListener('mouseleave', function(){ hover = null; paint(null); }, {passive: true});
 }

 root.HOVER_SHORTCUTS = {
  install: install,
  target: function(){ return hover; },
  face: function(side){ return applyFace(side | 0); },
  pipe: function(side){ return applyPipe(side | 0); }
 };

 // 纯逻辑环境（测试）没有 document，不安装监听
 if(typeof document !== 'undefined'){
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
 }
})(typeof window !== 'undefined' ? window : globalThis);
