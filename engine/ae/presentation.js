(function(root) {
  'use strict';
  var colors = ['#DBDBDB', '#FAAE44', '#B82AB8', '#82ACE7', '#F8FF4A', '#BBFF51', '#F8B5D7', '#A0A0A0',
    '#CDCDCD', '#51AAC6', '#A453CE', '#514AFF', '#B7967F', '#60E32E', '#FF003C', '#565656', '#895CA8'
  ];

  function supported(m) {
    var d = AE_DEVICES.spec(m);
    return !!d && (['cable', 'controller', 'power_bridge', 'interface'].includes(d.role) || d.role === 'drive' && !d
      .terminal);
  }

  function body(m, unit, S, shared) {
    var c = AE_FACTORY.peek(S) || AE_FACTORY.get(S),
      n = c.byId.get(m.uid),
      d = AE_DEVICES.spec(m),
      mask = 0,
      dirs = [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0]
      ];
    if (n) mask = AE_FACTORY.connectionMask(c, n);
    if (d.role === 'interface') return interfaceFace(m, unit);
    if (d.role === 'controller') return controller(c, n, m, unit);
    if (d.role === 'drive') return drive(c, n, m, unit);
    if (d.role === 'power_bridge') return '<span class="ae-fiber-face" style="width:' + unit +
      'px;height:' + unit + 'px;transform:rotate(' + (m.outFace % 2 ? 90 : 0) + 'deg)"></span>';
    var dense = +m.k.split('@')[1] >= 60,
      width = shared ? (dense ? 3 : 2) : (dense ? 9 : 6),
      h = '<svg class="ae-cable-face" width="' + unit + '" height="' + unit +
      '" viewBox="0 0 32 32" aria-hidden="true">';
    for (var pass = 0; pass < 2; pass++) {
      var stroke = pass ? colors[d.color] : '#24212c',
        size = pass ? width : width + (shared ? 1 : 3);
      h += '<g fill="none" stroke="' + stroke + '" stroke-width="' + size + '" stroke-linecap="square">';
      dirs.forEach(function(delta, side) {
        if (mask & (1 << side)) h += '<path d="M16 16L' + (16 + delta[0] * 16) + ' ' + (16 + delta[1] *
          16) + '"/>';
      });
      h += '</g>';
    }
    h += '<rect x="' + (16 - width / 2) + '" y="' + (16 - width / 2) + '" width="' + width + '" height="' +
      width + '" fill="' + colors[d.color] + '"/></svg>';
    return h;
  }

  function interfaceFace(m, unit) {
    var d = AE_DEVICES.spec(m), side = m.outFace == null ? -1 : m.outFace;
    if (side < 0) return '<img class="ae-interface-direction-face" src="modicons/ae/' +
      (d.fluids ? 'fluid-interface.png' : 'interface.png') + '" width="' + unit +
      '" height="' + unit + '" alt="">';
    return '<img class="ae-interface-direction-face" src="modicons/ae/' +
      (d.fluids ? 'fluid-interface-arrow.png' : 'interface-arrow.png') + '" width="' + unit +
      '" height="' + unit + '" style="transform:rotate(' + ((side + 2) % 4 * 90) + 'deg)" alt="">';
  }

  function controller(c, n, m, unit) {
    var at = function(x, y) {
        return (c.cells.get(n.board + ':' + x + ',' + y) || []).some(function(v) {
          return v.role === 'controller';
        });
      },
      horizontal = at(n.x - 1, n.y) && at(n.x + 1, n.y),
      vertical = at(n.x, n.y - 1) && at(n.x, n.y + 1),
      on = c.online.get(c.graph.component(n.id)) === true,
      conflict = (c.controllerStates.get(c.graph.component(n.id)) || {}).code === 'CONTROLLER_CONFLICT',
      stem = horizontal !== vertical ? 'controller-column' : 'controller',
      angle = horizontal && !vertical ? 90 : 0;
    if (horizontal && vertical)
      return '<img class="ae-controller-face" src="modicons/ae/BlockControllerInside' + ((Math.abs(n.x) +
        Math.abs(n.y)) % 2 ? 'B' : 'A') + '.png" width="' + unit + '" height="' + unit + '" alt="">';
    var file = stem + (on ? conflict ? '-conflict' : '-active' : '-off'),
      a = on && !conflict ? AE_ANIMATION[file] : null;
    return '<span class="ae-controller-face' + (on && !conflict ? ' ae-controller-active' : '') +
      '" style="width:' +
      unit + 'px;height:' + unit + 'px;background-image:url(modicons/ae/' + file +
      '.png);transform:rotate(' + angle + 'deg);' + (a ? '--ae-frames:' + a.frames + ';--ae-duration:' + a
        .seconds + 's;--ae-end:' + (100 * a.frames / (a.frames - 1)) + '%;' : '') + '"></span>';
  }

  function drive(c, n, m, unit) {
    var on = c.online.get(c.graph.component(n.id)) === true,
      lights = ['#000', '#00ff00', '#00aaff', '#ffaa00', '#ff0000'];
    return '<svg class="ae-drive-face" width="' + unit + '" height="' + unit +
      '" viewBox="0 0 16 16" aria-hidden="true"><image href="modicons/ae/drive.png?v=20261029_phase130" width="16" height="16"/>' +
      m.me.cells.map(function(stack, i) {
        if (!stack) return '';
        var kind = AE_CELLS.rule(stack).kind,
          x = 2 + (i % 2) * 7,
          y = 1 + Math.floor(i / 2) * 3,
          status = AE_CELLS.indicator(stack);
        return '<g data-ae-drive-slot="' + i + '" data-cell-status="' + status +
          '"><image href="modicons/ae/drive-cell-' + kind + '.png" x="' + x + '" y="' + y +
          '" width="5" height="2"/><rect x="' + (x + 3) + '" y="' + (y + 1) +
          '" width="1" height="1" fill="' + lights[on ? status : 0] + '"/></g>';
      }).join('') + '</svg>';
  }

  function driveRevision(m) {
    return m.me.cells.map(function(s) {
      if (!s) return '-';
      var cell = AE_CELLS.ensure(s);
      return s.k + ':' + cell.uid + ':' + AE_READ_INDEX.versionOf(cell.contents) + ':' + cell.contents
        .length;
    }).join('|');
  }

  function refresh(el, m, unit, S) {
    if (!supported(m)) return;
    var c = AE_FACTORY.peek(S) || AE_FACTORY.get(S),
      shared = el.hasAttribute('data-shared-conduit'),
      signature = c.graph.revision + ':' + c.network.revision + ':' + unit + ':' + shared + (AE_DEVICES.spec(m).role ===
        'drive' ? ':' + driveRevision(m) : ':' + m.outFace);
    if (el._aeVisualRevision === signature) return;
    el._aeVisualRevision = signature;
    var html = body(m, unit, S, shared),
      host = el.querySelector('[data-ae-face]');
    if (!host) return;
    if (el._aeFace !== html) {
      UI_KIT.patch(host, html);
      el._aeFace = html;
    }
  }
  root.AE_PRESENTATION = {
    supported: supported,
    interfaceFace: interfaceFace,
    refresh: refresh,
    body: body
  };
})(typeof window !== 'undefined' ? window : globalThis);
