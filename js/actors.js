'use strict';
// Player control, companion AI, enemies and the Lantern Warden boss.
/* ---------- hero update ---------- */
function updHero(u,dt){
  advance(u,dt);u.inv=Math.max(0,u.inv-dt);u.atkT=Math.max(0,u.atkT-dt);u.stDelay=Math.max(0,u.stDelay-dt);u.cd-=dt;u.skillCd=Math.max(0,u.skillCd-dt);u.flash=Math.max(0,u.flash-dt);
  if(u.down)return;
  if(u.stDelay<=0)u.st=Math.min(100,u.st+34*dt);
  if(u.drink>0){u.drink-=dt;if(u.drink<=0)heal(u,45);return}
  if(u.dash>0){if(u.prog>=1)u.dash=0;return}
  if(u.ai)aiHero(u,dt);else playerControl(u,dt);
}
function playerControl(p,dt){
  const d=inputDir(),carry=!!p.carrying,sd=carry?.22:.13;
  if(SC.kind==='village'){
    SC.prompt=villagePrompt(p);
    if(pressed.has('act')&&SC.prompt&&p.prog>=1){SC.prompt.fn();return}
    if(pressed.has('heal'))drinkFlask(p);
    if(d&&p.prog>=1)tryStep(p,d.x,d.y,sd);
    return}
  const c=useContext(p);SC.prompt=c;
  if(c&&c.hold>0&&keys.has('act')&&p.prog>=1){
    if(c.kind==='revive'){c.target.revT+=dt;c.target.helped=true}
    else if(c.kind==='stab'){c.target.prog+=dt/c.hold;p.kneel=true}
    else if(c.kind==='extract'){p.holdT+=dt;if(p.holdT>=c.hold)endRun('extract')}
    return}
  p.holdT=0;p.kneel=false;
  if(c&&c.hold===0&&pressed.has('act')&&p.prog>=1){if(c.kind==='drop')dropCarry(p);else if(c.kind==='lift')lift(p,c.target);else if(c.kind==='chest')openChest(c.target);return}
  if(pressed.has('heal')&&!carry&&p.prog>=1){drinkFlask(p);return}
  if(pressed.has('roll')&&!carry&&p.st>=22&&p.prog>=.55){const dir=d||p.face;p.prog=1;p.inv=.3;p.st-=26;p.stDelay=.6;if(tryDash(p,dir.x,dir.y))p.dash=1;else p.inv=.12;return}
  if(pressed.has('skill')&&!carry){if(p.skillCd<=0)useSkill(p);else{const q=pos(p);text(q.x,q.y,Math.ceil(p.skillCd)+'s','#c9b98a')}}
  if(pressed.has('atk')&&!carry&&p.cd<=0){if(p.st>=CLASSES[p.cls].st)attack(p);else{const q=pos(p);text(q.x,q.y,'no stamina','#c9b98a')}}
  if(d&&p.prog>=1){if(p.atkT>.12||!tryStep(p,d.x,d.y,sd))p.face=d}
}
function drinkFlask(p){const q=pos(p);if(S.flasks<=0){text(q.x,q.y,'no flasks','#c9b98a');return}if(p.hp>=p.maxhp){text(q.x,q.y,'full health','#c9b98a');return}S.flasks--;p.drink=.7}
function villagePrompt(p){
  let best=null;
  for(const u of SC.units)if(u.kind==='npc'&&cheb(p.tx,p.ty,u.tx,u.ty)<=1)best={label:`E  Talk to ${u.name}`,fn:()=>{u.face={x:Math.sign(p.tx-u.tx),y:Math.sign(p.ty-u.ty)};if(u.face.x&&u.face.y)u.face.y=0;u.talk()}};
  if(!best&&cheb(p.tx,p.ty,11,1)<=1)best={label:'E  Enter the Ashen Barrow',fn:talkGate};
  return best;
}

