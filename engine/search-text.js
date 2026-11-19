(function(root){
 'use strict';
 var records=new Map(),namesCache=new Map(),phrases={'模具':['mu','ju'],'模板':['mu','ban'],'模头':['mu','tou']};
 function syllables(name){var map=GD.searchPinyin?.chars||{},chars=Array.from(String(name||'').toLowerCase()),out=[];for(var i=0;i<chars.length;i++){var phrase=chars[i]+(chars[i+1]||''),reading=phrases[phrase];if(reading){out.push({c:chars[i],p:reading[0]},{c:chars[++i],p:reading[1]});}else out.push({c:chars[i],p:map[chars[i]]||chars[i]});}return out;}
 function expand(name){var parts=syllables(name);return parts.map(function(t){return t.p;}).join('')+' '+parts.map(function(t){return t.p[0];}).join('');}
 // Only visible names and explicit name synonyms belong in the search index.
 // Raw registry keys, NBT, original records and legacy pin strings are not names.
 function index(name,original,key){var aliases=GD.itemSearchAliases?.[key]||'',names=(String(name||'').replace(/§[0-9a-fk-or]/gi,'')+' '+aliases).toLowerCase(),cached=namesCache.get(names);if(cached)return cached;var parts=syllables(names),text=names+' '+parts.map(function(t){return t.p;}).join('')+' '+parts.map(function(t){return t.p[0];}).join('');if(!records.has(text))records.set(text,{tokens:parts,starts:new Set(parts.flatMap(function(t){return[t.c,t.p[0]];}))});namesCache.set(names,text);return text;}
 function words(query){return String(query||'').toLowerCase().trim().split(/\s+/).filter(Boolean);}
 function mixed(tokens,term){var positions=new Set();for(var token of tokens){positions.add(0);var next=new Set();for(var pos of positions){for(var part of [token.c,token.p,token.p[0]]){if(term.startsWith(part,pos)){var end=pos+part.length;if(end===term.length)return true;next.add(end);}else if(part.startsWith(term.slice(pos)))return true;}}positions=next;}return false;}
 function matches(text,query){return (Array.isArray(query)?query:words(query)).every(function(term){if(text.includes(term))return true;var r=records.get(text);return !!r&&r.starts.has(term[0])&&mixed(r.tokens,term);});}
 root.SEARCH_TEXT={expand:expand,index:index,words:words,matches:matches};
})(typeof window!=='undefined'?window:globalThis);
