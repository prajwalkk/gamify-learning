# Learning Quest

A calm, gamified daily learning habit for Claude Code. **Discipline without overwhelm.**

- **One sitting a day:** one short reading and one study unit, capped at 60 minutes.
- **Basics first:** fundamentals and intuition, with small concrete examples.
- **Showing up counts:** a 20-minute day still keeps the streak.
- **The plan bends, it doesn't break:** leaves and missed days shift the plan forward instead of failing you.
- **You own the record:** everything lives as Markdown in a folder you choose, such as your Obsidian vault.
- **Coached:** Claude suggests a reading, quizzes you on what you paste back, logs progress and moves your goals along.

Every Claude Code session shows today's quest in a pane (desktop) or a band (terminal), with a status chip: `🟡 🔥3 · L2 · 25/60`.

## Install

You need **Node.js 18+**. Then add the plugin:

- **Claude Code desktop:** **+** next to the prompt box → **Plugins** → **Add marketplace** `prajwalkk/gamify-learning` → **Add plugin** → *learning-quest*
- **Terminal:**

  ```
  /plugin install learning-quest --marketplace prajwalkk/gamify-learning
  ```

Then say **`/quest setup`**. Claude asks where your notes live, which goals to start with, and a few preferences. After that, **`/quest`** runs each day's session.

## What's inside

| | |
|---|---|
| **Coach** | `/quest` and the `learning-quest` skill: kickoff → 10-minute reading and a 5-question quiz → 50-minute goal block → close and log |
| **Goals** | A starter library (Rust Book, Math for ML, 3Blue1Brown, Zero to Hero, DDIA, System Design Primer, LLM From Scratch) or your own, broken into units with time estimates |
| **Scheduler** | Fits units into study days at up to 50 minutes a day, shifts for leaves, flags a goal at risk and offers one gentle option |
| **Game** | XP (minutes up to the cap, units, quiz points, new readings, streak bonus), levels, a streak that skips weekends and leave, badges |
| **Feeds** | 45 curated feeds, Fanout's daily papers first, across ML, AI dev, system design, game dev, languages and news: one reading a day for that day's track, plus headlines |
| **Notes** | `Learning/Quest Board.md`, `Learning/Sessions/`, your goal notes' checkboxes and progress logs, your learning log, and a "Today's Quest" section in your daily note |

Full docs: **[docs/](docs/README.md)** · [changelog](docs/CHANGELOG.md)

## Develop

```bash
npm install          # also installs the docs git hook
npm run build        # TypeScript → dist/, and the plugin's bundled server
npm test             # engine tests
claude plugin test mods/learning-quest   # mod tests
npm run verify-feeds # live-check the feed catalog
```

Run the plugin from your working copy with `claude --plugin-dir mods/learning-quest`.
