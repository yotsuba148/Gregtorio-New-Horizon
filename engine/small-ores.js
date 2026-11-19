/* Native natural small-ore drop weights, using a saved action PRNG and the
 * same pending-output transaction as other acquisition scenes. Search time is
 * an idle-game design parameter; generation dimensions and drops are sourced. */
(function(root){
 'use strict';var C=CONTENT;
 function item(tag){var ids=C.data.ore[tag];if(!ids||!ids.length)return null;var key=C.canonicalKey(C.data.items[ids[0]].k);return C.item(key)?key:null;}
 function choices(mat){var result=[];
  [['gemExquisite',1,'gem'],['gemFlawless',2,'gem'],['gem',12],['gemFlawed',5,'crushed'],['crushed',10],['gemChipped',5,'dustImpure'],['dustImpure',10]].forEach(function(v){var k=item(v[0]+mat)||v[2]&&item(v[2]+mat);if(k)result.push({k:k,weight:v[1]});});return result;
 }
 var host={overworld:'Stone',nether:'Netherrack',end:'Endstone',twilight:'Stone'},registered=[];
 (GD.smallOreData&&GD.smallOreData.sources||[]).forEach(function(d){var pool=choices(d.material);if(!pool.length)return;
  var display=item('gem'+d.material)||item('crushed'+d.material)||pool[0].k,ore=item('oreSmall'+d.material),name=GD.items[ore]||'小块'+(GD.items[display]||d.material)+'矿石';
  var source=Object.assign({},d,{name:'搜寻'+name,scene:'零散小矿石',time:Math.max(8,240/d.amountPerChunk),conditions:{tool:'pick'},toolTypes:['pick'],effortTimeIsIdleDesign:true,out:[[display,1]],
   weightedDrops:{pool:pool,multiplier:d.oreMultiplier,hostDust:item('dust'+host[d.dim]),hostImpure:item('dustImpure'+host[d.dim])},provenance:GD.smallOreData.provenance});
  GD.sources.push(source);ACTIVITIES.register(source);registered.push(source);
 });
 root.SMALL_ORES={sources:registered,choices:choices};
})(typeof window!=='undefined'?window:globalThis);
