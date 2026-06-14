/* =====================================================================
   The Empire end-game
   Own the casino venues, earn passive rake, buy out Vito to become THE HOUSE.
   Loaded as a classic <script> that shares globals with the others.
   Load order is fixed in index.html — keep it.
   ===================================================================== */
"use strict";
/* ===================== EMPIRE (the house) ===================== */
// The capstone for the ultra-wealthy: stop playing the casino and start OWNING it.
const VENUES=[
  {id:"alley", name:"BACK ALLEY",         icon:"🃏", cost:250000,    rake:1200},
  {id:"parlor",name:"THE PARLOR",         icon:"🎴", cost:600000,    rake:3000},
  {id:"lounge",name:"HIGH ROLLER LOUNGE", icon:"🥂", cost:1500000,   rake:7500},
  {id:"pent",  name:"THE PENTHOUSE",      icon:"🌃", cost:4000000,   rake:20000},
  {id:"whale", name:"THE WHALE ROOM",     icon:"🐋", cost:10000000,  rake:50000, moonRake:true},
];
const VENUE_UP=[50,100,200,400,800];          // moon upgrade cost base per venue (×current level)
const BUYOUT_CHIPS=5000000, BUYOUT_MOONS=2000; // the price of Vito's whole operation
function venueIndex(id){ for(let i=0;i<VENUES.length;i++) if(VENUES[i].id===id) return i; return -1; }
function venueLevel(id){ return (META.empire&&META.empire.venues&&META.empire.venues[id])|0; }
function venueRake(v){ const lv=venueLevel(v.id); return lv<=0?0:Math.round(v.rake*(1+0.4*(lv-1))); } // L1×1.0, L2×1.4, L3×1.8
function venueUpCost(i){ return VENUE_UP[i]*Math.max(1,venueLevel(VENUES[i].id)); }                    // 1→2 = base, 2→3 = base×2
function empireRakeChips(){ let t=0; VENUES.forEach(function(v){ t+=venueRake(v); }); return t; }
function ownsAllVenues(){ return VENUES.every(function(v){ return venueLevel(v.id)>0; }); }
function empireUnlocked(){ return rankIndex(worth())>=6; }   // LEGEND or above
function empireTick(){   // the house's cut — passive income each match, from endGame
  if(!META.empire) return;
  const rake=empireRakeChips(); if(rake>0){ META.chips+=rake; S.empireRake=rake; }
  const wl=venueLevel("whale");
  if(wl>0){ META.empire.matches=(META.empire.matches||0)+1; if(META.empire.matches%5===0){ META.moons+=wl; S.empireMoons=wl; } }
}
function buyVenue(id){ ac(); if(!empireUnlocked()){sfx.deny();return;} const i=venueIndex(id); if(i<0)return; const v=VENUES[i];
  if(venueLevel(id)>0){sfx.deny();return;} if(META.chips<v.cost){sfx.deny();return;}
  META.chips-=v.cost; META.empire.venues[id]=1; sfx.cash(); sfx.unlock(); saveProfile(); renderEmpire(); bumpChips(); }
function upgradeVenue(id){ ac(); const i=venueIndex(id); if(i<0)return; const lv=venueLevel(id);
  if(lv<1||lv>=3){sfx.deny();return;} const cost=venueUpCost(i); if(META.moons<cost){sfx.deny();return;}
  META.moons-=cost; META.empire.venues[id]=lv+1; sfx.moon(); sfx.unlock(); saveProfile(); renderEmpire(); bumpMoons(); }
function buyoutVito(){ ac(); if(houseOwned()||!ownsAllVenues()){sfx.deny();return;}
  if(META.chips<BUYOUT_CHIPS||META.moons<BUYOUT_MOONS){sfx.deny();return;}
  META.chips-=BUYOUT_CHIPS; META.moons-=BUYOUT_MOONS; META.empire.house=true; META.debt=0; META.debtAge=0;
  sfx.win(); sfx.moon(); screenEl.classList.add("flash"); setTimeout(()=>screenEl.classList.remove("flash"),420);
  saveProfile(); renderEmpire(); bumpChips(); bumpMoons(); }
