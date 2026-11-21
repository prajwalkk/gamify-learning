# Learning Quest

A Claude Code plugin for a calm, gamified daily learning habit: one sitting a day (a 10-minute reading plus a 50-minute goal block, capped at 60), coached by Claude, with everything kept as Markdown in the user's notes folder (their Obsidian vault). Two people use it (the repo owner on WSL and the terminal, his wife on the Claude Code desktop app on Windows), each with their own vault.

## Docs are part of every feature: required

`docs/` describes every feature. **Any change to behaviour, tools, inputs, outputs, XP rules, the scheduler, stored data, the feed catalog or what's written to notes must update the docs in the same change.**

1. **Changed an existing feature** → update its page in `docs/features/`.
2. **New feature** → copy `docs/features/_template.md`, fill it in, and add a row to the table in `docs/README.md`.
3. **New or renamed MCP tool** → it must appear as `` `tool_name` `` in a feature page's tools table.
4. **Always** add a line under `## Unreleased` in `docs/CHANGELOG.md`.
5. Write for the person using it first ("what to say to Claude"), then for whoever maintains the code.

This is enforced by `scripts/check-docs.mjs`:
- **Stop hook** (`.claude/settings.json`): if a turn ends with uncommitted `src/` changes and no `docs/` changes, or a tool or page is undocumented, you're sent back. If a change genuinely has no user-visible effect, run `node scripts/check-docs.mjs --ack` and say so.
- **commit-msg hook** (`.githooks/commit-msg`, installed by `npm install`): blocks such commits, **and** a `src/` change without the rebuilt server bundle. `[no-docs]` in the message is for non-user-visible changes only.

## Commands

- `npm run build`: `tsc` to `dist/`, then esbuild bundles the server into `mods/learning-quest/server/learning-quest.cjs` (committed, because the plugin runs it). Always rebuild before committing `src/` changes.
- `npm test`: engine tests (`src/quest/quest.test.ts`, node:test).
- `claude plugin validate mods/learning-quest` and `claude plugin test mods/learning-quest`: the mod.
- `npm run verify-feeds`: live-check the feed catalog (arXiv shows `WKND` on weekends, which is expected).
- `npm run check-docs`

## Code map

- `src/index.ts`: MCP server, `instructions`, the 16 tools (`tool(name, description, schema, fn)`)
- `src/quest/api.ts`: tool handlers; every change goes through `mutate()`, then `refreshOutputs()` redraws the Quest Board, `today.json` and the daily-note section
- `src/quest/types.ts` (data model, defaults) · `dates.ts` · `scheduler.ts` (plan, deadlines, risk, rollover) · `game.ts` (XP, streak, level, badges) · `library.ts` (starter goals) · `feeds.ts` (45-feed catalog, news cache, picking) · `today.ts` (`computeToday`) · `notes.ts` (all note writing) · `store.ts` (notes folder, lock, atomic writes, backups)
- `src/fetcher.ts`: robust RSS/Atom fetching, XML repair, scraping
- `mods/learning-quest/`: the plugin: `.mcp.json` (bundled server), `skills/learning-quest/SKILL.md` (the coach), `commands/quest.md` (`/quest`), `hooks/register.tsx` (pane, band, status chip; reads `Learning/.quest/today.json` only). Bump its `plugin.json` version for every change people should receive.
- `.claude-plugin/marketplace.json`: this repo is the plugin's marketplace

## Conventions and gotchas

- Import zod from `"zod/v3"` (the MCP SDK's types expect that subpath).
- **Write rules:** never fetch the network inside a save; a single writer (the `.lock`); atomic writes (temp file, then rename); back up a user's note before editing it (`backupOnce`); mark generated files with the `GENERATED` comment; never commit-amend something that may be pushed.
- The plan is never stored: it's recomputed from today on every read (`plan()`), so missed days self-heal.
- Dates are local `YYYY-MM-DD`; date arithmetic goes through local noon.
- The daily-note section is regenerated: no checkboxes there (a tick would be lost).
- The notes folder comes from `LEARNING_QUEST_DIR` → `~/.config/learning-quest/config.json` → `~/LearningQuest`. The Windows app and WSL have separate home folders, so separate shared configs.
- Fanout (`fanout-daily`, `fanout-blog`) items carry a `<category>` that decides their track (`FANOUT_TRACKS`). The old `daily-papers` stand-in id is migrated in `loadState`.
- The repo is public: never commit vault paths, names, emails, or personal config.
