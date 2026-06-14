/* =====================================================================
   Win/lose, double-or-nothing, chase
   End-of-match payout, side-bet settlement, gamble/recover flows.
   Loaded as a classic <script> that shares globals with the others.
   Load order is fixed in index.html — keep it.
   ===================================================================== */
"use strict";
/* ===================== RESOLUTION + DOUBLE OR NOTHING ===================== */
function evalBet(b){ return b.eval ? !!b.eval(S) : false; }
function endGame(folded){
  stopMatchTimer(); S.elapsedMs=Date.now()-(S.startTime||Date.now());
  const youWin=!folded&&S.scores.you>S.scores.cpu;
  S.meta.youWin=youWin; S.meta.margin=S.scores.you-S.scores.cpu;
  const matchPay=youWin?Math.round(S.ante*S.payMult):0;
  const charm=hasRelic("charm")?1.5:1, betMult=1+0.15*metaLvl("bets");
  const betResults=S.sides.map(b=>{const won=evalBet(b);return{name:b.name,mult:b.mult,stake:b.stake,won,pay:won?Math.round(b.stake*b.mult*charm*betMult):0};});
  const betPay=betResults.reduce((s,b)=>s+b.pay,0);
  const basePayout=matchPay+betPay;
  const relicBonus=Math.round(basePayout*(payoutMult()-1));
  const payout=basePayout+relicBonus; const net=payout-S.staked;
  META.chips+=payout;
  META.stats.games++;
  if(Array.isArray(META.bank) && META.bank.length){      // Moon Vault — each lot drips interest
    let vpaid=0;
    for(let i=0;i<META.bank.length;i++){ const b=META.bank[i]; if(b.left>0){ b.left--;
      const elapsed=b.term-b.left, target=Math.round(b.interest*elapsed/b.term), pay=Math.max(0,target-b.earned);
      b.earned=target; if(pay>0){ META.chips+=pay; vpaid+=pay; } } }
    if(vpaid>0) S.vaultPaid=vpaid;
  }
  marketTick();   // the exchange moves one step per match
  jackpotGrow();  // progressive jackpot ticks up a random amount
  realtyTick();   // real-estate market + rent + carrying costs each match
  empireTick();   // the house's cut — passive rake if you own venues
  if(youWin){META.stats.wins++;META.stats.streak++;META.stats.bestStreak=Math.max(META.stats.bestStreak,META.stats.streak);META.stats.biggestPot=Math.max(META.stats.biggestPot,payout);claimStreak();
    const secs=Math.max(12,S.elapsedMs/1000);
    const speedMult=Math.max(0.3,Math.min(2.5,SPEED_PAR/secs));     // faster = bigger (cap 2.5×, floor 0.3×)
    const volMult=1+Math.min(1.0,META.stats.games/400);             // more matches played = bigger (1.0→2.0×)
    const sbBase=Math.max(80,Math.round(S.ante*0.2));
    const speedBonus=Math.round(sbBase*speedMult*volMult*(1+0.1*metaLvl("hot")));
    META.chips+=speedBonus; S.speedBonus={chips:speedBonus,secs:Math.round(S.elapsedMs/1000)};
    if(S.meta.margin>1500){                                          // BLOWOUT — beating the CPU by a wide margin scales a bonus
      const over=S.meta.margin-1500, mult=Math.min(3.5,1+over/1200), mbBase=Math.max(100,Math.round(S.ante*0.12));
      const marginBonus=Math.round(mbBase*mult*(1+0.1*metaLvl("hot")));
      META.chips+=marginBonus; S.marginBonus={chips:marginBonus, margin:S.meta.margin};
    }
  }
  else{META.stats.losses++;META.stats.streak=0;}
  if(net>0)META.lifetime+=net;
  // ---- Vito's vig: Shark Tooth halves it; once you OWN THE HOUSE, Vito never charges you again ----
  const vrate=hasRelic("shark")?VIG_RATE/2:VIG_RATE;
  let vig=0,vigCash=0,vigCap=0;
  if(!houseOwned()&&META.debt>0){ vig=Math.ceil(META.debt*vrate); vigCash=payCash(vig); vigCap=addDebt(vig-vigCash); META.stats.interestPaid+=vig; META.debtAge++; }
  // ---- skim: Shark Tooth blocks it, and so does owning the house ----
  let skim=0;
  if(!houseOwned()&&!hasRelic("shark")&&net>0&&META.debt>0){ skim=Math.min(META.debt,Math.floor(net*SKIM_RATE),META.chips); META.chips-=skim; META.debt-=skim; if(META.debt<=0){META.debt=0;META.debtAge=0;} }
  const pocket=net-skim;
  const willDouble=!folded&&pocket>0;
  // Career progress (lifetime → rank) is credited only once winnings are SECURED. When a
  // double-or-nothing is offered we DEFER it (track pendingLife) and commit it on collect or a
  // surviving gamble — so losing the gamble correctly leaves your rank/progress unchanged.
  if(willDouble){ if(net>0)META.lifetime-=net; }   // undo the eager credit above; re-added when secured
  S.pendingLife = willDouble ? net : 0;
  // ---- moons: rank-up grants (only when progress is real) + lucky drop on a win ----
  const moonGain = 0; // rank-up moons are granted on returning to the lobby, based on final net worth
  let moonDrop=0;
  if(youWin&&Math.random()<(hasRelic("midas")?0.16:0.08)){ moonDrop=1; META.moons++; META.stats.moonsFound++; }
  saveProfile();
  S.result={youWin,folded,matchPay,betResults,payout,net,vig,vigCash,vigCap,skim,relicBonus,moonGain,moonDrop};
  if(folded) S.gamble=null;
  else if(pocket>0) S.gamble={mode:"double",pot:pocket,busy:false,done:false,recovered:false};
  else if(net<0) S.gamble={mode:"chase",pot:-net,busy:false,done:false,recovered:false};
  else S.gamble=null;
  renderResolution(); show("resolution");
  if(youWin){screenEl.classList.add("win-flash");setTimeout(()=>screenEl.classList.remove("win-flash"),520);sfx.cash();}
  else sfx.lose();
  if(moonGain||moonDrop){ setTimeout(()=>{sfx.moon();bumpMoons();},650); }
}
function renderResolution(){
  const r=S.result, g=S.gamble;
  const big=$("#rezBig"); big.className="big "+(r.youWin?"win":"lose"); big.textContent=r.folded?"FOLDED":(r.youWin?"YOU WIN!":"CPU WINS");
  $("#rezScore").textContent="YOU "+fmt(S.scores.you)+"  —  CPU "+fmt(S.scores.cpu);
  let h="";
  h+=`<div class="rezline"><span class="k">Ante</span><span class="v neg">−${fmt(S.ante)}</span></div>`;
  if(S.jackpotIn) h+=`<div class="rezline"><span class="k">🌕 Jackpot ante</span><span class="v neg">−${fmt(jackpotAnte(S.table))}</span></div>`;
  if(r.matchPay>0) h+=`<div class="rezline"><span class="k">Match win (pot)</span><span class="v pos">+${fmt(r.matchPay)}</span></div>`;
  r.betResults.forEach(b=>{ h+=`<div class="rezline"><span class="k">${b.name} ${b.mult}× ${b.won?"✓":"✗"} <span style="color:var(--dim)">(−${fmt(b.stake)})</span></span><span class="v ${b.won?"pos":"neg"}">${b.won?"+"+fmt(b.pay):"lost"}</span></div>`; });
  if(r.relicBonus>0) h+=`<div class="rezline"><span class="k">✨ Relic bonus</span><span class="v pos">+${fmt(r.relicBonus)}</span></div>`;
  const cls=r.net>0?"pos":r.net<0?"neg":"";
  h+=`<div class="rezline net"><span class="k">NET</span><span class="v ${cls}">${r.net>0?"+":""}${fmt(r.net)} 🪙</span></div>`;
  if(S.jackpotPaid>0) h+=`<div class="rezline"><span class="k">🌕 PROGRESSIVE JACKPOT</span><span class="v pos">+${fmt(S.jackpotPaid)} 🪙</span></div>`;
  if(S.vaultPaid>0) h+=`<div class="rezline"><span class="k">🏦 Vault interest</span><span class="v pos">+${fmt(S.vaultPaid)} 🪙</span></div>`;
  if(S.rentPaid>0) h+=`<div class="rezline"><span class="k">🏠 Rent collected</span><span class="v pos">+${fmt(S.rentPaid)} 🪙</span></div>`;
  if(S.realtyCost && (S.realtyCost.tax+S.realtyCost.prem+S.realtyCost.repair)>0) h+=`<div class="rezline"><span class="k">🏚️ Property ${S.realtyCost.repair>0?"tax + repairs":"tax"+(S.realtyCost.prem>0?" + insurance":"")}</span><span class="v neg">−${fmt(S.realtyCost.tax+S.realtyCost.prem+S.realtyCost.repair)} 🪙</span></div>`;
  if(S.realtyNews) h+=`<div class="rezline"><span class="k">📰 ${S.realtyNews}</span><span class="v"></span></div>`;
  if(S.rentVacant) h+=`<div class="rezline"><span class="k">🚧 Vacant this match</span><span class="v">${S.rentVacant}</span></div>`;
  if(S.speedBonus) h+=`<div class="rezline"><span class="k">⚡ Speed bonus (won in ${fmtClock(S.speedBonus.secs*1000)})</span><span class="v pos">+${fmt(S.speedBonus.chips)} 🪙</span></div>`;
  if(S.marginBonus) h+=`<div class="rezline"><span class="k">⚔️ Blowout (won by ${fmt(S.marginBonus.margin)})</span><span class="v pos">+${fmt(S.marginBonus.chips)} 🪙</span></div>`;
  if(S.empireRake) h+=`<div class="rezline"><span class="k">🏛️ The house's cut</span><span class="v pos">+${fmt(S.empireRake)} 🪙${S.empireMoons?(" · +"+S.empireMoons+" 🌙"):""}</span></div>`;
  if(S.streakBonus) h+=`<div class="rezline"><span class="k">🔥 ${S.streakBonus.days}-day streak</span><span class="v pos">+${fmt(S.streakBonus.chips)} 🪙${S.streakBonus.moons>0?(" · +"+S.streakBonus.moons+" 🌙"):""}${S.streakBonus.box?" · 📦 crate":""}</span></div>`;
  else if(S.streakBuild) h+=`<div class="rezline"><span class="k">🔥 Streak building ${S.streakBuild}/${STREAK_MIN}</span><span class="v">${STREAK_MIN-S.streakBuild} more win-day${(STREAK_MIN-S.streakBuild)>1?"s":""} to start earning</span></div>`;
  if(r.vigCash>0||r.vigCap>0) h+=`<div class="rezline shark"><span class="k">🦈 Vito's vig${hasRelic("shark")?" (½)":""}</span><span class="v">−${fmt(r.vigCash)}${r.vigCap?` (+${fmt(r.vigCap)} to tab)`:""}</span></div>`;
  if(r.skim>0) h+=`<div class="rezline shark"><span class="k">🦈 Vito skims your win (15%)</span><span class="v">−${fmt(r.skim)} → tab</span></div>`;
  if(META.debt>0) h+=`<div class="rezline tab"><span class="k">VITO'S TAB</span><span class="v">${fmt(META.debt)} 🪙</span></div>`;
  if(r.moonGain>0) h+=`<div class="rezline moon"><span class="k">🌙 RANK-UP BONUS</span><span class="v">+${fmt(r.moonGain)} moons</span></div>`;
  if(r.moonDrop>0) h+=`<div class="rezline moon"><span class="k">🌙 LUCKY FIND</span><span class="v">+1 moon</span></div>`;
  h+=`<div class="rezline" style="margin-top:8px;border-top:2px solid #2a3550;padding-top:9px"><span class="k">BANKROLL NOW</span><span class="v" style="color:var(--gold)">${fmt(META.chips)} 🪙</span></div>`;
  $("#breakdown").innerHTML=h;
  const panel=$("#donPanel");
  panel.hidden=!g; $("#toLobbyBtn").hidden=!!g;
  if(g){
    panel.className="don"+(g.mode==="chase"?" chase":"");
    $("#donPot").textContent=fmt(g.pot);
    if(g.mode==="double"){
      $("#gambleTitle").textContent="⚡ DOUBLE OR NOTHING ⚡";
      $("#potLabel").textContent="winnings on the line:";
      $("#donMain").textContent="⚡ PRESS LUCK"; $("#donSub").textContent="roll vs house";
      $("#colMain").textContent=g.pot>0?"✓ COLLECT":"✓ DONE";
      $("#collectSub").textContent=g.pot>0?("keep "+fmt(g.pot)+" 🪙"):"back to lobby";
    } else { // chase
      $("#gambleTitle").textContent="🩸 CHASE YOUR LOSSES 🩸";
      $("#potLabel").textContent="loss to win back:";
      $("#donMain").textContent="🎲 CHASE IT"; $("#donSub").textContent="ties go to the house";
      $("#colMain").textContent="🚪 WALK AWAY"; $("#collectSub").textContent=g.recovered?"quit while even":"eat the loss";
    }
    $("#donBtn").disabled=g.busy||g.done||g.pot<=0; $("#collectBtn").disabled=g.busy;
  }
}
async function pressLuck(){
  const g=S.gamble; if(!g||g.busy||g.pot<=0||g.done)return; ac();
  const clover=hasRelic("clover");
  g.busy=true; $("#donBtn").disabled=true; $("#collectBtn").disabled=true;
  $("#donYouSc").textContent=""; $("#donHouseSc").textContent="";
  let ys,hs,yv,hv;
  do{
    yv=rollVals(6); hv=rollVals(6); ys=evaluate(yv).score; hs=evaluate(hv).score;
    $("#donMsg").textContent="rolling…";
    await Promise.all([animateDice($("#donYou"),yv),animateDice($("#donHouse"),hv)]);
    $("#donYouSc").textContent=fmt(ys); $("#donHouseSc").textContent=fmt(hs);
    if(ys===hs&&g.mode==="double"&&!clover){ $("#donMsg").textContent="PUSH ("+fmt(ys)+" each) — ROLLING AGAIN"; await sleep(800); }
  }while(ys===hs&&g.mode==="double"&&!clover);
  const tie=ys===hs, youWin=ys>hs||(tie&&clover);
  if(g.mode==="double"){
    if(youWin){ META.chips+=g.pot; S.pendingLife=(S.pendingLife||0)+g.pot; META.stats.donWins++; $("#donMsg").textContent=(tie?"🍀 TIE — CLOVER WINS IT! ":"🎉 WIN "+fmt(ys)+" vs "+fmt(hs)+" — ")+"POT DOUBLED!"; sfx.cash(); g.pot*=2; }
    else{ payCash(g.pot); S.pendingLife=0; META.stats.donLosses++; $("#donMsg").textContent="💀 HOUSE WINS "+fmt(hs)+" vs "+fmt(ys)+" — POT LOST"; sfx.farkle(); screenEl.classList.add("shake"); setTimeout(()=>screenEl.classList.remove("shake"),420); g.pot=0; g.done=true; }
  } else { // CHASE — tie counts as house win unless clover
    if(youWin){ META.chips+=g.pot; META.stats.chaseWins++; g.recovered=true; $("#donMsg").textContent=(tie?"🍀 TIE — CLOVER SAVES YOU! ":"💰 ")+"RECOVERED +"+fmt(g.pot)+"! walk away or press for profit"; sfx.cash(); }
    else{ const {loaned}=sinkLoss(g.pot); META.stats.chaseLosses++;
      $("#donMsg").textContent=(tie?"TIE → HOUSE TAKES IT":"💀 HOUSE WINS "+fmt(hs)+" vs "+fmt(ys))+" — DOWN "+fmt(g.pot)+(loaned?" (Vito covers "+fmt(loaned)+")":"");
      sfx.farkle(); screenEl.classList.add("shake"); setTimeout(()=>screenEl.classList.remove("shake"),420);
      if(g.pot>META.chips+availCredit()){ g.done=true; } }
  }
  saveProfile(); g.busy=false; renderResolution(); bumpChips();
}
function collect(){ ac(); const g=S.gamble; if(g){ if(g.mode==="double"&&g.pot>0)sfx.bank(); g.done=true; }
  // commit the all-time "lifetime won" stat for a collected / surviving double-or-nothing
  if(S.pendingLife>0){ META.lifetime+=S.pendingLife; S.pendingLife=0; saveProfile(); }
  renderResolution(); goLobby(); }
