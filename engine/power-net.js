/* GT 式推电网：导线建图，发电机推包，节点转发并扣线损，终端被动收电。
 * 这一层不认识机器、配方和发电机；只认“节点、边、终端接口”。 */
(function (root) {
  'use strict';

  // nodes: [{id, x, y, loss, amps}]，wires 相连的四个方向在这里由 edges 给出
  // edges: {nodeId: [neighborNodeId, ...]}
  function create(nodes, edges) {
    var byId = {};
    var adj = {};
    (nodes || []).forEach(function (n) {
      byId[n.id] = { id: n.id, x: n.x, y: n.y, loss: n.loss || 0, amps: n.amps || 1, used: 0 };
      adj[n.id] = (edges && edges[n.id] ? edges[n.id] : []).slice();
    });
    return { nodes: byId, adj: adj, terminals: {} };
  }

  function reset(net) {
    Object.keys(net.nodes).forEach(function (k) { net.nodes[k].used = 0; });
  }

  function attachTerminal(net, nodeId, terminal) {
    if (!net.nodes[nodeId]) return false;
    (net.terminals[nodeId] = net.terminals[nodeId] || []).push(terminal);
    return true;
  }

  // 推电：从 startId 进入网络，电压沿途扣损，安数受每根导线额度限制。
  // accept(terminal, volt, amps) 返回实际接收安数。
  function push(net, startId, volt, amps, accept) {
    var first = net.nodes[startId];
    if (!first) return { delivered: 0, lost: 0 };
    var delivered = 0, lost = 0;
    (function walk(id, from, v, a) {
      var node = net.nodes[id];
      if (!node || a <= 0 || v <= 0) return;
      var room = node.amps - node.used;
      if (room <= 0) return;
      var pass = Math.min(a, room);
      node.used += pass;
      lost += Math.min(pass * node.loss, pass * Math.max(0, v));
      var vAfter = v - node.loss;
      if (vAfter <= 0) return;
      var terms = net.terminals[id] || [];
      for (var t = 0; t < terms.length && pass > 0; t++) {
        var taken = Math.min(accept(terms[t], vAfter, pass) || 0, pass);
        if (taken > 0) { delivered += taken; pass -= taken; }
      }
      if (pass <= 0) return;
      var next = net.adj[id] || [];
      for (var i = 0; i < next.length && pass > 0; i++) {
        if (next[i] === from) continue;
        walk(next[i], id, vAfter, pass);
      }
    })(startId, null, volt, amps);
    return { delivered: delivered, lost: lost };
  }

  root.POWER_NET = { create: create, reset: reset, attachTerminal: attachTerminal, push: push };
})(typeof window !== 'undefined' ? window : globalThis);
