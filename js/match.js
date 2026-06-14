/* =====================================================================
   Gameplay + CPU AI
   Turn state, rolling, banking, Hot Dice, the expected-value CPU, and the match HUD.
   Loaded as a classic <script> that shares globals with the others.
   Load order is fixed in index.html — keep it.
   ===================================================================== */
"use strict";
/* ===================== MATCH STATE ===================== */
let S=null;
function freshMatch(){
  const t=bet.table, ss=sideStake(t.ante);
  const chosen=(bet.offered||[]).filter(b=>bet.sides.has(b.id)).map(b=>({...b,stake:ss}));
  S={
    table:t, ante:t.ante, target:t.target, payMult:t.pay, sides:chosen, staked:t.ante+chosen.length*ss+((bet&&bet.jackpot)?jackpotAnte(t):0),
    scores:{you:0,cpu:0}, onBoard:{you:hasRelic("monocle")||metaLvl("board")>0,cpu:false}, current:"you",
    dice:[], kept:[], selected:new Set(), turnScore:0, phase:"idle", busy:false,
    message:"YOUR TURN — PRESS ROLL", tone:"",
    finalRound:false, finalFor:null, finalTrigger:null, winner:null,
    meta:{firstBank:null, hotYou:false, hotCountYou:0, biggestTurnYou:0, farklesYou:0, banksYou:0, youWin:false, margin:0},
    usedMull:0, usedIns:0, phoenixUsed:false, nervesUsed:false,
    jackpotIn:!!(bet&&bet.jackpot), jackpotWon:false, jackpotPaid:0, vaultPaid:0, streakBonus:null, streakBuild:0, rentPaid:0, rentVacant:"",
    startTime:Date.now(), elapsedMs:0, speedBonus:null, marginBonus:null, realtyCost:null, realtyNews:"", empireRake:0, empireMoons:0,
    armed:null, armedLeft:0, rerollLeft:0, charmNegateUsed:false,
  };
}
function placeBets(){
  const total=S? S.staked : 0;
}
let matchTimerId=null;
function fmtClock(ms){ const s=Math.max(0,Math.floor(ms/1000)); return Math.floor(s/60)+":"+("0"+(s%60)).slice(-2); }
function startMatchTimer(){ stopMatchTimer(); const el=$("#matchTime"); if(el&&S) el.textContent=fmtClock(Date.now()-S.startTime);
  matchTimerId=setInterval(function(){ const e=$("#matchTime"); if(e&&S&&!S.winner) e.textContent=fmtClock(Date.now()-S.startTime); },1000); }
function stopMatchTimer(){ if(matchTimerId){ clearInterval(matchTimerId); matchTimerId=null; } }
const selectedVals=()=>S.dice.filter(d=>S.selected.has(d.id)).map(d=>d.value);

