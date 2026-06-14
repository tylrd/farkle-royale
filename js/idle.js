/* =====================================================================
   The Syndicate idle engine
   Real-time generators, upgrades, offline earnings, and the Restructure→Empire Stars prestige loop.
   Loaded as a classic <script> that shares globals with the others.
   Load order is fixed in index.html — keep it.
   ===================================================================== */
"use strict";
/* ===================== IDLE (the syndicate) ===================== */
// Once you OWN THE HOUSE, the empire runs itself in real time: geometric-cost generators,
// ×2 upgrades, offline earnings, and a Restructure→Empire Stars prestige loop. Yes — that kind of game now.
const GENS=[
  {id:"slots", name:"Slot Floor",        icon:"🎰", base:60,          rate:0.5},
  {id:"cards", name:"Card Room",         icon:"🃏", base:1100,        rate:4},
  {id:"bar",   name:"Speakeasy",         icon:"🍸", base:13000,       rate:34},
  {id:"hotel", name:"Casino Hotel",      icon:"🏨", base:160000,      rate:280},
  {id:"pvault",name:"Private Vault",     icon:"🏦", base:2200000,     rate:2400},
  {id:"yacht", name:"Yacht Club",        icon:"🛥️", base:32000000,     rate:22000},
  {id:"off",   name:"Offshore Holding",  icon:"🏝️", base:520000000,    rate:210000},
  {id:"crypto",name:"Crypto Laundromat", icon:"🪙", base:8500000000,   rate:2200000},
];
const GEN_GROWTH=1.15, UP_THRESH=[10,25,50,100], STAR_K=1e6, OFFLINE_CAP=8*3600;
let idleOffline=0, idleOfflineSecs=0, restructArm=false, restructT=null, idleSaveCt=0, idleRateEl=null;
function idleState(){ if(!META.idle||typeof META.idle!=="object") META.idle={gens:{},ups:{},stars:0,starsEarned:0,life:0,last:Date.now()}; if(META.idle.starsEarned==null)META.idle.starsEarned=META.idle.stars||0; return META.idle; }
function genById(id){ return GENS.filter(function(g){return g.id===id;})[0]; }
function genOwned(id){ const I=idleState(); return (I.gens[id])|0; }
function genCost(g){ return Math.ceil(g.base*Math.pow(GEN_GROWTH, genOwned(g.id))); }
function genUpMult(id){ const I=idleState(); let m=1; UP_THRESH.forEach(function(t){ if(I.ups[id+":"+t]) m*=2; }); return m; }
function nextGenUp(g){ const o=genOwned(g.id), I=idleState(); for(let i=0;i<UP_THRESH.length;i++){ const t=UP_THRESH[i]; if(o>=t && !I.ups[g.id+":"+t]) return {thr:t, cost:Math.ceil(g.base*t*8)}; } return null; }
function starMult(){ return 1+0.02*(idleState().starsEarned||0); }   // multiplier = lifetime stars EARNED (spending doesn't lower it)
function genRate(g){ return genOwned(g.id)*g.rate*genUpMult(g.id); }   // chips/sec before stars
function idleRate(){ if(!houseOwned())return 0; let r=0; GENS.forEach(function(g){ r+=genRate(g); }); return r*starMult(); }
function starsTotal(){ return Math.floor(Math.sqrt((idleState().life||0)/STAR_K)); }
function starsPending(){ return Math.max(0, starsTotal()-(idleState().starsEarned||0)); }
function genRevealed(idx){ return idx===0 || genOwned(GENS[idx].id)>0 || genOwned(GENS[idx-1].id)>0; }
function buyGen(id,bulk){ ac(); if(!houseOwned()){sfx.deny();return;} const g=genById(id); if(!g)return; const I=idleState();
  let n=bulk||1, bought=0; for(let i=0;i<n;i++){ const c=genCost(g); if(META.chips<c)break; META.chips-=c; I.gens[id]=genOwned(id)+1; bought++; }
  if(bought>0){ sfx.chip(); saveProfile(); renderEmpire(); bumpChips(); } else sfx.deny(); }
