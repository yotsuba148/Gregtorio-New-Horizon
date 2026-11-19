/* One physical occupancy rule for previews, placement and relocation. */
(function(root){
 'use strict';
 var constraints=new Map();
 function board(S,id){var f=BLUEPRINTS.ensure(S);return f.blueprints.find(function(b){return b.id===(id||f.activeBlueprintId);});}
 function cells(m,holes,variant){return root.MULTIBLOCKS?MULTIBLOCKS.cells(m,variant,holes):[{x:m.x,y:m.y}];}
 function check(S,m,opt){
  opt=opt||{};var f=BLUEPRINTS.ensure(S),b=board(S,opt.blueprintId),all=cells(m,true,opt.variant);
  if(!b||!Number.isSafeInteger(m.x)||!Number.isSafeInteger(m.y)||all.some(function(c){return c.x<0||c.y<0||c.x>=b.width||c.y>=b.height;}))return{ok:false,code:'BOUNDS'};
   for(var test of constraints.values()){var failure=test(S,m,opt,b,all);if(failure)return failure;}
  var definition=m.k&&DEFS.of(m.k),shared=definition&&definition.sharedGridLayers||[];
  var nodes=opt.kind?[opt.kind,'chest']:BLUEPRINTS.gridLayers().filter(function(layer){return !shared.includes(layer);});
  var others=(opt.machines||f.machines).filter(function(v){return ENTITIES.isGrid(v)&&String(v.uid)!==String(opt.excludeUid)&&v.location.blueprintId===b.id;});
  var blocked=(opt.includeHoles?all:cells(m,false,opt.variant)).find(function(c){
   var k=c.x+','+c.y;
   return nodes.some(function(n){return b[n]&&b[n][k];})||others.some(function(v){
    if(opt.kind&&DEFS.of(v.k)?.sharedGridLayers?.includes(opt.kind))return false;
    return root.MULTIBLOCKS?MULTIBLOCKS.occupies(v,c.x,c.y):v.x===c.x&&v.y===c.y;
   });
  });
  return blocked?{ok:false,code:'OCCUPIED',cell:blocked}:{ok:true,blueprintId:b.id};
 }
 function move(S,uid,x,y,id,rotation){
  if(rotation!=null&&(!Number.isInteger(rotation)||rotation<0||rotation>3))return{ok:false,code:'ROTATION'};var m=ENTITIES.get(S,uid);if(!m||!ENTITIES.isGrid(m))return{ok:false,code:'NO_MACHINE'};
  var source=board(S,m.location.blueprintId),target=board(S,id||m.location.blueprintId);
  if(!source||!target||source.dimension!==target.dimension)return{ok:false,code:'DIMENSION'};
  var candidate=Object.assign({},m,{x:x,y:y,rotation:rotation==null?m.rotation||0:rotation}),r=check(S,candidate,{blueprintId:target.id,excludeUid:m.uid});if(!r.ok)return r;
  if(x===m.x&&y===m.y&&candidate.rotation===(m.rotation||0)&&r.blueprintId===m.location.blueprintId)return{ok:true,machine:m};
  // Moving is not new placement: sever old and destination contacts, never
  // apply auto-connect. Contents, batches, configurations and UID stay intact.
  ENTITIES.detach(S,m);
  cells(candidate).forEach(function(c){PIPE_CONNECTIONS.prepare(S,c.x+','+c.y,r.blueprintId);PIPE_CONNECTIONS.detach(S,c.x+','+c.y,null,r.blueprintId);});
  m.x=x;m.y=y;m.rotation=candidate.rotation;m.location=Object.assign({},m.location,{x:x,y:y,blueprintId:r.blueprintId,dim:target.dimension});
  return{ok:true,machine:m};
 }
 function validateSaved(S){
  var f=BLUEPRINTS.ensure(S),uids=new Set();
  f.machines.forEach(function(m){
   if(!m.uid||uids.has(String(m.uid)))throw Error('设备标识重复或缺失：'+m.uid);uids.add(String(m.uid));
   if(!ENTITIES.isGrid(m))return;
   var result=check(S,m,{blueprintId:m.location.blueprintId,excludeUid:m.uid});
   if(!result.ok)throw Error('设备位置冲突：'+m.uid+' / '+result.code);
  });
 }
 root.GRID_SPACE={validateSaved:validateSaved,check:check,move:move,cells:cells,board:board,registerConstraint:function(id,test){if(constraints.has(id)||typeof test!=='function')throw Error('Duplicate grid constraint '+id);constraints.set(id,test);}};
})(typeof window!=='undefined'?window:globalThis);
