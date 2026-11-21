# Daily reading and feeds

Each study day gets one 10-minute reading for that day's track, picked from your feeds, plus a few headlines. 45 feeds are in the catalog, each with a track, a role (reading, or headlines only), a volume rating, and a default on/off.

## Using it

- "Show my feeds" / "Turn on arXiv cs.LG" / "Turn off Lobsters"
- "Refresh the news"

## The catalog

| Group | Feeds |
|---|---|
| Curated papers | [Fanout](https://fanout.sh) Daily papers and the Fanout blog: each item's category decides its track (AI Research and ML Math → ML, Systems and System design → system design, Inference and Inference engineering → AI dev) |
| AI dev | claude.dev, Anthropic Engineering (no feed: its page is scraped), OpenAI Engineering, Simon Willison, Latent Space |
| Languages *(off by default)* | This Week in Rust, Rust Blog, Go Blog, Python Insider |
| Game dev *(off by default)* | Red Blob Games, Gaffer On Games (classic archive), GameFromScratch, Bevy, Godot, Factorio Friday Facts, Aras Pranckevičius; Game Developer as headlines |
| ML explainers | Lilian Weng, Ahead of AI (Raschka), Chip Huyen |
| ML labs | Hugging Face, Google Research, BAIR, Interconnects |
| arXiv *(off by default)* | cs.LG, cs.CL, cs.AI, cs.DC, cs.DB |
| System design, production | ByteByteGo, The Pragmatic Engineer, Cloudflare, Netflix, AWS Architecture *(off)*, Werner Vogels |
| System design, internals | Martin Kleppmann, Julia Evans, Dan Luu, Daniel Lemire, Eli Bendersky |
| News, headlines only | Hacker News front page (300+ points), Lobsters, Ars Technica *(off)* |

"OpenAI Developers" is the OpenAI *Engineering* feed, because the developers feed hasn't posted in months.

## Picking

- **Today's reading:**
  1. Only reading-role items for today's track that you haven't read yet.
  2. If Fanout's daily paper (from the last day) is for today's track, it wins.
  3. Otherwise take the newest unread item for the track from each feed, rotating between feeds by date, so one busy feed doesn't win every day. Fanout blog posts take part under their category's track.

  The pick is stored for the day, so it doesn't change when feeds refresh.
- **Headlines:** up to 5, headline-only feeds first, at most 2 per source, skipping anything you've read or that's a reading pick. The kickoff shows 2.

## Fetching

RSS 2.0, RSS 1.0 and Atom are all read. All selected feeds are fetched in parallel, 10 seconds each at most, keeping the newest 30 items per feed. A feed that fails keeps its last good items. The cache (`Learning/.quest/news.json`) is good for 20 hours, or until your selection changes. The server also refreshes a stale cache in the background when a session starts.

Under that sits the robust fetcher (`src/fetcher.ts`):
- its own hard timeouts and retry with backoff;
- repair of malformed XML (a stray byte at the start, unescaped `&`);
- removal of tracking parameters from links;
- link scraping for pages without a feed.

**Saving a selection only saves.** Fetching is the separate `refresh_news` call, so saving is instant.

## Tools

| Tool | What it does | Key inputs |
|---|---|---|
| `list_feeds` | The catalog: each feed's group, track, role, volume, whether it's on, and how its last fetch went | — |
| `set_feeds` | Saves the selection (only saves) | `feeds` (replace), `enable`, `disable` |
| `refresh_news` | Fetches the selected feeds now and redraws today's reading and headlines | — |

## How it works

- Code: `src/quest/feeds.ts` (catalog, cache, `pickReading`, `pickHeadlines`), `src/fetcher.ts`.
- `npm run verify-feeds` live-checks every catalog feed with the production fetcher. arXiv shows `WKND` on weekends, when it publishes nothing.

## Limitations

- Inference engineering is filed under AI dev so Fridays get Fanout material; change `FANOUT_TRACKS` in `src/quest/feeds.ts` to move it to system design.
- An item with no category in a curated feed falls back to title keywords (agents, tool use, coding → AI dev; serving, distributed, databases → system design; else ML).
