(function(root){
  'use strict';
  function clone(x){return x==null?x:JSON.parse(JSON.stringify(x));}
  function count(s){return s?(s.n==null?1:s.n):0;}
  function positive(n){return Number.isSafeInteger(n)&&n>0;}
  function isInstance(s){return !!s&&(s.n==null||Object.keys(s).some(function(k){return k!=='k'&&k!=='n'&&k!=='chance'&&k!=='slot';}));}

  // Integer maximum flow allocates overlapping alternatives without greedy double use.
  function planIngredients(stacks, requirements, matches, preserveSlots, checkOnly){
    var needs=requirements.filter(function(r){return r.n>0;});
    if(needs.some(function(r){return !positive(r.n);}))return null;
    var source=0, firstStack=1, firstNeed=firstStack+stacks.length, sink=firstNeed+needs.length;
    var graph=Array.from({length:sink+1},function(){return[];});
    function edge(a,b,cap){var x={to:b,cap:cap,initial:cap,rev:graph[b].length};var y={to:a,cap:0,initial:0,rev:graph[a].length};graph[a].push(x);graph[b].push(y);return x;}
    var links=[];
    stacks.forEach(function(s,i){if(s&&count(s)>0)edge(source,firstStack+i,count(s));});
    needs.forEach(function(r,j){
      edge(firstNeed+j,sink,r.n);
      stacks.forEach(function(s,i){
        if(!s||!matches(r,s))return;
        var link=edge(firstStack+i,firstNeed+j,r.n);
        if(!checkOnly)links.push({i:i,j:j,edge:link});
      });
    });
    var total=needs.reduce(function(n,r){return n+r.n;},0),flow=0;
    while(flow<total){
      var previous=Array(sink+1).fill(null),queue=[source];previous[source]={node:-1};
      for(var qi=0;qi<queue.length&&!previous[sink];qi++){
        var node=queue[qi];
        for(var e=0;e<graph[node].length;e++){
          var link=graph[node][e];
          if(link.cap>0&&!previous[link.to]){previous[link.to]={node:node,index:e};queue.push(link.to);}
        }
      }
      if(!previous[sink])return null;
      var amount=total-flow;
      for(var at=sink;at!==source;at=previous[at].node){var p=previous[at];amount=Math.min(amount,graph[p.node][p.index].cap);}
      for(var at2=sink;at2!==source;at2=previous[at2].node){var p2=previous[at2],ed=graph[p2.node][p2.index];ed.cap-=amount;graph[at2][ed.rev].cap+=amount;}
      flow+=amount;
    }
    if(checkOnly)return true;
    var consumedBySlot=Array(stacks.length).fill(0),allocations=[];
    links.forEach(function(l){
      var used=l.edge.initial-l.edge.cap;
      if(!used)return;
      allocations.push({slot:l.i,requirement:l.j,n:used,consumed:needs[l.j].consumed!==false});
      if(needs[l.j].consumed!==false)consumedBySlot[l.i]+=used;
    });
    var remaining=preserveSlots?Array(stacks.length).fill(null):[],consumed=[];
    stacks.forEach(function(s,i){
      if(!s)return;
      var n=count(s),take=consumedBySlot[i];
      if(take){var item=clone(s);item.n=take;consumed.push(item);}
      if(n>take){var rest=clone(s);if(rest.n!=null)rest.n=n-take;if(preserveSlots)remaining[i]=rest;else remaining.push(rest);}
    });
    return {remaining:remaining,consumed:consumed,allocations:allocations};
  }

  function planOutput(existing, additions, limit, maxStack, preserveSlots, voidExcess){
    var out=clone(preserveSlots?existing:existing.filter(function(s){return s&&count(s)>0;}));if(preserveSlots)while(out.length<limit)out.push(null);
    for(var i=0;i<additions.length;i++){
      var a=additions[i],left=a.n,ms=isInstance(a)?1:maxStack(a.k,a);
      if(!positive(left)||!positive(ms))return null;
      for(var j=0;j<out.length&&left;j++){
        if(!out[j]||out[j].k!==a.k||ms===1||isInstance(out[j]))continue;
        var room=Math.max(0,ms-count(out[j])),put=Math.min(room,left);
        if(put){out[j].n=count(out[j])+put;left-=put;}
      }
      while(left){var index=preserveSlots?out.findIndex(function(s){return !s;}):out.length;if(index<0||index>=limit)break;var n=Math.min(ms,left),item=clone(a);delete item.chance;item.n=n;out[index]=item;left-=n;}
      if(left&&!voidExcess)return null;
    }
    return out;
  }

  function planDrain(tanks, requirements){
    var next=clone(tanks),consumed=[];
    for(var i=0;i<requirements.length;i++){
      var r=requirements[i],need=r.mb;
      if(!positive(need))return null;
      for(var j=0;j<next.length&&need;j++){
        var t=next[j];if(!t||t.f!==r.f)continue;
        var n=Math.min(need,t.mb);need-=n;t.mb-=n;consumed.push({f:r.f,mb:n});
        if(t.mb===0)next[j]=null;
      }
      if(need)return null;
    }
    return {tanks:next,consumed:consumed};
  }
  function fluidCaps(tanks,capacities,fluid,policy,indices){
    if(policy!=='distinct')return capacities;
    var at=tanks.findIndex(function(t){return t&&t.mb>0&&t.f===fluid;});
    if(at<0)at=(indices||capacities.map(function(_,i){return i;})).find(function(i){return capacities[i]>0&&(!tanks[i]||tanks[i].mb<=0);});
    return capacities.map(function(cap,i){return i===at?cap:0;});
  }
  function planFill(tanks, additions, capacities, voidExcess,policy){
    var next=clone(tanks);while(next.length<capacities.length)next.push(null);
    for(var i=0;i<additions.length;i++){
      var r=additions[i],left=r.mb;if(!positive(left))return null;var available=fluidCaps(next,capacities,r.f,policy);
      for(var pass=0;pass<2&&left;pass++)for(var j=0;j<capacities.length&&left;j++){
        var t=next[j];
        if(pass===0&&(!t||t.f!==r.f))continue;
        if(pass===1&&t)continue;
        var room=available[j]-(t?t.mb:0),n=Math.min(left,Math.max(0,room));
        if(n){next[j]={f:r.f,mb:(t?t.mb:0)+n};left-=n;}
      }
      if(left&&!voidExcess)return null;
    }
    return next;
  }
  function hasIngredients(stacks, requirements, matches){return !!planIngredients(stacks,requirements,matches,false,true);}
  root.GTTransactions={clone:clone,count:count,isInstance:isInstance,planIngredients:planIngredients,hasIngredients:hasIngredients,planOutput:planOutput,planDrain:planDrain,fluidCaps:fluidCaps,planFill:planFill};
  if(typeof module==='object'&&module.exports)module.exports=root.GTTransactions;
})(typeof window!=='undefined'?window:globalThis);
