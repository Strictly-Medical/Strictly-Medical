'use strict';
// Scenes: village and dungeon layout, the party, grid movement and pathfinding.
/* ---------- scene ---------- */
let SC=null;
function newScene(kind,Wd,Hd){
  const g=v=>{const a=[];for(let x=0;x<Wd;x++)a.push(new Array(Hd).fill(v));return a};
  return{kind,W:Wd,H:Hd,T:g(0),ST:g('g'),B:g(null),COL:g(null),units:[],objs:[],projs:[],attacks:[],fx:[],texts:[],parts:[],flash:new Map(),
    t:0,shake:0,banner:null,pack:{coins:0,copper:0,iron:0},cam:{x:0,y:0},failT:0,saved:[],danger:new Set(),prompt:null,player:null,boss:null,exit:null,done:false};
}
const inB=(x,y)=>x>=0&&y>=0&&x<SC.W&&y<SC.H;
const floorAt=(x,y)=>inB(x,y)&&SC.T[x][y]===1;
function unitAt(x,y,self){for(const u of SC.units)if(u!==self&&!u.gone&&u.tx===x&&u.ty===y)return u;return null}
const free=(x,y,self)=>floorAt(x,y)&&!SC.B[x][y]&&!unitAt(x,y,self);
function placeObj(o){SC.objs.push(o);if(o.block)SC.B[o.x][o.y]=o;return o}
function removeObj(o){SC.objs=SC.objs.filter(q=>q!==o);if(SC.B[o.x][o.y]===o)SC.B[o.x][o.y]=null}
const heroes=()=>SC.units.filter(u=>u.kind==='hero');
const inRoom=(r,x,y)=>x>=r.x0&&x<=r.x1&&y>=r.y0&&y<=r.y1;

let UID=0;
function mkUnit(o){const u=Object.assign({id:++UID,tx:0,ty:0,prog:1,dur:.13,face:{x:0,y:1},hp:100,maxhp:100,st:100,stDelay:0,inv:0,flash:0,atkT:0,cd:0,skillCd:0,dash:0,drink:0,down:false,revT:0,holdT:0,carrying:null,stun:0,team:0,moveT:0},o);u.fx=u.tx;u.fy=u.ty;SC.units.push(u);return u}

