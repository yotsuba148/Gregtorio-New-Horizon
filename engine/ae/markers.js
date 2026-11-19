/* 标记槽：只记身份，不持有实物。请求器、过滤器等需要"记号"的地方共用。 */
(function(root) {
  'use strict';

  // 统一成 {kind, key}；老的物品栈写法 {k, n} 也认
  function normalize(mark) {
    if (!mark) return null;
    if (mark.kind && typeof mark.key === 'string' && mark.key) return {kind: mark.kind, key: mark.key};
    if (typeof mark.k === 'string' && mark.k) return {kind: 'item', key: mark.k};
    return null;
  }

  function ensure(list, size) {
    if (!Array.isArray(list)) return Array(size || 0).fill(null);
    while (list.length < size) list.push(null);
    return list;
  }

  function get(list, index) {
    return list && list[index] ? normalize(list[index]) : null;
  }

  function set(list, index, mark) {
    var value = normalize(mark);
    if (!value || !Array.isArray(list) || index < 0 || index >= list.length) return false;
    list[index] = value;
    return true;
  }

  function clear(list, index) {
    if (!Array.isArray(list) || index < 0 || index >= list.length) return false;
    list[index] = null;
    return true;
  }

  root.AE_MARKERS = {normalize: normalize, ensure: ensure, get: get, set: set, clear: clear};
})(typeof window !== 'undefined' ? window : globalThis);
