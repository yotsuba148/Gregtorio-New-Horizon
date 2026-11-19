 
 
 
 
 
 
 
 
 
 
 
 
 
'use strict';

const GD = window.GD;
const $ = s => document.querySelector(s);

/* ============================ 常量 ============================ */

const INV_SLOTS = 46;          // 与原版 NH 一致，故意限制挖矿效率
const CHEST_SLOTS = 27;        // 一个箱子 27 格，和原版箱子一样。箱子各装各的
const STACK = 64;

/* --- 时间模型 ---
 * 模拟以20 TPS固定步长结算，界面以秒展示动作时间。
 * 原版 NH 的 1 tick = 1/20 秒，GT 配方数据里的 duration 就是 tick 数，
 * 配方与世界活动始终保留原始游戏时间。
 */
const TICK = GAME_TIME.TICK_MS / 1000;

const EXPLORE_CYCLE = 60;      // 一次探索读条 1 分钟
const EXPLORE_MAX = 16;        // 一次探索最多 16 个周期
const SMELT_TIME = 10;         // 熔炉烧一个 10 秒（原版速度）
// 工具的耐久和采集速度在 data/tools.js 里（由 工具\mktooldata.py 生成），这里不写死

/* ---- 时间与天气 ----
 * 数值照抄原版「放置格雷-登月长路」v0.9.43 的 state.environment：
 *   一天 1200 秒（20 分钟），前一半 600 秒白天、后一半夜晚；
 *   一年 360 天、一月 30 天，3-5 春 / 6-8 夏 / 9-11 秋 / 12-2 冬；
 *   天气只在主世界（下界、末地、暮色恒晴恒白天）；
 *   天气每次 90~239 秒，六成晴，其它季 30% 雨 10% 雷，冬季 40% 雪。
 * 原版还用它算太阳能/集水/风机效率，我们发电页还没做，先把 solar 备着。 */
const ENV_DAY = 1200;
const ENV_WX_MIN = 90;
const ENV_WX_VAR = 150;
const ENV_YEAR_DAYS = 360;
const ENV_MONTH_DAYS = 30;

function activityDuration(source,action){return WORLD_SIMULATION.duration(S,source,action);}

function secs(t) { return GAME_TIME.seconds(S,t); }
function setDeveloperTiming(patch) {
  DEVELOPER_MODE.update(S,patch);
  const developerActive=DEVELOPER_MODE.active(S);
  if(!developerActive){GAME_TIME.setEnvironmentRate(S,1);document.querySelectorAll('[data-devbtn],.fx-devbar').forEach(el=>el.remove());}
  FACTORY.configureTiming(S);
  if(window.JEI)JEI.syncDeveloper();
  syncEnv();markDynamic();renderDbg();renderQuests();
  const tip=$('#qtip');
  if(!developerActive&&tip.hidden)patchQuestHtml(tip,'');
  renderTop();save();
}

 
const SLOT_W = { primary: 4, secondary: 4, between: 2, sporadic: 1 };
const SLOT_CN = { primary: '主', secondary: '次', between: '夹', sporadic: '零' };

 
const FUEL = {
  'minecraft:coal@0': 80,
  'minecraft:charcoal@0': 80,
  'minecraft:log@0': 15,
  'minecraft:planks@0': 15,
  'minecraft:stick@0': 5,
};
function fuelValue(k){return FURNACES.fuelTicks(k)/20;}

/* ============================ 数据索引/* ============================ 数据索引 ============================ */

const NAME = GD.items;
const PIN = GD.pin;
const CATALOG = new Set(GD.catalog);
const CRAFT_BY_OUT = new Map();
for (let i = 0; i < GD.craft.length; i++) {
  const r = GD.craft[i];
  r.ri = i;          // 工具配方要靠这个下标去查"这条用什么材质"
  if (!CRAFT_BY_OUT.has(r.out)) CRAFT_BY_OUT.set(r.out, []);
  CRAFT_BY_OUT.get(r.out).push(r);
}
// 工具数据（data/tools.js）里的材质表和配方表必须对得上，对不上就说明该重跑生成器了
const FURNACE_BY_IN = new Map();
for (const f of GD.furnace) {
  if (!FURNACE_BY_IN.has(f.in)) FURNACE_BY_IN.set(f.in, f.out);
}
// 哪些物品能烧出东西（熔炉燃料/原料选择器用）
const SMELTABLE = new Set(GD.furnace.map(f => f.in));
const FURNACE_COUNT=new Map(GD.furnace.map(f=>[f.in,f.n||1]));

// 物品表里没有的机器，名字从机器清单（data/machines.js）里补
const MACHINE_NAME = (() => {
  const m = new Map();
  for (const c of ((GD.machines && GD.machines.cats) || [])) {
    for (const t of (c.tiers || [])) m.set(t.k, t.name);
  }
  return m;
})();

/* 名字来源：物品表 -> 机器名 -> 配方表里顺手记下的 display 名 -> 注册名尾段。
 * 配方全量导入以后，很多物品只出现在配方里、不在旧物品表里，得靠第三档兜住。 */
const REC_NAME = (GD.mrecipes && GD.mrecipes.n) || {};
const nameOf = raw => {if(raw==null||raw==='')return '';const k=CONTENT.canonicalKey(raw);return String(NAME[k] || MACHINE_NAME.get(k) || REC_NAME[k] || (k.includes("~")&&CONTENT.item(k)?.name) || k.split('@')[0].split(':').slice(-1)[0] || k).replace(/§[0-9a-fk-or]/gi,'');};

/* ============================ 工具 ============================
 * 数据在 data/tools.js（由 工具\mktooldata.py 从配方里生成），这里只做查表。
 * 一个类型一个槽位：镐子、斧子、铲子、锄头、剪刀、锯子、锻造锤、锉、螺丝刀、
 * 扳手、软锤、剪线钳、撬棍、研钵、电烙铁……同类型里的一次性/电动/万能工具互相顶用。 */
const TOOL_D = GD.tools || { types: [], mats: {}, fixed: {}, rmat: [], def: [64, 3] };
// tools.js 的配方材质表是按 craft.js 的下标排的，重导出配方之后必须重跑
// 工具\mktooldata.py，不然材质会错位。这里留一道自检。
const TYPE_BY_KEY = {};      // 物品 -> 类型 id
const TOOL_BY_ID = {};       // 类型 id -> 类型定义
for (const t of TOOL_D.types) {
  TOOL_BY_ID[t.id] = t;
  for (const k of t.keys) TYPE_BY_KEY[k] = t.id;
}

function isTool(k) { return TYPE_BY_KEY[CONTENT.baseKey(k)] !== undefined; }

/* 告诉 core.js 哪些东西不能叠：工具一格一件 */
if (typeof CORE !== 'undefined' && CORE.setHooks) {
  CORE.setHooks({ canonicalKey:CONTENT.canonicalKey.bind(CONTENT), isTool: isTool, maxStackOf: function(k){var stacked=window.GD&&GD.isStackableDurable&&GD.isStackableDurable(CONTENT.canonicalKey(k));if(stacked)return 64;return (isTool(k)||(window.ITEM_DURABILITY&&ITEM_DURABILITY.isDurable(k)))?1:CONTENT.maxStack(k);} });
}
function toolType(k) { return TYPE_BY_KEY[CONTENT.baseKey(k)]; }
function toolTypeName(id) {
  const t = TOOL_BY_ID[id];
  return t ? t.cn : '工具';
}
/** 工具类型 id 的顺序（工具墙就按这个排） */
function toolIds() { return TOOL_D.types.map(t => t.id); }

/** 一件工具的材质、耐久上限、采集速度。mat 是这条配方用的材质（生成时算好的）。 */
function toolSpec(k,mat){return PLAYER_TOOLS.spec(k,mat);}

/** 新做出来的一件工具（带材质和耐久） */
function isPermanentTool(k){return !!(GD.toolRules[CONTENT.baseKey(k)]||{}).unbreakable;}
function newTool(k,mat){return PLAYER_TOOLS.create(k,mat);}

/** 补上老存档里那种只存了 {k,dur} 的工具；也顺手把被 def 三元组写坏的实例修回来。
 *  "写坏"长这样：{k, mat:'铁', dur:'铁', dmax:'铁', spd:64} —— 上限和速度都是垃圾。 */
function fixTool(t){return PLAYER_TOOLS.normalize(t);}

/** 显示名：原版工具名里本来就带材质，GT 工具名是光杆的，把材质拼在前面 —— 燧石研钵 / 铁研钵 */
function toolLabel(t) {
  const base = nameOf(t.k);
  const item=CONTENT.item(t.k);
  if(item?.id==='gregtech:gt.metatool.01'&&item.nbt&&base!==nameOf(item.base))return base;
  if (!t.mat || t.mat === '一次性') return base;
  if (base.indexOf(t.mat) === 0) return base;
  return t.mat + base;
}

/* 按名称排序。用中文排序规则，浏览器内部就是拼音序。 */
const byName = (a, b) => ITEM_ORDER.compare(a,b);

/* ============================ 状态 ============================ */

let loadFailure=null;
const SAVE_SESSION=(()=>{try{return SAVE_SLOTS.open(localStorage,undefined,{validate:data=>SAVE_LOADER.validate(data,SAVE_DEFAULTS)});}catch(e){loadFailure=e;return null;}})();
const SAVE_KEY=SAVE_SESSION?SAVE_SESSION.key:SAVE_SLOTS.legacyKey;

const S = {
  itemCursor: null,
  workbench: {schema:1,slots:Array(9).fill(null)},
  t: Date.now(),
  inv: new Array(INV_SLOTS).fill(null),   // {k,n}，工具是 {k,n:1,dur,mat,dmax}
  tools: {},                              // 工具墙：类型 id -> {k,n:1,dur,mat,dmax}
  chests: [],                             // 箱子。一个个独立的 27 格容器，各装各的
  actionQueue: [], actionSequence:0, worldFlowVersion:1, veinSequence:0,
  act: null,                              // 当前动作（占全局槽）
  furs: [],                               // 熔炉（可以摆好几个）
  bench: 0,                               // 部署了几个工作台。≥1 就解锁 3x3 配方
  veins: [],                              // 已保存的矿脉
  quests: {},                             // 已确认完成的任务 id -> 1
  qever: {},                              // 完成过的任务 id -> 1。只加不减，依赖解锁看这个
  history: [],                            // 查看历史 [k, ...]，最近的在前
  ui: { page: 'world', dim: 'overworld', q: '', tab: 'all', sel: null, veinSel: null,
        pg: 0 },
  zoom: 100,                                      // 界面缩放 %，见设置页
  appearance: {},
  env: { elapsed: 0, weather: 'clear', remaining: 0,rate:1 },
  qfold: { closed: false, open: undefined },    // 任务书：整本收起 / 当前摊开哪一章
  msgs: [],             // 消息栏：{t: 游戏内时刻, k: 类别, s: 文本}，最近的在前，永不自动清
  msgNew: 0,            // 没看过几条
};
const SAVE_DEFAULTS=JSON.parse(JSON.stringify(S));
DEVELOPER_MODE.reset(S);
let dirty = { all: true };

/* ============================ 消息栏 ============================
 * 短暂提示消失后，玩家仍可在消息栏查看。
 * 所以每条都存进 S.msgs（跟着存档走），屏幕最上层有个"消息"按钮带未读数。
 * 底部浮窗只是"叫一声"，真正的记录在消息栏里。 */
const MSG_MAX = 300;

function logMsg(kind, text) {
  S.msgs.unshift({ t: Math.floor(S.env.elapsed || 0), k: kind, s: text });
  if (S.msgs.length > MSG_MAX) S.msgs.length = MSG_MAX;
  S.msgNew = (S.msgNew || 0) + 1;
  msgTip(kind, text);
  if (typeof markMsgs === 'function') markMsgs();
  save();
}

/** 底部那一条浮窗。跟收货提示共用一个盒子，坏消息用暖色。 */
function msgTip(kind, text) {
  UI_NOTICES.show('<b>'+esc(kind)+'</b><span>'+esc(text)+'</span>',{kind:'notice-message',duration:5600});
}

/** 格式化游戏内时刻，消息栏里每条前面那个时间戳 */
function msgTime(t) {
  const day = Math.floor(t / ENV_DAY) + 1;
  const m = t % ENV_DAY;
  return '第' + day + '天 ' + String(Math.floor(m / 60)).padStart(2, '0') + ':' +
    String(Math.floor(m % 60)).padStart(2, '0');
}

let saveFailure=null;
STATE_SCHEMA.register('page',['bench','history','defaultPlaythroughId','zoom','qfold','msgs','msgNew']);
function currentSaveSnapshot() {
  WS.ensure(S);
  return STATE_SCHEMA.snapshot(S,{schema:ENGINE.schema,clock:FACTORY.checkpointClock(),savedAt:Date.now()});
}
function save(options) {
  if(loadFailure||!SAVE_SESSION||!SAVE_SESSION.canWrite())return false;
  try {
    SAVE_SESSION.write(currentSaveSnapshot(),options);
    saveFailure=null;const warning=document.getElementById('save-error');if(warning)warning.hidden=true;
    return true;
  } catch (e) {
    if(!saveFailure||saveFailure.message!==e.message)console.error('存档保存失败',e);
    saveFailure=e;
    const warning=document.getElementById('save-error');
    if(warning){warning.hidden=false;warning.textContent='保存失败，点击重试';warning.setAttribute('data-tip','保存失败：'+e.message);}
    return false;
  }
}
/* 把当前存档下载成文件，方便排查问题 */
window.exportSave = function () {
  try {
    const raw = loadFailure ? SAVE_SESSION?.read() : JSON.stringify(currentSaveSnapshot());
    if (raw == null) return '当前存档为空';
    const blob = new Blob([raw], {type: 'application/json'});
    const a = document.createElement('a');
    const href=URL.createObjectURL(blob);
    a.href = href;
    a.download = 'fangzhi-save-' + Date.now() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 2000);
    return '已导出 ' + blob.size + ' 字节';
  } catch (e) {
    return '导出失败：' + (e && e.message || e);
  }
};
function loadSave() {
  try {
    const raw=SAVE_SESSION.read(true);
    if(!raw)return false;
    const parsed=JSON.parse(raw);
    if(SAVE_SLOTS.isFresh(parsed))return false;
    const candidate=SAVE_LOADER.prepare(parsed,S);
    SAVE_LOADER.commit(S,candidate);
    FACTORY.ensure(S);FACTORY.restoreClock(parsed.clock);
    return true;
  } catch(e) {loadFailure=e;console.error('存档未加载，原存档已保留',e);return false;}
}

/* 整个界面用 CSS zoom 放大（默认 130%）。zoom 会把 left/top 和
 * getBoundingClientRect 的数值一起放大，拿鼠标坐标算位置时要先除回来。
 * 提示框、厂房的格子定位都靠这个函数，别再各写各的。 */
function uiZoom() {
  var v = (typeof document !== 'undefined' && document.documentElement)
    ? document.documentElement.style.zoom : '';
  var n = parseFloat(v);
  if (!isFinite(n) || n <= 0) return 1;
  return (String(v).indexOf('%') >= 0 || n > 8) ? n / 100 : n;
}

/* ============================ 界面缩放 ============================
 * 整个界面一起放大缩小，所有标签页都跟着变。用 CSS zoom 做，
 * 它跟浏览器自带的缩放是一回事，文字不会糊。
 * 不同分辨率的屏幕看着大小差很多，所以交给玩家自己调，存在存档里。 */

const ZOOM_DEF = PAGE_SAVE.zoomPolicy.default;
const ZOOM_MIN = PAGE_SAVE.zoomPolicy.min;
const ZOOM_MAX = PAGE_SAVE.zoomPolicy.max;

function applyZoom() {
  const z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, S.zoom || ZOOM_DEF));
  S.zoom = z;
  document.documentElement.style.zoom = z + '%';
}

/* ============================ 库存 ============================ */

function countIn(slots, k) {
  return CORE.count(slots, k);
}

/* --- 库存 ---
 * 底层统一走 core.js：查容量、算实际能搬多少、一次提交，两边同时生效。
 * 这两个函数保留**旧的返回值契约**（slotAdd 返回没塞下的，slotTake 返回实际扣到的），
 * 因为到处都在调；换算只在这里做一次。 */
function slotAdd(slots, k, n) {
  if (!(n > 0)) return n > 0 ? n : 0;
  return n - CORE.insert(CORE.slotBox(slots), k, n);
}

/** 从任意一组格子里扣。返回实际扣到的数量。工具（没有 n）不动。 */
function slotTake(slots, k, n) {
  if (!(n > 0)) return 0;
  return CORE.extract(CORE.slotBox(slots), k, n, { onlyCounted: true });
}

/* 一次完整搬运：查容量 → 算实际量 → 同时扣源、加目标。
 * 返回 { moved, remainder, reason }。 */
function moveItems(fromSlots, toSlots, k, n) {
  return CORE.transferItems({
    from: CORE.slotBox(fromSlots),
    to: CORE.slotBox(toSlots),
    k: k, n: n
  });
}

/* --- 箱子 ---
 * 一个个独立的容器，各自 27 格，各装各的。玩家在仓库页里拖动存放、给它们改名。
 * 需要按物品总数算的地方（手搓、任务、浮窗里的合计）一律走 chestCount。 */

function chestCount(k) {
  let n = 0;
  for (const c of S.chests) n += countIn(c.slots, k);
  return n;
}
/** 按箱子顺序往后面塞。返回没塞下的。 */
function chestAdd(k, n) {
  for (const c of S.chests) { n = slotAdd(c.slots, k, n); if (n <= 0) break; }
  return n;
}
/** 按箱子顺序往后面扣。返回实际扣到的。 */
function chestTake(k, n) {
  let need = n;
  for (const c of S.chests) { need -= slotTake(c.slots, k, need); if (need <= 0) break; }
  return n - need;
}

/** 物品栏 + 箱子 + 工具墙 的总量。手搓检查料够没够就是按这个算的。
 *  工具墙是按类型存的，所以这里手动数一遍，不能用 countIn。 */
function have(k) {
  k=CONTENT.canonicalKey(k);
  let n = countIn(S.inv, k) + chestCount(k);
  for (const id in S.tools) if (S.tools[id] && S.tools[id].k === k) n++;
  return n;
}
function invLeft(k) {
  let left = 0;
  for (const c of S.inv) if (!c) left += STACK; else if (c.k === k) left += STACK - c.n;
  return left;
}
function invFull() { return S.inv.every(c => c); }

function invAdd(k, n) {
  if (isTool(k)) {          // 工具不叠堆：每件都是独立的一件，耐久各算各的
    let left = n;
    for (; left > 0; left--) if (!invAddTool(newTool(k, null))) break;
    return left;
  }
  return slotAdd(S.inv, k, n);
}

/** 玩家拿东西做事统一走这里：先物品栏，再按箱子顺序。 */
function take(k, n) {
  if (have(k) < n) return false;
  let need = n - slotTake(S.inv, k, n);
  if (need > 0) need -= chestTake(k, need);
  return need <= 0;
}

const QUIET = { quiet: 1 };   // 只给调试台整批发包用（几十种一起给，别刷满屏）

/** 拿到东西只有一条规矩：**先物品栏，物品栏塞不下才进箱子**。
 *  挖的、采的、合成的、机器吐的、从机器槽位拿的，全都走这里。
 *  opt.quiet 只给调试台整批发包用；正常产出都会弹浮窗（同物品自动合并）。 */
function gainInv(k, n, opt) {
  k=CONTENT.canonicalKey(k);
  if (!(n > 0)) return 0;
  let left = invAdd(k, n);
  const intoInv = n - left;
  let intoChest = 0;
  if (left > 0) {
    const want = left;
    left = chestAdd(k, want);
    intoChest = want - left;
  }
  if(left)COMMANDS.reportLoss(S,[{k,n,discarded:left}]);
  if (!(opt && opt.quiet)) gainTip(k, intoInv, intoChest);
  return left;
}

/** 老名字，保留是因为到处都在调它。行为已经跟 gainInv 一致：先物品栏。 */
function gain(k, n, opt) {
  return gainInv(k, n, opt);
}

/** 屏幕正下方的小提示：收进来的东西都报一声。
 *  同一个物品短时间内连着来，就合并成一条累加数字，不然挖矿会刷屏。
 *  "物品栏"和"仓库"分开记，两边的数量都写清楚。 */
function gainTip(k, nInv, nChest, nDrop=0) {
  const addInv=nInv|0,addChest=nChest|0;if(addInv+addChest+nDrop<=0)return;
  const old=Array.from($('#toast').children).find(n=>n.dataset.noticeKey==='gain:'+k);
  const inv=+(old?.dataset.i||0)+addInv,chest=+(old?.dataset.c||0)+addChest,drop=+(old?.dataset.d||0)+nDrop;
  const where=[inv&&'物品栏 ×'+inv,chest&&'仓库 ×'+chest,drop&&'掉落物 ×'+drop].filter(Boolean).join('，');
  const node=UI_NOTICES.show(iconHtml(k,16)+'<span>+'+(inv+chest+drop)+' '+esc(nameOf(k))+'（'+where+'）</span>',{key:'gain:'+k,duration:5200});
  if(node){node.dataset.i=inv;node.dataset.c=chest;node.dataset.d=drop;}
}

/* ============================ 动作 ============================ */

/** 哪个采集动作吃哪类工具。镐管挖矿和圆石，斧管树，铲管沙土，剪刀一类管割。 */
const SRC_TOOL = {
  mine_cobble: ['pick'], chop_tree: ['axe'], dig_gravel: ['shovel'],
  gather_rubberwood:['axe'],gather_wool:['shears'],
  dig_sand: ['shovel'], dig_dirt: ['shovel'], dig_clay: ['shovel'],
  cut_reed: ['knife', 'branch', 'shears'], get_water: [], get_lava: [],
};

/** 这个采集动作现在多快。手上挂着对应的工具就按工具的倍率加快（工具越快越好）。 */
function srcSpeed(srcId){return WORLD_SIMULATION.speed(S,srcId);}

/** 这个采集动作一次用掉几件"容器"（空桶），以及产出什么。没空桶就不给干。 */
const SRC_BUCKET = {
  get_water: 'minecraft:bucket@0', get_lava: 'minecraft:bucket@0',
};

// sources.js 是导出的数据，里面只有打水。取岩浆补在这里，重导出也不会丢。
if (GD.sources && !GD.sources.some(s => s.id === 'get_lava')) {
  GD.sources.push({ id: 'get_lava', name: '取岩浆', time: 1.5, dim: 'overworld',
                    out: [['minecraft:lava_bucket@0', 1]] });
}

function srcBlocked(srcId) {
  const d=ACTIVITIES.definitions[srcId];return d?!ACTIVITIES.available(S,d).ok:false;
}

function startAct(a) {
  ACTION_QUEUE.enqueue(S,a);save();
  markDynamic();
}

function cancelAct() {
  if(S.act)ACTION_QUEUE.cancel(S,S.act.queueId);
  markDynamic();save();
}

function actName(a) {
  if (!a) return '';
  if (a.type === 'gather') return (ACTIVITIES.definitions[a.src] || {}).name || '世界动作';
  if (a.type === 'explore') return '探索矿脉，'+dimName(a.dim||'overworld');
  if (a.type === 'mine') return '采掘 ' + a.veinName;
  if(a.type==='riverwash')return '河岸洗矿';
  return '?';
}

/** 一次探索掷一条脉，只在当前维度里掷。权重用原版 weight。 */
function rollVein(dim){return WORLD_SIMULATION.rollVein(dim);}
function makeVein(def){return WORLD_SIMULATION.makeVein(S,def);}

function mineOne(vein) {
  const tot = vein.ores.reduce((s, o) => s + o.w, 0);
  let x = Math.random() * tot;
  for (const o of vein.ores) { x -= o.w; if (x <= 0) return o.key; }
  return vein.ores[0].key;
}

/* ============================ 熔炉 ============================ */

const HOPPER = 'minecraft:hopper@0';
const FUR_CAP = STACK;             // 没装漏斗：一格就 1 组
const FUR_HOP_CAP = 54 * STACK;    // 装了漏斗：一个大箱子（54 格）

/** 这台炉子一格能堆多少。装了漏斗就是一个大箱子的容量。 */
function furCap(f) { return f.hop ? FUR_HOP_CAP : FUR_CAP; }

function addFurnace() {
  // hop = 装没装漏斗。装了的话原料/燃料/产物的暂存都扩到一个大箱子那么大。
  S.furs.push({ input: null, fuel: null, out: null, prog: 0, burn: 0, hop: false });
}

/** 炉子走一帧。
 *  燃料烧完一根必须"就地"接上下一根。以前的写法是：先 f.burn -= dt 把火烧到 0，
 *  要等下一帧开头才重新点火，中间这一帧 f.burn <= 0，炉口就是灭的 —— 看着就是
 *  "烧完一个东西灭一下再烧"。用木柴这种 15 秒的燃料特别明显：烧一个 10 秒的东西，
 *  第二根柴总差几秒烧不完，于是一直在灭/点之间闪。
 *  现在改成烧完立刻补上，并把欠的那点时间加回去，一帧 dt 再大也不会吞掉燃料。 */
function furTick(f,state){FURNACES.tick(f,state);}

/* ============================ 合成/* ============================ 合成 ============================ */


 
 
function findTool(typeIds){return PLAYER_TOOLS.find(S,typeIds);}

/** 身上（工具墙）挂着的这类工具，用来算采集速度：挑最快的那个 */
function bestTool(typeIds){return PLAYER_TOOLS.best(S,typeIds);}

/** 扣 1 点耐久。坏了就从格子里拿走，记一条消息。 */
function wearTool(p){const r=PLAYER_TOOLS.wear(S,p);if(r&&r.broken&&!TINKER_TOOLS.isTool(r.item.k))logMsg('工具',toolLabel(r.item)+' 用坏了。');markInv();}

