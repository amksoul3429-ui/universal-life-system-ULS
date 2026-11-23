import { useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Clock, ExternalLink, Film, Link2, Pencil, Play, Plus, Search, Trash2, Video, X } from "lucide-react";
import { normalizeVideo, parseVideoUrl, videoChapterTimestamp, videoEmbedUrl, videoSummary, updateVideoStatus, type LearningVideo } from "../core/video";
import "./VideoLearningStudio.css";

type Props = { videos: any[]; courses: any[]; onChange: (videos: LearningVideo[]) => void; onOpenKnowledge: () => void };
const uid = () => crypto.randomUUID();
const seconds = (value: string) => { const p=value.trim().split(":").map(Number); return p.length===2 && p.every(Number.isFinite) ? Math.max(0,p[0]*60+p[1]) : p.length===3 && p.every(Number.isFinite) ? Math.max(0,p[0]*3600+p[1]*60+p[2]) : 0; };
export default function VideoLearningStudio({ videos, courses, onChange, onOpenKnowledge }: Props) {
  const items = useMemo(() => videos.map(normalizeVideo).filter((v): v is LearningVideo => !!v), [videos]);
  const [selectedId,setSelectedId]=useState("");
  const [editing,setEditing]=useState<LearningVideo|null>(null);
  const [editorOpen,setEditorOpen]=useState(false);
  const [filter,setFilter]=useState("All");
  const [query,setQuery]=useState("");
  const [chapterStart,setChapterStart]=useState(0);
  const [noteDraft,setNoteDraft]=useState<Record<string,string>>({});
  const current=items.find(v=>v.id===selectedId)||items[0]||null;
  const summary=videoSummary(items);
  const visible=items.filter(v=>(filter==="All"||v.status===filter)&&[v.title,v.subject,v.description,v.provider].join(" ").toLowerCase().includes(query.toLowerCase()));
  const save=(form:HTMLFormElement)=>{
    const f=new FormData(form), val=(k:string)=>String(f.get(k)||"").trim();
    const parsed=parseVideoUrl(val("url"));
    if(!parsed){alert("Use a valid public YouTube or Vimeo video URL over HTTPS.");return;}
    const courseId=val("courseId"), lessonId=val("lessonId");
    const resources=val("resources").split("\n").map(line=>{const [label,...url]=line.split("|");return {id:uid(),label:label.trim()||"Resource",url:url.join("|").trim()};}).filter(r=>r.url);
    const chapters=val("chapters").split("\n").map(line=>{const [stamp,...title]=line.split("|");return {id:uid(),title:title.join("|").trim(),seconds:seconds(stamp)};}).filter(c=>c.title);
    const next:LearningVideo={
      id:editing?.id||uid(),title:val("title"),created:editing?.created||new Date().toISOString(),
      url:parsed.canonicalUrl,provider:parsed.provider,description:val("description"),
      durationMinutes:Math.max(0,Number(val("duration"))||0),subject:val("subject")||"General",level:val("level")||"Beginner",
      transcript:val("transcript"),visualUrl:val("visualUrl"),resources,chapters,courseId,lessonId,
      status:editing?.status||"Saved",watchedAt:editing?.watchedAt,notes:editing?.notes||"",updatedAt:new Date().toISOString()
    };
    onChange(editing?items.map(v=>v.id===editing.id?next:v):[next,...items]);
    setSelectedId(next.id);setEditorOpen(false);setEditing(null);setChapterStart(0);
  };
  const setStatus=(video:LearningVideo,status:LearningVideo["status"])=>onChange(updateVideoStatus(items,video.id,status));
  const saveNotes=(video:LearningVideo)=>{onChange(items.map(v=>v.id===video.id?{...v,notes:noteDraft[video.id]??video.notes,updatedAt:new Date().toISOString()}:v));};
  const remove=(video:LearningVideo)=>{if(!confirm("Delete this video and its notes from your local library?"))return;onChange(items.filter(v=>v.id!==video.id));if(selectedId===video.id)setSelectedId("");};
  const openEditor=(video?:LearningVideo)=>{setEditing(video||null);setEditorOpen(true);};
  const embed= current ? videoEmbedUrl(current)+(chapterStart?(current.provider==="YouTube"?"?start="+chapterStart:"#t="+chapterStart+"s"):"") : "";
  const linkedCourse=current?courses.find(c=>c.id===current.courseId):null;
  const linkedLesson=linkedCourse?.lessons?.find((l:any)=>l.id===current?.lessonId);
  return <div className="video-studio">
    <div className="head"><div><small>ARVENA / LEARNING MEDIA</small><h1>Video Learning Studio</h1><p>Watch, annotate and organize video lessons alongside your Universal Knowledge curriculum.</p></div><button className="primary" onClick={()=>openEditor()}><Plus size={15}/> ADD VIDEO</button></div>
    <div className="stats">
      <div className="stat"><Video/><div><small>LIBRARY</small><b>{summary.total}</b></div></div>
      <div className="stat"><CheckCircle2/><div><small>WATCHED</small><b>{summary.watched}</b></div></div>
      <div className="stat"><Play/><div><small>IN PROGRESS</small><b>{summary.inProgress}</b></div></div>
      <div className="stat"><Clock/><div><small>WATCH TIME</small><b>{summary.minutes} min</b></div></div>
    </div>
    <div className="vs-toolbar">
      <label className="vs-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search videos or subjects"/></label>
      <div className="vs-filters">{["All","Saved","In Progress","Watched"].map(s=><button key={s} className={filter===s?"active":""} onClick={()=>setFilter(s)}>{s}</button>)}</div>
    </div>
    <div className="vs-layout">
      <aside className="vs-library">
        <div className="vs-library-title">YOUR VIDEO LIBRARY <span>{visible.length}</span></div>
        {visible.map(v=><button key={v.id} className={"vs-item "+(current?.id===v.id?"selected":"")} onClick={()=>{setSelectedId(v.id);setChapterStart(0);}}>
          <span className="vs-thumb"><Film size={18}/></span><span className="vs-item-copy"><b>{v.title}</b><small>{v.subject} · {v.provider}</small><i className={"vs-status "+v.status.toLowerCase().replace(" ","-")}>{v.status}</i></span>
        </button>)}
        {!visible.length&&<div className="vs-empty">No matching videos. Add a YouTube or Vimeo lesson to begin.</div>}
      </aside>
      <section className="vs-player-area">
        {!current&&<div className="vs-welcome"><Video size={34}/><h2>Your learning media workspace</h2><p>Save a video from YouTube or Vimeo, then attach notes, transcripts, chapters and supporting resources.</p><button className="primary" onClick={()=>openEditor()}><Plus size={15}/> ADD YOUR FIRST VIDEO</button></div>}
        {current&&<>
          <div className="vs-player">
            <iframe key={current.id+"-"+chapterStart} src={embed} title={"Video lesson: "+current.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>
          </div>
          <div className="vs-video-heading"><div><span className="tag">{current.provider} · {current.subject} · {current.level}</span><h2>{current.title}</h2><p>{current.description||"No description added yet."}</p></div><div className="actions"><button title="Edit video" onClick={()=>openEditor(current)}><Pencil size={15}/></button><button title="Delete video" onClick={()=>remove(current)}><Trash2 size={15}/></button></div></div>
          <div className="vs-video-actions">
            <button className="secondary" disabled={current.status==="In Progress"} onClick={()=>setStatus(current,"In Progress")}><Play size={14}/> MARK IN PROGRESS</button>
            <button className="primary" disabled={current.status==="Watched"} onClick={()=>setStatus(current,"Watched")}><CheckCircle2 size={14}/> MARK WATCHED</button>
            <a href={current.url} target="_blank" rel="noreferrer">OPEN ORIGINAL <ExternalLink size={13}/></a>
          </div>
          <div className="vs-detail-grid">
            <section className="panel"><h4>VIDEO CHAPTERS</h4>{current.chapters.length?current.chapters.map(c=><button className={"vs-chapter "+(chapterStart===c.seconds?"active":"")} key={c.id} onClick={()=>setChapterStart(c.seconds)}><span>{videoChapterTimestamp(c.seconds)}</span>{c.title}</button>):<p className="muted">Add chapters as mm:ss | Chapter title in video settings.</p>}</section>
            <section className="panel"><h4>STUDY NOTES</h4><textarea value={noteDraft[current.id]??current.notes} onChange={e=>setNoteDraft(p=>({...p,[current.id]:e.target.value}))} rows={7} placeholder="Write key ideas, questions, examples and revision notes..."/><button className="secondary mini" onClick={()=>saveNotes(current)}>SAVE NOTES</button></section>
          </div>
          {current.transcript&&<section className="panel vs-transcript"><h4>TRANSCRIPT / NARRATION NOTES</h4><div>{current.transcript}</div></section>}
          {current.visualUrl&&<section className="panel vs-visual"><h4>SUPPORTING VISUAL</h4><a href={current.visualUrl} target="_blank" rel="noreferrer"><img src={current.visualUrl} alt={"Supporting visual for "+current.title}/></a></section>}
          {current.resources.length>0&&<section className="panel vs-resources"><h4>SUPPORTING LEARNING RESOURCES</h4>{current.resources.map(r=><a key={r.id} href={r.url} target="_blank" rel="noreferrer"><Link2 size={14}/>{r.label}<ExternalLink size={12}/></a>)}</section>}
          <section className="panel vs-course-link"><h4>UNIVERSAL KNOWLEDGE CONNECTION</h4>{linkedCourse&&linkedLesson?<><p><b>{linkedCourse.title}</b> / {linkedLesson.title}</p><button className="secondary mini" onClick={onOpenKnowledge}><BookOpen size={14}/> OPEN COURSE IN KNOWLEDGE LIBRARY</button></>:<p className="muted">Not linked to a course lesson. Edit this video to connect it with Universal Knowledge.</p>}</section>
        </>}
      </section>
    </div>
    {editorOpen&&<div className="backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setEditorOpen(false);}}><form className="modal vs-editor" onSubmit={e=>{e.preventDefault();save(e.currentTarget);}}>
      <div className="modalhead"><div><small>VIDEO LEARNING STUDIO</small><h2>{editing?"Edit video lesson":"Add video lesson"}</h2></div><button type="button" onClick={()=>setEditorOpen(false)}><X/></button></div>
      <label>Video title<input name="title" required maxLength={140} defaultValue={editing?.title||""}/></label>
      <label>YouTube or Vimeo URL<input name="url" type="url" required placeholder="https://www.youtube.com/watch?v=..." defaultValue={editing?.url||""}/><small className="muted">Only HTTPS YouTube and Vimeo videos are embedded. Other providers are not connected.</small></label>
      <label>Description<textarea name="description" rows={2} defaultValue={editing?.description||""}/></label>
      <div className="formgrid"><label>Subject<input name="subject" defaultValue={editing?.subject||"General"}/></label><label>Level<select name="level" defaultValue={editing?.level||"Beginner"}>{["Beginner","Foundations","Intermediate","Advanced","Expert"].map(x=><option key={x}>{x}</option>)}</select></label></div>
      <label>Duration (minutes)<input name="duration" type="number" min="0" max="100000" defaultValue={editing?.durationMinutes||0}/></label>
      <div className="kl-form-divider">CURRICULUM CONNECTION (OPTIONAL)</div>
      <label>Knowledge course<select name="courseId" defaultValue={editing?.courseId||""}><option value="">Not linked</option>{courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
      <label>Course lesson<select name="lessonId" defaultValue={editing?.lessonId||""}><option value="">No lesson selected</option>{courses.flatMap(c=>(c.lessons||[]).map((l:any)=><option key={c.id+"-"+l.id} value={l.id}>{c.title} — {l.title}</option>))}</select></label>
      <div className="kl-form-divider">TRANSCRIPT, VISUALS AND RESOURCES</div>
      <label>Transcript / narration notes<textarea name="transcript" rows={4} defaultValue={editing?.transcript||""} placeholder="Paste a transcript or write narration/teaching notes. This is user-supplied text, not AI-generated narration."/></label>
      <label>Supporting visual URL<input name="visualUrl" type="url" defaultValue={editing?.visualUrl||""} placeholder="https://... image URL"/></label>
      <label>Resources (one per line: Label | https://URL)<textarea name="resources" rows={3} defaultValue={editing?.resources.map(r=>r.label+" | "+r.url).join("\n")||""}/></label>
      <label>Chapters (one per line: mm:ss | Chapter title)<textarea name="chapters" rows={3} defaultValue={editing?.chapters.map(c=>videoChapterTimestamp(c.seconds)+" | "+c.title).join("\n")||""}/></label>
      <div className="modalactions"><button type="button" className="secondary" onClick={()=>setEditorOpen(false)}>CANCEL</button><button className="primary"><CheckCircle2 size={14}/> SAVE VIDEO</button></div>
    </form></div>}
  </div>;
}
