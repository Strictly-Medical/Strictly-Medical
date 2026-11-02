'use strict';
// Damage, attacks, projectiles, telegraphed tiles and the medic actions (stabilize, carry, deliver).
/* ---------- feedback ---------- */
function text(x,y,s,col){SC.texts.push({x,y,s,col,t:1.1})}
function burst(x,y,col,n,z=14){for(let i=0;i<n;i++){const a=Math.random()*6.28,v=rnd(.6,2.6);SC.parts.push({x,y,z,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vz:rnd(50,150),t:rnd(.4,.9),col,size:rnd(2,4)})}}
function banner(title,sub,t=2.8){SC.banner={title,sub,t,max:t}}
function fxTiles(tiles,col,t=.18){SC.fx.push({tiles,col,t,max:t})}

/* ---------- combat ---------- */
function heal(u,n){const before=u.hp;u.hp=Math.min(u.maxhp,u.hp+n);const p=pos(u);if(u.hp>before)text(p.x,p.y,'+'+Math.round(u.hp-before),'#9fd27f')}
function hurtHero(h,dmg){
  if(h.down||h.inv>0)return;h.hp-=dmg;h.flash=.15;const p=pos(h);text(p.x,p.y,String(dmg),'#ef8a7e');
  if(h===SC.player)SC.shake=Math.max(SC.shake,7);
  if(h.hp<=0){h.hp=0;h.down=true;h.revT=0;h.drink=0;h.dash=0;burst(p.x,p.y,'#9b2f28',12);dropCarry(h);
    if(h===SC.player)banner('You Are Down','Your party can revive you.',2.2);else text(p.x,p.y,h.name+' is down','#ef8a7e')}
}
function hurtFoe(e,dmg){
  if(e.gone)return;e.hp-=dmg;e.flash=.12;e.sleep=false;if(e.kind==='boss'&&e.state==='dormant')wakeBoss(e);
  const p=pos(e);text(p.x,p.y,String(dmg),'#f3e6bd');if(e.hp<=0)killFoe(e)}
function killFoe(e){
  e.gone=true;const p=pos(e);SC.attacks=SC.attacks.filter(a=>a.owner!==e);SC.units=SC.units.filter(u=>u!==e);
  if(e.kind==='boss'){burst(p.x,p.y,'#d2ab52',44,30);SC.pack.iron+=4;SC.pack.coins+=80;S.bossKills++;SC.shake=14;banner('The Warden Falls','That was self-defense. Strictly medical. (+80 coins, 4 iron ore)',3.4)}
  else{burst(p.x,p.y,e.look.body,14);const c=ri(2,6);SC.pack.coins+=c;text(p.x,p.y-.3,'+'+c+' coins','#e6c76a')}
}
function foesAt(x,y){const r=[];for(const u of SC.units){if(u.team!==1||u.gone)continue;const t=tileOf(u);if(t.x===x&&t.y===y)r.push(u)}return r}
function hitOre(o){o.hp--;burst(o.x+.5,o.y+.5,o.metal==='iron'?'#a9b8c9':'#d0874a',6,10);
  if(o.hp<=0){removeObj(o);const n=o.metal==='iron'?ri(1,2):2;SC.pack[o.metal]+=n;text(o.x+.5,o.y+.5,`+${n} ${o.metal} ore`,o.metal==='iron'?'#bcd0e6':'#e2a06a')}}