const craftIngredientCache=new WeakMap();
function craftIngredientKeys(slot){let keys=craftIngredientCache.get(slot);if(keys)return keys;const set=new Set();slot.forEach(k=>{set.add(CONTENT.canonicalKey(k));const item=CONTENT.rawItems[k]||CONTENT.item(k);if(item?.meta===32767)(CONTENT.byRawId[item.id]||[]).forEach(actual=>{if(CONTENT.matches(k,actual))set.add(CONTENT.canonicalKey(actual));});});keys=[...set];craftIngredientCache.set(slot,keys);return keys;}
const craftToolSlots=new WeakMap();
function isCraftToolSlot(slot) {
  if (!craftToolSlots.has(slot)) craftToolSlots.set(slot,slot.some(isTool)||!!CRAFT_TOOLS.spec(slot));
  return craftToolSlots.get(slot);
}
function pickAlt(slot) {
  return cachedStockAlt(slot,craftInventorySnapshot());
}
function cachedStockAlt(slot,stock) {
  if(stock.picks.has(slot))return stock.picks.get(slot);
  const pick=pickStockAlt(slot,stock);
  stock.picks.set(slot,pick);
  return pick;
}
function pickStockAlt(slot,stock) {
  if (isCraftToolSlot(slot)) {
    const selected=orderedCraftStock(stock).find(e=>CRAFT_TOOLS.accepts(slot,e.stack));
    return selected?{k:selected.stack.k,tool:!!CRAFT_TOOLS.spec(slot)&&!!CRAFT_TOOLS.rule(selected.stack.k).containerTool,inst:selected.stack,where:selected.position.tool?'tool':selected.position.box===0?'inv':'chest'}:null;
  }
  const keys=craftIngredientKeys(slot),iv=keys.find(k=>(stock.bag.get(k)||0)>0);
  if(iv)return{k:iv,tool:false};
  const ch=keys.find(k=>(stock.warehouse.get(k)||0)>0);
  return ch?{k:ch,tool:false}:null;
}

/** 这条配方是不是非得摆工作台（3x3）才做得出来。
 *  有真实摆放的，看占用的格子能不能塞进 2x2；没有形状信息的，按格数退一步估
 *  （2x2 最多 4 格）。所以"3x3 的配方"不是我列出来的，是从形状数据里算的。 */
function needBench(r) {
  if (r.grid) {
    let r0 = 3, r1 = -1, c0 = 3, c1 = -1;
    for (let p = 0; p < 9; p++) {
      if (!(r.grid[p] >= 0)) continue;
      const rr = Math.floor(p / 3), cc = p % 3;
      if (rr < r0) r0 = rr;
      if (rr > r1) r1 = rr;
      if (cc < c0) c0 = cc;
      if (cc > c1) c1 = cc;
    }
    if (r1 < 0) return false;
    return (r1 - r0 + 1) > 2 || (c1 - c0 + 1) > 2;
  }
  return r.slots.length > 4;
}
function benchLocked(r) { if(r.station)return !MECHANISMS.stationFor(S,r.station);return r.width>3||r.height>3||r.slots.length>9||(needBench(r) && S.bench < 1); }

/** 一条配方每种料各要几个。同一种料可能在好几个格子里出现（镐子要 3 块木板），
 *  所以要按总量算，不能一格格看。料不齐返回 null。 */
function recipeNeed(r) {
  const need = {};
  for (let i = 0; i < r.slots.length; i++) {
    const p = pickAlt(r.slots[i], r.out + '|' + i);
    if (!p) return null;
    if (p.tool) continue;          // 工具不消耗，只掉耐久
    need[p.k] = (need[p.k] || 0) + 1;
  }
  return need;
}

function craftedStack(k,n) { return isTool(k)?Object.assign(newTool(k,null),{n}):{k,n}; }
const CRAFTER=new CraftingProcessor(CONTENT,{isTool:isTool,toolType:toolType,craftWear:k=>(GD.toolRules[CONTENT.baseKey(k)]||{}).craftWear??1,createStack:craftedStack});
function craftingStorages(){return [S.inv,MANUAL_WORKBENCH.ensure(S).slots];}
function orderedCraftStock(stock=craftInventorySnapshot()){return stock.orderedTools??=CRAFT_TOOLS.ordered(stock.storages,stock.tools);}
function craftHave(k){return CORE.count(S.inv,k)+Object.values(S.tools).reduce((n,s)=>n+(s&&CONTENT.canonicalKey(s.k)===CONTENT.canonicalKey(k)?s.n??1:0),0);}
function craftPlan(r,requireOutputSpace){return CRAFTER.plan(r,craftingStorages(),S.tools,{state:S,bench:S.bench>0,toolOnlyBoxes:[1],outputBoxes:[0],returnBoxes:[0],requireOutputSpace,station:r.station?MECHANISMS.stationFor(S,r.station):null});}
function canMake(r) { return CRAFTER.plan(r,craftingStorages(),S.tools,{state:S,bench:S.bench>0,checkOnly:true,orderedStock:orderedCraftStock(),toolOnlyBoxes:[1],station:r.station?MECHANISMS.stationFor(S,r.station):null}).ok; }

/** 一条配方的"原料满足程度"，0~1，1 就是现在就能做。
 *  一个有工具就算满足；一格候选一个都没有就算缺；同一种料占好几格按合计量算，
 *  所以"要 8 个木头有 5 个"是 5/8 而不是算成满足。 */
function fillOf(r, picks) {
  let unit = 0, got = 0;
  const need = {};
  for (let i = 0; i < picks.length; i++) {
    const p = picks[i];
    if (!p) { unit++; continue; }             // 这一格什么都没有
    if (p.tool) { unit++; got++; continue; }   // 工具在就满足
    need[p.k] = (need[p.k] || 0) + 1;
  }
  for (const k in need) {
    unit++;
    got += Math.min(craftHave(k), need[k]) / need[k];
  }
  return unit ? got / unit : 1;
}

function make(r,times,requireOutputSpace=false) {
  QUESTS.observe(S);
  const count=Math.max(1,Math.floor(times||1));let made=0;const receipts={};
  for(let i=0;i<count;i++){
    const plan=craftPlan(r,requireOutputSpace);if(!plan.ok)break;
    const overflow=[];
    for(const {k,discarded} of plan.produced){
      if(!discarded)continue;
      if(isTool(k)){
        for(let n=0;n<discarded;n++)overflow.push(craftedStack(k,1));
      }else overflow.push(craftedStack(k,discarded));
    }
    if(overflow.length){
      if(!DROPPED_ITEMS.valid(overflow))break;
      DROPPED_ITEMS.ensure(S);
    }
    CRAFTER.commit(plan,craftingStorages(),S.tools);
    if(overflow.length)DROPPED_ITEMS.add(S,overflow);
    made++;
    for(const p of plan.produced){
      const sum=receipts[p.k]||(receipts[p.k]={bag:0,warehouse:0,drops:0});
      sum.bag+=p.toBag;sum.warehouse+=p.toWarehouse;sum.drops+=p.discarded;
    }
  }
  if(made){markInv();markDetail();for(const[k,p]of Object.entries(receipts))gainTip(k,p.bag,p.warehouse,p.drops);}
  return made>0;
}

/** 往物品栏塞一件工具（占一格）。塞不下返回 false。 */
function invAddTool(t) {
  for (let i = 0; i < S.inv.length; i++) {
    if (!S.inv[i]) { S.inv[i] = t; return true; }
  }
  return false;
}

/** 把一件工具塞进仓库（工具不叠堆，独占一格）。仓库全满返回 false。 */
function storeToolToChest(t) {
  if (!t || !isTool(t.k)) return false;
  for (const c of S.chests) {
    for (let i = 0; i < c.slots.length; i++) {
      if (!c.slots[i]) { c.slots[i] = t; return true; }
    }
  }
  return false;
}

/** 挂一件工具到它的类型槽位上。同类已经挂着的那件先换下来：
 *  先物品栏，再仓库；两处都没地方就整件事不做，
 *  免得把原来那件弄丢。 */
function mountTool(inst) {
  if (!inst || !isTool(inst.k)) return false;
  const id = toolType(inst.k);
  if (!id) return false;
  const old = S.tools[id] || null;
  if (old === inst) return false;           // 已经挂着了
  const at = S.inv.indexOf(inst);
  if (at >= 0) S.inv[at] = null;            // 先让开位置，换下来的才有地方落
  if (old) {
    if (!COMMANDS.withdraw(S,[old],0).ok) {
      if (at >= 0) S.inv[at] = inst;        // 换不下来，原样放回去
      msgTip('仓库和物品栏都满了，这件换不下来。', 'warn');
      return false;
    }
  }
  S.tools[id] = fixTool(inst);
  toastAt(null,'已装备 '+nameOf(inst.k));
  markInv(); save();
  return true;
}

/** 查看历史：只要在图鉴里点开过就记一笔，不是只有合成过才记。
 *  重复查看会把这一条挪到最前面。 */
function pushHistory(k) {
  if (!k) return;
  const i = S.history.indexOf(k);
  if (i >= 0) S.history.splice(i, 1);
  S.history.unshift(k);
  if (S.history.length > 60) S.history.length = 60;
  dirty.history = true;
}

/** 造熔炉：走真实配方。配不齐就别做，界面上会把缺什么写清楚。 */
function craftFurnace() {
  const KEY = 'minecraft:furnace@0';
  const r = (CRAFT_BY_OUT.get(KEY) || [])[0];
  if (!r || !canMake(r)) return false;
  if (!make(r, 1, true)) return false;
  take(KEY, 1);          // 从库存里扣掉（产物现在先进仓库，take 会去那儿拿）
  addFurnace();
  return true;
}

/** 把配方要的东西按"挑中的那一种"归并，给出 有/需要。 */
function needList(r) {
  const picks = r.slots.map((s, i) => pickAlt(s, r.out + '|' + i));
  const m = new Map();
  r.slots.forEach((slot, i) => {
    const p = picks[i];
    const k = p ? p.k : slot[0];
    const tool = !!(p && p.tool);
    const cur = m.get(k);
    if (cur) cur.need++;
    else m.set(k, { k, need: 1, tool });
  });
  return [...m.values()].map(x => ({
    k: x.k, need: x.need, tool: x.tool, have: x.tool ? 1 : craftHave(x.k),
  }));
}

/* ============================ 搜索 ============================ */

const itemSearchText = new Map();
function matches(k, q) {
  const terms=Array.isArray(q)?q:SEARCH_TEXT.words(q);
  if(!terms.length)return true;
  let text=itemSearchText.get(k);
  if(text==null){
    text=SEARCH_TEXT.index(nameOf(k),CONTENT.item(k)?.name||'',k,PIN[k]||PIN[CONTENT.baseKey(k)]);
    itemSearchText.set(k,text);
  }
  return SEARCH_TEXT.matches(text,terms);
}

let materialTabKeys;
function craftTabKeys() {
  if (S.ui.tab !== 'meta') return prioritizedCraftKeys();
  if (!materialTabKeys) {
    const keys = handCraftKeys();
    MATERIAL_CATALOG.build(keys);
    materialTabKeys = keys.filter(k => MATERIAL_CATALOG.has(k));
  }
  return materialTabKeys;
}
function listItems() {
  const terms=SEARCH_TEXT.words(S.ui.q);
  const keys=craftTabKeys();
  return terms.length?keys.filter(k=>matches(k,terms)):keys;
}

// 搜不到的时候，兜底告诉玩家这东西为什么不在合成图鉴里
function fallbackItems(){return [];}

/* ============================ 渲染 ============================ */

function markDynamic() { dirty.dyn = true; dirty.slot = true; }
let inventoryRevision=0,craftSnapshot=null,craftStockDirty=true;
function markInv() { dirty.inv = true;inventoryRevision++;craftStockDirty=true; }
function markCatalog() { dirty.list = true; }
function markDetail() { dirty.detail = true; }
function markQuests() { dirty.quests = true; }
function markMsgs() { dirty.msgs = true; }

/* --- 消息栏 --- */
function msgOpen(on) {
  const box = $('#msgs');
  if (!box) return;
  box.hidden = on === undefined ? !box.hidden : !on;
  if (!box.hidden) { S.msgNew = 0; renderMsgs(); save(); }
  else markMsgs();
}
function renderMsgs() {
  // 顶部按钮上的未读数：不管面板开着没开着都要刷
  const b = $('#msgopen');
  if (b) {
    b.textContent = '消息';
    if(Number.isSafeInteger(S.msgNew)&&S.msgNew>0){const count=document.createElement('span');count.className='qdot';count.textContent=String(S.msgNew);b.appendChild(count);}
    b.className = S.msgNew ? 'new' : '';
  }
  const box = $('#msgs');
  if (!box || box.hidden) return;
  const list = $('#msglist');
  const cnt = $('#msgcount');
  if (cnt) cnt.textContent = S.msgs.length ? S.msgs.length + ' 条' : '';
  if (list) {
    list.innerHTML = S.msgs.length ? S.msgs.map(m =>
      '<div class="msg"><span class="dim mt">' + msgTime(m.t) + '</span>' +
      '<span class="mk">' + esc(m.k) + '</span>' +
      '<span class="ms">' + esc(m.s) + '</span></div>').join('')
      : '<div class="dim msgempty">还没有消息</div>';
  }
}

function bar(pct, attr) {
  return '<span class="bar"' + (attr ? ' ' + attr : '') + '><i style="width:' +
    Math.max(0, Math.min(100, pct * 100)).toFixed(2) + '%"></i></span>';
}

/* --- 图标 ---
 * 全部图标打包在 icons.png 里，一格 16×16。用背景位移取图。
 * icons.js 里没有的物品（少数模组的方块）就只显示名字。 */
const SHEET = GD.iconSheet || { size: 32, cols: 64, rows: 24 };
function standaloneIconHtml(url,s){return '<img class="ic" src="'+esc(url)+'" alt="" style="width:'+s+'px;height:'+s+'px;object-fit:contain;background-image:none;image-rendering:pixelated">';}
function atlasIconHtml(p,s,sheet,url){const padded=GD.paddedIconSheets&&GD.paddedIconSheets[url||'icons.png'],ratio=padded?(padded.size+2*padded.padding)/padded.size:1,inset=padded?padded.padding*s/padded.size:0;return '<i class="ic" style="width:'+s+'px;height:'+s+'px;background-image:url('+esc(padded?padded.url:url||'icons.png')+');background-size:'+(sheet.cols*s*ratio)+'px '+(sheet.rows*s*ratio)+'px;background-position:'+(-p[0]*s*ratio-inset)+'px '+(-p[1]*s*ratio-inset)+'px"></i>';}
function baseIconHtml(k, size) {
  k=CONTENT.canonicalKey(k);
  const base=CONTENT.baseKey(k),s=size||16,iso=window.FRONT_FACES?.isometric(k);
  const face=window.FRONT_FACES&&FRONT_FACES.get(k);if(face)return standaloneIconHtml(face,s);
  const native=window.GT_PRESENTATION&&GT_PRESENTATION.active&&GT_PRESENTATION.icons(k);
  if(iso&&native?.exact&&!native.unresolved)return native.standalone?standaloneIconHtml(native.url,s):atlasIconHtml([native.x,native.y],s,native,native.url);
  const fixed=!iso&&GD.iconOverrides&&(GD.iconOverrides[k]||GD.iconOverrides[base]);
  if(fixed)return standaloneIconHtml(fixed,s);
  const standalone=!iso&&GD.faceIcons&&GD.faceIcons[k];
  if(standalone)return standaloneIconHtml(standalone,s);
  if(native&&native.exact&&!native.unresolved&&/^(?:gregtech:gt\.metaitem\.|gregtech:gt\.metatool\.|gregtech:gt\.blockframes@|bartworks:gt\.bwMetaGenerated)/.test(k))return native.standalone?standaloneIconHtml(native.url,s):atlasIconHtml([native.x,native.y],s,native,native.url);
  if(GD.modIcons&&GD.modIcons[k])return standaloneIconHtml(GD.modIcons[k],s);
  if(native&&native.exact&&!native.unresolved)return native.standalone?standaloneIconHtml(native.url,s):atlasIconHtml([native.x,native.y],s,native,native.url);
  if(GD.icons&&GD.icons[k])return atlasIconHtml(GD.icons[k],s,SHEET);
  if(GD.modIcons&&GD.modIcons[base])return standaloneIconHtml(GD.modIcons[base],s);
  if(GD.icons&&GD.icons[base])return atlasIconHtml(GD.icons[base],s,SHEET);
  if(native&&!native.unresolved)return native.standalone?standaloneIconHtml(native.url,s):atlasIconHtml([native.x,native.y],s,native,native.url);
  // Wildcard recipe ingredients display one actual matching item, not a blank/missing texture.
  const item=CONTENT.item(k);
  if(item&&item.meta===32767){const actual=(CONTENT.byRawId[item.id]||[]).find(key=>CONTENT.item(key).meta!==32767&&CONTENT_SCOPE.allowed(key));if(actual)return baseIconHtml(actual,s);}
  return '';
}
function iconHtml(k,size){k=CONTENT.canonicalKey(k);const icon=baseIconHtml(k,size).replace(/^<([a-z]+)/i,'<$1 data-lookup-key="'+esc(k)+'"');return /^gregtech:gt\.blockores@/.test(k)?'<span class="ore-icon" data-lookup-key="'+esc(k)+'" style="width:'+(size||16)+'px;height:'+(size||16)+'px">'+icon+'</span>':icon;}
/* 没图标的物品（图鉴里还有约三分之一没有）就写头两个字，别留空格子。 */
function iconOrText(k, size) {
  const h = iconHtml(k, size);
  if (h) return h;
  const nm = nameOf(k) || k;
  return '<span class="noic" data-lookup-key="'+esc(k)+'">' + esc(nm.slice(0, 2)) + '</span>';
}
function fmtTime(s) {
  if(s>0&&s<2)return String(Math.round(s*100)/100)+'s';
  s = Math.max(0, Math.ceil(s));
  const m = Math.floor(s / 60);
  return m > 0 ? m + ':' + String(s % 60).padStart(2, '0') : s + 's';
}

/*
  数量统一格式：千以内原样，之后用 K/M/B/T。
  数值部分永远不小于 1，所以是 123M，不会出现 0.12B。
*/
const COUNT_UNITS = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];
function fmtCount(n) {
  const v = Number(n) || 0, sign = v < 0 ? '-' : '';
  let a = Math.abs(v), i = 0;
  if (a < 1000) return sign + (a % 1 ? String(+a.toFixed(2)) : String(a));
  while (a >= 1000 && i < COUNT_UNITS.length - 1) { a /= 1000; i++; }
  const shown = a >= 100 ? Math.round(a) : a >= 10 ? +a.toFixed(1) : +a.toFixed(2);
  return sign + String(shown) + COUNT_UNITS[i];
}

/* --- 进度计算 ---
 * 读条走的是**整段动作的进度**（0 → 100% 一次走完），不是每个东西一小格。
 * extra 是距离上一次模拟结算过去的时间，rAF 用它做插值，看着才连续。 */
function queueTime(s){return fmtTime(Math.ceil(Math.max(0,s))).padStart(8,'\u2007');}
function queueNumber(n){return String(Math.max(0,Math.floor(n||0))).padStart(5,'\u2007');}
function actFrac(a, extra) {
  extra = extra || 0;
  if (!a) return { pct: 0, txt: '', txtS: '' };
  if(a.blocked){const reason={SUPPLIES:'库存需要一份熟食',LOCATION:'先探索发现可挑战地点',DIMENSION:'先开通该维度的传送门',HARVEST_LEVEL:'需要可用且挖掘等级足够的镐；可先采石积累熟练度或修理工具',TOOL:'缺少可用工具',OUTPUT:'物品栏和仓库已满',DONE:'已经击败过，本次只能打一次',RESEARCH:'尚未完成所需研究',CONTAINER:'需要可用的空容器',LIMIT:'已发现数量达到16个上限，先处理或放弃已有地点',INPUT:'缺少本动作需要的原料',BUFFER:'产物槽已满，先取走产物',GROWTH:'树木还在生长',RESIN:'等待树脂恢复'}[a.blocked]||'条件未满足';return{pct:0,txt:'已暂停，'+reason,txtS:'已暂停'};}
  if(a.type==='riverwash'){return {pct:a.repeat?0:Math.min(1,a.done/Math.max(1,a.target)),txt:(a.repeat?'持续洗矿':'河岸洗矿')+'，已清洗 '+queueNumber(a.done)+' 件',txtS:'洗矿 '+queueNumber(a.done)+' 件'};}
  if (a.type === 'gather') {
    const s = ACTIVITIES.definitions[a.src];
    if(!s)return {pct:0,txt:'动作定义不存在',txtS:''};
    if(s.progress)return s.progress(S,a,extra);
    const t = activityDuration(s,a);
    const p = Math.min(a.prog + extra, t);
    return {
      pct: a.repeat?p/t:(a.done + p / t) / a.target,
      txt: a.repeat?'持续采集，已完成 '+queueNumber(a.done)+' 次，本次剩余 '+queueTime(t-p):queueNumber(a.done) + ' / ' + queueNumber(a.target) + ' 次　本次还要 ' + queueTime(t - p),
      txtS: a.repeat?'挂机，'+queueNumber(a.done)+'次':queueNumber(a.done) + '/' + queueNumber(a.target),
    };
  }
  if (a.type === 'explore') {
    const t = secs(EXPLORE_CYCLE);
    const p = Math.min(a.prog + extra, t);
    return {
      pct: (a.done + p / t) / a.cycles,
      txt: queueNumber(a.done) + ' / ' + queueNumber(a.cycles) + ' 条　这条还要 ' + queueTime(t - p),
      txtS: queueNumber(a.done) + '/' + queueNumber(a.cycles) + ' 条',
    };
  }
  if (a.type === 'mine') {
    const period=MINING.previewPeriod(S,a)||TICK,done=a.done||0,total=Math.max(1,a.target||a.vol||a.vein.left),progress=Math.max(0,Math.min((a.prog||0)+extra,period));
    return {
      pct: Math.min(1,(done+progress/period)/total),
      txt: '已采 ' + queueNumber(done) + ' / ' + queueNumber(total) + ' 块　本次还要 '+queueTime(period-progress)+'　矿脉剩余 ' + queueNumber(a.vein.left),
      txtS: queueNumber(done) + '/' + queueNumber(total),
    };
  }
  return { pct: 0, txt: '', txtS: '' };
}

/* ============================ 时间与天气 ============================
 * 规则来源见文件开头的 ENV_* 常量（照抄原版放置格雷）。
 * 这里只管算和画。以后发电页做太阳能，直接读 env().solar 就行。 */

const WEATHER_KEYS = ['clear', 'rain', 'thunder', 'snow'];
const WEATHER_CN = { clear: '晴朗', rain: '降雨', thunder: '雷雨', snow: '降雪' };

/** 世界日历：给 elapsed 秒，算出第几天 / 年月日 / 季节。 */
function calendarAt(elapsed){return ENVIRONMENT.calendar(elapsed);}

/** 某个维度现在的环境。天气只有主世界有，其它维度恒晴恒白天（跟原版一样）。 */
function visualEnvironment(){
  if(!visualEnvironment.current||!FACTORY.hasPendingTicks())visualEnvironment.current={elapsed:S.env.elapsed,weather:S.env.weather};
  return visualEnvironment.current;
}
function env(dim,visual) {
  const e = visual?visualEnvironment():S.env;
  const outdoor = (dim || S.ui.dim) === 'overworld';
  const t = e.elapsed % ENV_DAY;
  const day = outdoor ? t < ENV_DAY / 2 : true;
  const weather = outdoor ? e.weather : 'clear';
  const solar = !day ? 0
    : weather === 'clear' ? 1
    : weather === 'rain' ? 0.35
    : weather === 'snow' ? 0.25 : 0.15;
  return Object.assign(calendarAt(e.elapsed), {
    day: day, weather: weather, solar: solar,
    t: t,                                      // 当天已经过了多少秒
    time: Math.floor(t / ENV_DAY * 24000),     // MC 的 0~24000 刻度，0 = 早上 6 点
  });
}

function setWeather(weather,duration){ENVIRONMENT.setWeather(S,weather,duration);}
function advanceEnv(dt){ENVIRONMENT.advance(S,dt);}

/** MC 刻度换算成 24 小时制钟点。0 刻度 = 06:00。 */
function clockText(e) {
  const mins = Math.floor(e.time / 1000 * 60);
  const hh = (Math.floor(mins / 60) + 6) % 24;
  const mm = mins % 60;
  return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
}

const CRAFT_BACKGROUND = { u: 'bg/craft.jpg', pix: false };

/* 五个标签页各有四张，跟着**游戏里的时间和天气**换：仓库/农业/机器/产线/设置。
 * 素材来自 GTNH_tabs_weather_backgrounds_20261016_v01（2026-10-16 到货）：
 * 每个场景的白天/夜晚/雨天/雪天是同一处景，夜晚和天气版沿用白天版的构图，
 * 所以换天气换昼夜不会跳景。四张白天版和上一批同场景的图逐字节一致，已核对过。
 * 文件名一律 <页>_<状态>.webp，状态就是 day / night / rain / snow，
 * 跟包里的 manifest.json（scene_id + condition）是一条线，接的时候不会串。 */
const BG_TAB = {
  chest:    { day: 'bg/chest_day.webp',    night: 'bg/chest_night.webp',
              rain: 'bg/chest_rain.webp',  snow: 'bg/chest_snow.webp' },
  agri:     { day: 'bg/agri_day.webp',     night: 'bg/agri_night.webp',
              rain: 'bg/agri_rain.webp',   snow: 'bg/agri_snow.webp' },
  machine:  { day: 'bg/machine_day.webp',  night: 'bg/machine_night.webp',
              rain: 'bg/machine_rain.webp', snow: 'bg/machine_snow.webp' },
  line:     { day: 'bg/line_day.webp',     night: 'bg/line_night.webp',
              rain: 'bg/line_rain.webp',   snow: 'bg/line_snow.webp' },
  settings: { day: 'bg/settings_day.webp', night: 'bg/settings_night.webp',
              rain: 'bg/settings_rain.webp', snow: 'bg/settings_snow.webp' },
};

/* 哪些标签页有自己的背景图。合成页只有一张（素材包里没有它的天气变体）；
 * 另外五个走 BG_TAB，一页四张。没列进来的页就是不铺图，只留渐变底色。 */
const BG_PAGE = {
  craft: 'craft', chest: 'chest', agri: 'agri', machine: 'machine',
  line: 'line', settings: 'settings',
};

/** 现在的天气和昼夜对应的那一档：rain / snow / day / night。
 *  天气优先于昼夜 —— 雨雷共用雨天，雪用雪天，晴天再看天黑没黑。 */
function bgCond() {
  const e = env('overworld',true);
  if (e.weather === 'rain' || e.weather === 'thunder') return 'rain';
  if (e.weather === 'snow') return 'snow';
  return e.day ? 'day' : 'night';
}

