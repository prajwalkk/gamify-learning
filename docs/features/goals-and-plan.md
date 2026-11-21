# Goals, plan and leaves

Goals are things to finish, such as "Rust Book in a month", broken into units with time estimates. The plan fits them into your study days at up to 50 minutes a day, one goal at a time. Leaves and missed days shift the plan forward instead of failing you.

## Using it

- "Add Zero to Hero": from the starter library
- "Add a goal for the Bevy book": the coach proposes units with estimates and waits for your OK
- "Pause DDIA" / "Do the primer first" / "Move the Rust deadline to Jan 15" / "Mark chapter 3 done"
- "I'm off Dec 22 to Jan 2" / "Cancel my leave"
- `/quest board`

## Concepts

| | |
|---|---|
| **Goal** | Ordered units, a track, a status (`active`, `queued`, `parked`, `done`), a priority, a deadline or a duration, an optional linked note |
| **Unit** | One chapter or video: estimated minutes, minutes spent, done flag. `stretch` units are optional. A unit can name the text of a checkbox in your goal note, which gets ticked when it's done |
| **Track** | `ml`, `system-design`, `ai-dev`, `game-dev` (parked by default), `languages`. Weekdays rotate between tracks for the reading: by default Mon/Wed ML, Tue/Thu system design, Fri AI dev |
| **Study day** | A configured weekday that isn't a leave day |
| **Leave** | A date range with no sessions: removes those days from the plan and pushes active deadlines out by the study days it covers |

**Starter library** (`list_library`): The Rust Book (Brown edition), Mathematics for Machine Learning, 3Blue1Brown's Essence of Linear Algebra and Essence of Calculus, Karpathy's Zero to Hero, Designing Data-Intensive Applications, The System Design Primer, and Build a Large Language Model (From Scratch). Each has a track, a format, a duration and units with estimates.

## The scheduler

1. **Order:** one goal at a time, active goals first, then queued goals by priority.
2. **Fill:** from today, each open unit's remaining minutes go into study days, up to the goal block (50) a day. Minutes already logged today shrink today's room. A unit can span several days.
3. **Outputs:** the next study days with their units and minutes, and each goal's projected start and finish.
4. **Deadlines:** an active goal's deadline moves out by the leave study days inside it (with `leaveBehavior: "shift"`, the default). A queued goal's deadline is its projected start plus its duration.
5. **Risk:** a goal is at risk only when its projected finish is after its deadline. You then see the minutes per day it would need, and whether dropping its stretch units would be enough. The coach offers one gentle option.
6. **Self-healing:** the plan is never stored. It's recalculated from today on every read, so a missed day just slides forward.
7. **Rollover:** when all of a goal's non-stretch units are done, it's done, and the next queued goal becomes active and gets its deadline.

## Tools

| Tool | What it does | Key inputs |
|---|---|---|
| `list_library` | Starter goals with track, format, units, stretch count, total minutes, duration | — |
| `add_library_goal` | Adds a library goal (by id or name) | `libraryId`, `status`, `priority`, `deadline`, `durationDays`, `note` |
| `add_goal` | Adds a custom goal; propose the units and wait for an OK first | `title`, `track`, `units` [{title, minutes, stretch, url, checkbox}], `link`, `format`, `status`, `priority`, `deadline`, `durationDays`, `note` |
| `update_goal` | Status, priority, deadline (or `null` to clear), duration, note, link; edit, add or remove units | `goalId`, `units` [{id, …}], `addUnits`, `removeUnits` |
| `get_board` | Goals with progress, start, finish, deadline and risk; the next 10 study days; leaves; recent sessions; totals | — |
| `add_leave` | Adds a leave and reports how deadlines and finishes moved | `from`, `to`, `reason` |
| `remove_leave` | Removes a leave | `leaveId` or `from` |

## How it works

- Code: `src/quest/scheduler.ts` (`plan`, `rollover`), `src/quest/dates.ts` (study days, leave, rotation), `src/quest/library.ts`.
- A new goal is active if there's no active goal yet; otherwise it's queued after the others.
- Dates are local calendar days; arithmetic runs at local noon so DST changes never skip a day.

## Limitations

- Goals don't run in parallel: only one is studied at a time (the first in order), even if several are active.
