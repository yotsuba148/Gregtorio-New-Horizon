(function () {
  'use strict';
  GD.assemblyResearch.items.forEach(function (item) {
    var output = CONTENT.item(item.assemblyOutput);
    ITEM_DESCRIPTIONS.set(item.k, '研究项目：' + (GD.items[item.assemblyOutput] || output.name));
  });
  CONTENT.data.items.forEach(function(item){
    if(item.id!=='bartworks:gt.bwMetaGeneratedItem0'||item.meta>1||!item.nbt)return;
    var circuit=ASSEMBLY_LINES.imprintedCircuit(item.k);
    if(!circuit)return;
    var name=GD.items[circuit]||CONTENT.item(circuit).name;
    GD.items[item.k]=(item.meta===0?'压印电路':'切片电路')+' · '+name;
  });
})();
