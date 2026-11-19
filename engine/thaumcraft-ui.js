(function(root){
 'use strict';if(!root.THAUMCRAFT)return;var T=THAUMCRAFT;
 function aspect(id){return GD.tcLabels&&GD.tcLabels.aspects[id]||id;}
 function research(id){return GD.tcLabels&&GD.tcLabels.research[id]||id;}
 var errors={THAUMOMETER:'需要实际持有魔导透镜',BOOK:'需要实际持有魔导手册',INK:'需要有墨水的笔与墨',PREREQUISITE:'前置研究未完成',RESOURCE:'研究点不足',INPUT:'库存原料不足',HIDDEN_RESEARCH:'尚未发现该研究线索',RESEARCH_EVENT:'此研究需要对应的事件',WAND_PROPERTY:'法杖属性无法读取',NODE:'节点不存在',TOOL:'原来的法杖已移出库存',DIMENSION:'需要前往节点所在维度',WAND_FULL:'法杖已充满',STAFF:'奥术工作台使用法杖或权杖',NO_ASPECTS:'没有已核实的扫描要素',ALREADY_SCANNED:'该物品已经扫描过',ASPECT_PARENTS:'先发现组成该物品要素的基础要素'};
 RESOURCE_UI.registerPanel('thaumcraft',function(host,m,S,save,ui){
  ui=ui||{};var page=ui.page||0,q=ui.q||'',tab=ui.tab||'scan',body=document.createElement('div'),toolbar=document.createElement('div'),points=document.createElement('p');
  function button(text,fn,data){var b=document.createElement('button');b.className='btn';b.textContent=text;if(data)Object.keys(data).forEach(function(k){b.dataset[k]=data[k];});b.onclick=fn;return b;}
  function report(r,text){if(typeof toastAt==='function')toastAt(null,r.ok?text:errors[r.code]||r.code);if(save)save();if(typeof markInv==='function')markInv();if(typeof markDynamic==='function')markDynamic();render();}
  ['扫描','研究','节点充能'].forEach(function(label,i){toolbar.appendChild(button(label,function(){tab=['scan','research','nodes'][i];page=0;render();},{tcTab:['scan','research','nodes'][i]}));});
  var search=document.createElement('input');search.className='rb-search';search.placeholder='查找物品或研究';search.value=q;search.oninput=function(){q=search.value.trim().toLowerCase();page=0;render();};toolbar.appendChild(search);host.appendChild(toolbar);host.appendChild(points);host.appendChild(body);
  function refresh(){var p=MECHANISMS.ensure(S).resources;points.textContent='研究点：'+Object.keys(p).filter(function(k){return k.startsWith('tc:point:')&&p[k].amount;}).map(function(k){return aspect(k.slice(9))+' '+p[k].amount;}).join('，');body.querySelectorAll('[data-node-state]').forEach(function(el){var n=T.ensure(S).nodes.find(function(v){return v.id===el.dataset.nodeState;});if(n)el.textContent=Object.keys(n.aspects).map(function(id){return aspect(id)+' '+n.aspects[id].amount+'/'+n.aspects[id].capacity;}).join('，');});}
  host._refresh=refresh;
  function render(){Object.assign(ui,{page:page,q:q,tab:tab});body.innerHTML='';var t=T.ensure(S),mechanisms=MECHANISMS.ensure(S);refresh();
   if(tab==='scan'){
    var list=COMMANDS.owned(S,function(k){return !!T.aspects(k)&&!t.scanned[CONTENT.baseKey(k)];}).filter(function(o){return !q||SEARCH_TEXT.matches(SEARCH_TEXT.index(GD.items[o.k]||'',null,o.k),q);});
    list.slice(page*20,page*20+20).forEach(function(o){var gate=T.scanCheck(S,o.k),b=button('扫描 '+(GD.items[o.k]||o.k),function(){var r=T.scan(S,o.k);report(r,'扫描完成，'+Object.keys(r.gained||{}).map(function(id){return aspect(id)+' +'+r.gained[id];}).join('、'));},{tcScan:o.k});b.title=gate.ok?'扫描不消耗这件物品':(errors[gate.code]||gate.code)+(gate.missing?'：'+gate.missing.map(aspect).join('、'):'');body.appendChild(b);});pages(list.length);
    var hint=document.createElement('p');hint.className='dim';hint.textContent='首次扫描库存物品获得要素点。复合要素需先认识其组成要素。';body.appendChild(hint);
   }else if(tab==='research'){
    var list=Object.values(T.data.research).filter(function(d){return !d.isAutoUnlock&&!d.isStub&&!d.isVirtual&&(!d.isHidden&&!d.isLost||t.revealed[d.id])&&MECHANISMS.meets(S,{all:(d.parents||[]).concat(d.parentsHidden||[]).map(function(id){return'tc:'+id;})})&&(!q||SEARCH_TEXT.matches(SEARCH_TEXT.index(research(d.id)),q));});
    list.slice(page*20,page*20+20).forEach(function(d){var row=document.createElement('p'),known=mechanisms.knowledge['tc:'+d.id];row.textContent=research(d.id)+'，'+Object.keys(d.tags).map(function(id){return aspect(id)+' '+d.tags[id];}).join('、')+' ';if(known)row.appendChild(document.createTextNode('已完成'));else row.appendChild(button('研究',function(){var r=MECHANISMS.unlock(S,'tc:'+d.id);report(r,'研究完成，'+research(d.id)+'，消耗纸张1、墨水1');},{tcResearch:d.id}));body.appendChild(row);});pages(list.length);
    var hint=document.createElement('p');hint.className='dim';hint.textContent='完成前置研究后，消耗条目所列要素点、纸张1和墨水1完成研究。';body.appendChild(hint);
   }else{
    var wands=[];ENTITIES.storage(S).forEach(function(a,b){a.forEach(function(item,i){if(T.wandInfo(item))wands.push({box:b,index:i,item:item});});});
    t.nodes.forEach(function(n){var row=document.createElement('div'),title=document.createElement('p'),stats=document.createElement('p');title.textContent=n.id+'，'+n.dim;row.appendChild(title);stats.dataset.nodeState=n.id;row.appendChild(stats);var select=document.createElement('select');wands.forEach(function(o,i){var opt=document.createElement('option');opt.value=i;opt.textContent=(GD.items[o.item.k]||o.item.k)+'（'+(o.box?'仓库 '+o.box:'物品栏')+' 第'+(o.index+1)+'格）';select.appendChild(opt);});if(!ui.wandSelection)ui.wandSelection={};select.value=String(Math.min(ui.wandSelection[n.id]||0,Math.max(0,wands.length-1)));select.onchange=function(){ui.wandSelection[n.id]=+select.value;};row.appendChild(select);var start=button('持杖充能',function(){report(T.startCharge(S,n.id,wands[+select.value]),'开始为实际法杖充能，保留节点最后1点');},{tcCharge:n.id});start.disabled=!wands.length;row.appendChild(start);body.appendChild(row);});
    var hint=document.createElement('p');hint.className='dim';hint.textContent=t.nodes.length?'法杖先从设备卸回库存。每5tick抽取一种要素；普通节点每600tick随机恢复一种缺失要素的1点。':'在世界页持有魔导透镜搜寻节点。';body.appendChild(hint);refresh();
   }
  }
  function pages(total){if(total<=20)return;body.appendChild(button('上一页',function(){page=Math.max(0,page-1);render();}));body.appendChild(document.createTextNode(' '+(page+1)+' / '+Math.ceil(total/20)+' '));body.appendChild(button('下一页',function(){page=Math.min(Math.ceil(total/20)-1,page+1);render();}));}
  render();
 });
})(typeof window!=='undefined'?window:globalThis);
