'use strict';
// All drawing: tiles, walls, buildings, characters, fog and HUD.
/* ---------- drawing primitives ---------- */
function poly(pts,fill,stroke,lw){ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw||1;ctx.stroke()}}
const quad=(x,y)=>[iso(x,y),iso(x+1,y),iso(x+1,y+1),iso(x,y+1)];
function ellipse(x,y,rx,ry,fill){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill()}
function drawFloor(x,y){
  const st=SC.ST[x][y],pal=FLOOR[st],v=hash(x,y),col=pal[Math.floor(v*pal.length)];const[A,B,C,D]=quad(x,y);
  if(SC.kind==='village'){const dp=58;
    if(!floorAt(x,y+1)){const g=ctx.createLinearGradient(0,D[1],0,D[1]+dp);g.addColorStop(0,'#4a3f33');g.addColorStop(1,'rgba(30,26,36,0)');poly([D,C,[C[0],C[1]+dp],[D[0],D[1]+dp]],g)}
    if(!floorAt(x+1,y)){const g=ctx.createLinearGradient(0,B[1],0,B[1]+dp);g.addColorStop(0,'#5b4e3e');g.addColorStop(1,'rgba(30,26,36,0)');poly([B,C,[C[0],C[1]+dp],[B[0],B[1]+dp]],g)}}
  let tn=null;
  if(st==='g'){const edge=!floorAt(x,y+1)||!floorAt(x+1,y);tn=edge?(v<.5?'cliff1':'cliff2'):(v<.55?'grass1':v<.82?'grass2':'grass3')}
  else if(st==='c')tn=v<.45?'cobble1':v<.8?'cobble2':'cobble3';
  else if(st==='d')tn=v<.5?'dirt1':'dirt2';
  else if(st==='s')tn=v<.06?'bones':v<.5?'dfloor1':v<.8?'dfloor2':'dfloor3';
  else if(st==='b')tn=RUNES[key(x,y)]||(v<.5?'dfloor2':'dfloor3');
  const ta=tn&&art(tn);
  if(ta){ctx.drawImage(ta.im,A[0]-32,A[1],64,ta.h);if(st==='b')poly([A,B,C,D],RUNES[key(x,y)]?'rgba(30,8,14,.32)':'rgba(30,8,14,.28)');return}
  poly([A,B,C,D],col,'rgba(0,0,0,.2)',1);
  const cx=(A[0]+C[0])/2,cy=(A[1]+C[1])/2;
  if(st==='c'){ctx.fillStyle='rgba(255,255,255,.06)';ctx.fillRect(cx-10+v*6,cy-4,9,4);ctx.fillRect(cx+2-v*4,cy+2,8,4)}
  else if(st==='g'&&v<.3){ctx.strokeStyle='rgba(120,150,90,.5)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx-4,cy+2);ctx.lineTo(cx-5,cy-3);ctx.moveTo(cx,cy+2);ctx.lineTo(cx+1,cy-4);ctx.moveTo(cx+4,cy+2);ctx.lineTo(cx+6,cy-2);ctx.stroke()}
  else if((st==='s'||st==='b')&&v<.14){ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx-10,cy-2);ctx.lineTo(cx-2,cy+1);ctx.lineTo(cx+7,cy-3);ctx.stroke()}
  else if(st==='s'&&v>.93){ctx.fillStyle='rgba(214,207,186,.4)';ctx.fillRect(cx-6,cy,8,2);ctx.fillRect(cx+1,cy-3,2,5)}
}
function cutFor(x,y){
  if(SC.kind!=='dungeon'&&SC.kind!=='village')return false;
  const list=SC.kind==='dungeon'?heroes():[SC.player];
  for(const h of list){const hs=h.tx+h.ty,hd=h.tx-h.ty,s=x+y,dd=x-y;if(s>hs&&s-hs<=4&&Math.abs(dd-hd)<=(SC.kind==='dungeon'?3:2))return true}
  return false;
}
function brickFace(P0,P1,hb,ht,mortar,brick,seed){
  ctx.save();ctx.beginPath();ctx.moveTo(P0[0],P0[1]-hb);ctx.lineTo(P1[0],P1[1]-hb);ctx.lineTo(P1[0],P1[1]-ht);ctx.lineTo(P0[0],P0[1]-ht);ctx.closePath();ctx.fillStyle=mortar;ctx.fill();ctx.clip();
  const dx=P1[0]-P0[0],dy=P1[1]-P0[1];ctx.transform(dx/32,dy/32,0,1,P0[0],P0[1]);
  const rh=7.5;let r=0;
  for(let yy=-hb;yy>-ht-rh;yy-=rh,r++){const off=(r%2)*8;for(let u=-off;u<32;u+=16){const v=hash(u+r*7.3,seed);ctx.fillStyle=shade(brick,(v-.5)*.3);ctx.fillRect(u+1,yy-rh+1.2,14,rh-1.4);ctx.fillStyle='rgba(255,255,255,.07)';ctx.fillRect(u+1,yy-rh+1.2,14,1)}}
  ctx.restore();
}
function drawWall(x,y,cut){
  const h=cut?10:46;const[A,B,C,D]=quad(x,y);const v=hash(y,x);
  const nh=(nx,ny)=>{if(!inB(nx,ny)||SC.T[nx][ny]!==2)return 0;if(!SC.COL[nx][ny])return 46;return cutFor(nx,ny)?10:46};
  const l=nh(x,y+1),r=nh(x+1,y);
  if(l<h)brickFace(D,C,l,h,'#1d1c1f','#45423f',x*13+y*7);
  if(r<h)brickFace(B,C,r,h,'#26252a','#575350',x*5+y*11);
  poly([[A[0],A[1]-h],[B[0],B[1]-h],[C[0],C[1]-h],[D[0],D[1]-h]],shade('#5d5953',(v-.5)*.12),'rgba(0,0,0,.45)',1);
  if(!cut&&v<.35){ctx.fillStyle='rgba(90,110,60,.35)';ctx.fillRect((A[0]+C[0])/2-6+v*10,(A[1]+C[1])/2-h-2,8,3)}
}
function drawBuildingTile(x,y,b,alpha){
  const mid=(b.y0+b.y1+1)/2,half=(b.y1+1-b.y0)/2;const hf=cy=>b.eave+(b.ridge-b.eave)*(1-Math.abs(cy-mid)/half);
  const[A,B,C,D]=quad(x,y);const hA=hf(y),hB=hf(y),hC=hf(y+1),hD=hf(y+1),we=b.eave-6;
  ctx.globalAlpha=alpha;
  if(y===b.y1){poly([D,C,[C[0],C[1]-we],[D[0],D[1]-we]],shade(b.wall,-.28));
    if(x===Math.floor((b.x0+b.x1)/2)){const d1=[D[0]+(C[0]-D[0])*.3,D[1]+(C[1]-D[1])*.3],d2=[D[0]+(C[0]-D[0])*.7,D[1]+(C[1]-D[1])*.7];poly([d1,d2,[d2[0],d2[1]-24],[d1[0],d1[1]-24]],'#3a2a1e');ctx.fillStyle='rgba(240,180,90,.5)';ctx.fillRect((d1[0]+d2[0])/2-1,(d1[1]+d2[1])/2-14,2,2)}
    else{const w1=[D[0]+(C[0]-D[0])*.35,D[1]+(C[1]-D[1])*.35],w2=[D[0]+(C[0]-D[0])*.65,D[1]+(C[1]-D[1])*.65];poly([[w1[0],w1[1]-14],[w2[0],w2[1]-14],[w2[0],w2[1]-24],[w1[0],w1[1]-24]],'#f0c070')}}
  if(x===b.x1){poly([B,C,[C[0],C[1]-hC+4],[B[0],B[1]-hB+4]],shade(b.wall,-.12));
    const m1=[B[0]+(C[0]-B[0])*.35,B[1]+(C[1]-B[1])*.35],m2=[B[0]+(C[0]-B[0])*.65,B[1]+(C[1]-B[1])*.65];poly([[m1[0],m1[1]-14],[m2[0],m2[1]-14],[m2[0],m2[1]-24],[m1[0],m1[1]-24]],'#e8b860')}
  const back=(y+.5)<mid;
  poly([[A[0],A[1]-hA],[B[0],B[1]-hB],[C[0],C[1]-hC],[D[0],D[1]-hD]],shade(b.roof,back?.1:-.15),'rgba(0,0,0,.25)',1);
  ctx.globalAlpha=1;
}

