# Settings

Everything about the daily rhythm can be changed: the cap, the blocks, which days you study, which track each day reads, how leaves treat deadlines, and where notes go.

## Using it

- "Make my cap 45 minutes, 10 reading and 35 goal"
- "I study Mon, Tue, Thu and Sat"
- "Fridays should be system design too"
- "Don't move deadlines when I take leave"
- "I prefer videos"

## Settings

| Setting | Default | Meaning |
|---|---|---|
| `dailyCap` | 60 | Minutes a day that earn XP and get planned |
| `readingBlock` | 10 | Minutes for the daily reading |
| `goalBlock` | 50 | Goal minutes planned per study day. Reading + goal can't exceed the cap |
| `studyDays` | Mon–Fri (`[1,2,3,4,5]`) | Weekdays with sessions (0 = Sunday) |
| `rotation` | Mon/Wed `ml`, Tue/Thu `system-design`, Fri `ai-dev` | Weekday → track for the reading. A track needs feeds turned on for it (e.g. the Game dev group for `game-dev`) |
| `leaveBehavior` | `shift` | `shift` pushes active deadlines out by the leave's study days; `keep` leaves them |
| `sessionTime` | `08:30` | When the session is meant to happen |
| `learningStyle` | `reading` | `reading`, `video` or `exercise`: shapes the goal-block prompts |
| `streakMinutes` | 20 | Minutes that keep the streak on a study day |
| `learningLog` | `Learning/Learning Log.md` | Your learning log note |
| `dailyNotesFolder` | `Daily Notes` | Your daily notes folder (`""` leaves daily notes alone) |
| `dailyTemplate` | `Templates/Daily Note Template.md` | Template for a daily note that doesn't exist yet |

## Tools

| Tool | What it does | Key inputs |
|---|---|---|
| `set_config` | Changes any of the settings above, refusing reading + goal blocks larger than the cap | any setting |

Settings are first chosen during `onboard` (see [Setup](setup.md)).

## How it works

- Stored in `state.json` → `settings`; defaults in `src/quest/types.ts` (`DEFAULT_SETTINGS`).
- Every change redraws the plan, the Quest Board, today's snapshot and the daily note.
