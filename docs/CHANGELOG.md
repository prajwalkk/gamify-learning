# Changelog

Newest first. One line per user-visible change, with a link to the feature page.

## Unreleased

## 1.0.0 — 2026-11-20 · Learning Quest

A rebuild around the original Learning Quest design. It replaces the earlier gamify-learning feature set (its 112-source catalog, onboarding, language tracks and XP rules).

- [Setup](features/setup.md): one plugin (`learning-quest`) bundles the coach, the MCP server, and the pane and status chip; install from this repo's marketplace. The notes folder comes from `LEARNING_QUEST_DIR` → `~/.config/learning-quest/config.json` → `~/LearningQuest`.
- [The daily session](features/daily-session.md): `/quest` runs kickoff → reading and a 5-question quiz → goal block → close and log, under the coach rules.
- [Goals, plan and leaves](features/goals-and-plan.md): goals with units and estimates, an 8-entry starter library, a scheduler that fills up to 50 minutes a day and recomputes from today, leaves that shift deadlines, risk with one gentle option, and rollover to the next queued goal.
- [XP, streaks, levels and badges](features/game.md): 1 XP/min up to the cap, +25 per unit, +3 per quiz point, +10 per new reading, a streak bonus; a streak that skips weekends and leave; `floor(sqrt(xp/50)) + 1` levels; 8 badges.
- [Daily reading and feeds](features/feeds.md): a 36-feed catalog with tracks, roles and volume; the day's reading by track (curated paper first, else rotation); headlines; a 20-hour cache. Fanout is pending its feed URL.
- [Notes](features/notes.md): `Learning/.quest/` (state, news cache, lock, backups), a generated Quest Board and session notes, ticks and progress logs in your goal notes, your learning log, and a Today's Quest section in your daily note.
- [Today's quest in Claude Code](features/claude-code-mod.md): a pane (desktop), band (terminal) and status chip in every session.
- The `todays-reading` mod is replaced by `learning-quest`.

## 0.4.0

- Daily reading list written into the Obsidian daily note; `todays-reading` mod; goals section in the daily note.

## 0.3.0

- About 100 verified sources, robust fetching (timeouts, retries, XML repair, cache, fallbacks), feed management tools, free-text onboarding, learning tracks.

## 0.2.0

- RSS reading list, onboarding by category, arXiv feeds, language tracks.

## 0.1.0

- Learning log to Obsidian, daily goals, XP/levels/streaks dashboard.
