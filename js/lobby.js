/* =====================================================================
   Lobby + betting screens
   Wallet/rank rendering, the table list, and the ante/side-bet screen.
   Loaded as a classic <script> that shares globals with the others.
   Load order is fixed in index.html — keep it.
   ===================================================================== */
"use strict";
/* ===================== LOBBY ===================== */
let chipsBumpT=null;
function renderWalletEls(){
  const c=$("#chips"); c.textContent=fmtC(META.chips); $("#shopChips").textContent=fmtC(META.chips);
  $("#moons").textContent=fmt(META.moons); const sm=$("#shopMoons"); if(sm)sm.textContent=fmt(META.moons);
  const lockedM=lockedMoons();
  ["moonsLocked","shopMoonsLocked"].forEach(function(id){ const e=$("#"+id); if(e){ e.textContent=" 🔒"+fmt(lockedM); e.hidden=lockedM<1; } });
  const w=worth(), ri=rankIndex(w), cur=RANKS[ri], nx=nextRank(w);
  if(houseOwned()){ $("#rankName").textContent="👑 THE HOUSE"; $("#rankNext").textContent="you own the casino"; $("#rankFill").style.width="100%"; }
  else { $("#rankName").textContent=cur.icon+" "+cur.name;
    if(nx){const span=nx.min-cur.min, prog=Math.min(1,Math.max(0,(w-cur.min)/span));
      $("#rankNext").textContent="next: "+nx.name+" ("+fmt(nx.min-w)+")";
      $("#rankFill").style.width=(prog*100)+"%";}
    else{$("#rankNext").textContent="MAX RANK"; $("#rankFill").style.width="100%";} }
  { const eb=$("#toEmpire"); if(eb){ const sm=eb.querySelector("small");
      if(houseOwned()){ eb.classList.add("owned"); if(sm)sm.textContent="👑 the casino is yours"; }
      else if(empireUnlocked()){ eb.classList.remove("owned"); if(sm)sm.textContent=ownsAllVenues()?"buy out Vito":"own the house"; }
      else { eb.classList.remove("owned"); if(sm)sm.textContent="🔒 reach LEGEND"; } } }
}
function bumpChips(){const c=$("#chips");c.classList.remove("bump");void c.offsetWidth;c.classList.add("bump");}
function bumpMoons(){const c=$("#moons");if(!c)return;c.classList.remove("bump");void c.offsetWidth;c.classList.add("bump");}
function renderLobby(){
  renderWalletEls();
  $("#jackAmt").textContent=fmt(META.jackpot);
  const jc=$("#jackChg"); if(jc){ const pct=(META.jackpotPrev>0)?((META.jackpot-META.jackpotPrev)/META.jackpotPrev*100):0;
    jc.textContent=(pct>0?"▲":pct<0?"▼":"")+Math.abs(pct).toFixed(1)+"%"; jc.className="jchg"+(pct>=0?" up":" down"); }
  const sl=$("#streakLine"); if(sl){ const n=META.streakDays||0, sec=streakSecuredToday();
    if(n<=0){ sl.innerHTML='🔥 No streak — win '+STREAK_MIN+' days running to start earning'; sl.className="streakline"; }
    else if(n<STREAK_MIN){ const left=STREAK_MIN-n; sl.innerHTML='🔥 <b>'+n+'/'+STREAK_MIN+' win-days</b> · '+(sec?('secured — '+left+' more day'+(left>1?'s':'')+' to start earning'):('win today to reach '+(n+1)+'/'+STREAK_MIN)); sl.className="streakline"+(sec?" on":" due"); }
    else { sl.innerHTML='🔥 <b>'+n+'-day streak</b> · '+(sec?('✓ secured — next reward +'+fmt(streakChipReward(n+1))+' 🪙'+(streakMoonReward(n+1)?(" +"+streakMoonReward(n+1)+" 🌙"):"")+' tomorrow'):('win today for +'+fmt(streakChipReward(n+1))+' 🪙'+(streakMoonReward(n+1)?(" +"+streakMoonReward(n+1)+" 🌙"):"")+' — miss a day and it resets!')); sl.className="streakline"+(sec?" on":" due"); } }
  // Vito's tab + button
  $("#tabAmt").textContent=fmt(META.debt);
  $("#tabAmt").style.color=META.debt>0?"var(--red)":"var(--dim)";
  $("#tabrow").classList.toggle("indebt",META.debt>0);
  const m=menace(), vb=$("#toShark");
  vb.className="vito m"+m;
  const due=Math.max(0,COLLECT_AT-META.debtAge);
  vb.textContent=META.debt>0?("SEE VITO ▸ owe "+fmt(META.debt)+" · collects in "+due):"VISIT VITO ▸";
  renderTicker();
  // tables — built as <div>s (Safari renders <button> with block children inconsistently)
  const w=worth(), frozen=META.debt>=creditLimit(); const wrap=$("#tables"); wrap.innerHTML="";
  TABLES.forEach(t=>{
    try{
      const need=t.need||0, worthOK=w>=need, creditOK=!(frozen&&need>0), unlocked=worthOK&&creditOK;
      const afford=META.chips>=t.ante;
      const card=document.createElement("div");
      card.className="tcard"+(unlocked?"":(creditOK?" locked":" locked frozen"));
      if(!worthOK) card.setAttribute("data-need","NEED "+fmt(need)+" 🪙");
      else if(!creditOK) card.setAttribute("data-need","CREDIT FROZEN — PAY VITO");
      card.innerHTML='<div class="tname">'+t.name+'</div><div class="tblurb">'+t.blurb+'</div>'
        +'<div class="trow"><span class="k">Unlock at</span><span class="v'+(worthOK?"":" poor")+'">'+(need>0?(fmt(need)+" 🪙"):"open to all")+'</span></div>'
        +'<div class="trow"><span class="k">Buy-in</span><span class="ante'+(afford?"":" poor")+'">'+fmt(t.ante)+' 🪙</span></div>'
        +'<div class="trow"><span class="k">Win pays</span><span class="v">'+fmt(Math.round(t.ante*t.pay))+' 🪙</span></div>'
        +'<div class="trow"><span class="k">Race to</span><span class="v">'+fmt(t.target)+' pts</span></div>';
      if(unlocked){ card.setAttribute("role","button"); card.tabIndex=0;
        const go=()=>{ ac(); openBetting(t); };
        card.addEventListener("click",go);
        card.addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); go(); } });
      }
      wrap.appendChild(card);
    }catch(e){}
  });
  $("#bailmsg").hidden=true;
  show("lobby");
}
function flashBail(txt){const b=$("#bailmsg");b.hidden=false;b.textContent=txt;b.style.color="var(--red)";setTimeout(()=>{if($("#bailmsg").textContent===txt)$("#bailmsg").hidden=true;},2600);}