function renderEmpire(){
  $("#empChips").textContent=fmt(META.chips); $("#empMoons").textContent=fmt(META.moons);
  const lock=$("#empLock"), body=$("#empBody");
  if(!empireUnlocked()){
    lock.hidden=false; body.hidden=true;
    const w=worth(), need=RANKS[6].min, pct=Math.min(100,Math.round(w/need*100));
    lock.innerHTML='<div class="emplockt">🔒 THE EMPIRE</div><div class="emplockd">Reach 👑 <b>LEGEND</b> — '+fmt(need)+' net worth — to buy your way into ownership and start running the joint.</div><div class="emplockbar"><i style="width:'+pct+'%"></i></div><div class="emplockd">'+fmt(w)+' / '+fmt(need)+' ('+pct+'%)</div>';
    show("empire"); return;
  }
  lock.hidden=true; body.hidden=false;
  const st=$("#empStatus");
  if(houseOwned()){ st.className="empstatus house"; st.innerHTML='👑 <b>YOU OWN THE HOUSE.</b> Vito answers to you now — no vig, no skim, and +10% on every payout.'; }
  else if(ownsAllVenues()){ st.className="empstatus ready"; st.innerHTML='🎩 You own every table on the strip. One move left: <b>buy out Vito.</b>'; }
  else { st.className="empstatus"; st.innerHTML='🏛️ Buy the tables you used to grind. Each one pays you a cut of the action — every match, forever.'; }
  $("#empIncome").innerHTML='💰 Passive income: <b>'+fmt(empireRakeChips())+'</b> 🪙/match'+(venueLevel("whale")>0?(' · +'+venueLevel("whale")+' 🌙 / 5 matches'):'');
  const vl=$("#empVenues"); vl.innerHTML="";
  VENUES.forEach(function(v,i){ const lv=venueLevel(v.id), owned=lv>0, rake=venueRake(v), nextRake=owned&&lv<3?Math.round(v.rake*(1+0.4*lv)):0;
    const card=document.createElement("div"); card.className="venue"+(owned?" owned":"");
    card.innerHTML='<div class="vtop"><span class="vname">'+v.icon+' '+v.name+'</span>'+(owned?'<span class="vlv">LVL '+lv+'/3</span>':'')+'</div>'
      +'<div class="vsub">'+(owned?('rake <b>'+fmt(rake)+'</b> 🪙/match'+(v.moonRake?(' · +'+lv+' 🌙/5m'):'')):('buy-in '+fmt(v.cost)+' 🪙 · rake '+fmt(v.rake)+' 🪙/match'))+'</div>';
    const btns=document.createElement("div"); btns.className="vbtns";
    if(!owned){ const b=document.createElement("button"); b.className="vbtn buy"; b.innerHTML="BUY · "+fmt(v.cost)+" 🪙"; b.disabled=META.chips<v.cost; b.addEventListener("click",function(){ buyVenue(v.id); }); btns.appendChild(b); }
    else if(lv<3){ const c=venueUpCost(i); const b=document.createElement("button"); b.className="vbtn up"; b.innerHTML="UPGRADE · "+c+" 🌙 → "+fmt(nextRake)+"/m"; b.disabled=META.moons<c; b.addEventListener("click",function(){ upgradeVenue(v.id); }); btns.appendChild(b); }
    else { const s=document.createElement("span"); s.className="vmax"; s.textContent="★ MAXED"; btns.appendChild(s); }
    card.appendChild(btns); vl.appendChild(card);
  });
  const bo=$("#empBuyout");
  if(houseOwned()){ bo.className="buyout done"; bo.innerHTML='<div class="bot">👑 THE HOUSE</div><div class="bod">You bought Vito out. The casino — and everyone in it — works for you now.</div>'; }
  else { const all=ownsAllVenues(), can=all&&META.chips>=BUYOUT_CHIPS&&META.moons>=BUYOUT_MOONS;
    bo.className="buyout"+(all?"":" locked");
    bo.innerHTML='<div class="bot">🦈 BUY OUT VITO</div><div class="bod">'+(all?('Take the whole operation for <b>'+fmt(BUYOUT_CHIPS)+' 🪙</b> + <b>'+fmt(BUYOUT_MOONS)+' 🌙</b>. Wipes your debt and ends his cut forever.'):'Own all five venues first, then the operation is yours to take.')+'</div>';
    if(all){ const b=document.createElement("button"); b.className="vbtn takeover"; b.innerHTML="BUY OUT · "+fmt(BUYOUT_CHIPS)+" 🪙 + "+fmt(BUYOUT_MOONS)+" 🌙"; b.disabled=!can; b.addEventListener("click",buyoutVito); bo.appendChild(b); }
  }
  renderIdleSection();
  show("empire");
}
