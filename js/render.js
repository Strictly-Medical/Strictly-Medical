'use strict';
// All drawing: tiles, walls, buildings, characters, fog and HUD.
/* ---------- drawing primitives ---------- */
function poly(pts,fill,stroke,lw){ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw||1;ctx.stroke()}}
const quad=(x,y,z)=>{if(z===undefined)z=inB(x,y)?SC.HZ[x][y]:0;return[iso(x,y,z),iso(x+1,y,z),iso(x+1,y+1,z),iso(x,y+1,z)]};
function ellipse(x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill()}
/* ---------- tiles ---------- */
// A tile is drawn as its top plus the walls ("faces") on its two camera-facing sides wherever the neighbour there is lower.
// Edges of the world drop into the void: the island's rock underside in the village, darkness in the dungeon.
const WALLH=46,VOIDD=ZL*2.4;
function tileTop(x,y,cut){const t=SC.T[x][y];if(!t)return null;const z=SC.HZ[x][y];return t===2?z+(cut?10:WALLH):z}
// Draw a textured face hanging under the edge P0->P1 (flat corners) from height zt down to zb.
function drawFace(P0,P1,zt,zb,tex,fadeTo){
  if(zb>=zt)return;const sl=(P1[1]-P0[1])/(P1[0]-P0[0]),dir=P1[0]>P0[0]?1:-1;
  let z=zt,i=0;
  while(z>zb+.5){const seg=Math.min(ZL,z-zb),name=(i===0?tex[0]:tex[1])+(sl>0?'L':'R'),t=T2[name];
    ctx.save();ctx.transform(1,sl,0,1,P0[0],P0[1]-z);
    if(t&&t2ok())ctx.drawImage(T2IM,t.x,t.y,t.w,t.h*seg/ZL,0,0,32*dir,seg+.6);else{ctx.fillStyle=sl>0?'#4a4440':'#5a544e';ctx.fillRect(0,0,32*dir,seg)}
    ctx.restore();z-=seg;i++}
  if(fadeTo!==undefined){// hanging rock fades into the haze below the island
    const fc=SC.kind==='village'?'190,212,240':'5,4,7',h=zt-zb;ctx.save();ctx.transform(1,sl,0,1,P0[0],P0[1]-zt);
    const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,`rgba(${fc},0)`);g.addColorStop(.35,`rgba(${fc},0)`);g.addColorStop(1,`rgba(${fc},${fadeTo})`);ctx.fillStyle=g;ctx.fillRect(0,0,32*dir,h+.6);ctx.restore()}
}
function faceTex(x,y,wall){if(SC.kind==='dungeon')return wall?['brick','brick']:['brick2','brick'];return['grassrock','rock']}
function drawTile(x,y,cut){
  const T=SC.T[x][y],wall=T===2,zt=tileTop(x,y,cut);const A=isoF(x,y),B=isoF(x+1,y),C=isoF(x+1,y+1),D=isoF(x,y+1);
  const tex=faceTex(x,y,wall);
  for(const[nx,ny,P0,P1]of[[x,y+1,D,C],[x+1,y,C,B]]){
    const nt=inB(nx,ny)?tileTop(nx,ny,SC.T[nx][ny]===2&&cutFor(nx,ny)):null;
    if(nt===null){const v=hash(x*3.1+nx,y*1.7+ny),zb=SC.kind==='village'?SC.HZ[x][y]-VOIDD*(1.3+v*2.2)-(SC.HT[x][y])*ZL*.5:SC.HZ[x][y]-VOIDD*.7;drawFace(P0,P1,zt,Math.min(zb,zt-ZL),tex,SC.kind==='village'?.9:1)}
    else if(nt<zt)drawFace(P0,P1,zt,nt,tex)}
  const up=p=>[p[0],p[1]-zt],a=up(A),b=up(B),c=up(C),d=up(D);
  if(wall){if(!drawTopT2(x,y,'wall',a))poly([a,b,c,d],'#4d4a52');poly([a,b,c,d],'rgba(10,8,16,.35)','rgba(0,0,0,.45)',1);return}
  const sd=SC.SD[x][y];if(sd){drawStair(x,y,sd);return}
  const st=SC.ST[x][y];
  if(st==='w'){drawWater(x,y,a,b,c,d);return}
  if(!drawTopT2(x,y,st,a))poly([a,b,c,d],FLOOR[st]?FLOOR[st][0]:'#556','rgba(0,0,0,.2)',1);
  if(st==='b')poly([a,b,c,d],'rgba(40,6,12,.28)');
  if(st==='br'){ctx.strokeStyle='rgba(40,25,15,.55)';ctx.lineWidth=1;for(let i=1;i<4;i++){const p=[a[0]+(d[0]-a[0])*i/4,a[1]+(d[1]-a[1])*i/4],q=[b[0]+(c[0]-b[0])*i/4,b[1]+(c[1]-b[1])*i/4];ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke()}}
}
// Pick the atlas top for a ground type, varied by position.
const TOPS={g:['grass0','grass0','grass0','grass0','grass0b','grass0b','grass0','grass0b','grass1','grass0'],d:['dirt1','dirt2'],c:['cobble1','cobble1','cobble2'],s:['df1','df2','df3','df4','df5','df6'],b:['df2','df5','df6'],r:['drune'],k:['dcrack','df3'],wall:['df4','df1'],br:['dirt2']};
function drawTopT2(x,y,st,a){const l=TOPS[st];if(!l||!t2ok())return false;const n=l[Math.floor(hash(x*1.7,y*2.3)*l.length)];return drawTop(n,a[0],a[1])}
function drawWater(x,y,a,b,c,d){
  const w=4,sh=p=>[p[0],p[1]+w];poly([sh([a[0],a[1]-.6]),sh([b[0]+.8,b[1]]),sh([c[0],c[1]+.6]),sh([d[0]-.8,d[1]])],'#2f5f8f');
  const t=SC.t,ph=Math.sin(t*1.6+x*.9+y*.7);poly([sh(a),sh(b),sh(c),sh(d)],`rgba(120,190,240,${.18+.08*ph})`);
  ctx.strokeStyle='rgba(220,240,255,.35)';ctx.lineWidth=1.2;const cx=(a[0]+c[0])/2,cy=(a[1]+c[1])/2+w;const o=((t*8+x*13+y*7)%24)-12;
  ctx.beginPath();ctx.moveTo(cx-10+o*.4,cy-2+o*.2);ctx.lineTo(cx-2+o*.4,cy+1+o*.2);ctx.stroke();
}
// Stairs: four steps climbing one level toward SD; risers facing the camera are drawn, back ones are hidden by the order.
function drawStair(x,y,d){
  const z0=SC.HT[x][y]*ZL,dz=ZL/4,dun=SC.kind==='dungeon';const topC=dun?'#5b5864':'#a59d90',sideL=dun?'#3a3842':'#6e675d',sideR=dun?'#45424d':'#857d71';
  const steps=[];for(let i=0;i<4;i++){const f0=i/4,f1=(i+1)/4;let x0=x,x1=x+1,y0=y,y1=y+1;
    if(d.x===1){x0=x+f0;x1=x+f1}else if(d.x===-1){x0=x+1-f1;x1=x+1-f0}else if(d.y===1){y0=y+f0;y1=y+f1}else{y0=y+1-f1;y1=y+1-f0}
    steps.push({x0,x1,y0,y1,z:z0+(i+1)*dz})}
  steps.sort((p,q)=>(p.x0+p.y0)-(q.x0+q.y0));
  for(const s of steps){const A=iso(s.x0,s.y0,s.z),B=iso(s.x1,s.y0,s.z),C=iso(s.x1,s.y1,s.z),D=iso(s.x0,s.y1,s.z);
    const C0=iso(s.x1,s.y1,z0),D0=iso(s.x0,s.y1,z0),B0=iso(s.x1,s.y0,z0);
    poly([D,C,C0,D0],sideL,'rgba(0,0,0,.25)',1);poly([B,C,C0,B0],sideR,'rgba(0,0,0,.25)',1);poly([A,B,C,D],topC,'rgba(0,0,0,.3)',1)}
}
function buildingHides(b,u){
  const p=pos(u),[px,py]=iso(p.x,p.y,p.z),head=py-62,bz=SC.HZ[b.x0][b.y0];
  const L=iso(b.x0,b.y1+1,bz),F=iso(b.x1+1,b.y1+1,bz),R=iso(b.x1+1,b.y0,bz),T=iso(b.x0,b.y0,bz);
  if(px<L[0]+6||px>R[0]-6)return false;
  const lerp=(a,c,X)=>a[1]+(c[1]-a[1])*(X-a[0])/(c[0]-a[0]);
  const front=px<F[0]?lerp(L,F,px):lerp(F,R,px),back=px<T[0]?lerp(L,T,px):lerp(T,R,px);
  if(b.spr&&BLD[b.spr]){const{v,x:sx,y:sy}=bldPlace(b);if(!v.tops)return false;let cover=0;for(const dx of[-8,0,8]){const c=Math.round(px+dx-sx);if(c>=0&&c<v.tops.length&&sy+v.tops[c]<py-14)cover++}return py<front&&cover>=2}
  return py<front&&head<back-b.eave*.4+6&&py>back-b.ridge-4;
}
function cutFor(x,y){
  if(SC.kind!=='dungeon'&&SC.kind!=='village')return false;
  const list=SC.kind==='dungeon'?heroes():[SC.player];
  // Village buildings are tall: a whole building fades when it is actually drawn over the player.
  if(SC.kind==='village'){const c=SC.COL[x][y];if(c&&c.b){const b=c.b;if(b._cutT!==SC.t){b._cutT=SC.t;b._cut=buildingHides(b,SC.player)}return b._cut}}
  for(const h of list){const hs=h.tx+h.ty,hd=h.tx-h.ty,s=x+y,dd=x-y;if(s>hs&&s-hs<=4&&Math.abs(dd-hd)<=(SC.kind==='dungeon'?3:2))return true}
  return false;
}
// Sprite buildings are split at their front corner. The left half (door wall) is drawn at the left-front tile and the
// right half at the right-back tile, so anything standing in front of either wall is drawn after it.
function bldPlace(b){const v=BLD[b.spr],[cx,cy]=iso((b.x0+b.x1+1)/2,(b.y0+b.y1+1)/2,SC.HZ[b.x0][b.y0]);return{v,x:cx-v.cx,y:cy-v.cy}}
function drawBuildingHalf(b,right,alpha){
  const{v,x,y}=bldPlace(b),k=v.im.naturalWidth/v.w,split=v.fx;
  ctx.globalAlpha=alpha;
  if(!right)ctx.drawImage(v.im,0,0,split*k,v.im.naturalHeight,x,y,split,v.h);
  else ctx.drawImage(v.im,split*k,0,(v.w-split)*k,v.im.naturalHeight,x+split,y,v.w-split,v.h);
  ctx.globalAlpha=1;
}
function drawBuildingTile(x,y,b,alpha){
  const mid=(b.y0+b.y1+1)/2,half=(b.y1+1-b.y0)/2;const hf=cy=>b.eave+(b.ridge-b.eave)*(1-Math.abs(cy-mid)/half);
  const[A,B,C,D]=quad(x,y);const hA=hf(y),hB=hf(y),hC=hf(y+1),hD=hf(y+1),we=b.eave-6;
  ctx.globalAlpha=alpha;
  if(y===b.y1){poly([D,C,[C[0],C[1]-we],[D[0],D[1]-we]],shade(b.wall,-.28));
    if(b.door&&x===b.door.x){
      // A door tall enough to walk through: stone step, dark frame, plank door, lit gap and handle.
      const at=t=>[D[0]+(C[0]-D[0])*t,D[1]+(C[1]-D[1])*t],DH=74;const f1=at(.18),f2=at(.82),d1=at(.25),d2=at(.75);
      poly([[f1[0]-2,f1[1]+1],[f2[0]+2,f2[1]+1],[f2[0]+5,f2[1]+5],[f1[0]+1,f1[1]+5]],'#77716a');
      poly([f1,f2,[f2[0],f2[1]-DH-7],[f1[0],f1[1]-DH-7]],shade(b.wall,-.55));
      poly([d1,d2,[d2[0],d2[1]-DH],[d1[0],d1[1]-DH]],'#4a3424');
      ctx.strokeStyle='rgba(0,0,0,.35)';ctx.lineWidth=1;for(const t of[.42,.58]){const p=at(t);ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(p[0],p[1]-DH);ctx.stroke()}
      const m=at(.66);ctx.fillStyle='#d2ab52';ctx.fillRect(m[0]-1,m[1]-DH*.48,2.5,2.5);
      ctx.fillStyle='rgba(240,180,90,.35)';const g=at(.5);ctx.fillRect(g[0]-.5,g[1]-DH,1,DH)}
    else{const w1=[D[0]+(C[0]-D[0])*.35,D[1]+(C[1]-D[1])*.35],w2=[D[0]+(C[0]-D[0])*.65,D[1]+(C[1]-D[1])*.65];poly([[w1[0],w1[1]-34],[w2[0],w2[1]-34],[w2[0],w2[1]-62],[w1[0],w1[1]-62]],'#f0c070');poly([[w1[0]-1,w1[1]-33],[w2[0]+1,w2[1]-33],[w2[0]+1,w2[1]-31],[w1[0]-1,w1[1]-31]],shade(b.wall,-.45))}}
  if(x===b.x1){poly([B,C,[C[0],C[1]-hC+4],[B[0],B[1]-hB+4]],shade(b.wall,-.12));
    const m1=[B[0]+(C[0]-B[0])*.35,B[1]+(C[1]-B[1])*.35],m2=[B[0]+(C[0]-B[0])*.65,B[1]+(C[1]-B[1])*.65];poly([[m1[0],m1[1]-34],[m2[0],m2[1]-34],[m2[0],m2[1]-62],[m1[0],m1[1]-62]],'#e8b860');poly([[m1[0]-1,m1[1]-33],[m2[0]+1,m2[1]-33],[m2[0]+1,m2[1]-31],[m1[0]-1,m1[1]-31]],shade(b.wall,-.3))}
  const back=(y+.5)<mid;
  poly([[A[0],A[1]-hA],[B[0],B[1]-hB],[C[0],C[1]-hC],[D[0],D[1]-hD]],shade(b.roof,back?.1:-.15),'rgba(0,0,0,.25)',1);
  ctx.globalAlpha=1;
}

