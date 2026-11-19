(function(root){
 'use strict';
 function ratio(t,capacity){return t&&capacity>0?Math.max(0,Math.min(1,t.mb/capacity)):0;}
 function surfaceStyle(fluid){var d=GD.fluidIcons,e=FLUID_PRESENTATION.entry(fluid);if(!e||!d)return'background-color:'+FLUID_PRESENTATION.color(fluid)+';';var x=e.sprite%d.cols,y=Math.floor(e.sprite/d.cols);return'background-image:url('+d.page+');background-size:'+(d.cols*100)+'% '+(d.rows*100)+'%;background-position:'+(d.cols>1?x/(d.cols-1)*100:0)+'% '+(d.rows>1?y/(d.rows-1)*100:0)+'%;background-repeat:no-repeat;';}
 function html(t,capacity,options){var cls=options&&options.fillClass||'';return'<span class="fluid-level" data-fluid-level aria-hidden="true"><span class="fluid-level-fill '+cls+'" style="height:'+ratio(t,capacity)*100+'%"><i class="fluid-level-texture" style="'+(t?surfaceStyle(t.f):'')+'"></i></span></span>';}
 function update(host,t,capacity){var n=host.matches&&host.matches('[data-fluid-level]')?host:host.querySelector('[data-fluid-level]');if(!n)return;var fill=n.querySelector('.fluid-level-fill'),texture=n.querySelector('.fluid-level-texture'),fluid=t&&t.mb>0?t.f:'',height=ratio(t,capacity)*100+'%';if(fill.style.height!==height)fill.style.height=height;if(n.dataset.fluid!==fluid){n.dataset.fluid=fluid;texture.style.cssText=fluid?surfaceStyle(fluid):'';n.classList.toggle('gas',!!(GD.fluidProperties[fluid]||{}).gas);}n.classList.toggle('empty',!fluid);}
 root.FLUID_RENDERER={ratio:ratio,surfaceStyle:surfaceStyle,html:html,update:update};
})(typeof window!=='undefined'?window:globalThis);
