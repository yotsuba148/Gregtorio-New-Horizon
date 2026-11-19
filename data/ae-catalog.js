(function(root) {
  'use strict';
  var ranks = new Map(), namespaces = /^(appliedenergistics2|ae2fc|ae2stuff|ae2thing|thaumicenergistics|WirelessCraftingTerminal):/;
  function rank(k) {
    var item = CONTENT.item(k), name = GD.items[k] || item.name,
      d = AE_CONTENT.devices[k], cell = AE_CONTENT.cells[k], port = AE_CONTENT.ports[CONTENT.baseKey(k)],
      capacity = /(?:^|[^\d])(\d+)\s*([kmg])(?:-|\b)/i.exec(name), size = capacity ? +capacity[1] * Math.pow(1024, 'kmg'.indexOf(capacity[2].toLowerCase()) + 1) : Infinity;
    if (d) {
      var role = d.role, powers = ['controller', 'acceptor', 'battery', 'creative', 'power_bridge'];
      if (powers.includes(role)) return [0, powers.indexOf(role), d.energyCapacity || 0];
      if (role === 'cable') return [1, Math.floor(item.meta / 20), d.color === 16 ? -1 : d.color];
      if (role === 'drive') return [2, d.cellSlots === 10 ? 0 : 1];
      if (role === 'terminal') return [4, d.patterns ? 2 : d.crafting ? 1 : d.interfaces ? 3 : 0, +!!d.fluids, +!!d.extended];
      if (['interface', 'storage_bus', 'import', 'export'].includes(role)) return [5, ['interface', 'storage_bus', 'import', 'export'].indexOf(role), +!!d.fluids];
      if (role === 'cpu' || role === 'cpu_unit') return [7, role === 'cpu' ? 1 : d.coProcessors ? 2 : 0, d.craftingBytes || d.coProcessors || 0];
      if (role === 'assembler') return [7, 3];
    }
    if (port) {
      var buffer = item.nbt && /baseCapacity\s*:\s*(\d+)/.exec(item.nbt);
      return [6, ['itemIn', 'fluidIn', 'itemOut', 'fluidOut'].indexOf(port.type), port.tier, +!!port.automatic, +!!port.patterns, buffer ? +buffer[1] : port.capacity || port.totalItemCapacity || 0];
    }
    if (cell || /存储元件$/.test(name)) return [3, cell ? cell.kind === 'item' ? 0 : cell.types > 1 ? 2 : 1 : /多流体/.test(name) ? 2 : /流体/.test(name) ? 1 : /源质/.test(name) ? 3 : 0, cell ? cell.bytes : size];
    if (/线缆/.test(name)) return [1, Math.floor(item.meta / 20), item.meta % 20 === 16 ? -1 : item.meta % 20];
    if (/存储(?:组件|外壳)/.test(name)) return [3, /外壳/.test(name) ? 5 : 4, /流体/.test(name) ? 1 : 0, size];
    if (/样板/.test(name)) return [8, 0];
    if (/卡$/.test(name)) return [8, 1];
    if (/终端/.test(name)) return [4, 9];
    if (/总线|接口|P2P通道/.test(name)) return [5, 9];
    return [9];
  }
  CONTENT.data.items.forEach(function(item) {
    var k = CONTENT.canonicalKey(item.k);
    if (!ranks.has(k) && (namespaces.test(k) || AE_CONTENT.ports[CONTENT.baseKey(k)])) ranks.set(k, rank(k));
  });
  ITEM_ORDER.register('ae', function(k) { return ranks.get(k); });
  root.AE_CATALOG = {rank: function(k) { return ranks.get(CONTENT.canonicalKey(k)); }};
})(typeof window !== 'undefined' ? window : globalThis);
