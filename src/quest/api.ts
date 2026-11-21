import fs from "fs";
import { z } from "zod/v3";
import type { Goal, QuestState, SessionLog, TrackId, Unit } from "./types.js";
import { TRACKS } from "./types.js";
import { loadState, mutate, notesFolder, saveNotesFolder } from "./store.js";
import { addDays, isValidDay, nextStudyDays, onLeave, pretty, today as todayOf } from "./dates.js";
import { plan, rollover, remainingOf } from "./scheduler.js";
import { awardBadges, levelOf, minutesOn, sessionXp, streakBonus, streakOf, titleOf, BADGES } from "./game.js";
import { LIBRARY, findLibrary } from "./library.js";
import { FEEDS, defaultFeeds, feedById, loadNews, newsStatus, refreshNews } from "./feeds.js";
import { computeToday, rememberPick } from "./today.js";
import { appendLearningLog, appendSessionNote, updateGoalNote, writeDailyQuest, writeQuestBoard, writeTodaySnapshot } from "./notes.js";

const TRACK_IDS = Object.keys(TRACKS) as [TrackId, ...TrackId[]];
const id = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const root = () => notesFolder().folder;

/** Rewrite everything derived from the state: Quest Board, today.json, the daily note's section. */
function refreshOutputs(r: string, state: QuestState, day = todayOf()) {
  if (!state.onboarded) return;
  const news = loadNews(r);
  rememberPick(state, news, day);
  const p = plan(state, day, 10);
  const t = computeToday(state, news, day, p);
  writeQuestBoard(r, state, p, day);
  writeTodaySnapshot(r, t);
  writeDailyQuest(r, state, t);
}

/** Called when the server starts (every Claude Code session): fresh board, snapshot and daily note. */
export async function startupRefresh(): Promise<void> {
  const r = root();
  if (!fs.existsSync(r) || !loadState(r).onboarded) return;
  await mutate(r, (s) => refreshOutputs(r, s));
  // Fetch news in the background if the cache is stale, then redraw today's outputs
  const state = loadState(r);
  if (newsStatus(state, loadNews(r)).stale) {
    await refreshNews(r, state);
    await mutate(r, (s) => refreshOutputs(r, s));
  }
}

// ── get_status / set_notes_folder ────────────────────────────────────────────

export async function getStatus() {
  const info = notesFolder();
  const exists = fs.existsSync(info.folder);
  const state = exists ? loadState(info.folder) : undefined;
  return {
    setUp: !!state?.onboarded,
    notesFolder: info.folder,
    folderSource: info.source,
    folderExists: exists,
    goals: state?.goals.length ?? 0,
    hint: !exists
      ? "The notes folder doesn't exist. Ask where their notes live (their Obsidian vault folder) and call set_notes_folder."
      : !state?.onboarded
        ? "Folder found but not onboarded. Run onboard."
        : undefined,
  };
}

export const setNotesFolderSchema = z.object({
  folder: z.string().describe("Absolute path of the notes folder, e.g. the Obsidian vault (E:\\Obsidian\\Vault or /mnt/e/Obsidian/Vault)"),
});

export async function setNotesFolder(input: z.infer<typeof setNotesFolderSchema>) {
  const saved = saveNotesFolder(input.folder);
  const exists = fs.existsSync(saved);
  return {
    saved,
    exists,
    isObsidianVault: fs.existsSync(`${saved}/.obsidian`),
    message: exists ? "Saved. Every app on this machine now uses this folder." : "Saved, but the folder doesn't exist yet: it will be created on first write.",
  };
}

// ── Library and goals ────────────────────────────────────────────────────────

export async function listLibrary() {
  return {
    library: LIBRARY.map((e) => ({
      id: e.id,
      title: e.title,
      track: e.track,
      format: e.format,
      units: e.units.length,
      stretchUnits: e.units.filter((u) => u.stretch).length,
      totalMinutes: e.units.reduce((n, u) => n + u.minutes, 0),
      durationDays: e.durationDays,
      link: e.link,
      blurb: e.blurb,
    })),
  };
}

function goalFromLibrary(libraryId: string): Goal {
  const e = findLibrary(libraryId);
  if (!e) throw new Error(`No library entry '${libraryId}'. Call list_library.`);
  return {
    id: e.id,
    title: e.title,
    track: e.track,
    status: "queued",
    priority: 100,
    durationDays: e.durationDays,
    format: e.format,
    link: e.link,
    libraryId: e.id,
    units: e.units.map((u, i) => ({ id: `u${i + 1}`, title: u.title, minutes: u.minutes, spent: 0, done: false, stretch: u.stretch, url: u.url })),
  };
}