function buyGenUp(id,thr){ ac(); const I=idleState(); const key=id+":"+thr; if(I.ups[key])return; if(genOwned(id)<thr){sfx.deny();return;}
  const g=genById(id), cost=Math.ceil(g.base*thr*8); if(META.chips<cost){sfx.deny();return;}
  META.chips-=cost; I.ups[key]=true; sfx.unlock(); saveProfile(); renderEmpire(); bumpChips(); }
function restructure(){ ac(); if(starsPending()<=0){sfx.deny();return;}
  if(!restructArm){ restructArm=true; if(restructT)clearTimeout(restructT); restructT=setTimeout(function(){restructArm=false; if(curView==="empire")renderEmpire();},4500); renderEmpire(); return; }
  restructArm=false; if(restructT)clearTimeout(restructT);
  const I=idleState(); const total=starsTotal(), gain=total-(I.starsEarned||0);
  I.starsEarned=total; I.stars=(I.stars||0)+gain; I.gens={}; I.ups={}; META.chips=500;
  sfx.win(); sfx.moon(); screenEl.classList.add("flash"); setTimeout(()=>screenEl.classList.remove("flash"),420);
  saveProfile(); renderEmpire(); renderWalletEls(); bumpChips(); }
function buyMetaUp(id){ ac(); const u=metaUpById(id); if(!u)return; const cost=metaNextCost(u); if(cost==null){sfx.deny();return;}
  const I=idleState(); if((I.stars||0)<cost){sfx.deny();return;}
  I.stars-=cost; META.meta[id]=metaLvl(id)+1; sfx.unlock(); sfx.moon(); saveProfile(); renderEmpire(); }
function idleAccrue(dt){ const r=idleRate(); if(r<=0||dt<=0)return 0; const gain=r*dt; META.chips+=gain; idleState().life+=gain; return gain; }
function idleTick(){ const I=idleState(); const now=Date.now(); let dt=(now-(I.last||now))/1000; I.last=now; if(dt<0)dt=0; if(dt>OFFLINE_CAP)dt=OFFLINE_CAP;
  const g=idleAccrue(dt);
  if(g>0){ const c=$("#chips"); if(c)c.textContent=fmtC(META.chips); if(curView==="empire")updateIdleLive(); } }
