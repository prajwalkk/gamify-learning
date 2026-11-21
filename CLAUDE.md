# gamify-learning

An MCP server ("Claude mod") that gamifies learning: curated reading feeds, daily goals, XP/levels/streaks, and learning tracks, with notes written to each user's own Obsidian vault. It's used from Claude Code (terminal, WSL) and the Claude desktop app (Windows). Two users each run their own clone with their own `config.json` and vault.

## Docs are part of every feature — required

`docs/` describes every feature. **Any change to behaviour, tools, inputs, outputs, XP rules, stored data, or the feed catalog must update the docs in the same change.**

1. **Changed an existing feature** → update its page in `docs/features/` (what the user sees, the tools table, "How it works", limitations).
2. **New feature** → copy `docs/features/_template.md` to `docs/features/<feature>.md`, fill it in, and add a row to the table in `docs/README.md`.
3. **New or renamed MCP tool** → it must appear as `` `tool_name` `` in a feature page's tools table.
4. **Always** add a line under `## Unreleased` in `docs/CHANGELOG.md` linking the feature page.
5. Write for the person using it first ("what to say to Claude"), then for whoever maintains the code.

This is enforced by `scripts/check-docs.mjs`:
- **Stop hook** (`.claude/settings.json`): if a turn ends with uncommitted `src/` changes and no `docs/` changes, or a tool or page is undocumented, you get sent back to fix it. If the change genuinely has no user-visible effect (refactor, typo), run `node scripts/check-docs.mjs --ack` and say so.
- **commit-msg hook** (`.githooks/commit-msg`, installed by `npm install`): blocks such commits. `[no-docs]` in the message is the escape hatch for non-user-visible changes; don't use it for features.
- `npm run check-docs`: run it before finishing.

## Commands

- `npm run build`: compile TypeScript to `dist/` (Claude Desktop and Claude Code run `dist/index.js`; restart or `/mcp` reconnect after building)
- `npm run check-docs`: docs coverage check
- `npm run verify-feeds`: live-check every catalog source with the production fetcher (exits 1 on failures; arXiv shows `WKND` on weekends, which is expected)

## Code map

- `src/index.ts`: server, MCP `instructions`, tool registration via `tool(name, description, schema, fn)`
- `src/catalog.ts`: sources, categories, arXiv, topic hints, learning tracks
- `src/fetcher.ts` / `src/feed-engine.ts`: robust fetching, parsing, scraping, cache
- `src/daily-note.ts`: the user's Obsidian daily notes (template rendering, our sections, reading-list parsing, carry-over). The **todays-reading** mod parses the same `## 📚 Today's Reading` format: change both together
- `src/tools/*.ts`: tool implementations · `src/state.ts`: XP/streak state in `<vault>/.gamify-state.json` · `src/obsidian.ts`: note writing · `src/config.ts`: config loading and migration

## The todays-reading mod

`mods/todays-reading/` is a Claude Code mod (hooks module, not part of the npm build), published through `.claude-plugin/marketplace.json` at the repo root. Edit it here; test with `claude plugin validate mods/todays-reading` and `claude plugin test mods/todays-reading`, or run it with `claude --plugin-dir mods/todays-reading`. Bump its `plugin.json` version for every change people should receive.

## Conventions and gotchas

- Import zod from `"zod/v3"` (not `"zod"`); the MCP SDK's types expect that subpath.
- `config.json` is found relative to the package (`__dirname`), never `process.cwd()`, because Claude Desktop starts servers from an arbitrary directory.
- `config.json` stores catalog **source ids**, not URLs. Add new sources to `src/catalog.ts` and run `verify-feeds` before claiming they work.
- arXiv RSS is empty on weekends (not a bug). The arXiv search API is slow and rate-limited: it's queued 3s apart and 429s are never retried.
- Anthropic news/research/engineering have no RSS; they're `kind: "html"` sources with a `linkPattern`.
- Personal files are git-ignored (`config.json`, `.cache/`, `.claude/settings.local.json`). The repo is public, so never commit vault paths, names, or emails.
