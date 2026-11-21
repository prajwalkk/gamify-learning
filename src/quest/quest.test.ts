import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { freshState, mutate, loadState, backupOnce, normalizeFolder } from "./store.js";
import { addDays, isStudyDay, nextStudyDays, trackFor } from "./dates.js";
import { plan, rollover } from "./scheduler.js";
import { levelOf, nextLevelAt, sessionXp, streakOf, streakBonus, awardBadges, titleOf } from "./game.js";
import { pickHeadlines, pickReading, inferTrack, NewsCache } from "./feeds.js";
import { upsertSection, removeSection, updateGoalNote, appendLearningLog, renderTemplate, QUEST_HEADING } from "./notes.js";
import { computeToday } from "./today.js";
import type { Goal, QuestState, SessionLog } from "./types.js";

// 2026-11-16 is a Monday
const MON = "2026-11-16";

function goal(id: string, minutes: number[], extra: Partial<Goal> = {}): Goal {
  return {
    id,
    title: id,
    track: "ml",
    status: "queued",
    priority: 1,
    units: minutes.map((m, i) => ({ id: `u${i + 1}`, title: `${id} unit ${i + 1}`, minutes: m, spent: 0, done: false })),
    ...extra,
  };
}

function log(date: string, minutes: number, extra: Partial<SessionLog> = {}): SessionLog {
  return { id: `${date}-${minutes}`, date, minutes, readingMinutes: 0, unitsDone: [], xp: 0, loggedAt: `${date}T09:00:00Z`, ...extra };
}

function state(extra: Partial<QuestState> = {}): QuestState {
  return { ...freshState(), onboarded: true, ...extra };
}

// ── dates ────────────────────────────────────────────────────────────────────

test("study days skip weekends and leave", () => {
  const s = state({ leaves: [{ id: "l", from: "2026-11-18", to: "2026-11-18" }] });
  assert.deepEqual(nextStudyDays(MON, 4, s.settings, s.leaves), ["2026-11-16", "2026-11-17", "2026-11-19", "2026-11-20"]);
  assert.equal(isStudyDay("2026-11-21", s.settings, s.leaves), false); // Saturday
});

test("default rotation: Mon/Wed ML, Tue/Thu system design, Fri AI dev", () => {
  const s = state().settings;
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => trackFor(addDays(MON, i), s)), ["ml", "system-design", "ml", "system-design", "ai-dev"]);
});

// ── game layer ───────────────────────────────────────────────────────────────

test("level = floor(sqrt(xp/50)) + 1, next level at 50 × level²", () => {
  assert.equal(levelOf(0), 1);
  assert.equal(levelOf(49), 1);
  assert.equal(levelOf(50), 2);
  assert.equal(levelOf(200), 3);
  assert.equal(nextLevelAt(1), 50);
  assert.equal(nextLevelAt(3), 450);
  assert.equal(titleOf(1), "Apprentice");
  assert.equal(titleOf(40), "Sage");
});

test("XP: minutes up to the cap, 25 per unit, 3 per quiz point, 10 per new reading", () => {
  const s = state({ logs: [log(MON, 50)], readingsDone: ["https://old"] });
  const xp = sessionXp(s, { date: MON, minutes: 30, readingMinutes: 10, unitsDone: ["u1"], quizScore: 8, reading: { title: "x", url: "https://new" } });
  assert.equal(xp.minutes, 10); // only 10 minutes of room left under the 60-minute cap
  assert.equal(xp.overCap, 20);
  assert.equal(xp.units, 25);
  assert.equal(xp.quiz, 24);
  assert.equal(xp.reading, 10);
  const again = sessionXp(s, { date: MON, minutes: 5, readingMinutes: 0, unitsDone: [], reading: { title: "x", url: "https://old" } });
  assert.equal(again.reading, 0);
});

test("streak bonus is 5 × streak, capped at 10 days", () => {
  assert.equal(streakBonus(3), 15);
  assert.equal(streakBonus(25), 50);
});

test("streak counts study days with 20+ minutes and skips weekends and leave", () => {
  const s = state({
    logs: [log("2026-11-12", 25), log("2026-11-13", 30), log("2026-11-16", 20), log("2026-11-18", 40)],
    leaves: [{ id: "l", from: "2026-11-17", to: "2026-11-17" }],
  });
  // Thu, Fri, (weekend), Mon, (leave Tue), Wed
  assert.equal(streakOf(s, "2026-11-18"), 4);
  // Today (Thu) not yet logged: the streak still stands from yesterday
  assert.equal(streakOf(s, "2026-11-19"), 4);
  // A 15-minute day doesn't count, and breaks it the day after
  s.logs.push(log("2026-11-19", 15));
  assert.equal(streakOf(s, "2026-11-20"), 0);
});

