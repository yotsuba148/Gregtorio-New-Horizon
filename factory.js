(function () {
  var U = 64, MACHINE_ICON = 64;
  var W0 = 14, H0 = 9;
  var C = {
    bg: '#181612',
    grid: 'rgba(218,207,186,.13)',
    gridBold: 'rgba(218,207,186,.23)',
    ink: '#d9edff',
    accent: '#78d2ff',
  };
  var st = { move:null, plan:null, demolition:false, drawing: false, last: null, place: null };
  var linePointer = null;

  function GD_() { return typeof GD !== 'undefined' ? GD : window.GD; }
  function nameOf_(k) { var d=window.DEFS&&DEFS.of(k);return d&&d.entityName||((typeof nameOf === 'function') ? nameOf(k) : (GD_().items[k] || k)); }
  function iconOrText_(k, px) {
    return (typeof iconOrText === 'function') ? iconOrText(k, px) : '';
  }
  function toast(msg) {
    if (typeof toastAt === 'function') toastAt(null, msg);
  }
  function transferTip(result,action){if(typeof window.transferTip==='function')return window.transferTip(result,action);if(result.ok)toast(action+' ×'+result.moved);else toast('库存或槽位空间不足');}

  /* 机器正面图：modicons/face/*.png 是 16×16 原图放大版，铺满格子才饱满。
   * 没有正面图的退回图集里的透视图标。 */
  function faceHtml(k, px) {
    if(window.TANK_PRESENTATION&&TANK_PRESENTATION.supported({k:k}))return TANK_PRESENTATION.body({k:k,tanksIn:[]},px);
    var face = !FRONT_FACES.isometric(k) && (GD_().gridFaceIcons&&GD_().gridFaceIcons[k] || GD_().faceIcons && GD_().faceIcons[k]);
    if (face) {
      return '<span class="facebox" style="width:' + px + 'px;height:' + px + 'px">' +
        '<img src="' + face + '" alt=""></span>';
    }
    return '<span class="facebox" style="width:' + px + 'px;height:' + px + 'px">' +
      iconOrText_(k, px) + '</span>';
  }

  /* ---------------- 数据 ---------------- */
  function ensure(S) {var f=FACTORY_STATE.ensure(S);SIMULATION.session(S);return f;}

  function key(x, y) { return x + ',' + y; }
  function machineByUid(f, uid) {
    for (var i = 0; i < f.machines.length; i++) {
      if (String(f.machines[i].uid) === String(uid)) return { m: f.machines[i], i: i };
    }
    return null;
  }
  function machineAt(f, x, y) {
    if(f._paintMachineCells)return f._paintMachineCells[key(x,y)]||null;
    for (var i = 0; i < f.machines.length; i++) {
      var m = f.machines[i];
      if (ENTITIES.isGrid(m) && (!window.BLUEPRINTS||BLUEPRINTS.here(f,m)) && (window.MULTIBLOCKS?MULTIBLOCKS.occupies(m,x,y):m.x===x&&m.y===y)) return m;
    }
    return null;
  }
  function has(f, t, x, y) { return !!f[t][key(x, y)]; }

  /* 槽位数按 GT 源码里那台机器真实的来（data/machslot.js）。
   * 离心机是 2 进 6 出，压缩机是 1 进 1 出 —— 不能一律写死。 */
  function slotCounts(k) {
    var d=DEFS.of(k);return d?[d.slots.in,d.slots.out]:[0,0];
  }
  function fluidCap(m,kind){var d=STRUCTURES.instance(m);return d?(kind==='out'?d.fluidOutputTanks:d.fluidInputTanks).reduce(function(n,cap){return n+cap;},0):0;}

  var TIER_CACHE = {};
  function tierOf(k) {
    if (TIER_CACHE[k] !== undefined) return TIER_CACHE[k];
    var out = 1, m = GD_().machines || {};
    (m.cats || []).forEach(function (c) {
      (c.tiers || []).forEach(function (x) { if (x.k === k) out = x.t || 1; });
    });
    TIER_CACHE[k] = out;
    return out;
  }

  /* 读档时的归一化：只保证"每堆不超过一组"，**绝不合并、绝不截断**。
   * 以前把两堆 40 并成一堆 64，凭空少 16 个；第九种输入直接被丢掉。
   * 现在超量的拆成多堆，总数量一个不动。 */
  function normalizeStacks(arr) {
    var out = [];
    (arr || []).forEach(function (s) {
      if (!s || !s.k) return;
      var n = (s.n == null ? 1 : s.n);
      if (!(n > 0)) return;
      while (n > 0) {
        var canonical=CONTENT.canonicalKey(s.k),put=Math.min(n,CORE.maxStack(canonical));
        out.push(Object.assign({},s,{k:canonical,n:put}));
        n -= put;
      }
    });
    return out;
  }

  /* 已经是规整的一堆就别再重建一遍，省得每 tick 造一堆垃圾对象 */
  function needNormalize(arr) {
    if (!Array.isArray(arr)) return true;
    for (var i = 0; i < arr.length; i++) {
      var s = arr[i];
      if (!s || !s.k || !(s.n > 0) || s.n > CAP) return true;
    }
    return false;
  }

  function normalizeOuts(arr) { return normalizeStacks(arr); }
  function normalizeIns(arr) { return normalizeStacks(arr); }

  /* ---------------- 画 ---------------- */
  function paintView(f){
    var b=window.BLUEPRINTS&&f.blueprints?BLUEPRINTS.view(f):f;
    var view={w:b.w,h:b.h,width:b.width,height:b.height,camera:b.camera,chest:b.chest,belt:b.belt,machines:b.machines,_paintMachineCells:MULTIBLOCKS.index(b)};GRID_TRANSPORTS.kinds().forEach(function(k){view[k]=b[k];});return view;
  }
  function visibleCell(f,x,y){var b=f._paintBounds;return !b||x>=b.x0&&x<=b.x1&&y>=b.y0&&y<=b.y1;}
  function paint(ctx, f) {
    f=paintView(f);
    var canvas=ctx.canvas,viewport=canvas&&canvas._fxViewport;
    if(viewport){var camera=f.camera,width=Math.max(1,viewport.clientWidth),height=Math.max(1,viewport.clientHeight);if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;canvas.style.width=width+'px';canvas.style.height=height+'px';canvas.style.left=viewport.scrollLeft+'px';canvas.style.top=viewport.scrollTop+'px';ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,width,height);ctx.setTransform(camera.zoom,0,0,camera.zoom,-viewport.scrollLeft,-viewport.scrollTop);
      f._paintBounds={x0:Math.max(0,Math.floor(viewport.scrollLeft/camera.zoom/U)-1),y0:Math.max(0,Math.floor(viewport.scrollTop/camera.zoom/U)-1),x1:Math.min(f.w-1,Math.floor((viewport.scrollLeft+width)/camera.zoom/U)+1),y1:Math.min(f.h-1,Math.floor((viewport.scrollTop+height)/camera.zoom/U)+1)};
    }
    var W = f.w * U, H = f.h * U;
    if(!viewport)ctx.clearRect(0, 0, W, H);

    var bounds=f._paintBounds;
    for (var x = bounds?bounds.x0:0; x <= (bounds?Math.min(f.w,bounds.x1+1):f.w); x++) {
      ctx.strokeStyle = (x % 4 === 0) ? C.gridBold : C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x * U + 0.5, 0); ctx.lineTo(x * U + 0.5, H); ctx.stroke();
    }
    for (var y = bounds?bounds.y0:0; y <= (bounds?Math.min(f.h,bounds.y1+1):f.h); y++) {
      ctx.strokeStyle = (y % 4 === 0) ? C.gridBold : C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y * U + 0.5); ctx.lineTo(W, y * U + 0.5); ctx.stroke();
    }

    drawChests(ctx, f);
    drawBelts(ctx, f);
    drawFluidPipes(ctx, f);
    drawItemPipes(ctx, f);
    if(window.EIO_PRESENTATION)EIO_PRESENTATION.draw(ctx,f,visibleCell,U);
    drawWires(ctx, f);
  }

  /* 箱子：使用同一份原版箱子库存图，右下角写总数量。 */
  var CHEST_IMG = null;
  function chestImage() {
    if (CHEST_IMG) return CHEST_IMG;
    CHEST_IMG = new Image();
    CHEST_IMG.onload = function () {
      if (window.__fxRepaint) window.__fxRepaint();
    };
    CHEST_IMG.src = 'modicons/presentation/faces/chest_front_native.png';
    return CHEST_IMG;
  }

  function drawChests(ctx, f) {
    var img = chestImage();
    Object.keys(f.chest).forEach(function(kk){
        var p=kk.split(',').map(Number),x=p[0],y=p[1],raw=f.chest[kk];
        if(!raw||!visibleCell(f,x,y))return;
        var c = normChest(raw);
        f.chest[key(x, y)] = c;
        var size = MACHINE_ICON, px = x * U + (U-size)/2, py = y * U + (U-size)/2;
        ctx.save();
        if (img && img.complete && img.naturalWidth) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, px, py, size, size);
        } else {
          ctx.fillStyle = '#8a5a2b';
          ctx.fillRect(px, py, size, size);
        }
        var total = chestCount(c);
        if (total > 0) {
          ctx.fillStyle = 'rgba(0,0,0,.62)';
          ctx.fillRect(px + size - 26, py + size - 15, 26, 15);
          ctx.fillStyle = '#ffe9b8';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
          ctx.fillText(total > 999 ? '999+' : String(total), px + size - 3, py + size - 2);
        }
        ctx.restore();
    });
  }

  /* 传送带：深色带子 + 箭头，上面压着货就写数字 */
  function drawBelts(ctx, f) {
    Object.keys(f.belt).forEach(function(kk){
        var p=kk.split(',').map(Number),x=p[0],y=p[1],b=f.belt[kk];
        if(!b||!visibleCell(f,x,y))return;
        var px = x * U + 8, py = y * U + 20, w = U - 16, h = U - 40;
        ctx.save();
        ctx.fillStyle = '#2b3138';
        ctx.fillRect(px, py, w, h);
        ctx.strokeStyle = '#4d5866';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 0.5, py + 0.5, w - 1, h - 1);
        // 三条滚动斜纹
        ctx.strokeStyle = '#5b6878';
        ctx.lineWidth = 2;
        for (var i = 0; i < 3; i++) {
          var bx = px + 8 + i * 18;
          ctx.beginPath();
          ctx.moveTo(bx, py + h - 6);
          ctx.lineTo(bx + 7, py + 6);
          ctx.stroke();
        }
        /* 方向箭头：玩家点出来的朝向，不画出来等于让人猜 */
        (function () {
          var dd = (typeof b === 'object' && b && b.dir != null) ? (b.dir | 0) : -1;
          if (dd === -1) {
            /* 自动：画个圈，表示四面都试，没有固定朝向 */
            ctx.strokeStyle = '#7fb0e8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(px + w / 2, py + h / 2, Math.min(w, h) / 5, 0, Math.PI * 2);
            ctx.stroke();
            return;                      // 自动方向只画圈，数量由下面统一画
          }
          if (dd < 0 || dd > 3) return;
          var cxp = px + w / 2, cyp = py + h / 2;
          var ax = [0, 0, -1, 1][dd], ay = [-1, 1, 0, 0];
          var len = Math.min(w, h) / 2 - 3;
          ctx.strokeStyle = '#7fb0e8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cxp - ax * len * 0.5, cyp - ay * len * 0.5);
          ctx.lineTo(cxp + ax * len * 0.5, cyp + ay * len * 0.5);
          ctx.moveTo(cxp + ax * len * 0.5, cyp + ay * len * 0.5);
          ctx.lineTo(cxp + ax * len * 0.5 - ax * 5 + ay * 4, cyp + ay * len * 0.5 - ay * 5 - ax * 4);
          ctx.moveTo(cxp + ax * len * 0.5, cyp + ay * len * 0.5);
          ctx.lineTo(cxp + ax * len * 0.5 - ax * 5 - ay * 4, cyp + ay * len * 0.5 - ay * 5 + ax * 4);
          ctx.stroke();
        })();
        if (b.k && b.n > 0) {
          ctx.fillStyle = '#d8ecff';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(String(b.n), px + w / 2, py + h / 2);
        }
        ctx.restore();
    });
  }

  /* 管道画法（照 GPT 那张图的规矩）：
   *   直段是连续的管身，不给每一格都扣一个接头；
   *   只有转角、分叉、端点才出现卡箍，所以整条线看下来是"一根管子"。
   * 管身分三层画：暗底勾边、亮body、顶上一道高光，出来是圆柱而不是扁线。
   * 流体和物品靠管径 + 纹理区分，跟管材颜色无关。 */

  var DIRS = [[0, -1, 1], [1, 0, 2], [0, 1, 4], [-1, 0, 8]];

  function maskOf(f, t, x, y) {
    var m = 0;
    for (var k = 0; k < 4; k++) {
      if (has(f, t, x + DIRS[k][0], y + DIRS[k][1])) m |= DIRS[k][2];
    }
    return m;
  }

  function segs(f, t) {
    var r = U / 2, out = [];
    for (var y = 0; y < f.h; y++) {
      for (var x = 0; x < f.w; x++) {
        if (!has(f, t, x, y)) continue;
        var cx = x * U + r, cy = y * U + r;
        var m = maskOf(f, t, x, y);
        if (m & 1) out.push([cx, cy, cx, y * U]);
        if (m & 2) out.push([cx, cy, (x + 1) * U, cy]);
        if (m & 4) out.push([cx, cy, cx, (y + 1) * U]);
        if (m & 8) out.push([cx, cy, x * U, cy]);
        if (!m) out.push([cx, cy - 1, cx, cy + 1]);
      }
    }
    return out;
  }

  /* 直段（两个相反方向）不画卡箍，其余都画 */
  function needsJoint(mask) {
    if (mask === 0) return true;
    var n = (mask & 1 ? 1 : 0) + (mask & 2 ? 1 : 0) + (mask & 4 ? 1 : 0) + (mask & 8 ? 1 : 0);
    if (n === 1) return true;
    if (n === 2) return !((mask === 1 && mask === 1) || mask === 5 || mask === 10);
    return true;
  }

  function strokeBody(ctx, ss, w, dark, body, hi) {
    ctx.lineCap = 'butt';
    ctx.strokeStyle = dark;
    ctx.lineWidth = w + 3;
    ss.forEach(function (s) {
      ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke();
    });
    ctx.strokeStyle = body;
    ctx.lineWidth = w;
    ss.forEach(function (s) {
      ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke();
    });
    ctx.strokeStyle = hi;
    ctx.lineWidth = Math.max(1, w * 0.3);
    ss.forEach(function (s) {
      ctx.beginPath(); ctx.moveTo(s[0] - 1, s[1] - 1); ctx.lineTo(s[2] - 1, s[3] - 1); ctx.stroke();
    });
  }

  function drawPipeLayer(ctx,f,kind){
    var hollow=kind!=='wire',fluid=kind==='fluid',outer=fluid?18:8,inner=fluid?12:4,layer=ctx,canvas=ctx.canvas;
    if(hollow){var off=canvas['_fxPipeLayer'+kind]||(canvas['_fxPipeLayer'+kind]=document.createElement('canvas'));if(off.width!==canvas.width)off.width=canvas.width;if(off.height!==canvas.height)off.height=canvas.height;layer=off.getContext('2d');layer.setTransform(1,0,0,1,0,0);layer.clearRect(0,0,off.width,off.height);layer.setTransform(ctx.getTransform());}
    var entries=[],r=U/2;
    Object.keys(f[kind]).forEach(function(kk){
      var p=kk.split(',').map(Number),x=p[0],y=p[1];if(!f[kind][kk]||!visibleCell(f,x,y))return;
      var paths=[],cx=x*U+r,cy=y*U+r;
      for(var d=0;d<4;d++)if(PIPE_CONNECTIONS.connected(f,kind,kk,d,f._paintMachineCells)){var nx=x+DIRS[d][0],ny=y+DIRS[d][1],length=r+(!f[kind][key(nx,ny)]&&(machineAt(f,nx,ny)||f.chest[key(nx,ny)])?(U-MACHINE_ICON)/2:0);paths.push([cx,cy,cx+DIRS[d][0]*length,cy+DIRS[d][1]*length]);}
      entries.push({cx:cx,cy:cy,paths:paths,color:ENGINE.networks.def(f[kind][kk],kind).color||'#c6d9e5',insulated:!!ENGINE.networks.def(f[kind][kk],kind).insulated});
    });
    function lines(e){layer.beginPath();e.paths.forEach(function(p){layer.moveTo(p[0],p[1]);layer.lineTo(p[2],p[3]);});layer.stroke();}
    layer.save();layer.lineCap='butt';layer.lineJoin='miter';
    entries.forEach(function(e){if(e.insulated){layer.setLineDash([]);layer.strokeStyle='#26282c';layer.lineWidth=7;lines(e);}layer.setLineDash(fluid?[10,6]:kind==='wire'?[8,4]:[]);layer.strokeStyle=e.color;layer.lineWidth=hollow?outer:2;lines(e);layer.setLineDash([]);if(hollow){layer.fillStyle=e.color;layer.fillRect(e.cx-outer/2,e.cy-outer/2,outer,outer);}else if(!e.paths.length||e.paths.length>2){layer.fillStyle=e.color;var size=kind==='wire'?6:8;layer.fillRect(e.cx-size/2,e.cy-size/2,size,size);}});
    if(hollow){layer.globalCompositeOperation='destination-out';layer.lineWidth=inner;entries.forEach(function(e){lines(e);layer.fillRect(e.cx-inner/2,e.cy-inner/2,inner,inner);});}
    layer.restore();
    if(hollow){ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(off,0,0);ctx.restore();}
  }
  function drawFluidPipes(ctx,f){drawPipeLayer(ctx,f,'fluid');}
  function drawItemPipes(ctx,f){drawPipeLayer(ctx,f,'item');}
  function drawWires(ctx,f){drawPipeLayer(ctx,f,'wire');}

  /* ---------------- 机器：放入 / 取出 / 加工 ---------------- */

  /* 这件物品是不是一台机器（machines.js 里列过的 meta tile 都算） */
  var MACH_SET = null;
  function isMachine(k) {
    if (!MACH_SET) {
      MACH_SET = {};
      var m = GD_().machines || {};
      (m.cats || []).forEach(function (c) {
        (c.tiers || []).forEach(function (t) { if (t.k) MACH_SET[t.k] = 1; });
      });
      (m.gens || []).forEach(function (g) { if (g.k) MACH_SET[g.k] = 1; });
    }
    return !!MACH_SET[k];
  }

  var CAP = 64;                       // 一个槽先按一组算

  /* ---------------- 流体 ---------------- */
  var FLUID_CAP = 16000;               // 一个罐 8 桶

  function fluidName(f) {
    var d = GD_().fluids || {};
    return d[f] || f;
  }

  /* 桶里的东西怎么倒进机器：只有这几样有对应桶/cell */
  var BUCKET = {
    'minecraft:water_bucket@0': ['water', 1000, 'minecraft:bucket@0'],
    'minecraft:lava_bucket@0': ['lava', 1000, 'minecraft:bucket@0'],
    'IC2:itemCellEmpty@12': ['ic2distilledwater', 1000, 'IC2:itemCellEmpty@0'],
    'IC2:itemCellEmpty@9': ['ic2coolant', 1000, 'IC2:itemCellEmpty@0'],
  };

  function bucketOf(k) { return BUCKET[k] || null; }
  (GD_().containerRegistry||[]).forEach(function(c){BUCKET[c.filled]=[c.fluid,c.amount,c.empty];});

  /* 反过来：这种流体能装进什么容器 */
  var FLUID_TO_EMPTY = {};
  (function () {
    Object.keys(BUCKET).forEach(function (k) {
      var v = BUCKET[k];
      if (!FLUID_TO_EMPTY[v[0]]) FLUID_TO_EMPTY[v[0]] = [k, v[2]];
    });
  })();

  /* 这台机器属于哪一类（machines.js 的 cats[].id），配方按类别找 */
  var CAT_CACHE = {};
  function catOf(k) {
    if (CAT_CACHE[k] !== undefined) return CAT_CACHE[k];
    var out = null;
    var m = GD_().machines || {};
    (m.cats || []).forEach(function (c) {
      (c.tiers || []).forEach(function (t) { if (t.k === k) out = c.id; });
    });
    CAT_CACHE[k] = out;
    return out;
  }

  /* ---- 机器定义查询：电压、槽位这些只从 defs.js 拿，别处不再自己算 ---- */
  function defOf(k) {
    if (typeof DEFS === 'undefined' || !DEFS.of) return null;
    return DEFS.of(k);
  }
  /* 认不出型号的机器当成无限电压，宁可让它跑，也别因为缺定义把线停死 */
  function machTier(m) {
    var d = defOf(m && m.k);
    return d ? d.tier : -1;
  }
  /* 配方要几档机器：EUt 32 以内 LV、128 以内 MV、512 以内 HV …… */
  function recTier(rec) {
    if (typeof DEFS === 'undefined' || !DEFS.tierOfEut) return 1;
    return DEFS.tierOfEut(rec.eut || 0);
  }
  /* ---- 时钟 ----
   * GT 是 20 tps，一个 tick 50 毫秒。浏览器回调只告诉我过了多少毫秒，
   * 模拟按固定步长走：攒够 50 毫秒走一步，一步 = 一个游戏 tick。
   * 这样刷新率高低、标签页被节流，产出的东西都一样。 */
  var TICK_MS = 50;
  var TPS = 20;
  var worldTick = 0;

  /* ---- 电 ----
   * 每台机器自带一块缓冲，容量按档位算：档位电压 × 64。
   * 加工时按 recEut 每秒扣，扣不出来就停在这一步，进度不动、料也不退。 */
  function euCap(m) {
    var d = m&&window.STRUCTURES?STRUCTURES.instance(m):defOf(m && m.k);
    return d ? d.energyCapacity : 0;
  }
  function euOf(m) { return (m && m.eu) || 0; }
  function addEu(m, n) {
    if (!(n > 0)) return 0;
    var cap = euCap(m), before = euOf(m);
    m.eu = Math.min(cap, before + n);
    return m.eu - before;                 // 实际收进去多少，剩下的是溢出
  }
  function takeEu(m, n) {
    if (!(n > 0)) return true;
    if (euOf(m) < n - 1e-9) return false;
    m.eu = Math.max(0, euOf(m) - n);
    return true;
  }

  /* ---- 炉温 ----
   * 高炉、电弧炉这类看的是炉温：配方要 2054K，线圈只有 1800K 就炼不出来。
   * 线圈档位存在机器上（m.coil），跟 GT 换线圈是一个意思。 */
  function coils() {
    var g = (typeof GD_ === 'function' ? GD_() : window.GD);
    return (g && g.coils) || [{ id: 0, cn: '无', heat: 0 }];
  }
  function heatOf(m) {
    var list = coils(), i = (m && m.coil) | 0;
    if (i < 0 || i >= list.length) i = 0;
    return list[i].heat || 0;
  }
  function coilName(m) {
    var list = coils(), i = (m && m.coil) | 0;
    if (i < 0 || i >= list.length) i = 0;
    return list[i].cn;
  }

  /* ---- 出料面 ----
   * GT 的机器有一个主输出面：产物只从那一面出来，那一面也不收料。
   * -1 表示不指定（四面都行），0~3 是 上/右/下/左，跟 DIR4 一致。 */
  var FACE_NAMES = ['上', '右', '下', '左'];
  function outFaceOf(m) {
    if (!m || m.outFace == null) return -1;
    var v = m.outFace | 0;
    return (v >= 0 && v <= 3) ? v : -1;
  }
  /* 往 d 这个方向出料，允不允许 */
  function faceAllows(m, d) {
    var f = outFaceOf(m);
    return f < 0 || f === d;
  }
  /* 机器的某一面能不能收料：主输出面不收 */
  function faceTakes(m, side) {
    var f = outFaceOf(m);
    return m.allowInputFromOutputSide||!(f >= 0 && f === side);
  }

  /* ---- 电流 ----
   * GT 的功率是 电压 × 电流。安培数属于机器定义（数据里没有就按 1 安），
   * 这里只负责两件事：发电机每 tick 最多出 电压×安培，机器每 tick 最多进这么多。 */
  function ampOf(m) {
    var d = defOf(m && m.k);
    var a = d && d.amperage;
    return (a > 0) ? a : 1;
  }
  function voltOf(m) {
    var d = defOf(m && m.k);
    return (d && d.volt) || 32;
  }
  function intakeOf(m) { return voltOf(m) * ampOf(m); }

  function isGen(m) {
    var d = defOf(m && m.k);
    return !!(d && d.generator);
  }

  /* ---- 发电机 ----
   * 烧燃料出电。燃料从自己的输入槽里拿，烧完一单位再拿下一单位。
   * 缓冲满了就不烧 —— 不能白烧掉玩家的煤。 */
  var GEN_PERIOD = 10;       // GT：MTEBasicGenerator.onPostTick 里 aTick % 10 == 0
  function genTick(m) { return ENGINE.generators.tick(m,worldTick); }

  function fuelPick(m) {
    var fuels = (typeof GD_ === 'function' ? GD_() : window.GD).fuels || {};
    for (var i = 0; i < (m.ins || []).length; i++) {
      var slot = m.ins[i];
      var f = fuels[slot.k];
      if (!f || !(f.eu > 0) || !(slot.n > 0)) continue;
      return { idx: i, k: slot.k, eu: f.eu, stock: slot.n };
    }
    return null;
  }

  function findFuel(m) {
    var p = fuelPick(m);
    return p ? { eu: p.eu, k: p.k } : null;
  }

  /* ---- 电网 ----
   * 电线格连成一片，网络里的发电机电平分给网络里的机器（先不做损耗）。
   * 机器跟发电机直接贴着也算接上了，不然玩家得为了通电专门摆一格线。 */
  function powerTick(f) { return ENGINE.networks.power(f,worldTick); }

  function wireNets(f) {
    var wire = f.wire || {};
    var seen = {}, nets = [];
    var idx = machineIndex(f);
    Object.keys(wire).forEach(function (kk) {
      if (seen[kk]) return;
      var stack = [kk], net = { cells: [], gens: [], machines: [] };
      seen[kk] = 1;
      while (stack.length) {
        var c = stack.pop();
        net.cells.push(c);
        var p = c.split(','), px = +p[0], py = +p[1];
        for (var d = 0; d < 4; d++) {
          var nx = px + DX4[d], ny = py + DY4[d], nk = nx + ',' + ny;
          if (wire[nk]) {
            if (!seen[nk]) { seen[nk] = 1; stack.push(nk); }
          } else {
            var mm = idx[nk];
            if (mm) {
              if (isGen(mm)) { if (net.gens.indexOf(mm) < 0) net.gens.push(mm); }
              else if (net.machines.indexOf(mm) < 0) net.machines.push(mm);
            }
          }
        }
      }
      nets.push(net);
    });
    return nets;
  }

  var DX4 = [0, 0, -1, 1], DY4 = [-1, 1, 0, 0];

  function machineIndex(f) {
    var idx = {};
    (f.machines || []).forEach(function(m){if(ENTITIES.isGrid(m))idx[m.x+','+m.y]=m;});
    return idx;
  }

  function adjacentGens(f, m) {
    var idx = machineIndex(f), out = [];
    for (var d = 0; d < 4; d++) {
      var o = idx[(m.x + DX4[d]) + ',' + (m.y + DY4[d])];
      if (o && isGen(o)) out.push(o);
    }
    return out;
  }

  function sharePower(net) {
    if (!net.gens.length || !net.machines.length) return;
    for (var i = 0; i < net.machines.length; i++) shareInto(net.machines[i], net.gens);
  }

  /* 把发电机的电灌进这台机器。每台发电机每个 tick 最多发一档电压的电流，
   * 多了发不出去 —— 这也是为什么一台 LV 发电机撑不起一厂 HV 机器。 */
  function shareInto(m, gens) {
    var room = Math.min(euCap(m) - euOf(m), intakeOf(m)-(m._received||0));   // 一个 tick 最多收这么多
    if (room <= 0) return;
    for (var i = 0; i < gens.length && room > 0; i++) {
      var g = gens[i];
      var d = defOf(g.k);
      var limit = (d ? d.volt : 32) * ampOf(g) - (g._out || 0);   // 电压 × 安培
      if (limit <= 0||voltOf(g)>voltOf(m)) continue;
      var have = euOf(g);
      if (have <= 0) continue;
      var give = Math.min(have, room, limit);
      if (give <= 0) continue;
      g._out = (g._out || 0) + give;
      g.eu = have - give;
      addEu(m, give);m._received=(m._received||0)+give;
      room -= give;
    }
  }

  /* 一个工作 tick 要多少电（整数）。GT 里 mEUt 就是每 tick 的耗电。 */
  function jobEut(m) {
    var v = (m && m.recEut) || 0;
    return v > 0 ? Math.max(1, Math.round(v)) : 0;
  }
  function eutTicks(v) {
    return v > 0 ? Math.max(1, Math.round(v)) : 0;
  }
  /* 这一批要跑多少个工作 tick（整数）。旧存档里存的是秒，这里换算过来。 */
  function jobDur(m) {
    if (m.recDur) return m.recDur;
    var s = (m.rec && m.rec.dur) || 0.05;
    return Math.max(1, Math.round(s * TPS));
  }
  /* 非消耗条件（编程电路、模具）：必须在槽里，但不算消耗。
   * 数据里现在是空的，接口先留好，以后加进来不用改流程。 */
  function reqList(rec) { return rec.req || []; }
  /* 开局把产出定死：概率产物在这一刻掷完就写进这一批，读档不重掷 */
  function rollOuts(list) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (p.chance != null && p.chance < 1) {
        if (Math.random() >= p.chance) continue;
      }
      out.push({ k: p.k, n: p.n });
    }
    return out;
  }
  function rollFluids(list) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (p.chance != null && p.chance < 1) {
        if (Math.random() >= p.chance) continue;
      }
      out.push({ f: p.f, mb: p.mb });
    }
    return out;
  }

  /* 这一类机器能做的配方（[[[输入[pidx,数量]...], [输出...], 时长tick, EUt]...]） */
  var REC_CACHE = {};
  var REC_INDEX = {};
  function recipesOf(cat) { return CONTENT.recipes(cat); }

  /* 这台机器现在槽里这几样料，可能开哪些配方 */
  function candRecs(m,cat) { return CONTENT.candidates(cat,m.ins,m.tanksIn||[m.ftank]); }

  /* 配方要的料，槽里凑齐了吗 */
  function recFit(m,rec,skipCirc) {
    var c=ENGINE.check(m,rec,{ignoreEnergy:true,ignoreCircuit:skipCirc});
    return c.ok||c.code==='ITEM_OUTPUT'||c.code==='FLUID_OUTPUT'||c.code==='EMPTY_OUTPUT';
  }

  /* 产物槽还塞得下吗：按 core.js 的规则算真实空位，
   * 空罐也要参与判断（以前 fout 为 null 时直接放行，12000mB 的批次
   * 能通过检查，结算时却被裁到 8000）。 */
  function recRoom(m,rec) {
    var d=DEFS.of(m.k);if(!d)return false;
    return !!GTTransactions.planOutput(m.outs,rec.out,d.slots.out,function(k){return CORE.maxStack(k);})&&
      !!GTTransactions.planFill(m.tanksOut||[m.fout],rec.fout,d.fluidOutputTanks);
  }

  /* 开一批：把配方要的料从输入槽/进料罐**转进这一批**（m.jobIns / m.jobFin）。
   * 转移之后它们既不在输入槽里，也不在罐里，玩家取不回去 —— 以前是先扣再算，
   * 运行中还能把液体倒走，批次照样完成。 */
  function startJob(m,rec) { return ENGINE.batch.start(m,rec,ENGINE.world); }
  /* 状态词照 GT 的 lang 来（GT5U.gui.text.*）：合成运行中 / 物品输出空间不足 /
   * 流体输出空间不足 / 缺料要点名。别再造词。 */
  function stateOf(m,structurePanel) {
    var state=MACHINE_STATUS.read(m);return[structurePanel&&state.key==='structure'?state.label:state.detail,state.tone];
  }

  /* 差哪一样？挑一条已经有部分料的配方，把它还缺的东西点名 */
  function missingOf(m) {
    var recs = candRecs(m, catOf(m.k) || '');
    var best = null, bestHave = -1;
    for (var i = 0; i < recs.length; i++) {
      var r = recs[i], have = 0;
      for (var j = 0; j < r.in.length; j++) {
        var c = 0;
        for (var s = 0; s < m.ins.length; s++) if (m.ins[s].k === r.in[j].k) c = m.ins[s].n;
        if (c >= r.in[j].n) have += 1; else if (c > 0) have += 0.1;
      }
      if (r.fin.length && m.ftank && m.ftank.f === r.fin[0].f) have += 0.5;
      if (have > bestHave) { bestHave = have; best = r; }
    }
    if (!best) return '';
    var lack = [];
    for (var j2 = 0; j2 < best.in.length; j2++) {
      var c2 = 0;
      for (var s2 = 0; s2 < m.ins.length; s2++) if (m.ins[s2].k === best.in[j2].k) c2 = m.ins[s2].n;
      if (c2 < best.in[j2].n) lack.push(nameOf_(best.in[j2].k) + ' ' + best.in[j2].n);
    }
    for (var f2 = 0; f2 < best.fin.length; f2++) {
      if (!m.ftank || m.ftank.f !== best.fin[f2].f || m.ftank.mb < best.fin[f2].mb) {
        lack.push(fluidName(best.fin[f2].f) + ' ' + best.fin[f2].mb + 'mB');
      }
    }
    return lack.length ? lack.slice(0, 2).join('、') : '';
  }

  /* ======================= 管道运输 =======================
   * 照 GT 的规矩：
   *   - 机器是主动推的（自动输出开关），箱子/罐才是被抽的
   *   - 物品管点对点送到路由值最低的目标（这里用最短路径当代价），不切分
   *   - 流体管按相邻剩余容量加权分流
   *   - 每根管都有存量上限，超出就是堵
   */
  var CHEST_SLOTS = 27;            // 原版木箱就是 27 格
  var CHEST_STACK = 64;
  var CHEST_CAP = CHEST_SLOTS * CHEST_STACK;
  /* GT 的传送带覆盖板一次搬一整叠：moveMultipleItemStacks(... 64 ... mMaxStacks)，
   * 所以这里的上限是 64 个一叠，不是每秒两个。 */
  var BELT_HOLD = 64;              // 传送带上一格最多压一叠
  var BELT_PER_SEC = 64;           // 每次动一次搬一叠
  var PIPE_ITEM_CAP = 32;          // 一根管子最多囤 32 个
  var PIPE_FLUID_CAP = 1000;       // 或 1 桶
  var ITEM_PER_OP = 64;               // 自动输出一次搬一叠（GT moveMultipleItemStacks 的上限）
