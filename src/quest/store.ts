import fs from "fs";
import os from "os";
import path from "path";
import { DEFAULT_SETTINGS, QuestState } from "./types.js";
import { today } from "./dates.js";

// Where the quest lives, and how it is read and written:
//  - notes folder: LEARNING_QUEST_DIR → ~/.config/learning-quest/config.json → ~/LearningQuest
//  - one writer at a time (Learning/.quest/.lock); reads never wait
//  - every write is atomic (temp file, then rename)
//  - a user's own note is copied to Learning/.quest/backups/<day>/ before its first edit that day

export const SHARED_CONFIG = path.join(os.homedir(), ".config", "learning-quest", "config.json");
export const DEFAULT_FOLDER = path.join(os.homedir(), "LearningQuest");

/** Accept E:\x and /mnt/e/x spellings on either platform. */
export function normalizeFolder(p: string): string {
  const s = p.trim().replace(/^~(?=$|[\\/])/, os.homedir());
  const win = s.match(/^([A-Za-z]):[\\/](.*)$/);
  if (process.platform !== "win32" && win) return path.posix.join("/mnt", win[1]!.toLowerCase(), win[2]!.replace(/\\/g, "/"));
  const wsl = s.match(/^\/mnt\/([a-z])\/(.*)$/i);
  if (process.platform === "win32" && wsl) return `${wsl[1]!.toUpperCase()}:\\${wsl[2]!.replace(/\//g, "\\")}`;
  return path.resolve(s);
}

export interface FolderInfo {
  folder: string;
  source: "env" | "config" | "default";
}

export function notesFolder(): FolderInfo {
  const env = process.env.LEARNING_QUEST_DIR;
  if (env?.trim()) return { folder: normalizeFolder(env), source: "env" };
  try {
    const cfg = JSON.parse(fs.readFileSync(SHARED_CONFIG, "utf-8")) as { notesFolder?: string };
    if (cfg.notesFolder?.trim()) return { folder: normalizeFolder(cfg.notesFolder), source: "config" };
  } catch {
    /* no shared config yet */
  }
  return { folder: DEFAULT_FOLDER, source: "default" };
}

export function saveNotesFolder(folder: string): string {
  const norm = normalizeFolder(folder);
  let cfg: Record<string, unknown> = {};
  try {
    cfg = JSON.parse(fs.readFileSync(SHARED_CONFIG, "utf-8"));
  } catch {
    /* new file */
  }
  cfg.notesFolder = norm;
  atomicWrite(SHARED_CONFIG, JSON.stringify(cfg, null, 2) + "\n");
  return norm;
}

export const questDir = (root: string) => path.join(root, "Learning", ".quest");
export const statePath = (root: string) => path.join(questDir(root), "state.json");

export function atomicWrite(file: string, text: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}

export function freshState(): QuestState {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    onboarded: false,
    settings: { ...DEFAULT_SETTINGS, rotation: { ...DEFAULT_SETTINGS.rotation }, studyDays: [...DEFAULT_SETTINGS.studyDays] },
    goals: [],
    leaves: [],
    logs: [],
    xp: 0,
    bestStreak: 0,
    creditedStreak: 0,
    badges: [],
    readingsDone: [],
    feeds: [],
    picks: {},
  };
}

/** Read the state (no lock). Missing file → a fresh, not-onboarded state. */
export function loadState(root: string): QuestState {
  let raw: Partial<QuestState>;
  try {
    raw = JSON.parse(fs.readFileSync(statePath(root), "utf-8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return freshState();
    throw new Error(`Learning/.quest/state.json is unreadable (${(e as Error).message}). Fix or restore it from Learning/.quest/backups/.`);
  }
  const base = freshState();
  // Feeds renamed or replaced since the state was written
  const RENAMED: Record<string, string[]> = { "daily-papers": ["fanout-daily", "fanout-blog"] };
  if (raw.feeds?.some((f) => f in RENAMED)) {
    raw.feeds = [...new Set(raw.feeds.flatMap((f) => RENAMED[f] ?? [f]))];
  }
  return {
    ...base,
    ...raw,
    settings: { ...base.settings, ...(raw.settings ?? {}) },
    picks: raw.picks ?? {},
  } as QuestState;
}

const LOCK_WAIT_MS = 8000;
const LOCK_STALE_MS = 30000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function acquire(lock: string): Promise<number> {
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  const started = Date.now();
  for (;;) {
    try {
      const fd = fs.openSync(lock, "wx");
      fs.writeSync(fd, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
      return fd;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      try {
        if (Date.now() - fs.statSync(lock).mtimeMs > LOCK_STALE_MS) fs.unlinkSync(lock); // a crashed writer
      } catch {
        /* raced with its owner */
      }
      if (Date.now() - started > LOCK_WAIT_MS) throw new Error("Another app is writing the quest right now; try again in a moment.");
      await sleep(60);
    }
  }
}

/**
 * The one way to change the quest: take the lock, read the latest state, apply `fn`,
 * write it atomically, release. `fn` may also write notes (they run under the same lock).
 */
export async function mutate<T>(root: string, fn: (state: QuestState) => T | Promise<T>): Promise<T> {
  const lock = path.join(questDir(root), ".lock");
  const fd = await acquire(lock);
  try {
    const state = loadState(root);
    const result = await fn(state);
    atomicWrite(statePath(root), JSON.stringify(state, null, 2) + "\n");
    return result;
  } finally {
    fs.closeSync(fd);
    try {
      fs.unlinkSync(lock);
    } catch {
      /* already gone */
    }
  }
}

/** Copy a user's own note aside before its first edit of the day. */
export function backupOnce(root: string, relPath: string): void {
  const src = path.join(root, relPath);
  if (!fs.existsSync(src)) return;
  const dest = path.join(questDir(root), "backups", today(), relPath.replace(/[\\/]/g, "__"));
  if (fs.existsSync(dest)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}
