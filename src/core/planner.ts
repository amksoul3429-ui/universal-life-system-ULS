export type PlannerTask = {
  id: string; title: string; created: string; date: string; category?: string;
  priority?: string; done?: boolean; missionId?: string; startTime?: string;
  durationMinutes?: number; notes?: string;
  [key: string]: unknown;
};
export type PlannerPriority = "Low" | "Medium" | "High" | "Critical";
export type PlannerSort = "time" | "priority" | "title" | "duration";
const PRIORITY_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const validTime = (value: unknown): string => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : "";
export function normalizePlannerTask<T extends PlannerTask>(task: T): T {
  const duration = Number(task.durationMinutes);
  const date = typeof task.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(task.date) ? task.date : "";
  return {
    ...task, date,
    category: typeof task.category === "string" && task.category.trim() ? task.category.trim() : "Personal",
    priority: task.priority && PRIORITY_ORDER[task.priority] !== undefined ? task.priority : "Medium",
    done: task.done === true, startTime: validTime(task.startTime),
    durationMinutes: Number.isFinite(duration) ? Math.min(1440, Math.max(5, Math.floor(duration))) : 30,
    notes: typeof task.notes === "string" ? task.notes : "",
  };
}
export function sortPlannerTasks<T extends PlannerTask>(tasks: T[], mode: PlannerSort = "time"): T[] {
  return [...tasks].sort((a,b) => {
    if (mode === "priority") {
      const priority = (PRIORITY_ORDER[a.priority || "Medium"] ?? 2) - (PRIORITY_ORDER[b.priority || "Medium"] ?? 2);
      return priority || (a.date || "").localeCompare(b.date || "") || validTime(a.startTime).localeCompare(validTime(b.startTime)) || a.title.localeCompare(b.title);
    }
    if (mode === "title") return a.title.localeCompare(b.title);
    if (mode === "duration") return (Number(b.durationMinutes)||30) - (Number(a.durationMinutes)||30) || a.title.localeCompare(b.title);
    const timeA = validTime(a.startTime), timeB = validTime(b.startTime);
    if (!timeA && timeB) return 1;
    if (timeA && !timeB) return -1;
    if (timeA !== timeB) return timeA.localeCompare(timeB);
    const priority = (PRIORITY_ORDER[a.priority || "Medium"] ?? 2) - (PRIORITY_ORDER[b.priority || "Medium"] ?? 2);
    return priority || a.title.localeCompare(b.title);
  });
}
export function getDaySummary(tasks: PlannerTask[], date: string) {
  const day = tasks.filter(task => task.date === date);
  const completed = day.filter(task => task.done).length;
  const scheduled = day.filter(task => validTime(task.startTime)).length;
  const plannedMinutes = day.filter(task => validTime(task.startTime)).reduce((sum, task) => sum + (Number(task.durationMinutes) || 0), 0);
  return { total: day.length, completed, remaining: day.length - completed, scheduled, plannedMinutes, percent: day.length ? Math.round(completed / day.length * 100) : 0 };
}
export function getOverdueTasks(tasks: PlannerTask[], today: string) {
  return tasks.filter(task => !!task.date && task.date < today && task.done !== true);
}
export function getScheduleConflicts<T extends PlannerTask>(tasks: T[]) {
  const scheduled = tasks.filter(task => !task.done && !!validTime(task.startTime)).sort((a,b) => validTime(a.startTime).localeCompare(validTime(b.startTime)));
  const conflicts: Array<{first: T; second: T}> = [];
  for (let i=0;i<scheduled.length;i++) {
    const start = validTime(scheduled[i].startTime);
    const end = minutes(start) + (Number(scheduled[i].durationMinutes) || 30);
    for (let j=i+1;j<scheduled.length;j++) {
      const nextStart = minutes(validTime(scheduled[j].startTime));
      if (nextStart >= end) break;
      conflicts.push({first: scheduled[i], second: scheduled[j]});
    }
  }
  return conflicts;
}
function minutes(time: string) { const [hours, mins] = time.split(":").map(Number); return hours*60+mins; }
export function syncMissionTask(tasks: PlannerTask[], mission: {id:string;title:string;category?:string;priority?:string;deadline?:string}) {
  return tasks.map(task => task.missionId === mission.id ? {
    ...task, title: mission.title, category: mission.category || "Personal",
    priority: mission.priority || "Medium", date: mission.deadline || task.date,
  } : task);
}
export function removeMissionTasks(tasks: PlannerTask[], missionId: string) {
  return tasks.filter(task => task.missionId !== missionId);
}