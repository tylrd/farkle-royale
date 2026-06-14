/* =====================================================================
   Real estate
   Buy properties for passive rent each match, with vacancy risk.
   Loaded as a classic <script> that shares globals with the others.
   Load order is fixed in index.html — keep it.
   ===================================================================== */
"use strict";
/* ===================== REAL ESTATE (property) ===================== */
// Buy property with chips; each owned building pays rent every match, with a per-match vacancy risk.
// Property VALUE drifts each match (a housing market) — buy dips, sell booms. Rent scales with value;
// property tax + optional insurance are carrying costs; random disasters can strike what you own.
const PROPERTIES=[
  {id:"studio",name:"STUDIO FLAT",     icon:"🏚️",cost:5000,   rent:130, vac:0.10, rank:0},
  {id:"row",   name:"ROW HOUSE",       icon:"🏠", cost:15000,  rent:400, vac:0.12, rank:1},
  {id:"block", name:"APARTMENT BLOCK", icon:"🏢", cost:45000,  rent:1250,vac:0.15, rank:3},
  {id:"strip", name:"CASINO STRIP LOT",icon:"🎰", cost:120000, rent:3600,vac:0.18, rank:5},
  {id:"tower", name:"PENTHOUSE TOWER", icon:"🌆", cost:300000, rent:9500,vac:0.20, rank:6},
];
const SELL_FEE=0.08, TAX_RATE=0.004, INS_RATE=0.003, INS_MITIGATE=0.2;   // sell spread, property tax/match, insurance premium/match, disaster mitigation
function ensureRealty(){ let r=META.realty; if(!r||typeof r!=="object"){ r={val:{},ins:false,news:""}; META.realty=r; }
  if(!r.val||typeof r.val!=="object") r.val={};
  PROPERTIES.forEach(function(p){ if(!(r.val[p.id]>0)) r.val[p.id]=p.cost; }); return r; }
function propCount(id){ return (META.props&&META.props[id])|0; }
function propVal(id){ return ensureRealty().val[id]; }
function propBuy(id){ return Math.round(propVal(id)); }
function propSell(id){ return Math.round(propVal(id)*(1-SELL_FEE)); }
function reRentOf(p){ return Math.round(p.rent*(propVal(p.id)/p.cost)); }   // rent scales with current market value
function rePortfolioRaw(){ let v=0; PROPERTIES.forEach(function(p){ v+=propCount(p.id)*propVal(p.id); }); return v; }
function rePortfolio(){ let v=0; PROPERTIES.forEach(function(p){ v+=propCount(p.id)*propSell(p.id); }); return v; }
function reExpectedRent(){ ensureRealty(); let r=0; PROPERTIES.forEach(function(p){ r+=propCount(p.id)*reRentOf(p)*(1-p.vac); });
  const pv=rePortfolioRaw(); return Math.round(r - pv*TAX_RATE - (META.realty.ins?pv*INS_RATE:0)); }   // NET of carrying cost
function reDriftAndEvent(){    // housing market moves each match: mean-revert + volatility + a chance of a big event
  const r=ensureRealty();
  PROPERTIES.forEach(function(p){ const v=r.val[p.id], eps=(Math.random()+Math.random()+Math.random()-1.5);
    r.val[p.id]=Math.round(Math.max(0.3*p.cost,Math.min(2.5*p.cost, v+0.12*(p.cost-v)+0.06*p.cost*eps))); });
  let news="", repair=0;
  if(Math.random()<0.22){ const p=PROPERTIES[Math.random()*PROPERTIES.length|0], v=r.val[p.id], own=propCount(p.id)>0, roll=Math.random();
    const cl=function(x){ return Math.round(Math.max(0.3*p.cost,Math.min(2.5*p.cost,x))); };
    if(roll<0.27){ r.val[p.id]=cl(v*1.22); news="📈 "+p.name+" district is booming — values jump!"; }
    else if(roll<0.50){ r.val[p.id]=cl(v*1.14); news="✨ "+p.name+" is gentrifying — values rise."; }
    else if(roll<0.78){ r.val[p.id]=cl(v*0.80); news="📉 "+p.name+" market slumps — values fall."; }
    else { r.val[p.id]=cl(v*0.90);
      if(own){ repair=Math.round(v*0.25*propCount(p.id)); if(r.ins) repair=Math.round(repair*INS_MITIGATE);
        news="🔥 Disaster at your "+p.name+"! Repairs "+(r.ins?"(insured) ":"")+"cost "+fmt(repair); }
      else news="🔥 A "+p.name+" burns down across town."; }
  }
  r.news=news; return {repair:repair};
}
function realtyTick(){   // once per match, from endGame
  ensureRealty(); const ev=reDriftAndEvent();
  let rent=0; const vac=[];
  PROPERTIES.forEach(function(p){ const c=propCount(p.id); if(c<=0)return;
    if(Math.random()<p.vac) vac.push(p.icon); else rent+=c*reRentOf(p); });
  const pv=rePortfolioRaw(), tax=Math.round(pv*TAX_RATE), prem=META.realty.ins?Math.round(pv*INS_RATE):0;
  if(rent>0){ META.chips+=rent; S.rentPaid=rent; }
  const cost=tax+prem+ev.repair;
  if(cost>0){ META.chips=Math.max(0,META.chips-cost); S.realtyCost={tax:tax,prem:prem,repair:ev.repair}; }
  if(vac.length) S.rentVacant=vac.join(" ");
  if(META.realty.news) S.realtyNews=META.realty.news;
}
function buyProp(id){ ac(); const p=PROPERTIES.filter(function(x){return x.id===id;})[0]; if(!p) return; ensureRealty();
  const price=propBuy(id);
  if(rankIndex(worth())<p.rank){ sfx.deny(); return; }
  if(META.chips<price){ sfx.deny(); return; }
  META.chips-=price; if(!META.props)META.props={}; META.props[id]=propCount(id)+1;
  sfx.chip(); saveProfile(); renderEstate(); bumpChips(); }
