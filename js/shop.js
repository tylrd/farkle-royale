/* =====================================================================
   Shop, stats, loan office
   Relic/perk/skin store, the rap sheet, and Vito's borrow/repay screen.
   Loaded as a classic <script> that shares globals with the others.
   Load order is fixed in index.html — keep it.
   ===================================================================== */
"use strict";
/* ===================== SHOP ===================== */
// chips per moon, scaling with your rank (BROKE → LEGEND)
const MOON_PRICE_BY_RANK=[2000,3500,6000,10000,16000,24000,35000,50000,70000];
function moonPrice(){ const i=Math.max(0,Math.min(MOON_PRICE_BY_RANK.length-1,rankIndex(worth()))); return MOON_PRICE_BY_RANK[i]; }
// Moon Vault — lock moons for a term (in games), earn chip interest, principal returned
const BANK_TERMS=[{games:3,rate:0.05},{games:6,rate:0.13},{games:12,rate:0.30}];
const BANK_UNIT_CAP=12000;                 // anti-inflation governor on a moon's chip value
function bankTotalCap(){ return 6+3*rankIndex(worth()); }     // max moons across ALL lots, scales with rank (6 → 24)
function bankUnit(){ return Math.min(moonPrice(),BANK_UNIT_CAP); }
function bankQuote(moons,termIdx){ const t=BANK_TERMS[termIdx]; return Math.round(moons*bankUnit()*t.rate); }
let bankAmt=1, bankTermIdx=1;
function lockedMoons(){ const b=META.bank; if(!Array.isArray(b))return 0; let t=0; for(let i=0;i<b.length;i++) t+=Math.max(0,b[i].moons||0); return t; }
function bankDeposit(){ ac();
  if(!Array.isArray(META.bank)) META.bank=[];
  const room=Math.max(0,bankTotalCap()-lockedMoons());
  const cap=Math.min(META.moons,room), amt=Math.max(1,Math.min(bankAmt,cap));
  if(amt<1||room<1||META.moons<amt){sfx.deny();return;}
  const t=BANK_TERMS[bankTermIdx], interest=bankQuote(amt,bankTermIdx);
  META.moons-=amt; META.bank.push({moons:amt,term:t.games,left:t.games,interest:interest,earned:0});
  sfx.unlock(); saveProfile(); renderShop(); bumpMoons(); }
function bankCollect(i){ ac(); const b=META.bank&&META.bank[i]; if(!b||b.left>0){sfx.deny();return;}
  META.moons+=b.moons; META.bank.splice(i,1); sfx.cash(); sfx.moon(); saveProfile(); renderShop(); bumpMoons(); }   // interest already paid out per round
function bankWithdraw(i){ ac(); const b=META.bank&&META.bank[i]; if(!b||b.left<=0){sfx.deny();return;}
  if(META.chips<b.earned){ sfx.deny(); return; }                                                            // must repay the interest earned so far
  META.chips-=b.earned; META.moons+=b.moons; META.bank.splice(i,1); sfx.drop(); saveProfile(); renderShop(); bumpChips(); bumpMoons(); }
