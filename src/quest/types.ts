// Learning Quest data model. Everything persists in <notes>/Learning/.quest/state.json.

export type TrackId = "ml" | "system-design" | "ai-dev" | "game-dev" | "languages";
export type GoalStatus = "active" | "queued" | "parked" | "done";
export type LearningStyle = "reading" | "video" | "exercise";

export interface Unit {
  id: string;
  title: string;
  /** Estimated minutes */
  minutes: number;
  /** Minutes logged against this unit so far */
  spent: number;
  done: boolean;
  /** Optional extras: dropping them is the first way to catch up */
  stretch?: boolean;
  /** Link to the material (chapter, video) */
  url?: string;
  /** Text of a checkbox in the goal's own note to tick when this unit is done */
  checkbox?: string;
  doneOn?: string;
}

export interface Goal {
  id: string;
  title: string;
  track: TrackId;
  status: GoalStatus;
  /** Lower number = studied sooner among queued goals */
  priority: number;
  /** YYYY-MM-DD, fixed deadline before leave shifts */
  deadline?: string;
  /** Days to finish once active (used when there is no fixed deadline) */
  durationDays?: number;
  /** Vault-relative path of the user's own note about this goal */
  note?: string;
  format?: LearningStyle;
  link?: string;
  units: Unit[];
  /** Day it became active */
  activatedOn?: string;
  doneOn?: string;
  /** Library entry it came from */
  libraryId?: string;
}

export interface Leave {
  id: string;
  from: string; // YYYY-MM-DD inclusive
  to: string; // YYYY-MM-DD inclusive
  reason?: string;
}

export interface SessionLog {
  id: string;
  date: string;
  /** Total minutes of the sitting (reading included) */
  minutes: number;
  readingMinutes: number;
  goalId?: string;
  unitsDone: string[];
  stoppedAt?: string;
  reading?: { title: string; url: string; source?: string };
  /** 0–10 */
  quizScore?: number;
  learned?: string;
  summary?: string;
  xp: number;
  loggedAt: string;
}

export interface Settings {
  /** Minutes per day, all blocks */
  dailyCap: number;
  readingBlock: number;
  goalBlock: number;
  /** 0 = Sunday … 6 = Saturday */
  studyDays: number[];
  /** Weekday (0–6) → track for that day's reading */
  rotation: Record<string, TrackId>;
  /** "shift": leaves push active deadlines out; "keep": deadlines stay */
  leaveBehavior: "shift" | "keep";
  /** HH:MM local, when the daily session is meant to start */
  sessionTime: string;
  learningStyle: LearningStyle;
  /** Minutes on a study day that keep the streak alive */
  streakMinutes: number;
  /** Vault-relative path of the learning log note */
  learningLog: string;
  /** Vault-relative folder of the user's daily notes ("" to skip the daily-note section) */
  dailyNotesFolder: string;
  dailyTemplate: string;
}

export interface QuestState {
  version: 1;
  createdAt: string;
  onboarded: boolean;
  settings: Settings;
  goals: Goal[];
  leaves: Leave[];
  logs: SessionLog[];
  xp: number;
  bestStreak: number;
  /** Streak value last credited with a bonus (so a bonus is paid once per growth) */
  creditedStreak: number;
  badges: { id: string; earnedOn: string }[];
  /** URLs of readings already done */
  readingsDone: string[];
  /** Feed ids turned on */
  feeds: string[];
  /** Day → the reading picked for it, so it stays the same all day (last 14 days kept) */
  picks: Record<string, PickedReading>;
}

export interface PickedReading {
  title: string;
  url: string;
  source: string;
  feedId: string;
  track: TrackId;
  summary?: string;
  /** "curated": the day's paper from a curated feed; "rotation": newest item, rotating across feeds */
  pickedBy: "curated" | "rotation";
}

export const TRACKS: Record<TrackId, string> = {
  ml: "Machine learning",
  "system-design": "System design",
  "ai-dev": "AI dev",
  "game-dev": "Game dev",
  languages: "Languages",
};

export const DEFAULT_SETTINGS: Settings = {
  dailyCap: 60,
  readingBlock: 10,
  goalBlock: 50,
  studyDays: [1, 2, 3, 4, 5],
  rotation: { "1": "ml", "2": "system-design", "3": "ml", "4": "system-design", "5": "ai-dev" },
  leaveBehavior: "shift",
  sessionTime: "08:30",
  learningStyle: "reading",
  streakMinutes: 20,
  learningLog: "Learning/Learning Log.md",
  dailyNotesFolder: "Daily Notes",
  dailyTemplate: "Templates/Daily Note Template.md",
};
