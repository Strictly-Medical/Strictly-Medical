'use strict';
// Ending a run, dialogue panels, shops and quests.
/* ---------- runs ---------- */
function endRun(result){
  if(SC.done)return;SC.done=true;S.runs++;
  const pk=SC.pack,lines=[];const lostNow=[];
  const carried=heroes().filter(h=>h.carrying).map(h=>h.carrying);
  if(result==='extract'){
    for(const o of carried){S.roster[o.id]='saved';SC.saved.push(o.name)}
    S.coins+=pk.coins;S.ore.copper+=pk.copper;S.ore.iron+=pk.iron;
    lines.push(`You brought back ${pk.coins} coins, ${pk.copper} copper ore and ${pk.iron} iron ore.`);
  }else{
    if(S.rule==='mercy'){S.coins+=pk.coins;S.ore.copper+=pk.copper;S.ore.iron+=pk.iron;lines.push(`The guild’s clerics dragged the party out. Under Mercy you kept your pack: ${pk.coins} coins, ${pk.copper} copper, ${pk.iron} iron.`)}
    else lines.push(`Your pack is lost: ${pk.coins} coins, ${pk.copper} copper and ${pk.iron} iron ore stay in the Barrow.`);
    if(S.rule==='grim'){for(const o of SC.objs)if(o.type==='fallen'&&o.state==='stable')lostNow.push(o);for(const o of carried)lostNow.push(o);for(const o of lostNow)S.roster[o.id]='lost';
      if(lostNow.length)lines.push(`Under Grim rules, ${lostNow.map(o=>o.name).join(' and ')} died before anyone could reach them.`)}
    else lines.push('The wounded you had not yet brought out are still down there, where they fell.');
  }
  if(SC.saved.length)lines.unshift(`Rescued this run: ${SC.saved.join(', ')}.`);
  const missing=KNIGHTS.filter(k=>S.roster[k.id]==='missing').length;
  if(!missing)lines.push('Every knight on this floor is accounted for. Report to Captain Maren.');
  else lines.push(`${missing} still missing in the Barrow.`);
  const title=result==='extract'?'Extracted':'The Party Fell';
  setTimeout(()=>{enterVillage('gate');dialog({role:result==='extract'?'Run complete':`${RULES[S.rule].name} rules`,who:title,lines,actions:[{label:'Back to Lanternhold',primary:true,fn:hidePanel}]})},result==='extract'?250:0);
}

/* ---------- panels ---------- */
const panelEl=document.getElementById('panel');let panelOpen=false,panelClosable=true;
function showPanel(html,bind,closable=true){panelEl.innerHTML='<div class="card" role="dialog" aria-modal="true">'+html+'</div>';panelEl.hidden=false;panelOpen=true;panelClosable=closable;keys.clear();bind&&bind(panelEl);
  const f=panelEl.querySelector('[data-focus]')||panelEl.querySelector('.actions button.primary')||panelEl.querySelector('button:not([disabled])');if(f&&f.focus)f.focus({preventScroll:true})}
