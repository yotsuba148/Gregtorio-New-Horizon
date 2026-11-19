/* Both absorber families store their generated EU in the regular generator buffer. */
(function(root){
  'use strict';
  var dragonEgg = 'minecraft:dragon_egg@0';
  var magicEggs = {[dragonEgg]: 1};
  // NH Utilities 1.6.0: block above sets the egg multiplier, the held core multiplies it again.
  var machineEggs = {
    'GalacticraftMars:tile.creeperEgg@0': 1,
    [dragonEgg]: 4,
    'NHUtilities:ChaosDragonEgg@0': 16,
    'witchery:infinityegg@0': 64,
    'NHUtilities:AncientDragonEgg@0': 256
  };
  var cores = {
    'DraconicEvolution:dragonHeart@0': 2,
    'DraconicEvolution:draconicCore@0': 4,
    'DraconicEvolution:wyvernCore@0': 8,
    'DraconicEvolution:awakenedCore@0': 16,
    'DraconicEvolution:chaoticCore@0': 32
  };

  function multiplier(table, stack){
    return stack && table[itemKey(stack.k)] || 0;
  }
  function itemKey(k){
    var key = CONTENT.baseKey(k);
    return key === 'minecraft:dragon_egg@32767' ? dragonEgg : key;
  }
  function createBehavior(eggs, boosters, message){
    var slots = boosters ? [eggs, boosters] : [eggs];
    function acceptsItemAt(m, k, index){
      return !!(slots[index] && slots[index][itemKey(k)]);
    }
    function amps(m){
      var items = m.ins || [];
      return multiplier(eggs, items[0]) * (boosters && multiplier(boosters, items[1]) || 1);
    }
    function tick(m, context){
      var current = amps(m);
      if(!current){
        m.status = {code: 'NO_EGG', text: message};
        return false;
      }
      var def = context.definition;
      var stored = m.eu || 0;
      var made = Math.min(def.energyCapacity - stored, def.volt * current);
      if(made <= 0){
        m.status = {code: 'ENERGY_FULL', text: boosters ? '电量已满 · ' + current.toLocaleString() + ' A' : '电量已满'};
        return false;
      }
      m.eu = stored + made;
      m.euMade = Math.min(Number.MAX_SAFE_INTEGER, (m.euMade || 0) + made);
      m.status = {
        code: 'GENERATING',
        text: boosters ? '发电中 · ' + current.toLocaleString() + ' A' : '发电中'
      };
      return true;
    }
    return {
      tick: tick,
      slotCaps: {in: slots.map(function(){return 1;})},
      acceptsItem: function(m, k){return slots.some(function(_, index){return acceptsItemAt(m, k, index);});},
      acceptsItemAt: acceptsItemAt,
      slotAccepts: function(m, index, s){return !s.entityUid && acceptsItemAt(m, s.k, index);},
      outputAmps: function(m){return amps(m) || 1;},
      layout: function(){
        var cells=boosters
          ? [{kind:'in',index:0,x:63,y:8,label:'蛋'}, {kind:'in',index:1,x:95,y:8,label:'核心'}]
          : [{kind:'in',index:0,x:79,y:8,label:'龙蛋'}, {kind:'out',index:0,x:113,y:8,onlyOccupied:true}];
        return {cells:cells,width:176,height:42,viewport:boosters
          ? {left:49,top:4,width:78,height:38}
          : {left:44,top:4,width:88,height:38}};
      },
      status: function(m, d, make){
        var code = m.status && m.status.code;
        if(code === 'GENERATING') return make('generating', m);
        if(code === 'ENERGY_FULL') return make('energyFull', m);
        if(code === 'NO_EGG') return make('fuel', m, message);
        return null;
      }
    };
  }

  root.ENGINE.registerBehavior('magic_absorber', createBehavior(magicEggs, null, '放入龙蛋即可发电'));
  root.ENGINE.registerBehavior('egg_generator', createBehavior(machineEggs, cores, '放入蛋开始发电'));
})(typeof window !== 'undefined' ? window : globalThis);
