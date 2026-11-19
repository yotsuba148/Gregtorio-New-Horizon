/* 核反应堆窗口：只读展示 6×9 固定布局、燃料切换与状态。 */
(function (root) {
  'use strict';


  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function icon(key, size) {
    return root.iconOrText ? root.iconOrText(key, size || 34) : esc(key);
  }

  function data() { return (root.GD && GD.reactor) || { layout: [], fuels: [] }; }

  function supported(m) {
    var d = root.DEFS && DEFS.of(m && m.k);
    return !!d && d.behavior === 'gt_ic2_reactor';
  }

  function layoutHtml() {
    var d = data(), f = null, cells = [];
    d.layout.forEach(function (row) {
      for (var i = 0; i < row.length; i++) cells.push(row[i]);
    });
    return '<div class="rx-grid">' + cells.map(function (c) {
      var kind = c === 'C' ? 'coolant' : 'rod';
      return '<div class="rx-cell" data-kind="' + kind + '"></div>';
    }).join('') + '</div>';
  }

  function fuelButtons(m) {
    var d = data(), mode = (m.reactor && m.reactor.mode) || (d.fuels[0] || {}).id;
    return '<div class="rx-modes">' + d.fuels.map(function (f) {
      return '<button type="button" class="btn' + (f.id === mode ? ' on' : '') + '"'+(root.REACTOR&&REACTOR.components(m).length?' disabled':'')+' data-rx-mode="' + esc(f.id) + '">' + esc(f.cn) + '</button>';
    }).join('') + '</div>';
  }

  function instOf(m){return STRUCTURES.instance(m);}
  function capacityOf(m){return MULTIBLOCK_POWER.capacity(m);}
  function voltsOf(m) { var i = instOf(m); return (i && i.volt) || m.voltage || 0; }
  function ampsOf(m) { var i = instOf(m); return (i && i.amperage) || m.amperage || 0; }

  function outputOf(m,f){return REACTOR.outputPower(m,f);}

  function remainText(m, f) {
    var r = m.reactor || {}, d = data();
    var rods = (r.rods || []).filter(function (v) { return v != null; });
    var cells = (r.cells || []).filter(function (v) { return v != null; });
    var rodLeft = rods.length ? Math.round((1 - Math.max.apply(null, rods)) * (ITEM_DURABILITY.max(f.rod)||50000)) : 0;
    var maxCell = root.ITEM_DURABILITY && f ? ITEM_DURABILITY.max(f.coolant) : 360000;
    var per = f && f.heatPerSecond ? f.heatPerSecond / Math.max(1, cells.length) : 0;
    var cellLeft = cells.length && per ? Math.round((maxCell - Math.max.apply(null, cells)) / per) : 0;
    function mmss(n) { n = Math.max(0, n | 0); var h = Math.floor(n / 3600), mnt = Math.floor(n % 3600 / 60), sec = n % 60; return (h ? h + '时' : '') + mnt + '分' + sec + '秒'; }
    return { rod: mmss(rodLeft), cell: mmss(cellLeft) };
  }

  function counts(m) {
    var r = m.reactor || {}, d = data();
    var rods = (r.rods || []).filter(function (v) { return v != null; }).length;
    var cells = (r.cells || []).filter(function (v) { return v != null; }).length;
    return { rods: rods, rodsMax: d.rods || 40, cells: cells, cellsMax: d.coolants || 14 };
  }

  function statusText(m) {
    var s = m.status || {};
    if (s.code === 'RUNNING') return '运行中';
    return s.text || '待机';
  }

  function currentFuel(m){
    var d=data(),mode=m.reactor&&(m.reactor.loadedMode||m.reactor.mode)||(d.fuels[0]||{}).id;
    return d.fuels.find(function(f){return f.id===mode;});
  }
  function values(m,f){
    var c=counts(m),left=remainText(m,f);
    return {fuel:'燃料：'+(f?f.cn:'—'),power:'出力：'+(f?outputOf(m,f):0)+' EU/t',
      voltage:'电压：'+voltsOf(m)+' V',amps:'电流：'+ampsOf(m)+' A',
      buffer:'缓冲：'+Math.floor(m.eu||0)+'/'+capacityOf(m)+' EU',output:'送出：'+Math.floor(m._pushed||0)+' EU',
      rods:'燃料棒：'+c.rods+'/'+c.rodsMax,cells:'冷却单元：'+c.cells+'/'+c.cellsMax,
      rodLeft:'燃料剩余：'+left.rod,cellLeft:'冷却剩余：'+left.cell};
  }
  function body(m){
    var fields=values(m,currentFuel(m));
    return '<div class="rx-head"><strong>核反应堆</strong><span class="rx-status"></span></div>'+
      '<div class="rx-meta">'+Object.keys(fields).map(function(k){return '<span data-rx-info="'+k+'"></span>';}).join('')+'</div>'+
      fuelButtons(m)+'<button class="btn" data-rx-unload>取出燃料与冷却单元</button>'+layoutHtml()+
      '<div class="rx-legend"><span>40 根四联燃料棒</span><span>14 个冷却单元</span></div>';
  }
  function refresh(host,m){
    var f=currentFuel(m),fields=values(m,f),status=host.querySelector('.rx-status'),text=statusText(m);
    if(status.textContent!==text)status.textContent=text;
    status.dataset.rxStatus=text;
    host.querySelectorAll('[data-rx-info]').forEach(function(node){var value=fields[node.dataset.rxInfo];if(node.textContent!==value)node.textContent=value;});
    var loaded=REACTOR.components(m).length>0,mode=m.reactor&&m.reactor.mode||(data().fuels[0]||{}).id;
    host.querySelectorAll('[data-rx-mode]').forEach(function(b){b.disabled=loaded;b.classList.toggle('on',b.dataset.rxMode===mode);});
    host.querySelector('[data-rx-unload]').disabled=!loaded;
    host.querySelectorAll('.rx-cell').forEach(function(node){
      var key=f&&(node.dataset.kind==='coolant'?f.coolant:f.rod)||'';
      if(node.dataset.rxItem===key)return;node.dataset.rxItem=key;
      node.innerHTML=key?icon(key,32):'';node.title=key?(GD.items[key]||key):'';
    });
  }
  function mountPanel(host,m,S,save){
    if(!host||!m)return;
    if(host._reactorOwner!==m||!host.querySelector('.reactor-panel')){
      host._reactorOwner=m;host.innerHTML='<div class="reactor-panel mechanism-panel">'+body(m)+'</div>';
      host.querySelectorAll('[data-rx-mode]').forEach(function(b){b.onclick=function(){if(REACTOR.setMode(m,b.dataset.rxMode)){if(save)save();refresh(host,m);}};});
      host.querySelector('[data-rx-unload]').onclick=function(){if(!S)return;var result=REACTOR.unload(S,m);if(result.ok){if(save)save();refresh(host,m);}};
      host.querySelector('.reactor-panel')._refresh=function(){refresh(host,m);};
    }
    refresh(host,m);
  }
  function open(uid,S,save){
    var box=document.getElementById('popup'),m=ENTITIES.get(S,uid);if(!box||!m)return;
    box.hidden=false;box.classList.add('noback');
    box.innerHTML='<div class="box machine-window reactor-window"><header><h3>核反应堆</h3><button class="btn" data-popclose="1">关闭</button></header><div class="reactor-body"></div></div>';
    mountPanel(box.querySelector('.reactor-body'),m,S,save);
  }

  root.REACTOR_UI = { supported: supported, open: open, mountPanel: mountPanel };
})(typeof window !== 'undefined' ? window : globalThis);
