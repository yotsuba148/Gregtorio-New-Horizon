(function (root) {
  'use strict';
  const layers=[['soil','种植土'],['bottom','底土']];
  const actions=[
    ['water','浇水','也可拿着水桶或水单元左键点地块'],['fertilizer','施肥','也可拿着肥料左键点地块'],['weed','除草'],
    ['analyze','鉴定'],['seed','拔下取种','拔下作物，有概率取回种子'],['rack','收回作物架']
  ];
  const messages={
    RACK:'作物架只能叠放两层，长有作物时请先拔下作物',
    FARM:'这种作物需要种在工业农场',
    SOIL:'请选择适合当前作物的种植土',
    PLANT_ITEM:'请拿着可种植的种子或树苗',
    PLANT_WEEDS:'请先除草',
    PLANT_OCCUPIED:'请先拔下现有作物',
    PLANT_RACK:'种植需要单层作物架',
    CARE_RACK:'先放置作物架',
    WATER_FULL:'这块地水分已满',
    FERTILIZER_FULL:'这块地肥料已足',
    SEED:'这里没有可处理的作物',
    GROWTH:'作物尚未成熟',
    INPUT:'物品栏和仓库里的材料不足',
    OUTPUT:'物品栏和仓库已满',
    PLOT:'当前地块不能执行这项操作',
    LENS:'需要植物透镜'
  };
  const plotHTML=({x,y},i)=>'<button class="gn-plot" type="button" data-plot="'+i+'" style="--plot-column:'+(x+1)+';--plot-row:'+(y+1)+'" aria-pressed="false"><span class="gn-bed"><span class="gn-rack-icon" hidden></span><img class="gn-sprite" alt="" hidden></span><b class="gn-plot-name"></b></button>';
  const layerHTML=([id,label])=>'<label class="gn-layer"><span>'+label+'</span><select data-layer="'+id+'" data-item-controls></select></label>';
  const actionHTML=([id,label,tip])=>'<button type="button" class="gn-action" data-action="'+id+'"'+(tip?' data-tip="'+tip+'"':'')+'>'+label+'</button>';

  function setText(node,value) {
    if (node.textContent!==value) node.textContent=value;
  }
  function setAttr(node,name,value) {
    value=String(value);
    if (node.getAttribute(name)!==value) node.setAttribute(name,value);
  }
  function soilKind(key) {
    return key?.includes('farmland')?'farmland':key?.includes('sand')?'sand':key?.includes('stone')?'stone':'dirt';
  }
  function soilNames(keys) {
    const names=Array.from(new Set(keys.map(key=>nameOf(key))));
    return names.slice(0,2).join('、')+(names.length>2?'等':'');
  }
  function plantingMessage(result) {
    if (result.code!=='SOIL'||(!result.soil&&!result.bottom)) return messages[result.code];
    const requirements=[];
    if (result.soil) requirements.push('种植土需要'+soilNames(result.soil));
    if (result.bottom) requirements.push('底土需要'+result.bottom.map(soilNames).join('及'));
    return requirements.join('，');
  }
  function finish(ui,result,inventory) {
    if (!result.ok) {
      toastAt(null,plantingMessage(result)||'这项操作未完成');
      return;
    }
    if (inventory) {
      markInv();
      ITEM_DRAG.syncCursor();
    }
    for (const item of result.produced||[]) {
      if (item.toWarehouse||item.toDrops) gainTip(item.k,item.toBag,item.toWarehouse,item.toDrops);
    }
    ui.save?.();
  }
  function placeHeld(ui,held) {
    const {S,pos}=ui;
    if (held.entityUid||held.instanceUid) {
      toastAt(null,messages.PLANT_ITEM);
      return;
    }
    const source={endpoint:ITEM_TRANSFER.endpoint(S,{type:'cursor'}),n:1};
    finish(ui,FARMING.useItem(S,pos,held.k,source),true);
  }
  function run(ui,action) {
    const {S,pos}=ui;
    if (action==='rack') finish(ui,FARMING.place(S,pos,'rack',null),true);
    else if (action==='seed') finish(ui,FARMING.harvest(S,pos,true),true);
    else if (action==='weed') finish(ui,FARMING.trim(S,pos),false);
    else if (action==='analyze') finish(ui,FARMING.analyze(S,pos),false);
    else finish(ui,FARMING.tend(S,pos,action),true);
  }
  function plotTooltip(S,p,crop,progress) {
    const name=crop?.name||(p?.rack===2?'杂交架':p?.rack?'作物架':'空地');
    const lines=[name];
    if (p?.rack&&p.weeds) lines.push('需要除草');
    else if (crop) {
      if (!CROP_GROWTH.bottomFits(crop.bottom,p.bottom)) lines.push('底土需要'+crop.bottom.map(soilNames).join('及'));
      else if (progress>=1) lines.push('已成熟，空手右键收获');
      else if (!CROP_GROWTH.lightFits(crop,S)) lines.push('等待合适光照');
      else lines.push('生长中 '+Math.floor(progress*100)+'%');
      const seed=p.seed;
      lines.push(seed.scanned?'生长 '+seed.growth+'　产量 '+seed.gain+'　抗性 '+seed.resistance:'未鉴定');
    } else if (p?.rack===2) lines.push('等待杂交');
    else if (p?.rack) lines.push(p.soil?'拿着种子左键种植':'需要种植土');
    else lines.push('拿着作物架左键放置');
    lines.push('种植土　'+(p?.soil?nameOf(p.soil):'未设置'),'底土　'+(p?.bottom?nameOf(p.bottom):'未设置'));
    return lines.join('\n');
  }
  function paintTile(ui,node,plot,selected,isParent,daylight) {
    setAttr(node.el,'aria-pressed',selected);
    setAttr(node.el,'data-parent',isParent);
    if (!plot&&!node.drawnPlot&&node.drawn) return;
    const seed=plot?.seed,crop=seed&&CROP_GROWTH.crops[seed.species];
    const progress=crop?CROP_GROWTH.progress(plot):0;
    const images=crop?.images;
    const image=images?.[Math.floor(progress*(images.length-1))]||images?.at(-1);
    const percent=Math.floor(progress*100);
    if (node.drawn&&node.seed===seed&&node.rackCount===plot?.rack&&node.soil===plot?.soil&&
        node.bottom===plot?.bottom&&node.weeds===plot?.weeds&&node.scanned===seed?.scanned&&
        node.percent===percent&&node.asset===image&&(!crop||node.daylight===daylight)) return;

    Object.assign(node,{drawn:true,drawnPlot:plot,seed,rackCount:plot?.rack,soil:plot?.soil,
      bottom:plot?.bottom,weeds:plot?.weeds,scanned:seed?.scanned,percent,asset:image,daylight});
    setAttr(node.el,'data-empty',!plot?.rack&&!plot?.soil);
    setAttr(node.el,'data-ground',soilKind(plot?.soil));
    setAttr(node.el,'data-tip',plotTooltip(ui.S,plot,crop,progress));
    setAttr(node.rack,'data-double',plot?.rack===2);
    node.rack.hidden=!plot?.rack||!!image;
    node.image.hidden=!image;
    if (image) setAttr(node.image,'src','modicons/cropsnh/'+image);
    setText(node.name,crop?.name||'');
  }
  function paintSoil(field,p,heldCrop) {
    const {layer,select}=field,current=p?.[layer]||'';
    const planted=p?.seed&&CROP_GROWTH.crops[p.seed.species],crop=planted||heldCrop;
    if (field.crop===crop&&field.planted===planted&&field.current===current&&select.value===current) return;
    const refreshOptions=field.crop!==crop;
    field.crop=crop;
    field.planted=planted;
    field.current=current;
    const soil=layer==='soil';
    const choices=soil
      ?(crop?CROP_GROWTH.soils[crop.soil]:FARMING.soilKeys)
      :(crop?.bottom?.length?crop.bottom[0].filter(key=>CROP_GROWTH.bottomFits(crop.bottom,key)):FARMING.bottomKeys);
    const validCurrent=!current||Array.from(choices).includes(current);
    const extraOption=validCurrent?'':current;
    if (refreshOptions||field.extraOption!==extraOption) {
      const options=Array.from(choices,key=>new Option(nameOf(key),key)).sort((a,b)=>a.text.localeCompare(b.text,'zh-CN'));
      if (!validCurrent) options.unshift(new Option(nameOf(current),current));
      select.replaceChildren(new Option('未设置',''),...options);
      field.extraOption=extraOption;
    }
    select.options[0].disabled=soil&&!!planted;
    if (select.value!==current) select.value=current;
  }
  function paint(ui) {
    const p=FARMING.plotAt(ui.S,ui.pos);
    const parents=p?.rack===2?CROP_GROWTH.parents(ui.farm,ui.pos):[];
    const neighbors=new Set(parents.map(parent=>parent.index));
    const daylight=isDay(ui.S);
    ui.tiles.forEach((node,i)=>paintTile(ui,node,ui.farm.plots[i],i===ui.pos,neighbors.has(i),daylight));

    setText(ui.title,'地块 '+(ui.pos+1));
    const heldKey=ITEM_CURSOR.held(ui.S)?.k;
    if (ui.heldKey!==heldKey) {
      const seed=heldKey&&CROP_SEEDS.fromItem(heldKey);
      const crop=seed&&CROP_GROWTH.crops[seed.species];
      ui.heldCrop=crop&&!crop.bedTier?crop:null;
      ui.heldKey=heldKey;
    }
    ui.soils.forEach(field=>paintSoil(field,p,ui.heldCrop));
    const b=ui.buttons;
    b.rack.disabled=!p?.rack||!!p.seed;
    b.seed.disabled=!p?.seed||!!p.weeds;
    b.water.disabled=!p?.rack||p.water>=200;
    b.fertilizer.disabled=!p?.rack||p.fertilizer>=100;
    b.weed.disabled=!p?.rack||!p.weeds;
    b.analyze.disabled=!p?.seed||p.seed.scanned;
    ui.revision=FARMING.revision(ui.S,ui.farm);
    ui.daylight=daylight;
  }
  function isDay(S) {
    const day=ENVIRONMENT.daySeconds;
    return (S.env?.elapsed||0)%day<day/2;
  }
  function render(S,save) {
    const host=document.getElementById('farm-host');
    if (!host) return;
    const farm=FARMING.ensure(S);
    if (host._nursery?.S===S&&host._nursery.farm===farm) {
      refresh(S);
      return;
    }
    const {columns,rows,detail}=FARM_FIELDS;
    const layoutStyle='--field-columns:'+columns+';--field-rows:'+rows+';--detail-column:'+(detail.column+1)+';--detail-columns:'+detail.columns+';--detail-rows:'+detail.rows;
    host.innerHTML='<section id="gregtorio-nursery" aria-label="农业"><header class="fx-bar fx-blueprints gn-field-bar">'+
      '<div class="fx-board-strip" data-item-controls role="group" aria-label="切换田地"></div>'+
      '<div class="fx-board-actions" data-item-controls><button type="button" class="fx-tool" data-farm-create>＋ 新建田地</button></div></header>'+
      '<div class="gn-layout" style="'+layoutStyle+'"><div class="gn-field" data-item-controls>'+FARM_FIELDS.cells.map(plotHTML).join('')+'</div>'+
      '<section class="gn-detail" aria-label="地块设置"><h2></h2><div class="gn-layers">'+layers.map(layerHTML).join('')+'</div>'+
      '<div class="gn-controls">'+actions.map(actionHTML).join('')+'</div></section></div></section>';
    const tiles=Array.from(host.querySelectorAll('[data-plot]'),(el,i)=>{
      el.setAttribute('aria-label','地块 '+(i+1));
      return {el,rack:el.querySelector('.gn-rack-icon'),image:el.querySelector('img'),name:el.querySelector('.gn-plot-name')};
    });
    const soils=Array.from(host.querySelectorAll('[data-layer]'),select=>({select,layer:select.dataset.layer}));
    const buttons=Object.fromEntries(Array.from(host.querySelectorAll('[data-action]'),el=>[el.dataset.action,el]));
    const ui=host._nursery={S,farm,tiles,soils,buttons,pos:0,save,title:host.querySelector('h2')};
    FARM_FIELD_BAR.mount(host.querySelector('.gn-field-bar'),S,next=>{
      ui.farm=next;
      ui.pos=0;
      paint(ui);
    },save);
    host.onclick=e=>{
      const button=e.target.closest('button');
      if (!button) return;
      if (button.dataset.plot!==undefined) {
        ui.pos=Number(button.dataset.plot);
        const held=ITEM_CURSOR.held(S);
        if (held) placeHeld(ui,held);
      } else if (button.dataset.action) run(ui,button.dataset.action);
      paint(ui);
    };
    host.oncontextmenu=e=>{
      const tile=e.target.closest('[data-plot]');
      if (!tile||ITEM_CURSOR.held(S)) return;
      const pos=Number(tile.dataset.plot);
      if (!FARMING.canHarvest(FARMING.plotAt(S,pos))) return;
      finish(ui,FARMING.harvest(S,pos,false),true);
      paint(ui);
    };
    for (const {layer,select} of soils) select.onchange=()=>{
      finish(ui,FARMING.place(S,ui.pos,layer,select.value||null),false);
      paint(ui);
    };
    paint(ui);
  }
  function refresh(S) {
    const ui=document.getElementById('farm-host')?._nursery;
    if (ui?.S===S&&(ui.revision!==FARMING.revision(S,ui.farm)||ui.daylight!==isDay(S)||ui.heldKey!==ITEM_CURSOR.held(S)?.k)) paint(ui);
  }
  root.FARM_UI={render,refresh};
})(typeof window !== 'undefined' ? window : globalThis);
