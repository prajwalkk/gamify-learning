import fs from "fs";
import path from "path";
import { LearningEntry, Goal } from "./state.js";

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function writeLearningNote(vaultPath: string, entry: LearningEntry): string {
  const dir = path.join(vaultPath, "Learning");
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

export function writeDailyNote(
  vaultPath: string,
  username: string,
  xp: number,
  level: number,
  streak: number,
  goals: Goal[],
  recentEntries: { topic: string; xpEarned: number }[]
): string {
  const dir = path.join(vaultPath, "Daily");
  ensureDir(dir);

  const today = new Date().toISOString().slice(0, 10);
  const filepath = path.join(dir, `${today}.md`);

  const goalLines = goals
    .map((g) => `- [${g.done ? "x" : " "}] ${g.text}`)
    .join("\n");

  const recentLines = recentEntries
    .slice(-5)
    .map((e) => `- ${e.topic} (+${e.xpEarned} XP)`)
    .join("\n");

  const content = `---
date: ${today}
---

# ${today} — ${username}

## Stats
- **Level:** ${level}
- **XP:** ${xp}
- **Streak:** ${streak} day${streak !== 1 ? "s" : ""}

## Goals
${goalLines || "_No goals set for today._"}

## Recent Learning
${recentLines || "_No entries yet._"}
`;

  fs.writeFileSync(filepath, content);
  return filepath;
}
