/** ARVENA reward economy: deterministic ranks, achievements and user-controlled redemption. */
export type RewardItem = { id:string; title:string; created:string; description?:string; type?:string; cost:number; redeemed?:boolean; status:"available"|"redeemed"|"fulfilled"; redeemedAt?:string; fulfilledAt?:string };
export type RewardMetrics = { missionsCompleted:number; businessMissionsCompleted:number; coursesCompleted:number; lessonsCompleted:number; habitCheckIns:number; bestHabitStreak:number; goalsCompleted:number };
export type Achievement = { id:string; title:string; description:string; category:"Missions"|"Knowledge"|"Evolution"|"Goals"; requirement:string; credits:number; xp:number; test:(m:RewardMetrics)=>boolean };
export const RANKS = [
 {level:1,title:"Initiate",subtitle:"The journey begins"},
 {level:2,title:"Apprentice",subtitle:"Building consistency"},
 {level:3,title:"Pathfinder",subtitle:"Finding your direction"},
 {level:5,title:"Strategist",subtitle:"Planning with intent"},
 {level:8,title:"Specialist",subtitle:"Developing mastery"},
 {level:12,title:"Vanguard",subtitle:"Leading your own progress"},
 {level:16,title:"Architect",subtitle:"Designing lasting systems"},
 {level:20,title:"Sovereign",subtitle:"Self-directed excellence"},
] as const;
export function operatorLevel(xp:number){return Math.floor(Math.max(0,Math.floor(Number(xp)||0))/500)+1;}
export function rankForXp(xp:number){const level=operatorLevel(xp);return [...RANKS].reverse().find(r=>level>=r.level)||RANKS[0];}
export const ACHIEVEMENTS:Achievement[]=[
 {id:"mission-first",title:"First Commitment",description:"Complete your first mission.",category:"Missions",requirement:"1 mission completed",credits:25,xp:25,test:m=>m.missionsCompleted>=1},
 {id:"mission-five",title:"Momentum Builder",description:"Complete five missions.",category:"Missions",requirement:"5 missions completed",credits:75,xp:50,test:m=>m.missionsCompleted>=5},
 {id:"mission-twenty",title:"Execution Specialist",description:"Complete twenty missions.",category:"Missions",requirement:"20 missions completed",credits:200,xp:100,test:m=>m.missionsCompleted>=20},
 {id:"lesson-ten",title:"Curious Mind",description:"Complete ten learning lessons.",category:"Knowledge",requirement:"10 lessons completed",credits:50,xp:40,test:m=>m.lessonsCompleted>=10},
 {id:"course-first",title:"Knowledge Seeker",description:"Complete your first full course.",category:"Knowledge",requirement:"1 course completed",credits:75,xp:50,test:m=>m.coursesCompleted>=1},
 {id:"course-five",title:"Scholar",description:"Complete five full courses.",category:"Knowledge",requirement:"5 courses completed",credits:200,xp:100,test:m=>m.coursesCompleted>=5},
 {id:"habit-first",title:"Showed Up",description:"Record your first habit check-in.",category:"Evolution",requirement:"1 habit check-in",credits:15,xp:10,test:m=>m.habitCheckIns>=1},
 {id:"streak-seven",title:"Seven-Day Resolve",description:"Build a seven-day habit streak.",category:"Evolution",requirement:"7-day habit streak",credits:100,xp:50,test:m=>m.bestHabitStreak>=7},
 {id:"goal-first",title:"Dream into Action",description:"Complete your first life goal.",category:"Goals",requirement:"1 completed life goal",credits:100,xp:75,test:m=>m.goalsCompleted>=1},
];
export function achievementState(metrics:RewardMetrics,claimed:string[]){return ACHIEVEMENTS.map(a=>({ ...a,unlocked:a.test(metrics),claimed:claimed.includes(a.id),claimable:a.test(metrics)&&!claimed.includes(a.id)}));}
export function claimAchievement(metrics:RewardMetrics,claimed:string[],id:string){
 const a=ACHIEVEMENTS.find(x=>x.id===id);
 if(!a)return {ok:false as const,claimed,credits:0,xp:0,reason:"Achievement not found"};
 if(!a.test(metrics))return {ok:false as const,claimed,credits:0,xp:0,reason:"Achievement requirement has not been met"};
 if(claimed.includes(id))return {ok:false as const,claimed,credits:0,xp:0,reason:"Achievement reward already claimed"};
 return {ok:true as const,claimed:[...claimed,id],credits:a.credits,xp:a.xp,reason:"Achievement reward claimed"};
}
export function normalizeReward(value:unknown):RewardItem|null{
 if(!value||typeof value!=="object"||Array.isArray(value))return null;
 const v=value as Record<string,unknown>;
 if(typeof v.id!=="string"||!v.id||typeof v.title!=="string"||!v.title.trim())return null;
 const status=v.status==="fulfilled"?"fulfilled":v.status==="redeemed"||v.redeemed===true?"redeemed":"available";
 return {id:v.id,title:v.title.trim(),created:typeof v.created==="string"?v.created:"",description:typeof v.description==="string"?v.description:"",type:typeof v.type==="string"?v.type:"Personal",cost:typeof v.cost==="number"&&Number.isFinite(v.cost)?Math.max(1,Math.floor(v.cost)):1,redeemed:status!=="available",status,...(typeof v.redeemedAt==="string"?{redeemedAt:v.redeemedAt}:{}),...(typeof v.fulfilledAt==="string"?{fulfilledAt:v.fulfilledAt}:{})};
}
export function redeemPersonalReward(values:unknown[],credits:number,id:string,now=new Date().toISOString()){
 const rewards=values.map(normalizeReward).filter((r):r is RewardItem=>!!r),target=rewards.find(r=>r.id===id);
 if(!target)return {ok:false as const,rewards,credits,reason:"Reward not found"};
 if(target.status!=="available")return {ok:false as const,rewards,credits,reason:"This reward has already been redeemed"};
 if(target.cost<=0||credits<target.cost)return {ok:false as const,rewards,credits,reason:"You do not have enough credits"};
 return {ok:true as const,rewards:rewards.map(r=>r.id===id?{...r,status:"redeemed" as const,redeemed:true,redeemedAt:now}:r),credits:credits-target.cost,reason:"Reward redeemed — mark it fulfilled when you have enjoyed it"};
}
export function fulfillPersonalReward(values:unknown[],id:string,now=new Date().toISOString()){
 const rewards=values.map(normalizeReward).filter((r):r is RewardItem=>!!r),target=rewards.find(r=>r.id===id);
 if(!target)return {ok:false as const,rewards,reason:"Reward not found"};
 if(target.status!=="redeemed")return {ok:false as const,rewards,reason:"Only redeemed rewards can be marked fulfilled"};
 return {ok:true as const,rewards:rewards.map(r=>r.id===id?{...r,status:"fulfilled" as const,redeemed:true,fulfilledAt:now}:r),reason:"Reward marked fulfilled"};
}

