'use strict';
// Canvas setup, sprite loading and small math helpers.

const cv=document.getElementById('game'),ctx=cv.getContext('2d');
const fog=document.createElement('canvas'),fctx=fog.getContext('2d');
let W=800,H=540,DPR=1,Z=1;
function resize(){const st=cv.parentElement;W=st.clientWidth||window.innerWidth||800;H=st.clientHeight||window.innerHeight||600;DPR=Math.min(2,window.devicePixelRatio||1);cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);fog.width=cv.width;fog.height=cv.height;Z=Math.max(.6,Math.min(1.45,Math.min(W/820,H/560)))}
window.addEventListener('resize',resize);resize();

const ART={};if(typeof Image!=='undefined')for(const[k,v]of Object.entries(SPRITES)){const im=new Image();im.src='assets/sprites/'+k+'.png';ART[k]=Object.assign({im},v)}
const art=n=>{const a=ART[n];return a&&a.im.complete&&a.im.naturalWidth?a:null};
// Animated character sheets: frames side by side, stored at 3x game size. w/h/ax/ay are in game pixels.
const CHARS={knight:{src:'knight-walk',frames:5,w:38.67,h:61,ax:24.3,ay:60.6,walk:[0,1,2,3],idle:4}};
if(typeof Image!=='undefined')for(const c of Object.values(CHARS)){const im=new Image();im.onload=()=>{const fw=im.naturalWidth/c.frames,fh=im.naturalHeight;c.fw=fw;c.fh=fh;
  const wc=document.createElement('canvas');wc.width=im.naturalWidth;wc.height=fh;const x=wc.getContext('2d');x.drawImage(im,0,0);x.globalCompositeOperation='source-atop';x.fillStyle='#fff';x.fillRect(0,0,wc.width,fh);c.white=wc;c.ok=true};im.src='assets/sprites/'+c.src+'.png';c.im=im}
// Village building sprites (assets/sprites/bld-*.png, stored at 2x), already corrected to the 2:1 grid angle by pack.py.
// In game px: w,h size; cx,cy the centre of the base diamond; fx the x of the front corner, where the sprite is split
// into left and right halves; smoke a chimney top.
// foot is the footprint in tiles: [along the front-left (door) wall, along the front-right wall]. Built by art/buildings/pack.py.
const BLD={"guild":{"foot":[6,4],"w":322.5,"h":324.5,"cx":160.55,"cy":249.27,"fx":192.55,"smoke":[250.37,52.38]},"forge":{"foot":[4,5],"w":291.0,"h":288.5,"cx":145.0,"cy":214.27,"fx":129.0,"smoke":[204.76,23.14]},"apothecary":{"foot":[5,4],"w":290.5,"h":290.0,"cx":144.63,"cy":219.63,"fx":160.63,"smoke":[216.82,21.08]},"mill":{"foot":[5,4],"w":319.5,"h":319.0,"cx":144.61,"cy":244.84,"fx":160.61},"cottage":{"foot":[3,3],"w":197.0,"h":192.5,"cx":99.09,"cy":145.6,"fx":99.09,"smoke":[148.46,7.18]}};
// On load, record the top painted pixel of each game-pixel column, so fading can test what actually covers the player.
if(typeof Image!=='undefined')for(const[k,v]of Object.entries(BLD)){const im=new Image();im.onload=()=>{try{const c=document.createElement('canvas'),W2=Math.ceil(v.w),H2=Math.ceil(v.h);c.width=W2;c.height=H2;const x=c.getContext('2d');x.drawImage(im,0,0,W2,H2);
  const d=x.getImageData(0,0,W2,H2).data,t=new Float32Array(W2).fill(1e9);for(let cx=0;cx<W2;cx++)for(let cy=0;cy<H2;cy++)if(d[(cy*W2+cx)*4+3]>128){t[cx]=cy;break}v.tops=t}catch(e){}};im.src='assets/sprites/bld-'+k+'.png';v.im=im}
const bldArt=n=>{const v=BLD[n];return v&&v.im.complete&&v.im.naturalWidth?v:null};
// World scale. Characters are about 60px tall, so village props, buildings and code-drawn figures are scaled up from their original sizes.
const FIG=1.24,BS=1.45,PROP={tree:1.5,well:1.35,banner:1.4};
function drawArt(n,sx,sy,flip,k=1){const a=art(n);if(!a)return false;ctx.save();ctx.translate(sx,sy);ctx.scale(flip?-k:k,k);ctx.drawImage(a.im,-a.ax,-a.ay,a.w,a.h);ctx.restore();return true}
const RUNES={'24,20':'rune2','22,20':'rune1','26,20':'rune1','24,18':'rune1','24,22':'rune1'};
/* ---------- helpers ---------- */
const iso=(x,y)=>[(x-y)*32,(x+y)*16];
const hash=(a,b)=>{const s=Math.sin(a*127.1+b*311.7)*43758.5453;return s-Math.floor(s)};
const rnd=(a,b)=>a+Math.random()*(b-a);
const ri=(a,b)=>Math.floor(a+Math.random()*(b-a+1));
const key=(x,y)=>x+','+y;
const man=(ax,ay,bx,by)=>Math.abs(ax-bx)+Math.abs(ay-by);
const cheb=(ax,ay,bx,by)=>Math.max(Math.abs(ax-bx),Math.abs(ay-by));
const D4=[[1,0],[-1,0],[0,1],[0,-1]];
const D8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
function shade(hex,amt){const n=parseInt(hex.slice(1),16);let r=n>>16,g=(n>>8)&255,b=n&255;const t=amt<0?0:255,p=Math.abs(amt);r=Math.round(r+(t-r)*p);g=Math.round(g+(t-g)*p);b=Math.round(b+(t-b)*p);return`rgb(${r},${g},${b})`}
