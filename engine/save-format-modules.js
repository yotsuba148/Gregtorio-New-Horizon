/* This list specifies dependency order only; each owner implements its format. */
(function(root){
 'use strict';
 var M=SAVE_MIGRATIONS;
 M.register('identity',{steps:[SAVE_ITEMS.migrate]});
 M.register('page',{steps:[PAGE_SAVE.migrate],restore:PAGE_SAVE.restore});
 M.register('factory-fields',{steps:[FACTORY_STATE.migrate]});
 M.register('runtime',{steps:[ENGINE.migrateFields]});
 M.register('packed-entities',{steps:[ENTITIES.migratePickup]});
 M.register('space',{steps:[SPACE_FACILITIES.migrate]});
 M.register('smeltery',{steps:[SMELTERY.migrate]});
 M.register('world',{steps:[WORLD_DISCOVERY.migrate,WORLD_WORK.migrate,WORLD_SITES.retireLiquidSites],restore:WORLD_DISCOVERY.restore});
 M.register('coke-oven',{steps:[COKE_OVEN.migrate]});
 M.register('multiblocks',{steps:[MULTIBLOCKS.migrate],restore:MULTIBLOCKS.restore});
 M.register('workstations',{steps:[TINKER_WORKSTATIONS.migrate]});
 M.register('water',{steps:[WATER.migrate]});
 M.register('connections',{steps:[PIPE_CONNECTIONS.migrate]});
 M.register('fusion-layout',{steps:[FUSION_REACTORS.migrate,FUSION_REACTORS.retireMaintenance]});
 M.register('installations',{steps:[function(S){MULTIBLOCKS.pruneInstalled(S);MACHINE_COVERS.pruneInstalled(S);PIPE_CONNECTIONS.pruneCovers(S);},MULTIBLOCKS.pruneInstalled]});
 M.register('factory',{steps:[],restore:function(S){FACTORY_STATE.prepare(S);FLUID_CONTAINERS.migrate(S);},validate:function(S){GRID_SPACE.validateSaved(S);}});
 M.register('ae',{steps:[function(S){if(!S.ae)return;AE_STATE.ensure(S);(S.fx&&S.fx.machines||[]).forEach(function(m){if(AE_LEGACY.migrate(S,m)===false)throw Error('AE旧投料配置无法转换：'+m.uid);});}],restore:function(S){if(S.ae)AE_STATE.ensure(S);}});
 M.register('factory-layout',{steps:[FACTORY_LAYOUT.migrateWorkshop],restore:FACTORY_LAYOUT.restore});
})(typeof window!=='undefined'?window:globalThis);