test("badges are awarded once", () => {
  const s = state({ logs: [log(MON, 30, { quizScore: 10 })] });
  assert.deepEqual(awardBadges(s, MON).sort(), ["First session", "Perfect quiz"].sort());
  assert.deepEqual(awardBadges(s, MON), []);
});

// ── scheduler ────────────────────────────────────────────────────────────────

test("fills 50 minutes a day, a unit can span days, today's logged minutes reduce today", () => {
  const s = state({ goals: [goal("a", [70, 40], { status: "active", activatedOn: MON })], logs: [log(MON, 30, { readingMinutes: 10 })] });
  const p = plan(s, MON, 5);
  assert.equal(p.days[0]!.minutes, 30); // 50 − 20 goal minutes already logged
  assert.deepEqual(p.days[0]!.items.map((i) => [i.unitId, i.minutes]), [["u1", 30]]);
  assert.deepEqual(p.days[1]!.items.map((i) => [i.unitId, i.minutes]), [["u1", 40], ["u2", 10]]);
  assert.equal(p.goals[0]!.finish, "2026-11-18");
});

test("goals are studied one at a time: active first, then queued by priority", () => {
  const s = state({ goals: [goal("later", [50], { priority: 2 }), goal("now", [50], { status: "active" }), goal("next", [50], { priority: 1 })] });
  const p = plan(s, MON, 3);
  assert.deepEqual(p.days.map((d) => d.items[0]!.goalId), ["now", "next", "later"]);
});

test("a leave removes days from the plan and pushes the active deadline out", () => {
  const g = goal("a", [50, 50, 50], { status: "active", activatedOn: MON, deadline: "2026-11-20" });
  const s = state({ goals: [g] });
  assert.equal(plan(s, MON).goals[0]!.deadline, "2026-11-20");
  s.leaves.push({ id: "l", from: "2026-11-17", to: "2026-11-18" });
  const p = plan(s, MON);
  assert.deepEqual(p.days.map((d) => d.date), ["2026-11-16", "2026-11-19", "2026-11-20"]);
  assert.equal(p.goals[0]!.deadline, "2026-11-24"); // two study days later: Mon 23 and Tue 24
});

test("at risk only when the projected finish is after the deadline; says whether dropping stretch is enough", () => {
  const g = goal("a", [50, 50, 50], { status: "active", activatedOn: MON, deadline: "2026-11-17" });
  g.units[2]!.stretch = true;
  const s = state({ goals: [g] });
  const proj = plan(s, MON).goals[0]!;
  assert.equal(proj.atRisk, true);
  assert.equal(proj.needPerDay, 75);
  assert.equal(proj.dropStretchFixes, true);
  g.deadline = "2026-11-20";
  assert.equal(plan(s, MON).goals[0]!.atRisk, false);
});

test("a queued goal's deadline is its projected start plus its duration", () => {
  const s = state({ goals: [goal("first", [50], { status: "active" }), goal("second", [50], { durationDays: 10 })] });
  const second = plan(s, MON).goals.find((g) => g.id === "second")!;
  assert.equal(second.start, "2026-11-17");
  assert.equal(second.deadline, "2026-11-27");
});

test("rollover: finishing the last unit activates the next queued goal with its deadline", () => {
  const a = goal("a", [30], { status: "active" });
  a.units[0]!.done = true;
  const s = state({ goals: [a, goal("b", [30], { durationDays: 7 })] });
  const r = rollover(s, MON);
  assert.deepEqual(r, { completed: ["a"], activated: ["b"] });
  assert.equal(s.goals[1]!.status, "active");
  assert.equal(s.goals[1]!.deadline, "2026-11-23");
});

test("a missed day doesn't fail anything: the plan starts again from today", () => {
  const s = state({ goals: [goal("a", [50, 50], { status: "active", activatedOn: MON })] });
  const tue = plan(s, "2026-11-17");
  assert.equal(tue.days[0]!.date, "2026-11-17");
  assert.equal(tue.goals[0]!.finish, "2026-11-18");
});

// ── feeds ────────────────────────────────────────────────────────────────────

function news(feeds: NewsCache["feeds"]): NewsCache {
  return { fetchedAt: new Date().toISOString(), selection: "", feeds };
}

