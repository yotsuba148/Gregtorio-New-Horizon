/* Forestry EnumAllele.Sappiness / Chromosome.getActiveAllele. */
(function(root){
 'use strict';
 var alleles={};
 [['Lowest',0.1,true],['Lower',0.2,true],['Low',0.3,true],['Average',0.4,true],['High',0.6,true],['Higher',0.8,false],['Highest',1,false]].forEach(function(a){alleles['forestry.sappiness'+a[0]]={value:a[1],dominant:a[2]};});
 function active(primary,secondary){var a=alleles[primary],b=alleles[secondary];if(!a||!b)return null;return a.dominant?a:b.dominant?b:a;}
 function fermentationModifier(item){
  if(!item||item.id!=='Forestry:sapling'||!item.nbt)return 1;
  var n=SNBT.tryParse(item.nbt),chromosomes=n&&n.Genome&&n.Genome.Chromosomes;
  if(n&&!n.Genome)return 1;
  if(!Array.isArray(chromosomes))return null;
  var gene=chromosomes.find(function(c){return c.Slot===7;}),a=gene&&active(gene.UID0,gene.UID1);
  return a?Math.fround(Math.fround(a.value)*10):null;
 }
 root.GENETICS={active:active,fermentationModifier:fermentationModifier,sappiness:alleles};
})(typeof window!=='undefined'?window:globalThis);
