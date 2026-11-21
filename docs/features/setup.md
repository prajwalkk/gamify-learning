# Setup & connecting

Installs the server and connects it to Claude Code (terminal) and the Claude desktop app. Each person runs their own copy with their own Obsidian vault.

## Using it

```bash
git clone https://github.com/prajwalkk/gamify-learning.git
cd gamify-learning
npm install          # also installs the docs git hook
npm run build
cp config.example.json config.json    # Windows: copy config.example.json config.json
```

Then set `username` and `vaultPath` in `config.json`.

**Claude desktop app:** in Settings → Developer → Edit Config, add the following to `claude_desktop_config.json` (`%APPDATA%\Claude\`), then fully quit the app from the system tray and reopen it:

```json
{
  "mcpServers": {
    "gamify-learning": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": ["E:\\path\\to\\gamify-learning\\dist\\index.js"]
    }
  }
}
```

The tools appear under the **+** / tools menu in a chat. Logs are in `%APPDATA%\Claude\logs\mcp-server-gamify-learning.log`.

**Claude Code:**

```bash
claude mcp add gamify-learning --scope user -- node /path/to/gamify-learning/dist/index.js
```

**Updating:** `git pull && npm run build`, then restart the Claude app, or run `/mcp` → reconnect in Claude Code.

## Config file

`config.json` sits next to `package.json` and is git-ignored, so it's per person. The server finds it relative to its own location, not the current working directory, because Claude Desktop starts servers from an arbitrary folder. Set `GAMIFY_CONFIG=/path/to/config.json` to override.

| Key | Meaning |
|---|---|
| `username` | Shown on the dashboard and daily notes |
| `vaultPath` | Obsidian vault folder. `E:\\Obsidian` and `/mnt/e/Obsidian` both work on Windows and on WSL; they're converted automatically |
| `sources` | Catalog source ids you subscribe to (managed by onboarding) |
| `customFeeds` | Feeds you added that aren't in the catalog |
| `topics` | Free-text topics you follow |
| `interests` | Category ids chosen in onboarding |
| `languageTrack` | Current learning track |

Old v0.2 configs (`"feeds": [{url, name, category}]`) are migrated to `sources`/`customFeeds` the first time they're loaded.

## How it works

- Code: `src/index.ts` (server and tool registration), `src/config.ts` (loading, path normalization, migration)
- The server sends MCP `instructions` on connect. These tell Claude how to run onboarding on first use and to present results readably instead of as raw JSON.
- All tool errors are returned as tool errors (`isError`) instead of crashing the server.

## Limitations

- Desktop and Claude Code on the same machine share one config, cache and vault. That's intended: one person, one progress.
- The build in `dist/` isn't committed; after cloning or pulling you must run `npm run build`.