function hidePanel(){panelEl.hidden=true;panelOpen=false;keys.clear();pressed.clear()}
function stash(){return`<div class="stash"><span>Coins <b>${S.coins}</b></span><span>Copper ore <b>${S.ore.copper}</b></span><span>Iron ore <b>${S.ore.iron}</b></span><span>Flasks <b>${S.flasks}/5</b></span></div>`}
function dialog({role,who,lines,actions,extra}){
  showPanel(`<div class="who">${role||''}</div><h2>${who}</h2>${lines.map(l=>`<p>${l}</p>`).join('')}${extra||''}<div class="actions">${actions.map((a,i)=>`<button type="button" class="${a.primary?'primary':''}" data-a="${i}" ${a.disabled?'disabled':''}>${a.label}</button>`).join('')}</div>`,
    el=>el.querySelectorAll('[data-a]').forEach(b=>b.addEventListener('click',()=>actions[+b.dataset.a].fn())));
}
function muster(first,focusSel){
  const cl=Object.entries(CLASSES).map(([k,c])=>`<button type="button" class="opt ${S.cls===k?'on':''}" data-cls="${k}" aria-pressed="${S.cls===k}"><span class="opt-t">${c.name}</span><span class="opt-s">${c.role} · ${c.hp} HP</span><span class="opt-d">${c.desc}</span></button>`).join('');
  const sz=[2,3,4].map(n=>`<button type="button" class="${S.size===n?'on':''}" data-size="${n}" aria-pressed="${S.size===n}">Party of ${n}</button>`).join('');
  const rl=Object.entries(RULES).map(([k,r])=>`<button type="button" class="opt ${S.rule===k?'on':''}" data-rule="${k}" aria-pressed="${S.rule===k}"><span class="opt-t">${r.name}</span><span class="opt-d">${r.desc}</span></button>`).join('');
  showPanel(`<div class="who">${first?'Strictly Medical · The Order of the Ninety and Nine':'Captain Maren'}</div><h2>${first?'Muster your party':'Change the party'}</h2>
    ${first?'<p>You lead the first guild of medic knights. You don’t go into the dungeons for glory. You go in for the one who didn’t come back, and leave the ninety-nine to wait.</p><p class="hint">For the record: this is a medical organization. Any monsters harmed were harmed in self-defense.</p>':''}
    <h3>Your class</h3><div class="opts">${cl}</div>
    <h3>Party size</h3><p class="hint">AI companions stand in for your friends and take the other classes.</p><div class="segs">${sz}</div>
    <h3>If the whole party falls</h3><div class="opts rules">${rl}</div>
    <h3>Controls</h3><div class="keys-panel"><span><kbd>WASD</kbd> move along the grid</span><span><kbd>J</kbd> strike</span><span><kbd>L</kbd> skill</span><span><kbd>K</kbd> dodge</span><span><kbd>E</kbd> use, hold to stabilize, revive or extract</span><span><kbd>Q</kbd> flask</span></div>
    <div class="actions"><button type="button" class="primary" data-go>${first?'Enter the village':'Done'}</button>${first?'<button type="button" data-back>Back to title</button>':''}</div>`,el=>{
      const bk=el.querySelector('[data-back]');if(bk)bk.addEventListener('click',()=>{hidePanel();showTitle()});
      el.querySelectorAll('[data-cls]').forEach(b=>b.addEventListener('click',()=>{S.cls=b.dataset.cls;muster(first,`[data-cls="${S.cls}"]`)}));
      el.querySelectorAll('[data-size]').forEach(b=>b.addEventListener('click',()=>{S.size=+b.dataset.size;muster(first,`[data-size="${S.size}"]`)}));
      el.querySelectorAll('[data-rule]').forEach(b=>b.addEventListener('click',()=>{S.rule=b.dataset.rule;muster(first,`[data-rule="${S.rule}"]`)}));
      el.querySelector('[data-go]').addEventListener('click',()=>{hidePanel();if(first){S.started=true;enterVillage('start')}else rebuildParty()});
      if(focusSel){const f=el.querySelector(focusSel);if(f)f.setAttribute('data-focus','')}
    },!first);
}
function rebuildParty(){const p=SC.player;const spots=[[p.tx,p.ty]];for(const[dx,dy]of D8){const x=p.tx+dx,y=p.ty+dy;if(floorAt(x,y)&&!SC.B[x][y]&&!SC.units.some(u=>u.kind!=='hero'&&u.tx===x&&u.ty===y))spots.push([x,y])}
  SC.units=SC.units.filter(u=>u.kind!=='hero');makeParty(spots)}
