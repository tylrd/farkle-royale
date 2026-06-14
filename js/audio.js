/* =====================================================================
   Sound effects
   Web-Audio synth: tones, noise, arps, and the sfx library.
   Loaded as a classic <script> that shares globals with the others.
   Load order is fixed in index.html — keep it.
   ===================================================================== */
"use strict";
/* ===================== audio ===================== */
let actx=null;
function ac(){ if(META&&META.muted) return null; try{ if(!actx) actx=new (window.AudioContext||window.webkitAudioContext)(); if(actx.state==="suspended") actx.resume(); }catch(e){ return null; } return actx; }
function tone(f,d,t="square",v=.14,delay=0){const a=ac();if(!a)return;const s=a.currentTime+delay;const o=a.createOscillator(),g=a.createGain();o.type=t;o.frequency.setValueAtTime(f,s);g.gain.setValueAtTime(0,s);g.gain.linearRampToValueAtTime(v,s+.008);g.gain.exponentialRampToValueAtTime(.0001,s+d);o.connect(g).connect(a.destination);o.start(s);o.stop(s+d+.03);}
function glide(f1,f2,d,t="sawtooth",v=.2){const a=ac();if(!a)return;const s=a.currentTime;const o=a.createOscillator(),g=a.createGain();o.type=t;o.frequency.setValueAtTime(f1,s);o.frequency.exponentialRampToValueAtTime(Math.max(2,f2),s+d);g.gain.setValueAtTime(v,s);g.gain.exponentialRampToValueAtTime(.0001,s+d);o.connect(g).connect(a.destination);o.start(s);o.stop(s+d+.03);}
function noise(d=.09,v=.12){const a=ac();if(!a)return;const n=Math.floor(a.sampleRate*d);const b=a.createBuffer(1,n,a.sampleRate);const ch=b.getChannelData(0);for(let i=0;i<n;i++)ch[i]=(Math.random()*2-1)*Math.pow(1-i/n,2);const s=a.createBufferSource();s.buffer=b;const g=a.createGain();g.gain.value=v;const f=a.createBiquadFilter();f.type="highpass";f.frequency.value=900;s.connect(f).connect(g).connect(a.destination);s.start();}
const arp=(fr,st=.085,t="square",v=.16,d=.13)=>fr.forEach((f,i)=>tone(f,d,t,v,i*st));
const sfx={
  tick:()=>tone(90+Math.random()*60,.025,"square",.04),
  roll:()=>noise(.12,.13),
  pick:()=>{tone(740,.05,"square",.13);tone(1180,.05,"square",.11,.04);},
  drop:()=>tone(420,.06,"square",.1),
  keep:()=>{tone(620,.05,"square",.12);tone(930,.06,"square",.1,.05);},
  bank:()=>arp([523,659,784,1046,1318],.07,"square",.15,.14),
  hot:()=>arp([660,880,1175,1568,2093],.05,"square",.15,.1),
  farkle:()=>{glide(320,70,.55,"sawtooth",.22);tone(110,.5,"square",.12);noise(.18,.14);},
  win:()=>{arp([523,659,784,1046,1318,1568],.1,"square",.17,.22);arp([784,1046,1318],.1,"triangle",.1,.5);},
  lose:()=>arp([392,330,262,196,131],.13,"sawtooth",.16,.22),
  chip:()=>{tone(1300,.04,"triangle",.13);tone(1750,.04,"triangle",.1,.035);noise(.04,.06);},
  cash:()=>arp([1046,1318,1568,2093,2637],.06,"triangle",.15,.13),
  deny:()=>{tone(150,.16,"sawtooth",.16);tone(120,.16,"sawtooth",.12,.04);},
  unlock:()=>arp([523,784,1046,1318,1046,1568],.08,"square",.16,.13),
  loan:()=>{glide(170,520,.2,"triangle",.18);tone(1300,.05,"triangle",.12,.18);noise(.05,.06);},
  moon:()=>arp([1568,2093,2637,3136,2637,3520],.05,"triangle",.13,.1),
};
