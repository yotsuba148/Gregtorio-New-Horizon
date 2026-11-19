/* 物品耐久：只负责“这件物品还剩多少、磨损多少、磨完变成什么”。 */
(function (root) {
  'use strict';

  function table() {
    return (root.GD && GD.itemDurability) || {};
  }

  function spec(key) {
    var t = table();
    return key ? t[key] || null : null;
  }

  function isDurable(key) {
    return !!spec(key);
  }

  function max(key) {
    var s = spec(key);
    return s ? s.max : 0;
  }

  function remaining(stack) {
    if (!stack) return 0;
    var s = spec(stack.k);
    if (!s) return 0;
    var used = Number(stack.dmg) || 0;
    return Math.max(0, s.max - used);
  }

  function entry(key) {
    var s = spec(key);
    if (!s) throw Error('Item has no durability: ' + key);
    return { k: key, n: 1, dmg: 0 };
  }

  /* 磨损：只改传入的物品对象。返回 {broke, stack}，broke 时 stack 是替换后的物品或 null。 */
  function wear(stack, amount) {
    var s = stack && spec(stack.k);
    if (!s) return { broke: false, stack: stack };
    var step = Math.max(0, Math.floor(Number(amount) || 0));
    if (!step) return { broke: false, stack: stack };
    var used = Math.min(s.max, (Number(stack.dmg) || 0) + step);
    if (used < s.max) {
      stack.dmg = used;
      return { broke: false, stack: stack };
    }
    if (!s.spent) return { broke: true, stack: null };
    return { broke: true, stack: { k: s.spent, n: 1 } };
  }

  function spent(key) {
    var s = spec(key);
    return s ? s.spent : null;
  }

  root.ITEM_DURABILITY = {
    isDurable: isDurable,
    max: max,
    remaining: remaining,
    entry: entry,
    spent: spent,
    wear: wear
  };
  if (typeof module === 'object' && module.exports) module.exports = root.ITEM_DURABILITY;
})(typeof window !== 'undefined' ? window : globalThis);
