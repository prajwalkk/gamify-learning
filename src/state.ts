import fs from "fs";
import path from "path";

export interface Goal {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

export interface LearningEntry {
  id: string;
  topic: string;
  content: string;
  source?: string;
  tags: string[];
  xpEarned: number;
  createdAt: string;
}

export interface ReadArticle {
  guid: string;
  link?: string;
  title: string;
  feedName: string;
  readAt: string;
}

export interface UserState {
  username: string;
  xp: number;
  level: number;
  streak: number;
  lastEntryDate: string;
  totalEntries: number;
  goals: Goal[];
  entries: LearningEntry[];
  readArticles: ReadArticle[];
}

const XP_PER_LEVEL = 100;

export function levelFromXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

function stateFilePath(vaultPath: string): string {
  return path.join(vaultPath, ".gamify-state.json");
}

export function loadState(vaultPath: string, username: string): UserState {
  const fp = stateFilePath(vaultPath);
  if (!fs.existsSync(fp)) {
    return {
      username,
      xp: 0,
      level: 1,
      streak: 0,
      lastEntryDate: "",
      totalEntries: 0,
      goals: [],
      entries: [],
      readArticles: [],
    };
  }
  const s = JSON.parse(fs.readFileSync(fp, "utf-8")) as UserState;
  if (!s.readArticles) s.readArticles = [];
  return s;
}

export function saveState(vaultPath: string, state: UserState): void {
  fs.mkdirSync(vaultPath, { recursive: true });
  fs.writeFileSync(stateFilePath(vaultPath), JSON.stringify(state, null, 2));
}

export function updateStreak(state: UserState): UserState {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (state.lastEntryDate === today) return state;
  if (state.lastEntryDate === yesterday) {
    return { ...state, streak: state.streak + 1, lastEntryDate: today };
  }
  return { ...state, streak: 1, lastEntryDate: today };
}

export function addXp(state: UserState, amount: number): UserState {
  const newXp = state.xp + amount;
  return { ...state, xp: newXp, level: levelFromXp(newXp) };
}