export type UnlockMode = "credits" | "milestone";
export type SystemUnlock = {id:string;title:string;category:"Skill Path"|"Secret Archive"|"Knowledge Tree";rarity:"Common"|"Rare"|"Epic";description:string;reveal:string;cost:number;milestone:string;test:(m:RewardMetrics)=>boolean};
export const SYSTEM_UNLOCKS:SystemUnlock[]=[
 {id:"skill-deep-work",title:"Deep Work Skill",category:"Skill Path",rarity:"Common",description:"Unlock the focused-work skill track.",reveal:"A skill path for protecting attention, reducing task switching and completing meaningful work in focused sessions.",cost:80,milestone:"Complete 5 learning lessons",test:m=>m.lessonsCompleted>=5},
 {id:"skill-study",title:"Focused Study Path",category:"Skill Path",rarity:"Rare",description:"Unlock a structured study mastery path.",reveal:"Build active recall, spaced revision, problem-solving stamina and exam review into a repeatable study system.",cost:120,milestone:"Complete 3 learning lessons",test:m=>m.lessonsCompleted>=3},
 {id:"skill-business",title:"Business Builder Path",category:"Skill Path",rarity:"Rare",description:"Unlock the foundations of building a business.",reveal:"Explore customer problems, validation, simple offers, ethical selling and sustainable operations.",cost:150,milestone:"Complete 3 business missions",test:m=>m.businessMissionsCompleted>=3},
 {id:"archive-discipline",title:"The Discipline Archive",category:"Secret Archive",rarity:"Rare",description:"Reveal a special field note on consistency.",reveal:"ARCHIVE NOTE 01 — Discipline is not intensity every day. It is returning to the chosen action after interruption, without turning one missed day into an identity.",cost:150,milestone:"Reach a 7-day habit streak",test:m=>m.bestHabitStreak>=7},
 {id:"archive-strategy",title:"The Strategy Archive",category:"Secret Archive",rarity:"Epic",description:"Reveal a special field note on long-term execution.",reveal:"ARCHIVE NOTE 02 — A large goal becomes manageable when it is translated into milestones, each milestone into a mission, and each mission into the next visible action.",cost:200,milestone:"Complete 1 life goal",test:m=>m.goalsCompleted>=1},
 {id:"tree-science",title:"Science & Engineering Tree",category:"Knowledge Tree",rarity:"Epic",description:"Unlock a subject progression tree for science and engineering.",reveal:"PROGRESSION TREE — Foundations → Core Principles → Applied Problem Solving → Advanced Synthesis. Add your own courses and prerequisites in Universal Knowledge to build this tree around your syllabus.",cost:180,milestone:"Complete 1 full course",test:m=>m.coursesCompleted>=1},
 {id:"tree-business",title:"Business & Money Tree",category:"Knowledge Tree",rarity:"Epic",description:"Unlock a progression tree for business and financial capability.",reveal:"PROGRESSION TREE — Personal Finance → Market Research → Customer Validation → Business Model → Operations & Growth. Use it as a roadmap; it does not imply financial advice or automatic trading access.",cost:180,milestone:"Complete 3 business missions",test:m=>m.businessMissionsCompleted>=3},
];
export function unlockSystemItem(unlocked:string[],metrics:RewardMetrics,credits:number,id:string,mode:UnlockMode){
 const item=SYSTEM_UNLOCKS.find(x=>x.id===id);
 if(!item)return {ok:false as const,unlocked,credits,reason:"Unlock not found"};
 if(unlocked.includes(id))return {ok:false as const,unlocked,credits,reason:"This item is already unlocked"};
 if(mode==="milestone"&&!item.test(metrics))return {ok:false as const,unlocked,credits,reason:"The milestone has not been reached"};
 if(mode==="credits"&&credits<item.cost)return {ok:false as const,unlocked,credits,reason:"Not enough credits"};
 return {ok:true as const,unlocked:[...unlocked,id],credits:mode==="credits"?credits-item.cost:credits,reason:mode==="credits"?"Unlocked with credits":"Unlocked by milestone"};
}
\nexport function rewardSummary(values:unknown[],credits:number){
 const rewards=values.map(normalizeReward).filter((r):r is RewardItem=>!!r);
 return {availableCredits:Math.max(0,Math.floor(credits)),totalRewards:rewards.length,available:rewards.filter(r=>r.status==="available").length,redeemed:rewards.filter(r=>r.status==="redeemed").length,fulfilled:rewards.filter(r=>r.status==="fulfilled").length,spent:rewards.filter(r=>r.status!=="available").reduce((n,r)=>n+r.cost,0)};
}