/* ===================== BETTING ===================== */
let bet={table:null,sides:new Set()};
function openBetting(table){
  bet={table,sides:new Set(),offered:rollSideBets()};
  renderBetting(); show("betting");
}
function renderBetting(){
  const t=bet.table, ss=sideStake(t.ante);
  $("#betSummary").innerHTML=`<div class="tname">${t.name}</div>
    <div class="grid">
      <div class="k">Buy-in<span class="v">${fmt(t.ante)} 🪙</span></div>
      <div class="k">Win pays<span class="v"><b>${fmt(Math.round(t.ante*t.pay))}</b> 🪙</span></div>
      <div class="k">Race to<span class="v">${fmt(t.target)} pts</span></div>
      <div class="k">Each side bet<span class="v">${fmt(ss)} 🪙</span></div>
    </div>`;
  const wrap=$("#sidebets"); wrap.innerHTML="";
  (bet.offered||[]).forEach(b=>{
    const on=bet.sides.has(b.id);
    const el=document.createElement("div"); el.className="sbet"+(on?" on":"");
    el.innerHTML='<div class="box">'+(on?"✓":"")+'</div>'
      +'<div class="info"><div class="nm">'+b.name+' <b>'+b.mult+'×</b></div><div class="ds">'+b.desc+'</div></div>'
      +'<div class="stk">bet '+fmt(ss)+' 🪙<br><span style="color:var(--green)">win '+fmt(Math.round(ss*b.mult))+' 🪙</span></div>';
    el.addEventListener("click",()=>{ ac(); on?bet.sides.delete(b.id):bet.sides.add(b.id); sfx.chip(); renderBetting(); });
    wrap.appendChild(el);
  });
  $("#invNote").innerHTML=`Perks in your bag — <b>🛡️ ${META.inv.insurance} insurance</b>, <b>🔄 ${META.inv.mulligan} mulligan</b>. They trigger automatically when you Farkle. Buy more in the Shop.`;
  // progressive jackpot opt-in
  const jp=jackpotAnte(t), jOn=!!bet.jackpot, jw=$("#jackpotBet");
  jw.innerHTML='<div class="sbet jpot'+(jOn?" on":"")+'"><div class="box">'+(jOn?"✓":"")+'</div>'
    +'<div class="info"><div class="nm">JOIN THE JACKPOT <b>'+fmt(META.jackpot)+' 🪙</b></div>'
    +'<div class="ds">Ante '+fmt(jp)+' 🪙 into the pot. Roll a straight or two triplets for 25%, or a six-of-a-kind to scoop it ALL.</div></div>'
    +'<div class="stk">ante '+fmt(jp)+' 🪙</div></div>';
  jw.firstChild.addEventListener("click",()=>{ ac(); bet.jackpot=!bet.jackpot; sfx.chip(); renderBetting(); });
  const total=t.ante+bet.sides.size*ss+(jOn?jp:0);
  $("#totalStake").textContent=fmt(total)+" 🪙";
  const cn=$("#creditNote");
  if(META.chips>=total){ // pay cash
    $("#placeBtn").disabled=false; $("#placeBtn").className="bigbtn play";
    $("#placeBtn").innerHTML=`🎲 ANTE UP &amp; PLAY <small>stake ${fmt(total)} 🪙</small>`; cn.textContent="";
  } else if(META.chips+availCredit()>=total){ // borrow shortfall
    const short=total-META.chips;
    $("#placeBtn").disabled=false; $("#placeBtn").className="bigbtn credit";
    $("#placeBtn").innerHTML=`🦈 BORROW ${fmt(short)} &amp; PLAY <small>onto Vito's tab — 10%/game</small>`;
    cn.textContent="You're short "+fmt(short)+" 🪙 — Vito will spot you.";
  } else { // can't even cover with credit
    $("#placeBtn").disabled=true; $("#placeBtn").className="bigbtn play";
    $("#placeBtn").innerHTML=`✗ EVEN VITO WON'T COVER THIS <small>drop a side bet or play lower</small>`; cn.textContent="";
  }
}
