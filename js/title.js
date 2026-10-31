'use strict';
// Title screen: painted backdrop, ember particles over the braziers, and the main menu.
/* ---------- title ---------- */
const titleEl=document.getElementById('title');
const OPTS={reduceMotion:false,pad:'dpad'};
try{Object.assign(OPTS,JSON.parse(localStorage.getItem('sm-options')||'{}'))}catch(e){}
applyPadMode();
function saveOpts(){try{localStorage.setItem('sm-options',JSON.stringify(OPTS))}catch(e){}}
const calmMotion=()=>OPTS.reduceMotion||(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
let titleOn=false;

function showTitle(){
  titleOn=true;document.body.classList.remove('playing');titleEl.hidden=false;document.body.classList.add('on-title');
  titleEl.classList.toggle('calm',calmMotion());
  requestAnimationFrame(()=>titleEl.classList.add('in'));
  const b=titleEl.querySelector('[data-menu="begin"]');if(b)b.focus({preventScroll:true});
}
function hideTitle(){titleOn=false;titleEl.classList.remove('in');document.body.classList.remove('on-title');setTimeout(()=>{if(!titleOn)titleEl.hidden=true},450)}

function titleOptions(back){back=back||showTitle;
  const fsOk=!!(document.documentElement.requestFullscreen);
  const row=(k,label,on,desc)=>`<button type="button" class="opt ${on?'on':''}" data-opt="${k}" aria-pressed="${on}"><span class="opt-t">${label}</span><span class="opt-d">${desc}</span></button>`;
  showPanel(`<div class="who">Strictly Medical</div><h2>Options</h2><div class="opts rules">
    ${row('pad','Movement: '+(OPTS.pad==='dpad'?'D-pad':'Joystick'),true,OPTS.pad==='dpad'?'An isometric D-pad on the left, one arm per grid direction. Tap to switch to the joystick.':'Touch and drag anywhere on the left half of the screen. Tap to switch to the D-pad.')}
    ${row('reduceMotion','Reduce motion',OPTS.reduceMotion,'Stills the title screen’s drifting camera and embers.')}
    ${fsOk?row('fullscreen','Fullscreen',!!document.fullscreenElement,'Hide the browser bars while you play.'):''}
    </div><div class="actions"><button type="button" class="primary" data-done>Done</button></div>`,el=>{
      el.querySelectorAll('[data-opt]').forEach(b=>b.addEventListener('click',()=>{
        const k=b.dataset.opt;
        if(k==='fullscreen'){const p=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();Promise.resolve(p).catch(()=>{}).then(()=>setTimeout(()=>titleOptions(back),120));return}
        if(k==='pad'){OPTS.pad=OPTS.pad==='dpad'?'stick':'dpad';saveOpts();applyPadMode();titleOptions(back);return}
        OPTS[k]=!OPTS[k];saveOpts();titleEl.classList.toggle('calm',calmMotion());titleOptions(back)}));
      el.querySelector('[data-done]').addEventListener('click',()=>{hidePanel();back()});
    });
}
function titleCredits(){
  showPanel(`<div class="who">Strictly Medical · The Order of the Ninety and Nine</div><h2>Credits</h2>
    <ul class="roster">
      <li>Design and development<span>Noros</span></li>
      <li>Art<span>Generated with ChatGPT and SpriteCook</span></li>
      <li>Typefaces<span>IM Fell English SC, Alegreya Sans</span></li>
    </ul>
    <p class="hint">“What man of you, having an hundred sheep, if he lose one of them, doth not leave the ninety and nine in the wilderness, and go after that which is lost, until he find it?” Luke 15:4</p>
    <div class="actions"><button type="button" class="primary" data-done>Back</button></div>`,el=>{
      el.querySelector('[data-done]').addEventListener('click',()=>{hidePanel();showTitle()});
    });
}
titleEl.querySelectorAll('[data-menu]').forEach(b=>b.addEventListener('click',()=>{
  const m=b.dataset.menu;
  if(m==='begin'){hideTitle();muster(true)}
  else if(m==='options')titleOptions();
  else if(m==='credits')titleCredits();
}));
// Keyboard: up/down (or W/S) walks the menu, Enter or Space picks. Runs before the game's own key handler.
window.addEventListener('keydown',ev=>{
  if(!titleOn||panelOpen)return;
  const items=[...titleEl.querySelectorAll('[data-menu]:not(:disabled)')];if(!items.length)return;
  const i=items.indexOf(document.activeElement);
  const up=ev.code==='ArrowUp'||ev.code==='KeyW',down=ev.code==='ArrowDown'||ev.code==='KeyS';
  if(up||down){ev.preventDefault();ev.stopImmediatePropagation();const n=i<0?0:(i+(down?1:-1)+items.length)%items.length;items[n].focus({preventScroll:true});return}
  if(ev.code==='Enter'||ev.code==='Space'){ev.preventDefault();ev.stopImmediatePropagation();(i<0?items[0]:items[i]).click();return}
  ev.stopImmediatePropagation();
},true);

/* ---------- embers ---------- */
// Brazier and torch positions in the backdrop image, as fractions of its 1672x941 size.
const TITLE_FIRES=[[.341,.722,1],[.648,.815,1],[.869,.540,.8],[.714,.776,.45],[.186,.858,.25],[.205,.858,.25]];
const tcv=document.getElementById('title-embers'),tctx=tcv.getContext('2d');
const embers=[];let tLast=performance.now();
function titleFrame(now){
  requestAnimationFrame(titleFrame);
  const dt=Math.min(.05,(now-tLast)/1000);tLast=now;
  if(!titleOn||document.hidden)return;
  const w=titleEl.clientWidth,h=titleEl.clientHeight,dpr=Math.min(2,window.devicePixelRatio||1);
  if(tcv.width!==Math.round(w*dpr)||tcv.height!==Math.round(h*dpr)){tcv.width=Math.round(w*dpr);tcv.height=Math.round(h*dpr)}
  tctx.setTransform(dpr,0,0,dpr,0,0);tctx.clearRect(0,0,w,h);
  if(calmMotion())return;
  // Same cover-fit as the CSS backdrop (scaled 1.06 at the drift's midpoint).
  const s=Math.max(w/1672,h/941)*1.06,iw=1672*s,ih=941*s,ox=(w-iw)/2,oy=(h-ih)/2;
  for(const[fx,fy,r]of TITLE_FIRES)if(Math.random()<dt*14*r)embers.push({x:ox+fx*iw+(Math.random()-.5)*14*s,y:oy+fy*ih,vx:(Math.random()-.4)*14,vy:-(26+Math.random()*40),t:0,life:1+Math.random()*1.4,size:(1+Math.random()*1.6)*Math.max(.7,s)});
  tctx.globalCompositeOperation='lighter';
  for(let i=embers.length-1;i>=0;i--){const e=embers[i];e.t+=dt;if(e.t>e.life){embers.splice(i,1);continue}
    e.x+=(e.vx+Math.sin((e.t+i)*3)*8)*dt;e.y+=e.vy*dt;const a=1-e.t/e.life;
    tctx.fillStyle=`rgba(255,${150+Math.round(70*a)},70,${(a*.9).toFixed(3)})`;tctx.fillRect(e.x,e.y,e.size,e.size)}
  tctx.globalCompositeOperation='source-over';
}
requestAnimationFrame(titleFrame);

/* ---------- pause ---------- */
// Any open panel already stops the game loop, so pausing is just a panel.
function pauseMenu(){
  if(!S.started||titleOn||panelOpen)return;
  const where=SC&&SC.kind==='dungeon'?'The Ashen Barrow':'Lanternhold';
  showPanel(`<div class="who">Paused · ${where}</div><h2>Strictly Medical</h2>
    <div class="actions"><button type="button" class="primary" data-p="resume">Resume</button><button type="button" data-p="options">Options</button><button type="button" data-p="title">Return to title</button></div>`,el=>{
      el.querySelector('[data-p=resume]').addEventListener('click',hidePanel);
      el.querySelector('[data-p=options]').addEventListener('click',()=>titleOptions(pauseMenuAfter));
      el.querySelector('[data-p=title]').addEventListener('click',()=>{
        if(SC&&SC.kind==='dungeon')showPanel(`<div class="who">Return to title</div><h2>Abandon this run?</h2><p>You are still in the Barrow. Anything in your pack is left behind.</p>
          <div class="actions"><button type="button" class="primary" data-c="stay">Keep playing</button><button type="button" data-c="go">Abandon and return to title</button></div>`,e2=>{
            e2.querySelector('[data-c=stay]').addEventListener('click',()=>{hidePanel();pauseMenu()});
            e2.querySelector('[data-c=go]').addEventListener('click',toTitle)});
        else toTitle()});
    });
}
function pauseMenuAfter(){pauseMenu()}
function toTitle(){hidePanel();S.started=false;showTitle()}
document.getElementById('pause-btn').addEventListener('click',ev=>{ev.preventDefault();pauseMenu()});
// Remember whether a panel was open before any handler ran, so Esc that closes a dialog doesn't also open the pause menu.
let keyPanelWas=false;window.addEventListener('keydown',()=>{keyPanelWas=panelOpen},true);
window.addEventListener('keydown',ev=>{if((ev.code==='Escape'||ev.code==='KeyP')&&!keyPanelWas&&!panelOpen&&!titleOn&&S.started){ev.preventDefault();pauseMenu()}});
