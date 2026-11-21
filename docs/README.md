# Learning Quest docs

A calm, gamified daily learning habit. **One sitting a day** (one short reading and one study unit, capped at 60 minutes). **Basics first**: fundamentals and intuition, small concrete examples. **Showing up counts**: a 20-minute day keeps the streak. **The plan bends, it doesn't break**: leaves and missed days shift it forward. **You own the record**: everything is Markdown in your notes folder. **Coached**: Claude suggests the reading, quizzes you, logs progress and moves your goals along.

The top-level [README](../README.md) is the quick start. There is one page per feature here.

## Features

| Feature | What it's for | Tools |
|---|---|---|
| [Setup](features/setup.md) | Install the plugin, pick the notes folder, onboard | `get_status`, `set_notes_folder`, `onboard` |
| [The daily session](features/daily-session.md) | `/quest`: kickoff, reading and quiz, goal block, close | `get_today`, `log_session` |
| [Goals, plan and leaves](features/goals-and-plan.md) | Goals and units, the starter library, the scheduler, risk, rollover, leaves | `list_library`, `add_library_goal`, `add_goal`, `update_goal`, `get_board`, `add_leave`, `remove_leave` |
| [XP, streaks, levels and badges](features/game.md) | The game layer | — |
| [Daily reading and feeds](features/feeds.md) | The 37-feed catalog, picking the reading and headlines, fetching and caching | `list_feeds`, `set_feeds`, `refresh_news` |
| [Notes](features/notes.md) | Every file written to your notes folder, and how writes stay safe | — |
| [Settings](features/settings.md) | Cap, blocks, study days, rotation, leave behavior, style, paths | `set_config` |
| [Today's quest in Claude Code](features/claude-code-mod.md) | The pane, band and status chip in every session | — |

Release history: [CHANGELOG](CHANGELOG.md).

## Keeping docs current

The rule (also in [CLAUDE.md](../CLAUDE.md)): **every change to a feature updates its page here, plus a CHANGELOG line.** New features get a new page from [`features/_template.md`](features/_template.md), linked in the table above.

`scripts/check-docs.mjs` enforces this in three places:

| Where | When | What it checks |
|---|---|---|
| Claude Code **Stop hook** (`.claude/settings.json`) | Each time Claude finishes a turn | Uncommitted `src/` changes come with `docs/` changes; every tool is documented; every page is linked here |
| git **commit-msg hook** (`.githooks/`, installed by `npm install`) | Every commit, by anyone | Same checks on the staged change, plus: a `src/` change must include the rebuilt plugin server bundle. Add `[no-docs]` to the message for changes with no user-visible effect |
| `npm run check-docs` | Any time | Tool coverage and links |

If a code change has no user-visible effect (a refactor or typo fix), Claude runs `node scripts/check-docs.mjs --ack` so the Stop hook stops asking about that diff.
