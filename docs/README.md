# gamify-learning docs

There is one page per feature. Each page says what the feature does for the user, how to use it in chat, which MCP tools back it, and how it works inside. The top-level [README](../README.md) covers installation in short form.

These docs are kept in step with the code automatically. See [Keeping docs current](#keeping-docs-current).

## Features

| Feature | What it's for | Tools |
|---|---|---|
| [Setup & connecting](features/setup.md) | Install, connect to Claude Code / Claude Desktop, config file | — |
| [Onboarding](features/onboarding.md) | "Set me up": describe interests in your own words, get feeds picked for you | `get_categories`, `suggest_feeds`, `setup_interests` |
| [Daily reading list](features/daily-reading.md) | Today's links in your Obsidian daily note, shown beside every Claude Code session by the todays-reading mod | `plan_today` |
| [Reading list](features/reading-list.md) | "What should I read?" plus marking articles read for XP | `get_feeds`, `mark_article_read` |
| [Managing feeds](features/managing-feeds.md) | Add blogs, follow any topic, watch sites without RSS, remove, health-check | `add_feed`, `watch_page`, `follow_topic`, `remove_feed`, `list_feeds`, `check_feeds` |
| [Feed catalog](features/feed-catalog.md) | The ~100 curated sources, categories, arXiv, how to add a source | — |
| [Feed reliability](features/feed-reliability.md) | Timeouts, retries, cache, fallbacks, scraping: why feeds don't break | — |
| [Learning log](features/learning-log.md) | Log what you learned: XP plus a note in Obsidian | `log_learning`, `get_entries` |
| [Daily goals](features/goals.md) | Goals for today, Obsidian daily note | `add_goal`, `complete_goal`, `get_goals` |
| [Gamification](features/gamification.md) | XP, levels, titles, streaks, dashboard | `get_dashboard`, `get_stats` |
| [Learning tracks](features/learning-tracks.md) | Roadmaps for Rust, game dev, C++, C#, Go, TypeScript, Python | `get_language_track`, `set_language_track` |

Release history: [CHANGELOG](CHANGELOG.md).

## Keeping docs current

The rule (also in [CLAUDE.md](../CLAUDE.md)): **every change to a feature updates its page here, plus a CHANGELOG line.** New features get a new page from [`features/_template.md`](features/_template.md), linked in the table above.

`scripts/check-docs.mjs` enforces this in three places:

| Where | When | What it checks |
|---|---|---|
| Claude Code **Stop hook** (`.claude/settings.json`) | Each time Claude finishes a turn | Uncommitted `src/` changes come with `docs/` changes; every tool is documented; every page is linked here |
| git **commit-msg hook** (`.githooks/`, installed by `npm install`) | Every commit, by anyone | Same checks on the staged change. Add `[no-docs]` to the message for changes with no user-visible effect |
| `npm run check-docs` | Any time | Tool coverage and links |

If a code change has no user-visible effect (a refactor or typo fix), Claude runs `node scripts/check-docs.mjs --ack` so the Stop hook stops asking about that diff.
