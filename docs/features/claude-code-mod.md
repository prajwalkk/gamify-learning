# Today's quest in Claude Code

Every Claude Code session shows today's quest without asking: a pane beside the chat on desktop, a band above the prompt in the terminal, and a status chip everywhere.

## What you see

| Where | What |
|---|---|
| **Status chip** (under the prompt) | `🟡 🔥3 · L2 · 25/60`: today's progress dot (⚪ nothing yet, 🟡 started, 🟢 cap reached), streak, level, minutes/cap |
| **Pane** (desktop; terminal at 144+ columns) | Date and track, level and XP, a progress bar of today's minutes, the reading (link and source, ✓ once read), the goal block's units (links to the material), any risk note, 2 headlines, and **Start session**, **Board** and **Refresh** buttons. On rest and leave days it says so and shows the next study day. Minimized to a widget, it shows the chip and the reading |
| **Band** (terminal) | `🟡 🔥3 · L2 · 25/60 📖 <reading> 🎯 <unit> (open)` |
| Not set up | The pane offers **Set up Learning Quest** |

**Start session** and **Board** send a prompt to Claude, which runs the coach. The pane itself never changes the quest. `/quest-pane` reopens the pane if you closed it.

## How it works

- Code: `mods/learning-quest/hooks/register.tsx`, with tests in `hooks/register.test.tsx` (`claude plugin test mods/learning-quest`).
- The mod only **reads** `Learning/.quest/today.json`. The plugin's MCP server writes it when a session starts, after every change, and after a news refresh.
- It finds the notes folder the same way the server does: `LEARNING_QUEST_DIR`, then `~/.config/learning-quest/config.json`, then `~/LearningQuest`, trying Windows and WSL spellings.
- It re-reads the snapshot at session start, after each turn, and every 60 seconds.
- A snapshot from an earlier day (a session left open overnight) is shown with a note to start a session to refresh it.

## Limitations

- The chip and pane can lag a change by up to a minute when it comes from outside the session, such as another app logging a session.
