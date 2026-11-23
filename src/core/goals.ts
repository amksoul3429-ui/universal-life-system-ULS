export type GoalStatus = "Active" | "On Hold" | "Completed" | "Archived";
export type GoalPriority = "Low" | "Medium" | "High" | "Critical";
export type GoalMilestone = { id: string; title: string; done: boolean; dueDate: string; linkedMissionId?: string };
export type LifeGoal = {
  id: string; title: string; created: string; description: string; area: string;
  target: string; priority: GoalPriority; status: GoalStatus; why: string;
  nextAction: string; progress: number; milestones: GoalMilestone[];
  updatedAt: string; completedAt?: string;
};
const object = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, fallback = "") => typeof v === "string" ? v : fallback;
const bounded = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.floor(v))) : fallback;
export function normalizeGoal(value: unknown): LifeGoal | null {
  if (!object(value) || typeof value.id !== "string" || !value.id || typeof value.title !== "string" || !value.title.trim()) return null;
  const milestones = Array.isArray(value.milestones) ? value.milestones.filter(object).map((m, i) => ({
    id: text(m.id, "milestone-" + i), title: text(m.title).trim(), done: m.done === true,
    dueDate: text(m.dueDate), ...(typeof m.linkedMissionId === "string" ? { linkedMissionId: m.linkedMissionId } : {}),
  })).filter(m => m.title) : [];
  const legacyProgress = bounded(value.progress, 0, 100, 0);
  const progress = milestones.length ? Math.round(milestones.filter(m => m.done).length / milestones.length * 100) : legacyProgress;
  const status: GoalStatus = ["Active", "On Hold", "Completed", "Archived"].includes(String(value.status)) ? value.status as GoalStatus : progress === 100 && milestones.length > 0 ? "Completed" : "Active";
  return {
    id: value.id, title: value.title.trim(), created: text(value.created), description: text(value.description),
    area: text(value.area, "Personal"), target: text(value.target), priority: (["Low","Medium","High","Critical"].includes(String(value.priority)) ? value.priority : "Medium") as GoalPriority,
    status, why: text(value.why), nextAction: text(value.nextAction), progress: status === "Completed" ? 100 : progress,
    milestones, updatedAt: text(value.updatedAt, text(value.created)), ...(typeof value.completedAt === "string" ? { completedAt: value.completedAt } : {}),
  };
}
export function goalProgress(goal: LifeGoal): number {
  return goal.milestones.length ? Math.round(goal.milestones.filter(m => m.done).length / goal.milestones.length * 100) : goal.progress;
}
export function toggleGoalMilestone(goals: unknown[], goalId: string, milestoneId: string, now = new Date().toISOString()) {
  let changed = false;
  const next = goals.map(raw => {
    const g = normalizeGoal(raw); if (!g || g.id !== goalId) return raw;
    const milestones = g.milestones.map(m => m.id === milestoneId ? { ...m, done: !m.done } : m);
    if (!milestones.some(m => m.id === milestoneId)) return raw;
    changed = true;
    const progress = Math.round(milestones.filter(m => m.done).length / milestones.length * 100);
    const status: GoalStatus = progress === 100 ? "Completed" : g.status === "Completed" ? "Active" : g.status;
    return { ...g, milestones, progress, status, updatedAt: now, ...(status === "Completed" ? { completedAt: now } : { completedAt: undefined }) };
  });
  return { goals: next, changed };
}
export function addGoalMilestone(goals: unknown[], goalId: string, milestone: GoalMilestone, now = new Date().toISOString()) {
  let changed = false;
  const next = goals.map(raw => {
    const g = normalizeGoal(raw); if (!g || g.id !== goalId) return raw;
    if (g.milestones.some(m => m.id === milestone.id || m.title.toLowerCase() === milestone.title.trim().toLowerCase())) return raw;
    changed = true;
    const milestones = [...g.milestones, { ...milestone, title: milestone.title.trim(), done: false }];
    return { ...g, milestones, progress: goalProgress({ ...g, milestones }), status: g.status === "Completed" ? "Active" : g.status, completedAt: undefined, updatedAt: now };
  });
  return { goals: next, changed };
}
export function updateGoalStatus(goals: unknown[], goalId: string, status: GoalStatus, now = new Date().toISOString()) {
  let changed = false;
  const next = goals.map(raw => {
    const g = normalizeGoal(raw); if (!g || g.id !== goalId) return raw;
    changed = true;
    return { ...g, status, progress: status === "Completed" ? 100 : g.progress, updatedAt: now,
      ...(status === "Completed" ? { completedAt: now } : { completedAt: undefined }) };
  });
  return { goals: next, changed };
}
export function goalSummary(values: unknown[]) {
  const goals = values.map(normalizeGoal).filter((g): g is LifeGoal => !!g && g.status !== "Archived");
  const active = goals.filter(g => g.status === "Active");
  const completed = goals.filter(g => g.status === "Completed");
  const milestones = goals.flatMap(g => g.milestones);
  return { total: goals.length, active: active.length, onHold: goals.filter(g => g.status === "On Hold").length,
    completed: completed.length, averageProgress: goals.length ? Math.round(goals.reduce((n,g) => n + goalProgress(g),0)/goals.length) : 0,
    milestoneCount: milestones.length, milestonesDone: milestones.filter(m => m.done).length };
}
