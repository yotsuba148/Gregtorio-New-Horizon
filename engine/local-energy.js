(function(root){
 'use strict';
 function compatible(source,target){return source&&target&&source.volt>0&&source.volt<=target.volt;}
 function transfer(generator,consumer){
  var source=DEFS.of(generator.k),target=DEFS.of(consumer.k);
  if(!compatible(source,target)||consumer.enabled===false)return 0;
  var debit=source.outputDrain||source.volt,packets=Math.max(0,Math.min(Math.floor(((generator.eu||0)-(source.minimumOutputEnergy||0))/debit),Math.floor((target.energyCapacity-(consumer.eu||0))/source.volt),source.amperage||1,target.amperage||1));
  if(!packets)return 0;var n=source.volt*packets,loss=(debit-source.volt)*packets;generator.eu=(generator.eu||0)-n-loss;generator.energyOutputLoss=(generator.energyOutputLoss||0)+loss;consumer.eu=(consumer.eu||0)+n;return n;
 }
 root.LOCAL_ENERGY={compatible:compatible,transfer:transfer};
})(typeof window!=='undefined'?window:globalThis);
