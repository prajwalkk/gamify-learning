# Graph Report - gamify-learning  (2026-11-20)

## Corpus Check
- 41 files · ~135,764 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 1 file(s) not represented in the graph (top: (none) 1)

## Summary
- 399 nodes · 1064 edges · 23 communities (18 shown, 5 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 47 edges (avg confidence: 0.9)
- Token cost: 67,948 input · 0 output

## Community Hubs (Navigation)
- Dates and Game Engine
- MCP Server and Tool API
- Feeds and Storage
- Package Manifest
- Docs Enforcement
- RSS Fetcher
- Note Writing
- Claude Code Mod UI
- Goals and Scheduler
- TypeScript Config
- Plugin Setup and Notes Folder
- Docs Index and Changelog
- Write Rules and Outputs
- Daily Reading Feeds
- Daily Session Coaching
- Settings
- Starter Library
- Mod Type Definitions
- MCP Server Config

## God Nodes (most connected - your core abstractions)
1. `computeToday()` - 24 edges
2. `Learning Quest coach skill` - 24 edges
3. `Goals, plan and leaves` - 23 edges
4. `refreshOutputs()` - 22 edges
5. `logSession()` - 22 edges
6. `addDays()` - 19 edges
7. `mutate()` - 19 edges
8. `plan()` - 18 edges
9. `today` - 17 edges
10. `streakOf()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `pickReading()` --conceptually_related_to--> `Today's reading stays put (picks stored)`  [INFERRED]
  src/quest/feeds.ts → docs/features/daily-session.md
- `pickReading()` --references--> `Track`  [INFERRED]
  src/quest/feeds.ts → docs/features/goals-and-plan.md
- `Scheduler` --implements--> `Plan`  [INFERRED]
  docs/features/goals-and-plan.md → src/quest/scheduler.ts
- `Rollover to next queued goal` --implements--> `rollover()`  [INFERRED]
  docs/features/goals-and-plan.md → src/quest/scheduler.ts
- `Plan is never stored (recomputed from today)` --semantically_similar_to--> `Streak (skips weekends and leave)`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/features/game.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Docs enforcement pipeline** — claude_docs_required_rule, scripts_check_docs, claude_stop_hook, claude_commit_msg_hook, docs_readme_no_docs_ack [EXTRACTED 1.00]
- **Outputs redrawn after every change** — src_quest_api_refreshoutputs, docs_features_notes_quest_board, docs_features_notes_today_json, docs_features_notes_daily_note_section, src_quest_today_computetoday [INFERRED 0.85]
- **Daily session tool flow** — docs_features_daily_session_get_today, docs_features_feeds_refresh_news, docs_features_daily_session_log_session, docs_features_daily_session_session_flow, docs_features_daily_session_five_question_quiz [EXTRACTED 1.00]

## Communities (23 total, 5 thin omitted)

### Community 0 - "Dates and Game Engine"
Cohesion: 0.08
Nodes (62): XP, streaks, levels and badges, Badges, creditedStreak, Level formula floor(sqrt(xp/50))+1, Streak (skips weekends and leave), XP rules, addDays(), addStudyDays() (+54 more)

### Community 1 - "MCP Server and Tool API"
Cohesion: 0.10
Nodes (51): Handler, json(), main(), noArgs, server, tool(), VERSION, addGoal() (+43 more)

### Community 2 - "Feeds and Storage"
Cohesion: 0.10
Nodes (27): Backups folder, setNotesFolder(), CACHE_HOURS, feedById(), FeedRole, inferTrack(), ITEMS_PER_FEED, itemTrack() (+19 more)

### Community 3 - "Package Manifest"
Cohesion: 0.08
Nodes (31): dependencies, @modelcontextprotocol/sdk@^1.0.0, rss-parser@^3.13.0, zod@^3.25.0, description, devDependencies, esbuild@^0.24.2, ts-node@^10.9.0 (+23 more)

### Community 4 - "Docs Enforcement"
Cohesion: 0.11
Nodes (17): Claude Code Stop hook, --ack / [no-docs] escape hatch, ACK_FILE, coverageProblems(), featurePages(), FEATURES, git(), hasHead() (+9 more)

### Community 5 - "RSS Fetcher"
Cohesion: 0.19
Nodes (21): decodeEntities(), discoverFeedLinks(), FetchOptions, fetchRss(), fetchText(), looksLikeHtml(), parseDate(), parser (+13 more)

### Community 6 - "Note Writing"
Cohesion: 0.21
Nodes (20): p(), appendLearningLog(), appendSessionNote(), DAYS, eolOf(), formatDate(), GENERATED, LEGACY_HEADINGS (+12 more)

### Community 7 - "Claude Code Mod UI"
Cohesion: 0.16
Nodes (15): ask(), chip(), findFolder(), join(), load(), localDay(), openPane(), prettyDay() (+7 more)

### Community 8 - "Goals and Scheduler"
Cohesion: 0.15
Nodes (16): Goal minutes allocation, Goals, plan and leaves, add_goal tool, add_library_goal tool, Goal, list_library tool, remove_leave tool, Risk with one gentle option (+8 more)

### Community 9 - "TypeScript Config"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, lib, module, outDir, resolveJsonModule, rootDir, skipLibCheck (+4 more)

### Community 10 - "Plugin Setup and Notes Folder"
Cohesion: 0.23
Nodes (12): commit-msg git hook, Learning Quest plugin, Plugin marketplace (.claude-plugin/marketplace.json), Notes folder resolution (LEARNING_QUEST_DIR -> config.json -> ~/LearningQuest), Bundled server learning-quest.cjs, Setup, get_status tool, LEARNING_QUEST_DIR (+4 more)

### Community 11 - "Docs Index and Changelog"
Cohesion: 0.27
Nodes (11): CLAUDE.md project instructions, Changelog, todays-reading mod (replaced), 1.0.0 Learning Quest rebuild, Feature page template, Today's quest in Claude Code, Terminal band, Quest pane (+3 more)

### Community 12 - "Write Rules and Outputs"
Cohesion: 0.24
Nodes (9): log_session tool, What gets written to your notes, Today's Quest daily-note section, Learning log, Write lock (.lock), Quest Board.md, Session notes (Learning/Sessions/), Learning/.quest/state.json (+1 more)

### Community 13 - "Daily Reading Feeds"
Cohesion: 0.25
Nodes (10): Daily reading and feeds, Fanout daily papers and blog, 45-feed catalog, Game dev feed group, list_feeds tool, News cache (news.json, 20 hours), refresh_news tool, set_feeds tool (+2 more)

### Community 14 - "Daily Session Coaching"
Cohesion: 0.38
Nodes (9): The daily session, 5-question quiz (scored out of 10), get_today tool, Session flow: kickoff, read, goal block, close, add_leave tool, get_board tool, Leave, /quest command (+1 more)

### Community 15 - "Settings"
Cohesion: 0.39
Nodes (8): Settings, dailyCap, learningStyle, leaveBehavior, rotation, set_config tool, Settings (dailyCap, readingBlock, goalBlock, studyDays, rotation, ...), DEFAULT_SETTINGS

### Community 16 - "Starter Library"
Cohesion: 0.32
Nodes (6): QuestFeed, LIBRARY, LibraryEntry, LibraryUnit, LearningStyle, TrackId

### Community 17 - "Mod Type Definitions"
Cohesion: 0.40
Nodes (4): claude-code, PluginState, QuestToday, QuestView

## Knowledge Gaps
- **4 isolated node(s):** `node`, `Study day`, `Terminal band`, `todays-reading mod (replaced)`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 107 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Learning Quest docs index` connect `Docs Index and Changelog` to `Dates and Game Engine`, `Docs Enforcement`, `Goals and Scheduler`, `Plugin Setup and Notes Folder`, `Write Rules and Outputs`, `Daily Reading Feeds`, `Daily Session Coaching`, `Settings`?**
  _High betweenness centrality (0.146) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `Learning Quest coach skill` (e.g. with `Saving a selection only saves` and `Coach rules`) actually correct?**
  _`Learning Quest coach skill` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `node`, `Study day`, `Terminal band` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dates and Game Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.07711711711711712 - nodes in this community are weakly interconnected._
- **Why does `zod` connect `Package Manifest` to `MCP Server and Tool API`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Should `MCP Server and Tool API` be split into smaller, more focused modules?**
  _Cohesion score 0.10101010101010101 - nodes in this community are weakly interconnected._
- **Why does `Goals, plan and leaves` connect `Goals and Scheduler` to `Dates and Game Engine`, `Starter Library`, `Docs Index and Changelog`, `Daily Session Coaching`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._