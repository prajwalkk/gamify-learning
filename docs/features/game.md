# XP, streaks, levels and badges

The game layer rewards showing up, not grinding: time past the daily cap earns nothing, and a 20-minute day still keeps the streak.

## Rules

- **XP per session:** 1 per minute (only up to the daily cap) + 25 per finished unit + 3 per quiz point + 10 for a new reading.
- **Streak bonus:** 5 × the streak (counted up to 10 days, so at most +50), added when the streak grows.
- **Streak:** consecutive study days with at least 20 minutes (`streakMinutes`). Weekends and leave days are skipped over and don't break it. Today counts once it reaches 20 minutes; until then the streak still stands from yesterday. The best streak is kept.
- **Level:** `floor(sqrt(xp / 50)) + 1`; the next level starts at `50 × level²` XP. Titles run Apprentice, Novice, Student, Practitioner, Adept, Scholar, Expert, Master, Sage.
- **Badges:** first session · 5-, 10- and 20-day streaks · 10 readings · a perfect quiz · a goal completed · 10 hours studied.
- **Over the cap:** minutes past 60 earn no XP, and you're told to stop for the day.

Level, XP and streak show up in `get_today`, `get_board`, the [Quest Board](notes.md), the session report from `log_session`, and the [status chip](claude-code-mod.md).

## How it works

- Code: `src/quest/game.ts` (`sessionXp`, `streakOf`, `levelOf`, `awardBadges`), applied in `log_session` (`src/quest/api.ts`).
- The streak is computed from the session logs each time, not stored, so editing a past session or adding a leave corrects it.
- `creditedStreak` remembers the streak value already paid a bonus, so the same growth isn't paid twice.

## Limitations

- A session logged on a rest day counts toward the streak, but a quiet rest day never breaks it.