function renderMatch(){
  const cur=S.current;
  // stakes hud
  $("#tableName").textContent=S.table.name;
  $("#potVal").textContent=fmt(Math.round(S.ante*S.payMult));
  $("#insHud").textContent="🛡️"+META.inv.insurance;
  $("#mullHud").textContent=" 🔄"+META.inv.mulligan;
  $("#betHud").innerHTML=S.sides.map(b=>`<span class="bet-tag">${b.name} ${b.mult}×</span>`).join("");
  $("#relicHud").innerHTML=META.equipped.map(id=>{const r=relicById(id);return r?`<span class="relic-tag" title="${r.name}">${r.icon}</span>`:"";}).join("");
  // scoreboard
  $("#s-you").textContent=fmt(S.scores.you); $("#s-cpu").textContent=fmt(S.scores.cpu);
  $("#goalval").textContent=fmt(S.target);
  $("#p-you").classList.toggle("active",cur==="you"&&!S.winner);
  $("#p-cpu").classList.toggle("active",cur==="cpu"&&!S.winner);
  $("#p-you").classList.toggle("on",S.onBoard.you); $("#p-cpu").classList.toggle("on",S.onBoard.cpu);
  // status
  $("#msg").textContent=S.message; $("#status").className="status"+(S.tone?" "+S.tone:"");
  // kept
  const k=$("#kept"); k.innerHTML=""; if(!S.kept.length) k.innerHTML='<span class="empty">— nothing set aside yet —</span>'; else S.kept.forEach(d=>k.appendChild(dieEl(d.value,"kept-die")));
  $("#keptcount").textContent=S.kept.length+" / 6";
  // active
  const scoreSet=new Set(scoringIds(S.dice)); const interactive=cur==="you"&&S.phase==="rolled"&&!S.busy;
  const a=$("#active"); a.innerHTML=""; if(!S.dice.length) a.innerHTML='<span class="empty">'+(S.phase==="idle"?"press ROLL to throw the dice":"")+'</span>';
  S.dice.forEach(d=>{ let cls=""; if(S.selected.has(d.id))cls="sel"; else if(interactive)cls=scoreSet.has(d.id)?"scorable":"dud";
    const el=dieEl(d.value,cls); if(interactive&&(scoreSet.has(d.id)||S.selected.has(d.id))) el.addEventListener("click",()=>toggle(d.id)); a.appendChild(el); });
  $("#hint").textContent=interactive?"▸ tap glowing dice to keep":"";
  // turn readout
  $("#turnscore").textContent=fmt(S.turnScore);
  const sv=selectedVals(), sc=evaluate(sv), se=$("#selscore");
  if(!sv.length){se.textContent="";se.className="sel";}
  else if(!sc.usedAll){se.textContent="✗ invalid pick";se.className="sel bad";}
  else{se.textContent="+ "+fmt(sc.score)+(sc.label?"  "+sc.label:"");se.className="sel";}
  // controls
  const choice=S.phase==="farkle-choice";
  $("#rollBtn").hidden=choice; $("#bankBtn").hidden=choice; $("#mullBtn").hidden=!choice; $("#acceptBtn").hidden=!choice;
  const rr=$("#rerollBtn"); if(rr){ rr.hidden=!(S.rerollLeft>0&&S.phase==="rolled"&&S.current==="you"&&!S.busy&&!S.winner); if(!rr.hidden){ rr.innerHTML="🎲 REROLL"+(S.rerollLeft>1?(" ×"+S.rerollLeft):"")+"<small>throw these again</small>"; } }
  if(choice){ $("#mullsub").textContent=META.inv.mulligan+" left"; }
  else updateButtons(sc,sv);
  renderTempTray();
}
function updateButtons(sc,sv){
  const yt=S.current==="you"&&!S.winner, valid=sv.length>0&&sc.usedAll;
  let rollOK=false,rollLabel="ROLL DICE",rollSub="throw 6 dice";
  if(yt&&!S.busy){ if(S.phase==="idle"){rollOK=true;rollSub=S.finalRound?"last turn!":"throw 6 dice";}
    else if(S.phase==="rolled"){rollOK=valid;rollLabel="ROLL AGAIN";const rem=S.dice.length-S.selected.size;rollSub=rem===0?"HOT DICE → 6":"roll "+rem+" left";}}
  $("#rollBtn").disabled=!rollOK; $("#rollBtn").firstChild.textContent=rollLabel; $("#rollsub").textContent=rollSub;
  let bankOK=false,bankSub="need 500"; const proj=S.turnScore+(valid?sc.score:0);
  if(yt&&!S.busy&&S.phase==="rolled"&&valid){const can=S.onBoard.you||proj>=MIN_BOARD;bankOK=can;bankSub=can?"collect "+fmt(proj):"need "+fmt(MIN_BOARD)+" ("+fmt(proj)+")";}
  else if(yt&&S.phase==="rolled")bankSub=S.onBoard.you?"pick dice first":"need 500";
  $("#bankBtn").disabled=!bankOK; $("#banksub").textContent=bankSub;
}
function toggle(id){ if(S.busy||S.current!=="you"||S.phase!=="rolled")return;
  if(S.selected.has(id)){S.selected.delete(id);sfx.drop();}else{S.selected.add(id);sfx.pick();} renderMatch(); }

