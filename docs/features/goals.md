# Daily goals

Set learning goals for the day, tick them off for XP, and see them in your own Obsidian daily note, with your stats and recent learning.

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

- Code: `src/tools/goals.ts`, `src/obsidian.ts` (`writeGoalsSection`), `src/daily-note.ts`
- **Daily note:** a `## 🎯 Learning Goals` section in *your* daily note, `<vault>/<dailyNotesFolder>/YYYY-MM-DD.md` (default `Daily Notes/`), with level, XP, streak, the goal checklist and the last 5 learning entries. If the note doesn't exist it's created from your template. Only that section is rewritten each time `get_goals` runs; the rest of the note is never touched (see [Daily reading list](daily-reading.md#in-obsidian)).
- "Today" means goals created today; unfinished goals don't carry over.

## Limitations

- The goals section is only rewritten by `get_goals`, not after each goal change.
- Goals count as "today" by local date.
