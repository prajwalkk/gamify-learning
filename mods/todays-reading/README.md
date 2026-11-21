# todays-reading

A Claude Code mod that shows **today's reading list** from your Obsidian daily note beside every session. It pairs with the [gamify-learning](https://github.com/prajwalkk/gamify-learning) MCP server, which plans the list into your note.

- **Claude Code desktop:** a pane beside the chat with today's links, a progress bar, and ☐/☑ to tick what you've read (ticking writes `[x]` into the note).
- **Terminal:** a one-line band above the prompt; `/reading` opens the full pane.
- **No list today?** Yesterday's unread links carry over, and the pane offers *Plan today's reading*.

It finds your vault from `~/.claude/gamify-learning.json`, which the gamify-learning server writes when it starts, so there's nothing to configure. To point it elsewhere, set the mod's `vaultPath` / `dailyNotesFolder` options.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install todays-reading --marketplace prajwalkk/gamify-learning
```

Answer `y` to add the marketplace, then pick a scope (user is first).

From a shell: `claude plugin install todays-reading --marketplace prajwalkk/gamify-learning`

In the Claude Code desktop app, where `/plugin` doesn't run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `prajwalkk/gamify-learning`, then **Add plugin**.

Full docs: [daily reading list](https://github.com/prajwalkk/gamify-learning/blob/main/docs/features/daily-reading.md).
