/* 核反应堆：固定 40 棒 + 14 冷却单元，燃耗按秒结算，电力逐 tick 交给动力仓。 */
(function (root) {
  'use strict';

  function data() { return (root.GD && GD.reactor) || { layout: [], fuels: [], rods: 40, coolants: 14 }; }

  function fuel(mode) {
    var list = data().fuels || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === mode) return list[i];
    return list[0] || null;
  }

  function ensure(m) {
    if (!m.reactor) m.reactor = {};
    var r = m.reactor;
    if (!r.mode) r.mode = (data().fuels[0] || {}).id || 'thorium';
    if (!Array.isArray(r.cells) || r.cells.length !== data().coolants) r.cells = new Array(data().coolants).fill(null);
    if (!Array.isArray(r.rods) || r.rods.length !== data().rods) r.rods = new Array(data().rods).fill(null);
    if (r.clock == null) r.clock = 0;
    if(!r.loadedMode&&(r.rods.some(function(x){return x!=null;})||r.cells.some(function(x){return x!=null;})))r.loadedMode=r.mode;
    return r;
  }

  function take(arr, key) {
    if (!arr) return -1;
    for (var i = 0; i < arr.length; i++) {
      var s = arr[i];
      if (s && s.k === key && (s.n || 1) > 0) return i;
    }
    return -1;
  }

  function pull(m, key, from) {
    var i = take(from, key);
    if (i < 0) return false;
    var s = from[i];
    if (s.n == null || s.n <= 1) from[i] = null;
    else s.n -= 1;
    return GTTransactions.clone(s);
  }

  function coolantProduct(key) {
    var product = data().coolantProducts?.[key];
    return product ? { k: product.k, n: product.n } : { k: 'IC2:itemCellEmpty@10', n: 1 };
  }

  function outputItem(m, box, k, n = 1) {
    if ((n === 1 || CORE.roomFor(box, k) >= n) && CORE.insert(box, k, n) === n) return true;
    m.status = { code: 'OUTPUT', text: '输出受阻' };
    return false;
  }

  function outputPower(m,f){
    var d=data(),chambers=(m.structure&&m.structure.fixedParts||[]).reduce(function(n,p){return n+(p.k==='IC2:blockReactorChamber@0'?p.n:0);},0);
    return Math.round(f.euPerTick*(chambers?chambers/(d.baseChambers||6):1)*(d.welfareMultiplier||1));
  }
  function burnSecond(m,r,f){
    // 冷却单元：先检查是否齐全
    var needCells = r.cells.filter(function (v) { return v != null; }).length;
    for (var c = r.cells.length - 1; c >= 0; c--) {
      if (r.cells[c] != null) continue;
      var cell=pull(m,f.coolant,m.ins);
      if (cell){r.loadedMode=f.id;r.cells[c]=cell.dmg||0;}
      else { needCells = -1; break; }
    }
    if (needCells < 0) { m.status = { code: 'COOLANT', text: '缺冷却单元' }; return false; }

    // 燃料棒
    for (var i = 0; i < r.rods.length; i++) {
      if (r.rods[i] != null) continue;
      var rod=pull(m,f.rod,m.ins);
      if(rod){r.loadedMode=f.id;r.rods[i]=(rod.dmg||0)/ITEM_DURABILITY.max(f.rod);}
      else { m.status = { code: 'FUEL', text: '缺燃料棒' }; return false; }
    }

    var limit=ITEM_DURABILITY.max(f.coolant),product=coolantProduct(f.coolant);
    if(r.rods.some(function(v){return v>=1;})||r.cells.some(function(v){return v>=limit;})) {
      var existing=CORE.slotBox(m.outs);
      for(var ri=0;ri<r.rods.length;ri++)if(r.rods[ri]>=1){
        if(!outputItem(m,existing,ITEM_DURABILITY.spent(f.rod)))return false;
        r.rods[ri]=null;
      }
      for(var ci=0;ci<r.cells.length;ci++)if(r.cells[ci]>=limit){
        if(!outputItem(m,existing,product.k,product.n))return false;
        r.cells[ci]=null;
      }
      m.status={code:'FUEL',text:'等待补充燃料与冷却单元'};return false;
    }

    var nextCells=r.cells.slice(),nextRods=r.rods.slice(),outputs=GTTransactions.clone(m.outs),perCell=(f.heatPerSecond||0)/r.cells.length;
    var box=CORE.slotBox(outputs);
    for(var k=0;k<nextCells.length;k++)if(nextCells[k]!=null){
      nextCells[k]+=perCell;
      if(nextCells[k]>=limit){
        if(!outputItem(m,box,product.k,product.n))return false;
        nextCells[k]=null;
      }
    }
    for(var j=0;j<nextRods.length;j++)if(nextRods[j]!=null){
      nextRods[j]+=1/ITEM_DURABILITY.max(f.rod);
      if(nextRods[j]>=1){
        if(!outputItem(m,box,ITEM_DURABILITY.spent(f.rod)))return false;
        nextRods[j]=null;
      }
    }
    r.cells=nextCells;r.rods=nextRods;m.outs=outputs;
    return true;
  }
  function tick(m){
    var r=ensure(m),f=fuel(r.loadedMode||r.mode);if(!f)return false;
    if(!(m.structure&&m.structure.formed)){m.status={code:'STRUCTURE',text:'结构不完整'};return false;}
    var period=20;r.clock=Math.min(period,(r.clock||0)+1);
    if(!(r.outputTicks>0)&&r.clock>=period){
      if(!burnSecond(m,r,f)){r.clock=period-1;return false;}
      r.clock=0;r.outputTicks=period;r.outputPower=outputPower(m,f);
    }
    if(!(r.outputTicks>0))return false;
    var made=MULTIBLOCK_POWER.offer(m,r.outputPower);m.euMade=(m.euMade||0)+made;r.outputTicks--;
    m.status={code:'RUNNING',text:'运行中'};return true;
  }

  function signature(m) {
    var r = ensure(m), d = data();
    return [r.mode, (r.cells || []).length, (r.cells || []).filter(function (v) { return v != null; }).length,
      (r.rods || []).filter(function (v) { return v != null; }).length,
      Math.floor(m.eu || 0), m.status && m.status.code].join('|');
  }

  function mount(host, m, S, save) {
    if (root.REACTOR_UI && REACTOR_UI.mountPanel) REACTOR_UI.mountPanel(host, m, S, save);
  }

  function acceptsItem(m, k) {
    var d = data();
    return (d.fuels || []).some(function (f) { return f.rod === k || f.coolant === k; });
  }

  function components(m){
    var r=ensure(m),f=fuel(r.loadedMode||r.mode),limit=ITEM_DURABILITY.max(f.coolant);
    var rods=r.rods.filter(function(v){return v!=null;}).map(function(v){
      return v>=1?{k:ITEM_DURABILITY.spent(f.rod),n:1}:{k:f.rod,n:1,dmg:v*ITEM_DURABILITY.max(f.rod)};
    });
    return rods.concat(r.cells.filter(function(v){return v!=null;}).map(function(v){
      return v>=limit?coolantProduct(f.coolant):{k:f.coolant,n:1,dmg:v};
    }));
  }
  function setMode(m,mode){var r=ensure(m);if(!data().fuels.some(function(f){return f.id===mode;})||components(m).length)return false;r.mode=mode;delete r.loadedMode;return true;}
  function clearComponents(m){var r=ensure(m);r.rods.fill(null);r.cells.fill(null);r.clock=0;r.outputTicks=0;r.outputPower=0;delete r.loadedMode;}
  function unload(S,m){var r=ensure(m),all=components(m),result=COMMANDS.returnItems(S,all,{drops:true});if(!result.ok)return result;clearComponents(m);return result;}
  ITEM_STORES.registerEntity('reactor-components',function(S,m){if((DEFS.of(m.k)||{}).behavior!=='gt_ic2_reactor')return;return {views:[ITEM_STORES.view(m.uid+':reactor-components',m.reactor,components(m),{clear:function(){clearComponents(m);}})]};});
  root.REACTOR={outputPower:outputPower,ensure:ensure,components:components,setMode:setMode,unload:unload,fuel:fuel};
  root.ENGINE.registerBehavior('gt_ic2_reactor', { ensure: ensure, tick: tick, mount: mount, acceptsItem: acceptsItem, signature: signature });
})(typeof window !== 'undefined' ? window : globalThis);
