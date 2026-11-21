# gamify-learning

A Claude mod (MCP server) that turns learning into a game: curated reading feeds, daily goals, XP, levels, streaks, and learning tracks. Everything you log is written to your own Obsidian vault. It works in Claude Code (terminal) and the Claude desktop app. There are no API keys, because Claude is the brain.

## Setup

Needs Node.js 18+.

```bash
git clone https://github.com/prajwalkk/gamify-learning.git
cd gamify-learning
npm install
npm run build
cp config.example.json config.json      # Windows: copy config.example.json config.json
```

Edit `config.json` and set your name and **your own** vault:

```json
{ "username": "YourName", "vaultPath": "E:\\Obsidian" }
```

Windows paths (`E:\\Obsidian`) and WSL paths (`/mnt/e/Obsidian`) both work on either side. `config.json` is git-ignored, so each person keeps their own.

### Connect: Claude desktop app (Windows)

Settings → Developer → Edit Config, then add the following to `claude_desktop_config.json` (`%APPDATA%\Claude\`):

```json
{
  "mcpServers": {
    "gamify-learning": {
      "command": "node",
      "args": ["C:\\path\\to\\gamify-learning\\dist\\index.js"]
    }
  }
}
```

Restart the app.

### Connect: Claude Code (terminal)

```bash
claude mcp add gamify-learning --scope user -- node /path/to/gamify-learning/dist/index.js
```

## First run

Say **"set me up"**. Claude asks what you want to learn, in your own words, and suggests feeds from the catalog. You can add anything else too:

- *"also follow roguelike design"* follows a topic (Hacker News + arXiv search, and highlights matching articles in all your feeds)
- *"add https://someblog.dev"* subscribes to a blog. A homepage URL is fine, because the feed is found automatically and tested before saving.
- *"watch https://site.com/blog"* follows a site with no RSS by reading its article links

Daily: *"what should I read?"*, *"I read that"* (+5 XP), *"log what I learned about lifetimes"* (+10–40 XP), *"add a goal"*, *"show my dashboard"*.

## The catalog

There are about 100 sources in 14 categories plus 12 arXiv subcategories. All were verified live, and each one has a short description shown during onboarding.

| Category | Examples |
|---|---|
| Claude & Anthropic | claude.com articles, claude.dev blog, Anthropic news/research/engineering, Claude Code releases, MCP |
| AI Lab Blogs | OpenAI, Google DeepMind, Google Research, Microsoft Research, Apple ML, NVIDIA, Hugging Face, PyTorch |
| AI Engineering | Simon Willison, Latent Space, Eugene Yan, Hamel Husain, Sebastian Raschka, Interconnects, Import AI, Karpathy |
| ML / AI Research | Daily AI papers (HF trending + TL;DR), BAIR, Lil'Log, Alignment Forum, Distill, plus arXiv cs.AI/LG/CL/CV/RO/MA/IR/NE/SE/DC/GR, stat.ML |
| System Design | ByteByteGo, System Design Newsletter, Marc Brooker, Werner Vogels, Cloudflare, Netflix, Meta, Discord, Stripe, Fly.io, TigerBeetle… |
| Game Dev — Getting Started | GameFromScratch, Red Blob Games, Gaffer On Games, How To Market A Game |
| Game Engines / Industry / Graphics / Devlogs | Godot, Bevy, Unity, Unreal, Defold · Game Developer, GamesIndustry.biz, 80 Level · Aras P, MJP, Adrian Courrèges · Factorio FFF, RimWorld |
| Rust / Other Languages | This Week in Rust, fasterthanlime, corrode, matklad, Niko Matsakis · C++, C#/.NET, Go, TypeScript, Python, Zig |

**Learning tracks** (roadmap + starter resources + progress): `rust`, `gamedev` (game dev foundations for experienced developers), `cpp`, `csharp`, `go`, `typescript`, `python`.

## How it stays reliable

- **Hard timeouts, retries, and backoff** on every fetch. Rate limits (429) and server errors are retried, and dead feeds aren't hammered.
- **Broken-feed repair**: stray bytes before the XML and unescaped `&` are cleaned up automatically (this rescues the DeepMind and LangChain feeds).
- **Cache on disk** (`.cache/`): if a site is down you still get its last articles, and items stay readable after they drop off the feed.
- **Fallback URLs**: arXiv RSS is empty on weekends, so its search API fills in.
- **Fast answers**: the reading list returns within about 8 seconds, and slow sources finish in the background.
- **Sites without RSS** (Anthropic news/research/engineering) are read by scraping their article links.
- **Configs store source ids, not URLs**, so when a site moves, fixing the catalog reaches everyone on `git pull`.
- **Diverse reading list**: max 2 items per source by default, so arXiv's 400 papers a day don't take over. Articles on followed topics rank higher.

Maintenance: `npm run verify-feeds` live-checks the whole catalog. In chat, *"check my feeds"* runs a health check on your subscriptions.

## Gamification

- **XP:** learning entry 10 base (+10 if >200 chars, +10 if >500, +5 per tag) · article read +5 · goal done +10
- **Levels:** every 100 XP. Apprentice → Explorer → Scholar → Sage → Luminary → Polymath → Enlightened
- **Streaks:** log something every day

## Vault layout

```
YourVault/
├── Learning/2026-11-20 - Rust ownership model.md
├── Daily/2026-11-20.md
└── .gamify-state.json     ← XP, streak, goals, read articles
```