/* ---------- village ---------- */
// Lanternhold: a 34x34 island. The village sits in the middle (VO is how far the original 22x22 layout was shifted),
// with the road running north to the Barrow gate and cottages, woods and an orchard around the edges.
const VO=6;
function buildVillage(){
  const N=34,C=N/2,sc=SC=newScene('village',N,N);
  for(let x=0;x<N;x++)for(let y=0;y<N;y++){const dx=x+.5-C,dy=y+.5-C,a=Math.atan2(dy,dx),r=Math.hypot(dx,dy);if(r<13.6+Math.sin(a*3+1)*1.1+Math.cos(a*5)*.5+(hash(x,y)-.5)*.6)sc.T[x][y]=1}
  const land=(x0,y0,x1,y1,st)=>{for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){sc.T[x][y]=1;if(st)sc.ST[x][y]=st}};
  const o=VO;
  land(15,0,19,2);land(17,2,17,8+o,'c');land(8+o,9+o,14+o,13+o,'c');land(15+o,5+o,18+o,8+o);land(15+o,9+o,18+o,10+o,'c');
  land(4+o,7+o,6+o,8+o);land(7+o,7+o,8+o,11+o,'d');land(4+o,13+o,6+o,14+o);land(7+o,12+o,7+o,15+o,'c');land(14+o,15+o,16+o,16+o);land(12+o,14+o,13+o,17+o,'c');land(13+o,17+o,16+o,17+o,'c');
  // Outskirts: a west lane to a cottage, an east lane to another, and a footpath into the south orchard.
  land(7,12,8,13);land(9,12,13,12,'d');
  land(25,21,26,22);land(23,23,26,23,'d');land(23,22,23,22,'d');
  land(17,24,17,28,'d');
  const bld=(x0,y0,x1,y1,wall,roof,eave,ridge,name)=>{const b={x0,y0,x1,y1,wall,roof,eave,ridge,name};for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){sc.COL[x][y]={b};sc.B[x][y]={type:'building'}}return b};
  bld(15+o,5+o,18+o,8+o,'#d9cfb6','#7a2a24',50,84,'guild');
  sc.forge=bld(4+o,7+o,6+o,8+o,'#6b5a48','#3d4148',38,62,'forge');
  bld(4+o,13+o,6+o,14+o,'#c9bfa2','#3f5a3a',38,60,'apothecary');
  bld(14+o,15+o,16+o,16+o,'#a58a66','#6a4a2e',38,60,'mill');
  bld(7,12,8,13,'#b8a98a','#4a3a5a',34,54,'cottage');
  bld(25,21,26,22,'#c2b394','#5a3a2a',34,54,'cottage');
  sc.gate={x:17,y:1};
  placeObj({type:'gate',x:17,y:1,block:true,kOff:-.1});sc.B[16][1]={type:'gate'};sc.B[18][1]={type:'gate'};
  placeObj({type:'well',x:11+o,y:11+o,block:true});
  placeObj({type:'anvil',x:8+o,y:8+o,block:true});
  placeObj({type:'banner',x:15+o,y:9+o,block:true});placeObj({type:'banner',x:18+o,y:9+o,block:true});
  for(const[x,y]of[[8+o,13+o],[14+o,13+o],[16,3],[18,3]])placeObj({type:'brazier',x,y,block:true});
  placeObj({type:'chimney',x:4+o,y:7+o});
  const npc=(id,name,role,x,y,look,face,talk,scale)=>mkUnit({kind:'npc',team:2,id,name,role,tx:x,ty:y,look,face,talk,scale});
  npc('maren','Captain Maren','The Ninety and Nine',16+o,9+o,{body:'#b9b2a2',tabard:'#e8dfca',trim:'#b3362e',head:'hair',hair:'#8d8d8d',skin:'#d9ae8a',cape:'#7a2a24'},{x:0,y:1},talkCaptain);
  npc('odo','Odo','Smith',7+o,8+o,{body:'#5a4030',tabard:'#7a5a3a',trim:'#3a2a1e',head:'hair',hair:'#2a2420',skin:'#c48e6a',beard:'#2a2420',weapon:'hammer'},{x:1,y:0},talkOdo);
  npc('ilse','Sister Ilse','Apothecary',7+o,14+o,{body:'#4f6a4a',robe:true,tabard:'#e8dfca',trim:'#b3362e',head:'veil',helm:'#e8dfca',skin:'#e0b48c'},{x:1,y:0},talkIlse);
  npc('tobin','Tobin','Miller',15+o,17+o,{body:'#8a7356',tabard:'#c9b48a',trim:'#6a5a40',head:'hair',hair:'#6a4a2e',skin:'#d9ae8a',beard:'#6a4a2e'},{x:0,y:1},talkTobin);
  for(const k of KNIGHTS)if(S.roster[k.id]==='saved')npc(k.id,k.name,k.title,k.home[0]+o,k.home[1]+o,k.look,{x:0,y:1},()=>talkSaved(k),k.scale);
  // Trees: the original village trees, an orchard in rows to the south, then scattered woods on the outer ring.
  const trees=[[3,5],[5,4],[7,3],[14,3],[16,3],[19,6],[19,12],[18,13],[9,18],[11,19],[17,19],[3,11],[2,9],[3,16],[6,18],[19,16],[13,6],[8,5],[4,11],[20,10],[1,12],[12,20],[9,15],[17,13]].map(([x,y])=>[x+o,y+o]);
  for(let x=13;x<=21;x+=2)for(let y=26;y<=29;y+=2)if(x!==17)trees.push([x,y]);
  const keep=(x,y)=>{for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){const nx=x+dx,ny=y+dy;if(inB(nx,ny)&&(sc.ST[nx][ny]!=='g'||sc.COL[nx][ny]||sc.B[nx][ny]))return true}return false};
  for(let x=0;x<N;x++)for(let y=0;y<N;y++){const r=Math.hypot(x+.5-C,y+.5-C);if(r>9.5&&floorAt(x,y)&&floorAt(x+1,y)&&floorAt(x,y+1)&&hash(x*3+1,y*7+2)<.2&&!keep(x,y))trees.push([x,y])}
  for(const[x,y]of trees)if(floorAt(x,y)&&sc.ST[x][y]==='g'&&!sc.B[x][y]&&!unitAt(x,y))placeObj({type:'tree',x,y,block:true});
  return sc;
}

