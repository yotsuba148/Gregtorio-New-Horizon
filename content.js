/* Runtime content registry. Generated source data and hand-authored additions use this API. */
(function (root) {
  'use strict';
  var CATEGORY_MAP = {
    e_oven:'gt.recipe.e_furnace',
    amplifab: 'gt.recipe.uuamplifier', canningmachine: 'gt.recipe.canner',
    pyrolyse: 'gt.recipe.pyro', formingpress: 'gt.recipe.press',
    bender: 'gt.recipe.metalbender', cutter: 'gt.recipe.cuttingsaw', unboxinator: 'gt.recipe.unpackager',
    electromagneticseparator: 'gt.recipe.electromagneticseparator'
  };

  function Registry(data) {
    this.data = data || {items:[],fluids:[],maps:{},crafting:[],furnace:[],containers:[],ingredientGroups:[],ore:{},equivalences:{}};
    this.items = Object.create(null);
    this.rawItems = Object.create(null);
    this.itemAliases = Object.create(null);
    this.fluidAliases = Object.assign(Object.create(null),this.data.idleFluidAliases||{});
    this.fluids = (this.data.fluids||[]).filter(function(f){return !this.fluidAliases[f.id];},this);
    this.itemIndices = Object.create(null);
    this.byBase = Object.create(null);
    this.byRawId=Object.create(null);
    this.wildcardMembers=new Map();
    this.itemRevision=0;
    this.maps = Object.create(null);
    this.availableMaps = Object.create(null);
    this.recipeById = Object.create(null);
    this.inputIndices = Object.create(null);
    this.circuitInputs = Object.create(null);
    this.outputIndex = null;
    this.craftCache = Object.create(null);
    this.extraStationCrafting = [];
    this.craftGroupCache = Object.create(null);
    this.ingredientAlternatives = Object.create(null);
    this.customRecipes = [];
    this.dynamicFamilies = Object.create(null);
    this.itemFamilies = new Map();
    this.aliases=Object.assign({},CATEGORY_MAP);
    var self = this;
    this.data.items.forEach(function (item,i) {
      self.rawItems[item.k] = item;
      self.itemIndices[item.k] = i;
      (self.byBase[item.base] || (self.byBase[item.base]=[])).push(item.k);
      (self.byRawId[item.id] || (self.byRawId[item.id]=[])).push(item.k);
    });
    var forms=Object.create(null);
    this.data.items.forEach(function(item,i){
      var tag=(self.data.equivalences||{})[String(i)];if(!tag||item.nbt||item.meta===32767)return;
      (forms[tag]||(forms[tag]=[])).push(item);
    });
    Object.keys(forms).forEach(function(tag){
      var group=forms[tag];group.sort(function(a,b){
        function priority(i){if(tag==='cropCotton'||tag==='seedCotton')return i.id.indexOf('Natura:')===0?0:1;return i.id.indexOf('gregtech:')===0?0:i.id.indexOf('minecraft:')===0?1:2;}
        return priority(a)-priority(b)||a.k.localeCompare(b.k);
      });
      var canonical=group[0].k;group.forEach(function(item){self.itemAliases[item.k]=canonical;});
    });
    // Same mineral/block form has one stone-host identity; raw/crushed/gravel remain distinct.
    this.data.items.forEach(function(item){if(item.id!=='gregtech:gt.blockores'||item.nbt||item.meta<1000||item.meta>=16000)return;var k=item.id+'@'+(item.meta%1000);if(self.rawItems[k])self.itemAliases[item.k]=self.itemAliases[k]||k;});
    (this.data.idleDistinctItems||[]).forEach(function(key){delete self.itemAliases[key];});
    Object.keys(this.data.idleItemAliases||{}).forEach(function(from){var to=self.data.idleItemAliases[from];if(!self.rawItems[to])return;Object.keys(self.itemAliases).forEach(function(k){if(self.itemAliases[k]===from)self.itemAliases[k]=to;});self.itemAliases[from]=to;});
    this.data.items.forEach(function(item){var k=self.canonicalKey(item.k);if(k===item.k)self.items[k]=item;});
    // Circuit items have NO_UNIFICATION in GT. Only the tier placeholder
    // requests the whole ore group; a concrete circuit keeps its own identity.
    Object.keys(this.data.ore||{}).filter(function(tag){return /^(?:circuit|rawOre)[A-Z]/.test(tag);}).forEach(function(tag){
      var keys=Array.from(new Set(self.data.ore[tag].map(function(i){return self.canonicalKey(self.data.items[i].k);})));if(keys.length<2)return;
      keys.forEach(function(k){
        if(/^circuit/.test(tag)&&!/^dreamcraft:item\.Circuit\w+@0$/.test(k))return;
        var list=self.ingredientAlternatives[k]||(self.ingredientAlternatives[k]=[]);keys.forEach(function(a){if(list.indexOf(a)<0)list.push(a);});
      });
    });
    (this.data.extensionRecipes||[]).forEach(function(r){self.registerRecipe(r);});
  }

  Registry.prototype.canonicalKey=function(key){return this.itemAliases[key]||key;};
  Registry.prototype.ingredientChoices=function(key,exact){
    key=this.canonicalKey(key);
    return !exact&&this.ingredientAlternatives[key]?this.ingredientAlternatives[key].slice():[key];
  };
  Registry.prototype.catalogItem=function(key){
    var item=this.rawItems[key];
    return !!item&&item.meta!==32767&&this.canonicalKey(key)===key&&
      !(this.data.catalogReview&&this.data.catalogReview.hidden[key]);
  };
  Registry.prototype.canonicalFluid=function(id){return this.fluidAliases[id]||id;};
  Registry.prototype.item = function (key) {
    var registered=this.items[this.canonicalKey(key)] || this.rawItems[key];
    if(registered||typeof key!=='string')return registered||null;
    var mark=key.indexOf('~');
    var resolve=mark<0?null:this.itemFamilies.get(key.slice(0,mark));
    return resolve?resolve(key):null;
  };
  Registry.prototype.baseKey = function (key) {
    var item=this.item(key);return item?item.base:String(key).split('~')[0];
  };
  Registry.prototype.maxStack = function (key) {
  if (window.GD && GD.isStackableDurable && GD.isStackableDurable(this.canonicalKey(key))) return 64;
    key=this.canonicalKey(key);
    return this.items[key]?.maxStack || (typeof key==='string'&&key.includes('~')?this.item(key)?.maxStack:0) || 64;
  };
  Registry.prototype.tag = function (key) {
    key=this.canonicalKey(key);
    var i = this.itemIndices[key];
    return i == null ? null : this.data.equivalences[String(i)] || null;
  };
  Registry.prototype.wildcardContains = function (id, key) {
    var members=this.wildcardMembers.get(id);
    if(!members){
      members=new Set((this.byRawId[id]||[]).map(this.canonicalKey.bind(this)));
      this.wildcardMembers.set(id,members);
    }
    return members.has(key);
  };
  Registry.prototype.matches = function (expected, actual, options) {
    if (typeof expected === 'object') expected = expected.k || expected.key;
    if (typeof actual === 'object') actual = actual.k || actual.key;
    var rawExpected=this.rawItems[expected];
    expected=this.canonicalKey(expected);actual=this.canonicalKey(actual);
    if (expected === actual) return true;
    var e=this.item(expected), a=this.item(actual);
    if (!e || !a) return false;
    // NBT-bearing identities remain distinct unless the ingredient explicitly permits ignoring NBT.
    if ((e.nbt || a.nbt) && !(options && options.ignoreNBT) && e.nbt!==a.nbt) return false;
    if(rawExpected&&rawExpected.meta===32767&&this.wildcardContains(rawExpected.id,actual))return true;
    if (e.id === a.id && (e.meta === 32767 || e.meta === a.meta)) return true;
    if (options && options.exact) return false;
    var et=this.tag(expected), at=this.tag(actual);
    return !!et && et === at;
  };
  Registry.prototype.ingredientMatcher = function (alternatives, ignoreNBT) {
    var self=this,revision=-1,direct,strict,loose;
    function group(){return {variants:new Set(),wildcards:new Set(),tags:new Set()};}
    function rebuild(){
      direct=new Set();strict=new Map();loose=group();
      alternatives.forEach(function(key){
        var canonical=self.canonicalKey(key),item=self.item(canonical),raw=self.rawItems[key];
        direct.add(canonical);
        if(!item)return;
        var nbt=item.nbt||'',g=loose;
        if(!ignoreNBT||!ignoreNBT(key)){
          if(!strict.has(nbt))strict.set(nbt,group());
          g=strict.get(nbt);
        }
        g.variants.add(item.id+'@'+item.meta);
        if(raw&&raw.meta===32767)g.wildcards.add(raw.id);
        var tag=self.tag(canonical);
        if(tag)g.tags.add(tag);
      });
      revision=self.itemRevision;
    }
    function accepts(g,item,key,tag){
      if(!g)return false;
      if(g.variants.has(item.id+'@'+item.meta)||g.variants.has(item.id+'@32767')||g.tags.has(tag))return true;
      for(var id of g.wildcards)if(self.wildcardContains(id,key))return true;
      return false;
    }
    return function(key){
      if(revision!==self.itemRevision)rebuild();
      var canonical=self.canonicalKey(key);
      if(direct.has(canonical))return true;
      var item=self.item(canonical);
      if(!item)return false;
      var tag=self.tag(canonical);
      return accepts(strict.get(item.nbt||''),item,canonical,tag)||accepts(loose,item,canonical,tag);
    };
  };
  Registry.prototype.mapId = function (category) {
    if(category&&(category.indexOf(':')>=0||category.indexOf('.recipe.')>=0))return category;
    if (this.data.maps[category]) return category;
    return this.aliases[category] || ('gt.recipe.'+category);
  };
  Registry.prototype.alias=function(category,map){this.aliases[category]=map;};
  Registry.prototype.hasCircuitInput=function(category){
    var map=this.mapId(category),cached=this.circuitInputs[map],revision=this.customRecipes.length;
    if(cached&&cached.revision===revision)return cached.value;
    var value=(this.data.maps[map]||[]).some(function(row){return !((row[9]||0)&35)&&(row[7]||[]).some(function(p){return p[0]==='circuit';});})||
      this.customRecipes.some(function(r){return r.map===map&&r.enabled&&!r.fake&&r.req.some(function(p){return p.circuit!=null;});});
    this.circuitInputs[map]={revision:revision,value:value};return value;
  };
  Registry.prototype.decode = function (mapId,row) {
    var self=this, flags=row[9] || 0;
    var id='gt:'+mapId+':'+row[0];
    if (this.recipeById[id]) return this.recipeById[id];
    function items(side,output) {
      return (side || []).map(function (p) {
        var item=self.data.items[p[0]];
        var key=self.canonicalKey(item.k),result={k:key,n:p[1],chance:output?(p[2]==null?10000:p[2]):undefined,slot:output?p[3]:undefined};
        if(!output){var choices=self.ingredientChoices(key,!!(flags&16));if(choices.length>1)result.alternatives=choices;}
        return result;
      });
    }
    function fluids(side) {
      return (side || []).map(function (p) {var v={f:self.canonicalFluid(self.data.fluids[p[0]].id),mb:p[1]};if(p[2]!=null)v.slot=p[2];return v;});
    }
    var cond=row[8]||{};
    var result={
      id:id, map:mapId, sourceIndex:row[0], in:items(row[1]),out:items(row[2],true),
      durationTicks:row[3],dur:row[3]/20,eut:row[4],fin:fluids(row[5]),fout:fluids(row[6]),
      req:(row[7]||[]).map(function (p) {
        return p[0]==='circuit'?{circuit:p[1]}:{k:self.canonicalKey(self.data.items[p[1]].k),n:p[2],consumed:false};
      }),
      conditions:cond,heat:cond.heat||0,cleanroom:!!cond.cleanroom,
      enabled:!(flags&1),fake:!!(flags&2),hidden:!!(flags&4),
      needsEmptyOutput:!!(flags&8),nbtSensitive:!!(flags&16),dataError:!!(flags&32),extra:row[10]||{}
    };
    this.recipeById[id]=result;
    return result;
  };
  Registry.prototype.recipes = function (category, includeUnavailable) {
    var mapId=this.mapId(category), self=this;
    if (!this.maps[mapId]) {
      this.maps[mapId]=(this.data.maps[mapId]||[]).map(function (r) {return self.decode(mapId,r);});
      this.customRecipes.forEach(function (r) {if(r.map===mapId)self.maps[mapId].push(r);});
    }
    var source=this.maps[mapId];if(includeUnavailable)return source;
    var scope=root.CONTENT_SCOPE,selected=this.availableMaps[mapId];
    if(!selected||selected.source!==source||selected.length!==source.length||selected.scope!==scope||selected.scopeVersion!==(scope&&scope.version)){
      selected=this.availableMaps[mapId]={source:source,length:source.length,scope:scope,scopeVersion:scope&&scope.version,recipes:source.filter(function(r){return r.enabled&&!r.fake&&!r.dataError&&(!scope||scope.recipeAllowed(r));})};
    }
    return selected.recipes;
  };
  Registry.prototype.removeRecipes = function(predicate) {
    var self=this,removed=[];
    Object.keys(this.data.maps).forEach(function(map){
      self.data.maps[map]=self.data.maps[map].filter(function(row){
        var recipe=self.decode(map,row);
        if(!predicate(recipe))return true;
        removed.push(recipe.id);delete self.recipeById[recipe.id];return false;
      });
    });
    this.customRecipes=this.customRecipes.filter(function(recipe){
      if(!predicate(recipe))return true;
      removed.push(recipe.id);delete self.recipeById[recipe.id];return false;
    });
    this.maps=Object.create(null);this.availableMaps=Object.create(null);this.inputIndices=Object.create(null);
    this.circuitInputs=Object.create(null);this.outputIndex=null;
    return removed;
  };
  Registry.prototype.recipe = function (id) {
    if (this.recipeById[id]) return this.recipeById[id];
    var families=this.dynamicFamilies;
    for(var map in families){var f=families[map];if(String(id).indexOf(f.idPrefix)===0)return this.resolveDynamic(map,String(id).slice(f.idPrefix.length));}
    if (String(id).indexOf('gt:')===0) {
      var end=id.lastIndexOf(':'), map=id.slice(3,end), index=+id.slice(end+1);
      var row=(this.data.maps[map]||[]).find(function(r){return r[0]===index;});
      if (row) return this.decode(map,row);
    }
    return null;
  };
  Registry.prototype.indexInputs = function (category, processing, liquidOnly) {
    var map=this.mapId(category),cached=this.inputIndices[map];
    if(cached){
      if(!processing&&cached.ingress)return cached.ingress;
      if(processing&&cached.processing)return cached.processing;
      if(processing&&liquidOnly&&cached.processingFluids)return cached.processingFluids;
    }
    var build=this.inputIndexSteps(category,processing,liquidOnly),step;
    do{step=build.next();}while(!step.done);
    return step.value;
  };
  Registry.prototype.inputIndexSteps = function* (category, processing, liquidOnly) {
    var mapId=this.mapId(category), self=this;
    var cache=this.inputIndices[mapId]||(this.inputIndices[mapId]=Object.create(null));
    var mode=processing?(liquidOnly?'processingFluids':'processing'):'ingress';
    if(processing&&liquidOnly&&cache.processing)return cache.processing;
    if(cache[mode])return cache[mode];
    var index={exact:Object.create(null),base:Object.create(null),tags:Object.create(null),wild:Object.create(null),fluids:Object.create(null),empty:[]};
    // Each recipe adds all of its entries before the next recipe is visited.
    function add(dict,key,r){var a=dict[key]||(dict[key]=[]);if(a[a.length-1]!==r)a.push(r);}
    var seen=0;
    for(var r of this.recipes(mapId)){
      if(cache[mode])return cache[mode];
      if((++seen&63)===0)yield;
      // Processing finds recipes from consumable inputs. Molds and coolant still
      // identify recipes for the inlet, where each material can arrive alone.
      var items=processing?r.in.filter(function(p){return p.n>0;}):r.in.concat((r.req||[]).filter(function(p){return !!p.k;}));
      if(!(processing?items.length:r.in.length)&&!r.fin.length)index.empty.push(r);
      if(!liquidOnly)items.forEach(function(p){
        (p.alternatives||[p.k]).forEach(function(k){
          add(index.exact,self.canonicalKey(k),r);
          if(!(p.nbtSensitive==null?r.nbtSensitive:p.nbtSensitive))add(index.base,self.baseKey(k),r);
          var tag=self.tag(k),item=self.item(k);
          if(tag)add(index.tags,tag,r);
          if(item&&item.meta===32767){add(index.wild,item.id,r);(self.byRawId[item.id]||[]).forEach(function(k){add(index.exact,self.canonicalKey(k),r);});}
        });
      });
      if(!processing||!items.length)r.fin.forEach(function(p){add(index.fluids,p.f,r);});
    }
    if(this.inputIndices[mapId]===cache)cache[mode]=index;
    return index;
  };
  Registry.prototype.prepareProcessing = async function (category, pause) {
    var map=this.mapId(category);
    if(this.inputIndices[map]?.processing)return;
    await pause();
    if(!this.maps[map]){
      var rows=this.data.maps[map]||[],deadline=performance.now()+5;
      for(var i=0;i<rows.length;i++){
        this.decode(map,rows[i]);
        if((i&63)===0&&performance.now()>=deadline){await pause();deadline=performance.now()+5;}
      }
    }
    var build=this.inputIndexSteps(map,true),step,until=performance.now()+5;
    do{
      step=build.next();
      if(!step.done&&performance.now()>=until){await pause();until=performance.now()+5;}
    }while(!step.done);
  };
  function collectCandidates(self,category,items,fluids,processing) {
    var map=self.mapId(category);
    if(self.dynamicFamilies[map])(items||[]).forEach(function(s){if(s&&s.k)self.resolveDynamic(map,s.k);});
    function hasItem(s){return !!(s&&s.k&&(!processing||s.n==null||s.n>0));}
    var idx=self.indexInputs(map,processing,processing&&!(items||[]).some(hasItem)),out=[],seen=Object.create(null);
    function add(list){(list||[]).forEach(function(r){if(!seen[r.id]){seen[r.id]=1;out.push(r);}});}
    (items||[]).forEach(function(s){
      if(!hasItem(s))return;
      s={k:self.canonicalKey(s.k)};
      add(idx.exact[s.k]);add(idx.base[self.baseKey(s.k)]);
      var tag=self.tag(s.k), item=self.item(s.k);
      if(tag)add(idx.tags[tag]);
      if(item)add(idx.wild[item.id]);
    });
    (fluids||[]).forEach(function(t){if(t&&t.f&&(!processing||t.mb>0))add(idx.fluids[self.canonicalFluid(t.f)]);});
    add(idx.empty);
    return out;
  }
  Registry.prototype.candidates = function (category,items,fluids) {
    return collectCandidates(this,category,items,fluids,false);
  };
  Registry.prototype.processingCandidates = function (category,items,fluids) {
    return collectCandidates(this,category,items,fluids,true);
  };
  Registry.prototype.registerDynamicFamily=function(category,family){
    var map=this.mapId(category);if(!family||!family.idPrefix||typeof family.resolve!=='function')throw Error('Dynamic family requires an ID prefix and resolver');
    if(this.dynamicFamilies[map])throw Error('Duplicate dynamic family '+map);
    for(var m in this.dynamicFamilies)if(this.dynamicFamilies[m].idPrefix===family.idPrefix)throw Error('Duplicate dynamic ID prefix');
    this.dynamicFamilies[map]=family;return family;
  };
  Registry.prototype.resolveDynamic=function(category,key){
    var map=this.mapId(category),family=this.dynamicFamilies[map];if(!family)return null;key=this.canonicalKey(key);
    var id=family.idPrefix+key;if(this.recipeById[id])return this.recipeById[id];
    var r=family.resolve(key,this);if(!r)return null;
    return this.registerRecipe(Object.assign({},r,{id:id,map:map}));
  };
  Registry.prototype.crafting = function (index) {
    var hit=this.craftCache[index];
    if(hit)return hit;
    var row=this.data.crafting[index];
    if(!row)return null;
    var self=this,slots=[],grid=Array(9).fill(-1),width=row[4],height=row[5];
    row[3].forEach(function(g,pos){
      if(g<0)return;
      var n=slots.length;
      var source=self.data.ingredientGroups[g],tools=root.CRAFT_TOOLS,scopeVersion=root.CONTENT_SCOPE&&CONTENT_SCOPE.version,cached=self.craftGroupCache[g];
      if(!cached||cached.source!==source||cached.length!==source.length||cached.tools!==tools||cached.scopeVersion!==scopeVersion){
        var choices=Array.from(new Set(source.map(function(i){return self.canonicalKey(self.data.items[i].k);} )));
        if(tools)choices=tools.normalize({slots:[choices]}).slots[0];
        cached=self.craftGroupCache[g]={source:source,length:source.length,tools:tools,scopeVersion:scopeVersion,choices:choices};
      }
      slots.push(cached.choices);
      if(!row[6]&&width<=3&&height<=3)grid[Math.floor(pos/width)*3+(pos%width)]=n;
    });
    var result={id:'craft:'+row[0],out:this.canonicalKey(this.data.items[row[1]].k),n:row[2],slots:slots,shapeless:row[6],width:width,height:height,flags:row[7],source:'runtime',station:(row[7]||{}).station||null};
    if(slots.length===result.n&&slots.every(function(a){return a.length===1&&a[0]===result.out;})&&
      (this.data.items[row[1]].k!==result.out||row[3].some(function(g){return g>=0&&self.data.ingredientGroups[g].some(function(i){return self.data.items[i].k!==result.out;});})))result.identityConversion=true;
    if(!result.shapeless)result.grid=grid;
    this.craftCache[index]=result;
    return result;
  };
  Registry.prototype.buildOutputIndex = function () {
    if(this.outputIndex)return this.outputIndex;
    var idx=Object.create(null), self=this;
    function add(key,entry){key=self.canonicalKey(key);(idx[key]||(idx[key]=[])).push(entry);}
    Object.keys(this.data.maps).forEach(function(map){
      self.data.maps[map].forEach(function(row,pos){
        if((row[9]||0)&35)return;
        (row[2]||[]).forEach(function(p){add(self.data.items[p[0]].k,{kind:'machine',map:map,index:pos});});
      });
    });
    this.data.crafting.forEach(function(row,i){add(self.data.items[row[1]].k,{kind:'craft',index:i});});
    this.extraStationCrafting.forEach(function(recipe){add(recipe.out,{kind:'craft',recipe:recipe});});
    this.data.furnace.forEach(function(row,i){add(self.data.items[row[1]].k,{kind:'furnace',index:i});});
    this.customRecipes.forEach(function(r){r.out.forEach(function(p){add(p.k,{kind:'custom',id:r.id});});});
    this.outputIndex=idx;
    return idx;
  };
  // Publish once after recipe-data writers finish. Native rows, the legacy UI
  // and direct/AE queries then share the same decoded recipe objects.
  Registry.prototype.refreshCrafting = function (GD) {
    var self=this,prior=new Map(),nativeIds=new Set(this.data.crafting.map(function(row){return 'craft:'+row[0];})),extras=[],seen=new Set();
    (GD.craft||[]).forEach(function(r){
      if(nativeIds.has(r.id))prior.set(r.id,r);
      else if(!r.identityConversion){var key=r.id||r;if(!seen.has(key)){seen.add(key);extras.push(r);}}
    });
    this.craftCache=Object.create(null);
    this.craftGroupCache=Object.create(null);
    var published=this.data.crafting.map(function(_,i){
      var fresh=self.crafting(i),r=prior.get(fresh.id);
      if(!r)return fresh;
      delete r.grid;delete r.identityConversion;
      Object.assign(r,fresh);self.craftCache[i]=r;return r;
    }).concat(extras),tools=root.CRAFT_TOOLS,scope=root.CONTENT_SCOPE,signatures=new Set(),groupSpecs=new WeakMap();
    function specOf(a){if(!groupSpecs.has(a))groupSpecs.set(a,tools.spec(a));return groupSpecs.get(a);}
    this.extraStationCrafting=[];
    GD.craft=published.filter(function(r){
      if(r.identityConversion||scope&&!scope.recipeAllowed(r))return false;
      var signature=tools&&tools.signature(r,specOf);
      if(signature){if(signatures.has(signature))return false;signatures.add(signature);}
      if(r.station&&!nativeIds.has(r.id))self.extraStationCrafting.push(r);
      return true;
    });
    this.outputIndex=null;
    return GD.craft;
  };
  // A controller may implement a native display-only map. Publish that change
  // to both decoded recipes and the indices built from native records.
  Registry.prototype.makeMapExecutable = function(map) {
    var rows=this.data.maps[map];if(!rows)throw Error('Unknown recipe map '+map);
    rows.forEach(function(row){row[9]=(row[9]||0)&~2;});
    this.recipes(map,true).forEach(function(r){r.fake=false;});
    delete this.availableMaps[map];delete this.inputIndices[map];this.outputIndex=null;
  };
  Registry.prototype.producing = function (key) {
    var self=this;
    key=this.canonicalKey(key);
    return (this.buildOutputIndex()[key]||[]).map(function(x){
      if(x.kind==='machine')return {kind:x.kind,recipe:self.decode(x.map,self.data.maps[x.map][x.index])};
      if(x.kind==='craft')return {kind:x.kind,recipe:x.recipe||self.crafting(x.index)};
      if(x.kind==='custom')return {kind:'machine',recipe:self.recipe(x.id)};
      var row=self.data.furnace[x.index];
      return {kind:'furnace',recipe:{id:'furnace:'+x.index,input:self.data.items[row[0]].k,out:self.data.items[row[1]].k,n:row[2]}};
    }).filter(function(entry){return !entry.recipe.identityConversion;});
  };
  Registry.prototype.registerItemFamily = function(base, resolve){
    if(!this.item(base)||typeof resolve!=='function'||this.itemFamilies.has(base))throw Error('Invalid item family: '+base);
    this.itemFamilies.set(base,resolve);
  };
  Registry.prototype.registerItem = function(item){
    if(!item||!item.k||!item.base||!item.id||!Number.isInteger(item.meta)||!Number.isSafeInteger(item.maxStack)||item.maxStack<1)throw Error('Invalid item registration');
    if(this.rawItems[item.k])return this.rawItems[item.k];
    var index=this.data.items.length;this.data.items.push(item);this.rawItems[item.k]=item;this.items[item.k]=item;this.itemIndices[item.k]=index;
    (this.byBase[item.base]||(this.byBase[item.base]=[])).push(item.k);(this.byRawId[item.id]||(this.byRawId[item.id]=[])).push(item.k);
    this.wildcardMembers.delete(item.id);
    this.itemRevision++;
    if(root.GD&&GD.items)GD.items[item.k]=item.name;return item;
  };
  Registry.prototype.registerRecipe = function (definition) {
    if(!definition||!definition.id||!definition.map||!Array.isArray(definition.in)||!Array.isArray(definition.out))throw new Error('Invalid recipe definition');
    if(this.recipeById[definition.id])throw new Error('Duplicate recipe ID '+definition.id);
    var r=Object.assign({enabled:true,fake:false,fin:[],fout:[],req:[],conditions:{},eut:0,durationTicks:1},definition);
    ['in','out','req'].forEach(function(side){r[side]=r[side].map(function(p){var q=Object.assign({},p);if(q.k)q.k=this.canonicalKey(q.k);if(q.alternatives)q.alternatives=Array.from(new Set(q.alternatives.map(this.canonicalKey.bind(this))));return q;},this);},this);
    ['fin','fout'].forEach(function(side){r[side]=r[side].map(function(p){return Object.assign({},p,{f:this.canonicalFluid(p.f)});},this);},this);
    if(r.costs&&r.costs.work&&r.costs.work.rf!=null){
      r.workEnergyEU={numerator:r.costs.work.rf*100,denominator:360};
      r.eut=Math.ceil(r.workEnergyEU.numerator/(360*(r.workIntervalTicks||1)));
      r.costs=JSON.parse(JSON.stringify(r.costs));delete r.costs.work.rf;
    }
    r.dur=r.durationTicks/20;
    this.customRecipes.push(r);this.recipeById[r.id]=r;
    if(this.maps[r.map])this.maps[r.map].push(r);
    delete this.availableMaps[r.map];delete this.inputIndices[r.map];this.outputIndex=null;
    return r;
  };
  Registry.prototype.installLegacy = function (GD) {
    var self=this;
    GD.items=GD.items||{};
    var priorNames=Object.assign({},GD.items);
    this.data.items.forEach(function(item){var k=self.canonicalKey(item.k),name=(self.items[k]||item).name;
      if(/[\u3400-\u9fff]/.test(priorNames[k]||''))name=priorNames[k];
      else if(/[\u3400-\u9fff]/.test(priorNames[item.k]||''))name=priorNames[item.k];
      if(!/[\u3400-\u9fff]/.test(GD.items[k]||'')||/[\u3400-\u9fff]/.test(name))GD.items[k]=name;
    });
    // An alias image may fill a missing icon, but must not outrank the
    // canonical item's own atlas tile (e.g. bamboo aliased to wooden sticks).
    var ownAtlasIcons=new Set(Object.keys(GD.icons||{}));
    Object.keys(this.itemAliases).forEach(function(k){var target=self.itemAliases[k];if(k===target)return;delete GD.items[k];if(GD.icons&&!GD.icons[target]&&GD.icons[k])GD.icons[target]=GD.icons[k];if(GD.modIcons&&!GD.modIcons[target]&&!ownAtlasIcons.has(target)&&GD.modIcons[k])GD.modIcons[target]=GD.modIcons[k];});
    GD.mrecipes={n:Object.fromEntries(Object.values(this.items).map(function(i){return[i.k,i.name];})),p:[],f:[],r:{}};
    GD.craft=this.data.crafting.map(function(_,i){return self.crafting(i);}).filter(function(r){return !r.identityConversion;});
    GD.furnace=this.data.furnace.map(function(row){return {in:self.canonicalKey(self.data.items[row[0]].k),out:self.canonicalKey(self.data.items[row[1]].k),n:row[2]};});
    var catalog=new Set((GD.catalog||[]).map(this.canonicalKey.bind(this)));
    Object.keys(this.buildOutputIndex()).forEach(function(key){if(self.item(key).meta!==32767)catalog.add(key);});
    GD.catalog=Array.from(catalog).filter(this.catalogItem.bind(this));
    GD.containerRegistry=this.data.containers.map(function(row){return {empty:self.canonicalKey(self.data.items[row[0]].k),filled:self.canonicalKey(self.data.items[row[1]].k),fluid:self.canonicalFluid(self.data.fluids[row[2]].id),amount:row[3]};});
    function rewrite(value){if(Array.isArray(value))return value.map(rewrite);if(value&&typeof value==='object'){var o={};Object.keys(value).forEach(function(k){o[k]=rewrite(value[k]);});return o;}return typeof value==='string'?self.canonicalKey(value):value;}
    ['sources','veins','pin'].forEach(function(k){if(GD[k])GD[k]=rewrite(GD[k]);});
    (GD.quests||[]).forEach(function(q){(q.items||[]).forEach(function(p){var k=self.canonicalKey(p[0]+'@'+p[1]),item=self.item(k);if(item){p[0]=item.id;p[1]=item.meta;}});});
  };


  // Import aliases are accepted at boundaries; saved game items have one public identity.
  Registry.prototype.normalizeState=function(state,options){
    var self=this,merged=0;
    function compact(a){
      var out=Array(a.length).fill(null);
      a.forEach(function(s){
        if(!s)return;
        if(!s.k||!(s.n>0)||Object.keys(s).some(function(k){return k!=='k'&&k!=='n';})){
          var pos=out.findIndex(function(v){return !v;});out[pos<0?out.length:pos]=s;return;
        }
        var left=s.n,cap=self.maxStack(s.k);
        for(var i=0;i<out.length&&left;i++){var t=out[i];if(t&&t.k===s.k&&Object.keys(t).length===2&&t.n<cap){var n=Math.min(left,cap-t.n);t.n+=n;left-=n;}}
        while(left){var at=out.findIndex(function(v){return !v;});if(at<0)at=out.length;var n=Math.min(left,cap);out[at]={k:s.k,n:n};left-=n;}
      });return out;
    }
    function visit(value,field){
      if(typeof value==='string'){var k=self.canonicalFluid(self.canonicalKey(value));if(k!==value)merged++;return k;}
      if(!value||typeof value!=='object')return value;
      if(Array.isArray(value)){
        var a=value.map(function(v){return visit(v,'');});
        if(!(options&&options.preserveSlots)&&['inv','slots','ins','outs'].indexOf(field)>=0&&a.every(function(s){return !s||(typeof s==='object'&&s.k);})){
          a=compact(a);if(field==='ins'||field==='outs')a=a.filter(Boolean);
        }return a;
      }
      var definition=value.k&&root.DEFS&&root.DEFS.of(self.canonicalKey(value.k)),fixed=definition&&definition.preserveItemSlots;
      var out={};Object.keys(value).forEach(function(k){var key=self.canonicalFluid(self.canonicalKey(k)),v=visit(value[k],field==='workbench'&&k==='slots'?'workbenchSlots':k==='ins'&&(fixed||value.workstation||value.smelterySchema||value.castingSchema||value.furnace)?'fixedInputs':k==='outs'&&(fixed||value.castingSchema)?'castingOutputs':k);if(key!==k)merged++;
        if(Object.prototype.hasOwnProperty.call(out,key)&&typeof v==='number'&&typeof out[key]==='number')out[key]+=v;else out[key]=v;
      });return out;
    }
    var normalized=visit(state,'');Object.keys(state).forEach(function(k){delete state[k];});Object.assign(state,normalized);
    state.itemIdentitySchema=1;return{aliasesRewritten:merged};
  };
  root.ContentRegistry=Registry;
  if(root.GD&&root.GD.contentData)root.CONTENT=new Registry(root.GD.contentData);
  if(typeof module==='object'&&module.exports)module.exports=Registry;
})(typeof window!=='undefined'?window:globalThis);
