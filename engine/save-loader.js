/* A candidate owns all conversion writes until the complete load succeeds. */
(function(root){
 'use strict';
 function prepare(parsed,defaults){
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||!Array.isArray(parsed.inv))throw Error('存档格式无效');
  var schema=parsed.schema==null?0:parsed.schema;
  if(!Number.isSafeInteger(schema)||schema<0||schema>ENGINE.schema)throw Error('存档版本不受支持');
  var next=Object.assign(JSON.parse(JSON.stringify(defaults||{})),JSON.parse(JSON.stringify(parsed)));
  ['schema','clock','savedAt','dbg','pendingMs','offlineMs','developerTicks'].forEach(function(k){delete next[k];});
  if(!next.fx)next.fx={machines:[]};if(!next.fx.machines)next.fx.machines=[];
  DEVELOPER_MODE.restore(next);
  DEVELOPER_MODE.normal(next,function(){ENGINE.migrate(next,parsed);SAVE_MIGRATIONS.restore(next);SAVE_MIGRATIONS.validate(next);});
  return next;
 }
 function commit(state,candidate){
  Object.keys(state).forEach(function(k){delete state[k];});Object.assign(state,candidate);
  DEVELOPER_MODE.restore(state);ENGINE.state=state;
  return state;
 }
 function validate(parsed,defaults){
  var state=ENGINE.state,tick=ENGINE.tick;
  try{prepare(parsed,defaults);}finally{ENGINE.state=state;ENGINE.tick=tick;}
 }
 root.SAVE_LOADER={prepare:prepare,commit:commit,validate:validate};
})(typeof window!=='undefined'?window:globalThis);
