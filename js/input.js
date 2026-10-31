'use strict';
// Keyboard, mouse and touch input.
/* ---------- input ---------- */
const keys=new Set(),pressed=new Set();
const KEYMAP={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',KeyJ:'atk',Space:'atk',KeyK:'roll',ShiftLeft:'roll',ShiftRight:'roll',KeyL:'skill',KeyU:'skill',KeyQ:'heal',KeyE:'act',KeyF:'act'};
window.addEventListener('keydown',ev=>{
  if(ev.code==='Escape'&&panelOpen&&panelClosable){hidePanel();return}
  const k=KEYMAP[ev.code];if(!k||panelOpen)return;
  if(ev.target&&ev.target.closest&&ev.target.closest('button')&&(ev.code==='Space'||ev.code==='Enter'))return;
  ev.preventDefault();if(!keys.has(k))pressed.add(k);keys.add(k)});
window.addEventListener('keyup',ev=>{const k=KEYMAP[ev.code];if(k)keys.delete(k)});
window.addEventListener('blur',()=>keys.clear());
const joy={id:null,ox:0,oy:0,x:0,y:0};
cv.addEventListener('pointerdown',ev=>{
  if(panelOpen)return;
  if(ev.pointerType==='mouse'){if(ev.button===0)pressed.add('atk');return}
  const r=cv.getBoundingClientRect(),x=ev.clientX-r.left,y=ev.clientY-r.top;
  if(x<r.width*.5&&padMode()==='stick'){joy.id=ev.pointerId;joy.ox=x;joy.oy=y;joy.x=0;joy.y=0;try{cv.setPointerCapture(ev.pointerId)}catch(e){}}
});
cv.addEventListener('pointermove',ev=>{if(ev.pointerId!==joy.id)return;const r=cv.getBoundingClientRect();let dx=ev.clientX-r.left-joy.ox,dy=ev.clientY-r.top-joy.oy;const l=Math.hypot(dx,dy);if(l>46){dx*=46/l;dy*=46/l}joy.x=dx/46;joy.y=dy/46});
const endJoy=ev=>{if(ev.pointerId===joy.id){joy.id=null;joy.x=0;joy.y=0}};
cv.addEventListener('pointerup',endJoy);cv.addEventListener('pointercancel',endJoy);
document.querySelectorAll('.touch button').forEach(b=>{
  b.addEventListener('pointerdown',ev=>{ev.preventDefault();b.classList.add('held');if(panelOpen)return;pressed.add(b.dataset.k);if(b.dataset.hold)keys.add(b.dataset.k)});
  const up=()=>{b.classList.remove('held');if(b.dataset.hold)keys.delete(b.dataset.k)};b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',up)});
/* Isometric D-pad: one finger anywhere on the pad picks the nearest arm, and can slide between arms. */
const padMode=()=>(typeof OPTS!=='undefined'&&OPTS.pad)||'dpad';
const dpadEl=document.querySelector('.dpad'),dpadArms={};let dpadId=null,dpadDir=null;
if(dpadEl){dpadEl.querySelectorAll('[data-dir]').forEach(a=>dpadArms[a.dataset.dir]=a);
  const setDir=d=>{if(d===dpadDir)return;if(dpadDir){keys.delete(dpadDir);dpadArms[dpadDir].classList.remove('on');dpadEl.classList.remove('on-'+dpadDir)}dpadDir=d;if(d){if(!panelOpen){keys.add(d);pressed.add(d)}dpadArms[d].classList.add('on');dpadEl.classList.add('on-'+d)}};
  const pick=ev=>{const r=dpadEl.getBoundingClientRect(),dx=ev.clientX-(r.left+r.width/2),dy=ev.clientY-(r.top+r.height/2);
    if(Math.hypot(dx,dy)<r.width*.1)return null;
    // Screen up-right is grid "up", down-right "right", down-left "down", up-left "left".
    return dx>=0?(dy<0?'up':'right'):(dy<0?'left':'down')};
  dpadEl.addEventListener('pointerdown',ev=>{ev.preventDefault();if(dpadId!==null)return;dpadId=ev.pointerId;try{dpadEl.setPointerCapture(ev.pointerId)}catch(e){}setDir(pick(ev))});
  dpadEl.addEventListener('pointermove',ev=>{if(ev.pointerId===dpadId)setDir(pick(ev))});
  const end=ev=>{if(ev.pointerId!==dpadId)return;dpadId=null;setDir(null)};
  dpadEl.addEventListener('pointerup',end);dpadEl.addEventListener('pointercancel',end);
  window.addEventListener('blur',()=>{dpadId=null;setDir(null)});
}
function applyPadMode(){document.body.classList.toggle('pad-dpad',padMode()==='dpad')}
applyPadMode();
function inputDir(){
  let sx=(keys.has('right')?1:0)-(keys.has('left')?1:0),sy=(keys.has('down')?1:0)-(keys.has('up')?1:0);
  if(joy.id!==null&&Math.hypot(joy.x,joy.y)>.35){sx=joy.x;sy=joy.y}
  else{if(!sx&&!sy)return null;if(!sy)return{x:sx,y:0};if(!sx)return{x:0,y:sy}}
  if(sy<0)return sx>=0?{x:0,y:-1}:{x:-1,y:0};
  return sx>=0?{x:1,y:0}:{x:0,y:1};
}
