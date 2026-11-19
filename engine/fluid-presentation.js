(function(root){
 'use strict';
 function entry(id){return GD.fluidIcons?.icons[CONTENT.canonicalFluid(id)]||null;}
 function name(id){id=CONTENT.canonicalFluid(id);return GD.fluids&&GD.fluids[id]||(CONTENT.fluids.find(function(p){return p.id===id;})||{}).name||id;}
 function color(id){var e=entry(id);return e?'#'+e.color.toString(16).padStart(6,'0'):'#80715c';}
 function style(id,size){var e=entry(id),s=size||30,d=GD.fluidIcons;if(!e)return'background-color:'+color(id)+';';return'background-image:url('+d.page+');background-size:'+(d.cols*s)+'px '+(d.rows*s)+'px;background-position:'+(-e.sprite%d.cols*s)+'px '+(-Math.floor(e.sprite/d.cols)*s)+'px;background-repeat:no-repeat;';}
 function html(id,size){var s=size||30,key=String(id).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});return'<i class="fluid-native" data-lookup-fluid="'+key+'" style="width:'+s+'px;height:'+s+'px;'+style(id,s)+'"></i>';}
 root.FLUID_PRESENTATION={entry:entry,name:name,color:color,style:style,html:html};
})(typeof window!=='undefined'?window:globalThis);