/* ---------- companion AI ---------- */
function aiGo(u,goal,dz){if(goal(u.tx,u.ty))return true;const s=bfs(u.tx,u.ty,goal,{avoid:dz,self:u,max:1400});if(s)tryStep(u,s.x,s.y,u.carrying?.22:.13);return!!s}
function follow(u,P,r,dz){if(man(u.tx,u.ty,P.tx,P.ty)>r)aiGo(u,(x,y)=>man(x,y,P.tx,P.ty)<=r&&free(x,y,u),dz)}
function aiHero(u,dt){
  if(u.prog<1)return;
  const P=SC.player,dz=SC.danger;
  if(dz.has(key(u.tx,u.ty))){let best=null,bs=-1e9;for(const[dx,dy]of D4){const nx=u.tx+dx,ny=u.ty+dy;if(!free(nx,ny,u)||dz.has(key(nx,ny)))continue;const s=SC.boss&&!SC.boss.gone?man(nx,ny,SC.boss.tx,SC.boss.ty):0;if(s>bs){bs=s;best=[dx,dy]}}if(best){tryStep(u,best[0],best[1],.11);return}}
  if(SC.kind==='village'){follow(u,P,2,dz);return}
  if(u.carrying){u.kneel=false;if(!aiGo(u,(x,y)=>man(x,y,SC.exit.x,SC.exit.y)<=1&&free(x,y,u),dz))aiGo(u,(x,y)=>man(x,y,SC.exit.x,SC.exit.y)<=1&&free(x,y,u),null);return}
  const dn=heroes().find(h=>h!==u&&h.down);
  if(dn){if(cheb(u.tx,u.ty,dn.tx,dn.ty)<=1){dn.revT+=dt;dn.helped=true;u.kneel=true;return}u.kneel=false;aiGo(u,(x,y)=>cheb(x,y,dn.tx,dn.ty)<=1&&free(x,y,u),dz);return}
  u.kneel=false;
  const sk=SC.objs.find(o=>o.type==='fallen'&&o.state==='stable'&&(!o.claim||o.claim===u||o.claim.down||o.claim.carrying));
  if(sk){sk.claim=u;if(cheb(u.tx,u.ty,sk.x,sk.y)<=1){lift(u,sk);return}aiGo(u,(x,y)=>cheb(x,y,sk.x,sk.y)<=1&&free(x,y,u),dz);return}
  if(u.cls==='mage'&&u.skillCd<=0&&heroes().some(h=>!h.down&&h.hp<h.maxhp*.6&&man(h.tx,h.ty,u.tx,u.ty)<=3)){useSkill(u);return}
  let tgt=null,bd=1e9;
  for(const e of SC.units){if(e.team!==1||e.gone||e.sleep)continue;if(e.kind==='boss'&&e.state==='dormant')continue;const d=man(u.tx,u.ty,e.tx,e.ty);if(d<=9&&man(P.tx,P.ty,e.tx,e.ty)<=10&&d<bd){bd=d;tgt=e}}
  if(tgt){aiFight(u,tgt,bd,dz);return}
  follow(u,P,2,dz);
}
function aiFight(u,e,d,dz){
  if(u.cls==='knight'){
    if(d===1){u.face={x:Math.sign(e.tx-u.tx),y:Math.sign(e.ty-u.ty)};
      if(u.skillCd<=0&&(e.kind!=='boss'||e.state==='wind')){u.skillCd=CLASSES.knight.skillCd;bash(u);return}
      if(u.cd<=0)attack(u);return}
    aiGo(u,(x,y)=>man(x,y,e.tx,e.ty)===1&&free(x,y,u),dz);return}
  const R=CLASSES[u.cls].range,al=aligned(u.tx,u.ty,e.tx,e.ty,R);
  if(al&&d>=2){u.face=al;if(u.cd<=0){if(u.cls==='ranger'&&u.skillCd<=0){u.skillCd=CLASSES.ranger.skillCd;u.cd=.8;volley(u)}else attack(u)}return}
  if(d<2){let best=null,bs=-1;for(const[dx,dy]of D4){const nx=u.tx+dx,ny=u.ty+dy;if(!free(nx,ny,u)||dz.has(key(nx,ny)))continue;const s=man(nx,ny,e.tx,e.ty);if(s>bs){bs=s;best=[dx,dy]}}if(best){tryStep(u,best[0],best[1],.13);return}}
  aiGo(u,(x,y)=>free(x,y,u)&&man(x,y,e.tx,e.ty)>=2&&!!aligned(x,y,e.tx,e.ty,R),dz);
}

