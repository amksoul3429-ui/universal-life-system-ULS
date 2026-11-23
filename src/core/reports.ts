export type ReportRange = { start?: string; end?: string };
type RecordLike = Record<string, any>;
export type ReportData = {
 missions?: RecordLike[]; tasks?: RecordLike[]; goals?: RecordLike[]; knowledge?: RecordLike[];
 videos?: RecordLike[]; evolution?: RecordLike[]; rewards?: RecordLike[]; journal?: RecordLike[];
 xp?: number; credits?: number;
};
const dateOnly=(value:unknown):string=>{
 if(typeof value!=="string"||!value)return "";
 if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
 const d=new Date(value);return Number.isNaN(d.getTime())?"":d.toISOString().slice(0,10);
};
const inRange=(date:string,range:ReportRange)=>!!date&&(!range.start||date>=range.start)&&(!range.end||date<=range.end);
const completed=(x:RecordLike)=>x.done===true||x.status==="Completed"||x.completed===true;
const completionDate=(x:RecordLike)=>dateOnly(x.completedAt||x.completedOn||x.doneAt||x.date||x.created);
const safeArray=(x:unknown):RecordLike[]=>Array.isArray(x)?x.filter(v=>v&&typeof v==="object") as RecordLike[]:[];
const wordCount=(s:unknown)=>typeof s==="string"&&s.trim()?s.trim().split(/\s+/).length:0;
export function summarizeReports(data:ReportData,range:ReportRange={}){
 const missions=safeArray(data.missions),tasks=safeArray(data.tasks),goals=safeArray(data.goals),courses=safeArray(data.knowledge),videos=safeArray(data.videos),evolution=safeArray(data.evolution),rewards=safeArray(data.rewards),journal=safeArray(data.journal);
 const missionDone=missions.filter(completed),taskDone=tasks.filter(completed),goalDone=goals.filter(completed),courseDone=courses.filter(completed);
 const lessons=courses.flatMap(c=>safeArray(c.lessons)),lessonDone=lessons.filter(completed);
 const habits=evolution.filter(x=>x.kind==="habit"),skills=evolution.filter(x=>x.kind==="skill"),reflections=evolution.filter(x=>x.kind==="reflection"||x.kind==="identity");
 const habitCheckins=habits.flatMap(h=>Array.isArray(h.checkIns)?h.checkIns.map((c:any)=>typeof c==="string"?{date:c}:c):[]);
 const filtered=(items:RecordLike[])=>items.filter(x=>inRange(completionDate(x),range));
 const count=(items:RecordLike[])=>filtered(items).length;
 const journalFiltered=journal.filter(x=>inRange(dateOnly(x.date||x.created),range));
 const checkins=habitCheckins.filter(c=>inRange(dateOnly(c.date||c.day||c.created),range));
 const completedCount=count(missionDone)+count(taskDone)+count(goalDone)+count(lessonDone);
 const categories=[
  {key:"Missions",value:count(missionDone)},
  {key:"Planner tasks",value:count(taskDone)},
  {key:"Goals",value:count(goalDone)},
  {key:"Learning lessons",value:count(lessonDone)},
  {key:"Habit check-ins",value:checkins.length},
  {key:"Journal entries",value:journalFiltered.length},
  {key:"Videos watched",value:count(videos.filter(v=>v.status==="Watched"||v.watched===true))},
  {key:"Rewards redeemed",value:count(rewards.filter(r=>r.status==="redeemed"||r.redeemed===true))}
 ];
 const dates=new Set<string>();
 for(const x of [...missionDone,...taskDone,...goalDone,...lessonDone,...journalFiltered]){const d=completionDate(x);if(inRange(d,range))dates.add(d);}
 for(const c of checkins){const d=dateOnly(c.date||c.day||c.created);if(inRange(d,range))dates.add(d);}
 const daysActive=dates.size;
 const totalTasks=filtered(missions).length+filtered(tasks).length;
 const completionRate=totalTasks?Math.round((count(missionDone)+count(taskDone))/totalTasks*100):0;
 const trendDates:string[]=[];
 if(range.start&&range.end){
  const start=new Date(range.start+"T12:00:00"),end=new Date(range.end+"T12:00:00");
  if(!Number.isNaN(start.getTime())&&!Number.isNaN(end.getTime())){const span=Math.min(31,Math.max(0,Math.round((end.getTime()-start.getTime())/86400000))+1);for(let i=0;i<span;i++){const d=new Date(start);d.setDate(d.getDate()+i);trendDates.push(dateOnly(d.toISOString()));}}
 }else{
  const end=new Date();for(let i=13;i>=0;i--){const d=new Date(end);d.setDate(d.getDate()-i);trendDates.push(dateOnly(d.toISOString()));}
 }
 const events=[...missionDone,...taskDone,...goalDone,...lessonDone].map(completionDate).concat(checkins.map(c=>dateOnly(c.date||c.day||c.created)));
 const trend=trendDates.map(date=>({date,label:date.slice(5),value:events.filter(d=>d===date).length}));
 const totalWords=journalFiltered.reduce((n,e)=>n+wordCount(e.content),0);
 const practiceMinutes=skills.reduce((n,s)=>n+(Number(s.practiceMinutes)||0),0);
 return {
  range:{start:range.start||"",end:range.end||""},
  totals:{missions:count(missionDone),tasks:count(taskDone),goals:count(goalDone),courses:count(courseDone),lessons:count(lessonDone),habitCheckins:checkins.length,journalEntries:journalFiltered.length,journalWords:totalWords,videosWatched:count(videos.filter(v=>v.status==="Watched"||v.watched===true)),rewardsRedeemed:count(rewards.filter(r=>r.status==="redeemed"||r.redeemed===true)),daysActive,completionRate,xp:Number(data.xp)||0,credits:Number(data.credits)||0,skills:skills.length,practiceMinutes,reflections:reflections.length},
  categories,trend,available:{missions:missions.length,tasks:tasks.length,goals:goals.length,courses:courses.length,lessons:lessons.length,habits:habits.length,skills:skills.length,journalEntries:journal.length,videos:videos.length},
 };
}
export function reportCsv(report:ReturnType<typeof summarizeReports>):string{
 const rows=[["ARVENA SYSTEM REPORT"],["Period",report.range.start||"All time",report.range.end||"Today"],["Metric","Value"],...Object.entries(report.totals).map(([k,v])=>[k,String(v)]),[],["Activity category","Count"],...report.categories.map(x=>[x.key,String(x.value)]),[],["Date","Completed activity"],...report.trend.map(x=>[x.date,String(x.value)])];
 return rows.map(row=>row.map(cell=>'"'+String(cell??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");
}