function tumble(n,antiFarkle){ let guard=0; do{ S.dice=Array.from({length:n},newDie); }while(antiFarkle&&n>=2&&evaluate(S.dice.map(d=>d.value)).score===0&&guard++<50); S.selected.clear(); return animateDice($("#active"),S.dice.map(d=>d.value)); }
function commitSelection(){
  const sel=S.dice.filter(d=>S.selected.has(d.id)); const sc=evaluate(sel.map(d=>d.value));
  S.turnScore+=sc.score; const remaining=S.dice.length-sel.length;
  if(remaining===0){S.kept=[];return{remaining:6,hot:true};}
  sel.forEach(d=>S.kept.push(d)); S.selected.clear(); return{remaining,hot:false};
}

async function humanRoll(){
  if(S.busy||S.current!=="you")return;
  const c=armedCharm(), openProof=c&&(c.kind==="openProof"||c.kind==="turnProof"), turnProof=c&&c.kind==="turnProof";
  if(S.phase==="idle"){ S.busy=true;S.phase="rolled";S.message="ROLLING…";S.tone="";renderMatch();
    await tumble(6,hasRelic("loaded")||openProof); await afterRoll("you"); return; }
  if(S.phase==="rolled"){ const sv=selectedVals(),sc=evaluate(sv); if(!sv.length||!sc.usedAll)return; sfx.keep();
    const {remaining,hot}=commitSelection(); S.busy=true;
    if(hot){S.meta.hotYou=true;S.meta.hotCountYou=(S.meta.hotCountYou||0)+1;META.stats.hotDice++; const hb=hasRelic("hothand"); let hbonus=hb?300:0; if(c&&c.kind==="hotBonus")hbonus+=c.mag; if(hbonus>0)S.turnScore+=hbonus; saveProfile();S.tone="cpu";S.message=hbonus>0?("HOT DICE! +"+fmt(hbonus)+" BONUS — ROLL ALL SIX AGAIN!"):"HOT DICE! ALL SIX SCORE — ROLL AGAIN!";sfx.hot();renderMatch();await sleep(hbonus>0?800:650);}
    else{renderMatch();await sleep(120);}
    S.message="ROLLING…";S.tone="";renderMatch(); await tumble(remaining,turnProof); await afterRoll("you"); }
}
async function humanBank(){
  if(S.busy||S.current!=="you"||S.phase!=="rolled")return;
  const sv=selectedVals(),sc=evaluate(sv); if(!sv.length||!sc.usedAll)return;
  const proj=S.turnScore+sc.score; if(!(S.onBoard.you||proj>=MIN_BOARD))return;
  S.turnScore+=sc.score; S.selected.clear(); S.busy=true;
  const golden=hasRelic("golden"); if(golden)S.turnScore=Math.round(S.turnScore*1.2);
  const c=armedCharm(); let label=golden?"✨ GOLDEN BANK ":"YOU BANK ";
  if(c){ if(c.kind==="bankMult"){ S.turnScore=Math.round(S.turnScore*c.mag); label=c.icon+" "+c.name+" — BANK "; }
         else if(c.kind==="bankAdd"){ S.turnScore+=c.mag; label=c.icon+" "+c.name+" — BANK "; } }
  let chipBonus=0; if(c&&c.kind==="chipsOnBank"){ chipBonus=Math.round(S.turnScore*c.mag); if(chipBonus>0)META.chips+=chipBonus; }
  bankTurn("you",S.turnScore); sfx.bank(); S.tone="good";
  S.message=label+fmt(S.turnScore)+" POINTS!"+(chipBonus>0?(" +"+fmt(chipBonus)+" 🪙"):"");
  renderMatch(); await sleep(900); afterBank("you");
}
function jackpotTier(vals){ // 2 = six-of-a-kind (full pot), 1 = straight or two triplets (quarter), 0 = none
  if(vals.length!==6) return 0;
  const c={}; vals.forEach(v=>{c[v]=(c[v]||0)+1;}); const counts=Object.keys(c).map(k=>c[k]);
  if(counts.indexOf(6)>=0) return 2;
  const trips=counts.filter(x=>x===3).length;
  const straight=[1,2,3,4,5,6].every(v=>c[v]===1);
  return (straight||trips===2)?1:0;
}
function jackpotGrow(){   // progressive: ticks up a random amount every match, bounded
  const jp0=Math.max(1, META.jackpot||JACKPOT_SEED);
  const grow=Math.max(10, Math.round(jp0*(0.004+Math.random()*0.016)));   // +0.4%..+2.0%
  META.jackpotPrev=jp0;
  META.jackpot=Math.min(JACKPOT_MAX, jp0+grow);
}
function dayNum(){ const n=new Date(); return Math.floor((n.getTime()-n.getTimezoneOffset()*60000)/86400000); }
const STREAK_MIN=3;   // a streak must reach 3 win-days before it pays anything
function streakSecuredToday(){ return META.streakDay===dayNum(); }
function streakChipReward(n){ return n<STREAK_MIN?0:Math.round(500*n*(1+n/20)); }
function streakMoonReward(n){ return (n>=STREAK_MIN && n%5===0)?(1+(n>=30?2:n>=15?1:0)):0; }
function claimStreak(){   // DAILY STREAK — must WIN each calendar day to keep it; one missed day resets to 1
  const d=dayNum();
  if(META.streakDay===d) return;                                  // already credited today
  META.streakDays = (META.streakDay===d-1) ? (META.streakDays||0)+1 : 1;
  META.streakDay=d; META.streakBest=Math.max(META.streakBest||0, META.streakDays);
  const n=META.streakDays;
  if(n<STREAK_MIN){ S.streakBuild=n; return; }                    // still building — no reward yet
  const chips=streakChipReward(n), moons=streakMoonReward(n);
  META.chips+=chips; if(moons>0) META.moons+=moons;
  if(!META.boxes)META.boxes={scrap:0,vault:0}; META.boxes.scrap=(META.boxes.scrap||0)+1;   // free crate each rewarded streak day
  S.streakBonus={days:n, chips:chips, moons:moons, box:true};
}
function collectRent(){ /* replaced by realtyTick() in the real-estate module */ }
async function afterRoll(player){
  const ev=evaluate(S.dice.map(d=>d.value));
  if(player==="you" && S.jackpotIn && !S.jackpotWon){
    const tier=jackpotTier(S.dice.map(d=>d.value));
    if(tier>0){ S.jackpotWon=true;
      let win;
      if(tier===2){ win=META.jackpot; META.jackpot=JACKPOT_SEED; }
      else { win=Math.round(META.jackpot*0.25); META.jackpot=Math.max(JACKPOT_SEED, META.jackpot-win); }
      META.chips+=win; S.jackpotPaid=(S.jackpotPaid||0)+win; saveProfile();
      S.busy=true; S.tone="good"; S.message=(tier===2?"🌕 JACKPOT!!! ":"🌖 MINI-JACKPOT! ")+"+"+fmt(win)+" 🪙 FROM THE PROGRESSIVE!";
      sfx.win(); sfx.cash(); if(tier===2)sfx.moon(); screenEl.classList.add("flash"); setTimeout(()=>screenEl.classList.remove("flash"),420);
      renderMatch(); await sleep(1700);
    }
  }
  if(ev.score===0){ // FARKLE
    if(player==="you"&&hasRelic("phoenix")&&!S.phoenixUsed){
      S.phoenixUsed=true; S.busy=true; S.tone="good"; S.message="🔥 PHOENIX FEATHER — FARKLE NEGATED!"; sfx.hot(); renderMatch();
      await sleep(850); S.message="RE-ROLLING…"; renderMatch(); await tumble(S.dice.length); return afterRoll("you");
    }
    if(player==="you"&&metaLvl("nerves")>0&&!S.nervesUsed){
      S.nervesUsed=true; S.busy=true; S.tone="good"; S.message="🛡️ STEADY NERVES — FARKLE FORGIVEN!"; sfx.hot(); renderMatch();
      await sleep(850); S.message="RE-ROLLING…"; renderMatch(); await tumble(S.dice.length); return afterRoll("you");
    }
    { const cn=armedCharm(); if(player==="you"&&cn&&cn.kind==="farkleNegate"&&!S.charmNegateUsed){
      S.charmNegateUsed=true; S.busy=true; S.tone="good"; S.message=cn.icon+" "+cn.name+" — FARKLE NEGATED!"; sfx.hot(); renderMatch();
      await sleep(850); S.message="RE-ROLLING…"; renderMatch(); await tumble(S.dice.length); return afterRoll("you");
    } }
    if(player==="you"&&META.inv.mulligan>0){ S.phase="farkle-choice";S.busy=false;S.tone="bad";S.message="FARKLE! USE A MULLIGAN?";renderMatch();return; }
    resolveFarkle(player); return;
  }
  S.phase="rolled";
  if(player==="you"){S.busy=false;S.message="KEEP SCORING DICE, THEN ROLL OR BANK";S.tone="";}
  renderMatch();
}
async function resolveFarkle(player){
  if(player==="you"){ META.stats.farkles++; S.meta.farklesYou++; }
  // Charm save (armed) or insurance perk — keep a fraction of the turn's points
  const ac1=armedCharm(), tempFrac=(player==="you"&&ac1&&ac1.kind==="farkleSave"&&S.turnScore>0)?ac1.mag:0;
  const tempSafety = tempFrac>0;
  if(tempSafety || (player==="you"&&META.inv.insurance>0&&S.turnScore>0)){
    if(!tempSafety) META.inv.insurance--;
    const frac=tempSafety?tempFrac:0.5, saved=Math.floor((S.turnScore*frac)/50)*50; saveProfile();
    sfx.cash(); S.tone="good"; S.message=(tempSafety?(ac1.icon+" "+ac1.name+" — KEPT "):"🛡️ INSURANCE PAYS OUT — BANKED ")+fmt(saved); S.turnScore=0; S.busy=true;
    renderMatch(); await sleep(1500);
    if(saved>0) bankTurn("you",saved);
    afterBank("you"); return;
  }
  S.tone="bad"; const lost=S.turnScore;
  S.message=name(player)+" FARKLED! "+(lost>0?("LOST "+fmt(lost)+" POINTS"):"NO SCORE");
  sfx.farkle(); screenEl.classList.add("shake","flash"); setTimeout(()=>screenEl.classList.remove("shake","flash"),420);
  S.turnScore=0; S.busy=true; renderMatch(); await sleep(1500); nextTurn(player);
}
function armTemp(id){ if(!S||S.busy||S.current!=="you"||S.winner||S.armed||(META.temp[id]|0)<=0)return; ac();
  META.temp[id]--; S.armed=id; S.armedLeft=charmTurns(); const c=tempById(id);
  if(c){ if(c.kind==="reroll")S.rerollLeft=c.mag||1; else if(c.kind==="headStart")S.turnScore+=(c.mag||0); }
  sfx.unlock(); saveProfile(); renderMatch(); }