function refreshGear(){for(const h of heroes()){h.maxhp=CLASSES[h.cls].hp+hpBonus();h.hp=h.maxhp}}
function talkCaptain(){
  const missing=KNIGHTS.filter(k=>S.roster[k.id]==='missing').length,lost=KNIGHTS.filter(k=>S.roster[k.id]==='lost');
  const roster=`<ul class="roster">${KNIGHTS.map(k=>`<li><b>${k.name}</b><span>${k.title}</span><em class="${S.roster[k.id]}">${{missing:'Missing',saved:'Rescued',lost:'Lost'}[S.roster[k.id]]}</em></li>`).join('')}</ul>`;
  let lines;
  if(missing===3&&!S.runs)lines=['Three of the Order of the Thorn went into the Ashen Barrow after the thing they call the Lantern Warden. None came back up.','No one goes in after the fallen. That is why the Ninety and Nine exists. We are healers, not adventurers, and I will not have anyone calling us a dungeon guild. Find them, hold steady until they stop bleeding, and carry them through our portal. The portal is past the Warden, so you will have to get by it.'];
  else if(missing>0)lines=[`${missing} still down there. They won’t last forever, and neither will our coin.`,'Copper on the first floor buys better steel from Odo. Flasks from Sister Ilse keep you standing.'];
  else{lines=['Every one of them accounted for. The Order of the Thorn now owes a debt to a guild of nurses with swords.','And if anyone asks, we did not clear that floor. We were strictly there for the wounded.'];
    if(lost.length)lines.push(`We lost ${lost.map(k=>k.name).join(' and ')}. That is part of the work too.`);
    if(!S.mainDone){S.mainDone=true;S.coins+=120;lines.push('The Order sent 120 coins with their thanks. It’s yours.')}
    lines.push('In the full game, floors 2 and 3 of the Barrow would open next, and after them the next island.')}
  dialog({role:'The Ninety and Nine',who:'Captain Maren',lines,extra:roster,actions:[{label:'Change class, party size or failure rule',fn:()=>muster(false)},{label:'Leave',primary:true,fn:hidePanel}]});
}
function talkOdo(){
  const o=S.ore,acts=[];
  acts.push({label:`Sell copper ore: ${o.copper} × 6 coins`,disabled:!o.copper,fn:()=>{S.coins+=o.copper*6;o.copper=0;talkOdo()}});
  acts.push({label:`Sell iron ore: ${o.iron} × 14 coins`,disabled:!o.iron,fn:()=>{S.coins+=o.iron*14;o.iron=0;talkOdo()}});
  if(S.weapon===0)acts.push({label:'Forge copper edges: 5 copper, 20 coins (+5 damage for the party)',disabled:o.copper<5||S.coins<20,fn:()=>{o.copper-=5;S.coins-=20;S.weapon=1;talkOdo()}});
  else if(S.weapon===1)acts.push({label:'Forge iron edges: 4 iron, 45 coins (+10 damage for the party)',disabled:o.iron<4||S.coins<45,fn:()=>{o.iron-=4;S.coins-=45;S.weapon=2;talkOdo()}});
  if(S.armor===0)acts.push({label:'Forge copper mail: 5 copper, 25 coins (+25 health for the party)',disabled:o.copper<5||S.coins<25,fn:()=>{o.copper-=5;S.coins-=25;S.armor=1;refreshGear();talkOdo()}});
  else if(S.armor===1)acts.push({label:'Forge iron mail: 4 iron, 50 coins (+50 health for the party)',disabled:o.iron<4||S.coins<50,fn:()=>{o.iron-=4;S.coins-=50;S.armor=2;refreshGear();talkOdo()}});
  if(!S.odoDone)acts.push({label:'Hand over 6 copper ore for stretcher frames (60 coins)',disabled:o.copper<6,fn:()=>{o.copper-=6;S.coins+=60;S.odoDone=true;talkOdo()}});
  acts.push({label:'Leave',primary:true,fn:hidePanel});
  const lines=['Copper comes off the first floor. Iron sits deeper, and the best of it is in the Warden’s own hall. Every floor down, the metal gets better.'];
  if(!S.odoDone)lines.push('Your guild needs stretcher frames. Bring me six copper ore and I’ll pay for it.');
  lines.push(`Your gear: ${['plain','copper','iron'][S.weapon]} edges, ${['plain','copper','iron'][S.armor]} mail.`);
  dialog({role:'Smith',who:'Odo',lines,extra:stash(),actions:acts});
}
function talkIlse(){
  const acts=[{label:'Buy a flask (12 coins, heals 45)',disabled:S.coins<12||S.flasks>=5,fn:()=>{S.coins-=12;S.flasks++;talkIlse()}}];
  if(!S.salts)acts.push({label:'Buy splints and smelling salts (40 coins, stabilize 40% faster)',disabled:S.coins<40,fn:()=>{S.coins-=40;S.salts=true;talkIlse()}});
  acts.push({label:'Leave',primary:true,fn:hidePanel});
  dialog({role:'Apothecary',who:'Sister Ilse',lines:['The bleeding is what kills them, not the blow. Kneel, press, wait. Don’t let anything rush you.','Flasks are for you. Splints and salts are for them. Your mage will always be quicker at it than your knight.'],extra:stash(),actions:acts});
}
function talkTobin(){
  const st=S.roster.wren;let lines;
  if(st==='missing')lines=['My girl Wren squired for Ser Aldous. She followed him into the Barrow.','Please. If she’s alive down there, bring her home.'];
  else if(st==='saved'&&!S.tobinDone){S.tobinDone=true;S.coins+=50;lines=['You brought her back. I don’t have much, but take this. 50 coins.']}
  else if(st==='saved')lines=['She’s already asking when she can go back down. With you, this time.'];
  else lines=['They told me.','Thank you for going in at all.'];
  dialog({role:'Miller',who:'Tobin',lines,actions:[{label:'Leave',primary:true,fn:hidePanel}]});
}
function talkSaved(k){dialog({role:k.title,who:k.name,lines:[k.line],actions:[{label:'Leave',primary:true,fn:hidePanel}]})}
function talkGate(){
  const missing=KNIGHTS.filter(k=>S.roster[k.id]==='missing');
  const lines=[missing.length?`${missing.length} of the Order of the Thorn still missing: ${missing.map(k=>k.name).join(', ')}.`:'Every knight on this floor is accounted for. You can still go down for ore, and the Warden will be waiting.',
    `Party: you as ${CLASSES[S.cls].name} with ${S.size-1} companion${S.size>2?'s':''}. Failure rule: ${RULES[S.rule].name}. Flasks: ${S.flasks}.`,
    'Floors 2 and 3 open once this floor is cleared. They are not part of this test.'];
  dialog({role:'Island 1 · Floor 1 of 3',who:'The Ashen Barrow',lines,actions:[{label:'Descend',primary:true,fn:()=>{hidePanel();enterDungeon()}},{label:'Change the party',fn:()=>muster(false)},{label:'Not yet',fn:hidePanel}]});
}
