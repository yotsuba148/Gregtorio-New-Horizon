/* 行为登记入口。比 runtime 先加载的模块（发电机、锅炉这类 runtime 依赖其处理器）可以先声明行为，
   runtime 建好后再统一注册；runtime 之后加载的模块直接注册。这样每台机器的行为都能留在自己的模块里，
   共享的 runtime 不需要知道有哪些机器。 */
(function(root){
 'use strict';
 var queue = root.BEHAVIOR_QUEUE || (root.BEHAVIOR_QUEUE = []);
 function declare(id, handler){
  if(root.ENGINE && root.ENGINE.registerBehavior) return root.ENGINE.registerBehavior(id, handler);
  queue.push([id, handler]);
  return handler;
 }
 function flush(register){
  var pending = queue.splice(0, queue.length);
  pending.forEach(function(pair){ register(pair[0], pair[1]); });
  return pending.length;
 }
 root.declareBehavior = declare;
 root.BEHAVIOR_REGISTRY = {declare: declare, flush: flush, queue: queue};
})(typeof window !== 'undefined' ? window : globalThis);
