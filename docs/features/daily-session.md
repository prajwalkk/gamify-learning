# The daily session

One coached sitting a day, at most 60 minutes: a **10-minute reading** and a **50-minute goal block**. The coach suggests the reading, quizzes you on what you paste back, logs the session, and moves your goals along.

## Using it

- **`/quest`**, "start my session", or the pane's **Start session** button
- "I read it: here's what it said…" → a quiz
- "Done: 45 minutes, finished chapter 4, stopped at 4.3" → logged
- `/quest board`, `/quest log`, `/quest leave Dec 22–Jan 2`, `/quest feeds`, `/quest setup`

The session is meant for your study days, at your session time (default 08:30). Leave days and rest days stay quiet: the pane says so and shows the next study day.

## The flow

1. **Kickoff:** level, XP and streak, minutes left today, the reading with one line on why it's exciting for today's track, the goal block (unit and link), a risk note only if the active goal is off track (the board shows every goal's risk), and at most 2 headlines. If the news cache is stale, the coach fetches it first.
2. **Read:** you start a 10-minute timer and read, then paste what you read. You get a 5-question quiz: recall, a first-principles "why", a trade-off, an applied question, and one more. It's graded kindly and scored out of 10.
3. **Goal block:** 2 or 3 focus prompts that match your learning style (what to look for in a reading, video timestamps, or an exercise first).
4. **Close:** one message asks for anything missing, then the coach logs the session and reports XP, level, streak and badges in two lines, ending with tomorrow's track and unit.

**Coach rules:** never plan past the cap · short messages, one step at a time · no extra reading lists or tangents · deadlines guide, they don't whip · honest numbers, said calmly · never run git · write only through the tools.

## Tools

| Tool | What it does | Key inputs |
|---|---|---|
| `get_today` | Study day or leave, track, the reading (and whether it's done), the goal block, minutes today and left, over-cap flag and message, risk, headlines, streak, level, XP, news freshness, the next study day | `date` (default today) |
| `log_session` | Records a sitting and writes the notes (see [Notes](notes.md)); returns XP gained with its breakdown, level, streak, new badges, finished units and goals, an over-cap note, and tomorrow | `minutes` (total), `readingMinutes`, `goalId` (default today's), `unitsDone` (ids or titles), `stoppedAt`, `reading` {title, url, source}, `quizScore` 0–10, `learned`, `summary`, `date` |

## How it works

- Coach: the plugin's skill `mods/learning-quest/skills/learning-quest/SKILL.md`, and `commands/quest.md` for `/quest` and its sub-commands.
- `get_today` is `computeToday` in `src/quest/today.ts`. The daily note's section, `today.json` and the pane all draw from the same function.
- **Today's reading stays put:** the first pick of the day is stored (`picks` in state), so refreshing feeds mid-day doesn't change it.
- **Goal minutes** (total minus reading) go first to the units you finished (up to what each had left), then to the next open unit, so "where you stopped" carries into tomorrow's plan.

## Limitations

- Nothing runs at 08:30 by itself: the quest shows up when you open a Claude Code session (the pane and status chip), and the coach starts when you ask.
