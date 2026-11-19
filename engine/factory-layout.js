/* Save-boundary geometry upgrades. Resource recovery belongs to ENTITIES. */
(function(root){
 'use strict';
 var schema=1,footprints=new WeakMap();
 function footprint(m){
  var occupied=MULTIBLOCKS.footprint(m),prior=footprints.get(occupied);if(prior)return prior;
  var bounds=MULTIBLOCKS.bounds(m)||{w:1,h:1},set=new Set(occupied.cells.map(function(c){return(c.x-m.x)+','+(c.y-m.y);})),rows=[];
  for(var y=0;y<bounds.h;y++){var row='';for(var x=0;x<bounds.w;x++)row+=set.has(x+','+y)?'1':'0';rows.push(row);}
  var value={schema:schema,rows:rows};footprints.set(occupied,value);return value;
 }
 function stored(value){
  if(value==null)return null;
  if(value.schema!==schema||!Array.isArray(value.rows)||!value.rows.length||!value.rows[0]||value.rows.some(function(r){return typeof r!=='string'||r.length!==value.rows[0].length||!/^[01]+$/.test(r);}))throw Error('设备占地记录无效');
  return value.rows;
 }
 function expanded(m,current){
  var before=stored(m.placementShape);if(!before)return false;
  return current.rows.some(function(row,y){for(var x=0;x<row.length;x++)if(row[x]==='1'&&(!before[y]||before[y][x]!=='1'))return true;return false;});
 }
 function snapshot(f){
  if(f==null)return f;
  return Object.assign({},f,{layoutRevision:schema,machines:(f.machines||[]).map(function(m){var next=Object.assign({},m);if(ENTITIES.isGrid(m))next.placementShape=footprint(m);else delete next.placementShape;return next;})});
 }
 function plan(S){
  var f=BLUEPRINTS.ensure(S),seen=new Set(),entries=[],kept=[],recovered=[];
  if(f.layoutRevision!=null&&f.layoutRevision!==schema)throw Error('产线占地记录版本不受支持');
  f.machines.forEach(function(m,index){
   var uid=String(m.uid);if(!m.uid||seen.has(uid))throw Error('设备标识重复或缺失：'+m.uid);seen.add(uid);
   if(ENTITIES.isGrid(m)){var current=footprint(m);entries.push({machine:m,index:index,expanded:expanded(m,current)});}
  });
  // Sort a separate plan; never reorder the persistent machine list.
  entries.sort(function(a,b){return Number(a.expanded)-Number(b.expanded)||a.index-b.index;});
  entries.forEach(function(entry){
   var m=entry.machine,result=GRID_SPACE.check(S,m,{blueprintId:m.location.blueprintId,machines:kept});
   if(result.ok)kept.push(m);
   else if(result.code==='OCCUPIED'||result.code==='BOUNDS')recovered.push({uid:m.uid,reason:result.code});
   else throw Error('设备占地无法迁移：'+m.uid+' / '+result.code);
  });
  return {kept:kept.map(function(m){return m.uid;}),recovered:recovered};
 }
 function migrateWorkshop(S){
  var f=BLUEPRINTS.ensure(S),workshop=S.ws;
  if(root.WS&&workshop&&Array.isArray(workshop.areas)&&workshop.areas.length){
   for(var entity of f.machines){var match=/^e(\d+)$/.exec(entity.uid);if(match)f.uidSeq=Math.max(f.uidSeq||0,Number(match[1]));}
   WS.ensure(S);
   delete S.ws;
  }
  var machines=f.machines.filter(function(m){return m.location&&m.location.kind==='workshop';});
  if(!machines.length)return;
  var board=null,x=2,y=2,row=0,number=0;
  function nextBoard(){
   var name;
   do{number++;name=number===1?'旧机器区':'旧机器区 '+number;}while(f.blueprints.some(function(b){return b.name===name;}));
   board=BLUEPRINTS.add(f,name,128,128,'overworld');x=2;y=2;row=0;
  }
  for(var m of machines){
   var size=MULTIBLOCKS.bounds(m)||{w:1,h:1};
   if(size.w>124||size.h>124)throw Error('旧工坊机器尺寸超过画布：'+m.uid);
   if(!board)nextBoard();
   if(x+size.w>126){x=2;y+=row+2;row=0;}
   if(y+size.h>126)nextBoard();
   m.x=x;m.y=y;m.location={kind:'grid',blueprintId:board.id,dim:board.dimension,x:x,y:y};
   m.enabled=false;
   x+=size.w+2;row=Math.max(row,size.h);
  }
 }
 function restore(S){
  var result=plan(S);
  result.recovered.forEach(function(entry){
   var returned=ENTITIES.dismantle(S,entry.uid,{ground:true});
   if(!returned.ok)throw Error('设备回收失败：'+entry.uid+' / '+returned.code);
  });
  var f=S.fx;f.machines.forEach(function(m){if(ENTITIES.isGrid(m))m.placementShape=footprint(m);else delete m.placementShape;});
  f.layoutRevision=schema;
  return result;
 }
 root.FACTORY_LAYOUT={footprint:footprint,snapshot:snapshot,plan:plan,migrateWorkshop:migrateWorkshop,restore:restore};
})(typeof window!=='undefined'?window:globalThis);
