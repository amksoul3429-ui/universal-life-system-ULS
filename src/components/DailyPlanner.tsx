import {useMemo,useState} from "react";
import {CalendarDays,Check,Clock3,Edit3,Flag,Plus,Trash2,ChevronLeft,ChevronRight,Timer,Target} from "lucide-react";
import {getDaySummary,normalizePlannerTask,sortPlannerTasks} from "../core/planner";
import "./DailyPlanner.css";
type Task={id:string;title:string;created:string;date:string;category?:string;priority?:string;done?:boolean;missionId?:string;startTime?:string;durationMinutes?:number;notes?:string;[key:string]:any};
type Props={tasks:Task[];onAdd:(date:string)=>void;onEdit:(task:Task)=>void;onDelete:(task:Task)=>void;onToggle:(id:string)=>void};
const localDate=(d:Date)=>{const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return y+"-"+m+"-"+day};
const shift=(date:string,days:number)=>{const d=new Date(date+"T12:00:00");d.setDate(d.getDate()+days);return localDate(d)};
const pretty=(date:string,options:Intl.DateTimeFormatOptions={weekday:"long",day:"numeric",month:"long"})=>date?new Date(date+"T12:00:00").toLocaleDateString(undefined,options):"Unscheduled";
const priorityClass=(p:string)=>p.toLowerCase();
export default function DailyPlanner({tasks,onAdd,onEdit,onDelete,onToggle}:Props){
 const [selected,setSelected]=useState(localDate(new Date()));
 const [view,setView]=useState<"day"|"all">("day");
 const [showCompleted,setShowCompleted]=useState(true);
 const normalized=useMemo(()=>tasks.map(t=>normalizePlannerTask(t)),[tasks]);
 const dated=useMemo(()=>normalized.filter(t=>t.date===selected),[normalized,selected]);
 const sorted=useMemo(()=>sortPlannerTasks(dated),[dated]);
 const scheduled=sorted.filter(t=>t.startTime),unscheduled=sorted.filter(t=>!t.startTime);
 const summary=getDaySummary(normalized,selected);
 const today=localDate(new Date());
 const week=Array.from({length:7},(_,i)=>shift(selected,i-3));
 const allSorted=useMemo(()=>[...normalized].sort((a,b)=>a.date.localeCompare(b.date)||((a.startTime||"").localeCompare(b.startTime||""))),[normalized]);
 const visibleAll=allSorted.filter(t=>showCompleted||!t.done);
 const visibleDay=sorted.filter(t=>showCompleted||!t.done);
 const formatDuration=(minutes:number)=>minutes>=60?Math.floor(minutes/60)+"h"+(minutes%60?" "+minutes%60+"m":""):minutes+" min";
 const renderTask=(t:Task)=><article className={"dp-task "+(t.done?"is-done":"")} key={t.id}>
  <button className={"dp-check "+(t.done?"checked":"")} aria-label={t.done?"Mark incomplete":"Complete task"} onClick={()=>onToggle(t.id)}><Check size={14}/></button>
  <div className="dp-task-main"><div className="dp-task-title"><strong>{t.title}</strong>{t.missionId&&<span className="dp-linked"><Target size={11}/> MISSION</span>}</div>
   <div className="dp-task-meta"><span>{t.category||"Personal"}</span><span className={"dp-priority "+priorityClass(t.priority||"Medium")}><Flag size={10}/>{t.priority||"Medium"}</span>{t.startTime&&<span><Clock3 size={11}/>{t.startTime}</span>}<span><Timer size={11}/>{formatDuration(t.durationMinutes||30)}</span></div>
   {t.notes&&<p className="dp-notes">{t.notes}</p>}
  </div>
  <div className="dp-task-actions"><button aria-label="Edit task" onClick={()=>onEdit(t)}><Edit3 size={14}/></button><button aria-label="Delete task" onClick={()=>onDelete(t)}><Trash2 size={14}/></button></div>
 </article>;
 return <div className="daily-planner">
  <div className="dp-heading"><div><span className="dp-eyebrow">PLAN WITH INTENTION · EXECUTE WITH FOCUS</span><h1>Daily Planner</h1><p>Turn your priorities into a realistic schedule, then track what you actually complete.</p></div><button className="primary" onClick={()=>onAdd(selected)}><Plus size={15}/> PLAN A TASK</button></div>
  <section className="dp-calendar panel">
   <div className="dp-calendar-top"><div><span className="dp-eyebrow">YOUR SCHEDULE</span><h2>{pretty(selected,{month:"long",year:"numeric"})}</h2></div><div className="dp-date-controls"><button onClick={()=>setSelected(shift(selected,-7))}><ChevronLeft/></button><button className="dp-today" onClick={()=>setSelected(today)}>TODAY</button><button onClick={()=>setSelected(shift(selected,7))}><ChevronRight/></button><input aria-label="Choose date" type="date" value={selected} onChange={e=>e.target.value&&setSelected(e.target.value)}/></div></div>
   <div className="dp-week">{week.map(date=>{const count=normalized.filter(t=>t.date===date).length;return <button key={date} className={date===selected?"selected":""} onClick={()=>setSelected(date)}><small>{pretty(date,{weekday:"short"})}</small><strong>{new Date(date+"T12:00:00").getDate()}</strong><i>{count?count+" task"+(count===1?"":"s"):"—"}</i></button>})}</div>
  </section>
  <section className="dp-summary">
   <article><small>PLANNED TASKS</small><strong>{summary.total}</strong><span>for this day</span></article>
   <article><small>COMPLETED</small><strong>{summary.completed}<em> / {summary.total}</em></strong><span>{summary.percent}% execution</span></article>
   <article><small>SCHEDULED TIME</small><strong>{Math.floor(summary.plannedMinutes/60)}h {summary.plannedMinutes%60}m</strong><span>{summary.scheduled} timed tasks</span></article>
   <article><small>REMAINING</small><strong>{summary.remaining}</strong><span>still to execute</span></article>
  </section>
  <section className="dp-progress panel"><div><div><span className="dp-eyebrow">DAILY EXECUTION</span><strong>{summary.percent}%</strong></div><span>{summary.completed} of {summary.total} tasks complete</span></div><div className="dp-progress-track"><i style={{width:summary.percent+"%"}}/></div></section>
  <div className="dp-list-head"><div><span className="dp-eyebrow">EXECUTION BOARD</span><h2>{view==="day"?pretty(selected):"All planner tasks"}</h2></div><div className="dp-list-controls"><button className={view==="day"?"active":""} onClick={()=>setView("day")}>DAY</button><button className={view==="all"?"active":""} onClick={()=>setView("all")}>ALL TASKS</button><label><input type="checkbox" checked={showCompleted} onChange={e=>setShowCompleted(e.target.checked)}/> Show completed</label></div></div>
  {view==="day"?<div className="dp-board">
   {visibleDay.length? <>{scheduled.length>0&&<div className="dp-group"><h3><Clock3 size={14}/> SCHEDULED</h3>{scheduled.filter(t=>showCompleted||!t.done).map(renderTask)}</div>}{unscheduled.filter(t=>showCompleted||!t.done).length>0&&<div className="dp-group"><h3><CalendarDays size={14}/> FLEXIBLE / UNSCHEDULED</h3>{unscheduled.filter(t=>showCompleted||!t.done).map(renderTask)}</div>}</>:<div className="dp-empty"><CalendarDays size={25}/><strong>{summary.total?"All tasks are complete.":"Nothing planned for this day."}</strong><span>{summary.total?"A clear board. Review your progress or plan another day.":"Add a task or choose a mission to bring into your schedule."}</span><button className="primary" onClick={()=>onAdd(selected)}><Plus size={14}/> ADD TASK</button></div>}
  </div>:<div className="dp-board">{visibleAll.length?visibleAll.map(t=><div className="dp-all-row" key={t.id}><button onClick={()=>{setSelected(t.date||today());setView("day")}}>{t.date?pretty(t.date,{day:"numeric",month:"short"}):"No date"}</button>{renderTask(t)}</div>):<div className="dp-empty"><CalendarDays size={25}/><strong>No planner tasks yet.</strong><span>Create a task or add a mission from Mission Control.</span></div>}</div>}
  <div className="dp-footnote">Mission-linked tasks stay connected to Mission Control. Completing a planner task records daily execution only; mission XP and credits are awarded only when the mission itself is completed.</div>
 </div>;
}
