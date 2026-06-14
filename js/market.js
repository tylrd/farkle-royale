/* =====================================================================
   The Exchange
   Chip market — mean-reverting assets, buy low / sell high.
   Loaded as a classic <script> that shares globals with the others.
   Load order is fixed in index.html — keep it.
   ===================================================================== */
"use strict";
/* ===================== MARKET (the exchange) ===================== */
// Trade chips on mean-reverting assets. Ticks once per match. 4% spread = the house cut.
const ASSETS=[
  {id:"house",name:"HOUSE",   icon:"🏛️",base:1000,vol:0.05,k:0.15},
  {id:"moonf",name:"MOON FUT",icon:"🌙",base:2000,vol:0.11,k:0.12},
  {id:"luck", name:"LUCK COIN",icon:"🎲",base:500, vol:0.20,k:0.10},
];
const SPREAD=0.04, MKT_STEP=50;
const LEVS=[1,2,3,5], MARGIN_RATE=0.04, MAINT=0.10;  // margin interest/tick, maintenance margin
let mktAmt=500, lev=1;
function totalBorrowed(){ const M=META.market; if(!M||!M.holds)return 0; let t=0; ASSETS.forEach(function(a){ const h=M.holds[a.id]; if(h&&h.borrowed>0)t+=h.borrowed; }); return t; }
function marginRoom(){ return availCredit(); }   // same single credit pool as the loan office
function assetById(id){ return ASSETS.filter(a=>a.id===id)[0]; }
function ensureMarket(){
  let M=META.market;
  if(!M||typeof M!=="object"){ M={tick:0,news:"The floor just opened.",assets:{},holds:{}}; META.market=M; }
  if(!M.assets||typeof M.assets!=="object") M.assets={};
  if(!M.holds||typeof M.holds!=="object") M.holds={};
  let healed=false;
  ASSETS.forEach(function(a){
    let s=M.assets[a.id];
    if(!s||typeof s!=="object"||!(s.price>0)){ s={price:a.base,prev:a.base,hist:[a.base]}; M.assets[a.id]=s; }
    if(!Array.isArray(s.hist)||!s.hist.length) s.hist=[s.price||a.base];
    if(!(s.prev>0)) s.prev=s.price;
    if(!M.holds[a.id]||typeof M.holds[a.id]!=="object") M.holds[a.id]={shares:0,cost:0,borrowed:0};
    const h=M.holds[a.id];
    if(!(h.borrowed>=0)) h.borrowed=0;
    if(!(h.shares>0)){ h.shares=0; if(h.cost>0){ META.chips+=Math.round(h.cost); healed=true; } h.cost=0; h.borrowed=0; }  // heal chips lost to the old orphan bug
    if(!(h.cost>=0)) h.cost=0;
  });
  if(healed) saveProfile();
  return M;
}
function buyPrice(id){ return ensureMarket().assets[id].price*(1+SPREAD/2); }
function sellPrice(id){ return ensureMarket().assets[id].price*(1-SPREAD/2); }
function posValue(id){ const M=ensureMarket(); return M.holds[id].shares*sellPrice(id); }
function marketHeadline(name,boom){
  const up=["📈 "+name+" rips higher — whales piling in!","📈 A hot streak lifts "+name+"!","📈 "+name+" spikes on word of a fixed table."];
  const dn=["📉 "+name+" tanks — a raid spooked the floor.","📉 Bad-beat panic sinks "+name+"!","📉 "+name+" craters as Vito calls in markers."];
  const arr=boom?up:dn; return arr[Math.random()*arr.length|0];
}
function marketTick(){
  const M=ensureMarket(); M.tick=(M.tick||0)+1;
  let evt=null, boom=false;
  if(Math.random()<0.12){ evt=ASSETS[Math.random()*ASSETS.length|0]; boom=Math.random()<0.5; M.news=marketHeadline(evt.name,boom); }
  ASSETS.forEach(function(a){ const s=M.assets[a.id];
    const eps=(Math.random()+Math.random()+Math.random()-1.5);
    const shock=(evt&&evt.id===a.id)?((boom?0.25:-0.25)*a.base):0;
    let p=s.price + a.k*(a.base-s.price) + a.vol*a.base*eps + shock;
    p=Math.max(0.15*a.base, Math.min(4*a.base, p));
    s.prev=s.price; s.price=Math.round(p); s.hist.push(s.price); if(s.hist.length>24)s.hist.shift();
  });
  let liq="";   // carry cost on margin, then liquidate anything underwater
  ASSETS.forEach(function(a){ const h=M.holds[a.id]; if(!(h.borrowed>0))return;
    h.borrowed=Math.round(h.borrowed*(1+MARGIN_RATE));
    const pv=h.shares*M.assets[a.id].price*(1-SPREAD/2);
    if(pv<=h.borrowed/(1-MAINT)){                       // margin call — force-close
      const proceeds=Math.round(pv), gap=Math.round(h.borrowed)-proceeds;
      if(gap>0){ META.debt+=gap; if(META.debtAge<1)META.debtAge=1; }
      h.shares=0; h.cost=0; h.borrowed=0;
      liq="💥 MARGIN CALL — "+a.name+" liquidated by Vito!";
    }
  });
  if(liq) M.news=liq;
  saveProfile();
}
function renderTicker(){
  const el=$("#tkInner"); if(!el)return;
  const M=ensureMarket(); ensureRealty(); const items=[];
  ASSETS.forEach(function(a){ const s=M.assets[a.id]; const chg=s.prev>0?((s.price-s.prev)/s.prev*100):0; const up=chg>=0;
    items.push('<span class="tkit">'+a.icon+' '+a.name+' <b>'+fmt(Math.round(s.price))+'</b> 🪙 <span class="'+(up?"tkup":"tkdn")+'">'+(up?"▲":"▼")+Math.abs(chg).toFixed(1)+'%</span></span>'); });
  if(M.news) items.push('<span class="tkit tknews">📰 '+M.news+'</span>');
  const owned=Object.keys(META.props||{}).filter(function(k){return (META.props[k]||0)>0;}).length;
  if(owned>0){ const pv=rePortfolioRaw(); items.push('<span class="tkit">🏠 PROPERTY <b>'+fmt(pv)+'</b> 🪙 · '+owned+' lot'+(owned>1?'s':'')+'</span>'); }
  if(META.realty&&META.realty.news) items.push('<span class="tkit tknews">🏘️ '+META.realty.news+'</span>');
  const run=items.join('<span class="tksep">◆</span>');
  el.innerHTML=run+'<span class="tksep">◆</span>'+run;   // doubled for a seamless loop
}
function sparkline(hist,up){ const w=120,h=30,n=hist.length; if(n<2)return "";
  const mn=Math.min.apply(null,hist), mx=Math.max.apply(null,hist), rng=(mx-mn)||1;
  const pts=hist.map(function(v,i){ const x=(i/(n-1))*w, y=h-((v-mn)/rng)*h; return x.toFixed(1)+","+y.toFixed(1); }).join(" ");
  return '<svg class="spark" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none"><polyline points="'+pts+'" fill="none" stroke="'+(up?"#39d98a":"#e0466a")+'" stroke-width="2"/></svg>';
}
function buyAsset(id){ ac(); ensureMarket(); const M=META.market; const equity=Math.min(mktAmt,META.chips);
  if(equity<1){ sfx.deny(); return; }
  let borrow=Math.round(equity*(lev-1)); const room=marginRoom(); if(borrow>room) borrow=room;  // Vito only lends within your credit
  const notional=equity+borrow, bp=M.assets[id].price*(1+SPREAD/2), h=M.holds[id];
  h.shares+=notional/bp; h.cost+=equity; h.borrowed+=borrow; META.chips-=equity;  // cost tracks YOUR money; borrowed is Vito's
  sfx.chip(); saveProfile(); renderMarket(); bumpChips(); }
