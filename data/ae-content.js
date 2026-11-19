(function(root) {
  'use strict';
  var devices = {},
    cells = {},
    ports = {};

  function device(key, role, options) {
    key = CONTENT.canonicalKey(key);
    if (CONTENT.item(key)) devices[key] = Object.assign({
      role: role,
      idleAE: 0.5
    }, options || {});
  }
  var part = 'appliedenergistics2:item.ItemMultiPart@';
  device('appliedenergistics2:tile.BlockController@0', 'controller', {
    idleAE: 3,
    receiveEU: true,
    energyCapacity: 4000
  });
  // 晶体催生：种子 + AE 能量 → 晶体
  device('appliedenergistics2:tile.BlockQuartzGrowthAccelerator@0', 'grower', {
    idleAE: 2,
    nativeSlots: {in: 1, out: 1},
    grower: {
      'appliedenergistics2:item.ItemCrystalSeed@0': 'appliedenergistics2:item.ItemMultiMaterial@0',
      'appliedenergistics2:item.ItemCrystalSeed@600': 'appliedenergistics2:item.ItemMultiMaterial@2',
      'appliedenergistics2:item.ItemCrystalSeed@1200': 'appliedenergistics2:item.ItemMultiMaterial@7'
    }
  });
  device('ae2stuff:Grower@0', 'grower', {
    idleAE: 2,
    nativeSlots: {in: 1, out: 1},
    grower: {
      'appliedenergistics2:item.ItemCrystalSeed@0': 'appliedenergistics2:item.ItemMultiMaterial@0',
      'appliedenergistics2:item.ItemCrystalSeed@600': 'appliedenergistics2:item.ItemMultiMaterial@2',
      'appliedenergistics2:item.ItemCrystalSeed@1200': 'appliedenergistics2:item.ItemMultiMaterial@7'
    }
  });
  // AE2FC 的 ME请求器：库存低于设定值时自动下单补齐
  device('ae2fc:level_maintainer@0', 'maintainer', {
    idleAE: 1
  });
  // AE2Stuff 的无线接入器：成对配对后等价于一条不限距离的线缆
  var wirelessMetas = [0];
  for (var wm = 17; wm <= 34; wm++) wirelessMetas.push(wm);
  wirelessMetas.forEach(function(meta) {
    device('ae2stuff:Wireless@' + meta, 'wireless', {
      idleAE: 1
    });
  });
  device('appliedenergistics2:tile.BlockEnergyAcceptor@0', 'acceptor', {
    idleAE: 0,
    receiveEU: true,
    energyCapacity: 4000
  });
  device('appliedenergistics2:tile.BlockEnergyCell@0', 'battery', {
    idleAE: 0,
    energyCapacity: 100000
  });
  device('appliedenergistics2:tile.BlockDenseEnergyCell@0', 'battery', {
    idleAE: 0,
    energyCapacity: 800000
  });
  device('appliedenergistics2:tile.BlockCreativeEnergyCell@0', 'creative', {idleAE: 0, creativePower: true});
  device('appliedenergistics2:tile.BlockCreativeEnergyController@0', 'creative', {idleAE: 0, creativePower: true});
  device('appliedenergistics2:tile.BlockDrive@0', 'drive', {
    idleAE: 2,
    cellSlots: 10
  });
  device('appliedenergistics2:tile.BlockChest@0', 'drive', {
    idleAE: 1,
    cellSlots: 1,
    terminal: true
  });
  device('appliedenergistics2:tile.BlockWireless@0', 'terminal', {
    idleAE: 1,
    terminal: true,
    wireless: true
  });
  device('appliedenergistics2:tile.BlockCellWorkbench@0', 'cellworkbench', {
    idleAE: 1,
    cellSlots: 1
  });
  device('appliedenergistics2:tile.BlockIOPort@0', 'ioport', {
    idleAE: 1,
    cellSlots: 10
  });
  device(part + '280', 'level', {
    idleAE: 1,
    target: true
  });
  ['460', '463', '466', '468', '470', '471'].forEach(function(meta) {
    device(part + meta, 'p2p', {
      idleAE: 1,
      target: true
    });
  });
  device('appliedenergistics2:tile.BlockInterface@0', 'interface', {
    idleAE: 1,
    patternSlots: 9,
    itemSlots: 9
  });
  device(part + '440', 'interface', {
    idleAE: 1,
    patternSlots: 9,
    itemSlots: 9
  });
  device('ae2fc:fluid_interface@0', 'interface', {
    idleAE: 1,
    patternSlots: 9,
    itemSlots: 9,
    fluids: true
  });
  device('ae2fc:part_fluid_interface@0', 'interface', {
    idleAE: 1,
    patternSlots: 9,
    itemSlots: 9,
    fluids: true
  });
  device(part + '220', 'storage_bus', {
    target: true
  });
  device(part + '240', 'import', {
    target: true,
    rate: 1,
    period: 8
  });
  device(part + '260', 'export', {
    target: true,
    rate: 1,
    period: 8
  });
  device('ae2fc:part_fluid_storage_bus@0', 'storage_bus', {
    target: true,
    fluids: true
  });
  device('ae2fc:part_fluid_import@0', 'import', {
    target: true,
    fluids: true,
    rate: 1000,
    period: 8
  });
  device('ae2fc:part_fluid_export@0', 'export', {
    target: true,
    fluids: true,
    rate: 1000,
    period: 8
  });
  device(part + '380', 'terminal', {
    terminal: true
  });
  device(part + '360', 'terminal', {
    terminal: true,
    crafting: true
  });
  device(part + '340', 'terminal', {
    terminal: true,
    patterns: true
  });
  device(part + '500', 'terminal', {
    extended: true,
    terminal: true,
    patterns: true
  });
  device('ae2fc:part_fluid_terminal@0', 'terminal', {
    terminal: true,
    fluidOnly: true,
    fluids: true
  });
  device('ae2fc:part_fluid_pattern_terminal@0', 'terminal', {
    terminal: true,
    patterns: true,
    fluids: true
  });
  device('ae2fc:part_fluid_pattern_terminal_ex@0', 'terminal', {
    extended: true,
    terminal: true,
    patterns: true,
    fluids: true
  });
  device(part + '480', 'terminal', {
    terminal: true,
    interfaces: true
  });
  device(part + '140', 'power_bridge', {
    idleAE: 0
  });
  device('appliedenergistics2:tile.BlockMolecularAssembler@0', 'assembler', {
    idleAE: 0,
    patternSlots: 1,
    nativeSlots: {
      in: 9,
      out: 1,
      fluid: 0
    },
    returnSlots: 9
  });
  device('appliedenergistics2:tile.BlockCraftingUnit@0', 'cpu_unit', {
    idleAE: 0
  });
  [1, 4, 16].forEach(function(n, i) {
    device('appliedenergistics2:tile.BlockCraftingUnit@' + (i + 1), 'cpu_unit', {
      idleAE: 0,
      coProcessors: n
    });
  });
  // 高级并行处理单元：同一条目下的 64/256/4096 核
  [[0, 64], [1, 256], [2, 1024], [3, 4096]].forEach(function(pair) {
    device('appliedenergistics2:tile.BlockAdvancedCraftingUnit@' + pair[0], 'cpu_unit', {
      idleAE: 0,
      coProcessors: pair[1]
    });
  });
  device('appliedenergistics2:tile.BlockCraftingMonitor@0', 'cpu_unit', {
    idleAE: 0
  });
  [1, 4, 16, 64].forEach(function(k, i) {
    device('appliedenergistics2:tile.BlockCraftingStorage@' + i, 'cpu', {
      idleAE: 0,
      craftingBytes: k * 1024
    });
    var itemKey = 'appliedenergistics2:item.ItemBasicStorageCell.' + k + 'k@0';
    if (CONTENT.item(itemKey)) cells[itemKey] = {
      kind: 'item',
      bytes: k * 1024,
      bytesPerType: k * 8,
      types: 63,
      unitsPerByte: 8,
      idleAE: 0.5 + i * 0.5
    };
  });
  [256, 1024, 4096, 16384].forEach(function(k, i) {
    device('appliedenergistics2:tile.BlockAdvancedCraftingStorage@' + i, 'cpu', {
      idleAE: 0,
      craftingBytes: k * 1024
    });
    var itemKey = 'appliedenergistics2:item.ItemAdvancedStorageCell.' + k + 'k@0';
    if (CONTENT.item(itemKey)) cells[itemKey] = {
      kind: 'item',
      bytes: k * 1024,
      bytesPerType: k * 8,
      types: 63,
      unitsPerByte: 8,
      idleAE: 2.5 + i * 0.5
    };
  });
  [1, 4, 16, 64, 256, 1024, 4096, 16384].forEach(function(k, i) {
    ['fluid_storage', 'multi_fluid_storage'].forEach(function(family) {
      var key = 'ae2fc:' + family + k + '@0',
        multi = family === 'multi_fluid_storage';
      if (CONTENT.item(key)) cells[key] = {
        kind: 'fluid',
        bytes: k * 1024,
        bytesPerType: multi ? k * 8 : 8,
        types: multi ? 5 : 1,
        unitsPerByte: 2048,
        idleAE: 0.5 + i * 0.5
      };
    });
  });
  Object.keys(GD.items).forEach(function(key) {
    var m = /^appliedenergistics2:item\.ItemMultiPart@(\d+)$/.exec(key);
    if (!m) return;
    var meta = +m[1],
      base = Math.floor(meta / 20) * 20,
      color = meta % 20;
    if ([0, 20, 40, 60, 520].includes(base) && color <= 16) device(key, 'cable', {
      idleAE: 0,
      color: color
    });
  });
  Object.values(devices).forEach(function(d) {
    if (d.role === 'import' || d.role === 'export') {
      if (d.fluids) {
        d.tankSlots = 1;
        d.tankCapacity = 1000;
      } else d.itemSlots = 1;
    }
    if (d.role === 'interface' && d.fluids) {
      d.tankSlots = 6;
      d.tankCapacity = 16000;
    }
  });

  function port(meta, type, extra) {
    var k = 'gregtech:gt.blockmachines@' + meta;
    if (CONTENT.item(k)) ports[k] = Object.assign({
      type: type,
      tier: 4,
      me: true,
      samples: 16,
      itemIn: type === 'itemIn',
      itemOut: type === 'itemOut',
      fluidIn: type === 'fluidIn',
      fluidOut: type === 'fluidOut'
    }, extra);
  }
  port(2718, 'itemIn', {
    tier: 3,
    slots: 16,
    stocking: true
  });
  port(2711, 'itemIn', {
    tier: 6,
    slots: 16,
    stocking: true,
    automatic: true
  });
  port(2717, 'fluidIn', {
    tier: 8,
    capacity: 2147483647,
    stocking: true
  });
  port(2712, 'fluidIn', {
    tier: 9,
    capacity: 2147483647,
    stocking: true,
    automatic: true
  });
  port(2710, 'itemOut', {
    tier: 3,
    slots: 25,
    totalItemCapacity: 1600
  });
  port(2713, 'fluidOut', {
    tier: 3,
    capacity: 128000
  });
  port(2715, 'itemIn', {
    tier: 6,
    slots: 9,
    patterns: true,
    patternSlots: 36
  });
  port(2714, 'itemIn', {
    tier: 10,
    slots: 9,
    patterns: true,
    patternSlots: 36,
    dual: true
  });
  root.AE_CONTENT = {
    blankPatternCapacity: 640,
    devices: devices,
    cells: cells,
    ports: ports
  };
})(typeof window !== 'undefined' ? window : globalThis);