const unitInput = z.object({
  title: z.string(),
  minutes: z.number().positive(),
  stretch: z.boolean().optional(),
  url: z.string().optional(),
  checkbox: z.string().optional().describe("Text of a checkbox in the goal's note to tick when this unit is done"),
});

const goalOptions = {
  status: z.enum(["active", "queued", "parked"]).optional(),
  priority: z.number().optional().describe("Lower = sooner among queued goals"),
  deadline: z.string().optional().describe("YYYY-MM-DD"),
  durationDays: z.number().positive().optional().describe("Days to finish once active, when there's no fixed deadline"),
  note: z.string().optional().describe("Vault-relative path of the user's own note for this goal"),
};

function placeGoal(state: QuestState, g: Goal, opts: { status?: Goal["status"]; priority?: number; deadline?: string; durationDays?: number; note?: string }, day: string) {
  if (state.goals.some((x) => x.id === g.id)) g.id = `${g.id}-${state.goals.length + 1}`;
  if (opts.deadline && !isValidDay(opts.deadline)) throw new Error(`deadline must be YYYY-MM-DD, got '${opts.deadline}'`);
  g.priority = opts.priority ?? Math.max(0, ...state.goals.map((x) => x.priority)) + 1;
  if (opts.deadline) g.deadline = opts.deadline;
  if (opts.durationDays) g.durationDays = opts.durationDays;
  if (opts.note) g.note = opts.note;
  const wantActive = opts.status === "active" || (!opts.status && !state.goals.some((x) => x.status === "active"));
  g.status = wantActive ? "active" : opts.status ?? "queued";
  if (g.status === "active") {
    g.activatedOn = day;
    if (!g.deadline && g.durationDays) g.deadline = addDays(day, g.durationDays);
  }
  state.goals.push(g);
  return g;
}

function projection(state: QuestState, goalId: string, day: string) {
  const g = plan(state, day, 0).goals.find((x) => x.id === goalId);
  return g && { status: g.status, start: g.start, finish: g.finish, deadline: g.deadline, atRisk: g.atRisk, totalMinutes: g.total };
}

export const addLibraryGoalSchema = z.object({ libraryId: z.string().describe("Library id or name, e.g. 'zero-to-hero' or 'Zero to Hero'"), ...goalOptions });

export async function addLibraryGoal(input: z.infer<typeof addLibraryGoalSchema>) {
  const r = root();
  const day = todayOf();
  return mutate(r, (state) => {
    const g = placeGoal(state, goalFromLibrary(input.libraryId), input, day);
    refreshOutputs(r, state, day);
    return { added: g.title, goalId: g.id, units: g.units.length, ...projection(state, g.id, day) };
  });
}

export const addGoalSchema = z.object({
  title: z.string(),
  track: z.enum(TRACK_IDS),
  units: z.array(unitInput).min(1).describe("Ordered units with time estimates (confirm them with the user first)"),
  link: z.string().optional(),
  format: z.enum(["reading", "video", "exercise"]).optional(),
  ...goalOptions,
});

export async function addGoal(input: z.infer<typeof addGoalSchema>) {
  const r = root();
  const day = todayOf();
  return mutate(r, (state) => {
    const g: Goal = {
      id: input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || id("goal"),
      title: input.title,
      track: input.track,
      status: "queued",
      priority: 100,
      link: input.link,
      format: input.format,
      units: input.units.map((u, i) => ({ id: `u${i + 1}`, title: u.title, minutes: u.minutes, spent: 0, done: false, stretch: u.stretch, url: u.url, checkbox: u.checkbox })),
    };
    placeGoal(state, g, input, day);
    refreshOutputs(r, state, day);
    return { added: g.title, goalId: g.id, units: g.units.length, ...projection(state, g.id, day) };
  });
}

export const updateGoalSchema = z.object({
  goalId: z.string(),
  title: z.string().optional(),
  status: z.enum(["active", "queued", "parked", "done"]).optional(),
  priority: z.number().optional(),
  deadline: z.string().nullable().optional().describe("YYYY-MM-DD, or null to clear"),
  durationDays: z.number().positive().optional(),
  note: z.string().optional(),
  link: z.string().optional(),
  addUnits: z.array(unitInput).optional(),
  removeUnits: z.array(z.string()).optional().describe("Unit ids"),
  units: z
    .array(z.object({ id: z.string(), title: z.string().optional(), minutes: z.number().positive().optional(), done: z.boolean().optional(), stretch: z.boolean().optional(), url: z.string().optional(), checkbox: z.string().optional() }))
    .optional()
    .describe("Edits to existing units, by id"),
});

