import {useEffect,useState} from 'react';
import CommandCenter from './components/CommandCenter';
import {getLevel,xpIntoLevel,completeMissionReward,redeemReward} from './core/system';
import {Activity,BookOpen,CalendarDays,Check,ChevronRight,Compass,Download,Edit3,Flame,LayoutDashboard,Menu,Plus,Settings,Sparkles,Target,Trash2,Trophy,Upload,Wallet,X,Zap} from 'lucide-react';
type Page='Overview'|'Missions'|'Planner'|'Dream Life'|'Evolution'|'Knowledge'|'Rewards'|'Journal'|'Reports'|'Settings';
type Item={id:string;title:string;created:string;[key:string]:any};
type Data={missions:Item[];tasks:Item[];goals:Item[];knowledge:Item[];rewards:Item[];journal:Item[];xp:number;credits:number};
const blank:Data={missions:[],tasks:[],goals:[],knowledge:[],rewards:[],journal:[],xp:0,credits:0};
const KEY='uls-data-v1',today=()=>new Date().toISOString().slice(0,10),id=()=>crypto.randomUUID();
const sections:Page[]=['Overview','Missions','Planner','Dream Life','Evolution','Knowledge','Rewards','Journal','Reports','Settings'];
const labels:Record<Page,string>={'Overview':'Command Center','Missions':'Mission Control','Planner':'Daily Planner','Dream Life':'Dream Life','Evolution':'Personal Evolution','Knowledge':'Knowledge Library','Rewards':'Rewards & Achievements','Journal':'Personal Journal','Reports':'System Reports','Settings':'Settings'};
function read():Data{try{return {...blank,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return blank}}
function App(){
 const[data,setData]=useState<Data>(read),[page,setPage]=useState<Page>('Overview'),[modal,setModal]=useState<Page|null>(null),[editing,setEditing]=useState<Item|null>(null),[mobile,setMobile]=useState(false),[toast,setToast]=useState(''),[search,setSearch]=useState('');
 useEffect(()=>{localStorage.setItem(KEY,JSON.stringify(data))},[data]);useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(''),2400);return()=>clearTimeout(t)}},[toast]);
 const key=(p:Page)=>p==='Missions'?'missions':p==='Planner'?'tasks':p==='Dream Life'?'goals':p==='Knowledge'?'knowledge':p==='Rewards'?'rewards':'journal';
 const open=(p:Page,item?:Item)=>{setEditing(item||null);setModal(p)};
 const remove=(p:Page,item:Item)=>{setData(d=>({...d,[key(p)]:d[key(p)].filter(x=>x.id!==item.id)}));setToast('Deleted')};
 const save=(p:Page,form:HTMLFormElement)=>{const f=new FormData(form),v=(k:string)=>String(f.get(k)||''),old=editing;const base={id:old?.id||id(),title:v('title'),created:old?.created||new Date().toISOString()};
 let item:Item=base;
 if(p==='Missions')item={...base,description:v('description'),category:v('category'),difficulty:v('difficulty'),xp:+v('xp'),deadline:v('deadline'),done:old?.done||false};
 if(p==='Planner')item={...base,date:v('date'),category:v('category'),priority:v('priority'),done:old?.done||false};
 if(p==='Dream Life')item={...base,description:v('description'),area:v('area'),target:v('target'),progress:+v('progress')};
 if(p==='Knowledge')item={...base,subject:v('subject'),level:v('level'),done:old?.done||false};
 if(p==='Rewards')item={...base,description:v('description'),type:v('type'),cost:+v('cost'),redeemed:old?.redeemed||false};
 if(p==='Journal')item={...base,content:v('content'),mood:v('mood')};
 setData(d=>({...d,[key(p)]:old?d[key(p)].map(x=>x.id===old.id?item:x):[item,...d[key(p)]]}));setModal(null);setEditing(null);setToast(old?'Saved changes':'Added successfully')};
 const completeMission=(m:Item)=>{
  setData(d=>{
    const result=completeMissionReward(d.missions,d.xp,d.credits,m.id);
    if(!result.awarded)return d;
    setToast('Mission complete · XP and credits awarded');
    return {...d,missions:result.missions,xp:result.xp,credits:result.credits};
  });
};
 const redeem=(r:Item)=>{
  setData(d=>{
    const result=redeemReward(d.rewards,d.credits,r.id);
    if(!result.redeemed){setToast(result.reason);return d;}
    setToast('Reward redeemed');
    return {...d,rewards:result.rewards,credits:result.credits};
  });
};
 const list=(p:Page)=>data[key(p)].filter(x=>x.title.toLowerCase().includes(search.toLowerCase()));
 const tasksToday=data.tasks.filter(x=>x.date===today()),doneToday=tasksToday.filter(x=>x.done).length;
 const navIcon:Record<Page,any>={Overview:LayoutDashboard,Missions:Target,Planner:CalendarDays,'Dream Life':Compass,Evolution:Activity,Knowledge:BookOpen,Rewards:Trophy,Journal:Edit3,Reports:Flame,Settings:Settings};
 return <div className="shell">
 {mobile&&<button className="scrim" onClick={()=>setMobile(false)}/>}<aside className={mobile?'sidebar show':'sidebar'}>
 <div className="brand"><span><Sparkles/></span><div><b>ARVENA</b><small>PERSONAL SYSTEM</small></div><button className="close" onClick={()=>setMobile(false)}><X/></button></div>
 <div className="operator"><b>System Operator</b><small>Level {getLevel(data.xp)} · {data.xp} XP</small></div>
 {sections.map(p=>{const I=navIcon[p];return <button key={p} className={'nav '+(page===p?'active':'')} onClick={()=>{setPage(p);setMobile(false)}}><I size={17}/>{labels[p]}{page===p&&<ChevronRight size={14}/>}</button>})}
 <div className="sidefoot">● LOCAL SYSTEM · V1.0</div></aside>
 <main><header><button className="hamb" onClick={()=>setMobile(true)}><Menu/></button><span>ARVENA　›　<b>{labels[page].toUpperCase()}</b></span><div className="chips"><i><Wallet size={14}/> {data.credits} credits</i><i><Zap size={14}/> LVL {getLevel(data.xp)}</i></div></header>
 <div className="content">
 {page==='Overview'&&<CommandCenter data={data} level={getLevel(data.xp)} xpIntoLevel={xpIntoLevel(data.xp)} onOpen={p=>open(p)} onNavigate={p=>setPage(p)} onToggleTask={taskId=>setData(d=>({...d,tasks:d.tasks.map(t=>t.id===taskId?{...t,done:!t.done}:t)}))}/>}
 {page==='Missions'&&<><Head page={page} onAdd={()=>open(page)}/>{list(page).map(m=><Record key={m.id} item={m} onEdit={()=>open(page,m)} onDelete={()=>remove(page,m)} extra={<><small>{m.category} · {m.difficulty} · {m.xp} XP</small>{!m.done&&<button className="primary mini" onClick={()=>completeMission(m)}>COMPLETE</button>}{m.done&&<b className="green">COMPLETED</b>}</>}/>)}{!data.missions.length&&<Empty text="No missions yet." onAdd={()=>open(page)}/>}</>}
 {page==='Planner'&&<><Head page={page} onAdd={()=>open(page)}/>{list(page).sort((a,b)=>a.date.localeCompare(b.date)).map(t=><div className="record" key={t.id}><Task item={t} toggle={()=>setData(d=>({...d,tasks:d.tasks.map(x=>x.id===t.id?{...x,done:!x.done}:x)}))}/><small>{t.date} · {t.category} · {t.priority}</small><Actions edit={()=>open(page,t)} del={()=>remove(page,t)}/></div>)}{!data.tasks.length&&<Empty text="Your planner is empty." onAdd={()=>open(page)}/>}</>}
 {page==='Dream Life'&&<><Head page={page} onAdd={()=>open(page)}/><div className="grid">{list(page).map(g=><article className="panel" key={g.id}><Actions edit={()=>open(page,g)} del={()=>remove(page,g)}/><span className="tag">{g.area}</span><h3>{g.title}</h3><p>{g.description}</p><div className="bar"><i style={{width:g.progress+'%'}}/></div><small>{g.progress}% · {g.target||'No target date'}</small><input type="range" min="0" max="100" value={g.progress} onChange={e=>setData(d=>({...d,goals:d.goals.map(x=>x.id===g.id?{...x,progress:+e.target.value}:x)}))}/></article>)}</div>{!data.goals.length&&<Empty text="Define the life you want to build." onAdd={()=>open(page)}/>}</>}
 {page==='Evolution'&&<><Head page={page}/><div className="stats">{[[Flame,'LEVEL',getLevel(data.xp)],[Zap,'TOTAL XP',data.xp],[Target,'MISSIONS DONE',data.missions.filter(x=>x.done).length],[BookOpen,'LEARNING DONE',data.knowledge.filter(x=>x.done).length]].map(([I,l,v]:any)=><Stat key={l} icon={I} label={l} value={v}/>)}</div><Panel title="LEVEL PROGRESSION"><p>{xpIntoLevel(data.xp)} / 500 XP to next level</p><div className="bar"><i style={{width:(xpIntoLevel(data.xp))/5+'%'}}/></div></Panel></>}
 {page==='Knowledge'&&<><Head page={page} onAdd={()=>open(page)}/><div className="stats"><Stat icon={BookOpen} label="LEARNING ITEMS" value={data.knowledge.length}/><Stat icon={Check} label="COMPLETED" value={data.knowledge.filter(x=>x.done).length}/></div>{list(page).map(k=><div className="record" key={k.id}><Task item={{...k,category:k.subject,priority:k.level}} toggle={()=>setData(d=>({...d,knowledge:d.knowledge.map(x=>x.id===k.id?{...x,done:!x.done}:x)}))}/><Actions edit={()=>open(page,k)} del={()=>remove(page,k)}/></div>)}{!data.knowledge.length&&<Empty text="Add subjects to your learning library." onAdd={()=>open(page)}/>}</>}
 {page==='Rewards'&&<><Head page={page} onAdd={()=>open(page)}/><div className="stats"><Stat icon={Wallet} label="AVAILABLE CREDITS" value={data.credits}/><Stat icon={Trophy} label="REWARDS" value={data.rewards.length}/></div><div className="grid">{list(page).map(r=><article className="panel" key={r.id}><Actions edit={()=>open(page,r)} del={()=>remove(page,r)}/><span className="tag">{r.type}</span><h3>{r.title}</h3><p>{r.description}</p><b>{r.cost} credits</b>{r.redeemed?<p className="green">REDEEMED</p>:<button className="primary mini" onClick={()=>redeem(r)}>REDEEM</button>}</article>)}</div>{!data.rewards.length&&<Empty text="Create rewards for your progress." onAdd={()=>open(page)}/>}</>}
 {page==='Journal'&&<><Head page={page} onAdd={()=>open(page)}/>{list(page).map(e=><article className="panel" key={e.id}><Actions edit={()=>open(page,e)} del={()=>remove(page,e)}/><small>{e.created.slice(0,10)} · {e.mood}</small><h3>{e.title}</h3><p>{e.content}</p></article>)}{!data.journal.length&&<Empty text="Your journal is waiting for its first entry." onAdd={()=>open(page)}/>}</>}
 {page==='Reports'&&<><Head page={page}/><div className="stats"><Stat icon={Target} label="MISSIONS COMPLETE" value={data.missions.filter(x=>x.done).length}/><Stat icon={Check} label="TASKS COMPLETE" value={data.tasks.filter(x=>x.done).length}/><Stat icon={BookOpen} label="LEARNING COMPLETE" value={data.knowledge.filter(x=>x.done).length}/><Stat icon={Trophy} label="LEVEL" value={getLevel(data.xp)}/></div><Panel title="RECORDED ACTIVITY"><p>{data.missions.length} missions · {data.tasks.length} tasks · {data.goals.length} goals · {data.knowledge.length} learning items · {data.journal.length} journal entries.</p></Panel></>}
 {page==='Settings'&&<><Head page={page}/><Panel title="BACKUP & RESTORE"><p>Your data is stored in this browser. Export backups regularly; browser data can be erased.</p><button className="primary" onClick={()=>{const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.href=u;a.download='uls-backup.json';a.click();URL.revokeObjectURL(u)}}><Download size={15}/> EXPORT BACKUP</button> <label className="secondary upload"><Upload size={15}/> RESTORE BACKUP<input hidden type="file" accept="application/json" onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(String(r.result));if(!Array.isArray(x.missions)||!Array.isArray(x.tasks))throw 0;setData({...blank,...x});setToast('Backup restored')}catch{setToast('Invalid backup')}};r.readAsText(f)}}/></label></Panel><Panel title="CAPABILITIES & PRIVACY"><p>This is a local-first browser app. It does not currently include AI model connections, cloud sync, authentication, encrypted backup, Android packaging or health-provider integrations.</p><p className="muted">Local browser storage is not encrypted. Keep exported backups private.</p></Panel><Panel title="RESET DATA"><button className="danger" onClick={()=>{if(confirm('Delete all local ULS data?'))setData(blank)}}>RESET ALL DATA</button></Panel></>}
 </div><footer>ARVENA · PRIVATE BUILD · LOCAL-FIRST</footer></main>
 {modal&&<Modal page={modal} initial={editing} close={()=>{setModal(null);setEditing(null)}} save={f=>save(modal,f)}/>}
 {toast&&<div className="toast">✓　{toast}</div>}
 <div className="search"><input placeholder="Filter current section..." value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<button onClick={()=>setSearch('')}><X size={13}/></button>}</div>
 </div>
}
function Stat({icon:I,label,value}:{icon:any;label:string;value:any}){return <div className="stat"><I size={19}/><div><small>{label}</small><b>{value}</b></div></div>}
function Panel({title,children}:{title:string;children:any}){return <section className="panel"><h4>{title}</h4>{children}</section>}
function Head({page,onAdd}:{page:Page;onAdd?:()=>void}){return <div className="head"><div><small>UNIVERSAL LIFE SYSTEM / {page.toUpperCase()}</small><h1>{labels[page]}</h1><p>Plan deliberately. Execute consistently. Review honestly.</p></div>{onAdd&&<button className="primary" onClick={onAdd}><Plus size={15}/> ADD NEW</button>}</div>}
function Empty({text,onAdd}:{text:string;onAdd:()=>void}){return <div className="empty">{text}<br/><button className="textbtn" onClick={onAdd}>＋ Add a record</button></div>}
function Actions({edit,del}:{edit:()=>void;del:()=>void}){return <div className="actions"><button onClick={edit}><Edit3 size={15}/></button><button onClick={del}><Trash2 size={15}/></button></div>}
function Record({item,onEdit,onDelete,extra}:{item:Item;onEdit:()=>void;onDelete:()=>void;extra:any}){return <article className="record"><div className="recordtext"><h3>{item.title}</h3><p>{item.description}</p>{extra}</div><Actions edit={onEdit} del={onDelete}/></article>}
function Task({item,toggle}:{item:Item;toggle:()=>void}){return <div className="task"><button className={item.done?'checked':''} onClick={toggle}><Check size={13}/></button><b className={item.done?'strike':''}>{item.title}</b></div>}
function Modal({page,initial,close,save}:{page:Page;initial:Item|null;close:()=>void;save:(f:HTMLFormElement)=>void}){
 const title=labels[page]||page;
 return <div className="backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><form className="modal" onSubmit={e=>{e.preventDefault();save(e.currentTarget)}}><div className="modalhead"><div><small>ULS / RECORD</small><h2>{initial?'Edit record':title}</h2></div><button type="button" onClick={close}><X/></button></div>
 <label>Title<input name="title" required maxLength={120} defaultValue={initial?.title||''}/></label>
 {page==='Missions'&&<><label>Description<textarea name="description" defaultValue={initial?.description||''}/></label><div className="formgrid"><label>Category<select name="category" defaultValue={initial?.category||'Personal'}>{['Personal','Studies','Business','Health','Fitness','Learning'].map(x=><option>{x}</option>)}</select></label><label>Difficulty<select name="difficulty" defaultValue={initial?.difficulty||'Medium'}>{['Easy','Medium','Hard','Elite'].map(x=><option>{x}</option>)}</select></label></div><label>XP reward<input name="xp" type="number" min="0" defaultValue={initial?.xp??50}/></label><label>Deadline<input name="deadline" type="date" defaultValue={initial?.deadline||''}/></label></>}
 {page==='Planner'&&<><label>Date<input name="date" type="date" defaultValue={initial?.date||today()} required/></label><div className="formgrid"><label>Category<select name="category" defaultValue={initial?.category||'Personal'}>{['Personal','Studies','Business','Health','Fitness','Other'].map(x=><option>{x}</option>)}</select></label><label>Priority<select name="priority" defaultValue={initial?.priority||'Medium'}>{['Low','Medium','High'].map(x=><option>{x}</option>)}</select></label></div></>}
 {page==='Dream Life'&&<><label>Description<textarea name="description" defaultValue={initial?.description||''}/></label><div className="formgrid"><label>Life area<select name="area" defaultValue={initial?.area||'Personal'}>{['Career','Business','Financial','Home & Lifestyle','Health','Education','Family','Experiences','Personal'].map(x=><option>{x}</option>)}</select></label><label>Target date<input name="target" type="date" defaultValue={initial?.target||''}/></label></div><label>Progress<input name="progress" type="number" min="0" max="100" defaultValue={initial?.progress??0}/></label></>}
 {page==='Knowledge'&&<div className="formgrid"><label>Subject<input name="subject" required defaultValue={initial?.subject||''}/></label><label>Level<select name="level" defaultValue={initial?.level||'Fundamentals'}>{['Fundamentals','Beginner','Intermediate','Advanced','Expert'].map(x=><option>{x}</option>)}</select></label></div>}
 {page==='Rewards'&&<><label>Description<textarea name="description" defaultValue={initial?.description||''}/></label><div className="formgrid"><label>Type<select name="type" defaultValue={initial?.type||'Personal'}>{['Personal','Learning','Experience','Purchase','Milestone'].map(x=><option>{x}</option>)}</select></label><label>Credit cost<input name="cost" type="number" min="1" defaultValue={initial?.cost??10}/></label></div></>}
 {page==='Journal'&&<><label>Entry<textarea name="content" required rows={5} defaultValue={initial?.content||''}/></label><label>Mood<select name="mood" defaultValue={initial?.mood||'Neutral'}>{['Neutral','Happy','Focused','Grateful','Stressed','Sad','Motivated'].map(x=><option>{x}</option>)}</select></label></>}
 <div className="modalactions"><button type="button" className="secondary" onClick={close}>CANCEL</button><button className="primary" type="submit"><Check size={15}/> SAVE</button></div></form></div>
}
export default App;