function goLobby(){
  // award rank-up moons based on FINAL net worth after the match + any gamble (only for new tiers reached)
  const mg=grantRankMoons(); if(mg>0){ saveProfile(); setTimeout(()=>{sfx.moon();bumpMoons();},250); }
  // Vito's collection day — carry debt too long and he takes his cut
  let vmsg="";
  if(META.debt>0 && META.debtAge>=COLLECT_AT){ vmsg=vitoCollect(); }
  // never hard-lock: if you can't cover the cheapest ante even with credit, the pit boss shows mercy
  if(META.chips<TABLES[0].ante && (META.chips+availCredit())<TABLES[0].ante){
    META.chips+=100; META.bailouts++; saveProfile(); renderLobby();
    flashBail(vmsg||"🎩 The pit boss slides you 100 chips. “Don't make it a habit.”", vmsg?"var(--red)":"var(--green)"); bumpChips(); return;
  }
  renderLobby();
  if(vmsg) flashBail(vmsg,"var(--red)");
}
function flashBail(txt,color){const b=$("#bailmsg");b.hidden=false;b.textContent=txt;b.style.color=color||"var(--green)";}
function vitoCollect(){
  let msg;
  if(META.relics.length){
    const id=META.relics.slice().sort((a,b)=>relicById(b).cost-relicById(a).cost)[0], r=relicById(id);
    META.relics=META.relics.filter(x=>x!==id); META.equipped=META.equipped.filter(x=>x!==id);
    const fence=Math.min(META.debt, r.cost*300); META.debt=Math.max(0,META.debt-fence);
    msg="🩸 COLLECTION DAY: Vito seized your "+r.icon+" "+r.name+" and knocked "+fmt(fence)+" 🪙 off your tab.";
  } else {
    const grab=Math.min(META.chips, Math.ceil(META.chips*0.5)); META.chips-=grab; META.debt=Math.max(0,META.debt-grab);
    msg="🩸 COLLECTION DAY: no relics to take — Vito emptied "+fmt(grab)+" 🪙 from your pockets.";
  }
  if(META.debt<=0){ META.debt=0; META.debtAge=0; } else { META.debtAge=1; }
  sfx.loan(); saveProfile(); return msg;
}
