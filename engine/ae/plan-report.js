(function(root) {
  'use strict';
  var R = AE_RESOURCES;
  function rows(plan) {
    var all = new Map();
    ['withdrawals', 'pending', 'missing'].forEach(function(field) {
      (plan[field] || []).forEach(function(r) {
        var id = R.identity(r), row = all.get(id);
        if (!row) {
          row = {resource: R.amount(r, 1), withdrawals: 0, pending: 0, missing: 0, requests: 0};
          all.set(id, row);
        }
        row[field] = R.add(row[field], r.amount);
      });
    });
    (plan.steps || []).forEach(function(step) {
      step.pattern.outputs.forEach(function(r) {
        var row = all.get(R.identity(r));
        if (row) row.requests = R.add(row.requests, step.batches);
      });
    });
    return Array.from(all.values());
  }
  root.AE_PLAN_REPORT = {rows: rows};
})(typeof window !== 'undefined' ? window : globalThis);
