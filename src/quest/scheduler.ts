import type { Goal, QuestState, Unit } from "./types.js";
import { addDays, addStudyDays, daysBetween, isStudyDay, leaveStudyDaysIn, nextStudyDays, trackFor } from "./dates.js";

// The plan is never stored: it is recomputed from today on every read, so a missed
// day just slides everything forward (self-healing).

export interface PlannedItem {
  goalId: string;
  goalTitle: string;
  unitId: string;
  unitTitle: string;
  minutes: number;
  url?: string;
}

export interface PlannedDay {
  date: string;
  track?: string;
  items: PlannedItem[];
  minutes: number;
}

export interface GoalProjection {
  id: string;
  title: string;
  track: string;
  status: Goal["status"];
  remaining: number;
  total: number;
  percent: number;
  start?: string;
  finish?: string;
  /** Effective deadline: fixed or derived, then shifted by leave */
  deadline?: string;
  atRisk: boolean;
  /** Only when at risk: goal minutes per study day needed to make the deadline */
  needPerDay?: number;
  /** Only when at risk: whether dropping the goal's stretch units is enough */
  dropStretchFixes?: boolean;
}

export interface Plan {
  days: PlannedDay[];
  goals: GoalProjection[];
}

const HORIZON_DAYS = 3 * 366;

export function remainingOf(u: Unit): number {
  if (u.done) return 0;
  const left = u.minutes - u.spent;
  // Over the estimate but not finished: keep a short slot so it still gets scheduled
  return left > 0 ? left : 5;
}

/** Goals in study order: active first, then queued by priority. */
export function studyOrder(goals: Goal[]): Goal[] {
  const rank = (g: Goal) => (g.status === "active" ? 0 : 1);
  return goals
    .filter((g) => g.status === "active" || g.status === "queued")
    .sort((a, b) => rank(a) - rank(b) || a.priority - b.priority || (a.activatedOn ?? "").localeCompare(b.activatedOn ?? ""));
}

/** Goal minutes already logged on `day` (reading minutes don't use the goal block). */
export function goalMinutesOn(state: QuestState, day: string): number {
  return state.logs.filter((l) => l.date === day).reduce((n, l) => n + Math.max(0, l.minutes - l.readingMinutes), 0);
}

export function baseDeadline(g: Goal, projectedStart: string | undefined, today: string): string | undefined {
  if (g.deadline) return g.deadline;
  if (!g.durationDays) return undefined;
  const from = g.status === "active" ? g.activatedOn ?? today : projectedStart;
  return from ? addDays(from, g.durationDays) : undefined;
}

export function effectiveDeadline(g: Goal, state: QuestState, projectedStart: string | undefined, today: string): string | undefined {
  const base = baseDeadline(g, projectedStart, today);
  if (!base || state.settings.leaveBehavior === "keep") return base;
  const from = g.status === "active" ? g.activatedOn ?? today : projectedStart ?? today;
  const covered = leaveStudyDaysIn(from, base, state.settings, state.leaves);
  return covered ? addStudyDays(base, covered, state.settings, state.leaves) : base;
}

export function plan(state: QuestState, today: string, showDays = 10): Plan {
  const s = state.settings;
  const order = studyOrder(state.goals);
  const days: PlannedDay[] = [];
  const firstDay = new Map<string, string>();
  const lastDay = new Map<string, string>();

  // Queue of [goal, unit, minutes left to place]
  const queue: { g: Goal; u: Unit; left: number }[] = [];
  for (const g of order) for (const u of g.units) if (!u.done) queue.push({ g, u, left: remainingOf(u) });

  let day = today;
  for (let guard = 0; queue.length && guard < HORIZON_DAYS; guard++, day = addDays(day, 1)) {
    if (!isStudyDay(day, s, state.leaves)) continue;
    let room = s.goalBlock - (day === today ? goalMinutesOn(state, today) : 0);
    const pd: PlannedDay = { date: day, track: trackFor(day, s), items: [], minutes: 0 };
    while (room > 0 && queue.length) {
      const q = queue[0]!;
      const take = Math.min(room, q.left);
      pd.items.push({ goalId: q.g.id, goalTitle: q.g.title, unitId: q.u.id, unitTitle: q.u.title, minutes: take, url: q.u.url ?? q.g.link });
      pd.minutes += take;
      room -= take;
      q.left -= take;
      if (!firstDay.has(q.g.id)) firstDay.set(q.g.id, day);
      lastDay.set(q.g.id, day);
      if (q.left <= 0) queue.shift();
    }
    days.push(pd);
  }

  const goals: GoalProjection[] = state.goals
    .filter((g) => g.status !== "done" || g.doneOn)
    .map((g) => {
      const total = g.units.reduce((n, u) => n + u.minutes, 0);
      const remaining = g.units.reduce((n, u) => n + remainingOf(u), 0);
      const doneMinutes = g.units.filter((u) => u.done).reduce((n, u) => n + u.minutes, 0);
      const start = g.status === "done" ? undefined : firstDay.get(g.id);
      const finish = g.status === "done" ? g.doneOn : lastDay.get(g.id);
      const deadline = g.status === "done" || g.status === "parked" ? undefined : effectiveDeadline(g, state, start, today);
      const atRisk = !!(deadline && finish && finish > deadline);
      const proj: GoalProjection = {
        id: g.id,
        title: g.title,
        track: g.track,
        status: g.status,
        remaining,
        total,
        percent: total ? Math.round((doneMinutes / total) * 100) : 0,
        start,
        finish,
        deadline,
        atRisk,
      };
      if (atRisk && deadline) {
        const from = start ?? today;
        const studyDays = nextStudyDays(from, Math.max(0, daysBetween(from, deadline) + 1), s, state.leaves).filter((d) => d <= deadline);
        const usedToday = from === today ? goalMinutesOn(state, today) : 0;
        const n = Math.max(1, studyDays.length);
        proj.needPerDay = Math.ceil((remaining + usedToday) / n);
        const core = g.units.filter((u) => !u.stretch).reduce((m, u) => m + remainingOf(u), 0);
        proj.dropStretchFixes = core < remaining && core <= studyDays.length * s.goalBlock - usedToday;
      }
      return proj;
    });

  return { days: days.slice(0, showDays), goals };
}

/** All non-stretch units done → the goal is done. */
export function isGoalComplete(g: Goal): boolean {
  const core = g.units.filter((u) => !u.stretch);
  return (core.length ? core : g.units).every((u) => u.done);
}

/**
 * When an active goal is finished, the next queued goal (by priority) becomes active
 * and gets its deadline. Returns the ids that changed.
 */
export function rollover(state: QuestState, today: string): { completed: string[]; activated: string[] } {
  const completed: string[] = [];
  const activated: string[] = [];
  for (const g of state.goals) {
    if (g.status === "active" && g.units.length && isGoalComplete(g)) {
      g.status = "done";
      g.doneOn = today;
      completed.push(g.id);
    }
  }
  if (!state.goals.some((g) => g.status === "active")) {
    const next = studyOrder(state.goals).find((g) => g.status === "queued");
    if (next) {
      next.status = "active";
      next.activatedOn = today;
      if (!next.deadline && next.durationDays) next.deadline = addDays(today, next.durationDays);
      activated.push(next.id);
    }
  }
  return { completed, activated };
}
