# Feed reliability

How feeds keep working when sites are slow, down, malformed, rate-limited, or have no RSS at all. There's nothing to use directly; this is the machinery under the [reading list](reading-list.md).

## How it works

Code: `src/fetcher.ts` (fetching and parsing), `src/feed-engine.ts` (caching and scheduling)

| Problem | Handling |
|---|---|
| Hanging connections | Own `fetch` with a hard timeout via `AbortController` (12s; 25s for arXiv API), not the parser's built-in fetcher, which could stall forever |
| Transient errors | Up to 2 retries with exponential backoff on network errors, 5xx and 429. Other 4xx fail fast |
| Repeatedly failing feed | Not retried more than every 5 min × 2^failures (capped by its TTL); the last good copy is served meanwhile |
| Malformed XML | If parsing fails, retry after stripping a BOM / junk before `<` and escaping bare `&` (this rescues DeepMind and LangChain) |
| Feed temporarily empty (arXiv on weekends) | **Merge, don't replace:** new items are added to cached ones; items stay for 30 days after leaving the feed (max 150 per source) |
| Primary URL dead or empty | `fallbackUrls` are tried in order. arXiv RSS falls back to the arXiv search API |
| arXiv API rate limits | All arXiv API calls are queued 3s apart and a 429 is never retried in the same call |
| Slow sources | `get_feeds` returns after about 8s; the rest finish in the background. Concurrent requests for one source share a single fetch |
| No RSS at all | `kind: "html"`: article links matching `linkPattern` are collected from `<a>` tags (title from heading → image alt → first text) and from URLs embedded in page JSON (Next.js sites) |
| Restarts | Cache persisted to `.cache/feeds.json` (git-ignored) with per-source health: `lastOkAt`, `lastError`, `failCount` |
| HTML/entities in titles and summaries | Stripped and decoded. arXiv "Announce Type: replace" re-announcements are dropped and its abstract prefix trimmed |

Undated scraped items get a `firstSeen` time. Those found on the very first fetch are placed a week back (in page order), so old posts don't appear as today's news.

## Checking it

- `npm run verify-feeds`: whole catalog, production code path
- *"check my feeds"* → `check_feeds` for your subscriptions ([Managing feeds](managing-feeds.md))

## Limitations

- HTML scraping depends on the site's markup. If Anthropic redesigns, the `linkPattern` in the catalog may need updating; `verify-feeds` will show it as `EMPTY`.
