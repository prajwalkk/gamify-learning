# Daily goals

Set learning goals for the day, tick them off for XP, and get an Obsidian daily note with your goals, stats and recent learning.

## Using it

- *"Goal for today: finish the Godot 2D tutorial"*
- *"Done with the tutorial"*
- *"What are my goals today?"*: also refreshes the daily note

## Tools

| Tool | What it does | Key inputs |
|---|---|---|
| `add_goal` | Adds a goal for today | `text` |
| `complete_goal` | Marks a goal done, +10 XP | `goalId`, or `text` (partial match) |
| `get_goals` | Today's goals; rewrites today's daily note | — |

## How it works

- Code: `src/tools/goals.ts`, `src/obsidian.ts` (`writeDailyNote`)
- **Daily note:** `<vault>/Daily/YYYY-MM-DD.md` with level, XP, streak, the goal checklist (`- [x]`), and the last 5 learning entries. It's regenerated each time `get_goals` runs.
- "Today" means goals created today; unfinished goals don't carry over.

## Limitations

- The daily note is only written by `get_goals`, not after each goal change.
- Dates use UTC.
