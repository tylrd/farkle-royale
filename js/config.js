/* =====================================================================
   Game data + economy helpers
   Ranks, tables, side-bet pool, perks, skins, relics + rank/relic/debt helpers.
   Loaded as a classic <script> that shares globals with the others.
   Load order is fixed in index.html — keep it.
   ===================================================================== */
"use strict";
/* ===================== meta data ===================== */
const MIN_BOARD=500, PIPS={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
const RANKS=[
  {min:0,name:"BROKE",icon:"🪙"},{min:1000,name:"ROOKIE",icon:"🎲"},{min:2500,name:"HUSTLER",icon:"🃏"},
  {min:10000,name:"CARD SHARK",icon:"🦈"},{min:30000,name:"HIGH ROLLER",icon:"💎"},
  {min:80000,name:"WHALE",icon:"🐋"},{min:200000,name:"LEGEND",icon:"👑"},
  {min:1000000,name:"KINGPIN",icon:"🎩"},{min:5000000,name:"OVERLORD",icon:"🌆"}];
const TABLES=[
  {id:"alley",  name:"BACK ALLEY",         ante:100,  target:4000,  rank:0, need:0,      pay:2.5, blurb:"Dingy, fast, cheap thrills."},
  {id:"parlor", name:"THE PARLOR",         ante:300,  target:7000,  rank:1, need:1500,   pay:2.5, blurb:"Smoke, felt, and small talk."},
  {id:"lounge", name:"HIGH ROLLER LOUNGE", ante:500,  target:10000, rank:2, need:4000,   pay:2,   blurb:"Velvet ropes. Real stakes."},
  {id:"pent",   name:"THE PENTHOUSE",      ante:2000, target:12000, rank:4, need:40000,  pay:2,   blurb:"City lights. Bigger pots."},
  {id:"whale",  name:"THE WHALE ROOM",     ante:10000,target:15000, rank:5, need:100000, pay:2,   blurb:"Where legends are forged."}];
// Side bets are drawn fresh each match: rollSideBets() offers 3 random ones from this pool,
// so the mix (and the multipliers on offer) changes every round. Each bet's eval(s) predicate
// is checked against the finished match state at payout time.
const SIDEBET_POOL=[
  {id:"first",  name:"FIRST TO BANK", mult:1.5, desc:"Get on the board before the CPU.",        eval:s=>s.meta.firstBank==="you"},
  {id:"hot",    name:"HOT STREAK",    mult:2,   desc:"Trigger Hot Dice at least once.",          eval:s=>s.meta.hotYou},
  {id:"twohot", name:"DOUBLE HOT",    mult:4,   desc:"Trigger Hot Dice twice or more.",          eval:s=>s.meta.hotCountYou>=2},
  {id:"big",    name:"BIG TURN",      mult:3,   desc:"Bank a single turn of 2,000+.",            eval:s=>s.meta.biggestTurnYou>=2000},
  {id:"huge",   name:"MONSTER TURN",  mult:5,   desc:"Bank a single turn of 3,000+.",            eval:s=>s.meta.biggestTurnYou>=3000},
  {id:"clean",  name:"FLAWLESS WIN",  mult:4,   desc:"Win without a single Farkle.",             eval:s=>s.meta.youWin&&s.meta.farklesYou===0},
  {id:"steady", name:"STEADY HAND",   mult:2,   desc:"Farkle no more than once all match.",      eval:s=>s.meta.farklesYou<=1},
  {id:"blowout",name:"BLOWOUT",       mult:2.5, desc:"Win by 2,000 points or more.",             eval:s=>s.meta.youWin&&s.meta.margin>=2000},
  {id:"photo",  name:"PHOTO FINISH",  mult:3,   desc:"Win by 500 points or less.",               eval:s=>s.meta.youWin&&s.meta.margin>=0&&s.meta.margin<=500},
  {id:"grind",  name:"THE GRIND",     mult:2,   desc:"Bank 6 or more times in the match.",       eval:s=>s.meta.banksYou>=6},
];
function rollSideBets(){ const p=SIDEBET_POOL.slice(); for(let i=p.length-1;i>0;i--){const j=Math.random()*(i+1)|0,t=p[i];p[i]=p[j];p[j]=t;} return p.slice(0,3); }
const PERKS=[
  {id:"insurance",name:"INSURANCE", icon:"🛡️",cost:120,desc:"On a Farkle, auto-banks HALF your turn score instead of losing it."},
  {id:"mulligan", name:"MULLIGAN",  icon:"🔄",cost:260,desc:"After a Farkle, re-roll the dice and continue — negate it entirely."}];
const SKINS=[
  {id:"ivory",   name:"IVORY",   cost:0,    v:{dice:"#f4ecd9",dice2:"#ddd2b6",pip:"#241a14",edge:"#b3a684"}},
  {id:"neon",    name:"NEON",    cost:1200, v:{dice:"#241546",dice2:"#160c2b",pip:"#37e6ff",edge:"#0a0518"}},
  {id:"jade",    name:"JADE",    cost:2500, v:{dice:"#1f6b4f",dice2:"#15503b",pip:"#daffe9",edge:"#0c3527"}},
  {id:"ruby",    name:"RUBY",    cost:3500, v:{dice:"#7a1330",dice2:"#530d22",pip:"#ffd8e2",edge:"#3a0815"}},
  {id:"gold",    name:"GOLD",    cost:6000, v:{dice:"#e8b53a",dice2:"#bd8c12",pip:"#2a1f00",edge:"#7a5800"}},
  {id:"obsidian",name:"OBSIDIAN",cost:9000, v:{dice:"#20202b",dice2:"#101018",pip:"#b9b9ff",edge:"#050509"}}];
const roundC=x=>Math.max(10,Math.round(x/10)*10);
const sideStake=ante=>roundC(ante*0.5);

/* ===================== loan shark / debt ===================== */
const CREDIT=[400,1500,5000,15000,40000,100000,300000,800000,2500000]; // by rank index
const VIG_RATE=0.10, SKIM_RATE=0.15;
const COLLECT_AT=5;                 // games carrying debt before Vito collects
const JACKPOT_SEED=5000;            // progressive jackpot floor
const JACKPOT_MAX=200000;           // bounded so random growth can't run away
const SPEED_PAR=75;                 // par match time (s); faster wins pay a bigger speed bonus
function jackpotAnte(t){ return Math.max(200, Math.round(t.ante*0.25)); }
const worth=()=>Math.max(0, META.chips-META.debt);   // current net worth — drives rank & the progress meter
const houseOwned=()=>!!(META&&META.empire&&META.empire.house);   // bought out Vito — you ARE the casino
const creditLimit=()=>CREDIT[rankIndex(worth())];
const availCredit=()=>Math.max(0,creditLimit()-Math.max(0,META.debt)-totalBorrowed());  // one credit pool: cash debt AND open margin both draw it down
function menace(){ const lim=creditLimit(), d=META.debt; if(d<=0)return 0; if(d>=lim)return 4; const r=d/lim; return r<0.4?1:r<0.75?2:3; }
const SHARK_LINES=[
  "“Need a little stake? Vito's always got chips for a friend.”",
  "“Pay me back when you can. No rush… mostly.”",
  "“You're getting comfortable on my dime. Don't.”",
  "“You're in deep, friend. I'd start worrying about it.”",
  "“CREDIT FROZEN. Pay it down before I get… creative.”"];
function degenScore(){const s=META.stats;return (s.loansTaken||0)+(s.chaseLosses||0)*2+(s.donLosses||0)+Math.floor((s.biggestDebt||0)/2000);}
const DEGEN_TITLES=[[0,"TOURIST"],[3,"DABBLER"],[8,"REGULAR"],[16,"ROLLER"],[30,"DEGENERATE"],[55,"CERTIFIED DEGEN"],[90,"VITO'S FAVORITE"],[140,"LOST CAUSE"]];
function degenTitle(){const v=degenScore();let t=DEGEN_TITLES[0][1];for(const [m,n] of DEGEN_TITLES)if(v>=m)t=n;return t;}
function payCash(amount){const x=Math.min(META.chips,amount);META.chips-=x;return x;}      // never below 0
function addDebt(amount){const c=Math.min(Math.max(0,amount),availCredit());META.debt+=c;META.stats.biggestDebt=Math.max(META.stats.biggestDebt,META.debt);return c;}
function sinkLoss(amount){const paid=payCash(amount);const loaned=addDebt(amount-paid);if(loaned>0){META.stats.borrowed+=loaned;if(META.debtAge<1)META.debtAge=1;}return {paid,loaned};}
function borrow(amount){const got=addDebt(amount);if(got<=0){sfx.deny();return 0;}META.chips+=got;META.stats.borrowed+=got;META.stats.loansTaken++;if(META.debtAge<1)META.debtAge=1;sfx.loan();saveProfile();return got;}
function repay(amount){const amt=Math.min(amount,META.debt,META.chips);if(amt<=0){sfx.deny();return 0;}META.chips-=amt;META.debt-=amt;if(META.debt<=0){META.debt=0;META.debtAge=0;}sfx.chip();saveProfile();return amt;}

/* ===================== relics (moons) ===================== */
const MAX_SLOTS=4;
function metaLvl(id){ return (META&&META.meta&&META.meta[id])|0; }
function relicSlots(){ return Math.min(MAX_SLOTS, 1+((META&&META.slots)||0)+metaLvl("slot")); }
// extra relic slots — deliberately hard to reach: high rank gate + steep moon price
const SLOT_UPGRADES=[{slot:2, rank:4, cost:60},{slot:3, rank:6, cost:180}];
function nextSlotUpgrade(){ return SLOT_UPGRADES[(META&&META.slots)||0]||null; }
// ★ STAR (prestige) meta-upgrades — spent on permanent buffs to the CORE Farkle game, so every
// hour of idle ultimately funnels back into sitting down at a table and rolling dice.
const STAR_UPGRADES=[
  {id:"cut",   name:"HOUSE CUT",     icon:"🎩", max:5, costs:[3,6,12,24,48], desc:"+8% chips on every MATCH payout (per level)."},
  {id:"hot",   name:"HOT STREAK",    icon:"🔥", max:5, costs:[2,4,8,16,32],  desc:"+10% on speed & blowout match bonuses (per level)."},
  {id:"bets",  name:"SHARP BETS",    icon:"🃏", max:3, costs:[4,8,16],        desc:"Your side bets pay +15% (per level)."},
  {id:"board", name:"MARKED FELT",   icon:"🧿", max:1, costs:[8],             desc:"Start every match already ON THE BOARD."},
  {id:"nerves",name:"STEADY NERVES", icon:"🛡️", max:1, costs:[12],            desc:"Your first Farkle each match is forgiven."},
  {id:"draw",  name:"LUCKY DRAW",    icon:"🍀", max:1, costs:[10],            desc:"Start each match with a random charm added to your stash."},
  {id:"slot",  name:"VIP TABLE",     icon:"💍", max:1, costs:[40],            desc:"+1 relic slot — a 4th, beyond the rank limit."},
];
function metaUpById(id){ return STAR_UPGRADES.filter(function(u){return u.id===id;})[0]; }
function metaNextCost(u){ const l=metaLvl(u.id); return l>=u.max?null:u.costs[l]; }
const MOON_RANK=[0,2,3,5,8,12,20,30,45]; // moons granted on reaching each rank index
const RELICS=[
  {id:"monocle",name:"HIGH ROLLER'S MONOCLE",icon:"🧐",cost:8,  desc:"Start every match already ON THE BOARD — no 500-point minimum."},
  {id:"hothand",name:"HOT HAND",             icon:"♨️",cost:10, desc:"Every Hot Dice adds a +300 bonus to your turn score."},
  {id:"clover", name:"FOUR-LEAF CLOVER",     icon:"🍀",cost:11, desc:"You win TIES in Double-or-Nothing and Chase."},
  {id:"charm",  name:"GAMBLER'S CHARM",      icon:"🎰",cost:12, desc:"Side bets pay +50% (×1.5 on their payout)."},
  {id:"shark",  name:"SHARK TOOTH",          icon:"🦷",cost:13, desc:"Vito's vig is halved and he never skims your winnings."},
  {id:"loaded", name:"LOADED DICE",          icon:"🎲",cost:16, desc:"Your first roll each turn can never Farkle."},
  {id:"band2",  name:"CHARM SATCHEL",        icon:"🎒",cost:16, persist:2, desc:"Charms you arm stay active for 2 turns instead of 1."},
  {id:"phoenix",name:"PHOENIX FEATHER",      icon:"🔥",cost:18, desc:"Once per match, your first Farkle is negated for free."},
  {id:"lucky",  name:"LUCKY COIN",           icon:"🪙",cost:22, rank:2, desc:"+15% chips on every match payout."},
  {id:"golden", name:"GOLDEN TOUCH",         icon:"✨",cost:24, rank:3, desc:"+20% points on every turn you bank."},
  {id:"band3",  name:"CHARM BANDOLIER",      icon:"🪖",cost:26, rank:3, persist:3, desc:"Charms you arm stay active for 3 turns."},
  {id:"band4",  name:"CHARM TRENCH COAT",    icon:"🧥",cost:36, rank:4, persist:4, desc:"Charms you arm stay active for 4 turns."},
  {id:"midas",  name:"MIDAS CROWN",          icon:"👑",cost:40, rank:5, desc:"+25% payouts and double the chance to find moons."},
  {id:"band5",  name:"CHARM REGALIA",        icon:"🎖️",cost:50, rank:5, persist:5, desc:"Charms you arm stay active for 5 turns."},
];
const hasRelic=id=>!!(META&&META.equipped&&META.equipped.includes(id));
const relicById=id=>RELICS.find(r=>r.id===id);
function charmTurns(){ if(!META||!META.equipped)return 1; let n=1; META.equipped.forEach(function(id){ const r=relicById(id); if(r&&r.persist&&r.persist>n)n=r.persist; }); return n; }
function grantRankMoons(){ const cur=rankIndex(worth()); let g=0; while(META.rankRewarded<cur){ META.rankRewarded++; g+=MOON_RANK[META.rankRewarded]||0; } if(g>0)META.moons+=g; return g; }
function payoutMult(){ return 1+(hasRelic("lucky")?0.15:0)+(hasRelic("midas")?0.25:0)+(houseOwned()?0.10:0)+0.08*metaLvl("cut"); }
