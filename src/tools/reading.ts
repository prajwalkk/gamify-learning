import fs from "fs";
import { z } from "zod/v3";
import { Config } from "../config.js";
import { loadState, saveState, addXp } from "../state.js";
import {
  READING_HEADING, ReadingItem, currentReading, dailyNotePath, ensureDailyNote, localDay,
  parseReading, readingBody, tickedReading, upsertSection,
} from "../daily-note.js";
import { getFeeds } from "./feeds.js";

export const READ_XP = 5;

/** Skip things that aren't worth a reading slot: one-line quote posts, bare release tags. */
export function isReadable(title: string): boolean {
  if (/^quoting\b/i.test(title)) return false;
  if (/^[a-z-]*v?\d+(\.\d+)+\S*$/i.test(title.trim())) return false;
  return title.trim().length >= 12;
}

/**
 * Award read XP for reading-list boxes ticked in Obsidian (or in the Claude Code pane)
 * that we haven't counted yet. Obsidian is the source of truth for "done".
 */
export function syncReadingXp(cfg: Config): { newlyRead: string[]; xpGained: number } {
  let ticked: ReturnType<typeof tickedReading>;
  try {
    ticked = tickedReading(cfg);
  } catch {
    return { newlyRead: [], xpGained: 0 };
  }
  if (ticked.length === 0) return { newlyRead: [], xpGained: 0 };
  let state = loadState(cfg.vaultPath, cfg.username);
  const known = new Set(state.readArticles.flatMap((r) => [r.guid, r.link].filter(Boolean) as string[]));
  const newlyRead: string[] = [];
  for (const t of ticked) {
    if (known.has(t.url)) continue;
    known.add(t.url);
    state.readArticles.push({ guid: t.url, link: t.url, title: t.title, feedName: t.source ?? "reading list", readAt: new Date().toISOString() });
    state = addXp(state, READ_XP);
    newlyRead.push(t.title);
  }
  if (newlyRead.length) saveState(cfg.vaultPath, state);
  return { newlyRead, xpGained: newlyRead.length * READ_XP };
}

export const planTodaySchema = z.object({
  count: z.number().optional().describe("How many links (default: readingPerDay from config, 5)"),
  replace: z.boolean().default(false).describe("Rebuild today's list even if it already exists"),
  category: z.string().optional().describe("Only pick from this category"),
});

/**
 * Today's reading list, written into today's Obsidian daily note under "📚 Today's Reading".
 * Rule for now: if the latest earlier list still has unread links, today's list is those
 * same links (carried over); otherwise pick fresh ones from the feeds.
 */
export async function planToday(cfg: Config, input: z.infer<typeof planTodaySchema>) {
  const synced = syncReadingXp(cfg);
  const today = localDay();
  const file = dailyNotePath(cfg, today);
  const existing = fs.existsSync(file) ? parseReading(fs.readFileSync(file, "utf-8")) : undefined;

  if (existing && existing.length && !input.replace) {
    return summary(cfg, today, existing, "already planned", synced);
  }

  const current = input.replace ? undefined : currentReading(cfg, today);
  let items: ReadingItem[];
  let note: string | undefined;
  let how: string;
  if (current?.carriedFrom) {
    items = current.items;
    note = `Carried over from [[${current.carriedFrom}]] — not finished yet`;
    how = `carried over ${items.length} unread from ${current.carriedFrom}`;
  } else {
    const n = input.count ?? cfg.readingPerDay;
    const feed = await getFeeds(cfg, { limit: n * 4, perSource: 1, includeRead: false, refresh: false, category: input.category });
    items = feed.articles
      .map((a) => ({ done: false, title: a.title, url: a.link, source: a.source }))
      .filter((i) => i.url && isReadable(i.title))
      .slice(0, n);
    if (items.length === 0) {
      return { message: "Nothing to plan: no unread articles in your feeds right now. Try again later or follow more sources.", synced };
    }
    note = "Picked by gamify-learning · tick each one when you've read it (+5 XP)";
    how = `picked ${items.length} fresh links`;
  }

  const text = ensureDailyNote(cfg, today);
  fs.writeFileSync(file, upsertSection(text, READING_HEADING, readingBody(items, note)));
  return summary(cfg, today, items, how, synced);
}

function summary(cfg: Config, day: string, items: ReadingItem[], how: string, synced: ReturnType<typeof syncReadingXp>) {
  return {
    day,
    how,
    note: dailyNotePath(cfg, day),
    items: items.map((i) => ({ done: i.done, title: i.title, url: i.url, source: i.source })),
    done: items.filter((i) => i.done).length,
    total: items.length,
    xpFromTicks: synced.xpGained ? `+${synced.xpGained} XP for ${synced.newlyRead.length} ticked in Obsidian` : undefined,
  };
}