/** 页面背景。世界地图在自己的区域内绘制。 */
function bgNow(dimension) {
  if(S.ui.page==='space')return {u:SPACE_UI.background(S),pix:false};
  if (S.ui.page === 'line') {
    const background = SPACE_UI.destinationBackground(dimension);
    if (background) return { u: background, pix: false };
  }
  const page = BG_PAGE[S.ui.page];
  if (!page) return null;
  const backgrounds = BG_TAB[page];
  return backgrounds ? { u: backgrounds[bgCond()], pix: false } : CRAFT_BACKGROUND;
}

let bgShown = '';    // 现在铺着的是哪张图；'' = 没铺
let bgTop = 0;       // 两层里现在露在上面的是第几层

/* 换背景淡入淡出的毫秒数。**这是真实时间**，跟 tick、调试倍速、世界时钟
 * 一点关系都没有 —— 它只是 CSS transition 的时长，浏览器按挂钟走。
 * 玩家自己点出来的切换要跟手（快了才不拖沓），天气/时间自己变的可以慢一点。 */
const BG_FADE_FAST = 260;    // 切页、切维度
const BG_FADE_SLOW = 1100;   // 天气与昼夜变化

function applyBg(fade, dimension) {
  const want = bgNow(dimension);
  const url = want ? want.u : '';
  if (url === bgShown) return;         // 没变就别动，免得每 5 次/秒重来一遍
  const a = $('#bg0'), b = $('#bg1');
  if (!a || !b) return;
  bgShown = url;
  const top = bgTop ? b : a, bot = bgTop ? a : b;
  const ms = (fade || BG_FADE_SLOW) + 'ms';
  top.style.transitionDuration = ms;   // 旧的淡出和新的淡入用同一个时长
  bot.style.transitionDuration = ms;
  if (!url) { top.classList.remove('on'); return; }
  // 新图放进藏着的那层，然后把两层的不透明度对调，浏览器自己补间
  bot.style.backgroundImage = 'url("' + url + '")';
  bot.style.imageRendering = want.pix ? 'pixelated' : 'auto';
  bot.classList.add('on');
  top.classList.remove('on');
  bgTop = 1 - bgTop;
}

/** 顶栏那个时钟。 */
function renderEnv() {
  const el = $('#env');
  if (!el) return;
  const e = env('overworld',true);
  const txt = (e.day ? '☀ ' : '☾ ') + clockText(e) + '，' + WEATHER_CN[e.weather] + '，第'+e.dayNo+'天，'+e.year+'年'+e.month+'月'+e.date+'日，'+e.season+'季';
  if (el.textContent !== txt) el.textContent = txt;
  el.title = '第 ' + e.dayNo + ' 天，' + e.year + '年' + e.month + '月' + e.date + '日，' +
    e.season + '季，太阳能 ' + Math.round(e.solar * 100) + '%';
}

/** 时钟 + 背景，一起刷新。切页、切维度、走时间都要过一遍。
 *  fast = true 是玩家点出来的（切页/切维度），淡得快一点；不传就是天气
 *  和时间自己变的，慢慢淡。两种都是真实毫秒，跟游戏速度无关。 */
function syncEnv(fast) {
  renderEnv();
  if (S.ui.page === 'world') WORLD_MAP_UI.refreshArt(S,env('overworld',true),fast);
  const dimension = S.ui.page === 'line'
    ? (S.fx?.blueprints?.length ? BLUEPRINTS.activeRepo(S.fx).dimension : 'overworld') : S.ui.dim;
  applyBg(fast ? BG_FADE_FAST : BG_FADE_SLOW, dimension);
  const weather = S.ui.page === 'line' && dimension !== 'overworld' ? 'clear' : visualEnvironment().weather;
  APPEARANCE.sync(S.ui.page,dimension,weather);
}

/* ---- 任务书 ----

 * 原文是从 BetterQuesting 的中文 lang 直接搬过来的，里面带着它自己的
 * 富文本标签：[note] [warn] [url]。以前是当字面量漏在界面上，一堆方括号。
 * 这里换成对应样式的 span，剩下的野生方括号一律抹掉。 */
function questText(s) {
  let h = esc(s);
  h = h.replace(/\[note\]([\s\S]*?)\[\/note\]/g, '<i class="qx-note">$1</i>');
  h = h.replace(/\[warn\]([\s\S]*?)\[\/warn\]/g, '<i class="qx-warn">$1</i>');
  h = h.replace(/\[url\]([\s\S]*?)\[\/url\]/g,
    '<a class="qx-url" href="$1" target="_blank" rel="noreferrer noopener">$1</a>');
  h = h.replace(/\[\/?[a-zA-Z][a-zA-Z0-9_]*\]/g, '');   // 没配对的也清掉
  return h.replace(/\n{3,}/g, '\n\n').replace(/\n/g, '<br>');
}

/** 一件需求物品的小标签：图标 + 已有/需要。够了是绿的、打勾，不够是红的。 */
function qChip(k,n,withName,actualCount,options={}) {
  const label=options.label||nameOf(k),frozen=options.done||options.optional;
  const got=frozen?null:Math.min(actualCount??questHave(k),n),ok=options.done||!frozen&&got>=n;
  const note=options.done?'已完成':options.optional?'':got+'/'+n;
  return '<button type="button" class="qchip '+(options.optional?'reference':options.done?'completed':ok?'ok':'no')+'" data-quest-item="'+esc(k)+'" title="'+esc(label+' ×'+n+(note?'，'+note:'')+'，左键配方 / 右键用途')+'">'+iconHtml(k,16)+(withName?'<em>'+esc(label)+'</em>':'')+'<b>'+(frozen?'×'+n:got+'/'+n)+'</b></button>';
}
function questRequirementsHtml(q,withName,optional=false){
  const groups=QUESTS.groups(q,optional),r=QUESTS.rule(q),done=!!S.quests[q.id];let h=groups.length>1&&!optional&&r.taskLogic==='OR'?'<small class="quest-route-note">满足以下任一组即可</small>':'';
  groups.forEach((g,i)=>{const task=QUESTS.taskInfo(S,g);if(task){h+='<div class="quest-operation '+(done||task.met?'met':'')+'"><span>'+(done||task.met?'✓':'○')+'</span> '+esc(task.text)+'</div>';return;}if(g.type==='checkbox'){var checked=done||!!(S.questChecks&&S.questChecks[g.qid]);h+=checked?'<span class="quest-note">已确认说明</span>':'<button type="button" class="btn" data-qcheck="'+g.qid+'">确认阅读</button>';return;}if(g.type==='location'){h+='<span class="quest-note">'+(done||QUESTS.groupMet(S,g)?'已开通':'需要开通')+'下界入口</span>';return;}
    h+='<div class="quest-group">'+(groups.length>1&&!optional&&r.taskLogic==='OR'?'<small>路线 '+(i+1)+'</small>':'')+(g.requireOnlyOneItem?'<small>任选一项</small>':'')+g.items.map(p=>{const key=QUESTS.displayKey(S,p,g,done||optional);return qChip(key,p.n,withName,done||optional?null:QUESTS.progress(S,q,g,p),{label:QUESTS.label(p),done:done,optional:optional});}).join('')+'</div>';
  });return h;
}
function questPrerequisitesHtml(q){
  const rule=QUESTS.rule(q);if(!rule.pre.length)return '';
  return '<section class="quest-prerequisites"><h4>前置任务 <span>'+ (rule.preLogic==='XOR'?'二选一，另一条路线将关闭':rule.preLogic==='OR'?'完成任意一个':'全部完成')+'</span></h4>'+rule.pre.map(id=>{const pre=questIndex().get(id),met=!!S.qever[id];return '<button type="button" class="quest-pre '+(met?'met':'')+'" data-quest-jump="'+id+'"'+(pre?'':' disabled')+' title="'+esc(pre?'跳转到 '+pre.name:'')+'"><span class="quest-pre-mark" aria-label="'+(met?'已满足':'未完成')+'">'+(met?'✓':'○')+'</span><span><strong>'+esc(pre?pre.name:'任务 '+id)+'</strong><small>'+esc(pre?pre.chapcn||pre.chap:'')+'</small></span><span aria-hidden="true">↗</span></button>';}).join('')+'</section>';
}
function jumpQuest(id, details=true){
  const q=questIndex().get(id);
  if(!q)return;
  if(q.chap!==qChapNow())questScrolls.set(qChapNow(),$('#questlist').scrollTop);
  questJumpPointer=questPointer||[0,0];
  hideQtip(); closeQuestMarkers(); $('#quest-search-results').hidden=true;
  S.qfold.open=q.chap; S.ui.qopen=null; S.ui.qtarget=id;
  toggleQuests(false); JEI.view('quests'); renderQuests();
  const card=$('#questlist [data-quest="'+id+'"]'), list=$('#questlist');
  if(card){
    const bounds=card.getBoundingClientRect(), viewport=list.getBoundingClientRect();
    list.scrollTop+=(bounds.top+bounds.height/2-viewport.top-viewport.height/2)/uiZoom();
    card.focus({preventScroll:true});
    renderQuestMarkers();
    if(details) showQtip(card);
  }
  save();
}
const QUEST_BY_ID = new Map();
function questIndex() {
  if (QUEST_BY_ID.size !== GD.quests.length) {
    QUEST_BY_ID.clear();
    for (const q of GD.quests) QUEST_BY_ID.set(q.id, q);
  }
  return QUEST_BY_ID;
}

/** 任务按章节分组，章节按原版顺序排。返回 [[章节键, {cn, i, list}], ...]。 */
function questChaps() {
  const g = new Map();
  for (const q of GD.quests) {
    let x = g.get(q.chap);
    if (!x) {
      x = { cn: q.chapcn || q.chap, i: q.chapi == null ? 999 : q.chapi, list: [] };
      g.set(q.chap, x);
    }
    x.list.push(q);
  }
  return [...g].sort((a, b) => a[1].i - b[1].i || (a[1].cn < b[1].cn ? -1 : 1));
}

/** 第一次打开任务书时摊开哪一章：按顺序找第一个还有没做完的任务的章节。
 *  全做完了就摊第一章。找不到（没任务）就 null。
 *  玩家自己点过之后就以他点的为准，这里不再插手。 */
function defaultQChap() {
  const cs = questChaps();
  for (const [k, g] of cs) {
    if (g.list.some(q => !S.quests[q.id])) return k;
  }
  return cs.length ? cs[0][0] : null;
}

/** 章节名在窄面板里横着放不下全部，标签上用短名。
 *  "第0阶-石器时代" → "石器时代"，"第1阶-低压(LV)" → "低压"。
 *  去掉的只是阶段前缀和电压缩写，完整名字挂在标签的 title 上，
 *  鼠标停上去就能看全 —— 而且需求浮层里写的一直是全名。 */
function chapShort(cn) {
  const s = String(cn)
    .replace(/^第\s*[\d.]+\s*阶\s*[-－—:：]?\s*/, '')
    .replace(/[（(][^）)]*[）)]\s*$/, '')
    .trim();
  return s || String(cn);
}

/** 任务书当前选中的章节。存的键不管用了（老存档、章节改名）就退回默认那一章。 */
function qChapNow(cs) {
  cs = cs || questChaps();
  const k = S.qfold.open;
  if (k && cs.some(x => x[0] === k)) return k;
  return cs.length ? cs[0][0] : null;
}

function renderQuests(known){return QUESTS.withSnapshot(S,()=>renderQuestsBody(known||QUESTS.overview(S)));}
function patchQuestHtml(el,html){if(el._questHtml===html)return;UI_KIT.patch(el,html);el._questHtml=html;}
let questGraph=null, questOverview=null, questMarkerSide=null, questPinGroups=null, questSearchMatches=[];
const questScrolls=new Map();
const questIconKeys=new WeakMap();
function questIcon(q,size){
  if(!questIconKeys.has(q)) {
    const p=QUESTS.groups(q).find(group=>group.items?.length)?.items[0];
    questIconKeys.set(q,p?.k||null);
  }
  const key=questIconKeys.get(q);
  return key?iconOrText(key,size):UI_KIT.glyph('book',size);
}
function closeQuestMarkers(){
  if(!questMarkerSide)return;
  questMarkerSide=null; renderQuestMarkers();
}
function renderQuestMarkers(){
  const list=$('#questlist'), rail=$('#questmarkers');
  if(!questGraph||!list.clientHeight)return;
  const groups=questPinGroups=QUEST_TREE.pinPositions(questGraph,list.scrollTop,list.clientHeight);
  function pin(id,cls,attrs){
    const q=questIndex().get(id);
    return '<button type="button" class="'+cls+'" '+attrs+' data-quest-marker="'+id+'" aria-label="'+esc('跳到 '+q.name)+'" title="'+esc(q.name)+'">'+questIcon(q,18)+'</button>';
  }
  let html=groups.visible.map(({id,y})=>pin(id,'quest-pin'+(id===S.ui.qtarget?' selected':''),'style="top:'+y+'px" data-ui-key="pin:'+id+'"')).join('');
  for(const side of ['above','below']){
    const pins=groups[side], direction=side==='above'?'上方':'下方', arrow=side==='above'?'↑':'↓';
    if(!pins.length)continue;
    const label=pins.length===1?'跳到 '+questIndex().get(pins[0].id).name:direction+'还有 '+pins.length+' 条';
    html+='<button type="button" class="quest-edge-pin '+side+'" data-quest-edge="'+side+'" data-ui-key="'+side+'" aria-expanded="'+(questMarkerSide===side)+'" aria-label="'+esc(label)+'" title="'+esc(label)+'">'+
      (pins.length===1?questIcon(questIndex().get(pins[0].id),18)+'<small>'+arrow+'</small>':arrow+pins.length)+'</button>';
    if(questMarkerSide===side && pins.length>1){
      html+='<div class="quest-pin-menu '+side+'" data-ui-key="menu"><h4>'+direction+'任务</h4>'+pins.map(({id})=>{
        const q=questIndex().get(id);
        return '<button type="button" data-quest-marker="'+id+'" data-ui-key="menu:'+id+'">'+questIcon(q,20)+'<span>'+esc(q.name)+'</span></button>';
      }).join('')+'</div>';
    }
  }
  patchQuestHtml(rail,html);
}
function renderQuestSearch(open=true){
  const field=$('#quest-search'), results=$('#quest-search-results'), query=field.value.trim();
  $('#quest-search-ready').setAttribute('aria-pressed',String(query==='@complete'));
  results.hidden=!open||!query;
  if(results.hidden)return;
  questSearchMatches=QUEST_TREE.search(query,qChapNow(),questOverview?.states||{});
  const status=questOverview?.states||{};
  patchQuestHtml(results,'<div class="quest-search-count" role="status">'+(questSearchMatches.length?questSearchMatches.length+' 项任务':'未找到任务')+'</div>'+
    questSearchMatches.map(q=>'<button type="button" data-quest-jump="'+q.id+'" data-ui-key="search:'+q.id+'">'+questIcon(q,22)+'<span>'+esc(q.name)+'<small>'+esc(q.chapcn||q.chap)+'</small></span><small>'+esc(QUEST_TREE.labels[status[q.id]?.kind]||'')+'</small></button>').join(''));
}
function renderQuestsBody(overview) {
  const byId=questIndex(),cs=questChaps(),cur=qChapNow(cs),list=$('#questlist'),keepY=list.scrollTop;
  questOverview=overview;
  const tipId=qtipFor?+qtipFor.dataset.quest:null,tipVisible=!$('#qtip').hidden;
  let nav='',progressNav='',topicNav='';const progressChapters=new Set(['AndSoItBegins','Tier0StoneAge','Tier05Steam','Tier1LV','Tier2MV','Tier3HV','SpaceRace']);for(const [key,g] of cs){const stats=overview.chapters[key],complete=stats.done===stats.total,pending=stats.pending>0;
    nav='<button type="button" class="qchap'+(key===cur?' on':'')+(complete?' complete':pending?' pending':'')+'" data-qchap="'+esc(key)+'" title="'+esc(g.cn+'，'+stats.done+'/'+stats.total+(complete?'，全部完成':pending?'，'+stats.pending+' 个待确认':''))+'" aria-pressed="'+(key===cur)+'">'+esc(chapShort(g.cn))+'<span class="cc">'+stats.done+'/'+stats.total+'</span><span class="qchap-mark" aria-label="'+(complete?'全部完成':pending?'待确认':'尚未完成')+'">'+(complete?'✓':pending?'!':'')+'</span></button>';
  if(progressChapters.has(key))progressNav+=nav;else topicNav+=nav;}patchQuestHtml($('#questchaps'),'<div class="quest-chapter-grid">'+progressNav+'</div><div class="quest-chapter-grid quest-topic-grid">'+topicNav+'</div>');
  const chapter=cs.find(x=>x[0]===cur);
  questGraph=chapter?QUEST_TREE.layout(cur,chapter[1].list):null;
  patchQuestHtml(list,questGraph?QUEST_TREE.html(questGraph,byId,overview.states,S.ui.qtarget,questIcon,esc):'');
  list.scrollTop=keepY; renderQuestMarkers();
  if(!$('#quest-search-results').hidden && $('#quest-search').value.trim().startsWith('@'))renderQuestSearch();
  $('#questcount').textContent=overview.done+' / '+GD.quests.length;renderQBadge(overview.pending);renderTop();
  if(tipVisible&&tipId!==null){qtipFor=$('#questlist [data-quest="'+tipId+'"]');const q=byId.get(tipId);if(qtipFor&&q){renderQtip(q,overview.states[tipId]);placeQtip(qtipFor);}else hideQtip();}
}

/* ---- 鼠标停在任务上时那个需求浮层 ---- */

let qtipFor = null, qtipHideTimer=0;
let questPointer=null, questJumpPointer=null;
function deferHideQtip(){clearTimeout(qtipHideTimer);qtipHideTimer=setTimeout(hideQtip,220);}
$('#qtip').addEventListener('mouseenter',()=>clearTimeout(qtipHideTimer));

function hideQtip() {
  clearTimeout(qtipHideTimer);
  const t = $('#qtip');
  qtipFor = null;
  if (t) t.hidden = true;
}

function renderQtip(q,known){return QUESTS.withSnapshot(S,()=>renderQtipBody(q,known||QUESTS.status(S,q)));}
function renderQtipBody(q,state) {
  const t=$('#qtip');if(!t||!q)return;const rows=questRequirementsHtml(q,true);
  const optionalOpen=!t.hidden&&t.dataset.quest===String(q.id)&&!!t.querySelector('details.quest-optional[open]');
  const optional=QUESTS.groups(q,true).length?'<details class="quest-optional"'+(optionalOpen?' open':'')+'><summary>可选材料</summary>'+questRequirementsHtml(q,true,true)+'</details>':'';
  const following=QUEST_TREE.following(q.id);
  const next=following.length?'<details class="quest-following"'+(!t.hidden&&t.dataset.quest===String(q.id)&&t.querySelector('.quest-following[open]')?' open':'')+'><summary>后续任务</summary>'+
    following.map(task=>'<button type="button" class="quest-pre" data-quest-jump="'+task.id+'"><span class="quest-pre-mark" aria-hidden="true">↗</span><span><strong>'+esc(task.name)+'</strong><small>'+esc(task.chapcn||task.chap)+'</small></span></button>').join('')+'</details>':'';
  let action='';
  if(state.can)action='<button type="button" class="qclaim" data-qclaim="'+q.id+'">确认完成</button>';
  else if(DEVELOPER_MODE.active(S)){
    if(state.done)action='<button type="button" class="qback" data-qback="'+q.id+'">退回完成前</button>';
    else if(state.ready)action='<button type="button" class="qclaim" data-q-dev-complete="'+q.id+'">直接完成</button>';
  }
  patchQuestHtml(t,'<div class="tiphead">'+esc(q.chapcn||q.chap)+'</div><div class="quest-tip-heading"><div class="tiptitle">'+esc(q.name)+'</div><span class="quest-tip-status '+state.kind+'">'+QUEST_TREE.labels[state.kind]+'</span></div>'+
    (rows?'<section class="quest-tip-requirements"><h4>'+(state.done?'已达成的条件':'完成条件')+'</h4>'+rows+'</section>':'')+
    optional+questPrerequisitesHtml(q)+(q.desc?'<div class="quest-description">'+questText(q.desc)+'</div>':'')+action+next);
  if(t.dataset.quest!==String(q.id)||t.hidden)t.scrollTop=0;
  t.dataset.quest=q.id; t.hidden=false;
}
function showQtip(card){
  const q=questIndex().get(+card.dataset.quest);
  if(!q)return;
  clearTimeout(qtipHideTimer);
  qtipFor=card;
  renderQtip(q);
  placeQtip(card);
}
function placeQtip(card) {
  const t=$('#qtip'),app=$('#app');if(!t||!app||!card||!card.isConnected)return;
  const zoom=uiZoom(),bounds=app.getBoundingClientRect(),anchor=card.getBoundingClientRect(),width=Math.min(320,app.clientWidth-16);
  t.style.width=width+'px';t.style.maxHeight=Math.max(60,app.clientHeight-16)+'px';t.style.right='auto';
  t.style.left=Math.max(8,Math.min((anchor.left-bounds.left)/zoom-width-10,app.clientWidth-width-8))+'px';
  t.style.top=Math.max(8,Math.min((anchor.top-bounds.top)/zoom,app.clientHeight-t.offsetHeight-8))+'px';
}

/** 任务书整本收起来 / 展开。收起只是宽度归零，不影响别的面板。 */
function toggleQuests(shut) {
  const a = $('#app');
  if (!a) return;
  const v = shut === undefined ? !a.classList.contains('qclosed') : !!shut;
  a.classList.toggle('qclosed', v);
  S.qfold.closed = v;
  if (v) hideQtip();
  save();
}

/* --- 顶栏 --- */
function renderTop() {
  const a = S.act;
  let h;
  if (a) {
    const f = actFrac(a, 0);
    h = '<span>' + esc(actName(a)) + '</span>' + bar(f.pct) +
        '<span class="dim">' + esc(f.txtS) + '</span>' +
        '<button class="btn" data-cancel="1">取消</button>';
  } else {
    h = '<span class="dim">空闲 —— 你在闲着</span>';
  }
  UI_KIT.patch($('#topslot'),h+WORLD_UI.queueButton(S));
  WORLD_UI.queue(S);
  const used = S.inv.filter(Boolean).length;
  $('#invcount').textContent = '背包 ' + used + '/' + INV_SLOTS;
}

const srcTime = a => activityDuration(ACTIVITIES.definitions[a.src] || {time:1},a);

/* --- 动作槽 + 选数量 + 可做的事 ---
 * 这三块是同一格：空闲提示 / 干活进度 / 选数量，来回换。
 * 所以选数量要顶掉这一格而不是另开一块，否则下面的卡片会整体往下跳。 */
function renderSlot() {
  const p = S.ui.pick;
  const a = S.act;
  let h;
  if (p&&!p.popup) {
    h = pickerHtml(p);
  } else if (a) {
    const f = actFrac(a, 0);
    h = '<div class="slotbox">' +
      '<div class="slotname">' + esc(actName(a)) + '</div>' +
      '<div class="slotrow">' + bar(f.pct) + '<span data-p>' + esc(f.txt) + '</span>' +
      '<button class="btn" data-cancel="1">取消</button></div></div>';
  } else {
    h = '<div class="slotbox idle">'+UI_KIT.glyph('clock',22)+'<span>现在空闲。挑一件事开始。</span></div>';
  }
  UI_KIT.patch($('#slot'),h);
  renderActions();
}

 
 
 
function pickerLimit(p) {
  if (p.type==='mine') {
    const vein = S.veins.find(v=>v.id===p.id);
    return vein ? MINING.remaining(vein) : 0;
  }
  if (p.type==='explore'||p.id==='village_search') {
    return WORLD_DISCOVERY.discoveryRoom(S,p.type==='explore'?'veins':'villages',p.dim||S.ui.dim);
  }
  return ACTIVITIES.batchLimit(S,ACTIVITIES.definitions[p.id]);
}
function pickerHtml(p) {
  const available=pickerLimit(p),max=Math.max(0,available),min=available?1:0;p.n=available?Math.max(1,Math.min(p.n,max)):0;
  const expedition=p.type==='gather'&&!!ACTIVITIES.definitions[p.id]?.adventure;
  const expeditionFree=(function(){const ad=ACTIVITIES.definitions[p.id]?.adventure;const enc=ad&&ADVENTURES.encounters[ad.encounter];return !!(enc&&enc.noSupplies);})();
  const unit = p.type==='mine'?' 块':p.type === 'explore' ? ' 条' : p.id==='village_search'?' 座':' 次';
  const hint = p.type === 'explore'
    ? '勘探一次需要 ' + fmtTime(secs(EXPLORE_CYCLE))
    : expeditionFree?'随时可挑战；库存满时，多余收益丢弃':expedition?'每次消耗1处地点和1份库存熟食；库存满时，多余收益丢弃':'完成后继续下一项行动';
  return '<div class="slotbox pick" data-item-controls="true" data-ui-key="picker:'+esc(p.type+':'+p.id+':'+(p.dim||''))+'">' +
    '<div class="pkrow"><b>' + esc(p.name) + '</b>' +
      '<span class="dim">' + hint + '</span></div>' +
    '<div class="pkrow">' +
      '<input type="range" min="'+min+'" max="' + max + '" value="' + p.n + '" data-range="1"'+(available?'':' disabled')+'>' +
      '<input class="pknum" type="number" min="'+min+'" max="' + max + '" value="' + p.n +
        '" data-num="1"'+(available?'':' disabled')+'>' +
      '<span class="pkn">' + unit + '</span>' +
      '<button class="btn" data-gostart="1"'+(available?'':' disabled')+'>加入队列</button>' +
      (p.type==='gather'&&p.id!=='village_search'&&ACTIVITIES.canRepeat(ACTIVITIES.definitions[p.id])?'<button class="btn" data-repeatgo="1">持续采集</button>':'') +
      '<button class="btn" data-pkcancel="1">算了</button>' +
    '</div></div>';
}

/* ============================ 世界页 ============================ */

/** 当前维度的显示名。 */
function dimName(k) {
  const d = (GD.dims || []).find(x => x.key === k);
  return d ? d.name : (window.DIMENSIONS ? DIMENSIONS.name(k) : k);
}