function reapplyCharm(){ const c=armedCharm(); if(!c)return; if(c.kind==="reroll")S.rerollLeft=c.mag||1; else if(c.kind==="headStart")S.turnScore+=(c.mag||0); }
async function useReroll(){ if(!S||S.busy||S.current!=="you"||!(S.rerollLeft>0)||S.phase!=="rolled")return; ac();
  S.rerollLeft--; S.selected.clear(); S.busy=true; S.tone=""; S.message="🎲 REROLL — REROLLING…"; renderMatch();
  await tumble(S.dice.length); await afterRoll("you"); }
function renderTempTray(){
  const tray=$("#tempTray"); if(!tray)return; const yt=S.current==="you"&&!S.winner;
  if(!yt){ tray.style.display="none"; tray.innerHTML=""; return; }
  tray.innerHTML="";
  if(S.armed){ const t=tempById(S.armed);
    const tag=document.createElement("span"); tag.className="tarm"; tag.textContent=(t?t.icon+" "+t.name:"charm")+" armed"+(S.armedLeft>1?(" · "+S.armedLeft+" turns left"):" this turn"); tray.appendChild(tag); tray.style.display=""; return; }
  let any=false;
  ["epic","rare","uncommon","common"].forEach(function(rar){
    if(typeof TEMPS==="undefined")return;
    tempsByRarity(rar).forEach(function(t){ const n=META.temp[t.id]|0; if(n<=0)return; any=true;
      const b=document.createElement("button"); b.className="ttoken"; b.style.borderColor=RARITY_COLOR[rar];
      b.innerHTML=t.icon+'<span class="tn">'+n+'</span>'; b.title=t.name+" ("+rar+") — "+t.desc;
      b.disabled=S.busy; b.addEventListener("click",function(){ armTemp(t.id); }); tray.appendChild(b); });
  });
  tray.style.display=any?"":"none";
}
function useMulligan(){ if(S.phase!=="farkle-choice"||META.inv.mulligan<=0)return; ac();
  META.inv.mulligan--; saveProfile(); const n=S.dice.length;
  S.phase="rolled"; S.busy=true; S.tone="good"; S.message="🔄 MULLIGAN! RE-ROLLING…"; renderMatch();
  (async()=>{ await sleep(500); S.message="ROLLING…"; renderMatch(); await tumble(n); await afterRoll("you"); })();
}
function acceptFarkle(){ if(S.phase!=="farkle-choice")return; ac(); S.phase="rolled"; resolveFarkle("you"); }

