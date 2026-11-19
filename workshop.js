 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
(function (root) {
  'use strict';

  var MACHINE_PREFIX = 'gregtech:gt.blockmachines@';

  function nid(o) { o.seq = (o.seq || 0) + 1; return o.seq; }

  function blank() { return { seq: 0, areas: [] }; }

  // 老存档没有 ws 字段，补一个空的；结构不对的整块丢掉重建。
  function ensure(S) {
    var w = S.ws;
    if (!w || typeof w !== 'object' || !Array.isArray(w.areas)) {
      S.ws = blank();
    }
    var o = S.ws;
    if (typeof o.seq !== 'number') o.seq = 0;
    o.areas.forEach(function (a) {
      if (typeof a.id !== 'number') a.id = nid(o);
      if (typeof a.name !== 'string') a.name = a.id + ' 号区';
      a.power = a.power || {};
      a.machine = a.machine || {};
      if (!Array.isArray(a.power.slots)) a.power.slots = [];
      if (!Array.isArray(a.machine.slots)) a.machine.slots = [];
      a.power.slots.forEach(function (s, i) {
        if (typeof s.id !== 'number') s.id = i + 1;
        if (typeof s.name !== 'string') s.name = '发电机 ' + s.id;
        if (!('gen' in s)) s.gen = null;
      });
      a.machine.slots.forEach(function (s, i) {
        if (typeof s.id !== 'number') s.id = i + 1;
        if (!('m' in s)) s.m = null;
      });
    });
    if(root.ENTITIES)o.areas.forEach(function(a){
      ['power','machine'].forEach(function(part){
        a[part].slots.forEach(function(slot){
          var field=part==='power'?'gen':'m',it=slot[field];if(!it)return;
          var m=it.uid?ENTITIES.get(S,it.uid):null;
          if(!m)m=ENTITIES.create(S,it.k,{kind:'workshop',areaId:a.id,part:part,slotId:slot.id},it);
          slot[field]={k:m.k,uid:m.uid};
        });
      });
    });
    return o;
  }

  function newArea(S) {
    var o = ensure(S);
    var a = {
      id: nid(o), name: (o.areas.length + 1) + ' 号区',
      power: { slots: [] }, machine: { slots: [] }
    };
    o.areas.push(a);              // 发电区和机器区是一起生出来的，不用再建
    return a;
  }

  function dropArea(S, id) {
    var o = ensure(S);
    var a=o.areas.find(function(a){return a.id===id;});if(a&&a.power.slots.concat(a.machine.slots).some(function(s){return s.gen||s.m;}))return false;
    o.areas = o.areas.filter(function (a) { return a.id !== id; });
  }

  // part: 'power' | 'machine'。装东西的槽位不许直接删，先清空。
  function newSlot(S, id, part) {
    var a = find(S, id);
    if (!a) return null;
    var list = a[part].slots;
    var s;
    if (part === 'power') {
      s = { id: list.length + 1, name: '发电机 ' + (list.length + 1), gen: null };
    } else {
      s = { id: list.length + 1, m: null };
    }
    list.push(s);
    return s;
  }

  function dropSlot(S, id, part, sid) {
    var a = find(S, id);
    if (!a) return false;
    var list = a[part].slots;
    var i = list.findIndex(function (s) { return s.id === sid; });
    if (i < 0) return false;
    if (list[i].gen || list[i].m) return false;   // 有东西就不让删
    list.splice(i, 1);
    list.forEach(function (s, k) { s.id = k + 1; });   // 编号顺延
    return true;
  }

  function find(S, id) {
    var o = ensure(S);
    for (var i = 0; i < o.areas.length; i++) {
      if (o.areas[i].id === id) return o.areas[i];
    }
    return null;
  }

  function findSlot(S, id, part, sid) {
    var a = find(S, id);
    if (!a || !a[part]) return null;
    var list = a[part].slots;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === sid) return list[i];
    }
    return null;
  }

  function slotItem(slot, part) {
    return slot ? (part === 'power' ? slot.gen : slot.m) : null;
  }

  function renameArea(S, id, name) {
    var a = find(S, id);
    if (!a) return false;
    a.name = String(name || '').slice(0, 24) || a.name;
    return true;
  }

  function renameSlot(S, id, sid, name) {
    var a = find(S, id);
    if (!a) return false;
    var s = a.power.slots.find(function (x) { return x.id === sid; });
    if (!s) return false;
    s.name = String(name || '').slice(0, 24) || s.name;
    return true;
  }

  // ---------------------------------------------------------------- 放入 / 取出

  /** 发电机表（扁平，data/machines.js 的 gens）。 */
  function genInfo(k) {
    var gs = GD().machines && GD().machines.gens;
    if (!gs) return null;
    for (var i = 0; i < gs.length; i++) if (gs[i].k === k) return gs[i];
    return null;
  }

  /** 这台东西能不能放进槽位：必须是 gt.blockmachines，加工机器和发电机都认。 */
  function canHold(k) {
    if (!k) return false;
    return !!DEFS.of(k);
  }

  /** 从 data/machines.js 里查这台机器的信息（类别、电压）。 */
  function machineInfo(k) {
    var cats = GD().machines && GD().machines.cats;
    if (!cats) return null;
    for (var i = 0; i < cats.length; i++) {
      var ts = cats[i].tiers || [];
      for (var j = 0; j < ts.length; j++) {
        if (ts[j].k === k) {
          return { cat: cats[i], tier: ts[j] };
        }
      }
    }
    return null;
  }

  /** 放进槽位：从库存扣 1 件（物品栏优先，再箱子）。 */
  function put(S, id, part, sid, k) {
    var slot = findSlot(S, id, part, sid);
    if (!slot) return false;
    if (slotItem(slot, part)) return false;          // 先取出来再换
    if (!canHold(k)) return false;
    var def=root.DEFS.of(k);if(!def||(part==='power'&&!def.generator)||(part==='machine'&&def.generator))return false;
    var result=ENTITIES.deploy(S,k,{kind:'workshop',areaId:id,part:part,slotId:sid});if(!result.ok)return false;
    if(part==='power')slot.gen={k:k,uid:result.machine.uid};else slot.m={k:k,uid:result.machine.uid};
    return true;
  }

  /** 取回：还回仓库（game.js 的 gain 先进箱子）。 */
  function pull(S, id, part, sid) {
    var slot = findSlot(S, id, part, sid);
    if (!slot) return false;
    var it = slotItem(slot, part);
    if (!it) return false;
    var result=ENTITIES.pack(S,it.uid);if(!result.ok)return false;
    if (part === 'power') slot.gen = null; else slot.m = null;
    return true;
  }

  /** 槽位之间搬家，不碰库存。 */
  function move(S, from, to) {
    var a = findSlot(S, from.area, from.part, from.sid);
    var b = findSlot(S, to.area, to.part, to.sid);
    if (!a || !b || a === b) return false;
    var it = slotItem(a, from.part);
    if (!it) return false;
    if (slotItem(b, to.part)) return false;
    var def=root.DEFS.of(it.k);if(!def||(to.part==='power'&&!def.generator)||(to.part==='machine'&&def.generator))return false;
    if(to.part==='power')b.gen=it;else b.m=it;
    var entity=ENTITIES.get(S,it.uid);if(entity)entity.location={kind:'workshop',areaId:to.area,part:to.part,slotId:to.sid};
    if (from.part === 'power') a.gen = null; else a.m = null;
    return true;
  }

  // ---------------------------------------------------------------- 界面

  function el(tag, cls, text) {
    var d = root.document.createElement(tag);
    if (cls) d.className = cls;
    if (text != null) d.textContent = text;
    return d;
  }

  // data/*.js 都挂在 window.GD 上；浏览器里 root 就是 window，
  // 测试沙箱里 root 是 context 全局、window 是另一个对象，所以两边都试。
  function GD() {
    return (root.window && root.window.GD) || root.GD || {};
  }

  function iconOf(k) {
    if (typeof root.iconOrText === 'function') return root.iconOrText(k, 28);
    return '';
  }

  function nameOf(k) {
    var it = GD().items;
    if (it && it[k]) return it[k];
    var g = genInfo(k);
    if (g && g.name) return g.name;
    var m = machineInfo(k);              // 物品表里没有的机器，回退机器清单里的名字
    if (m && m.tier && m.tier.name) return m.tier.name;
    if (typeof root.nameOf === 'function') return root.nameOf(k) || k;
    return k;
  }

  function render(S, onSave) {
    var o = ensure(S);
    var box = el('div', 'ws-root');
    var bar = el('div', 'ws-top');
    var add = el('button', 'ws-btn', '＋ 新建区');
    add.onclick = function () { newArea(S); onSave && onSave(); rerender(); };
    bar.appendChild(add);
    box.appendChild(bar);

    if (!o.areas.length) {
      box.appendChild(el('div', 'ws-empty', '还没有区。建一个区，发电区和机器区会跟着一起出来。'));
    }

    o.areas.forEach(function (a) {
      var area = el('div', 'ws-area');
      var head = el('div', 'ws-area-head');
      var nm = el('input', 'ws-name');
      nm.value = a.name;
      nm.onchange = function () { renameArea(S, a.id, nm.value); onSave && onSave(); };
      head.appendChild(nm);
      var del = el('button', 'ws-x', '删区');
      del.onclick = function () {
        if (!o.areas.length) return;
        dropArea(S, a.id); onSave && onSave(); rerender();
      };
      head.appendChild(del);
      area.appendChild(head);

      area.appendChild(part(S, a, 'power', '发电区', '发电机', onSave));
      area.appendChild(part(S, a, 'machine', '机器区', '机器', onSave));
      box.appendChild(area);
    });

    function rerender() {
      var p = box.parentNode;
      if (!p) return;
      p.replaceChild(render(S, onSave), box);
    }
    return box;
  }

  function part(S, a, key, title, noun, onSave) {
    var wrap = el('div', 'ws-mid');
    var h = el('div', 'ws-mid-head');
    h.appendChild(el('span', 'ws-mid-t', title));
    var b = el('button', 'ws-btn', '＋ 新建' + noun + '槽位');
    b.onclick = function () { newSlot(S, a.id, key); onSave && onSave(); redraw(); };
    h.appendChild(b);
    wrap.appendChild(h);

    var list = el('div', 'ws-grid');
    if (!a[key].slots.length) {
      list.appendChild(el('div', 'ws-empty', '空着，点上面那个按钮加一个。'));
    }
    a[key].slots.forEach(function (s) {
      var it = slotItem(s, key);
      var c = el('div', 'ws-slot' + (it ? ' filled' : ''));
      c.dataset.wslot = a.id + ':' + key + ':' + s.id;
      if (key === 'power') {
        var ni = el('input', 'ws-slot-name');
        ni.value = s.name;
        ni.onchange = function () {
          renameSlot(S, a.id, s.id, ni.value); onSave && onSave();
        };
        c.appendChild(ni);
      }
      var hole = el('div', 'ws-hole');
      hole.innerHTML = it ? iconOf(it.k) : '';
      if (!it) hole.textContent = '空';
      c.appendChild(hole);
      var cap = el('div', 'ws-cap', it ? nameOf(it.k) : (key === 'power' ? '未装发电机' : '未装机器'));
      c.appendChild(cap);

      c.onclick = function (ev) {
        if (ev && ev.target && ev.target.closest && ev.target.closest('.ws-x')) return;
        if (it) slotMenu(S, a, key, s, onSave, redraw);
        else picker(S, a, key, s, onSave, redraw);
      };
      if (it) {
        c.draggable = true;
        c.ondragstart = function (ev) {
          if (!ev.dataTransfer) return;
          ev.dataTransfer.effectAllowed = 'move';
          ev.dataTransfer.setData('text/plain', it.k);
          ev.dataTransfer.setData('application/x-ws-slot', a.id + ':' + key + ':' + s.id);
        };
      }

      // 槽位暂时不给删：右上角不放叉号，免得误触把整格抹掉
      list.appendChild(c);
    });
    wrap.appendChild(list);

    function redraw() {
      var p = wrap.parentNode;
      if (!p) return;
      p.replaceChild(part(S, a, key, title, noun, onSave), wrap);
    }
    return wrap;
  }

  // ---------------------------------------------------------------- 弹窗

  function modal(title) {
    var doc = root.document;
    var back = el('div', 'ws-modal-back');
    var page = (last && last.host && last.host.closest && last.host.closest('.page')) || null;
    var box = el('div', 'ws-modal');
    var head = el('div', 'ws-modal-head');
    head.appendChild(el('span', 'ws-modal-t', title));
    var close = el('button', 'ws-x', '×');
    box.appendChild(head);
    head.appendChild(close);
    box.appendChild(el('div', 'ws-modal-body'));
    back.appendChild(box);
    if (page) {
      back.className += ' inpage';
      page.appendChild(back);
    } else {
      (doc.getElementById('app')||doc.body).appendChild(back);
    }
    function shut() {
      if (back.parentNode) back.parentNode.removeChild(back);
      doc.removeEventListener('keydown', onKey);
    }
    function onKey(ev) { if (ev.key === 'Escape') shut(); }
    doc.addEventListener('keydown', onKey);
    back.dismissPanel=shut;
    close.onclick = shut;
    back.onclick = function (ev) { if (ev.target === back) shut(); };
    return { back: back, box: box, body: box.querySelector('.ws-modal-body'), shut: shut };
  }

  /** 点空槽位：先挑机器类别，再挑电压。 */
  function picker(S, a, key, slot, onSave, redraw) {
    var m = GD().machines;
    if (!m || !m.cats) {
      root.alert('机器清单没加载（data/machines.js）');
      return;
    }
    var d = modal('装一台机器');
    var cols = el('div', 'ws-pick');
    var left = el('div', 'ws-pick-cats');
    var right = el('div', 'ws-pick-tiers');
    cols.appendChild(left);
    cols.appendChild(right);
    d.body.appendChild(cols);

    var cur = null;
    // 发电槽位先把发电机摆出来
    var cats = m.cats.slice();
    if (key === 'power' && m.gens && m.gens.length) {
      cats.unshift({ id: '__gen', cn: '发电机', slots: { in: 0, out: 0, fluid: 0 },
                     tiers: m.gens });
    }
    cats.forEach(function (cat) {
      var b = el('button', 'ws-cat', cat.cn);
      b.onclick = function () {
        cur = cat;
        Array.prototype.forEach.call(left.children, function (x) {
          x.classList.remove('on');
        });
        b.classList.add('on');
        tiers(cat);
      };
      left.appendChild(b);
    });

    function tiers(cat) {
      right.innerHTML = '';
      var h = el('div', 'ws-pick-h', cat.cn + '　输入 ' + cat.slots.in +
        ' / 输出 ' + cat.slots.out + (cat.slots.fluid ? ' / 流体 ' + cat.slots.fluid : ''));
      right.appendChild(h);
      var grid = el('div', 'ws-tier-grid');
      (cat.tiers || []).forEach(function (t) {
        var n = typeof root.have === 'function' ? root.have(t.k) : 1;
        var b = el('button', 'ws-tier' + (n > 0 ? '' : ' none'));
        // 名字里已经带了电压前缀（"LV 合金炉"），按钮右边单独挂 badge，名字就去掉前缀
        var nm = String(t.name || '').replace(
          /^(ULV|LV|MV|HV|EV|IV|LuV|ZPM|UV|UHV|UEV|UIV|UMV|UXV|MAX)\s+/, '');
        b.innerHTML = iconOf(t.k) +
          '<span class="ws-tier-n">' + nm + '</span>' +
          '<span class="ws-tier-v t' + (t.t || 0) + '">' + t.tag + '</span>' +
          '<span class="ws-tier-c">库存 ' + n + '</span>';
        b.onclick = function () {
          if (n <= 0) { b.title = '仓库里没有这台机器'; return; }
          if (put(S, a.id, key, slot.id, t.k)) {
            onSave && onSave();
            d.shut();
            redraw();
          }
        };
        grid.appendChild(b);
      });
      right.appendChild(grid);
    }
    if (cats.length) left.children[0].click();
  }

  /** 点有东西的槽位：取回 / 换一台。 */
  function slotMenu(S, a, key, slot, onSave, redraw) {
    var it = slotItem(slot, key);
    var d = modal(nameOf(it.k));
    var body = d.body;
    var operate=el('button','ws-btn wide','打开机器，填料 / 取货 / 配方');
    operate.onclick=function(){d.shut();FACTORY.openDetail(it.uid,FACTORY.ensure(S),S,onSave);};body.appendChild(operate);
    body.appendChild(el('div', 'ws-menu-cap', key === 'power' ? '发电机' : '机器'));
    var b1 = el('button', 'ws-btn wide', '取回（放回仓库）');
    b1.onclick = function () {
      if (pull(S, a.id, key, slot.id)) {
        onSave && onSave();
        d.shut();
        redraw();
      }
    };
    var b2 = el('button', 'ws-btn wide', '换一台');
    b2.onclick = function () {
      if (!pull(S, a.id, key, slot.id)) return;
      onSave && onSave();
      d.shut();
      redraw();
      picker(S, a, key, slot, onSave, function () { });
    };
    body.appendChild(b1);
    body.appendChild(b2);
  }

  // ---------------------------------------------------------------- 拖动

  function parseSlot(v) {
    if (!v) return null;
    var p = String(v).split(':');
    if (p.length !== 3) return null;
    return { area: +p[0], part: p[1], sid: +p[2] };
  }

  function hookDrag() {
    var doc = root.document;
    if (!doc || doc.__wsDrag) return;
    doc.__wsDrag = true;
    doc.addEventListener('dragover', function (ev) {
      var t = ev.target && ev.target.closest && ev.target.closest('[data-wslot]');
      if (!t) return;
      ev.preventDefault();
      if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
      t.classList.add('over');
    });
    doc.addEventListener('dragleave', function (ev) {
      var t = ev.target && ev.target.closest && ev.target.closest('[data-wslot]');
      if (t) t.classList.remove('over');
    });
    doc.addEventListener('drop', function (ev) {
      var t = ev.target && ev.target.closest && ev.target.closest('[data-wslot]');
      if (!t) return;
      ev.preventDefault();
      t.classList.remove('over');
      var dst = parseSlot(t.dataset.wslot);
      if (!dst || !root.WS._ctx) return;
      var S = root.WS._ctx.S, onSave = root.WS._ctx.save;
      var from = parseSlot(ev.dataTransfer && ev.dataTransfer.getData('application/x-ws-slot'));
      var changed = false;
      if (from) {
        changed = move(S, from, dst);
      } else {
        var k = ev.dataTransfer && ev.dataTransfer.getData('text/plain');
        if (k) changed = put(S, dst.area, dst.part, dst.sid, k);
      }
      if (changed) {
        onSave && onSave();
        root.WS.redraw();
      }
    });
  }

  var last = null;      // {S, save, host}

  function redraw() {
    if (!last || !last.host || !last.host.parentNode) return;
    var p = last.host.parentNode;
    p.replaceChild(render(last.S, last.save), last.host);
    last.host = p.querySelector('.ws-root');
  }

  root.WS = {
    blank: blank, ensure: ensure, newArea: newArea, dropArea: dropArea,
    newSlot: newSlot, dropSlot: dropSlot, renameArea: renameArea,
    renameSlot: renameSlot, find: find, findSlot: findSlot,
    put: put, pull: pull, move: move, canHold: canHold, machineInfo: machineInfo,
    render: function (S, save) {
      last = { S: S, save: save };
      var box = render(S, save);
      last.host = box;
      root.WS._ctx = { S: S, save: save };
      hookDrag();
      return box;
    },
    redraw: redraw
  };
})(this);

STATE_SCHEMA.register("workshop",["ws"]);