function inDim(x) { return (x.dim || 'overworld') === S.ui.dim; }

/** 配色主题挂在 #app 上：这样顶栏、左侧导航、任务书、底部工具槽都跟着染色，
 *  背景图也铺满整个窗口，不再只是中间那一块。规则见 style.css 的「分页配色」。 */
function applyTheme() {
  const a = $('#app');
  if (!a) return;
  a.dataset.page = S.ui.page || 'world';
  a.dataset.dim = S.ui.page==='agri'?'overworld':S.ui.dim||'overworld';
  // 任务书收起状态是存盘的，切页也要保持
  if (S.qfold) a.classList.toggle('qclosed', !!S.qfold.closed);
  // 只有玩家切页/切维度才会走到这里，所以用快的那档淡入淡出
  syncEnv(true);
}

let dimTabsHtml;
function renderDimTabs() {
  // 星球维度在登陆过之后才出现；旧维度沿用通道开关，两边共用 DIMENSIONS.open 一处判断。
  const dims = (GD.dims || []).filter(d => !DIMENSIONS.isSpace(d.key) || DIMENSIONS.open(S, d.key));
  const html = dims.map(d => {
    const opened = DIMENSIONS.open(S, d.key);
    const hint=opened?'':d.key==='end'?'前往荒野冒险':'未解锁';
    return '<button class="dimtab' + (S.ui.dim === d.key ? ' on' : '') +
      '" data-dimtab="' + d.key + '"'+(!opened&&d.key!=='end'?' aria-disabled="true"':'')+(hint?' data-tip="'+hint+'"':'')+'>' + iconHtml('@dim/' + d.key, 32) +
      '<span>' + esc(d.name) + (opened?'':'，未开通')+'</span></button>';
  }).join('');
  if(dimTabsHtml!==html){
    UI_KIT.patch($('#dimtabs'),html);
    dimTabsHtml=html;
  }
}

/** 一张大卡片：大图标 + 名字 + 小字说明。attr 是点击用的 data-*，cls 是额外类名。 */
function cardHtml(icon, title, sub, attr, cls) {
  return '<div class="card' + (cls || '') + '" ' + attr + '>' +
    (icon ? '<div class="cardic">' + icon + '</div>' : '') +
    '<div class="cardtx"><b>' + title + '</b>' +
    (sub ? '<small>' + sub + '</small>' : '') + '</div></div>';
}

function renderActions(){WORLD_UI.render(S);}

/* ============================ 设置页：调试 ============================
 * 开发者模式将单次加工压缩为1tick，游戏时钟保持20TPS；批次保留正常工期用于切换恢复。
 * 指令台只是个调试入口，不是给玩家玩的内容。 */

let cmdLog = [];        // 指令台输出。故意不存档。

function renderSettings() {
  UI_KIT.mount($('#page-settings'));
  renderZoom();
  APPEARANCE.render($('#appearance-settings'));
  renderDbg();
  renderCmdLog();
}

/** 界面缩放的调节。给个滑块式的 −/＋ 和几个常用档。 */
function renderZoom() {
  const z = S.zoom || ZOOM_DEF;
  let h = '<div class="dbgrow" role="group" aria-label="调整界面缩放">' +
    '<button class="btn" data-zoom="-10" aria-label="缩小界面"' + (z <= ZOOM_MIN ? ' disabled' : '') +
    '>−</button>' +
    '<b class="znum">' + z + '%</b>' +
    '<button class="btn" data-zoom="+10" aria-label="放大界面"' + (z >= ZOOM_MAX ? ' disabled' : '') +
    '>＋</button>' +
    '<button class="btn" data-zoom="reset">默认</button></div>';
  h += '<div class="dbgrow" role="group" aria-label="缩放预设">' +
    [100, 115, 130, 150, 175, 200].map(n =>
      '<button class="btn' + (z === n ? ' on' : '') + '" data-zoom="' + n + '">' +
      n + '%</button>').join('') + '</div>';
  $('#zoombox').innerHTML = h;
}

function renderDbg() {
  const d = DEVELOPER_MODE.read(S);
  let h = '<div class="dbgrow"><span class="dbglab">调试模式</span>' +
    '<button class="btn' + (d.on ? ' on' : '') + '" data-dbg="1">' +
    (d.on ? '已打开' : '已关闭') + '</button>' +
    '</div>';

  if(d.on){
  h += '<div class="dbgrow"><span class="dbglab">加工时间</span>';
  h += '<button class="btn' + (!d.fastest ? ' on' : '') + '" data-spd="1"' +
    (d.on ? '' : ' disabled') + '>正常</button>';
  h += '<button class="btn' + (d.on && d.fastest ? ' on' : '') + '" data-spd="tick"' +
    (d.on ? '' : ' disabled') + '>1tick</button></div>';
  h += '<div class="dbgrow"><span class="dbglab">不消耗工具耐久</span><button class="btn'+(TOOL_WEAR.preserved(S)?' on':'')+'" data-no-tool-wear="1" aria-pressed="'+TOOL_WEAR.preserved(S)+'">'+(TOOL_WEAR.preserved(S)?'已开启':'已关闭')+'</button></div>';

  h += '<label class="dbgrow"><span class="dbglab">昼夜与天气</span><select class="btn" data-environment-rate="1" aria-label="昼夜与天气速度"><option value="1">正常</option><option value="10">10倍</option></select></label>';
  h += '<div class="dbgrow"><span class="dbglab">切换天气</span><button class="btn" data-test-weather="rain">降雨</button><button class="btn" data-test-weather="snow">降雪</button></div>';
  }
  const box=$('#dbgbox');UI_KIT.patch(box,h);
  const rate=box.querySelector('[data-environment-rate]');if(rate)rate.value=String(GAME_TIME.environmentRate(S));
  box.onchange=e=>{if(!DEVELOPER_MODE.active(S)||!e.target.dataset.environmentRate)return;GAME_TIME.setEnvironmentRate(S,e.target.value);syncEnv();save();};
  $('#developer-commands').hidden=!d.on;
}

function renderCmdLog() {
  const el = $('#cmdlog');
  if (!el) return;
  if (!cmdLog.length) {
    el.innerHTML = '<div class="dim">输 help 看有哪些指令。</div>';
    return;
  }
  el.innerHTML = cmdLog.map(l => '<div class="cl ' + l.t + '">' + esc(l.s) + '</div>').join('');
  el.scrollTop = el.scrollHeight;
}

function say(s, t) {
  cmdLog.push({ s: String(s), t: t || 'out' });
  if (cmdLog.length > 300) cmdLog.shift();
}

function runCmd(line) {
  const raw = String(line == null ? '' : line).trim();
  if (!raw) return;
  if(!DEVELOPER_MODE.active(S)&&!/^(debug|help)(\s|$)/i.test(raw))return;
  say('> ' + raw, 'in');
  const parts = raw.split(/\s+/);
  const fn = CMDS[parts[0].toLowerCase()];
  if (!fn) {
    say('没有这个指令：' + parts[0] + '。输 help 看一遍。', 'bad');
  } else {
    try { fn(parts.slice(1)); } catch (e) { say('执行出错：' + e.message, 'bad'); }
  }
  renderDbg();
  renderCmdLog();
  markInv();
  markDynamic();
}

/** 同名的物品不止一个时（例：橡木原木被某个模组也用了一遍），挑最像的那个。
 *  优先：图鉴里能合成 > 有图标 > 原版 minecraft: > id 短的。 */
function cmdRank(ks) {
  const score = k => (CATALOG.has(k) ? 4 : 0) + (GD.icons[k] ? 2 : 0) +
    (k.indexOf('minecraft:') === 0 ? 1 : 0);
  return ks.slice().sort((a, b) =>
    score(b) - score(a) || a.length - b.length || (a < b ? -1 : 1));
}

const CMDS = {
  help: () => {
    const rows = [
      ['help', '列出所有指令'],
      ['debug on | off', '开关调试模式'],
      ['speed normal | tick', '切换正常或1tick'],
      ['moon reset', '重置登月流程，保留工厂、物品和任务记录'],
      ['give <物品> [数量]', '往背包塞东西，名字 / 拼音 / 物品 id 都认'],
      ['kit [machine|gen|mat]', '发一套测试器材：42 类机器 LV 版、锅炉和蒸汽轮机、基础材料'],
      ['dim <维度>', '换维度：' + (GD.dims || []).map(d => d.name).join(' / ')],
      ['vein [数量]', '当前维度直接探出 N 条矿脉（默认 1）'],
      ['quest', '看还没做的任务'],
      ['quest <id>', '直接完成指定的已解锁任务'],
      ['quest -<id>', '退回完成前（后置不受影响）'],
      ['quest all | clear', '完成当前已解锁的任务 / 清空任务进度'],
      ['fur [数量]', '加熔炉'],
      ['weather <晴|雨|雷|雪> [秒]', '指定天气并维持 N 秒（默认 600）'],
      ['time <day|night|HH:MM>', '把世界时钟拨到白天 / 夜晚 / 某个钟点'],
      ['state', '看当前状态和各项数据量'],
    ];
    for (const r of rows) say(r[0] + '　——　' + r[1]);
  },

  debug: a => {
    const v = (a[0] || '').toLowerCase();
    if (v === 'on' || v === '1' || v === '开') setDeveloperTiming({on:true});
    else if (v === 'off' || v === '0' || v === '关') setDeveloperTiming({on:false});
    else setDeveloperTiming({on:!DEVELOPER_MODE.active(S)});
    say('调试模式 ' + (DEVELOPER_MODE.active(S) ? '打开' : '关闭') +
        (DEVELOPER_MODE.active(S) ? '（'+(GAME_TIME.oneTick(S)?'1tick':'正常')+'）' : ''));
  },

  speed: a => {
    const v = (a[0] || '').toLowerCase();
    if(!v) return say('用法：speed normal 或 speed tick', 'bad');
    if (v === 'tick' || v === '1tick' || v === '最短') {
      setDeveloperTiming({on:true,fastest:true});
      return say('1tick模式');
    }
    if (v!=='normal'&&v!=='1') return say('可用模式：normal、tick', 'bad');
    setDeveloperTiming({on:true,fastest:false,speed:1});
    say('正常游戏时间');
  },

  moon: a => {
    if(a.length!==1||a[0].toLowerCase()!=='reset')return say('用法：moon reset', 'bad');
    if(!ITEM_DRAG.returnHeld())return say('先放回鼠标上的物品', 'bad');
    closePopup();SPACE_UI.dismiss();
    const result=SPACEFLIGHT.resetMoon(S);
    if(!result.ok)return say('登月流程未重置：'+result.code, 'bad');
    markQuests();renderTop();applyTheme();
    if(!save())return say('登月流程已重置，存档未保存。点击保存失败提示重试。', 'bad');
    say('登月流程已重置。前往航天页准备重新发射。'+(result.moved+result.toDrops?'已返还物品 ×'+(result.moved+result.toDrops)+'。':'')+'已消耗的燃料不返还。');
  },

  kit: a => {
    const v = (a[0] || '').toLowerCase();
    const wantGen = !v || v === 'all' || v === 'gen' || v === '发电机';
    const wantMach = !v || v === 'all' || v === 'machine' || v === '机器';
    const wantMat = !v || v === 'all' || v === 'mat' || v === '材料';
    let got = 0;
    const give = (k, c) => {
      if (!k) return;
      got += c - gainInv(k, c, QUIET);
    };
    if (wantGen) {                       // 发电机：锅炉 + 蒸汽轮机
      give('gregtech:gt.blockmachines@100', 2);
      give('gregtech:gt.blockmachines@1120', 2);
    }
    if (wantMach) {                      // 42 类加工机器各一台 LV 版
      for (const c of ((GD.machines && GD.machines.cats) || [])) {
        if (c.tiers && c.tiers[0]) give(c.tiers[0].k, 1);
      }
    }
    if (wantMat) {
      give('minecraft:cobblestone@0', 64);
      give('minecraft:iron_ingot@0', 64);
      give('gregtech:gt.metaitem.01@11035', 64);   // 铜锭
      give('gregtech:gt.metaitem.01@11057', 64);   // 锡锭
      give('gregtech:gt.metaitem.01@11305', 64);   // 钢锭
      give('IC2:itemRubber@0', 32);
    }
    say('测试器材发了 ' + got + ' 件。机器和发电机先塞物品栏，塞不下的进箱子。' +
        '　想只要一类：kit machine / kit gen / kit mat');
  },

  give: a => {
    const q = (a[0] || '').trim();
    if (!q) return say('用法：give <物品> [数量]。例：give 橡木原木 64', 'bad');
    const n = Math.max(1, parseInt(a[1], 10) || 1);
    const pool = Object.keys(GD.items);
    let hit = Object.prototype.hasOwnProperty.call(GD.items, q) ? [q] : null;
    if (!hit) {
      const same = pool.filter(x => nameOf(x) === q);
      hit = same.length ? same : pool.filter(x => matches(x, q));
    }
    if (!hit.length) return say('找不到物品：' + q, 'bad');
    const k = cmdRank(hit)[0];
    if (hit.length > 1) {
      say('匹配到 ' + hit.length + ' 个，用了「' + nameOf(k) + '」（' + k +
          '）。要指定就直接写物品 id');
    }
    gain(k, n);
    say('给了 ' + nameOf(k) + ' ×' + n + '　（' + k + '）');
  },

  dim: a => {
    const q = (a[0] || '').trim();
    if (!q) return say('现在在' + dimName(S.ui.dim) + '。用法：dim <维度名>', 'bad');
    const d = (GD.dims || []).find(x => x.name === q || x.key === q);
    if (!d) return say('没这个维度：' + q + '。有：' +
      (GD.dims || []).map(x => x.name).join('、'), 'bad');
    S.ui.dim = d.key;
    S.ui.page = 'world';
    S.ui.pick = null;
    applyView();
    say('切到' + d.name);
  },

  weather: a => {
    const map = { 晴: 'clear', 晴朗: 'clear', clear: 'clear', 雨: 'rain', 下雨: 'rain',
                  rain: 'rain', 雷: 'thunder', 雷雨: 'thunder', thunder: 'thunder',
                  雪: 'snow', 下雪: 'snow', snow: 'snow' };
    const w = map[(a[0] || '').trim()];
    if (!w) return say('用法：weather <晴|雨|雷|雪> [秒]。例：weather 雨 300', 'bad');
    const sec = Math.max(1, parseInt(a[1], 10) || 600);
    setWeather(w,sec);
    syncEnv();
    say('天气设为「' + WEATHER_CN[w] + '」，维持 ' + sec + ' 秒');
  },

  time: a => {
    const v = (a[0] || '').trim().toLowerCase();
    const e = S.env;
    const base = Math.floor(e.elapsed / ENV_DAY) * ENV_DAY;   // 当天的起点
    let mins = null;
    if (v === 'day' || v === '白天') mins = 0;                // 06:00
    else if (v === 'night' || v === '夜晚') mins = 12 * 60;   // 18:00
    else if (/^\d{1,2}:\d{2}$/.test(v)) {
      const p = v.split(':');
      mins = ((+p[0] - 6 + 24) % 24) * 60 + (+p[1]);          // 钟点换算回刻度
    }
    if (mins === null) return say('用法：time day | night | HH:MM。例：time 20:30', 'bad');
    e.elapsed = base + (mins / 60 / 24) * ENV_DAY;
    syncEnv(true);          // 拨钟是手动操作，压暗那层快点跟上
    say('时钟拨到 ' + clockText(env('overworld')) +
        '（' + (env('overworld').day ? '白天' : '夜晚') + '）');
  },

  vein: a => {
    const n = Math.max(1, Math.min(50, parseInt(a[0], 10) || 1));
    let got = 0;
    for (let i = 0; i < n; i++) {
      const def = rollVein(S.ui.dim);
      if (!def) break;
      S.veins.push(makeVein(def));
      got++;
    }
    if (!got) return say(dimName(S.ui.dim) + ' 没有矿脉数据', 'bad');
    say('在' + dimName(S.ui.dim) + '探到 ' + got + ' 条矿脉，本维度共 ' + WORLD_DISCOVERY.veins(S,S.ui.dim).length + ' 条');
  },

  quest: a => {
    const sub = (a[0] || '').trim();
    if (!sub) {
      const left = GD.quests.filter(q => !S.quests[q.id]);
      say('已完成 ' + (GD.quests.length - left.length) + ' / ' + GD.quests.length);
      for (const q of left.slice(0, 12)) say('  [' + q.id + '] ' + q.name);
      if (left.length > 12) say('  …还有 ' + (left.length - 12) + ' 个');
      return;
    }
    if (sub === 'all') {
      const unlocked = GD.quests.filter(q => QUESTS.canCompleteFromDeveloper(S,q));
      let completed = 0;
      for (const q of unlocked) if (QUESTS.completeFromDeveloper(S,q)) completed++;
      say('完成 '+completed+' 个已解锁的任务。');
    } else if (sub === 'clear') {
      S.quests = {}; S.qever = {}; S.questAchievements = {}; qcan = {};
      say('任务进度清空了（连"完成过"一起清）');
    } else if (sub[0] === '-') {
      const id = parseInt(sub.slice(1), 10);
      if (!S.quests[id]) return say('任务 ' + id + ' 本来就没完成。', 'bad');
      resetQuest(id);
      return;
    } else {
      const id = parseInt(sub, 10);
      const q = questIndex().get(id);
      if (!q) return say('没这个任务 id：' + sub + '。输 quest 看还没做的', 'bad');
      if (S.quests[id]) return say('任务「'+q.name+'」已完成。');
      if (!completeQuestFromDeveloper(id)) say('任务「'+q.name+'」尚未解锁。', 'bad');
      return;
    }
    markQuests();
    renderQBadge(qCanCount());
  },

  fur: a => {
    const n = Math.max(1, Math.min(20, parseInt(a[0], 10) || 1));
    for (let i = 0; i < n; i++) addFurnace();
    say('熔炉 +' + n + '，共 ' + S.furs.length + ' 台');
  },

  state: () => {
    say('维度 ' + dimName(S.ui.dim) + '　调试 ' +
        (DEVELOPER_MODE.active(S) ? '开 / '+(GAME_TIME.oneTick(S)?'1tick':'正常') : '关'));
    say('背包 ' + S.inv.filter(Boolean).length + ' / ' + INV_SLOTS +
        '　箱子 ' + S.chests.length + ' 个（共 ' +
        S.chests.reduce((a, c) => a + c.slots.filter(Boolean).length, 0) +
        ' / ' + (S.chests.length * CHEST_SLOTS) + ' 格）　工具墙 ' +
        Object.keys(S.tools).length + ' / ' + toolIds().length);
    say('矿脉 ' + S.veins.length + ' 条　熔炉 ' + S.furs.length +
        ' 台　动作 ' + (S.act ? actName(S.act) : '空闲'));
    say('任务 ' + Object.keys(S.quests).length + ' / ' + GD.quests.length +
        '　看过 ' + S.history.length + ' 件');
    say('数据　物品 ' + Object.keys(GD.items).length + '　合成 ' + GD.craft.length +
        '　熔炉 ' + GD.furnace.length + '　图鉴 ' + (GD.catalog || []).length +
        '　图标 ' + Object.keys(GD.icons).length);
  },
};

/* ============================ 部署区 ============================ */

/** 能摆到世界上的方块。以后要加新的就往这张表里加一行，界面自己会长出来。 */
const DEPLOY = [
  {k:'TConstruct:Smeltery@0',name:'匠魂冶炼炉',go:()=>{const r=SMELTERY.deploy(S,S.ui.dim);toastAt(null,r.ok?'匠魂冶炼炉已部署到世界设施区':'库存中没有可部署的控制器');if(r.ok){markInv();markDynamic();save();}},count:()=>SMELTERY.worldFurnaces(S,S.ui.dim).length},
  { k: 'minecraft:crafting_table@0', name: '工作台', go: deployBench,
    count: () => S.bench },
  { k: 'minecraft:furnace@0', name: '熔炉', go: deployFurnace,
    count: () => S.furs.length },
];

/** 从库存里拿一个方块摆下去。没有就说明白，别点了像没反应。 */
function deployOne(k, ok) {
  if (!take(k, 1)) {
    say('库存里没有' + nameOf(k) + '，先去「合成」页做一个。', 'bad');
    return false;
  }
  ok();
  markInv(); markDynamic(); save();
  return true;
}
function deployBench() {
  deployOne('minecraft:crafting_table@0', () => {
    S.bench++;
    say('摆下了工作台，3x3 的配方解锁了。');
  });
}
function deployFurnace() {
  deployOne('minecraft:furnace@0', () => {
    addFurnace();
    say('摆下了第 ' + S.furs.length + ' 台熔炉。');
  });
}

function renderWorldRight() {
  WORLD_PANELS.fieldwork();
}

/* --- 炉子 --- */
const FUR_KEY = 'minecraft:furnace@0';

/** 这台炉子还有东西要烧吗？有就返回烧出来那个东西的 key，没有就返回 null。
 *  产物槽满了、或者里头堆的是别的东西，都算"烧不动了"（原版 canSmelt 也是一个意思）。 */
function furWant(f) {
  const dst = f.input ? (FURNACES.find(f.input.k)||{}).out : null;
  if (!dst) return null;
  if (f.out && (f.out.k !== dst || f.out.n >= furCap(f))) return null;
  return dst;
}

/** 给这台炉子接上漏斗：消耗一个漏斗，原料/燃料/产物的暂存各扩到一个大箱子。
 *  这是玩家点出来的动作，要花东西，所以做成浮窗里的按钮，不自动装。 */
function installHopper(i) {
  const f = S.furs[i];
  if (!f || f.hop) return;
  if (!take(HOPPER, 1)) {
    say('库存里没有漏斗，先去「合成」页做一个。', 'bad');
    openFurnace(i);
    return;
  }
  f.hop = true;
  markDynamic(); markInv(); save();
  say((i + 1) + ' 号炉子接上漏斗了，进出各能堆 ' + (FUR_HOP_CAP / STACK) + ' 组。');
  openFurnace(i);
}

/** 世界里一台炉子就占一小格：炉口、编号、下面一条小进度。
 *  烧着的时候炉口那张图会换成点亮的版本（fur_on.png），炉口偶尔蹦火星。 */
function renderFurnaceList() {
  let h = '';
  if (!S.furs.length) {
    h = '<div class="dim">还没摆炉子。先去「合成」页做一个熔炉，再在上面按「放下」。</div>';
  } else {
    h = '<div class="furgrid">';
    S.furs.forEach((f, i) => {
      const current=FURNACES.state(f),lit = current.burning;
      // "还在加工" = 烧着而且还有东西烧。角上那颗点只在整条加工停下来之后才亮，
      // 不然一边烧一边亮，看着一直在催你收货。
      const busy = lit && !!furWant(f);
      const done = !!f.out && !busy;
      const pct = current.progress;
      const tip = (i + 1) + ' 号熔炉' + (lit ? '　烧着' : '') +
        (done ? '　停下来了，有 ' + f.out.n + ' 个' + nameOf(f.out.k) + '等着收' : '') +
        '　点开看';
      h += '<button class="furcell' + (lit ? ' on' : '') + (done ? ' hasout' : '') +
        '" data-furopen="' + i + '" title="' + esc(tip) + '">' +
        '<span class="pic">' + (lit ? spark() : iconHtml(FUR_KEY, 34)) +
        '</span>' +
        '<span class="fno">' + (i + 1) + ' 号</span>' +
        '<span class="fbar" data-furbar="' + i + '"><i style="width:' +
          (pct * 100).toFixed(1) + '%"></i></span>' +
        '</button>';
    });
    h += '</div>';
  }
  $('#furnaces').innerHTML = h;
}

/** 炉口偶尔蹦出来的火星。相位和漂移方向随机，几台炉子才不会一起爆。
 *  动画本身在 CSS 里，这里只负责给每台炉子错开一个起点。 */
function spark() {
  const at = () => 'animation-delay:-' + (Math.random() * 3.4).toFixed(2) + 's;' +
                   '--dx:' + (Math.random() * 12 - 6).toFixed(1) + 'px';
  return '<span class="spark" style="' + at() + '"></span>' +
         '<span class="spark s2" style="' + at() + '"></span>';
}

/** 点开一台炉子。照原版熔炉的样子摆：左边上原料、下燃料，右边产物。 */
let furnaceSelection=null;
function openFurnace(i) {
  const f = S.furs[i];
  if (!f) return;
  const current=FURNACES.state(f),pct=current.progress;
  const box = $('#popup');
  if(window.FACTORY)FACTORY.close();
  if(!furnaceSelection||furnaceSelection.i!==i)furnaceSelection={i};
  if(box.querySelector('.furwin')&&box.dataset.furnace===String(i)&&!box.hidden){refreshFurnace();return;}
  box.dataset.furnace=String(i);
  box.hidden = false;
  box.classList.add('noback');
  box.innerHTML = '<div class="box furwin"><h3>' + (i + 1) + ' 号熔炉' +
    '<span class="dim fur-state">' + esc(furnaceStateText(f)) + '</span></h3>' +
    '<div class="furgrid2">' +
      '<div class="fcol">' + fslot(i, f.input, 'in') + fslot(i, f.fuel, 'fuel') + '</div>' +
      '<span class="farrow">→</span>' +
      '<div class="fcol">' + fslot(i, f.out, 'out') + '</div>' +
    '</div>' +
    '<div class="fbar" data-furwinbar="' + i + '"><i style="width:' +
      (pct * 100).toFixed(1) + '%"></i></div>' +
    '<div class="furhint">槽位容量：各 '+(f.hop?FUR_HOP_CAP/STACK:1)+' 组</div>' +
    '<div class="foot">' +
      (f.hop ? '' : '<button class="btn" data-furhop="' + i + '"' +
        (have(HOPPER) ? '' : ' disabled') + '>加装漏斗（' + have(HOPPER) + '）</button>') +
      '<button class="btn" data-popclose="1">关闭</button></div></div>';
  const win=box.querySelector('.furwin'),zoom=uiZoom(),right=$('#quests').getBoundingClientRect(),available=right.left/zoom,width=Math.min(340,available-24);win.style.width=width+'px';win.style.height='auto';win.style.maxHeight=Math.max(230,(window.innerHeight-210)/zoom)+'px';box.style.setProperty('--machine-left',Math.max(12,Math.min((window.innerWidth/zoom-width)/2,available-width-12))+'px');
  popupCb = null;
}

