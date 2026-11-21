import fs from "fs";
import path from "path";
import { LearningEntry, Goal } from "./state.js";
import { Config } from "./config.js";
import { ensureDailyNote, upsertSection, dailyNotePath, localDay, GOALS_HEADING } from "./daily-note.js";

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function writeLearningNote(cfg: Config, entry: LearningEntry): string {
  const dir = path.join(cfg.vaultPath, cfg.learningFolder);
  ensureDir(dir);

  const date = entry.createdAt.slice(0, 10);
  const safeTitle = entry.topic.replace(/[^a-zA-Z0-9 _-]/g, "").slice(0, 60);
  const filename = `${date} - ${safeTitle}.md`;
  const filepath = path.join(dir, filename);

  const tags = entry.tags.map((t) => `#${t}`).join(" ");
  const source = entry.source ? `\n**Source:** ${entry.source}` : "";

  const content = `---
date: ${entry.createdAt}
tags: [${entry.tags.join(", ")}]
xp: ${entry.xpEarned}
---

# ${entry.topic}
${source}

${entry.content}

${tags}
`;

  fs.writeFileSync(filepath, content);
  return filepath;
}

/**
 * Write our "Learning Goals" section into the user's own daily note (created from their
 * template if needed). Everything else in the note is left exactly as it is.
 */
export function writeGoalsSection(
  cfg: Config,
  stats: { xp: number; level: number; streak: number },
  goals: Goal[],
  recentEntries: { topic: string; xpEarned: number }[]
): string {
  const day = localDay();
  const text = ensureDailyNote(cfg, day);
  const goalLines = goals.map((g) => `- [${g.done ? "x" : " "}] ${g.text}`).join("\n") || "_No goals set for today._";
  const recent = recentEntries.slice(-5).map((e) => `- ${e.topic} (+${e.xpEarned} XP)`).join("\n");
  const body = [
    `**Level ${stats.level}** · ${stats.xp} XP · 🔥 ${stats.streak}-day streak`,
    "",
    goalLines,
    ...(recent ? ["", "**Recent learning:**", recent] : []),
  ].join("\n");
  const file = dailyNotePath(cfg, day);
  fs.writeFileSync(file, upsertSection(text, GOALS_HEADING, body));
  return file;
}
