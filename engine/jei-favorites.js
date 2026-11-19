/* 物品收藏（A 键）：把鼠标下的物品存成一份快照放进 JEI 侧栏的收藏页，再按 A 取消。
   存的是副本，不跟踪库存数量；比较也按副本内容，内容不同就是两条书签。 */
(function (root) {
  'use strict';

  var CAP = 240;

  function ensure(state) {
    var j = state.jei = state.jei || {};
    if (!Array.isArray(j.favorites)) j.favorites = [];
    j.favorites = j.favorites.filter(function (s) { return s && (s.k || s.f); }).slice(0, CAP);
    return j.favorites;
  }

  function clone(stack) {
    return JSON.parse(JSON.stringify(stack));
  }

  /* 按内容比较：对象键排序后序列化，避免键顺序不同被当成两条 */
  function canonical(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    return '{' + Object.keys(value).sort().map(function (k) {
      return JSON.stringify(k) + ':' + canonical(value[k]);
    }).join(',') + '}';
  }

  function identity(stack) {
    var copy = {};
    Object.keys(stack || {}).forEach(function (k) {
      if (stack[k] === undefined || stack[k] === null) return;
      copy[k] = stack[k];
    });
    if (copy.k && copy.n == null) copy.n = 1;
    if (copy.f && copy.mb == null) copy.mb = 1000;
    return canonical(copy);
  }

  function list(state) {
    return ensure(state).slice();
  }

  function toggle(state, stack) {
    if (!stack || (!stack.k && !stack.f)) return { ok: false, code: 'ITEM' };
    var items = ensure(state);
    var id = identity(stack);
    for (var i = 0; i < items.length; i++) {
      if (identity(items[i]) === id) {
        items.splice(i, 1);
        return { ok: true, added: false, index: i };
      }
    }
    if (items.length >= CAP) return { ok: false, code: 'FULL' };
    items.unshift(clone(stack));
    return { ok: true, added: true, index: 0 };
  }

  function removeAt(state, index) {
    var items = ensure(state);
    if (!Number.isInteger(index) || index < 0 || index >= items.length) return { ok: false, code: 'SIDE' };
    items.splice(index, 1);
    return { ok: true, added: false };
  }

  function keyOf(state, index) {
    var items = ensure(state);
    return items[index] ? (items[index].k || items[index].f) : null;
  }

  /* JEI 的格子是虚拟绘制、pointer-events 为 none，elementFromPoint 会漏掉它们，
     所以按坐标在候选元素里再找一遍，取面积最小（最内层）的那个。 */
  var CANDIDATES = '[data-fav-index],[data-jei-key],[data-lookup-key],[data-lookup-fluid],[data-quest-item],[data-item]';
  function hitTest(x, y) {
    var top = document.elementFromPoint(x, y);
    if (top && top.closest && top.closest(CANDIDATES)) return top;
    var best = null, bestArea = Infinity;
    var list = document.querySelectorAll(CANDIDATES);
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (!el.getClientRects().length) continue;
      var r = el.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
      var area = r.width * r.height;
      if (area < bestArea) { bestArea = area; best = el; }
    }
    return best || top;
  }

  var point = null, installed = false;

  function init(getState, persist) {
    if (installed) return;
    installed = true;
    document.addEventListener('pointermove', function (e) {
      point = { x: e.clientX, y: e.clientY };
    }, { passive: true });
    window.addEventListener('blur', function () { point = null; });

    document.addEventListener('keydown', function (e) {
      if (!point || e.defaultPrevented || e.repeat || e.isComposing || e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key.toLowerCase() !== 'a') return;
      var from = e.target && e.target.closest ? e.target : null;
      if (from && from.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]')) return;
      var node = hitTest(point.x, point.y);
      if (!node || !node.closest || node.closest('[hidden]')) return;
      var S = getState();
      if (!S) return;

      var fav = node.closest('[data-fav-index]');
      if (fav) {
        e.preventDefault();
        e.stopPropagation();
        removeAt(S, +fav.dataset.favIndex);
        if (persist) persist();
        if (root.JEI && JEI.refreshSaved) JEI.refreshSaved();
        if (root.toastAt) toastAt(null, '已取消收藏');
        return;
      }

      var stack = root.RECIPE_KEYS && RECIPE_KEYS.stackOf ? RECIPE_KEYS.stackOf(node, S) : null;
      if (!stack) {
        var hit = root.RECIPE_KEYS && RECIPE_KEYS.target ? RECIPE_KEYS.target(node, S) : null;
        if (!hit) return;
        if (hit.target === 'fluid') stack = { f: hit.key, mb: 1000 };
        else stack = { k: hit.key, n: 1 };
      }
      e.preventDefault();
      e.stopPropagation();
      var result = toggle(S, stack);
      if (!result.ok) {
        if (root.toastAt) toastAt(null, result.code === 'FULL' ? '收藏已满' : '这件物品无法收藏');
        return;
      }
      if (persist) persist();
      if (root.JEI && JEI.refreshSaved) JEI.refreshSaved();
      if (root.toastAt) toastAt(null, result.added ? '已收藏' : '已取消收藏');
    });
  }

  root.JEI_FAVORITES = {
    ensure: ensure,
    list: list,
    toggle: toggle,
    removeAt: removeAt,
    keyOf: keyOf,
    identity: identity,
    init: init
  };
})(typeof window !== 'undefined' ? window : globalThis);
