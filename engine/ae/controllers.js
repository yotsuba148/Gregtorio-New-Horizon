(function(root) {
  'use strict';
  var D = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0]
  ];

  function cell(n) {
    return n.board + ':' + n.x + ',' + n.y;
  }

  function physical(nodes) {
    var positions = new Map(nodes.filter(function(n) {
      return n.role === 'controller';
    }).map(function(n) {
      return [cell(n), n];
    }));
    positions.forEach(function(n) {
      var at = function(dx, dy) {
        return positions.has(n.board + ':' + (n.x + dx) + ',' + (n.y + dy));
      };
      n.controllerValid = !(at(-1, 0) && at(1, 0) && at(0, -1) && at(0, 1));
      if (!n.controllerValid) n.sides = 0;
    });
    return nodes;
  }

  function inspect(c) {
    var groups = new Map(),
      result = new Map();
    c.nodes.forEach(function(n) {
      if (n.role !== 'controller') return;
      var key = c.graph.component(n.id),
        group = groups.get(key) || [];
      group.push(n);
      groups.set(key, group);
    });
    groups.forEach(function(nodes, key) {
      var remaining = new Map(nodes.map(function(n) {
          return [cell(n), n];
        })),
        queue = [nodes[0]],
        count = 0,
        minX = nodes[0].x,
        maxX = minX,
        minY = nodes[0].y,
        maxY = minY;
      remaining.delete(cell(nodes[0]));
      while (queue.length) {
        var n = queue.pop();
        count++;
        minX = Math.min(minX, n.x);
        maxX = Math.max(maxX, n.x);
        minY = Math.min(minY, n.y);
        maxY = Math.max(maxY, n.y);
        D.forEach(function(d) {
          var id = n.board + ':' + (n.x + d[0]) + ',' + (n.y + d[1]),
            other = remaining.get(id);
          if (other) {
            remaining.delete(id);
            queue.push(other);
          }
        });
      }
      var reason = nodes.some(function(n) {
          return !n.controllerValid;
        }) ? 'CONTROLLER_SHAPE' :
        count !== nodes.length ? 'CONTROLLER_SEPARATED' : maxX - minX >= 7 || maxY - minY >= 7 ?
        'CONTROLLER_SIZE' : null;
      result.set(key, {
        code: reason ? 'CONTROLLER_CONFLICT' : 'CONTROLLER_ONLINE',
        reason: reason,
        controllers: nodes.length
      });
    });
    return result;
  }
  root.AE_CONTROLLERS = {
    physical: physical,
    inspect: inspect
  };
})(typeof window !== 'undefined' ? window : globalThis);