function oreAt(x,y){const o=inB(x,y)&&SC.B[x][y];return o&&o.type==='ore'?o:null}
function autoFace(u,R){let best=null,bd=1e9;for(const e of SC.units){if(e.team!==1||e.gone)continue;if(e.kind==='boss'&&e.state==='dormant')continue;const al=aligned(u.tx,u.ty,e.tx,e.ty,R);if(al){const d=man(u.tx,u.ty,e.tx,e.ty);if(d<bd){bd=d;best=al}}}if(best)u.face=best}
function cleave(u){
  const t=tileOf(u),f=u.face,px=-f.y,py=f.x,cx=t.x+f.x,cy=t.y+f.y;const tiles=[[cx,cy],[cx+px,cy+py],[cx-px,cy-py]].filter(([x,y])=>floorAt(x,y)&&Math.abs(SC.HZ[x][y]-SC.HZ[t.x][t.y])<=ZL*.5);
  fxTiles(tiles,'240,226,184');const dmg=CLASSES.knight.dmg+dmgBonus();
  for(const[x,y]of tiles)for(const e of foesAt(x,y))hurtFoe(e,dmg);
  const o=oreAt(cx,cy);if(o)hitOre(o);
}
function shoot(u,kind,off=0){
  const t=tileOf(u),f=u.face,px=-f.y*off,py=f.x*off;const sx=t.x+px,sy=t.y+py;if(!floorAt(sx,sy))return;
  SC.projs.push({kind,x:sx+.5+f.x*.3,y:sy+.5+f.y*.3,dx:f.x,dy:f.y,spd:kind==='arrow'?15:10,dist:0,range:kind==='arrow'?7:5,dmg:(kind==='arrow'?CLASSES.ranger.dmg:CLASSES.mage.dmg)+dmgBonus(),lx:sx,ly:sy});
}
function explode(x,y,dmg){
  const tiles=[[x,y],[x+1,y],[x-1,y],[x,y+1],[x,y-1]].filter(([a,b])=>floorAt(a,b));fxTiles(tiles,'150,170,255',.25);burst(x+.5,y+.5,'#9fb4ff',10,16);
  for(const[a,b]of tiles){for(const e of foesAt(a,b))hurtFoe(e,dmg);const o=oreAt(a,b);if(o)hitOre(o)}
  const o=oreAt(x,y);if(o&&tiles.length===0)hitOre(o);
}
function updProjs(dt){
  for(const p of SC.projs){const s=p.spd*dt;p.x+=p.dx*s;p.y+=p.dy*s;p.dist+=s;const tx=Math.floor(p.x),ty=Math.floor(p.y);
    const ore=oreAt(tx,ty);
    if(ore){if(p.kind==='bolt')explode(tx,ty,p.dmg);else hitOre(ore);p.dead=true;continue}
    if(!floorAt(tx,ty)||blocksShot(tx,ty)){if(p.kind==='bolt')explode(p.lx,p.ly,p.dmg);p.dead=true;continue}
    p.lx=tx;p.ly=ty;
    const fs=foesAt(tx,ty);
    if(fs.length){if(p.kind==='bolt')explode(tx,ty,p.dmg);else hurtFoe(fs[0],p.dmg);p.dead=true;continue}
    if(p.dist>=p.range){if(p.kind==='bolt')explode(tx,ty,p.dmg);p.dead=true}}
  SC.projs=SC.projs.filter(p=>!p.dead);
}
function bash(u){
  autoFace(u,1);const t=tileOf(u),fx=t.x+u.face.x,fy=t.y+u.face.y;fxTiles([[fx,fy]],'190,215,255',.25);u.atkT=.22;
  const tgt=foesAt(fx,fy)[0];
  if(!tgt){const o=oreAt(fx,fy);if(o)hitOre(o);return}
  hurtFoe(tgt,10+dmgBonus());if(tgt.gone)return;const p=pos(tgt);
  if(tgt.kind==='boss'){if(tgt.state==='wind'){SC.attacks=SC.attacks.filter(a=>a.owner!==tgt);tgt.state='recover';tgt.t=1.1;text(p.x,p.y,'Staggered!','#9fd3ff');SC.shake=9}}
  else{SC.attacks=SC.attacks.filter(a=>a.owner!==tgt);tgt.atk=null;tgt.stun=1.6;pushBack(tgt,u.face.x,u.face.y,2);text(p.x,p.y,'Stunned','#9fd3ff')}
}
function volley(u){autoFace(u,7);u.atkT=.22;for(const o of[0,1,-1])shoot(u,'arrow',o)}
function mend(u){
  u.atkT=.3;const t=tileOf(u);burst(t.x+.5,t.y+.5,'#9fe0a0',18,20);SC.fx.push({ring:true,x:t.x+.5,y:t.y+.5,r:3,t:.5,max:.5});
  for(const h of heroes())if(!h.down&&man(h.tx,h.ty,t.x,t.y)<=3)heal(h,30);
  for(const o of SC.objs)if(o.type==='fallen'&&o.state==='fallen'&&man(o.x,o.y,t.x,t.y)<=3){o.prog=Math.min(1,o.prog+.35)}
}
function attack(u){const c=CLASSES[u.cls];u.cd=c.cd+(u.ai?.25:0);if(!u.ai){u.st-=c.st;u.stDelay=.5}u.atkT=.22;autoFace(u,c.range);
  if(u.cls==='knight')cleave(u);else shoot(u,u.cls==='ranger'?'arrow':'bolt')}