/* ---------- enemies ---------- */
function updEnemy(e,dt){
  advance(e,dt);e.flash=Math.max(0,e.flash-dt);if(e.stun>0){e.stun-=dt;return}
  const hs=heroes().filter(h=>!h.down);if(!hs.length)return;
  if(e.sleep){if(hs.some(h=>man(h.tx,h.ty,e.tx,e.ty)<=6)){e.sleep=false;const p=pos(e);text(p.x,p.y,'!','#ef8a7e')}else return}
  if(e.atk)return;
  e.cd-=dt;e.moveT-=dt;if(e.prog<1)return;
  let t=hs[0],bd=1e9;for(const h of hs){const d=man(h.tx,h.ty,e.tx,e.ty)-(h.carrying?1.5:0);if(d<bd){bd=d;t=h}}
  const T=ETYPES[e.type],d=man(t.tx,t.ty,e.tx,e.ty);
  if(T.ranged){const al=aligned(e.tx,e.ty,t.tx,t.ty,T.ranged);
    if(al){e.face=al;if(e.cd<=0){const tiles=new Set();for(let i=1;i<=T.ranged;i++){const x=e.tx+al.x*i,y=e.ty+al.y*i;if(!floorAt(x,y)||blocksShot(x,y))break;tiles.add(key(x,y))}addAttack(e,tiles,T.wind,T.dmg);e.cd=rnd(1.8,2.6)}return}
    if(e.moveT<=0){e.moveT=T.move;const s=bfs(e.tx,e.ty,(x,y)=>free(x,y,e)&&!!aligned(x,y,t.tx,t.ty,T.ranged),{self:e,max:700});if(s)tryStep(e,s.x,s.y,T.move*.85)}return}
  if(d===1){e.face={x:Math.sign(t.tx-e.tx),y:Math.sign(t.ty-e.ty)};if(e.cd<=0){addAttack(e,new Set([key(t.tx,t.ty)]),T.wind,T.dmg);e.cd=rnd(.8,1.3)}return}
  if(e.moveT<=0){e.moveT=T.move;const s=bfs(e.tx,e.ty,(x,y)=>man(x,y,t.tx,t.ty)===1&&free(x,y,e),{self:e,max:700});if(s)tryStep(e,s.x,s.y,T.move*.85)}
}

