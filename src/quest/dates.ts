import type { Leave, Settings, TrackId } from "./types.js";

// All dates are local calendar days as YYYY-MM-DD strings; arithmetic goes through
// noon local time so DST changes never skip or repeat a day.

const p = (n: number) => String(n).padStart(2, "0");

export function toDay(d: Date): string {
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function today(now = new Date()): string {
  return toDay(now);
}

export function parseDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12);
}

export function addDays(day: string, n: number): string {
  const d = parseDay(day);
  d.setDate(d.getDate() + n);
  return toDay(d);
}

export function weekday(day: string): number {
  return parseDay(day).getDay();
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 864e5);
}

export function isValidDay(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && toDay(parseDay(s)) === s;
}

export function onLeave(day: string, leaves: Leave[]): Leave | undefined {
  return leaves.find((l) => day >= l.from && day <= l.to);
}

/** A configured weekday that isn't a leave day. */
export function isStudyDay(day: string, s: Settings, leaves: Leave[]): boolean {
  return s.studyDays.includes(weekday(day)) && !onLeave(day, leaves);
}

export function trackFor(day: string, s: Settings): TrackId | undefined {
  return s.rotation[String(weekday(day))];
}

/** The next `count` study days starting at `from` (inclusive). */
export function nextStudyDays(from: string, count: number, s: Settings, leaves: Leave[]): string[] {
  const out: string[] = [];
  let d = from;
  for (let guard = 0; out.length < count && guard < 3660; guard++, d = addDays(d, 1)) {
    if (isStudyDay(d, s, leaves)) out.push(d);
  }
  return out;
}

/** Study weekdays (ignoring leave) in [from, to] that fall on leave. */
export function leaveStudyDaysIn(from: string, to: string, s: Settings, leaves: Leave[]): number {
  let n = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (s.studyDays.includes(weekday(d)) && onLeave(d, leaves)) n++;
  }
  return n;
}

/** Move `day` forward by `n` study days (skipping non-study days and leave). */
export function addStudyDays(day: string, n: number, s: Settings, leaves: Leave[]): string {
  let d = day;
  for (let left = n, guard = 0; left > 0 && guard < 3660; guard++) {
    d = addDays(d, 1);
    if (isStudyDay(d, s, leaves)) left--;
  }
  return d;
}

export function pretty(day: string): string {
  return parseDay(day).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
