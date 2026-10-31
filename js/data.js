'use strict';
// Classes, failure rules, wounded knights, enemy types and the saved game state.
/* ---------- data ---------- */
const CLASSES={
  knight:{name:'Knight',role:'Melee',hp:130,dmg:18,cd:.42,st:14,skill:'Shield Bash',skillCd:7,stab:1,range:1,
    desc:'Sweeps the three tiles in front. Shield Bash knocks enemies back and can interrupt the boss mid-attack.',
    look:{body:'#8e9fb3',tabard:'#e8dfca',trim:'#b3362e',helm:'#c6cdd6',cape:'#7a2a24',head:'helm',weapon:'sword',shield:'#e8dfca'}},
  ranger:{name:'Ranger',role:'Ranged',hp:95,dmg:14,cd:.42,st:10,skill:'Volley',skillCd:6,stab:1,range:7,
    desc:'Shoots arrows down a grid line. Volley fires three lines at once. Good for mining ore from a distance.',
    look:{body:'#5d6b45',tabard:'#e8dfca',trim:'#b3362e',helm:'#47563a',cape:'#3e4a2e',head:'hood',weapon:'bow'}},
  mage:{name:'Mage',role:'Magic',hp:85,dmg:15,cd:.75,st:16,skill:'Mend',skillCd:9,stab:1.6,range:5,
    desc:'Bolts burst in a plus shape. Mend heals nearby allies and steadies the wounded. Stabilizes fastest.',
    look:{body:'#e8dfca',tabard:'#3b5a8a',trim:'#d2ab52',helm:'#e8dfca',cape:'#2e466e',head:'hood',weapon:'staff',robe:true}},
};
const RULES={
  mercy:{name:'Mercy',desc:'The guild drags you out. You keep your pack, and the wounded stay where they fell.'},
  standard:{name:'Standard',desc:'You lose everything in your pack. The wounded stay where they fell.'},
  grim:{name:'Grim',desc:'You lose your pack, and anyone you stabilized or were carrying dies.'},
};
const KNIGHTS=[
  {id:'aldous',name:'Ser Aldous',title:'Knight of the Thorn',x:29,y:15,home:[17,10],look:{body:'#9aa3ad',tabard:'#4a2228',trim:'#9a8a6a',helm:'#9aa3ad',head:'helm',weapon:'sword'},
    line:'I held the Warden off long enough for Wren to run. She didn’t run. Neither did you, it seems.'},
  {id:'wren',name:'Wren',title:'Squire',x:19,y:25,home:[16,17],scale:.86,look:{body:'#a58a66',tabard:'#4a2228',trim:'#9a8a6a',head:'hair',hair:'#c4703a',skin:'#e0b48c'},
    line:'I want to join the guild. Don’t tell my father yet.'},
  {id:'hale',name:'Brother Hale',title:'Chaplain',x:15,y:11,home:[18,10],look:{body:'#6b5a48',robe:true,tabard:'#4a2228',trim:'#c9b98a',head:'hair',hair:'#5a5550',skin:'#d2a47c',beard:'#8a8580'},
    line:'I have buried a lot of knights. You are the first I have seen go in to bring them back.'},
];
const ETYPES={
  skeleton:{hp:38,dmg:12,wind:.55,move:.34,look:{body:'#d6cfba',head:'skull',weapon:'sword',ribs:true}},
  ghoul:{hp:24,dmg:8,wind:.36,move:.2,look:{body:'#7f8f6a',head:'ghoul',weapon:'claws',hunch:true}},
  archer:{hp:26,dmg:11,wind:.8,move:.42,ranged:6,look:{body:'#cfc7b0',head:'skull',weapon:'bow',ribs:true,cape:'#3a3530'}},
};
const RING=['#e6bd4e','#6fa8dc','#8fc46a','#b48ad8'];
const ALLY_NAMES=['Bram','Sela','Tomas'];
const FLOOR={g:['#4a5d3a','#465937','#4f6240'],c:['#6e6b65','#68655f','#75726b'],d:['#6b5840','#66543c','#715d45'],s:['#35323b','#322f38','#38353e'],b:['#2f2a33','#2c2730','#322d36']};

const S={started:false,cls:'knight',size:3,rule:'standard',coins:40,ore:{copper:0,iron:0},flasks:2,weapon:0,armor:0,salts:false,
  roster:{aldous:'missing',wren:'missing',hale:'missing'},odoDone:false,tobinDone:false,mainDone:false,bossKills:0,runs:0};
const dmgBonus=()=>[0,5,10][S.weapon];
const hpBonus=()=>[0,25,50][S.armor];
const stabTime=u=>2.6/CLASSES[u.cls].stab*(S.salts?.6:1);