/* ---------- dungeon ---------- */
function buildDungeon(){
  const sc=SC=newScene('dungeon',32,28);
  for(let x=0;x<32;x++)for(let y=0;y<28;y++){sc.T[x][y]=2;sc.ST[x][y]='s'}
  const carve=(x0,y0,x1,y1,st='s')=>{for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){sc.T[x][y]=1;sc.ST[x][y]=st}};
  carve(1,1,6,6);carve(10,1,17,7);carve(21,1,30,8);carve(1,11,8,18);carve(11,10,16,15);carve(18,14,30,26,'b');
  carve(7,3,9,3);carve(18,4,20,4);carve(3,7,3,10);carve(9,13,10,13);carve(13,8,13,9);carve(26,9,26,13);carve(17,14,17,14);carve(4,19,4,21);carve(4,21,17,21);
  for(const[x,y]of[[21,17],[27,17],[21,23],[27,23]])sc.T[x][y]=2;
  for(let x=0;x<32;x++)for(let y=0;y<28;y++){if(sc.T[x][y]!==2)continue;if(D8.some(([dx,dy])=>{const nx=x+dx,ny=y+dy;return nx>=0&&ny>=0&&nx<32&&ny<28&&sc.T[nx][ny]===1}))sc.COL[x][y]={wall:true}}
  sc.room={x0:18,y0:14,x1:30,y1:26};
  sc.exit={x:29,y:25};placeObj({type:'exit',x:29,y:25});
  placeObj({type:'rubble',x:1,y:1,block:true});
  for(const[x,y]of[[6,1],[10,7],[21,8],[8,18],[16,10],[30,14],[18,26],[30,26]])placeObj({type:'brazier',x,y,block:true});
  for(const[x,y]of[[5,5],[11,2],[16,6],[22,2],[29,2],[24,7],[30,6],[1,17],[7,17]])placeObj({type:'ore',metal:'copper',x,y,hp:3,block:true});
  for(const[x,y]of[[11,15],[16,15],[30,20],[18,18]])placeObj({type:'ore',metal:'iron',x,y,hp:4,block:true});
  for(const[x,y]of[[17,1],[1,18],[30,1],[11,10]])placeObj({type:'chest',x,y,open:false,block:true});
  for(const k of KNIGHTS)if(S.roster[k.id]==='missing')placeObj({type:'fallen',k,id:k.id,name:k.name,x:k.x,y:k.y,state:'fallen',prog:0,block:true});
  const E=[['skeleton',13,4],['skeleton',15,6],['ghoul',25,3],['ghoul',28,6],['ghoul',23,5],['archer',6,16],['archer',2,14],['skeleton',7,13],['skeleton',13,13],['skeleton',15,13],['archer',12,11],['ghoul',8,21],['ghoul',13,21]];
  for(const[t,x,y]of E){const T=ETYPES[t];mkUnit({kind:'enemy',type:t,team:1,tx:x,ty:y,hp:T.hp,maxhp:T.hp,sleep:true,moveT:rnd(0,.3),cd:rnd(.3,.9),atk:null,look:T.look,face:{x:-1,y:0}})}
  const bhp=260+120*S.size;
  sc.boss=mkUnit({kind:'boss',team:1,tx:24,ty:20,hx:24,hy:20,hp:bhp,maxhp:bhp,state:'dormant',t:1.5,moveT:0,p2:false,face:{x:-1,y:0},raise:0,room:sc.room,dur:.4});
  return sc;
}

/* ---------- party ---------- */
function makeParty(spots){
  const rest=['knight','ranger','mage'].filter(c=>c!==S.cls);const order=[S.cls,rest[0],rest[1],rest[0]].slice(0,S.size);
  order.forEach((cls,i)=>{const c=CLASSES[cls];const[x,y]=spots[i];const hp=c.hp+hpBonus();
    const u=mkUnit({kind:'hero',team:0,cls,ai:i>0,name:i?ALLY_NAMES[i-1]:'You',ring:RING[i],tx:x,ty:y,hp,maxhp:hp,look:Object.assign({},c.look,cls==='knight'?{plume:RING[i]}:{}),face:{x:0,y:1}});
    if(i===0)SC.player=u});
}
function enterVillage(from){
  buildVillage();
  makeParty(from==='gate'?[[17,2],[17,3],[17,4],[17,5]]:[[11+VO,13+VO],[10+VO,13+VO],[12+VO,13+VO],[11+VO,12+VO]]);
  snapCam();
  if(from==='start')banner('Lanternhold','Talk to Captain Maren by the guild hall.',3.2);
}
function enterDungeon(){
  buildDungeon();makeParty([[2,2],[3,2],[2,3],[3,3]]);snapCam();
  const m=KNIGHTS.filter(k=>S.roster[k.id]==='missing').length;
  banner('The Ashen Barrow',m?`The way back has collapsed. ${m} wounded somewhere below. The guild portal is past the Warden.`:'Every knight is accounted for. Ore and the Warden remain.',3.6);
}
function snapCam(){const p=pos(SC.player),c=iso(p.x,p.y);SC.cam={x:c[0],y:c[1]-20}}

