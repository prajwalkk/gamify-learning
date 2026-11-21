# What gets written to your notes

You own the record: everything is Markdown or JSON in your notes folder (your Obsidian vault). Files Learning Quest generates say so at the top. Your own notes are backed up before their first edit each day and only changed in the places listed here.

## Files

| Path (in the notes folder) | What it is |
|---|---|
| `Learning/.quest/state.json` | Goals, logs, leaves, XP, badges, readings done, daily picks, settings |
| `Learning/.quest/news.json` | Feed cache |
| `Learning/.quest/today.json` | Today's quest, for the [Claude Code mod](claude-code-mod.md) |
| `Learning/.quest/.lock` | Write lock: one writer at a time across apps; reads and feed refreshes don't wait for it |
| `Learning/.quest/backups/<day>/` | One copy per day of any of your notes, taken before its first edit |
| `Learning/Quest Board.md` | **Generated** on every change: level, XP, streak, badges, goal progress bars with deadline and finish date, the next 10 study days, leaves, recent sessions |
| `Learning/Sessions/YYYY-MM-DD.md` | **Generated**: one block per sitting (reading, goal and units, where you stopped, quiz, what you learned, summary, XP), with the day's total as a `study:` minutes field in the frontmatter |
| Your goal notes (a goal's `note`) | The unit's checkbox is ticked when it's done, a dated "Learning Quest" line is added under `## Progress Log` (created if missing), and a `Last updated: YYYY-MM-DD` line (or `last_updated:` in frontmatter) is changed |
| Your learning log (`learningLog`, default `Learning/Learning Log.md`) | What you learned is appended under one `## YYYY-MM-DD` heading per day |
| Your daily note (`<dailyNotesFolder>/YYYY-MM-DD.md`, default `Daily Notes/`) | A **🎯 Today's Quest** section on study days (track, minutes, streak, level, the reading, the goal block, any risk), placed before your reflection section. If today's note doesn't exist yet, it's created from your daily template |

## Rules the writer keeps

- **One job per call:** a save never fetches the network.
- **A single writer:** every change takes `.lock` (a crashed writer's lock is cleared after 30 seconds), reads the latest state, applies the change, and writes it back.
- **Atomic writes:** a temp file, then a rename, for every file.
- **Back up before editing** a note of yours; keep its line endings.
- **Mark generated files** as generated.
- **The daily-note section is regenerated**, so it uses plain bullets, not checkboxes that would be un-ticked. Progress is logged through the coach and shows there as ✅.
- Sections an earlier version of this project wrote into daily notes (📚 Today's Reading, 🎯 Learning Goals) are removed the first time the quest writes that note.

## How it works

- Code: `src/quest/store.ts` (folder resolution, lock, atomic writes, backups), `src/quest/notes.ts` (every file above).
- After every change, and when a session starts, the Quest Board, `today.json` and today's daily-note section are redrawn.

## Limitations

- Templater (`<% … %>`) syntax in a daily template isn't run; Obsidian's core placeholders (`{{date}}`, `{{date:FORMAT}}`, `{{time}}`, `{{title}}`) are.
