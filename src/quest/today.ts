import type { PickedReading, QuestState, TrackId } from "./types.js";
import { TRACKS } from "./types.js";
import { addDays, isStudyDay, onLeave, parseDay, pretty, trackFor } from "./dates.js";
import { plan, goalMinutesOn, Plan } from "./scheduler.js";
import { levelOf, minutesOn, nextLevelAt, streakOf, titleOf } from "./game.js";
import { NewsCache, newsStatus, pickHeadlines, pickReading } from "./feeds.js";

export interface Today {
  date: string;
  weekday: string;
  onboarded: boolean;
  isStudyDay: boolean;
  leave?: { from: string; to: string; reason?: string };
  track?: TrackId;
  trackLabel?: string;
  cap: number;
  readingBlock: number;
  goalBlock: number;
  minutesToday: number;
  goalMinutesToday: number;
  minutesLeft: number;
  overCap: boolean;
  message?: string;
  reading?: PickedReading;
  readingDone: boolean;
  goal?: { id: string; title: string; minutes: number; items: { unitId: string; unit: string; minutes: number; url?: string }[] };
  risk: { goalId: string; goal: string; finish?: string; deadline?: string; needPerDay?: number; dropStretchFixes?: boolean; option: string }[];
  headlines: { title: string; url: string; source: string }[];
  streak: number;
  bestStreak: number;
  level: number;
  title: string;
  xp: number;
  nextLevelAt: number;
  badges: number;
  news: { stale: boolean; fetchedAt?: string; reason?: string };
  next?: { date: string; track?: string; unit?: string };
  learningStyle: string;
  sessionTime: string;
}

/** The reading for `day`: the one logged today, else the stored pick, else a fresh pick. */
export function readingFor(state: QuestState, news: NewsCache | undefined, day: string): { reading?: PickedReading; done: boolean } {
  const logged = [...state.logs].reverse().find((l) => l.date === day && l.reading);
  if (logged?.reading) {
    const stored = state.picks[day];
    return {
      reading: stored?.url === logged.reading.url ? stored : { ...logged.reading, source: logged.reading.source ?? "", feedId: "", track: trackFor(day, state.settings) ?? "ml", pickedBy: "rotation" },
      done: true,
    };
  }
  const track = trackFor(day, state.settings);
  const stored = state.picks[day];
  if (stored && !state.readingsDone.includes(stored.url)) return { reading: stored, done: false };
  return { reading: track ? pickReading(state, news, track, day) : undefined, done: false };
}

/** Store today's pick so it stays put for the day; keep the last 14 days. Call under the write lock. */
export function rememberPick(state: QuestState, news: NewsCache | undefined, day: string): void {
  const { reading, done } = readingFor(state, news, day);
  if (reading && !done && !state.picks[day]) state.picks[day] = reading;
  const cutoff = addDays(day, -14);
  for (const k of Object.keys(state.picks)) if (k < cutoff) delete state.picks[k];
}

export function computeToday(state: QuestState, news: NewsCache | undefined, day: string, p: Plan = plan(state, day, 10)): Today {
  const s = state.settings;
  const study = isStudyDay(day, s, state.leaves);
  const leave = onLeave(day, state.leaves);
  const track = study ? trackFor(day, s) : undefined;
  const minutesToday = minutesOn(state, day);
  const goalMinutesToday = goalMinutesOn(state, day);
  const overCap = minutesToday >= s.dailyCap;
  const { reading, done } = study ? readingFor(state, news, day) : { reading: undefined, done: false };
  const todayPlan = p.days.find((d) => d.date === day);
  const firstGoal = todayPlan?.items[0];
  const nextDay = p.days.find((d) => d.date > day);
  const level = levelOf(state.xp);

  // The kickoff only mentions the goal being studied now; the board shows every goal's risk
  const risk = p.goals
    .filter((g) => g.atRisk && g.status === "active")
    .map((g) => ({
      goalId: g.id,
      goal: g.title,
      finish: g.finish,
      deadline: g.deadline,
      needPerDay: g.needPerDay,
      dropStretchFixes: g.dropStretchFixes,
      option: g.dropStretchFixes
        ? `skipping its stretch units would make ${pretty(g.deadline!)}`
        : `at the daily cap it finishes ${pretty(g.finish!)}; moving the deadline there keeps it honest`,
    }));

  let message: string | undefined;
  if (!state.onboarded) message = "Not set up yet: run onboarding.";
  else if (leave) message = `On leave until ${pretty(leave.to)}. Nothing to do today.`;
  else if (!study) message = "Rest day. The streak waits for you.";
  else if (overCap) message = `That's today's ${s.dailyCap} minutes. Stop here; more time earns no XP.`;

  return {
    date: day,
    weekday: parseDay(day).toLocaleDateString("en-US", { weekday: "long" }),
    onboarded: state.onboarded,
    isStudyDay: study,
    leave: leave ? { from: leave.from, to: leave.to, reason: leave.reason } : undefined,
    track,
    trackLabel: track ? TRACKS[track] : undefined,
    cap: s.dailyCap,
    readingBlock: s.readingBlock,
    goalBlock: s.goalBlock,
    minutesToday,
    goalMinutesToday,
    minutesLeft: Math.max(0, s.dailyCap - minutesToday),
    overCap,
    message,
    reading,
    readingDone: done,
    goal:
      study && todayPlan && firstGoal
        ? {
            id: firstGoal.goalId,
            title: firstGoal.goalTitle,
            minutes: todayPlan.minutes,
            items: todayPlan.items.map((i) => ({ unitId: i.unitId, unit: i.unitTitle, minutes: i.minutes, url: i.url })),
          }
        : undefined,
    risk,
    headlines: study ? pickHeadlines(state, news, 5) : [],
    streak: streakOf(state, day),
    bestStreak: state.bestStreak,
    level,
    title: titleOf(level),
    xp: state.xp,
    nextLevelAt: nextLevelAt(level),
    badges: state.badges.length,
    news: newsStatus(state, news),
    next: nextDay
      ? { date: nextDay.date, track: nextDay.track ? TRACKS[nextDay.track as TrackId] : undefined, unit: nextDay.items[0] ? `${nextDay.items[0].goalTitle} · ${nextDay.items[0].unitTitle}` : undefined }
      : undefined,
    learningStyle: s.learningStyle,
    sessionTime: s.sessionTime,
  };
}

