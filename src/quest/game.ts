import type { QuestState, SessionLog } from "./types.js";
import { addDays, isStudyDay, onLeave, weekday } from "./dates.js";

export const XP = {
  perMinute: 1,
  perUnit: 25,
  perQuizPoint: 3,
  perNewReading: 10,
  streakBonusPerDay: 5,
  streakBonusMaxDays: 10,
};

const TITLES = ["Apprentice", "Novice", "Student", "Practitioner", "Adept", "Scholar", "Expert", "Master", "Sage"];

/** level = floor(sqrt(xp / 50)) + 1 */
export function levelOf(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
}

/** XP at which the next level starts: 50 × level² */
export function nextLevelAt(level: number): number {
  return 50 * level * level;
}

export function titleOf(level: number): string {
  return TITLES[Math.min(level, TITLES.length) - 1]!;
}

export function minutesOn(state: QuestState, day: string): number {
  return state.logs.filter((l) => l.date === day).reduce((n, l) => n + l.minutes, 0);
}

/**
 * Consecutive study days with at least `streakMinutes`. Weekends (non-study weekdays)
 * and leave days are skipped over, so they never break it. Today counts once it
 * reaches the minimum; until then the streak still stands from yesterday.
 */
export function streakOf(state: QuestState, day: string): number {
  const s = state.settings;
  let n = 0;
  let d = day;
  if (minutesOn(state, d) < s.streakMinutes) d = addDays(d, -1);
  for (let guard = 0; guard < 3660; guard++, d = addDays(d, -1)) {
    if (!s.studyDays.includes(weekday(d)) || onLeave(d, state.leaves)) {
      // A logged session on a rest day still counts, but a quiet one doesn't break the run
      if (minutesOn(state, d) >= s.streakMinutes) n++;
      if (d < earliestLog(state)) break;
      continue;
    }
    if (minutesOn(state, d) >= s.streakMinutes) n++;
    else break;
  }
  return n;
}

function earliestLog(state: QuestState): string {
  return state.logs.reduce((m, l) => (l.date < m ? l.date : m), "9999-99-99");
}

export interface XpBreakdown {
  minutes: number;
  units: number;
  quiz: number;
  reading: number;
  streakBonus: number;
  total: number;
  /** Minutes past the daily cap that earned nothing */
  overCap: number;
}

/** XP for one sitting, before it is added to the state. */
export function sessionXp(state: QuestState, log: Omit<SessionLog, "xp" | "id" | "loggedAt">): Omit<XpBreakdown, "streakBonus" | "total"> {
  const before = minutesOn(state, log.date);
  const room = Math.max(0, state.settings.dailyCap - before);
  const counted = Math.min(log.minutes, room);
  const isNewReading = !!log.reading?.url && !state.readingsDone.includes(log.reading.url);
  return {
    minutes: counted * XP.perMinute,
    units: log.unitsDone.length * XP.perUnit,
    quiz: Math.max(0, Math.min(10, log.quizScore ?? 0)) * XP.perQuizPoint,
    reading: isNewReading ? XP.perNewReading : 0,
    overCap: log.minutes - counted,
  };
}

export function streakBonus(streak: number): number {
  return XP.streakBonusPerDay * Math.min(streak, XP.streakBonusMaxDays);
}

export const BADGES: Record<string, { label: string; test: (s: QuestState, streak: number) => boolean }> = {
  "first-session": { label: "First session", test: (s) => s.logs.length >= 1 },
  "streak-5": { label: "5-day streak", test: (_, k) => k >= 5 },
  "streak-10": { label: "10-day streak", test: (_, k) => k >= 10 },
  "streak-20": { label: "20-day streak", test: (_, k) => k >= 20 },
  "readings-10": { label: "10 readings", test: (s) => s.readingsDone.length >= 10 },
  "perfect-quiz": { label: "Perfect quiz", test: (s) => s.logs.some((l) => l.quizScore === 10) },
  "goal-complete": { label: "Goal completed", test: (s) => s.goals.some((g) => g.status === "done") },
  "hours-10": { label: "10 hours studied", test: (s) => s.logs.reduce((n, l) => n + l.minutes, 0) >= 600 },
};

/** Award badges newly earned; returns their labels. */
export function awardBadges(state: QuestState, day: string): string[] {
  const streak = Math.max(streakOf(state, day), state.bestStreak);
  const have = new Set(state.badges.map((b) => b.id));
  const out: string[] = [];
  for (const [id, b] of Object.entries(BADGES)) {
    if (!have.has(id) && b.test(state, streak)) {
      state.badges.push({ id, earnedOn: day });
      out.push(b.label);
    }
  }
  return out;
}

export function isRestDay(state: QuestState, day: string): boolean {
  return !isStudyDay(day, state.settings, state.leaves);
}
