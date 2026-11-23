import { useMemo, useState } from "react";
import { Archive, ArrowRight, CalendarDays, Check, Circle, Flag, ListChecks, Pause, Pencil, Plus, Target, Trash2, X } from "lucide-react";
import { addGoalMilestone, goalProgress, goalSummary, normalizeGoal, toggleGoalMilestone, updateGoalStatus, type LifeGoal, type GoalMilestone } from "../core/goals";
import "./DreamLife.css";

type Props = { goals: any[]; onChange: (goals: any[]) => void; onCreateMission: (goal: LifeGoal, milestone: GoalMilestone) => void };
const areas = ["Career","Business","Financial","Home & Lifestyle","Health","Education","Family","Experiences","Personal"];
const priorities = ["Low","Medium","High","Critical"] as const;
const empty = () => ({ title:"", description:"", area:"Personal", target:"", priority:"Medium", why:"", nextAction:"", progress:0 });
const makeId = () => crypto.randomUUID();
const dateLabel = (s: string) => { if(!s) return "No target date"; const d = new Date(s+"T00:00:00"); return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"}); };
export default function DreamLife({goals,onChange,onCreateMission}:Props) {
  const [showForm,setShowForm] = useState(false), [editing,setEditing] = useState<LifeGoal|null>(null), [draft,setDraft] = useState(empty());
  const [milestoneGoal,setMilestoneGoal] = useState<string|null>(null), [milestoneTitle,setMilestoneTitle] = useState(""), [milestoneDate,setMilestoneDate] = useState("");
  const [filter,setFilter] = useState("All");
  const normalized = useMemo(()=>goals.map(normalizeGoal).filter((g):g is LifeGoal=>!!g),[goals]);
  const summary = goalSummary(normalized);
  const visible = normalized.filter(g => filter==="All" ? g.status!=="Archived" : filter==="Archived" ? g.status==="Archived" : g.status===filter);
  const begin = (goal?:LifeGoal) => { setEditing(goal||null); setDraft(goal?{title:goal.title,description:goal.description,area:goal.area,target:goal.target,priority:goal.priority,why:goal.why,nextAction:goal.nextAction,progress:goal.progress}:empty());setShowForm(true); };
  const save = (e:React.FormEvent) => { e.preventDefault(); if(!draft.title.trim())return;
    const now=new Date().toISOString();
    const item:LifeGoal={id:editing?.id||makeId(),created:editing?.created||now,...draft,title:draft.title.trim(),priority:draft.priority as LifeGoal["priority"],status:editing?.status||"Active",milestones:editing?.milestones||[],updatedAt:now,progress:editing?.milestones.length?goalProgress(editing):Math.max(0,Math.min(100,Number(draft.progress)||0)),...(editing?.completedAt?{completedAt:editing.completedAt}:{})};
    onChange(editing?goals.map(g=>g.id===editing.id?item:g):[item,...goals]);setShowForm(false);
  };
  const toggleMilestone=(goalId:string,milestoneId:string)=>onChange(toggleGoalMilestone(goals,goalId,milestoneId).goals);
  const addMilestone=(goalId:string)=>{if(!milestoneTitle.trim())return;const result=addGoalMilestone(goals,goalId,{id:makeId(),title:milestoneTitle,dueDate:milestoneDate,done:false});onChange(result.goals);setMilestoneTitle("");setMilestoneDate("");setMilestoneGoal(null);};
  const status=(g:LifeGoal,s:LifeGoal["status"])=>onChange(updateGoalStatus(goals,g.id,s).goals);
  const remove=(g:LifeGoal)=>{if(confirm("Delete “"+g.title+"” and its milestone history?"))onChange(goals.filter(x=>x.id!==g.id));};
  return <div className="dream">
    <div className="dream-hero"><div><span className="dream-kicker">VISION · DIRECTION · EXECUTION</span><h1>Build the life you envision.</h1><p>Turn long-term ambitions into measurable milestones and meaningful action.</p></div><button className="dream-primary" onClick={()=>begin()}><Plus size={16}/> CREATE LIFE GOAL</button></div>
    <div className="dream-stats">
      <div><Target/><small>VISIBLE GOALS</small><b>{summary.total}</b></div><div><Flag/><small>ACTIVE</small><b>{summary.active}</b></div><div><Check/><small>COMPLETED</small><b>{summary.completed}</b></div><div><ListChecks/><small>MILESTONES</small><b>{summary.milestonesDone}/{summary.milestoneCount}</b></div>
    </div>
    <div className="dream-overview"><div><div className="dream-section-label">OVERALL LIFE PROGRESS</div><strong>{summary.averageProgress}%</strong><span>average progress across visible goals</span></div><div className="dream-bigbar"><i style={{width:summary.averageProgress+"%"}}/></div></div>
    <div className="dream-toolbar"><div><h2>Your life goals</h2><p>Progress is calculated from completed milestones when milestones exist.</p></div><select value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Filter goals"><option>All</option><option>Active</option><option>On Hold</option><option>Completed</option><option>Archived</option></select></div>
    {visible.length===0?<div className="dream-empty"><Target size={28}/><h3>{filter==="All"?"Your vision starts here.":"No goals in this view."}</h3><p>Create a goal, define why it matters, then break it into milestones you can execute.</p>{filter==="All"&&<button className="dream-primary" onClick={()=>begin()}><Plus size={15}/> CREATE YOUR FIRST GOAL</button>}</div>:
      <div className="dream-grid">{visible.map(g=>{const progress=goalProgress(g);return <article className="dream-card" key={g.id}>
        <div className="dream-card-top"><span className="dream-area">{g.area}</span><span className={"dream-status "+g.status.toLowerCase().replace(" ","-")}>{g.status}</span></div>
        <div className="dream-card-title"><h3>{g.title}</h3><div className="dream-icon-actions"><button title="Edit goal" onClick={()=>begin(g)}><Pencil size={14}/></button><button title="Delete goal" onClick={()=>remove(g)}><Trash2 size={14}/></button></div></div>
        {g.description&&<p className="dream-description">{g.description}</p>}
        {g.why&&<div className="dream-why"><span>WHY IT MATTERS</span>{g.why}</div>}
        <div className="dream-progress-row"><b>{progress}%</b><span>{g.priority} priority</span><span><CalendarDays size={12}/> {dateLabel(g.target)}</span></div>
        <div className="dream-progress"><i style={{width:progress+"%"}}/></div>
        {g.nextAction&&<div className="dream-next"><span>NEXT ACTION</span><b>{g.nextAction}</b></div>}
        <div className="dream-milestone-head"><b>Milestones</b><button onClick={()=>setMilestoneGoal(milestoneGoal===g.id?null:g.id)}><Plus size={13}/> ADD</button></div>
        {g.milestones.length===0?<p className="dream-no-milestones">No milestones yet. Add clear checkpoints to make progress measurable.</p>:<div className="dream-milestones">{g.milestones.map(m=><div className={"dream-milestone "+(m.done?"done":"")} key={m.id}><button className="dream-m-check" onClick={()=>toggleMilestone(g.id,m.id)} aria-label={m.done?"Reopen milestone":"Complete milestone"}>{m.done?<Check size={13}/>:<Circle size={13}/>}</button><span>{m.title}<small>{m.dueDate?dateLabel(m.dueDate):"No milestone date"}</small></span>{!m.done&&!m.linkedMissionId&&<button className="dream-convert" title="Turn milestone into a mission" onClick={()=>onCreateMission(g,m)}><ArrowRight size={13}/> MISSION</button>}{m.linkedMissionId&&<small className="dream-linked">MISSION LINKED</small>}</div>)}</div>}
        {milestoneGoal===g.id&&<div className="dream-add-milestone"><input value={milestoneTitle} onChange={e=>setMilestoneTitle(e.target.value)} placeholder="Milestone title" maxLength={120}/><input type="date" value={milestoneDate} onChange={e=>setMilestoneDate(e.target.value)}/><button onClick={()=>addMilestone(g.id)} disabled={!milestoneTitle.trim()}><Check size={14}/></button><button onClick={()=>setMilestoneGoal(null)}><X size={14}/></button></div>}
        <div className="dream-card-footer">{g.status!=="Completed"&&<button onClick={()=>status(g,g.status==="On Hold"?"Active":"On Hold")}>{g.status==="On Hold"?<><ArrowRight size={13}/> RESUME</>:<><Pause size={13}/> PAUSE</>}</button>}{g.status!=="Completed"&&<button onClick={()=>status(g,"Completed")}><Check size={13}/> MARK COMPLETE</button>}{g.status!=="Archived"&&<button onClick={()=>status(g,"Archived")}><Archive size={13}/> ARCHIVE</button>}</div>
      </article>})}</div>}
    {showForm&&<div className="dream-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowForm(false)}}><form className="dream-modal" onSubmit={save}><div className="dream-modal-head"><div><span>DEFINE YOUR DIRECTION</span><h2>{editing?"Edit life goal":"Create a life goal"}</h2></div><button type="button" onClick={()=>setShowForm(false)}><X/></button></div>
      <label>Goal title<input required autoFocus maxLength={120} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="What do you want to achieve?"/></label>
      <label>Description<textarea rows={2} maxLength={1200} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} placeholder="Describe the outcome you want."/></label>
      <div className="dream-form-grid"><label>Life area<select value={draft.area} onChange={e=>setDraft({...draft,area:e.target.value})}>{areas.map(a=><option key={a}>{a}</option>)}</select></label><label>Priority<select value={draft.priority} onChange={e=>setDraft({...draft,priority:e.target.value})}>{priorities.map(p=><option key={p}>{p}</option>)}</select></label></div>
      <div className="dream-form-grid"><label>Target date<input type="date" value={draft.target} onChange={e=>setDraft({...draft,target:e.target.value})}/></label>{(!editing||!editing.milestones.length)&&<label>Current progress (%)<input type="number" min="0" max="100" value={draft.progress} onChange={e=>setDraft({...draft,progress:Number(e.target.value)})}/></label>}</div>
      <label>Why does this matter to you?<textarea rows={2} maxLength={800} value={draft.why} onChange={e=>setDraft({...draft,why:e.target.value})} placeholder="Connect this goal to the life you want."/></label>
      <label>Next concrete action<input maxLength={180} value={draft.nextAction} onChange={e=>setDraft({...draft,nextAction:e.target.value})} placeholder="What is the next step you can take?"/></label>
      <div className="dream-modal-actions"><button type="button" onClick={()=>setShowForm(false)}>CANCEL</button><button type="submit" className="dream-primary"><Check size={15}/> SAVE GOAL</button></div>
    </form></div>}
  </div>;
}