function sellAsset(id){ ac(); ensureMarket(); const M=META.market; const h=M.holds[id];
  if(h.shares<=0){ sfx.deny(); return; }
  const sp=M.assets[id].price*(1-SPREAD/2), proceeds=Math.round(h.shares*sp);
  const back=proceeds-Math.round(h.borrowed);                 // repay Vito's loan first
  if(back>=0) META.chips+=back; else { META.debt+=(-back); if(META.debtAge<1)META.debtAge=1; }
  h.shares=0; h.cost=0; h.borrowed=0;
  sfx.cash(); saveProfile(); renderMarket(); bumpChips(); }
function updateTradeAmt(syncSlider){   // light update during drag/nudge — no card rebuild
  const max=Math.max(0,META.chips);
  mktAmt=Math.max(0,Math.min(mktAmt,max));
  const amtEl=$("#mAmt"); if(amtEl) amtEl.textContent=fmt(mktAmt);
  const sl=$("#mSlider"); if(sl){ sl.max=max; sl.step=MKT_STEP; sl.disabled=max<1; if(syncSlider!==false) sl.value=mktAmt; }
  const buys=document.querySelectorAll(".mbtn.buy");
  for(let i=0;i<buys.length;i++){ buys[i].innerHTML=buyLabel(); buys[i].disabled=META.chips<1||mktAmt<1; }
}
function renderMarket(){
  const M=ensureMarket();
  $("#mktChips").textContent=fmt(META.chips);
  let port=0; ASSETS.forEach(function(a){ port+=posValue(a.id); }); $("#mktPort").textContent=fmt(Math.round(port));
  $("#mktNews").textContent=M.news||"The floor is quiet.";
  mktAmt=Math.max(0,Math.min(mktAmt,Math.max(0,META.chips)));
  $("#mAmt").textContent=fmt(mktAmt);
  const sl=$("#mSlider"); if(sl){ sl.max=Math.max(0,META.chips); sl.step=MKT_STEP; sl.disabled=META.chips<1; sl.value=mktAmt; }
  const room=marginRoom();
  const lb=document.querySelectorAll(".levbtn"); for(let i=0;i<lb.length;i++){ lb[i].classList.toggle("on",(+lb[i].getAttribute("data-lev"))===lev); }
  const rm=$("#mRoom"); if(rm){ rm.innerHTML = room>0 ? ("Margin available from Vito: "+fmt(room)+" 🪙") : '<span class="warn">No margin available — pay down Vito to borrow</span>'; }
  const wrap=$("#mktAssets"); wrap.innerHTML="";
  ASSETS.forEach(function(a){ const s=M.assets[a.id], h=M.holds[a.id];
    const chg=s.prev>0?((s.price-s.prev)/s.prev*100):0;
    const val=Math.round(posValue(a.id));
    const up=s.hist[s.hist.length-1]>=s.hist[0];
    let posHtml;
    if(h.shares>0){
      if(h.borrowed>0){
        const eq=Math.round(val-h.borrowed), pnl=eq-Math.round(h.cost);
        const liq=h.borrowed/((1-MAINT)*(1-SPREAD/2)*h.shares), danger=s.price<=liq*1.15;
        posHtml='Equity <b>'+fmt(Math.max(0,eq))+' 🪙</b> · P&amp;L <span class="'+(pnl>=0?"pos":"neg")+'">'+(pnl>=0?"+":"")+fmt(pnl)+'</span>'
          +'<br><span class="msub'+(danger?" neg":"")+'">borrowed '+fmt(Math.round(h.borrowed))+' · liq @ '+fmt(Math.round(liq))+(danger?" ⚠️":"")+'</span>';
      } else {
        const pnl=val-Math.round(h.cost);
        posHtml='Holding <b>'+fmt(val)+' 🪙</b> · P&amp;L <span class="'+(pnl>=0?"pos":"neg")+'">'+(pnl>=0?"+":"")+fmt(pnl)+'</span>';
      }
    } else posHtml='<span style="color:var(--dim)">No position</span>';
    const card=document.createElement("div"); card.className="mcard";
    card.innerHTML='<div class="mtop"><span class="mname">'+a.icon+' '+a.name+'</span>'
      +'<span class="mprice">'+fmt(Math.round(s.price))+' 🪙 <span class="mchg '+(chg>=0?"up":"down")+'">'+(chg>=0?"▲":"▼")+Math.abs(chg).toFixed(1)+'%</span></span></div>'
      +sparkline(s.hist,up)
      +'<div class="mpos">'+posHtml+'</div>';
    const btns=document.createElement("div"); btns.className="mbtns";
    const buy=document.createElement("button"); buy.className="mbtn buy"; buy.innerHTML=buyLabel(); buy.disabled=META.chips<1||mktAmt<1; buy.addEventListener("click",function(){ buyAsset(a.id); });
    const sell=document.createElement("button"); sell.className="mbtn sell"; sell.innerHTML=h.borrowed>0?"CLOSE":"SELL ALL"; sell.disabled=h.shares<=0; sell.addEventListener("click",function(){ sellAsset(a.id); });
    btns.appendChild(buy); btns.appendChild(sell); card.appendChild(btns); wrap.appendChild(card);
  });
  show("market");
}
function buyLabel(){ return lev>1 ? ("BUY "+lev+"× · "+fmt(mktAmt)) : ("BUY "+fmt(mktAmt)); }
function setLev(L){ ac(); sfx.chip(); lev=L; const lb=document.querySelectorAll(".levbtn"); for(let i=0;i<lb.length;i++){ lb[i].classList.toggle("on",(+lb[i].getAttribute("data-lev"))===L); } updateTradeAmt(true); }

