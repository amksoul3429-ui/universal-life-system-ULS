import { useMemo, useState } from "react";
import { BookOpen, CheckCircle2, ChevronRight, Clock, ExternalLink, GraduationCap, Lock, Plus, Trash2, Trophy } from "lucide-react";
import {
  completeKnowledgeLesson, evaluateKnowledgeAnswer, knowledgeProgress, knowledgeSummary,
  normalizeKnowledgeCourse, unlockKnowledgeCourse,
  type KnowledgeCourse, type KnowledgeLesson,
} from "../core/knowledge";
import "./KnowledgeLibrary.css";

type Props = {
  courses: any[];
  credits: number;
  onChange: (courses: KnowledgeCourse[]) => void;
  onEconomy: (courses: KnowledgeCourse[], credits: number, xp: number) => void;
};
const uid = () => crypto.randomUUID();

export default function KnowledgeLibrary({ courses, credits, onChange, onEconomy }: Props) {
  const normalized = useMemo(
    () => courses.map(normalizeKnowledgeCourse).filter((c): c is KnowledgeCourse => !!c),
    [courses],
  );
  const [selectedId, setSelectedId] = useState("");
  const [courseEditor, setCourseEditor] = useState<KnowledgeCourse | null>(null);\n  const [courseOpen, setCourseOpen] = useState(false);
  const [lessonEditor, setLessonEditor] = useState<KnowledgeLesson | null>(null);\n  const [lessonOpen, setLessonOpen] = useState(false);
  const [activeLesson, setActiveLesson] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const summary = knowledgeSummary(normalized);
  const current = normalized.find(c => c.id === selectedId) || normalized.find(c => c.unlocked) || normalized[0];

  const saveCourse = (form: HTMLFormElement) => {
    const f = new FormData(form);
    const value = (key: string) => String(f.get(key) || "");
    const old = courseEditor || null;
    const prerequisite = value("prerequisite");
    const next: KnowledgeCourse = {
      id: old?.id || uid(),
      title: value("title").trim(),
      created: old?.created || new Date().toISOString(),
      subject: value("subject").trim(),
      level: value("level"),
      description: value("description"),
      objectives: value("objectives").split("\n").map(x => x.trim()).filter(Boolean),
      prerequisiteCourseId: prerequisite,
      unlockCost: Math.max(0, Number(value("unlockCost")) || 0),
      unlocked: old?.unlocked ?? (!prerequisite || normalized.some(c => c.id === prerequisite && c.done)),
      lessons: old?.lessons || [],
      done: old?.done || false,
      updatedAt: new Date().toISOString(),
    };
    onChange(old ? normalized.map(c => c.id === old.id ? next : c) : [...normalized, next]);
    setSelectedId(next.id);
    setCourseOpen(false);
  };

  const saveLesson = (form: HTMLFormElement) => {
    if (!current) return;
    const f = new FormData(form);
    const value = (key: string) => String(f.get(key) || "");
    const options = value("options").split("\n").map(x => x.trim()).filter(Boolean);
    const question = value("question").trim() && options.length >= 2
      ? {
          prompt: value("question"),
          options,
          answerIndex: Math.max(0, Math.min(options.length - 1, Number(value("answerIndex")) || 0)),
          explanation: value("explanation"),
        }
      : undefined;
    const old = lessonEditor || null;
    const lesson: KnowledgeLesson = {
      id: old?.id || uid(),
      title: value("title").trim(),
      summary: value("summary"),
      content: value("content"),
      objectives: value("objectives").split("\n").map(x => x.trim()).filter(Boolean),
      estimatedMinutes: Math.max(1, Number(value("minutes")) || 20),
      resources: value("url").trim() ? [{ label: value("source") || "Reference", url: value("url") }] : [],
      ...(question ? { question } : {}),
      done: old?.done || false,
      ...(old?.completedAt ? { completedAt: old.completedAt } : {}),
    };
    onChange(normalized.map(c => c.id === current.id
      ? { ...c, lessons: old ? c.lessons.map(l => l.id === old.id ? lesson : l) : [...c.lessons, lesson], done: false, updatedAt: new Date().toISOString() }
      : c));
    setLessonOpen(false);
  };

  const unlock = (course: KnowledgeCourse, mode: "spend" | "milestone") => {
    const result = unlockKnowledgeCourse(normalized, course.id, credits, mode);
    if (result.changed) {
      onEconomy(result.courses, result.credits, 0);
      setFeedback(p => ({ ...p, [course.id]: result.reason }));
    } else setFeedback(p => ({ ...p, [course.id]: result.reason }));
  };

  const finishLesson = (course: KnowledgeCourse, lesson: KnowledgeLesson) => {
    if (lesson.question) {
      const check = evaluateKnowledgeAnswer(lesson, answers[lesson.id]);
      if (!check.correct) {
        setFeedback(p => ({ ...p, [lesson.id]: "Not quite. " + check.explanation }));
        return;
      }
    }
    const result = completeKnowledgeLesson(normalized, course.id, lesson.id);
    if (result.changed) {
      onEconomy(result.courses, credits, result.xpAwarded);
      setFeedback(p => ({
        ...p,
        [lesson.id]: result.reason + " · +" + result.xpAwarded + " XP" +
          (result.unlockedCourseIds.length ? " · next course unlocked" : ""),
      }));
    }
  };

  const deleteCourse = (course: KnowledgeCourse) => {
    if (!confirm("Delete this course and all its lesson progress?")) return;
    onChange(normalized.filter(c => c.id !== course.id));
    if (selectedId === course.id) setSelectedId("");
  };

  const deleteLesson = (course: KnowledgeCourse, lesson: KnowledgeLesson) => {
    if (!confirm("Delete this lesson and its progress?")) return;
    const lessons = course.lessons.filter(l => l.id !== lesson.id);
    onChange(normalized.map(c => c.id === course.id
      ? { ...c, lessons, done: lessons.length > 0 && lessons.every(l => l.done), completedAt: undefined, updatedAt: new Date().toISOString() }
      : c));
  };

  return (
    <div className="knowledge-library">
      <div className="head">
        <div>
          <small>ARVENA / UNIVERSAL KNOWLEDGE</small>
          <h1>Knowledge Library</h1>
          <p>Build understanding from fundamentals to advanced mastery, one lesson at a time.</p>
        </div>
        <button className="primary" onClick={() => { setCourseEditor(null); setCourseOpen(true); }}><Plus size={15} /> CREATE COURSE</button>
      </div>

      <div className="stats">
        <div className="stat"><BookOpen /><div><small>COURSES</small><b>{summary.courses}</b></div></div>
        <div className="stat"><GraduationCap /><div><small>LESSONS COMPLETED</small><b>{summary.completedLessons}/{summary.lessons}</b></div></div>
        <div className="stat"><Trophy /><div><small>COURSES MASTERED</small><b>{summary.completedCourses}</b></div></div>
        <div className="stat"><Clock /><div><small>STUDY TIME</small><b>{summary.studyMinutes} min</b></div></div>
      </div>

      <div className="knowledge-layout">
        <aside className="knowledge-courses">
          <div className="kl-section-title">YOUR CURRICULUM <span>{summary.unlocked} unlocked</span></div>
          {normalized.map(course => {
            const progress = knowledgeProgress(course);
            return (
              <button key={course.id} className={"kl-course " + ((current?.id === course.id) ? "selected" : "")}
                onClick={() => { setSelectedId(course.id); setActiveLesson(""); }}>
                <span className="kl-course-icon">{course.unlocked ? <BookOpen size={17} /> : <Lock size={16} />}</span>
                <span className="kl-course-copy"><b>{course.title}</b><small>{course.subject} · {course.level}</small><i><em style={{ width: progress.percent + "%" }} /></i></span>
                <small>{progress.percent}%</small>
              </button>
            );
          })}
          {!normalized.length && <p className="muted">Create a course for any subject to start your curriculum.</p>}
        </aside>

        <section className="knowledge-main">
          {!current && <div className="empty">Create your first course to begin building your universal curriculum.</div>}
          {current && !current.unlocked && (
            <div className="kl-locked">
              <Lock size={28} /><h2>{current.title}</h2>
              <p>{current.description || "This course is locked in your learning path."}</p>
              <p>Unlock cost: <b>{current.unlockCost} credits</b> · Available: <b>{credits} credits</b></p>
              <div className="kl-actions">
                <button className="primary" disabled={credits < current.unlockCost} onClick={() => unlock(current, "spend")}>UNLOCK WITH CREDITS</button>
                {current.prerequisiteCourseId && <button className="secondary" onClick={() => unlock(current, "milestone")}>CHECK LEARNING MILESTONE</button>}
              </div>
              <small>{feedback[current.id] || "Complete the prerequisite to unlock automatically, or spend credits to open early."}</small>
            </div>
          )}
          {current?.unlocked && (
            <>
              <div className="kl-course-header">
                <div><span className="tag">{current.subject} · {current.level}</span><h2>{current.title}</h2><p>{current.description}</p></div>
                <div className="actions">
                  <button onClick={() => { setCourseEditor(current); setCourseOpen(true); }}>EDIT</button>
                  <button onClick={() => deleteCourse(current)}><Trash2 size={15} /></button>
                </div>
              </div>
              <div className="kl-progress">
                <div><b>{knowledgeProgress(current).percent}% mastery</b><span>{knowledgeProgress(current).completed} of {knowledgeProgress(current).total} lessons</span></div>
                <div className="bar"><i style={{ width: knowledgeProgress(current).percent + "%" }} /></div>
              </div>
              <div className="kl-objectives">
                <b>COURSE LEARNING OUTCOMES</b>
                {current.objectives.length ? <ul>{current.objectives.map((o, i) => <li key={i}>{o}</li>)}</ul> : <p className="muted">Add learning outcomes when editing this course.</p>}
              </div>
              <div className="kl-lessons-heading"><h3>LESSONS</h3><button className="secondary" onClick={() => { setLessonEditor(null); setLessonOpen(true); }}><Plus size={14} /> ADD LESSON</button></div>
              {current.lessons.map((lesson, index) => (
                <article className={"kl-lesson " + (activeLesson === lesson.id ? "open" : "")} key={lesson.id}>
                  <button className="kl-lesson-toggle" onClick={() => setActiveLesson(activeLesson === lesson.id ? "" : lesson.id)}>
                    <span className={lesson.done ? "kl-done" : "kl-number"}>{lesson.done ? <CheckCircle2 size={17} /> : String(index + 1).padStart(2, "0")}</span>
                    <span><b>{lesson.title}</b><small>{lesson.estimatedMinutes} min · {lesson.done ? "Completed" : "Not completed"}</small></span>
                    <ChevronRight size={16} />
                  </button>
                  {activeLesson === lesson.id && (
                    <div className="kl-lesson-body">
                      <div className="kl-lesson-actions">
                        <button className="secondary mini" onClick={() => { setLessonEditor(lesson); setLessonOpen(true); }}>EDIT LESSON</button>
                        <button className="danger mini" onClick={() => deleteLesson(current, lesson)}>DELETE</button>
                      </div>
                      <p>{lesson.summary}</p>
                      <div className="kl-content">{lesson.content || "Lesson content has not been added yet."}</div>
                      {lesson.objectives.length > 0 && <><b>KEY LEARNING POINTS</b><ul>{lesson.objectives.map((o, i) => <li key={i}>{o}</li>)}</ul></>}
                      {lesson.resources.map((resource, i) => <p key={i}><a href={resource.url} target="_blank" rel="noreferrer">{resource.label} <ExternalLink size={12} /></a></p>)}
                      {lesson.question && (
                        <div className="kl-quiz">
                          <b>KNOWLEDGE CHECK</b><p>{lesson.question.prompt}</p>
                          {lesson.question.options.map((option, i) => (
                            <label key={i}><input type="radio" name={"quiz-" + lesson.id} checked={answers[lesson.id] === i} onChange={() => setAnswers(p => ({ ...p, [lesson.id]: i }))} />{option}</label>
                          ))}
                        </div>
                      )}
                      {feedback[lesson.id] && <p className="kl-feedback">{feedback[lesson.id]}</p>}
                      <button className="primary" disabled={lesson.done || (!!lesson.question && answers[lesson.id] === undefined)} onClick={() => finishLesson(current, lesson)}>
                        {lesson.done ? "LESSON COMPLETED" : "MARK LESSON COMPLETE"}
                      </button>
                    </div>
                  )}
                </article>
              ))}
              {!current.lessons.length && <div className="empty">This course has no lessons yet.<br /><button className="textbtn" onClick={() => setLessonEditor(null)}>＋ Add the first lesson</button></div>}
              {current.done && <div className="kl-complete"><Trophy /> COURSE MASTERED · ALL LESSONS COMPLETED</div>}
            </>
          )}
        </section>
      </div>

      {courseOpen && (
        <div className="backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setCourseEditor(false); }}>
          <form className="modal" onSubmit={e => { e.preventDefault(); saveCourse(e.currentTarget); }}>
            <div className="modalhead"><div><small>UNIVERSAL KNOWLEDGE</small><h2>{courseEditor ? "Edit course" : "Create course"}</h2></div><button type="button" onClick={() => setCourseEditor(false)}>×</button></div>
            <label>Course title<input name="title" required maxLength={120} defaultValue={courseEditor?.title || ""} /></label>
            <div className="formgrid">
              <label>Subject<input name="subject" required defaultValue={courseEditor?.subject || ""} placeholder="e.g. Physics, Finance, Programming" /></label>
              <label>Learning level<select name="level" defaultValue={courseEditor?.level || "Beginner"}>{["Beginner", "Foundations", "Intermediate", "Advanced", "Expert"].map(x => <option key={x}>{x}</option>)}</select></label>
            </div>
            <label>Description<textarea name="description" defaultValue={courseEditor?.description || ""} /></label>
            <label>Learning outcomes (one per line)<textarea name="objectives" defaultValue={courseEditor?.objectives.join("\n") || ""} /></label>
            <label>Prerequisite course<select name="prerequisite" defaultValue={courseEditor?.prerequisiteCourseId || ""}><option value="">No prerequisite (start here)</option>{normalized.filter(c => c.id !== courseEditor?.id).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
            <label>Credit unlock cost<input name="unlockCost" type="number" min="0" max="100000" defaultValue={courseEditor?.unlockCost ?? 0} /></label>
            <div className="modalactions"><button type="button" className="secondary" onClick={() => setCourseEditor(false)}>CANCEL</button><button className="primary">SAVE COURSE</button></div>
          </form>
        </div>
      )}

      {lessonOpen && current && (
        <div className="backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setLessonEditor(false); }}>
          <form className="modal" onSubmit={e => { e.preventDefault(); saveLesson(e.currentTarget); }}>
            <div className="modalhead"><div><small>COURSE / {current.title}</small><h2>{lessonEditor ? "Edit lesson" : "Add lesson"}</h2></div><button type="button" onClick={() => setLessonEditor(false)}>×</button></div>
            <label>Lesson title<input name="title" required maxLength={120} defaultValue={lessonEditor?.title || ""} /></label>
            <label>Short summary<textarea name="summary" defaultValue={lessonEditor?.summary || ""} /></label>
            <label>Detailed lesson content<textarea name="content" required style={{ minHeight: 150 }} defaultValue={lessonEditor?.content || ""} placeholder="Explain fundamentals, concepts, worked examples, applications and common mistakes." /></label>
            <label>Learning points (one per line)<textarea name="objectives" defaultValue={lessonEditor?.objectives.join("\n") || ""} /></label>
            <label>Estimated time (minutes)<input name="minutes" type="number" min="1" max="1440" defaultValue={lessonEditor?.estimatedMinutes ?? 20} /></label>
            <div className="kl-form-divider">OPTIONAL SOURCE / REFERENCE</div>
            <label>Source name<input name="source" defaultValue={lessonEditor?.resources[0]?.label || ""} placeholder="Textbook, official documentation, paper..." /></label>
            <label>Source URL<input name="url" type="url" defaultValue={lessonEditor?.resources[0]?.url || ""} placeholder="https://..." /></label>
            <div className="kl-form-divider">OPTIONAL KNOWLEDGE CHECK</div>
            <label>Question<input name="question" defaultValue={lessonEditor?.question?.prompt || ""} placeholder="Test understanding" /></label>
            <label>Answer options (one per line)<textarea name="options" defaultValue={lessonEditor?.question?.options.join("\n") || ""} placeholder={"Option A\nOption B\nOption C"} /></label>
            <label>Correct option number (starting from 0)<input name="answerIndex" type="number" min="0" defaultValue={lessonEditor?.question?.answerIndex ?? 0} /></label>
            <label>Explanation<textarea name="explanation" defaultValue={lessonEditor?.question?.explanation || ""} /></label>
            <div className="modalactions"><button type="button" className="secondary" onClick={() => setLessonEditor(false)}>CANCEL</button><button className="primary">SAVE LESSON</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
