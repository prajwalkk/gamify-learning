import { z } from "zod/v3";
import { loadState, saveState, updateStreak, addXp, levelFromXp, LearningEntry } from "../state.js";
import { writeLearningNote } from "../obsidian.js";
import { Config } from "../config.js";

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function calcXp(content: string, tags: string[]): number {
  let xp = 10;
  if (content.length > 200) xp += 10;
  if (content.length > 500) xp += 10;
  xp += tags.length * 5;
  return xp;
}

export const logLearningSchema = z.object({
  topic: z.string().describe("Short title for what you learned"),
  content: z.string().describe("What you learned — can be a few sentences or more"),
  source: z.string().optional().describe("URL, book, or blog name"),
  tags: z.array(z.string()).default([]).describe("Topic tags like ['rust', 'programming']"),
});

export async function logLearning(cfg: Config, input: z.infer<typeof logLearningSchema>) {
  let state = loadState(cfg.vaultPath, cfg.username);
  state = updateStreak(state);

  const xp = calcXp(input.content, input.tags);
  const entry: LearningEntry = {
    id: makeId(),
    topic: input.topic,
    content: input.content,
    source: input.source,
    tags: input.tags,
    xpEarned: xp,
    createdAt: new Date().toISOString(),
  };

  state = addXp(state, xp);
  state.totalEntries += 1;
  state.entries.push(entry);

  saveState(cfg.vaultPath, state);
  const notePath = writeLearningNote(cfg, entry);

  const leveledUp = state.level > levelFromXp(state.xp - xp);

  return {
    message: `Logged! +${xp} XP${leveledUp ? ` — Level up! You're now Level ${state.level}!` : ""}`,
    xp: state.xp,
    level: state.level,
    streak: state.streak,
    notePath,
  };
}

export const getEntriesSchema = z.object({
  limit: z.number().default(10).describe("Number of recent entries to show"),
});

export async function getEntries(cfg: Config, input: z.infer<typeof getEntriesSchema>) {
  const state = loadState(cfg.vaultPath, cfg.username);
  const recent = state.entries.slice(-input.limit).reverse();
  return { entries: recent, total: state.totalEntries };
}