/* ---------- figures ---------- */
function drawSpriteFigure(u,L,C,sx,sy,o){
  const s=o.scale||u.scale||1,f=u.face||{x:0,y:1},sfx=f.x-f.y;
  if(sfx!==0)u._dir=sfx<0?-1:1;const dir=u._dir||1,kneel=u.kneel||u.drink>0;
  if(u.prog<1)u._walkT=SC.t;
  const walking=SC.t-(u._walkT??-9)<.1,wp=SC.t*11+u.id*.37,fi=Math.floor(wp)%C.walk.length,fr=walking?C.walk[fi]:C.idle;
  // Walking: rise on the passing frames, dip on the strides. Standing: a slow breath.
  const bob=walking?-(fi%2?2:0)-Math.sin((wp%1)*Math.PI)*.8:0,breath=walking?0:Math.sin(SC.t*2.2+u.id)*.5+.5;
  ctx.save();ctx.translate(sx,sy);
  if(o.ring){ctx.strokeStyle=o.ring;ctx.globalAlpha=.85;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,14,7,0,0,7);ctx.stroke();ctx.globalAlpha=1}
  ellipse(2,1,12*s,5*s,'rgba(0,0,0,.35)');
  if(u.inv>0&&u.dash>0)ctx.globalAlpha=.55;
  ctx.scale(dir*s,s);if(kneel){ctx.translate(0,1);ctx.scale(1,.9)}
  ctx.save();ctx.translate(0,bob);if(breath)ctx.scale(1-breath*.008,1+breath*.018);
  ctx.drawImage(u.flash>0?C.white:C.im,fr*C.fw,0,C.fw,C.fh,-C.ax,-C.ay,C.w,C.h);ctx.restore();
  if(u.atkT>0&&L.weapon==='sword'){const sw=1-u.atkT/.22;ctx.save();ctx.translate(6,-34);ctx.rotate(-1.9+sw*2.6);ctx.strokeStyle='#e4e8ee';ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(24,0);ctx.stroke();ctx.strokeStyle='#c9a24e';ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(3,-4.5);ctx.lineTo(3,4.5);ctx.stroke();ctx.restore();
    if(u.atkT>.08){ctx.strokeStyle=`rgba(245,235,205,${u.atkT*3})`;ctx.lineWidth=3;ctx.beginPath();ctx.arc(8,-26,24,-1.6,.6);ctx.stroke()}}
  ctx.restore();ctx.globalAlpha=1;
}
const figTop=u=>{const C=u.look&&u.look.sprite&&CHARS[u.look.sprite];return C&&C.ok?C.h*(u.scale||1):42};
function drawFigure(u,L,sx,sy,o={}){
  const C=L.sprite&&CHARS[L.sprite];if(C&&C.ok){drawSpriteFigure(u,L,C,sx,sy,o);return}
  const s=o.scale||u.scale||1,f=u.face||{x:0,y:1},sfx=f.x-f.y,sfy=f.x+f.y;
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
function drawLying(sx,sy,L,col){
  ellipse(sx+2,sy+1,15,6,'rgba(0,0,0,.35)');
  ctx.fillStyle=shade(L.body,-.15);ctx.beginPath();ctx.ellipse(sx,sy-4,14,5.5,-.12,0,7);ctx.fill();
  if(L.tabard){ctx.fillStyle=L.tabard;ctx.beginPath();ctx.ellipse(sx+1,sy-5,7,3,-.12,0,7);ctx.fill()}
  ctx.fillStyle=L.head==='helm'?L.helm:(L.skin||'#d9ae8a');ctx.beginPath();ctx.arc(sx-13,sy-6,5,0,7);ctx.fill();
  if(L.hair&&L.head!=='helm'){ctx.fillStyle=L.hair;ctx.beginPath();ctx.arc(sx-14,sy-7,4.5,Math.PI*.8,Math.PI*1.9);ctx.fill()}
  if(col){ctx.fillStyle=col;ctx.globalAlpha=.6;ctx.fillRect(sx-2,sy-8,9,2);ctx.globalAlpha=1}
}
function drawBoss(b,sx,sy){
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
  if(o.type==='tree'&&drawArt('tree',sx,sy,hash(o.x,o.y)<.5))return;
  if(o.type==='well'&&drawArt('well',sx,sy))return;
  if(o.type==='banner'&&drawArt('banner',sx,sy,o.x>16))return;
  if(o.type==='rubble'&&drawArt('stub',sx,sy))return;
  if(o.type==='brazier'&&drawArt('brazier',sx,sy))return;
  if(o.type==='chest'&&drawArt(o.open?'chestOpen':'chest',sx,sy))return;
  if(o.type==='exit'&&art('portal'))return;
  if(o.type==='ore'&&drawArt(o.metal==='iron'?'iron':'copper',sx,sy)){const max=o.metal==='iron'?4:3;if(o.hp<max){ctx.strokeStyle='rgba(0,0,0,.75)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(sx-6,sy-26);ctx.lineTo(sx-1,sy-16);ctx.lineTo(sx-5,sy-8);if(o.hp<max-1){ctx.moveTo(sx+9,sy-22);ctx.lineTo(sx+4,sy-12)}ctx.stroke()}return}
  if(o.type==='tree'){const h=hash(o.y,o.x);ellipse(sx+3,sy,20,9,'rgba(0,0,0,.3)');ctx.fillStyle='#3d2c1e';ctx.fillRect(sx-3,sy-24,6,24);const g=h<.5?'#2f4426':'#35502c';ellipse(sx,sy-42,20,17,g);ellipse(sx-6,sy-50,12,10,shade(g,.12));ellipse(sx+7,sy-36,11,9,shade(g,-.1))}
  else if(o.type==='well'){ellipse(sx,sy-6,22,11,'#5a5550');ellipse(sx,sy-12,22,11,'#77716a');ellipse(sx,sy-12,15,7,'#1d2a33');ctx.strokeStyle='#4a3626';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(sx-18,sy-12);ctx.lineTo(sx-18,sy-46);ctx.moveTo(sx+18,sy-12);ctx.lineTo(sx+18,sy-46);ctx.stroke();poly([[sx-26,sy-44],[sx,sy-58],[sx+26,sy-44],[sx,sy-36]],'#6a3a2a')}
  else if(o.type==='anvil'){ellipse(sx+2,sy,13,6,'rgba(0,0,0,.3)');ctx.fillStyle='#4a3a2a';ctx.fillRect(sx-6,sy-10,12,10);ctx.fillStyle='#4b4e55';ctx.beginPath();ctx.moveTo(sx-14,sy-16);ctx.lineTo(sx+12,sy-16);ctx.lineTo(sx+8,sy-10);ctx.lineTo(sx-10,sy-10);ctx.closePath();ctx.fill()}
  else if(o.type==='banner'){ctx.strokeStyle='#3a2a1e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx,sy-60);ctx.stroke();const w=Math.sin(SC.t*3+o.x)*2;ctx.fillStyle='#e8dfca';ctx.beginPath();ctx.moveTo(sx+2,sy-58);ctx.lineTo(sx+20,sy-56+w);ctx.lineTo(sx+20,sy-30+w);ctx.lineTo(sx+11,sy-35+w);ctx.lineTo(sx+2,sy-30);ctx.closePath();ctx.fill();ctx.fillStyle='#b3362e';ctx.fillRect(sx+9,sy-52+w*.5,4,14);ctx.fillRect(sx+6,sy-47+w*.5,10,4)}
  else if(o.type==='chimney'){const b=SC.forge;const mid=(b.y0+b.y1+1)/2,half=(b.y1+1-b.y0)/2;const base=b.eave+(b.ridge-b.eave)*(1-Math.abs(o.y+.4-mid)/half);const[cx,cy]=iso(o.x+.4,o.y+.4);ctx.fillStyle='#5a4a3e';ctx.fillRect(cx-6,cy-base-26,12,26);ctx.fillStyle='#3a2e26';ctx.fillRect(cx-7,cy-base-28,14,4)}
  else if(o.type==='gate'){const L=iso(10.5,1.5),R=iso(12.5,1.5);const pil=(p)=>{ctx.fillStyle='#4a4652';ctx.fillRect(p[0]-12,p[1]-74,24,74);ctx.fillStyle='#5c5766';ctx.fillRect(p[0]-12,p[1]-74,12,74)};
    ctx.fillStyle='#120f18';poly([[L[0]+10,L[1]],[R[0]-10,R[1]],[R[0]-10,R[1]-62],[L[0]+10,L[1]-62]],'#120f18');
    const g=ctx.createLinearGradient(0,sy-60,0,sy);g.addColorStop(0,'rgba(140,110,200,.05)');g.addColorStop(1,'rgba(140,110,200,.35)');poly([[L[0]+10,L[1]],[R[0]-10,R[1]],[R[0]-10,R[1]-62],[L[0]+10,L[1]-62]],g);
    pil(L);pil(R);poly([[L[0]-16,L[1]-74],[R[0]+16,R[1]-74],[R[0]+16,R[1]-86],[L[0]-16,L[1]-86]],'#5c5766');
    ctx.fillStyle='#d2ab52';ctx.font='11px "IM Fell English SC",serif';ctx.textAlign='center';ctx.fillText('ASHEN BARROW',sx,sy-76);ctx.textAlign='left'}
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
function drawUnit(u){
  const p=pos(u);const[sx,sy]=iso(p.x,p.y);
  if(u.kind==='boss'){drawBoss(u,sx,sy);return}
  if(u.kind==='hero'&&u.down){drawLying(sx,sy,u.look,null);ctx.strokeStyle=u.ring;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(sx,sy,15,7.5,0,0,7);ctx.stroke();return}
  drawFigure(u,u.look,sx,sy,{ring:u.kind==='hero'?u.ring:null});
  if(u.carrying){const L=u.carrying.k.look;ctx.save();ctx.translate(sx,sy-Math.max(30,figTop(u)*.72));ctx.fillStyle=shade(L.body,-.1);ctx.beginPath();ctx.ellipse(0,0,13,4.5,0,0,7);ctx.fill();if(L.tabard){ctx.fillStyle=L.tabard;ctx.beginPath();ctx.ellipse(1,-1,6,2.5,0,0,7);ctx.fill()}ctx.fillStyle=L.head==='helm'?L.helm:(L.skin||'#d9ae8a');ctx.beginPath();ctx.arc(-13,1,4.5,0,7);ctx.fill();ctx.restore()}
  if(u.kind==='enemy'&&u.hp<u.maxhp){bar(sx,sy-48,26,u.hp/u.maxhp,'#c0524a')}
  if(u.kind==='hero'&&u.ai){bar(sx,sy-Math.max(50,figTop(u)+6),24,u.hp/u.maxhp,'#7fb069')}
  if(u.kind==='enemy'&&u.stun>0){ctx.fillStyle='#9fd3ff';ctx.font='700 11px "Alegreya Sans",sans-serif';ctx.textAlign='center';ctx.fillText('* *',sx,sy-52);ctx.textAlign='left'}
  if(u.sleep){ctx.fillStyle='rgba(200,200,190,.6)';ctx.font='600 11px "Alegreya Sans",sans-serif';ctx.fillText('z',sx+8,sy-42)}
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
  for(let s=0;s<=SC.W+SC.H-2;s++)for(let x=Math.max(0,s-SC.H+1);x<=Math.min(SC.W-1,s);x++){const y=s-x;if(SC.T[x][y]===1&&!SC.COL[x][y])drawFloor(x,y)}
  if(SC.kind==='dungeon'){const[rx,ry]=iso(24.5,20.5);ctx.strokeStyle='rgba(150,60,50,.28)';ctx.lineWidth=2;for(const r of[4.6,3.6]){ctx.beginPath();ctx.ellipse(rx,ry,r*32*1.414,r*16*1.414,0,0,7);ctx.stroke()}
    const ex=SC.exit;if(ex&&art('portal')){const[a,b]=iso(ex.x+.5,ex.y+.5);ctx.globalAlpha=.85+.15*Math.sin(SC.t*3);drawArt('portal',a,b);ctx.globalAlpha=1}
    else if(ex){const[a,b]=iso(ex.x+.5,ex.y+.5);const p=.5+.5*Math.sin(SC.t*3);ctx.fillStyle=`rgba(246,220,138,${.25+.15*p})`;ctx.beginPath();ctx.ellipse(a,b,36,18,0,0,7);ctx.fill();ctx.strokeStyle='rgba(255,236,170,.85)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(a,b,36,18,0,0,7);ctx.stroke()}}
  for(const a of SC.attacks){const p=1-a.wind/a.wmax,pulse=.5+.5*Math.sin(SC.t*20);for(const k of a.tiles){const[x,y]=k.split(',').map(Number);const q=quad(x,y);poly(q,`rgba(190,40,32,${.25+.22*p})`,`rgba(255,120,95,${.5+.35*pulse})`,1.5);const cx=(q[0][0]+q[2][0])/2,cy=(q[0][1]+q[2][1])/2,s=Math.max(.05,p);poly(q.map(([px,py])=>[cx+(px-cx)*s,cy+(py-cy)*s]),`rgba(245,95,70,${.45+.3*p})`)}}
  for(const[k,v]of SC.flash){const[x,y]=k.split(',').map(Number);poly(quad(x,y),`rgba(255,220,190,${v*1.8})`)}
  for(const f of SC.fx){const a=f.t/f.max;if(f.ring){const[x,y]=iso(f.x,f.y);ctx.strokeStyle=`rgba(160,230,160,${a})`;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,y,f.r*45*(1.2-a*.2),f.r*22*(1.2-a*.2),0,0,7);ctx.stroke()}else for(const[x,y]of f.tiles)poly(quad(x,y),`rgba(${f.col},${.45*a})`)}
  const items=[];
  for(const u of SC.units)if(!u.gone)items.push({k:Math.max(u.fx+u.fy,u.tx+u.ty)+.5,u});
  for(const o of SC.objs)if(!(o.type==='fallen'&&o.state==='carried'))items.push({k:o.x+o.y+.5+(o.kOff||0),o});
  items.sort((a,b)=>a.k-b.k);let ii=0;
  for(let s=0;s<=SC.W+SC.H-2;s++){
    while(ii<items.length&&items[ii].k<s){const it=items[ii++];it.u?drawUnit(it.u):drawObj(it.o)}
    for(let x=Math.max(0,s-SC.H+1);x<=Math.min(SC.W-1,s);x++){const y=s-x,c=SC.COL[x][y];if(!c)continue;if(c.wall)drawWall(x,y,cutFor(x,y));else drawBuildingTile(x,y,c.b,cutFor(x,y)?.35:1)}
  }
  while(ii<items.length){const it=items[ii++];it.u?drawUnit(it.u):drawObj(it.o)}
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
    for(const h of heroes())if(h.down&&h.revT>0){const p=pos(h);const[sx,sy]=iso(p.x,p.y);ctx.strokeStyle='#9fd27f';ctx.lineWidth=3;ctx.beginPath();ctx.arc(sx,sy-26,11,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,h.revT/2));ctx.stroke()}
  }else{
    ctx.font='600 12px "Alegreya Sans",sans-serif';
    for(const u of SC.units)if(u.kind==='npc'&&man(P.tx,P.ty,u.tx,u.ty)<=4){const p=pos(u);const[sx,sy]=iso(p.x,p.y);ctx.fillStyle='rgba(0,0,0,.55)';const w=ctx.measureText(u.name).width+12;ctx.fillRect(sx-w/2,sy-64,w,17);ctx.fillStyle='#ebe2cd';ctx.fillText(u.name,sx,sy-51)}
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
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1b2140');g.addColorStop(.55,'#4a3d63');g.addColorStop(1,'#b97a63');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  const px=-(SC.cam.x*.06),py=-(SC.cam.y*.04);
  ctx.fillStyle='rgba(255,230,210,.07)';for(let i=0;i<5;i++){const x=((i*263+SC.t*6)%(W+300))-150,y=H*.25+i*37;ctx.beginPath();ctx.ellipse(x,y,120,14,0,0,7);ctx.fill()}
  const isl=[[.12,.3,.8],[.82,.22,.6],[.9,.72,.9],[.06,.78,.7],[.5,.1,.45]];
  for(const[fx,fy,s]of isl){const x=fx*W+px*s,y=fy*H+py*s;ctx.fillStyle='rgba(40,34,58,.55)';ctx.beginPath();ctx.ellipse(x,y,60*s,12*s,0,0,7);ctx.fill();ctx.beginPath();ctx.moveTo(x-58*s,y);ctx.quadraticCurveTo(x,y+70*s,x+58*s,y);ctx.fill();ctx.fillStyle='rgba(70,90,70,.45)';ctx.beginPath();ctx.ellipse(x,y-3*s,56*s,9*s,0,0,7);ctx.fill()}
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
function hud(){
  if(!S.started||!SC)return;const p=SC.player,c=CLASSES[p.cls];
  // Shrink the HUD on short screens (landscape phones); VW/VH are the scaled-down canvas size.
  const k=Math.max(.7,Math.min(1,H/560)),VW=W/k,VH=H/k;ctx.save();ctx.scale(k,k);const narrow=VW<600;
  ctx.textBaseline='alphabetic';
  // Party panel
  const pw=Math.min(narrow?240:284,VW-24);const allies=heroes().filter(h=>h.ai);const ph=98+allies.length*18;
  frameBox(12,12,pw,ph);
  ctx.font=`18px ${FELL}`;ctx.fillStyle=PARCH;ctx.fillText('You',24,36);const yw=ctx.measureText('You').width;
  diamond(24+yw+9,31,2.5);ctx.font=`14px ${FELL}`;ctx.fillStyle=GOLD;ctx.fillText(c.name,24+yw+17,36);
  const bx=86,bw=pw-bx-14;ctx.font=`600 9.5px ${SANS}`;ctx.fillStyle=MUTED;
  ctx.fillText('HEALTH',24,53);ctx.fillText('STAMINA',24,68);
  meter(bx,45,bw,10,p.hp/p.maxhp,'#d4675e','#7d2a26');meter(bx,61,bw,8,p.st/100,'#cfd6a0','#6f7d3e');
  for(let i=0;i<5;i++)flaskIcon(29+i*13,85,i<S.flasks);
  const ready=p.skillCd<=0;ctx.font=`13px ${FELL}`;ctx.fillStyle=ready?'#f0d58a':MUTED;ctx.textAlign='right';
  ctx.fillText(`${c.skill} · ${ready?'ready':Math.ceil(p.skillCd)+'s'}`,12+pw-14,89);ctx.textAlign='left';
  if(allies.length){ctx.fillStyle='rgba(210,171,82,.25)';ctx.fillRect(22,99,pw-20,1)}
  allies.forEach((a,i)=>{const y=116+i*18;ctx.fillStyle=a.ring;ctx.beginPath();ctx.arc(28,y-4,4,0,7);ctx.fill();ctx.strokeStyle='rgba(0,0,0,.5)';ctx.stroke();
    ctx.fillStyle=PARCH;ctx.font=`500 12.5px ${SANS}`;ctx.fillText(a.name,38,y);const nw=ctx.measureText(a.name).width;ctx.fillStyle=MUTED;ctx.font=`500 11px ${SANS}`;ctx.fillText(CLASSES[a.cls].name,44+nw,y);
    if(a.down){ctx.fillStyle='#ef8a7e';ctx.font=`12px ${FELL}`;ctx.textAlign='right';ctx.fillText('Down',12+pw-14,y);ctx.textAlign='left'}else meter(12+pw-14-64,y-8,64,7,a.hp/a.maxhp,'#9fd27f','#4c7a36')});
  // Location plate
  let title,rl;
  if(SC.kind==='dungeon'){const m=KNIGHTS.filter(k=>S.roster[k.id]==='missing').length;title='Ashen Barrow';rl=['Floor 1',`Pack · ${SC.pack.coins} coins · ${SC.pack.copper} copper · ${SC.pack.iron} iron`,m?`Wounded still below · ${m}`:'All wounded accounted for']}
  else{title='Lanternhold';rl=[`${S.coins} coins · ${S.ore.copper} copper · ${S.ore.iron} iron`]}
  ctx.font=`17px ${FELL}`;const tw=ctx.measureText(title).width;ctx.font=`500 12.5px ${SANS}`;
  const rw=Math.max(tw+40,...rl.map(s=>ctx.measureText(s).width))+30,rh=42+rl.length*17,rx=narrow?12:VW-12-rw,ry=narrow?12+ph+8:12;
  frameBox(rx,ry,rw,rh);ctx.textAlign='center';const mx=rx+rw/2;
  ctx.font=`17px ${FELL}`;ctx.fillStyle=GOLD;ctx.fillText(title,mx,ry+25);diamond(mx-tw/2-10,ry+20,2.5);diamond(mx+tw/2+10,ry+20,2.5);
  ctx.fillStyle='rgba(210,171,82,.25)';ctx.fillRect(rx+14,ry+33,rw-28,1);
  ctx.font=`500 12.5px ${SANS}`;ctx.fillStyle=PARCH;rl.forEach((s,i)=>ctx.fillText(s,mx,ry+50+i*17));ctx.textAlign='left';
  // Boss bar
  const b=SC.boss;let bottom=VH-14;
  if(b&&!b.gone&&b.state!=='dormant'){const w=Math.min(440,VW-60),x=(VW-w)/2,y=VH-26;ctx.textAlign='center';ctx.font=`17px ${FELL}`;ctx.fillStyle=PARCH;ctx.shadowColor='#000';ctx.shadowBlur=6;ctx.fillText('The Lantern Warden',VW/2,y-9);ctx.shadowBlur=0;ctx.textAlign='left';
    meter(x,y,w,10,b.hp/b.maxhp,'#c4473f','#5e1b18');diamond(x-8,y+5,4.5);diamond(x+w+8,y+5,4.5);bottom=VH-56}
  // Interaction prompt
  const pr=SC.prompt,live=!!(pr&&!p.down);if(live!==hud.live){hud.live=live;const ub=document.querySelector('.touch .b-act');if(ub)ub.classList.toggle('live',live)}
  if(pr&&!p.down){ctx.font=`600 14px ${SANS}`;const tw2=ctx.measureText(pr.label).width+36;const x=(VW-tw2)/2,y=bottom-32;frameBox(x,y,tw2,28);ctx.fillStyle=PARCH;ctx.textAlign='center';ctx.fillText(pr.label,VW/2,y+19);ctx.textAlign='left';
    if(pr.prog){const v=Math.max(0,Math.min(1,pr.prog()));if(v>0){ctx.fillStyle=GOLD;ctx.fillRect(x+4,y+23,(tw2-8)*v,2)}}}
  // Banner
  if(SC.banner){const bn=SC.banner;ctx.globalAlpha=Math.max(0,Math.min(1,bn.t/.4,(bn.max-bn.t)/.3));ctx.textAlign='center';const by=narrow?VH*.5:Math.max(VH*.27,12+ph+64);
    ctx.shadowColor='rgba(0,0,0,.85)';ctx.shadowBlur=10;ctx.font=`${narrow?26:36}px ${FELL}`;
    const g=ctx.createLinearGradient(0,by-30,0,by+4);g.addColorStop(0,'#fffaf0');g.addColorStop(1,'#c9b083');ctx.fillStyle=g;ctx.fillText(bn.title,VW/2,by);
    ctx.shadowBlur=0;const half=Math.min(200,ctx.measureText(bn.title).width/2+50);goldRule(VW/2,by+12,half);
    if(bn.sub){ctx.shadowBlur=8;ctx.fillStyle='#e6d8b4';ctx.font=`500 15px ${SANS}`;const words=bn.sub.split(' ');let line='',ly=by+36;for(const w of words){const t=line?line+' '+w:w;if(ctx.measureText(t).width>Math.min(560,VW-40)){ctx.fillText(line,VW/2,ly);ly+=19;line=w}else line=t}ctx.fillText(line,VW/2,ly);ctx.shadowBlur=0}
    ctx.textAlign='left';ctx.globalAlpha=1}
  ctx.restore();
  if(joy.id!==null){ctx.strokeStyle='rgba(210,171,82,.5)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(joy.ox,joy.oy,46,0,7);ctx.stroke();ctx.strokeStyle='rgba(210,171,82,.2)';ctx.beginPath();ctx.arc(joy.ox,joy.oy,42,0,7);ctx.stroke();ctx.fillStyle='rgba(27,24,52,.75)';ctx.beginPath();ctx.arc(joy.ox+joy.x*46,joy.oy+joy.y*46,17,0,7);ctx.fill();ctx.strokeStyle=GOLD;ctx.stroke()}
}
