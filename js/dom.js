/* =====================================================================
   DOM utilities, dice rendering, view switching
   Selectors, formatting, dice builder/animation, and the screen router.
   Loaded as a classic <script> that shares globals with the others.
   Load order is fixed in index.html — keep it.
   ===================================================================== */
"use strict";
/* ===================== helpers + DOM ===================== */
const $=s=>document.querySelector(s);
const fmt=n=>Math.round(n).toLocaleString("en-US");
const BIG_SUFFIX=["","K","M","B","T","Qa","Qi","Sx","Sp","Oc","No","Dc"];
function fmtBig(n){ n=Math.floor(n); if(n<1e6) return fmt(n); let x=n,i=0; while(x>=1000&&i<BIG_SUFFIX.length-1){ x/=1000; i++; } return (x>=100?Math.round(x):x.toFixed(x>=10?1:2))+BIG_SUFFIX[i]; }
const fmtC=n=>n>=1e7?fmtBig(n):fmt(n);   // chips can explode once the idle empire spins up
const other=p=>p==="you"?"cpu":"you";
const name=p=>p==="you"?"YOU":"CPU";
const rankIndex=lt=>{let i=0;RANKS.forEach((x,k)=>{if(lt>=x.min)i=k;});return i;};
const nextRank=lt=>{for(const x of RANKS)if(x.min>lt)return x;return null;};
let uid=0; const newDie=()=>({id:++uid,value:1+(Math.random()*6|0)});
const rollVals=n=>Array.from({length:n},()=>1+(Math.random()*6|0));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const screenEl=$("#screen");

/* ===================== dice rendering ===================== */
function applySkin(){const sk=SKINS.find(s=>s.id===(META&&META.skin))||SKINS[0];const r=document.documentElement.style;
  r.setProperty("--dice",sk.v.dice);r.setProperty("--dice2",sk.v.dice2);r.setProperty("--pip",sk.v.pip);r.setProperty("--dedge",sk.v.edge);}
function dieEl(value,cls,vars){
  const d=document.createElement("div"); d.className="die"+(cls?" "+cls:"");
  if(vars){d.style.setProperty("--dice",vars.dice);d.style.setProperty("--dice2",vars.dice2);d.style.setProperty("--pip",vars.pip);d.style.setProperty("--dedge",vars.edge);}
  const p=document.createElement("div"); p.className="pips";
  for(let i=0;i<9;i++){const c=document.createElement("div");c.className="pip";p.appendChild(c);}
  d.appendChild(p); paint(p,value); return d;
}
function paint(pipsEl,value){const on=PIPS[value]||[];[...pipsEl.children].forEach((c,i)=>c.classList.toggle("on",on.includes(i)));}
function animateDice(container,values,small){
  return new Promise(resolve=>{
    container.innerHTML="";
    const els=values.map(v=>{const e=dieEl(v,small?"":"");container.appendChild(e);return e;});
    els.forEach(e=>e.classList.add("rolling")); sfx.roll();
    let t=0;const max=9;
    const iv=setInterval(()=>{ els.forEach(e=>paint(e.querySelector(".pips"),1+(Math.random()*6|0))); sfx.tick();
      if(++t>=max){clearInterval(iv);
        els.forEach((e,i)=>{e.classList.remove("rolling");e.classList.add("land");paint(e.querySelector(".pips"),values[i]);});
        setTimeout(()=>{els.forEach(e=>e.classList.remove("land"));resolve();},270);}
    },60);
  });
}

/* ===================== view manager ===================== */
let curView="lobby";
function show(view){curView=view;document.querySelectorAll("section[data-view]").forEach(s=>s.classList.toggle("on",s.dataset.view===view));}
