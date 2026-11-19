/* 原版供电流模型：发电机发包，导线传递，机器按包接收。
 * 规则取自 GT5-Unofficial 5.09.51.482：
 * - 线损按格累加，直接从电压里扣，电流不变（PowerNodePath.mLoss / applyVoltage）
 * - 单包电压超过线缆耐压 → 拒收（原版起火）
 * - 线缆每 tick 通过的电流有上限（原版 40 tick 平均，这里按单 tick 上限近似）
 * - 机器接收：满电压拒收、来压超机器电压拒收、电流受 maxAmperesIn 与本 tick 已收限制
 * 这个模块不依赖 DOM，也不认识工厂，只吃图数据。
 */
(function (root) {
  'use strict';

  function key(x, y) { return x + ',' + y; }

  function create() {
    return { cells: new Map(), consumers: new Map() };
  }

  /* wire: {x,y,loss,amps,voltage,links:[key...]} */
  function addWire(net, wire) {
    net.cells.set(key(wire.x, wire.y), {
      key: key(wire.x, wire.y),
      loss: wire.loss || 0,
      amps: wire.amps || 0,
      voltage: wire.voltage || 0,
      links: (wire.links || []).slice(),
      used: 0,
      history: []
    });
  }

  /* consumer: {key,maxVoltage,maxAmps,capacity,stored,accept(voltage,amps)} */
  function addConsumer(net, consumer) {
    net.consumers.set(consumer.key, consumer);
  }

  function reset(net) {
    net.cells.forEach(function (c) { c.used = 0; });
  }

  /* 结算一个 tick 的电流记录；原版按 40 tick 平均值判定过载，这里超过就拒收，不起火 */
  function settle(net) {
    var overload = [];
    net.cells.forEach(function (c) {
      c.history.push(c.used);
      while (c.history.length > 40) c.history.shift();
      var sum = c.history.reduce(function (n, v) { return n + v; }, 0);
      c.avgAmps = sum / c.history.length;
      if (c.amps && c.avgAmps > c.amps) overload.push(c.key);
    });
    return overload;
  }

  function avg(net, key) {
    var c = net.cells.get(key);
    return c && c.avgAmps ? c.avgAmps : 0;
  }

  /* 从起点出发找一条能接收 1 包的通路；返回 {path, voltage, consumer, loss} 或 null */
  function route(net, startKey, voltage, acceptPacket, guard) {
    var start = net.cells.get(startKey);
    if (!start) return null;
    if (start.amps && start.used >= start.amps) return null;
    if (voltage > start.voltage) return null;
    var queue = [{ cell: start, loss: start.loss, previous: null, firstPath: true }];
    var firstReach = new Set([startKey]), reached = new Map([[startKey, start.loss]]);
    var best = null;
    for (var head=0; head<queue.length; head++) {
      var cur = queue[head];
      if(best&&cur.loss>=best.loss)continue;
      var reachable = voltage - cur.loss;
      var onCell = net.consumers.get(cur.cell.key);
      if (onCell) {
        if (reachable > 0 && reachable <= (onCell.maxVoltage || 0) && (!guard || guard(onCell)) && acceptPacket(onCell, reachable)) {
          if (!best || cur.loss < best.loss) best = { consumer: onCell, voltage: reachable, loss: cur.loss, end: cur };
        }
      }
      /* 线缆耐压 */
      if (reachable <= 0) continue;
      for (var i = 0; i < cur.cell.links.length; i++) {
        var next = net.cells.get(cur.cell.links[i]);
        if (!next) {
          /* 端点可能是机器 */
          var c = net.consumers.get(cur.cell.links[i]);
          if (!c) continue;
          if (reachable > (c.maxVoltage || 0)) continue;
          if (guard && !guard(c)) continue;
          if (next === undefined && !acceptPacket(c, reachable)) continue;
          var pathLoss = cur.loss;
          if (!best || pathLoss < best.loss) best = { consumer: c, voltage: reachable, loss: pathLoss, end: cur };
          continue;
        }
        if (reachable > next.voltage) continue;      /* 过压 */
        if (next.used >= next.amps) continue;        /* 过流 */
        var nextLoss=cur.loss+next.loss, prior=reached.get(next.key);
        var firstPath=cur.firstPath&&!firstReach.has(next.key);
        var lowerLoss=prior==null||nextLoss<prior;
        if(!firstPath&&!lowerLoss)continue;
        // Keep the first feasible traversal too. A lower-loss arrival can
        // exceed the voltage limit of a later wire or the destination.
        if(firstPath)firstReach.add(next.key);
        if(lowerLoss)reached.set(next.key,nextLoss);
        queue.push({cell:next,loss:nextLoss,previous:cur,firstPath:firstPath});
      }
    }
    if(!best)return null;
    var path=[];
    for(var entry=best.end;entry;entry=entry.previous)path.push(entry.cell.key);
    return {consumer:best.consumer,voltage:best.voltage,loss:best.loss,path:path.reverse()};
  }

  /* 一台发电机一个 tick 发 amps 包，每包电压 voltage */
  function emit(net, generator, hooks) {
    if (typeof process !== 'undefined' && process.env && process.env.PKT_DEBUG) console.log('[emit]', JSON.stringify({ v: generator.voltage, a: generator.amps, links: generator.links, cells: net.cells.size, cons: net.consumers.size }));
    var out = { sent: 0, amps: 0, delivered: [] };
    var amps = Math.max(0, generator.amps | 0);
    for (var a = 0; a < amps; a++) {
      var found = null;
      var candidates = (generator.links || []).slice();
      for (var i = 0; i < candidates.length; i++) {
        var r = route(net, candidates[i], generator.voltage, function (c, v) {
          return c.canAccept ? c.canAccept(v, 1) : true;
        });
        if (r && (!found || r.loss < found.loss)) found = r;
      }
      if (!found) break;
      var consumer = found.consumer;
      var accepted = consumer.accept ? consumer.accept(found.voltage, 1) : 0;
      if (!accepted) break;
      found.path.forEach(function (k) { var c = net.cells.get(k); if (c) c.used += accepted; });
      out.amps += accepted;
      out.sent += found.voltage * accepted;
      out.delivered.push({ key: consumer.key, voltage: found.voltage, amps: accepted, loss: found.loss });
      if (hooks && hooks.onPacket) hooks.onPacket(found);
    }
    return out;
  }

  root.POWER_PACKETS = { create: create, addWire: addWire, addConsumer: addConsumer, reset: reset, settle: settle, avg: avg, route: route, emit: emit, key: key };
  if (typeof module === 'object' && module.exports) module.exports = root.POWER_PACKETS;
})(typeof window !== 'undefined' ? window : globalThis);
