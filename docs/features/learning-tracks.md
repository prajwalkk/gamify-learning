# Learning tracks

A structured roadmap for one thing you're learning: a topic checklist, starter resources, and matching feeds. Progress fills in as you log entries tagged with the track.

## Using it

- *"I want to learn Rust"* / *"Put me on the game dev track"*
- *"How's my track going? What's next?"*

## Tracks

| id | Track | Topics |
|---|---|---|
| `rust` | Rust | 12, ownership → async → Bevy ECS |
| `gamedev` | Game Dev Foundations (for experienced devs) | 12, game loop → engine choice → game math → AI → shaders → shipping |
| `cpp` | Modern C++ | 10, RAII → move semantics → data-oriented design → Unreal C++ |
| `csharp` | C# (Godot / Unity) | 8 |
| `go` | Go | 8 |
| `typescript` | TypeScript | 8 |
| `python` | Python | 8 |

Each track lists starter links (e.g. The Rust Book and Rustlings; Godot's first 2D game, Game Programming Patterns, and Fix Your Timestep).

## Tools

| Tool | What it does | Key inputs |
|---|---|---|
| `set_language_track` | Sets the track and subscribes to its feeds | `language`: a track id (accepts `c#`, `c++`, `golang`) |
| `get_language_track` | Progress %, `nextUp`, per-topic coverage, starter links | — |

## How it works

- Code: `src/tools/language.ts`; track definitions in `TRACKS` in `src/catalog.ts`
- A topic counts as covered when a [learning entry](learning-log.md) **tagged with the track id** (e.g. `rust`) mentions one of the topic's key terms (the words before the "—").
- One track at a time. It can also be set during [onboarding](onboarding.md).

## Limitations

- Coverage is keyword-based: it shows topics you've *touched*, not mastered.