test("today's reading: a curated paper for the track wins; otherwise rotate across feeds", () => {
  const s = state({ feeds: ["daily-papers", "lilian-weng", "bair", "hacker-news"] });
  const fresh = new Date(Date.parse(`${MON}T08:00:00`)).toISOString();
  const n = news({
    "daily-papers": { ok: true, items: [{ title: "Scaling laws for agents", url: "https://p/agents", date: fresh }, { title: "A new optimizer", url: "https://p/opt", date: fresh }] },
    "lilian-weng": { ok: true, items: [{ title: "Diffusion", url: "https://l/1", date: fresh }] },
    bair: { ok: true, items: [{ title: "Robots", url: "https://b/1", date: fresh }] },
  });
  assert.equal(pickReading(s, n, "ml", MON)?.url, "https://p/opt");
  assert.equal(inferTrack({ title: "Scaling laws for agents", url: "" }), "ai-dev");
  s.readingsDone.push("https://p/opt");
  const a = pickReading(s, n, "ml", MON)!;
  const b = pickReading(s, n, "ml", addDays(MON, 1))!;
  assert.equal(a.pickedBy, "rotation");
  assert.notEqual(a.feedId, b.feedId);
});

test("headlines: headline-only feeds first, at most 2 per source, up to 5", () => {
  const s = state({ feeds: ["hacker-news", "lobsters", "lilian-weng"] });
  const items = (p: string) => [1, 2, 3].map((i) => ({ title: `${p}${i}`, url: `https://${p}/${i}` }));
  const h = pickHeadlines(s, news({ "hacker-news": { ok: true, items: items("hn") }, lobsters: { ok: true, items: items("lo") }, "lilian-weng": { ok: true, items: items("lw") } }));
  assert.deepEqual(h.map((x) => x.title), ["hn1", "hn2", "lo1", "lo2", "lw1"]);
});

// ── notes ────────────────────────────────────────────────────────────────────

const DAILY = "# Day\n\n---\n\n## 🏋️ Gym\nok\n\n---\n\n## 📝 End-of-Day Reflection\n\n**One win:**\n";

