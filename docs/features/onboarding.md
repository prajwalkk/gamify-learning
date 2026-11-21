# Onboarding

A short conversation that sets up your feeds. You describe what you want to learn in your own words; Claude suggests sources from the catalog, offers to follow anything that isn't in it, and subscribes you.

## Using it

- *"Set me up"* / *"I want to start fresh"*
- *"I'm new to game dev but an experienced dev. Into LLM agents, research papers, Rust, and system design interviews."*
- *"Also follow roguelike design and add https://ciechanow.ski"*

On first use, Claude offers this by itself: the server's instructions tell it to when you have no feeds yet.

## Tools

| Tool | What it does | Key inputs |
|---|---|---|
| `get_categories` | The whole catalog: categories, every source with a one-line blurb and beginner/archive flags, arXiv subcategories, learning tracks. Also includes `onboarded` and the onboarding script Claude follows | — |
| `suggest_feeds` | Turns free text into suggestions: categories, extra individual sources, arXiv subcategories, tracks, and **`followTopicCandidates`** (phrases that matched nothing) | `interests` — the user's own words |
| `setup_interests` | Applies the choices | `categories`, `sources`, `excludeSources`, `arxivSubcategories`, `topics`, `languageTrack`, `replace` |

## How it works

- Code: `src/tools/onboard.ts`; keyword hints in `TOPIC_HINTS` in `src/catalog.ts`
- **Matching:** the text is split into phrases (on commas, "and", "also"…) and each phrase is checked against keyword hints with `hasKeyword`. Matching starts at a word boundary, so "search" doesn't match "research", and short keywords like `go`, `ml`, `rl` need whole words. Stems like `scalab` match "scalability".
- **Beginner mode:** words like "new to", "beginner", "getting started" make suggestions list `beginner: true` sources first.
- **Unmatched phrases** come back as `followTopicCandidates`. Passing them in `setup_interests.topics` runs [follow_topic](managing-feeds.md) for each.
- **`setup_interests`:** a category subscribes to all of its sources. `excludeSources` removes individual ones. `languageTrack` sets the [track](learning-tracks.md) and adds its feeds. `replace: true` clears catalog subscriptions first (custom feeds and topics are kept).

## Limitations

- Matching is keyword-based. Claude does the real interpretation and can pass any source ids or categories directly, so the hints only need to be a good starting point.