function bankTurn(player,points){
  S.scores[player]+=points; if(S.scores[player]>0)S.onBoard[player]=true;
  if(S.meta.firstBank===null)S.meta.firstBank=player;
  if(player==="you"){ S.meta.biggestTurnYou=Math.max(S.meta.biggestTurnYou,points); S.meta.banksYou=(S.meta.banksYou||0)+1; META.stats.biggestTurn=Math.max(META.stats.biggestTurn,points); saveProfile(); }
}
function afterBank(player){
  if(!S.finalRound&&S.scores[player]>=S.target){ S.finalRound=true;S.finalTrigger=player;S.finalFor=other(player);
    S.message=name(player)+" HITS "+fmt(S.target)+"! "+name(other(player))+" GETS ONE LAST TURN"; S.tone="cpu"; renderMatch(); }
  nextTurn(player);
}
function resetTurn(){ S.dice=[];S.kept=[];S.selected.clear();S.turnScore=0; S.rerollLeft=0; S.charmNegateUsed=false;
  if(S.current==="you"){
    if(S.armed && S.armedLeft>1){ S.armedLeft--; reapplyCharm(); }   // a persistence relic keeps the charm armed
    else { S.armed=null; S.armedLeft=0; }
  }   // on the CPU's turn the player's charm just pauses — left untouched
}
function nextTurn(justFinished){
  if(S.winner)return;
  if(S.finalRound&&justFinished===S.finalFor){ return endGame(); }
  const nxt=other(justFinished);
  setTimeout(()=>{ S.current=nxt; resetTurn(); S.phase="idle";
    if(nxt==="cpu"){S.busy=true;renderMatch();cpuTurn();}
    else{S.busy=false; S.message=S.finalRound?"YOUR LAST TURN — BEAT "+fmt(S.scores.cpu)+"! ROLL!":"YOUR TURN — PRESS ROLL"; S.tone=S.finalRound?"good":""; renderMatch();}
  },300);
}

