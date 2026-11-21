# Daily reading list (Obsidian + Claude Code mod)

Each day gets a short reading list: a few links picked from your feeds, written into **your own Obsidian daily note** as a checklist. The **todays-reading** mod shows that list beside every Claude Code session, in the desktop app and in the terminal. Tick a link in Obsidian or in the pane and you earn the read XP.

## Using it

- *"What should I read today?"* / *"Plan today's reading"*: Claude calls `plan_today`
- The pane's **Plan today's reading** button asks Claude to do the same
- Tick a box in Obsidian or in the pane when you've read it (+5 XP, counted at the next sync)
- `/reading` opens the pane if you closed it

## In Obsidian

The list lives in `<vault>/<dailyNotesFolder>/YYYY-MM-DD.md` (default `Daily Notes/`), in a section of its own:

```markdown
## 📚 Today's Reading
*Picked by gamify-learning · tick each one when you've read it (+5 XP)*

- [ ] [Godot Showreel 2026](https://godotengine.org/article/godot-showreel-2026/) — Godot Engine
- [x] [Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/) — Gaffer On Games
```

- If today's note doesn't exist yet, it's created from your daily template (`dailyTemplate`, default `Templates/Daily Note Template.md`). The core-template placeholders `{{date}}`, `{{date:FORMAT}}`, `{{time}}` and `{{title}}` are filled in.
- The section goes just before your `## … Reflection` section, between `---` separators like the rest of the template. Without a reflection section it goes at the end. **Nothing else in the note is changed.** The [goals](goals.md) section is added the same way.
- **Carry-over rule (for now):** if today has no list and the latest earlier list still has unread links, today's list is *those same links*. The pane shows them labelled "Carried over from …", and `plan_today` writes them into today's note with a link back to that day. Fresh links are only picked once the previous list is finished.

## Tools

| Tool | What it does | Key inputs |
|---|---|---|
| `plan_today` | Writes today's list into the daily note: returns it if already planned, carries over unfinished links, or picks fresh ones | `count` (default `readingPerDay`, 5), `replace`, `category` |

`mark_article_read` also ticks the article in a recent reading list, and `get_dashboard` shows `todaysReading` progress.

## The todays-reading mod

A Claude Code mod (a plugin with a hooks module) that only **reads** the daily note, plus flipping a checkbox when you tick one there. Its code is in `mods/todays-reading/`, and the repo is its marketplace (`.claude-plugin/marketplace.json`).

**Install** (once per machine; the server must be set up too, see [Setup](setup.md)):

- **Claude Code desktop:** click **+** next to the prompt box → **Plugins** → **Add marketplace** `prajwalkk/gamify-learning` → **Add plugin** (todays-reading).
- **Terminal:** `/plugin install todays-reading --marketplace prajwalkk/gamify-learning` (answer `y`, then pick the user scope).

| Where | What you see |
|---|---|
| Claude Code desktop | A pane beside the chat, opened in every session: date, progress bar, each link with its source and a ☐/☑ to tick. Minimized to a widget, it shows "📚 2/5 read" and the next link. |
| Claude Code terminal | A one-line band above the prompt: `📚 1/5 <next link> (open)`. The full pane opens with `/reading`, or by itself on terminals at least 144 columns wide. |
| No list yet | The pane says so and offers **Plan today's reading** (it submits a prompt asking Claude to run `plan_today`). |

**Finding the vault:** the MCP server writes `~/.claude/gamify-learning.json` (`vaultPath`, `dailyNotesFolder`) each time it starts, in that machine's path form. The mod reads it, so there's nothing to configure, and the Windows app and WSL each get their own copy. The mod's own settings `vaultPath` and `dailyNotesFolder` override it, and `E:\…` and `/mnt/e/…` spellings are both tried.

**Refreshing:** at session start, after each turn (Claude may have just planned or ticked), and every 60 seconds (edits made in Obsidian).

## How it works

- Server code: `src/daily-note.ts` (note paths, template rendering, `upsertSection`, parsing, carry-over, ticking), `src/tools/reading.ts` (`plan_today`, `syncReadingXp`)
- **Picking:** `get_feeds` with one link per source, skipping already-read links, one-line "Quoting …" posts and bare release tags like `v2.1.330`. Tracking parameters (`utm_*` etc.) are stripped from links.
- **XP from ticks:** `syncReadingXp` scans the last 14 daily notes for ticked links not yet in `readArticles` and awards +5 XP each. It runs on `get_dashboard` and `plan_today`. Read links are stored with their URL, so a link ticked in Obsidian and then marked read in chat counts once.
- Mod code: `mods/todays-reading/hooks/register.tsx` (parsing mirrors `src/daily-note.ts`; keep the heading and line format in sync), with tests in `hooks/register.test.tsx` run by `claude plugin test mods/todays-reading`. Bump `version` in its `plugin.json` when changing it, so installs pick up the update.

## Limitations

- Ticking in the pane gives XP on the next server sync (dashboard or plan), not instantly.
- The carry-over rule is deliberately simple and may change: unfinished lists roll forward as they are, with no top-up of fresh links.
- Templater (`<% … %>`) syntax in the template isn't run; core-template placeholders are.