/* ---------- movement ---------- */
function pos(u){const p=u.prog>=1?1:u.prog;return{x:u.fx+(u.tx-u.fx)*p+.5,y:u.fy+(u.ty-u.fy)*p+.5}}
const tileOf=u=>u.prog>.5?{x:u.tx,y:u.ty}:{x:u.fx,y:u.fy};
function advance(u,dt){if(u.prog<1)u.prog=Math.min(1,u.prog+dt/u.dur)}
function stepTo(u,nx,ny,dur){u.fx=u.tx;u.fy=u.ty;u.tx=nx;u.ty=ny;u.prog=0;u.dur=dur}
function tryStep(u,dx,dy,dur){
  const nx=u.tx+dx,ny=u.ty+dy;u.face={x:dx,y:dy};
  if(free(nx,ny,u)){stepTo(u,nx,ny,dur);return true}
  const o=unitAt(nx,ny,u);
  if(u===SC.player&&o&&o.kind==='hero'&&o.ai&&!o.down&&o.prog>=1&&floorAt(nx,ny)&&!SC.B[nx][ny]){stepTo(o,u.tx,u.ty,dur);o.face={x:-dx,y:-dy};stepTo(u,nx,ny,dur);return true}
  return false}
function tryDash(u,dx,dy){let n=0;for(let i=1;i<=2;i++){if(!free(u.tx+dx*i,u.ty+dy*i,u))break;n=i}u.face={x:dx,y:dy};if(!n)return false;stepTo(u,u.tx+dx*n,u.ty+dy*n,.08*n+.04);return true}
function pushBack(e,dx,dy,n){let k=0;for(let i=1;i<=n;i++){if(!free(e.tx+dx*i,e.ty+dy*i,e))break;k=i}if(k)stepTo(e,e.tx+dx*k,e.ty+dy*k,.1*k)}
function bfs(sx,sy,goal,o){
  o=o||{};const Wd=SC.W,Hd=SC.H;const prev=new Int32Array(Wd*Hd).fill(-1);const st=sx+sy*Wd;prev[st]=st;const q=[st];let qi=0;const max=o.max||1500;
  while(qi<q.length&&qi<max){const c=q[qi++];const cx=c%Wd,cy=(c-cx)/Wd;
    for(const[dx,dy]of D4){const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=Wd||ny>=Hd)continue;const ni=nx+ny*Wd;if(prev[ni]!==-1)continue;
      if(SC.T[nx][ny]!==1||SC.B[nx][ny])continue;if(o.room&&!inRoom(o.room,nx,ny))continue;
      if(man(nx,ny,sx,sy)<=2&&unitAt(nx,ny,o.self))continue;if(o.avoid&&o.avoid.has(key(nx,ny)))continue;
      prev[ni]=c;if(goal(nx,ny)){let n=ni;while(prev[n]!==st)n=prev[n];const x=n%Wd;return{x:x-sx,y:(n-x)/Wd-sy}}q.push(ni)}}
  return null}
function blocksShot(x,y){const o=SC.B[x][y];return o&&o.type!=='chest'&&o.type!=='fallen'}
function aligned(x,y,ex,ey,R){if(x!==ex&&y!==ey)return null;const d=man(x,y,ex,ey);if(d===0||d>R)return null;const dx=Math.sign(ex-x),dy=Math.sign(ey-y);for(let i=1;i<d;i++){const cx=x+dx*i,cy=y+dy*i;if(!floorAt(cx,cy)||blocksShot(cx,cy))return null}return{x:dx,y:dy}}
