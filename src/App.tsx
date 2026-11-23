import {useEffect,useState} from 'react';
import CommandCenter from './components/CommandCenter';
import MissionControl from './components/MissionControl';
import DailyPlanner from './components/DailyPlanner';
import DreamLife from './components/DreamLife';
import KnowledgeLibrary from './components/KnowledgeLibrary';
import VideoLearningStudio from './components/VideoLearningStudio';
import PersonalEvolution from './components/PersonalEvolution';
import RewardsAchievements from './components/RewardsAchievements';
import PersonalJournal from './components/PersonalJournal';
import SystemReports from './components/SystemReports';
import SettingsSecurity from './components/SettingsSecurity';
import {syncMissionTask,removeMissionTasks} from './core/planner';
import {normalizeMission,transitionMission,assignMissionToPlanner,missionReward} from './core/missions';
import type { LifeGoal, GoalMilestone } from './core/goals';
import './components/MissionControl.css';
import {getLevel,xpIntoLevel} from './core/system';
import {claimAchievement,redeemPersonalReward,fulfillPersonalReward,unlockSystemItem} from './core/rewards';
import {habitStreak} from './core/evolution';
import {loadAppData,saveAppData,createBackup,parseBackup,subscribeToExternalChanges,clearStoredAppData} from './core/storage';
import {getNotificationAccess,requestNotificationAccess,sendSystemNotification} from './core/permissions';
import {Activity,BookOpen,CalendarDays,Check,ChevronRight,Compass,Download,Edit3,Flame,LayoutDashboard,Menu,Plus,Settings,Sparkles,Target,Trophy,Upload,Wallet,Video as VideoIcon,X,Zap} from 'lucide-react';
type Page='Overview'|'Missions'|'Planner'|'Dream Life'|'Evolution'|'Knowledge'|'Videos'|'Rewards'|'Journal'|'Reports'|'Settings';
type Item={id:string;title:string;created:string;[key:string]:any};
type Data={missions:Item[];tasks:Item[];goals:Item[];knowledge:Item[];videos:Item[];evolution:Item[];rewards:Item[];journal:Item[];achievementClaims:string[];unlockedItems:string[];xp:number;credits:number};
const blank:Data={missions:[],tasks:[],goals:[],knowledge:[],videos:[],evolution:[],rewards:[],journal:[],achievementClaims:[],unlockedItems:[],xp:0,credits:0};
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')},id=()=>crypto.randomUUID();
const rewardMetrics=(d:Data)=>({missionsCompleted:d.missions.filter(m=>m.done||m.status==='Completed').length,businessMissionsCompleted:d.missions.filter(m=>(m.done||m.status==='Completed')&&String(m.category||'').toLowerCase()==='business').length,coursesCompleted:d.knowledge.filter(k=>k.done).length,lessonsCompleted:d.knowledge.reduce((n,k)=>n+(Array.isArray(k.lessons)?k.lessons.filter((l:any)=>l.done).length:(k.done?1:0)),0),habitCheckIns:d.evolution.filter(e=>e.kind==='habit').reduce((n,h)=>n+(Array.isArray(h.checkIns)?h.checkIns.length:0),0),bestHabitStreak:Math.max(0,...d.evolution.filter(e=>e.kind==='habit').map(h=>habitStreak(h,today()))),goalsCompleted:d.goals.filter(g=>g.status==='Completed'||g.done===true).length});
const sections:Page[]=['Overview','Missions','Planner','Dream Life','Evolution','Knowledge','Videos','Rewards','Journal','Reports','Settings'];
const labels:Record<Page,string>={'Overview':'Command Center','Missions':'Mission Control','Planner':'Daily Planner','Dream Life':'Dream Life','Evolution':'Personal Evolution','Knowledge':'Knowledge Library','Videos':'Video Learning Studio','Rewards':'Rewards & Achievements','Journal':'Personal Journal','Reports':'System Reports','Settings':'Settings'};
function App(){
 const[loadResult]=useState(()=>loadAppData());
 const[data,setData]=useState<Data>(()=>loadResult.ok?loadResult.value:blank);
 const[persistenceReady,setPersistenceReady]=useState(loadResult.ok);
 const[notificationAccess,setNotificationAccess]=useState(getNotificationAccess);
 const[page,setPage]=useState<Page>('Overview'),[modal,setModal]=useState<Page|null>(null),[editing,setEditing]=useState<Item|null>(null),[plannerDate,setPlannerDate]=useState(today()),[mobile,setMobile]=useState(false),[toast,setToast]=useState(loadResult.ok?(loadResult.warning||''):loadResult.error),[search,setSearch]=useState('');
 useEffect(()=>{if(!persistenceReady)return;const result=saveAppData(data);if(!result.ok)setToast(result.error)},[data,persistenceReady]);
 useEffect(()=>subscribeToExternalChanges(next=>setData(next)),[]);
 useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(''),4000);return()=>clearTimeout(t)}},[toast]);
 const key=(p:Page)=>p==='Missions'?'missions':p==='Planner'?'tasks':p==='Dream Life'?'goals':p==='Knowledge'?'knowledge':p==='Videos'?'videos':p==='Evolution'?'evolution':p==='Rewards'?'rewards':'journal';
 const open=(p:Page,item?:Item)=>{setEditing(item||null);setModal(p)};
 const openPlanner=(date:string)=>{setPlannerDate(date);open('Planner')};
 const remove=(p:Page,item:Item)=>{setData(d=>({...d,[key(p)]:d[key(p)].filter(x=>x.id!==item.id)}));setToast('Deleted')};
 const save=(p:Page,form:HTMLFormElement)=>{const f=new FormData(form),v=(k:string)=>String(f.get(k)||''),old=editing;const base={id:old?.id||id(),title:v('title'),created:old?.created||new Date().toISOString()};
 let item:Item=base;
 if(p==='Missions')item={...base,description:v('description'),category:v('category'),difficulty:v('difficulty'),priority:v('priority'),xp:+v('xp'),deadline:v('deadline'),status:old?.status||'Available',done:old?.done||false,completedAt:old?.completedAt};
 if(p==='Planner')item={...base,date:v('date'),category:v('category'),priority:v('priority'),done:old?.done||false,missionId:old?.missionId,startTime:v('startTime'),durationMinutes:+v('durationMinutes'),notes:v('notes')};
 if(p==='Dream Life')item={...base,description:v('description'),area:v('area'),target:v('target'),progress:+v('progress')};
 if(p==='Knowledge')item={...base,subject:v('subject'),level:v('level'),done:old?.done||false};
 if(p==='Rewards')item={...base,description:v('description'),type:v('type'),cost:+v('cost'),redeemed:old?.redeemed||false};
 if(p==='Journal')item={...base,content:v('content'),mood:v('mood')};
 setData(d=>{const next={...d,[key(p)]:old?d[key(p)].map(x=>x.id===old.id?item:x):[item,...d[key(p)]]};if(p==='Missions'&&old)next.tasks=syncMissionTask(d.tasks as any,item as any) as Item[];return next});setModal(null);setEditing(null);setToast(old?'Saved changes':'Added successfully')};
 const changeMissionStatus=(missionId:string,next:'Active'|'Available')=>{
  setData(d=>{const result=transitionMission(d.missions,missionId,next);if(!result.ok){setToast(result.reason);return d;}setToast(result.reason);return {...d,missions:result.missions};});
 };
 const completeMission=(missionId:string)=>{
  setData(d=>{const current=d.missions.find(m=>m.id===missionId);if(!current){setToast('Mission not found');return d;}const normalized=normalizeMission(current);if(normalized.status!=='Active'){setToast('Activate this mission before completing it');return d;}const result=transitionMission(d.missions,missionId,'Completed');if(!result.ok){setToast(result.reason);return d;}const reward=missionReward(normalized);setToast('Mission completed · '+reward.xp+' XP and '+reward.credits+' credits awarded');return {...d,missions:result.missions,xp:d.xp+reward.xp,credits:d.credits+reward.credits};});
 };
 const addMissionToPlanner=(missionId:string)=>{
  setData(d=>{const result=assignMissionToPlanner(d.missions,d.tasks as any,missionId,today(),id());if(!result.ok){setToast(result.reason);return d;}setToast('Mission added to Daily Planner · no reward is awarded for assignment');return {...d,tasks:result.tasks};});
 };
 const claimRewardAchievement=(achievementId:string)=>{
  setData(d=>{const result=claimAchievement(rewardMetrics(d),d.achievementClaims,achievementId);if(!result.ok){setToast(result.reason);return d;}setToast('Achievement claimed · +'+result.credits+' credits · +'+result.xp+' XP');return {...d,achievementClaims:result.claimed,credits:d.credits+result.credits,xp:d.xp+result.xp};});
 };
 const unlockSystemReward=(unlockId:string,mode:'credits'|'milestone')=>{
  setData(d=>{const result=unlockSystemItem(d.unlockedItems,rewardMetrics(d),d.credits,unlockId,mode);if(!result.ok){setToast(result.reason);return d;}setToast(result.reason);return {...d,unlockedItems:result.unlocked,credits:result.credits};});
 };
 const redeemPersonal=(rewardId:string)=>{
  setData(d=>{const result=redeemPersonalReward(d.rewards,d.credits,rewardId);if(!result.ok){setToast(result.reason);return d;}setToast(result.reason);return {...d,rewards:result.rewards as Item[],credits:result.credits};});
 };
 const fulfillPersonal=(rewardId:string)=>{
  setData(d=>{const result=fulfillPersonalReward(d.rewards,rewardId);if(!result.ok){setToast(result.reason);return d;}setToast(result.reason);return {...d,rewards:result.rewards as Item[]};});
 };
 const list=(p:Page)=>data[key(p)].filter(x=>x.title.toLowerCase().includes(search.toLowerCase()));
 const navIcon:Record<Page,any>={Overview:LayoutDashboard,Missions:Target,Planner:CalendarDays,'Dream Life':Compass,Evolution:Activity,Knowledge:BookOpen,Videos:VideoIcon,Rewards:Trophy,Journal:Edit3,Reports:Flame,Settings:Settings};
 return <div className="shell">
 {mobile&&<button className="scrim" onClick={()=>setMobile(false)}/>}<aside className={mobile?'sidebar show':'sidebar'}>
 <div className="brand"><span><Sparkles/></span><div><b>ARVENA</b><small>PERSONAL SYSTEM</small></div><button className="close" onClick={()=>setMobile(false)}><X/></button></div>
 <div className="operator"><b>System Operator</b><small>Level {getLevel(data.xp)} · {data.xp} XP</small></div>
 {sections.map(p=>{const I=navIcon[p];return <button key={p} className={'nav '+(page===p?'active':'')} onClick={()=>{setPage(p);setMobile(false)}}><I size={17}/>{labels[p]}{page===p&&<ChevronRight size={14}/>}</button>})}
 <div className="sidefoot">● LOCAL SYSTEM · V1.0</div></aside>
 <main><header><button className="hamb" onClick={()=>setMobile(true)}><Menu/></button><span>ARVENA　›　<b>{labels[page].toUpperCase()}</b></span><div className="chips"><i><Wallet size={14}/> {data.credits} credits</i><i><Zap size={14}/> LVL {getLevel(data.xp)}</i></div></header>
 <div className="content">
 {page==='Overview'&&<CommandCenter data={data} level={getLevel(data.xp)} xpIntoLevel={xpIntoLevel(data.xp)} onOpen={p=>open(p)} onNavigate={p=>setPage(p)} onToggleTask={taskId=>setData(d=>({...d,tasks:d.tasks.map(t=>t.id===taskId?{...t,done:!t.done}:t)}))}/>}
 {page==='Missions'&&<><Head page={page} onAdd={()=>open(page)}/><MissionControl missions={list(page)} onEdit={m=>open(page,m as Item)} onDelete={m=>{if(confirm('Delete this mission and its linked planner task, if any?')){setData(d=>({...d,missions:d.missions.filter(x=>x.id!==m.id),tasks:removeMissionTasks(d.tasks as any,m.id) as Item[]}));setToast('Mission deleted')}}} onActivate={missionId=>{const m=data.missions.find(x=>x.id===missionId);changeMissionStatus(missionId,normalizeMission(m||{id:'',title:'',created:''}).status==='Active'?'Available':'Active')}} onComplete={completeMission} onPlanner={addMissionToPlanner}/></>}
 {page==='Planner'&&<DailyPlanner tasks={data.tasks} onAdd={openPlanner} onEdit={task=>open('Planner',task)} onDelete={task=>{if(confirm('Delete this planner task?'))remove('Planner',task)}} onToggle={taskId=>setData(d=>({...d,tasks:d.tasks.map(t=>t.id===taskId?{...t,done:!t.done}:t)}))}/>}
 {page==='Dream Life'&&<DreamLife goals={data.goals} onChange={goals=>setData(d=>({...d,goals}))} onCreateMission={(goal:LifeGoal,milestone:GoalMilestone)=>{const missionId=id();const category=goal.area==='Education'?'Studies':goal.area==='Health'?'Health':goal.area==='Business'||goal.area==='Financial'?'Business':'Personal';const mission={id:missionId,title:milestone.title,created:new Date().toISOString(),description:'Milestone for life goal: '+goal.title,category,difficulty:'Medium',priority:goal.priority,xp:50,deadline:milestone.dueDate||goal.target,status:'Available',done:false,goalId:goal.id,milestoneId:milestone.id};setData(d=>({...d,missions:[mission,...d.missions],goals:d.goals.map(g=>g.id===goal.id?{...g,milestones:(g.milestones||[]).map((m:GoalMilestone)=>m.id===milestone.id?{...m,linkedMissionId:missionId}:m)}:g)}));setToast('Milestone added to Mission Control · complete it there to earn XP')}}/>}
  {page==='Evolution'&&<PersonalEvolution records={data.evolution} xp={data.xp} onChange={records=>setData(d=>({...d,evolution:records as Item[]}))} onAwardXp={amount=>setData(d=>({...d,xp:d.xp+amount}))} onCreateMission={(title,description)=>{const mission={id:id(),title,created:new Date().toISOString(),description,category:'Personal',difficulty:'Easy',priority:'Medium',xp:30,deadline:'',status:'Available',done:false};setData(d=>({...d,missions:[mission,...d.missions]}));setToast('Growth mission created in Mission Control')}} onScheduleHabit={(title,category)=>{const task={id:id(),title,created:new Date().toISOString(),date:today(),category,priority:'Medium',done:false,startTime:'',durationMinutes:15,notes:'Habit practice scheduled from Personal Evolution'};setData(d=>({...d,tasks:[task,...d.tasks]}));setToast('Habit added to Daily Planner')}}/>}
 {page==='Knowledge'&&<KnowledgeLibrary courses={data.knowledge} credits={data.credits} onChange={courses=>setData(d=>({...d,knowledge:courses as Item[]}))} onEconomy={(courses,credits,xp)=>setData(d=>({...d,knowledge:courses as Item[],credits,xp:d.xp+xp}))}/>}
 {page==='Videos'&&<VideoLearningStudio videos={data.videos} courses={data.knowledge} onChange={videos=>setData(d=>({...d,videos:videos as Item[]}))} onOpenKnowledge={()=>setPage('Knowledge')}/>}
 {page==='Rewards'&&<RewardsAchievements rewards={data.rewards as any[]} xp={data.xp} credits={data.credits} metrics={rewardMetrics(data)} claimedAchievements={data.achievementClaims} unlockedItems={data.unlockedItems} onUnlock={unlockSystemReward} onSaveReward={reward=>setData(d=>({...d,rewards:d.rewards.some(r=>r.id===reward.id)?d.rewards.map(r=>r.id===reward.id?reward as Item:r):[reward as Item,...d.rewards]}))} onDeleteReward={rewardId=>setData(d=>({...d,rewards:d.rewards.filter(r=>r.id!==rewardId)}))} onRedeem={redeemPersonal} onFulfill={fulfillPersonal} onClaimAchievement={claimRewardAchievement}/>}
 {page==='Journal'&&<PersonalJournal entries={data.journal} onChange={entries=>setData(d=>({...d,journal:entries as Item[]}))}/>}
 {page==='Reports'&&<SystemReports data={data}/>}
 {page==='Settings'&&<SettingsSecurity data={data} storageHealthy={loadResult.ok&&persistenceReady} notificationAccess={notificationAccess} onRequestNotifications={async()=>{const access=await requestNotificationAccess();setNotificationAccess(access);if(access==='granted'){sendSystemNotification('ARVENA notifications enabled','Your system can now show browser notifications.');setToast('Notifications enabled')}else if(access==='denied')setToast('Notifications are blocked in browser settings')}} onRestore={(restored,warning)=>{setPersistenceReady(true);setData(restored as Data);setToast(warning||'Backup restored successfully')}} onReset={()=>{const result=clearStoredAppData();if(!result.ok){setToast(result.error);return;}setPersistenceReady(true);setData(blank);setToast('Local data reset')}}/>}
 </div><footer>ARVENA · PRIVATE BUILD · LOCAL-FIRST</footer></main>
 {modal&&<Modal page={modal} initial={editing} defaultDate={plannerDate} close={()=>{setModal(null);setEditing(null)}} save={f=>save(modal,f)}/>}
 {toast&&<div className="toast">✓　{toast}</div>}
 <div className="search"><input placeholder="Filter current section..." value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<button onClick={()=>setSearch('')}><X size={13}/></button>}</div>
 </div>
}
function Panel({title,children}:{title:string;children:any}){return <section className="panel"><h4>{title}</h4>{children}</section>}
function Head({page,onAdd}:{page:Page;onAdd?:()=>void}){return <div className="head"><div><small>UNIVERSAL LIFE SYSTEM / {page.toUpperCase()}</small><h1>{labels[page]}</h1><p>Plan deliberately. Execute consistently. Review honestly.</p></div>{onAdd&&<button className="primary" onClick={onAdd}><Plus size={15}/> ADD NEW</button>}</div>}
function Modal({page,initial,defaultDate,close,save}:{page:Page;initial:Item|null;defaultDate:string;close:()=>void;save:(f:HTMLFormElement)=>void}){
 const title=labels[page]||page;
 return <div className="backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><form className="modal" onSubmit={e=>{e.preventDefault();save(e.currentTarget)}}><div className="modalhead"><div><small>ULS / RECORD</small><h2>{initial?'Edit record':title}</h2></div><button type="button" onClick={close}><X/></button></div>
 <label>Title<input name="title" required maxLength={120} defaultValue={initial?.title||''} readOnly={page==='Planner'&&!!initial?.missionId}/>{page==='Planner'&&initial?.missionId&&<small className="muted">This title is linked to Mission Control. Edit the mission to rename it.</small>}</label>
 {page==='Missions'&&<><label>Description<textarea name="description" defaultValue={initial?.description||''}/></label><div className="formgrid"><label>Category<select name="category" defaultValue={initial?.category||'Personal'}>{['Personal','Studies','Business','Health','Fitness','Learning'].map(x=><option>{x}</option>)}</select></label><label>Difficulty<select name="difficulty" defaultValue={initial?.difficulty||'Medium'}>{['Easy','Medium','Hard','Elite'].map(x=><option>{x}</option>)}</select></label></div><div className="formgrid"><label>Priority<select name="priority" defaultValue={initial?.priority||'Medium'}>{['Low','Medium','High','Critical'].map(x=><option>{x}</option>)}</select></label><label>XP reward<input name="xp" type="number" min="0" max="100000" defaultValue={initial?.xp??50}/></label></div><label>Deadline<input name="deadline" type="date" defaultValue={initial?.deadline||''}/></label></>}
 {page==='Planner'&&<><label>Date<input name="date" type="date" defaultValue={initial?.date||defaultDate} required/></label><div className="formgrid"><label>Start time<input name="startTime" type="time" defaultValue={initial?.startTime||''}/></label><label>Duration (minutes)<input name="durationMinutes" type="number" min="5" max="1440" step="5" defaultValue={initial?.durationMinutes??30}/></label></div><div className="formgrid"><label>Category<select name="category" defaultValue={initial?.category||'Personal'}>{['Personal','Studies','Business','Health','Fitness','Learning','Other'].map(x=><option>{x}</option>)}</select></label><label>Priority<select name="priority" defaultValue={initial?.priority||'Medium'}>{['Low','Medium','High','Critical'].map(x=><option>{x}</option>)}</select></label></div><label>Notes<textarea name="notes" rows={3} maxLength={1000} defaultValue={initial?.notes||''} placeholder="What needs to happen? Any useful details..."/></label></>}
 {page==='Dream Life'&&<><label>Description<textarea name="description" defaultValue={initial?.description||''}/></label><div className="formgrid"><label>Life area<select name="area" defaultValue={initial?.area||'Personal'}>{['Career','Business','Financial','Home & Lifestyle','Health','Education','Family','Experiences','Personal'].map(x=><option>{x}</option>)}</select></label><label>Target date<input name="target" type="date" defaultValue={initial?.target||''}/></label></div><label>Progress<input name="progress" type="number" min="0" max="100" defaultValue={initial?.progress??0}/></label></>}
 {page==='Knowledge'&&<div className="formgrid"><label>Subject<input name="subject" required defaultValue={initial?.subject||''}/></label><label>Level<select name="level" defaultValue={initial?.level||'Fundamentals'}>{['Fundamentals','Beginner','Intermediate','Advanced','Expert'].map(x=><option>{x}</option>)}</select></label></div>}
 {page==='Rewards'&&<><label>Description<textarea name="description" defaultValue={initial?.description||''}/></label><div className="formgrid"><label>Type<select name="type" defaultValue={initial?.type||'Personal'}>{['Personal','Learning','Experience','Purchase','Milestone'].map(x=><option>{x}</option>)}</select></label><label>Credit cost<input name="cost" type="number" min="1" defaultValue={initial?.cost??10}/></label></div></>}
 {page==='Journal'&&<><label>Entry<textarea name="content" required rows={5} defaultValue={initial?.content||''}/></label><label>Mood<select name="mood" defaultValue={initial?.mood||'Neutral'}>{['Neutral','Happy','Focused','Grateful','Stressed','Sad','Motivated'].map(x=><option>{x}</option>)}</select></label></>}
 <div className="modalactions"><button type="button" className="secondary" onClick={close}>CANCEL</button><button className="primary" type="submit"><Check size={15}/> SAVE</button></div></form></div>
}
export default App;