export async function updateGoal(input: z.infer<typeof updateGoalSchema>) {
  const r = root();
  const day = todayOf();
  return mutate(r, (state) => {
    const g = state.goals.find((x) => x.id === input.goalId);
    if (!g) throw new Error(`No goal '${input.goalId}'. Goals: ${state.goals.map((x) => x.id).join(", ")}`);
    if (input.deadline !== undefined && input.deadline !== null && !isValidDay(input.deadline)) throw new Error("deadline must be YYYY-MM-DD");
    if (input.title) g.title = input.title;
    if (input.priority !== undefined) g.priority = input.priority;
    if (input.deadline !== undefined) g.deadline = input.deadline ?? undefined;
    if (input.durationDays) g.durationDays = input.durationDays;
    if (input.note) g.note = input.note;
    if (input.link) g.link = input.link;
    for (const u of input.units ?? []) {
      const unit = g.units.find((x) => x.id === u.id);
      if (!unit) throw new Error(`No unit '${u.id}' in ${g.title}`);
      Object.assign(unit, Object.fromEntries(Object.entries(u).filter(([k, v]) => k !== "id" && v !== undefined)));
      if (u.done) unit.doneOn = unit.doneOn ?? day;
    }
    if (input.removeUnits) g.units = g.units.filter((u) => !input.removeUnits!.includes(u.id));
    for (const u of input.addUnits ?? []) g.units.push({ id: `u${g.units.length + 1}-${Math.random().toString(36).slice(2, 5)}`, title: u.title, minutes: u.minutes, spent: 0, done: false, stretch: u.stretch, url: u.url, checkbox: u.checkbox });
    if (input.status && input.status !== g.status) {
      g.status = input.status;
      if (input.status === "active") {
        g.activatedOn = day;
        if (!g.deadline && g.durationDays) g.deadline = addDays(day, g.durationDays);
      }
      if (input.status === "done") g.doneOn = day;
    }
    const rolled = rollover(state, day);
    awardBadges(state, day);
    refreshOutputs(r, state, day);
    return { updated: g.title, ...projection(state, g.id, day), rolledOver: rolled.activated.length ? rolled : undefined };
  });
}

// ── onboard ──────────────────────────────────────────────────────────────────

export const onboardSchema = z.object({
  goals: z.array(z.string()).default([]).describe("Library ids or names, in the order to study them (first becomes active)"),
  dailyCap: z.number().positive().optional(),
  readingBlock: z.number().nonnegative().optional(),
  goalBlock: z.number().nonnegative().optional(),
  studyDays: z.array(z.number().int().min(0).max(6)).optional().describe("0 = Sunday … 6 = Saturday"),
  rotation: z.record(z.enum(TRACK_IDS)).optional().describe("Weekday number → track, e.g. {\"1\":\"ml\",\"2\":\"system-design\"}"),
  learningStyle: z.enum(["reading", "video", "exercise"]).optional(),
  feeds: z.array(z.string()).optional().describe("Feed ids to turn on (default: the catalog's defaults)"),
  learningLog: z.string().optional().describe("Vault-relative path of their learning log note"),
  dailyNotesFolder: z.string().optional().describe("Vault-relative daily notes folder, or \"\" to leave daily notes alone"),
  dailyTemplate: z.string().optional(),
  sessionTime: z.string().optional().describe("HH:MM"),
});

