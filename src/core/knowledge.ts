export type KnowledgeResource = { label: string; url: string };
export type KnowledgeQuestion = { prompt: string; options: string[]; answerIndex: number; explanation: string };
export type KnowledgeLesson = {
  id: string; title: string; summary: string; content: string; objectives: string[];
  estimatedMinutes: number; resources: KnowledgeResource[]; question?: KnowledgeQuestion;
  done: boolean; completedAt?: string;
};
export type KnowledgeCourse = {
  id: string; title: string; created: string; subject: string; level: string; description: string;
  objectives: string[]; prerequisiteCourseId: string; unlockCost: number; unlocked: boolean;
  lessons: KnowledgeLesson[]; done: boolean; completedAt?: string; updatedAt: string;
};
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = "") => typeof v === "string" ? v : fallback;
const num = (v: unknown, min: number, max: number, fallback: number) => typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.floor(v))) : fallback;
const strings = (v: unknown) => Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()).map(x => x.trim()) : [];
export function normalizeKnowledgeLesson(value: unknown, index = 0): KnowledgeLesson | null {
  if (!isObj(value)) return null;
  const title = str(value.title).trim();
  if (!title) return null;
  const resources = Array.isArray(value.resources) ? value.resources.filter(isObj).map(r => ({ label: str(r.label, "Reference"), url: str(r.url) })).filter(r => r.url) : [];
  let question: KnowledgeQuestion | undefined;
  if (isObj(value.question)) {
    const q = value.question;
    const options = strings(q.options);
    const answerIndex = num(q.answerIndex, 0, Math.max(0, options.length - 1), 0);
    if (str(q.prompt).trim() && options.length >= 2) question = { prompt: str(q.prompt), options, answerIndex, explanation: str(q.explanation) };
  }
  return {
    id: str(value.id, "lesson-" + index), title, summary: str(value.summary), content: str(value.content),
    objectives: strings(value.objectives), estimatedMinutes: num(value.estimatedMinutes, 1, 1440, 20),
    resources, ...(question ? { question } : {}), done: value.done === true,
    ...(typeof value.completedAt === "string" ? { completedAt: value.completedAt } : {}),
  };
}
export function normalizeKnowledgeCourse(value: unknown): KnowledgeCourse | null {
  if (!isObj(value) || typeof value.id !== "string" || !value.id || typeof value.title !== "string" || !value.title.trim()) return null;
  const legacy = !Array.isArray(value.lessons);
  const lessons = legacy
    ? [{ id: "legacy-" + value.id, title: str(value.title), summary: str(value.description), content: str(value.notes), objectives: [], estimatedMinutes: 20, resources: [], done: value.done === true, ...(value.done === true ? { completedAt: str(value.completedAt, str(value.created)) } : {}) }]
    : (value.lessons as unknown[]).map(normalizeKnowledgeLesson).filter((x): x is KnowledgeLesson => !!x);
  const done = value.done === true || (lessons.length > 0 && lessons.every(l => l.done));
  return {
    id: value.id, title: value.title.trim(), created: str(value.created), subject: str(value.subject, "General"),
    level: str(value.level, "Beginner"), description: str(value.description), objectives: strings(value.objectives),
    prerequisiteCourseId: str(value.prerequisiteCourseId), unlockCost: num(value.unlockCost, 0, 100000, 0),
    unlocked: value.unlocked === true || legacy || !str(value.prerequisiteCourseId),
    lessons, done, ...(typeof value.completedAt === "string" ? { completedAt: value.completedAt } : {}),
    updatedAt: str(value.updatedAt, str(value.created)),
  };
}
export function knowledgeProgress(course: KnowledgeCourse) {
  const total = course.lessons.length, completed = course.lessons.filter(l => l.done).length;
  return { total, completed, percent: total ? Math.round(completed / total * 100) : 0, minutes: course.lessons.reduce((n,l) => n + l.estimatedMinutes, 0) };
}
export function unlockKnowledgeCourse(values: unknown[], courseId: string, credits: number, mode: "spend" | "milestone" = "spend") {
  const courses = values.map(normalizeKnowledgeCourse).filter((c): c is KnowledgeCourse => !!c);
  const target = courses.find(c => c.id === courseId);
  if (!target) return { changed: false, courses, credits, reason: "Course not found" };
  if (target.unlocked) return { changed: false, courses, credits, reason: "Course is already unlocked" };
  if (mode === "spend" && target.prerequisiteCourseId && target.unlockCost === 0 && !courses.some(c => c.id === target.prerequisiteCourseId && c.done)) return { changed: false, courses, credits, reason: "Complete the prerequisite or assign a positive credit unlock cost" };\n  if (mode === "spend" && credits < target.unlockCost) return { changed: false, courses, credits, reason: "Not enough credits to unlock this course" };
  if (mode === "milestone" && target.prerequisiteCourseId && !courses.some(c => c.id === target.prerequisiteCourseId && c.done)) {
    return { changed: false, courses, credits, reason: "Complete the prerequisite course first" };
  }
  const next = courses.map(c => c.id === courseId ? { ...c, unlocked: true, updatedAt: new Date().toISOString() } : c);
  return { changed: true, courses: next, credits: mode === "spend" ? credits - target.unlockCost : credits, reason: mode === "spend" ? "Course unlocked with credits" : "Course unlocked by learning milestone" };
}
export function completeKnowledgeLesson(values: unknown[], courseId: string, lessonId: string, now = new Date().toISOString()) {
  const courses = values.map(normalizeKnowledgeCourse).filter((c): c is KnowledgeCourse => !!c);
  const current = courses.find(c => c.id === courseId);
  if (!current) return { changed: false, courses, xpAwarded: 0, courseCompleted: false, unlockedCourseIds: [], reason: "Course not found" };
  if (!current.unlocked) return { changed: false, courses, xpAwarded: 0, courseCompleted: false, unlockedCourseIds: [], reason: "Unlock this course before studying it" };
  const lesson = current.lessons.find(l => l.id === lessonId);
  if (!lesson) return { changed: false, courses, xpAwarded: 0, courseCompleted: false, unlockedCourseIds: [], reason: "Lesson not found" };
  if (lesson.done) return { changed: false, courses, xpAwarded: 0, courseCompleted: false, unlockedCourseIds: [], reason: "Lesson already completed" };
  const updatedLessons = current.lessons.map(l => l.id === lessonId ? { ...l, done: true, completedAt: now } : l);
  const newlyCompleted = updatedLessons.length > 0 && updatedLessons.every(l => l.done) && !current.done;
  const updated = { ...current, lessons: updatedLessons, done: updatedLessons.length > 0 && updatedLessons.every(l => l.done), ...(newlyCompleted ? { completedAt: now } : {}), updatedAt: now };
  let next = courses.map(c => c.id === courseId ? updated : c);
  const unlockedCourseIds: string[] = [];
  if (newlyCompleted) {
    next = next.map(c => {
      if (!c.unlocked && c.prerequisiteCourseId === courseId) { unlockedCourseIds.push(c.id); return { ...c, unlocked: true, updatedAt: now }; }
      return c;
    });
  }
  return { changed: true, courses: next, xpAwarded: 10 + (newlyCompleted ? 50 : 0), courseCompleted: newlyCompleted, unlockedCourseIds, reason: newlyCompleted ? "Course completed" : "Lesson completed" };
}
export function evaluateKnowledgeAnswer(lessonValue: unknown, selectedIndex: number) {
  const lesson = normalizeKnowledgeLesson(lessonValue);
  if (!lesson?.question) return { valid: false, correct: false, explanation: "This lesson has no assessment." };
  return { valid: true, correct: selectedIndex === lesson.question.answerIndex, explanation: lesson.question.explanation };
}
export function knowledgeSummary(values: unknown[]) {
  const courses = values.map(normalizeKnowledgeCourse).filter((c): c is KnowledgeCourse => !!c);
  const lessons = courses.flatMap(c => c.lessons);
  return { courses: courses.length, unlocked: courses.filter(c => c.unlocked).length, completedCourses: courses.filter(c => c.done).length,
    lessons: lessons.length, completedLessons: lessons.filter(l => l.done).length,
    progress: lessons.length ? Math.round(lessons.filter(l => l.done).length / lessons.length * 100) : 0,
    studyMinutes: lessons.filter(l => l.done).reduce((n,l) => n + l.estimatedMinutes, 0) };
}
