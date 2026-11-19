/* 动力仓：识别多方块上的发电输出端口，并给出这一面能送出的电压与电流。 */
(function (root) {
  'use strict';

  var TIERS = { ULV: 0, LV: 1, MV: 2, HV: 3, EV: 4, IV: 5, LuV: 6, ZPM: 7, UV: 8, UHV: 9, UEV: 10, UIV: 11, UMV: 12, UXV: 13, MAX: 14 };
  var cache = new Map();

  function name(key) {
    return (root.GD && GD.items && GD.items[key]) || '';
  }

  function spec(key) {
    if (cache.has(key)) return cache.get(key);
    var out = null, a = /^gregtech:gt\.blockmachines@(\d+)$/.exec(key || '');
    var table = (root.GD && GD.dynamoHatches) || {};
    if (a && table[a[1]]) {
      var row = table[a[1]];
      var volt = (root.DEFS && DEFS.voltOf) ? DEFS.voltOf(TIERS[row.tier]) : 0;
      var multi=row.amps>1;
      out = { key: key, type: 'dynamo', tier: TIERS[row.tier], amperage: row.amps, voltage: volt,
        energyCapacity: 512 + (multi ? volt * 4 * row.amps : DEFS.voltOf(TIERS[row.tier]+1) * 2),
        minimumOutputEnergy: multi ? 128 * row.amps : 512 }; 
    }
    cache.set(key, out);
    return out;
  }

  function isDynamo(key) {
    var s = spec(key);
    return !!s;
  }

  function viaPorts(m) {
    if (!m || !m.structure || !m.structure.ports) return [];
    return m.structure.ports.filter(function (p) {
      return isDynamo(p.k);
    }).map(function (p) {
      return Object.assign({ face: p.face, uid: p.uid }, spec(p.k));
    });
  }

  /* 这一面能不能往外送电：只有动力仓所在的面可以。 */
  function outputSide(m, side) {
    if (!m || !m.worldFace) return false;
    return viaPorts(m).some(function (d) {
      var w = root.MULTIBLOCKS.worldFace(m, d.face);
      return w && w.side === side;
    });
  }

  function capacity(m){return viaPorts(m).reduce(function(n,p){return n+p.energyCapacity;},0);}
  // Producers offer EU. This module alone applies output-port rate and space.
  function offer(m,power){
    var left=Math.max(0,Math.floor(power)),made=0;
    (m.structure&&m.structure.ports||[]).forEach(function(p){var d=spec(p.k);if(!d)return;
      var n=Math.min(left,d.voltage*d.amperage,Math.max(0,d.energyCapacity-(p.eu||0)));
      p.eu=(p.eu||0)+n;left-=n;made+=n;
    });return made;
  }

  root.MULTIBLOCK_POWER = {
    spec: spec,capacity:capacity,offer:offer,
    isDynamo: isDynamo,
    dynamos: viaPorts,
    outputSide: outputSide
  };
  if (typeof module === 'object' && module.exports) module.exports = root.MULTIBLOCK_POWER;
})(typeof window !== 'undefined' ? window : globalThis);