function vaultLotBox(b,i){
  const matured=b.left<=0;
  const box=document.createElement("div"); box.className="vault"+(matured?" ripe":"");
  box.innerHTML='<div class="vrow"><span class="vk">Locked</span><span class="vv">'+fmt(b.moons)+' 🌙</span></div>'
    +'<div class="vrow"><span class="vk">Interest earned</span><span class="vv" style="color:var(--gold)">+'+fmt(b.earned)+' 🪙</span></div>'
    +'<div class="vrow"><span class="vk">'+(matured?"Status":"Per game · games left")+'</span><span class="vv" style="color:'+(matured?"var(--green)":"#ffb38a")+'">'+(matured?"✓ TERM DONE":("~"+fmt(Math.round(b.interest/b.term))+" 🪙 · "+b.left))+'</span></div>';
  const btn=document.createElement("button");
  if(matured){ btn.className="bigbtn play"; btn.innerHTML="COLLECT "+fmt(b.moons)+" 🌙 <small>interest paid: "+fmt(b.earned)+" 🪙</small>"; btn.addEventListener("click",function(){ bankCollect(i); }); }
  else { const canPay=META.chips>=b.earned; btn.className="bigbtn credit"; btn.disabled=!canPay;
    btn.innerHTML="WITHDRAW EARLY <small>repay "+fmt(b.earned)+" 🪙 · get "+fmt(b.moons)+" 🌙 back</small>"; btn.addEventListener("click",function(){ bankWithdraw(i); }); }
  box.appendChild(btn);
  if(!matured && META.chips<b.earned){ const w=document.createElement("div"); w.className="vnote"; w.style.color="#ff9bb5"; w.textContent="Need "+fmt(b.earned)+" 🪙 on hand to repay the interest and pull out early."; box.appendChild(w); }
  return box;
}
function renderVault(){
  const v=$("#shopVault"); v.innerHTML=""; if(!Array.isArray(META.bank)) META.bank=[];
  META.bank.forEach(function(b,i){ v.appendChild(vaultLotBox(b,i)); });          // existing lots, each independent
  const room=Math.max(0,bankTotalCap()-lockedMoons());
  if(META.moons<1){
    if(META.bank.length===0){ const n=document.createElement("div"); n.className="vault"; n.innerHTML='<div class="vnote">Earn or buy moons, then lock them here for a chip yield.</div>'; v.appendChild(n); }
    else { const n=document.createElement("div"); n.className="vault"; n.innerHTML='<div class="vnote">No spendable moons right now — acquire more to open another lot.</div>'; v.appendChild(n); }
    return;
  }
  if(room<1){ const n=document.createElement("div"); n.className="vault"; n.innerHTML='<div class="vnote">Vault at capacity — <b>'+fmt(bankTotalCap())+' 🌙</b> max locked at this rank. Collect a lot or rank up to bank more.</div>'; v.appendChild(n); return; }
  const cap=Math.min(META.moons,room); bankAmt=Math.max(1,Math.min(bankAmt,Math.max(1,cap)));
  const box=document.createElement("div"); box.className="vault";
  const hd=document.createElement("div"); hd.className="vrow"; hd.innerHTML='<span class="vk">'+(META.bank.length?"➕ New lot":"Open a lot")+'</span><span class="vv">'+fmt(lockedMoons())+' / '+fmt(bankTotalCap())+' 🌙 locked</span>'; box.appendChild(hd);
  const amtRow=document.createElement("div"); amtRow.className="vstep";
  const dn=document.createElement("button"); dn.className="stakebtn"; dn.textContent="−";
  const disp=document.createElement("div"); disp.className="stake-display"; disp.innerHTML='<span class="lab">DEPOSIT 🌙</span><span>'+bankAmt+'</span>';
  const up=document.createElement("button"); up.className="stakebtn"; up.textContent="+";
  dn.addEventListener("click",()=>{ ac(); sfx.chip(); bankAmt=Math.max(1,bankAmt-1); renderShop(); });
  up.addEventListener("click",()=>{ ac(); sfx.chip(); bankAmt=Math.min(bankAmt+1,Math.max(1,cap)); renderShop(); });
  amtRow.appendChild(dn); amtRow.appendChild(disp); amtRow.appendChild(up);
  box.appendChild(amtRow);
  const termRow=document.createElement("div"); termRow.className="vterms";
  BANK_TERMS.forEach((t,i)=>{ const tb=document.createElement("button"); tb.className="vterm"+(i===bankTermIdx?" on":"");
    tb.innerHTML=t.games+"g<small>+"+Math.round(t.rate*100)+"%</small>"; tb.addEventListener("click",()=>{ ac(); sfx.pick(); bankTermIdx=i; renderShop(); }); termRow.appendChild(tb); });
  box.appendChild(termRow);
  const quote=bankQuote(bankAmt,bankTermIdx);
  const note=document.createElement("div"); note.className="vnote";
  note.innerHTML="Lock "+bankAmt+" 🌙 for "+BANK_TERMS[bankTermIdx].games+" games, earning <b>"+fmt(quote)+" 🪙</b> total — paid out each game. Up to "+cap+" 🌙 now (no per-lot cap) · "+fmt(bankTotalCap())+" 🌙 total across lots at this rank.";
  box.appendChild(note);
  const dep=document.createElement("button"); dep.className="bigbtn play"; dep.innerHTML=META.bank.length?"LOCK IN ANOTHER LOT":"LOCK IN DEPOSIT";
  dep.addEventListener("click",bankDeposit); box.appendChild(dep);
  v.appendChild(box);
}
function renderShop(){
  renderWalletEls();
  // buy moons with chips (table currency -> relic currency), price scales with rank
  const xg=$("#shopExchange"); xg.innerHTML="";
  const price=moonPrice(), canX=META.chips>=price;
  const xi=document.createElement("div"); xi.className="shopitem exchange";
  xi.innerHTML=`<div class="ic">🌙</div>
    <div class="info"><div class="nm">BUY A MOON</div><div class="ds">Trade ${fmt(price)} 🪙 chips for 1 🌙 moon. Price rises with your rank.</div></div>`;
  const xbtn=document.createElement("button"); xbtn.className="buy"; xbtn.innerHTML=fmt(price)+" 🪙"; xbtn.disabled=!canX;
  xbtn.addEventListener("click",()=>buyMoon());
  xi.appendChild(xbtn); xg.appendChild(xi);
  renderVault();
  // relics
  const rg=$("#shopRelics"); rg.innerHTML="";
  $("#relicSlots").textContent="("+META.equipped.length+"/"+relicSlots()+" equipped)";
  renderSlotExpand();
  RELICS.forEach(r=>{
    const owned=META.relics.includes(r.id), equipped=hasRelic(r.id), can=META.moons>=r.cost, full=META.equipped.length>=relicSlots();
    const rlock = !owned && r.rank && rankIndex(worth())<r.rank;
    const item=document.createElement("div"); item.className="shopitem relic"+(equipped?" equipped":"")+(rlock?" rlock":"");
    item.innerHTML=`<div class="ic">${r.icon}</div>
      <div class="info"><div class="nm">${r.name}${equipped?'<span class="own">equipped</span>':(r.rank?'<span class="rkreq">'+RANKS[r.rank].icon+' '+RANKS[r.rank].name+'</span>':"")}</div><div class="ds">${r.desc}</div></div>`;
    const btn=document.createElement("button");
    if(equipped){ btn.className="buy equipped"; btn.textContent="UNEQUIP"; btn.addEventListener("click",()=>equipRelic(r.id)); }
    else if(owned){ const blockFull=full&&relicSlots()>1; btn.className="buy equip"; btn.textContent=blockFull?"SLOTS FULL":"EQUIP"; btn.disabled=blockFull; btn.addEventListener("click",()=>equipRelic(r.id)); }
    else if(rlock){ btn.className="buy lock"; btn.innerHTML="🔒 "+RANKS[r.rank].name; btn.disabled=true; }
    else { btn.className="buy moon"; btn.innerHTML=fmt(r.cost)+" 🌙"; btn.disabled=!can; btn.addEventListener("click",()=>buyRelic(r)); }
    item.appendChild(btn); rg.appendChild(item);
  });
  // perks
  const pg=$("#shopPerks"); pg.innerHTML="";
  PERKS.forEach(p=>{
    const can=META.chips>=p.cost; const own=META.inv[p.id]||0;
    const item=document.createElement("div"); item.className="shopitem";
    item.innerHTML=`<div class="ic">${p.icon}</div>
      <div class="info"><div class="nm">${p.name}${own?`<span class="own">×${own} owned</span>`:""}</div><div class="ds">${p.desc}</div></div>
      <button class="buy" ${can?"":"disabled"}>${fmt(p.cost)} 🪙</button>`;
    item.querySelector("button").addEventListener("click",()=>buyPerk(p));
    pg.appendChild(item);
  });
  const sg=$("#shopSkins"); sg.innerHTML="";
  SKINS.forEach(s=>{
    const owned=META.skins.includes(s.id); const equipped=META.skin===s.id; const can=META.chips>=s.cost;
    const item=document.createElement("div"); item.className="shopitem";
    item.appendChild(dieEl(5,"",s.v)); item.lastChild.classList.add("skinprev");
    const info=document.createElement("div"); info.className="info";
    info.innerHTML=`<div class="nm">${s.name}</div><div class="ds">${s.cost?fmt(s.cost)+" 🪙":"free starter set"}</div>`;
    item.appendChild(info);
    const btn=document.createElement("button");
    if(equipped){btn.className="buy equipped";btn.textContent="EQUIPPED";btn.disabled=true;}
    else if(owned){btn.className="buy equip";btn.textContent="EQUIP";btn.addEventListener("click",()=>equipSkin(s));}
    else{btn.className="buy";btn.textContent=fmt(s.cost)+" 🪙";btn.disabled=!can;btn.addEventListener("click",()=>buySkin(s));}
    item.appendChild(btn); sg.appendChild(item);
  });
}
function buyMoon(){ ac(); const price=moonPrice(); if(META.chips<price){sfx.deny();return;}
  META.chips-=price; META.moons+=1; sfx.chip(); sfx.moon(); saveProfile(); renderShop(); bumpChips(); bumpMoons(); }