/* ---- CPU brain ---- */
// EV-optimal bank thresholds, indexed by # dice about to be rolled.
// Roll only while at-risk turn points stay below the point where the farkle
// odds for that many dice make rolling worse than banking.
const FARKLE_THRESH=[0,50,150,350,1000,3000,99999];
function cpuDecide(turnScore,remaining){
  const total=S.scores.cpu, opp=S.scores.you, T=turnScore;
  // banking would win outright — always take it
  if(total+T>=S.target) return "bank";
  // not on the board yet: must bank 500+ in a single turn, so push to 500, then lock it in
  if(!S.onBoard.cpu) return (total+T<MIN_BOARD)?"roll":"bank";
  // final round: opponent already hit the target, so keep rolling until we pass them
  if(S.finalRound && S.finalFor==="cpu") return (total+T>opp)?"bank":"roll";
  // base expected-value threshold for this many dice
  let thr=FARKLE_THRESH[remaining]||0;
  // --- strategic context ---
  const lead=total-opp, target=S.target;
  const oppToTarget=target-opp;            // how close the human is to closing the game out
  const cpuToTarget=target-(total+T);      // how close the CPU is to winning after banking this

  // endgame desperation: human is one turn from winning and CPU trails → banking a short stack
  // just hands over the game, so go all-in and keep rolling until it either wins or busts
  if(lead<0 && oppToTarget<=Math.max(800,target*0.15)) return "roll";

  // continuous catch-up aggression: the further behind, the greedier (smoothly up to +160%)
  if(lead<0){ thr*=1+Math.min(1.6,(-lead)/2200); }
  // protecting a lead: bank sooner, and much sooner when a bank nearly clinches the win
  else if(lead>1500){ thr*= (cpuToTarget<1500)?0.5:0.7; }

  // closing instinct: when one or two good rolls would win, press hard for it
  if(cpuToTarget>0 && cpuToTarget<500 && remaining>=3) thr*=1.6;
  // protect-the-bag: ahead with only 1–2 risky dice left → lock it in rather than fish
  if(remaining<=2 && lead>=0 && cpuToTarget>500) thr*=0.75;

  return T<thr ? "roll" : "bank";
}
async function cpuTurn(){
  S.current="cpu"; resetTurn(); S.busy=true; S.tone="cpu"; S.message="CPU'S TURN…"; renderMatch(); await sleep(600);
  let toRoll=6,guard=0;
  while(guard++<40){
    S.message="CPU ROLLS "+toRoll+" "+(toRoll===1?"DIE":"DICE")+"…"; S.tone="cpu"; renderMatch(); await sleep(250);
    await tumble(toRoll); const ev=evaluate(S.dice.map(d=>d.value)); await sleep(450);
    if(ev.score===0){ S.tone="bad"; const lost=S.turnScore; S.message="CPU FARKLED! "+(lost>0?("LOST "+fmt(lost)):"NO SCORE");
      sfx.farkle(); screenEl.classList.add("shake","flash"); setTimeout(()=>screenEl.classList.remove("shake","flash"),420);
      S.turnScore=0; renderMatch(); await sleep(1500); nextTurn("cpu"); return; }
    const ids=new Set(scoringIds(S.dice)); const taken=S.dice.filter(d=>ids.has(d.id)); const gain=evaluate(taken.map(d=>d.value));
    S.selected=new Set(taken.map(d=>d.id)); S.message="CPU KEEPS +"+fmt(gain.score)+(gain.label?"  "+gain.label:""); S.tone="cpu"; renderMatch(); sfx.keep(); await sleep(800);
    const {remaining,hot}=commitSelection();
    if(hot){ S.message="CPU HITS HOT DICE! ROLLS AGAIN"; sfx.hot(); renderMatch(); await sleep(800); toRoll=6; continue; }
    const dec=cpuDecide(S.turnScore,remaining); renderMatch(); await sleep(450);
    if(dec==="bank"){ bankTurn("cpu",S.turnScore); sfx.bank(); S.tone="cpu"; S.message="CPU BANKS "+fmt(S.turnScore)+" POINTS!"; renderMatch(); await sleep(950); afterBank("cpu"); return; }
    toRoll=remaining;
  }
  nextTurn("cpu");
}
function fold(){ if(!S||S.winner)return; ac();
  if(!window.confirm("Leave the table? You forfeit the match and lose your ante."))return;
  S.winner="cpu"; endGame(true);
}