/* ---------- figures ---------- */
function drawSpriteFigure(u,L,C,sx,sy,o){
  const s=o.scale||u.scale||1,f=u.face||{x:0,y:1},sfx=f.x-f.y,back=f.x+f.y<0;
  if(sfx!==0)u._dir=sfx<0?-1:1;const dir=u._dir||1,kneel=u.kneel||u.drink>0;
  if(u.prog<1)u._walkT=SC.t;
  // A swing plays the attack row once over atkDur; a new swing (atkT jumping up) restarts it.
  if(u.atkT>(u._atkLast||0)+.01)u._atkAt=SC.t;u._atkLast=u.atkT;
  const at=SC.t-(u._atkAt??-9),swinging=L.weapon==='sword'&&at<C.atkDur;
  const walking=!swinging&&SC.t-(u._walkT??-9)<.1,wp=SC.t*C.fps+u.id*.37,fi=Math.floor(wp)%C.cols;
  let row,col;
  if(swinging){row=back?C.row.atkBack:C.row.atk;col=Math.min(C.cols-1,Math.floor(at/C.atkDur*C.cols))}
  else{row=back?C.row.walkBack:C.row.walk;col=walking?fi:0}
  // Walking: rise through each stride and drop onto the planted foot (two steps per walk cycle), squashing slightly on each footfall. Standing: a slow breath.
  const step=Math.abs(Math.sin(wp/C.cols*Math.PI*2)),bob=walking?-(step*2.6-.4):0,breath=walking||swinging?0:Math.sin(SC.t*2.2+u.id)*.5+.5;
  ctx.save();ctx.translate(sx,sy);
  if(o.ring){ctx.strokeStyle=o.ring;ctx.globalAlpha=.85;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,14,7,0,0,7);ctx.stroke();ctx.globalAlpha=1}
  ellipse(2,1,12*s,5*s,'rgba(0,0,0,.35)');
  if(u.inv>0&&u.dash>0)ctx.globalAlpha=.55;
  ctx.scale(dir*s,s);if(kneel){ctx.translate(0,1);ctx.scale(1,.9)}
  ctx.save();ctx.translate(0,bob);if(walking)ctx.scale(1+(1-step)*.015,1-(1-step)*.025);if(breath)ctx.scale(1-breath*.008,1+breath*.018);
  ctx.drawImage(u.flash>0?C.white:C.im,col*C.fw,row*C.fh,C.fw,C.fh,-C.ax,-C.ay,C.w,C.h);ctx.restore();
  ctx.restore();ctx.globalAlpha=1;
}
const figTop=u=>{const C=u.look&&u.look.sprite&&CHARS[u.look.sprite];return C&&C.ok?(C.top||C.h)*(u.scale||1):42*FIG*(u.scale||1)};
function drawFigure(u,L,sx,sy,o={}){
  const C=L.sprite&&CHARS[L.sprite];if(C&&C.ok){drawSpriteFigure(u,L,C,sx,sy,o);return}
  const s=(o.scale||u.scale||1)*FIG,f=u.face||{x:0,y:1},sfx=f.x-f.y,sfy=f.x+f.y;
  if(sfx!==0)u._dir=sfx<0?-1:1;const dir=u._dir||1,back=sfy<0;
  const walking=u.prog<1,ph=walking?Math.sin(u.prog*Math.PI*2):0,fl=u.flash>0,kneel=u.kneel||u.drink>0;
  ctx.save();ctx.translate(sx,sy);
  if(o.ring){ctx.strokeStyle=o.ring;ctx.globalAlpha=.85;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,14,7,0,0,7);ctx.stroke();ctx.globalAlpha=1}
  ellipse(2,1,11*s,5*s,'rgba(0,0,0,.35)');
  if(u.inv>0&&u.dash>0)ctx.globalAlpha=.55;
  ctx.scale(dir*s,s);if(kneel)ctx.translate(0,6);
  const hunch=L.hunch?1:0,body=fl?'#ffffff':L.body,dark=fl?'#ffffff':shade(L.body,-.35);
  const ty=-26+hunch*6,hx=hunch*5;
  const cape=()=>{if(!L.cape)return;ctx.fillStyle=L.cape;ctx.beginPath();ctx.moveTo(-6+hx,ty+1);ctx.lineTo(6+hx,ty+1);ctx.lineTo(7+Math.sin(SC.t*3+u.id)*1.5,-4);ctx.lineTo(-8,-3);ctx.closePath();ctx.fill()};
  if(!back)cape();
  if(L.robe){ctx.fillStyle=body;ctx.beginPath();ctx.moveTo(-7,ty);ctx.lineTo(7,ty);ctx.lineTo(9,-1);ctx.lineTo(-9,-1);ctx.closePath();ctx.fill();ctx.fillStyle=dark;ctx.beginPath();ctx.moveTo(1,ty);ctx.lineTo(7,ty);ctx.lineTo(9,-1);ctx.lineTo(2,-1);ctx.closePath();ctx.fill()}
  else{ctx.fillStyle=fl?'#fff':shade(L.body,-.45);if(!kneel){ctx.fillRect(-5,-10+Math.max(0,ph)*2,4,10-Math.max(0,ph)*2);ctx.fillRect(1,-10+Math.max(0,-ph)*2,4,10-Math.max(0,-ph)*2)}else ctx.fillRect(-6,-6,12,6);
    ctx.fillStyle=body;ctx.beginPath();ctx.moveTo(-7+hx,ty);ctx.lineTo(7+hx,ty);ctx.lineTo(6,-9);ctx.lineTo(-6,-9);ctx.closePath();ctx.fill();
    ctx.fillStyle=dark;ctx.beginPath();ctx.moveTo(1+hx,ty);ctx.lineTo(7+hx,ty);ctx.lineTo(6,-9);ctx.lineTo(1,-9);ctx.closePath();ctx.fill()}
  if(!back&&L.tabard){ctx.fillStyle=fl?'#fff':L.tabard;ctx.fillRect(-3+hx*.5,ty+2,6,L.robe?ty*-1-4:15);if(L.trim){ctx.fillStyle=L.trim;ctx.fillRect(-3+hx*.5,ty+8,6,2);if(L.tabard==='#e8dfca'){ctx.fillRect(-.8+hx*.5,ty+4,1.6,7)}}}
  if(L.ribs&&!back){ctx.strokeStyle='rgba(40,35,30,.7)';ctx.lineWidth=1;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-4,ty+5+i*4);ctx.lineTo(4,ty+5+i*4);ctx.stroke()}}
  const hy=ty-6+(hunch?2:0);const hxx=hx*1.4;
  ctx.fillStyle=fl?'#fff':shade(L.helm||L.body,-.1);ctx.beginPath();ctx.arc(-7+hx,ty+2,3.4,0,7);ctx.arc(7+hx,ty+2,3.4,0,7);ctx.fill();
  const head=L.head;
  if(head==='helm'){ctx.fillStyle=fl?'#fff':L.helm;ctx.beginPath();ctx.ellipse(hxx,hy,6,7,0,0,7);ctx.fill();ctx.fillStyle=fl?'#fff':shade(L.helm,-.3);ctx.beginPath();ctx.ellipse(hxx+2,hy,3.5,7,0,-1.4,1.4);ctx.fill();if(!back){ctx.fillStyle='#14121a';ctx.fillRect(hxx+1,hy-1,5,1.6)}
    if(L.plume){ctx.fillStyle=L.plume;ctx.beginPath();ctx.moveTo(hxx-1,hy-7);ctx.quadraticCurveTo(hxx-10,hy-12+Math.sin(SC.t*5+u.id),hxx-12,hy-2);ctx.quadraticCurveTo(hxx-6,hy-6,hxx-1,hy-5);ctx.fill()}}
  else if(head==='hood'){ctx.fillStyle=fl?'#fff':L.helm;ctx.beginPath();ctx.moveTo(hxx-7,hy+6);ctx.quadraticCurveTo(hxx-8,hy-6,hxx-1,hy-11);ctx.quadraticCurveTo(hxx+7,hy-5,hxx+7,hy+6);ctx.closePath();ctx.fill();if(!back){ctx.fillStyle='#17141c';ctx.beginPath();ctx.ellipse(hxx+2,hy+1,3.5,4.5,0,0,7);ctx.fill()}}
  else if(head==='skull'){ctx.fillStyle=fl?'#fff':'#ece6d6';ctx.beginPath();ctx.arc(hxx,hy,5.6,0,7);ctx.fill();if(!back){ctx.fillStyle='#1b1a1f';ctx.fillRect(hxx-1,hy-2,2.2,2.4);ctx.fillRect(hxx+2.6,hy-2,2.2,2.4);ctx.fillStyle=u.atk?'#ff5a46':'#1b1a1f';ctx.fillRect(hxx-.6,hy-1.4,1,1);ctx.fillRect(hxx+3,hy-1.4,1,1)}}
  else if(head==='ghoul'){ctx.fillStyle=fl?'#fff':'#a9b890';ctx.beginPath();ctx.ellipse(hxx+2,hy+1,6,5,.2,0,7);ctx.fill();if(!back){ctx.fillStyle='#2a1e1a';ctx.fillRect(hxx+3,hy+2,5,2);ctx.fillStyle=u.atk?'#ff5a46':'#e0d070';ctx.fillRect(hxx+3,hy-1.5,1.6,1.6)}}
  else if(head==='veil'){ctx.fillStyle=L.skin;ctx.beginPath();ctx.arc(hxx,hy,5,0,7);ctx.fill();ctx.fillStyle=L.helm;ctx.beginPath();ctx.moveTo(hxx-6.5,hy+7);ctx.quadraticCurveTo(hxx-7,hy-8,hxx+1,hy-7);ctx.quadraticCurveTo(hxx+6,hy-6,hxx+5,hy-2);ctx.lineTo(hxx-1,hy-3);ctx.lineTo(hxx-2,hy+7);ctx.closePath();ctx.fill()}
  else{ctx.fillStyle=fl?'#fff':(L.skin||'#d9ae8a');ctx.beginPath();ctx.arc(hxx,hy,5.2,0,7);ctx.fill();ctx.fillStyle=L.hair||'#444';ctx.beginPath();ctx.arc(hxx-.5,hy-1,5.6,Math.PI*.95,Math.PI*2.05);ctx.fill();if(back){ctx.beginPath();ctx.arc(hxx,hy,5.3,0,7);ctx.fill()}
    if(L.beard&&!back){ctx.fillStyle=L.beard;ctx.beginPath();ctx.moveTo(hxx-1,hy+2);ctx.quadraticCurveTo(hxx+3,hy+9,hxx+6,hy+2);ctx.fill()}}
  if(L.shield&&!back){ctx.fillStyle=fl?'#fff':L.shield;ctx.beginPath();ctx.moveTo(-12,ty+2);ctx.lineTo(-3,ty+2);ctx.lineTo(-3,ty+12);ctx.quadraticCurveTo(-7.5,ty+18,-12,ty+12);ctx.closePath();ctx.fill();ctx.fillStyle=L.trim||'#b3362e';ctx.fillRect(-8.5,ty+4,2,9);ctx.fillRect(-11,ty+7,7,2)}
  const sw=u.atkT>0?(1-u.atkT/.22):0;
  ctx.save();ctx.translate(7+hx,ty+7);
  const w=L.weapon;
  if(w==='sword'){ctx.rotate(u.atkT>0?-1.9+sw*2.6:.55);ctx.strokeStyle='#d7dde4';ctx.lineWidth=2.6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(18,0);ctx.stroke();ctx.strokeStyle=L.trim||'#8a6a3e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(2,-3.5);ctx.lineTo(2,3.5);ctx.stroke()}
  else if(w==='bow'){ctx.strokeStyle='#8a6a3e';ctx.lineWidth=2.2;ctx.beginPath();ctx.arc(3,0,10,-1.2,1.2);ctx.stroke();ctx.strokeStyle='rgba(230,220,200,.7)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(3+10*Math.cos(-1.2),10*Math.sin(-1.2));ctx.lineTo(3-(u.atkT>0?0:3),0);ctx.lineTo(3+10*Math.cos(1.2),10*Math.sin(1.2));ctx.stroke()}
  else if(w==='staff'){ctx.strokeStyle='#6a4e32';ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(0,16);ctx.lineTo(2,-20);ctx.stroke();const g=u.atkT>0?7:4.5;ctx.fillStyle='rgba(150,180,255,.35)';ctx.beginPath();ctx.arc(2,-22,g+3,0,7);ctx.fill();ctx.fillStyle='#bcd0ff';ctx.beginPath();ctx.arc(2,-22,3,0,7);ctx.fill()}
  else if(w==='hammer'){ctx.rotate(.4);ctx.strokeStyle='#5a4030';ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(13,0);ctx.stroke();ctx.fillStyle='#55575c';ctx.fillRect(10,-4,6,8)}
  else if(w==='claws'){ctx.strokeStyle=fl?'#fff':'#c8c0a0';ctx.lineWidth=1.4;for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(2,i*2);ctx.lineTo(9+(u.atk?3:0),i*3+3);ctx.stroke()}}
  ctx.restore();
  if(back)cape();
  if(u.atkT>.08&&w==='sword'){ctx.strokeStyle=`rgba(245,235,205,${u.atkT*3})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(8,ty+10,20,-1.6,.6);ctx.stroke()}
  ctx.restore();ctx.globalAlpha=1;
}
function drawLying(sx,sy,L,col){ctx.save();ctx.translate(sx,sy);ctx.scale(FIG,FIG);ctx.translate(-sx,-sy);drawLying0(sx,sy,L,col);ctx.restore()}
function drawLying0(sx,sy,L,col){
  ellipse(sx+2,sy+1,15,6,'rgba(0,0,0,.35)');
  ctx.fillStyle=shade(L.body,-.15);ctx.beginPath();ctx.ellipse(sx,sy-4,14,5.5,-.12,0,7);ctx.fill();
  if(L.tabard){ctx.fillStyle=L.tabard;ctx.beginPath();ctx.ellipse(sx+1,sy-5,7,3,-.12,0,7);ctx.fill()}
  ctx.fillStyle=L.head==='helm'?L.helm:(L.skin||'#d9ae8a');ctx.beginPath();ctx.arc(sx-13,sy-6,5,0,7);ctx.fill();
  if(L.hair&&L.head!=='helm'){ctx.fillStyle=L.hair;ctx.beginPath();ctx.arc(sx-14,sy-7,4.5,Math.PI*.8,Math.PI*1.9);ctx.fill()}
  if(col){ctx.fillStyle=col;ctx.globalAlpha=.6;ctx.fillRect(sx-2,sy-8,9,2);ctx.globalAlpha=1}
}
function drawBoss(b,sx,sy){ctx.save();ctx.translate(sx,sy);ctx.scale(1.25,1.25);ctx.translate(-sx,-sy);drawBoss0(b,sx,sy);ctx.restore()}
function drawBoss0(b,sx,sy){
  ellipse(sx+3,sy+2,30,12,'rgba(0,0,0,.5)');
  const f=b.face,sfx=f.x-f.y;if(sfx)b._dir=sfx<0?-1:1;const dir=b._dir||1,fl=b.flash>0,br=Math.sin(SC.t*2)*1.5,dormant=b.state==='dormant';
  ctx.save();ctx.translate(sx,sy);ctx.scale(dir,1);
  const armor=fl?'#fff':'#3a3542',dark=fl?'#fff':'#26222d';
  ctx.fillStyle=dark;ctx.beginPath();ctx.moveTo(-15,-62);ctx.lineTo(15,-62);ctx.lineTo(25,-3);for(let i=0;i<=8;i++){ctx.lineTo(25-i*6.25,(i%2?-11:-1)+Math.sin(SC.t*3+i)*1.5)}ctx.lineTo(-25,-3);ctx.closePath();ctx.fill();
  ctx.fillStyle=armor;ctx.beginPath();ctx.moveTo(-14,-64);ctx.lineTo(14,-64);ctx.lineTo(12,-30);ctx.lineTo(-12,-30);ctx.closePath();ctx.fill();
  ctx.fillStyle=fl?'#fff':'#4a4554';ctx.beginPath();ctx.ellipse(-16,-60,11,8,-.3,0,7);ctx.ellipse(16,-60,9,7,.3,0,7);ctx.fill();
  ctx.strokeStyle='#8a7a52';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-12,-48);ctx.lineTo(12,-48);ctx.moveTo(-12,-38);ctx.lineTo(12,-38);ctx.stroke();
  ctx.fillStyle=fl?'#fff':'#2a2630';ctx.beginPath();ctx.ellipse(0,-72+br*.3,9,10,0,0,7);ctx.fill();
  ctx.strokeStyle='#5a5262';ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-7,-78+br*.3);ctx.quadraticCurveTo(-18,-86,-16,-96);ctx.moveTo(7,-78+br*.3);ctx.quadraticCurveTo(18,-86,16,-96);ctx.stroke();
  ctx.fillStyle=dormant?'#4a6a3a':(b.raise>0?'#d8ff7a':'#a8d860');ctx.fillRect(1,-74+br*.3,4,2);ctx.fillRect(-5,-74+br*.3,4,2);
  const ang=b.state==='wind'?-1.2+(1-b.atk.wind/b.atk.wmax)*.5:b.state==='recover'?.9:.35;
  ctx.save();ctx.translate(15,-42);ctx.rotate(ang);ctx.strokeStyle='#4a4555';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(26,0);ctx.stroke();
  ctx.translate(30,0);ctx.rotate(-ang);const glow=dormant?.25:.55+.25*Math.sin(SC.t*6);
  ctx.fillStyle=`rgba(190,230,110,${glow*.5})`;ctx.beginPath();ctx.arc(0,8,16,0,7);ctx.fill();
  ctx.strokeStyle='#2a2630';ctx.lineWidth=2;ctx.strokeRect(-6,0,12,16);ctx.fillStyle=`rgba(210,245,140,${glow})`;ctx.fillRect(-5,1,10,14);
  ctx.beginPath();ctx.moveTo(-6,0);ctx.lineTo(0,-5);ctx.lineTo(6,0);ctx.stroke();ctx.restore();
  ctx.restore();
}
function drawObj(o){
  const[sx,sy]=iso(o.x+.5,o.y+.5);
  const vk=n=>SC.kind==='village'?PROP[n]:1;
  const fl=hash(o.x,o.y)<.5;
  if(o.type==='tree'&&o.n&&drawT2(o.n,sx,sy+2,fl))return;
  if((o.type==='deco'||o.type==='wheat')&&o.n){drawT2(o.n,sx+(hash(o.y,o.x)-.5)*10,sy+3,fl);return}
  if(o.type==='t2'){if(o.tint==='violet')ctx.filter='hue-rotate(70deg) saturate(1.3)';drawT2(o.n,sx,sy+(o.big?10:4),false);ctx.filter='none';return}
  if(o.type==='fence'){const[fx,fy]=o.side==='x'?iso(o.x+1,o.y+.5):iso(o.x+.5,o.y+1);drawT2('fence',fx,fy+3,o.side==='x',.9);return}
  if(o.type==='fall')return;
  if(o.type==='tree'&&drawArt('tree',sx,sy,fl,vk('tree')))return;
  if(o.type==='well'&&drawArt('well',sx,sy,false,vk('well')))return;
  if(o.type==='banner'&&drawArt('banner',sx,sy,o.x>22,vk('banner')))return;
  if(o.type==='rubble'&&drawArt('stub',sx,sy))return;
  if(o.type==='brazier'&&drawArt('brazier',sx,sy))return;
  if(o.type==='chest'&&drawArt(o.open?'chestOpen':'chest',sx,sy))return;
  if(o.type==='exit'&&art('portal')){ctx.globalAlpha=.85+.15*Math.sin(SC.t*3);drawArt('portal',sx,sy);ctx.globalAlpha=1;return}
  if(o.type==='ore'&&drawArt(o.metal==='iron'?'iron':'copper',sx,sy)){const max=o.metal==='iron'?4:3;if(o.hp<max){ctx.strokeStyle='rgba(0,0,0,.75)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(sx-6,sy-26);ctx.lineTo(sx-1,sy-16);ctx.lineTo(sx-5,sy-8);if(o.hp<max-1){ctx.moveTo(sx+9,sy-22);ctx.lineTo(sx+4,sy-12)}ctx.stroke()}return}
  if(o.type==='tree'){const h=hash(o.y,o.x);ellipse(sx+3,sy,20,9,'rgba(0,0,0,.3)');ctx.fillStyle='#3d2c1e';ctx.fillRect(sx-3,sy-24,6,24);const g=h<.5?'#2f4426':'#35502c';ellipse(sx,sy-42,20,17,g);ellipse(sx-6,sy-50,12,10,shade(g,.12));ellipse(sx+7,sy-36,11,9,shade(g,-.1))}
  else if(o.type==='well'){ellipse(sx,sy-6,22,11,'#5a5550');ellipse(sx,sy-12,22,11,'#77716a');ellipse(sx,sy-12,15,7,'#1d2a33');ctx.strokeStyle='#4a3626';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(sx-18,sy-12);ctx.lineTo(sx-18,sy-46);ctx.moveTo(sx+18,sy-12);ctx.lineTo(sx+18,sy-46);ctx.stroke();poly([[sx-26,sy-44],[sx,sy-58],[sx+26,sy-44],[sx,sy-36]],'#6a3a2a')}
  else if(o.type==='anvil'){ellipse(sx+2,sy,13,6,'rgba(0,0,0,.3)');ctx.fillStyle='#4a3a2a';ctx.fillRect(sx-6,sy-10,12,10);ctx.fillStyle='#4b4e55';ctx.beginPath();ctx.moveTo(sx-14,sy-16);ctx.lineTo(sx+12,sy-16);ctx.lineTo(sx+8,sy-10);ctx.lineTo(sx-10,sy-10);ctx.closePath();ctx.fill()}
  else if(o.type==='banner'){ctx.strokeStyle='#3a2a1e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx,sy-60);ctx.stroke();const w=Math.sin(SC.t*3+o.x)*2;ctx.fillStyle='#e8dfca';ctx.beginPath();ctx.moveTo(sx+2,sy-58);ctx.lineTo(sx+20,sy-56+w);ctx.lineTo(sx+20,sy-30+w);ctx.lineTo(sx+11,sy-35+w);ctx.lineTo(sx+2,sy-30);ctx.closePath();ctx.fill();ctx.fillStyle='#b3362e';ctx.fillRect(sx+9,sy-52+w*.5,4,14);ctx.fillRect(sx+6,sy-47+w*.5,10,4)}
  else if(o.type==='chimney'){const b=SC.forge;const mid=(b.y0+b.y1+1)/2,half=(b.y1+1-b.y0)/2;const base=b.eave+(b.ridge-b.eave)*(1-Math.abs(o.y+.4-mid)/half);const[cx,cy]=iso(o.x+.4,o.y+.4);ctx.fillStyle='#5a4a3e';ctx.fillRect(cx-6,cy-base-26,12,26);ctx.fillStyle='#3a2e26';ctx.fillRect(cx-7,cy-base-28,14,4)}
  else if(o.type==='gate'&&t2ok()&&SC.kind==='village'){const p=.5+.5*Math.sin(SC.t*2.2);const g=ctx.createRadialGradient(sx,sy-50,4,sx,sy-50,70);g.addColorStop(0,`rgba(255,214,120,${.35+.15*p})`);g.addColorStop(1,'rgba(255,214,120,0)');ctx.fillStyle=g;ctx.fillRect(sx-70,sy-120,140,140);drawT2('ddoor',sx,sy+6,false,1.45);
    ctx.fillStyle='#f3d27a';ctx.beginPath();ctx.moveTo(sx,sy-172+p*3);ctx.lineTo(sx+9,sy-158+p*3);ctx.lineTo(sx,sy-144+p*3);ctx.lineTo(sx-9,sy-158+p*3);ctx.closePath();ctx.fill()}
  else if(o.type==='gate'){ctx.save();ctx.translate(0,sy);ctx.scale(1,1.35);ctx.translate(0,-sy);const L=iso(o.x-.5,o.y+.5),R=iso(o.x+1.5,o.y+.5);const pil=(p)=>{ctx.fillStyle='#4a4652';ctx.fillRect(p[0]-12,p[1]-74,24,74);ctx.fillStyle='#5c5766';ctx.fillRect(p[0]-12,p[1]-74,12,74)};
    ctx.fillStyle='#120f18';poly([[L[0]+10,L[1]],[R[0]-10,R[1]],[R[0]-10,R[1]-62],[L[0]+10,L[1]-62]],'#120f18');
    const g=ctx.createLinearGradient(0,sy-60,0,sy);g.addColorStop(0,'rgba(140,110,200,.05)');g.addColorStop(1,'rgba(140,110,200,.35)');poly([[L[0]+10,L[1]],[R[0]-10,R[1]],[R[0]-10,R[1]-62],[L[0]+10,L[1]-62]],g);
    pil(L);pil(R);poly([[L[0]-16,L[1]-74],[R[0]+16,R[1]-74],[R[0]+16,R[1]-86],[L[0]-16,L[1]-86]],'#5c5766');
    ctx.restore();ctx.fillStyle='#d2ab52';ctx.font='12px "IM Fell English SC",serif';ctx.textAlign='center';ctx.fillText('ASHEN BARROW',sx,sy-76*1.35-4);ctx.textAlign='left'}
  else if(o.type==='rubble'){for(let i=0;i<6;i++){const a=hash(i,3)*6.28,r=hash(i,7)*12;ellipse(sx+Math.cos(a)*r,sy-6-i*3+Math.sin(a)*r*.5,9-i,6-i*.6,shade('#4b4654',(hash(i,1)-.5)*.2))}}
  else if(o.type==='brazier'){ellipse(sx+2,sy,12,5,'rgba(0,0,0,.35)');ctx.strokeStyle='#2a2630';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(sx-7,sy);ctx.lineTo(sx-3,sy-22);ctx.moveTo(sx+7,sy);ctx.lineTo(sx+3,sy-22);ctx.stroke();ellipse(sx,sy-24,11,5,'#3a3540');const f=Math.sin(SC.t*14+o.x)*2;ctx.fillStyle='#e2602e';ctx.beginPath();ctx.ellipse(sx,sy-30,7,8+f,0,0,7);ctx.fill();ctx.fillStyle='#f6c35a';ctx.beginPath();ctx.ellipse(sx,sy-28,3.5,5+f*.5,0,0,7);ctx.fill()}
  else if(o.type==='ore'){const iron=o.metal==='iron';const base=iron?'#4a4d57':'#55504a';ellipse(sx+2,sy,16,7,'rgba(0,0,0,.35)');ctx.fillStyle=base;ctx.beginPath();ctx.moveTo(sx-15,sy-2);ctx.lineTo(sx-10,sy-18);ctx.lineTo(sx-1,sy-24);ctx.lineTo(sx+9,sy-19);ctx.lineTo(sx+15,sy-4);ctx.lineTo(sx+4,sy+3);ctx.closePath();ctx.fill();ctx.fillStyle=shade(base,.15);ctx.beginPath();ctx.moveTo(sx-10,sy-18);ctx.lineTo(sx-1,sy-24);ctx.lineTo(sx+2,sy-10);ctx.lineTo(sx-8,sy-6);ctx.closePath();ctx.fill();
    const c=iron?'#bcd0e6':'#d98a4a';ctx.fillStyle=c;for(const[a,b2]of[[-6,-12],[3,-16],[7,-8],[-2,-4],[-10,-8]]){ctx.fillRect(sx+a,sy+b2,3,3)}
    const max=iron?4:3;if(o.hp<max){ctx.strokeStyle='rgba(0,0,0,.6)';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(sx-4,sy-22);ctx.lineTo(sx,sy-14);ctx.lineTo(sx-3,sy-6);if(o.hp<max-1){ctx.moveTo(sx+8,sy-18);ctx.lineTo(sx+4,sy-10)}ctx.stroke()}}
  else if(o.type==='chest'){ellipse(sx+2,sy,13,6,'rgba(0,0,0,.35)');const[A,B,C,D]=[iso(o.x+.22,o.y+.3),iso(o.x+.78,o.y+.3),iso(o.x+.78,o.y+.7),iso(o.x+.22,o.y+.7)];const h=12;
    poly([D,C,[C[0],C[1]-h],[D[0],D[1]-h]],'#5a4426');poly([B,C,[C[0],C[1]-h],[B[0],B[1]-h]],'#6e5430');
    if(o.open){poly([[A[0],A[1]-h],[B[0],B[1]-h],[B[0],B[1]-h-12],[A[0],A[1]-h-12]],'#7a5e36');poly([[A[0],A[1]-h],[B[0],B[1]-h],[C[0],C[1]-h],[D[0],D[1]-h]],'#1e160e')}
    else{poly([[A[0],A[1]-h],[B[0],B[1]-h],[C[0],C[1]-h],[D[0],D[1]-h]],'#8a6a3a');ctx.fillStyle='#e6c76a';ctx.fillRect(sx-2,sy-h+1,4,4)}}
  else if(o.type==='exit'){const g=ctx.createLinearGradient(0,sy-110,0,sy);const p=.5+.5*Math.sin(SC.t*2.5);g.addColorStop(0,'rgba(246,220,138,0)');g.addColorStop(1,`rgba(246,220,138,${.3+.15*p})`);ctx.fillStyle=g;ctx.fillRect(sx-20,sy-110,40,110)}
  else if(o.type==='fallen'&&o.state!=='carried'){drawLying(sx,sy,o.k.look,null)}
}
// A waterfall pouring off the island edge below tile o: a falling sheet with moving streaks, fading into the sky.
function drawFall(o,sx,sy){
  const top=sy+10,len=230,w=26,t=SC.t;const g=ctx.createLinearGradient(0,top,0,top+len);g.addColorStop(0,'rgba(150,200,240,.95)');g.addColorStop(.7,'rgba(150,200,240,.55)');g.addColorStop(1,'rgba(200,230,255,0)');
  ctx.fillStyle=g;ctx.fillRect(sx-w/2,top,w,len);
  ctx.strokeStyle='rgba(235,248,255,.7)';ctx.lineWidth=1.5;for(let i=0;i<6;i++){const xx=sx-w/2+3+i*4.2,ph=((t*120+i*37)%len);ctx.beginPath();ctx.moveTo(xx,top+ph);ctx.lineTo(xx,top+Math.min(len,ph+26));ctx.stroke()}
  ctx.fillStyle='rgba(255,255,255,.5)';ctx.beginPath();ctx.ellipse(sx,top,w*.6,4,0,0,7);ctx.fill();
}
function drawUnit(u){
  const p=pos(u);const[sx,sy]=iso(p.x,p.y,p.z);
  if(u.kind==='boss'){drawBoss(u,sx,sy);return}
  if(u.kind==='hero'&&u.down){drawLying(sx,sy,u.look,null);ctx.strokeStyle=u.ring;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(sx,sy,15,7.5,0,0,7);ctx.stroke();return}
  drawFigure(u,u.look,sx,sy,{ring:u.kind==='hero'?u.ring:null});
  if(u.carrying){const L=u.carrying.k.look;ctx.save();ctx.translate(sx,sy-Math.max(30,figTop(u)*.72));ctx.fillStyle=shade(L.body,-.1);ctx.beginPath();ctx.ellipse(0,0,13,4.5,0,0,7);ctx.fill();if(L.tabard){ctx.fillStyle=L.tabard;ctx.beginPath();ctx.ellipse(1,-1,6,2.5,0,0,7);ctx.fill()}ctx.fillStyle=L.head==='helm'?L.helm:(L.skin||'#d9ae8a');ctx.beginPath();ctx.arc(-13,1,4.5,0,7);ctx.fill();ctx.restore()}
  if(u.kind==='enemy'&&u.hp<u.maxhp){bar(sx,sy-figTop(u)-8,26,u.hp/u.maxhp,'#c0524a')}
  if(u.kind==='hero'&&u.ai){bar(sx,sy-Math.max(50,figTop(u)+6),24,u.hp/u.maxhp,'#7fb069')}
  if(u.kind==='enemy'&&u.stun>0){ctx.fillStyle='#9fd3ff';ctx.font='700 11px "Alegreya Sans",sans-serif';ctx.textAlign='center';ctx.fillText('* *',sx,sy-figTop(u)-12);ctx.textAlign='left'}
  if(u.sleep){ctx.fillStyle='rgba(200,200,190,.6)';ctx.font='600 11px "Alegreya Sans",sans-serif';ctx.fillText('z',sx+10,sy-figTop(u)-2)}
}
function bar(x,y,w,f,col){ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(x-w/2-1,y-1,w+2,5);ctx.fillStyle=col;ctx.fillRect(x-w/2,y,w*Math.max(0,f),3)}

/* ---------- render ---------- */
function render(){
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  if(!SC){drawTitleBg();return}
  if(SC.kind==='village')drawSky();else{ctx.fillStyle='#050407';ctx.fillRect(0,0,W,H)}
  const shx=SC.shake>0?(Math.random()-.5)*SC.shake:0,shy=SC.shake>0?(Math.random()-.5)*SC.shake:0;
  const ox=W/2-SC.cam.x*Z+shx,oy=H/2-SC.cam.y*Z+shy;
  ctx.setTransform(DPR*Z,0,0,DPR*Z,DPR*ox,DPR*oy);
  // Per-tile overlays (attack warnings, flashes, skill tiles) are drawn right after their tile, under anyone standing there.
  const OV=new Map();const addOv=(x,y,f)=>{const k=key(x,y);if(!OV.has(k))OV.set(k,[]);OV.get(k).push(f)};
  for(const a of SC.attacks){const p=1-a.wind/a.wmax,pulse=.5+.5*Math.sin(SC.t*20);for(const k of a.tiles){const[x,y]=k.split(',').map(Number);addOv(x,y,()=>{const q=quad(x,y);poly(q,`rgba(190,40,32,${.25+.22*p})`,`rgba(255,120,95,${.5+.35*pulse})`,1.5);const cx=(q[0][0]+q[2][0])/2,cy=(q[0][1]+q[2][1])/2,s2=Math.max(.05,p);poly(q.map(([px,py])=>[cx+(px-cx)*s2,cy+(py-cy)*s2]),`rgba(245,95,70,${.45+.3*p})`)})}}
  for(const[k,v]of SC.flash){const[x,y]=k.split(',').map(Number);addOv(x,y,()=>poly(quad(x,y),`rgba(255,220,190,${v*1.8})`))}
  for(const f of SC.fx){if(f.ring)continue;const a=f.t/f.max;for(const[x,y]of f.tiles)addOv(x,y,()=>poly(quad(x,y),`rgba(${f.col},${.45*a})`))}
  // Cull to the view: tiles/items further than this from the camera are skipped.
  const vw=W/2/Z+90,vt=H/2/Z+140,vb=H/2/Z+VOIDD*4+60,cx0=SC.cam.x,cy0=SC.cam.y;
  const onScreen=(sx,sy)=>sx>cx0-vw&&sx<cx0+vw&&sy>cy0-vt&&sy<cy0+vb;
  const tileVis=(x,y)=>onScreen((x-y)*32,(x+y)*16+16-SC.HZ[x][y]);
  const tileAt=(x,y)=>{drawTile(x,y,SC.T[x][y]===2&&cutFor(x,y));const o=OV.get(key(x,y));if(o)for(const f of o)f()};
  const items=[];
  for(const u of SC.units)if(!u.gone)items.push({k:Math.max(u.fx+u.fy,u.tx+u.ty)+.5,u});
  for(const o of SC.objs){if(o.type==='fallen'&&o.state==='carried')continue;const[ox2,oy2]=iso(o.x+.5,o.y+.5);if(!onScreen(ox2,oy2+60))continue;items.push({k:o.x+o.y+.5+(o.kOff||0),o})}
  items.sort((a,b)=>a.k-b.k);let ii=0;
  const N=SC.W+SC.H-2;
  const early=s=>{if(s<0||s>N)return;for(let x=Math.max(0,s-SC.H+1);x<=Math.min(SC.W-1,s);x++){const y=s-x;if(SC.T[x][y]===1&&SC.EARLY[x][y]&&tileVis(x,y))tileAt(x,y)}};
  early(0);
  for(let s=0;s<=N;s++){
    while(ii<items.length&&items[ii].k<s){const it=items[ii++];it.u?drawUnit(it.u):drawObj(it.o)}
    for(let x=Math.max(0,s-SC.H+1);x<=Math.min(SC.W-1,s);x++){const y=s-x,t=SC.T[x][y];if(!t||!tileVis(x,y))continue;
      if(t===2||!SC.EARLY[x][y])tileAt(x,y);
      const c=SC.COL[x][y];if(!c||!c.b)continue;const b=c.b;
      if(b.spr&&bldArt(b.spr)){if(x===b.x0&&y===b.y1)drawBuildingHalf(b,0,cutFor(x,y)?.35:1);if(x===b.x1&&y===b.y0)drawBuildingHalf(b,1,cutFor(x,y)?.35:1)}else drawBuildingTile(x,y,b,cutFor(x,y)?.35:1)}
    early(s+1);
  }
  while(ii<items.length){const it=items[ii++];it.u?drawUnit(it.u):drawObj(it.o)}
  // Waterfalls hang in front of the cliffs, so they go after the terrain.
  for(const o of SC.objs)if(o.type==='fall'){const[fx,fy]=iso(o.x+.5,o.y+.5);if(onScreen(fx,fy+100))drawFall(o,fx,fy)}
  for(const f of SC.fx){if(!f.ring)continue;const a=f.t/f.max;const[x,y]=iso(f.x,f.y);ctx.strokeStyle=`rgba(160,230,160,${a})`;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,y,f.r*45*(1.2-a*.2),f.r*22*(1.2-a*.2),0,0,7);ctx.stroke()}
  for(const p of SC.projs){const[x,y]=iso(p.x,p.y);if(p.kind==='arrow'){const fx=(p.dx-p.dy)*.9,fy=(p.dx+p.dy)*.45;ctx.strokeStyle='#ebe2cd';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-fx*10,y-18-fy*10);ctx.lineTo(x+fx*6,y-18+fy*6);ctx.stroke()}else{ctx.fillStyle='rgba(150,180,255,.4)';ctx.beginPath();ctx.arc(x,y-18,8,0,7);ctx.fill();ctx.fillStyle='#dfe8ff';ctx.beginPath();ctx.arc(x,y-18,3.5,0,7);ctx.fill()}}
  for(const p of SC.parts){const[x,y]=iso(p.x,p.y);ctx.globalAlpha=Math.min(1,p.t*2.5);ctx.fillStyle=p.col;ctx.fillRect(x-p.size/2,y-p.z-p.size/2,p.size,p.size)}ctx.globalAlpha=1;
  if(SC.kind==='dungeon')drawFog(ox,oy);
  ctx.setTransform(DPR*Z,0,0,DPR*Z,DPR*ox,DPR*oy);
  overlays();
  ctx.setTransform(DPR,0,0,DPR,0,0);
  hud();
}
function overlays(){
  const P=SC.player;ctx.textAlign='center';
  if(SC.kind==='dungeon'){
    for(const o of SC.objs){if(o.type!=='fallen'||o.state==='carried')continue;const[sx,sy]=iso(o.x+.5,o.y+.5);const pulse=.6+.4*Math.sin(SC.t*4+o.x);const col=o.state==='stable'?'#f0d08a':`rgba(232,80,70,${pulse})`;
      ctx.fillStyle=col;ctx.fillRect(sx-2.5,sy-38,5,15);ctx.fillRect(sx-7.5,sy-33,15,5);
      if(o.state==='fallen'&&o.prog>0){ctx.strokeStyle='#f0d08a';ctx.lineWidth=3;ctx.beginPath();ctx.arc(sx,sy-31,13,-Math.PI/2,-Math.PI/2+Math.PI*2*o.prog);ctx.stroke()}
      if(man(P.tx,P.ty,o.x,o.y)<=4){ctx.font='600 12px "Alegreya Sans",sans-serif';ctx.fillStyle='#ebe2cd';ctx.fillText(o.name+(o.state==='stable'?' · stable':' · bleeding'),sx,sy-46)}}
    for(const h of heroes())if(h.down&&h.revT>0){const p=pos(h);const[sx,sy]=iso(p.x,p.y,p.z);ctx.strokeStyle='#9fd27f';ctx.lineWidth=3;ctx.beginPath();ctx.arc(sx,sy-26,11,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,h.revT/2));ctx.stroke()}
  }else{
    ctx.font='600 12px "Alegreya Sans",sans-serif';
    for(const u of SC.units)if(u.kind==='npc'&&man(P.tx,P.ty,u.tx,u.ty)<=4){const p=pos(u);const[sx,sy]=iso(p.x,p.y,p.z);ctx.fillStyle='rgba(0,0,0,.55)';const w=ctx.measureText(u.name).width+12;ctx.fillRect(sx-w/2,sy-64,w,17);ctx.fillStyle='#ebe2cd';ctx.fillText(u.name,sx,sy-51)}
  }
  ctx.font='700 14px "Alegreya Sans",sans-serif';
  for(const t of SC.texts){const[x,y]=iso(t.x,t.y);const yy=y-46-(1.1-t.t)*24;ctx.globalAlpha=Math.min(1,t.t*2);ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillText(t.s,x+1,yy+1);ctx.fillStyle=t.col;ctx.fillText(t.s,x,yy)}
  ctx.globalAlpha=1;ctx.textAlign='left';
}
function drawFog(ox,oy){
  fctx.setTransform(1,0,0,1,0,0);fctx.globalCompositeOperation='source-over';fctx.clearRect(0,0,fog.width,fog.height);fctx.fillStyle='rgba(4,3,8,.9)';fctx.fillRect(0,0,fog.width,fog.height);fctx.globalCompositeOperation='destination-out';
  const L=[];for(const h of heroes()){const p=pos(h);L.push([p.x,p.y,h===SC.player?4.8:3.6,1])}
  for(const o of SC.objs){if(o.type==='brazier')L.push([o.x+.5,o.y+.5,3.6,1]);else if(o.type==='exit')L.push([o.x+.5,o.y+.5,3.4,0])}
  const b=SC.boss;if(b&&!b.gone){const p=pos(b);L.push([p.x,p.y,b.state==='dormant'?1.6:3.2,0])}
  for(const[x,y,r,w]of L){const[ix,iy]=iso(x,y);const sx=(ox+ix*Z)*DPR,sy=(oy+(iy-10)*Z)*DPR,R=r*42*Z*DPR*(w?1+.03*Math.sin(SC.t*9+x):1);
    fctx.save();fctx.translate(sx,sy);fctx.scale(1,.62);const g=fctx.createRadialGradient(0,0,0,0,0,R);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(.55,'rgba(0,0,0,.8)');g.addColorStop(1,'rgba(0,0,0,0)');fctx.fillStyle=g;fctx.fillRect(-R,-R,2*R,2*R);fctx.restore()}
  ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(fog,0,0);
  ctx.globalCompositeOperation='lighter';
  for(const[x,y,r,w]of L){if(!w)continue;const[ix,iy]=iso(x,y);const sx=(ox+ix*Z)*DPR,sy=(oy+(iy-10)*Z)*DPR,R=r*28*Z*DPR;const g=ctx.createRadialGradient(sx,sy,0,sx,sy,R);g.addColorStop(0,'rgba(240,150,60,.13)');g.addColorStop(1,'rgba(240,150,60,0)');ctx.fillStyle=g;ctx.fillRect(sx-R,sy-R,2*R,2*R)}
  ctx.globalCompositeOperation='source-over';
}
function drawSky(){
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#5f8fd8');g.addColorStop(.6,'#9cc0ec');g.addColorStop(1,'#d8e6f6');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // drifting clouds, slower than the camera so they read as far away
  const px=-(SC.cam.x*.05),py=-(SC.cam.y*.03);
  for(let i=0;i<9;i++){const x=((i*311+SC.t*5+px)%(W+400)+W+400)%(W+400)-200,y=H*(.12+(i%5)*.19)+py*.4,s2=60+(i*37)%70;
    ctx.fillStyle='rgba(255,255,255,.55)';for(let j=0;j<4;j++){ctx.beginPath();ctx.ellipse(x+j*s2*.5,y+(j%2)*6,s2*.6,s2*.28,0,0,7);ctx.fill()}}
}

function drawTitleBg(){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1b2140');g.addColorStop(1,'#4a3d63');ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
/* ---------- HUD: framed panels in the Order's navy and gold ---------- */
const GOLD='#d2ab52',PARCH='#ebe2cd',MUTED='#a59c8b',FELL='"IM Fell English SC","Times New Roman",serif',SANS='"Alegreya Sans",sans-serif';
function diamond(x,y,r,col){ctx.fillStyle=col||GOLD;ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r,y);ctx.closePath();ctx.fill()}
function frameBox(x,y,w,h){
  x=Math.round(x);y=Math.round(y);w=Math.round(w);h=Math.round(h);
  const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,'rgba(27,24,52,.93)');g.addColorStop(1,'rgba(13,11,28,.93)');
  ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
  ctx.lineWidth=1;ctx.strokeStyle=GOLD;ctx.strokeRect(x+.5,y+.5,w-1,h-1);
  ctx.strokeStyle='rgba(210,171,82,.28)';ctx.strokeRect(x+3.5,y+3.5,w-7,h-7);
  for(const[cx,cy]of[[x,y],[x+w,y],[x,y+h],[x+w,y+h]])diamond(cx,cy,3.5);
}
function meter(x,y,w,h,f,top,bot){
  ctx.fillStyle='#0a0815';ctx.fillRect(x,y,w,h);
  const fw=Math.max(0,Math.min(1,f))*(w-2);
  if(fw>0){const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,top);g.addColorStop(1,bot);ctx.fillStyle=g;ctx.fillRect(x+1,y+1,fw,h-2);ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(x+1,y+1,fw,1)}
  ctx.strokeStyle='rgba(210,171,82,.55)';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1);
}
function flaskIcon(x,y,full){
  ctx.fillStyle=full?'#c0524a':'rgba(10,8,21,.9)';ctx.beginPath();ctx.arc(x,y+2,4.2,0,7);ctx.fill();ctx.fillRect(x-1.6,y-5,3.2,4);
  if(full){ctx.fillStyle='rgba(255,210,170,.55)';ctx.fillRect(x-2,y,1.5,1.5)}
  ctx.strokeStyle=full?'#e8c27a':'rgba(210,171,82,.45)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y+2,4.2,0,7);ctx.stroke();ctx.strokeRect(x-1.6,y-5,3.2,3);
}
function goldRule(cx,y,half){for(const s of[-1,1]){const g=ctx.createLinearGradient(cx,0,cx+s*half,0);g.addColorStop(0,GOLD);g.addColorStop(1,'rgba(210,171,82,0)');ctx.fillStyle=g;ctx.fillRect(s<0?cx-half:cx,y,half,1)}diamond(cx,y+.5,3)}
// Souls-style bar: bronze end cap, dark track, gradient fill, and a pale trail that lingers where health was just lost.
function soulBar(x,y,w,h,f,trail,top,bot){
  x=Math.round(x);y=Math.round(y);
  ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(x-1,y-1,w+2,h+2);
  ctx.fillStyle='#120f0c';ctx.fillRect(x,y,w,h);
  if(trail>f){ctx.fillStyle='rgba(222,200,140,.85)';ctx.fillRect(x,y,w*Math.min(1,trail),h)}
  if(f>0){const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,top);g.addColorStop(1,bot);ctx.fillStyle=g;ctx.fillRect(x,y,w*Math.min(1,f),h);ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(x,y,w*Math.min(1,f),1)}
  ctx.strokeStyle='rgba(122,104,78,.85)';ctx.lineWidth=1;ctx.strokeRect(x-.5,y-.5,w+1,h+1);
  const cap=(cx)=>{const g=ctx.createLinearGradient(cx-3,0,cx+3,0);g.addColorStop(0,'#5a4a32');g.addColorStop(.5,'#c9a866');g.addColorStop(1,'#4a3c28');ctx.fillStyle=g;ctx.fillRect(cx-2,y-3,4,h+6)};
  cap(x-2);ctx.fillStyle='#8a7550';ctx.fillRect(x+w+1,y-1,2,h+2);
}
function trailOf(u,f){if(u._tr===undefined||f>u._tr){u._tr=f;u._trT=0}else if(f<u._lf)u._trT=SC.t+.7;u._lf=f;if(SC.t>u._trT)u._tr+=(f-u._tr)*.06;return u._tr}
const coarse=typeof matchMedia!=='undefined'&&matchMedia('(pointer:coarse)').matches;
function hud(){
  if(!S.started||!SC)return;const p=SC.player,c=CLASSES[p.cls];
  // Shrink the HUD on short screens (landscape phones); VW/VH are the scaled-down canvas size.
  const k=Math.max(.7,Math.min(1,H/560)),VW=W/k,VH=H/k;ctx.save();ctx.scale(k,k);const narrow=VW<600;
  ctx.textBaseline='alphabetic';
  // Player: health, stamina and skill bars in the top left, Souls style, with no panel behind them.
  const x0=26;let y=24;const hpw=Math.min(VW*.42,150+p.maxhp*1.25),stw=Math.min(VW*.32,190),skw=Math.min(VW*.24,130);
  const hf=Math.max(0,p.hp/p.maxhp);soulBar(x0,y,hpw,10,hf,trailOf(p,hf),'#b8322a','#6a1410');
  soulBar(x0,y+17,stw,7,p.st/100,0,'#5f9a4a','#2c5a24');
  const sk=1-Math.max(0,p.skillCd)/c.skillCd;soulBar(x0,y+31,skw,5,sk,0,p.skillCd>0?'#4a5f8e':'#7d9de0',p.skillCd>0?'#26324e':'#3a5294');
  ctx.font=`13px ${FELL}`;ctx.shadowColor='#000';ctx.shadowBlur=4;ctx.fillStyle=p.skillCd>0?MUTED:'#cfdcff';ctx.fillText(c.skill,x0+skw+10,y+37);
  // Flask count under the bars.
  y+=50;ctx.save();ctx.translate(x0+6,y+6);ctx.scale(1.5,1.5);flaskIcon(0,0,S.flasks>0);ctx.restore();
  ctx.font=`18px ${FELL}`;ctx.fillStyle=S.flasks>0?PARCH:MUTED;ctx.fillText(String(S.flasks),x0+20,y+14);
  // Companions, like summoned phantoms: name and a thin bar.
  const allies=heroes().filter(h=>h.ai);
  allies.forEach((a,i)=>{const ay=y+38+i*24;ctx.fillStyle=a.ring;ctx.beginPath();ctx.arc(x0+3,ay-4,3.5,0,7);ctx.fill();
    ctx.font=`13px ${FELL}`;ctx.fillStyle=a.down?'#ef8a7e':PARCH;ctx.fillText(a.down?`${a.name} · down`:a.name,x0+12,ay);
    if(!a.down){const af=a.hp/a.maxhp;soulBar(x0+12,ay+5,Math.min(110,VW*.2),4,af,trailOf(a,af),'#9a3a30','#5a1a14')}});
  ctx.shadowBlur=0;
  // Purse and pack in the top right, under the pause button.
  let lines;
  if(SC.kind==='dungeon'){const m=KNIGHTS.filter(kk=>S.roster[kk.id]==='missing').length;lines=[[`${SC.pack.coins} coins in pack`,18,FELL,PARCH],[`${SC.pack.copper} copper · ${SC.pack.iron} iron`,12.5,SANS,MUTED],[m?`${m} wounded still below`:'All wounded accounted for',13,FELL,GOLD]]}
  else lines=[[`${S.coins} coins`,18,FELL,PARCH],[`${S.ore.copper} copper · ${S.ore.iron} iron`,12.5,SANS,MUTED]];
  // The pause button is HTML at full size (42px, 12px from the top), so start below it in screen pixels, then convert.
  ctx.textAlign='right';ctx.shadowColor='#000';ctx.shadowBlur=5;let ly=(12+42+22)/k;
  for(const[t,sz,f,col]of lines){ctx.font=`${f===SANS?'500 ':''}${sz}px ${f}`;ctx.fillStyle=col;ctx.fillText(t,VW-20,ly);ly+=sz+5}
  ctx.textAlign='left';ctx.shadowBlur=0;
  // Boss bar along the bottom: name above, long thin bar. On touch screens it sits between the D-pad and the buttons.
  const b=SC.boss;let bottom=VH-14;
  if(b&&!b.gone&&b.state!=='dormant'){const side=coarse?250:60,w=Math.max(220,Math.min(620,VW-side*2)),x=(VW-w)/2,yb=VH-(coarse?30:34);
    ctx.font=`17px ${FELL}`;ctx.fillStyle=PARCH;ctx.shadowColor='#000';ctx.shadowBlur=6;ctx.fillText('The Lantern Warden',x,yb-9);ctx.shadowBlur=0;
    const bf=b.hp/b.maxhp;soulBar(x,yb,w,8,bf,trailOf(b,bf),'#a8261e','#560d0a');bottom=VH-64}
  // Interaction prompt.
  const pr=SC.prompt,live=!!(pr&&!p.down);if(live!==hud.live){hud.live=live;const ub=document.querySelector('.touch .b-act');if(ub)ub.classList.toggle('live',live)}
  if(pr&&!p.down){ctx.font=`600 14px ${SANS}`;const tw2=ctx.measureText(pr.label).width+40;const x=(VW-tw2)/2,yp=bottom-34;
    const g=ctx.createLinearGradient(x,0,x+tw2,0);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.15,'rgba(0,0,0,.72)');g.addColorStop(.85,'rgba(0,0,0,.72)');g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;ctx.fillRect(x,yp,tw2,28);ctx.fillStyle='rgba(200,184,150,.35)';ctx.fillRect(x+tw2*.1,yp,tw2*.8,1);ctx.fillRect(x+tw2*.1,yp+27,tw2*.8,1);
    ctx.fillStyle=PARCH;ctx.textAlign='center';ctx.fillText(pr.label,VW/2,yp+19);ctx.textAlign='left';
    if(pr.prog){const v=Math.max(0,Math.min(1,pr.prog()));if(v>0){ctx.fillStyle=GOLD;ctx.fillRect(x+tw2*.1,yp+25,tw2*.8*v,2)}}}
  // Banner: a dark band across the screen with the title on it. The party falling gets the red treatment.
  if(SC.banner){const bn=SC.banner,fell=/Fallen/.test(bn.title);ctx.globalAlpha=Math.max(0,Math.min(1,bn.t/.4,(bn.max-bn.t)/.3));ctx.textAlign='center';
    const by=narrow?VH*.5:Math.max(VH*.3,170),bh=bn.sub?96:64;
    const band=ctx.createLinearGradient(0,by-bh*.62,0,by+bh*.62);band.addColorStop(0,'rgba(0,0,0,0)');band.addColorStop(.3,'rgba(0,0,0,.6)');band.addColorStop(.7,'rgba(0,0,0,.6)');band.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=band;ctx.fillRect(0,by-bh*.62-8,VW,bh*1.24+(bn.sub?24:0));
    ctx.font=`${fell?(narrow?34:52):(narrow?28:40)}px ${FELL}`;ctx.shadowColor='rgba(0,0,0,.9)';ctx.shadowBlur=12;
    ctx.fillStyle=fell?'#a8261e':'#efe6d0';ctx.fillText(bn.title,VW/2,by);ctx.shadowBlur=0;
    if(!fell){const half=Math.min(220,ctx.measureText(bn.title).width/2+60);goldRule(VW/2,by+12,half)}
    if(bn.sub){ctx.shadowColor='#000';ctx.shadowBlur=8;ctx.fillStyle='#d8ccae';ctx.font=`500 15px ${SANS}`;const words=bn.sub.split(' ');let line='',ly2=by+38;for(const w of words){const t=line?line+' '+w:w;if(ctx.measureText(t).width>Math.min(560,VW-40)){ctx.fillText(line,VW/2,ly2);ly2+=19;line=w}else line=t}ctx.fillText(line,VW/2,ly2);ctx.shadowBlur=0}
    ctx.textAlign='left';ctx.globalAlpha=1}
  ctx.restore();
  if(joy.id!==null){ctx.strokeStyle='rgba(210,171,82,.5)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(joy.ox,joy.oy,46,0,7);ctx.stroke();ctx.strokeStyle='rgba(210,171,82,.2)';ctx.beginPath();ctx.arc(joy.ox,joy.oy,42,0,7);ctx.stroke();ctx.fillStyle='rgba(27,24,52,.75)';ctx.beginPath();ctx.arc(joy.ox+joy.x*46,joy.oy+joy.y*46,17,0,7);ctx.fill();ctx.strokeStyle=GOLD;ctx.stroke()}
}