var ITEM_PER_SEC = 8;            // 每秒最多挪这么多个
  var FLUID_PER_SEC = 500;         // 每秒最多挪这么多 mB
  var DIR4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];

  /* 箱子：{ slots: [{k,n} | null] }。老存档里是 {k,n} 单条，转一下。 */
  function normChest(v){return FACTORY_STATE.chest(v);}

  /* 往箱子里塞，返回真正塞进去多少 */
  function chestAdd(c, k, n) {
    if (!c || n <= 0) return 0;
    var left = n;
    var i;
    for (i = 0; i < CHEST_SLOTS && left > 0; i++) {       // 先堆同类
      var s = c.slots[i];
      if (s && s.k === k && s.n < CHEST_STACK) {
        var g = Math.min(left, CHEST_STACK - s.n);
        s.n += g; left -= g;
      }
    }
    for (i = 0; i < CHEST_SLOTS && left > 0; i++) {       // 再开新格
      if (!c.slots[i]) {
        var g2 = Math.min(left, CHEST_STACK);
        c.slots[i] = { k: k, n: g2 };
        left -= g2;
      }
    }
    return n - left;
  }

  function chestCount(c) {
    if (!c || !c.slots) return 0;
    var s = 0;
    for (var i = 0; i < c.slots.length; i++) if (c.slots[i]) s += c.slots[i].n;
    return s;
  }

  function asPipe(map, kk) {
    var v = map[kk];
    if (v == null) return null;
    if (typeof v === 'number') { v = {}; map[kk] = v; }
    return v;
  }

  /* 这台机器能不能收下这种料（有该物品的配方，且槽位没满） */
  function canAccept(m,itemKey) {
    var d=DEFS.of(m.k);return !!d&&ENGINE.networks.acceptsItem(m,itemKey,{manual:true})&&CORE.roomFor(CORE.stackBox(m.ins,d.slots.in),itemKey)>0;
  }

  /* 从某根物品管出发，找最近能收它的地方：机器输入槽、或者箱子。找不到返回 null */
  function findItemSink(f, sx, sy, itemKey) {
    var q = [[sx, sy, 0]], seen = {};
    seen[key(sx, sy)] = 1;
    while (q.length) {
      var cur = q.shift();
      if (cur[2] > 40) break;
      for (var d = 0; d < 4; d++) {
        var nx = cur[0] + DIR4[d][0], ny = cur[1] + DIR4[d][1];
        if (nx < 0 || ny < 0 || nx >= f.w || ny >= f.h) continue;
        var kk = key(nx, ny);
        if (seen[kk]) continue;
        var m = machineAt(f, nx, ny);
        if (m) {
          /* 管道在机器的那一面正好是主输出面：那儿不收料 */
          if (faceTakes(m, (d + 2) % 4) && canAccept(m, itemKey)) return { t: 'm', m: m };
          continue;                       // 这台不收，路从它身上过不去
        }
        var ch = normChest(f.chest[kk]);
        if (ch && chestCount(ch) < CHEST_CAP) return { t: 'c', kk: kk };
        /* 箱子满了只是"这儿收不下"，不能把这一格整个封死：
         * 同一格可能还压着一段管道，得让它继续往下找 */
        if (f.item[kk]) { seen[kk] = 1; q.push([nx, ny, cur[2] + 1]); }
      }
    }
    return null;
  }

  /* 物品管：有货就往最近能收的机器送，一次最多 ITEM_PER_SEC 个 */
  function pipeItems(f) {
    var moved = 0;
    for (var y = 0; y < f.h; y++) {
      for (var x = 0; x < f.w; x++) {
        var kk = key(x, y);
        var p = asPipe(f.item, kk);
        if (!p || !p.k || !(p.n > 0)) continue;
        var sink = findItemSink(f, x, y, p.k);
        if (!sink) continue;
        var send = Math.min(p.n, ITEM_PER_SEC);
        if (sink.t === 'm') {
          var m = sink.m, hit = null;
          for (var i = 0; i < m.ins.length; i++) if (m.ins[i].k === p.k) hit = m.ins[i];
          var room = hit ? (CAP - hit.n) : CAP;
          send = Math.min(send, room);
          if (send <= 0) continue;
          if (!hit) { hit = { k: p.k, n: 0 }; m.ins.push(hit); }
          hit.n += send;
        } else {
          var ch = normChest(f.chest[sink.kk]);
          var put = chestAdd(ch, p.k, send);
          if (put <= 0) continue;
          send = put;
        }
        p.n -= send;
        if (p.n <= 0) { p.k = null; p.n = 0; }
        moved++;
      }
    }
    return moved;
  }

  /* 流体管：先收机器推出来的，再按剩余容量往邻居匀 */
  function pipeFluids(f) {
    var moved = 0;
    // 匀一匀：每根管子把多余的往外分
    for (var y = 0; y < f.h; y++) {
      for (var x = 0; x < f.w; x++) {
        var kk = key(x, y);
        var p = asPipe(f.fluid, kk);
        if (!p || !p.f || !(p.mb > 0)) continue;
        for (var d = 0; d < 4; d++) {
          var nx = x + DIR4[d][0], ny = y + DIR4[d][1];
          if (nx < 0 || ny < 0 || nx >= f.w || ny >= f.h) continue;
          var nkk = key(nx, ny);
          var m = machineAt(f, nx, ny);
          if (m) {
            // 倒进机器的进料罐
            if (m.ftank && m.ftank.f === p.f && m.ftank.mb < fluidCap(m)) {
              var give = Math.min(p.mb, FLUID_PER_SEC, fluidCap(m) - m.ftank.mb);
              if (give > 0) { m.ftank.mb += give; p.mb -= give; moved++; }
            } else if (!m.ftank) {
              var give2 = Math.min(p.mb, FLUID_PER_SEC, fluidCap(m));
              if (give2 > 0) { m.ftank = { f: p.f, mb: give2 }; p.mb -= give2; moved++; }
            }
            continue;
          }
          var q = asPipe(f.fluid, nkk);
          if (!q) continue;
          if (q.f && q.f !== p.f) continue;
          var room = PIPE_FLUID_CAP - (q.mb || 0);
          if (room <= 0) continue;
          var give3 = Math.min(p.mb, FLUID_PER_SEC, Math.ceil(room / 2));
          if (give3 <= 0) continue;
          if (!q.f) q.f = p.f;
          q.mb = (q.mb || 0) + give3;
          p.mb -= give3;
          moved++;
        }
        if (p.mb <= 0) { p.f = null; p.mb = 0; }
      }
    }
    return moved;
  }

  /* 机器主动往外推：开了自动输出才推。先推给相邻管道，没有就直接塞相邻机器 */
  function autoPush(f) {
    var moved = 0;
    for (var mi = 0; mi < f.machines.length; mi++) {
      var m = f.machines[mi];
      if (!m.auto) continue;
      // 物品
      for (var i = 0; i < m.outs.length; i++) {
        var s = m.outs[i];
        if (!s || !(s.n > 0)) continue;
        var done = false;
        for (var d = 0; d < 4 && !done; d++) {
          if (!faceAllows(m, d)) continue;          // 指定了出料面，别处不出
          var nx = m.x + DIR4[d][0], ny = m.y + DIR4[d][1];
          if (nx < 0 || ny < 0 || nx >= f.w || ny >= f.h) continue;
          var kk = key(nx, ny);
          var p = asPipe(f.item, kk);
          if (!p) {
            // 没管子：直接塞给隔壁机器
            var nb = machineAt(f, nx, ny);
            if (nb && canAccept(nb, s.k)) {
              var send = Math.min(s.n, ITEM_PER_OP);
              var hit = null;
              for (var q = 0; q < nb.ins.length; q++) if (nb.ins[q].k === s.k) hit = nb.ins[q];
              if (!hit && nb.ins.length < slotCounts(nb.k)[0]) { hit = { k: s.k, n: 0 }; nb.ins.push(hit); }
              if (hit && hit.n < CAP) {
                var give = Math.min(send, CAP - hit.n);
                hit.n += give; s.n -= give; moved++; done = true;
              }
            }
            continue;
          }
          if (p.k && p.k !== s.k) continue;
          if ((p.n || 0) >= PIPE_ITEM_CAP) continue;
          var g2 = Math.min(s.n, ITEM_PER_OP, PIPE_ITEM_CAP - (p.n || 0));
          if (g2 <= 0) continue;
          p.k = s.k; p.n = (p.n || 0) + g2;
          s.n -= g2; moved++; done = true;
        }
        /* 没管子也没机器收，就看旁边有没有箱子 —— 之前贴着箱子都进不去 */
        if (!done) {
          for (var dc = 0; dc < 4 && !done; dc++) {
            if (!faceAllows(m, dc)) continue;
            var cx2 = m.x + DIR4[dc][0], cy2 = m.y + DIR4[dc][1];
            if (cx2 < 0 || cy2 < 0 || cx2 >= f.w || cy2 >= f.h) continue;
            var ck = key(cx2, cy2);
            if (!f.chest[ck]) continue;
            var cbox = normChest(f.chest[ck]);
            var put2 = chestAdd(cbox, s.k, Math.min(s.n, ITEM_PER_OP));
            if (put2 <= 0) continue;
            s.n -= put2; moved++; done = true;
          }
        }
        if (s.n <= 0) { m.outs.splice(i, 1); i--; }
      }
      // 流体
      if (m.fout && m.fout.mb > 0) {
        for (var d2 = 0; d2 < 4; d2++) {
          if (!faceAllows(m, d2)) continue;
          var ax = m.x + DIR4[d2][0], ay = m.y + DIR4[d2][1];
          if (ax < 0 || ay < 0 || ax >= f.w || ay >= f.h) continue;
          var akk = key(ax, ay);
          var fp = asPipe(f.fluid, akk);
          if (!fp) continue;
          if (fp.f && fp.f !== m.fout.f) continue;
          var room2 = PIPE_FLUID_CAP - (fp.mb || 0);
          if (room2 <= 0) continue;
          var give4 = Math.min(m.fout.mb, FLUID_PER_SEC, room2);
          fp.f = m.fout.f;
          fp.mb = (fp.mb || 0) + give4;
          m.fout.mb -= give4;
          if (m.fout.mb <= 0) m.fout = null;
          moved++;
          break;
        }
        /* 出料罐同理：旁边没管子就看看有没有能接的机器 */
        if (m.fout && m.fout.mb > 0) {
          for (var dm = 0; dm < 4; dm++) {
            var mx2 = m.x + DIR4[dm][0], my2 = m.y + DIR4[dm][1];
            if (mx2 < 0 || my2 < 0 || mx2 >= f.w || my2 >= f.h) continue;
            if (f.fluid[key(mx2, my2)]) continue;
            var nm = machineAt(f, mx2, my2);
            if (!nm || nm === m) continue;
            if (CORE.fluidRoom(nm.ftank, m.fout.f, fluidCap(nm)) <= 0) continue;
            var give5 = Math.min(m.fout.mb, FLUID_PER_SEC,
              CORE.fluidRoom(nm.ftank, m.fout.f, fluidCap(nm)));
            if (give5 <= 0) continue;
            nm.ftank = CORE.fluidAdd(nm.ftank, m.fout.f, give5, fluidCap(nm));
            m.fout.mb -= give5;
            if (m.fout.mb <= 0) m.fout = null;
            moved++;
            break;
          }
        }
      }
    }
    return moved;
  }

  /* 传送带就是 GT 的传送带覆盖板：把东西从一格搬到另一格。
   * 方向可以点着换：自动 / 上 / 右 / 下 / 左。
   *   自动 = 四面都试（老存档、懒得出方向的人都用这个，线不会断）
   *   指定方向 = 只从背后那格抽，只往前方那格送
   * 抽的是箱子，或者机器的产出；送的是管道、机器输入、箱子。 */
  function beltDir(b) {
    if (!b || b.dir == null) return -1;         // 没设方向 = 自动
    var d = b.dir | 0;
    return (d >= 0 && d <= 3) ? d : -1;
  }

  function beltPull(f, x, y, b, dir) {
    if ((b.n || 0) >= BELT_HOLD) return false;
    var bx = x + DIR4[dir][0], by = y + DIR4[dir][1];
    if (bx < 0 || by < 0 || bx >= f.w || by >= f.h) return false;
    var bk = key(bx, by);
    var src = machineAt(f, bx, by);
    if (src) {
      /* 机器：只拿它已经产出的东西，不碰它的原料 */
      for (var oi = 0; oi < src.outs.length; oi++) {
        var os = src.outs[oi];
        if (!os || !(os.n > 0)) continue;
        if (b.k && b.k !== os.k) continue;
        var take0 = Math.min(BELT_PER_SEC, os.n, BELT_HOLD - (b.n || 0));
        if (take0 <= 0) continue;
        b.k = os.k; b.n = (b.n || 0) + take0;
        os.n -= take0;
        if (os.n <= 0) src.outs.splice(oi, 1);
        return true;
      }
      return false;
    }
    var ch = normChest(f.chest[bk]);
    if (!ch) return false;
    for (var ci = 0; ci < CHEST_SLOTS; ci++) {
      var cs = ch.slots[ci];
      if (!cs || cs.n <= 0) continue;
      if (b.k && b.k !== cs.k) continue;
      var take = Math.min(BELT_PER_SEC, cs.n, BELT_HOLD - (b.n || 0));
      if (take <= 0) return false;
      b.k = cs.k; b.n = (b.n || 0) + take;
      cs.n -= take;
      if (cs.n <= 0) ch.slots[ci] = null;
      return true;
    }
    return false;
  }

  function beltPush(f, x, y, b, dir) {
    if (!b.k || !(b.n > 0)) return false;
    var fx = x + DIR4[dir][0], fy = y + DIR4[dir][1];
    if (fx < 0 || fy < 0 || fx >= f.w || fy >= f.h) return false;
    var fk = key(fx, fy);
    var pipe = asPipe(f.item, fk);
    if (pipe) {
      if (pipe.k && pipe.k !== b.k) return false;
      if ((pipe.n || 0) >= PIPE_ITEM_CAP) return false;
      var g = Math.min(b.n, BELT_PER_SEC, PIPE_ITEM_CAP - (pipe.n || 0));
      if (g <= 0) return false;
      pipe.k = b.k; pipe.n = (pipe.n || 0) + g; b.n -= g;
      if (b.n <= 0) { b.k = null; b.n = 0; }
      return true;
    }
    var tgt = machineAt(f, fx, fy);
    if (tgt && canAccept(tgt, b.k) && faceTakes(tgt, (dir + 2) % 4)) {
      var hit = null;
      for (var q = 0; q < tgt.ins.length; q++) if (tgt.ins[q].k === b.k) hit = tgt.ins[q];
      if (!hit) {
        if (tgt.ins.length >= slotCounts(tgt.k)[0]) return false;
        hit = { k: b.k, n: 0 }; tgt.ins.push(hit);
      }
      var g2 = Math.min(b.n, BELT_PER_SEC, CAP - hit.n);
      if (g2 <= 0) return false;
      hit.n += g2; b.n -= g2;
      if (b.n <= 0) { b.k = null; b.n = 0; }
      return true;
    }
    if (f.chest[fk]) {
      var cb = normChest(f.chest[fk]);
      var g3 = chestAdd(cb, b.k, Math.min(b.n, BELT_PER_SEC));
      if (g3 <= 0) return false;
      b.n -= g3;
      if (b.n <= 0) { b.k = null; b.n = 0; }
      return true;
    }
    return false;
  }

  function beltTick(f) {
    var moved = 0;
    for (var y = 0; y < f.h; y++) {
      for (var x = 0; x < f.w; x++) {
        var kk = key(x, y);
        if (!f.belt[kk]) continue;
        var b = f.belt[kk];
        if (typeof b === 'number') { b = { k: null, n: 0, dir: -1 }; f.belt[kk] = b; }
        var d = beltDir(b);
        if (d >= 0) {
          if (beltPull(f, x, y, b, (d + 2) % 4)) moved++;
          if (beltPush(f, x, y, b, d)) moved++;
        } else {
          for (var d1 = 0; d1 < 4; d1++) if (beltPull(f, x, y, b, d1)) { moved++; break; }
          for (var d2 = 0; d2 < 4; d2++) if (beltPush(f, x, y, b, d2)) { moved++; break; }
        }
      }
    }
    return moved;
  }

  /* 推进一台机器**一个**工作 tick。
   * 顺序照 GT：先扣这个 tick 的电，扣成功才加 1 点进度。
   * 多方块中断时保留批次并停机，等待玩家重新开机；小机器按资源条件等待。 */
  function tickOne(m) { return ENGINE.stepMachine(m); }

  /* 物流按 tick 数排周期，不按"调了几次"。
   * GT 流体管是每 5 tick 一个入口，这里统一用 5 tick。 */
  var PIPE_EVERY = 5;
  function pipeTick(f) {
    return ENGINE.networks.items(f,worldTick)+ENGINE.networks.fluids(f,worldTick)>0;
  }

  /* 一个 tick 的全套结算：先供能，再各自推进，最后物流 */
  function stepWorldTick(f,S,save){return SIMULATION.step(S,worldTick);}

  function nowMs() {
    if (typeof performance !== 'undefined' && performance.now) return performance.now();
    return Date.now();
  }


  function tick(S, save, at) {
    var now = (typeof at === 'number') ? at : nowMs();
    var f=ensure(S),result=SIMULATION.session(S).advance(now),steps=result.steps,changed=result.changed;
    worldTick=result.tick;
    if(presentationObserver)presentationObserver(S,result);

    if (changed&&!document.hidden) {
      if(!S.ui||S.ui.page==='line')document.querySelector('.fx-cv')?._fxRequestPaint?.();
    }
    if (!document.hidden&&(changed || (worldTick % 5 === 0 && steps > 0))) {
      if(!S.ui||S.ui.page==='line')updateCards(f);
      refreshDetail(f, S, save);
      refreshChest(f, S, save);
      if(window.PIPE_UI)PIPE_UI.refresh();if(window.EIO_UI)EIO_UI.refresh();
    }
    if (changed) {
      if (save) save();
      if (typeof markInv === 'function') markInv();
    }
    return steps;
  }

  /* 只保存已完成的模拟步；页面关闭或休眠的时间不推进游戏。 */
  var presentationObserver=null;
  function clockState(){return SIMULATION.current().clock.snapshot();}
  function checkpointClock(){return clockState();}
  function resumeTiming(S,at){SIMULATION.session(S).resume(typeof at==='number'?at:nowMs());}
  function configureTiming(S){SIMULATION.session(S).configure(nowMs());}
  function timingStatus(){return SIMULATION.current().clock.status();}
  function hasPendingTicks(){return SIMULATION.current().clock.hasPending();}
  function interpolationSeconds(){return SIMULATION.current().clock.interpolation(nowMs());}
  function restoreClock(c){SIMULATION.current().clock.restore(c);worldTick=SIMULATION.current().clock.tick;}

  /* 这类机器能处理的所有输入物品（去重、按名字排） */
  var IN_CACHE = {};
  function inputsOf(cat) {
    if (IN_CACHE[cat]) return IN_CACHE[cat];
    var recs = recipesOf(cat), seen = {}, list = [];
    recs.forEach(function (r) {
      (r.in || []).forEach(function (p) {
        if (!seen[p.k]) { seen[p.k] = 1; list.push(p.k); }
      });
    });
    list.sort(function (a, b) { return nameOf_(a) < nameOf_(b) ? -1 : 1; });
    IN_CACHE[cat] = list;
    return list;
  }

  /* 这个物品在这台机器上能变成什么（第一条配方） */
  function recipesFor(cat, k) {
    return recipesOf(cat).filter(function (r) {
      return r.in.length === 1 && r.in[0].k === k;
    });
  }

  function inputOptions(m){return inputSelection&&String(inputSelection.uid)===String(m.uid)?inputSelection:null;}
  function mechanismOnly(m){return (DEFS.of(m.k).recipeMap||'').indexOf('none:')===0;}


  /* 点网格里的物品，下面显示它能做成什么。纯展示。 */
  function recipeCard(m, k) {
    var cat = catOf(m.k);
    var rs = recipesFor(cat, k);
    if (!rs.length) {
      var all = recipesOf(cat).filter(function (r) {
        return r.in.some(function (p) { return p.k === k; });
      });
      if (all.length) {
        return '<div class="rx"><div class="rx-row">' + iconHtml(k, 22) +
          '<span class="rx-plus">+</span><span class="rx-t">要跟别的料一起用</span></div>' +
          '<div class="rx-out">' + all.slice(0, 1).map(function (r) {
            return r.out.map(function (p) { return iconHtml(p.k, 22); }).join('');
          }).join('') + '</div></div>';
      }
      return '';
    }
    var r0 = rs[0];
    return '<div class="rx">' +
      '<div class="rx-in">' + r0.in.map(function (p) {
        return iconHtml(p.k, 22) + (p.n > 1 ? '<b>×' + p.n + '</b>' : '');
      }).join('') + '</div>' +
      '<span class="rx-arrow">→</span>' +
      '<div class="rx-out">' + r0.out.map(function (p) {
        return iconHtml(p.k, 22) + (p.n > 1 ? '<b>×' + p.n + '</b>' : '');
      }).join('') + '</div>' +
      '<span class="rx-t">' + r0.dur.toFixed(1) + 's</span>' +
      rxPower(m, r0) + circuitNeed(r0) + '</div>';
  }

  /* 这条配方要多少电、这台机器够不够。
   * 不够的时候要把"需 HV"写出来，而不是只给个红灯让玩家猜。 */
  /* 这条配方要几号电路 */
  function circuitNeed(r) {
    var rq = reqList(r), out = [];
    for (var i = 0; i < rq.length; i++) {
      if (rq[i].circuit != null) out.push(rq[i].circuit);
    }
    var tail = out.length ? '<span class="rx-circ">电路 ' + out.join('/') + ' 号</span>' : '';
    if (r.heat) tail += '<span class="rx-heat">炉温 ' + r.heat + 'K</span>';
    return tail;
  }

  function rxPower(m, r) {
    var need = recTier(r), have = machTier(m);
    var tag = 'EU/t';
    var txt = (r.eut || 0) + ' ' + tag;
    if (need > have) {
      var tn = (typeof DEFS !== 'undefined') ? DEFS.tagOf(need) : ('T' + need);
      return '<span class="rx-eu bad" title="这台机器电压不够">' + txt +
        '　需 ' + tn + '</span>';
    }
    if (typeof DEFS !== 'undefined' && have > need) {
      var oc = DEFS.overclock(have, need);
      return '<span class="rx-eu oc" title="这台机器比配方高 ' + oc.n +
        ' 档，会超频：时间 ×' + oc.durMul + '、功率 ×' + oc.eutMul + '">' + txt +
        '　超频 ×' + oc.eutMul + '</span>';
    }
    return '<span class="rx-eu">' + txt + '</span>';
  }

  /* 这台机器是几档、多少伏。没有定义就不写，别编。 */
  function tierLine(m) {
    if (typeof DEFS === 'undefined' || !DEFS.of) return '';
    var d = STRUCTURES.instance(m);
    if (!d) return '';
    if(window.MULTIBLOCKS&&MULTIBLOCKS.managed(m)){
      var base=DEFS.of(m.k),fixed=base.fixedRecipeVoltage;
      var label=fixed?DEFS.tagOf(DEFS.recipeTier(fixed)):d.energyCapacity>0&&d.volt?d.volt.toLocaleString()+' V':'';
      var tip=fixed?'加工电压 '+label:base.maxTierSkips===0?'不可双仓升压':'可双仓升压';
      return label?'<span class="mx-tier" data-tip="'+esc(tip)+'">'+esc(label)+'</span>':'';
    }
    if (!d.multiblock&&!d.requiresStructure) {
      return d.tag&&!nameOf_(m.k).includes(d.tag)?'<span class="mx-tier">'+esc(d.tag)+'</span>':'';
    }
    return '<span class="mx-tier">' + esc(d.tag) + (d.energyCapacity>0?'，'+d.volt+' V':'') + '</span>';
  }

  /* 机器面板上的电量条：这台机器现在存了多少、装满是多少 */
  function euHtml(m, barOnly) {
    var account=STRUCTURES.profile(m)?.processingEnergy;
    var localStore=account&&account.capacity;
    var cap=localStore?account.capacity(m):euCap(m);
    var cur=Math.floor(localStore?account.available(m):euOf(m));
    if(!cap)return '';
    var pct = cap > 0 ? Math.max(0, Math.min(100, cur / cap * 100)) : 0;
    var label=esc(account?.label||'电量'),amount=cur.toLocaleString()+' / '+cap.toLocaleString()+' EU';
    var tip=label+' '+amount;
    if(window.MULTIBLOCKS&&MULTIBLOCKS.managed(m)&&!DEFS.of(m.k).generator)tip+='\n供电（近 1 秒） '+RESOURCE_UI.powerInputText(m);
    return '<div class="mx-eu">'+(barOnly?'':'<span class="mx-fl-l">'+label+'</span>')+
      '<span class="eubar" role="progressbar" aria-label="'+label+'" aria-valuenow="'+Math.round(pct)+'" data-tip="'+esc(tip)+'"><i style="width:' + pct.toFixed(1) + '%"></i></span>' +
      (barOnly?'':'<span class="eut">'+amount+'</span>')+'</div>';
  }

  function compactEnergyMeter(m){return window.MULTIBLOCKS&&MULTIBLOCKS.managed(m)&&!STRUCTURES.profile(m)?.processingEnergy;}

  /* 出料面：一排按钮，点一次就定。产物只从这一面出去，这一面也不收料。 */
  function outFaceHtml(m) {
    var cur = outFaceOf(m);
    var h = '<div class="mx-face"><span class="mx-fl-l">出料面</span><div class="fgrid">';
    h += '<button class="fbtn' + (cur < 0 ? ' on' : '') + '" data-faceuid="' + esc(m.uid) +
      '" data-faceto="-1">自动</button>';
    for (var d = 0; d < 4; d++) {
      h += '<button class="fbtn' + (cur === d ? ' on' : '') + '" data-faceuid="' + esc(m.uid) +
        '" data-faceto="' + d + '">' + FACE_NAMES[d] + '</button>';
    }
    h += '</div><span class="mx-hint">' + (cur < 0 ? '四面都出' : ('只从' + FACE_NAMES[cur] + '面出')) +
      '</span></div>';
    return h;
  }

  function setFace(uid, n, S, save) {
    var f = ensure(S);
    var hit = machineByUid(f, uid);
    if (!hit) return false;
    var m = hit.m, definition = DEFS.of(m.k);
    if (definition && definition.transformer) {
      if (POWER_TRANSFORMER.faces(m, definition).special === n) return false;
      if (!POWER_TRANSFORMER.setFace(m, definition, n).ok) return false;
    } else {
      var v = n | 0;
      var side = v >= 0 && v <= 3 ? v : -1;
      if (outFaceOf(m) === side) return false;
      m.outFace = side;
    }
    if (save) save();
    render(S, save);
    if (String(openUid) === String(uid)) openDetail(uid, f, S, save);
    return true;
  }

  /* 洁净室开关：只有"有洁净配方的机器"或者已经开了的才显示 */
  function catHasClean(m) {
    var c = catOf(m.k);
    if (!c) return false;
    var rs = recipesOf(c);
    for (var i = 0; i < rs.length; i++) if (rs[i].cleanroom) return true;
    return false;
  }
  function cleanHtml(m) {
    if (!catHasClean(m) && !m.clean) return '';
    return '<div class="mx-clean"><span class="mx-fl-l">洁净室</span>' +
      '<button class="btn' + (m.clean ? ' on' : '') + '" data-clean="' + esc(m.uid) + '">' +
      (m.clean ? '已开启' : '没开') + '</button>' +
      '<span class="mx-hint">要洁净的配方必须开着才能做</span></div>';
  }
  function toggleClean(uid,S,save){var f=ensure(S);openDetail(uid,f,S,save);toast('在结构面板关联已建成的洁净室');}

  /* 线圈那一格：跟电路一样摊成可选档位，点一次就换好 */
  var coilOpen = null;
  /* 只有有炉温配方的机器或者已经装了线圈的机器才显示这一格，
   * 不然每台粉碎机上都挂个线圈选择器很奇怪 */
  function catHasHeat(m) {
    var c = catOf(m.k);
    if (!c) return false;
    var rs = recipesOf(c);
    for (var i = 0; i < rs.length; i++) if (rs[i].heat) return true;
    return false;
  }

  function coilHtml(m) {
    if (!catHasHeat(m) && !(m.coil | 0)) return '';
    var n = (m.coil | 0) || 0;
    var name = n ? coilName(m) : '—';
    var h = '<div class="mx-coil"><span class="mx-fl-l">线圈炉温</span>' +
      '<button class="cslot' + (n ? ' on' : '') + '" data-coil="' + esc(m.uid) + '"' +
      ' title="点开选线圈">' + '<b>' + esc(name) + '</b></button>';
    if (String(coilOpen) === String(m.uid)) {
      h += '<div class="cgrid">';
      coils().forEach(function (c) {
        h += '<button class="' + (n === c.id ? 'cnum on' : 'cnum') +
          '" data-coilset="' + c.id + '" data-coiluid="' + esc(m.uid) + '">' +
          esc(c.cn) + (c.heat ? ' ' + c.heat + 'K' : '') + '</button>';
      });
      h += '</div>';
    } else {
      h += '<span class="mx-hint">' + (n ? (heatOf(m) + 'K') : '没装线圈，炼不了要炉温的东西') + '</span>';
    }
    return h + '</div>';
  }

  function toggleCoil(uid, S, save) {
    coilOpen = (String(coilOpen) === String(uid)) ? null : uid;
    refreshOpen(S, save);
  }

  function setCoil(uid, n, S, save) {
    var f = ensure(S);
    var hit = machineByUid(f, uid);
    if (!hit) return;
    hit.m.coil = Math.max(0, Math.min(coils().length - 1, n | 0));
    coilOpen = null;
    if (save) save();
    render(S, save);
    if (String(openUid) === String(uid)) openDetail(uid, f, S, save);
  }

  /* 虚拟电路：空槽与0号不同，24之后回到空槽。 */
  var circOpen = null;              // 哪台机器的数字盘是展开的（只是界面状态，不存档）

  /* 电路槽与Shift打开的0~24号选择盘。 */
  function circuitHtml(m) {
    var multi=window.MULTIBLOCKS&&MULTIBLOCKS.managed(m),config=multi?MULTIBLOCKS.controllerCircuit(m):m,n=config.circ|0,virtual=PROCESSING_ACCESS.configuration(config),installed=!!config.circuitConfigured;
    if(multi&&!MULTIBLOCKS.supportsControllerCircuit(m)&&!virtual||!multi&&DEFS.of(m.k).controlCircuit===false&&!installed&&!virtual)return '';
    var h='<div class="mx-circ"><button class="cslot'+(installed||virtual?' on':'')+'" data-cir="'+esc(m.uid)+'" title="'+(virtual?'虚拟配置':multi?'控制器编程电路':'编程电路')+(virtual?'，'+esc(nameOf_(virtual.k)):installed?'，'+n+'号':'，空')+'">'+(virtual?iconHtml(virtual.k,30):installed?iconHtml('gregtech:gt.integrated_circuit@'+n,30):'<span class="mplus">＋</span>')+'</button>';
    if (String(circOpen) === String(m.uid)) {
      h += '<div class="cgrid">';
      h += '<button class="cnone' + (installed ? '' : ' on') + '" data-cirset="-1" data-ciruid="' +
        esc(m.uid) + '">空</button>';
      for (var i = 0; i <= 24; i++) {
        h += '<button class="cnum' + (installed && n === i ? ' on' : '') + '" data-cirset="' + i +
          '" data-ciruid="' + esc(m.uid) + '">' + i + '</button>';
      }
      h += '</div>';
    }
    return h + '</div>';
  }

  function refreshOpen(S, save) {
    if (openUid == null) return;
    var f = ensure(S);
    if (String(openUid)) openDetail(openUid, f, S, save);
  }

  /* 点槽位：开/关数字盘 */
  function toggleCircuit(uid, S, save) {
    circOpen = (String(circOpen) === String(uid)) ? null : uid;
    refreshOpen(S, save);
  }

  /* 直接选号：0~24是有效配置，-1卸下电路 */
  function setCircuit(uid, n, S, save) {
    var f = ensure(S);
    var hit = machineByUid(f, uid);
    if (!hit) return;
    var circuitResult=COMMANDS.setCircuit(S,hit.m,n);
    if(!circuitResult.ok)return;
    circOpen = null;
    if (save) save();
    refreshOpen(S,save);
    if (String(openUid) === String(uid)) openDetail(uid, f, S, save);
  }

  /* 点别处就收起来（面板不铺遮罩，点哪儿都可能落在外面） */
  function closeCircuitPicker(target, S, save) {
    if (!circOpen) return;
    if (target && target.closest && target.closest('.cgrid,[data-cir]')) return;
    circOpen = null;
    // Collapse only this child layer; rebuilding the parent would detach the
    // control receiving the same click and interrupt quantity or input actions.
    var grid=document.querySelector('#popup .cgrid');
    if(grid)grid.remove();
  }

  function progressHtml(p, pct) {
    if (!p) return '';
    var graphic;
    if (p.icon === 'steam') {
      var paths = '<path d="M6 50C2 46 2 42 6 38S10 30 6 26S2 18 6 14S10 6 6 2"/><path d="M16 50C12 46 12 42 16 38S20 30 16 26S12 18 16 14S20 6 16 2"/><path d="M26 50C22 46 22 42 26 38S30 30 26 26S22 18 26 14S30 6 26 2"/>';
      graphic = '<span class="machine-steam-progress"><svg class="steam-track" viewBox="0 0 32 52" aria-hidden="true">' + paths + '</svg><svg class="steam-fill" viewBox="0 0 32 52" aria-hidden="true">' + paths + '</svg></span>';
    } else graphic = '<span class="machine-work-arrow" aria-hidden="true"></span>';
    return '<div class="native-progress' + (p.icon === 'steam' ? ' progress-steam' : '') + '" role="progressbar" aria-label="加工进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(pct * 100) + '" style="--nx:' + p.x + ';--ny:' + p.y + ';--nh:' + (p.h || 18) + ';--progress:' + pct + '">' + graphic + '</div>';
  }

  function machineHtml(m, i) {
    if(window.MULTIBLOCKS&&MULTIBLOCKS.managed(m)){
      var status=stateOf(m,true),controller=circuitHtml(m),batchTelemetry=DEFS.of(m.k).showBatchTelemetry!==false,barOnly=compactEnergyMeter(m);
      var progress=m.job?100*m.job.progressTicks/m.job.durationTicks:0;
      return '<div class="mx mx-multi"><section class="machine-process"><div class="mb-process-line" data-energy-amount="'+!barOnly+'"><div class="mb-work-state"><div class="mx-st mx-'+status[1]+'" data-tip="'+esc(status[0])+'">'+esc(status[0])+'</div>'+
        (batchTelemetry?'<div class="mx-bar" aria-label="加工进度"><i style="width:'+progress+'%"></i></div>':'')+'</div>'+
        (euHtml(m,barOnly)||'<div class="mx-eu"></div>')+(controller?'<div class="mx-controller-circuit">'+controller+'</div>':'')+'</div>'+
        (batchTelemetry?'<div class="mx-batch-info" data-ui-preserve="1"></div>':'')+
        '<div class="mx-fluid-readings" data-ui-preserve="1"></div><div class="resource-host" data-ui-preserve="1"></div></section><section class="structure-host" data-ui-preserve="1"></section><div class="behavior-host" data-ui-preserve="1"></div></div>';
    }
    var d=STRUCTURES.instance(m),layout=MACHINE_LAYOUT.compact(MACHINE_LAYOUT.plan(d)),st=stateOf(m),pct=m.job?Math.min(1,m.job.progressTicks/m.job.durationTicks):0;
    if(d.pipeOnly)return '<div class="mx"><section class="machine-process"><div class="water-summary"><span>储水</span><strong data-water-volume>'+((m.tanksIn[0]&&m.tanksIn[0].mb)||0).toLocaleString()+' <small>/ '+d.slots.fluid.toLocaleString()+' mB</small></strong></div><div class="mx-st">'+esc(st[0])+'</div><div class="mx-batch-info" data-ui-preserve="1"></div><div class="mx-fluid-readings" data-ui-preserve="1"></div><div class="resource-host" data-ui-preserve="1"></div></section><section class="structure-host" data-ui-preserve="1"></section></div>';
    if(d.behavior==='item_storage')return '<div class="mx"><section class="machine-process"><div class="super-chest-grid"><div class="super-chest-display">'+superChestDisplay(m,d)+'</div><div class="super-chest-slots"><label>输入 '+slotHtml(i,m.ins[0]||null,'in',0)+'</label><label>输出 '+slotHtml(i,m.outs[0]||null,'out',0)+'</label></div></div><div class="mx-st">'+esc(st[0])+'</div><div class="mx-batch-info" data-ui-preserve="1"></div><div class="mx-fluid-readings" data-ui-preserve="1"></div><div class="resource-host" data-ui-preserve="1"></div></section><section class="machine-settings"><div class="mx-sec">输入输出设置</div><div class="machine-io-host" data-ui-preserve="1"></div></section></div>';
    var cells=layout.cells.map(function(c){
      var itemCell=c.kind==='in'||c.kind==='out';
      var value=(c.kind==='in'?m.ins:c.kind==='out'?m.outs:c.kind==='fin'?m.tanksIn:m.tanksOut)[c.index];
      if(c.onlyOccupied&&!value)return '';
      var html=itemCell?slotHtml(i,value,c.kind,c.index,c.label):fslotHtml(i,value,c.kind,c.index,
        c.kind==='fin'&&(d.inputTankFluids||[])[c.index],c.w&&(c.kind==='fin'?d.fluidInputTanks:d.fluidOutputTanks)[c.index]);
      return '<div class="native-cell'+(c.w?' native-gauge':'')+'" data-native-kind="'+c.kind+'" data-native-index="'+c.index+'" style="--nx:'+c.x+';--ny:'+c.y+';--nw:'+(c.w||18)+';--nh:'+(c.h||18)+'">'+html+(c.label?'<span class="native-cell-label">'+esc(c.label)+'</span>':'')+'</div>';
    }).join('');
    if(layout.heat)cells+='<div class="native-cell native-heat" style="--nx:96;--ny:25;--nw:10;--nh:54" title="温度 '+Math.floor(m.temperature||0)+'°C"><i style="height:'+Math.max(0,Math.min(100,(m.temperature||0)/d.thermal.maxTemperature*100))+'%"></i></div>';
    var circuit=layout.circuit&&circuitHtml(m);if(circuit)cells+='<div class="native-cell native-circuit" style="--nx:'+layout.circuit.x+';--ny:'+layout.circuit.y+'">'+circuit+'</div>';
    var frame=MACHINE_LAYOUT.frame(layout);
    var h='<div class="mx"><section class="machine-process"><div class="machine-native" style="--native-width:'+frame.width+';--native-height:'+frame.height+';--native-top:'+frame.top+';--native-left:'+frame.left+'">'+cells+progressHtml(layout.progress,pct)+'</div>';
    if(d.steamPowered)h+='<div class="mx-steam"><span class="mx-fl-l">蒸汽</span>'+fslotHtml(i,(m.tanksEnergy||[])[0],'energy')+'<span class="dim"> / '+d.steamCapacity+' mB</span></div>';
    var energy=euHtml(m,!d.requiresStructure),storage=MACHINE_STORAGE.profile(DEFS.of(m.k));
    var equipment=MACHINE_STORAGE.html(m,storage&&storage.electric?energy:'');
    var statusLine='<div class="mx-st mx-'+st[1]+'" data-tip="'+esc(st[0])+'">'+esc(st[0])+'</div>';
    h+=equipment.personal;
    h+=storage&&storage.electric?'':energy;
    h+=layout.progress?'<div class="mx-single-readout">'+statusLine+'<div class="mx-work-readout" data-ui-preserve="1"></div></div>':statusLine;
    h+='<div class="mx-process-info"></div>';
    return h+'<div class="mx-batch-info" data-ui-preserve="1"></div><div class="mx-fluid-readings" data-ui-preserve="1"></div><div class="resource-host" data-ui-preserve="1"></div></section>'+equipment.shapes+(d.noFaceSettings&&d.supportsCovers!==true?'<section class="structure-host" data-ui-preserve="1"></section>':d.storage?'':'<section class="machine-settings"><div class="machine-io-host" data-ui-preserve="1"></div><div class="structure-host" data-ui-preserve="1"></div></section>')+'</div>';
  }

  function fslotHtml(i, tank, kind, index, accepted,gauge) {
    var who = kind === 'fin' ? '进料罐' : kind==='energy'?'蒸汽罐':'出料罐';
    var tip = tank ? (who + '：' + fluidName(tank.f) + ' ' + tank.mb + ' mB' +
        '（使用兼容容器装出）')
      : (kind==='fout'?who+'：空':who + '：使用流体容器');
    var expected=accepted?(Array.isArray(accepted)?accepted:[accepted]).map(fluidName).join(' / '):'';if(!tank&&expected)tip=who+'：仅接收 '+expected+'，使用流体容器';
    var selected=false;
    return '<span class="mx-slot-wrap"><div class="mslot fslot' + (selected?' selected':'')+(tank ? '' : ' mslot-empty') + '" data-ms="' + i +
      '" data-mk="' + kind + '" data-mj="'+(index||0)+'" title="' + esc(tip) + '">' +
      (tank ? (gauge?'<span class="native-tank-fill" style="height:'+Math.max(0,Math.min(100,tank.mb/gauge*100))+'%">'+FLUID_PRESENTATION.html(tank.f,128)+'</span>':FLUID_PRESENTATION.html(tank.f,30)) +
              '<span class="mn">' + tank.mb + '</span>'
            : '<span class="mplus">~</span>') + '</div>'+(tank||expected?'<span class="fluid-slot-name">'+esc(tank?fluidName(tank.f):expected)+'</span>':'')+'</span>';
  }


  function slotHtml(i, c, kind, idx, label) {
    var who = label || (kind === 'in' ? '原料' : '产物');
    var tip = c ? ((label?'':who+'：') + nameOf_(c.k) + (c.n > 1 ? ' ×' + c.n : ''))
      : (label ? label+'槽' : kind === 'in' ? '原料槽' : '产物槽：空着');
    var selected=false;
    return '<span class="mx-slot-wrap"><div class="mslot' + (selected?' selected':'')+(c ? '' : ' mslot-empty') + '" data-ms="' + i +
      '" data-mk="' + kind + '" data-mj="' + idx + '" title="' + esc(tip) + '">' +
      (c ? iconHtml(c.k, 30) : '<span class="mplus">+</span>') +
      (c && c.n > 1 ? '<span class="mn">' + c.n + '</span>' : '') + '</div>'+'</span>';
  }

  /* ---------------- 点开机器 ---------------- */

  /* 现在开着详情的是哪一台 —— 存的是**稳定编号**，不是数组下标。
   * 这样拆掉别的机器、数组顺序变了，窗口仍然指着同一台。 */
  var openUid = null;
  var inputSelection = null;

  function openMachine(f) {
    if (openUid == null) return null;
    var hit = machineByUid(f, openUid);
    if (!hit) { openUid = null; return null; }
    return hit;
  }

  /* 自动输出开关：点一下翻转 */
  function toggleAuto(uid, S, save) {
    var f = ensure(S);
    var hit = machineByUid(f, uid);
    if (!hit) return;
    hit.m.auto = !hit.m.auto;
    hit.m.autoItems=hit.m.auto;hit.m.autoFluids=hit.m.auto;
    save();
    render(S, save);
    if (String(openUid) === String(uid)) openDetail(uid, f, S, save);
    toast(hit.m.auto ? '自动输出开了，产物会自己往外走' : '自动输出关了');
  }

  function openDetail(uid, f, S, save) {
    var hit = machineByUid(f, uid);
    var box = document.getElementById('popup');
    if (!hit || !box) return;
    var m = hit.m;
    if(!DEFS.of(m.k)){toast('缺少设备定义');return;}
    if(window.TRASH_SINKS&&TRASH_SINKS.kind(m))return TRASH_SINKS_UI.open(m.uid,S,save);
    if(window.LINE_STORAGE&&LINE_STORAGE.spec(m))return LINE_STORAGE_UI.open(m.uid,S,save);
    if(window.SHARED_CARGO&&SHARED_CARGO.isCargo(m))return SHARED_CARGO_UI.open(m,S,save);
    if(window.ITEM_FILTERS&&ITEM_FILTERS.supported(m))return ITEM_FILTER_UI.open(m.uid,S,save);
  if(window.TYPE_FILTERS&&TYPE_FILTERS.supported(m))return TYPE_FILTER_UI.open(m.uid,S,save);
    if(window.AE_UI&&AE_DEVICES.spec(m))return AE_UI.open(m.uid,S,save);
    if(window.GRID_FURNACE&&m.k===GRID_FURNACE.key)return GRID_FURNACE.open(m.uid,S,save);
    if(window.SMELTERY_UI&&(m.k===SMELTERY.key||Object.values(SMELTERY.kinds).includes(m.k))){var controller=m.k===SMELTERY.key?m:SMELTERY.parent(S,m);return controller?SMELTERY_UI.open(controller.uid,S,save):WORLD_PANELS.open('smeltery');}
    if(window.TINKER_WORKSTATIONS&&TINKER_WORKSTATIONS.family(m.k))return TINKER_WORKSTATIONS_UI.open(uid,S,save);
    ENGINE.ensure(m);
    if(String(openUid)===String(uid)&&box.querySelector('.mxwin')&&!box.hidden){positionMachineWindow(m,box,STRUCTURES.instance(m));refreshDetail(f,S,save,true);return;}
    if (String(circOpen) !== String(m.uid)) circOpen = null;
    if(String(openUid)!==String(m.uid)){MACHINE_IO.clear();}if(String(openUid)!==String(m.uid)||!inputSelection)inputSelection={uid:m.uid,kind:slotCounts(m.k)[0]>0?'in':DEFS.of(m.k).steamPowered?'energy':'fin',index:0};
    openUid = m.uid;
    chestOpen = null;
    box.hidden = false;
    box.classList.add('noback');          // 不铺遮罩，底下物品栏照样能点
    var definition=STRUCTURES.instance(m);
    box.innerHTML='<div class="box mxwin machine-window"><h3 class="machine-heading">'+faceHtml(m.k,32)+'<span>'+esc(definition.pipeOnly?definition.cn:nameOf_(m.k))+tierLine(m)+'</span></h3><div class="machine-body"><div class="mx-operate">'+machineHtml(m,m.uid)+'</div>'+(definition.requiresRecipeSelection?'<details class="machine-template"><summary>配方模板</summary><div class="rb-host"></div></details>':'')+'</div><div class="foot"><button class="btn" data-popclose="1">关闭</button></div></div>';
    popupCb=null;
    box.classList.remove('mb-generator');
    positionMachineWindow(m,box,definition);
    if(window.MULTIBLOCK_WINDOW&&MULTIBLOCK_WINDOW.managed(m)){
      MULTIBLOCK_WINDOW.mount(box,m,S,save);
    }else{
      STRUCTURE_UI.mount(box.querySelector('.structure-host'),m,S,save);
      RESOURCE_UI.mount(box.querySelector('.resource-host'),m,S,save);
    }
    var behaviorHost=box.querySelector('.behavior-host'),behaviorHandler=window.ENGINE&&ENGINE.behaviors[definition.behavior];
    if(!(window.MULTIBLOCK_WINDOW&&MULTIBLOCK_WINDOW.managed(m))&&behaviorHost&&behaviorHandler&&behaviorHandler.mount)behaviorHandler.mount(behaviorHost,m,S,save);
    box._machineSignature=machineSignature(m);
    if(definition.requiresRecipeSelection)RECIPE_UI.mount(box.querySelector('.rb-host'),m,S,save);
    if(!definition.pipeOnly&&!(window.MULTIBLOCKS&&MULTIBLOCKS.managed(m)))MACHINE_IO.mount(box.querySelector('.machine-io-host'),m,S,save);else{var structure=box.querySelector('.structure-panel');if(structure)structure.open=true;}
    if(window.MULTIBLOCKS&&MULTIBLOCKS.managed(m))STRUCTURE_UI.mount(box.querySelector('.structure-host'),m,S,save);
    refreshProcessInfo(box,m);
    if(!ENTITIES.retainsContents(m)){
      var controls=document.createElement('div');controls.className='mx-recovery';
      if(MACHINE_CONTROL.controlled(definition)){
        var runSwitch=document.createElement('button'),multiblockWindow=MULTIBLOCK_WINDOW.supported(m);
        runSwitch.type='button';runSwitch.className='btn machine-run-switch'+(multiblockWindow?' mb-main-switch':'');
        if(multiblockWindow){
          runSwitch.setAttribute('aria-label','运行开关');
          runSwitch.innerHTML='<i class="io-switch-track"></i>';
        }
        runSwitch.dataset.machineRunSwitch=m.uid;runSwitch.setAttribute('role','switch');refreshRunSwitch(runSwitch,m,definition);
        runSwitch.onclick=function(){MACHINE_CONTROL.set(m,!MACHINE_CONTROL.allowed(m,definition));refreshRunSwitch(runSwitch,m,definition);if(save)save();};
        (multiblockWindow?box.querySelector('.machine-heading'):controls).appendChild(runSwitch);
      }
      MULTIBLOCK_OUTPUT_UI.mount(controls,m,save);
      BATCH_MODE_UI.mount(controls,m,save);
      if(!MULTIBLOCK_WINDOW.supported(m)&&!definition.multiblock&&((definition.fluidInputTanks||[]).length||(definition.fluidOutputTanks||[]).length||definition.steamPowered)){
        var empty=document.createElement('button');empty.className='btn';empty.dataset.discardFluids=m.uid;empty.textContent='清空剩余流体';refreshDiscardFluids(empty,m,S);empty.onclick=function(){
        var result=ENTITIES.discardFluids(S,m.uid);toast(result.ok?'已清空剩余流体':result.code==='RUNNING'?'等待当前批次完成后再清空':'设备已不存在');if(save)save();openDetail(m.uid,S.fx,S,save);
        };controls.appendChild(empty);
      }
      if(controls.childElementCount)box.querySelector('.foot').prepend(controls);
    }
    mountMove(box.querySelector('.foot'),m,S,save);
    var parent=window.SMELTERY&&SMELTERY.parent(S,m);if(parent){var back=document.createElement('button');back.className='btn casting-back';back.dataset.castingBack=parent.uid;back.textContent='← 返回所属冶炼炉';back.onclick=function(){openDetail(parent.uid,S.fx,S,save);};box.querySelector('.mxwin').prepend(back);var ports=box.querySelector('.port-host');if(ports)ports.hidden=true;}
  }

  /* ---------------- 箱子 ---------------- */
  var chestOpen = null;                 // 当前打开的是哪个箱子（"x,y"）

  function chestHtml(c) {
    var h = '<div class="chgrid">';
    for (var i = 0; i < CHEST_SLOTS; i++) {
      var s = c.slots[i];
      h += '<div class="chslot' + (s ? '' : ' empty') + '" data-ch="' + i + '"' +
        ' title="' + (s ? esc(nameOf_(s.k)) + ' ×' + s.n : '') + '">' +
        (s ? iconHtml(s.k, 32) + '<span class="n">' + s.n + '</span>' : '') + '</div>';
    }
    h += '</div>';
    return h;
  }

  function openChest(kk, f, S, save) {
    var c = normChest(f.chest[kk]);
    if (!c) return;
    /* 状态先落地，界面后画：没有弹窗元素时也不该影响哪只箱子开着这件事 */
    openUid = null;
    chestOpen = kk;
    var box = document.getElementById('popup');
    if (!box) return;
    box.hidden = false;
    box.classList.add('noback');
    box.innerHTML = '<div class="box mxwin chestwin"><h3>箱子' +
      '<span class="dim">　' + chestCount(c) + ' / ' + CHEST_CAP + '</span></h3>' +
      chestHtml(c) +
      '' +
      '<div class="foot"><button class="btn" data-popclose="1">关闭</button></div></div>';
    popupCb = null;
  }

  function refreshChest(f, S, save) {
    if (!chestOpen) return;
    var c = normChest(f.chest[chestOpen]);
    var box = document.getElementById('popup');
    if (!c || !box || box.hidden) { chestOpen = null; return; }
    var win = box.querySelector('.chestwin');
    if (!win) { chestOpen = null; return; }
    win.querySelector('h3 .dim').textContent = '　' + chestCount(c) + ' / ' + CHEST_CAP;
    var g = win.querySelector('.chgrid');
    if (g) g.outerHTML = chestHtml(c);
  }

  function takeChest(idx, S, save) {
    var f = ensure(S);
    if (!chestOpen) return;
    var c = normChest(f.chest[chestOpen]);
    if (!c) return;
    var s = c.slots[idx];
    if (!s || !(s.n > 0)) return;
    var result=COMMANDS.withdraw(S,c.slots,idx);
    if(!result.ok){toast('物品栏和仓库都满了');return;}
    transferTip(result,'取出');
    save();
    if (typeof markInv === 'function') markInv();
    refreshChest(f, S, save);
    render(S, save);
  }

  /* 点网格里的物品：只显示它能做成什么 */
  function showMat(uid, k, S, save) {
    var f = ensure(S);
    var hit = machineByUid(f, uid);
    if (!hit) return;
    var m = hit.m;
    var box = document.getElementById('popup');
    if (!box) return;
    var slot = box.querySelector('.mx-rxbox');
    if (slot) slot.innerHTML = recipeCard(m, k);
  }

  /* 画布上每台机器下面那行状态：每帧跟着走。
   * 以前只有浮窗开着才刷，关着浮窗就永远停在打开那一刻的字 —— 看着像卡死。 */
  function updateCards(f) {
    var host = document.getElementById('fx-host');
    if (!host) return;
    var nodes = host.querySelectorAll('.fx-m'),tankContext=null;
    for (var i = 0; i < nodes.length; i++) {
      var idx = +nodes[i].getAttribute('data-m');
      var m = nodes[i]._fxMachine || f.machines[idx];
      if (!m) continue;
      if(window.AE_PRESENTATION)AE_PRESENTATION.refresh(nodes[i],m,MACHINE_ICON,ENGINE.state);
      if(window.GRID_FURNACE&&m.k===GRID_FURNACE.key){var img=nodes[i].querySelector('.facebox img'),src='modicons/phase82/furnace_'+(FURNACES.state(GRID_FURNACE.state(m)).burning?'on':'off')+'.png';if(img&&img.getAttribute('src')!==src)img.setAttribute('src',src);}
      var bodyProfile=STRUCTURES.profile(m);if(bodyProfile&&bodyProfile.refreshBody)bodyProfile.refreshBody(m,nodes[i]);
      if(window.TANK_PRESENTATION&&TANK_PRESENTATION.supported(m)){if(!tankContext)tankContext=TANK_PRESENTATION.context(m);TANK_PRESENTATION.refresh(m,nodes[i],tankContext);}
      var state=MACHINE_STATUS.read(m),tip=nameOf_(m.k)+'，'+state.detail+(m.note?'\n'+m.note:'');if(nodes[i].dataset.tip!==tip){nodes[i].dataset.tip=tip;nodes[i].setAttribute('aria-label',tip);}nodes[i].dataset.state=state.tone;nodes[i].dataset.status=state.key;
      if(window.MACHINE_VISUALS)MACHINE_VISUALS.refresh(m,nodes[i],state);
      var unfinished=nodes[i].querySelector('.fx-unformed');if(unfinished)unfinished.hidden=!!(m.structure&&m.structure.formed);var badge=nodes[i].querySelector('.fx-status');if(badge&&badge.dataset.statusKey!==state.key){badge.dataset.statusKey=state.key;badge.dataset.tone=state.tone;badge.innerHTML=MACHINE_STATUS.html(state);}
    }
  }

  function mountNote(box,m,S,save){var heading=box.querySelector('.machine-heading,.furwin>h3,.sm-heading h3');if(!heading)return;var input=heading.querySelector('[data-machine-note]');if(input&&input.dataset.machineNote!==m.uid){input.remove();input=null;}if(!input){input=document.createElement('input');input.type='text';input.className='machine-note';input.dataset.machineNote=m.uid;input.placeholder='备注';input.setAttribute('aria-label','机器备注');input.maxLength=120;input.oninput=function(){m.note=input.value;};input.onchange=function(){m.note=input.value.trim();if(save)save();};heading.appendChild(input);}if(input!==document.activeElement)input.value=m.note||'';}
  function refreshProcessInfo(box,m){var definition=STRUCTURES.instance(m),batch=box.querySelector('.mx-batch-info'),liquids=box.querySelector('.mx-fluid-readings');
    var readout=box.querySelector('.mx-work-readout'),running=m.job;
    if(readout){
      var time=running&&running.durationTicks>0?((running.progressTicks||0)/20).toFixed(2)+' / '+(running.durationTicks/20).toFixed(2):'';
      var power=running&&running.EUt>0?running.EUt.toLocaleString():'';
      var metrics=(time?'<span class="mx-work-time" data-tip="'+time+' s">'+time+' <small>s</small></span>':'')+
        (power?'<span class="mx-work-power" data-tip="'+power+' EU/t">'+power+' <small>EU/t</small></span>':'');
      if(readout._metrics!==metrics){UI_KIT.patch(readout,metrics);readout._metrics=metrics;}
      var indicator=box.querySelector('.native-progress'),tip=[time&&time+' s',power&&power+' EU/t'].filter(Boolean).join('　')||'加工进度';
      if(indicator&&indicator.dataset.tip!==tip)indicator.dataset.tip=tip;
    }
    if(batch&&MULTIBLOCKS.managed(m)){
      var job=m.job,products=job?(job.outputs||[]).map(function(p){return '<span title="'+esc(nameOf_(p.k))+'">'+iconHtml(p.k,16)+esc(nameOf_(p.k))+' <b>×'+p.n+'</b></span>';}).concat((job.fluidOutputs||[]).map(function(p){var name=esc(FLUID_PRESENTATION.name(p.f));return '<span title="'+name+'">'+FLUID_PRESENTATION.html(p.f,16)+name+' <b>'+p.mb.toLocaleString()+' mB</b></span>';})):[];
      var batchTime=job?(job.progressTicks/20).toFixed(2)+' / '+(job.durationTicks/20).toFixed(2)+' s':'';
      var batchPower=job&&job.EUt?job.EUt.toLocaleString()+' EU/t':'';
      var fields=job?'<div class="mb-batch-metrics"><b aria-label="加工用时" data-tip="'+batchTime+'">'+batchTime+
        '</b><b aria-label="加工功率" data-tip="'+batchPower+'">'+batchPower+'</b></div>':'';
      UI_KIT.patch(batch,fields+(products.length?'<div class="mx-batch-products" role="region" aria-label="本批产物" tabindex="0"><div class="mb-product-list">'+products.join('')+'</div></div>':''));
    }
    if(liquids&&definition.generator){UI_KIT.patch(liquids,(definition.fluidInputTanks||[]).map(function(cap,i){var t=m.tanksIn[i];return '<div><span>'+esc(t?FLUID_PRESENTATION.name(t.f):'燃料储量')+'</span><b>'+(t?t.mb:0).toLocaleString()+' / '+cap.toLocaleString()+' mB</b><span class="fuel-volume"><i style="width:'+Math.min(100,(t?t.mb:0)/cap*100)+'%"></i></span></div>';}).join(''));}
    var d=DEFS.of(m.k),handler=d&&ENGINE.behaviors[d.behavior],node=box.querySelector('.mx-process-info');
    if(node){
      var summary=window.TANK_PRESENTATION&&TANK_PRESENTATION.supported(m)?TANK_PRESENTATION.summary(m):handler&&handler.summary?handler.summary(m).join('，'):'';
      if(node.textContent!==summary){node.textContent=summary;node.dataset.tip=summary;}
    }
    RESOURCE_UI.refresh(box,m);
  }
  function superChestDisplay(m,d){var p=m.itemStore||m.outs[0]||m.ins[0];return (p?iconHtml(p.k,32)+'<strong>'+esc(nameOf_(p.k))+'</strong>':'<strong>空</strong>')+'<span>'+SUPER_CHESTS.total(m).toLocaleString()+' / '+d.itemCapacity.toLocaleString()+'</span>';}
  function refreshRunSwitch(button,m,d){
    var on=MACHINE_CONTROL.allowed(m,d);button.setAttribute('aria-checked',String(on));
    if(button.classList.contains('mb-main-switch'))button.dataset.tip=on?'已开机':'已关机';
    else button.textContent='运行开关：'+(on?'开':'关');
  }
  function refreshDiscardFluids(button,m,S){
    var disabled=ENTITIES.fluidDiscardBlocked(m)||!ENTITIES.fluidContents(S,m.uid).length;
    if(button.disabled!==disabled)button.disabled=disabled;
  }
  function positionMachineWindow(m,box,definition){
    mountNote(box,m,ENGINE.state,typeof save==='function'?save:null);
    var win=box.querySelector('.mxwin');if(!win)return;
    win.dataset.machineBehavior=definition.behavior;
    var frame=MACHINE_LAYOUT.frame(MACHINE_LAYOUT.compact(MACHINE_LAYOUT.plan(definition)));
    var zoom=typeof uiZoom==='function'?uiZoom():1,right=document.getElementById('quests').getBoundingClientRect();
    var screen=window.innerWidth/zoom,available=(right.width>1?right.left:window.innerWidth)/zoom;
    var multi=window.MULTIBLOCK_WINDOW&&MULTIBLOCK_WINDOW.supported(m),small=!multi&&!definition.requiresStructure;
    var width=Math.min(multi?460:400,Math.max(320,frame.width*2+34),screen-24);
    if(multi)width=Math.min(460,Math.max(320,available-24),screen-24);
    if(definition.windowWidth)width=Math.min(definition.windowWidth,screen-24,Math.max(320,available-24));
    var top=document.getElementById('top').getBoundingClientRect(),bottom=document.getElementById('bottom').getBoundingClientRect();
    var areaTop=Math.max(8,top.bottom+8),areaBottom=Math.max(areaTop+160,Math.min(window.innerHeight-8,bottom.top-8));
    var areaHeight=Math.floor((areaBottom-areaTop)/zoom);
    var multiSize=multi&&MULTIBLOCK_WINDOW.size(areaHeight,zoom,available,Math.max(600,definition.windowWidth||600));
    if(multiSize)width=multiSize.width;
    var splitFilter=win.classList.contains('item-filter-window'),splitFurnace=win.classList.contains('grid-furnace-window');
    var settingsWidth=252,processWidth=Math.min(Math.max(222,Math.min(342,frame.width*2+20)),available-settingsWidth-52);
    if(splitFilter)processWidth=Math.min(322,available-settingsWidth-52);
    var split=small&&areaHeight<420&&(splitFilter?processWidth>=286:
      processWidth>=222&&(splitFurnace||!!win.querySelector('.mx:not(.mx-multi)>.machine-settings')));
    if(split)width=processWidth+settingsWidth+26;
    var positionedWidth=width*(multiSize?multiSize.scale:1);
    if(available-positionedWidth<24)available=screen;
    win.classList.toggle('multiblock-window',!!multi);
    win.classList.toggle('four-zone-machine',!!multi);
    win.classList.toggle('mb-builtin-window',!!multi&&!MULTIBLOCK_WINDOW.managed(m));
    win.classList.toggle('mb-fitted',!!multi&&zoom<=1.5);
    win.classList.toggle('small-machine-window',small);
    win.classList.toggle('machine-window-split',split);
    win.style.width=width+'px';
    win.style.zoom=multiSize&&multiSize.scale!==1?String(multiSize.scale):'';
    win.style.maxHeight=(multiSize?multiSize.height:areaHeight)+'px';
    win.style.setProperty('--machine-area-height',areaHeight+'px');
    win.style.setProperty('--machine-unit',Math.min(2,((split?processWidth-18:width-40))/frame.width)+'px');
    box.style.setProperty('--machine-area-top',areaTop/zoom+'px');
    box.style.setProperty('--machine-area-bottom',(window.innerHeight-areaBottom)/zoom+'px');
    box.style.setProperty('--machine-left',Math.max(12,Math.min((screen-positionedWidth)/2,available-positionedWidth-12))+'px');
    if(multi)MULTIBLOCK_LAYOUT.fitWindow(win,zoom>1.5);
  }
  function machineSignature(m){var def0=DEFS.of(m.k),behaviorHook=window.ENGINE&&ENGINE.behaviors&&def0&&ENGINE.behaviors[def0.behavior],extra=behaviorHook&&behaviorHook.signature?behaviorHook.signature(m):null;return JSON.stringify([extra,m.ins,m.outs,m.tanksIn,m.tanksOut,m.tanksEnergy,!!m.job,m.circ,m.circuitConfigured,m.configurationItem,m.controllerCircuit,m.outFace,m.autoItems,m.autoFluids,m.allowInputFromOutputSide,m.covers,m.enabled,m.workAllowed,m.workStopped,m.structure&&[m.structure.formed,m.structure.variant],inputSelection,circOpen,coilOpen]);}
  function refreshDetail(f,S,save,force){
    if(openUid==null)return;var box=document.getElementById('popup'),hit=openMachine(f);
    if(!box||box.hidden||!hit){if(box&&!hit)box.hidden=true;openUid=null;return;}var m=hit.m,node=box.querySelector('.mx');if(!node)return;
    positionMachineWindow(m,box,STRUCTURES.instance(m));
    var signature=machineSignature(m);
    if(force||signature!==box._machineSignature){
      var tmp=document.createElement('div');tmp.innerHTML=machineHtml(m,m.uid);UI_KIT.sync(node,tmp.firstChild);
      box._machineSignature=signature;
      node=box.querySelector('.mx');
      (function(){
        var d=DEFS.of(m.k),hook=d&&window.ENGINE&&ENGINE.behaviors&&ENGINE.behaviors[d.behavior];
        var host=node.querySelector('.behavior-host');
        if(!host||!hook||!hook.mount)return;
        if(window.MULTIBLOCK_WINDOW&&MULTIBLOCK_WINDOW.managed(m)){
          var box2=document.getElementById('popup');
          box2.classList.toggle('mb-generator',!!(d&&(d.generator||d.behavior==='gt_ic2_reactor')));
        }
        hook.mount(host,m,S,save);
      })();
    }
    var storage=node.querySelector('.super-chest-display');if(storage)UI_KIT.patch(storage,superChestDisplay(m,STRUCTURES.instance(m)));
    var heat=node.querySelector('.native-heat');if(heat){var definition=STRUCTURES.instance(m);heat.title='温度 '+Math.floor(m.temperature||0)+'°C';heat.querySelector('i').style.height=Math.max(0,Math.min(100,(m.temperature||0)/definition.thermal.maxTemperature*100))+'%';}
    var water=node.querySelector('[data-water-volume]');if(water)water.innerHTML=((m.tanksIn[0]&&m.tanksIn[0].mb)||0).toLocaleString()+' <small>/ '+DEFS.of(m.k).slots.fluid.toLocaleString()+' mB</small>';
    var state=stateOf(m,node.classList.contains('mx-multi')),label=node.querySelector('.mx-st');
    if(label){
      var statusClass='mx-st mx-'+state[1];
      if(label.textContent!==state[0])label.textContent=state[0];
      if(label.dataset.tip!==state[0])label.dataset.tip=state[0];
      if(label.className!==statusClass)label.className=statusClass;
    }
    var progress=m.job?Math.min(1,m.job.progressTicks/m.job.durationTicks):0,indicator=node.querySelector('.native-progress');if(indicator){indicator.style.setProperty('--progress',progress);indicator.setAttribute('aria-valuenow',Math.round(progress*100));}
    var bar=node.querySelector('.mx-bar i');if(bar)bar.style.width=(progress*100)+'%';
    var eu=node.querySelector('.mx-eu');if(eu){var nextEu=document.createElement('div');nextEu.innerHTML=euHtml(m,!!node.closest('.small-machine-window')||compactEnergyMeter(m));if(nextEu.firstChild)UI_KIT.sync(eu,nextEu.firstChild);else eu.innerHTML='';}
    MACHINE_IO.mount(box.querySelector('.machine-io-host'),m,S,save);
      refreshProcessInfo(box,m);
    STRUCTURE_UI.mount(box.querySelector('.structure-host'),m,S,save);
    var runSwitch=box.querySelector('[data-machine-run-switch]');if(runSwitch)refreshRunSwitch(runSwitch,m,DEFS.of(m.k));
    MULTIBLOCK_OUTPUT_UI.refresh(box.querySelector('[data-multiblock-voiding]'),m);
    BATCH_MODE_UI.refresh(box.querySelector('[data-machine-batch]'),m);
    var empty=box.querySelector('[data-discard-fluids]');if(empty)refreshDiscardFluids(empty,m,S);
  }

  /* 浮窗别挡着物品栏：noback 模式下没有全屏遮罩，底下照常能点 */
  function dropNoback() {
    var box = document.getElementById('popup');
    if (box && box.hidden) box.classList.remove('noback');
  }

  function takeSlot(uid, kind, idx, S, save) {
    var f = ensure(S);
    var hit = machineByUid(f, uid);
    if (!hit) return;
    var m = hit.m;

    /* Each container uses its exported amount; active batch ingredients are already in escrow. */
    if(kind==='fin'||kind==='fout'||kind==='energy'){
      var options=COMMANDS.collectOptions(S,m,kind,idx);
      if(!options.ok){toast(options.code==='EMPTY'?'罐内没有流体':options.code==='FLUID_AMOUNT'?'流体不足，当前容器需要 '+options.minimum+' mB':'没有适合盛装该流体的空容器');return;}
      var c=options.choices[0],result=COMMANDS.collectFluid(S,m,kind,idx,c.max,c.pair.filled);transferTip(result,'取出');
      if(save)save();if(typeof markInv==='function')markInv();openDetail(m.uid,f,S,save);render(S,save);return;
    }

    /* ---- 物品 ---- */
    var arr = (kind === 'in') ? m.ins : m.outs;
    var c = arr[idx] || null;
    if (!c) return;
    var result=COMMANDS.withdraw(S,arr,idx);transferTip(result,'取出');if(!result.ok)return;
    if(save)save();if(typeof markInv==='function')markInv();refreshDetail(f,S,save);
  }

  /* 机器里所有东西的清单（拆除时用） */
  function machineLoot(m) {
    var loot = [];
    function push(list) {
      (list || []).forEach(function (s) {
        if (s && s.k && s.n > 0) loot.push({ k: s.k, n: s.n });
      });
    }
    push(m.ins); push(m.jobIns); push(m.outs);
    [m.ftank, m.fout, m.jobFin].forEach(function (tk) {
      if (!tk || !tk.f || !(tk.mb > 0)) return;
      var pair = FLUID_TO_EMPTY[tk.f];
      if (!pair) return;                       // 没有容器的流体先不列进清单
      var nb = Math.floor(tk.mb / 1000);
      if (nb > 0) loot.push({ k: pair[0], n: nb });
    });
    return loot;
  }

  /* 能不能把这些东西全收下：拿副本试一遍，收不齐就别动真的 */
  function lootFits(S, loot) {
    var inv = JSON.parse(JSON.stringify(S.inv || []));
    var chests = JSON.parse(JSON.stringify((S.chests || []).map(function (c) { return c.slots; })));
    for (var i = 0; i < loot.length; i++) {
      var it = loot[i], left = it.n;
      left -= CORE.insert(CORE.slotBox(inv), it.k, left);
      for (var j = 0; j < chests.length && left > 0; j++) {
        left -= CORE.insert(CORE.slotBox(chests[j]), it.k, left);
      }
      if (left > 0) return { ok: false, k: it.k, left: left };
    }
    return { ok: true };
  }
  /* 点物品栏里的机器：进入放置模式，蓝图上的格子跟着鼠标亮，点一下放下 */
  function startPlace(k, S, save,sourceIndex) {
    var f = ensure(S);
    k=CONTENT.canonicalKey(k);var pipe=GRID_TRANSPORTS.definition(k),placementDef=DEFS.of(k);if(!pipe&&!placementDef&&!(window.MULTIBLOCKS&&(MULTIBLOCKS.feedKey(k)||MULTIBLOCKS.casingItem(S,k))))return false;
    if(placementDef&&(placementDef.attachmentOnly||placementDef.worldOnly)){toast(placementDef.facilityPage==='space'?'在航天页部署发射站':placementDef.attachmentOnly?'在世界页的匠魂炉面板中安装浇铸设施':'在世界页的世界设施中部署这类工作站');return true;}
    if ((typeof countIn === 'function') && countIn(S.inv, k) <= 0) {
      toast('物品栏里没有这台机器');
      return true;
    }
    if(!Number.isInteger(sourceIndex))sourceIndex=S.inv.findIndex(function(s){return s&&CONTENT.canonicalKey(s.k)===k;});var actual=S.inv[sourceIndex];if(!actual||CONTENT.canonicalKey(actual.k)!==k)return false;
    if(st.place===k&&st.placeSource&&st.placeSource.bagIndex===sourceIndex)return cancelPlace(S,save);
    st.owner=S;st.move=null;st.place = k;st.selectedPipe=null;
    st.plan=window.STRUCTURE_PLACEMENT?STRUCTURE_PLACEMENT.begin(k,BLUEPRINTS.active(S).id):null;
    st.placeSource={bagIndex:sourceIndex,entityUid:actual.entityUid||null,fresh:!actual.entityUid,structureSize:st.plan?st.plan.size:window.MULTIBLOCKS?MULTIBLOCKS.placementSize({k:k}):{}};
    if(S.ui&&S.ui.page!=='line'&&typeof applyView==='function'){S.ui.page='line';applyView();}else render(S, save);
    if(save)save();
    return true;
  }

  function heldItem(S){
    if(st.owner&&st.owner!==S){st.place=null;st.placeSource=null;st.plan=null;st.move=null;st.owner=null;return null;}
    if(!st.place)return null;var source=st.placeSource||{},uid=source.entityUid,wanted=st.place;
    function sameKind(item){return item&&CONTENT.canonicalKey(item.k)===wanted&&(item.n==null||item.n>0);}
    function matches(item){return sameKind(item)&&(uid?item.entityUid===uid:!item.entityUid);}
    var index=matches(S.inv[source.bagIndex])?source.bagIndex:S.inv.findIndex(matches);
    if(index<0)index=S.inv.findIndex(sameKind);
    if(index<0){if(!st.plan||st.plan.phase!=='fixed'){st.place=null;st.placeSource=null;st.plan=null;}return null;}
    var item=S.inv[index];st.placeSource={bagIndex:index,entityUid:item.entityUid||null,fresh:!item.entityUid,structureSize:source.structureSize};return item;
  }
  function moveCandidate(m,c){var value=Object.assign({},m,{rotation:st.move.rotation}),shape=MULTIBLOCKS.bounds(value);value.x=c.x-(shape?shape.cx:0);value.y=c.y-(shape?shape.cy:0);return value;}
  function placementCandidate(k,x,y){if(st.plan&&st.plan.k===k)return STRUCTURE_PLACEMENT.candidate(st.plan,{x:x,y:y});return{k:k,x:x,y:y,structureSize:window.MULTIBLOCKS?MULTIBLOCKS.placementSize({k:k},k===st.place&&st.placeSource&&st.placeSource.structureSize):{}};}
  function placementCursor(S){
    if(!S.ui||S.ui.page!=='line'||document.hidden)return null;
    if(st.plan&&st.plan.phase==='fixed')return null;
    var popup=document.getElementById('popup');if(popup&&!popup.hidden)return null;
    var moving=st.move&&ENTITIES.get(S,st.move.uid),item=moving||heldItem(S);if(!item)return null;
    var count=moving?1:(item.n==null?1:item.n);
    return {k:item.k,n:count,mode:moving?'move':'placement'};
  }

  function mountTransportSwitcher(cell,S,save,kind){
    var board=BLUEPRINTS.active(S),header=document.querySelector('#popup .box>header'),current=GRID_TRANSPORTS.family(kind).id,seen=new Set([current]);if(!header)return;
    var nav=document.createElement('nav');nav.style.cssText='display:flex;gap:6px;margin-left:auto';
    GRID_TRANSPORTS.at(board,cell).forEach(function(layer){var family=GRID_TRANSPORTS.family(layer).id;if(seen.has(family))return;seen.add(family);var p=board[layer][cell],b=document.createElement('button');b.type='button';b.className='btn';b.dataset.transportLayer=layer;b.dataset.tip=nameOf_(p.pipeKey);b.setAttribute('aria-label',nameOf_(p.pipeKey));b.innerHTML=iconHtml(p.pipeKey,20);b.onclick=function(e){e.preventDefault();e.stopPropagation();openPipeSettings(cell,S,save,layer);};nav.appendChild(b);});
    if(nav.childElementCount)header.insertBefore(nav,header.querySelector('[data-popclose]'));
  }
  function openPipeSettings(cell,S,save,kind,side){
    var board=BLUEPRINTS.active(S);if(kind&&GRID_TRANSPORTS.family(kind).id==='eio'||!kind&&(board.eioItem[cell]||board.eioFluid[cell])){openUid=null;chestOpen=null;EIO_UI.open(cell,S,save,kind,side);mountTransportSwitcher(cell,S,save,kind||GRID_TRANSPORTS.at(board,cell).find(function(k){return GRID_TRANSPORTS.family(k).id==='eio';}));return;}
    var box=document.getElementById('popup');if(!box)return;openUid=null;chestOpen=null;box.hidden=false;box.classList.add('noback');
    box.innerHTML='<div class="box mxwin pipe-window"><header><h3>管道设置，'+esc(cell)+'</h3><button class="btn" data-popclose="1">关闭</button></header><div class="pipe-settings"></div></div>';
    PIPE_UI.mount(box.querySelector('.pipe-settings'),cell,S,save);
    mountTransportSwitcher(cell,S,save,kind||GRID_TRANSPORTS.at(board,cell)[0]);
  }

  function beginMove(uid,S,save){
    var m=ENTITIES.get(S,uid);if(!m||!ENTITIES.isGrid(m))return false;
    st.owner=S;st.place=null;st.placeSource=null;st.plan=null;st.selectedPipe=null;st.move={uid:m.uid,rotation:m.rotation||0,blueprintId:m.location.blueprintId};
    if(typeof closePopup==='function')closePopup();
    if(S.ui.page!=='line'){S.ui.page='line';if(typeof applyView==='function')applyView();}
    render(S,save);toast('选择新位置；右键或 Esc 取消移动');return true;
  }
  function mountMove(host,m,S,save){if(!host||!ENTITIES.isGrid(m)||host.querySelector('[data-move-machine]'))return;var b=document.createElement('button');b.type='button';b.className='btn';b.dataset.moveMachine=m.uid;b.textContent='移动机器位置';b.onclick=function(){beginMove(m.uid,S,save);};host.prepend(b);}

  function cancelPlace(S, save) {
    if (!st.place&&!st.move) return false;
    st.move=null;
    st.plan=null;
    st.owner=null;
    st.place = null;
    st.placeSource=null;
    if(window.ITEM_DRAG){ITEM_DRAG.end();ITEM_DRAG.syncCursor();}
    if(!S.ui||S.ui.page==='line')render(S, save);
    return true;
  }

  /* 平滑平移：滚轮给的是一个个离散的台阶，直接加 scrollLeft 就是一蹦一蹦。
   * 这里记一个目标位置，每帧往那边追 25%，松手后自己滑到位。 */
  var panT = null, panRaf = 0;
  function panBy(el, dx, dy) {
    if (!panT) panT = { x: el.scrollLeft, y: el.scrollTop };
    var maxX = Math.max(0, el.scrollWidth - el.clientWidth);
    var maxY = Math.max(0, el.scrollHeight - el.clientHeight);
    panT.x = Math.max(0, Math.min(maxX, panT.x + dx));
    panT.y = Math.max(0, Math.min(maxY, panT.y + dy));
    if (panRaf) return;
    panRaf = requestAnimationFrame(function step() {
      var cx = el.scrollLeft, cy = el.scrollTop;
      var nx = cx + (panT.x - cx) * 0.25;
      var ny = cy + (panT.y - cy) * 0.25;
      if (Math.abs(panT.x - nx) < 0.6) nx = panT.x;
      if (Math.abs(panT.y - ny) < 0.6) ny = panT.y;
      el.scrollLeft = nx;
      el.scrollTop = ny;
      if (nx !== panT.x || ny !== panT.y) { panRaf = requestAnimationFrame(step); }
      else { panRaf = 0; panT = null; }
    });
  }

  /* ============================ 主渲染 ============================ */

  function cellOf(cv, f, ev) {
    var r = (cv._fxViewport||cv).getBoundingClientRect();
    var z = (typeof uiZoom === 'function') ? uiZoom() : 1;
    var vp=cv._fxViewport,camera=cv._fxCamera,scale=camera?camera.zoom:1;
    var x = Math.floor(((ev.clientX-r.left)/z+(vp?vp.scrollLeft:0))/scale/U);
    var y = Math.floor(((ev.clientY-r.top)/z+(vp?vp.scrollTop:0))/scale/U);
    if (x < 0 || y < 0 || x >= f.w || y >= f.h) return null;
    return { x: x, y: y };
  }

  function resetBoardInteraction() {
    st.move=null;st.place=null;st.placeSource=null;st.plan=null;st.selectedPipe=null;st.drawing=false;
    MACHINE_IO.clear();openUid=null;chestOpen=null;
  }
  function render(S, save) {
    var host = document.getElementById('fx-host');
    if (!host) return;
    if(st.owner&&st.owner!==S){st.place=null;st.placeSource=null;st.plan=null;st.move=null;st.owner=null;}
    var f = ensure(S),board=BLUEPRINTS.activeRepo(f),available=f.blueprints.filter(function(b){return BLUEPRINTS.access(S,b.dimension);});
    if(!available.includes(board)){if(!available.length)return;board=available[0];BLUEPRINTS.select(S,board.id);resetBoardInteraction();}
    function makeViewKey(){return JSON.stringify([board.width,board.height,board.name,available.map(function(b){return[b.id,b.name,b.width,b.height,b.dimension];}),typeof uiZoom==='function'?uiZoom():1]);}
    var viewKey=makeViewKey();
    if(host._fxView&&host._fxView.state===S&&host._fxView.board===board&&host._fxView.key===viewKey&&host._fxView.wrap.isConnected){host._fxView.refresh();return;}
    if(host._fxView?.board?.dimension!==board.dimension)host.dispatchEvent(new Event('factory-dimension-change'));
    var priorStrip=host._fxView&&host._fxView.state===S?host._fxView.boardStrip:null;
    var stripOffset=priorStrip?priorStrip.scrollLeft:0;
    var boardFocus=priorStrip&&priorStrip.contains(document.activeElement)&&document.activeElement.matches('[data-fx-board]');

    var wrap = document.createElement('div');
    wrap.className = 'fx-wrap';wrap.style.setProperty('--fx-cell',U+'px');wrap.style.setProperty('--fx-icon',MACHINE_ICON+'px');
    var camera=board.camera;if(camera.cellSize!==U){var priorCellSize=camera.cellSize||72;camera.x=camera.x/priorCellSize*U;camera.y=camera.y/priorCellSize*U;camera.cellSize=U;}
    if(host._fxObserver)host._fxObserver.disconnect();
    var manager=document.createElement('div');manager.className='fx-bar fx-blueprints';
    var strip=document.createElement('div');strip.className='fx-board-strip';strip.dataset.itemControls='';strip.setAttribute('role','group');strip.setAttribute('aria-label','切换画布');manager.appendChild(strip);
    var dimensionLabel=document.createElement('span');dimensionLabel.className='fx-board-dimension';dimensionLabel.textContent=DIMENSIONS.name(board.dimension);dimensionLabel.title=dimensionLabel.textContent;manager.appendChild(dimensionLabel);
    var boardActions=document.createElement('div');boardActions.className='fx-board-actions';manager.appendChild(boardActions);
    var cameraTools=document.createElement('div');cameraTools.className='fx-camera-tools';manager.appendChild(cameraTools);
    function action(parent,label,fn){var b=document.createElement('button');b.className='fx-tool';b.textContent=label;b.onclick=fn;parent.appendChild(b);return b;}
    function switchBoard(id){if(!ITEM_DRAG.returnHeld()||!BLUEPRINTS.select(S,id).ok)return;resetBoardInteraction();var popup=document.getElementById('popup');if(popup)popup.hidden=true;if(save)save();render(S,save);}
    function revealBoard(node){
      var start=node.offsetLeft-2,end=node.offsetLeft+node.offsetWidth+2;
      if(start<strip.scrollLeft||end-start>strip.clientWidth)strip.scrollLeft=start;
      else if(end>strip.scrollLeft+strip.clientWidth)strip.scrollLeft=end-strip.clientWidth;
    }
    function editBoardName(button){
      var input=document.createElement('input');input.className='fx-blueprint-name';input.value=board.name;input.maxLength=48;input.setAttribute('aria-label','画布名称');
      input.style.width=button.offsetWidth+'px';
      function finish(cancel,focus){
        if(!input.isConnected)return;
        input.onblur=null;
        var renamed=!cancel&&input.value.trim()!==board.name&&BLUEPRINTS.rename(S,board.id,input.value).ok;
        button.textContent=board.name;button.title=board.name+' · 点击改名';input.replaceWith(button);
        if(focus){button.focus({preventScroll:true});revealBoard(button);}
        if(renamed){host._fxView.key=makeViewKey();if(save)save();}
      }
      input.onblur=function(){finish(false,false);};
      input.onkeydown=function(e){if(!e.isComposing&&(e.key==='Enter'||e.key==='Escape')){e.preventDefault();e.stopPropagation();finish(e.key==='Escape',true);}};
      button.replaceWith(input);revealBoard(input);input.focus({preventScroll:true});input.select();
    }
    var currentButton;
    available.forEach(function(b){
      var selected=b.id===board.id,button=action(strip,b.name,function(){if(!selected)switchBoard(b.id);else if(ITEM_DRAG.returnHeld())editBoardName(button);});
      button.type='button';button.dataset.fxBoard=b.id;button.setAttribute('aria-pressed',String(selected));
      button.title=selected?b.name+' · 点击改名':b.name;
      if(selected){button.classList.add('on');currentButton=button;}
    });
    strip.addEventListener('wheel',function(e){
      var delta=e.deltaX||e.deltaY;
      if(!delta||e.ctrlKey||strip.scrollWidth<=strip.clientWidth)return;
      e.preventDefault();strip.scrollLeft+=delta*(e.deltaMode===1?24:e.deltaMode===2?strip.clientWidth:1);
    },{passive:false});
    action(boardActions,'＋ 新建画布',function(){
      var dialog=document.createElement('div');dialog.className='fx-board-create';var name=document.createElement('input');name.value='新厂区 '+(f.blueprints.length+1);name.maxLength=48;name.setAttribute('aria-label','新画布名称');var size=document.createElement('select');size.setAttribute('aria-label','新画布尺寸');[64,128,256].forEach(function(n){var o=document.createElement('option');o.value=n;o.textContent=n+'×'+n;o.selected=n===128;size.appendChild(o);});dialog.append(name,size);
      var location=document.createElement('select');location.setAttribute('aria-label','新画布所在地');BLUEPRINTS.locations(S).forEach(function(d){var o=document.createElement('option');o.value=d.id;o.textContent=d.name;o.selected=d.id===board.dimension;location.appendChild(o);});dialog.appendChild(location);
      action(dialog,'创建',function(){if(!ITEM_DRAG.returnHeld())return;var r=BLUEPRINTS.create(S,name.value,+size.value,+size.value,location.value);if(r.ok)switchBoard(r.blueprint.id);});action(dialog,'取消',function(){dialog.remove();});manager.querySelector('.fx-board-create')?.remove();manager.appendChild(dialog);name.focus();
    });
    wrap.appendChild(manager);

    /* --- 工具条 --- */
    var bar = document.createElement('div');
    bar.className = 'fx-bar fx-controls';
    var selectionInfo=document.createElement('div');selectionInfo.className='fx-selection-info';bar.appendChild(selectionInfo);
    var heldInfo=document.createElement('div');heldInfo.className='fx-held-info';selectionInfo.appendChild(heldInfo);
    var sizeControls=document.createElement('div');sizeControls.className='fx-placement-size';sizeControls.hidden=true;selectionInfo.appendChild(sizeControls);
    function syncPlacementSize(held){
      var fields=!st.plan&&held&&window.MULTIBLOCKS?MULTIBLOCKS.dimensions({k:st.place}):[];sizeControls.hidden=!fields.length;
      if(sizeControls._key===(held?st.place:null))return;sizeControls._key=held?st.place:null;sizeControls.innerHTML='';
      fields.forEach(function(field){var label=document.createElement('label'),select=document.createElement('select');label.textContent=field.label;select.dataset.placementSize=field.key;select.setAttribute('aria-label','放置'+field.label);for(var n=field.min;n<=field.max;n+=field.step||1){var opt=document.createElement('option');opt.value=n;opt.textContent=field.choices?(field.choices.find(function(c){return c[0]===n;})||[n,n])[1]:n;select.appendChild(opt);}select.value=st.placeSource.structureSize[field.key];select.onchange=function(){if(!heldItem(S))return;st.placeSource.structureSize[field.key]=+select.value;syncGhost();syncHover();};label.appendChild(select);sizeControls.appendChild(label);});
    }
    var pipeInfo=document.createElement('div');pipeInfo.className='fx-pipe-info';selectionInfo.appendChild(pipeInfo);
    var toolset=document.createElement('div');toolset.className='fx-toolset';bar.appendChild(toolset);
    wrap.classList.toggle('fx-show-status',f.showStatus===true);var statusToggle=document.createElement('button');statusToggle.className='fx-tool'+(f.showStatus===true?' on':'');statusToggle.dataset.showStatus='1';statusToggle.setAttribute('aria-pressed',String(f.showStatus===true));statusToggle.textContent='显示状态：'+(f.showStatus===true?'开':'关');statusToggle.onclick=function(){f.showStatus=f.showStatus!==true;statusToggle.classList.toggle('on',f.showStatus);statusToggle.setAttribute('aria-pressed',String(f.showStatus));statusToggle.textContent='显示状态：'+(f.showStatus?'开':'关');wrap.classList.toggle('fx-show-status',f.showStatus);updateCards(f);if(save)save();};toolset.appendChild(statusToggle);
    var autoConnect=document.createElement('button');autoConnect.className='fx-tool'+(f.autoConnect===true?' on':'');autoConnect.dataset.autoConnect='1';autoConnect.setAttribute('aria-pressed',String(f.autoConnect===true));autoConnect.textContent='自动连接：'+(f.autoConnect===true?'开':'关');autoConnect.onclick=function(){f.autoConnect=f.autoConnect!==true;autoConnect.classList.toggle('on',f.autoConnect);autoConnect.setAttribute('aria-pressed',String(f.autoConnect));autoConnect.textContent='自动连接：'+(f.autoConnect?'开':'关');if(save)save();};toolset.appendChild(autoConnect);
    var demolition=document.createElement('button');demolition.className='fx-tool'+(st.demolition?' on':'');demolition.dataset.demolitionToggle='1';demolition.setAttribute('aria-pressed',String(st.demolition));demolition.textContent='右键拆除：'+(st.demolition?'开':'关');demolition.onclick=function(){st.demolition=!st.demolition;demolition.classList.toggle('on',st.demolition);demolition.setAttribute('aria-pressed',String(st.demolition));demolition.textContent='右键拆除：'+(st.demolition?'开':'关');if(window.ITEM_DRAG)ITEM_DRAG.syncCursor();};toolset.appendChild(demolition);
    var rotation=document.createElement('span');rotation.innerHTML=UI_KIT.rotation();rotation.hidden=!(st.move&&MULTIBLOCKS.shape(ENTITIES.get(S,st.move.uid)));rotation.onclick=function(e){var b=e.target.closest('[data-rotate]');if(b&&st.move){st.move.rotation=(st.move.rotation+Number(b.dataset.rotate)+4)%4;syncGhost();syncHover();}};toolset.appendChild(rotation);
    wrap.appendChild(bar);

    /* --- 图纸 --- */
    var viewport=document.createElement('div');viewport.className='fx-viewport';wrap.appendChild(viewport);
    var stage = document.createElement('div');
    stage.className = 'fx-stage';
    stage.style.width = (f.w * U*camera.zoom) + 'px';
    stage.style.height = (f.h * U*camera.zoom) + 'px';
    viewport.appendChild(stage);
    var world=document.createElement('div');world.className='fx-world';world.style.width=(f.w*U)+'px';world.style.height=(f.h*U)+'px';world.style.transform='scale('+camera.zoom+')';stage.appendChild(world);
    var hoverCell=document.createElement('div');hoverCell.className='fx-cell-hover';hoverCell.hidden=true;hoverCell.setAttribute('aria-hidden','true');world.appendChild(hoverCell);
    var spaceSignature=null,spaceResult=null,lastPlanConflict=null;
    function planSpace(c){var p=st.plan,anchor=p.phase==='fixed'?p.anchor:c,sig=JSON.stringify([p.k,p.rotation,p.size,p.variant,anchor,p.blueprintId]);if(sig!==spaceSignature){spaceResult=STRUCTURE_PLACEMENT.check(S,p,anchor);spaceSignature=sig;}return spaceResult;}
    function syncPlan(){if(!planWindow)return;var p=st.plan,m=p&&p.phase==='fixed'&&STRUCTURE_PLACEMENT.candidate(p);planWindow.update(p,m,m?planSpace():{ok:false},!!heldItem(S));}
    function syncHover(e){
      if(e)linePointer={clientX:e.clientX,clientY:e.clientY};
      var hit=linePointer&&document.elementFromPoint(linePointer.clientX,linePointer.clientY),c=hit&&viewport.contains(hit)&&!hit.closest('.fx-connection-editor')?cellOf(cv,f,linePointer):null;
      var fixed=st.plan&&st.plan.phase==='fixed';
      if(!c&&!fixed){hoverCell.hidden=true;if(ghost)ghost.hidden=true;syncPlan();return;}
      var moving=st.move&&ENTITIES.get(S,st.move.uid),held=moving||heldItem(S),candidate=fixed?STRUCTURE_PLACEMENT.candidate(st.plan):held&&c?moving?moveCandidate(moving,c):placementCandidate(held.k,c.x,c.y):null;
      if(ghost){ghost.hidden=(!held&&!fixed)||!!(c&&st.selectedPipe&&st.selectedPipe.cell===key(c.x,c.y));if(candidate){ghost.style.left=candidate.x*U+'px';ghost.style.top=candidate.y*U+'px';ghost.classList.toggle('fixed',!!fixed);ghost.classList.toggle('bad',fixed?!planSpace().ok||!held:moving?!GRID_SPACE.check(S,candidate,{excludeUid:moving.uid,blueprintId:f.activeBlueprintId}).ok:!validPlacement(c));}}
      syncPlan();if(!c){hoverCell.hidden=true;return;}
      hoverCell.hidden=false;var left=c.x*U+'px',top=c.y*U+'px';if(hoverCell.style.left!==left)hoverCell.style.left=left;if(hoverCell.style.top!==top)hoverCell.style.top=top;
    }
    function clearHover(){linePointer=null;hoverCell.hidden=true;if(ghost&&!(st.plan&&st.plan.phase==='fixed'))ghost.hidden=true;}
    viewport.addEventListener('pointermove',syncHover);viewport.addEventListener('pointerleave',clearHover);viewport.addEventListener('pointercancel',clearHover);
    function changeZoom(next,clientX,clientY){
      next=Math.max(0.1,Math.min(1.5,next));var old=camera.zoom,r=viewport.getBoundingClientRect(),appZoom=typeof uiZoom==='function'?uiZoom():1;
      var px=clientX==null?viewport.clientWidth/2:(clientX-r.left)/appZoom,py=clientY==null?viewport.clientHeight/2:(clientY-r.top)/appZoom;
      var wx=(viewport.scrollLeft+px)/old,wy=(viewport.scrollTop+py)/old;camera.zoom=next;
      stage.style.width=(f.w*U*next)+'px';stage.style.height=(f.h*U*next)+'px';world.style.transform='scale('+next+')';
      viewport.scrollLeft=wx*next-px;viewport.scrollTop=wy*next-py;camera.x=viewport.scrollLeft/next;camera.y=viewport.scrollTop/next;
      requestViewportPaint(true);if(save)save();
    }
    action(cameraTools,'−',function(){changeZoom(camera.zoom/1.25);}).setAttribute('aria-label','缩小画布');
    action(cameraTools,'＋',function(){changeZoom(camera.zoom*1.25);}).setAttribute('aria-label','放大画布');

    var ghost = document.createElement('div');
    ghost.className = 'fx-ghost';
    ghost.hidden = true;
    function syncGhost(){var moving=st.move&&ENTITIES.get(S,st.move.uid),k=moving?moving.k:st.place;if(!k)return;var candidate=moving?Object.assign({},moving,{rotation:st.move.rotation}):(st.plan&&st.plan.phase==='fixed'?STRUCTURE_PLACEMENT.candidate(st.plan):placementCandidate(k,0,0)),placeShape=window.MULTIBLOCKS&&MULTIBLOCKS.bounds(candidate);ghost.classList.toggle('fx-structure-ghost',!!placeShape);ghost.style.width=(placeShape?placeShape.w:1)*U+'px';ghost.style.height=(placeShape?placeShape.h:1)*U+'px';ghost.innerHTML=placeShape?MULTIBLOCK_UI.bodyHtml(candidate,U,true):GRID_TRANSPORTS.definition(k)?iconHtml(k,40):faceHtml(k,MACHINE_ICON);}
    syncGhost();
    world.appendChild(ghost);
    var planWindow=window.STRUCTURE_PLACEMENT_UI?STRUCTURE_PLACEMENT_UI.mount(wrap,{viewport:viewport,zoom:function(){return typeof uiZoom==='function'?uiZoom():1;},rect:function(){return ghost.getBoundingClientRect();},name:nameOf_,
      cancel:function(){cancelPlace(S,save);},
      reposition:function(){if(!st.plan)return;STRUCTURE_PLACEMENT.reposition(st.plan);spaceSignature=null;lastPlanConflict=null;linePointer=null;syncGhost();syncHover();if(window.ITEM_DRAG)ITEM_DRAG.syncCursor();},
      change:function(field,value){if(!st.plan)return;var changed=STRUCTURE_PLACEMENT.change(st.plan,field,value);if(!changed.ok)return;st.placeSource.structureSize=st.plan.size;spaceSignature=null;syncGhost();syncHover();var result=planSpace(),conflict=result.ok?null:JSON.stringify([result.code,result.cell]);if(conflict&&conflict!==lastPlanConflict)toast(result.code==='BOUNDS'?'结构超出产线边界，无法放置':'结构与已有设施重叠，无法放置');lastPlanConflict=conflict;},
      confirm:function(){var plan=st.plan;if(!plan||!heldItem(S)){syncPlan();return;}var r=STRUCTURE_PLACEMENT.commit(S,plan,st.placeSource);if(!r.ok){spaceSignature=null;syncHover();toast(r.code==='BOUNDS'?'结构超出产线边界，无法放置':r.code==='OCCUPIED'?'结构与已有设施重叠，无法放置':'代表方块不可用，请重新选择');return;}st.plan=null;st.selectedPipe=null;heldItem(S);if(st.place){st.plan=STRUCTURE_PLACEMENT.begin(st.place,BLUEPRINTS.active(S).id);st.placeSource.structureSize=st.plan.size;}camera.x=viewport.scrollLeft/camera.zoom;camera.y=viewport.scrollTop/camera.zoom;if(save)save();if(typeof markInv==='function')markInv();if(typeof renderInv==='function')renderInv();render(S,save);}
    }):null;

    var cv = document.createElement('canvas');
    cv.width = 1;cv.height = 1;cv._fxViewport=viewport;cv._fxCamera=camera;
    cv.className = 'fx-cv';
    stage.appendChild(cv);

    var selectionOutline=document.createElement('div');selectionOutline.className='fx-connection-outline';selectionOutline.hidden=true;world.appendChild(selectionOutline);
    var neighborOutline=document.createElement('div');neighborOutline.className='fx-connection-preview';neighborOutline.hidden=true;world.appendChild(neighborOutline);
    var previewLine=document.createElement('div');previewLine.className='fx-edge-preview';previewLine.hidden=true;world.appendChild(previewLine);
    var editor=document.createElement('div');editor.className='fx-connection-editor';editor.hidden=true;stage.appendChild(editor);
    var directionNames=['上','右','下','左'],directionButtons=[];
    function clearPreview(){neighborOutline.hidden=true;previewLine.hidden=true;}
    function previewDirection(side){var selected=st.selectedPipe;if(!selected||!GRID_TRANSPORTS.target(BLUEPRINTS.view(f),selected.kind,selected.cell,side))return;var a=selected.cell.split(',').map(Number),n=PIPE_CONNECTIONS.near(selected.cell,side).split(',').map(Number),length=f[selected.kind][key(n[0],n[1])]?U:U-MACHINE_ICON/2;neighborOutline.hidden=false;neighborOutline.style.left=n[0]*U+'px';neighborOutline.style.top=n[1]*U+'px';previewLine.hidden=false;previewLine.style.left=(a[0]*U+U/2)+'px';previewLine.style.top=(a[1]*U+U/2-6)+'px';previewLine.style.width=length+'px';previewLine.style.transform='rotate('+[-90,0,90,180][side]+'deg)';}
    for(var side=0;side<4;side++)(function(d){var b=document.createElement('button');b.type='button';b.className='fx-connection-side fx-connection-side-'+d;b.dataset.pipeSide=d;b.textContent=['↑','→','↓','←'][d];b.onmouseenter=function(){previewDirection(d);};b.onmouseleave=clearPreview;b.onfocus=function(){previewDirection(d);};b.onblur=clearPreview;b.onclick=function(e){e.stopPropagation();var selected=st.selectedPipe;if(!selected)return;var view=BLUEPRINTS.view(f),on=!GRID_TRANSPORTS.connected(view,selected.kind,selected.cell,d),r=GRID_TRANSPORTS.set(S,selected.kind,selected.cell,d,on);if(r.ok){if(save)save();paint(cv.getContext('2d'),f);syncEditor();}};editor.appendChild(b);directionButtons.push(b);})(side);
    var pipeSettings=document.createElement('button');pipeSettings.type='button';pipeSettings.className='fx-connection-settings';pipeSettings.title='管道设置';pipeSettings.setAttribute('aria-label','管道设置');pipeSettings.onclick=function(e){e.stopPropagation();if(st.selectedPipe)openPipeSettings(st.selectedPipe.cell,S,save,st.selectedPipe.kind);};editor.appendChild(pipeSettings);
    var demolishBtn=document.createElement('button');demolishBtn.type='button';demolishBtn.className='fx-connection-demolish';demolishBtn.title='拆除这一格';demolishBtn.setAttribute('aria-label','拆除这一格');
    demolishBtn.innerHTML='<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3 5h10M6 5V3h4v2M4.5 5l.6 8h5.8l.6-8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    demolishBtn.onclick=function(e){
      e.stopPropagation();e.preventDefault();
      var sel=st.selectedPipe;if(!sel)return;
      var r=GRID_TRANSPORTS.remove(S,sel.kind,sel.cell);
      if(!r||!r.ok){if(typeof toast==='function')toast('这一格没有可拆除的管线');return;}
      transferTip({produced:r.produced||[],moved:r.moved||0,discarded:r.discarded||0,toBag:r.toBag||0,toWarehouse:r.toWarehouse||0,toDrops:r.toDrops||0},'收回');
      var rest=GRID_TRANSPORTS.kinds().filter(function(kind){return !!f[kind][sel.cell];});
      if(rest.length){sel.kind=rest[0];}else st.selectedPipe=null;
      if(typeof markInv==='function')markInv();
      if(typeof renderInv==='function')renderInv();
      if(save)save();repaint();syncEditor();
    };
    editor.appendChild(demolishBtn);
    var kinds=document.createElement('div');kinds.className='fx-connection-kinds';editor.appendChild(kinds);
    var kindLabels={item:'物品',fluid:'流体',wire:'电缆',eioItem:'物品',eioFluid:'流体'};
    kinds.onclick=function(e){
      var button=e.target.closest('[data-connection-kind]');
      if(!button||!st.selectedPipe)return;
      e.stopPropagation();
      if(button.dataset.connectionKind==='machine'){
        var xy=st.selectedPipe.cell.split(',').map(Number),m=machineAt(f,xy[0],xy[1]);
        if(m)openDetail(m.uid,f,S,save);
        return;
      }
      st.selectedPipe.kind=button.dataset.connectionKind;syncEditor();
    };
    function syncEditor(){
      clearPreview();var selected=st.selectedPipe,view=BLUEPRINTS.view(f),p=selected&&f[selected.kind][selected.cell];
      var held=heldItem(S),heldCount=held?S.inv.reduce(function(n,item){return n+(item&&CONTENT.canonicalKey(item.k)===st.place?(item.n==null?1:item.n):0);},0):0;heldInfo.innerHTML=held?iconHtml(st.place,24)+'<span>'+esc(nameOf_(st.place))+'</span><b>×'+heldCount+'</b>':'';heldInfo.hidden=!held;
      if(st.move){var moving=ENTITIES.get(S,st.move.uid);heldInfo.hidden=false;heldInfo.textContent='移动 '+(moving?nameOf_(moving.k):'设备')+'，点击新位置，右键 / Esc 取消';}
      syncPlacementSize(held);
      if(window.ITEM_DRAG)ITEM_DRAG.syncCursor();
      if(!p){editor.hidden=true;selectionOutline.hidden=true;pipeInfo.innerHTML='';pipeInfo.hidden=true;return;}
      pipeInfo.hidden=false;
      var xy=selected.cell.split(',').map(Number),scale=Math.max(.75,Math.min(1,camera.zoom)),half=48*scale,left=(xy[0]+.5)*U*camera.zoom,top=(xy[1]+.5)*U*camera.zoom;
      selectionOutline.hidden=false;selectionOutline.style.left=xy[0]*U+'px';selectionOutline.style.top=xy[1]*U+'px';editor.hidden=false;
      if(left+U*camera.zoom/2<viewport.scrollLeft||left-U*camera.zoom/2>viewport.scrollLeft+viewport.clientWidth||top+U*camera.zoom/2<viewport.scrollTop||top-U*camera.zoom/2>viewport.scrollTop+viewport.clientHeight){editor.hidden=true;return;}
      var types=GRID_TRANSPORTS.at(view,selected.cell),occupant=machineAt(f,xy[0],xy[1]);
      var shared=occupant&&DEFS.of(occupant.k)?.sharedGridLayers?.includes(selected.kind);
      if(shared)types.push('machine');
      var kindList=types.join(',');
      kinds.hidden=types.length<2;
      if(kinds._list!==kindList){
        kinds.innerHTML=types.map(function(kind){return '<button type="button" class="fx-tool" data-connection-kind="'+kind+'">'+(kind==='machine'?'ME':kindLabels[kind])+'</button>';}).join('');
        kinds._list=kindList;
      }
      Array.from(kinds.children).forEach(function(b){var on=b.dataset.connectionKind===selected.kind;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});
      var halfWidth=kinds.hidden?half:Math.max(half,kinds.offsetWidth*scale/2);
      var topSpace=kinds.hidden?half:half-kinds.offsetTop*scale;
      var right=Math.min(stage.clientWidth,viewport.scrollLeft+viewport.clientWidth);
      var bottom=Math.min(stage.clientHeight,viewport.scrollTop+viewport.clientHeight);
      left=Math.max(viewport.scrollLeft+halfWidth+3,Math.min(left,right-halfWidth-3));
      top=Math.max(viewport.scrollTop+topSpace+3,Math.min(top,bottom-half-3));
      editor.style.left=left+'px';editor.style.top=top+'px';editor.style.transform='translate(-50%,-50%) scale('+scale+')';editor.classList.toggle('compact',camera.zoom<.75);editor.dataset.cell=selected.cell;
      directionButtons.forEach(function(b,d){var enabled=GRID_TRANSPORTS.target(view,selected.kind,selected.cell,d),on=enabled&&GRID_TRANSPORTS.connected(view,selected.kind,selected.cell,d);b.disabled=!enabled;b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label','向'+directionNames[d]+(on?'断开':'连接'));});
      pipeSettings.innerHTML=p.pipeKey?iconHtml(p.pipeKey,26):UI_KIT.glyph('settings',22);
      var name=p.pipeKey?nameOf_(p.pipeKey):({item:'物品管',fluid:'流体管',wire:'电缆'})[selected.kind];pipeInfo.innerHTML='<span>'+esc(name)+'</span>';
    }

    var machineBuckets={},machineCards=new Map();
    function indexMachines(){
      machineBuckets={};
      f.machines.forEach(function (m, i) {
        if(!ENTITIES.isGrid(m)||!BLUEPRINTS.here(f,m))return;
        var shape=window.MULTIBLOCKS&&MULTIBLOCKS.bounds(m)||{w:1,h:1};for(var bx=Math.floor(m.x/8);bx<=Math.floor((m.x+shape.w-1)/8);bx++)for(var by=Math.floor(m.y/8);by<=Math.floor((m.y+shape.h-1)/8);by++){var k=key(bx,by);if(!machineBuckets[k])machineBuckets[k]=[];machineBuckets[k].push({m:m,i:i});}
      });
    }
    // Only viewport cards exist in the DOM. Panning reuses UID cards, while all
    // offscreen machines continue to use the unchanged global simulation.
    function syncMachines(force){
      var x0=Math.max(0,Math.floor(viewport.scrollLeft/camera.zoom/U)-2),y0=Math.max(0,Math.floor(viewport.scrollTop/camera.zoom/U)-2);
      var x1=Math.min(f.w-1,Math.ceil((viewport.scrollLeft+viewport.clientWidth)/camera.zoom/U)+2),y1=Math.min(f.h-1,Math.ceil((viewport.scrollTop+viewport.clientHeight)/camera.zoom/U)+2),wanted=new Set();
      for(var bx=Math.floor(x0/8);bx<=Math.floor(x1/8);bx++)for(var by=Math.floor(y0/8);by<=Math.floor(y1/8);by++)(machineBuckets[key(bx,by)]||[]).forEach(function(entry){
        var m=entry.m,i=entry.i,shape=window.MULTIBLOCKS&&MULTIBLOCKS.bounds(m);if(m.x+(shape?shape.w:1)<=x0||m.x>x1||m.y+(shape?shape.h:1)<=y0||m.y>y1)return;wanted.add(m.uid);var existing=machineCards.get(m.uid);if(existing&&!force)return;
        var el = existing||document.createElement('div');
        el._fxMachine=m;
        el._workVisualSignature=null;el._aeVisualRevision=null;
        el.className = 'fx-m'+(shape?' fx-multiblock':'')+(shape&&shape.room?' fx-cleanroom':'');
        el.setAttribute('data-m', i);            // 给 updateCards 用来定位
        el.setAttribute('data-uid', m.uid);       // 点击用编号，别用下标
        el.style.left = (m.x * U) + 'px';
        el.style.top = (m.y * U) + 'px';
        el.style.width = U*(shape?shape.w:1) + 'px';el.style.height = U*(shape?shape.h:1) + 'px';
        if(shape){el.style.setProperty('--mb-cx',(shape.cx+.5)*U+'px');el.style.setProperty('--mb-cy',(shape.cy+.5)*U+'px');}
        var state=MACHINE_STATUS.read(m);el.dataset.state=state.tone;el.dataset.status=state.key;el.dataset.tip=nameOf_(m.k)+'，'+state.detail+(m.note?'\n'+m.note:'');el.setAttribute('aria-label',el.dataset.tip);
        var sharedLayers=DEFS.of(m.k)?.sharedGridLayers,cell=key(m.x,m.y);
        var shared=!!(sharedLayers&&sharedLayers.some(function(layer){return !!f[layer]?.[cell];}));
        el.toggleAttribute('data-shared-conduit',shared);
        var body = (shape?MULTIBLOCK_UI.bodyHtml(m,U):window.AE_PRESENTATION&&AE_PRESENTATION.supported(m)?'<span data-ae-face>'+AE_PRESENTATION.body(m,MACHINE_ICON,S,shared)+'</span>':window.TANK_PRESENTATION&&TANK_PRESENTATION.supported(m)?TANK_PRESENTATION.body(m,MACHINE_ICON):faceHtml(m.k, MACHINE_ICON)) +
          (shape?'<span class="fx-unformed"'+(m.structure&&m.structure.formed?' hidden':'')+' aria-label="结构未完成">!</span>':'')+'<span class="fx-status" data-status-key="'+state.key+'" data-tone="'+state.tone+'" aria-hidden="true">'+MACHINE_STATUS.html(state)+'</span>';
        if(el._body!==body){UI_KIT.patch(el,body);el._body=body;}if(window.MACHINE_VISUALS&&!existing)MACHINE_VISUALS.refresh(m,el,state);if(!existing)world.appendChild(el);
        machineCards.set(m.uid,el);
      });
      machineCards.forEach(function(el,uid){if(!wanted.has(uid)){el.remove();machineCards.delete(uid);}});
    }

    var viewportFrame=0, viewportMoved=false;
    function requestViewportPaint(moved){
      viewportMoved=viewportMoved||moved;
      if(viewportFrame)return;
      viewportFrame=requestAnimationFrame(function(){
        viewportFrame=0;
        var moved=viewportMoved;
        viewportMoved=false;
        if(!viewport.isConnected||S.ui.page!=='line')return;
        if(moved){syncMachines();syncHover();syncEditor();}
        paint(cv.getContext('2d'),f);
      });
    }
    cv._fxRequestPaint=requestViewportPaint;
    function repaint() {
      spaceSignature=null;
      if(window.AE_FACTORY)AE_FACTORY.prepare(S);
      indexMachines();syncMachines(true);updateCards(f);
      syncHover();requestViewportPaint();
    }

    host.innerHTML = '';
    host.appendChild(wrap);
    strip.scrollLeft=stripOffset;
    revealBoard(currentButton);
    if(boardFocus)currentButton.focus({preventScroll:true});
    host._fxPlacementState=S;host._fxPlacementUpdate=function(){if(S.ui.page==='line'&&st.plan){syncHover();syncEditor();}};
    window.__fxRepaint = function () { repaint(); };
    viewport.scrollLeft=camera.x*camera.zoom;viewport.scrollTop=camera.y*camera.zoom;
    if(window.AE_FACTORY)AE_FACTORY.prepare(S);
    indexMachines();syncMachines();
    var viewSave;function rememberView(){camera.x=viewport.scrollLeft/camera.zoom;camera.y=viewport.scrollTop/camera.zoom;if(viewSave)clearTimeout(viewSave);viewSave=setTimeout(function(){if(save)save();},200);}
    viewport.addEventListener('scroll',function(){rememberView();requestViewportPaint(true);});
    var dragPan=null;
    viewport._fxMachineAt=function(e){if(e.target.closest('.fx-connection-editor'))return null;var c=cellOf(cv,f,e);return c&&machineAt(f,c.x,c.y);};
    viewport._fxCellAt=function(e){if(e.target.closest('.fx-connection-editor'))return null;return cellOf(cv,f,e);};
    viewport._fxMachineEl=function(uid){return viewport.querySelector('.fx-m[data-uid="'+String(uid).replace(/"/g,'')+'"]');};
    viewport.addEventListener('pointerdown',function(e){if(e.button!==1)return;e.preventDefault();e.stopPropagation();dragPan={id:e.pointerId,x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.setPointerCapture(e.pointerId);},true);
    viewport.addEventListener('pointermove',function(e){if(!dragPan)return;e.preventDefault();var z=typeof uiZoom==='function'?uiZoom():1;viewport.scrollLeft=dragPan.left-(e.clientX-dragPan.x)/z;viewport.scrollTop=dragPan.top-(e.clientY-dragPan.y)/z;});
    function endPan(e){if(!dragPan)return;var pan=dragPan;dragPan=null;rememberView();if(e.type==='pointerup'&&Math.hypot(e.clientX-pan.x,e.clientY-pan.y)<5){var c=cellOf(cv,f,e),m=c&&machineAt(f,c.x,c.y);if(m&&!st.plan&&!(window.ITEM_CURSOR&&ITEM_CURSOR.held(S)))beginMove(m.uid,S,save);}}
    viewport.addEventListener('pointerup',endPan);viewport.addEventListener('pointercancel',endPan);
    if(window.ResizeObserver){host._fxObserver=new ResizeObserver(function(){requestViewportPaint(true);});host._fxObserver.observe(viewport);}
    paint(cv.getContext('2d'), f);syncHover();syncEditor();
    host._fxView={state:S,board:board,key:viewKey,wrap:wrap,boardStrip:strip,refresh:function(){
      wrap.classList.toggle('fx-show-status',f.showStatus===true);
      statusToggle.classList.toggle('on',f.showStatus===true);statusToggle.setAttribute('aria-pressed',String(f.showStatus===true));statusToggle.textContent='显示状态：'+(f.showStatus===true?'开':'关');
      autoConnect.classList.toggle('on',f.autoConnect===true);autoConnect.setAttribute('aria-pressed',String(f.autoConnect===true));autoConnect.textContent='自动连接：'+(f.autoConnect===true?'开':'关');
      demolition.classList.toggle('on',st.demolition);demolition.setAttribute('aria-pressed',String(st.demolition));demolition.textContent='右键拆除：'+(st.demolition?'开':'关');
      rotation.hidden=!(st.move&&MULTIBLOCKS.shape(ENTITIES.get(S,st.move.uid)));
      syncGhost();repaint();syncEditor();
    }};

    /* --- 图纸上的操作 --- */
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    function validPlacement(c,itemKey){
      var k=itemKey||st.place;if(!c||!k)return false;var p=GRID_TRANSPORTS.definition(k),kk=key(c.x,c.y),m=machineAt(f,c.x,c.y);
      if(st.plan&&st.plan.k===k)return planSpace(c).ok;
      if(window.MULTIBLOCKS&&MULTIBLOCKS.casingItem(S,k))return !!MULTIBLOCKS.casingTarget(S,c.x,c.y,k);
      if(window.MULTIBLOCKS&&MULTIBLOCKS.feedKey(k))return !!MULTIBLOCKS.wallTarget(S,c.x,c.y,k);
      if(k==='gregtech:gt.blockreinforced@2'&&window.MULTIBLOCKS)return !!MULTIBLOCKS.roomHole(S,c.x,c.y)&&!m&&!GRID_TRANSPORTS.at(BLUEPRINTS.view(f),kk).length&&!f.chest[kk];
      return GRID_SPACE.check(S,placementCandidate(k,c.x,c.y),p?{kind:p.kind}:{}).ok;
    }
    function placeAt(c){
      if(!validPlacement(c)){toast('这个格子放不下所选物品');return;}
      if(!heldItem(S)){syncEditor();syncHover();return;}
      if(st.plan){var pinned=STRUCTURE_PLACEMENT.freeze(S,st.plan,c);if(!pinned.ok)return;st.selectedPipe=null;spaceSignature=null;syncGhost();syncHover();syncEditor();return true;}
      return commitPlacement(c,st.place,st.placeSource);
    }
    function commitPlacement(c,k,source){
      source=Object.assign({},source,{structureSize:placementCandidate(k,c.x,c.y).structureSize});
      var p=GRID_TRANSPORTS.definition(k),room=k==='gregtech:gt.blockreinforced@2'&&window.MULTIBLOCKS&&MULTIBLOCKS.roomHole(S,c.x,c.y),r=window.MULTIBLOCKS&&MULTIBLOCKS.casingItem(S,k)?MULTIBLOCKS.placeCasing(S,c.x,c.y,k,source):window.MULTIBLOCKS&&MULTIBLOCKS.feedKey(k)?MULTIBLOCKS.placeFeed(S,c.x,c.y,k,source):room?MULTIBLOCKS.repairWall(S,room,c.x,c.y,source):p?GRID_TRANSPORTS.place(S,p.kind,key(c.x,c.y),k,source):ENTITIES.deploy(S,k,{kind:'grid',x:c.x,y:c.y},true,source);
      if(!r.ok){toast(({INPUT:'物品栏里没有所选管道',NO_MACHINE:'物品栏里没有所选机器',CONTENTS:'新管道容量不足',FLUID_COMPATIBILITY:'新管道无法输送当前流体',EIO_GT_CONFLICT:'EIO管道不可以与GT管道放在一起',OCCUPIED:'这个格子已被占用'})[r.code]||'无法放置');return;}
      st.selectedPipe=null;heldItem(S);
      camera.x=viewport.scrollLeft/camera.zoom;camera.y=viewport.scrollTop/camera.zoom;if(save)save();if(typeof markInv==='function')markInv();if(typeof renderInv==='function')renderInv();render(S,save);return true;
    }
    viewport._fxInventoryDrop=function(e,index,commit){
      var item=S.inv[index];if(!item||S.ui.page!=='line')return false;var k=CONTENT.canonicalKey(item.k),d=DEFS.of(k),p=GRID_TRANSPORTS.definition(k);
      if(!p&&(!d||d.worldOnly||d.attachmentOnly)&&!(window.MULTIBLOCKS&&(MULTIBLOCKS.feedKey(k)||MULTIBLOCKS.casingItem(S,k))))return false;
      if(window.STRUCTURE_PLACEMENT&&STRUCTURE_PLACEMENT.supports(k)){
        var point=cellOf(cv,f,e),draft=st.plan&&st.place===k&&st.placeSource.bagIndex===index?st.plan:STRUCTURE_PLACEMENT.begin(k,BLUEPRINTS.active(S).id),space=point&&STRUCTURE_PLACEMENT.check(S,draft,point);if(!space||!space.ok)return false;
        if(commit){if(!STRUCTURE_PLACEMENT.freeze(S,draft,point).ok)return false;st.owner=S;st.move=null;st.place=k;st.selectedPipe=null;st.plan=draft;st.placeSource={bagIndex:index,entityUid:item.entityUid||null,fresh:!item.entityUid,structureSize:draft.size};render(S,save);}return true;
      }
      var c=cellOf(cv,f,e);syncHover(e);ghost.hidden=true;if(!validPlacement(c,k)){if(commit&&c&&p&&GRID_SPACE.check(S,placementCandidate(k,c.x,c.y),{kind:p.kind}).code==='EIO_GT_CONFLICT')toast('EIO管道不可以与GT管道放在一起');return false;}
      return commit?!!commitPlacement(c,k,{bagIndex:index,entityUid:item.entityUid||null,fresh:!item.entityUid}):true;
    };
    viewport._fxEndInventoryDrag=function(){linePointer=null;hoverCell.hidden=true;if(st.plan&&st.plan.phase==='fixed')syncHover();else ghost.hidden=true;};
    function eraseCell(e){var selected=e.target.closest('.fx-connection-editor')&&st.selectedPipe,xy=selected&&selected.cell.split(',').map(Number);return xy?{x:xy[0],y:xy[1]}:cellOf(cv,f,e);}
    function eraseAt(e){
      var c=eraseCell(e);if(!c)return;var m=machineAt(f,c.x,c.y),kk=key(c.x,c.y),results=[];
      if(m){var shape=window.MULTIBLOCKS&&MULTIBLOCKS.bounds(m);if(shape&&(c.x-m.x!==shape.cx||c.y-m.y!==shape.cy)){if(!rightDragNotice){toast('请拆除多方块的控制器');rightDragNotice=true;}return;}var r=ENTITIES.dismantle(S,m.uid,{empty:!!e.shiftKey});if(r.ok)results.push(r);else if(r.code==='RELAY_BUSY'&&!rightDragNotice){toast('还有原料待送，请先取消对应的合成订单');rightDragNotice=true;}}
      else GRID_TRANSPORTS.kinds().forEach(function(kind){if(!f[kind][kk])return;var r=GRID_TRANSPORTS.remove(S,kind,kk);if(r.ok)results.push(r);});
      if(results.length){var result=results.reduce(function(out,r){out.produced=out.produced.concat(r.produced||[]);['moved','discarded','toBag','toWarehouse','toDrops'].forEach(function(k){out[k]+=r[k]||0;});return out;},{ok:true,produced:[],moved:0,discarded:0,toBag:0,toWarehouse:0,toDrops:0});transferTip(result,'收回');if(st.selectedPipe&&st.selectedPipe.cell===kk)st.selectedPipe=null;if(typeof markInv==='function')markInv();if(typeof renderInv==='function')renderInv();if(save)save();repaint();syncEditor();}
    }
    var rightDrag=false,rightDragNotice=false;
    viewport.addEventListener('wheel',function(e){if(!e.deltaY)return;e.preventDefault();changeZoom(camera.zoom*(e.deltaY>0?0.85:1/0.85),e.clientX,e.clientY);},{passive:false});
    viewport.addEventListener('pointerdown',function(e){if(e.button!==2)return;e.preventDefault();e.stopImmediatePropagation();rightDrag=false;rightDragNotice=false;if(window.ITEM_CURSOR&&ITEM_CURSOR.held(S)){ITEM_DRAG.returnHeld();return;}if(st.plan&&st.plan.phase==='fixed'||st.move){cancelPlace(S,save);return;}if(!st.demolition){if(st.place)cancelPlace(S,save);return;}var c=eraseCell(e),k=c&&key(c.x,c.y);if(st.place&&c&&!machineAt(f,c.x,c.y)&&!GRID_TRANSPORTS.at(BLUEPRINTS.view(f),k).length&&!f.chest[k]){cancelPlace(S,save);return;}rightDrag=true;eraseAt(e);viewport.setPointerCapture(e.pointerId);},true);
    viewport.addEventListener('pointermove',function(e){if(window.ITEM_CURSOR&&ITEM_CURSOR.held(S)){rightDrag=false;return;}if(rightDrag&&st.demolition)eraseAt(e);});
    viewport.addEventListener('pointerup',function(){rightDrag=false;});viewport.addEventListener('pointercancel',function(){rightDrag=false;});
    stage.addEventListener('click',function(e){
      if(e.button!==0||e.target.closest('.fx-connection-editor'))return;var c=cellOf(cv,f,e);if(!c)return;
      if(st.plan&&st.plan.phase==='fixed'){e.stopPropagation();return;}
      if(st.move){var moving=st.move&&ENTITIES.get(S,st.move.uid),candidate=moving&&moveCandidate(moving,c),result=moving?GRID_SPACE.move(S,moving.uid,candidate.x,candidate.y,f.activeBlueprintId,st.move.rotation):{ok:false};if(!result.ok){toast(result.code==='BOUNDS'?'目标超出厂区边界':'目标被其他设备或管线占用');return;}st.move=null;camera.x=viewport.scrollLeft/camera.zoom;camera.y=viewport.scrollTop/camera.zoom;if(save)save();render(S,save);return;}
      if(st.place){var spec=GRID_TRANSPORTS.definition(st.place);if(spec&&GRID_SPACE.check(S,placementCandidate(st.place,c.x,c.y),{kind:spec.kind}).code==='EIO_GT_CONFLICT'){toast('EIO管道不可以与GT管道放在一起');return;}}
      if(st.place&&validPlacement(c)){e.stopPropagation();placeAt(c);return;}
      var m=machineAt(f,c.x,c.y),kk=key(c.x,c.y),heldPipe=st.place&&GRID_TRANSPORTS.definition(st.place),preferred=heldPipe&&f[heldPipe.kind][kk]&&heldPipe.kind;
      var kinds=GRID_TRANSPORTS.kinds().filter(function(kind){return !!f[kind][kk];});
      if(m&&!kinds.some(function(kind){return DEFS.of(m.k)?.sharedGridLayers?.includes(kind);})){
        var face=e.target.closest('[data-world-mb-face]');if(face&&window.MULTIBLOCK_UI)MULTIBLOCK_UI.select(m.uid,face.dataset.worldMbFace);st.selectedPipe=null;syncEditor();openDetail(m.uid,f,S,save);return;
      }
      if(kinds.length){st.selectedPipe={cell:kk,kind:preferred||(st.selectedPipe&&st.selectedPipe.cell===kk&&kinds.includes(st.selectedPipe.kind)?st.selectedPipe.kind:kinds[0])};syncEditor();syncHover();return;}
      if(st.plan){var space=planSpace(c);if(!space.ok)toast(space.code==='BOUNDS'?'结构超出产线边界，无法放置':'结构与已有设施重叠，无法放置');return;}
      st.selectedPipe=null;syncEditor();if(f.chest[kk])openChest(kk,f,S,save);
    });
    syncEditor();
  }

  // 画布上点到的位置是否能打开一个窗口；只做查询，不改状态。
  function windowState(){
    var S0=st&&st.owner;return S0||null;
  }
  function windowView(S0){
    var f=BLUEPRINTS.ensure(S0);return BLUEPRINTS.view(f,BLUEPRINTS.activeRepo(f));
  }
  function windowCanvas(){
    return document.querySelector('.fx-viewport canvas');
  }
  function windowTargetAt(e,state){
    var S0=state||windowState();if(!S0||!e||!e.target)return null;
    if(window.ITEM_CURSOR&&ITEM_CURSOR.held(S0))return null;
    if(st.place||st.move||st.plan)return null;
    var cv=windowCanvas();if(!cv)return null;
    var view=windowView(S0);
    var c=cellOf(cv,view,e);if(!c)return null;
    var m=machineAt(view,c.x,c.y);
    if(m)return{type:'machine',uid:m.uid};
    var kk=key(c.x,c.y);
    if(view.chest&&view.chest[kk])return{type:'chest',cell:kk};
    if(GRID_TRANSPORTS.at(view,kk).length)return{type:'pipe',cell:kk};
    return null;
  }
  function openWindowTarget(t){
    var S0=windowState();if(!S0||!t)return false;
    var view=windowView(S0);
    var persist=typeof save==='function'?save:null;
    if(t.type==='machine'){openDetail(t.uid,view,S0,persist);return true;}
    if(t.type==='chest'){openChest(t.cell,view,S0,persist);return true;}
    if(t.type==='pipe'){openPipeSettings(t.cell,S0,persist);return true;}
    return false;
  }

  window.FACTORY = {
    simTick:function(){return worldTick;},
    observeSimulation:function(fn){presentationObserver=fn;},
    resumeTiming:resumeTiming,configureTiming:configureTiming,timingStatus:timingStatus,hasPendingTicks:hasPendingTicks,interpolationSeconds:interpolationSeconds,
    ensure: ensure,
    render: render,
    tick: tick,
    clockState: clockState, checkpointClock:checkpointClock,
    restoreClock: restoreClock,
    takeSlot: takeSlot,
    toggleAuto: toggleAuto,
    toggleCircuit: toggleCircuit,
    toggleCoil: toggleCoil,
    toggleClean: toggleClean,
    setFace: setFace,
    setCoil: setCoil,
    setCircuit: setCircuit,
    face:faceHtml,
    closeCircuitPicker: closeCircuitPicker,
    chestIsOpen: function () { return !!chestOpen; },
    chestKey:function(){return chestOpen;},
    chestSlots:FACTORY_STATE.chestSlots,
    refreshOpen:function(S,save){var f=ensure(S);if(openUid==null)return;refreshDetail(f,S,save);},
  refreshInventory:function(S,save){var f=ensure(S);if(S.ui&&S.ui.page==='line')updateCards(f);if(openUid!=null)refreshDetail(f,S,save,true);if(chestOpen)refreshChest(f,S,save);var host=document.getElementById('fx-host');if(host&&host._fxPlacementState===S&&host._fxPlacementUpdate)host._fxPlacementUpdate();},
    chestTake: takeChest,
    chestClose: function () { chestOpen = null; },
    /* 只给 Node 里的测试用：把这些内部函数暴露出来，不参与界面 */
    __test: {
      stateOf: stateOf, recFit: recFit, recRoom: recRoom, startJob: startJob,
      tickOne: tickOne, takeSlot: takeSlot,
      machineLoot: machineLoot, lootFits: lootFits, slotCounts: slotCounts,
      openChest: openChest, takeChest: takeChest,
      recipesOf: recipesOf, recFit: recFit, startJob: startJob, jobDur: jobDur,
      recipeCard: recipeCard, rxPower: rxPower, tierLine: tierLine,
      euCap: euCap, euOf: euOf, addEu: addEu, takeEu: takeEu, euHtml: euHtml,
      heatOf: heatOf, coilHtml: coilHtml, toggleCoil: toggleCoil, setCoil: setCoil,
      cleanHtml: cleanHtml, toggleClean: toggleClean, faceUi: outFaceHtml, setFace: setFace,
      outFaceOf: outFaceOf, faceTakes: faceTakes, faceAllows: faceAllows,
      powerTick: powerTick, genTick: genTick, isGen: isGen, findFuel: findFuel,
      jobEut: jobEut, eutTicks: eutTicks, clockState: clockState, checkpointClock:checkpointClock, restoreClock: restoreClock,
      ampOf: ampOf, voltOf: voltOf, intakeOf: intakeOf,
      candRecs: candRecs, recIndex: function (c) { return REC_INDEX[c]; },
      stepWorldTick: stepWorldTick,
      beltTick: beltTick, beltDir: beltDir,
      circuitHtml: circuitHtml, toggleCircuit: toggleCircuit, setCircuit: setCircuit,
      cycleCircuit: setCircuit,
    clockState: clockState, checkpointClock:checkpointClock,
    restoreClock: restoreClock, circuitNeed: circuitNeed,
      catOf: catOf, recipesOf: recipesOf, machineByUid: machineByUid,
      normalizeIns: normalizeIns, normalizeOuts: normalizeOuts
    },
    showMat: showMat,
    startPlace: startPlace,
    dragInventory:function(e,index,commit){var view=e.target&&e.target.closest&&e.target.closest('.fx-viewport');return !!(view&&view._fxInventoryDrop&&view._fxInventoryDrop(e,index,commit));},
    machineAtPointer:function(e){var view=e.target&&e.target.closest&&e.target.closest('.fx-viewport');return view&&view._fxMachineAt?view._fxMachineAt(e):null;},
    // 光标下的格子：给画布快捷键用，不暴露内部结构
    hoverTarget:function(e){var view=e.target&&e.target.closest&&e.target.closest('.fx-viewport');if(!view||!view._fxCellAt)return null;var c=view._fxCellAt(e);if(!c)return null;var m=view._fxMachineAt?view._fxMachineAt(e):null;return{x:c.x,y:c.y,machine:m,el:m&&view._fxMachineEl?view._fxMachineEl(m.uid):null};},
    selectedTransport:function(S,cell){var v=st.selectedPipe,b=S&&S.fx&&BLUEPRINTS.active(S);return v&&b&&(!cell||v.cell===cell)&&b[v.kind]&&b[v.kind][v.cell]?{cell:v.cell,kind:v.kind}:null;},
    refreshTransportConnections:function(S){var host=document.getElementById('fx-host'),v=host&&host._fxView;if(v&&v.state===S&&S.ui.page==='line')v.refresh();},
    endInventoryDrag:function(){var view=document.querySelector('.fx-viewport');if(view&&view._fxEndInventoryDrag)view._fxEndInventoryDrag();},
    cancelPlace: cancelPlace,resetBoardInteraction:resetBoardInteraction,
    placing: function () { return !!st.place||!!st.move; },
    placementCursor:placementCursor,
    placementSource:function(S){return st.place&&!st.move&&heldItem(S)?{type:'bag',index:st.placeSource.bagIndex}:null;},
    planning:function(){return !!st.plan;},
    mountNote:mountNote,beginMove:beginMove,mountMove:mountMove,positionWindow:positionMachineWindow,
    isOpen: function () { return openUid != null || !!chestOpen; },
    close: function () { MACHINE_IO.clear();circOpen=null;openUid = null; inputSelection=null;chestOpen = null; dropNoback(); },
    openDetail: openDetail,
  windowTargetAt: windowTargetAt,
  openWindowTarget: openWindowTarget,
    openPipeSettings:openPipeSettings,
    machineByUid: machineByUid,
    machineLoot: machineLoot,
  };
})();