function buyRelic(r){ ac(); if(META.relics.includes(r.id)){equipRelic(r.id);return;} if(r.rank&&rankIndex(worth())<r.rank){sfx.deny();return;} if(META.moons<r.cost){sfx.deny();return;}
  META.moons-=r.cost; META.relics.push(r.id); if(META.equipped.length<relicSlots())META.equipped.push(r.id);
  sfx.unlock(); saveProfile(); renderShop(); bumpMoons(); }
function equipRelic(id){ ac(); if(!META.relics.includes(id))return; const i=META.equipped.indexOf(id);
  if(i>=0){ META.equipped.splice(i,1); sfx.drop(); }
  else if(META.equipped.length>=relicSlots()){ if(relicSlots()===1){ META.equipped=[id]; sfx.keep(); } else { sfx.deny(); return; } }
  else { META.equipped.push(id); sfx.keep(); }
  saveProfile(); renderShop(); }
function buySlot(){ ac(); const u=nextSlotUpgrade(); if(!u){sfx.deny();return;}
  if(rankIndex(worth())<u.rank){ sfx.deny(); return; }
  if(META.moons<u.cost){ sfx.deny(); return; }
  META.moons-=u.cost; META.slots=(META.slots||0)+1; sfx.unlock(); sfx.moon(); saveProfile(); renderShop(); bumpMoons(); }