function sellProp(id){ ac(); if(propCount(id)<=0){ sfx.deny(); return; }
  const back=propSell(id);
  META.props[id]=propCount(id)-1; if(META.props[id]<=0) delete META.props[id];
  META.chips+=back; sfx.cash(); saveProfile(); renderEstate(); bumpChips(); }
function toggleInsurance(){ ac(); ensureRealty(); META.realty.ins=!META.realty.ins; sfx.pick(); saveProfile(); renderEstate(); }
function renderEstate(){
  ensureRealty();
  $("#reChips").textContent=fmt(META.chips);
  const net=reExpectedRent(); $("#reRent").textContent=(net<0?"−":"~")+fmt(Math.abs(net));
  const nv=$("#reNews"); if(nv) nv.textContent=META.realty.news||"The housing market is quiet.";
  const pv=rePortfolioRaw(), ib=$("#reIns");
  if(ib){ ib.className="bigbtn "+(META.realty.ins?"play":"credit");
    ib.innerHTML=(META.realty.ins?"🛡️ INSURED":"🛡️ INSURE PROPERTY")+"<small>"+(META.realty.ins?("premium ~"+fmt(Math.round(pv*INS_RATE))+" 🪙/match · disasters −80%"):("cover disasters · ~"+fmt(Math.round(pv*INS_RATE))+" 🪙/match"))+"</small>";
    ib.disabled=(pv<=0&&!META.realty.ins); }
  const wrap=$("#reList"); wrap.innerHTML=""; const ri=rankIndex(worth());
  PROPERTIES.forEach(function(p){ const c=propCount(p.id), locked=ri<p.rank, val=propVal(p.id), price=propBuy(p.id), canBuy=!locked&&META.chips>=price, dv=(val-p.cost)/p.cost*100;
    const card=document.createElement("div"); card.className="recard"+(c>0?" owned":"")+(locked?" locked":"");
    card.innerHTML='<div class="retop"><span class="rename">'+p.icon+' '+p.name+'</span><span class="reown">'+(c>0?("×"+c):"")+'</span></div>'
      +'<div class="resub">Value '+fmt(val)+' 🪙 <span class="'+(dv>=0?"reup":"redn")+'">'+(dv>=0?"▲":"▼")+Math.abs(dv).toFixed(0)+'%</span> · rent '+fmt(reRentOf(p))+'/match · '+Math.round(p.vac*100)+'% vacancy'+(locked?(' · 🔒 '+RANKS[p.rank].name):'')+'</div>'
      +(c>0?('<div class="resub own">Owning '+c+' · ~'+fmt(Math.round(c*reRentOf(p)*(1-p.vac)))+' 🪙/match · resale '+fmt(propSell(p.id))+' each</div>'):'');
    const btns=document.createElement("div"); btns.className="rebtns";
    const buy=document.createElement("button"); buy.className="rebtn buy"; buy.innerHTML=locked?("🔒 "+RANKS[p.rank].name):("BUY "+fmt(price)); buy.disabled=!canBuy; buy.addEventListener("click",function(){ buyProp(p.id); });
    const sell=document.createElement("button"); sell.className="rebtn sell"; sell.innerHTML="SELL "+fmt(propSell(p.id)); sell.disabled=c<=0; sell.addEventListener("click",function(){ sellProp(p.id); });
    btns.appendChild(buy); btns.appendChild(sell); card.appendChild(btns); wrap.appendChild(card);
  });
  show("estate");
}
