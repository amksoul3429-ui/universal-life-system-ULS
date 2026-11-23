export type HabitFrequency = "Daily" | "Weekdays" | "Weekly";
export type Habit = { id:string; title:string; created:string; kind:"habit"; description:string; category:string; frequency:HabitFrequency; targetPerWeek:number; active:boolean; checkIns:string[] };
export type Skill = { id:string; title:string; created:string; kind:"skill"; category:string; level:number; practiceMinutes:number; sessions:number; notes:string; updatedAt:string };
export type Trait = { id:string; title:string; created:string; kind:"trait"; score:number; reflection:string; updatedAt:string };
export type GrowthReflection = { id:string; title:string; created:string; kind:"reflection"; content:string; mood:string };
export type EvolutionRecord = Habit | Skill | Trait | GrowthReflection;
type Obj = Record<string,unknown>;
const obj=(v:unknown):v is Obj=>typeof v==="object"&&v!==null&&!Array.isArray(v);
const str=(v:unknown,d="")=>typeof v==="string"?v:d;
const num=(v:unknown,min:number,max:number,d:number)=>typeof v==="number"&&Number.isFinite(v)?Math.max(min,Math.min(max,Math.floor(v))):d;
export function normalizeEvolutionRecord(v:unknown):EvolutionRecord|null{
 if(!obj(v)||typeof v.id!=="string"||!v.id||typeof v.title!=="string"||!v.title.trim())return null;
 const common={id:v.id,title:v.title.trim(),created:str(v.created)};
 if(v.kind==="habit")return {...common,kind:"habit",description:str(v.description),category:str(v.category,"Personal"),frequency:(["Daily","Weekdays","Weekly"].includes(String(v.frequency))?v.frequency:"Daily") as HabitFrequency,targetPerWeek:num(v.targetPerWeek,1,7,7),active:v.active!==false,checkIns:Array.isArray(v.checkIns)?[...new Set(v.checkIns.filter((x):x is string=>typeof x==="string"&&/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(x)))].sort():[]};
 if(v.kind==="skill")return {...common,kind:"skill",category:str(v.category,"General"),level:num(v.level,1,10,1),practiceMinutes:num(v.practiceMinutes,0,10000000,0),sessions:num(v.sessions,0,1000000,0),notes:str(v.notes),updatedAt:str(v.updatedAt,common.created)};
 if(v.kind==="trait")return {...common,kind:"trait",score:num(v.score,1,10,5),reflection:str(v.reflection),updatedAt:str(v.updatedAt,common.created)};
 if(v.kind==="reflection")return {...common,kind:"reflection",content:str(v.content),mood:str(v.mood,"Neutral")};
 return null;
}
export function normalizeEvolution(values:unknown[]):EvolutionRecord[]{return values.map(normalizeEvolutionRecord).filter((x):x is EvolutionRecord=>!!x);}
export function recordHabitCheckIn(values:unknown[],habitId:string,date:string,today=date){
 const records=normalizeEvolution(values);let xpAwarded=0,changed=false;
 const next=records.map(r=>{if(r.kind!=="habit"||r.id!==habitId)return r;if(!r.active||r.checkIns.includes(date))return r;changed=true;if(date===today)xpAwarded=5;return {...r,checkIns:[...r.checkIns,date].sort()};});
 return {records:next,changed,xpAwarded,reason:changed?"Habit check-in recorded":records.some(r=>r.id===habitId)?"Habit already checked in or inactive":"Habit not found"};
}
export function habitStreak(value:unknown,today:string):number{
 const r=normalizeEvolutionRecord(value);if(!r||r.kind!=="habit")return 0;
 const set=new Set(r.checkIns);let cursor=new Date(today+"T00:00:00Z");if(!set.has(today)){cursor.setUTCDate(cursor.getUTCDate()-1);if(!set.has(cursor.toISOString().slice(0,10)))return 0;}
 let count=0;while(set.has(cursor.toISOString().slice(0,10))){count++;cursor.setUTCDate(cursor.getUTCDate()-1);if(count>3660)break;}return count;
}
export function habitWeeklyCount(value:unknown,today:string):number{
 const r=normalizeEvolutionRecord(value);if(!r||r.kind!=="habit")return 0;
 const end=new Date(today+"T00:00:00Z"),start=new Date(end);start.setUTCDate(start.getUTCDate()-6);
 return r.checkIns.filter(d=>{const x=new Date(d+"T00:00:00Z");return x>=start&&x<=end;}).length;
}
export function logSkillPractice(values:unknown[],skillId:string,minutes:number,note="",now=new Date().toISOString()){
 const records=normalizeEvolution(values);let changed=false;
 const next=records.map(r=>{if(r.kind!=="skill"||r.id!==skillId)return r;changed=true;const practiceMinutes=r.practiceMinutes+Math.max(1,Math.min(1440,Math.floor(minutes)||1));return {...r,practiceMinutes,sessions:r.sessions+1,level:Math.min(10,1+Math.floor(practiceMinutes/300)),notes:note.trim()||r.notes,updatedAt:now};});
 return {records:next,changed};
}
export function updateTrait(values:unknown[],traitId:string,score:number,reflection:string,now=new Date().toISOString()){
 const records=normalizeEvolution(values);let changed=false;
 const next=records.map(r=>{if(r.kind!=="trait"||r.id!==traitId)return r;changed=true;return {...r,score:Math.max(1,Math.min(10,Math.floor(score)||1)),reflection:reflection.trim(),updatedAt:now};});
 return {records:next,changed};
}
export function evolutionSummary(values:unknown[],today:string){
 const records=normalizeEvolution(values),habits=records.filter((r):r is Habit=>r.kind==="habit"&&r.active),skills=records.filter((r):r is Skill=>r.kind==="skill"),traits=records.filter((r):r is Trait=>r.kind==="trait"),reflections=records.filter(r=>r.kind==="reflection");
 const checkedToday=habits.filter(h=>h.checkIns.includes(today)).length;
 return {habits:habits.length,checkedToday,habitRate:habits.length?Math.round(checkedToday/habits.length*100):0,skills:skills.length,practiceMinutes:skills.reduce((n,s)=>n+s.practiceMinutes,0),traits:traits.length,averageTraitScore:traits.length?Math.round(traits.reduce((n,t)=>n+t.score,0)/traits.length*10)/10:0,reflections:reflections.length};
}
