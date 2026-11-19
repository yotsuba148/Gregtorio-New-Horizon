(function (root) {
  'use strict';
  const columns=12,rows=6,detail={column:9,columns:3,rows:3};
  const cells=[],indices=new Map();
  for(let y=0;y<rows;y++) for(let x=0;x<columns;x++){
    if(y<detail.rows&&x>=detail.column)continue;
    indices.set(y*columns+x,cells.length);
    cells.push({x,y});
  }
  function index(x,y) {
    return x>=0&&x<columns&&y>=0&&y<rows?indices.get(y*columns+x):undefined;
  }
  const neighbors=cells.map(({x,y})=>[index(x,y-1),index(x+1,y),index(x,y+1),index(x-1,y)].filter(i=>i!==undefined));

  function field(seq,name) {
    return {id:'field-'+seq,name,plots:Array(cells.length).fill(null),
      cycle:((seq-1)*41)%256,random:(0x1a6f42de^Math.imul(seq-1,0x9e3779b9))>>>0};
  }
  function fresh() {
    const first=field(1,'田地 1');
    return {fields:[first],activeId:first.id,nextId:2};
  }
  function ensure(S) {
    if(!S.farm){
      S.farm=fresh();
      (S.saveFormats||(S.saveFormats={})).cropsnh=steps.length;
    }
    return S.farm;
  }
  function list(S) { return ensure(S).fields; }
  function get(S,id) { return list(S).find(f=>f.id===id); }
  function active(S) { return get(S,ensure(S).activeId); }
  function defaultName(S) { return '田地 '+ensure(S).nextId; }
  function cleanName(name) { return String(name??'').trim().slice(0,48); }
  function create(S,name) {
    const store=ensure(S),seq=store.nextId++;
    const created=field(seq,cleanName(name)||'田地 '+seq);
    store.fields.push(created);
    store.activeId=created.id;
    return created;
  }
  function select(S,id) {
    const target=get(S,id);
    if(target)ensure(S).activeId=target.id;
    return target;
  }
  function rename(S,id,name) {
    const target=get(S,id),label=cleanName(name);
    if(!target||!label||target.name===label)return false;
    target.name=label;
    return true;
  }
  function managedBy(S,uid) { return list(S).find(f=>f.managerUid===uid); }
  function bind(S,id,uid) {
    const target=get(S,id);
    if(!target)return false;
    const prior=managedBy(S,uid);
    if(prior)delete prior.managerUid;
    if(prior!==target)target.managerUid=uid;
    return true;
  }
  function migrateFields(S) {
    const legacy=S.farm;
    if(legacy?.fields)return;
    const store=fresh(),first=store.fields[0];
    if(legacy){
      if(!Array.isArray(legacy.plots)||legacy.plots.length!==30)throw Error('旧农业地块格式无效');
      legacy.plots.forEach((plot,pos)=>{first.plots[index(pos%5,Math.floor(pos/5))]=plot;});
      first.cycle=legacy.cycle;
      first.random=legacy.random;
      if(legacy.managerUid!=null)first.managerUid=legacy.managerUid;
    }
    S.farm=store;
  }
  function validate(S) {
    const store=ensure(S);
    if(!Array.isArray(store.fields)||!Number.isSafeInteger(store.nextId)||store.nextId<2)throw Error('田地存档格式无效');
    const ids=new Set(),managers=new Set();
    for(const f of store.fields){
      const index=typeof f?.id==='string'&&/^field-([1-9]\d*)$/.exec(f.id);
      if(!index||Number(index[1])>=store.nextId||ids.has(f.id)||!f.name||f.name!==cleanName(f.name)||
         !Array.isArray(f.plots)||f.plots.length!==cells.length||
         !Number.isInteger(f.cycle)||f.cycle<0||f.cycle>=256||
         !Number.isInteger(f.random)||f.random<0||f.random>0xffffffff)throw Error('田地存档格式无效');
      ids.add(f.id);
      if(f.managerUid!=null){
        if(managers.has(f.managerUid))throw Error('作物管理机绑定了多块田地');
        managers.add(f.managerUid);
      }
      for(const p of f.plots){
        if(!p)continue;
        if(!Number.isInteger(p.rack)||p.rack<0||p.rack>2||
           p.seed&&(!p.rack||!CROP_SEEDS.decode(CROP_SEEDS.encode(p.seed)))||
           !Number.isFinite(p.points)||p.points<0)throw Error('作物地块存档格式无效');
      }
    }
    if(!ids.has(store.activeId))throw Error('当前田地不存在');
  }
  const steps=[function (S) {
    const farm=S.farm;
    const singleField=Array.isArray(farm?.plots)&&farm.plots.length===30&&
      Number.isInteger(farm.cycle)&&Number.isInteger(farm.random);
    if(!farm?.fields&&!singleField)S.farm=fresh();
    delete S.forestry;
    ACTION_QUEUE.removeWhere(S,a=>a.src==='tree_chop'||a.src==='tree_tap');
  },migrateFields];
  SAVE_MIGRATIONS.register('cropsnh',{steps,validate});
  STATE_SCHEMA.register('farming',['farm']);
  root.FARM_FIELDS={cells,columns,rows,detail,neighbors,list,active,get,create,select,rename,defaultName,managedBy,bind};
})(typeof window!=='undefined'?window:globalThis);
