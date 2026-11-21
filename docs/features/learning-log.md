# Learning log

Tell Claude what you learned. It's saved as a note in your Obsidian vault and earns XP. The tags you give it feed your [learning track](learning-tracks.md) progress.

## Using it

- *"Log that I learned how Rust lifetimes work: …"*
- *"Save what we just figured out about fixed timesteps, tag it gamedev"*
- *"What have I logged recently?"*

## Tools

| Tool | What it does | Key inputs |
|---|---|---|
| `log_learning` | Saves an entry, writes the note, awards XP, updates the streak | `topic`, `content`, `source`, `tags` |
| `get_entries` | Recent entries, newest first | `limit` (10) |

## How it works

- Code: `src/tools/learning.ts`, `src/obsidian.ts` (`writeLearningNote`), `src/state.ts`
- **Note:** `<vault>/<learningFolder>/YYYY-MM-DD - <topic>.md` (default `Learning/`) with frontmatter (`date`, `tags`, `xp`), the content, an optional **Source:** line, and `#tags`.
- **XP:** 10 base, +10 if content is over 200 characters, +10 more if over 500, +5 per tag. The reply announces level-ups.
- Updates the daily streak (see [Gamification](gamification.md)). Entries are also stored in `.gamify-state.json` → `entries`.

## Limitations

- Logging the same topic twice on one day overwrites that day's note file (the entries are both kept in state).
- Dates use UTC, so a late-evening entry can land on the next day.