/** 浮窗里的一个物品格。只画图标，名字鼠标放上去才显示。 */
function fslot(i, c, kind) {
  const who = kind === 'in' ? '原料' : kind === 'fuel' ? '燃料' : '产物';
  const tip = c ? (who + '：' + nameOf(c.k) + (c.n > 1 ? ' ×' + c.n : ''))
                : who + '：空着';
  return '<span class="mx-slot-wrap"><div class="fslot'+(furnaceSelection&&furnaceSelection.i===i&&furnaceSelection.kind===kind?' selected':'')+'" data-fur="' + i + '" data-fk="' + kind +
    '" title="' + esc(tip) + '">' +
    (c ? iconHtml(c.k, 32) : '<span class="fplus">+</span>') +
    (c && c.n > 1 ? '<span class="fn">' + c.n + '</span>' : '') + '</div>'+'</span>';
}
function refreshFurnace(){
  if(!furnaceSelection)return;const f=S.furs[furnaceSelection.i],win=document.querySelector('#popup:not([hidden]) .furwin');if(!f||!win)return;
  const current=FURNACES.state(f),label=win.querySelector('.fur-state'),bar=win.querySelector('[data-furwinbar] > i');if(label)label.textContent=furnaceStateText(f);if(bar)bar.style.width=(current.progress*100).toFixed(2)+'%';
  if(countOpen())return;
  const signature=JSON.stringify([f.input,f.fuel,f.out,furnaceSelection]);if(win._slotsSignature===signature)return;
  const i=furnaceSelection.i;UI_KIT.patch(win.querySelector('.furgrid2'),'<div class="fcol">'+fslot(i,f.input,'in')+fslot(i,f.fuel,'fuel')+'</div><span class="farrow">→</span><div class="fcol">'+fslot(i,f.out,'out')+'</div>');
  win._slotsSignature=signature;
}
function furnaceStateText(f){const current=FURNACES.state(f);return '　'+(f.status||(!current.recipe&&f.input?'无法烧炼':current.burning?'烧着':'没火'))+(current.can&&current.burning?'　正在出 '+nameOf(current.recipe.out):'');}
function canFurnace() {
  const r = (CRAFT_BY_OUT.get('minecraft:furnace@0') || [])[0];
  return !!(r && canMake(r));
}

/* Shared inventory and equipment slots. */
const HUD_TOOL_TYPES = ['pick','axe','shovel','sword','hoe','shears','hammer','saw',
  'file','wrench','screwdriver','wirecutter','softmallet','mortar'];

function renderInv() {
  UI_KIT.patch($('#toolbar'), HUD_TOOL_TYPES.map(id => {
    const tool = S.tools[id];
    if (tool) return cellHtml(tool, 'tool', id);
    const key = TOOL_BY_ID[id].keys.find(k => iconHtml(k, 18));
    const icon = key ? iconHtml(key, 18) : UI_KIT.glyph('settings', 18);
    const label = esc(toolTypeName(id) + '，未装备');
    return '<div class="cell empty" data-cell="tool" data-i="' + id +
      '" aria-label="' + label + '" data-tip="' + label + '">' + icon + '</div>';
  }).join(''));
  UI_KIT.patch($('#inventory'), S.inv.map((item, index) => cellHtml(item, 'inv', index)).join(''));
}

function cellHtml(item, kind, index) {
  const slot = ' data-cell="' + kind + '" data-i="' + index + '"';
  if (!item) return '<div class="cell empty"' + slot + '></div>';
  const isEquipment = kind === 'tool';
  const label = isTool(item.k) ? toolLabel(item) : nameOf(item.k);
  const contained = item.entityUid ? DROPPED_ITEMS.packedDescription(S, item) : '';
  const tip = esc(label + (contained ? '，' + contained : ''));
  const icon = iconHtml(item.k, isEquipment ? 18 : 28);
  const count = item.n > 1 ? '<span class="cnt">' + item.n + '</span>' : '';
  return '<div class="cell"' + slot + ' data-item="' + esc(item.k) + '"' +
    (isEquipment ? '' : ' draggable="true"') + ' aria-label="' + tip +
    '" data-tip="' + tip + '">' + icon + count + '</div>';
}

/* --- 图鉴 --- */
const TABS = [['all', '全部'], ['meta', '材料×形态']];

function renderTabs() {
  if (!TABS.some(([id]) => id === S.ui.tab)) {
    S.ui.tab = 'all';
    S.ui.pg = 0;
  }
  $('#tabs').innerHTML = TABS.map(([id, nm]) =>
    '<button class="btn' + (S.ui.tab === id ? ' on' : '') + '" data-tab="' + id +
    '">' + nm + '</button>').join('');
}

const PER_PAGE = 240;

/** 合成数量按钮的档位。不做加减和 ×2/÷2，直接给这四个。 */
const MAKE_N = [1, 16, 32, 64];

const craftAvailability=new Map();
let craftCatalog=null,craftCatalogIndex=null,craftCatalogJob=null,craftOrderCache=null,craftOrderJob=null;

// The recipes are fixed after page startup, so searching and stock changes share this index.
function* indexCraftCatalog(){
  const batches=[],anchors=new Map(),toolOnly=new Set();
  let batch=[],count=0;
  for(const [key,recipes] of CRAFT_BY_OUT){
    if(!CONTENT_SCOPE.allowed(key))continue;
    let manual=false;
    for(const recipe of recipes){
      if(recipe.station)continue;
      manual=true;
      const anchor=recipe.slots.find(slot=>!isCraftToolSlot(slot));
      if(!anchor){toolOnly.add(key);continue;}
      for(const id of craftIngredientKeys(anchor)){
        if(!anchors.has(id))anchors.set(id,new Set());
        anchors.get(id).add(key);
      }
    }
    if(manual)batch.push(key);
    if(batch.length===512){batches.push(ITEM_ORDER.sort(batch));batch=[];}
    if(++count%128===0)yield;
  }
  if(batch.length)batches.push(ITEM_ORDER.sort(batch));
  yield;
  return {keys:ITEM_ORDER.sort(batches.flat()),anchors,toolOnly};
}
function advanceCraftCatalog(deadline){
  const index=craftCatalogIndex??=indexCraftCatalog();
  let step;
  do{
    step=index.next();
    if(step.done){craftCatalog=step.value;craftCatalogIndex=null;return;}
  }while(performance.now()<deadline);
}
function handCraftKeys(){
  if(!craftCatalog)advanceCraftCatalog(Infinity);
  return craftCatalog.keys;
}
function yieldCatalogWork(){
  return window.scheduler?.yield?window.scheduler.yield():new Promise(resolve=>setTimeout(resolve,0));
}
function prepareCraftCatalog(){
  if(craftCatalog)return Promise.resolve();
  return craftCatalogJob??=(async()=>{
    while(!craftCatalog){
      await yieldCatalogWork();
      if(!craftCatalog)advanceCraftCatalog(performance.now()+4);
    }
  })().finally(()=>{craftCatalogJob=null;});
}
function selectCraftCell(){document.querySelectorAll('#itemlist .cell.sel').forEach(el=>el.classList.remove('sel'));document.querySelectorAll('#itemlist .cell').forEach(el=>{if(el.dataset.item===S.ui.sel)el.classList.add('sel');});}
function craftInventorySnapshot(){
  if(craftSnapshot&&!craftStockDirty)return craftSnapshot;
  const current=[craftingStorages(),S.tools],signature=JSON.stringify(current);
  craftStockDirty=false;
  if(craftSnapshot?.signature===signature)return craftSnapshot;
  const [storages,tools]=structuredClone(current),bag=new Map(),warehouse=new Map();
  storages.forEach((arr,b)=>arr.forEach(s=>{
    if(!s||b&&!CRAFT_TOOLS.rule(s.k).containerTool)return;
    const m=b?warehouse:bag;
    m.set(s.k,(m.get(s.k)||0)+(s.n??1));
  }));
  return craftSnapshot={storages,tools,bag,warehouse,signature,epoch:++craftStockEpoch,picks:new WeakMap()};
}
let craftStockEpoch=0;
function craftStockRevision(){return craftInventorySnapshot().epoch;}
function craftAvailabilityContext(){
  const bench=S.bench>0,stock=craftInventorySnapshot();
  return {stock,bench,stamp:stock.epoch+':'+bench};
}
function canMakeAny(k){return craftAvailable(k,craftAvailabilityContext());}
function craftAvailable(k,{stock,bench,stamp}){
  const old=craftAvailability.get(k);
  if(old?.stamp===stamp)return old.ok;
  const ok=(CRAFT_BY_OUT.get(k)||[]).some(r=>!r.station&&r.slots.every(slot=>cachedStockAlt(slot,stock))&&
    CRAFTER.plan(r,stock.storages,stock.tools,{bench,checkOnly:true,orderedStock:orderedCraftStock(stock),toolOnlyBoxes:[1]}).ok);
  craftAvailability.set(k,{stamp,ok});
  return ok;
}

// Check outputs indexed by an ingredient in stock, keeping name order for both groups.
function* rankCraftKeys(context){
  const keys=handCraftKeys();
  const snap=context.stock,candidates=new Set(craftCatalog.toolOnly);[snap.bag,snap.warehouse].forEach(stock=>stock.forEach((n,k)=>{if(n>0)craftCatalog.anchors.get(CONTENT.canonicalKey(k))?.forEach(k=>candidates.add(k));}));
  const ready=new Set();
  for(const k of candidates){
    if(craftAvailable(k,context))ready.add(k);
    yield;
  }
  const available=[],unavailable=[];keys.forEach(k=>(ready.has(k)?available:unavailable).push(k));
  return {stamp:context.stamp,keys:available.concat(unavailable)};
}
function prioritizedCraftKeys(refresh){
  if(craftOrderCache&&!refresh)return craftOrderCache.keys;
  const context=craftAvailabilityContext();
  if(craftOrderCache?.stamp!==context.stamp){
    const rank=rankCraftKeys(context);
    let step;
    do{step=rank.next();}while(!step.done);
    craftOrderCache=step.value;
  }
  return craftOrderCache.keys;
}
function updateCraftOrder(){
  const context=craftAvailabilityContext();
  if(craftOrderCache?.stamp===context.stamp||craftOrderJob?.stamp===context.stamp)return;
  const rank=rankCraftKeys(context),job={stamp:context.stamp};
  craftOrderJob=job;
  function advance(){
    const deadline=performance.now()+5;
    do{
      const step=rank.next();
      if(step.done){craftOrderCache=step.value;craftOrderJob=null;return;}
    }while(performance.now()<deadline);
    job.pending=yieldCatalogWork().then(()=>{if(craftOrderJob===job)return advance();});
    return job.pending;
  }
  advance();
}

function materialIcon(k,size){const p=window.GT_PRESENTATION&&GT_PRESENTATION.icons(k);return p&&p.exact&&!p.unresolved?(p.standalone?standaloneIconHtml(p.url,size):atlasIconHtml([p.x,p.y],size,p,p.url)):baseIconHtml(k,size);}

function catCell(k,renderIcon) {
  const n = craftHave(k);
  const can = canMakeAny(k);
  const tip = nameOf(k) + (n ? '　持有 ' + n : '') +
    (can ? '　现在能做' : '　材料不够');
  return '<div class="cell' + (S.ui.sel === k ? ' sel' : '') +
    (can ? '' : ' no') + '" data-item="' + esc(k) + '" title="' + esc(tip) + '">' +
    (typeof renderIcon==='function'?renderIcon:iconOrText)(k, 40) + (n ? '<span class="n">' + n + '</span>' : '') + '</div>';
}

/** 每页 240 格。搜索和切分类会把页码拨回第一页。 */
function renderPager(total) {
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  if (S.ui.pg > pages - 1) S.ui.pg = pages - 1;
  if (S.ui.pg < 0) S.ui.pg = 0;
  const el = $('#pager');
  if (!el) return;
  el.innerHTML = '<button class="btn pgbtn" data-pg="-1"' +
    (pages<=1?' disabled':'') + '>‹</button>' +
    '<span class="pgnum">' + (total ? (S.ui.pg + 1) + ' / ' + pages : '0 / 0') + '</span>' +
    '<button class="btn pgbtn" data-pg="1"' +
    (pages<=1?' disabled':'') + '>›</button>' +
    '<span class="pgall">共 ' + total + ' 件</span>';
}

let craftRenderRequest=0,craftSearch=null;
function setCraftListBusy(busy){
  const list=$('#itemlist');
  list.inert=busy;
  if(busy)list.setAttribute('aria-busy','true');
  else list.removeAttribute('aria-busy');
  if(busy&&!list.firstChild)list.textContent='…';
  $('#pager').inert=busy;
}
function renderList(refreshOrder=false) {
  const request=++craftRenderRequest;
  if(!craftCatalog){
    setCraftListBusy(true);
    prepareCraftCatalog().then(()=>{
      if(request===craftRenderRequest&&S.ui.page==='craft')renderList(refreshOrder);
    });
    return;
  }
  if(S.ui.tab==='all'){
    if(refreshOrder||!craftOrderCache)updateCraftOrder();
    if(craftOrderJob){
      setCraftListBusy(true);
      craftOrderJob.pending.then(()=>{
        if(request===craftRenderRequest&&S.ui.page==='craft')renderList();
      });
      return;
    }
  }
  const all=craftTabKeys(),query=S.ui.q.trim().toLowerCase();
  if(!query){paintCraftList(all);return;}
  if(craftSearch?.all===all&&craftSearch.query===query){paintCraftList(craftSearch.keys);return;}
  setCraftListBusy(true);
  searchCraftList(request,all,query);
}
async function searchCraftList(request,all,query){
  const words=SEARCH_TEXT.words(query),keys=[];
  // Appending to a complete query can only remove results.
  const source=craftSearch?.all===all&&query.startsWith(craftSearch.query)?craftSearch.keys:all;
  let deadline=performance.now();
  for(let i=0;i<source.length;i++){
    if((i&127)===0&&performance.now()>=deadline){
      await yieldCatalogWork();
      if(request!==craftRenderRequest||S.ui.page!=='craft')return;
      deadline=performance.now()+4;
    }
    if(matches(source[i],words))keys.push(source[i]);
  }
  if(request===craftRenderRequest&&S.ui.page==='craft'){
    craftSearch={all,query,keys};
    paintCraftList(keys);
  }
}
function paintCraftList(keys) {
  setCraftListBusy(false);
  $('#page-craft').classList.toggle('material-mode',S.ui.tab==='meta');
  if(S.ui.tab==='meta'&&keys.length){
    MATERIAL_MATRIX.mount($('#itemlist'),MATERIAL_CATALOG.select(keys),{icon:materialIcon,cell:k=>catCell(k,materialIcon)});
    $('#pager').innerHTML='<span class="pgall">共 '+keys.length+' 件</span>';return;
  }
  MATERIAL_MATRIX.clear();
  const pages = Math.max(1, Math.ceil(keys.length / PER_PAGE));
  if (S.ui.pg > pages - 1) S.ui.pg = pages - 1;
  const shown = keys.slice(S.ui.pg * PER_PAGE, (S.ui.pg + 1) * PER_PAGE);
  let h;

  if (keys.length) {
    h = shown.map(catCell).join('');
  } else {
    const fb = [];
    h = '<div class="dim" style="grid-column:1/-1">';
    if (fb.length) {
      h += '合成图鉴里没有。下面这些不在合成页做（熔炉/机器做的，或世界里采的）：</div>' +
           fb.map(k => '<div class="item" style="grid-column:1/-1" data-item="' +
                       esc(k) + '">' + iconHtml(k, 16) + esc(nameOf(k)) +
                       '<span class="n">非合成</span></div>').join('');
    } else {
      h += '没有找到。搜索支持汉字、全拼和首字母（qtb → 青铜板）。</div>';
    }
  }
  $('#itemlist').innerHTML=h;
  renderPager(keys.length);
  $('#itemlist').scrollTop=0;
}

/* 合成页里点任意一个物品，跳到它自己的配方。手搓不出来的（矿里挖的、
 * 机器做的）就点不动，用浮窗说一句，免得跳过去看见一片空白。 */
function gotoCraft(k,mode,context){
  if(!(context&&context.keepPage)&&!SPACEFLIGHT.canNavigate(S,'craft'))return;
  k=CONTENT.canonicalKey(k);if(!CONTENT.item(k))return;
  if(!$('#popup').hidden)closePopup();
  $('#detail')._craftOrder=null;
  S.ui.recipeMode=mode==='uses'?'uses':'recipes';S.ui.sel=k;S.ui.recipePage=1;pushHistory(k);
  if(S.ui.page!=='craft'&&!(context&&context.keepPage)){S.ui.page='craft';applyView();}else{selectCraftCell();renderDetail();renderHistory();}
}

function gotoCraftRecipe(raw){if(!SPACEFLIGHT.canNavigate(S,'craft'))return;const recipe=raw&&GD.craft.find(r=>r.id===raw.id);if(!MANUAL_WORKBENCH.acceptsRecipe(recipe))return;closePopup();const filled=canMake(recipe)?null:MANUAL_WORKBENCH.fill(S,recipe);gotoCraft(recipe.out);if(filled&&filled.ok){markInv();save();renderDyn();}else if(filled)toastAt(null,({INPUT:'原料不足，已转到对应配方',OUTPUT:'背包放不下格内材料，工作台保持原状',WORKBENCH:'需要先放置工作台，已转到对应配方'})[filled.code]||'已转到对应配方');MANUAL_WORKBENCH_UI.refresh();const rs=(CRAFT_BY_OUT.get(recipe.out)||[]).filter(r=>!r.station);S.ui.recipePage=Math.ceil(rs.length/20)||1;renderDetail();const el=Array.from(document.querySelectorAll('[data-craft-recipe]')).find(el=>el.dataset.craftRecipe===recipe.id);if(el){el.classList.add('craft-jump');el.scrollIntoView({block:'nearest'});}}

/* 一条轻提示，固定贴在屏幕下方居中，1.6 秒自己消失。
 * 位置不再跟鼠标走 —— 跟着鼠标会让人觉得"提示一会在这一会在那"。 */
function toastAt(_ev,msg){UI_NOTICES.text(msg);}

function transferTip(result,action){
  if(!result||!result.ok){toastAt(null,({INPUT:'库存原料不足',SLOTS:'所选槽位放不下',OUTPUT:'本次操作无法完成',TANK:'罐内空间不足或流体不同',FLUID:'所选罐不接收该流体'})[result&&result.code]||'本次搬运未完成');return;}
  if(result.produced&&result.moved==null){const ps=result.produced,cs=result.consumed||[];for(const p of ps)gainTip(p.k,p.toBag,p.toWarehouse);toastAt(null,action+(ps.length?'，'+ps.slice(0,3).map(p=>nameOf(p.k)+' ×'+p.n).join('、')+(ps.length>3?' 等 '+ps.length+' 种物品':''):cs.length?'，已投入 '+cs.reduce((n,p)=>n+p.n,0)+' 个物品':''));return;}
  if(result.moved==null){toastAt(null,action);return;}
  let where='';
  if(result.toBag||result.toWarehouse||result.toDrops)where=' → '+[result.toBag?'物品栏 '+result.toBag:'',result.toWarehouse?'仓库 '+result.toWarehouse:'',result.toDrops?'掉落物 '+result.toDrops:''].filter(Boolean).join('，');
  if(result.fromBag||result.fromWarehouse)where='（'+[result.fromBag?'物品栏 '+result.fromBag:'',result.fromWarehouse?'仓库 '+result.fromWarehouse:''].filter(Boolean).join('，')+'）';
  const products=result.produced||[],label=result.k?nameOf(result.k)+' ×'+result.moved:products.length?products.slice(0,3).map(p=>nameOf(p.k)+' ×'+(p.toBag+p.toWarehouse+(p.toDrops||0))).join('、')+(products.length>3?' 等 '+products.length+' 种物品':''):'×'+result.moved;
  toastAt(null,action+' '+label+where+(result.mb?'，'+result.mb+' mB':'')+(result.discarded?'；已丢弃 '+result.discarded:''));
}

function renderDetail() {
  const lookupKey=S.ui.sel;
  if(lookupKey&&(S.ui.recipeMode==='uses'||!(CRAFT_BY_OUT.get(lookupKey)||[]).some(r=>!r.station))){const host=$('#detail');if(host._lookupKey!==lookupKey||host._lookupMode!==S.ui.recipeMode){host._lookupKey=lookupKey;host._lookupMode=S.ui.recipeMode;RECIPE_UI.mountItem(host,{key:lookupKey,mode:S.ui.recipeMode||'recipes'});}return;}
  $('#detail').onclick=null;$('#detail')._lookupKey=null;$('#detail')._queryToken=null;
  const k = S.ui.sel;
  const box = $('#detail');
  const keepY = box ? box.scrollTop : 0;   // 重排别把滚动位置弹回顶部
  if (!k) { box._craftOrder=null;UI_KIT.patch(box,UI_KIT.empty('minecraft:crafting_table@0','选择一件物品','从左侧图鉴选择物品，查看手工配方、所需原料与持有数量。')); return; }

  let h = '<div class="dhead" data-ui-key="heading">' + iconHtml(k, 56) +
    '<span class="nm">' + esc(nameOf(k)) + '</span>' +
    (CATALOG.has(k) ? '' : '<span class="tag">不在合成图鉴里</span>') +
    '<span class="tag you"'+(craftHave(k)?'':' hidden')+'>持有 ' + craftHave(k) + '</span>' + '</div>';

  const rs = (CRAFT_BY_OUT.get(k) || []).filter(r=>!r.station);
  if (!rs.length) {
    const f = FURNACE_BY_IN.get(k);
    const srcs = GD.sources.filter(s => s.out.some(o => o[0] === k)||(s.randomOutputs||[]).some(p=>p.k===k));
    const vein = GD.veins.filter(v => v.ores.some(o => o.key === k));
    h += '<div class="norec">没有工作台配方。';
    if (f) h += '<br>熔炉：<span class="goi" data-go="' + esc(f) + '">' +
                iconHtml(f, 16) + esc(nameOf(f)) + '</span> → ' +
                '<span class="goi" data-go="' + esc(k) + '">' +
                iconHtml(k, 16) + esc(nameOf(k)) + '</span>';
    if (srcs.length) h += '<br>采集：' + esc(srcs.map(s => s.name).join('、'));
    if (vein.length) h += '<br>矿脉：' + esc(vein.map(v => v.name).join('、'));
    h += '</div>';
    box.innerHTML = h;
    if (box.scrollTop !== keepY) box.scrollTop = keepY;
    return;
  }

  /* 选中物品时按原料满足程度排序；后台库存变化只更新内容，不移动点击目标。
   * 满足度一样保持数据本身的顺序。pickAlt 的结果供首次排序和格子显示共用。 */
  const list = rs.map((r, i) => {
    const picks = r.slots.map((s, j) => pickAlt(s, r.out + '|' + j));
    return { r: r, i: i, picks: picks, f: fillOf(r, picks) };
  });
  // Rank once per selection. Live stock updates patch values without moving targets.
  if(!box._craftOrder||box._craftOrder.key!==k){list.sort((a,b)=>(b.f-a.f)||(a.i-b.i));box._craftOrder={key:k,ids:list.map(it=>it.r.id)};}
  const ranks=new Map(box._craftOrder.ids.map((id,i)=>[id,i]));
  list.sort((a,b)=>(ranks.get(a.r.id)??Infinity)-(ranks.get(b.r.id)??Infinity)||(a.i-b.i));

  /** 一个原料格。i 是 slots 的下标（同一格可能出现多次，共用一份）。 */
  function ingCell(r, i, k, picks) {
    const slot = r.slots[i];
    const p = picks[i];
    if(p&&p.tool&&isPermanentTool(p.inst.k))return '<span class="islot have tool" data-r="'+esc(k)+'" data-slot="'+i+'" data-go="'+esc(p.inst.k)+'" title="'+esc(nameOf(p.inst.k))+'">'+iconOrText(p.inst.k,34)+'<span class="n">1</span></span>';
    if (p && p.tool&&!isPermanentTool(p.inst.k)) {
      // 工具格不照抄配方里写的那件：直接显示玩家手上实际会被磨的那件，
      // 数字表示该槽所需数量；实际工具耐久留在提示与耐久条中。
      const t = p.inst;
      const dm = t.dmax || 1;
      const pct = Math.max(0, Math.min(100, t.dur / dm * 100));
      return '<span class="islot have tool" data-r="' + esc(k) + '" data-slot="' + i +
        '" data-go="' + esc(t.k) + '" title="' +
        esc(toolLabel(t) + '　耐久 ' + t.dur + ' / ' + (t.dmax || '?') +
            '') + '">' +
        iconOrText(t.k, 34) +
        '<span class="n">1</span>' +
        '<span class="dbar' + (pct <= 25 ? ' low' : '') + '"><i style="width:' + pct + '%"></i></span></span>';
    }
    const group = CRAFT_TOOLS.spec(slot);
    const alt = p ? p.k : group ? group.key : slot[0];
    const tip = group ? p ? nameOf(p.k) : group.name : slot.slice(0,12).map(nameOf).join(' / ')+(slot.length>12?' / 另 '+(slot.length-12)+' 种':'');
    return '<span class="islot ' + (p ? 'have' : 'lack') +
      (isTool(alt) ? ' tool' : '') +
      '" data-r="' + esc(k) + '" data-slot="' + i + '" data-go="' + esc(alt) +
      '" title="' + esc(tip) + '">' +
      iconOrText(alt, 34) +
      '<span class="n' + (p ? '' : ' lack') + '">1</span></span>';
  }

  const shownRecipes=list.slice(0,20*(S.ui.recipePage||1));
  for (const it of shownRecipes) {
    const r = it.r;
    const picks = it.picks;
    const allok = canMake(r);
    const lock = benchLocked(r);
    h += '<div data-ui-key="recipe:'+esc(r.id)+'" data-craft-recipe="'+esc(r.id)+'" class="rc' + (allok && !lock ? ' can' : '') + '">';
    if (r.grid) {
      // 有真实摆放形状：画成 3x3 的合成表
      h += '<div class="grid3">';
      for (let pos = 0; pos < 9; pos++) {
        const i = r.grid[pos];
        h += i < 0 ? '<span class="gvoid"></span>' : ingCell(r, i, k, picks);
      }
      h += '</div>';
    } else if (r.shapeless) {
      // 无序配方：怎么摆都行，所以按顺序填进九宫格，跟有形状的看着统一，
      // 另外标一句"无序"，免得看着像有讲究。
      h += '<div class="grid3 free">';
      for (let pos = 0; pos < Math.max(9,r.slots.length); pos++) {
        h += pos < r.slots.length ? ingCell(r, pos, k, picks) : '<span class="gvoid"></span>';
      }
      h += '</div><span class="ftag">无序</span>';
    } else {
      // 有形状但没对上的，横着排，绝不画一个可能是错的摆放
      h += '<div class="ings">' + r.slots.map((_, i) => ingCell(r, i, k, picks)).join('') +
           '</div>';
    }
    h += '<span class="arrow">→</span>' +
         '<span class="oslot" data-go="' + esc(r.out) +
         '" title="' + esc(nameOf(r.out)) + '">' +
         iconOrText(r.out, 44) +
         (r.n > 1 ? '<span class="n">' + r.n + '</span>' : '') + '</span>' +
         '<span class="spacer"></span>' +
         (lock ? '<span class="ftag lock">'+(r.station==='nasa'?'要部署NASA工作台':'要摆工作台')+'</span>' : '') +
         // 四个数量按钮。不做加减和 ×2/÷2，直接给 1 / 16 / 32 / 64。
         '<span class="mkbar">' + MAKE_N.map(n =>
           '<button class="btn big' + (n === 1 ? ' main' : '') +
           '" data-make="' + esc(k) + '" data-ri="' + it.i + '" data-mk="' + n + '"' +
           (allok && !lock ? '' : ' disabled') + '>' +
           (n === 1 ? '合成一次' : '×' + n) + '</button>').join('') + '<button class="btn" data-manual-fill="'+esc(r.id)+'">摆放</button></span>';
    h += '</div>';
  }
  if(shownRecipes.length<list.length)h+='<button data-ui-key="more" class="btn" data-craft-more="1">继续显示配方（'+shownRecipes.length+' / '+list.length+'）</button>';
  UI_KIT.patch(box,h);
  if (box.scrollTop !== keepY) box.scrollTop = keepY;   // 重排之后留在原地
}

