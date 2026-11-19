(function (root) {
  'use strict';
  const rowHeight = 38;
  const layouts = new Map();
  const labels = {done:'已完成', can:'待确认', now:'进行中', lock:'未解锁'};
  const symbols = {done:'✓', can:'!', now:'○', lock:'–'};
  let indexSource, searchIndex, successors;

  function index() {
    if (indexSource === GD.quests && searchIndex?.length === GD.quests.length) return;
    indexSource = GD.quests;
    layouts.clear();
    successors = new Map(GD.quests.map(q => [q.id, []]));
    searchIndex = GD.quests.map(q => {
      const rule = QUESTS.rule(q);
      for (const pre of rule.pre) successors.get(pre)?.push(q);
      return {
        q,
        name: SEARCH_TEXT.index(q.name),
        title: q.name.toLowerCase(),
        pinyin: SEARCH_TEXT.expand(q.name),
        id: String(q.id),
        description: String(q.desc || '').toLowerCase(),
        materials: rule.groups.flatMap(group => [
          SEARCH_TEXT.index(group.label),
          ...(group.items||[]).map(item => {
            const key = CONTENT.canonicalKey(item.k);
            return SEARCH_TEXT.index(QUESTS.label(item)||GD.items[key]||CONTENT.item(key)?.name);
          })
        ])
      };
    });
  }

  function search(query, chapter, states) {
    index();
    const words = SEARCH_TEXT.words(query);
    if (!words.length) return [];
    if (words.length === 1 && words[0].length > 1 && '@complete'.startsWith(words[0])) {
      return searchIndex.filter(entry => states[entry.q.id]?.can).map(entry => entry.q);
    }
    return searchIndex.flatMap(entry => {
      let score = 0;
      for (const word of words) {
        const term = entry.title.startsWith(word)||entry.pinyin.startsWith(word) ? 7 :
          SEARCH_TEXT.matches(entry.name,[word]) ? 6 :
          entry.id === word.replace(/^#/,'') ? 5 :
          entry.materials.some(name => SEARCH_TEXT.matches(name,[word])) ? 3 :
          entry.description.includes(word) ? 1 : 0;
        if (!term) return [];
        score += term;
      }
      return [{q:entry.q, score}];
    }).sort((a,b) => b.score-a.score || Number(b.q.chap===chapter)-Number(a.q.chap===chapter)).map(entry => entry.q);
  }

  function layout(chapter, entries) {
    index();
    if (layouts.has(chapter)) return layouts.get(chapter);
    const ids = new Set(entries.map(q => q.id));
    const local = new Map(entries.map(q => [q.id, QUESTS.rule(q).pre.filter(id => ids.has(id))]));
    const roots = entries.filter(q => !local.get(q.id).length);
    const first = (roots.find(q => /第[\d.]+阶段/.test(q.name)) || roots[0] || entries[0]).id;
    const ranks = new Map(), visiting = new Set();
    function rank(id) {
      if (ranks.has(id)) return ranks.get(id);
      visiting.add(id);
      // The reciprocal alternative on the two Smeltery quests stays an extra link.
      const candidates = local.get(id).filter(pre => !visiting.has(pre)).map(pre => ({...rank(pre), pre}));
      candidates.sort((a,b) => Number(b.main)-Number(a.main) || b.depth-a.depth);
      const best = candidates[0];
      const value = {main:id===first || !!best?.main, depth:best ? best.depth+1 : 0, parent:best?.pre};
      ranks.set(id,value);
      visiting.delete(id);
      return value;
    }
    const children = new Map(entries.map(q => [q.id, []]));
    const extra = [];
    for (const q of entries) {
      const {parent} = rank(q.id);
      if (parent != null) children.get(parent).push(q.id);
      for (const pre of local.get(q.id)) if (pre !== parent) extra.push({from:pre,to:q.id});
    }
    const starts = entries.map(q => q.id).filter(id => ranks.get(id).parent == null);
    function size(id) {
      return 1 + children.get(id).reduce((total, child) => total+size(child),0);
    }
    starts.sort((a,b) => Number(b===first)-Number(a===first) || size(b)-size(a));
    const pins = new Set(starts), rows = new Map();
    let y = 22, maxLevel = 1;
    function place(id, level) {
      rows.set(id,{level,y});
      maxLevel = Math.max(maxLevel,level);
      y += rowHeight;
      const next = children.get(id);
      if (next.length>1) next.forEach(child => pins.add(child));
      for (const child of next) {
        if (id===first) y += 5;
        place(child,level+(next.length>1?1:0));
      }
    }
    for (const id of starts) { place(id,0); y+=11; }
    for (const link of extra) if (link.from===first) pins.add(link.to);
    const step = Math.min(23,Math.floor(105/maxLevel));
    for (const row of rows.values()) row.x = 21+row.level*step;
    const graph = {rows, children, ranks, extra, height:y, pins:[...rows.keys()].filter(id => pins.has(id))};
    layouts.set(chapter,graph);
    return graph;
  }

  function edges(graph, selected) {
    const route = new Set();
    for (let id=selected; graph.rows.has(id); id=graph.ranks.get(id).parent) route.add(id);
    const out = [];
    function line(from,to,d,cross=false) {
      const direct = from===selected || to===selected;
      const active = direct || !cross && route.has(from) && (to==null || route.has(to));
      out.push('<path class="quest-tree-edge'+(cross?' cross':'')+(active?' linked':'')+'" data-from="'+from+'"'+(to==null?'':' data-to="'+to+'"')+' d="'+d+'"/>');
    }
    for (const [from, next] of graph.children) {
      const a = graph.rows.get(from);
      if (next.length===1) line(from,next[0],'M'+a.x+' '+(a.y+14)+'V'+(graph.rows.get(next[0]).y-14));
      if (next.length<2) continue;
      line(from,null,'M'+a.x+' '+(a.y+14)+'V'+graph.rows.get(next.at(-1)).y);
      for (const to of next) {
        const b = graph.rows.get(to);
        line(from,to,'M'+a.x+' '+b.y+'H'+(b.x-14));
      }
    }
    let lane=0;
    for (const {from,to} of graph.extra) {
      if (from!==selected && to!==selected) continue;
      const a=graph.rows.get(from), b=graph.rows.get(to), rail=18-lane++%4*4;
      line(from,to,'M1 '+a.y+'H'+rail+'V'+b.y+'H1',true);
    }
    return out.join('');
  }

  function html(graph, byId, states, selected, icon, escape) {
    const lines=edges(graph,selected);
    const nodes=[...graph.rows].map(([id,{x,y}]) => {
      const q=byId.get(id), kind=states[id].kind;
      return '<button type="button" class="q quest-node '+kind+(id===selected?' jump-target':'')+'" data-quest="'+id+'" data-ui-key="quest:'+id+'" style="left:'+(x-15)+'px;top:'+y+'px" aria-label="'+escape(q.name+'，'+labels[kind])+'">'+
        '<span class="quest-node-icon">'+icon(q,24)+'</span><span class="qname">'+escape(q.name)+'</span><span class="quest-node-status" title="'+labels[kind]+'">'+symbols[kind]+'</span></button>';
    }).join('');
    const svg = (cls, paths) => '<svg class="quest-tree-lines '+cls+'" aria-hidden="true">'+paths+'</svg>';
    // Separate the right edge gutter so scaling never distorts the branch lines.
    const edgeParts = lines.split(/(?=<path)/);
    return '<div class="quest-tree-world" style="height:'+graph.height+'px">'+
      svg('',edgeParts.filter(line=>!line.includes(' cross')).join(''))+
      svg('quest-cross-lines',edgeParts.filter(line=>line.includes(' cross')).join(''))+nodes+'</div>';
  }

  function pinPositions(graph, scroll, height) {
    const pins = graph.pins.map(id => ({id,y:graph.rows.get(id).y-scroll}));
    const top = pins.some(pin=>pin.y<13) ? 43 : 13;
    const bottom = height-(pins.some(pin=>pin.y>height-13)?43:13);
    return {
      above:pins.filter(pin=>pin.y<top),
      below:pins.filter(pin=>pin.y>bottom),
      visible:pins.filter(pin=>pin.y>=top && pin.y<=bottom)
    };
  }
  root.QUEST_TREE = {layout, html, search, pinPositions, following(id) { index(); return successors.get(id)||[]; }, labels};
})(window);