function renderSlotExpand(){
  const el=$("#slotExpand"); if(!el)return;
  const u=nextSlotUpgrade();
  if(!u){ el.className="slotexp maxed"; el.innerHTML='<span class="sx-t">✦ Relic slots maxed — '+MAX_SLOTS+'/'+MAX_SLOTS+'</span>'; return; }
  const ri=rankIndex(worth()), unlocked=ri>=u.rank, rname=(RANKS[u.rank]?RANKS[u.rank].icon+" "+RANKS[u.rank].name:"a higher rank");
  if(!unlocked){ el.className="slotexp locked"; el.innerHTML='<span class="sx-t">🔒 '+u.slot+(u.slot===2?"nd":"rd")+' relic slot</span><span class="sx-d">reach '+rname+' to unlock · then '+u.cost+' 🌙</span>'; return; }
  const can=META.moons>=u.cost; el.className="slotexp open"+(can?"":" cant");
  el.innerHTML='<span class="sx-t">✦ Unlock '+u.slot+(u.slot===2?"nd":"rd")+' relic slot</span>';
  const b=document.createElement("button"); b.className="sxbtn"; b.textContent=u.cost+" 🌙"; b.disabled=!can; b.addEventListener("click",buySlot); el.appendChild(b);
}
function buyPerk(p){ ac(); if(META.chips<p.cost){sfx.deny();return;} META.chips-=p.cost; META.inv[p.id]=(META.inv[p.id]||0)+1; sfx.chip(); saveProfile(); renderShop(); bumpChips(); }
function buySkin(s){ ac(); if(META.skins.includes(s.id)){equipSkin(s);return;} if(META.chips<s.cost){sfx.deny();return;}
  META.chips-=s.cost; META.skins.push(s.id); META.skin=s.id; sfx.unlock(); applySkin(); saveProfile(); renderShop(); bumpChips(); }
function equipSkin(s){ ac(); META.skin=s.id; sfx.chip(); applySkin(); saveProfile(); renderShop(); }

