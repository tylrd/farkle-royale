/* =====================================================================
   Loot boxes
   Gacha boxes that grant single-use, per-turn temp relics.
   Loaded as a classic <script> that shares globals with the others.
   Load order is fixed in index.html — keep it.
   ===================================================================== */
"use strict";
/* ===================== LOOT (boxes) ===================== */
// Gacha boxes (a currency sink) that grant TEMP relics — armed for one turn, then consumed. Not permanent.
// CHARMS — single-use, armed one-per-turn. Data-driven: each has a `kind` the match engine reads.
// kinds: openProof, turnProof, bankMult(mag), bankAdd(mag), farkleSave(frac), farkleNegate,
//        reroll(count), hotBonus(mag), chipsOnBank(frac), headStart(mag).
const TEMPS=[
  // ---- common ----
  {id:"lucky",    name:"LUCKY CHARM",   icon:"🍀", rarity:"common",   kind:"openProof",  desc:"opening roll can't farkle"},
  {id:"clover",   name:"FOUR-LEAF",     icon:"☘️", rarity:"common",   kind:"openProof",  desc:"opening roll can't farkle"},
  {id:"reroll",   name:"REROLL TOKEN",  icon:"🎲", rarity:"common",   kind:"reroll",     mag:1, desc:"reroll your dice once"},
  {id:"insurance",name:"SAFETY NET",    icon:"🛡️", rarity:"common",   kind:"farkleSave", mag:0.5,  desc:"keep half your points if you farkle"},
  {id:"cushion",  name:"CUSHION",       icon:"🧷", rarity:"common",   kind:"farkleSave", mag:0.25, desc:"keep a quarter of your points on a farkle"},
  {id:"doubler",  name:"DOUBLER",       icon:"✖️", rarity:"common",   kind:"bankMult",   mag:1.5,  desc:"bank ×1.5 this turn"},
  {id:"golden",   name:"GOLDEN TURN",   icon:"✨", rarity:"common",   kind:"bankMult",   mag:1.25, desc:"bank ×1.25 this turn"},
  {id:"tip",      name:"DEALER'S TIP",  icon:"🪙", rarity:"common",   kind:"bankAdd",    mag:150,  desc:"+150 points when you bank"},
  {id:"ember",    name:"EMBER",         icon:"🔥", rarity:"common",   kind:"hotBonus",   mag:250,  desc:"each Hot Dice adds +250 this turn"},
  {id:"headstart",name:"HEAD START",    icon:"🏁", rarity:"common",   kind:"headStart",  mag:250,  desc:"begin the turn with +250 banked"},
  {id:"toll",     name:"TOLL BOOTH",    icon:"💰", rarity:"common",   kind:"chipsOnBank",mag:0.1,  desc:"banking also pays chips = 10% of points"},
  // ---- uncommon ----
  {id:"charmed",  name:"CHARMED",       icon:"💞", rarity:"uncommon", kind:"bankMult",   mag:1.75, desc:"bank ×1.75 this turn"},
  {id:"bonus",    name:"BONUS CHIP",    icon:"🎁", rarity:"uncommon", kind:"bankAdd",    mag:300,  desc:"+300 points when you bank"},
  {id:"netting",  name:"SAFETY NETTING",icon:"🪢", rarity:"uncommon", kind:"farkleSave", mag:0.75, desc:"keep three-quarters of your points on a farkle"},
  {id:"doubleroll",name:"DOUBLE REROLL",icon:"🎯", rarity:"uncommon", kind:"reroll",     mag:2,    desc:"reroll your dice up to twice"},
  {id:"inferno",  name:"INFERNO",       icon:"🌋", rarity:"uncommon", kind:"hotBonus",   mag:500,  desc:"each Hot Dice adds +500 this turn"},
  {id:"frontrun", name:"FRONT RUNNER",  icon:"🚀", rarity:"uncommon", kind:"headStart",  mag:500,  desc:"begin the turn with +500 banked"},
  {id:"tribute",  name:"TRIBUTE",       icon:"💵", rarity:"uncommon", kind:"chipsOnBank",mag:0.25, desc:"banking also pays chips = 25% of points"},
  {id:"phoenixc", name:"PHOENIX CHARM", icon:"🪶", rarity:"uncommon", kind:"farkleNegate",      desc:"your first farkle this turn is rerolled free"},
  {id:"kicker",   name:"KICKER",        icon:"👢", rarity:"uncommon", kind:"bankAdd",    mag:500,  desc:"+500 points when you bank"},
  // ---- rare ----
  {id:"tripler",  name:"TRIPLER",       icon:"3️⃣", rarity:"rare",     kind:"bankMult",   mag:2.0,  desc:"bank ×2 this turn"},
  {id:"windfall", name:"WINDFALL",      icon:"🍃", rarity:"rare",     kind:"bankAdd",    mag:1000, desc:"+1000 points when you bank"},
  {id:"tripleroll",name:"TRIPLE REROLL",icon:"🎰", rarity:"rare",     kind:"reroll",     mag:3,    desc:"reroll your dice up to three times"},
  {id:"supernova",name:"SUPERNOVA",     icon:"💥", rarity:"rare",     kind:"hotBonus",   mag:1000, desc:"each Hot Dice adds +1000 this turn"},
  {id:"pole",     name:"POLE POSITION", icon:"🥇", rarity:"rare",     kind:"headStart",  mag:1000, desc:"begin the turn with +1000 banked"},
  {id:"skim",     name:"SKIMMER",       icon:"🏦", rarity:"rare",     kind:"chipsOnBank",mag:0.5,  desc:"banking also pays chips = 50% of points"},
  {id:"highroll", name:"HIGH ROLLER",   icon:"💎", rarity:"rare",     kind:"bankMult",   mag:2.5,  desc:"bank ×2.5 this turn"},
  // ---- epic ----
  {id:"fullcover",name:"FULL COVERAGE", icon:"🦺", rarity:"epic",     kind:"farkleSave", mag:1.0,  desc:"keep ALL your points if you farkle"},
  {id:"blessed",  name:"BLESSED",       icon:"😇", rarity:"epic",     kind:"turnProof",  desc:"NO roll can farkle for the whole turn"},
  {id:"jackpotc", name:"JACKPOT CHARM", icon:"🎉", rarity:"epic",     kind:"bankMult",   mag:3.0,  desc:"bank ×3 this turn"},
  {id:"moonshot", name:"MOONSHOT",      icon:"🌙", rarity:"epic",     kind:"bankMult",   mag:4.0,  desc:"bank ×4 this turn"},
  {id:"midas",    name:"MIDAS TURN",    icon:"👑", rarity:"epic",     kind:"chipsOnBank",mag:1.0,  desc:"banking also pays chips = 100% of points"},
];
const RARITY_COLOR={common:"#9aa6bd",uncommon:"#5fd38a",rare:"#5fb8ff",epic:"#c9a3ff"};
function tempById(id){ return TEMPS.filter(function(t){return t.id===id;})[0]; }
function armedCharm(){ return (typeof S!=="undefined"&&S&&S.armed)?tempById(S.armed):null; }
function tempsByRarity(r){ return TEMPS.filter(function(t){return t.rarity===r;}); }
function randTemp(r){ const pool=tempsByRarity(r); return pool[Math.random()*pool.length|0]; }
const BOXES=[
  {id:"scrap",name:"SCRAP CRATE",icon:"📦",cur:"chips",cost:800, blurb:"chips, shards & common charms",
   table:[ {w:34,kind:"chips",lo:150,hi:450}, {w:18,kind:"shards",lo:100,hi:300}, {w:30,kind:"temp",rarity:"common"}, {w:15,kind:"temp",rarity:"uncommon"}, {w:3,kind:"chips",lo:2500,hi:5000} ]},
  {id:"vault",name:"VAULT BOX", icon:"💎",cur:"moons",cost:3, blurb:"rare & epic charms, moons & relic pulls",
   table:[ {w:26,kind:"temp",rarity:"uncommon",n:2}, {w:24,kind:"temp",rarity:"rare"}, {w:8,kind:"temp",rarity:"epic"}, {w:16,kind:"moons",lo:2,hi:4}, {w:12,kind:"chips",lo:4000,hi:10000}, {w:10,kind:"shards",lo:400,hi:1000}, {w:4,kind:"relic"} ]},
];
function boxById(id){ return BOXES.filter(function(b){return b.id===id;})[0]; }
function rollTable(t){ let tot=0; t.forEach(function(e){tot+=e.w;}); let r=Math.random()*tot; for(let i=0;i<t.length;i++){ r-=t[i].w; if(r<0) return t[i]; } return t[t.length-1]; }
function rnd(lo,hi){ return Math.round(lo+Math.random()*(hi-lo)); }
function grantReward(e){
  if(e.kind==="chips"){ const a=rnd(e.lo,e.hi); META.chips+=a; return {icon:"🪙",text:fmt(a)+" chips"}; }
  if(e.kind==="shards"){ const a=rnd(e.lo,e.hi); META.shards+=a; return {icon:"✦",text:fmt(a)+" shards"}; }
  if(e.kind==="moons"){ const a=rnd(e.lo,e.hi); META.moons+=a; return {icon:"🌙",text:a+" moon"+(a>1?"s":"")}; }
  if(e.kind==="temp"){ const t=randTemp(e.rarity), n=e.n||1; META.temp[t.id]=(META.temp[t.id]|0)+n; return {icon:t.icon,text:n+"× "+t.name}; }
  if(e.kind==="relic"){ const un=RELICS.filter(function(r){return META.relics.indexOf(r.id)<0;});
    if(un.length){ const r=un[Math.random()*un.length|0]; META.relics.push(r.id); return {icon:r.icon,text:"RELIC: "+r.name+"!"}; }
    META.moons+=5; return {icon:"🌙",text:"5 moons (relic dupe)"}; }
  return {icon:"🪙",text:"nothing"};
}
let lootReveal=null;
function openBox(id,buy){ ac(); const b=boxById(id); if(!b)return;
  if(buy){ if(b.cur==="chips"){ if(META.chips<b.cost){sfx.deny();return;} META.chips-=b.cost; }
           else { if(META.moons<b.cost){sfx.deny();return;} META.moons-=b.cost; } }
  else { if((META.boxes[id]|0)<=0){sfx.deny();return;} META.boxes[id]--; }
  const e=rollTable(b.table), rew=grantReward(e);
  lootReveal={box:b.icon, icon:rew.icon, text:rew.text};
  sfx.unlock(); if(e.kind==="relic"||e.kind==="moons")sfx.moon(); else sfx.cash();
  saveProfile(); renderLoot(); bumpChips(); bumpMoons();
}
function renderLoot(){
  $("#lootChips").textContent=fmt(META.chips); $("#lootMoons").textContent=fmt(META.moons);
  const rv=$("#lootReveal");
  if(rv){ if(lootReveal){ rv.className="lootreveal show"; rv.innerHTML='<div class="lrbox">'+lootReveal.box+'</div><div class="lrwon">'+lootReveal.icon+' '+lootReveal.text+'</div>'; }
    else { rv.className="lootreveal"; rv.innerHTML=""; } }
  const wrap=$("#lootBoxes"); wrap.innerHTML="";
  BOXES.forEach(function(b){ const owned=META.boxes[b.id]|0, canBuy=(b.cur==="chips"?META.chips>=b.cost:META.moons>=b.cost);
    const card=document.createElement("div"); card.className="boxcard";
    card.innerHTML='<div class="bxtop"><span class="bxname">'+b.icon+' '+b.name+'</span></div><div class="bxblurb">'+b.blurb+'</div>';
    const btns=document.createElement("div"); btns.className="bxbtns";
    const buy=document.createElement("button"); buy.className="bxbtn buy"; buy.innerHTML="BUY · "+fmt(b.cost)+" "+(b.cur==="chips"?"🪙":"🌙"); buy.disabled=!canBuy; buy.addEventListener("click",function(){ openBox(b.id,true); });
    btns.appendChild(buy);
    if(owned>0){ const op=document.createElement("button"); op.className="bxbtn open"; op.innerHTML="OPEN FREE ×"+owned; op.addEventListener("click",function(){ openBox(b.id,false); }); btns.appendChild(op); }
    card.appendChild(btns); wrap.appendChild(card);
  });
  const inv=$("#lootInv"); inv.innerHTML="";
  ["common","uncommon","rare","epic"].forEach(function(rar){
    const list=tempsByRarity(rar); const owned=list.filter(function(t){return (META.temp[t.id]|0)>0;}).length;
    const hd=document.createElement("div"); hd.className="invgrp"; hd.style.color=RARITY_COLOR[rar];
    hd.textContent=rar.toUpperCase()+" · "+owned+"/"+list.length; inv.appendChild(hd);
    list.forEach(function(t){ const n=META.temp[t.id]|0;
      const row=document.createElement("div"); row.className="invrow"+(n>0?"":" zero");
      row.innerHTML='<span class="ivn" style="color:'+(n>0?RARITY_COLOR[rar]:"#5a6478")+'">'+t.icon+' '+t.name+'</span><span class="ivd">'+t.desc+'</span><span class="ivc">×'+n+'</span>'; inv.appendChild(row); });
  });
  show("loot");
}
