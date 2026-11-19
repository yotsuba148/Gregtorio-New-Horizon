/* 流体储罐行为：GT 数字储罐、RC 储罐、GT++ 储罐共用。
   容器转换、储液状态、单格储罐的紧凑界面都在这一处，不再散落在 runtime / machine-status / machine-layout。 */
(function(root){
 'use strict';
 function instance(m){ return root.STRUCTURES ? STRUCTURES.instance(m) : null; }
 root.declareBehavior('fluid_storage', {
  retainsContents: true,
  voidProtection: false,
  ensure: function(m){
   if(root.DIGITAL_TANKS) DIGITAL_TANKS.ensure(m);
   if(root.FLUID_CONTAINERS) FLUID_CONTAINERS.ensure(m);
  },
  tick: function(m){
   var changed = root.FLUID_CONTAINERS ? FLUID_CONTAINERS.tick(m) : false;
   m.status = {code: 'STORAGE', text: m.tanksIn[0] ? '储存 ' + m.tanksIn[0].mb + ' mB' : '空储罐'};
   return changed;
  },
  acceptsItem: function(m, k){ return !!(root.FLUID_CONTAINERS && FLUID_CONTAINERS.accepts(m, k)); },
  acceptsFluid: function(m, f){
   var d = instance(m);
   return (!d.requiresStructure || !!(m.structure && m.structure.formed)) && (!m.lockedFluid || m.lockedFluid === f);
  },
  status: function(m, d, make){
   var tanks = m.tanksIn || [];
   var amount = tanks.reduce(function(n, t){ return n + (t && t.mb || 0); }, 0);
   var capacity = (d.fluidInputTanks || []).reduce(function(n, v){ return n + v; }, 0);
   var label = (tanks.filter(function(t){ return t && t.mb > 0; })
     .map(function(t){ return (root.GD.fluids || {})[t.f] || t.f; }).join('、') || '空罐');
   return make(amount <= 0 ? 'storageEmpty' : amount >= capacity ? 'storageFull' : 'storing', m,
     label + '，' + amount + ' / ' + capacity + ' mB');
  },
  layout: function(d){
   if(!d.requiresStructure) return null;
   return {cells: [{kind: 'fin', index: 0, x: 8, y: 8}], circuit: null, progress: null, width: 34, height: 34};
  }
 });
})(typeof window !== 'undefined' ? window : globalThis);
