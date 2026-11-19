(function(root) {
  'use strict';
  var handlers = new WeakMap(),
    R = AE_RESOURCES;

  function context(m) {
    var c = AE_FACTORY.contextFor(m), n = c && c.byId.get(m.uid);
    return n && n.entity === m && n.role === 'interface' && n.spec.fluids &&
      ENTITIES.active(m) ? c : null;
  }

  // External fill is a network operation; configured stock tanks remain independent.
  function handler(m) {
    var h = handlers.get(m);
    if (h) return h;
    h = {
      id: 'me-interface-ingress:' + m.uid,
      tanks: [],
      caps: [],
      kind: 'sink',
      object: m,
      inputRoom: function(fluid, source) {
        var c = context(m);
        return c ? AE_DELIVERY.capacity(c, m.uid, R.fluid({f: fluid, mb: 1}), source && source.tanks) : 0;
      },
      receiveFrom: function(source, index, fluid, amount) {
        var c = context(m);
        if (!c || source.valid && !source.valid()) return 0;
        var a = AE_ADAPTERS.fluidSlot(source.tanks, index, source.caps[index], source.valid),
          receipt = AE_DELIVERY.deposit(c, m.uid, a, [R.fluid({f: fluid, mb: amount})]);
        return AE_STORAGE.count(receipt.moved || [], R.fluid({f: fluid, mb: 1}));
      }
    };
    handlers.set(m, h);
    return h;
  }
  root.AE_FLUID_INGRESS = {handler: handler};
})(typeof window !== 'undefined' ? window : globalThis);