function updateIdleLive(){ if(idleRateEl) idleRateEl.textContent=fmtBig(idleRate()); const ec=$("#empChips"); if(ec)ec.textContent=fmtC(META.chips); }
function startIdle(){
  const I=idleState(); const now=Date.now(); let dt=(now-(I.last||now))/1000; if(dt<0)dt=0;
  if(houseOwned()&&dt>20){ idleOfflineSecs=Math.round(Math.min(dt,OFFLINE_CAP)); idleOffline=Math.round(idleAccrue(Math.min(dt,OFFLINE_CAP))); }
  I.last=now; saveProfile();
  setInterval(function(){ idleTick(); if(++idleSaveCt>=10){ idleSaveCt=0; saveProfile(); } },1000);
  document.addEventListener("visibilitychange",function(){ if(!document.hidden) idleTick(); });
}
function renderIdleSection(){
  const host=$("#empIdle"); if(!host)return;
  if(!houseOwned()){ host.hidden=true; host.innerHTML=""; return; }
  host.hidden=false; host.innerHTML="";
  const I=idleState();
  const hdr=document.createElement("div"); hdr.className="idlehdr"; hdr.innerHTML='🏦 THE SYNDICATE<small>your empire runs itself — even while you sleep</small>'; host.appendChild(hdr);
  if(idleOffline>0){ const off=document.createElement("div"); off.className="idleoff";
    off.innerHTML='💤 While you were away ('+fmtClock(idleOfflineSecs*1000)+'): <b>+'+fmtBig(idleOffline)+' 🪙</b>'; host.appendChild(off); idleOffline=0; }
  const rate=document.createElement("div"); rate.className="idlerate";
  idleRateEl=document.createElement("b"); idleRateEl.textContent=fmtBig(idleRate());
  const star=document.createElement("span"); star.className="istar"; star.textContent="★ "+fmt(I.starsEarned||0)+" earned (+"+Math.round((starMult()-1)*100)+"%)";
  rate.appendChild(document.createTextNode("+")); rate.appendChild(idleRateEl); rate.appendChild(document.createTextNode(" 🪙/sec  ·  ")); rate.appendChild(star);
  host.appendChild(rate);
  const gl=document.createElement("div"); gl.id="idleGens";
  GENS.forEach(function(g,idx){ if(!genRevealed(idx)) return;
    const owned=genOwned(g.id), cost=genCost(g), up=nextGenUp(g);
    const card=document.createElement("div"); card.className="gcard"+(owned>0?" own":"");
    card.innerHTML='<div class="gtop"><span class="gname">'+g.icon+' '+g.name+'</span><span class="gown">'+fmt(owned)+'</span></div>'
      +'<div class="gsub">'+fmtBig(genRate(g)*starMult())+' 🪙/s'+(genUpMult(g.id)>1?(' · ⚡×'+genUpMult(g.id)):'')+'</div>';
    const row=document.createElement("div"); row.className="grow";
    const b1=document.createElement("button"); b1.className="gbtn buy"; b1.innerHTML="BUY · "+fmtBig(cost)+" 🪙"; b1.disabled=META.chips<cost; b1.addEventListener("click",function(){ buyGen(g.id,1); });
    const b10=document.createElement("button"); b10.className="gbtn ten"; b10.textContent="×10"; b10.disabled=META.chips<cost; b10.addEventListener("click",function(){ buyGen(g.id,10); });
    row.appendChild(b1); row.appendChild(b10); card.appendChild(row);
    if(up){ const ub=document.createElement("button"); ub.className="gbtn up"; ub.innerHTML="⚡ ×2 at "+up.thr+" · "+fmtBig(up.cost)+" 🪙"; ub.disabled=META.chips<up.cost; ub.addEventListener("click",function(){ buyGenUp(g.id,up.thr); }); card.appendChild(ub); }
    gl.appendChild(card);
  });
  host.appendChild(gl);
  // ★ STAR EXCHANGE — spend stars on permanent buffs to the core Farkle game
  const I2=idleState();
  const sh=document.createElement("div"); sh.className="starshop";
  const shh=document.createElement("div"); shh.className="sshdr"; shh.innerHTML='★ STAR EXCHANGE<small>spend stars on permanent edges at the table — '+fmt(I2.stars||0)+' ★ to spend</small>'; sh.appendChild(shh);
  STAR_UPGRADES.forEach(function(u){ const lv=metaLvl(u.id), cost=metaNextCost(u), maxed=cost==null;
    const row=document.createElement("div"); row.className="sucard"+(lv>0?" own":"");
    row.innerHTML='<div class="sutop"><span class="suname">'+u.icon+' '+u.name+'</span><span class="sulv">'+(u.max>1?("Lv "+lv+"/"+u.max):(lv>0?"OWNED":""))+'</span></div><div class="susub">'+u.desc+'</div>';
    const b=document.createElement("button"); b.className="gbtn star";
    if(maxed){ b.textContent="★ MAXED"; b.disabled=true; }
    else { b.textContent="BUY · ★ "+cost; b.disabled=(I2.stars||0)<cost; b.addEventListener("click",function(){ buyMetaUp(u.id); }); }
    row.appendChild(b); sh.appendChild(row);
  });
  host.appendChild(sh);
  // prestige
  const pend=starsPending(), pr=document.createElement("div"); pr.className="restruct"+(pend>0?" ready":"");
  pr.innerHTML='<div class="rst">♻️ RESTRUCTURE</div><div class="rsd">Cash out the operation for <b>★ Empire Stars</b> (+2% idle income each, forever). Wipes your generators and chips down to a seed — your stars, moons, venues & relics stay.</div>'
    +'<div class="rsd">Pending: <b>★ '+fmt(pend)+'</b> · lifetime idle '+fmtBig(idleState().life||0)+' 🪙</div>';
  const rb=document.createElement("button"); rb.className="gbtn restr"; rb.disabled=pend<=0; rb.textContent=restructArm?("⚠ TAP AGAIN — banks ★ "+fmt(pend)+", resets chips"):("RESTRUCTURE → ★ "+fmt(pend)); rb.addEventListener("click",restructure); pr.appendChild(rb);
  host.appendChild(pr);
}
