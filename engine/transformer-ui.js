/* 单方块变压器窗口：只有两个操作——升压/降压、特殊面。其余三面由模式推出来。 */
(function (root) {
  'use strict';

  var names = ['上', '右', '下', '左'];

  function mount(host, m, S, save) {
    if (!host) return;
    var d = DEFS.of(m.k);
    if (!d || !root.POWER_TRANSFORMER) return;
    root.POWER_TRANSFORMER.ensure(m, d);
    var faces = root.POWER_TRANSFORMER.faces(m, d);
    var v = root.POWER_TRANSFORMER.volts(m, d);
    var up = m.tfMode === 'up';
    var special = faces.special;

    var cross = '<div class="io-cross">' + names.map(function (name, side) {
      var isInput = faces.inputs.indexOf(side) >= 0;
      var isSpecial = side === special;
      return '<button class="io-cover-slot io-side-' + side + (isSpecial ? ' selected' : '') + '" data-tf-side="' + side + '"' +
        ' title="' + name + '侧' + (isSpecial ? '（特殊面）' : '') + (isInput ? '，输入' : '，输出') + '">' +
        '<span class="io-cover-item">' + (isSpecial ? '<span class="io-empty">◆</span>' : '<span class="io-empty tf-arrow">' + arrow(side, isInput) + '</span>') + '</span>' +
        (isInput ? '<i class="io-exit-mark" aria-hidden="true"></i>' : '') + '</button>';
    }).join('') + '<div class="io-machine-face">' + FACTORY.face(m.k, 28) + '</div></div>';

    var controls = '<div class="io-controls">' +
      '<div class="io-side-toolbar">' +
      '<button class="btn tf-mode-btn' + (up ? '' : ' on') + '" data-tf-mode="down" style="min-width:72px">降压</button>' +
      '<button class="btn tf-mode-btn' + (up ? ' on' : '') + '" data-tf-mode="up" style="min-width:72px">升压</button>' +
      '</div>' +
      '<div class="tf-readout">' + readout(faces, v) + '</div>' +
      '</div>';

    var h = '<div class="machine-io io-standard tf-io">' + cross + controls + '</div>';
    if (root.UI_KIT && UI_KIT.patch) UI_KIT.patch(host, h); else host.innerHTML = h;

    host.onclick = function (e) {
      var node = e.target.closest('[data-tf-side],[data-tf-mode]');
      if (!node) return;
      e.preventDefault();
      e.stopPropagation();
      if (node.dataset.tfSide != null) {
        FACTORY.setFace(m.uid, +node.dataset.tfSide, S, save);
        return;
      }
      if (node.dataset.tfMode === m.tfMode || !POWER_TRANSFORMER.setMode(m, d, node.dataset.tfMode).ok) return;
      if (save) save();
      FACTORY.refreshOpen(S, save);
    };
  }

  /* 箭头指向电流的去向：输入面朝机器里指，输出面朝外指 */
  function arrow(side, isInput) {
    var inward = ['↓', '←', '↑', '→'];
    var outward = ['↑', '→', '↓', '←'];
    return (isInput ? inward : outward)[side] || '·';
  }

  function readout(faces, v) {
    function sides(list) { return list.map(function (side) { return names[side]; }).join('、') + '侧'; }
    return '输入 ' + v.inVolt + ' V ' + v.inAmps + ' A（' + sides(faces.inputs) +
      '），输出 ' + v.outVolt + ' V ' + v.outAmps + ' A（' + sides(faces.outputs) + '）';
  }

  root.TRANSFORMER_UI = { mount: mount };
})(typeof window !== 'undefined' ? window : globalThis);
