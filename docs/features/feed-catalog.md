# Feed catalog

The curated source list behind onboarding: about 100 verified sources in 14 categories, 12 arXiv subcategories, and topic hints. Every source has a short description so Claude can explain why it's worth reading.

## Categories

| id | Label | Examples |
|---|---|---|
| `claude` | Claude & Anthropic | claude.com articles, claude.dev blog, Anthropic news/research/engineering (scraped), Claude Code + SDK + MCP releases |
| `ai-labs` | AI Lab Blogs | OpenAI, DeepMind, Google Research, Microsoft Research, Apple ML, NVIDIA, Hugging Face, PyTorch |
| `ai-engineering` | AI Engineering | Simon Willison, Latent Space, Eugene Yan, Hamel, Raschka, Interconnects, Import AI, Karpathy, fast.ai |
| `research` | ML / AI Research | Daily AI papers (HF trending TL;DR), BAIR, Lil'Log, Alignment Forum, Distill, Jay Alammar |
| `system-design` | System Design | ByteByteGo, System Design Newsletter, Brooker, Vogels, Cloudflare, Netflix, Meta, Discord, Stripe, Fly.io, TigerBeetle |
| `software-eng` | Software Eng & Career | Pragmatic Engineer, Dan Luu, Julia Evans, Armin Ronacher |
| `gamedev-learn` | Game Dev: Getting Started | GameFromScratch, Red Blob Games, Gaffer On Games, How To Market A Game |
| `gamedev-engines` | Game Engines | Godot, Bevy, Unity, Unreal, Defold |
| `gamedev-industry` | Game Industry | Game Developer, GamesIndustry.biz, 80 Level |
| `graphics` | Graphics & Rendering | Aras P, MJP, Adrian Courrèges, Simon Schreibt, NVIDIA |
| `game-devlogs` | Game Devlogs | Factorio Friday Facts, RimWorld |
| `rust` | Rust | Rust Blog, Inside Rust, This Week in Rust, fasterthanlime, corrode, matklad, Niko Matsakis |
| `languages` | Other Languages | isocpp, Herb Sutter, .NET, TypeScript, Go, Python, Real Python, Zig |
| `tech-news` | Tech News | Hacker News front page |

**arXiv** (`arxiv:<code>`): cs.AI, cs.LG, cs.CL, cs.CV, cs.RO, stat.ML, cs.MA, cs.IR, cs.NE, cs.SE, cs.DC, cs.GR.

Source flags: `beginner` (good first read; shown first to newcomers) and `archive` (no longer updated, but a classic backlog; exempt from stale warnings).

## How it works

- Code: `src/catalog.ts` (`CATEGORIES`, `SOURCES`, `ARXIV`, `TOPIC_HINTS`, `TRACKS`)
- **Ids, not URLs:** `config.json` stores source ids, so fixing a URL in the catalog reaches every user on `git pull`. `aliases` holds old URLs for migrating configs. `fallbackUrls` are tried when the main URL fails or is empty.
- `kind: "html"` sources (Anthropic news/research/engineering have no RSS) use `linkPattern`/`exclude` regexes. See [Feed reliability](feed-reliability.md).
- `ttlMinutes` sets how often a source refreshes (default 30; arXiv 6h; scraped pages 2–3h).

## Adding or fixing a source

1. Add or edit the entry in `SOURCES` with a unique `id`, `categories`, and a `blurb`.
2. `npm run build && npm run verify-feeds`. This live-fetches every source with the production fetcher and checks that every id used by hints and tracks exists. It exits non-zero on failures. arXiv shows `WKND` on weekends, which is expected.
3. Update this page if the category lineup changes, and add a CHANGELOG line.

## Limitations

- Stale-but-valuable blogs are kept as `archive`; truly dead or noisy ones are removed (e.g. GameDev.net, which was mostly forum posts, and Fyrox's blog).
