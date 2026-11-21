# Setup

Learning Quest is one Claude Code plugin. Installing it gives you the coach (`/quest`), its tools (an MCP server bundled inside the plugin), and the today pane and status chip. It works in the Claude Code desktop app and in the terminal. The only thing to install first is **Node.js 18 or newer**.

## Install

- **Claude Code desktop:** click **+** next to the prompt box → **Plugins** → **Add marketplace** → `prajwalkk/gamify-learning` → **Add plugin** → *learning-quest*.
- **Terminal:**

  ```
  /plugin install learning-quest --marketplace prajwalkk/gamify-learning
  ```

  Answer `y` to add the marketplace, then pick the user scope.

Then say **"/quest setup"** (or just "set up Learning Quest").

## First run

1. **Notes folder.** Claude calls `get_status`. If no folder is set, it asks where your notes live (your Obsidian vault: the folder containing `.obsidian`) and saves it with `set_notes_folder`.
2. **Onboarding.** One question at a time: goals from the starter library and their order, daily cap and blocks, study days, track rotation, learning style, feeds, your learning log note and daily notes folder. Then `onboard` saves it all, `refresh_news` fetches the feeds, and on a study day the first session starts.

## Where the notes folder comes from

The first of these that's set wins, on every machine and in every app:

1. The `LEARNING_QUEST_DIR` environment variable
2. The shared config `~/.config/learning-quest/config.json` (`{"notesFolder": "…"}`), written by `set_notes_folder`
3. `~/LearningQuest`

Point every app on a machine at the same folder and they share one quest. Windows (`E:\Obsidian\Vault`) and WSL (`/mnt/e/Obsidian/Vault`) spellings are both accepted and converted. The Windows app and WSL each have their own home folder, so each has its own shared config; set both to the same vault.

## Tools

| Tool | What it does | Key inputs |
|---|---|---|
| `get_status` | Whether Learning Quest is set up, and which notes folder is in use (and where that came from) | — |
| `set_notes_folder` | Saves the folder to the shared config | `folder` |
| `onboard` | First-time setup: goals, cap and blocks, study days, rotation, style, feeds, learning log, daily notes | `goals` (library ids or names, in order), `dailyCap`, `readingBlock`, `goalBlock`, `studyDays`, `rotation`, `learningStyle`, `feeds`, `learningLog`, `dailyNotesFolder`, `dailyTemplate`, `sessionTime` |

## Working on the code

- `npm install && npm run build` compiles TypeScript (`dist/`) and bundles the server into the plugin (`mods/learning-quest/server/learning-quest.cjs`). The commit hook refuses a `src/` change without a rebuilt bundle.
- `npm test` runs the engine's tests; `claude plugin test mods/learning-quest` runs the mod's; `npm run verify-feeds` live-checks the feed catalog.
- Run the plugin from the working copy: `claude --plugin-dir mods/learning-quest`.
- `dist/index.js` is the same server for the Claude desktop **chat** app (Settings → Developer → Edit Config → `mcpServers`), which has no plugins.

## Limitations

- Each person needs Node.js on their machine. The plugin starts its server with `node`.
