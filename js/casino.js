/* =====================================================================
   Moon casino
   The Lunar Wheel — gamble moons for a multiplier.
   Loaded as a classic <script> that shares globals with the others.
   Load order is fixed in index.html — keep it.
   ===================================================================== */
"use strict";
/* ===================== CASINO (moon shards) ===================== */
// Gamble SHARDS (1 moon = 1000 shards). Two games share the shard balance.
// WHEEL: 20-cell, uniform pick → 11×bust,3×push,4×double,1×triple,1×five (EV ~0.95).
const WHEEL=[0,2,0,1,0,2,0,5,0,2,0,1,0,3,0,2,0,1,0,0];
let wheelLayout=WHEEL.slice();
function shuffleWheel(){ wheelLayout=WHEEL.slice();
  for(let i=wheelLayout.length-1;i>0;i--){ const j=Math.random()*(i+1)|0, t=wheelLayout[i]; wheelLayout[i]=wheelLayout[j]; wheelLayout[j]=t; } }
const SHARD_STEP=50, DIE_FACES=["","⚀","⚁","⚂","⚃","⚄","⚅"], CASINO_DAILY=20;
const SUITS=["♠","♥","♦","♣"], BJ_RANKS=["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
let casGame="wheel", wheelStake=100, diceStake=100, diceBet="low", spinning=false;
let bjStake=100, bj=null;
function todayKey(){ const d=new Date(); return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate(); }
function casinoPlaysToday(){ const k=todayKey();
  if(!META.casino||typeof META.casino!=="object") META.casino={day:k,plays:0,bonus:0,buys:0};
  if(META.casino.day!==k){ META.casino.day=k; META.casino.plays=0; META.casino.bonus=0; META.casino.buys=0; }
  if(META.casino.bonus==null)META.casino.bonus=0; if(META.casino.buys==null)META.casino.buys=0;
  return META.casino.plays; }
function casinoCap(){ casinoPlaysToday(); return CASINO_DAILY+(META.casino.bonus||0); }
function casinoLeft(){ return Math.max(0, casinoCap()-casinoPlaysToday()); }
function casinoRecordPlay(){ casinoPlaysToday(); META.casino.plays++; saveProfile(); }
function extraRollCost(){ return 250; }   // flat 250 shards per +5 plays
function buyExtraRolls(){ if(spinning)return; const cost=extraRollCost(); if(META.shards<cost){sfx.deny();return;} ac();
  META.shards-=cost; casinoPlaysToday(); META.casino.bonus+=5; META.casino.buys++; saveProfile(); renderWalletEls(); sfx.unlock(); renderCasino(); }
function wheelColor(m){ return m===0?"#e0466a":m===1?"#8893a8":m===2?"#39d98a":m===3?"#37c0ff":"#ffd23f"; }
function wheelLabel(m){ return m===1?"PUSH":m+"×"; }
function clampStakes(){ const cap=Math.max(1,META.shards);
  wheelStake=Math.max(1,Math.min(wheelStake,cap)); diceStake=Math.max(1,Math.min(diceStake,cap)); bjStake=Math.max(1,Math.min(bjStake,cap)); }
function bumpStake(which,d){ if(spinning)return; ac(); sfx.chip();
  let s=which==="wheel"?wheelStake:which==="dice"?diceStake:bjStake;
  s = d==="max" ? META.shards : s + d*SHARD_STEP;
  s=Math.max(1,Math.min(s,Math.max(1,META.shards)));
  if(which==="wheel") wheelStake=s; else if(which==="dice") diceStake=s; else bjStake=s; renderCasino(); }
function casStakeSlider(which){ return which==="wheel"?$("#wSlider"):which==="dice"?$("#dSlider"):$("#bSlider"); }
function syncCasStake(which,syncSlider){   // refresh stake number + its slider
  const cap=Math.max(1,META.shards);
  const val = which==="wheel"?wheelStake:which==="dice"?diceStake:bjStake;
  const valEl = which==="wheel"?$("#wStakeVal"):which==="dice"?$("#dStakeVal"):$("#bStakeVal");
  if(valEl) valEl.textContent=fmt(val);
  const sl=casStakeSlider(which);
  if(sl){ sl.max=cap; sl.step=SHARD_STEP; sl.disabled=spinning||META.shards<1; if(syncSlider!==false) sl.value=val; }
}
function casSliderInput(which){   // light update while dragging — no full re-render
  if(spinning) return;
  const sl=casStakeSlider(which); let v=(+sl.value)||0; v=Math.max(1,Math.min(v,Math.max(1,META.shards)));
  if(which==="wheel") wheelStake=v; else if(which==="dice") diceStake=v; else bjStake=v;
  syncCasStake(which,false);
}
function tradeMoonToShard(){ if(spinning||META.moons<1)return; ac(); sfx.chip();
  META.moons-=1; META.shards+=1000; saveProfile(); renderWalletEls(); renderCasino(); }
function cashShardToMoon(){ if(spinning||META.shards<1000)return; ac(); sfx.moon();
  META.shards-=1000; META.moons+=1; saveProfile(); renderWalletEls(); bumpMoons(); renderCasino(); }
function renderCasino(){
  $("#casMoons").textContent=fmt(META.moons);
  $("#casShards").textContent=fmt(META.shards);
  const lk=lockedMoons(), cml=$("#casMoonsLock"); cml.textContent=lk>0?("🔒"+fmt(lk)+" locked in vault"):""; cml.hidden=lk<1;
  if(!spinning) clampStakes();
  syncCasStake("wheel",true); syncCasStake("dice",true); syncCasStake("blackjack",true);
  $("#tabWheel").classList.toggle("on",casGame==="wheel");
  $("#tabDice").classList.toggle("on",casGame==="dice");
  $("#tabBlackjack").classList.toggle("on",casGame==="blackjack");
  $("#panelWheel").hidden=casGame!=="wheel";
  $("#panelDice").hidden=casGame!=="dice";
  $("#panelBlackjack").hidden=casGame!=="blackjack";
  const w=$("#wheel"); w.innerHTML="";
  wheelLayout.forEach(function(m){ const c=document.createElement("div"); c.className="wcell"; c.style.color=wheelColor(m); c.textContent=wheelLabel(m); w.appendChild(c); });
  $("#betLow").classList.toggle("on",diceBet==="low");
  $("#betSeven").classList.toggle("on",diceBet==="seven");
  $("#betHigh").classList.toggle("on",diceBet==="high");
  renderBJ();
  const broke=META.shards<1, left=casinoLeft(), capped=left<=0;
  $("#dailyCap").textContent = capped ? "Daily limit reached — buy more or come back tomorrow." : (left+" of "+casinoCap()+" plays left today");
  $("#dailyCap").classList.toggle("out",capped);
  const erc=extraRollCost(), bbtn=$("#buyRolls");
  bbtn.innerHTML="✦ BUY +5 PLAYS · "+erc;
  bbtn.disabled=spinning||META.shards<erc;
  $("#spinBtn").disabled=spinning||broke||capped;
  $("#diceRollBtn").disabled=spinning||broke||capped;
  $("#bjDeal").disabled=spinning||broke||capped;
  $("#moonToShard").disabled=spinning||META.moons<1;
  $("#shardToMoon").disabled=spinning||META.shards<1000;
  ["wStakeUp","wStakeDown","wStakeMax","dStakeUp","dStakeDown","dStakeMax","bStakeUp","bStakeDown","bStakeMax","betLow","betSeven","betHigh","tabWheel","tabDice","tabBlackjack"].forEach(function(id){ $("#"+id).disabled=spinning; });
  show("casino");
}
function bjCardEl(c,hidden){ const d=document.createElement("div"); d.className="bjcard";
  if(hidden){ d.classList.add("back"); d.textContent="?"; return d; }
  d.classList.add((c.s===1||c.s===2)?"red":"black");
  d.innerHTML='<span class="r">'+BJ_RANKS[c.r]+'</span><span class="s">'+SUITS[c.s]+'</span>'; return d; }
function renderBJ(){
  const de=$("#bjDealer"), pe=$("#bjPlayer"); de.innerHTML=""; pe.innerHTML="";
  const inHand=bj&&bj.phase==="player";
  if(bj){
    const reveal=bj.phase!=="player";
    bj.dealer.forEach(function(c,i){ de.appendChild(bjCardEl(c,!reveal&&i===1)); });
    bj.player.forEach(function(c){ pe.appendChild(bjCardEl(c,false)); });
    $("#bjPlayerVal").textContent=bjHandVal(bj.player);
    $("#bjDealerVal").textContent=reveal?bjHandVal(bj.dealer):bjHandVal([bj.dealer[0]]);
  } else { $("#bjPlayerVal").textContent=""; $("#bjDealerVal").textContent=""; }
  $("#bjDeal").hidden=inHand;
  $("#bjHit").hidden=!inHand;
  $("#bjStand").hidden=!inHand;
  $("#bjDouble").hidden=!(inHand&&bj.player.length===2&&META.shards>=bj.stake);
}
function casinoSpin(){
  if(spinning) return; ac();
  if(casinoLeft()<=0){ $("#wheelMsg").textContent="🚫 Daily limit reached — come back tomorrow."; renderCasino(); return; }
  const stake=Math.min(wheelStake,META.shards);
  if(stake<1){ $("#wheelMsg").textContent="Out of shards — break a moon to play."; return; }
  spinning=true; wheelStake=stake; casinoRecordPlay();
  META.shards-=stake; shuffleWheel(); renderWalletEls(); renderCasino();
  $("#wheelMsg").textContent="Spinning…";
  const target=Math.random()*wheelLayout.length|0;
  const cells=Array.prototype.slice.call($("#wheel").children);
  const loops=wheelLayout.length*2+target; let step=0,pos=0;
  function tick(){
    cells.forEach(function(c){ c.classList.remove("hot"); });
    cells[pos%wheelLayout.length].classList.add("hot"); sfx.tick();
    step++; pos++;
    if(step>loops){ land(); return; }
    const left=loops-step;
    setTimeout(tick, left<9 ? 70+(9-left)*38 : 55);
  }
  function land(){
    const m=wheelLayout[target], won=stake*m, net=won-stake;
    META.shards+=won; saveProfile(); renderWalletEls();
    if(m===0){ $("#wheelMsg").textContent="💀 BUST — lost "+fmt(stake)+" ✦"; sfx.lose(); }
    else if(m===1){ $("#wheelMsg").textContent="↩ PUSH — your "+fmt(stake)+" ✦ is returned"; sfx.drop(); }
    else if(m>=5){ $("#wheelMsg").textContent="🌟 JACKPOT "+m+"× — won "+fmt(won)+" ✦ (+"+fmt(net)+")"; sfx.win(); sfx.moon(); }
    else { $("#wheelMsg").textContent="🎉 "+m+"× — won "+fmt(won)+" ✦ (+"+fmt(net)+")"; sfx.cash(); }
    spinning=false; renderCasino();
  }
  tick();
}
function casinoDice(){
  if(spinning) return; ac();
  if(casinoLeft()<=0){ $("#diceMsg").textContent="🚫 Daily limit reached — come back tomorrow."; renderCasino(); return; }
  const stake=Math.min(diceStake,META.shards);
  if(stake<1){ $("#diceMsg").textContent="Out of shards — break a moon to play."; return; }
  const bet=diceBet;
  spinning=true; diceStake=stake; casinoRecordPlay();
  META.shards-=stake; renderWalletEls(); renderCasino();
  $("#diceMsg").textContent="Rolling…";
  let rolls=0; const total=12+(Math.random()*4|0);
  function tick(){
    const a=1+(Math.random()*6|0), b=1+(Math.random()*6|0);
    $("#diceShow").textContent=DIE_FACES[a]+" "+DIE_FACES[b]; sfx.tick();
    rolls++;
    if(rolls>=total){ settle(); return; }
    setTimeout(tick, rolls>total-6 ? 90+(rolls-(total-6))*45 : 60);
  }
  function settle(){
    const d1=1+(Math.random()*6|0), d2=1+(Math.random()*6|0), sum=d1+d2;
    $("#diceShow").textContent=DIE_FACES[d1]+" "+DIE_FACES[d2];
    let mult=0,label="";
    if(bet==="seven"){ if(sum===7){mult=5;label="LUCKY 7";} }
    else if(bet==="low"){ if(sum<=6){mult=2;} else if(sum===7){mult=1;} }
    else { if(sum>=8){mult=2;} else if(sum===7){mult=1;} }
    const won=stake*mult, net=won-stake;
    META.shards+=won; saveProfile(); renderWalletEls();
    const head="🎲 "+sum+" — ";
    if(mult===0){ $("#diceMsg").textContent=head+"no luck. Lost "+fmt(stake)+" ✦"; sfx.lose(); }
    else if(mult===1){ $("#diceMsg").textContent=head+"PUSH on a 7 — bet returned"; sfx.drop(); }
    else if(mult>=5){ $("#diceMsg").textContent=head+(label?label+"! ":"")+"won "+fmt(won)+" ✦ (+"+fmt(net)+")"; sfx.win(); sfx.moon(); }
    else { $("#diceMsg").textContent=head+"WIN! Won "+fmt(won)+" ✦ (+"+fmt(net)+")"; sfx.cash(); }
    spinning=false; renderCasino();
  }
  tick();
}
// ---- Blackjack (shards) ----
function bjNewDeck(){ const d=[]; for(let s=0;s<4;s++)for(let r=0;r<13;r++)d.push({r:r,s:s});
  for(let i=d.length-1;i>0;i--){ const j=Math.random()*(i+1)|0,t=d[i]; d[i]=d[j]; d[j]=t; } return d; }
function bjCardVal(c){ return c.r===0?11:(c.r<=8?c.r+1:10); }
function bjHandVal(cards){ let sum=0,aces=0; for(const c of cards){ sum+=bjCardVal(c); if(c.r===0)aces++; }
  while(sum>21&&aces>0){ sum-=10; aces--; } return sum; }
function bjDeal(){
  if(spinning) return; ac();
  if(casinoLeft()<=0){ $("#bjMsg").textContent="🚫 Daily limit reached — come back tomorrow."; renderCasino(); return; }
  const stake=Math.min(bjStake,META.shards);
  if(stake<1){ $("#bjMsg").textContent="Out of shards — break a moon to play."; return; }
  bjStake=stake; META.shards-=stake; casinoRecordPlay(); spinning=true;
  const deck=bjNewDeck();
  bj={deck:deck, stake:stake, doubled:false, phase:"player",
      player:[deck.pop(),deck.pop()], dealer:[deck.pop(),deck.pop()]};
  renderWalletEls(); sfx.pick(); $("#bjMsg").textContent="Your move.";
  if(bjHandVal(bj.player)===21 || bjHandVal(bj.dealer)===21){ bjSettle(); return; }
  renderCasino();
}
function bjHit(){ if(!bj||bj.phase!=="player")return; ac(); sfx.keep();
  bj.player.push(bj.deck.pop());
  const p=bjHandVal(bj.player);
  if(p>21){ bjSettle(); return; }
  if(p===21){ bjStand(); return; }
  renderCasino();
}
function bjStand(){ if(!bj||bj.phase!=="player")return; ac(); sfx.pick();
  bj.phase="dealer";
  while(bjHandVal(bj.dealer)<17) bj.dealer.push(bj.deck.pop());
  bjSettle();
}
function bjDouble(){ if(!bj||bj.phase!=="player"||bj.player.length!==2)return; ac();
  if(META.shards<bj.stake){ sfx.deny(); return; }
  META.shards-=bj.stake; bj.stake*=2; bj.doubled=true; sfx.chip();
  bj.player.push(bj.deck.pop()); renderWalletEls();
  if(bjHandVal(bj.player)>21){ bjSettle(); return; }
  bj.phase="dealer";
  while(bjHandVal(bj.dealer)<17) bj.dealer.push(bj.deck.pop());
  bjSettle();
}
function bjSettle(){
  bj.phase="done";
  const p=bjHandVal(bj.player), d=bjHandVal(bj.dealer);
  const pBJ=(bj.player.length===2&&p===21), dBJ=(bj.dealer.length===2&&d===21);
  let payout=0, msg="";
  if(p>21){ msg="💥 BUST ("+p+") — lost "+fmt(bj.stake)+" ✦"; }
  else if(pBJ&&dBJ){ payout=bj.stake; msg="↩ PUSH — both blackjack"; }
  else if(pBJ){ payout=Math.round(bj.stake*2.5); msg="🃏 BLACKJACK! won "+fmt(payout-bj.stake)+" ✦"; }
  else if(dBJ){ msg="dealer blackjack — lost "+fmt(bj.stake)+" ✦"; }
  else if(d>21){ payout=bj.stake*2; msg="🎉 dealer busts ("+d+") — won "+fmt(payout-bj.stake)+" ✦"; }
  else if(p>d){ payout=bj.stake*2; msg="🎉 "+p+" beats "+d+" — won "+fmt(payout-bj.stake)+" ✦"; }
  else if(p===d){ payout=bj.stake; msg="↩ PUSH ("+p+") — bet returned"; }
  else { msg="dealer wins "+d+" to "+p+" — lost "+fmt(bj.stake)+" ✦"; }
  META.shards+=payout; saveProfile(); renderWalletEls();
  if(payout===0) sfx.lose(); else if(payout===bj.stake) sfx.drop(); else if(pBJ){ sfx.win(); sfx.moon(); } else sfx.cash();
  spinning=false; renderCasino(); $("#bjMsg").textContent=msg;
}
