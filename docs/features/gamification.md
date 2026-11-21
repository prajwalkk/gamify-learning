# Gamification

XP, levels with titles, and a daily streak. Everything you do (learning, reading, finishing goals) counts.

## Using it

- *"Show my dashboard"* / *"How am I doing?"*
- *"What are my stats?"*

## Tools

| Tool | What it does |
|---|---|
| `get_dashboard` | Level, title, XP, XP to next level, streak, today's entries and goals, articles read, today's reading progress (`todaysReading`), whether onboarding is done, current track. It first syncs XP for reading-list boxes ticked in Obsidian |
| `get_stats` | All-time totals: level, title, XP, streak, entries, articles read |

## How it works

- Code: `src/tools/gamification.ts`, `src/state.ts`
- **XP sources:** [learning entry](learning-log.md) 10–40+ · [article read](reading-list.md) +5 (in chat, or ticked in the [daily reading list](daily-reading.md)) · [goal completed](goals.md) +10
- **Levels:** one per 100 XP (level = ⌊XP / 100⌋ + 1)
- **Titles:** level 1 Apprentice · 2 Explorer · 3 Scholar · 5 Sage · 8 Luminary · 13 Polymath · 21 Enlightened
- **Streak:** goes up when you log a learning entry on the day after your last one, and resets to 1 after a gap. Only `log_learning` counts toward the streak.
- **State:** `<vault>/.gamify-state.json`, per person. There's no shared leaderboard; that was left out on purpose.

## Limitations

- Reading articles and completing goals don't extend the streak.
