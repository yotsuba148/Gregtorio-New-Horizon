(function(root) {
  'use strict';
  var providers = new Map(), inlets = new Map();

  function register(id, provider) {
    if (!id || providers.has(id) || !provider || typeof provider.input !== 'function') throw Error(
      'Invalid processing-input provider: ' + id);
    providers.set(id, provider);
  }

  function input(machine, recipe, world, options) {
    if(root.PROCESSING_INPUT_POLICY){var selected=PROCESSING_INPUT_POLICY.input(machine,recipe,world,options);if(selected!==undefined)return selected;}
    for (var provider of providers.values()) {
      var access = provider.input(machine, recipe, world, options);
      if (access !== undefined) return access;
    }
  }

  function candidates(machine, definition, group, world) {
    if(root.PROCESSING_INPUT_POLICY){var selected=PROCESSING_INPUT_POLICY.candidates(machine,definition,group,world);if(selected!==undefined)return selected;}
    for (var provider of providers.values())
      if (provider.candidates) {
        var recipes = provider.candidates(machine, definition, group, world);
        if (recipes !== undefined) return recipes;
      }
  }

  function registerInlet(id, describe) {
    if(inlets.has(id)||typeof describe!=='function')throw Error('Invalid input capability: '+id);
    inlets.set(id,describe);
  }

  function watchInputs(machine, world, add) {
    function stacks(values, fluid) {
      add(values && values.length);
      for (var value of values || []) {
        add(value ? (fluid ? value.f : value.k) : null);
        add(value ? (fluid ? value.mb : value.n) : null);
        if (!fluid) add(value && value.entityUid);
      }
    }
    function configuration(owner) {
      add(owner.circ); add(owner.circuitConfigured);
      stacks(owner.configurationItems || (owner.configurationItem ? [owner.configurationItem] : []), false);
    }
    var multi = root.MULTIBLOCKS && MULTIBLOCKS.live(machine), structure = machine.structure;
    add(structure); add(structure && structure.formed);
    configuration(machine);
    if (multi) {
      add(structure.inputSeparation);
      configuration(MULTIBLOCKS.controllerCircuit(machine));
      var ports = MULTIBLOCKS.ports(machine);
      add(ports.length);
      for (var port of ports) {
        var spec = MULTIBLOCKS.spec(port.k);
        // Identity and position also detect removal, replacement and reordering.
        add(port); add(port.k); add(port.face);
        if (!spec || !spec.itemIn && !spec.fluidIn) continue;
        configuration(port);
        if (spec.itemIn) stacks(port.items, false);
        if (spec.fluidIn) stacks(port.tanks, true);
      }
    } else {
      stacks(machine.ins, false);
      stacks(machine.tanksIn, true);
    }
    add(providers.size);
    for (var provider of providers.values()) {
      // An untracked provider disables sleeping rather than losing a wake-up.
      if (!provider.watch || provider.watch(machine, world, add) === false) return false;
    }
    return true;
  }
  // Describes receiver-owned input storage and configuration. It has no order,
  // recipe, processing-state or sender identity.
  function inlet(machine, port, side) {
    if(port&&!portAvailable(machine,port))return {bindings:[],configuration:null};
    for(var describe of inlets.values()){
      var custom=describe(machine,port,side);
      if(custom!==undefined)return custom;
    }
    var d=STRUCTURES.instance(machine),multi=MULTIBLOCKS.live(machine),N=ENGINE.networks;
    if(!d||d.behavior!=='batch_processor')return;
    var portSpec=multi&&port&&MULTIBLOCKS.spec(port.k),bus=portSpec&&portSpec.itemIn?port:null;
    if(multi&&(!portSpec||!portSpec.itemIn&&!portSpec.fluidIn))return {bindings:[],configuration:null};
    if(bus&&MULTIBLOCKS.spec(bus.k).stocking)return {code:'STOCKING_PORT'};
    var bindings=[],configuration=multi?bus:machine;
    if(multi&&!configuration&&MULTIBLOCKS.supportsControllerCircuit(machine)){
      configuration=machine.controllerCircuit||(machine.controllerCircuit={circ:0,circuitConfigured:false});
    }
    if(!multi&&!d.controlCircuit)configuration=null;
    function itemInput(owner,arr,limit){
      bindings.push({kind:'item',owner:owner,array:arr,slots:limit,
        valid:function(){return ENTITIES.active(machine)&&(multi?MULTIBLOCKS.byUid(machine,owner.uid)===owner&&owner.items===arr:machine.ins===arr);},
        accepts:function(k){return TRANSPORT_PORTS.acceptsItem(N,machine,k);}});
    }
    if(multi){
      if(bus)itemInput(bus,bus.items,MULTIBLOCKS.spec(bus.k).slots);
      (portSpec.fluidIn&&portSpec.externalFluidIn!==false&&!portSpec.stocking?[port]:[]).forEach(function(p){
        var arr=p.tanks,key=p.k;bindings.push({kind:'fluid',owner:p,array:arr,capacities:MULTIBLOCKS.tankCaps(portSpec),fluidPolicy:portSpec.fluidInputPolicy,
          valid:function(){return ENTITIES.active(machine)&&MULTIBLOCKS.byUid(machine,p.uid)===p&&p.k===key&&p.tanks===arr;},
          accepts:function(f){return TRANSPORT_PORTS.acceptsFluid(N,machine,f);}});
      });
    }else{
      if(d.slots.in&&TRANSPORT_PORTS.inputSide(N,machine,side,'item'))itemInput(machine,machine.ins,d.slots.in);
      if(d.fluidInputTanks.length&&TRANSPORT_PORTS.inputSide(N,machine,side,'fluid')){
        var arr=machine.tanksIn;bindings.push({kind:'fluid',owner:machine,array:arr,capacities:d.fluidInputTanks,
          valid:function(){return ENTITIES.active(machine)&&machine.tanksIn===arr;},
          accepts:function(f){return TRANSPORT_PORTS.acceptsFluid(N,machine,f);}});
      }
    }
    return {bindings:bindings,configuration:configuration};
  }
  // Reusable configuration items belong to the processing side. AE asks this
  // module instead of matching the machine mod's namespace or item ids itself.
  var shapeKeys;
  function shapes() {
    if (shapeKeys === undefined) {
      shapeKeys = new Set();
      var rules = root.MACHINE_STORAGE_RULES || {};
      (rules.molds || []).forEach(function(k) { shapeKeys.add(k); });
      (rules.dies || []).forEach(function(k) { shapeKeys.add(k); });
      // Dreamcraft 的模具没进 GT 的登记表，按身份补上
      Object.keys(CONTENT.items || {}).forEach(function(k) {
        var d = CONTENT.items[k];
        if (d && /^dreamcraft:item\.Mold/i.test(d.id || '')) shapeKeys.add(k);
      });
    }
    return shapeKeys;
  }
  function isConfigurationItem(item) {
    var d = item && CONTENT.item(item.k);
    if (!d) return false;
    if (d.id === 'gregtech:gt.integrated_circuit' && d.meta >= 0 && d.meta <= 24) return true;
    var set = shapes(), key = item.k, base = CONTENT.baseKey(key);
    return set.has(key) || set.has(base);
  }
  function circuitNumber(item) {
    var d=item&&CONTENT.item(item.k);
    return d&&d.id==='gregtech:gt.integrated_circuit'&&d.meta>=0&&d.meta<=24?d.meta:null;
  }
  var circuitKeys;
  function circuitKey(number) {
    if(circuitKeys===undefined){
      circuitKeys=new Map();
      CONTENT.data.items.forEach(function(i){
        if(i.id==='gregtech:gt.integrated_circuit'&&i.meta>=0&&i.meta<=24&&!circuitKeys.has(i.meta))circuitKeys.set(i.meta,CONTENT.canonicalKey(i.k));
      });
    }
    return circuitKeys.get(number);
  }
  function isProcessingOwner(key) {
    return /^gregtech:/.test(key||'');
  }
  // Everything AE needs to know about one processing port. AE asks for this
  // instead of reading MULTIBLOCKS specs, so port kinds stay on this side.
  function portInfo(port) {
    var s=port&&root.MULTIBLOCKS&&MULTIBLOCKS.spec(port.k);
    if(!s)return null;
    return {me:!!s.me,patterns:!!s.patterns,patternSlots:s.patternSlots||0,
      stocking:!!s.stocking,stockingTypes:!!s.stockingTypes,fluidOut:!!s.fluidOut,dual:!!s.dual,
      itemIn:!!s.itemIn,itemOut:!!s.itemOut,fluidIn:!!s.fluidIn,fluidOut:!!s.fluidOut,
      slots:s.slots||0,capacity:s.capacity||0,stock:!!s.stock,samples:s.samples||0,
      outputFluidBuffer:s.outputFluidBuffer,commitOutputFluids:s.commitOutputFluids};
  }
  function portAvailable(machine,port){
    return !root.MACHINE_MODES||!MACHINE_MODES.portIssue(machine,MULTIBLOCKS.spec(port.k));
  }
  // Physical input storage owned by the receiver, described by the processing
  // side. AE enumerates this list instead of reading each port spec itself.
  // role: 'pattern' (ME pattern buffer), 'stocking' (ME network view) or ''.
  function sources(machine, group) {
    var list=[], multi=root.MULTIBLOCKS&&MULTIBLOCKS.live(machine), d;
    function role(s) {
      return s&&s.me?(s.patterns?'pattern':s.stocking?'stocking':''):'';
    }
    if(!multi){
      d=STRUCTURES.instance(machine);
      if(!d)return list;
      var ins=machine.ins,tanks=machine.tanksIn;
      if(d.slots&&d.slots.in&&ins)list.push({kind:'item',owner:machine,array:ins,slots:d.slots.in,role:'',
        valid:function(){return ENTITIES.active(machine)&&machine.ins===ins;}});
      if(d.fluidInputTanks&&d.fluidInputTanks.length)list.push({kind:'fluid',owner:machine,array:tanks,
        capacities:d.fluidInputTanks,role:'',
        valid:function(){return ENTITIES.active(machine)&&machine.tanksIn===tanks;}});
      return list;
    }
    var bus=group&&MULTIBLOCKS.byUid(machine,group),
      buses=bus?[bus]:MULTIBLOCKS.members(machine,'ins');
    buses.forEach(function(p){
      var s=MULTIBLOCKS.spec(p.k),arr=p.items;
      if(!s)return;
      list.push({kind:'item',owner:p,array:arr,slots:s.slots,role:role(s),
        valid:function(){return MULTIBLOCKS.byUid(machine,p.uid)===p&&p.items===arr;}});
    });
    if(bus&&MULTIBLOCKS.spec(bus.k).patterns)return list;
    MULTIBLOCKS.members(machine,'tanksIn').forEach(function(p){
      var s=MULTIBLOCKS.spec(p.k),arr=p.tanks,key=p.k;
      if(!s)return;
      list.push({kind:'fluid',owner:p,array:arr,capacities:MULTIBLOCKS.tankCaps(s),fluidPolicy:s.fluidInputPolicy,role:role(s),
        valid:function(){return MULTIBLOCKS.byUid(machine,p.uid)===p&&p.k===key&&p.tanks===arr;}});
    });
    return list;
  }
  function circuits(items,selected) {
    return Array.from(new Set((selected||[]).concat(items.map(circuitNumber).filter(function(n){return n!=null;}))));
  }
  // The configuration slot is not inventory. In GT it can contain a zero-size
  // reusable item as well as a numbered circuit (MTEBasicMachine.getAllInputs).
  function configuration(machine) {
    return machine.configurationItem || null;
  }
  function configurationItems(machine, group) {
    function items(owner){return owner.configurationItems|| (configuration(owner)?[configuration(owner)]:[]);}
    if (!root.MULTIBLOCKS || !MULTIBLOCKS.live(machine)) return items(machine);
    var owners = group ? [MULTIBLOCKS.byUid(machine, group)] : MULTIBLOCKS.members(machine, 'ins');
    if (MULTIBLOCKS.supportsControllerCircuit(machine)) owners.push(MULTIBLOCKS.controllerCircuit(machine));
    return owners.filter(Boolean).flatMap(items);
  }
  function satisfies(machine, requirement, recipe, matches, group) {
    return configurationItems(machine, group).some(function(item) {
      return item.n >= (requirement.n || 1) && matches(requirement, item, recipe);
    });
  }
  root.PROCESSING_ACCESS = {
    register: register,
    input: input,
    candidates: candidates,
    watchInputs: watchInputs,
    registerInlet: registerInlet,
    inlet: inlet,
    sources: sources,
    circuits: circuits,
    circuitNumber: circuitNumber,
    circuitKey: circuitKey,
    isConfigurationItem: isConfigurationItem,
    isProcessingOwner: isProcessingOwner,
    portInfo: portInfo,
    portAvailable: portAvailable,
    configuration: configuration,
    configurationItems: configurationItems,
    satisfies: satisfies
  };
})(typeof window !== 'undefined' ? window : globalThis);
