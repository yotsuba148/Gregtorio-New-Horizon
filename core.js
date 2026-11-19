/* core.js —— 纯逻辑层：库存、搬运事务、稳定编号。
 *
 * 这一层不碰 DOM，Node 里可以直接跑测试（见 工具/test_core.js）。
 * 上层（game.js / factory.js）只负责发命令、读状态、画界面。
 *
 * 两种容器形态都用同一个算法：
 *   槽位数组  —— 物品栏、箱子。固定长度，空格是 null。
 *   栈列表    —— 机器的 ins / outs。只有有货的条目，格数由定义给。
 * 传进来的容器统一包成 { arr, freeSlots() } 再算，避免两套规则各写一遍。
 */
(function (root) {
  'use strict';

  var DEFAULT_STACK = 64;
  var hooks = {};

  /* 上层注入：工具不能叠、某些物品有特殊堆叠上限 */
  function setHooks(h) {
    if (!h) return;
    if (typeof h.maxStackOf === 'function') hooks.maxStackOf = h.maxStackOf;
    if (typeof h.isTool === 'function') hooks.isTool = h.isTool;
    if (typeof h.canonicalKey === 'function') hooks.canonicalKey=h.canonicalKey;
  }

  function canonical(k){return hooks.canonicalKey?hooks.canonicalKey(k):root.CONTENT?root.CONTENT.canonicalKey(k):k;}
  function isInt(n) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n; }
  function isPosInt(n) { return isInt(n) && n > 0; }
  function isInstance(s){return !!s&&(s.n==null||Object.keys(s).some(function(k){return k!=='k'&&k!=='n'&&k!=='chance'&&k!=='slot';}));}

  function maxStack(k) {
    k=canonical(k);
    if (hooks.maxStackOf) {
      var v = hooks.maxStackOf(k);
      if (isPosInt(v)) return v;
    }
    if (hooks.isTool && hooks.isTool(k)) return 1;
    return DEFAULT_STACK;
  }

  /* ---------------- 容器包装 ---------------- */

  /* 槽位数组：物品栏、箱子 */
  function slotBox(arr) {
    return {
      arr: arr,
      kind: 'slots',
      freeSlots: function () {
        var n = 0;
        for (var i = 0; i < arr.length; i++) if (!arr[i]) n++;
        return n;
      }
    };
  }

  /* 栈列表：机器的输入/输出。limit 是这台机器定义的格数 */
  function stackBox(arr, limit) {
    return {
      arr: arr,
      kind: 'stacks',
      limit: limit,
      freeSlots: function () {
        var used = 0;
        for (var i = 0; i < arr.length; i++) if (arr[i]) used++;
        return Math.max(0, limit - used);
      }
    };
  }

  /* ---------------- 查询 ---------------- */

  function count(arr, k) {
    k=canonical(k);
    var n = 0;
    for (var i = 0; i < arr.length; i++) {
      var c = arr[i];
      if (c && canonical(c.k) === k) n += (c.n == null ? 1 : c.n);
    }
    return n;
  }

  /* 还能收多少个 k：已有同类堆的空位 + 空格能开的整组 */
  function roomFor(box, k) {
    k=canonical(k);
    var ms = maxStack(k), room = 0, i;
    for (i = 0; i < box.arr.length; i++) {
      var c = box.arr[i];
      if (c && !isInstance(c) && canonical(c.k) === k) room += Math.max(0, ms - (c.n == null ? 1 : c.n));
    }
    room += box.freeSlots() * ms;
    return room;
  }

  /* ---------------- 提交（调用前必须先 roomFor / count 算好） ---------------- */

  function insert(box, k, n) {
    k=canonical(k);
    var ms = maxStack(k), left = n, i;
    var arr = box.arr;

    // 1) 先并到同类堆
    for (i = 0; i < arr.length && left > 0; i++) {
      var c = arr[i];
      if (!c || isInstance(c) || canonical(c.k) !== k) continue;
      var cur = (c.n == null ? 1 : c.n);
      c.k=k;
      if (cur >= ms) continue;
      var t = Math.min(left, ms - cur);
      if (c.n == null) arr[i] = { k: k, n: 1 + t };
      else c.n += t;
      left -= t;
    }

    // 2) 再开新格
    //    栈列表没有"空格位"这回事，新堆就是往末尾加，所以不能按 arr.length 循环
    var free = box.freeSlots();
    if (box.kind === 'stacks') {
      while (left > 0 && free > 0) {
        var t2 = Math.min(left, ms);
        arr.push({ k: k, n: t2 });
        left -= t2;
        free--;
      }
    } else {
      for (i = 0; i < arr.length && left > 0; i++) {
        if (arr[i]) continue;
        var t3 = Math.min(left, ms);
        arr[i] = { k: k, n: t3 };
        left -= t3;
      }
    }
    return n - left;
  }

  function extract(box, k, n, opt) {
    k=canonical(k);
    var left = n, i;
    var onlyCounted = !!(opt && opt.onlyCounted);
    for (i = 0; i < box.arr.length && left > 0; i++) {
      var c = box.arr[i];
      if (!c || canonical(c.k) !== k) continue;
      if(opt&&opt.noEntity&&c.entityUid)continue;
      if (c.n == null) {              // 工具是整件：要么拿 1，要么不动
        if (onlyCounted) continue;    // 按数量扣的场合不动工具
        if (left >= 1) {
          box.arr[i] = null;
          left -= 1;
        }
        continue;
      }
      var t = Math.min(left, c.n);
      c.n -= t;
      left -= t;
      if (c.n <= 0) box.arr[i] = null;
    }
    return n - left;
  }

  /* ---------------- 一次搬运：查、算、一次提交 ---------------- */

  /* cmd = { from: box, to: box, k, n }
   * 返回 { moved, remainder, reason }
   * reason: OK / BAD_REQUEST / EMPTY_SOURCE / TARGET_FULL */
  function transferItems(cmd) {
    var k = canonical(cmd && cmd.k), n = cmd && cmd.n;
    if (!k || !isPosInt(n) || cmd.min!=null&&(!isInt(cmd.min)||cmd.min<0)) {
      return { moved: 0, remainder: (isInt(n) && n > 0) ? n : 0, reason: 'BAD_REQUEST' };
    }
    var from = cmd.from, to = cmd.to;
    if (!from || !to || !from.arr || !to.arr) {
      return { moved: 0, remainder: n, reason: 'BAD_REQUEST' };
    }
    if (from.arr === to.arr) return { moved: 0, remainder: n, reason: 'SAME_STORAGE' };
    var avail = count(from.arr, k);
    if (avail <= 0) return { moved: 0, remainder: n, reason: 'EMPTY_SOURCE' };

    var want = Math.min(n, avail);
    var room = roomFor(to, k);
    if (room <= 0) return { moved: 0, remainder: n, reason: 'TARGET_FULL' };

    // Preserve the actual instance payload (tool material, charge, wear, seed data).
    // Plans use detached arrays, so a rejected transfer cannot partially consume a source.
    var source = from.arr.map(function (s) { return s ? JSON.parse(JSON.stringify(s)) : null; });
    var target = to.arr.map(function (s) { return s ? JSON.parse(JSON.stringify(s)) : null; });
    var plannedTarget = to.kind === 'stacks' ? stackBox(target, to.limit) : slotBox(target);
    var remaining = want;
    for (var si = 0; si < source.length && remaining > 0; si++) {
      var actual = source[si];
      if (!actual || canonical(actual.k) !== k) continue;
      actual.k=k;
      var available = actual.n == null ? 1 : actual.n;
      var chunk = Math.min(available, remaining);
      if(actual.entityUid&&available!==1)return{moved:0,remainder:n,reason:'BAD_INSTANCE'};
      var put=0;
      if (isInstance(actual) || maxStack(k) === 1) {
        for (var ci = 0; ci < chunk; ci++) {
          var piece = JSON.parse(JSON.stringify(actual));
          if (actual.n != null) piece.n = 1;
          if (plannedTarget.kind === 'stacks') {if(plannedTarget.freeSlots()<=0)break;target.push(piece);}
          else {
            var empty = target.findIndex(function (s) { return !s; });
            if (empty < 0) break;
            target[empty] = piece;
          }
          put++;
        }
      } else put=insert(plannedTarget,k,chunk);
      if(!put)continue;
      if (actual.n == null || available === put) source[si] = null;
      else actual.n -= put;
      remaining -= put;
    }
    var moved=want-remaining;if(!moved||cmd.min!=null&&moved<cmd.min)return{moved:0,remainder:n,reason:'TARGET_FULL'};
    if(from.kind==='stacks')source=source.filter(Boolean);
    if(to.kind==='stacks')target=target.filter(Boolean);
    from.arr.splice.apply(from.arr, [0, from.arr.length].concat(source));
    to.arr.splice.apply(to.arr, [0, to.arr.length].concat(target));

    return {
      moved: moved,
      remainder: n - moved,
      reason: moved >= n ? 'OK' : (moved < want ? 'TARGET_FULL' : 'EMPTY_SOURCE')
    };
  }


  function transferSlot(cmd){
    if(!cmd||!cmd.from||!cmd.to||cmd.from.arr===cmd.to.arr)return{moved:0,reason:'BAD_REQUEST'};
    var item=cmd.from.arr[cmd.index];if(!item)return{moved:0,reason:'EMPTY_SOURCE'};
    var temp=[JSON.parse(JSON.stringify(item))],result=transferItems({from:slotBox(temp),to:cmd.to,k:item.k,n:cmd.n||item.n||1,min:cmd.min});
    if(result.moved)cmd.from.arr[cmd.index]=temp[0];return result;
  }
  function organize(arr,compare){
    var out=[],plain=Object.create(null);
    arr.forEach(function(s){if(!s)return;var k=canonical(s.k);
      if(s.n==null||Object.keys(s).some(function(k){return k!=='k'&&k!=='n';})){var instance=JSON.parse(JSON.stringify(s));instance.k=k;out.push(instance);return;}
      plain[k]=(plain[k]||0)+s.n;
    });
    Object.keys(plain).forEach(function(k){var left=plain[k],cap=maxStack(k);while(left>0){var n=Math.min(left,cap);out.push({k:k,n:n});left-=n;}});
    out.sort(function(a,b){return compare?compare(a.k,b.k):a.k.localeCompare(b.k);});while(out.length<arr.length)out.push(null);
    arr.splice.apply(arr,[0,arr.length].concat(out));return arr;
  }
  /* ---------------- 流体 ---------------- */

  /* 罐子就是 {f, mb} 或 null。容量按机器定义给。 */
  function fluidRoom(tank, f, cap) {
    if (!tank || !tank.f) return cap;
    if (tank.f !== f) return 0;
    return Math.max(0, cap - (tank.mb || 0));
  }

  /* 返回新的罐子对象，不改原来的（方便失败时整体丢弃） */
  function fluidAdd(tank, f, mb, cap) {
    if (mb <= 0) return tank;
    var room = fluidRoom(tank, f, cap);
    if (room <= 0) return tank;
    var put = Math.min(mb, room);
    if (!tank || !tank.f) return { f: f, mb: put };
    return { f: tank.f, mb: tank.mb + put };
  }

  function fluidTake(tank, mb) {
    if (!tank) return { tank: null, got: 0 };
    var got = Math.min(mb, tank.mb || 0);
    var left = (tank.mb || 0) - got;
    return { tank: left > 0 ? { f: tank.f, mb: left } : null, got: got };
  }

  /* ---------------- 稳定编号 ---------------- */

  function nextUid(seq) {
    return 'e' + (++seq.n);
  }

  var api = {
    setHooks: setHooks,
    maxStack: maxStack,
    isInstance:isInstance,
    isPosInt: isPosInt,
    isInt: isInt,
    slotBox: slotBox,
    stackBox: stackBox,
    count: count,
    roomFor: roomFor,
    insert: insert,
    extract: extract,
    transferItems: transferItems,
    transferSlot:transferSlot,organize:organize,
    fluidRoom: fluidRoom,
    fluidAdd: fluidAdd,
    fluidTake: fluidTake,
    nextUid: nextUid
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  root.CORE = api;
  if (typeof globalThis !== 'undefined' && globalThis !== root) globalThis.CORE = api;
})(typeof window !== 'undefined' ? window : globalThis);
