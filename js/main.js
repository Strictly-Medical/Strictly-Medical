'use strict';
// Game loop and start-up.
/* ---------- loop ---------- */
function step(dt){
  if(!SC)return;
  for(const p of SC.parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;if(!p.noG)p.vz-=340*dt;if(p.z<0&&!p.noG){p.z=0;p.vz*=-.3;p.vx*=.6;p.vy*=.6}p.t-=dt}SC.parts=SC.parts.filter(p=>p.t>0);
  for(const t of SC.texts)t.t-=dt;SC.texts=SC.texts.filter(t=>t.t>0);
  for(const f of SC.fx)f.t-=dt;SC.fx=SC.fx.filter(f=>f.t>0);
  for(const[k,v]of SC.flash){if(v-dt<=0)SC.flash.delete(k);else SC.flash.set(k,v-dt)}
  if(SC.banner){SC.banner.t-=dt;if(SC.banner.t<=0)SC.banner=null}
  SC.shake=Math.max(0,SC.shake-dt*26);
  ambient(dt);
  if(panelOpen||!S.started||SC.done)return;
  SC.t+=dt;
  const ds=new Set();for(const a of SC.attacks)for(const k of a.tiles)ds.add(k);SC.danger=ds;
  for(const h of heroes())h.helped=false;
  for(const u of SC.units.slice()){if(u.gone)continue;if(u.kind==='hero')updHero(u,dt);else if(u.kind==='enemy')updEnemy(u,dt);else if(u.kind==='boss')updBoss(u,dt);else advance(u,dt)}
  if(SC.done)return;
  if(SC.kind==='dungeon'){
    updAttacks(dt);updProjs(dt);
    for(const h of heroes()){if(!h.down)continue;if(h.revT>=2){h.down=false;h.hp=Math.round(h.maxhp*.4);h.revT=0;h.inv=1;const p=pos(h);text(p.x,p.y,'revived','#9fd27f');burst(p.x,p.y,'#f0d08a',14);if(h===SC.player)banner('Back on Your Feet','',1.3)}else if(!h.helped)h.revT=Math.max(0,h.revT-dt*.6)}
    for(const o of SC.objs)if(o.type==='fallen'&&o.state==='fallen'&&o.prog>=1){o.state='stable';burst(o.x+.5,o.y+.5,'#f0d08a',16);text(o.x+.5,o.y+.5,o.name+' stabilized','#f0d08a')}
    for(const h of heroes()){if(!h.carrying||h.down)continue;const t=tileOf(h);if(man(t.x,t.y,SC.exit.x,SC.exit.y)<=1)deliver(h)}
    if(!SC.failT&&heroes().every(h=>h.down)){SC.failT=2.6;banner('The Party Has Fallen',`${RULES[S.rule].name} rules apply.`,2.6)}
    if(SC.failT){SC.failT-=dt;if(SC.failT<=0)endRun('fail')}
  }
  const p=pos(SC.player),c=iso(p.x,p.y),k=Math.min(1,dt*6);SC.cam.x+=(c[0]-SC.cam.x)*k;SC.cam.y+=(c[1]-20-SC.cam.y)*k;
}
function ambient(dt){
  for(const o of SC.objs){
    if(o.type==='brazier'&&Math.random()<dt*10)SC.parts.push({x:o.x+.5+rnd(-.12,.12),y:o.y+.5+rnd(-.12,.12),z:art('brazier')?50:30,vx:0,vy:0,vz:rnd(25,55),t:rnd(.4,.8),col:Math.random()<.5?'#f0a040':'#e2602e',size:rnd(2,3),noG:true});
    if(o.type==='chimney'&&Math.random()<dt*4)SC.parts.push({x:o.x+.4,y:o.y+.4,z:92,vx:rnd(.05,.25),vy:rnd(-.2,0),vz:rnd(14,24),t:rnd(1.6,2.6),col:'rgba(160,150,150,.35)',size:rnd(4,7),noG:true});
    if(o.type==='exit'&&Math.random()<dt*8)SC.parts.push({x:o.x+.5+rnd(-.35,.35),y:o.y+.5+rnd(-.35,.35),z:0,vx:0,vy:0,vz:rnd(30,70),t:rnd(.6,1.2),col:'#f6dc8a',size:rnd(1.5,3),noG:true});
  }
}

let last=performance.now();
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(!document.hidden)step(dt);render();pressed.clear();requestAnimationFrame(frame)}
showTitle();
requestAnimationFrame(frame);
if(window.__lgTest)window.__lgTest({S,get SC(){return SC},enterVillage,enterDungeon,endRun,keys,pressed,talkGate,talkOdo,talkCaptain,talkIlse,talkTobin,hidePanel,muster,heroes});
