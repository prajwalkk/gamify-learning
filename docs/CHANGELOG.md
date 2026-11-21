# Changelog

Newest first. One line per user-visible change, with a link to the feature page.

## Unreleased

- [Daily reading list](features/daily-reading.md): new `plan_today` writes today's links into your Obsidian daily note (created from your template), and carries over unfinished links. The new **todays-reading** Claude Code mod shows the list in a pane (desktop) or band (terminal) in every session, and ticking there or in Obsidian earns read XP. Install it from this repo's marketplace (`prajwalkk/gamify-learning`).
- [Daily goals](features/goals.md): goals now go in a section of your own daily note (`Daily Notes/`) instead of overwriting a separate `Daily/` note; new config `dailyNotesFolder`, `dailyTemplate`, `learningFolder`, `readingPerDay`.
- Reading-list picks skip quote posts and bare release tags; tracking parameters are stripped from links.
- Docs: per-feature pages in `docs/features/`, plus automatic checks (Claude Code Stop hook, git commit-msg hook, `npm run check-docs`) so every feature change updates its docs. See [docs/README.md](README.md#keeping-docs-current).

## 0.3.0 — 2026-11-20

- [Feed catalog](features/feed-catalog.md): about 100 verified sources in 14 categories plus 12 arXiv subcategories; Claude/Anthropic sources including scraped Anthropic news/research/engineering.
- [Feed reliability](features/feed-reliability.md): timeouts, retries, XML repair, disk cache, merge-not-replace, fallback URLs, 8s response budget.
- [Managing feeds](features/managing-feeds.md): `add_feed` auto-discovers feeds from homepages; new `follow_topic`, `watch_page`, `remove_feed`, `list_feeds`, `check_feeds`.
- [Onboarding](features/onboarding.md): free-text interests, beginner-first suggestions, unmatched phrases offered as topics.
- [Learning tracks](features/learning-tracks.md): added `gamedev`, `cpp`, `csharp`, `python` tracks with starter resources.
- [Setup](features/setup.md): config is found relative to the install (fixes Claude Desktop), Windows/WSL vault paths are converted automatically, v0.2 configs migrate.
- Fixes: completing a goal now actually awards its +10 XP; level-up detection fixed; unknown articles no longer earn read XP.

## 0.2.0

- RSS reading list, onboarding by category, arXiv research feeds, Rust/TypeScript/Go language tracks.

## 0.1.0

- Learning log to Obsidian, daily goals, XP/levels/streaks dashboard.
