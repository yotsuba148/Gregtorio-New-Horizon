(function(root){
 'use strict';
 const layout=root.WORLD_MAP_REGIONS,art=root.WORLD_MAP_ART;
 root.WORLD_MAP_GEOMETRY.validate(layout);
 let dimension=null,selection=null,pendingSelection=null,buttons=new Map(),layers=new Map(),selectionCallback=null,lastEnvironment=null;
 let baseFile=null,requested=null,paintToken=0,baseIndex=0,fading=false;
 const stage=()=>document.getElementById('world-map-stage');
 const artHost=()=>document.getElementById('world-map-art');
 const regionHost=()=>document.getElementById('world-map-targets');
 const actionPanel=()=>document.getElementById('world-actions-panel');
 const create=(name,className)=>Object.assign(document.createElement(name),{className});
 function drawSegment(shape){
  const xs=shape.map(point=>point[0]),ys=shape.map(point=>point[1]);
  const left=Math.min(...xs),top=Math.min(...ys);
  const width=Math.max(...xs)-left,height=Math.max(...ys)-top;
  const segment=create('span','world-map-region-segment');
  const outline=shape.map(([x,y])=>((x-left)/width*100).toFixed(3)+'% '+((y-top)/height*100).toFixed(3)+'%');
  Object.assign(segment.style,{left:left+'%',top:top+'%',width:width+'%',height:height+'%'});
  segment.style.setProperty('--region-outline','polygon('+outline.join(', ')+')');
  const tint=create('span','world-map-region-tint');
  tint.setAttribute('aria-hidden','true');
  segment.append(create('span','world-map-region-shape'),tint);
  return segment;
 }
 function ensureStageEvents(host){
  if(host.dataset.mapReady)return;
  host.dataset.mapReady='1';
  host.addEventListener('click',event=>{
   const button=event.target.closest('[data-world-map-region]');
   if(!button||!host.contains(button)||selection===button.dataset.worldMapRegion)return;
   selection=button.dataset.worldMapRegion;
   updateSelection();
   selectionCallback?.();
  });
  document.getElementById('world-actions-close').addEventListener('click',()=>{
   const previous=buttons.get(selection);
   selection=null;
   updateSelection();
   selectionCallback?.();
   previous?.focus({preventScroll:true});
  });
 }
 function updateSelection(){
  for(const [id,button] of buttons)button.setAttribute('aria-pressed',String(id===selection));
 }
 function selectRegion(dim,id){
  if(!layout[dim]?.some(region=>region.id===id))return false;
  pendingSelection={dim,id};
  return true;
 }
 function drawRegions(regions){
  buttons=new Map();
  const fragment=document.createDocumentFragment();
  for(const region of regions){
   const button=create('button','world-map-region');
   button.type='button';
   button.dataset.worldMapRegion=region.id;
   button.setAttribute('aria-label',region.name);
   button.setAttribute('aria-controls','actions');
   for(const shape of region.shapes)button.append(drawSegment(shape));
   const label=create('span','world-map-region-label');
   label.textContent=region.name;
   label.style.left=region.label[0]+'%';
   label.style.top=region.label[1]+'%';
   button.append(label);
   fragment.append(button);
   buttons.set(region.id,button);
  }
  regionHost().replaceChildren(fragment);
  updateSelection();
 }
 function drawArt(config){
  layers=new Map();
  baseIndex=0; baseFile=null; requested=null; fading=false; paintToken++;
  const fragment=document.createDocumentFragment();
  for(let i=0;i<2;i++){
   const image=create('img','world-map-base');
   image.alt='';
   fragment.append(image);
  }
  for(const [id,sprite] of Object.entries(config.layers)){
   const image=create('img','world-map-layer');
   image.dataset.mapLayer=id;
   image.alt='';
   image.src=sprite.file;
   image.style.left=sprite.x/config.width*100+'%';
   image.style.top=sprite.y/config.height*100+'%';
   image.style.width=sprite.width/config.width*100+'%';
   image.style.height=sprite.height/config.height*100+'%';
   image.style.zIndex=String(sprite.order+2);
   if(sprite.clip)image.style.clipPath=sprite.clip;
   fragment.append(image);
   layers.set(id,{image,sprite});
  }
  artHost().replaceChildren(fragment);
 }
 function showBackground(file,fast){
  if(file===requested?.file)return;
  requested={file,fast};
  if(!fading)paintBackground();
 }
 async function paintBackground(){
  const token=++paintToken,request=requested;
  if(!request||request.file===baseFile)return;
  const images=artHost().children;
  const previous=images[baseIndex],next=images[1-baseIndex];
  next.src=request.file;
  try{await next.decode();}catch{
   if(token===paintToken)requested=null;
   return;
  }
  if(token!==paintToken)return;
  const first=!baseFile;
  previous.style.zIndex='0';
  next.style.zIndex='1';
  next.classList.add('visible');
  baseIndex=1-baseIndex;
  baseFile=request.file;
  if(first)return;
  fading=true;
  const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?160:request.fast?660:1000;
  const transition=next.animate([{opacity:0},{opacity:1}],{duration,easing:'ease-in-out'});
  try{await transition.finished;}catch{}
  if(token!==paintToken)return;
  previous.classList.remove('visible');
  fading=false;
  paintBackground();
 }
 function refreshArt(S,environment,fast=false){
  lastEnvironment=environment;
  if(dimension!==S.ui.dim||!art[dimension])return;
  const config=art[dimension];
  const sky=environment.weather==='thunder'?'rain':environment.weather;
  const key=sky==='rain'||sky==='snow'?(environment.day?'':'night-')+sky:environment.day?'day':'night';
  showBackground(config.backgrounds[key]||config.backgrounds.day,fast);
  if(!layers.size)return;
  const travel=S.mechanisms?.travel,nether=!!travel?.unlocked?.nether?.open;
  const framed=nether||(travel?.netherFrame||[]).filter(Boolean).length===10;
  const visible={
   'nether-left':!framed,'nether-right':!framed,'nether-frame':framed,'nether-active':nether,
   'twilight-active':!!travel?.unlocked?.twilight?.open,cauldron:!!(S.riverWash?.pots?.length||!S.riverWash&&S.mechanisms?.deployments?.cauldron)
  };
  for(const [id,{image,sprite}] of layers){
   if(image.classList.contains('visible')!==!!visible[id])image.classList.toggle('visible',!!visible[id]);
   const brightness=String(environment.day?(sky==='rain'?sprite.rain:1):sprite.night);
   if(image.dataset.brightness!==brightness){
    image.dataset.brightness=brightness;
    image.style.filter='brightness('+brightness+')';
   }
  }
 }
 function render(S,canOpen,onSelect){
  const map=stage();
  if(!map)return null;
  const regions=canOpen?layout[S.ui.dim]:null;
  if(map.hidden===!!regions){
   map.hidden=!regions;
   map.parentElement.classList.toggle('map-present',!!regions);
   actionPanel().classList.toggle('panel',!regions);
   document.getElementById('world-actions-heading').hidden=!regions;
  }
  if(!regions){
   if(dimension!==null){dimension=null;requested=null;paintToken++;}
   if(actionPanel().hidden)actionPanel().hidden=false;
   return null;
  }
  selectionCallback=onSelect;
  ensureStageEvents(map);
  if(dimension!==S.ui.dim){
   dimension=S.ui.dim;
   selection=regions[0].id;
   map.dataset.mapDimension=dimension;
   const config=art[dimension];
   map.style.setProperty('--world-map-ratio',config.width/config.height);
   map.style.setProperty('--world-map-art-width',config.backgroundWidth/config.width*100+'%');
   drawRegions(regions);
   drawArt(config);
   if(lastEnvironment)refreshArt(S,lastEnvironment,true);
  }
  if(pendingSelection?.dim===dimension){
   selection=pendingSelection.id;
   pendingSelection=null;
   updateSelection();
  }
  if(actionPanel().hidden!== (selection===null))actionPanel().hidden=selection===null;
  return {region:regions.find(region=>region.id===selection)};
 }
 root.WORLD_MAP_UI={render,refreshArt,selectRegion};
})(globalThis);
