import {CalendarDays,Check,Clock3,Edit3,Play,Plus,RotateCcw,Target,Trash2} from "lucide-react";
import {normalizeMission,type Mission} from "../core/missions";
type Props={missions:Mission[];onEdit:(mission:Mission)=>void;onDelete:(mission:Mission)=>void;onActivate:(id:string)=>void;onComplete:(id:string)=>void;onPlanner:(id:string)=>void};
const dateLabel=(value?:string)=>value?new Date(value+"T00:00:00").toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"}):"No deadline";
export default function MissionControl({missions,onEdit,onDelete,onActivate,onComplete,onPlanner}:Props){
 const ordered=[...missions].sort((a,b)=>{const rank=(x:Mission)=>normalizeMission(x).status==="Active"?0:normalizeMission(x).status==="Available"?1:2;return rank(a)-rank(b)||String(a.deadline||"9999").localeCompare(String(b.deadline||"9999"))});
 const active=missions.filter(m=>normalizeMission(m).status==="Active").length,available=missions.filter(m=>normalizeMission(m).status==="Available").length,completed=missions.filter(m=>normalizeMission(m).status==="Completed").length;
 return <div className="mission-control">
  <div className="mission-summary"><article><Target/><small>ACTIVE</small><strong>{active}</strong></article><article><Clock3/><small>AVAILABLE</small><strong>{available}</strong></article><article><Check/><small>COMPLETED</small><strong>{completed}</strong></article></div>
  <div className="mission-guide"><b>Mission protocol</b><span>Available → Active → Completed</span><p>Activate a mission when you begin. Complete it to receive its XP and credits once.</p></div>
  {ordered.map(raw=>{const m=normalizeMission(raw),status=m.status!;return <article className={"mission-card mission-"+status.toLowerCase()} key={m.id}>
   <div className="mission-card-top"><span className={"mission-status "+status.toLowerCase()}>{status}</span><span className="mission-xp">+{m.xp||0} XP</span></div>
   <div className="mission-main"><div><h3>{m.title}</h3>{m.description&&<p>{m.description}</p>}</div><div className="mission-actions"><button title="Edit mission" onClick={()=>onEdit(m)}><Edit3 size={15}/></button><button title="Delete mission" onClick={()=>onDelete(m)}><Trash2 size={15}/></button></div></div>
   <div className="mission-meta"><span>{m.category||"Personal"}</span><span>{m.difficulty||"Medium"} difficulty</span><span>{m.priority||"Medium"} priority</span><span><CalendarDays size={12}/> {dateLabel(m.deadline)}</span></div>
   <div className="mission-card-bottom">
    {status==="Available"&&<button className="primary mini" onClick={()=>onActivate(m.id)}><Play size={13}/> ACTIVATE</button>}
    {status==="Active"&&<><button className="primary mini" onClick={()=>onComplete(m.id)}><Check size={13}/> COMPLETE MISSION</button><button className="secondary mini" onClick={()=>onActivate(m.id)}><RotateCcw size={13}/> RETURN TO AVAILABLE</button></>}
    {status!=="Completed"&&<button className="secondary mini" onClick={()=>onPlanner(m.id)}><Plus size={13}/> ADD TO PLANNER</button>}
    {status==="Completed"&&<b className="green"><Check size={14}/> COMPLETED · REWARD AWARDED</b>}
   </div>
  </article>})}
  {!missions.length&&<div className="empty">No missions yet. Create your first mission and turn an intention into an executable objective.</div>}
 </div>
}
