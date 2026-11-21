import { loadState } from "../state.js";
import { Config } from "../config.js";
import { syncReadingXp } from "./reading.js";
import { currentReading } from "../daily-note.js";

const LEVEL_TITLES: Record<number, string> = {
  1: "Apprentice",
  2: "Explorer",
  3: "Scholar",
  5: "Sage",
  8: "Luminary",
  13: "Polymath",
  21: "Enlightened",
};

function titleForLevel(level: number): string {
  const keys = Object.keys(LEVEL_TITLES)
    .map(Number)
    .sort((a, b) => b - a);
  for (const k of keys) {
    if (level >= k) return LEVEL_TITLES[k];
  }
  return "Apprentice";
}

export async function getDashboard(cfg: Config) {
  const synced = syncReadingXp(cfg);
  const reading = currentReading(cfg);
  const state = loadState(cfg.vaultPath, cfg.username);
  const today = new Date().toISOString().slice(0, 10);
  const todayEntries = state.entries.filter((e) => e.createdAt.startsWith(today));
  const todayGoals = state.goals.filter((g) => g.createdAt.startsWith(today));
  const xpToNext = (state.level * 100) - state.xp;

  return {
    username: state.username,
    level: state.level,
    title: titleForLevel(state.level),
    xp: state.xp,
    xpToNextLevel: xpToNext > 0 ? xpToNext : 0,
    streak: state.streak,
    totalEntries: state.totalEntries,
    todayEntries: todayEntries.length,
    goalsToday: { done: todayGoals.filter((g) => g.done).length, total: todayGoals.length },
    articlesReadTotal: state.readArticles?.length ?? 0,
    onboarded: cfg.sources.length + cfg.customFeeds.length > 0,
    todaysReading: reading
      ? `${reading.items.filter((i) => i.done).length}/${reading.items.length} read${reading.carriedFrom ? ` (carried over from ${reading.carriedFrom})` : ""}`
      : "not planned yet — call plan_today",
    xpFromTicks: synced.xpGained ? `+${synced.xpGained} XP for ${synced.newlyRead.length} ticked in Obsidian` : undefined,
    languageTrack: cfg.languageTrack,
  };
}

export async function getLeaderboard(cfg: Config) {
  const state = loadState(cfg.vaultPath, cfg.username);
  return {
    username: state.username,
    level: state.level,
    title: titleForLevel(state.level),
    xp: state.xp,
    streak: state.streak,
    totalEntries: state.totalEntries,
    articlesRead: state.readArticles?.length ?? 0,
  };
}
