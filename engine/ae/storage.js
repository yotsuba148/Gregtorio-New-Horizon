(function(root) {
  'use strict';
  var R = root.AE_RESOURCES,
    TX = root.GTTransactions;
  var commitObservers = new Map();

  function same(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  function replace(arr, next) {
    arr.splice.apply(arr, [0, arr.length].concat(TX.clone(next)));
  }

  function count(list, r) {
    var id = R.identity(r);
    return list.reduce(function(n, s) {
      return R.identity(s) === id ? R.add(n, s.amount) : n;
    }, 0);
  }

  function remove(list, requirements) {
    var next = TX.clone(list);
    for (var r of requirements) {
      var left = r.amount,
        id = R.identity(r);
      for (var i = 0; i < next.length && left; i++) {
        var s = next[i];
        if (!s || R.identity(s) !== id) continue;
        var n = Math.min(left, s.amount);
        left -= n;
        s.amount -= n;
        if (!s.amount) next[i] = null;
      }
      if (left) return null;
    }
    return next.filter(Boolean);
  }

  function validate(adapter) {
    if (!adapter || !adapter.id || !adapter.storage || ['read', 'resources', 'room', 'apply',
        'write'
      ].some(function(k) {
        return typeof adapter[k] !== 'function';
      })) throw Error('Invalid AE storage adapter');
    return adapter;
  }

  function buffer(id, resources, options) {
    options = options || {};
    var limit = options.capacity == null ? Number.MAX_SAFE_INTEGER : R.integer(options.capacity,
      true);
    return validate({
      id: id,
      storage: resources,
      read: function() {
        return TX.clone(resources);
      },
      resources: function(s) {
        return TX.clone(s);
      },
      room: function(s, r) {
        if (options.accepts && !options.accepts(r)) return 0;
        return Math.max(0, limit - s.reduce(function(n, v) {
          return R.add(n, v.amount);
        }, 0));
      },
      apply: function(s, take, put) {
        var next = remove(s, take);
        if (!next) return null;
        for (var r of put) {
          if (this.room(next, r) < r.amount) return null;
          next = R.merge(next.concat([r]));
        }
        return next;
      },
      write: function(s) {
        replace(resources, s);
      }
    });
  }

  function slots(id, arr, options) {
    options = options || {};
    var limit = options.slots == null ? arr.length : R.integer(options.slots, true),
      maxStack = options.maxStack || function(k) {
        return root.CORE.maxStack(k);
      };
    return validate({
      id: id,
      storage: arr,
      read: function() {
        return TX.clone(arr);
      },
      resources: function(s) {
        return s.filter(Boolean).map(R.item);
      },
      room: function(s, r) {
        if (r.kind !== 'item' || options.accepts && !options.accepts(R.native(r))) return 0;
        var total = 0,
          inst = !!r.attributes,
          cap = inst ? 1 : maxStack(r.key),
          rid = R.identity(r);
        for (var i = 0; i < limit; i++) {
          var v = s[i];
          if (!v) total = R.add(total, cap);
          else if (!inst && R.identity(R.item(v)) === rid) total = R.add(total, Math.max(0,
            cap - TX.count(v)));
        }
        return total;
      },
      apply: function(s, take, put) {
        var next = TX.clone(s);
        while (next.length < limit) next.push(null);
        for (var r of take) {
          if (r.kind !== 'item') return null;
          var left = r.amount,
            rid = R.identity(r);
          for (var i = 0; i < next.length && left; i++) {
            var v = next[i];
            if (!v || R.identity(R.item(v)) !== rid) continue;
            var n = Math.min(left, TX.count(v));
            left -= n;
            if (TX.count(v) === n) next[i] = null;
            else next[i].n = TX.count(v) - n;
          }
          if (left) return null;
        }
        for (var p of put) {
          if (this.room(next, p) < p.amount) return null;
          var left = p.amount,
            cap = p.attributes ? 1 : maxStack(p.key),
            pid = R.identity(p);
          for (var pass = 0; pass < 2 && left; pass++)
            for (var j = 0; j < limit && left; j++) {
              var old = next[j];
              if (pass === 0 && (!old || p.attributes || R.identity(R.item(old)) !== pid))
                continue;
              if (pass === 1 && old) continue;
              var n = Math.min(left, cap - (old ? TX.count(old) : 0));
              if (n > 0) {
                next[j] = R.native(R.amount(p, (old ? TX.count(old) : 0) + n));
                left -= n;
              }
            }
          if (left) return null;
        }
        return next;
      },
      write: function(s) {
        replace(arr, s);
      }
    });
  }

  function tanks(id, arr, options) {
    var caps = options.capacities.slice();
    caps.forEach(function(n) {
      R.integer(n, true);
    });
    return validate({
      id: id,
      storage: arr,
      read: function() {
        return TX.clone(arr);
      },
      resources: function(s) {
        return s.filter(Boolean).map(R.fluid);
      },
      room: function(s, r) {
        if (r.kind !== 'fluid' || options.accepts && !options.accepts(r.key)) return 0;
        return TX.fluidCaps(s,caps,r.key,options.fluidPolicy).reduce(function(n, cap, i) {
          var t = s[i];
          return R.add(n, !t || root.CONTENT.canonicalFluid(t.f) === r.key ? Math.max(0,
            cap - (t ? t.mb : 0)) : 0);
        }, 0);
      },
      apply: function(s, take, put) {
        if (take.concat(put).some(function(r) {
            return r.kind !== 'fluid';
          })) return null;
        var source = s.map(function(t) {
            return t ? R.native(R.fluid(t)) : null;
          }),
          drain = TX.planDrain(source, take.map(R.native));
        if (!drain) return null;
        for (var r of put)
          if (options.accepts && !options.accepts(r.key)) return null;
        return TX.planFill(drain.tanks, put.map(R.native), caps,false,options.fluidPolicy);
      },
      write: function(s) {
        replace(arr, s);
      }
    });
  }

  function Transaction(guard) {
    this.entries = new Map();
    this.guard = guard;
    this.closed = false;
  }
  Transaction.prototype.entry = function(adapter) {
    validate(adapter);
    var prior = this.entries.get(adapter.storage);
    if (prior && prior.adapter !== adapter) throw Error(
      'AE transaction has two adapters for one storage');
    if (!prior) {
      var before = adapter.read();
      prior = {
        adapter: adapter,
        before: before,
        next: TX.clone(before)
      };
      this.entries.set(adapter.storage, prior);
    }
    return prior;
  };
  Transaction.prototype.read = function(adapter) {
    return this.entry(adapter).next;
  };
  Transaction.prototype.stage = function(adapter, next) {
    if (this.closed) throw Error('AE transaction is closed');
    this.entry(adapter).next = TX.clone(next);
  };
  Transaction.prototype.edit = function(adapter, take, put) {
    if (this.closed) throw Error('AE transaction is closed');
    var e = this.entry(adapter),
      next = adapter.apply(e.next, take || [], put || []);
    if (next === null) return false;
    e.next = next;
    return true;
  };
  Transaction.prototype.commit = function() {
    if (this.closed) return {
      ok: false,
      code: 'CLOSED'
    };
    this.closed = true;
    var entries = Array.from(this.entries.values());
    if (this.guard && !this.guard() || entries.some(function(e) {
        return e.adapter.valid && !e.adapter.valid() || !same(e.adapter.read(), e.before);
      })) return {
      ok: false,
      code: 'CHANGED'
    };
    var written = [];
    try {
      entries.forEach(function(e) {
        written.push(e);
        e.adapter.write(e.next);
      });
    } catch (error) {
      var failures = [];
      written.reverse().forEach(function(e) {
        try {
          e.adapter.write(e.before);
        } catch (rollbackError) {
          failures.push(rollbackError);
        }
      });
      if (failures.length) error.rollbackErrors = failures;
      throw error;
    }
    commitObservers.forEach(function(observer) {
      observer(entries);
    });
    entries.forEach(function(e) {
      if (e.adapter.afterCommit) e.adapter.afterCommit(e.before, e.next);
    });
    if (this.onCommit) this.onCommit();
    return {
      ok: true
    };
  };

  function properties(id, object, fields) {
    return validate({
      id: id,
      storage: object,
      read: function() {
        var out = {};
        fields.forEach(function(k) {
          if (Object.prototype.hasOwnProperty.call(object, k)) out[k] = TX.clone(object[
            k]);
        });
        return out;
      },
      resources: function() {
        return [];
      },
      room: function() {
        return 0;
      },
      apply: function(s, take, put) {
        return take.length || put.length ? null : TX.clone(s);
      },
      write: function(s) {
        fields.forEach(function(k) {
          if (Object.prototype.hasOwnProperty.call(s, k)) object[k] = TX.clone(s[k]);
          else delete object[k];
        });
      }
    });
  }
  root.AE_STORAGE = {
    buffer: buffer,
    slots: slots,
    tanks: tanks,
    properties: properties,
    count: count,
    remove: remove,
    validate: validate,
    observeCommits: function(id, observer) {
      if (commitObservers.has(id) || typeof observer !== 'function') throw Error(
        'Invalid storage commit observer');
      commitObservers.set(id, observer);
    },
    Transaction: Transaction
  };
})(typeof window !== 'undefined' ? window : globalThis);
