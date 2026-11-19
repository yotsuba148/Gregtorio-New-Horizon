(function(root) {
  'use strict';

  function record(S, name) {
    var a = AE_STATE.ensure(S);
    if (!a.milestones) a.milestones = {};
    if (a.milestones[name]) return false;
    a.milestones[name] = true;
    return true;
  }

  function met(S, name) {
    return !!(S.ae && S.ae.milestones && S.ae.milestones[name]);
  }

  function order(S, e) {
    if (e.kind !== 'completed') return;
    record(S, 'order');
    if (e.modes.includes('processing')) record(S, 'processing_order');
    if (e.virtual) record(S, 'virtual_order');
  }

  function stocked(c, m, group) {
    var input = group && c.byId.get(group);
    if (!input || !input.spec.stocking) return;
    record(c.state, 'continuous');
    var component = c.graph.component(input.id),
      edges = c.graph.edges.get(component) || [];
    if (c.nodes.some(function(n) {
        return n.entity === m && n.role === 'port' && (n.spec.itemOut || n.spec.fluidOut) &&
          c.graph.component(n.id) !== component && edges.some(function(e) {
            return e.to === c.graph.component(n.id);
          });
      })) record(c.state, 'zones');
  }

  function inspect(c) {
    var signature = c.graph.revision + ':' + c.network.revision;
    if (c.progressSignature === signature) return false;
    c.progressSignature = signature;
    var changed = false,
      groups = new Map();

    function mark(name) {
      if (record(c.state, name)) changed = true;
    }
    c.nodes.forEach(function(n) {
      var encoded = (n.state.patterns || []).concat(n.state.encoding || []).filter(function(s) {
        return s && s.aePattern;
      });
      if (encoded.length) mark('pattern');
      if (encoded.some(function(s) {
          return s.aePattern.virtual.length;
        })) mark('virtual_pattern');
      if (!c.network.status(n.id).ok) return;
      var id = c.graph.component(n.id),
        g = groups.get(id) || [];
      g.push(n);
      groups.set(id, g);
      if (n.role === 'storage_bus') {
        var edge = (c.graph.edges.get(id) || []).find(function(e) {
          return e.to !== id;
        });
        if (edge) {
          mark('subnet');
          if ((n.state.samples || []).some(Boolean)) mark('subnet_filter');
        } else if (AE_FACTORY.physical(c, n).length) mark('external');
      }
    });
    groups.forEach(function(nodes) {
      if (nodes.some(function(n) {
          return n.spec.terminal;
        }) && nodes.some(function(n) {
          return n.role === 'drive' && n.state.cells.some(Boolean);
        })) mark('network');
      if (nodes.some(function(n) {
          return n.spec.terminal && n.spec.fluids;
        }) && nodes.some(function(n) {
          return n.role === 'drive' && n.state.cells.some(function(s) {
            return s && AE_CELLS.rule(s).kind === 'fluid';
          });
        })) mark('fluids');
    });
    return changed;
  }
  AE_FACTORY.register('quest-progress', {
    after: inspect
  });
  QUESTS.registerTask('ae', {
    met: function(S, g) {
      return met(S, g.milestone);
    }
  });
  root.AE_PROGRESS = {
    record: record,
    met: met,
    order: order,
    stocked: stocked,
    inspect: inspect
  };
})(typeof window !== 'undefined' ? window : globalThis);
