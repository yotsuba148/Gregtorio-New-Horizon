(function(root){
 'use strict';
 const TOOL_D=GD.tools;
 function toolType(k){return CRAFT_TOOLS.type(k);}
function toolSpec(k, mat) {
  const item=CONTENT.item(k),nbt=item&&item.nbt||'';
  if(toolType(k)==='sword'){
    const properties=NATIVE_RULES.properties(k);
    if(properties&&properties.maxDamage>0)return{mat:mat||TOOL_D.fixed[CONTENT.baseKey(k)]||'铁',dmax:properties.maxDamage,spd:1};
  }
  const nativeRule=GD.toolRules[CONTENT.baseKey(k)];
  if(nativeRule&&nativeRule.maxUses)return{mat:'木',dmax:nativeRule.maxUses,spd:1};
  const primary=String(nbt).match(/PrimaryMaterial:"([^"]+)"/);
  const damage=String(nbt).match(/MaxDamage:(\d+)/);
  const fixed = TOOL_D.fixed[CONTENT.baseKey(k)];
  if(damage)return{mat:mat||(primary?primary[1]:fixed)||'铁',dmax:+damage[1]/((GD.toolRules[CONTENT.baseKey(k)]||{}).durabilityScale||100),spd:3};
  const name = mat || fixed || '铁';
  // 材质表是 [上限, 速度] 两元组；老版本生成的 def 是 ["铁", 上限, 速度] 三元组，
  // 一律按 [0]=上限 读会把它读成字符串，扣耐久时变成 NaN（工具不变或直接消失），
  // 所以这里按形状认，谁在第一位都认得出。速度也一起兜住，别让 spd=64 把采集提速 20 倍。
  const norm = (row) => {
    if (!Array.isArray(row)) return [64, 3];
    const nums = row.filter(v => typeof v === 'number' && isFinite(v));
    const last = nums.length ? nums[nums.length - 1] : 3;
    const first = nums.length ? nums[0] : 64;
    return [first, last];
  };
  const row = norm(TOOL_D.mats[name] || TOOL_D.def || [64, 3]);
  let dmax = row[0], spd = row[1];
  let show = name;
  if (fixed === '一次性') { dmax = 1; spd = 2; show = '一次性'; }
  return { mat: show, dmax: dmax, spd: spd };
}

function isPermanentTool(k){return !!(GD.toolRules[CONTENT.baseKey(k)]||{}).unbreakable;}
function newTool(k, mat) {
  if(isPermanentTool(k))return{k:k,mat:'木',spd:1};
  if(typeof TINKER_TOOLS!=='undefined'&&TINKER_TOOLS.isTool(k)){const t={k:k,n:1};if(TINKER_TOOLS.init(t))return t;}
  const s = toolSpec(k, mat);
  return { k: k, mat: s.mat, dur: s.dmax, dmax: s.dmax, spd: s.spd };
}

function fixTool(t) {
  if (!t || !t.k) return t;
  if(isPermanentTool(t.k)){delete t.dur;delete t.dmax;t.spd=1;return t;}
  if(typeof TINKER_TOOLS!=='undefined'&&TINKER_TOOLS.isTool(t.k)&&TINKER_TOOLS.init(t))return t;
  const num = v => (typeof v === 'number' && isFinite(v) ? v : null);
  const badMax = num(t.dmax) === null || t.dmax <= 0;
  const badSpd = num(t.spd) === null || t.spd <= 0 || t.spd > 20;
  if (badMax || badSpd) {
    const s = toolSpec(t.k, typeof t.mat === 'string' ? t.mat : null);
    t.mat = s.mat;
    t.dmax = s.dmax;
    t.spd = s.spd;
  }
  const d = num(t.dur);
  t.dur = d === null ? t.dmax : d;
  if (t.dur > t.dmax) t.dur = t.dmax;
  if (t.dur < 0) t.dur = 0;
  return t;
}

function findTool(S,typeIds) {
  const want = {};
  for (const t of typeIds) want[t] = 1;
  let best = null;
  for (const c of S.inv) {
    if (!c || !c.k || !want[toolType(c.k)]) continue;
    if(typeof TINKER_TOOLS!=='undefined'&&TINKER_TOOLS.isTool(c.k)){const info=TINKER_TOOLS.info(c);if(!info||info.broken)continue;}else if(c.dur!=null&&c.dur<=0)continue;
    const d = c.dur == null ? 99999 : c.dur;
    if (!best || d < best.dur) best = { k: c.k, inst: c, where: 'inv', dur: d };
  }
  if (best) return best;
  for (const id in S.tools) {
    const c = S.tools[id];
    if (!c || !c.k || !want[toolType(c.k)]) continue;
    if(typeof TINKER_TOOLS!=='undefined'&&TINKER_TOOLS.isTool(c.k)){const info=TINKER_TOOLS.info(c);if(!info||info.broken)continue;}else if(c.dur!=null&&c.dur<=0)continue;
    return { k: c.k, inst: c, where: 'tool', dur: c.dur };
  }
  return null;
}

function bestTool(S,typeIds) {
  let best = null;
  for (const id in S.tools) {
    const c = S.tools[id];
    if (!c || !c.k || typeIds.indexOf(toolType(c.k)) < 0) continue;
    if (!WORK_TIME.usable(c)) continue;
    if (!best || (c.spd || 1) > (best.spd || 1)) best = c;
  }
  // 物品栏里的也算数，不然工具不挂上去就没速度，太别扭
  for (const c of S.inv) {
    if (!c || !c.k || typeIds.indexOf(toolType(c.k)) < 0) continue;
    if (!WORK_TIME.usable(c)) continue;
    if (!best || (c.spd || 1) > (best.spd || 1)) best = c;
  }
  return best;
}

function wearTool(S,p) {
  const t = p && p.inst;
  if (!t) return;
  if(typeof TINKER_TOOLS!=='undefined'&&TINKER_TOOLS.isTool(t.k)){const r=TINKER_TOOLS.mine(t,false,S);return Object.assign({changed:true,item:t},r);}
  if(TOOL_WEAR.preserved(S))return;
  fixTool(t);                        // 老存档 / 被坏数据写过的工具，先修回数字
  if (typeof t.dur !== 'number' || !isFinite(t.dur)) t.dur = t.dmax || 64;
  t.dur -= 1;
  if (t.dur > 0) return {changed:true,broken:false,item:t};
  if (p.where === 'tool') {
    for (const id in S.tools) if (S.tools[id] === t) delete S.tools[id];
  } else {
    const i = S.inv.indexOf(t);
    if (i >= 0) S.inv[i] = null;
  }
  return {changed:true,broken:true,item:GTTransactions.clone(t)};
}
root.PLAYER_TOOLS={spec:toolSpec,create:newTool,normalize:fixTool,find:findTool,best:bestTool,wear:wearTool};
})(typeof window!=='undefined'?window:globalThis);
