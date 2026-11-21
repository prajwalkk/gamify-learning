import fs from "fs";
import path from "path";
import { Config } from "./config.js";

// Daily notes are the user's own Obsidian notes (their template, their sections).
// We only ever add or replace our own sections inside them, never the rest.

export const READING_HEADING = "## 📚 Today's Reading";
export const GOALS_HEADING = "## 🎯 Learning Goals";

export interface ReadingItem {
  done: boolean;
  title: string;
  url: string;
  source?: string;
}

const ITEM_RE = /^\s*[-*] \[( |x|X)\] \[(.+?)\]\((\S+?)\)(?:\s+[—–-]\s+(.*))?\s*$/;

/** YYYY-MM-DD in local time (Obsidian's daily notes are local-day). */
export function localDay(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function dailyDir(cfg: Config): string {
  return path.join(cfg.vaultPath, cfg.dailyNotesFolder);
}

export function dailyNotePath(cfg: Config, day: string): string {
  return path.join(dailyDir(cfg), `${day}.md`);
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Moment-style formatting for the tokens Obsidian templates use. */
export function formatDate(d: Date, fmt: string): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const tokens: Record<string, () => string> = {
    YYYY: () => String(d.getFullYear()),
    MMMM: () => MONTHS[d.getMonth()],
    MMM: () => MONTHS[d.getMonth()].slice(0, 3),
    MM: () => p(d.getMonth() + 1),
    M: () => String(d.getMonth() + 1),
    dddd: () => DAYS[d.getDay()],
    ddd: () => DAYS[d.getDay()].slice(0, 3),
    DD: () => p(d.getDate()),
    D: () => String(d.getDate()),
    HH: () => p(d.getHours()),
    mm: () => p(d.getMinutes()),
  };
  return fmt.replace(/YYYY|MMMM|MMM|MM|M|dddd|ddd|DD|D|HH|mm/g, (t) => tokens[t]());
}

/** Fill Obsidian core-template placeholders: {{date}}, {{date:FORMAT}}, {{time}}, {{title}}. */
export function renderTemplate(tpl: string, d: Date, title: string): string {
  return tpl
    .replace(/\{\{\s*date\s*:\s*([^}]+?)\s*\}\}/g, (_, f) => formatDate(d, f))
    .replace(/\{\{\s*date\s*\}\}/g, formatDate(d, "YYYY-MM-DD"))
    .replace(/\{\{\s*time\s*\}\}/g, formatDate(d, "HH:mm"))
    .replace(/\{\{\s*title\s*\}\}/g, title);
}

/** Read the day's note, creating it from the user's daily template if it doesn't exist. */
export function ensureDailyNote(cfg: Config, day: string): string {
  const file = dailyNotePath(cfg, day);
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf-8");
  const [y, m, dd] = day.split("-").map(Number);
  const date = new Date(y, m - 1, dd, 9, 0);
  const tplPath = path.join(cfg.vaultPath, cfg.dailyTemplate);
  const text = fs.existsSync(tplPath)
    ? renderTemplate(fs.readFileSync(tplPath, "utf-8"), date, day)
    : `# ${formatDate(date, "dddd, MMMM D, YYYY")}\n`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return text;
}

function sectionBounds(lines: string[], heading: string): { start: number; end: number } | undefined {
  const start = lines.findIndex((l) => l.trim() === heading);
  if (start < 0) return undefined;
  let end = start + 1;
  while (end < lines.length && !/^## /.test(lines[end]) && lines[end].trim() !== "---") end++;
  return { start, end };
}

/**
 * Replace our section's body, or insert the section: before the note's reflection
 * section when there is one (keeping the `---` separators the template uses), else at the end.
 */
export function upsertSection(text: string, heading: string, body: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const block = [heading, ...body.replace(/\s+$/, "").split("\n"), ""];
  const found = sectionBounds(lines, heading);
  if (found) {
    lines.splice(found.start, found.end - found.start, ...block);
    return lines.join("\n");
  }
  const reflection = lines.findIndex((l) => /^## .*reflection/i.test(l));
  if (reflection >= 0) {
    // The template separates sections with "---": keep the one above the reflection
    // heading where it is, and add our section plus its own separator right after it.
    lines.splice(reflection, 0, ...block, "---", "");
    return lines.join("\n");
  }
  const tail = lines.join("\n").replace(/\s+$/, "");
  return `${tail}\n\n---\n\n${block.join("\n")}`;
}

export function parseReading(text: string): ReadingItem[] | undefined {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const found = sectionBounds(lines, READING_HEADING);
  if (!found) return undefined;
  const items: ReadingItem[] = [];
  for (const l of lines.slice(found.start + 1, found.end)) {
    const m = l.match(ITEM_RE);
    if (m) items.push({ done: m[1] !== " ", title: m[2], url: m[3], source: m[4]?.trim() || undefined });
  }
  return items;
}

const cleanTitle = (t: string) => t.replace(/[[\]]/g, (c) => (c === "[" ? "(" : ")")).replace(/\s+/g, " ").trim();

export function readingBody(items: ReadingItem[], note?: string): string {
  const head = note ? `*${note}*\n\n` : "";
  return head + items.map((i) => `- [${i.done ? "x" : " "}] [${cleanTitle(i.title)}](${i.url})${i.source ? ` — ${i.source}` : ""}`).join("\n");
}

/** Daily-note days present in the folder, newest first, up to and including `upTo`. */
export function listDays(cfg: Config, upTo: string): string[] {
  const dir = dailyDir(cfg);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .map((f) => f.match(/^(\d{4}-\d{2}-\d{2})\.md$/)?.[1])
    .filter((d): d is string => !!d && d <= upTo)
    .sort()
    .reverse();
}

/** Today's reading list from the vault, or the latest earlier day's unfinished items. */
export function currentReading(cfg: Config, today = localDay()):
  | { day: string; items: ReadingItem[]; carriedFrom?: string }
  | undefined {
  for (const day of listDays(cfg, today)) {
    const items = parseReading(fs.readFileSync(dailyNotePath(cfg, day), "utf-8"));
    if (!items) continue;
    if (day === today) return { day, items };
    const open = items.filter((i) => !i.done);
    return open.length ? { day: today, items: open, carriedFrom: day } : undefined;
  }
  return undefined;
}

/** Tick the item linking to `url` in recent daily notes. Returns how many lines changed. */
export function tickReading(cfg: Config, url: string, days = 14): number {
  let changed = 0;
  for (const day of listDays(cfg, localDay()).slice(0, days)) {
    const file = dailyNotePath(cfg, day);
    const text = fs.readFileSync(file, "utf-8");
    const next = text.replace(/^(\s*[-*] )\[ \]( \[.+?\]\((\S+?)\))/gm, (whole, a, b, link) => {
      if (link !== url) return whole;
      changed++;
      return `${a}[x]${b}`;
    });
    if (next !== text) fs.writeFileSync(file, next);
  }
  return changed;
}

/** Every ticked reading item in the last `days` daily notes. */
export function tickedReading(cfg: Config, days = 14): (ReadingItem & { day: string })[] {
  const out: (ReadingItem & { day: string })[] = [];
  for (const day of listDays(cfg, localDay()).slice(0, days)) {
    for (const i of parseReading(fs.readFileSync(dailyNotePath(cfg, day), "utf-8")) ?? []) {
      if (i.done) out.push({ ...i, day });
    }
  }
  return out;
}
