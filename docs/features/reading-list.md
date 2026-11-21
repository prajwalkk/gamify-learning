# Reading list

Your personal reading list from every feed you follow: newest first, mixed across sources, with articles about your followed topics ranked up. Reading an article earns XP.

## Using it

- *"What should I read today?"*
- *"Anything new on graphics?"* / *"Show me research from this week"*
- *"Find posts about netcode"*
- *"I read the ByteByteGo one"* → marked read, +5 XP

## Tools

| Tool | What it does | Key inputs |
|---|---|---|
| `get_feeds` | Builds the reading list | `category`, `source`, `query` (keyword), `days`, `limit` (15), `perSource` (2), `includeRead` (false), `refresh` |
| `mark_article_read` | Marks an article read, +5 XP | `guid` from `get_feeds` (or its link); `title` only needed for articles from elsewhere |

## How it works

- Code: `src/tools/feeds.ts` (`getFeeds`, `markArticleRead`) on top of `src/feed-engine.ts`
- **Ranking:** score = publish date + 3 days per followed topic the title/summary mentions. Each source contributes at most `perSource` items, so high-volume feeds (arXiv, OpenAI, Hacker News) can't crowd out the rest. The same link arriving through two sources is shown once.
- **Speed:** answers within about 8 seconds. Sources still loading (usually arXiv's slow API) are listed in `stillLoading` and finish in the background for the next call.
- **Failures:** `failing` lists sources that errored, and whether a cached copy is being shown. See [Feed reliability](feed-reliability.md).
- Undated items (from scraped sites) show `date: "undated"` and sort by when they were first seen.
- `mark_article_read` looks the article up in the cache. An unknown guid with no title is rejected, so XP can't be earned for nothing. Read articles are stored in `.gamify-state.json` → `readArticles`.

## Limitations

- Read status lives in your vault's state file, so it isn't shared between people.