/* ===================== STATS ===================== */
function renderStats(){
  const s=META.stats; const wr=s.games?Math.round(100*s.wins/s.games):0;
  const ri=rankIndex(worth()), cur=RANKS[ri];
  const boxes=[
    ["DEGEN TITLE",degenTitle(),"title"],
    ["RANK",cur.icon+" "+cur.name,"wide"],
    ["BANKROLL",fmt(META.chips)+" 🪙"],["VITO'S TAB",fmt(META.debt)+" 🪙",META.debt>0?"debtbox":""],
    ["MOONS",fmt(META.moons)+" 🌙"],["RELICS",fmt(META.relics.length)+" / "+RELICS.length],
    ["LIFETIME WON",fmt(META.lifetime)+" 🪙"],["GAMES",fmt(s.games)],
    ["WIN RATE",wr+"%"],["BEST STREAK",fmt(s.bestStreak)],
    ["WINS",fmt(s.wins)],["LOSSES",fmt(s.losses)],
    ["BIGGEST POT",fmt(s.biggestPot)+" 🪙"],["BIGGEST TURN",fmt(s.biggestTurn)+" pts"],
    ["HOT DICE",fmt(s.hotDice)],["FARKLES",fmt(s.farkles)],
    ["DBL-OR-NOTHING",fmt(s.donWins)+"W / "+fmt(s.donLosses)+"L"],["CHASES",fmt(s.chaseWins||0)+"W / "+fmt(s.chaseLosses||0)+"L"],
    ["TOTAL BORROWED",fmt(s.borrowed||0)+" 🪙"],["VIG PAID VITO",fmt(s.interestPaid||0)+" 🪙"],
    ["DEEPEST IN HOCK",fmt(s.biggestDebt||0)+" 🪙"],["LOANS TAKEN",fmt(s.loansTaken||0)],
  ];
  $("#statgrid").innerHTML=boxes.map(b=>`<div class="statbox${b[2]?" "+b[2]:""}"><div class="k">${b[0]}</div><div class="v">${b[1]}</div></div>`).join("");
}

/* ===================== SHARK (loan office) ===================== */
function renderShark(){
  $("#sharkLine").textContent=SHARK_LINES[menace()];
  $("#lsChips").textContent=fmt(META.chips)+" 🪙";
  $("#lsDebt").textContent=fmt(META.debt)+" 🪙";
  const mb=Math.round(totalBorrowed()), mrow=$("#lsMarginRow"); mrow.hidden=mb<=0; if(mb>0) $("#lsMargin").textContent=fmt(mb)+" 🪙";
  $("#lsLimit").textContent=fmt(creditLimit())+" 🪙";
  $("#lsAvail").textContent=fmt(availCredit())+" 🪙";
  $("#lsVig").textContent=Math.round(VIG_RATE*100)+"%";
  const due=Math.max(0,COLLECT_AT-META.debtAge), cr=$("#lsCollectRow");
  cr.hidden=META.debt<=0;
  if(META.debt>0){ const ce=$("#lsCollect"); ce.textContent=due+(due===1?" game":" games"); ce.style.color=due<=2?"#ff5c7a":"#ffb38a"; }
  // borrow buttons scale to credit limit
  const lim=creditLimit(), av=availCredit();
  const amts=[roundC(lim*0.1),roundC(lim*0.25),roundC(lim*0.5)];
  const bw=$("#borrowBtns"); bw.innerHTML="";
  amts.forEach(a=>{ const b=document.createElement("button"); b.className="loanbtn b"; b.disabled=av<a||a<=0;
    b.innerHTML=`+${fmt(a)}<small>🪙</small>`; b.addEventListener("click",()=>{ borrow(a); renderShark(); }); bw.appendChild(b); });
  const mx=document.createElement("button"); mx.className="loanbtn b"; mx.disabled=av<=0;
  mx.innerHTML=`MAX<small>+${fmt(av)}</small>`; mx.addEventListener("click",()=>{ borrow(av); renderShark(); }); bw.appendChild(mx);
  // repay buttons
  const rw=$("#repayBtns"); rw.innerHTML="";
  const rAmts=[roundC(META.debt*0.25),roundC(META.debt*0.5)];
  rAmts.forEach(a=>{ const r=document.createElement("button"); r.className="loanbtn r"; const can=META.debt>0&&META.chips>0&&a>0;
    r.disabled=!can; r.innerHTML=`−${fmt(Math.min(a,META.debt,META.chips))}<small>🪙</small>`; r.addEventListener("click",()=>{ repay(a); renderShark(); }); rw.appendChild(r); });
  const all=document.createElement("button"); all.className="loanbtn r"; const allAmt=Math.min(META.debt,META.chips);
  all.disabled=allAmt<=0; all.innerHTML=`PAY ALL<small>−${fmt(allAmt)}</small>`; all.addEventListener("click",()=>{ repay(META.debt); renderShark(); }); rw.appendChild(all);
}
