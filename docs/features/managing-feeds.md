# Managing feeds

Add any blog, follow any topic, keep an eye on sites with no RSS, and keep your subscriptions healthy.

## Using it

- *"Add https://someblog.dev"*: a homepage is fine, the feed is found for you
- *"Follow gaussian splatting"* / *"follow CRDTs, papers only"*
- *"Watch https://example.com/blog for new posts"* (sites with no RSS)
- *"What am I subscribed to?"* / *"Check my feeds"* / *"Remove Discord"*

## Tools

| Tool | What it does | Key inputs |
|---|---|---|
| `add_feed` | Subscribes to a blog. Accepts a feed URL or a homepage | `url`, `name`, `categories` |
| `watch_page` | Follows a site with no RSS by collecting article links from a listing page | `url`, `linkPattern` (regex for article URLs), `name` |
| `follow_topic` | Follows a free-text topic | `topic`, `papers` (true), `discussions` (true), `minPoints` (25) |
| `remove_feed` | Unsubscribes a source, custom feed, or topic | `id`: id, URL, name, or topic |
| `list_feeds` | Lists subscriptions with last known health, no network | — |
| `check_feeds` | Live-fetches every subscription and reports failing and stale ones | `removeBroken` |

## How it works

- Code: `src/tools/feeds.ts`, `src/fetcher.ts` (`resolveFeed`, `scrapeLinks`)
- **`add_feed` discovery:** tries the URL as a feed → `<link rel="alternate" type="application/rss+xml">` tags on the page → common paths (`/feed`, `/rss.xml`, `/atom.xml`, `/index.xml`…). The feed must parse and have items before it's saved, and the reply shows its 3 latest titles. If the URL turns out to be a catalog source, the catalog id is used instead, so future URL fixes still apply.
- **`follow_topic`** adds the topic to `config.topics`, which ranks and flags matching articles in *all* feeds (see [Reading list](reading-list.md)). It also adds:
  - a Hacker News search feed via hnrss.org (`points ≥ minPoints`, refreshed hourly). It's saved even if hnrss is briefly erroring; failures are retried.
  - an arXiv search feed (refreshed twice a day, queued and rate-limited; see [Feed reliability](feed-reliability.md))
- **`watch_page`** stores a `kind: "html"` custom feed. It checks right away that the pattern matches at least one link.
- **`check_feeds`** bypasses the cache. A source is "stale" when it has had no post in 6+ months and isn't marked `archive`. `removeBroken` only drops sources that fail now *and* haven't worked in 14 days.
- Custom feed ids look like `custom:<slug>`; topic feeds look like `topic:hn:<slug>` and `topic:arxiv:<slug>`.

## Limitations

- arXiv's search API rate-limits aggressively, so new topic paper feeds can take a while to fill.
