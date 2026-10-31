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
const CHARS={knight:{src:'knight-walk',frames:4,w:38,h:58,ax:24,ay:57,walk:[0,1,2,3],idle:3}};
if(typeof Image!=='undefined')for(const c of Object.values(CHARS)){const im=new Image();im.onload=()=>{const fw=im.naturalWidth/c.frames,fh=im.naturalHeight;c.fw=fw;c.fh=fh;
  const wc=document.createElement('canvas');wc.width=im.naturalWidth;wc.height=fh;const x=wc.getContext('2d');x.drawImage(im,0,0);x.globalCompositeOperation='source-atop';x.fillStyle='#fff';x.fillRect(0,0,wc.width,fh);c.white=wc;c.ok=true};im.src='assets/sprites/'+c.src+'.png';c.im=im}
function drawArt(n,sx,sy,flip){const a=art(n);if(!a)return false;if(flip){ctx.save();ctx.translate(sx,sy);ctx.scale(-1,1);ctx.drawImage(a.im,-a.ax,-a.ay,a.w,a.h);ctx.restore()}else ctx.drawImage(a.im,sx-a.ax,sy-a.ay,a.w,a.h);return true}
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