function useSkill(u){const c=CLASSES[u.cls];u.skillCd=c.skillCd;if(u.cls==='knight')bash(u);else if(u.cls==='ranger')volley(u);else mend(u)}
function addAttack(owner,tiles,wind,dmg,cb){const a={owner,tiles,wind,wmax:wind,dmg,cb};SC.attacks.push(a);if(owner)owner.atk=a;return a}
function updAttacks(dt){
  for(const a of SC.attacks.slice()){if(a.dead)continue;if(a.owner&&a.owner.gone){a.dead=true;continue}a.wind-=dt;if(a.wind>0)continue;a.dead=true;
    for(const h of heroes()){if(h.down)continue;const t=tileOf(h);if(a.tiles.has(key(t.x,t.y)))hurtHero(h,a.dmg)}
    for(const k of a.tiles)SC.flash.set(k,.3);if(a.owner)a.owner.atk=null;if(a.cb)a.cb(a)}
  SC.attacks=SC.attacks.filter(a=>!a.dead);
}

/* ---------- medic actions ---------- */
function lift(u,o){o.state='carried';o.carrier=u;o.claim=null;u.carrying=o;if(SC.B[o.x][o.y]===o)SC.B[o.x][o.y]=null;const p=pos(u);text(p.x,p.y,'Carrying '+o.name,'#f0d08a')}
function dropCarry(u){
  const o=u.carrying;if(!o)return;u.carrying=null;o.carrier=null;
  const t=tileOf(u);let spot=null;
  for(const r of[1,2])for(const[dx,dy]of D8){const x=t.x+dx*r,y=t.y+dy*r;if(!spot&&free(x,y,null))spot=[x,y]}
  if(!spot)spot=[t.x,t.y];o.x=spot[0];o.y=spot[1];o.state='stable';if(!SC.B[o.x][o.y])SC.B[o.x][o.y]=o;
}
function deliver(u){const o=u.carrying;u.carrying=null;o.state='saved';S.roster[o.id]='saved';SC.saved.push(o.name);SC.objs=SC.objs.filter(q=>q!==o);
  const p=pos(u);burst(p.x,p.y,'#f6dc8a',26,30);banner(o.name+' Is Safe','Pulled through the guild portal.',2.4)}
function openChest(o){o.open=true;const c=ri(15,35);SC.pack.coins+=c;text(o.x+.5,o.y+.5,'+'+c+' coins','#e6c76a');burst(o.x+.5,o.y+.5,'#e6c76a',12,10);
  if(Math.random()<.4&&S.flasks<5){S.flasks++;setTimeout(()=>{if(SC)text(o.x+.5,o.y+.5,'+1 flask','#f0b450')},350)}}
function useContext(u){
  const t={x:u.tx,y:u.ty};
  if(u.carrying)return{kind:'drop',label:`E  Set ${u.carrying.name} down`,hold:0};
  for(const h of heroes())if(h!==u&&h.down&&cheb(t.x,t.y,h.tx,h.ty)<=1)return{kind:'revive',target:h,label:`Hold E  Revive ${h.name}`,hold:2,prog:()=>h.revT/2};
  for(const o of SC.objs){if(o.type!=='fallen'||cheb(t.x,t.y,o.x,o.y)>1)continue;
    if(o.state==='fallen')return{kind:'stab',target:o,label:`Hold E  Stabilize ${o.name}`,hold:stabTime(u),prog:()=>o.prog};
    if(o.state==='stable')return{kind:'lift',target:o,label:`E  Carry ${o.name}`,hold:0}}
  for(const o of SC.objs)if(o.type==='chest'&&!o.open&&cheb(t.x,t.y,o.x,o.y)<=1)return{kind:'chest',target:o,label:'E  Open chest',hold:0};
  if(SC.exit&&man(t.x,t.y,SC.exit.x,SC.exit.y)<=1)return{kind:'extract',label:'Hold E  Extract the party',hold:1.2,prog:()=>u.holdT/1.2};
  return null;
}
