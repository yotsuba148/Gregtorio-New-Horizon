/* 把产线的导线与终端喂给 POWER_PACKETS，按原版规则跑一个 tick。
 * 输入全部由调用方提供，模块不读存档、不碰 DOM：
 *   wires:      [{x,y,loss,amps,voltage,dirs:[4]}]
 *   generators: [{d:{volt,outputs:[{volt,amps,face}]}, m, draw(sentAtSource, delivered, debit)}]
 *   terminals:  [{cell, offer(volt,amps)->已接受电流, canAccept(volt,amps)->bool}]
 */
(function (root) {
  'use strict';

  var DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

  function build(wires) {
    var net = root.POWER_PACKETS.create();
    var at = {};
    (wires || []).forEach(function (w) { at[w.x + ',' + w.y] = w; });
    Object.keys(at).forEach(function (k) {
      var w = at[k];
      var links = [];
      for (var d = 0; d < 4; d++) {
        if (!(w.dirs && w.dirs[d])) continue;
        var nk = (w.x + DIRS[d][0]) + ',' + (w.y + DIRS[d][1]);
        if (at[nk]&&at[nk].dirs&&at[nk].dirs[(d+2)%4]) links.push(nk);
      }
      root.POWER_PACKETS.addWire(net, { x: w.x, y: w.y, loss: w.loss, amps: w.amps, voltage: w.voltage, links: links });
    });
    return net;
  }

  function tick(input) {
    var net = build(input.wires || []);
    (input.terminals || []).forEach(function (t,index) {
      var id=t.id||t.cell+'#terminal'+index,wire=net.cells.get(t.cell);if(!wire)return;
      wire.links.push(id);
      net.consumers.set(id, {
        key: id,
        maxVoltage: Infinity,
        canAccept: function (v, a) { return t.canAccept ? !!t.canAccept(v, a) : true; },
        accept: function (v, a) { return t.offer ? t.offer(v, a) : 0; }
      });
    });
    var delivered = 0, packets = 0, wasted = 0, groupLeft = {};
    root.POWER_PACKETS.reset(net);
    (input.generators || []).forEach(function (g) {
      var outputs = (g.d && g.d.outputs) || [];
      outputs.forEach(function (o) {
        var volt = o.volt || (g.d && g.d.volt) || 0;
        var drain=o.drain||(g.d&&g.d.outputDrain)||volt;
        var available=g.available?g.available(o,drain):g.m?Math.max(0,(g.m.eu||0)-((g.d&&g.d.minimumOutputEnergy)||0)):Infinity;
        var amps = Math.min(Math.max(0,o.amps||0),Math.floor(available/drain));
        /* 同一台设备的多路输出共享一份电流额度（变压器三面出电就是这个用法） */
        if (o.group) {
          if (groupLeft[o.group] == null) groupLeft[o.group] = o.groupTotal != null ? o.groupTotal : amps;
          amps = Math.min(amps, Math.max(0, groupLeft[o.group]));
        }
        if (!volt || !o.face || amps <= 0) { wasted += amps; return; }
        var direct = input.direct && input.direct[o.face];
        if(direct&&direct.sided)direct=direct.sided[(o.direction+2)%4];
        if (direct) {
          /* 发电机直接挨着机器：不经过导线，按机器自己的接收规则吃包 */
          var acc = 0;
          for (var i2 = 0; i2 < amps; i2++) {
            if (!(direct.canAccept ? direct.canAccept(volt, 1) : true)) break;
            var got = direct.accept ? direct.accept(volt, 1) : 0;
            if (!got) break;
            acc += got;
          }
          if (acc) {
            var received = acc * volt;
            delivered += received;
            packets += acc;
            if (o.group) groupLeft[o.group] -= acc;
            if (g.draw) g.draw(received, received, acc * drain);
            wasted += Math.max(0, amps - acc);
            return;
          }
        }
        var r = root.POWER_PACKETS.emit(net, { voltage: volt, amps: amps, links: [o.face] });
        delivered += r.sent;
        packets += r.amps;
        if (o.group) groupLeft[o.group] -= r.amps;
        wasted += Math.max(0, amps - r.amps);
        if (r.amps && g.draw) g.draw(r.amps * volt, r.sent, r.amps * drain);
      });
    });
    var overload = root.POWER_PACKETS.settle(net);
    return { delivered: delivered, packets: packets, wasted: wasted, overload: overload };
  }

  root.POWER_PACKET_RUNNER = { tick: tick, build: build };
})(typeof window !== 'undefined' ? window : globalThis);
