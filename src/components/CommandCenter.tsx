import {Activity,BookOpen,CalendarDays,Check,ChevronRight,Clock3,Flame,Plus,Target,Trophy,Wallet,Zap} from 'lucide-react';

type Item={id:string;title:string;created:string;[key:string]:any};
type Data={missions:Item[];tasks:Item[];goals:Item[];knowledge:Item[];rewards:Item[];journal:Item[];xp:number;credits:number};
type Props={data:Data;level:number;xpIntoLevel:number;onOpen:(page:'Missions'|'Planner'|'Dream Life'|'Knowledge'|'Journal')=>void;onNavigate:(page:'Missions'|'Planner'|'Dream Life'|'Knowledge')=>void;onToggleTask:(id:string)=>void};

const dateKey=(date:Date)=>{const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');return `${y}-${m}-${d}`};
const prettyDate=(date:Date)=>new Intl.DateTimeFormat(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(date);
const clamp=(value:number)=>Math.min(100,Math.max(0,Number(value)||0));

export default function CommandCenter({data,level,xpIntoLevel,onOpen,onNavigate,onToggleTask}:Props){
 const now=new Date(),today=dateKey(now),tasks=data.tasks.filter(t=>t.date===today),done=tasks.filter(t=>t.done).length;
 const missions=data.missions.filter(m=>!m.done),goals=data.goals,learning=data.knowledge;
 const learningDone=learning.filter(k=>k.done).length,goalAverage=goals.length?Math.round(goals.reduce((sum,g)=>sum+clamp(g.progress),0)/goals.length):0;
 const upcoming=[...data.missions.filter(m=>!m.done&&m.deadline&&m.deadline>=today).map(m=>({id:m.id,title:m.title,date:m.deadline,type:'Mission'})),...data.tasks.filter(t=>!t.done&&t.date&&t.date>today).map(t=>({id:t.id,title:t.title,date:t.date,type:'Task'})),...goals.filter(g=>g.target&&g.target>=today).map(g=>({id:g.id,title:g.title,date:g.target,type:'Goal'}))].sort((a,b)=>a.date.localeCompare(b.date)).slice(0,4);
 const daysLeft=(date:string)=>Math.round((new Date(date+'T00:00:00').getTime()-new Date(today+'T00:00:00').getTime())/86400000);
 const actions:[string,string,()=>void][]=[['Mission','Create a mission',()=>onOpen('Missions')],['Task','Plan a task',()=>onOpen('Planner')],['Goal','Add a life goal',()=>onOpen('Dream Life')],['Learn','Add a learning item',()=>onOpen('Knowledge')],['Journal','Write an entry',()=>onOpen('Journal')]];
 return <div className="command-center">
  <section className="cc-welcome">
   <div><span className="cc-eyebrow">ARVENA / PERSONAL COMMAND</span><h1>Your direction.<br/><em>Your next move.</em></h1><p>{prettyDate(now)} · One deliberate day at a time.</p></div>
   <div className="cc-level"><div className="cc-level-icon"><Zap size={25}/></div><small>OPERATOR LEVEL</small><strong>{level}</strong><span>{xpIntoLevel} / 500 XP</span><div className="cc-track"><i style={{width:(xpIntoLevel/5)+'%'}}/></div></div>
  </section>
  <section className="cc-stats">
   <article><Target/><small>ACTIVE MISSIONS</small><strong>{missions.length}</strong><span>{data.missions.length-missions.length} completed</span></article>
   <article><Check/><small>TODAY'S TASKS</small><strong>{done}/{tasks.length}</strong><span>{tasks.length?Math.round(done/tasks.length*100):0}% completed</span></article>
   <article><Trophy/><small>TOTAL EXPERIENCE</small><strong>{data.xp.toLocaleString()}</strong><span>XP earned</span></article>
   <article><Wallet/><small>AVAILABLE CREDITS</small><strong>{data.credits.toLocaleString()}</strong><span>Reward balance</span></article>
  </section>
  <section className="cc-section"><div className="cc-section-heading"><div><span className="cc-eyebrow">EXECUTE</span><h2>Quick actions</h2></div><span>Start something meaningful</span></div><div className="cc-actions">{actions.map(([symbol,label,run])=><button key={symbol} onClick={run}><span>{symbol==='Mission'?<Target/>:symbol==='Task'?<CalendarDays/>:symbol==='Goal'?<Activity/>:symbol==='Learn'?<BookOpen/>:<Flame/>}</span>{label}<Plus className="cc-plus"/></button>)}</div></section>
  <div className="cc-columns">
   <section className="cc-card"><div className="cc-card-heading"><div><span className="cc-eyebrow">TODAY</span><h2>Execution board</h2></div><button onClick={()=>onNavigate('Planner')}>Open planner <ChevronRight/></button></div>
    <div className="cc-progress-label"><strong>{tasks.length?Math.round(done/tasks.length*100):0}%</strong><span>{done} of {tasks.length} tasks completed</span></div><div className="cc-track cc-wide"><i style={{width:(tasks.length?done/tasks.length*100:0)+'%'}}/></div>
    {tasks.length?tasks.map(t=><button className="cc-task" key={t.id} onClick={()=>onToggleTask(t.id)}><span className={t.done?'cc-check is-done':'cc-check'}>{t.done?<Check/>:null}</span><span className={t.done?'is-struck':''}>{t.title}</span><small>{t.priority||'Planned'}</small></button>):<div className="cc-empty">No tasks scheduled for today.<button onClick={()=>onOpen('Planner')}>Plan your day <ChevronRight/></button></div>}
   </section>
   <section className="cc-card"><div className="cc-card-heading"><div><span className="cc-eyebrow">LONG-TERM DIRECTION</span><h2>Growth overview</h2></div><button onClick={()=>onNavigate('Dream Life')}>View goals <ChevronRight/></button></div>
    <div className="cc-metric"><div><span>Life goals</span><strong>{goals.length}</strong></div><div className="cc-track"><i style={{width:goalAverage+'%'}}/></div><small>{goalAverage}% average progress</small></div>
    <div className="cc-metric"><div><span>Learning library</span><strong>{learningDone}/{learning.length}</strong></div><div className="cc-track"><i style={{width:(learning.length?learningDone/learning.length*100:0)+'%'}}/></div><small>{learning.length?Math.round(learningDone/learning.length*100):0}% completed</small></div>
    <div className="cc-metric"><div><span>Mission completion</span><strong>{data.missions.length?Math.round((data.missions.length-missions.length)/data.missions.length*100):0}%</strong></div><div className="cc-track"><i style={{width:(data.missions.length?(data.missions.length-missions.length)/data.missions.length*100:0)+'%'}}/></div><small>{data.missions.length-missions.length} of {data.missions.length} completed</small></div>
   </section>
  </div>
  <section className="cc-card cc-deadlines"><div className="cc-card-heading"><div><span className="cc-eyebrow">STAY AHEAD</span><h2>Upcoming deadlines</h2></div><Clock3/></div>
   {upcoming.length?upcoming.map(item=><div className="cc-deadline" key={item.type+item.id}><span className="cc-date">{new Date(item.date+'T00:00:00').toLocaleDateString(undefined,{day:'2-digit',month:'short'})}</span><div><strong>{item.title}</strong><small>{item.type}</small></div><b>{daysLeft(item.date)===0?'Today':daysLeft(item.date)===1?'Tomorrow':`In ${daysLeft(item.date)} days`}</b></div>):<div className="cc-empty">No upcoming deadlines recorded. Add dates to missions, tasks or goals to see them here.</div>}
  </section>
 </div>;
}
