/* =====================================================================
   Saved profile + persistence
   Global META profile, tiered storage (Claude → localStorage → memory), load/save/merge.
   Loaded as a classic <script> that shares globals with the others.
   Load order is fixed in index.html — keep it.
   ===================================================================== */
"use strict";
/* ===================== persistence (works in Claude AND standalone browsers) ===================== */
const KEY="farkle_royale_profile";
let META=null;
// Tiered storage: 1) Claude artifact window.storage (async), 2) localStorage (standalone browser),
// 3) in-memory. Every access is guarded so Safari's file:// SecurityError can never break the game.
const STORE=(function(){
  try{ if(typeof window!=="undefined" && window.storage){
    return { kind:"artifact",
      async get(){ try{ const r=await window.storage.get(KEY); return (r&&r.value)?r.value:null; }catch(e){ return null; } },
      set(v){ try{ var p=window.storage.set(KEY,v); if(p&&typeof p.then==="function") p.then(null,function(){}); }catch(e){} } };
  }}catch(e){}
  try{ const t="__farkle_test__"; window.localStorage.setItem(t,"1"); window.localStorage.removeItem(t);
    return { kind:"local",
      async get(){ try{ return window.localStorage.getItem(KEY); }catch(e){ return null; } },
      set(v){ try{ window.localStorage.setItem(KEY,v); }catch(e){} } };
  }catch(e){}
  let mem=null;
  return { kind:"memory", async get(){ return mem; }, set(v){ mem=v; } };
})();
function defaults(){return{v:1,chips:500,lifetime:0, debt:0, debtAge:0, moons:3, shards:0, jackpot:JACKPOT_SEED, jackpotPrev:JACKPOT_SEED, relics:[], equipped:[], rankRewarded:0,
  stats:{games:0,wins:0,losses:0,biggestPot:0,biggestTurn:0,hotDice:0,farkles:0,streak:0,bestStreak:0,donWins:0,donLosses:0,
    borrowed:0,interestPaid:0,biggestDebt:0,loansTaken:0,chaseWins:0,chaseLosses:0,moonsFound:0},
  inv:{insurance:0,mulligan:0}, slots:0, skins:["ivory"], skin:"ivory", muted:false, bailouts:0, bank:[], market:null, props:{}, realty:{val:{},ins:false,news:""}, temp:{}, boxes:{scrap:0,vault:0}, empire:{venues:{alley:0,parlor:0,lounge:0,pent:0,whale:0},house:false,matches:0}, idle:{gens:{},ups:{},stars:0,starsEarned:0,life:0,last:0}, meta:{}, streakDays:0, streakDay:-999, streakBest:0, casino:{day:"",plays:0,bonus:0,buys:0}};}
async function loadProfile(){
  try{ const raw=await STORE.get(); if(raw){ return mergeDefaults(JSON.parse(raw)); } }catch(e){}
  return defaults();
}
function mergeDefaults(p){const d=defaults(); const m={...d,...p,stats:{...d.stats,...(p.stats||{})},inv:{...d.inv,...(p.inv||{})},
  skins:Array.isArray(p.skins)&&p.skins.length?Array.from(new Set([...d.skins,...p.skins])):d.skins,
  relics:Array.isArray(p.relics)?p.relics.slice():[], equipped:Array.isArray(p.equipped)?p.equipped.slice():[]};
  if(!("moons" in p)){ m.moons=3; m.rankRewarded=rankIndex(Math.max(0,m.chips-m.debt)); } // migrate old saves: seed moons, no retroactive rank grants
  m.slots=Math.max(0,Math.min(MAX_SLOTS-1, m.slots|0));
  m.equipped=m.equipped.filter(id=>m.relics.includes(id)&&relicById(id)).slice(0,1+m.slots);
  m.relics=m.relics.filter(id=>relicById(id));
  m.casino=(m.casino&&typeof m.casino==="object")?{day:String(m.casino.day||""),plays:Math.max(0,m.casino.plays|0),bonus:Math.max(0,m.casino.bonus|0),buys:Math.max(0,m.casino.buys|0)}:{day:"",plays:0,bonus:0,buys:0};
  if(m.bank&&!Array.isArray(m.bank)&&typeof m.bank==="object"&&m.bank.moons>0) m.bank=[m.bank];  // migrate single-lot saves
  m.bank=Array.isArray(m.bank)?m.bank.filter(function(b){return b&&typeof b==="object"&&b.moons>0;}).slice(0,99).map(function(b){return {moons:Math.max(1,b.moons|0),term:Math.max(1,b.term|0),left:Math.max(0,b.left|0),interest:Math.max(0,Math.floor(b.interest)||0),earned:Math.max(0,Math.floor(b.earned)||0)};}):[];
  m.market=(m.market&&typeof m.market==="object")?m.market:null;
  if(!m.props||typeof m.props!=="object") m.props={}; else { const pp={}; for(const k in m.props){ const n=m.props[k]|0; if(n>0) pp[k]=n; } m.props=pp; }
  if(!m.realty||typeof m.realty!=="object") m.realty={val:{},ins:false,news:""}; else { if(!m.realty.val||typeof m.realty.val!=="object") m.realty.val={}; m.realty.ins=!!m.realty.ins; m.realty.news=String(m.realty.news||""); }
  { const t={}; if(m.temp&&typeof m.temp==="object") for(const k in m.temp){ if(tempById(k)){ const v=m.temp[k]|0; if(v>0)t[k]=v; } } m.temp=t;
    const bx={scrap:0,vault:0}; if(m.boxes&&typeof m.boxes==="object") for(const k in bx) bx[k]=Math.max(0,m.boxes[k]|0); m.boxes=bx; }
  { const ev={alley:0,parlor:0,lounge:0,pent:0,whale:0}; const e=(m.empire&&typeof m.empire==="object")?m.empire:{}; const vv=(e.venues&&typeof e.venues==="object")?e.venues:{};
    for(const k in ev) ev[k]=Math.max(0,Math.min(3, vv[k]|0)); m.empire={venues:ev, house:!!e.house, matches:Math.max(0,e.matches|0)}; }
  { const I=(m.idle&&typeof m.idle==="object")?m.idle:{}; const gens={}, ups={};
    if(I.gens&&typeof I.gens==="object") for(const k in I.gens) gens[k]=Math.max(0,I.gens[k]|0);
    if(I.ups&&typeof I.ups==="object") for(const k in I.ups) if(I.ups[k]) ups[k]=true;
    m.idle={gens:gens, ups:ups, stars:Math.max(0,I.stars|0), starsEarned:Math.max(0, (I.starsEarned!=null?(I.starsEarned|0):(I.stars|0))), life:Math.max(0,+I.life||0), last:Math.max(0,+I.last||0)}; }
  { const mm={}; if(m.meta&&typeof m.meta==="object") STAR_UPGRADES.forEach(function(u){ const v=m.meta[u.id]|0; if(v>0) mm[u.id]=Math.max(0,Math.min(u.max,v)); }); m.meta=mm; }
  m.streakDays=Math.max(0,m.streakDays|0); m.streakBest=Math.max(0,m.streakBest|0); m.streakDay=Number.isFinite(m.streakDay)?(m.streakDay|0):-999;
  m.jackpot=Math.max(JACKPOT_SEED, Math.floor(m.jackpot)||JACKPOT_SEED);
  m.jackpotPrev=Math.max(1, Math.floor(m.jackpotPrev)||m.jackpot);
  return m;}
let saveTimer=null;
function saveProfile(){ clearTimeout(saveTimer); saveTimer=setTimeout(()=>{ try{ STORE.set(JSON.stringify(META)); }catch(e){} },120); }