export async function onboard(input: z.infer<typeof onboardSchema>) {
  const r = root();
  const day = todayOf();
  const result = await mutate(r, (state) => {
    const s = state.settings;
    if (input.dailyCap) s.dailyCap = input.dailyCap;
    if (input.readingBlock !== undefined) s.readingBlock = input.readingBlock;
    if (input.goalBlock !== undefined) s.goalBlock = input.goalBlock;
    if (input.studyDays?.length) s.studyDays = [...new Set(input.studyDays)].sort();
    if (input.rotation) s.rotation = { ...input.rotation };
    if (input.learningStyle) s.learningStyle = input.learningStyle;
    if (input.learningLog) s.learningLog = input.learningLog;
    if (input.dailyNotesFolder !== undefined) s.dailyNotesFolder = input.dailyNotesFolder;
    if (input.dailyTemplate) s.dailyTemplate = input.dailyTemplate;
    if (input.sessionTime) s.sessionTime = input.sessionTime;
    if (s.readingBlock + s.goalBlock > s.dailyCap) s.goalBlock = Math.max(0, s.dailyCap - s.readingBlock);
    const unknownFeeds = (input.feeds ?? []).filter((f) => !feedById(f));
    state.feeds = input.feeds ? input.feeds.filter((f) => feedById(f)) : state.feeds.length ? state.feeds : defaultFeeds();
    for (const g of input.goals) if (!state.goals.some((x) => x.libraryId === findLibrary(g)?.id)) placeGoal(state, goalFromLibrary(g), {}, day);
    state.onboarded = true;
    refreshOutputs(r, state, day);
    return { unknownFeeds };
  });
  const status = await getToday({ date: undefined });
  return { message: "Quest set up. Fetch news with refresh_news, then start today's session.", ...result, today: status };
}

// ── get_today / get_board ────────────────────────────────────────────────────

export const getTodaySchema = z.object({ date: z.string().optional().describe("YYYY-MM-DD (default: today)") });

export async function getToday(input: z.infer<typeof getTodaySchema>) {
  const r = root();
  const day = input.date && isValidDay(input.date) ? input.date : todayOf();
  const state = loadState(r);
  return computeToday(state, loadNews(r), day);
}

export async function getBoard() {
  const r = root();
  const day = todayOf();
  const state = loadState(r);
  const p = plan(state, day, 10);
  const totalMinutes = state.logs.reduce((n, l) => n + l.minutes, 0);
  return {
    goals: p.goals,
    nextStudyDays: p.days,
    leaves: state.leaves.filter((l) => l.to >= day),
    recent: state.logs.slice(-7).reverse().map((l) => ({ date: l.date, minutes: l.minutes, quiz: l.quizScore, summary: l.summary, xp: l.xp })),
    totals: {
      sessions: state.logs.length,
      minutes: totalMinutes,
      hours: Math.round((totalMinutes / 60) * 10) / 10,
      readings: state.readingsDone.length,
      unitsDone: state.goals.reduce((n, g) => n + g.units.filter((u) => u.done).length, 0),
      xp: state.xp,
      level: levelOf(state.xp),
      title: titleOf(levelOf(state.xp)),
      streak: streakOf(state, day),
      bestStreak: state.bestStreak,
      badges: state.badges.map((b) => BADGES[b.id]?.label ?? b.id),
    },
    board: `${r}/Learning/Quest Board.md`,
  };
}

// ── log_session ──────────────────────────────────────────────────────────────

export const logSessionSchema = z.object({
  minutes: z.number().int().positive().describe("Total minutes of the sitting, reading included"),
  readingMinutes: z.number().int().nonnegative().default(0),
  goalId: z.string().optional().describe("Goal worked on (default: today's goal block)"),
  unitsDone: z.array(z.string()).default([]).describe("Unit ids (or titles) finished in this sitting"),
  stoppedAt: z.string().optional().describe("Where they stopped, e.g. 'Ch 4.2, borrowing rules'"),
  reading: z.object({ title: z.string(), url: z.string(), source: z.string().optional() }).optional().describe("The reading done (usually today's pick)"),
  quizScore: z.number().min(0).max(10).optional(),
  learned: z.string().optional().describe("What they learned, in their words: appended to the learning log"),
  summary: z.string().optional().describe("One-line summary of the sitting"),
  date: z.string().optional().describe("YYYY-MM-DD, for logging a past sitting (default: today)"),
});