function lgRow(k,v,cls){ return '<div class="lrow"><span class="k">'+k+'</span><span class="v'+(cls?" "+cls:"")+'">'+v+'</span></div>'; }
function lgPanel(title,rows){ return '<div class="lgpanel"><div class="lghead">'+title+'</div>'+rows+'</div>'; }
function renderLedger(){
  const w=worth(), ri=rankIndex(w), cur=RANKS[ri], nx=nextRank(w);
  let s="";
  s+=lgPanel("NET WORTH & RANK",
      lgRow("Rank", cur.icon+" "+cur.name)
    + lgRow("Net worth", fmt(w)+" 🪙","gold")
    + (nx? lgRow("Next rank", nx.icon+" "+nx.name) + lgRow("To go", fmt(Math.max(0,nx.min-w))+" 🪙","sub") : lgRow("Status","👑 top rank")) );
  s+=lgPanel("WALLET",
      lgRow("Chips", fmt(META.chips)+" 🪙","gold")
    + lgRow("Moons — spendable", fmt(META.moons)+" 🌙")
    + lgRow("Moons — locked", fmt(lockedMoons())+" 🌙","sub")
    + lgRow("Shards", fmt(META.shards)+" ✦") );
  const lim=creditLimit(), mb=Math.round(totalBorrowed()), av=availCredit();
  s+=lgPanel("VITO · CREDIT POOL",
      lgRow("Credit limit", fmt(lim)+" 🪙")
    + lgRow("Cash debt", fmt(META.debt)+" 🪙", META.debt>0?"tab":"sub")
    + lgRow("Margin in use", fmt(mb)+" 🪙", mb>0?"tab":"sub")
    + lgRow("Available", fmt(av)+" 🪙","credit")
    + lgRow("Vig per game", Math.round(VIG_RATE*100)+"%","sub")
    + (META.debt>0? lgRow("Collection in", Math.max(0,COLLECT_AT-META.debtAge)+" games","tab"):"") );
  if(Array.isArray(META.bank)&&META.bank.length){
    let rows="", totRem=0;
    META.bank.forEach(function(b,i){ totRem+=Math.max(0,b.interest-b.earned);
      rows+=lgRow("Lot "+(i+1)+" — "+b.moons+"🌙 · "+b.term+"g", (b.left<=0?"✓ ripe":(b.left+" left"))+" · +"+fmt(b.earned)+"/"+fmt(b.interest)+" 🪙"); });
    rows+=lgRow("Total locked", fmt(lockedMoons())+" / "+fmt(bankTotalCap())+" 🌙");
    rows+=lgRow("Interest still to drip", fmt(totRem)+" 🪙","gold");
    s+=lgPanel("MOON VAULT", rows);
  }
  ensureMarket(); const M=META.market; let port=0, prows="", anyPos=false;
  ASSETS.forEach(function(a){ const h=M.holds[a.id], val=posValue(a.id); port+=val;
    if(h.shares>0){ anyPos=true; const eq=val-h.borrowed, levx=eq>0?(val/eq):0, pnl=Math.round(eq-h.cost);
      prows+=lgRow(a.icon+" "+a.name+(h.borrowed>0?(" · "+levx.toFixed(1)+"×"):""), fmt(Math.round(val))+" 🪙");
      if(h.borrowed>0){ const liq=h.borrowed/((1-MAINT)*(1-SPREAD/2)*h.shares);
        prows+=lgRow("↳ equity "+fmt(Math.round(Math.max(0,eq)))+" · debt "+fmt(Math.round(h.borrowed)), "liq @ "+fmt(Math.round(liq)),"sub"); }
      prows+=lgRow("↳ P&L", (pnl>=0?"+":"")+fmt(pnl)+" 🪙", pnl>=0?"credit":"tab");
    }
  });
  let px="";
  ASSETS.forEach(function(a){ const so=M.assets[a.id], chg=so.prev>0?((so.price-so.prev)/so.prev*100):0;
    px+=lgRow(a.icon+" "+a.name, fmt(Math.round(so.price))+" 🪙 ("+(chg>=0?"+":"")+chg.toFixed(1)+"%)", chg>=0?"credit":"tab"); });
  s+=lgPanel("MARKET PRICES", px);
  s+=lgPanel("YOUR POSITIONS", (anyPos?prows:lgRow("—","no open positions","sub"))
    + lgRow("Portfolio value", fmt(Math.round(port))+" 🪙","gold")
    + lgRow("Total borrowed", fmt(mb)+" 🪙", mb>0?"tab":"sub") );
  const jpct=(META.jackpotPrev>0)?((META.jackpot-META.jackpotPrev)/META.jackpotPrev*100):0;
  s+=lgPanel("DAILY STREAK",
      lgRow("Current streak", (META.streakDays||0)+" days"+(streakSecuredToday()?" ✓":""), (META.streakDays>0?"credit":"sub"))
    + lgRow("Best ever", (META.streakBest||0)+" days","sub")
    + (function(){ const nn=(META.streakDays||0)+1, nr=streakChipReward(nn), mr=streakMoonReward(nn);
        return lgRow("Next win", nr>0?("+"+fmt(nr)+" 🪙"+(mr?(" +"+mr+" 🌙"):"")+" · 📦"):("building "+nn+"/"+STREAK_MIN),"gold"); })() );
  let reRows="", anyP=false;
  PROPERTIES.forEach(function(p){ const c=propCount(p.id); if(c>0){ anyP=true;
    reRows+=lgRow(p.icon+" "+p.name+" ×"+c, fmt(propVal(p.id))+" 🪙 ea · ~"+fmt(Math.round(c*reRentOf(p)*(1-p.vac)))+"/match"); } });
  if(anyP){ reRows+=lgRow("Net rent / match", "~"+fmt(reExpectedRent())+" 🪙","gold")
      + lgRow("Resale value", fmt(rePortfolio())+" 🪙","sub")
      + lgRow("Insurance", META.realty&&META.realty.ins?"🛡️ ON":"off", META.realty&&META.realty.ins?"credit":"sub");
    s+=lgPanel("REAL ESTATE", reRows); }
  let cr=""; TEMPS.forEach(function(t){ const n=META.temp[t.id]|0; if(n>0) cr+=lgRow(t.icon+" "+t.name, "×"+n,"credit"); });
  const bx=(META.boxes?(META.boxes.scrap||0)+(META.boxes.vault||0):0);
  if(cr||bx>0){ if(bx>0) cr+=lgRow("Unopened boxes", "×"+bx,"sub"); s+=lgPanel("CHARMS & BOXES", cr||lgRow("—","none","sub")); }
  { const ownedV=VENUES.filter(function(v){return venueLevel(v.id)>0;});
    if(houseOwned()||ownedV.length){ let er=lgRow("Status", houseOwned()?"👑 THE HOUSE":(ownedV.length+"/"+VENUES.length+" venues"), houseOwned()?"gold":"credit");
      ownedV.forEach(function(v){ er+=lgRow(v.icon+" "+v.name, "LVL "+venueLevel(v.id)+" · "+fmt(venueRake(v))+" 🪙/m","sub"); });
      er+=lgRow("House income", fmt(empireRakeChips())+" 🪙/match","gold");
      s+=lgPanel("THE EMPIRE", er); } }
  s+=lgPanel("PROGRESSIVE JACKPOT", lgRow("Current pot", fmt(META.jackpot)+" 🪙","gold")
    + lgRow("Last tick", (jpct>=0?"▲":"▼")+Math.abs(jpct).toFixed(1)+"%", jpct>=0?"credit":"tab")
    + lgRow("Ceiling", fmt(JACKPOT_MAX)+" 🪙","sub"));
  $("#ledger").innerHTML=s;
  show("ledger");
}