function renderHistory() {
  const el = $('#history');
  const top=el.scrollTop;
  el.innerHTML = S.history.length
    ? S.history.map(k => '<div data-item="' + esc(k) + '" title="' + esc(nameOf(k)) +
        '">' + iconHtml(k, 16) + '<span>' + esc(nameOf(k)) + '</span>' +
        (craftHave(k) ? ' <span class="dim">' + craftHave(k) + '</span>' : '') +
        '</div>').join('')
    : UI_KIT.empty('minecraft:book@0','暂无记录','查看过的物品会保存在这里。');
  el.scrollTop=top;
}

/* ============================ 仓库页 ============================ */

/** 仓库页顶部那一行提示。say() 只写进设置页的控制台，在这儿看不见。
 *  文案存在变量里，因为物品栏一变整页就会重画，写进 DOM 会被冲掉。 */
const CHEST_HINT = '点击箱子标题或边框选择存入目标，Shift 点击物品栏快速存入；箱子内 Shift 点击取回物品栏。';
let chestMsg = CHEST_HINT, chestMsgBad = false;

function chestSay(s, bad) {
  chestMsg = s;
  chestMsgBad = !!bad;
  const el = $('#chestmsg');
  if (el) { el.textContent = s; el.className = 'cmsg' + (bad ? ' bad' : ''); }
  say(s, bad ? 'bad' : 'out');
  toastAt(null,s);
}

/** 一个箱子的格盘。空格也画出来，看得见还剩多少位置。 */
function chestSlotsHtml(ci, slots) {
  let h = '';
  for (let i = 0; i < slots.length; i++) {
    const c = slots[i];
    if (!c) { h += '<div class="cslot empty" data-cslot="'+ci+'" data-i="'+i+'"></div>'; continue; }
    const nm = isTool(c.k) ? toolLabel(c) : nameOf(c.k);
    h += '<div class="cslot" data-cslot="' + ci + '" data-i="' + i +
      '" data-tip="' + esc(nm+(c.entityUid?'，'+DROPPED_ITEMS.packedDescription(S,c):'')) + '">' +
      iconHtml(c.k, 36) +
      '<span class="cn">' + esc(nm.length > 4 ? nm.slice(0, 4) : nm) + '</span>' +
      (c.entityUid?'<span class="stored-preview">'+esc(DROPPED_ITEMS.packedDescription(S,c))+'</span>':'')+
      (c.n > 1 ? '<span class="cnt">' + c.n + '</span>' : '') +
      '</div>';
  }
  return h;
}

/** 垃圾桶图标。没现成素材，画个 12px 的矢量，够小够清楚。 */
const TRASH_SVG = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">' +
  '<path fill="currentColor" d="M6.5 1h3v1H13v1.6H3V2h3.5V1z' +
  'M3.4 4.8h9.2l-.8 9.1a1.1 1.1 0 0 1-1.1 1H5.3a1.1 1.1 0 0 1-1.1-1L3.4 4.8z"/></svg>';

function renderChest() {
  const box = $('#chestpage');
  if (!box) return;
  // 正在改箱子名的时候别整页重画，不然光标会被顶掉（挖矿途中物品栏一变就会触发）
  const ae = document.activeElement;
  if (ae && ae.dataset && ae.dataset.cname != null) return;
  const selected=WAREHOUSE.selected(S);
  const stamp=JSON.stringify([S.chests,selected?.itemStoreId,chestMsg,chestMsgBad]);
  if(box._warehouseStamp===stamp)return;
  const occupied=S.chests.reduce((n,c)=>n+c.slots.filter(Boolean).length,0);
  let h = '<div class="ctop">'+UI_KIT.title('minecraft:chest@0','仓库')+'<span class="warehouse-total">'+S.chests.length+' 个箱子，'+occupied+' / '+S.chests.reduce((n,c)=>n+c.slots.length,0)+' 格</span>' +
    '<button class="btn" data-cdeploy="1" title="从整个库存里扣掉一个箱子，在这儿多出一个">' +
    UI_KIT.glyph('plus')+'部署箱子</button></div>' +
    '<div id="chestmsg" class="cmsg' + (chestMsgBad ? ' bad' : '') + '">' +
    esc(chestMsg) + '</div>';
  S.chests.forEach((c, i) => {
    const used = c.slots.filter(Boolean).length;
    const target=c===selected;
    h += '<div class="chest'+(target?' selected':'')+'" data-cdrop="' + i + '" data-warehouse-select="'+esc(c.itemStoreId)+'">' +
      '<div class="chead" role="button" tabindex="0" aria-pressed="'+target+'" aria-label="选择'+esc(c.name)+'作为快速存入目标">'+iconHtml('minecraft:chest@0',32) +
        '<input class="cname" data-cname="' + i + '" value="' + esc(c.name) +
          '" maxlength="12" spellcheck="false" title="点一下改名">' +
        '<span class="chest-capacity"><span class="chest-target-badge">'+(target?'存入目标':'')+'</span>' + used + ' / ' + c.slots.length + ' 格</span>' +
        '<div class="chest-meter"><i style="width:'+(used/Math.max(1,c.slots.length)*100)+'%"></i></div><div class="chest-actions">' +
        '<button class="btn" data-csort="' + i + '" title="排序并合并同类堆">整理</button>' +
        '<button class="btn" data-ctop="' + i + '" title="把物品栏里、这个箱子已经有的东西存进来">补齐</button>' +
        '<button class="btn" data-call="' + i + '" title="把物品栏里所有东西都存进来">'+UI_KIT.glyph('store')+'全部存入</button>' +
      '</div></div>' +
      '<div class="cgrid">' + chestSlotsHtml(i, c.slots) + '</div>' +
      '<div class="cfoot"><button class="cdel" data-cdel="' + i +
        '" title="删除这个箱子">' + TRASH_SVG + '</button></div>' +
      '</div>';
  });
  const top=box.scrollTop;
  UI_KIT.patch(box,h);
  box.querySelectorAll('[data-cname]').forEach(input=>{if(input!==document.activeElement)input.value=S.chests[+input.dataset.cname].name;});
  box.scrollTop=top;
  box._warehouseStamp=stamp;
}

function selectWarehouse(target){
  if(WAREHOUSE.select(S,target)){renderChest();save();}
}
$('#chestpage').addEventListener('click',e=>{
  const chest=e.target.closest('[data-warehouse-select]');
  if(chest&&!e.target.closest('button,input,.cgrid'))selectWarehouse(chest.dataset.warehouseSelect);
});
$('#chestpage').addEventListener('keydown',e=>{
  if(!e.target.matches('.chead')||!['Enter',' '].includes(e.key))return;
  e.preventDefault();selectWarehouse(e.target.closest('[data-warehouse-select]').dataset.warehouseSelect);
});

/** 新箱子的名字：箱子1、箱子2……跳过已经占掉的号，玩家改过名也不会撞。 */
function nextChestName() {
  for (let n = 1; ; n++) {
    const nm = '箱子' + n;
    if (!S.chests.some(c => c.name === nm)) return nm;
  }
}

/** 部署一个箱子：从整个库存（= 物品栏 + 各箱子）里扣掉 1 个箱子，
 *  仓库页就多出一个空的。take 先问物品栏、再按箱子顺序问，合"减少优先物品栏"。 */
function deployChest() {
  if (!take('minecraft:chest@0', 1)) {
    chestSay('库存里没有箱子了，先合成一个。', true);
    renderChest();
    return;
  }
  const name = nextChestName();
  S.chests.push({ name: name, slots: new Array(CHEST_SLOTS).fill(null) });
  chestSay('部署了一个' + name + '。');
  markInv();
  save();
  renderChest();
}

/** 整理：合并同类堆，再按名字排序。 */
function chestSort(ci) {
  const c = S.chests[ci];
  if (!c) return;
  CORE.organize(c.slots,byName);
  chestSay('整理完了：' + c.name);
}

/** 补齐：物品栏里凡是这个箱子已经有的东西，都塞进来。 */
function chestTopUp(ci) {
  const c = S.chests[ci];
  if (!c) return;
  const kinds = [...new Set(c.slots.filter(Boolean).map(s => s.k))].filter(k => !isTool(k));
  let moved = 0, stuck = 0;
  for (const k of kinds) {
    const want=CORE.count(S.inv,k);if(!want)continue;
    const result=CORE.transferItems({from:CORE.slotBox(S.inv),to:CORE.slotBox(c.slots),k:k,n:want});
    moved+=result.moved;stuck+=result.remainder;
  }
  chestSay(moved ? '补齐 ' + moved + ' 个到 ' + c.name + (stuck ? '，' + stuck + ' 个放不下' : '')
                 : c.name + ' 里没有物品栏也有的东西，或者已经放不下了', !moved);
}

/** 全存：物品栏里所有东西都往这个箱子塞。 */
function chestStoreAll(ci) {
  const c = S.chests[ci];
  if (!c) return;
  let moved = 0, stuck = 0;
  for (let i = 0; i < S.inv.length; i++) {
    const s = S.inv[i];
    if (!s) continue;
    const result=CORE.transferSlot({from:CORE.slotBox(S.inv),index:i,to:CORE.slotBox(c.slots)});
    moved+=result.moved;stuck+=(s.n||1)-result.moved;
  }
  chestSay(moved ? '存了 ' + moved + ' 个进 ' + c.name + (stuck ? '，' + stuck + ' 个放不下' : '')
                 : c.name + ' 放不下了', !moved);
}

/** 从物品栏某一格拖到某个箱子。整格搬过去，不是整类。 */
function storeToChest(ci, i) {
  const c = S.chests[ci], s = S.inv[i];
  if (!c || !s) return;
  const result=CORE.transferSlot({from:CORE.slotBox(S.inv),index:i,to:CORE.slotBox(c.slots)});
  if(!result.moved){chestSay(c.name+' 满了，放不下',true);return;}
  chestSay('存进 '+c.name+'：'+nameOf(s.k)+' ×'+result.moved);
  markInv(); save();
}

/** 点箱子里的东西：拿一组回物品栏。 */
function clickChestSlot(ci, i) {
  const c = S.chests[ci];
  if (!c) return;
  const s = c.slots[i];
  if (!s) return;
  const result=COMMANDS.withdraw(S,c.slots,i);
  transferTip(result,'取出');if(!result.ok)return;
  markInv(); save();
}

/* --- 任务书 ---
 * 一个任务分两步：条件够了先只是"可以交"（自动算出来，安静地亮个标记），
 * 玩家自己点一下「确认」才算完成。
 * 依赖只看 S.qever（完成过就一直算完成过），所以调试时把某个任务退回完成前，
 * 不会连累它已经解锁的后置任务。
 * qcan 只是"上一次扫描时够不够"的缓存，用来判断有没有变化，不进存档。 */
const QUEST_POLL = 1.5;         // 秒。检测循环的间隔，不用太密
let qcan = {};

function questReady(q) { return QUESTS.ready(S,q); }
/** 一个任务要交的东西：同一种物品的多条需求合并（书里 5 根 + 2 根就是 7 根）。 */
function questNeed(q) {
  const m = new Map();
  for (const it of q.items) {
    const k = it[0] + '@' + it[1];
    m.set(k, (m.get(k) || 0) + (it[2] || 1));
  }
  return [...m];
}
function questMet(q) { return QUESTS.met(S,q); }
function questHave(k){if(!isTool(k))return have(k);return ENTITIES.storage(S).concat([Object.values(S.tools||{})]).reduce((n,a)=>n+a.reduce((n,s)=>n+(s&&!s.entityUid&&(CONTENT.baseKey(s.k)===k||CONTENT.matches(k,s.k,{ignoreNBT:true}))?(s.n??1):0),0),0);}
/** 前置解锁了、东西也齐了 —— 就差玩家点确认。 */
function questCan(q) {
  return !S.quests[q.id] && questReady(q) && questMet(q);
}
function qCanCount(){return QUESTS.withSnapshot(S,qCanCountBody);}
function qCanCountBody() {
  let n = 0;
  for (const q of GD.quests) if (questCan(q)) n++;
  return n;
}

/** 收起状态下那个把手上挂一个小圆点，告诉你"回来有任务可以交"。
 *  静态的，不闪不弹。 */
function renderQBadge(n) {
  const want = n > 0 ? '任务书<i class="qdot">' + n + '</i>' : '任务书';
  document.querySelectorAll('#qopen,[data-side-view="quests"]').forEach(b=>{if(b.innerHTML!==want)b.innerHTML=want;b.title=n>0?'有 '+n+' 个任务可以确认':'任务书';});
}

/** 玩家点了「确认」。完成就是完成，动画在这一下放，很短。 */
function claimQuest(id) {
  const q = questIndex().get(id);
  if (q && QUESTS.complete(S,q)) showQuestCompletion(q);
}

function completeQuestFromDeveloper(id) {
  const q = questIndex().get(id);
  if (!q || !QUESTS.completeFromDeveloper(S,q)) return false;
  showQuestCompletion(q);
  return true;
}

function showQuestCompletion(q) {
  markDynamic();
  delete qcan[q.id];
  dirty.quests = true;
  renderQuests(); dirty.quests = false;     // 先画完再放动画，不然动画盖在旧卡上
  renderQBadge(qCanCount());
  save();
  say('任务「' + q.name + '」完成。');
  questFx(q.id);
}

/** 盖章那一小下：卡上弹一个对勾、扫一道光、飘几颗星星。总共一秒左右。 */
function questFx(id) {
  const card = $('#questlist .q[data-quest="' + id + '"]');
  if (!card) return;
  const fx = document.createElement('div');
  fx.className = 'qfx';
  let h = '<span class="qstamp">✓</span>';
  for (let i = 0; i < 5; i++) {
    const a = -120 + i * 42 + (Math.random() * 18 - 9);      // 往上半圈撒
    h += '<span class="qstar" style="--dx:' + (Math.cos(a * Math.PI / 180) * 40).toFixed(1) +
         'px;--dy:' + (Math.sin(a * Math.PI / 180) * 34).toFixed(1) + 'px;' +
         'animation-delay:' + (i * 0.03).toFixed(2) + 's">✦</span>';
  }
  fx.innerHTML = h;
  card.appendChild(fx);
  card.classList.add('justdone');
  setTimeout(() => {
    card.classList.remove('justdone');
    if (fx.parentNode) fx.parentNode.removeChild(fx);
  }, 1100);
}

/** 调试用：把一个任务退回"没完成"。完成过这件事不抹掉（S.qever 留着），
 *  所以依赖它的后置任务不会被连累。 */
function resetQuest(id) {
  if (!DEVELOPER_MODE.active(S)||!S.quests[id]) return;
  delete S.quests[id];
  if(S.questAchievements)delete S.questAchievements[id];
  delete qcan[id];
  renderQuests(); dirty.quests = false;
  renderQBadge(qCanCount());
  save();
  say('任务 ' + id + ' 退回完成前（已经解锁的后置任务不受影响）。');
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/* ============================ 弹出选择器 ============================ */

let popupCb = null;
/** 浮窗：挑一样东西。
 *  按来源分组显示——物品栏一组，每个箱子各一组，各自显示自己有什么、有多少。
 *  点哪一组里的，就从哪一组里拿，不跨来源。 */
function pickItem(title, filter, cb) {
  const groups = [];
  const pick = (slots) => {
    const seen = new Set(), keys = [];
    for (const c of slots) if (c && c.n != null && filter(c.k) && !seen.has(c.k)) {
      seen.add(c.k); keys.push(c.k);
    }
    return keys.sort(byName);
  };

  const invKeys = pick(S.inv);
  if (invKeys.length) {
    groups.push({ label: '物品栏', src: 'inv', keys: invKeys, slots: S.inv });
  }
  S.chests.forEach((ch, i) => {
    const keys = pick(ch.slots);
    if (keys.length) {
      groups.push({ label: ch.name, src: 'chest:' + i, keys, slots: ch.slots });
    }
  });

  const box = $('#popup');
  box.hidden = false;
  box.innerHTML = '<div class="box"><h3>' + esc(title) +
    '<span class="dim">　（物品栏与仓库）</span></h3>' +
    '<div class="plists">' + (groups.length ? groups.map(g =>
      '<div class="pgrp"><div class="pgh">' + esc(g.label) + '</div>' +
      '<div class="list">' + g.keys.map(k =>
        '<div class="ing pick" data-pick="' + esc(k) +
        '" data-picksrc="' + g.src + '">' + esc(nameOf(k)) +
        ' <span class="n">' + countIn(g.slots, k) + '</span></div>').join('') +
      '</div></div>').join('')
      : '<div class="dim">没有能放的东西。</div>') + '</div>' +
    '<div class="foot"><button class="btn" data-popclose="1">关闭</button></div></div>';
  popupCb = cb;
}
let confirmCb = null;
function closePopup() {
  if(window.FLUID_PICKER)FLUID_PICKER.close();
  ITEM_DRAG.returnHeld();
  if(window.SPACE_UI)SPACE_UI.closeSupplies();
  if(window.TINKER_WORKSTATIONS_UI)TINKER_WORKSTATIONS_UI.close();
  if(window.SMELTERY_UI)SMELTERY_UI.close();
  if(window.WORLD_PANELS)WORLD_PANELS.close();
  if(window.WORLD_UI)WORLD_UI.dismissDiscovery();
  closeCount();furnaceSelection=null;
  $('#popup').hidden = true;
  $('#popup').classList.remove('noback');
  if (window.FACTORY && FACTORY.close) FACTORY.close();
  popupCb = null;
  confirmCb = null;
}

/* 二级确认浮窗。会删东西的操作都先过这一道，把后果写在浮窗里说清楚。 */
function confirmBox(title, body, okText, cb) {
  const box = $('#popup');
  box.hidden = false;
  box.innerHTML = '<div class="box confirm"><h3>' + esc(title) + '</h3>' +
    '<div class="cbody">' + body + '</div>' +
    '<div class="foot"><button class="btn" data-popclose="1">再想想</button> ' +
    '<button class="btn danger" data-cfok="1">' + esc(okText) + '</button></div></div>';
  popupCb = null;
  confirmCb = cb;
}

/** 删箱子。里面的东西跟着一起没，所以要说清数量再让他确认一次。 */
function askDeleteChest(ci) {
  const c = S.chests[ci];
  if (!c) return;
  const kinds = c.slots.filter(Boolean).length;
  const total = c.slots.reduce((a, s) => a + (s ? s.n : 0), 0);
  confirmBox('删除「' + c.name + '」？',
    '<p>这个箱子和它里面的东西会一起删掉：<b>' + kinds + ' 种、共 ' + total +
    ' 个</b>，删了找不回来。</p>' +
    (S.chests.length <= 1 ? '<p class="warn">这是最后一个箱子了。</p>' : ''),
    '连东西一起删掉', () => {
      S.chests.splice(ci, 1);
      chestSay('删掉了「' + c.name + '」。');
      markInv(); markDynamic(); save();
      renderChest();
    });
}

/** 浮窗里挑中的东西，从它所在的那个来源拿。挑不动就返回 false。 */
function takeFrom(src, k, n) {
  if (src === 'inv') {
    if (countIn(S.inv, k) < n) return false;    // 不够就不许动，别扣一半
    slotTake(S.inv, k, n);
    return true;
  }
  if (typeof src === 'string' && src.indexOf('chest:') === 0) {
    const c = S.chests[+src.slice(6)];
    if (!c || countIn(c.slots, k) < n) return false;
    slotTake(c.slots, k, n);
    return true;
  }
  return take(k, n);          // 兜底：还是走"先物品栏、后箱子"
}

/* ============================ 交互 ============================ */

/* 数量选择小浮窗：贴在点的那一格正上方。
 * 为什么要有：物品一进去就是实打实的消耗，不问数量等于坑玩家。
 * opt = { max, def, unit, title }；cb(n) 返回后自动关闭。 */
let cntBox = null, cntCb = null, cntOpt = null;
function closeCount() {
  if (cntBox && cntBox.parentNode) cntBox.parentNode.removeChild(cntBox);
  cntBox = null; cntCb = null; cntOpt = null;
}
function countOpen() { return !!cntBox; }

function askCount(anchorEl, opt, cb) {
  closeCount();
  const max = Math.max(1, opt.max | 0);
  const def = Math.min(max, Math.max(1, opt.def | 0));
  cntOpt = { n: def, max, cb, unit: opt.unit || '' };

  const box = document.createElement('div');
  box.className = 'cntpop';
  box.innerHTML =
    '<div class="cnt-top">' + (opt.icon ? iconHtml(opt.icon,24) : '') +
      '<span class="cnt-tt">' + esc(opt.title || '放多少') + '</span></div>' +
    '<div class="cnt-row">' +
      '<button class="btn cnt-b" data-cnt="-" title="少一个">−</button>' +
      '<input class="cnt-in" type="text" inputmode="numeric" value="' + def + '">' +
      '<button class="btn cnt-b" data-cnt="+" title="多一个">+</button>' +
      '<span class="cnt-max">/ ' + max + (cntOpt.unit ? ' ' + esc(cntOpt.unit) : '') + '</span>' +
    '</div>' +
    '<div class="cnt-quick">' +
      [1, 8, 16, 32, 64].filter(v => v <= max).map(v =>
        '<button class="btn cnt-q" data-cntq="' + v + '">' + v + '</button>').join('') +
      '<button class="btn cnt-q" data-cntq="max">全部</button>' +
    '</div>' +
    '<div class="cnt-foot">' +
      '<button class="btn" data-cntx="1">算了</button>' +
      '<button class="btn ok" data-cntok="1">'+esc(opt.action||'放进去')+'</button>' +
    '</div>';
  document.body.appendChild(box);
  cntBox = box;

  // 贴在锚点上方居中
  const r = anchorEl.getBoundingClientRect();
  const z = uiZoom();
  const sidebar = $('#quests');
  const right = sidebar && !$('#app').classList.contains('qclosed') ? sidebar.getBoundingClientRect().left : window.innerWidth;
  box.style.maxWidth = Math.max(100, right / z - 16) + 'px';
  const bw = box.getBoundingClientRect().width / z;
  let left = (r.left + r.width / 2) / z;
  // 贴着屏幕边上的格子，浮窗别跑出去
  left = Math.max(8 + bw / 2, Math.min(right / z - 8 - bw / 2, left));
  let top = (r.top - 8) / z;
  box.style.left = left + 'px';
  box.style.top = top + 'px';
  box.style.transform = 'translate(-50%, -100%)';
  // 太靠上就翻到下方
  const bh = box.getBoundingClientRect().height / z;
  if (top - bh < 8) {
    box.style.top = ((r.bottom + 8) / z) + 'px';
    box.style.transform = 'translate(-50%, 0)';
  }

  const inp = box.querySelector('.cnt-in');
  const fix = () => {
    let v = parseInt(inp.value.replace(/[^0-9]/g, ''), 10);
    if (!(v > 0)) v = 1;
    v = Math.min(max, v);
    cntOpt.n = v;
    inp.value = v;
  };
  inp.addEventListener('input', fix);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { fix(); countGo(); }
    if (e.key === 'Escape') { e.stopPropagation(); closeCount(); }
  });
  setTimeout(() => { inp.focus(); inp.select(); }, 0);

  box.addEventListener('click', e => {
    const b = e.target.closest('[data-cnt],[data-cntq],[data-cntok],[data-cntx]');
    if (!b) return;
    e.stopPropagation();
    const D = b.dataset;
    if (D.cntx) return closeCount();
    if (D.cntok) { fix(); return countGo(); }
    if (D.cnt === '-') { cntOpt.n = Math.max(1, cntOpt.n - 1); inp.value = cntOpt.n; return; }
    if (D.cnt === '+') { cntOpt.n = Math.min(max, cntOpt.n + 1); inp.value = cntOpt.n; return; }
    if (D.cntq) {
      cntOpt.n = (D.cntq === 'max') ? max : Math.min(max, +D.cntq);
      inp.value = cntOpt.n;
    }
  });

  function countGo() {
    fix();                       // 不管从哪条路来的，出去之前再夹一次上限
    const n = cntOpt.n, f = cntOpt.cb;
    closeCount();
    if (f) f(n);
  }
}

/* One outside gesture dismisses panels only. Collect closures before the target
 * handler can open another panel, and swallow both pointerdown and its click so
 * buttons, links, checkboxes and the blueprint canvas cannot act underneath.
 * Input inventory cells are associated controls of processing panels. */
