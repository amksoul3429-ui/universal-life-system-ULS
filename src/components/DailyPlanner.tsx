import {useMemo,useState} from "react";
import {CalendarDays,Check,Clock3,Edit3,Flag,Plus,Trash2,ChevronLeft,ChevronRight,Timer,Target,AlertTriangle,CalendarRange} from "lucide-react";
import {getDaySummary,getOverdueTasks,getScheduleConflicts,normalizePlannerTask,sortPlannerTasks} from "../core/planner";
import type {PlannerSort} from "../core/planner";
import "./DailyPlanner.css";
type StoredTask={id:string;title:string;created:string;[key:string]:any};
type Task=StoredTask & {date:string;category?:string;priority?:string;done?:boolean;missionId?:string;startTime?:string;durationMinutes?:number;notes?:string};
type Props={tasks:StoredTask[];onAdd:(date:string)=>void;onEdit:(task:Task)=>void;onDelete:(task:Task)=>void;onToggle:(id:string)=>void};
type View="day"|"all"|"month";
const localDate=(d:Date)=>{const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return y+"-"+m+"-"+day};
const shift=(date:string,days:number)=>{const d=new Date(date+"T12:00:00");d.setDate(d.getDate()+days);return localDate(d)};
const pretty=(date:string,options:Intl.DateTimeFormatOptions={weekday:"long",day:"numeric",month:"long"})=>date?new Date(date+"T12:00:00").toLocaleDateString(undefined,options):"Unscheduled";
const priorityClass=(p:string)=>p.toLowerCase();
const monthDays=(date:string)=>{const d=new Date(date+"T12:00:00"),first=new Date(d.getFullYear(),d.getMonth(),1),start=new Date(first);start.setDate(1-first.getDay());return Array.from({length:42},(_,i)=>{const day=new Date(start);day.setDate(start.getDate()+i);return localDate(day)})};
export default function DailyPlanner({tasks,onAdd,onEdit,onDelete,onToggle}:Props){
 const [selected,setSelected]=useState(localDate(new Date()));
 const [view,setView]=useState<View>("day");
 const [showCompleted,setShowCompleted]=useState(true);
 const [overdueOnly,setOverdueOnly]=useState(false);
 const [category,setCategory]=useState("All");
 const [priority,setPriority]=useState("All");
 const [sort,setSort]=useState<PlannerSort>("time");
 const normalized=useMemo(()=>tasks.map(t=>normalizePlannerTask({...t,date:typeof t.date==="string"?t.date:""} as Task)),[tasks]);
 const todayDate=localDate(new Date());
 const dated=useMemo(()=>normalized.filter(t=>t.date===selected),[normalized,selected]);
 const summary=getDaySummary(normalized,selected);
 const overdue=getOverdueTasks(normalized,todayDate);
 const scheduled=dated.filter(t=>t.startTime);
 const conflicts=getScheduleConflicts(dated);
 const week=Array.from({length:7},(_,i)=>shift(selected,i-3));
 const days=monthDays(selected);
 const monthLabel=pretty(selected,{month:"long",year:"numeric"});
 const categories=Array.from(new Set(normalized.map(t=>t.category||"Personal"))).sort();
 const filterTasks=(source:Task[])=>sortPlannerTasks(source.filter(t=>(showCompleted||!t.done)&&(!overdueOnly||getOverdueTasks([t],todayDate).length>0)&&(category==="All"||t.category===category)&&(priority==="All"||t.priority===priority)),sort);
 const visibleDay=filterTasks(dated);
 const allSorted=filterTasks(normalized);
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
  {overdue.length>0&&<div className="dp-overdue"><AlertTriangle size={17}/><div><strong>{overdue.length} overdue {overdue.length===1?"task":"tasks"}</strong><span>Unfinished tasks from earlier dates. Reschedule them or mark them complete.</span></div><button onClick={()=>{setView("all");setShowCompleted(false);setOverdueOnly(true)}}>REVIEW TASKS</button></div>}
  <section className="dp-calendar panel">
   <div className="dp-calendar-top"><div><span className="dp-eyebrow">YOUR SCHEDULE</span><h2>{monthLabel}</h2></div><div className="dp-date-controls"><button aria-label="Previous period" onClick={()=>setSelected(shift(selected,view==="month"?-30:-7))}><ChevronLeft/></button><button className="dp-today" onClick={()=>setSelected(todayDate)}>TODAY</button><button aria-label="Next period" onClick={()=>setSelected(shift(selected,view==="month"?30:7))}><ChevronRight/></button><input aria-label="Choose date" type="date" value={selected} onChange={e=>e.target.value&&setSelected(e.target.value)}/></div></div>
   {view==="month"?<div className="dp-month"><div className="dp-month-weekdays">{["SUN","MON","TUE","WED","THU","FRI","SAT"].map(d=><span key={d}>{d}</span>)}</div><div className="dp-month-grid">{days.map(date=>{const count=normalized.filter(t=>t.date===date).length,done=normalized.filter(t=>t.date===date&&t.done).length,inMonth=date.slice(0,7)===selected.slice(0,7);return <button key={date} className={(date===selected?"selected ":"")+(inMonth?"":"outside")} onClick={()=>{setSelected(date);setView("day")}}><strong>{Number(date.slice(-2))}</strong><small>{count?count+" tasks":"—"}</small>{count>0&&<i>{done}/{count} done</i>}</button>})}</div></div>:<div className="dp-week">{week.map(date=>{const count=normalized.filter(t=>t.date===date).length;return <button key={date} className={date===selected?"selected":""} onClick={()=>setSelected(date)}><small>{pretty(date,{weekday:"short"})}</small><strong>{new Date(date+"T12:00:00").getDate()}</strong><i>{count?count+" task"+(count===1?"":"s"):"—"}</i></button>})}</div>}
  </section>
  <div className="dp-view-switch"><button className={view==="day"?"active":""} onClick={()=>setView("day")}><CalendarDays size={13}/> DAY</button><button className={view==="all"?"active":""} onClick={()=>setView("all")}><CalendarRange size={13}/> ALL TASKS</button><button className={view==="month"?"active":""} onClick={()=>setView("month")}><CalendarDays size={13}/> MONTH</button></div>
  <section className="dp-summary">
   <article><small>PLANNED TASKS</small><strong>{summary.total}</strong><span>for this day</span></article>
   <article><small>COMPLETED</small><strong>{summary.completed}<em> / {summary.total}</em></strong><span>{summary.percent}% execution</span></article>
   <article><small>SCHEDULED TIME</small><strong>{Math.floor(summary.plannedMinutes/60)}h {summary.plannedMinutes%60}m</strong><span>{summary.scheduled} timed tasks</span></article>
   <article><small>REMAINING</small><strong>{summary.remaining}</strong><span>still to execute</span></article>
  </section>
  <section className="dp-progress panel"><div><div><span className="dp-eyebrow">DAILY EXECUTION</span><strong>{summary.percent}%</strong></div><span>{summary.completed} of {summary.total} tasks complete</span></div><div className="dp-progress-track"><i style={{width:summary.percent+"%"}}/></div></section>
  {view!=="month"&&<div className="dp-planner-tools"><div className="dp-filter-row"><label>Category<select value={category} onChange={e=>setCategory(e.target.value)}><option>All</option>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>Priority<select value={priority} onChange={e=>setPriority(e.target.value)}><option>All</option>{["Critical","High","Medium","Low"].map(p=><option key={p}>{p}</option>)}</select></label><label>Sort by<select value={sort} onChange={e=>setSort(e.target.value as PlannerSort)}><option value="time">Time</option><option value="priority">Priority</option><option value="title">Task name</option><option value="duration">Duration</option></select></label><label className="dp-show-completed"><input type="checkbox" checked={showCompleted} onChange={e=>setShowCompleted(e.target.checked)}/> Show completed</label><label className="dp-show-completed"><input type="checkbox" checked={overdueOnly} onChange={e=>setOverdueOnly(e.target.checked)}/> Overdue only</label></div>
  <div className="dp-list-head"><div><span className="dp-eyebrow">EXECUTION BOARD</span><h2>{view==="day"?pretty(selected):"All planner tasks"}</h2></div></div>
  {view!=="month"&&(view==="day"?(visibleDay.length>0?<div className="dp-board">
   {filterTasks(scheduled).length>0&&<div className="dp-group"><h3><Clock3 size={14}/> SCHEDULED</h3>{filterTasks(scheduled).map(renderTask)}</div>}
   {filterTasks(dated.filter(t=>!t.startTime)).length>0&&<div className="dp-group"><h3><CalendarDays size={14}/> FLEXIBLE / UNSCHEDULED</h3>{filterTasks(dated.filter(t=>!t.startTime)).map(renderTask)}</div>}
  </div>:<div className="dp-empty"><CalendarDays size={25}/><strong>{summary.total?"No tasks match these filters.":"Nothing planned for this day."}</strong><span>{summary.total?"Adjust your filters to see more tasks.":"Add a task or choose a mission to bring into your schedule."}</span><button className="primary" onClick={()=>onAdd(selected)}><Plus size={14}/> ADD TASK</button></div>):<div className="dp-board">{allSorted.length?allSorted.map(t=><div className="dp-all-row" key={t.id}><button onClick={()=>{setSelected(t.date||todayDate);setView("day")}}>{t.date?pretty(t.date,{day:"numeric",month:"short",year:"numeric"}):"No date"}</button>{renderTask(t)}</div>):<div className="dp-empty"><CalendarDays size={25}/><strong>No planner tasks match these filters.</strong><span>Create a task or add a mission from Mission Control.</span></div>}</div>)}</div>}
  {view==="day"&&conflicts.length>0&&<div className="dp-conflicts"><AlertTriangle size={15}/><div><strong>{conflicts.length} schedule overlap{conflicts.length===1?"":"s"} detected</strong><span>{conflicts.map(c=>c.first.title+" overlaps "+c.second.title).join(" · ")}</span></div></div>}
  <div className="dp-footnote">Mission-linked tasks stay connected to Mission Control. Completing a planner task records daily execution only; mission XP and credits are awarded only when the mission itself is completed.</div>
 </div>;
}