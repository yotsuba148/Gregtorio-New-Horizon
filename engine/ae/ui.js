(function(root) {
  'use strict';
  var opened = null, calculateTimer = null, calculationSequence = 0,
    R = AE_RESOURCES,
    ST = AE_STORAGE,
    TX = GTTransactions;
  var errors = {
    AMOUNT: '数量过大',
    NO_POWER: 'ME网络断电',
    CONTROLLER_CONFLICT: 'ME控制器冲突',
    DISCONNECTED: 'ME网络未连接',
    CONFIGURATION_SLOT: '目标没有配置槽',
    SLOTS: '存储空间不足',
    MACHINE_INPUT: '目标这一面不接收该原料',
    INPUT: '原料不足',
    MISSING: '缺少原料',
    MEMORY: '合成存储器容量不足',
    BUSY: '合成CPU正在工作',
    CPU: '需要连接合成存储器',
    BLANK_PATTERN: '放入空白样板',
    PATTERN: '先从JEI选择配方',
    INCOMPLETE_PATTERN: '合成配方不完整',
    CHOICE: '需要选择具体材料',
    STATION: '这个配方需要专用工作站',
    RECIPE_MAP: '加工场所不匹配',
    ITEM_PORT: '需要输入总线',
    FLUID_PORT: '需要输入仓',
    FLUID_INTERFACE: '需要流体接口',
    NO_PATTERN: '没有可用的样板',
    MACHINE_BUSY: '等待机器完成加工',
    CRAFTING_LOCKED: '接口合成已锁定',
    BLOCKING: '阻挡模式：等待输入清空',
    MACHINE: '接口前方没有加工设备',
    INPUT_SIDE: '机器这一面不接受输入',
    ITEM: '机器不接受该物品',
    FLUID: '机器不接受该流体',
    TANK: '输入仓空间不足',
    CIRCUIT: '电路编号冲突',
    CIRCUIT_CONFLICT: '样板内的电路指令冲突，请保留一种设置',
    MACHINE_REMOVED: '加工设备已拆除',
    STOCKING_PORT: '将下单接口对准普通输入总线',
    WAITING_OUTPUT: '等待产物',
    RELAY_FEEDING: '等待导管送完原料',
    RELAY_BUSY: '接口还有原料待送',
    RELAY_INPUT: '打开对应导管的提取端',
    RELAY_CONFIG: '带虚拟物品的样板需要一个明确的配置槽',
    WAITING_INPUT: '等待原料',
    WAITING_DISPATCH: '等待投料',
    WAITING_MACHINE: '等待机器开工',
    RUNNING: '加工中',
    RETURNING: '等待存入ME网络',
    OUTPUT_STORAGE: '等待存入ME网络，存储空间不足',
    CANCELLING: '正在返还原料',
    IDLE: '空闲',
    CYCLE: '配方循环缺少起始材料',
    PLAN_LIMIT: '配方链过长',
    CALCULATION: '合成计算失败',
    PLANNING: '正在计算',
    CONFIG_RECEIVER: '找不到这批原料的配置槽',
    CONFIG_CONFLICT: '配置槽内容与样板不符',
    DIVISIBILITY: '原料与产物数量无法整除'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      } [c];
    });
  }

  // 数量用紧凑单位，数值部分永远不小于 1（123M，不写 0.12B）
  function number(n) {
    var v = Number(n) || 0, sign = v < 0 ? '-' : '', a = Math.abs(v), u = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'], i = 0;
    if (a < 1000) return sign + (a % 1 ? +a.toFixed(2) : String(a));
    while (a >= 1000 && i < u.length - 1) { a /= 1000; i++; }
    return sign + (a >= 100 ? Math.round(a) : a >= 10 ? +a.toFixed(1) : +a.toFixed(2)) + u[i];
  }

  function label(r) {
    return r.kind === 'fluid' ? FLUID_PRESENTATION.name(r.key) : nameOf(r.key);
  }

  function icon(r, size) {
    return r.kind === 'fluid' ? FLUID_PRESENTATION.html(r.key, size || 30) : iconHtml(r.key, size || 30);
  }

  function lookup(r) {
    return r.kind === 'fluid' ? ' data-lookup-fluid="' + esc(r.key) + '"' : ' data-lookup-key="' + esc(r
      .key) + '"';
  }

  function message(result) {
    if (result && result.ok) return true;
    if (typeof toastAt === 'function') toastAt(null, errors[result && result.code] || '无法完成操作');
    return false;
  }

  function state() {
    if (!opened) return null;
    var popup = document.getElementById('popup');
    if (!popup || popup.hidden || !popup.querySelector('.ae-window')) {
      opened = null;
      document.querySelectorAll('.ae-jei-tools').forEach(function(el) {
        el.remove();
      });
      return null;
    }
    var m = ENTITIES.get(opened.S, opened.uid);
    if (!m || !ENTITIES.active(m)) {
      opened = null;
      document.querySelectorAll('.ae-jei-tools').forEach(function(el) {
        el.remove();
      });
      return null;
    }
    return {
      S: opened.S,
      m: m,
      d: AE_DEVICES.spec(m),
      s: AE_DEVICES.ensure(m),
      box: popup.querySelector('.ae-window')
    };
  }

  function changed() {
    if (opened && opened.save) opened.save();
    if (typeof markInv === 'function') markInv();
    if (root.ITEM_DRAG) ITEM_DRAG.syncCursor();
    if (opened) FACTORY.refreshInventory(opened.S, opened.save);
    refresh();
  }

  function slot(ref, stack, tip, face) {
    if (stack && (!stack.k || !CONTENT.item(stack.k))) stack = null;
    var faceKind = face && face.kind, faceKey = face && (face.key || face.k), faceHtml = face ? (faceKind === 'fluid' ? FLUID_PRESENTATION.html(faceKey, 30) : iconHtml(faceKey, 30)) : null;
    return '<button type="button" class="ae-slot" data-transfer-ref="' + esc(JSON.stringify(ref)) +
      '" data-tip="' + esc(stack ? (face ? label(face) : nameOf(stack.k)) : tip || '空槽位') + '"' + (stack ? ' data-lookup-key="' +
        esc(stack.k) + '"' : '') + '>' + (stack ? (faceHtml || iconHtml(stack.k, 30)) + '<b>' + ((stack.n || 1) > 1 ?
        number(stack.n) : '') + '</b>' : '<span>＋</span>') + '</button>';
  }

  // 过滤槽只记身份，不带数量
  function ghost(resource, index, field, fluid, stock) {
    var key = resource && resource.key,
      formula = key && resource.kind === 'item' && root.ITEM_DESCRIPTIONS ? root.ITEM_DESCRIPTIONS.formula(key) : '',
      hasStock = resource && stock != null,
      tip = resource ? (label(resource) + (formula ? '\n' + formula : '') + (hasStock ? '\n网络库存 ' + number(stock) : '') + '\n空手点击清除')
        : (fluid ? '空手点击设置流体' : '空手点击设置物品');
    return '<button type="button" class="ae-slot ae-ghost" data-ae-sample="' + index + '" data-ae-field="' +
      field + '"' + (fluid ? ' data-ae-fluid="1"' : '') + ' data-tip="' + esc(tip) + '"' + (resource ? lookup(resource) : '') + '>' +
      (resource ? icon(resource) : '<span>＋</span>') + (hasStock && stock > 0 ? '<b class="ae-ghost-stock">' + number(stock) + '</b>' : '') + '</button>';
  }

  function list(values) {
    return values.map(function(r) {
      return '<div class="ae-resource-line"' + lookup(r) + '>' + icon(r, 23) + '<span>' + esc(label(
        r)) + '</span><b>' + number(r.amount) + (r.kind === 'fluid' ? ' mB' : '') + '</b></div>';
    }).join('');
  }

  function directions(m) {
    var currentSide = m.outFace == null ? AE_DEVICES.spec(m).role === 'interface' ? -1 : 1 : m.outFace,
      face = AE_DEVICES.spec(m).role === 'interface' ? AE_PRESENTATION.interfaceFace(m, 26) : iconHtml(m.k, 26);
    return '<div class="machine-io ae-facing"><span>朝向</span><div class="io-cross ae-direction-pad">' + [0, 3, -1, 1, 2].map(
      function(side) {
        return side < 0 ? '<span class="io-machine-face ae-direction-center">' + face + '</span>' :
          '<button type="button" class="io-cover-slot io-side-' + side + (currentSide === side ? ' selected' : '') +
          '" data-ae-facing="' + side + '" aria-label="朝' +
          ['上', '右', '下', '左'][side] + '" aria-pressed="' + (currentSide === side) + '">' +
          ['↑', '→', '↓', '←'][side] + '</button>';
      }).join('') + '</div></div>';
  }

  function open(uid, S, save) {
    var m = ENTITIES.get(S, uid),
      d = m && AE_DEVICES.spec(m);
    if (!d) return;
    clearTimeout(calculateTimer);
    calculationSequence++;
    FACTORY.close();
    opened = {
      uid: uid,
      S: S,
      save: save,
      search: '',
      tab: 'storage',
      kind: d.fluidOnly ? 'fluid' : d.fluids ? 'all' : 'item',
      mode: 'all',
      selected: null,
      preview: null
    };
    var popup = document.getElementById('popup');
    popup.hidden = false;
    popup.classList.add('noback');
    popup.innerHTML = '<div class="box mxwin machine-window ae-window' + (d.terminal ? ' ae-terminal' :
        d.role === 'interface' ? ' ae-interface-window' : (d.role === 'storage_bus' || d.role === 'export' || d.role === 'import') ? ' ae-bus-window' : '') + '" data-uses-inventory="true"><header class="machine-heading">' + iconHtml(m.k, 28) +
      '<strong>' + esc(nameOf(m.k)) +
      '</strong><small class="ae-status"></small><button type="button" class="btn ae-plan-close" data-popclose="1" aria-label="关闭">×</button></header><div class="ae-body" data-item-controls="true">' + (d.terminal ?
        '<div class="ae-toolbar"><input type="search" autocomplete="off" placeholder="搜索物品 / 流体" data-ae-search><select data-ae-kind><option value="all">全部</option><option value="item">物品</option><option value="fluid">流体</option></select><button type="button" class="btn" data-ae-view="storage">库存</button><button type="button" class="btn" data-ae-view="orders">合成状态</button></div><div class="ae-resource-scroll" aria-label="ME库存"><div class="ae-resource-grid"></div></div><div class="ae-storage-tools"><span data-ae-total></span><button class="btn" data-ae-deposit>存入手持物品</button></div><div data-ae-chest-cell></div><section class="ae-draft"></section><section class="ae-order-pane" hidden></section>' :
        '<div class="ae-device-content"></div>') +
      '</div><footer class="foot"></footer></div>';
    var box = popup.querySelector('.ae-window');
    // 总线窗口是两栏布局，比通用窗口宽
    if (d.role === 'storage_bus' || d.role === 'export' || d.role === 'import')
      box.style.width = 'min(680px, calc(100vw - 24px))';
    FACTORY.mountMove(box.querySelector('.foot'), m, S, save);
    bind(box, function() {
      return {
        S: S,
        m: m,
        s: AE_DEVICES.ensure(m),
        save: save
      };
    });
    box.addEventListener('click', click);
    box.addEventListener('pointerdown', function(e) {
      var button = e.target.closest('[data-ae-remove-entry],[data-ae-expand]');
      if (!button || button.disabled || ![1, 2].includes(e.button)) return;
      e.preventDefault(); e.stopPropagation();
      if (e.button === 1) amountEditor(button, button.hasAttribute('data-ae-expand'));
      else if (button.hasAttribute('data-ae-expand')) resizeDraft(-(e.shiftKey ? 8 : 2));
      else changeDraftSlot(button, 2);
    });
    box.addEventListener('contextmenu', function(e) { if (e.target.closest('[data-ae-remove-entry],[data-ae-expand]')) e.preventDefault(); });
    box.addEventListener('input', function(e) {
      if (e.target.matches('[data-ae-order-amount]')) {
        requestCalculation(160);
      }
    });
    box.addEventListener('input', function(e) {
      if (e.target.matches('[data-ae-material-search]')) { opened.materialSearch = e.target.value; paintMaterials(); }
    });
    box.addEventListener('change', function(e) {
      if (e.target.matches('[data-ae-cpu]')) {
        opened.cpu = e.target.value;
        opened.cpuSelected = true;
        orderPane(state(), AE_FACTORY.get(S));
      }
    });
    if (d.terminal) {
      box.querySelector('.ae-resource-scroll').addEventListener('scroll', renderResourceWindow, {passive: true});
      var kind = box.querySelector('[data-ae-kind]');
      if (d.fluidOnly) {
        kind.innerHTML = '<option value="fluid">流体</option>';
        kind.hidden = true;
        box.querySelector('[data-ae-search]').placeholder = '搜索流体';
        box.querySelector('[data-ae-deposit]').textContent = '倒入手持容器';
      }
      kind.value = opened.kind;
      box.querySelector('[data-ae-search]').oninput = function(e) {
        opened.search = e.target.value;
        box.querySelector('.ae-resource-scroll').scrollTop = 0;
        refresh();
      };
      box.querySelector('[data-ae-kind]').onchange = function(e) {
        opened.kind = e.target.value;
        box.querySelector('.ae-resource-scroll').scrollTop = 0;
        refresh();
      };
    }
    refresh();
    if (root.JEI && JEI.refreshAE) JEI.refreshAE();
  }

  function renderInterfaces(v,c){
    var words=SEARCH_TEXT.words(opened.search),component=c.graph.component(v.m.uid),online=c.network.status(v.m.uid).ok;
    var nodes=online?c.nodes.filter(function(n){return n.role==='interface'&&c.graph.component(n.id)===component&&SEARCH_TEXT.matches(SEARCH_TEXT.index((n.entity.note||'')+' '+nameOf(n.entity.k),'',''),words);}):[];
    var grid=v.box.querySelector('.ae-resource-grid');grid.style.paddingTop='0px';grid.style.paddingBottom='0px';grid.style.display='block';
    UI_KIT.patch(grid,nodes.map(function(n){return '<section class="ae-remote-interface"><h4>'+esc(n.entity.note||nameOf(n.entity.k))+'<small>'+esc(n.x+','+n.y)+'</small></h4><div class="ae-slots">'+n.state.patterns.slice(0,AE_UPGRADES.patternSlots(n.entity)).map(function(stack,i){return slot({type:'ae:slot',uid:n.id,field:'patterns',index:i},stack,'已编码样板');}).join('')+'</div></section>';}).join('')||'<p class="ae-note">'+(online?'网络中没有接口':'')+'</p>');
    v.box.querySelector('[data-ae-total]').textContent=nodes.length+' 个接口';
    v.box.querySelector('.ae-resource-scroll').hidden=false;
    v.box.querySelector('.ae-storage-tools').hidden=false;
    v.box.querySelector('[data-ae-deposit]').hidden=true;
    v.box.querySelectorAll('[data-ae-kind],[data-ae-view],.ae-draft,.ae-order-pane').forEach(function(el){el.hidden=true;});
    v.box.querySelector('[data-ae-search]').placeholder='搜索接口';
  }
  function renderStorage(v, c) {
    var cellHost = v.box.querySelector('[data-ae-chest-cell]');
    if (cellHost) {
      cellHost.hidden = !v.d.cellSlots;
      if (v.d.cellSlots) UI_KIT.patch(cellHost, '<div class="ae-chest-cell"><span>存储单元</span>' + slot({
        type: 'ae:slot',
        uid: v.m.uid,
        field: 'cells',
        index: 0
      }, v.s.cells[0], '存储单元') + '</div>');
    }
    var patterns = AE_FACTORY.patterns(c, v.m.uid),
      all = AE_FACTORY.snapshot(c, v.m.uid),
      ids = new Set(all.map(R.identity));
    patterns.forEach(function(p) {
      p.outputs.forEach(function(r) {
        if (!ids.has(R.identity(r))) {
          all.push(Object.assign({}, r, {
            amount: 0
          }));
          ids.add(R.identity(r));
        }
      });
    });
    var words = SEARCH_TEXT.words(opened.search);
    all = all.filter(function(r) {
      return (!v.d.fluidOnly || r.kind === 'fluid') && (opened.kind === 'all' || opened.kind === r.kind) && SEARCH_TEXT.matches(SEARCH_TEXT.index(
        label(r), '', '', r.kind === 'item' ? GD.pin[r.key] : GD.searchPinyin && GD.searchPinyin
        .fluids[r.key]), words);
    }).sort(function(a, b) {
      return b.amount - a.amount || label(a).localeCompare(label(b), 'zh-CN');
    });
    opened.resources = all;
    opened.craftable = new Set();
    patterns.forEach(function(p) { p.outputs.forEach(function(r) { opened.craftable.add(R.identity(r)); }); });
    v.box.querySelector('[data-ae-total]').textContent = number(all.length) + ' 种';
  }

  function renderResourceWindow() {
    var v = state();
    if (!v || v.d.interfaces || opened.selected || opened.tab !== 'storage') return;
    var host = v.box.querySelector('.ae-resource-scroll'), grid = host.querySelector('.ae-resource-grid'),
      all = opened.resources || [], style = getComputedStyle(grid), columns = 9,
      cell = parseFloat(style.getPropertyValue('--ae-network-slot')), gap = 4,
      rowHeight = cell + gap, rows = Math.ceil(all.length / columns),
      first = Math.max(0, Math.min(Math.max(0, rows - 1), Math.floor(host.scrollTop / rowHeight) - 1)),
      end = Math.min(rows, first + Math.ceil(host.clientHeight / rowHeight) + 3),
      shown = all.slice(first * columns, end * columns),
      visible = Math.max(columns, (end - first) * columns);
    grid.style.paddingTop = first * rowHeight + 'px';
    grid.style.paddingBottom = Math.max(0, (rows - end) * rowHeight) + 'px';
    UI_KIT.patch(grid, Array.from({
      length: visible
    }, function(_, i) {
      var r = shown[i],
        craftable = r && opened.craftable.has(R.identity(r));
      if (!r) return v.d.fluidOnly ?
        '<button type="button" class="ae-slot empty" aria-label="倒入流体" data-transfer-ref="' +
        esc(JSON.stringify({type: 'ae:network', uid: v.m.uid})) + '"></button>' :
        '<span class="ae-slot empty"></span>';
      var ref = {
        type: 'ae:network',
        uid: v.m.uid,
        resource: R.amount(r, Math.max(1, r.amount))
      };
      return '<div class="ae-network-cell" data-ui-key="' + esc(R.identity(r)) + '">' + (r.amount || v.d.fluidOnly ?
        '<button type="button" class="ae-slot" data-transfer-ref="' + esc(JSON.stringify(ref)) +
        '" data-tip="' + esc(label(r) + '，' + number(r.amount) + (r.kind === 'fluid' ? ' mB' :
          '')) + '"' + lookup(r) + '>' + icon(r) + '<b>' + number(r.amount) + '</b></button>' :
        '<span class="ae-slot empty" data-tip="' + esc(label(r)) + '"' + lookup(r) + '>' + icon(r) + '</span>') + (craftable ?
        '<button class="ae-craft-mark" data-ae-order="' + esc(JSON.stringify(R.amount(r, 1))) +
        '" data-tip="下单合成">＋</button>' : '') + '</div>';
    }).join(''));
  }

  function recipeSlot(value) {
    if (!value) return '<span class="ae-slot ae-recipe-slot empty"></span>';
    if(!value.resource&&value.craftingSlot!=null)return '<button type="button" class="ae-slot ae-recipe-slot empty" data-ae-draft-empty="'+value.craftingSlot+'"></button>';
    if (value.diagnose) {
      return '<span class="ae-slot ae-recipe-slot empty" data-tip="' + esc(value.reason) + '">!</span>';
    }
    if (value.mismatch) {
      return '<span class="ae-slot ae-recipe-slot empty" data-tip="九格拼不出工作台配方，无法显示产物">?</span>';
    }
    var r = value.resource,
      isVirtual = value.virtualIndex != null,
      editable = !!value.field,
      tip = label(r) + (r.kind === 'fluid' ? '，' + number(r.amount) + ' mB' : ' ×' + number(r.amount)) + (
        isVirtual ? '，虚拟' : value.reusable ? '，不消耗' : '') + (editable ? '，左键清除或复制手持物品，右键减量，中键设置数量' : '');
    return '<button type="button" class="ae-slot ae-recipe-slot' + (isVirtual ? ' ae-virtual-slot' : '') +
      '"' + (editable ? ' data-ae-remove-entry="' + value.field + ':' + value.index + '" data-ae-remove-amount="' + r.amount + '"' +
        (value.craftingSlot != null && !isVirtual ? ' data-ae-crafting-slot="' + value.craftingSlot + '"' : '') : '') +
      (isVirtual ? ' data-ae-remove-virtual="' + value.virtualIndex + '"' : '') + ' data-tip="' + esc(
        tip) + '"' + lookup(r) + '>' + icon(r, 28) + '<b>' + number(r.amount) + '</b>' + (isVirtual ?
        '<small>虚拟</small>' : value.reusable ? '<small>∞</small>' : '') + '</button>';
  }

  function recipeSection(section, kind) {
    return '<div class="ae-pattern-side ae-pattern-' + kind +
      '" style="--ae-pattern-cols:' + section.columns + ';--ae-pattern-rows:' + section.rows +
      '"><div class="ae-pattern-viewport" aria-label="' + (kind === 'in' ? '样板原料' : '样板产物') +
      '"><div class="ae-pattern-grid">' + section.allCells.map(recipeSlot).join('') + '</div></div></div>';
  }

  /* 空白样板槽缺货时按原版提示网络里还有多少张 */
  function blankTip(v) {
    var n = 0;
    try {
      var c = AE_FACTORY.get(v.S);
      c.network.snapshot(v.m.uid).forEach(function (r) {
        if (r.key === AE_INVENTORY.blank) n += r.amount;
      });
    } catch (e) { n = 0; }
    return '空白样板，网络中有 ' + n + ' 张';
  }

  function renderDraft(v) {
    var host = v.box.querySelector('.ae-draft');
    if (!v.d.patterns && !v.d.crafting) {
      host.hidden = true;
      return;
    }
    var p = v.s.draft,
      view = opened.patternView || (opened.patternView = {
        inPage: 0,
        outPage: 0,
        inverted: false
      }),
      layout = AE_PATTERN_LAYOUT.plan(p, v.d, view);
    view.inPage = layout.input.page;
    view.outPage = layout.output.page;
    var title = v.d.patterns ? (p && p.mode === 'crafting' ? '合成样板' : '加工样板') : '合成',
      h = '<div class="ae-section-title"><strong>' + title + '</strong><span>' + (p ? '在JEI选择其他配方' : v.d
        .patterns ? '在JEI选择配方后写入样板' : '在JEI选择配方后摆放') + '</span></div>' +
      '<div class="ae-pattern-editor' + (layout.expanded ? ' ae-pattern-expanded' : '') + '">' +
      recipeSection(layout.input, 'in') +
      '<div class="ae-pattern-tools">' + (v.d.patterns ?
        '<button type="button" class="btn" data-ae-clear-draft data-tip="清空配方"' + (p ? '' : ' disabled') +
        '>×</button>' + (p && p.mode !== 'crafting' ? '<button type="button" class="btn" data-ae-expand data-tip="左键×2，Shift左键×8，右键÷2，Shift右键÷8，中键设置倍数">×2</button>' : '') : '') + (layout.expanded ?
        '<button type="button" class="btn" data-ae-pattern-invert data-tip="' + (view.inverted ? '展开原料' :
          '展开产物') + '">⇄</button>' : '') +
      '</div><span class="ae-pattern-arrow" aria-hidden="true">→</span>' + recipeSection(layout.output,
        'out') +
      '<div class="ae-pattern-encoding">' + (v.d.patterns ? slot({
        type: 'ae:slot',
        uid: v.m.uid,
        field: 'encoding',
        index: 0
      }, v.s.encoding[0], blankTip(v)) + '<button type="button" class="btn" data-ae-encode data-tip="写入样板，Shift：写入物品栏，Ctrl+Shift：批量写入物品栏"' + (p && (p.mode === 'crafting' ? !!p.outputs.length && !!(p.inputs || []).length && !(p.clearedSlots || []).length : p.outputs.length && (p.inputs.length || p.reusable.length || p.virtual.length)) ?
        '' : ' disabled') + '>写入 ↓</button>' + slot({
        type: 'ae:slot',
        uid: v.m.uid,
        field: 'encoding',
        index: 1
      }, v.s.encoding[1], '已编码样板') : '<button type="button" class="btn" data-ae-craft' + (p && p.outputs.length ? '' :
        ' disabled') + '>合成一次</button>') + '</div></div>';
    UI_KIT.patch(host, h);
  }

  function requestCalculation(delay, useSelected) {
    clearTimeout(calculateTimer);
    var token = ++calculationSequence, session = opened, v = state();
    if (!v || !session.selected) return;
    var input = !useSelected && v.box.querySelector('[data-ae-order-amount]'),
      n = input ? Number(input.value) : session.selected.amount;
    session.preview = null;
    session.materials = null;
    session.calculating = Number.isSafeInteger(n) && n > 0 && n <= 1000000000;
    session.calculationError = session.calculating ? '' : '请输入有效数量';
    if (session.calculating) session.selected = R.amount(session.selected, n);
    refresh();
    if (!session.calculating) return;
    calculateTimer = setTimeout(function() {
      if (opened !== session || token !== calculationSequence || !state()) return;
      var c = AE_FACTORY.get(session.S), result;
      try {
        result = c.orders.preview(session.cpu, session.selected, session.uid);
      } catch (error) {
        console.error('AE crafting calculation', error);
        result = {ok: false, code: 'CALCULATION'};
      }
      if (opened !== session || token !== calculationSequence) return;
      session.calculating = false;
      session.preview = result;
      session.materials = AE_PLAN_REPORT.rows(result).sort(function(a, b) {
        return Number(!!b.missing) - Number(!!a.missing) || label(a.resource).localeCompare(label(b.resource), 'zh-CN');
      });
      refresh();
    }, delay || 0);
  }

  function resizeDraft(factor) {
    var v = state(), p = v && v.s.draft;
    if (!p) return;
    var next = AE_PATTERNS.resize(p, factor);
    if (!next) { message({code: factor < 0 ? 'DIVISIBILITY' : 'AMOUNT'}); return false; }
    v.s.draft = next; changed(); return true;
  }

  function editCraftingCell(cell,held){
    var v=state(),p=v&&v.s.draft;if(!p||p.mode!=='crafting')return;
    var layout=AE_PATTERN_LAYOUT.plan(p,v.d,{}),grid=layout.input.cells.map(function(value){return value&&value.resource?R.native(value.resource):null;});
    grid[cell]=held?Object.assign({},held,{n:1}):null;
    var recipe=AE_CRAFTING.forGrid(grid),next;
    if(recipe){
      var choices={};
      var remaining=grid.filter(Boolean);recipe.slots.forEach(function(alts,i){var at=recipe.grid?recipe.grid.indexOf(i):-1;if(at>=0)choices['slot:'+i]=grid[at].k;else{var found=remaining.findIndex(function(stack){return alts.some(function(key){return CONTENT.matches(key,stack.k);});});choices['slot:'+i]=remaining.splice(found,1)[0].k;}});
      next=AE_PATTERNS.fromCrafting(recipe,{id:p.id,choices:choices,virtualize:false});
    }else next=AE_PATTERNS.draft({id:p.id,mode:'crafting',inputs:grid.filter(Boolean).map(R.item),outputs:[],virtual:[],reusable:[],gridKeys:grid.map(function(s){return s?s.k:null;})});
    v.s.draft=next;changed();
  }

  function changeDraftSlot(button, mouseButton) {
    var v = state(), p = v && v.s.draft;
    if (!p) return;
    var pair = button.dataset.aeRemoveEntry.split(':'), field = pair[0], index = +pair[1],
      row = p[field][index], held = ITEM_CURSOR.held(v.S);
    if (!row) return;
    if(p.mode==='crafting'&&button.dataset.aeCraftingSlot!=null){editCraftingCell(+button.dataset.aeCraftingSlot,held);return;}
    if (field === 'virtual') {
      v.s.draft = AE_PATTERNS.remove(p, field, index);
    } else if (held && p.mode === 'processing') {
      var sample = row.kind === 'fluid' ? GD.containerRegistry.find(function(c) { return c.filled === CONTENT.canonicalKey(held.k); }) : null,
        resource = row.kind === 'fluid' ? sample && R.fluid({f: sample.fluid, mb: sample.amount * (mouseButton === 2 ? 1 : held.n)}) : R.item(Object.assign({}, held, {n: mouseButton === 2 ? 1 : held.n}));
      if (!resource) return;
      var next = GTTransactions.clone(p);
      if (mouseButton === 2 && R.identity(row) === R.identity(resource)) resource.amount = R.add(row.amount, resource.amount);
      next[field][index] = resource;
      v.s.draft = AE_PATTERNS.draft(next);
    } else if (mouseButton === 2 && p.mode === 'processing' && row.amount > 1) {
      v.s.draft = AE_PATTERNS.quantity(p, field, index, row.amount - 1);
    } else if (mouseButton === 0 || p.mode !== 'processing') {
      v.s.draft = AE_PATTERNS.remove(p, field, index, +button.dataset.aeRemoveAmount,
        button.dataset.aeCraftingSlot == null ? null : +button.dataset.aeCraftingSlot);
    }
    changed();
  }

  function amountEditor(button, factor) {
    var v = state();
    if (!v || !v.s.draft) return;
    var old = v.box.querySelector('.ae-amount-editor'); if (old) old.remove();
    var pair = !factor && button.dataset.aeRemoveEntry.split(':'), field = pair && pair[0], index = pair && +pair[1],
      row = pair && v.s.draft[field][index], circuit = row && field === 'virtual' && row.kind === 'circuit',
      value = factor ? 2 : circuit ? row.number : row && (field === 'virtual' ? row.resource && row.resource.amount : row.amount);
    if (value == null) return;
    var editor = document.createElement('form'); editor.className = 'ae-amount-editor'; editor.dataset.itemControls = 'true';
    editor.innerHTML = '<label>' + (factor ? '倍数' : circuit ? '电路编号' : '数量') +
      '<input type="number" data-ae-edit-value min="' + (factor ? -2147483647 : circuit ? 0 : 1) +
      '" max="' + (circuit ? 24 : 2147483647) + '" value="' + value + '"></label>' +
      (factor ? '<small>2：×2；-2：÷2</small>' : '') +
      '<div><button class="btn" type="submit" data-ae-edit-apply>确定</button><button class="btn" type="button" data-ae-edit-close>关闭</button></div>';
    v.box.appendChild(editor);
    var r = button.getBoundingClientRect(), b = v.box.getBoundingClientRect(), zoom = typeof uiZoom === 'function' ? uiZoom() : 1;
    editor.style.left = Math.max(8, Math.min(v.box.clientWidth - 206, (r.left - b.left) / zoom)) + 'px';
    editor.style.top = Math.max(8, Math.min(v.box.clientHeight - 125, (r.bottom - b.top) / zoom + 3)) + 'px';
    editor.querySelector('[data-ae-edit-close]').onclick = function() { editor.remove(); };
    editor.onkeydown = function(e) { if (e.key === 'Escape') { e.stopPropagation(); editor.remove(); } };
    editor.onsubmit = function(e) {
      e.preventDefault(); var now = state(), n = Number(editor.querySelector('input').value), next;
      if (!now || now.s.draft !== p) { editor.remove(); return; }
      if (!Number.isSafeInteger(n)) return;
      if (factor) { if (resizeDraft(n)) editor.remove(); return; }
      if (field === 'virtual') {
        next = GTTransactions.clone(p);
        if (circuit) { if (n < 0 || n > 24) return; next.virtual[index].number = n; if (next.virtual[index].resource) next.virtual[index].resource.key = AE_PATTERNS.circuitKey(n); }
        else { if (n < 1 || n > 2147483647) return; next.virtual[index].resource = R.amount(row.resource, n); }
        next = AE_PATTERNS.draft(next);
      } else if (p.mode === 'crafting') {
        var current = +button.dataset.aeRemoveAmount, ratio = n / current;
        if (Number.isSafeInteger(ratio) && ratio > 0) next = AE_PATTERNS.resize(p, ratio);
        else if (n > 0 && Number.isSafeInteger(current / n)) next = AE_PATTERNS.resize(p, -current / n);
      } else next = AE_PATTERNS.quantity(p, field, index, n);
      if (!next) return;
      now.s.draft = next; editor.remove(); changed();
    };
    var p = v.s.draft, input = editor.querySelector('input'); input.focus(); input.select();
  }

  function materialCards(rows) {
    return rows.map(function(row) {
      var r = row.resource, unit = r.kind === 'fluid' ? ' mB' : '',
        lines = [['withdrawals', '现存'], ['pending', '合成数量'], ['requests', '合成次数'], ['missing', '缺失']];
      return '<div class="ae-plan-material' + (row.missing ? ' missing' : '') + '" data-ui-key="' + esc(R.identity(r)) + '"' + lookup(r) +
        '><div class="ae-plan-icon">' + icon(r, 30) +
        '</div><div class="ae-plan-material-info"><strong>' + esc(label(r)) + '</strong>' +
        lines.filter(function(v) { return row[v[0]]; }).map(function(v) {
          return '<div class="ae-plan-count ' + v[0] + '"><span>' + v[1] + '</span><b>' +
            number(row[v[0]]) + (v[0] === 'requests' ? '' : unit) + '</b></div>';
        }).join('') + '</div></div>';
    }).join('');
  }

  function paintMaterials() {
    var v = state(), host = v && v.box.querySelector('.ae-plan-materials');
    if (!host) return;
    var words = SEARCH_TEXT.words(opened.materialSearch || ''),
      rows = (opened.materials || []).filter(function(row) {
        return (!opened.missingOnly || row.missing) && SEARCH_TEXT.matches(SEARCH_TEXT.index(label(row.resource)), words);
      });
    UI_KIT.patch(host, materialCards(rows) || '<div class="ae-plan-empty">没有匹配的材料</div>');
  }

  function orderPane(v, c) {
    var host = v.box.querySelector('.ae-order-pane');
    host.hidden = opened.tab !== 'orders' && !opened.selected;
    if (host.hidden) return;
    var cpus = (v.S.ae && v.S.ae.cpus || []).filter(function(cpu) {
        return c.graph.component(cpu.node) === c.graph.component(v.m.uid);
      }), h = '';
    if (opened.selected) {
      var target = opened.selected, p = opened.preview,
        cp = opened.cpuSelected && cpus.find(function(cpu) { return cpu.id === opened.cpu; }) ||
          cpus.find(function(cpu) { return !cpu.order && !cpu.planTarget && (!p || !p.bytes || cpu.craftingBytes >= p.bytes); }) ||
          cpus.find(function(cpu) { return cpu.id === opened.cpu; }) || cpus[0];
      if (cp) opened.cpu = cp.id;
      var networkStatus = c.network.status(v.m.uid),
        blocked = !networkStatus.ok ? errors[networkStatus.code] || 'ME网络未连接' :
        !cp ? '需要连接合成存储器' : cp.order||cp.planTarget ? '合成CPU正在工作' :
        p && p.bytes > cp.craftingBytes ? '合成存储器容量不足' : '',
        ready = p && p.ok && !blocked;
      h = '<div class="ae-section-title"><strong>' + (p && !p.ok ? '合成模拟' : '合成计划') +
        '</strong></div>' +
        '<div class="ae-order-target">' + icon(target) + '<span>' + esc(label(target)) +
        '<small class="ae-production" data-ae-production>' + (p && p.production ? '制作 ' + number(p.production.amount) + (target.kind === 'fluid' ? ' mB' : ' 个') : '&nbsp;') + '</small></span><label>数量 <input type="number" data-ae-order-amount min="1" max="1000000000" value="' +
        target.amount + '"></label><button class="btn ae-recalculate" data-ae-calculate data-tip="重新计算" aria-label="重新计算">⟳</button></div>';
      h += '<div class="ae-plan-filter"><input type="search" autocomplete="off" placeholder="搜索材料" data-ae-material-search value="' +
        esc(opened.materialSearch || '') + '"><button class="btn' + (opened.missingOnly ? ' on' : '') +
        '" data-ae-missing-only aria-pressed="' + !!opened.missingOnly + '">只看缺失</button></div>' +
        '<div class="ae-plan-materials" data-ui-preserve="1" role="list" aria-label="合成材料">' + (!p ?
          '<div class="ae-plan-empty">' + (opened.calculating ? '正在计算…' : opened.calculationError || '设置合成数量') + '</div>' : '') + '</div>' +
        '<div class="ae-plan-summary"><span>' + (p && p.bytes != null ? '所需存储 ' + number(p.bytes) + ' B，' +
          (p.steps || []).reduce(function(n, step) { return n + step.batches; }, 0) + ' 次加工' : '') +
        '</span><span class="ae-plan-warning">' + esc(p && !p.ok ? errors[p.code] || '无法计算' : blocked) + '</span></div>' +
        '<div class="ae-plan-footer"><label>合成CPU <select data-ae-cpu>' + (!cpus.length ? '<option>未连接</option>' :
          cpus.map(function(cpu, i) {
            return '<option value="' + esc(cpu.id) + '"' + (cp && cpu.id === cp.id ? ' selected' : '') +
              '>CPU ' + (i + 1) + '，' + number(cpu.craftingBytes) + ' B' + (cpu.order || cpu.planTarget ? '，工作中' : '，空闲') + '</option>';
          }).join('')) + '</select></label><button class="btn" data-ae-submit' + (ready ? '' : ' disabled') + '>开始</button></div>';
    } else {
      h = '<div class="ae-section-title"><strong>合成CPU</strong></div><div class="ae-cpus">' + cpus.map(function(cpu, i) {
        return cpuCard(v, cpu, i);
      }).join('') + (!cpus.length ? '<p>需要连接合成存储器</p>' : '') + '</div>';
    }
    UI_KIT.patch(host, h);
    if (opened.selected) {
      if (opened.preview) paintMaterials();
      else UI_KIT.patch(host.querySelector('.ae-plan-materials'), '<div class="ae-plan-empty">' + (opened.calculating ? '正在计算…' : opened.calculationError || '设置合成数量') + '</div>');
    }
  }

  // 样板槽用第一个产物的图标，玩家一眼看出这张样板做什么
  function patternIcon(stack) {
    var p = stack && stack.aePattern, out = p && p.outputs && p.outputs[0];
    if (!out) return null;
    var key = out.k || out.key;
    return key ? {kind: out.kind === 'fluid' ? 'fluid' : 'item', key: key} : null;
  }

  function interfaceItems(v, field) {
    var values = field === 'patterns' ? v.s[field].slice(0, AE_UPGRADES.patternSlots(v.m)) : v.s[field];
    return values.map(function(stack, i) {
      var face = field === 'patterns' ? patternIcon(stack) : null;
      return slot({type: 'ae:slot', uid: v.m.uid, field: field, index: i}, stack,
        field === 'patterns' ? '已编码样板' : '空物品槽', face);
    }).join('');
  }

  // 正常等待不用再写一遍，分组已经说清楚了
  function waitingCode(code) {
    return !code || /^WAITING_/.test(code) || code === 'MACHINE_BUSY' || code === 'BLOCKING';
  }

  function orderStatus(v, cpu) {
    var phase = AE_ORDERS.phase(cpu), network = AE_FACTORY.get(v.S).network.status(cpu.node);
    if ((cpu.order||cpu.planTarget) && !network.ok) phase = {code: network.code};
    if (waitingCode(phase.code)) return '';
    var text = errors[phase.code] || phase.code;
    if (phase.code === 'OUTPUT_STORAGE') text += '，'+phase.resources.map(function(r){return label(r)+' '+number(r.amount)+(r.kind==='fluid'?' mB':'');}).join('、');
    return '<span data-ae-order-status="' + esc(phase.code) + '">' + esc(text) + '</span>';
  }

  // 一个 CPU 的任务按状态分组：已投料的合成中、料齐待投的等待、卡住的
  function cpuGroups(cpu) {
    var o = cpu.order, g = {running: [], waiting: [], blocked: []};
    if (!o) return g;
    (o.tasks || []).forEach(function(t, i) {
      var out = (t.pattern.outputs || [])[0];
      if (!out) return;
      var row = {
        item: {kind: out.kind === 'fluid' ? 'fluid' : 'item', key: out.k || out.key},
        done: t.completed || 0,
        total: t.batches || 0,
        failed: !!(o.blocked && o.blocked.task === i)
      };
      if (row.done >= row.total && !row.failed) return;
      if (row.failed || (t.dispatched || 0) <= row.done) g.waiting.push(row);
      else g.running.push(row);
    });
    return g;
  }

  function chip(row, kind) {
    var pct = row.total ? Math.min(100, Math.round(row.done / row.total * 100)) : 0;
    return '<div class="ae-chip ' + (row.failed ? 'failed' : kind) + '" data-tip="' +
      esc(label(row.item) + ' ' + number(row.done) + '/' + number(row.total) +
        (row.failed ? '，未开始' : '')) + '">' + icon(row.item, 22) +
      '<b>' + number(row.done) + '/' + number(row.total) + '</b>' +
      '<span class="ae-bar"><s style="width:' + pct + '%"></s></span></div>';
  }
  function chipGroup(kind, title, rows, note) {
    return '<section class="ae-chip-group ' + kind + '"><h5>' + title +
      '<em>' + number(rows.length) + '</em></h5>' +
      (note ? '<p class="ae-chip-note">' + esc(note) + '</p>' : '') +
      '<div class="ae-chips">' + rows.map(function(row) { return chip(row, kind); }).join('') +
      '</div></section>';
  }

  /* AE2 CPU 面板：已存 / 合成中 / 还欠 三个数 */
  function cpuAmounts(cpu) {
    var out = new Map();
    function bump(r, field, n) {
      if (!r || !n) return;
      var id = r.kind + ':' + r.key, row = out.get(id);
      if (!row) { row = { resource: r, stored: 0, active: 0, pending: 0 }; out.set(id, row); }
      row[field] += n;
    }
    (cpu.resources || []).forEach(function (r) { bump(r, 'stored', r.amount); });
    (((cpu.order || {}).flights) || []).forEach(function (f) {
      (f.pending || []).forEach(function (r) { bump(r, 'active', r.amount); });
    });
    (((cpu.order || {}).tasks) || []).forEach(function (t) {
      var left = Math.max(0, (t.batches || 0) - (t.completed || 0));
      if (!left) return;
      (t.pattern.outputs || []).forEach(function (r) { bump(r, 'pending', r.amount * left); });
    });
    return Array.from(out.values());
  }

  function cpuCard(v, cpu, index) {
    var j = cpu.order, tasks = j && j.tasks || [],
      done = tasks.reduce(function(n, t) { return n + t.completed; }, 0),
      total = tasks.reduce(function(n, t) { return n + t.batches; }, 0);
    var head = '<header><strong>CPU ' + (index + 1) + '</strong><small>' +
      number(cpu.craftingBytes) + ' B，协处理器 ' + number((cpu.parallel || 1) - 1) + '</small>' +
      (j ? '<button class="btn" data-ae-suspend="' + esc(cpu.id) + '">' + (cpu.suspended ? '继续' : '暂停') +
        '</button><button class="btn" data-ae-cancel-order="' + esc(cpu.id) + '">取消</button>' : '') + '</header>';
    if (!j) return '<article class="ae-cpu-row">' + head + (cpu.planTarget?
      '<div class="ae-cpu-empty">'+esc(label(cpu.planTarget))+' · '+orderStatus(v,cpu)+'</div><footer>'+
      (cpu.planFailure?'<button class="btn" data-ae-retry-plan="'+esc(cpu.id)+'">重试</button>':'')+
      '<button class="btn" data-ae-cancel-order="'+esc(cpu.id)+'">取消</button></footer>':
      '<div class="ae-cpu-empty">空闲</div>')+'</article>';
    var amounts = cpuAmounts(cpu).filter(function (row) { return row.stored || row.active || row.pending; })
        .sort(function (a, b) { return (b.active + b.pending) - (a.active + a.pending); }).slice(0, 6),
      amountHtml = amounts.length ? '<div class="ae-cpu-amounts">' + amounts.map(function (row) {
        return '<div class="ae-cpu-amount">' + icon(row.resource) + '<span>' + esc(label(row.resource)) +
          '</span><small>现存 ' + number(row.stored) + '，正在合成 ' + number(row.active) + '，计划合成 ' + number(row.pending) + '</small></div>';
      }).join('') + '</div>' : '';
    var g = cpuGroups(cpu), body = '';
    if (g.running.length) body += chipGroup('running', '合成中', g.running, '');
    if (g.waiting.length) body += chipGroup('waiting', '等待中', g.waiting,
      j.blocked && !waitingCode(j.blocked.code) ? (errors[j.blocked.code] || j.blocked.code) : '');
    return '<article class="ae-cpu-row">' + head + amountHtml + '<div class="ae-cpu-target">' + icon(j.target, 26) +
      '<strong>' + esc(label(j.target)) + '</strong><span>× ' + number((j.production || j.target).amount) +
      (j.target.kind === 'fluid' ? ' mB' : '') + '</span></div><div class="ae-cpu-progress">' +
      '<progress max="' + Math.max(1, total) + '" value="' + done +
      '" aria-label="已完成加工批次"></progress><span>' + number(done) + ' / ' + number(total) +
      '</span></div>' + (body || '<div class="ae-cpu-empty">等待开始</div>') +
      '<footer>' + orderStatus(v, cpu) + '<button class="btn" data-ae-cancel="' +
      esc(cpu.id) + '">取消合成</button></footer></article>';
  }

  function renderInterface(v) {
    var s = v.s,
      d = v.d,
      h = '<div class="ae-interface-content"><section class="ae-interface-patterns"><h4>样板</h4>' +
        '<div class="ae-interface-row ae-interface-nine">' + interfaceItems(v, 'patterns') +
        '</div></section><section class="ae-interface-items"><h4>物品库存</h4>' +
        '<div class="ae-interface-row ae-interface-nine" aria-label="保持物品库存">' +
        Array.from({length: d.itemSlots}, function(_, i) {
          return ghost((s.stock || [])[i], i, 'stock', false);
        }).join('') + '</div><div class="ae-interface-row ae-interface-nine" aria-label="物品库存">' +
        interfaceItems(v, 'items') + '</div></section>';
    if (d.fluids) {
      h += '<section class="ae-interface-fluids"><h4>流体库存</h4>' +
        '<div class="ae-interface-row ae-interface-six" aria-label="保持流体库存">' +
        Array.from({length: d.tankSlots}, function(_, i) {
          return ghost((s.fluidStock || [])[i], i, 'fluidStock', true);
        }).join('') + '</div><div class="ae-interface-row ae-interface-six" aria-label="流体库存">' +
        s.fluids.map(function(t, i) {
          var tip = t ? FLUID_PRESENTATION.name(t.f) + '，' + number(t.mb) + ' / ' +
            number(d.tankCapacity) + ' mB' : '空流体槽，' + number(d.tankCapacity) + ' mB';
          return '<button type="button" class="ae-slot ae-interface-tank" data-transfer-ref="' +
            esc(JSON.stringify({type: 'ae:fluid', uid: v.m.uid, index: i})) + '" data-tip="' + esc(tip) +
            '"' + (t ? ' data-lookup-fluid="' + esc(t.f) + '"' : '') + '>' +
            FLUID_RENDERER.html(null, d.tankCapacity).replace('data-fluid-level',
              'data-fluid-level data-ui-preserve') +
            '<b>' + (t ? number(t.mb) : '') + '</b></button>';
        }).join('') + '</div></section>';
    }
    h += '<aside class="ae-interface-facing">' + directions(v.m) + '<div class="ae-interface-options">' +
      '<button type="button" class="btn" data-ae-blocking="blocking" aria-pressed="'+s.blocking+'" data-tip="阻挡模式：'+(s.blocking?'开，目标输入未清空时停止投料':'关，忽略目标容器的内容')+'" aria-label="阻挡模式">'+
      '<i class="ae-opt-dot"></i><span>阻挡</span></button>'+
      '<button type="button" class="btn" data-ae-blocking="smartBlocking" aria-pressed="'+s.smartBlocking+'" data-tip="智能阻挡：'+(s.smartBlocking?'开，同一张样板连续投料不等输入清空':'关，每次投料都等目标输入清空')+'" aria-label="智能阻挡">'+
      '<i class="ae-opt-dot"></i><span>智能</span></button></div><section class="ae-interface-upgrades"><h4>升级</h4><div class="ae-upgrade-slots">' +
      AE_UPGRADES.slots(v.m).map(function(stack, i) { return slot({type: 'ae:upgrade', uid: v.m.uid, index: i}, stack, '升级卡'); }).join('') +
      '</div></section></aside></div>';
    var host = v.box.querySelector('.ae-device-content');
    host.classList.toggle('ae-interface-dual', !!d.fluids);
    v.box.classList.toggle('ae-interface-expanded', AE_UPGRADES.patternSlots(v.m) > 9);
    UI_KIT.patch(host, h);
    host.querySelectorAll('.ae-interface-tank').forEach(function(el, i) {
      FLUID_RENDERER.update(el, s.fluids[i], d.tankCapacity);
    });
  }

  // 物品是不是流体容器：是的话返回它装的流体 id
  var fluidContainers = null;
  function AE_MAINTAIN_FLUID(key) {
    var registry = root.GD && GD.containerRegistry;
    if (!registry) return null;
    if (!fluidContainers || fluidContainers.source !== registry) {
      fluidContainers = {source: registry, map: new Map()};
      registry.forEach(function(p) {
        if (p && p.filled && p.fluid) fluidContainers.map.set(p.filled, p.fluid);
      });
    }
    return fluidContainers.map.get(key) || null;
  }

  function renderDevice(v, c) {
    var s = v.s,
      d = v.d,
      h = '';
    if (d.role === 'interface') {
      renderInterface(v);
      return;
    }
    if (d.cellSlots) {
      var powered = c.online.get(c.graph.component(v.m.uid)) === true;
      h = '<div class="ae-slots ae-cells ae-drive-cells">' + s.cells.map(function(stack, i) {
        var used = stack && AE_CELLS.inspect(stack),
          status = used ? AE_CELLS.indicator(stack, used) : 0,
          percent = used ? Math.min(100, 100 * used.bytes / used.capacity) : 0;
        return '<div class="ae-drive-cell" data-cell-status="' + status +
          '"><span class="ae-cell-index">' + (i + 1) + '</span>' + slot({
            type: 'ae:slot',
            uid: v.m.uid,
            field: 'cells',
            index: i
          }, stack, '存储单元') + '<div class="ae-cell-details"><strong>' + esc(stack ? nameOf(stack.k) :
            '空槽位') + '</strong>' + (used ? '<div class="ae-cell-stat"><span>容量</span><b>' + number(used
              .bytes) + ' / ' + number(used.capacity) +
            ' B</b></div><div class="ae-cell-meter" role="meter" aria-label="已用容量" aria-valuemin="0" aria-valuemax="' +
            used.capacity + '" aria-valuenow="' + used.bytes + '"><i style="width:' + percent +
            '%"></i></div><div class="ae-cell-stat"><span>种类</span><b>' + used.types + ' / ' + used
            .typeCapacity + '</b></div>' : '') + '</div><i class="ae-cell-lamp" data-powered="' +
          powered + '"></i></div>';
      }).join('') + '</div>';
    }
    if (d.role === 'power_bridge') h += directions(v.m);
    if (d.role === 'ioport') {
      h += '<div class="ae-setting-row"><label>模式 <select data-ae-ioport>' +
        '<option value="import"' + (s.mode === 'import' ? ' selected' : '') + '>导入（网络到硬盘）</option>' +
        '<option value="export"' + (s.mode === 'export' ? ' selected' : '') + '>导出（硬盘到网络）</option>' +
        '</select></label></div>';
    }
    if (d.role === 'maintainer') {
      try {
        var itemSamples = Array.isArray(s.itemMarks) ? s.itemMarks : [],
        itemAmounts = Array.isArray(s.amounts) ? s.amounts : [],
        fluidSamples = Array.isArray(s.fluidMarks) ? s.fluidMarks : [],
        fluidAmounts = Array.isArray(s.fluidAmounts) ? s.fluidAmounts : [],
        enabledFlags = Array.isArray(s.enabled) ? s.enabled : Array(9).fill(true),
        fluidEnabledFlags = Array.isArray(s.fluidEnabled) ? s.fluidEnabled : Array(9).fill(true);
      var switchBtn = function(i, fluid) {
        var on = fluid ? fluidEnabledFlags[i] : enabledFlags[i];
        return '<button type="button" class="ae-maint-switch' + (on ? ' on' : '') +
          '" data-ae-maint-enable="' + i + '" data-ae-maint-switch-fluid="' + (fluid ? '1' : '') +
          '" data-tip="' + (on ? '已启用，点击停用' : '已停用，点击启用') + '">' + (on ? '开' : '关') + '</button>';
      };
      // 标记槽只记身份：空手点清除，拿着东西点就是替换
      var markerSlot = function(field, i, mark, tip, face) {
        var kind = mark ? (mark.kind === 'fluid' ? 'fluid' : 'item') : null,
          key = mark && mark.key,
          body = key ? (kind === 'fluid' ? FLUID_PRESENTATION.html(key, 30) : iconHtml(key, 30)) : '<span>＋</span>',
          formula = key && root.ITEM_DESCRIPTIONS ? root.ITEM_DESCRIPTIONS.formula(key) : '',
          tipText = key ? (nameOf(key) + (formula ? '\n' + formula : '') + '\n空手点击清除') : '空手点击设置';
        return '<button type="button" class="ae-slot ae-ghost" data-ae-marker="' + i + '" data-ae-marker-field="' +
          field + '" data-tip="' + esc(tipText) + '">' + body + '</button>';
      };
      h += '<p class="ae-note">低于设定数量时自动下单补齐。</p>' +
        '<h4>保持物品</h4><div class="ae-maintain">' +
        Array.from({length: 9}, function(_, i) {
          return '<div class="ae-maintain-row">' +
            markerSlot('itemMarks', i, itemSamples[i], '要保持的物品') +
            '<input type="number" min="0" data-ae-maint="' + i + '" value="' + (itemAmounts[i] || 0) +
            '" placeholder="数量">' + switchBtn(i, false) + '</div>';
        }).join('') + '</div>' +
        '<h4>保持流体</h4><div class="ae-maintain">' +
        Array.from({length: 9}, function(_, i) {
          var held = fluidSamples[i], heldKey = held && (held.key || held.k),
            fluid = held&&held.kind==='fluid'?heldKey:heldKey?AE_MAINTAIN_FLUID(heldKey):null,
            mark = heldKey && fluid ? {kind: 'fluid', key: fluid} : null;
          return '<div class="ae-maintain-row">' +
            markerSlot('fluidMarks', i, mark,
              fluid ? '流体：' + FLUID_PRESENTATION.name(fluid) : '') +
            '<input type="number" min="0" data-ae-maint-fluid="' + i + '" value="' + (fluidAmounts[i] || 0) +
            '" placeholder="mB">' + switchBtn(i, true) + '</div>';
        }).join('') + '</div>';
      } catch (err) {
        h += '<p class="ae-note">请求器界面出错：' +
          esc(String(err && (err.stack || err.message) || err).slice(0, 400)) + '</p>';
      }
    }
    if(d.role==='interface'&&AE_UPGRADES.count(v.m,'craftingLock')){
      var lockNames={NONE:'不锁定',LOCK_UNTIL_PULSE:'等待红石脉冲',LOCK_WHILE_HIGH:'高电平时锁定',LOCK_WHILE_LOW:'低电平时锁定',LOCK_UNTIL_RESULT:'等待产物返回'};
      h+='<div class="ae-setting-row"><label>合成锁定 <select data-ae-lock-mode>'+Object.keys(lockNames).map(function(k){return '<option value="'+k+'"'+((s.craftingLockMode||'NONE')===k?' selected':'')+'>'+lockNames[k]+'</option>';}).join('')+'</select></label><button class="btn" data-ae-unlock>解锁</button></div>';
    }
    if (d.role === 'wireless') {
      h += '<p class="ae-note">两端写同一个频道名就会连成一条不限距离的线缆，把两边的网络合成一个；留空表示不连接。</p>' +
        '<div class="ae-setting-row"><label>频道 ' +
        '<input data-ae-wireless maxlength="24" placeholder="例如 矿石处理" value="' + esc(s.channel) + '"></label></div>';
    }
    if (d.role === 'cellworkbench') {
      var benchUsed = s.cells[0] && AE_CELLS.inspect(s.cells[0]),
        benchCap = benchUsed ? benchUsed.typeCapacity : 63,
        benchSet = s.partition.filter(Boolean).length,
        benchShown = Math.min(benchCap, Math.max(9, benchSet + 3));
      h += '<p class="ae-note">分区里的种类是这款元件允许存储的范围，一个都不放表示什么都收。</p>' +
        '<h4>分区<small>' + benchSet + ' / ' + benchCap +
        (benchUsed ? '' : '，先放元件') + '</small></h4>' +
        '<div class="ae-slots ae-partition">' + Array.from({length: benchShown}, function(_, i) {
          var mark = AE_MARKERS.normalize(s.partition[i]);
          return '<button type="button" class="ae-slot ae-ghost" data-ae-marker="' + i +
            '" data-ae-marker-field="partition" data-tip="' +
            esc(mark ? '允许存储，空手点击清除' : '拿着物品点击，允许这款元件存它') + '">' +
            (mark ? iconHtml(mark.key, 28) : '<span>＋</span>') + '</button>';
        }).join('') + '</div>';
    }
    if (d.role === 'storage_bus' || d.role === 'export' || d.role === 'import') {
      h += '<div class="ae-bus-body">';
      h += '<div class="ae-bus-dir">' + directions(v.m) + '</div>';
      h += '<div class="ae-bus-foot">';
      h += '<div class="ae-bus-group"><label>访问</label><select data-ae-access><option value="readwrite"' +
        (s.access === 'readwrite' ? ' selected' : '') + '>读写</option><option value="read"' + (s.access ===
          'read' ? ' selected' : '') + '>只读</option><option value="write"' + (s.access === 'write' ?
          ' selected' : '') +
        '>只写</option></select></div>';
      h += '<div class="ae-bus-group"><label>优先级</label><input type="number" data-ae-priority value="' +
        s.priority + '"></div>';
      if (AE_UPGRADES.supports(v.m)) h += '<div class="ae-bus-group"><h4>升级<small>加速、容量</small></h4>' +
        '<div class="ae-slots ae-bus-upgrades">' +
        AE_UPGRADES.slots(v.m).map(function(stack, i) {
          return slot({
            type: 'ae:upgrade',
            uid: v.m.uid,
            index: i
          }, stack, '升级卡');
        }).join('') + '</div></div>';
      h += '</div>';
      {
        var field = 'samples',
          count = AE_UPGRADES.sampleSlots(v.m),
          showCount = count,
          fluid = d.fluids,
          used = (s[field] || []).filter(Boolean).length;
        h += '<div class="ae-bus-main"><h4>过滤' + (fluid ? '流体' : '物品') + '<small>' + used + ' / ' + count +
          '</small></h4><div class="ae-slots">' + Array.from({
            length: showCount
          }, function(_, i) {
            // 预留下一张容量卡能打开的那一行
            return i < count ? ghost((s[field] || [])[i], i, field, fluid)
              : '<span class="ae-slot ae-slot-locked" data-tip="装上容量卡后可用">＋</span>';
          }).join('') + '</div></div>';
      }
      h += '</div>';
    }
    if ((d.role==='assembler'||d.role==='ioport')&&AE_UPGRADES.supports(v.m)) h+='<h4>升级</h4><div class="ae-slots">'+AE_UPGRADES.slots(v.m).map(function(stack,i){return slot({type:'ae:upgrade',uid:v.m.uid,index:i},stack,'升级卡');}).join('')+'</div>';
    if (d.patternSlots) h += '<h4>样板</h4><div class="ae-slots' +
      (d.role === 'assembler' ? ' ae-inline' : '') + '">' + s.patterns.map(function(stack, i) {
      return slot({
        type: 'ae:slot',
        uid: v.m.uid,
        field: 'patterns',
        index: i
      }, stack, '已编码样板');
    }).join('') + '</div>';
    if (s.items) h += '<h4>物品缓存</h4><div class="ae-slots">' + s.items.map(function(stack, i) {
      return slot({
        type: 'ae:slot',
        uid: v.m.uid,
        field: 'items',
        index: i
      }, stack);
    }).join('') + '</div>';
    // 控制器只是路由，电来自能源元件，不显示自己的缓冲条
    if (d.energyCapacity && d.role !== 'controller') h += '<div class="ae-energy"><span>' + number(v.m.eu) + ' / ' + number(d
        .energyCapacity) + ' EU</span><progress max="' + d.energyCapacity + '" value="' + (v.m.eu || 0) +
      '"></progress></div>';
    if (d.role === 'cpu' || d.role === 'cpu_unit') {
      var cpuId = c.cpuFor && c.cpuFor.get(v.m.uid),
        cpu = cpuId && AE_STATE.cpu(v.S, cpuId);
      h += cpu ? cpuCard(v, cpu, (v.S.ae.cpus || []).indexOf(cpu)) : '<p>连接合成存储器</p>';
    }
    // 分子装配室的九格由样板驱动，玩家不能手动放料
    if (d.role === 'assembler') {
      var craftCell = function(stack) {
        if (!stack) return '<span class="ae-slot"></span>';
        return '<span class="ae-slot" data-tip="' + esc(nameOf(stack.k)) + '">' + iconHtml(stack.k, 30) +
          ((stack.n || 1) > 1 ? '<b>' + number(stack.n) + '</b>' : '') + '</span>';
      };
      var product = (v.m.outs || [])[0];
      h += '<h4>当前合成<small>3×3 工作台</small></h4><div class="ae-craft-row">' +
        '<div class="ae-craft-grid">' + (v.m.ins || []).map(craftCell).join('') + '</div>' +
        '<span class="ae-craft-arrow">→</span>' +
        '<div class="ae-craft-out">' + craftCell(product) + '</div></div>';
    }
    UI_KIT.patch(v.box.querySelector('.ae-device-content'), h);
  }

  function refresh() {
    var v = state();
    if (!v) return;
    var c = AE_FACTORY.get(v.S),
      status = c.network.status(v.m.uid),
      online = status.ok;
    v.box.querySelector('.ae-status').textContent = online ? '● 已连接' : '○ ' + (errors[status.code] ||
    '未连接');
    v.box.querySelector('.ae-status').classList.toggle('connected', online);
    v.box.querySelectorAll('[data-ae-view]').forEach(function(b) {
      var selected = b.dataset.aeView === (opened.selected ? 'orders' : opened.tab);
      b.classList.toggle('on', selected);
      if (b.getAttribute('aria-pressed') !== String(selected)) b.setAttribute('aria-pressed', String(
        selected));
    });
    FACTORY.positionWindow(v.m, document.getElementById('popup'), Object.assign({}, DEFS.of(v.m.k), {
      windowWidth: v.d.terminal ? 600 : v.d.role === 'interface' ? 560 : v.d.role === 'assembler' ? 262 : AE_UPGRADES.supports(v.m) ? 466 : 540
    }));
    var room = parseFloat(v.box.style.maxHeight);
    if ((v.d.terminal && !v.d.fluidOnly || v.d.role === 'interface') && room < 360) {
      var popup = document.getElementById('popup'), zoom = typeof uiZoom === 'function' ? uiZoom() : 1,
        top = parseFloat(popup.style.getPropertyValue('--machine-area-top')) || 8;
      room = Math.floor(window.innerHeight / zoom - top - 8);
      v.box.style.maxHeight = room + 'px';
      popup.style.setProperty('--machine-area-bottom', '8px');
    }
    v.box.classList.toggle('ae-tight', room < (v.d.role==='interface'&&AE_UPGRADES.patternSlots(v.m)>9?600:480));
    v.box.classList.toggle('ae-mini', room < 360);
    v.box.classList.toggle('ae-narrow', parseFloat(v.box.style.width) < 500);
    if(v.d.interfaces){v.box.style.height=Math.min(560,room)+'px';renderInterfaces(v,c);return;}
    if (v.d.terminal) {
      v.box.style.height = Math.min(560, room) + 'px';
      v.box.classList.toggle('ae-show-plan', !!opened.selected);
      v.box.classList.toggle('ae-show-orders', !opened.selected && opened.tab === 'orders');
      v.box.classList.toggle('ae-has-editor', !!v.d.patterns || !!v.d.crafting);
      v.box.querySelector('.foot').hidden = !!opened.selected;
      if (!opened.selected && opened.tab !== 'orders') { renderStorage(v, c); renderDraft(v); }
      orderPane(v, c);
      var chestCell = v.box.querySelector('[data-ae-chest-cell]');
      if (chestCell) chestCell.hidden = !!opened.selected || opened.tab === 'orders' || !v.d.cellSlots;
      v.box.querySelector('.ae-resource-scroll').hidden = opened.tab === 'orders' || !!opened.selected;
      v.box.querySelector('.ae-storage-tools').hidden = opened.tab === 'orders' || !!opened.selected;
      v.box.querySelector('.ae-draft').hidden = opened.tab === 'orders' || !!opened.selected || !v.d
        .patterns && !v.d.crafting;
      renderResourceWindow();
    } else renderDevice(v, c);
  }

  function click(e) {
    var b = e.target.closest('button');
    if (!b || b.disabled) return;
    var v = state();
    if (!v) return;
    var d = b.dataset,
      c = AE_FACTORY.get(v.S);
    if (d.aeView) {
      clearTimeout(calculateTimer); calculationSequence++;
      opened.calculating = false;
      opened.tab = d.aeView;
      opened.selected = null;
      refresh();
    } else if (d.aeOrder) {
      opened.selected = JSON.parse(d.aeOrder);
      opened.preview = null; opened.materials = null; opened.materialSearch = ''; opened.missingOnly = false;
      opened.tab = 'orders';
      requestCalculation(0, true);

    } else if (d.aePatternInvert != null) {
      opened.patternView.inverted = !opened.patternView.inverted;
      opened.patternView.inPage = 0;
      opened.patternView.outPage = 0;
      refresh();
      v.box.querySelectorAll('.ae-pattern-viewport').forEach(function(el) { el.scrollTop = 0; });
    } else if (d.aeClearDraft != null) {
      v.s.draft = null;
      opened.patternView = {
        inPage: 0,
        outPage: 0,
        inverted: false
      };
      changed();
    } else if (d.aeMissingOnly != null) {
      opened.missingOnly = !opened.missingOnly; orderPane(v, c);
    } else if (d.aeCalculate != null) {
      requestCalculation(0);
    } else if (d.aeSubmit != null) {
      var submitted = c.orders.submit(opened.cpu, opened.selected);
      if (message(submitted)) {
        opened.selected = null;
        opened.preview = null;
      } else if (submitted.missing) {
        opened.preview = submitted;
        opened.materials = AE_PLAN_REPORT.rows(submitted).sort(function(a, b) {
          return Number(!!b.missing) - Number(!!a.missing) || label(a.resource).localeCompare(label(b.resource), 'zh-CN');
        });
      }
      changed();
    } else if (d.aeSuspend) {
      var sc = (v.S.ae.cpus || []).find(function (q) { return q.id === d.aeSuspend; });
      if (sc) { sc.suspended = !sc.suspended; changed(); }
    } else if (d.aeRetryPlan) {
      message(c.orders.retryPlan(d.aeRetryPlan));
      changed();
    } else if (d.aeCancelOrder) {
      message(c.orders.cancel(d.aeCancelOrder));
      changed();
    } else if (d.aeCancel) {
      message(c.orders.cancel(d.aeCancel));
      changed();
    } else if (d.aeEncode != null) {
      message(AE_TERMINAL.encode(v.S, v.m, {toInventory: e.shiftKey, all: e.shiftKey && e.ctrlKey}));
      changed();
    } else if (d.aeCraft != null) {
      message(AE_TERMINAL.craft(v.S, v.m));
      changed();
    } else if (d.aeExpand != null) {
      resizeDraft(e.shiftKey ? 8 : 2);
    } else if(d.aeDraftEmpty!=null){
      var held=ITEM_CURSOR.held(v.S);if(held)editCraftingCell(+d.aeDraftEmpty,held);
    } else if (d.aeRemoveEntry != null) {
      changeDraftSlot(b, 0);
    } else if (d.aeDeposit != null) {
      if (ITEM_CURSOR.held(v.S)) message(ITEM_TRANSFER.move(v.S, {
        type: 'cursor'
      }, {
        type: 'ae:network',
        uid: v.m.uid
      }, {
        swap: false
      }));
      changed();
    }
  }

  function bind(host, context) {
    if (host._aeBound) return;
    host._aeBound = true;
    host.addEventListener('pointerdown', function(e) {
      if(e.target.closest('[data-ae-unlock]')){var unlocked=context();AE_BLOCKING.unlock(unlocked.m);changed();return;}
      var blocking=e.target.closest('[data-ae-blocking]');
      if(blocking&&(e.button===0||e.button===2)){
        e.preventDefault();e.stopImmediatePropagation();
        var v=context();if(AE_BLOCKING.toggle(v.m,blocking.dataset.aeBlocking)){if(v.save)v.save();refresh();}return;
      }
      var facing = e.target.closest('[data-ae-facing]');
      if (facing && e.button === 0 && !facing.disabled) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setFacing(context(), +facing.dataset.aeFacing);
        return;
      }
      var b = e.target.closest('[data-ae-sample]');
      if (!b || e.button !== 0 && e.button !== 2) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      var v = context(),
        s = v.s,
        index = +b.dataset.aeSample,
        field = b.dataset.aeField;
      if (!s[field]) s[field] = [];
      var held = ITEM_CURSOR.held(v.S);

      function set(r) {
        s[field][index] = r;
        if (v.save) v.save();
        AE_FACTORY.invalidate(v.S);
        refresh();
        if (host._multi) MULTIBLOCK_UI.refresh(host, true);
      }
      if (e.button === 2) set(null);
      else if (b.dataset.aeFluid) {
        FLUID_PICKER.open(b, {
          onSelect: function(f) {
            set(R.fluid({
              f: f,
              mb: field === 'fluidStock' ? 1000 : 1
            }));
          }
        });
      } else if (held) set(R.item(held));
      else set(null);
    }, true);
    host.addEventListener('contextmenu', function(e) {
      if (e.target.closest('[data-ae-sample],[data-ae-blocking]')) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
    host.addEventListener('click', function(e) {
      var type = e.target.closest('[data-ae-item-types] [data-type-prefix]');
      if (type) {
        var current = context();
        if (AE_ITEM_TYPE_STOCK.toggle(current.s, type.dataset.typePrefix)) {
          AE_PROCESSING.invalidate(current.m);
          if (current.save) current.save();
          MULTIBLOCK_UI.refresh(host, true);
        }
        return;
      }
      var blocking=e.target.closest('[data-ae-blocking]');
      if(blocking&&e.detail===0){var v=context();if(AE_BLOCKING.toggle(v.m,blocking.dataset.aeBlocking)){if(v.save)v.save();refresh();}return;}
      var clear = e.target.closest('[data-ae-clear-output]');
      if (clear) {
        var v = context(),
          p = MULTIBLOCKS.byUid(v.m, clear.dataset.aeClearOutput),
          spec = p && PROCESSING_ACCESS.portInfo(p);
        if (spec && spec.outputFluidBuffer) {
          spec.commitOutputFluids(p, []);
          if (v.save) v.save();
          if (host._multi) MULTIBLOCK_UI.refresh(host, true);
        }
        return;
      }
      var b = e.target.closest('[data-ae-facing]');
      if (b && e.detail === 0) {
        setFacing(context(), +b.dataset.aeFacing);
        return;
      }
      // 标记槽和开关是按钮，走 click
      var markerBtn = e.target.closest('[data-ae-marker]');
      if (markerBtn) {
        var mv0 = context(), mIndex = Number(markerBtn.dataset.aeMarker),
          mField = markerBtn.dataset.aeMarkerField, markerState = AE_DEVICES.ensure(mv0.m),
          heldNow = root.ITEM_CURSOR && root.ITEM_CURSOR.held(mv0.S),
          marks = markerState[mField];
        if (!Array.isArray(marks)) marks = markerState[mField] = Array(9).fill(null);
        if (heldNow && (heldNow.k||heldNow.kind==='fluid'&&heldNow.key)) {
          // 只记身份，手里的东西原样留在手上
          if (mField === 'fluidMarks') {
            var heldFluid = heldNow.kind==='fluid'?heldNow.key:AE_MAINTAIN_FLUID(heldNow.k);
            if (heldFluid) AE_MARKERS.set(marks, mIndex, {kind: 'fluid', key: heldFluid});
          } else {
            AE_MARKERS.set(marks, mIndex, {kind: 'item', key: heldNow.k});
          }
        } else {
          AE_MARKERS.clear(marks, mIndex);
        }
        if(mField==='partition')AE_DEVICES.syncPartition(mv0.m);
        if (mv0.save) mv0.save();
        refresh();
        return;
      }
      var enableBtn = e.target.closest('[data-ae-maint-enable]');
      if (enableBtn) {
        var ev = context(), ei = Number(enableBtn.dataset.aeMaintEnable), es = AE_DEVICES.ensure(ev.m),
          isFluid = enableBtn.dataset.aeMaintSwitchFluid === '1',
          flags = isFluid ? es.fluidEnabled : es.enabled;
        if (Array.isArray(flags) && Number.isInteger(ei) && ei >= 0 && ei < flags.length) flags[ei] = !flags[ei];
        if (ev.save) ev.save();
        refresh();
        return;
      }
    });
    host.addEventListener('change', function(e) {
      var v = context();
      if(e.target.matches('[data-ae-lock-mode]')){v.s.craftingLockMode=e.target.value;v.s.craftingLockPending=[];}
      else if (e.target.matches('[data-ae-access]')) v.s.access = e.target.value;
      else if (e.target.matches('[data-ae-ioport]')) {
        if (['import', 'export'].includes(e.target.value)) v.s.mode = e.target.value;
      }
      else if (e.target.matches('[data-ae-maint]')) {
        var mi = Number(e.target.dataset.aeMaint), mv = Math.max(0, Math.floor(Number(e.target.value) || 0));
        var ms = AE_DEVICES.ensure(v.m);
        if (Number.isInteger(mi) && mi >= 0 && mi < ms.amounts.length) ms.amounts[mi] = mv;
      }
      else if (e.target.matches('[data-ae-maint-fluid]')) {
        var fi = Number(e.target.dataset.aeMaintFluid), fv = Math.max(0, Math.floor(Number(e.target.value) || 0));
        var fs = AE_DEVICES.ensure(v.m);
        if (Number.isInteger(fi) && fi >= 0 && fi < fs.fluidAmounts.length) fs.fluidAmounts[fi] = fv;
      }
      else if (e.target.matches('[data-ae-wireless]')) {
        AE_DEVICES.ensure(v.m).channel = String(e.target.value || '').trim().slice(0, 24);
      }
      else if (e.target.matches('[data-ae-priority]')) {
        var n = Number(e.target.value);
        if (!Number.isSafeInteger(n)) return;
        v.s.priority = n;
      } else return;
      AE_FACTORY.invalidate(v.S);
      if (v.save) v.save();
      refresh();
    });
  }

  function setFacing(v, side) {
    var d = AE_DEVICES.spec(v.m);
    if (!Number.isInteger(side) || side < 0 || side > 3) return;
    v.m.outFace = d.role === 'interface' && v.m.outFace === side ? -1 : side;
    AE_FACTORY.invalidate(v.S);
    if (v.save) v.save();
    refresh();
    FACTORY.refreshInventory(v.S, v.save);
  }

  function renderTypeStock(scroll) {
    var view = scroll._stockView, width = scroll.clientWidth;
    if (!view || !width) return;
    var grid = scroll.querySelector('.ae-type-stock-grid'),
      controls = scroll.parentElement.querySelector('[data-ae-stock-pages]'),
      columns = Math.max(1, Math.floor((width + 3) / 33)),
      pageSize = columns * 2, pages = Math.max(1, Math.ceil(view.items.length / pageSize)),
      current = Math.min(view.page || 0, pages - 1),
      html = view.items.slice(current * pageSize, (current + 1) * pageSize).map(function(r) {
        var tip = label(r) + ' × ' + r.amount.toLocaleString('en-US');
        return '<span class="ae-slot ae-type-stock-item" role="img" data-ui-key="' + esc(R.identity(r)) +
          '" data-ae-type-item="' + esc(r.key) + '" data-tip="' + esc(tip) + '" aria-label="' + esc(tip) +
          '">' + icon(r, 21) + '<b>' + number(r.amount) + '</b></span>';
      }).join('');
    grid.style.setProperty('--ae-type-stock-cols', columns);
    view.page = current;
    controls.hidden = pages === 1;
    controls.firstElementChild.disabled = current === 0;
    controls.lastElementChild.disabled = current + 1 >= pages;
    controls.querySelector('output').textContent = (current + 1) + ' / ' + pages;
    if (view.html !== html) {
      UI_KIT.patch(grid, html);
      view.html = html;
    }
  }

  function refreshPort(pane, port, S) {
    var section = pane.querySelector('[data-ae-type-stock]');
    if (!section || !section.clientWidth) return;
    var scroll = section.querySelector('[data-ae-type-scroll]'),
      types = AE_ITEM_TYPE_STOCK.configured(AE_FACTORY.portState(port)),
      session = AE_FACTORY.peek(S), node = session && session.byId.get(port.uid),
      status = node ? session.network.status(port.uid) : {code:'DISCONNECTED'},
      selection = JSON.stringify([port.uid, types]),
      stamp = selection + ':' + (status.code || 'online'),
      now = performance.now(),
      view = scroll._stockView;
    if (view && view.stamp === stamp && view.network === (session && session.network) && now < view.nextCheck)
      return;
    if (!view) {
      view = scroll._stockView = {items:[]};
      section.addEventListener('click', function(event) {
        var button = event.target.closest('[data-ae-stock-page]');
        if (!button || button.disabled) return;
        view.page += Number(button.dataset.aeStockPage);
        renderTypeStock(scroll);
      });
    }
    if (view.selection !== selection) view.page = 0;
    view.selection = selection;
    view.stamp = stamp;
    view.network = session && session.network;
    view.nextCheck = now + 250;
    view.items = types.length && status.ok ?
      AE_READ_INDEX.networkSelection(session, port.uid, AE_ITEM_TYPE_STOCK.candidates(session, node), true).resources : [];
    var count = section.querySelector('[data-ae-type-count]'), empty = section.querySelector('[data-ae-type-status]'),
      text = view.items.length ? '' : !types.length ? '选择取料类型' : status.ok ? '暂无匹配物品' : errors[status.code];
    if (empty.textContent !== text) empty.textContent = text;
    empty.hidden = !text;
    var countText = view.items.length ? view.items.length.toLocaleString('en-US') + ' 种' : '';
    if (count.textContent !== countText) count.textContent = countText;
    renderTypeStock(scroll);
  }

  function portHtml(m, p, S) {
    var s = AE_FACTORY.portState(p),
      d = PROCESSING_ACCESS.portInfo(p),
      h = '<div data-ae-port-owner="' + esc(p.uid) + '" data-item-controls="true">';
    if (d.stockingTypes) {
      h += '<section class="ae-item-types" data-ae-item-types><h4>取料类型</h4>'+
        '<div class="type-picks" role="group" aria-label="取料类型">'+TYPE_FILTER_UI.choices(AE_ITEM_TYPE_STOCK.configured(s))+'</div></section>';
      h += '<section class="ae-type-stock" data-ui-preserve data-ae-type-stock><h4>可用物品<span data-ae-type-count></span></h4>'+
        '<div class="ae-type-stock-scroll" data-ae-type-scroll role="region" aria-label="可用物品">'+
        '<p data-ae-type-status hidden></p><div class="ae-type-stock-grid"></div></div>'+
        '<div class="mb-material-nav" data-ae-stock-pages hidden><button type="button" class="btn" data-ae-stock-page="-1" aria-label="上一页">‹</button>'+
        '<output></output><button type="button" class="btn" data-ae-stock-page="1" aria-label="下一页">›</button></div></section>';
    } else if (d.stocking) {
      // 只按槽里配置的物品键查库存，不做全网清单遍历。
      var stock = null;
      try {
        var session = root.AE_FACTORY ? (AE_FACTORY.peek(S) || AE_FACTORY.prepare(S)) : null,
          wanted = (s.samples || []).filter(Boolean).map(function(resource) {
            return { kind: resource.kind, key: resource.key, amount: 1 };
          });
        if (session && root.AE_READ_INDEX && wanted.length) {
          var selection = AE_READ_INDEX.networkSelection(session, p.uid, wanted);
          stock = new Map();
          (selection.resources || []).forEach(function(resource) {
            stock.set(AE_RESOURCES.identity(resource), resource.amount);
          });
        }
      } catch (error) { stock = null; }
      h += '<h4>从ME网络取用</h4><div class="ae-slots">' + Array.from({
        length: d.samples || 16
      }, function(_, i) {
        var sample = s.samples[i], amount = null;
        if (sample && stock) amount = stock.get(AE_RESOURCES.identity(sample));
        return ghost(sample, i, 'samples', d.fluidIn, amount);
      }).join('') + '</div>';
    }
    if (d.patterns) h += '<h4>样板</h4><div class="ae-slots">' + s.patterns.map(function(stack, i) {
      return slot({
        type: 'ae:port-slot',
        uid: m.uid,
        portUid: p.uid,
        index: i
      }, stack, '已编码样板');
    }).join('') + '</div>';
    if (d.patterns && s.buffer.length) h += '<h4>已投料</h4><div data-ae-delivered-materials>' + s.buffer.map(function(r) {
      return '<div class="ae-resource-line">' + icon(r) + '<span>' + esc(label(r)) + '</span><b>' +
        number(r.amount) + (r.kind === 'fluid' ? ' mB' : '') + '</b></div>';
    }).join('') + '</div>';
    if (!d.stocking) {
      if (d.itemIn || d.itemOut) h += '<div class="ae-slots">' + p.items.map(function(stack, i) {
        return slot({
          type: 'port',
          uid: m.uid,
          portUid: p.uid,
          kind: d.itemIn ? 'in' : 'out',
          index: i
        }, stack);
      }).join('') + '</div>';
      if (d.fluidIn || d.fluidOut) {
        var tanks = d.outputFluidBuffer ? d.outputFluidBuffer(p) : p.tanks;
        h += '<div>' + tanks.map(function(t, i) {
          return t ? '<div class="ae-resource-line"><button class="ae-slot" data-transfer-ref="' + esc(
              JSON.stringify({
                type: 'ae:port-fluid',
                uid: m.uid,
                portUid: p.uid,
                index: i
              })) + '" data-lookup-fluid="' + esc(t.f) + '">' + FLUID_PRESENTATION.html(t.f, 28) +
            '</button><span>' + esc(FLUID_PRESENTATION.name(t.f)) + '</span><b>' + number(t.mb) +
            ' mB</b></div>' : '';
        }).join('') + '</div>';
        if (!d.me && typeof d.commitOutputFluids === 'function')
          h += '<button class="btn" data-ae-clear-output="' + esc(p.uid) + '">清空余液</button>';
      }
    }
    return h + '</div>';
  }

  function bindPorts(host, m, S, save) {
    bind(host, function() {
      var node = host.querySelector('[data-ae-port-owner]'),
        p = node && MULTIBLOCKS.byUid(m, node.dataset.aePortOwner);
      return {
        S: S,
        m: m,
        s: p ? AE_FACTORY.portState(p) : {},
        save: save
      };
    });
  }

  function tools(entry) {
    var v = state();
    if (!v || !v.d.patterns && !v.d.crafting || !entry || !['craft', 'machine'].includes(entry.kind) || !v.d
      .patterns && entry.kind !== 'craft' || entry.kind === 'machine' && !AE_PATTERNS.canEncodeRecipe(entry.recipe)) return '';
    var virtualize = AE_STATE.ensure(v.S).virtualize,
      writeTip = v.d.patterns ? '写入样板' : '摆放';
    return '<div class="ae-jei-tools"><button type="button" data-ae-jei-write data-tip="' + writeTip +
      '" aria-label="' + writeTip + '">' +
      '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M5 1h6v6h4L8 14 1 7h4z"/></svg></button>' + (v.d.patterns ?
        '<button type="button" class="' + (virtualize ? 'on' : '') + '" data-ae-jei-virtual data-tip="虚拟物品：' +
        (virtualize ? '开' : '关') + '" aria-label="虚拟物品" aria-pressed="' + virtualize + '">' +
        '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="m8 1 6 3v8l-6 3-6-3V4Zm0 6v8M2 4l6 3 6-3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2 1"/></svg></button>' : '') +
      '</div>';
  }

  function jeiAction(e, entry, choices) {
    var b = e.target.closest('[data-ae-jei-write],[data-ae-jei-virtual]');
    if (!b) return false;
    var v = state();
    if (!v) return false;
    if (b.dataset.aeJeiVirtual != null) {
      AE_STATE.setVirtualize(v.S, !AE_STATE.ensure(v.S).virtualize);
      if (root.JEI) JEI.refreshAE();
    } else message(AE_TERMINAL.fromJEI(v.S, v.m, entry, choices));
    changed();
    return true;
  }

  function targets(r, S) {
    var v = state();
    if (!v || v.S !== S) return null;
    if (r.type !== 'bag') return [{
      type: 'bag',
      group: true
    }];
    var source = ITEM_TRANSFER.endpoint(S, r),
      stack = source && source.get && source.get();
    if (v.d.patterns && stack && (CONTENT.canonicalKey(stack.k) === AE_INVENTORY.blank || stack.aePattern))
      return [{
        type: 'ae:slot',
        uid: v.m.uid,
        field: 'encoding',
        index: stack.aePattern ? 1 : 0
      }];
    if (v.d.cellSlots && (!v.d.terminal || stack && AE_CELLS.rule(stack))) return v.s.cells.map(function(_,
      i) {
      return {
        type: 'ae:slot',
        uid: v.m.uid,
        field: 'cells',
        index: i
      };
    });
    if (v.d.terminal) return [{
      type: 'ae:network',
      uid: v.m.uid
    }];
    if(stack&&AE_UPGRADES.supports(v.m)&&AE_UPGRADES.card(stack))return AE_UPGRADES.slots(v.m).map(function(_,i){return {type:'ae:upgrade',uid:v.m.uid,index:i};});
    if (v.d.role === 'interface') {
      if (AE_UPGRADES.card(stack)) return AE_UPGRADES.slots(v.m).map(function(_, i) { return {type: 'ae:upgrade', uid: v.m.uid, index: i}; });
      var field = stack && stack.aePattern ? 'patterns' : 'items',
        refs = (field === 'patterns' ? v.s[field].slice(0, AE_UPGRADES.patternSlots(v.m)) : v.s[field]).map(function(_, i) {
          return {type: 'ae:slot', uid: v.m.uid, field: field, index: i};
        });
      return v.d.fluids && field === 'items' ? v.s.fluids.map(function(_, i) {
        return {type: 'ae:fluid', uid: v.m.uid, index: i};
      }).concat(refs) : refs;
    }
    return null;
  }
  root.AE_UI = {
    open: open,
    refresh: refresh,
    targets: targets,
    tools: tools,
    jeiAction: jeiAction,
    isOpen: function () { return !!opened; },
    portHtml: portHtml,
    bindPorts: bindPorts,
    refreshPort: refreshPort,
    errors: errors
  };
})(typeof window !== 'undefined' ? window : globalThis);
