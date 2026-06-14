/* =====================================================================
   Farkle scoring engine
   Pure scoring math: faceScore, evaluate, scoringIds, pip map.
   Loaded as a classic <script> that shares globals with the others.
   Load order is fixed in index.html — keep it.
   ===================================================================== */
"use strict";
/* ===================== scoring engine (unit-tested) ===================== */
function faceScore(v,c){
  if(c<=0) return {score:0,used:0};
  if(v===1||v===5){const s=v===1?100:50,b=v===1?1000:500;
    if(c<3) return {score:c*s,used:c};
    const flat=c===3?b:c===4?1000:c===5?2000:3000, sp=b+(c-3)*s;
    return flat>=sp?{score:flat,used:c}:{score:sp,used:c};}
  if(c<3) return {score:0,used:0};
  const flat=c===3?v*100:c===4?1000:c===5?2000:3000; return {score:flat,used:c};
}
function evaluate(vals){
  const cnt={}; for(const d of vals) cnt[d]=(cnt[d]||0)+1; const n=vals.length;
  let sp=null,label=null;
  if(n===6){
    if([1,2,3,4,5,6].every(v=>cnt[v]===1)){sp=1500;label="STRAIGHT";}
    else{const dist=[1,2,3,4,5,6].filter(v=>cnt[v]>0);
      if(dist.length===3&&dist.every(v=>cnt[v]===2)){sp=1500;label="THREE PAIRS";}
      else if(dist.length===2&&dist.every(v=>cnt[v]===3)){sp=2500;label="TWO TRIPLETS";}}}
  let g=0,u=0; for(let v=1;v<=6;v++){const r=faceScore(v,cnt[v]||0);g+=r.score;u+=r.used;}
  if(sp!==null&&sp>=g) return {score:sp,usedAll:true,used:6,label};
  return {score:g,usedAll:u===n,used:u,label:lblOf(cnt)};
}
function lblOf(cnt){for(let v=6;v>=1;v--){const c=cnt[v]||0;
  if(c>=6)return"SIX "+v+"'s";if(c===5)return"FIVE "+v+"'s";if(c===4)return"FOUR "+v+"'s";if(c===3)return"THREE "+v+"'s";}return null;}
function scoringIds(dice){
  const cnt={}; dice.forEach(d=>cnt[d.value]=(cnt[d.value]||0)+1); const n=dice.length;
  if(n===6){if([1,2,3,4,5,6].every(v=>cnt[v]===1))return dice.map(d=>d.id);
    const dist=[1,2,3,4,5,6].filter(v=>cnt[v]>0);
    if((dist.length===3&&dist.every(v=>cnt[v]===2))||(dist.length===2&&dist.every(v=>cnt[v]===3)))return dice.map(d=>d.id);}
  return dice.filter(d=>d.value===1||d.value===5||cnt[d.value]>=3).map(d=>d.id);
}
