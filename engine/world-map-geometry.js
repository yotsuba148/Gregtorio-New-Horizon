(function(root){
 'use strict';
 const eps=1e-7;
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const edge=(polygon,i)=>[polygon[i],polygon[(i+1)%polygon.length]];
 const segments=polygon=>polygon.map((_,i)=>edge(polygon,i));
 const properCross=(a,b,c,d)=>cross(a,b,c)*cross(a,b,d)<-eps&&cross(c,d,a)*cross(c,d,b)<-eps;
 const between=(v,a,b)=>v>=Math.min(a,b)-eps&&v<=Math.max(a,b)+eps;
 function inside(polygon,point,includeBoundary=false){
  let hit=false;
  for(const [a,b] of segments(polygon)){
   if(Math.abs(cross(a,b,point))<eps&&between(point[0],a[0],b[0])&&between(point[1],a[1],b[1]))return includeBoundary;
   if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;
  }
  return hit;
 }
 function overlaps(first,second){
  const a=segments(first),b=segments(second);
  if(a.some(([u,v])=>b.some(([w,x])=>properCross(u,v,w,x))))return true;
  function probes(source,other){
   const sign=Math.sign(segments(source).reduce((sum,[u,v])=>sum+u[0]*v[1]-v[0]*u[1],0));
   return segments(source).some(([u,v])=>{
    const dx=v[0]-u[0],dy=v[1]-u[1],k=sign*.00001/Math.hypot(dx,dy);
    const point=[(u[0]+v[0])/2-dy*k,(u[1]+v[1])/2+dx*k];
    return inside(other,u)||inside(other,point);
   });
  }
  return probes(first,second)||probes(second,first);
 }
 function validate(layouts){
  for(const [dimension,regions] of Object.entries(layouts)){
   const seen=new Set(),shapes=[];
   for(const region of regions){
    if(seen.has(region.id)||!region.shapes.length)throw Error('Invalid map region: '+dimension+'/'+region.id);
    seen.add(region.id);
    for(const polygon of region.shapes){
     if(polygon.length<3||polygon.some(p=>p.length!==2||p.some(x=>!Number.isFinite(x)||x<0||x>100))
      ||Math.abs(segments(polygon).reduce((sum,[u,v])=>sum+u[0]*v[1]-v[0]*u[1],0))<eps
      ||segments(polygon).some(([a,b],i,edges)=>edges.slice(i+1).some(([c,d])=>properCross(a,b,c,d))))throw Error('Invalid map polygon: '+dimension+'/'+region.id);
     for(const old of shapes)if(overlaps(old.polygon,polygon))throw Error('Overlapping map regions: '+dimension+'/'+old.id+' and '+region.id);
     shapes.push({id:region.id,polygon});
    }
   }
  }
 }
 root.WORLD_MAP_GEOMETRY={validate,overlaps,inside};
})(globalThis);