function referencePanelEvent(e){
  if(e.composedPath().some(t=>t&&t.nodeType===1&&t.matches('#quests,#qopen,#qtip')))return true;
  if(e.type==='click'&&e.detail===0)return false;
  return ['#quests','#qopen','#qtip'].some(selector=>{const el=$(selector);if(!el||el.hidden||!el.getClientRects().length)return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&e.clientX>=r.left&&e.clientX<r.right&&e.clientY>=r.top&&e.clientY<r.bottom;});
}
function outsidePanelClosers(e) {
  const t=e&&e.target;
  if(!t||!t.closest)return [];
  if(t.closest('.fluid-picker,[data-save-retry]'))return [];
  if(t.closest('#quests,#qopen,#qtip'))return [];
  const close=[];
  if(window.SAVE_SLOTS_UI&&SAVE_SLOTS_UI.isOpen()&&!t.closest('#save-slots,[data-save-open]'))close.push(()=>SAVE_SLOTS_UI.dismiss());
  if(TRASH.active(S)&&!t.closest('#trash-items,[data-trash-open],'+ITEM_DRAG.selector))close.push(()=>TRASH.dismiss());
  const insideCount=!!t.closest('.cntpop');
  if(cntBox&&!insideCount)close.push(closeCount);
  const queue=$('#action-queue-popover');
  if(queue&&!queue.hidden&&!t.closest('#action-queue-popover,[data-queue-toggle]'))close.push(()=>WORLD_UI.dismissQueue());
  const messages=$('#msgs');
  if(messages&&!messages.hidden&&!t.closest('#msgs,#msgopen'))close.push(()=>msgOpen(false));
  for(const back of document.querySelectorAll('.ws-modal-back')){
    const panel=back.querySelector('.ws-modal');
    if(panel&&!panel.contains(t)&&back.dismissPanel)close.push(()=>back.dismissPanel());
  }
  const popup=$('#popup');
  if(!popup||popup.hidden)return close;
  if(popup.querySelector('.cgrid')&&!t.closest('.cgrid,[data-cir]'))close.push(()=>FACTORY.closeCircuitPicker(t,S,save));
  const panel=popup.querySelector('.box');
  if(!panel||panel.contains(t)||insideCount||t.closest('#dropped-items,[data-drop-open],#trash-items,[data-trash-open]'))return close;
  const stockCell=t.closest(ITEM_DRAG.selector);
  const usingStock=(window.FACTORY&&FACTORY.isOpen&&FACTORY.isOpen())||
    !!popup.querySelector('[data-uses-inventory="true"]')||!!popup.querySelector('.furwin')||!!popup.querySelector(ITEM_DRAG.selector)||(window.WORLD_PANELS&&WORLD_PANELS.usesInventory());
  const switchTo=(!stockCell&&window.FACTORY&&FACTORY.windowTargetAt)?FACTORY.windowTargetAt(e,S):null;
  if(switchTo)return close;   // 交给画布自己打开目标窗口，避免关掉又打不开
  if(!stockCell||!usingStock)close.push(closePopup);
  return close;
}
function consumePanelGesture(e){e.preventDefault();e.stopImmediatePropagation();}
let swallowPanelClick=false,referencePanelPointer=false;
window.addEventListener('pointerdown',e=>{
  swallowPanelClick=false;
  referencePanelPointer=referencePanelEvent(e);
  if(e.button<0)return;
  const openPopup=document.getElementById('popup');
  if(e.button===2&&openPopup&&!openPopup.hidden&&!openPopup.contains(e.target)&&e.target.closest&&e.target.closest('.fx-viewport')){
   if(typeof toast==='function')toast('请先关闭浮窗再拆除');
   consumePanelGesture(e);return;
  }
  if(ITEM_DRAG.beforeOutside(e))return;
  if(referencePanelPointer)return;
  const close=outsidePanelClosers(e);
  if(!close.length)return;
  close.forEach(fn=>fn());
  swallowPanelClick=true;
  consumePanelGesture(e);
},true);
window.addEventListener('pointercancel',()=>{swallowPanelClick=false;referencePanelPointer=false;},true);
window.addEventListener('click',e=>{
  const reference=referencePanelEvent(e)||(e.detail!==0&&referencePanelPointer);referencePanelPointer=false;
  if(ITEM_DRAG.consumeClick(e))return;
  if(reference){swallowPanelClick=false;return;}
  if(swallowPanelClick&&e.detail!==0){swallowPanelClick=false;consumePanelGesture(e);return;}
  swallowPanelClick=false;
  const close=outsidePanelClosers(e.target);
  if(close.length){close.forEach(fn=>fn());consumePanelGesture(e);}
},true);


document.addEventListener('click', e => {
  const t = e.target.closest('[data-worldscene],[data-repeatgo],[data-psrc],[data-pexp],[data-gostart],[data-pkcancel],' +
    '[data-mine],[data-cancel],[data-mkfur],[data-item],[data-tab],[data-make],[data-manual-fill],' +
    '[data-mk],[data-cell],[data-fur],[data-pick],[data-popclose],[data-quest],' +
    '[data-qclaim],[data-q-dev-complete],[data-qback],[data-quest-item],[data-quest-jump],[data-qcheck],[data-msgx],' +
    '[data-qx],[data-qchap],[data-cdeploy],[data-cdel],[data-cfok],[data-dep],' +
    '[data-furopen],[data-furhop],' +
    '[data-cslot],[data-csort],[data-ctop],[data-call],' +
    '[data-r],[data-dimtab],[data-dbg],[data-spd],[data-no-tool-wear],[data-test-weather],[data-cmdrun],[data-pg],[data-zoom],' +
    '[data-ms],[data-ch],[data-cir],[data-cirset],' +
    '[data-coil],[data-coilset],[data-clean],[data-faceuid]');
  if (!t) {
    const lookup=e.target.closest('[data-lookup-key]');if(lookup&&!lookup.closest('button,a,.fx-viewport')&&CONTENT.item(lookup.dataset.lookupKey)){RECIPE_QUERY.openFromElement(lookup,lookup.dataset.lookupKey,'recipes');return;}
    /* 点空白处收起电路数字盘 */
    if (window.FACTORY && FACTORY.closeCircuitPicker) FACTORY.closeCircuitPicker(e.target, S, save);
    return;
  }
  const D = t.dataset;
  if(D.manualFill){const r=GD.craft.find(r=>r.id===D.manualFill),result=MANUAL_WORKBENCH.fill(S,r);if(result.ok){markInv();save();renderDyn();MANUAL_WORKBENCH_UI.refresh();}else toastAt(null,({INPUT:'原料不足',OUTPUT:'背包放不下格内材料',WORKBENCH:'需要先放置工作台'})[result.code]||'无法摆入此配方');return;}
  if(t.matches('[data-cell],[data-ms],[data-fur],[data-cslot],[data-ch]'))return;

  if (D.cmdrun) { const i = $('#cmd'); if (i) { runCmd(i.value); i.value = ''; } return; }
  if (D.zoom) {
    const v = D.zoom;
    if (v === 'reset') S.zoom = ZOOM_DEF;
    else if (v.charAt(0) === '+' || v.charAt(0) === '-') S.zoom = (S.zoom || ZOOM_DEF) + (+v);
    else S.zoom = +v;                       // 常用档是绝对值
    applyZoom();
    renderZoom();
    save();
    return;
  }
  if (D.dbg) {setDeveloperTiming({on:!DEVELOPER_MODE.active(S)});return;}
  if (D.noToolWear) {if(DEVELOPER_MODE.active(S))setDeveloperTiming({noToolWear:!TOOL_WEAR.preserved(S)});return;}
  if (D.testWeather) {
    if(!DEVELOPER_MODE.active(S)||!['rain','snow'].includes(D.testWeather))return;
    setWeather(D.testWeather);visualEnvironment.current=null;syncEnv(true);save();return;
  }
  if (D.spd) {
    if(!DEVELOPER_MODE.active(S))return;
    if (D.spd === 'tick') setDeveloperTiming({fastest:true});
    else setDeveloperTiming({fastest:false,speed:1});
    return;
  }
  // 注意：维度的 data-* 只能叫 data-dimtab。之前叫 data-dim，跟挂在 #app 上
  // 用来配色的 data-dim 撞了，closest 会一路摸到 #app，点哪儿都当成"切维度"，
  // 顺手把选数量那块清掉。
  if (D.dimtab) {
    let dim=D.dimtab;
    if(!DIMENSIONS.open(S,dim)){
      if(dim!=='end'||!WORLD_MAP_UI.selectRegion('overworld',WORLD_MAP_CONTENT.portalRegion(dim)))return;
      dim='overworld';
    }
    closePopup();S.ui.dim=dim;S.ui.pick=null;applyTheme();markDynamic();return;
  }
  if (D.cirset != null) {
    if (window.FACTORY) FACTORY.setCircuit(D.ciruid, +D.cirset, S, save);
    return;
  }
  if (D.cir != null) {
    if (window.FACTORY) FACTORY.toggleCircuit(D.cir, S, save);
    return;
  }
  if (D.coilset != null) {
    if (window.FACTORY) FACTORY.setCoil(D.coiluid, +D.coilset, S, save);
    return;
  }
  if (D.coil != null) {
    if (window.FACTORY) FACTORY.toggleCoil(D.coil, S, save);
    return;
  }
  if (D.clean != null) {
    if (window.FACTORY) FACTORY.toggleClean(D.clean, S, save);
    return;
  }
  if (D.faceto != null) {
    if (window.FACTORY) FACTORY.setFace(D.faceuid, +D.faceto, S, save);
    return;
  }
  if (D.popclose) return closePopup();
  if (D.pick) {
    const k = D.pick, src = D.picksrc;
    const cb = popupCb;
    closePopup();
    if (cb) cb(k, src);
    return;
  }
  // 仓库页
  if (D.cdeploy) return deployChest();
  if (D.cdel) return askDeleteChest(+D.cdel);
  if (D.cfok) { const cb = confirmCb; closePopup(); if (cb) cb(); return; }
  // 世界页右边的部署区：表里查得到才认，免得有人手改 data-dep
  if (D.dep) {
    const d = DEPLOY.find(x => x.k === D.dep);
    if (d&&(!d.unlock||FEATURE_UNLOCKS.isOpen(S,d.unlock))) { d.go(); renderWorldRight(); }
    return;
  }
  if (D.cslot) return clickChestSlot(+D.cslot, +D.i);
  if (D.csort) { chestSort(+D.csort); markInv(); save(); return; }
  if (D.ctop) { chestTopUp(+D.ctop); markInv(); save(); return; }
  if (D.call) { chestStoreAll(+D.call); markInv(); save(); return; }
  if (D.pkcancel) { S.ui.pick = null; markDynamic(); return; }
  if (D.worldscene) { S.ui.worldScene=D.worldscene;renderActions();return; }
  if (D.repeatgo) {if(S.ui.pick&&ITEM_DRAG.returnHeld()){S.ui.pick.repeat=true;pickerGo();}return;}
  if (D.gostart) { pickerGo(); return; }
  if (D.psrc) {
    const s = GD.sources.find(x => x.id === D.psrc);
    if (s) openPicker('gather', s.id, s.name);
    return;
  }
  if (D.pexp) { openPicker('explore', 'explore', '探索矿脉'); return; }
  if (D.pg) {
    const count=Math.max(1,Math.ceil(listItems().length/PER_PAGE));S.ui.pg=(S.ui.pg+ +D.pg+count)%count;
    renderList();
    return;
  }
  if (D.tab) {
    S.ui.tab = D.tab; S.ui.sel = null; S.ui.pg = 0;
    renderTabs(); renderList(D.tab==='all'); renderDetail(); return;
  }
  if (D.cancel) { cancelAct(); return; }
  if (D.mine) { startMine(+D.mine); return; }
  if (D.mkfur) { if (craftFurnace()) { markInv(); markDynamic(); save(); } return; }
  if (D.go) { RECIPE_QUERY.openFromElement(t,D.go,'recipes'); return; }
  if (D.ch != null) {
    if (window.FACTORY) FACTORY.chestTake(+D.ch, S, save);
    return;
  }
  if (D.item) {
    if(t.closest('#itemlist,#history')){gotoCraft(D.item,'recipes',{keepPage:true});return;}
    return;
  }
  if (D.make) { doMake(D.make, +D.mk || 1, +D.ri || 0); return; }
  if (D.cell) { clickCell(D.cell, D.cell==='tool'?D.i:+D.i); return; }
  if (D.furopen) return openFurnace(+D.furopen);
  if (D.furhop) return installHopper(+D.furhop);
  if (D.qx) { toggleQuests(D.qx === 'close'); return; }
  if (D.msgx) {
    if (D.msgx === 'clear') {
      S.msgs = []; S.msgNew = 0;
      renderMsgs(); save();
    } else {
      msgOpen(D.msgx === 'open' ? true : false);
    }
    return;
  }
  if (D.qchap) {
    const list=$('#questlist'), previous=qChapNow();
    if(previous!==D.qchap)questScrolls.set(previous,list.scrollTop);
    hideQtip(); closeQuestMarkers(); $('#quest-search-results').hidden=true;
    S.qfold.open = D.qchap;
    S.ui.qopen = null;S.ui.qtarget=null; // 换章后清理当前定位
    save();
    renderQuests();
    list.scrollTop=previous===D.qchap?0:questScrolls.get(D.qchap)||0;
    renderQuestMarkers();
    return;
  }
  if (D.questItem) { RECIPE_QUERY.openFromElement(t,D.questItem,'recipes');hideQtip();return; }
  if (D.questJump) { jumpQuest(+D.questJump);return; }
  if(e.target.closest('#questlist details,#questlist a'))return;
  const qcheckHit=e.target.closest('[data-qcheck]');
  if (qcheckHit) { e.preventDefault(); S.questChecks=S.questChecks||{}; S.questChecks[qcheckHit.dataset.qcheck]=true; renderQuests(); return; }
  if (D.qclaim) { claimQuest(+D.qclaim); return; }
  if (D.qDevComplete) { completeQuestFromDeveloper(+D.qDevComplete); return; }
  if (D.qback) { resetQuest(+D.qback); return; }
  if (D.quest!=null) {
    S.ui.qtarget=+D.quest; renderQuests();
    showQtip($('#questlist [data-quest="'+D.quest+'"]'));
  }
});

document.addEventListener('contextmenu', e => {
  e.preventDefault();
  if(swallowPanelClick)return;
  if(e.target.closest('#inventory,#toolbar,[data-cell="inv"],[data-cell="tool"]'))return;
  if(e.target.closest('.fx-viewport'))return;
 const questItem=e.target.closest('[data-quest-item]');if(questItem){RECIPE_QUERY.openFromElement(questItem,questItem.dataset.questItem,'uses');hideQtip();return;}
  const f=e.target.closest('[data-lookup-fluid]');if(f){RECIPE_QUERY.openFromElement(f,f.dataset.lookupFluid,'uses',{target:'fluid'});return;}
  const node=e.target.closest('[data-lookup-key],[data-recipe-key],[data-go],[data-item],[data-r]');
  if(node){const k=node.dataset.lookupKey||node.dataset.recipeKey||node.dataset.go||node.dataset.item||node.dataset.r;if(CONTENT.item(k))RECIPE_QUERY.openFromElement(node,k,'uses');}
});

$('#nav').addEventListener('click', e => {
  const b = e.target.closest('[data-nav]');
  if (!b) return;
  if(b.disabled||!SPACEFLIGHT.canNavigate(S,b.dataset.nav)||b.dataset.nav==='space'&&!SPACEFLIGHT.unlocked(S))return;
  S.ui.page = b.dataset.nav;
  if (window.UI_STATE) UI_STATE.remember(S);
  applyView();
  // Navigation is recorded by the normal save loop. Inventory transfers have their own commit.
});
$('#q').addEventListener('input', e => {
  S.ui.q = e.target.value;
  S.ui.sel = null;
  S.ui.pg = 0;
  renderList(); renderDetail();
});
$('#craft-search-clear').onclick=()=>{const q=$('#q');q.value='';q.dispatchEvent(new Event('input',{bubbles:true}));q.focus();};
$('#craft-refresh').onclick=()=>{craftOrderCache=null;$('#detail')._craftOrder=null;markInv();renderList(true);renderDetail();};
document.addEventListener('contextmenu',e=>{const input=e.target.closest('input');if(!input||!(input.type==='search'||input.id==='q'||input.matches('.jei-search-input,[data-pipe-search],[data-tc-search],.recipe-search,.rb-search')))return;e.preventDefault();input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));},true);

$('#quest-search').addEventListener('input',()=>renderQuestSearch());
$('#quest-search').addEventListener('focus',()=>renderQuestSearch());
$('#quest-search').addEventListener('keydown',e=>{
  if(e.key==='Escape')$('#quest-search-results').hidden=true;
  if(e.key==='Enter'&&!$('#quest-search-results').hidden&&questSearchMatches.length){
    e.preventDefault(); jumpQuest(questSearchMatches[0].id);
  }
});
$('#quest-search-ready').onclick=()=>{
  const input=$('#quest-search');
  input.value=input.value==='@complete'?'':'@complete'; input.focus(); renderQuestSearch();
};
$('#questmarkers').addEventListener('click',e=>{
  const button=e.target.closest('button');
  if(!button)return;
  if(button.dataset.questMarker!=null){jumpQuest(+button.dataset.questMarker,false);return;}
  const side=button.dataset.questEdge;
  if(!side)return;
  const pins=questPinGroups[side];
  if(pins.length===1){jumpQuest(pins[0].id,false);return;}
  questMarkerSide=questMarkerSide===side?null:side;
  hideQtip(); renderQuestMarkers();
  $('#questmarkers .quest-pin-menu button')?.focus({preventScroll:true});
});
$('#questmarkers').addEventListener('wheel',e=>{
  if(e.target.closest('.quest-pin-menu'))return;
  const list=$('#questlist');
  list.scrollTop+=e.deltaY*(e.deltaMode===1?38:e.deltaMode===2?list.clientHeight:1);
  e.preventDefault();
},{passive:false});
document.addEventListener('click',e=>{
  if(!e.target.closest('#questmarkers'))closeQuestMarkers();
  if(!e.target.closest('#questfinder'))$('#quest-search-results').hidden=true;
});
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  if(questMarkerSide){
    const side=questMarkerSide;
    closeQuestMarkers(); $('#questmarkers [data-quest-edge="'+side+'"]')?.focus({preventScroll:true});
  }else if(qtipFor)hideQtip();
});
new ResizeObserver(renderQuestMarkers).observe($('#questlist'));

/* 鼠标停在任务卡上 → 旁边冒一个需求浮层；挪到浮层上不关，方便指着看数字。 */
document.addEventListener('pointermove',e=>{
  questPointer=[e.clientX,e.clientY];
  if(!questJumpPointer||(e.clientX===questJumpPointer[0]&&e.clientY===questJumpPointer[1]))return;
  questJumpPointer=null;
  const card=e.target.closest('#questlist .q[data-quest]');
  if(card&&card!==qtipFor)showQtip(card);
});
document.addEventListener('mouseover', e => {
  const c = e.target && e.target.closest && e.target.closest('#questlist .q[data-quest]');
  if(questJumpPointer)return;
  if(c)clearTimeout(qtipHideTimer);
  if (!c || c === qtipFor) return;
  showQtip(c);
});
document.addEventListener('mouseout', e => {
  const c = e.target && e.target.closest && e.target.closest('#questlist .q[data-quest]');
  if(!c||c!==qtipFor||questJumpPointer)return;
  const to = e.relatedTarget;
  if (to && (c.contains(to)||to.closest&&to.closest('#qtip'))) return;   // 指针挪去浮层了，别收
  deferHideQtip();
});
$('#qtip').addEventListener('mouseleave',e=>{if(qtipFor&&e.relatedTarget&&qtipFor.contains(e.relatedTarget))return;deferHideQtip();});
window.addEventListener('resize',()=>{if(qtipFor)placeQtip(qtipFor);});
$('#questlist').addEventListener('scroll', () => {
  questMarkerSide=null;
  renderQuestMarkers();
  if(!qtipFor)return;
  const anchor=qtipFor.getBoundingClientRect(), view=$('#questlist').getBoundingClientRect();
  if(!$('#qtip').matches(':hover')&&(anchor.bottom<view.top||anchor.top>view.bottom))hideQtip();
  else placeQtip(qtipFor);
});

// 指令台：回车执行
{
  const box = $('#cmd');
  if (box) {
    box.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      runCmd(box.value);
      box.value = '';
    });
  }
}

// 选数量的滑块 / 数字框
document.addEventListener('input', e => {
  const t = e.target;
  if (!t.dataset) return;
  // 箱子改名。只改数据，不重画（重画会把光标顶掉）
  if (t.dataset.cname != null) {
    const c = S.chests[+t.dataset.cname];
    if (c) c.name = t.value.slice(0, 12);
    return;
  }
  if (!(t.dataset.range || t.dataset.num)) return;
  const p = S.ui.pick;
  if (!p) return;
  const max = Math.max(1,pickerLimit(p));
  const v = Math.max(1, Math.min(max, parseInt(t.value, 10) || 1));
  p.n = v;
  const box = t.closest('.slotbox')||$('#slot');
  const r = box.querySelector('input[type=range]');
  const n = box.querySelector('.pknum');
  if (r && r !== t) r.value = v;
  if (n && n !== t) n.value = v;
});

/* --- 仓库页的拖动：从物品栏某一格拖到某个箱子上 --- */

RECIPE_KEYS.init(()=>S);
  if (window.JEI_FAVORITES) JEI_FAVORITES.init(()=>S, ()=>save());
ITEM_DRAG.init({state:()=>S,save:save,icon:iconHtml,name:nameOf,swallow:()=>swallowPanelClick,toast:message=>toastAt(null,message),place:(ref,item)=>{
  if(S.ui.page!=='line'||!$('#popup').hidden||TRASH.active(S))return false;
  const d=DEFS.of(item.k);if(!GRID_TRANSPORTS.definition(item.k)&&(!d||d.worldOnly||d.attachmentOnly)&&!MULTIBLOCKS.feedKey(item.k)&&!MULTIBLOCKS.casingItem(S,item.k))return false;
  return FACTORY.startPlace(item.k,S,save,ref.index);
},commit:(result,from,to)=>{
  if(from&&from.type!=='cursor'&&to&&to.type!=='cursor'&&![from,to].some(r=>['structurePort','structureMaterial','structureUpgrade','cover','pipeCover','surfaceCover'].includes(r.type)))transferTip(result,result.operation||'移动');
  markInv();markDynamic();save();renderDyn();
  FACTORY.refreshInventory(S,save);refreshFurnace();WORLD_PANELS.refreshDrag();PIPE_UI.refresh();if(window.EIO_UI)EIO_UI.refresh();
  if(S.ui.page==='chest')renderChest();ITEM_DRAG.refresh();
}});

MANUAL_WORKBENCH_UI.init({state:()=>S,processor:CRAFTER,icon:iconHtml,name:nameOf,toast:message=>toastAt(null,message),changed:()=>{markInv();markDynamic();save();renderDyn();}});

 
SPACE_UI.init({state:()=>S,activity:id=>{const d=ACTIVITIES.definitions[id];openPicker('gather',id,d.name);renderDyn();},picker:()=>{const p=S.ui.pick;return p&&ACTIVITIES.definitions[p.id]?.planet===SPACEFLIGHT.planet(S)?pickerHtml(p):'';},save:save,closePopup:closePopup,name:nameOf,icon:iconHtml,have:craftHave,plan:craftPlan,stockVersion:craftStockRevision,craft:recipe=>make(recipe,1),toast:message=>toastAt(null,message),changed:()=>{markInv();markDynamic();save();renderDyn();},theme:applyTheme,navigationChanged:renderNav,navigate:page=>{closePopup();S.ui.page=page;applyView();save();},machine:id=>FACTORY.openDetail(id,S.fx,S,save),prepareCinema:()=>{closePopup();ITEM_DRAG.returnHeld();markInv();},landed:planet=>{markQuests();renderTop();toastAt(null,'已登陆'+planet.name);}});
const PAGES = [
  ['world', '世界'],
  ['craft', '合成'],
  ['chest', '仓库'],
  ['agri', '农业'],
  ['line', '工厂'],
  ['space', '航天'],
  ['settings', '设置'],
];

function renderNav() {
  UI_KIT.mount(document);
  const NAV_ICON = {world:'world',craft:'craft',chest:'store',agri:'leaf',line:'factory',space:'rocket',settings:'settings'};
  const toolManagement = $('#tool-dock .tool-management-button');
  if (!toolManagement.firstChild) toolManagement.innerHTML = UI_KIT.glyph('store', 17);
  $('#nav-pages').innerHTML = PAGES.map(([k, n]) => {
    const ic = UI_KIT.glyph(NAV_ICON[k],24);
    return '<button class="navbtn' + (S.ui.page === k ? ' on' : '') +
      (ic ? '' : ' noic-nav') + '" data-nav="' + k + '"'+(!SPACEFLIGHT.canNavigate(S,k)?' disabled aria-disabled="true"':k==='space'&&!SPACEFLIGHT.unlocked(S)?' disabled aria-disabled="true" data-tip="完成「NASA工作台」任务后解锁"':'')+'>' + ic +
      '<span class="nvt">' + n + '</span></button>';
  }).join('');
}

/* 小作坊页：区的增删、槽位、改名全在 workshop.js 里，这里只负责挂进容器。 */
function renderWorkshop() {
  const host = $('#ws-host');
  if (!host) return;
  if (typeof WS === 'undefined') {
    host.innerHTML = '<div class="panel todo"><p>workshop.js 没加载上。</p></div>';
    return;
  }
  host.innerHTML = '';
  host.appendChild(WS.render(S, save));
}

$('#fx-host').addEventListener('factory-dimension-change', () => {
  if (S.ui.page === 'line') syncEnv(true);
});

function renderFactory() {
  const host = $('#fx-host');
  if (!host) return;
  if (typeof FACTORY === 'undefined') {
    host.innerHTML = '<div class="panel todo"><p>factory.js 没加载上。</p></div>';
    return;
  }
  FACTORY.render(S, save);
}