export async function logSession(input: z.infer<typeof logSessionSchema>) {
  const r = root();
  const day = input.date && isValidDay(input.date) ? input.date : todayOf();
  return mutate(r, (state) => {
    if (!state.onboarded) throw new Error("Not set up yet: run onboard first.");
    const before = { streak: streakOf(state, day), level: levelOf(state.xp), minutes: minutesOn(state, day) };
    const p = plan(state, day, 1);
    const goalId = input.goalId ?? p.days.find((d) => d.date === day)?.items[0]?.goalId ?? state.goals.find((g) => g.status === "active")?.id;
    const goal = state.goals.find((g) => g.id === goalId);

    // Resolve finished units (ids or titles) and spread the goal minutes over the open units
    const done: Unit[] = [];
    for (const key of input.unitsDone) {
      const k = key.toLowerCase();
      const u = goal?.units.find((x) => x.id === key) ?? goal?.units.find((x) => x.title.toLowerCase().includes(k));
      if (u && !u.done) done.push(u);
    }
    // Finished units take their remaining minutes first; the rest goes to the next open unit
    let goalMinutes = Math.max(0, input.minutes - input.readingMinutes);
    const open = (goal?.units ?? []).filter((u) => !u.done);
    for (const u of open.filter((u) => done.includes(u))) {
      const take = Math.min(goalMinutes, remainingOf(u));
      u.spent += take;
      goalMinutes -= take;
    }
    const current = open.find((u) => !done.includes(u));
    if (current && goalMinutes > 0) current.spent += goalMinutes;
    for (const u of done) {
      u.done = true;
      u.doneOn = day;
    }

    const log: SessionLog = {
      id: id("s"),
      date: day,
      minutes: input.minutes,
      readingMinutes: input.readingMinutes,
      goalId: goal?.id,
      unitsDone: done.map((u) => u.id),
      stoppedAt: input.stoppedAt,
      reading: input.reading,
      quizScore: input.quizScore,
      learned: input.learned,
      summary: input.summary,
      xp: 0,
      loggedAt: new Date().toISOString(),
    };
    const xp = sessionXp(state, log);
    if (input.reading?.url && !state.readingsDone.includes(input.reading.url)) state.readingsDone.push(input.reading.url);
    state.logs.push(log);

    const streak = streakOf(state, day);
    let bonus = 0;
    if (streak > state.creditedStreak && streak > before.streak) bonus = streakBonus(streak);
    state.creditedStreak = streak < state.creditedStreak ? streak : Math.max(state.creditedStreak, streak);
    state.bestStreak = Math.max(state.bestStreak, streak);
    log.xp = xp.minutes + xp.units + xp.quiz + xp.reading + bonus;
    state.xp += log.xp;

    const rolled = rollover(state, day);
    const badges = awardBadges(state, day);

    // Notes
    appendSessionNote(r, state, log);
    if (goal) updateGoalNote(r, goal, log.unitsDone, input.minutes - input.readingMinutes, day);
    if (input.learned?.trim()) appendLearningLog(r, state, input.learned, day);
    refreshOutputs(r, state, day);

    const level = levelOf(state.xp);
    const t = computeToday(state, loadNews(r), day);
    return {
      xpGained: log.xp,
      xpBreakdown: { minutes: xp.minutes, units: xp.units, quiz: xp.quiz, reading: xp.reading, streakBonus: bonus },
      xp: state.xp,
      level,
      title: titleOf(level),
      leveledUp: level > before.level,
      streak,
      bestStreak: state.bestStreak,
      newBadges: badges,
      unitsFinished: done.map((u) => u.title),
      goalFinished: rolled.completed.length ? rolled.completed.map((gid) => state.goals.find((g) => g.id === gid)?.title) : undefined,
      nowActive: rolled.activated.length ? rolled.activated.map((gid) => state.goals.find((g) => g.id === gid)?.title) : undefined,
      overCap: xp.overCap > 0 ? `${xp.overCap} min past the ${state.settings.dailyCap}-minute cap earned no XP. That's enough for today.` : undefined,
      minutesToday: t.minutesToday,
      tomorrow: t.next,
    };
  });
}

// ── Leaves ───────────────────────────────────────────────────────────────────

export const addLeaveSchema = z.object({ from: z.string().describe("YYYY-MM-DD"), to: z.string().describe("YYYY-MM-DD, inclusive"), reason: z.string().optional() });

export async function addLeave(input: z.infer<typeof addLeaveSchema>) {
  if (!isValidDay(input.from) || !isValidDay(input.to)) throw new Error("from and to must be YYYY-MM-DD");
  if (input.to < input.from) throw new Error("'to' is before 'from'");
  const r = root();
  const day = todayOf();
  return mutate(r, (state) => {
    const before = plan(state, day, 0).goals;
    const leave = { id: id("leave"), from: input.from, to: input.to, reason: input.reason };
    state.leaves.push(leave);
    state.leaves.sort((a, b) => a.from.localeCompare(b.from));
    const after = plan(state, day, 0).goals;
    refreshOutputs(r, state, day);
    return {
      added: leave,
      studyDaysRemoved: nextStudyDays(input.from, 400, { ...state.settings }, []).filter((d) => d <= input.to).length,
      shifted: after
        .filter((g) => g.status === "active" || g.status === "queued")
        .map((g) => ({ goal: g.title, deadline: g.deadline, finish: g.finish, was: before.find((b) => b.id === g.id)?.deadline }))
        .filter((g) => g.deadline !== g.was || g.finish),
    };
  });
}

