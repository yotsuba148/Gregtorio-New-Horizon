(function (root) {
  'use strict';
  function mount(host,S,onSelect,save) {
    const strip=host.querySelector('.fx-board-strip'),add=host.querySelector('[data-farm-create]');
    function reveal(node) {
      const start=node.offsetLeft-2,end=node.offsetLeft+node.offsetWidth+2;
      if(start<strip.scrollLeft||end-start>strip.clientWidth)strip.scrollLeft=start;
      else if(end>strip.scrollLeft+strip.clientWidth)strip.scrollLeft=end-strip.clientWidth;
    }
    function edit(button,field) {
      const input=document.createElement('input');
      input.className='fx-blueprint-name';
      input.value=field.name;
      input.maxLength=48;
      input.setAttribute('aria-label','田地名称');
      input.style.width=button.offsetWidth+'px';
      function finish(cancel,focus) {
        if(!input.isConnected)return;
        input.onblur=null;
        if(!cancel&&FARM_FIELDS.rename(S,field.id,input.value))save?.();
        button.textContent=field.name;
        button.title=field.name+'（点击改名）';
        input.replaceWith(button);
        if(focus){
          button.focus({preventScroll:true});
          reveal(button);
        }
      }
      input.onblur=()=>finish(false,false);
      input.onkeydown=e=>{
        if(e.isComposing||!['Enter','Escape'].includes(e.key))return;
        e.preventDefault();
        e.stopPropagation();
        finish(e.key==='Escape',true);
      };
      button.replaceWith(input);
      reveal(input);
      input.focus({preventScroll:true});
      input.select();
    }
    function render() {
      const active=FARM_FIELDS.active(S),offset=strip.scrollLeft;
      const buttons=FARM_FIELDS.list(S).map(field=>{
        const button=document.createElement('button'),selected=field===active;
        button.type='button';
        button.className='fx-tool'+(selected?' on':'');
        button.textContent=field.name;
        button.title=selected?field.name+'（点击改名）':field.name;
        button.dataset.farmField=field.id;
        button.setAttribute('aria-pressed',String(selected));
        button.onclick=()=>{
          if(!ITEM_DRAG.returnHeld())return;
          if(selected){edit(button,field);return;}
          onSelect(FARM_FIELDS.select(S,field.id));
          save?.();
          render();
        };
        return button;
      });
      strip.replaceChildren(...buttons);
      strip.scrollLeft=offset;
      reveal(buttons.find(b=>b.dataset.farmField===active.id));
    }
    strip.addEventListener('wheel',e=>{
      const delta=e.deltaX||e.deltaY;
      if(!delta||e.ctrlKey||strip.scrollWidth<=strip.clientWidth)return;
      e.preventDefault();
      strip.scrollLeft+=delta*(e.deltaMode===1?24:e.deltaMode===2?strip.clientWidth:1);
    },{passive:false});
    add.onclick=()=>{
      const existing=host.querySelector('.gn-field-create');
      if(existing){existing.querySelector('input').focus();return;}
      if(!ITEM_DRAG.returnHeld())return;
      const form=document.createElement('form');
      form.className='fx-board-create gn-field-create';
      form.innerHTML='<input maxlength="48" aria-label="新田地名称"><button type="submit" class="fx-tool">创建</button><button type="button" class="fx-tool">取消</button>';
      const input=form.querySelector('input');
      input.value=FARM_FIELDS.defaultName(S);
      function close() {form.remove();add.focus({preventScroll:true});}
      form.querySelector('button[type="button"]').onclick=close;
      form.onkeydown=e=>{if(e.key==='Escape'&&!e.isComposing){e.stopPropagation();close();}};
      form.onsubmit=e=>{
        e.preventDefault();
        onSelect(FARM_FIELDS.create(S,input.value));
        save?.();
        close();
        render();
      };
      host.append(form);
      input.focus();
      input.select();
    };
    render();
  }
  root.FARM_FIELD_BAR={mount};
})(typeof window!=='undefined'?window:globalThis);
