/* EX 虚空矿机。原版依据 Bartworks 的 MTEVoidMinerBase：
   - 按维度矿池权重抽矿，名单来自输入总线里的矿石（空总线 = 全放行，螺丝刀切白/黑名单）
   - 惰性气体增值：氖 ×4、氪 ×8、氙 ×16、奥格涅松 ×64，每秒 2L
   - 剪线钳开批量模式：16 倍时间、16 倍产量；不在白名单或落在黑名单的矿石直接销毁
   本作产出粗矿（一块矿石折两份），名单里的矿石方块会归一成对应粗矿再比较。 */
(function(root){
 'use strict';
 var CYCLE_TICKS = 10;
 var BATCH_MULTIPLIER = 16;
 var RAW_PER_ORE = 2;
 var GAS_MULTIPLIER = {neon: 4, krypton: 8, xenon: 16, oganesson: 64};
 var GAS_PER_CYCLE = 1;          // 2L/s，10 tick 一个周期即 1 mB

 // 原版 VMLV/VMHV/VMIV 的 TIER_MULTIPLIER 分别是 4/8/16，对应 LV/HV/IV
 function tierMultiplier(m){
  var d = root.DEFS && root.DEFS.of(m.k);
  if(!d || d.tier == null) return 4;
  return Math.max(1, Math.pow(2, (d.tier - 1) / 2 + 2));
 }

 // 维度矿脉统一向 DIMENSIONS 索取：旧维度读 data/veins.js，星球读 data/planet-veins.js。
 // 原版把主矿、次矿按权重、夹层与散布按 1/8 汇成一个池子抽，而不是固定抽主矿。
 var SLOT_WEIGHT = {primary: 1, secondary: 1, between: 1 / 8, sporadic: 1 / 8},orePools=new Map();
 function orePool(dim){
  if(orePools.has(dim))return orePools.get(dim);
  var entries=[],total=0;
  DIMENSIONS.veins(dim).forEach(function(v){
   (v.ores || []).forEach(function(o){
    total+=(v.weight || 1)*(SLOT_WEIGHT[o.slot || 'primary'] || 1);
    entries.push({vein:v,ore:o,cumulative:total});
   });
  });
  var pool={entries:entries,total:total};orePools.set(dim,pool);return pool;
 }
 function pickOre(pool,roll){
  var target=roll*pool.total;
  return pool.entries.find(function(p){return target<=p.cumulative;})||pool.entries[pool.entries.length-1];
 }

 // 名单身份：矿石方块、粗矿、其他模组同种矿石（比如原版铁矿）都归一成材料名，
 // 这样玩家按 GTNH 习惯往总线里塞矿石方块也认。不是矿石的东西不参与名单。
 var materialMap = null, reverseRaw = null;
 function materialIndex(){
  if(materialMap) return materialMap;
  materialMap = {}; reverseRaw = {};
  var data = root.CONTENT && root.CONTENT.data;
  if(!data) return materialMap;
  var skip = /^ore(Normal|Rich|Dense|Poor|Small|Gem|Netherrack|Nether|Endstone|End|Marble|Basalt|Blackgranite|Redgranite|Sand|Gravel|Raw)/;
  Object.keys(data.ore || {}).forEach(function(group){
   if(group.indexOf('ore') !== 0 || skip.test(group)) return;
   var material = 'mat:' + group.slice(3);
   (data.ore[group] || []).forEach(function(idx){
    var item = data.items[idx];
    if(item && !materialMap[item.k]) materialMap[item.k] = material;
   });
  });
  var rawMap = (root.GD && root.GD.rawOres) || {};
  Object.keys(rawMap).forEach(function(block){
   var raw = rawMap[block], prior = reverseRaw[raw];
   if(!prior || (!materialMap[prior] && materialMap[block])) reverseRaw[raw] = block;
  });
  return materialMap;
 }
 function identityOf(key){
  var map = materialIndex();
  var rawMap = (root.GD && root.GD.rawOres) || {};
  if(map[key]) return map[key];
  if(rawMap[key]) return map[rawMap[key]] || rawMap[key];
  if(reverseRaw && reverseRaw[key]) return map[reverseRaw[key]] || key;
  return key;
 }
 function isOre(key){
  if(materialIndex()[key]) return true;
  var rawMap = (root.GD && root.GD.rawOres) || {};
  if(rawMap[key]) return true;
  if(reverseRaw && reverseRaw[key]) return true;
  if(/blockores/.test(key)) return true;
  var item = root.CONTENT && root.CONTENT.item && root.CONTENT.item(key);
  return !!item && /(矿石|矿| Ore)$/.test(item.name || '');
 }
 // 总线里的矿石也算名单：多方块的输入总线是独立端口。
 function stacks(m){
  var out = [];
  function add(stack){ if(stack && stack.k) out.push(stack); }
  (m.ins || []).forEach(add);
  var st = m.structure;
  if(st && st.ports) st.ports.forEach(function(p){
   var spec = root.MULTIBLOCKS && MULTIBLOCKS.spec && MULTIBLOCKS.spec(p.k);
   if(spec && !spec.itemIn) return;   // 只读输入总线；输出总线里的产物不能当名单，否则会自我循环
   (p.items || []).forEach(add);
  });
  return out;
 }
 function allowList(m){
  var out = [];
  stacks(m).forEach(function(stack){
   if(!isOre(stack.k)) return;
   var id = identityOf(stack.k);
   if(out.indexOf(id) < 0) out.push(id);
  });
  return out;
 }
 function allowed(m, oreKey){
  var list = allowList(m);
  if(!list.length) return true;              // 空名单全放行，与原版一致
  var hit = list.indexOf(identityOf(oreKey)) >= 0;
  return m.voidBlacklist ? !hit : hit;
 }

 function gasTank(m){
  var tanks = m.tanksIn || [];
  for(var i = 0; i < tanks.length; i++){
   var t = tanks[i];
   if(!t || !GAS_MULTIPLIER[t.f] || (t.mb || 0) < GAS_PER_CYCLE) continue;
   return t;
  }
  return null;
 }

 function dimOpen(state, dim){
  if(!root.DIMENSIONS || !state) return true;
  return DIMENSIONS.open(state, dim);
 }

 function nextRandom(m){
  m.voidSeed = (((m.voidSeed || 2463534242) * 1103515245) + 12345) >>> 0;
  return m.voidSeed / 4294967296;
 }

 function tick(m, context){
  var def = context.definition;
  // 多方块没搭好不产矿，跟其他多方块一致。
  if(def.requiresStructure && !(m.structure && m.structure.formed)) return false;

  var dim = source(m);
  var state = context.state || (root.ENGINE && root.ENGINE.state);
  if(!dimOpen(state, dim)){
   m.status = {code: 'SOURCE', text: '先开通这个世界'};
   return false;
  }
  var pool=orePool(dim);
  if(!pool.total){
   m.status={code:'SOURCE',text:'当地没有矿脉'};
   return false;
  }

  // 持续耗电：原版每 tick 消耗该等级电压。
  var cost = def.volt || 32;
  if(!Number.isFinite(m.eu)) m.eu = 0;
  if(m.eu < cost){
   m.status = {code: 'ENERGY', text: '缺电'};
   return false;
  }
  m.eu = m.eu - cost;
  m.voidSpent = (m.voidSpent || 0) + cost;

  var cycle = m.voidBatch ? CYCLE_TICKS * BATCH_MULTIPLIER : CYCLE_TICKS;
  var fast = root.GAME_TIME && GAME_TIME.oneTick(state);
  m.voidProgress = fast ? cycle : (m.voidProgress || 0) + 1;
  if(m.voidProgress < cycle){
   if(!m.status || m.status.code !== 'MINING') m.status = {code: 'MINING', text: '虚空采矿中'};
   return true;
  }
  m.voidProgress = 0;

  var requiredGas=GAS_PER_CYCLE*(cycle/CYCLE_TICKS),gas=gasTank(m);
  if(gas&&gas.mb<requiredGas)gas=null;
  var multiplier = tierMultiplier(m) * (gas ? GAS_MULTIPLIER[gas.f] : 1) * (m.voidBatch ? BATCH_MULTIPLIER : 1);

  var picked = pickOre(pool, nextRandom(m));
  if(!picked) return false;
  var vein = picked.vein, ore = picked.ore;
  // 气体按 2L/s 折算到本周期长度，批量模式不能白嫖
  if(gas)gas.mb-=requiredGas;

  // 名单不通过：原版直接销毁，这里同样不产出、不返还。
  if(!allowed(m, ore.key)){
   m.status = {code: 'BLOCKED', text: '名单外的矿石已销毁'};
   m.voidVoided = (m.voidVoided || 0) + 1;
   return true;
  }

  var raw = (root.GD && root.GD.rawOres) ? root.GD.rawOres[ore.key] : null;
  var id = vein.enum || vein.variable || (dim + ':' + ore.key);
  m.job = {
   recipeId: 'void:' + id,
   recipe: { id: 'void:' + id },
   durationTicks: cycle,
   progressTicks: cycle,
   EUt: 0,
   outputs: [raw ? { k: raw, n: multiplier * RAW_PER_ORE } : { k: ore.key, n: multiplier }],
   fluidOutputs: []
  };
  m.status = {code: 'MINING', text: '虚空采矿中'};
  return root.ENGINE.batch.finish(m, context.world);
 }

 function gasName(id){
  return ({neon: '氖', krypton: '氪', xenon: '氙', oganesson: '奥格涅松'})[id] || id;
 }

 // 浮窗里的设置：只写机器自己身上的字段，界面与逻辑都留在本模块。
 var source=ENTITIES.dimension;

 function mount(host, m, S, save){
  if(!host) return;
  var dim = source(m);
  var list = allowList(m), gas = gasTank(m);
  host.innerHTML =
   '<div class="void-panel">'
   + '<div class="void-row"><span>矿源 · '+DIMENSIONS.name(dim)+'</span>'
   + '<button class="btn" data-void-mode aria-pressed="' + (m.voidBlacklist ? 'true' : 'false') + '">' + (m.voidBlacklist ? '黑名单' : '白名单') + '</button>'
   + '<label class="void-batch"><input type="checkbox" data-void-batch' + (m.voidBatch ? ' checked' : '') + '>批处理</label></div>'
   + '<p class="void-note">把矿石放进输入总线就是名单，空着不过滤（矿石方块和粗矿都认）。'
   + (list.length ? '当前 ' + list.length + ' 种。' : '当前不过滤。')
   + (gas ? '气体：' + gasName(gas.f) + ' ×' + GAS_MULTIPLIER[gas.f] + '。' : '')
   + '</p></div>';
  var mode = host.querySelector('[data-void-mode]');
  if(mode) mode.onclick = function(){
   m.voidBlacklist = !m.voidBlacklist;
   mode.textContent = m.voidBlacklist ? '黑名单' : '白名单';
   mode.setAttribute('aria-pressed', m.voidBlacklist ? 'true' : 'false');
   if(save) save();
  };
  var batch = host.querySelector('[data-void-batch]');
  if(batch) batch.onchange = function(){ m.voidBatch = !!batch.checked; if(save) save(); };
 }

 root.ENGINE.registerBehavior('void_miner', {
  tick: tick,
  mount: mount,
  allowList: allowList,
  status: function(m, d, make){
   var s = m.status || {};
   if(s.code === 'ENERGY') return make('power', m, '缺电');
   if(s.code === 'SOURCE') return make('source', m, s.text);
   if(s.code === 'BLOCKED') return make('mining', m, '名单外的矿石已销毁');
   if(!dimOpen(root.ENGINE && root.ENGINE.state, source(m))) return make('source', m, '先开通这个世界');
   if((m.eu || 0) < (d.volt || 32)) return make('power', m, '缺电');
   return make('mining', m, '虚空采矿中');
  }
 });
})(typeof window !== 'undefined' ? window : globalThis);
