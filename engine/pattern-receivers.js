/* A pattern medium may offer one ordered resource bundle to a logistics device.
 * Offers describe receiver-owned state; the sender includes them in its transaction.
 * No CPU, order, recipe matching or machine-processing state crosses this boundary. */
(function(root){
 'use strict';
 var receivers=new Map();
 function register(id,describe){if(receivers.has(id)||typeof describe!=='function')throw Error('Invalid pattern receiver '+id);receivers.set(id,describe);}
 function at(machine,cell,side){for(var describe of receivers.values()){var result=describe(machine,cell,side);if(result!==undefined)return result;}}
 root.PATTERN_RECEIVERS={register:register,at:at};
})(typeof window!=='undefined'?window:globalThis);
