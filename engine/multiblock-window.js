/* 多方块机器窗口：结构、端口、机器自定义面板。
 * 单方块机器的配方与输入输出设置在 factory 的单方块分支里，不经过这里。 */
(function (root) {
  'use strict';

  function managed(m) {
    return !!(root.MULTIBLOCKS && MULTIBLOCKS.managed && MULTIBLOCKS.managed(m));
  }

  function supported(m) {return !!MULTIBLOCKS.shape(m);}

  function behaviorOf(m) {
    var d = root.DEFS && DEFS.of(m && m.k);
    return d && root.ENGINE && ENGINE.behaviors ? ENGINE.behaviors[d.behavior] : null;
  }

  function mount(box, m, S, save) {
    if (!box || !managed(m)) return false;
    var d = root.DEFS && DEFS.of(m.k);
    box.querySelector('.machine-window').classList.toggle('logistics-multiblock',!!(d&&d.logisticsDevice));
    box.classList.toggle('mb-generator', !!(d && (d.generator || d.behavior === 'gt_ic2_reactor')));
    box.querySelector('.machine-window').classList.add('four-zone-machine');
    var structure = box.querySelector('.structure-host');
    if (structure && root.STRUCTURE_UI) STRUCTURE_UI.mount(structure, m, S, save);
    if(root.RESOURCE_UI)RESOURCE_UI.mount(box.querySelector('.resource-host'),m,S,save);
    var host = box.querySelector('.behavior-host');
    var hook = behaviorOf(m);
    if (host && hook && hook.mount) hook.mount(host, m, S, save);
    return true;
  }

  function size(height,zoom,available,preferred){
    var scale=zoom<=1.5?Math.min(1,height/490,available/510):1;
    var width=Math.min(preferred||600,(available-24)/scale);
    return {width:width,scale:scale,height:height/scale};
  }

  root.MULTIBLOCK_WINDOW = { managed: managed, supported: supported, mount: mount, size: size };
})(typeof window !== 'undefined' ? window : globalThis);