/* ---------- the Lantern Warden ---------- */
function wakeBoss(b){if(b.state!=='dormant')return;b.state='idle';b.t=1.4;banner('The Lantern Warden','It guards the only way out. Get the wounded past it.',3.2);SC.shake=8}
function majorDir(fx,fy,tx,ty){const dx=tx-fx,dy=ty-fy;if(!dx&&!dy)return{x:1,y:0};return Math.abs(dx)>=Math.abs(dy)?{x:Math.sign(dx),y:0}:{x:0,y:Math.sign(dy)}}
function updBoss(b,dt){
  advance(b,dt);b.flash=Math.max(0,b.flash-dt);b.raise=Math.max(0,b.raise-dt*2);
  const hs=heroes().filter(h=>!h.down&&inRoom(b.room,h.tx,h.ty));
  if(b.state==='dormant'){if(hs.length)wakeBoss(b);return}
  if(!b.p2&&b.hp<b.maxhp/2){b.p2=true;banner('The Lantern Flares','Faster now. Stones fall from the ceiling.',2.4);SC.shake=10}
  const sp=b.p2?.8:1;
  if(b.state==='idle'){b.t-=dt;b.moveT-=dt;
    if(!hs.length){if(b.moveT<=0&&b.prog>=1&&(b.tx!==b.hx||b.ty!==b.hy)){b.moveT=.5;const s=bfs(b.tx,b.ty,(x,y)=>x===b.hx&&y===b.hy,{self:b,max:500,room:b.room});if(s)tryStep(b,s.x,s.y,.4)}return}
    let t=hs[0],bd=1e9;for(const h of hs){const d=man(h.tx,h.ty,b.tx,b.ty)-(h.carrying?2:0);if(d<bd){bd=d;t=h}}
    const d=man(t.tx,t.ty,b.tx,b.ty);b.face=majorDir(b.tx,b.ty,t.tx,t.ty);
    if(b.moveT<=0&&b.prog>=1&&d>1){b.moveT=.6*sp;const s=bfs(b.tx,b.ty,(x,y)=>man(x,y,t.tx,t.ty)===1,{self:b,max:600,room:b.room});if(s)tryStep(b,s.x,s.y,.38*sp)}
    if(b.t<=0&&b.prog>=1)bossAttack(b,t,d,sp);
  }else if(b.state==='charge'){
    if(b.prog>=1){if(b.pathI<b.path.length&&free(b.path[b.pathI][0],b.path[b.pathI][1],b)){const[nx,ny]=b.path[b.pathI++];stepTo(b,nx,ny,.055)}else{b.state='recover';b.t=.9;SC.shake=6}}
  }else if(b.state==='recover'){b.t-=dt;if(b.t<=0){b.state='idle';b.t=(b.p2?.5:.9)+Math.random()*.5}}
}
function bossAttack(b,t,d,sp){
  let opts=d<=2?['ring','slam','cross']:['cross','slam','charge','charge'];if(b.p2)opts=opts.concat(['stars','twin']);
  let atk=opts[ri(0,opts.length-1)];const S2=new Set();const add=(x,y)=>{if(floorAt(x,y)&&inRoom(b.room,x,y))S2.add(key(x,y))};
  const room=heroes().filter(h=>!h.down&&inRoom(b.room,h.tx,h.ty));let wind=.9,dmg=24;
  if(atk==='charge'){const f=majorDir(b.tx,b.ty,t.tx,t.ty);const path=[];for(let i=1;i<14;i++){const nx=b.tx+f.x*i,ny=b.ty+f.y*i;if(!floorAt(nx,ny)||!inRoom(b.room,nx,ny)||SC.B[nx][ny])break;path.push([nx,ny])}
    if(path.length<2)atk='slam';else{path.forEach(([x,y])=>add(x,y));b.path=path;b.pathI=0;b.face=f;wind=.8;dmg=30}}
  if(atk==='slam'){for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)add(t.tx+x,t.ty+y);wind=.95;dmg=28}
  else if(atk==='twin'){for(const h of room)for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)add(h.tx+x,h.ty+y);wind=1.05;dmg=26}
  else if(atk==='cross'){for(const[dx,dy]of D4)for(let i=1;i<14;i++){const x=b.tx+dx*i,y=b.ty+dy*i;if(!floorAt(x,y)||blocksShot(x,y))break;add(x,y)}wind=.85;dmg=22}
  else if(atk==='ring'){for(let x=-2;x<=2;x++)for(let y=-2;y<=2;y++)if(x||y)add(b.tx+x,b.ty+y);wind=.75;dmg=22}
  else if(atk==='stars'){const r=b.room;for(let x=r.x0;x<=r.x1;x++)for(let y=r.y0;y<=r.y1;y++)if(Math.random()<.24)add(x,y);for(const h of room)add(h.tx,h.ty);wind=1.15;dmg=18}
  b.state='wind';b.raise=1;b.atkName=atk;
  addAttack(b,S2,wind*(b.p2?.82:1),dmg,()=>{if(b.gone)return;SC.shake=Math.max(SC.shake,atk==='stars'?9:7);if(atk==='charge')b.state='charge';else{b.state='recover';b.t=atk==='stars'?1.1:.8}});
}
