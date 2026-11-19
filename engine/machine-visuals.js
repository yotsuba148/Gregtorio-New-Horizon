(function(root) {
  'use strict';
  var working = new Set(['running', 'generating', 'boiling', 'heating', 'warming', 'cleaning', 'collecting',
    'producingWater', 'pumping', 'mining', 'loading'
  ]);

  function active(m, state) {
    state=state||MACHINE_STATUS.read(m);
    // A one-tick batch can finish before presentation reads its running status.
    return working.has(state.key) || (m.status?.code==='IDLE'&&
      (state.key==='waiting'||state.key==='empty')&&!!entry(m)&&BatchProcessor.workedThisTick(m));
  }

  function entry(m) {
    var item = GD.workingFaces[m.k];
    if (!item) return null;
    if (item.variants) {
      var variant=m.structure && m.structure.variant || m.buildPlan || {};
      item=item.variants[variant[item.variantField || 'pressure'] || 0];
    }
    return item;
  }

  function front(m, on, still) {
    var item=entry(m);
    if(!item)return null;
    var idle=item.front||item.idle;
    if(!on)return idle;
    return still ? item.activeStill||(item.animation?idle:item.active) : item.active;
  }

  function spriteStyle(el, asset, animation) {
    el.style.backgroundImage='url("'+asset+'")';
    el.style.setProperty('--native-frames',animation?animation.frames:1);
    el.style.setProperty('--native-duration',(animation?animation.durationMs:0)+'ms');
    el.classList.toggle('native-sprite-running',!!animation);
  }

  function bodyHtml(m, unit, animate) {
    var spec=entry(m),body=spec&&spec.body;
    if(!body||!m.structure||!m.structure.formed)return '';
    var on=animate&&active(m),asset=body[on?'active':'idle'],animation=on&&body.animation;
    return '<span class="native-body-sprite'+(animation?' native-sprite-running':'')+'" style="width:'+body.width*unit+'px;height:'+body.height*unit+'px;rotate:'+((m.rotation||0)*90)+'deg;background-image:url('+asset+');--native-frames:'+(animation?animation.frames:1)+';--native-duration:'+(animation?animation.durationMs:0)+'ms"></span>';
  }

  function refresh(m, el, state) {
    var on=active(m,state),spec=entry(m),face=front(m,on,true),
      signature=m.k+':'+on+':'+face;
    signature+=':'+(m.structure&&m.structure.formed)+':'+(m.rotation||0);
    if (el._workVisualSignature === signature) return;
    el._workVisualSignature = signature;
    el.classList.toggle('fx-working', on);
    if (!face) return;
    var body=el.querySelector('.native-body-sprite');
    if(body&&spec.body)spriteStyle(body,spec.body[on?'active':'idle'],on&&spec.body.animation);
    var img=el.querySelector('.mb-controller img')||el.querySelector(':scope > .facebox img');
    if(!img)return;
    var parent=img.parentElement,animation=on&&spec.animation;
    if(animation){
      parent.classList.add('native-face-sprite');
      spriteStyle(parent,spec.active,animation);
    }else if(parent.classList.contains('native-face-sprite')){
      parent.classList.remove('native-face-sprite','native-sprite-running');
      parent.style.removeProperty('background-image');
      parent.style.removeProperty('--native-frames');
      parent.style.removeProperty('--native-duration');
    }
    if(img.getAttribute('src')!==face)img.setAttribute('src',face);
  }

  function refreshController(m, map) {
    var spec=entry(m),face=spec&&front(m,active(m),true);
    if(!face||map._controllerFace===face)return;
    var img=map.querySelector('.mb-controller img');
    if(img&&img.getAttribute('src')!==face)img.setAttribute('src',face);
    map._controllerFace=face;
  }
  root.MACHINE_VISUALS = {
    active: active,
    front: front,
    entry: entry,
    refresh: refresh,
    refreshController:refreshController,
    bodyHtml:bodyHtml
  };
})(typeof window !== 'undefined' ? window : globalThis);
