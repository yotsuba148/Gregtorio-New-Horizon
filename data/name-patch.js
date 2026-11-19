/* 物品改名补丁：在全部运行时脚本加载完之后执行，改 GD.items 与 CONTENT.item().name 两处。
   新增条目在这里追加，不要改 data/generated 里的原始数据。 */
(function(){
  var names={
    'gregtech:gt.blockmachines@26763':'EX 虚空矿机 I',
    'gregtech:gt.blockmachines@26764':'EX 虚空矿机 II',
    'gregtech:gt.blockmachines@26765':'EX 虚空矿机 III'
  };
  window.GD=window.GD||{};
  window.GD.items=window.GD.items||{};
  Object.keys(names).forEach(function(k){
    window.GD.items[k]=names[k];
    var it=window.CONTENT&&window.CONTENT.item&&window.CONTENT.item(k);
    if(it)it.name=names[k];
  });
})();