test("the daily-note section goes before the reflection, between separators, and is replaced in place", () => {
  const once = upsertSection(DAILY, QUEST_HEADING, "- reading");
  assert.match(once, /## 🏋️ Gym\nok\n\n---\n\n## 🎯 Today's Quest\n- reading\n\n---\n\n## 📝 End-of-Day Reflection/);
  const twice = upsertSection(once, QUEST_HEADING, "- other");
  assert.equal(twice.match(/Today's Quest/g)!.length, 1);
  assert.match(twice, /- other/);
  assert.equal(removeSection(twice, QUEST_HEADING), DAILY);
});

test("templates: core placeholders are filled", () => {
  assert.equal(renderTemplate("{{date:dddd}}, {{date:MMMM D, YYYY}} · {{date}}", new Date(2026, 10, 16, 12), "t"), "Monday, November 16, 2026 · 2026-11-16");
});

function tmpVault(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "lq-"));
}

test("goal note: ticks the unit's checkbox, logs progress, bumps Last updated, backs the note up first", () => {
  const root = tmpVault();
  fs.writeFileSync(path.join(root, "Rust.md"), "# Rust\nLast updated: 2026-01-01\n\n- [ ] Chapter 4\n- [ ] Chapter 5\n\n## Progress Log\n\n- 2026-01-01 · started\n\n## Notes\nmine\n");
  const g = goal("rust", [60, 60], { note: "Rust.md" });
  g.units[0]!.checkbox = "Chapter 4";
  updateGoalNote(root, g, ["u1"], 45, MON);
  const text = fs.readFileSync(path.join(root, "Rust.md"), "utf-8");
  assert.match(text, /- \[x\] Chapter 4/);
  assert.match(text, /- \[ \] Chapter 5/);
  assert.match(text, /Last updated: 2026-11-16/);
  assert.match(text, /- 2026-01-01 · started\n- 2026-11-16 · Learning Quest: finished rust unit 1 \(45 min\)\n\n## Notes\nmine/);
  const backups = fs.readdirSync(path.join(root, "Learning", ".quest", "backups"));
  assert.equal(backups.length, 1);
});

test("learning log: one heading per day, entries appended under it", () => {
  const root = tmpVault();
  const s = state();
  appendLearningLog(root, s, "Ownership moves values", MON);
  appendLearningLog(root, s, "Borrows are scoped", MON);
  const text = fs.readFileSync(path.join(root, s.settings.learningLog), "utf-8");
  assert.equal(text.match(/## 2026-11-16/g)!.length, 1);
  assert.match(text, /- Ownership moves values\n- Borrows are scoped/);
});

// ── store ────────────────────────────────────────────────────────────────────

test("writes are atomic and serialized by the lock", async () => {
  const root = tmpVault();
  await Promise.all(Array.from({ length: 8 }, () => mutate(root, (s) => void (s.xp += 1))));
  assert.equal(loadState(root).xp, 8);
  assert.equal(fs.existsSync(path.join(root, "Learning", ".quest", ".lock")), false);
  assert.deepEqual(fs.readdirSync(path.join(root, "Learning", ".quest")).filter((f) => f.endsWith(".tmp")), []);
});

test("a note is backed up once a day, before its first edit", () => {
  const root = tmpVault();
  fs.writeFileSync(path.join(root, "n.md"), "v1");
  backupOnce(root, "n.md");
  fs.writeFileSync(path.join(root, "n.md"), "v2");
  backupOnce(root, "n.md");
  const dir = path.join(root, "Learning", ".quest", "backups");
  const day = fs.readdirSync(dir)[0]!;
  assert.equal(fs.readFileSync(path.join(dir, day, "n.md"), "utf-8"), "v1");
});

test("folder paths: Windows and WSL spellings", () => {
  if (process.platform === "win32") assert.equal(normalizeFolder("/mnt/e/Obsidian/Vault"), "E:\\Obsidian\\Vault");
  else assert.equal(normalizeFolder("E:\\Obsidian\\Vault"), "/mnt/e/Obsidian/Vault");
});

// ── today ────────────────────────────────────────────────────────────────────

test("today: leave days are quiet, the cap message shows once reached", () => {
  const s = state({ goals: [goal("a", [200], { status: "active", activatedOn: MON })], leaves: [{ id: "l", from: "2026-11-17", to: "2026-11-17" }] });
  const leave = computeToday(s, undefined, "2026-11-17");
  assert.equal(leave.isStudyDay, false);
  assert.match(leave.message!, /leave/i);
  assert.equal(leave.goal, undefined);
  s.logs.push(log(MON, 60));
  const capped = computeToday(s, undefined, MON);
  assert.equal(capped.overCap, true);
  assert.equal(capped.minutesLeft, 0);
  assert.equal(capped.goal, undefined); // no room left: nothing more is planned today
});

// ── end to end through the tools ─────────────────────────────────────────────

test("onboard → log_session writes state, session note, board, learning log and daily note", async () => {
  const root = tmpVault();
  fs.mkdirSync(path.join(root, "Templates"));
  fs.writeFileSync(path.join(root, "Templates", "Daily Note Template.md"), "# {{date:dddd}}\n\n---\n\n## 📝 End-of-Day Reflection\n");
  process.env.LEARNING_QUEST_DIR = root;
  const api = await import("./api.js");
  await api.onboard({ goals: ["Zero to Hero", "ddia"] });
  const t = await api.getToday({});
  const result = await api.logSession({ minutes: 45, readingMinutes: 10, unitsDone: [], quizScore: 7, learned: "Backprop is the chain rule, applied in reverse", summary: "micrograd part 1", stoppedAt: "38:00" });
  const s = loadState(root);
  assert.equal(s.goals[0]!.status, "active");
  assert.equal(s.goals[1]!.status, "queued");
  assert.equal(s.logs.length, 1);
  assert.equal(s.goals[0]!.units[0]!.spent, 35);
  assert.ok((result as { xpGained: number }).xpGained >= 45 + 21);
  assert.ok(fs.existsSync(path.join(root, "Learning", "Quest Board.md")));
  assert.ok(fs.existsSync(path.join(root, "Learning", ".quest", "today.json")));
  assert.match(fs.readFileSync(path.join(root, "Learning", "Learning Log.md"), "utf-8"), /chain rule/);
  const today = (t as { date: string; isStudyDay: boolean }).date;
  const session = fs.readFileSync(path.join(root, "Learning", "Sessions", `${today}.md`), "utf-8");
  assert.match(session, /^---\nstudy: 45\n/);
  assert.match(session, /Stopped at:\*\* 38:00/);
  if ((t as { isStudyDay: boolean }).isStudyDay) {
    assert.match(fs.readFileSync(path.join(root, "Daily Notes", `${today}.md`), "utf-8"), /## 🎯 Today's Quest/);
  }
});