function applyView() {
  if(!SPACEFLIGHT.canNavigate(S,S.ui.page))S.ui.page='space';
  if(S.ui.page==='space'&&!SPACEFLIGHT.unlocked(S))S.ui.page='world';
  if(S.ui.page!=='space')SPACE_UI.dismiss();
  if(S.ui.page!=='craft')craftRenderRequest++;
  ITEM_DRAG.returnHeld();
  if(S.ui.page==='machine')S.ui.page='line';
  if (!PAGES.some(([k]) => k === S.ui.page)) S.ui.page = 'world';
  if(S.ui.page!=='line')FACTORY.cancelPlace(S,save);
  for (const [k] of PAGES) {
    const el = $('#page-' + k);
    if (el) el.hidden = k !== S.ui.page;
  }
  renderNav();
  applyTheme();
  switch (S.ui.page) {
    case 'agri':FARM_UI.render(S,save);break;
    case 'craft':
      $('#detail')._craftOrder=null;
      renderTabs(); renderList(true); renderDetail(); renderHistory();MANUAL_WORKBENCH_UI.refresh();
      break;
    case 'chest':
      renderChest();
      break;
    case 'machine':
      renderWorkshop();
      break;
    case 'line':
      if (typeof FACTORY !== 'undefined') { FACTORY.ensure(S); renderFactory(); }
      break;
    case 'space':
      SPACE_UI.mount();
      break;
    case 'settings':
      renderSettings();
      break;
    case 'world':
      renderSlot(); renderWorldRight();
      break;
  }
}

function doMake(k, times, ri) {
  const r = (CRAFT_BY_OUT.get(k) || [])[ri || 0];
  if (!r) return;
  if (benchLocked(r)) { say(r.station==='nasa'?'先去航天页部署NASA工作台。':'这条配方要用工作台，先去世界页摆一个。', 'bad'); return; }
  let n = 0;
  for (let i = 0; i < times; i++) { if (!make(r, 1)) break; n++; }
  if (n) {
    // make reports committed bag/warehouse receipts and merges repeated gains.
    markInv(); markDynamic(); markQuests(); save();
    renderDetail();
    renderDyn();          // 合成历史立刻刷新，不用等下一次 tick
  }
}

function clickCell(kind, i) {
  if (kind === 'tool') {
    // 工具墙 -> 拿回物品栏（耐久和材质跟着走）
    const c = S.tools[i];
    if (!c) return;
    const result=ITEM_CURSOR.quick(S,{type:'tool',slot:i},[{type:'bag',group:true}].concat(S.chests.map((_,box)=>({type:'chest',box,group:true}))));
    if(result.ok){transferTip(result,'取下工具');markInv();save();}else toastAt(null,'库存已满，工具保留在装备栏');
    return;
  }
  const c = S.inv[i];
  if (!c) return;
  if (isTool(c.k)) {
    // 工具 -> 挂到它那一类的槽位上；同类已经挂着的先换下来（优先进仓库）
    mountTool(c);
    return;
  }
}

/** 某个来源里这个东西有多少个。塞料时按它算"最多能塞几个"。 */
function countAt(src, k) {
  if (src === 'inv') return countIn(S.inv, k);
  if (typeof src === 'string' && src.indexOf('chest:') === 0) {
    const c = S.chests[+src.slice(6)];
    return c ? countIn(c.slots, k) : 0;
  }
  return have(k);
}

/** 往炉子的一格里塞料。一次尽量塞满一格（最多 64），省得一格一格点。
 *  换原料种类时，原来那格里的先退回库存。 */
function addToFurnace(f, i, k, src, kind,n) {
  const result=COMMANDS.loadFurnace(S,f,k,src,kind,furCap(f),n);
  result.k=k;transferTip(result,'填入');if(!result.ok)return;
  markDynamic(); markInv(); save();
  openFurnace(i);
}

/* --- 开始动作（选数量在界面上选，不弹浏览器窗口）--- */
function openPicker(type, id, name) {
  S.ui.pick = {
    type, id, name,
    n: type === 'explore' ? 4 : 16,
  };
  if(type==='explore')S.ui.pick.dim=S.ui.dim;
  S.ui.pick.n=Math.max(1,Math.min(S.ui.pick.n,pickerLimit(S.ui.pick)));
  markDynamic();
}

function pickerGo() {
  const p = S.ui.pick;
  if (!p||!ITEM_DRAG.returnHeld()) return;
  const available=pickerLimit(p);if(!available){toastAt(null,'没有可安排的剩余数量');return;}p.n=Math.max(1,Math.min(p.n,available));
  if (p.type === 'gather') {
    const source=ACTIVITIES.definitions[p.id];
    if(source?.cycleLimit||source?.repeatable===false){
      const gate=ACTIVITIES.available(S,source);
      if(!gate.ok){toastAt(null,({LOCATION:'先发现可挑战地点',SUPPLIES:'库存需要熟食',TOOL:'需要物品栏或工具墙中的近战工具或剑',DIMENSION:'先开通该维度入口'})[gate.code]||'条件未满足');return;}
    }
    const repeat=!!p.repeat&&p.id!=='village_search'&&ACTIVITIES.canRepeat(source);
    startAct({ type: 'gather', src: p.id, target: repeat?Number.MAX_SAFE_INTEGER:p.n, repeat, done: 0, prog: 0 });
  } else if(p.type==='mine'){const i=S.veins.findIndex(v=>v.id===p.id);if(i>=0)startMine(i,p.n);
  } else {
    if(!WORLD_DISCOVERY.startSurvey(S,p.dim,p.n))return;
    save();
  }
  S.ui.pick = null;
  markDynamic();
}

function startMine(i,quantity) {
  const v = S.veins[i];
  if (!v) return;
  if (v.left <= 0) { S.veins.splice(i, 1); markDynamic(); return; }
  quantity=Math.min(quantity||MINING.remaining(v),MINING.remaining(v));if(quantity<1){toastAt(null,'该矿脉的剩余矿种均已排除');return;}
  S.ui.pick = null;
  startAct({ type: 'mine', veinId:WORLD_DISCOVERY.veinId(S,v), vi: i, veinName: v.name, vein: v, prog: 0, done:0, target:quantity||v.left, vol:quantity||v.left });
}

/* ============================ 主循环 ============================ */

function invSig() {
  let s = '';
  for(const arr of ENTITIES.storage(S))for (const c of arr) s += c ? c.k + ':' + c.n + ',' : ',';
  return s;
}

let overflowCount=0;
COMMANDS.configure({onDiscard:(state,rows)=>{overflowCount+=rows.reduce((n,p)=>n+p.discarded,0);},createStack:(k,n)=>isTool(k)?Object.assign(newTool(k,null),{n:n}):{k:k,n:n}});
function reportOverflow(){if(!overflowCount)return;const n=overflowCount;overflowCount=0;toastAt(null,'库存已满，已丢弃 '+n+' 个物品');const last=S.msgs[0];if(last?.k==='物品丢失'&&Math.floor(S.env.elapsed||0)-last.t<60){last.n=(last.n||0)+n;last.s='库存已满，已丢弃 '+last.n+' 个物品';}else{S.msgs.unshift({t:Math.floor(S.env.elapsed||0),k:'物品丢失',n,s:'库存已满，已丢弃 '+n+' 个物品'});if(S.msgs.length>MSG_MAX)S.msgs.length=MSG_MAX;S.msgNew++;}markMsgs();}
function simulationPresentation(state,result){
  if(state!==S)return;
  let worldChanged=false;
  for(const effect of result.effects){
    const a=effect.action,tool=effect.item,event=effect.event;
    if(effect.type==='space-unlocked'){logMsg('航天',effect.text);toastAt(null,effect.text);markInv();markQuests();}
    else if(effect.type==='ae-order-completed'){const r=effect.target;logMsg('ME合成完成',(r.kind==='fluid'?FLUID_PRESENTATION.name(r.key):nameOf(r.key))+' ×'+r.amount.toLocaleString()+(r.kind==='fluid'?' mB':'')+' 已存入ME网络');}
    else if(effect.type==='world-updated')worldChanged=true;
    else if(effect.type==='gain'){markInv();if(!document.hidden)for(const p of effect.result.produced||[])gainTip(p.k,p.toBag,p.toWarehouse);}
    else if(effect.type==='empty-plunder'){if(!document.hidden)toastAt(null,'啥也没搜刮到');}
    else if(effect.type==='tool-broken')logMsg('工具',toolLabel(tool)+' 用坏了。');
    else if(effect.type==='tinker-tool'){
      if(event.leveled)logMsg('工具升级',toolLabel(tool)+' 升至 '+event.level+' 级'+(event.modifiers?'，获得 '+event.modifiers+' 个强化槽。':'。'));
      if(event.boosted)logMsg('工具提升',toolLabel(tool)+' 的采矿熟练度提升，挖掘等级 +1（现为 '+event.harvestLevel+'）。');
      if(event.broken)logMsg('工具损坏',toolLabel(tool)+' 已损坏，可在工具装配台修理。');
    }
    else if(effect.type==='action-finished')logMsg('动作完成',actName(a)+'，已完成 '+(a.done||0)+' 次'+(a.blocked==='CONTAINER'?'，没有可用空容器，已结束':''));
    else if(effect.type==='action-waiting')logMsg('动作等待',actName(a)+'：'+actFrac(a,0).txt);
  }
  if(worldChanged&&!document.hidden)WORLD_UI.refresh(S);
  if(result.changed)markDynamic();
}
FACTORY.observeSimulation(simulationPresentation);
function worldStep(state,simTick,dt){return WORLD_SIMULATION.step(state,simTick,dt);}
let simulationReady=false;
const onlineLoop=ONLINE_LOOP.create({advance:driveSimulation,pending:()=>FACTORY.hasPendingTicks(),reset:()=>FACTORY.resumeTiming(S),error:error=>console.error('Online worker unavailable; using page timer',error)});
function driveSimulation(){
  if(!simulationReady)return;
  FACTORY.tick(S,null,(window.performance&&performance.now)?performance.now():Date.now());
}
function tick(){
  const now=Date.now();if(!document.hidden){if(S.ui.page==='line'&&FACTORY.refreshOpen&&(Math.floor(now/500)!==Math.floor((window.__lastOpenRefresh||0)/500))){window.__lastOpenRefresh=now;try{FACTORY.refreshOpen(S,save);}catch(_){}}syncEnv();checkQuests(now);renderDyn();if(S.ui.page==='agri')FARM_UI.refresh(S,save);lastSim=performance.now();}
  if(Math.floor(now/1000)!==tick._s){tick._s=Math.floor(now/1000);save({skipUnchanged:true});}
}

/* 每 QUEST_POLL 秒扫一遍，看有没有新够条件的。
 * 只判断"够不够交"，不替玩家交 —— 交不交是他自己的事（也是一次手动动作）。
 * 结果没变就什么都不动，省得一直重画。 */
let qPollT = -1;
/* 库存没变就不用重算任务状态，省掉整轮扫描。 */
function questSignature() {
  var arrs = [ITEM_STORES.items(S,'quest')];
  var h = 0, n = 0;
  for (var a = 0; a < arrs.length; a++) {
    var list = arrs[a] || [];
    for (var i = 0; i < list.length; i++) {
      var s = list[i]; if (!s) continue;
      var k = s.k || '';
      for (var c = 0; c < k.length; c++) h = (h * 31 + k.charCodeAt(c)) >>> 0;
      h = (h * 31 + (s.n == null ? 1 : s.n)) >>> 0;
      n++;
    }
  }
  var done = Object.keys(S.qever || {}).length;
  return h + ':' + n + ':' + done + ':' + JSON.stringify(S.questChecks||{});
}
var qSignature = '';
function checkQuests(now) {
  if(now-qPollT<QUEST_POLL*1000)return;qPollT=now;
  var sig = questSignature();
  if (sig === qSignature) return;
  qSignature = sig;
  QUESTS.withSnapshot(S,()=>{QUESTS.observe(S);const overview=QUESTS.overview(S),next={};for(const q of GD.quests)if(overview.states[q.id].can)next[q.id]=1;
    const changed=JSON.stringify(next)!==JSON.stringify(qcan);qcan=next;
    const visible=!S.qfold.closed&&(!S.jei||S.jei.view==='quests');
    if(changed||visible){renderQuests(overview);dirty.quests=false;}else renderQBadge(overview.pending);
  });
}

/* 只负责"状态变了要重画哪一块"。进度条的宽度交给 rAF 平滑更新。 */
function renderDyn() {
  if(window.WORLD_SITES_UI)WORLD_SITES_UI.refresh();
  if(window.GRID_FURNACE)GRID_FURNACE.refresh();
  if(window.LINE_STORAGE_UI)LINE_STORAGE_UI.refresh();if(window.TRASH_SINKS_UI)TRASH_SINKS_UI.refresh();
  if(window.SHARED_CARGO_UI)SHARED_CARGO_UI.refresh();
  if(window.ITEM_FILTER_UI)ITEM_FILTER_UI.refresh();
  if(window.AE_UI)AE_UI.refresh();
  DROPPED_ITEMS.render(S);TRASH.refresh(S);MANUAL_WORKBENCH_UI.refresh();
  reportOverflow();
  if (dirty.dyn || dirty.slot) { if(S.ui.page==='world'){renderSlot(); renderWorldRight();}renderTop();
                                 dirty.dyn = dirty.slot = false; }
  if (dirty.list) { if(S.ui.page==='craft')renderList(); dirty.list = false; }
  if (dirty.inv) { renderInv();if(S.ui.page==='chest')renderChest();renderTop();dirty.inv = false;
                   dirty.detail = true; }   // 原料变了，配方排序和格子上的"有/缺"都得跟着变
  if (dirty.detail) { if(S.ui.page==='craft')renderDetail(); dirty.detail = false; }
  if (dirty.history) { if(S.ui.page==='craft')renderHistory(); dirty.history = false; }
  if (dirty.quests) { renderQuests(); dirty.quests = false; }
  if (dirty.msgs) { renderMsgs(); dirty.msgs = false; }
  refreshFurnace();
  WORLD_PANELS.refresh();
  TINKER_WORKSTATIONS_UI.refresh();
  SMELTERY_UI.refresh();
  TRAVEL_UI.refresh();
  SPACE_UI.refresh();
}

/* --- 平滑读条 ---
 * 模拟由在线调度器按50ms游戏tick结算，200ms回调只刷新界面与保存。
 * rAF只读取统一时钟的插值，不修改任何生产进度。 */
let lastSim = 0;
function raf() {
  const a = S.act;
  const extra = FACTORY.interpolationSeconds();

  if (a) {
    const f = actFrac(a, extra);
    const pct = (Math.max(0, Math.min(1, f.pct)) * 100).toFixed(2) + '%';
    const slotBar = $('#slot .slotrow .bar > i');
    if (slotBar) slotBar.style.width = pct;
    const slotTxt = $('#slot [data-p]');
    if (slotTxt) slotTxt.textContent = f.txt;
    const topBar = $('#topslot .bar > i');
    if (topBar) topBar.style.width = pct;
    const topTxt = $('#topslot .dim');
    if (topTxt) topTxt.textContent = f.txtS;
  }

  S.furs.forEach((fu, i) => {
    const p = FURNACES.state(fu).progress;
    const w = (p * 100).toFixed(2) + '%';
    // 世界里那一格下面的小进度条
    const cell = document.querySelector('[data-furbar="' + i + '"] > i');
    if (cell) cell.style.width = w;
    // 点开的那台炉子浮窗里的进度条
    const win = document.querySelector('[data-furwinbar="' + i + '"] > i');
    if (win) win.style.width = w;
  });

  requestAnimationFrame(raf);
}

/* ============================ 出错时别白屏 ============================ */
/* 万一有运行时错误，直接在屏幕底部显示出来，而不是让页面看起来"没反应"。 */
let errorDismissTimer=null,errorFadeTimer=null;
function showErr(msg, persistent) {
  if (!document.body) return;
  let d = document.getElementById('__err');
  if (!d) {
    d = document.createElement('div');
    d.id = '__err';
    d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:30000;' +
      'background:#3a1d1f;color:#ffd9d9;border-top:2px solid #e0656b;' +
      'padding:8px 42px 8px 12px;font:12px/1.5 monospace;white-space:pre-wrap;' +
      'max-height:25%;overflow:auto;transition:opacity .16s';
    d.dataset.itemControls='true';
    const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','关闭错误提示');close.style.cssText='position:absolute;right:9px;top:5px;background:transparent;border:0;color:inherit;font-size:22px;cursor:pointer';
    close.onclick=()=>{clearTimeout(errorDismissTimer);clearTimeout(errorFadeTimer);d.remove();};d.appendChild(close);
    const text=document.createElement('div');text.className='error-details';d.appendChild(text);
    d.addEventListener('pointerdown',e=>e.stopPropagation());d.addEventListener('click',e=>e.stopPropagation());
    document.body.appendChild(d);
  }
  const text=d.querySelector('.error-details');text.textContent=(text.textContent+'\n'+msg).trim().split('\n').slice(-12).join('\n');
  d.style.opacity='1';if(persistent)d.dataset.persistent='true';
  clearTimeout(errorDismissTimer);clearTimeout(errorFadeTimer);
  if(!d.dataset.persistent)errorDismissTimer=setTimeout(()=>{d.style.opacity='0';errorFadeTimer=setTimeout(()=>d.remove(),180);},10000);
}
window.addEventListener('error', e =>
  showErr((e.message || '未知错误') +
    (e.lineno ? '  →  game.js 第 ' + e.lineno + ' 行' : '')));
window.addEventListener('unhandledrejection', e =>
  showErr('Promise 出错：' + (e.reason && e.reason.message || e.reason)));

/* ============================ 启动 ============================ */

async function boot() {
  try {
    if(SAVE_SESSION&&!(await SAVE_SESSION.ready)){
      SAVE_SLOTS_UI.init({session:SAVE_SESSION,beforeSwitch:()=>true});
      showErr('此存档已在另一个页面打开。关闭那个页面后刷新，或在右上角切换存档。',true);return;
    }
    await boot0();
  } catch (e) {
    showErr('启动失败：' + (e && e.message) + '\n' + (e && e.stack || ''),true);
    throw e;
  } finally {
    document.documentElement.removeAttribute('data-game-loading');
  }
}

async function boot0() {
  SAVE_SLOTS_UI.init({session:SAVE_SESSION,beforeSwitch:()=>{if(loadFailure)return true;SPACE_UI.dismiss();closePopup();TRASH.dismiss();FACTORY.cancelPlace(S,save);ITEM_DRAG.returnHeld();return save();}});
  const had = loadSave();
  if (window.UI_STATE) { UI_STATE.register(); UI_STATE.restore(S); }
  if(loadFailure)throw Error('原存档加载失败，已保留且停止自动覆盖：'+loadFailure.message);
  FACTORY.ensure(S);
  FACTORY.configureTiming(S);
  // Bind JEI only after save loading has restored its state and developer policy.
  JEI.init(S,save);
  RECIPE_QUERY.setNavigator(request=>JEI.open(request));
  window.addEventListener('beforeunload', save);
  S.t = Date.now();
  lastSim = performance.now();
  // 存档里没记过摊开哪一章（新档，或者玩家从没点过），就自动摊到当前进度那一章
  if (S.qfold.open === undefined) S.qfold.open = defaultQChap();
  if (!had) {
    // 开局给一点点东西，免得第一秒无从下手
    invAdd('minecraft:log@0', 4);
  }
  // 暂时先白送一个箱子。等"部署"做出来了，这里就撤掉，改成自己造自己摆。
  if (!S.chests.length) {
    S.chests.push({ name: '箱子1', slots: new Array(CHEST_SLOTS).fill(null) });
  }
  applyZoom();
  APPEARANCE.init(S,save);
  // applyView builds the visible page. Other pages build their current content
  // on navigation, so startup does not construct all warehouse slots offscreen.
  applyView();
  renderInv();
  renderQuests();
  renderTop();
  DROPPED_ITEMS.init(S,save);
  TRASH.init(S,save);
  if(window.requestIdleCallback)window.requestIdleCallback(()=>prepareCraftCatalog());
  let preparing=true,suspended=false;
  window.addEventListener('pagehide',()=>{
    suspended=true;
    simulationReady=false;
    onlineLoop.stop();
    save();
  });
  window.addEventListener('pageshow',e=>{if(e.persisted){suspended=false;if(!preparing){setDeveloperTiming({});simulationReady=true;onlineLoop.start();}}});
  document.addEventListener('freeze',()=>{suspended=true;simulationReady=false;onlineLoop.stop();save();});
  document.addEventListener('resume',()=>{suspended=false;if(!preparing){simulationReady=true;onlineLoop.start();}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){onlineLoop.resync();markDynamic();markInv();WORLD_UI.refresh(S);tick();}});
  await SIMULATION.prepareLoadedRecipes(S,yieldCatalogWork);
  preparing=false;
  if(!suspended){simulationReady=true;onlineLoop.start();}
  setInterval(tick,200);
  requestAnimationFrame(raf);
  if (/[?&]kit\b/.test(String(location.search||'')))setTimeout(()=>{runCmd('kit');S.ui.page='chest';applyView();save();},400);
}
boot();

/* ============================ 悬停提示 ============================
 * 浏览器自带的那种 title 要悬停一秒才冒出来，物品格里根本等不起。
 * 这里统一接管：把 title 收走，换成自己画的小框，鼠标一搭上就出来。 */
(function tooltips() {
  if (typeof document === 'undefined') return;
  var box = null, timer = 0, cur = null, px = 0, py = 0;
  var changes = new MutationObserver(function () {
    if (!cur || !cur.isConnected) { hide(); return; }
    if (box && !box.hidden) show(cur);
  });

  function ensure() {
    if (!box) {
      box = document.createElement('div');
      box.className = 'tip';
      box.hidden = true;
      (document.documentElement || document.body).appendChild(box);
    }
    return box;
  }

  function hide() {
    changes.disconnect();
    clearTimeout(timer);
    timer = 0;
    cur = null;
    if (box) box.hidden = true;
  }


  function place(el) {
    var b = ensure();
    var z = uiZoom();
    var vw = (document.documentElement.clientWidth || window.innerWidth || 1280) / z;
    var vh = (document.documentElement.clientHeight || window.innerHeight || 900) / z;
    var w = b.offsetWidth, h = b.offsetHeight;
    var x, y;
    if (el && el.getBoundingClientRect) {
      // 贴着物品右边、垂直居中
      var r = el.getBoundingClientRect();
      x = r.right / z + 6;
      y = r.top / z + r.height / z / 2 - h / 2;
    } else {
      x = px / z + 12;
      y = py / z - h / 2;
    }
    if (x + w > vw - 4) x = x - w - 12;          // 右边放不下就翻到左边
    if (y < 4) y = 4;
    if (y + h > vh - 4) y = vh - h - 4;
    b.style.left = Math.max(2, x) + 'px';
    b.style.top = Math.max(2, y) + 'px';
  }

  function show(el) {
    var s = el.getAttribute('title');
    if (s != null) {
      el.setAttribute('data-tip', s);        // 收走 title，原生提示就不会再来插一脚
      el.removeAttribute('title');
    } else s = el.getAttribute('data-tip');
    // 终端库存槽位只有 data-transfer-ref 时，照样给出名字提示
    if (!s) {
      var raw = el.getAttribute('data-transfer-ref');
      if (raw) {
        try {
          var ref = JSON.parse(raw), res = ref && (ref.resource || ref.stack || ref.target);
          var key = res && (res.key || res.k);
          if (key) s = (typeof nameOf === 'function' ? nameOf(key) : key) + (res.amount || res.n ? '，' + (res.amount || res.n) : '');
        } catch (e) {}
      }
    }
    if (!s) { if (box) box.hidden = true; return; }
    var b = ensure();
    // 机器顺手把正面贴图也摆出来（透视看形状，正面看面板）
    var target=window.RECIPE_KEYS&&RECIPE_KEYS.target(el,S),key=target&&target.target==='item'?target.key:el.getAttribute('data-item'),face=key&&!FRONT_FACES.isometric(key)&&GD.faceIcons&&GD.faceIcons[key],extra=key&&window.ITEM_DESCRIPTIONS?ITEM_DESCRIPTIONS.get(key):'',machineCard=el.closest('.fx-m[data-uid]'),machine=machineCard&&ENTITIES.get(S,machineCard.dataset.uid);
    var slotNode=window.ITEM_DRAG&&el.closest(ITEM_DRAG.selector),slotRef=slotNode&&ITEM_DRAG.ref(slotNode),slotEndpoint=slotRef&&ITEM_TRANSFER.endpoint(S,slotRef),stackDescription=slotEndpoint&&slotEndpoint.get&&ITEM_DESCRIPTIONS.stack(slotEndpoint.get());if(stackDescription)extra+=(extra?'\n':'')+stackDescription;
    if(machine&&machine.note){if(s.endsWith('\n'+machine.note))s=s.slice(0,-machine.note.length-1);extra+=(extra?'\n':'')+machine.note;}
    b.innerHTML=(face?'<img class="tipface" src="'+face+'" alt="">':'')+'<span class="tip-content"><span>'+esc(s).replace(/\n/g,'<br>')+'</span>'+(extra?'<small>'+esc(extra).replace(/\n/g,'<br>')+'</small>':'')+'</span>';
    b.hidden = false;
    place(el);
  }

  function owner(node){if(!node||!node.closest)return null;var cell=node.closest('[data-cell="inv"],[data-cell="tool"],[data-cslot],[data-workbench-slot],[data-workbench-result]');return cell&&(cell.hasAttribute('data-tip')||cell.hasAttribute('title'))?cell:node.closest('[title],[data-tip]');}
  document.addEventListener('mouseover', function (e) {
    var t = e.target;
    var el = owner(t);
    if (el === cur) return;
    hide();
    if (!el || !(el.getAttribute('data-tip') || el.getAttribute('title'))) return;
    px = e.pageX != null ? e.pageX : e.clientX;
    py = e.pageY != null ? e.pageY : e.clientY;
    cur = el;
    changes.observe(el, {attributes:true, attributeFilter:['data-tip','title','data-item']});
    timer = setTimeout(function () { if (cur === el) show(el); }, 40);
  }, true);

  document.addEventListener('mouseout', function (e) {
    var el = owner(e.target);
    var next=owner(e.relatedTarget);
    if(el&&el===next)return;
    if (el && el === cur) hide();
  }, true);

  document.addEventListener('mousedown', hide, true);
  document.addEventListener('scroll', hide, true);
  window.addEventListener('blur', hide);
})();

document.getElementById('save-error').addEventListener('click',()=>{if(save())toastAt(null,'存档已保存');});