export const removeLeaveSchema = z.object({ leaveId: z.string().optional(), from: z.string().optional().describe("Or the leave's start date") });

export async function removeLeave(input: z.infer<typeof removeLeaveSchema>) {
  const r = root();
  return mutate(r, (state) => {
    const before = state.leaves.length;
    state.leaves = state.leaves.filter((l) => !(l.id === input.leaveId || (input.from && l.from === input.from) || (input.from && onLeave(input.from, [l]))));
    refreshOutputs(r, state);
    return { removed: before - state.leaves.length, leaves: state.leaves };
  });
}

// ── Feeds ────────────────────────────────────────────────────────────────────

export async function listFeeds() {
  const r = root();
  const state = loadState(r);
  const on = new Set(state.feeds.length ? state.feeds : defaultFeeds());
  const news = loadNews(r);
  return {
    feeds: FEEDS.map((f) => ({
      id: f.id,
      name: f.name,
      group: f.group,
      track: f.track,
      role: f.role,
      volume: f.volume,
      on: on.has(f.id),
      defaultOn: f.defaultOn,
      lastFetch: news?.feeds[f.id] ? (news.feeds[f.id]!.ok ? `${news.feeds[f.id]!.items.length} items` : `failed: ${news.feeds[f.id]!.error}`) : undefined,
    })),
    news: newsStatus(state, news),
  };
}

export const setFeedsSchema = z.object({
  feeds: z.array(z.string()).optional().describe("The full selection (replaces it)"),
  enable: z.array(z.string()).optional(),
  disable: z.array(z.string()).optional(),
});

/** Saves the selection only: fetching is refresh_news. */
export async function setFeeds(input: z.infer<typeof setFeedsSchema>) {
  const r = root();
  return mutate(r, (state) => {
    const unknown = [...(input.feeds ?? []), ...(input.enable ?? []), ...(input.disable ?? [])].filter((f) => !feedById(f));
    let sel = new Set(input.feeds ?? (state.feeds.length ? state.feeds : defaultFeeds()));
    for (const f of input.enable ?? []) sel.add(f);
    for (const f of input.disable ?? []) sel.delete(f);
    state.feeds = [...sel].filter((f) => feedById(f));
    return { feeds: state.feeds, unknown: unknown.length ? unknown : undefined, next: "Call refresh_news to fetch them." };
  });
}

export async function refreshNewsTool() {
  const r = root();
  const state = loadState(r);
  if (!state.feeds.length) state.feeds = defaultFeeds();
  const result = await refreshNews(r, state);
  await mutate(r, (s) => refreshOutputs(r, s));
  return { fetched: result.ok, failed: result.failed.length ? result.failed : undefined, of: state.feeds.length };
}

// ── set_config ───────────────────────────────────────────────────────────────

export const setConfigSchema = z.object({
  dailyCap: z.number().positive().optional(),
  readingBlock: z.number().nonnegative().optional(),
  goalBlock: z.number().nonnegative().optional(),
  studyDays: z.array(z.number().int().min(0).max(6)).optional(),
  rotation: z.record(z.enum(TRACK_IDS)).optional(),
  leaveBehavior: z.enum(["shift", "keep"]).optional(),
  sessionTime: z.string().optional(),
  learningStyle: z.enum(["reading", "video", "exercise"]).optional(),
  streakMinutes: z.number().nonnegative().optional(),
  learningLog: z.string().optional(),
  dailyNotesFolder: z.string().optional(),
  dailyTemplate: z.string().optional(),
});

export async function setConfig(input: z.infer<typeof setConfigSchema>) {
  const r = root();
  return mutate(r, (state) => {
    const next = { ...state.settings, ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) };
    if (next.readingBlock + next.goalBlock > next.dailyCap) {
      throw new Error(`readingBlock (${next.readingBlock}) + goalBlock (${next.goalBlock}) is more than the daily cap (${next.dailyCap}).`);
    }
    if (next.sessionTime && !/^\d{2}:\d{2}$/.test(next.sessionTime)) throw new Error("sessionTime must be HH:MM");
    state.settings = next;
    refreshOutputs(r, state);
    return { settings: state.settings };
  });
}

