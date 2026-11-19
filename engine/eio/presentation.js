(function(root){
 'use strict';
 var dirs=[[0,-1],[1,0],[0,1],[-1,0]];
 function draw(ctx,b,visible,U){var idx=b._paintMachineCells||CONTAINER_ACCESS.index(b);
  EIO_STATE.kinds.slice().reverse().forEach(function(kind){Object.keys(b[kind]||{}).forEach(function(cell){var xy=cell.split(',').map(Number);if(!visible(b,xy[0],xy[1]))return;var x=(xy[0]+.5)*U,y=(xy[1]+.5)*U,p=b[kind][cell],fluid=kind==='eioFluid';ctx.save();
   for(var d=0;d<4;d++){if(!EIO_TOPOLOGY.connected(b,kind,cell,d,idx))continue;var v=dirs[d],nx=x+v[0]*U/2,ny=y+v[1]*U/2;
    ctx.setLineDash([]);ctx.lineWidth=fluid?20:12;ctx.strokeStyle='#242a29';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(nx,ny);ctx.stroke();ctx.lineWidth=fluid?16:9;ctx.strokeStyle=fluid?'#3d9c92':'#bfbbb0';if(!fluid)ctx.setLineDash([5,4]);ctx.stroke();ctx.setLineDash([]);
    if(!b[kind][TRANSPORT_PORTS.near(cell,d)]){ctx.save();ctx.translate(nx,ny);if(d%2)ctx.rotate(Math.PI/2);ctx.fillStyle='#3c4947';ctx.strokeStyle='#acb6b0';ctx.lineWidth=1;ctx.fillRect(-11,-3,22,6);ctx.strokeRect(-11,-3,22,6);var f=p.faces[d];if(f.insert.enabled){ctx.fillStyle=EIO_CONTENT.colors[f.insert.color][1];ctx.fillRect(-8,-2,6,4);}if(f.extract.enabled){ctx.fillStyle=EIO_CONTENT.colors[f.extract.color][1];ctx.fillRect(2,-2,6,4);}ctx.restore();}
   }
   ctx.fillStyle=fluid?'#356b65':'#a3a599';ctx.fillRect(x-4,y-4,8,8);ctx.restore();
  });});
 }
 root.EIO_PRESENTATION={draw:draw};
})(typeof window!=='undefined'?window:globalThis);
