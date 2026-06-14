/* =====================================================================
   Match startup, event wiring, init
   Starts matches, binds buttons, installs the runtime error handler, boots the game.
   Loaded as a classic <script> that shares globals with the others.
   Load order is fixed in index.html — keep it.
   ===================================================================== */
"use strict";
/* ===================== wiring + init ===================== */
function startMatch(){ freshMatch(); applySkin();
  if(metaLvl("draw")>0 && typeof randTemp!=="undefined"){ const t=randTemp(Math.random()<0.78?"common":"uncommon"); if(t){ META.temp[t.id]=(META.temp[t.id]|0)+1; saveProfile(); } }
  renderMatch(); show("match"); startMatchTimer(); }
$("#placeBtn").addEventListener("click",()=>{ ac(); const t=bet.table,ss=sideStake(t.ante),jp=bet.jackpot?jackpotAnte(t):0,total=t.ante+bet.sides.size*ss+jp;
  if(META.chips<total){ if(META.chips+availCredit()<total){sfx.deny();return;} borrow(total-META.chips); }
  if(META.chips<total){sfx.deny();return;} META.chips-=total; if(jp>0)META.jackpot+=jp; sfx.chip(); saveProfile(); startMatch(); });
$("#betBack").addEventListener("click",()=>{ ac(); renderLobby(); });
$("#rollBtn").addEventListener("click",()=>{ ac(); humanRoll(); });
$("#bankBtn").addEventListener("click",()=>{ ac(); humanBank(); });
$("#mullBtn").addEventListener("click",useMulligan);
$("#acceptBtn").addEventListener("click",acceptFarkle);
$("#foldBtn").addEventListener("click",fold);
$("#toShop").addEventListener("click",()=>{ ac(); renderShop(); show("shop"); });
$("#shopBack").addEventListener("click",()=>{ ac(); renderLobby(); });
$("#toStats").addEventListener("click",()=>{ ac(); renderStats(); show("stats"); });
$("#statsBack").addEventListener("click",()=>{ ac(); renderLobby(); });
$("#toShark").addEventListener("click",()=>{ ac(); renderShark(); show("shark"); });
$("#sharkBack").addEventListener("click",()=>{ ac(); renderLobby(); });
$("#toCasino").addEventListener("click",()=>{ ac(); spinning=false; casGame="wheel"; bj=null; $("#wheelMsg").textContent="Pick a stake and spin."; $("#diceMsg").textContent="Pick a side, set a stake, roll two dice."; $("#bjMsg").textContent="Set a stake and deal."; renderCasino(); });
$("#casinoBack").addEventListener("click",()=>{ if(spinning)return; ac(); renderLobby(); });
$("#tabWheel").addEventListener("click",()=>{ if(spinning)return; ac(); sfx.pick(); casGame="wheel"; renderCasino(); });
$("#tabDice").addEventListener("click",()=>{ if(spinning)return; ac(); sfx.pick(); casGame="dice"; renderCasino(); });
$("#tabBlackjack").addEventListener("click",()=>{ if(spinning)return; ac(); sfx.pick(); casGame="blackjack"; bj=null; $("#bjMsg").textContent="Set a stake and deal."; renderCasino(); });
$("#moonToShard").addEventListener("click",tradeMoonToShard);
$("#shardToMoon").addEventListener("click",cashShardToMoon);
$("#wStakeUp").addEventListener("click",()=>bumpStake("wheel",1));
$("#wStakeDown").addEventListener("click",()=>bumpStake("wheel",-1));
$("#wStakeMax").addEventListener("click",()=>bumpStake("wheel","max"));
$("#dStakeUp").addEventListener("click",()=>bumpStake("dice",1));
$("#dStakeDown").addEventListener("click",()=>bumpStake("dice",-1));
$("#dStakeMax").addEventListener("click",()=>bumpStake("dice","max"));
$("#bStakeUp").addEventListener("click",()=>bumpStake("blackjack",1));
$("#bStakeDown").addEventListener("click",()=>bumpStake("blackjack",-1));
$("#bStakeMax").addEventListener("click",()=>bumpStake("blackjack","max"));
$("#wSlider").addEventListener("input",()=>casSliderInput("wheel"));
$("#dSlider").addEventListener("input",()=>casSliderInput("dice"));
$("#bSlider").addEventListener("input",()=>casSliderInput("blackjack"));
["wSlider","dSlider","bSlider"].forEach(function(id){ $("#"+id).addEventListener("change",function(){ ac(); sfx.tick(); }); });
$("#betLow").addEventListener("click",()=>{ if(spinning)return; ac(); sfx.pick(); diceBet="low"; renderCasino(); });
$("#betSeven").addEventListener("click",()=>{ if(spinning)return; ac(); sfx.pick(); diceBet="seven"; renderCasino(); });
$("#betHigh").addEventListener("click",()=>{ if(spinning)return; ac(); sfx.pick(); diceBet="high"; renderCasino(); });
$("#spinBtn").addEventListener("click",()=>{ casinoSpin(); });
$("#diceRollBtn").addEventListener("click",()=>{ casinoDice(); });
$("#buyRolls").addEventListener("click",()=>{ buyExtraRolls(); });
$("#toMarket").addEventListener("click",()=>{ ac(); mktAmt=Math.min(mktAmt||500,Math.max(0,META.chips)); renderMarket(); });
$("#toLedger").addEventListener("click",()=>{ ac(); renderLedger(); });
$("#toEmpire").addEventListener("click",()=>{ ac(); renderEmpire(); });
$("#empBack").addEventListener("click",()=>{ ac(); renderLobby(); });
$("#toLoot").addEventListener("click",()=>{ ac(); lootReveal=null; renderLoot(); });
$("#lootBack").addEventListener("click",()=>{ ac(); renderLobby(); });
$("#rerollBtn").addEventListener("click",()=>{ useReroll(); });
$("#toEstate").addEventListener("click",()=>{ ac(); renderEstate(); });
$("#estateBack").addEventListener("click",()=>{ ac(); renderLobby(); });
$("#reIns").addEventListener("click",()=>{ toggleInsurance(); });
$("#ledgerBack").addEventListener("click",()=>{ ac(); renderLobby(); });
$("#marketBack").addEventListener("click",()=>{ ac(); renderLobby(); });
(function(){ const lb=document.querySelectorAll(".levbtn"); for(let i=0;i<lb.length;i++){ (function(b){ b.addEventListener("click",function(){ setLev(+b.getAttribute("data-lev")); }); })(lb[i]); } })();
$("#mSlider").addEventListener("input",()=>{ mktAmt=(+$("#mSlider").value)||0; updateTradeAmt(false); });
$("#mSlider").addEventListener("change",()=>{ ac(); sfx.tick(); });
$("#mUp").addEventListener("click",()=>{ ac(); sfx.chip(); mktAmt=Math.min(mktAmt+MKT_STEP,Math.max(0,META.chips)); updateTradeAmt(true); });
$("#mDown").addEventListener("click",()=>{ ac(); sfx.chip(); mktAmt=Math.max(0,mktAmt-MKT_STEP); updateTradeAmt(true); });
$("#mMax").addEventListener("click",()=>{ ac(); sfx.chip(); mktAmt=Math.max(0,META.chips); updateTradeAmt(true); });
$("#bjDeal").addEventListener("click",()=>{ bjDeal(); });
$("#bjHit").addEventListener("click",()=>{ bjHit(); });
$("#bjStand").addEventListener("click",()=>{ bjStand(); });
$("#bjDouble").addEventListener("click",()=>{ bjDouble(); });
$("#donBtn").addEventListener("click",pressLuck);
$("#collectBtn").addEventListener("click",collect);
$("#toLobbyBtn").addEventListener("click",()=>{ ac(); goLobby(); });
$("#sound").addEventListener("click",()=>{ META.muted=!META.muted; $("#sound").textContent=META.muted?"🔇":"🔊"; saveProfile(); if(!META.muted){ac();tone(880,.07,"square",.12);} });

// If anything ever goes wrong, show it on screen instead of a blank page.
function showFatal(msg){
  try{ if(screenEl) screenEl.classList.remove("boot"); }catch(e){}
  let box=document.getElementById("fatal");
  if(!box){ box=document.createElement("div"); box.id="fatal";
    box.style.cssText="position:relative;z-index:99;margin:14px;padding:16px;border:2px solid #ff3b3b;border-radius:12px;background:#1a0410;color:#ffd0dd;font-family:monospace;font-size:15px;line-height:1.4";
    (screenEl||document.body).appendChild(box); }
  box.textContent="⚠ "+msg;
}
window.addEventListener("error",e=>showFatal((e&&e.message)||"script error"));
window.addEventListener("unhandledrejection",e=>showFatal("load error: "+((e&&e.reason&&e.reason.message)||e.reason||"unknown")));

(async function init(){
  try{
    META=await loadProfile();
    $("#sound").textContent=META.muted?"🔇":"🔊";
    applySkin();
    renderLobby();
    startIdle();
  }catch(err){ showFatal((err&&err.message)||String(err)); }
  setTimeout(()=>{ try{screenEl.classList.remove("boot");}catch(e){} },900);
})();
