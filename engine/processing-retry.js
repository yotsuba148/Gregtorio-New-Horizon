(function(root) {
  'use strict';
  // Only material/configuration failures may sleep. Power, output space and
  // machine-specific conditions keep their existing per-tick checks.
  var materialFailures = new Set(['ITEM_INPUT', 'FLUID_INPUT', 'CIRCUIT', 'WAITING_INPUT']);
  var fallbackTicks = 600;

  function same(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function snapshot(machine, definition, world, content) {
    var profile = root.STRUCTURES && STRUCTURES.profile(machine);
    // Custom recipe construction/selection can depend on more than inventory.
    // It must retain its original checks until it supplies its own dependencies.
    if (content !== root.CONTENT || definition.recipeCandidates || definition.inputPolicy ||
        definition.parallelPerTier || definition.maxParallel || definition.recipeParallelLimit ||
        content.dynamicFamilies[definition.recipeMap] ||
        profile && (profile.prepareRecipe || profile.filterCandidates)) return null;
    var values = [world && world.state, machine.k, machine.recipeLock,
      machine.processingMode, definition.recipeMap, content.itemRevision,
      content.customRecipes, content.customRecipes.length,
      root.CONTENT_SCOPE && CONTENT_SCOPE.version];
    function add(value) { values.push(value); }
    // The receiver describes physical storage; external providers append opaque
    // revisions. This never enumerates the contents of an ME network.
    if (!root.PROCESSING_ACCESS || !PROCESSING_ACCESS.watchInputs(machine, world, add)) return null;
    return values;
  }

  function State(content) {
    this.content = content;
    this.waiting = new WeakMap();
  }
  State.prototype.begin = function(machine, definition, world) {
    var tick = root.ENGINE && ENGINE.tick;
    if (!Number.isSafeInteger(tick)) return null;
    var values = snapshot(machine, definition, world, this.content);
    if (!values) { this.waiting.delete(machine); return null; }
    var prior = this.waiting.get(machine);
    if (prior && prior.status === machine.status && tick >= prior.tick && tick - prior.tick < fallbackTicks &&
        same(prior.values, values)) return false;
    return {values: values, tick: tick, onlyMaterials: true};
  };
  State.prototype.observed = function(attempt, result) {
    if (attempt && (!result || !materialFailures.has(result.code))) attempt.onlyMaterials = false;
  };
  State.prototype.failed = function(machine, attempt, status) {
    if (attempt && attempt.onlyMaterials && materialFailures.has(status.code)) {
      attempt.status = status;
      this.waiting.set(machine, attempt);
    }
    else this.waiting.delete(machine);
  };
  State.prototype.forget = function(machine) { this.waiting.delete(machine); };
  root.PROCESSING_RETRY = {State: State};
})(typeof window !== 'undefined' ? window : globalThis);
