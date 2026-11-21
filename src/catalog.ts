// Curated source catalog. Every entry was verified live (2026-11-20) with the same
// fetcher the server uses — re-run `npm run verify-feeds` to re-check the whole pool.
//
// Users' config.json stores source *ids*, not URLs, so fixing a URL here reaches
// everyone on their next `git pull` without them touching their config.

export type SourceKind = "rss" | "html";

export interface Source {
  id: string;
  name: string;
  url: string;
  kind?: SourceKind; // default "rss"
  /** html sources: regex the absolute article URL must match */
  linkPattern?: string;
  /** html sources: regex of URLs to skip (category pages etc.) */
  exclude?: string;
  categories: string[];
  /** Why it's worth reading — shown during onboarding */
  blurb: string;
  /** Good starting point for someone new to the field */
  beginner?: boolean;
  /** No longer updated, but the backlog is classic material */
  archive?: boolean;
  /** Minutes between refreshes (default 30) */
  ttlMinutes?: number;
  /** Old URLs this source used to live at (for migrating existing configs) */
  aliases?: string[];
  /** Tried in order when the main URL fails or returns nothing */
  fallbackUrls?: string[];
}

export interface Category {
  label: string;
  description: string;
}

export const CATEGORIES: Record<string, Category> = {
  claude: { label: "Claude & Anthropic", description: "Claude guides, Claude Code blog, Anthropic news/research, release notes" },
  "ai-labs": { label: "AI Lab Blogs", description: "Official posts from OpenAI, Google DeepMind, Google Research, Microsoft, Apple, NVIDIA, Hugging Face" },
  "ai-engineering": { label: "AI Engineering (practitioners)", description: "Building with LLMs: agents, evals, RAG, fine-tuning — from people shipping it" },
  research: { label: "ML / AI Research", description: "Daily paper digests, research lab blogs, interpretability & alignment, explainers. Add arXiv subcategories for raw papers." },
  "system-design": { label: "System Design", description: "Distributed systems, architecture, and how big companies build at scale" },
  "software-eng": { label: "Software Engineering & Career", description: "Engineering craft, industry trends, career" },
  "gamedev-learn": { label: "Game Dev — Getting Started", description: "Beginner-friendly: tutorials, fundamentals, game math, shipping & marketing your first game" },
  "gamedev-engines": { label: "Game Engines", description: "Godot, Bevy, Unity, Unreal, Fyrox, Defold — release notes and engine deep dives" },
  "gamedev-industry": { label: "Game Industry News", description: "What's happening in games: studios, launches, postmortems, art & tech features" },
  graphics: { label: "Graphics & Rendering", description: "Shaders, GPUs, rendering techniques, frame breakdowns of real games" },
  "game-devlogs": { label: "Game Devlogs", description: "Long-running devlogs from shipped games — how real games get built" },
  rust: { label: "Rust", description: "Official Rust news, This Week in Rust, and the best Rust writers" },
  languages: { label: "Other Languages", description: "C++, C#/.NET, Go, TypeScript, Python, Zig official blogs and writers" },
  "tech-news": { label: "Tech News", description: "Hacker News front page — what engineers are talking about today" },
};

export const SOURCES: Source[] = [
  // ── Claude & Anthropic ────────────────────────────────────────────────────
  { id: "claude-articles", name: "Claude Articles (claude.com)", url: "https://claude.com/resources/articles/rss.xml", categories: ["claude"], blurb: "Official Claude guides, use cases and product articles", beginner: true },
  { id: "claude-dev", name: "claude.dev Blog", url: "https://claude.dev/rss.xml", categories: ["claude"], blurb: "Claude developer platform & Claude Code blog" },
  { id: "anthropic-news", name: "Anthropic News", url: "https://www.anthropic.com/news", kind: "html", linkPattern: "^https://www\\.anthropic\\.com/news/[a-z0-9-]+$", exclude: "/news/(announcements|features|policy|product|research|societal-impacts|events)$", categories: ["claude"], blurb: "Model launches and company announcements (no official RSS — scraped)", ttlMinutes: 120 },
  { id: "anthropic-research", name: "Anthropic Research", url: "https://www.anthropic.com/research", kind: "html", linkPattern: "^https://www\\.anthropic\\.com/research/[a-z0-9-]+$", exclude: "/research/team", categories: ["claude", "research"], blurb: "Interpretability, alignment, and societal impact research (scraped)", ttlMinutes: 180 },
  { id: "anthropic-engineering", name: "Anthropic Engineering", url: "https://www.anthropic.com/engineering", kind: "html", linkPattern: "^https://www\\.anthropic\\.com/(engineering|research)/[a-z0-9-]+$", categories: ["claude", "ai-engineering"], blurb: "Agent harnesses, evals, context engineering, tool design (scraped)", ttlMinutes: 180 },
  { id: "claude-code-releases", name: "Claude Code Releases", url: "https://github.com/anthropics/claude-code/releases.atom", categories: ["claude"], blurb: "Every Claude Code release and its changelog", ttlMinutes: 120 },
  { id: "anthropic-sdk-ts-releases", name: "Anthropic TS SDK Releases", url: "https://github.com/anthropics/anthropic-sdk-typescript/releases.atom", categories: ["claude"], blurb: "Anthropic TypeScript SDK changes", ttlMinutes: 240 },
  { id: "mcp-releases", name: "Model Context Protocol Releases", url: "https://github.com/modelcontextprotocol/modelcontextprotocol/releases.atom", categories: ["claude", "ai-engineering"], blurb: "MCP spec releases (the protocol this mod runs on)", ttlMinutes: 720 },

  // ── AI lab blogs ──────────────────────────────────────────────────────────
  { id: "openai-news", name: "OpenAI News", url: "https://openai.com/news/rss.xml", categories: ["ai-labs"], blurb: "OpenAI announcements and research posts" },
  { id: "deepmind", name: "Google DeepMind Blog", url: "https://deepmind.google/blog/rss.xml", categories: ["ai-labs", "research"], blurb: "Gemini, AlphaFold-style science, RL research" },
  { id: "google-research", name: "Google Research Blog", url: "https://research.google/blog/rss/", categories: ["ai-labs", "research"], blurb: "Broad research across ML, systems, and science" },
  { id: "microsoft-research", name: "Microsoft Research", url: "https://www.microsoft.com/en-us/research/feed/", categories: ["ai-labs"], blurb: "Research across AI, systems, and HCI" },
  { id: "apple-ml", name: "Apple Machine Learning Research", url: "https://machinelearning.apple.com/rss.xml", categories: ["ai-labs"], blurb: "On-device ML and Apple's published papers" },
  { id: "nvidia-dev", name: "NVIDIA Technical Blog", url: "https://developer.nvidia.com/blog/feed", categories: ["ai-labs", "graphics"], blurb: "CUDA, inference optimization, and real-time graphics" },
  { id: "huggingface", name: "Hugging Face Blog", url: "https://huggingface.co/blog/feed.xml", categories: ["ai-labs", "ai-engineering"], blurb: "Open models, training recipes, and libraries" },
  { id: "pytorch", name: "PyTorch Blog", url: "https://pytorch.org/blog/feed.xml", categories: ["ai-labs"], blurb: "PyTorch releases and performance deep dives" },

  // ── AI engineering (practitioners) ────────────────────────────────────────
  { id: "simon-willison", name: "Simon Willison's Weblog", url: "https://simonwillison.net/atom/everything/", categories: ["ai-engineering"], blurb: "The best daily read on what LLMs can actually do", beginner: true },
  { id: "latent-space", name: "Latent Space", url: "https://www.latent.space/feed", categories: ["ai-engineering"], blurb: "AI engineering podcast + essays" },
  { id: "eugene-yan", name: "Eugene Yan", url: "https://eugeneyan.com/rss/", categories: ["ai-engineering", "system-design"], blurb: "Evals, RecSys, LLM patterns in production" },
  { id: "hamel", name: "Hamel Husain", url: "https://hamel.dev/index.xml", categories: ["ai-engineering"], blurb: "Practical evals and fine-tuning" },
  { id: "chip-huyen", name: "Chip Huyen", url: "https://huyenchip.com/feed.xml", categories: ["ai-engineering"], blurb: "ML systems design, AI engineering fundamentals", archive: true },
  { id: "raschka", name: "Ahead of AI (Sebastian Raschka)", url: "https://magazine.sebastianraschka.com/feed", categories: ["ai-engineering", "research"], blurb: "LLM architecture & research, explained clearly", beginner: true },
  { id: "interconnects", name: "Interconnects (Nathan Lambert)", url: "https://www.interconnects.ai/feed", categories: ["ai-engineering", "research"], blurb: "Post-training, RLHF, open models" },
  { id: "import-ai", name: "Import AI (Jack Clark)", url: "https://importai.substack.com/feed", categories: ["ai-engineering", "research"], blurb: "Weekly digest of notable AI research" },
  { id: "one-useful-thing", name: "One Useful Thing (Ethan Mollick)", url: "https://www.oneusefulthing.org/feed", categories: ["ai-engineering"], blurb: "How to actually use AI at work and in learning", beginner: true },
  { id: "karpathy", name: "Andrej Karpathy", url: "https://karpathy.bearblog.dev/feed/", categories: ["ai-engineering", "research"], blurb: "Neural nets from first principles" },
  { id: "fastai", name: "fast.ai", url: "https://www.fast.ai/index.xml", categories: ["ai-engineering"], blurb: "Practical deep learning", beginner: true },
  { id: "grootendorst", name: "Exploring Language Models (Maarten Grootendorst)", url: "https://newsletter.maartengrootendorst.com/feed", categories: ["ai-engineering", "research"], blurb: "Visual guides to LLM internals", beginner: true },

  // ── Research ──────────────────────────────────────────────────────────────
  { id: "daily-papers", name: "Daily AI Papers (HF trending, TL;DR)", url: "https://papers.takara.ai/api/feed", categories: ["research"], blurb: "Hugging Face's trending papers each day with short summaries — the easiest way to follow papers", beginner: true, ttlMinutes: 180 },
  { id: "bair", name: "Berkeley AI Research (BAIR)", url: "https://bair.berkeley.edu/blog/feed.xml", categories: ["research"], blurb: "Accessible write-ups of Berkeley papers" },
  { id: "lilian-weng", name: "Lil'Log (Lilian Weng)", url: "https://lilianweng.github.io/index.xml", categories: ["research"], blurb: "Definitive long-form surveys of ML topics" },
  { id: "alignment-forum", name: "AI Alignment Forum", url: "https://www.alignmentforum.org/feed.xml", categories: ["research"], blurb: "Alignment & interpretability research discussion" },
  { id: "the-gradient", name: "The Gradient", url: "https://thegradient.pub/rss/", categories: ["research"], blurb: "Essays on AI research and its implications", archive: true },
  { id: "jay-alammar", name: "Jay Alammar", url: "https://jalammar.github.io/feed.xml", categories: ["research"], blurb: "The Illustrated Transformer & friends", beginner: true, archive: true },
  { id: "karpathy-classic", name: "Karpathy (classic blog)", url: "https://karpathy.github.io/feed.xml", categories: ["research"], blurb: "Classic essays like 'The Unreasonable Effectiveness of RNNs'", archive: true },
  { id: "distill", name: "Distill.pub", url: "https://distill.pub/rss.xml", categories: ["research"], blurb: "Interactive ML explainers (archived 2021, still gold)", archive: true },

  // ── System design ─────────────────────────────────────────────────────────
  { id: "bytebytego", name: "ByteByteGo", url: "https://blog.bytebytego.com/feed", categories: ["system-design"], blurb: "System design explained visually", beginner: true },
  { id: "system-design-one", name: "The System Design Newsletter", url: "https://newsletter.systemdesign.one/feed", categories: ["system-design"], blurb: "Case studies of real architectures + interview prep", beginner: true },
  { id: "martin-fowler", name: "Martin Fowler", url: "https://martinfowler.com/feed.atom", categories: ["system-design", "software-eng"], blurb: "Architecture patterns and refactoring" },
  { id: "all-things-distributed", name: "All Things Distributed (Werner Vogels)", url: "https://www.allthingsdistributed.com/atom.xml", categories: ["system-design"], blurb: "Amazon CTO on distributed systems" },
  { id: "marc-brooker", name: "Marc Brooker", url: "https://brooker.co.za/blog/rss.xml", categories: ["system-design"], blurb: "AWS distinguished engineer on reliability & distributed systems" },
  { id: "murat-demirbas", name: "Metadata (Murat Demirbas)", url: "https://muratbuffalo.blogspot.com/feeds/posts/default", categories: ["system-design", "research"], blurb: "Distributed systems papers, summarized" },
  { id: "aws-architecture", name: "AWS Architecture Blog", url: "https://aws.amazon.com/blogs/architecture/feed/", categories: ["system-design"], blurb: "Reference architectures on AWS" },
  { id: "cloudflare", name: "Cloudflare Blog", url: "https://blog.cloudflare.com/rss/", categories: ["system-design"], blurb: "Networking, edge compute, and incident deep dives" },
  { id: "netflix", name: "Netflix Tech Blog", url: "https://netflixtechblog.com/feed", categories: ["system-design"], blurb: "Streaming at scale, data platforms, ML infra" },
  { id: "meta-eng", name: "Engineering at Meta", url: "https://engineering.fb.com/feed/", categories: ["system-design"], blurb: "Infra and AI systems at Meta scale" },
  { id: "discord", name: "Discord Blog", url: "https://discord.com/blog/rss.xml", categories: ["system-design"], blurb: "Includes classic engineering posts (Rust, Elixir, data stores)" },
  { id: "stripe", name: "Stripe Blog", url: "https://stripe.com/blog/feed.rss", categories: ["system-design"], blurb: "Payments infra and API design" },
  { id: "slack-eng", name: "Slack Engineering", url: "https://slack.engineering/feed/", categories: ["system-design"], blurb: "Real-time messaging infra" },
  { id: "dropbox", name: "Dropbox Tech", url: "https://dropbox.tech/feed", categories: ["system-design"], blurb: "Storage systems and infra" },
  { id: "airbnb", name: "Airbnb Engineering", url: "https://medium.com/feed/airbnb-engineering", categories: ["system-design"], blurb: "Data, ML and platform engineering" },
  { id: "pinterest", name: "Pinterest Engineering", url: "https://medium.com/feed/pinterest-engineering", categories: ["system-design"], blurb: "Recommendation and infra at scale" },
  { id: "github-eng", name: "GitHub Engineering", url: "https://github.blog/engineering/feed/", categories: ["system-design"], blurb: "How GitHub builds and runs GitHub" },
  { id: "flyio", name: "Fly.io Blog", url: "https://fly.io/blog/feed.xml", categories: ["system-design"], blurb: "Opinionated, fun infra writing" },
  { id: "tigerbeetle", name: "TigerBeetle Blog", url: "https://tigerbeetle.com/blog/atom.xml", categories: ["system-design"], blurb: "Databases, deterministic simulation testing, Zig" },
  { id: "infoq", name: "InfoQ", url: "https://www.infoq.com/feed/", categories: ["system-design", "software-eng"], blurb: "Architecture news and conference talks" },
  { id: "architecture-weekly", name: "Architecture Weekly", url: "https://architectureweekly.substack.com/feed", categories: ["system-design"], blurb: "Event-driven architecture and design" },
  { id: "high-scalability", name: "High Scalability", url: "https://highscalability.com/rss/", categories: ["system-design"], blurb: "Classic 'how X scaled' architecture writeups", archive: true },

  // ── Software engineering & career ─────────────────────────────────────────
  { id: "pragmatic-engineer", name: "The Pragmatic Engineer", url: "https://newsletter.pragmaticengineer.com/feed", categories: ["software-eng"], blurb: "The industry from the inside: teams, careers, trends" },
  { id: "dan-luu", name: "Dan Luu", url: "https://danluu.com/atom.xml", categories: ["software-eng"], blurb: "Deeply researched essays on engineering" },
  { id: "jvns", name: "Julia Evans", url: "https://jvns.ca/atom.xml", categories: ["software-eng"], blurb: "Joyful explanations of how computers work", beginner: true },
  { id: "armin-ronacher", name: "Armin Ronacher", url: "https://lucumr.pocoo.org/feed.atom", categories: ["software-eng", "rust"], blurb: "Flask/Sentry creator on Python, Rust, and AI tooling" },

  // ── Game dev: getting started ─────────────────────────────────────────────
  { id: "gamefromscratch", name: "GameFromScratch", url: "https://gamefromscratch.com/feed/", categories: ["gamedev-learn", "gamedev-engines"], blurb: "Daily engine/tool news + tutorials — great map of the gamedev landscape", beginner: true },
  { id: "red-blob-games", name: "Red Blob Games", url: "https://www.redblobgames.com/blog/posts.xml", categories: ["gamedev-learn"], blurb: "Interactive guides to pathfinding, hex grids, procgen", beginner: true },
  { id: "gaffer-on-games", name: "Gaffer On Games", url: "https://gafferongames.com/post/index.xml", categories: ["gamedev-learn"], blurb: "The classic on game loops, physics, and netcode", beginner: true, archive: true },
  { id: "how-to-market-a-game", name: "How To Market A Game", url: "https://howtomarketagame.com/feed/", categories: ["gamedev-learn"], blurb: "Steam wishlists, launches, and indie marketing", beginner: true },

  // ── Game engines ──────────────────────────────────────────────────────────
  { id: "godot", name: "Godot Engine", url: "https://godotengine.org/rss.xml", categories: ["gamedev-engines"], blurb: "Open-source engine; best beginner engine today", beginner: true },
  { id: "bevy", name: "Bevy Engine", url: "https://bevy.org/atom.xml", categories: ["gamedev-engines", "rust"], blurb: "Data-driven Rust engine (ECS)", aliases: ["https://bevyengine.org/news/index.xml"] },
  { id: "unity", name: "Unity Blog", url: "https://unity.com/blog/rss", categories: ["gamedev-engines"], blurb: "Unity releases and techniques" },
  { id: "unreal", name: "Unreal Engine", url: "https://www.unrealengine.com/en-US/rss", categories: ["gamedev-engines"], blurb: "Unreal releases, tech talks, showcases" },
  { id: "defold", name: "Defold", url: "https://defold.com/feed.xml", categories: ["gamedev-engines"], blurb: "Lightweight 2D-focused engine" },

  // ── Game industry ─────────────────────────────────────────────────────────
  { id: "game-developer", name: "Game Developer (ex-Gamasutra)", url: "https://www.gamedeveloper.com/rss.xml", categories: ["gamedev-industry"], blurb: "Industry news, postmortems, design deep dives" },
  { id: "gamesindustry-biz", name: "GamesIndustry.biz", url: "https://www.gamesindustry.biz/feed", categories: ["gamedev-industry"], blurb: "Business side of games" },
  { id: "80lv", name: "80 Level", url: "https://80.lv/feed/", categories: ["gamedev-industry", "graphics"], blurb: "Game art & tech breakdowns" },

  // ── Graphics ──────────────────────────────────────────────────────────────
  { id: "aras-p", name: "Aras Pranckevičius", url: "https://aras-p.info/atom.xml", categories: ["graphics"], blurb: "Ex-Unity graphics lead on rendering & performance" },
  { id: "mjp", name: "The Danger Zone (Matt Pettineo)", url: "https://therealmjp.github.io/index.xml", categories: ["graphics"], blurb: "Real-time rendering, D3D12, lighting", archive: true },
  { id: "adrian-courreges", name: "Adrian Courrèges", url: "https://www.adriancourreges.com/atom.xml", categories: ["graphics", "gamedev-learn"], blurb: "Frame-by-frame breakdowns of how games render (GTA V, DOOM)", archive: true },
  { id: "simon-schreibt", name: "Simon Schreibt", url: "https://simonschreibt.de/feed/", categories: ["graphics"], blurb: "Game art tricks explained", archive: true },

  // ── Devlogs ───────────────────────────────────────────────────────────────
  { id: "factorio-fff", name: "Factorio Friday Facts", url: "https://www.factorio.com/blog/rss", categories: ["game-devlogs"], blurb: "Legendary technical devlog: optimization, tooling, design" },
  { id: "rimworld", name: "Ludeon (RimWorld)", url: "https://www.ludeon.com/blog/feed/", categories: ["game-devlogs"], blurb: "RimWorld development blog" },

  // ── Rust ──────────────────────────────────────────────────────────────────
  { id: "rust-blog", name: "Official Rust Blog", url: "https://blog.rust-lang.org/feed.xml", categories: ["rust"], blurb: "Releases and project news" },
  { id: "inside-rust", name: "Inside Rust", url: "https://blog.rust-lang.org/inside-rust/feed.xml", categories: ["rust"], blurb: "Rust project internals" },
  { id: "this-week-in-rust", name: "This Week in Rust", url: "https://this-week-in-rust.org/rss.xml", categories: ["rust"], blurb: "Weekly roundup — the one Rust feed to follow", beginner: true },
  { id: "fasterthanlime", name: "fasterthanlime", url: "https://fasterthanli.me/index.xml", categories: ["rust"], blurb: "Long, fun, deep Rust explorations", beginner: true, archive: true },
  { id: "corrode", name: "corrode.dev", url: "https://corrode.dev/rss.xml", categories: ["rust"], blurb: "Idiomatic Rust and Rust in production" },
  { id: "matklad", name: "matklad", url: "https://matklad.github.io/feed.xml", categories: ["rust"], blurb: "rust-analyzer author on design and Rust/Zig" },
  { id: "baby-steps", name: "Baby Steps (Niko Matsakis)", url: "https://smallcultfollowing.com/babysteps/atom.xml", categories: ["rust"], blurb: "Rust language design from the inside" },
  { id: "ralf-jung", name: "Ralf Jung", url: "https://www.ralfj.de/blog/feed.xml", categories: ["rust"], blurb: "Unsafe Rust, Miri, and memory models (posts a few times a year)", archive: true },
  { id: "seanmonstar", name: "seanmonstar", url: "https://seanmonstar.com/rss", categories: ["rust"], blurb: "hyper/reqwest author on async Rust" },
  { id: "without-boats", name: "without.boats", url: "https://without.boats/index.xml", categories: ["rust"], blurb: "Async Rust design essays", archive: true },

  // ── Other languages ───────────────────────────────────────────────────────
  { id: "isocpp", name: "isocpp.org", url: "https://isocpp.org/blog/rss", categories: ["languages"], blurb: "C++ news, articles, and standards updates" },
  { id: "herb-sutter", name: "Herb Sutter", url: "https://herbsutter.com/feed/", categories: ["languages"], blurb: "C++ standards committee chair" },
  { id: "modernes-cpp", name: "Modernes C++", url: "https://www.modernescpp.com/index.php/feed/", categories: ["languages"], blurb: "Modern C++ features explained" },
  { id: "dotnet", name: ".NET Blog", url: "https://devblogs.microsoft.com/dotnet/feed/", categories: ["languages"], blurb: "C# and .NET (Unity/Godot use C#)" },
  { id: "typescript", name: "TypeScript Blog", url: "https://devblogs.microsoft.com/typescript/feed/", categories: ["languages"], blurb: "TypeScript releases" },
  { id: "go-blog", name: "Go Blog", url: "https://go.dev/blog/feed.atom", categories: ["languages"], blurb: "Official Go blog" },
  { id: "python-blog", name: "Python Insider", url: "https://blog.python.org/feeds/posts/default", categories: ["languages"], blurb: "Python releases and core news" },
  { id: "real-python", name: "Real Python", url: "https://realpython.com/atom.xml", categories: ["languages"], blurb: "Python tutorials", beginner: true },
  { id: "zig-news", name: "Zig News", url: "https://ziglang.org/news/index.xml", categories: ["languages"], blurb: "Zig releases and news" },

  // ── Tech news ─────────────────────────────────────────────────────────────
  { id: "hn-frontpage", name: "Hacker News Front Page", url: "https://hnrss.org/frontpage", categories: ["tech-news"], blurb: "Today's HN front page", ttlMinutes: 20 },
];

// arXiv subcategories — raw paper firehoses (hundreds/day for cs.AI/cs.LG), so get_feeds
// caps items per source. Updated once a day (no announcements on weekends).
export const ARXIV: Record<string, { label: string; description: string }> = {
  "cs.AI": { label: "Artificial Intelligence", description: "Agents, planning, reasoning, knowledge representation" },
  "cs.LG": { label: "Machine Learning", description: "Learning algorithms, deep learning, optimization" },
  "cs.CL": { label: "Computation & Language (NLP)", description: "LLMs, transformers, language understanding" },
  "cs.CV": { label: "Computer Vision", description: "Images, video, diffusion models, 3D" },
  "cs.RO": { label: "Robotics", description: "Robot learning, embodied AI, control" },
  "stat.ML": { label: "Statistical ML", description: "Learning theory, Bayesian & probabilistic methods" },
  "cs.MA": { label: "Multi-Agent Systems", description: "Multi-agent coordination, LLM agent societies" },
  "cs.IR": { label: "Information Retrieval", description: "Search, RAG, recommender systems" },
  "cs.NE": { label: "Neural & Evolutionary Computing", description: "Neuroevolution, spiking nets, genetic algorithms" },
  "cs.SE": { label: "Software Engineering", description: "Code LLMs, coding agents, program analysis, testing" },
  "cs.DC": { label: "Distributed Computing", description: "Distributed systems, consensus, cluster & ML infra" },
  "cs.GR": { label: "Graphics", description: "Rendering, animation, geometry — relevant for game dev" },
};

export function arxivSource(code: string): Source | undefined {
  const a = ARXIV[code];
  if (!a) return undefined;
  return {
    id: `arxiv:${code}`,
    name: `arXiv ${code} — ${a.label}`,
    url: `https://rss.arxiv.org/rss/${code}`,
    categories: ["research"],
    blurb: a.description,
    ttlMinutes: 360,
    aliases: [`http://export.arxiv.org/rss/${code}`, `https://export.arxiv.org/rss/${code}`, `https://arxiv.org/rss/${code}`],
    // The RSS feed is empty on weekends/holidays; the search API always has the latest papers
    fallbackUrls: [`https://export.arxiv.org/api/query?search_query=cat:${code}&sortBy=submittedDate&sortOrder=descending&max_results=50`],
  };
}

const byId = new Map(SOURCES.map((s) => [s.id, s]));

export function getSource(id: string): Source | undefined {
  return id.startsWith("arxiv:") ? arxivSource(id.slice(6)) : byId.get(id);
}

/** Find a catalog source by URL, including old aliases (for migrating configs). */
export function findSourceByUrl(url: string): Source | undefined {
  const norm = (u: string) => u.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const n = norm(url);
  const all = [...SOURCES, ...Object.keys(ARXIV).map((c) => arxivSource(c)!)];
  return all.find((s) => norm(s.url) === n || (s.aliases ?? []).some((a) => norm(a) === n));
}

export function sourcesInCategory(cat: string): Source[] {
  return SOURCES.filter((s) => s.categories.includes(cat));
}

// ── Free-text interest matching (used by suggest_feeds) ─────────────────────
export interface TopicHint {
  keywords: string[];
  categories?: string[];
  sources?: string[];
  arxiv?: string[];
  track?: string;
}

export const TOPIC_HINTS: TopicHint[] = [
  { keywords: ["claude", "anthropic", "claude code", "mcp", "model context protocol"], categories: ["claude"] },
  { keywords: ["llm", "large language model", "transformer", "gpt", "nlp", "language model", "chatbot", "prompt"], categories: ["ai-engineering"], sources: ["raschka", "grootendorst", "daily-papers"], arxiv: ["cs.CL"] },
  { keywords: ["agent", "agentic", "tool use", "multi-agent", "harness"], categories: ["ai-engineering"], sources: ["anthropic-engineering", "simon-willison", "latent-space"], arxiv: ["cs.AI", "cs.MA"] },
  { keywords: ["eval", "evaluation", "benchmark"], sources: ["hamel", "eugene-yan", "anthropic-engineering"] },
  { keywords: ["rag", "retrieval", "search", "embedding", "vector database", "recommend"], sources: ["eugene-yan", "pinterest"], arxiv: ["cs.IR"] },
  { keywords: ["fine-tun", "finetun", "rlhf", "post-training", "reinforcement learning", "rl "], sources: ["interconnects", "hamel", "huggingface"], arxiv: ["cs.LG"] },
  { keywords: ["interpretab", "alignment", "ai safety", "mechanistic"], sources: ["anthropic-research", "alignment-forum"], arxiv: ["cs.AI"] },
  { keywords: ["diffusion", "image generation", "computer vision", "vision", "video generation", "3d reconstruction", "gaussian splatting", "nerf"], categories: ["research"], arxiv: ["cs.CV", "cs.GR"] },
  { keywords: ["research", "paper", "arxiv", "academic", "state of the art", "sota"], categories: ["research"], arxiv: ["cs.AI", "cs.LG", "cs.CL"] },
  { keywords: ["machine learning", "deep learning", "neural network", "ml ", "pytorch", "training"], categories: ["research"], sources: ["fastai", "karpathy", "pytorch", "raschka"], arxiv: ["cs.LG", "stat.ML"] },
  { keywords: ["ai news", "openai", "gemini", "deepmind", "ai lab", "frontier model"], categories: ["ai-labs"] },
  { keywords: ["robot", "embodied"], arxiv: ["cs.RO"] },
  { keywords: ["coding agent", "code generation", "software engineering research"], arxiv: ["cs.SE"], sources: ["simon-willison"] },
  { keywords: ["game dev", "gamedev", "game development", "make games", "making games", "indie game", "game design", "first game", "game jam"], categories: ["gamedev-learn", "gamedev-engines"], sources: ["game-developer", "factorio-fff"], track: "gamedev" },
  { keywords: ["godot"], sources: ["godot", "gamefromscratch"], track: "csharp" },
  { keywords: ["unity"], sources: ["unity"], track: "csharp" },
  { keywords: ["unreal"], sources: ["unreal"], track: "cpp" },
  { keywords: ["bevy", "ecs", "entity component"], sources: ["bevy"], categories: ["rust"], track: "rust" },
  { keywords: ["shader", "rendering", "graphics", "gpu", "vulkan", "opengl", "webgpu", "directx"], categories: ["graphics"], arxiv: ["cs.GR"] },
  { keywords: ["netcode", "multiplayer", "networking", "physics engine", "game math", "pathfinding", "procedural"], sources: ["gaffer-on-games", "red-blob-games"] },
  { keywords: ["game industry", "game business", "steam", "marketing", "wishlist", "launch"], categories: ["gamedev-industry"], sources: ["how-to-market-a-game"] },
  { keywords: ["devlog", "postmortem"], categories: ["game-devlogs"], sources: ["game-developer"] },
  { keywords: ["rust", "borrow checker", "ownership", "cargo", "tokio"], categories: ["rust"], track: "rust" },
  { keywords: ["c++", "cpp"], sources: ["isocpp", "modernes-cpp", "herb-sutter"], track: "cpp" },
  { keywords: ["c#", "csharp", ".net", "dotnet"], sources: ["dotnet"], track: "csharp" },
  { keywords: ["golang", " go ", "go lang"], sources: ["go-blog"], track: "go" },
  { keywords: ["typescript", "javascript"], sources: ["typescript"], track: "typescript" },
  { keywords: ["python"], sources: ["real-python", "python-blog"], track: "python" },
  { keywords: ["zig"], sources: ["zig-news", "matklad", "tigerbeetle"] },
  { keywords: ["system design", "distributed", "microservice", "scalab", "architecture", "kafka", "database", "infrastructure", "cloud", "backend", "interview"], categories: ["system-design"] },
  { keywords: ["career", "engineering management", "industry", "staff engineer"], categories: ["software-eng"] },
  { keywords: ["hacker news", "tech news", "what's new in tech"], categories: ["tech-news"] },
];

/**
 * Keyword match with a word boundary at the start (so "search" doesn't hit "research").
 * Keywords are prefix stems ("scalab" matches "scalability") unless they are short
 * (<= 3 chars) or end with a space, which then require a boundary at the end too.
 */
export function hasKeyword(text: string, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return false;
  const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const end = keyword.endsWith(" ") || kw.length <= 3 ? "(?![a-z0-9])" : "";
  return new RegExp(`(?<![a-z0-9])${esc}${end}`, "i").test(text);
}

// ── Learning tracks ───────────────────────────────────────────────────────────
export interface Track {
  label: string;
  topics: string[];
  /** Catalog source ids added when the track is chosen */
  sources: string[];
  /** Where to start */
  starter: { title: string; url: string }[];
}

export const TRACKS: Record<string, Track> = {
  rust: {
    label: "Rust",
    topics: [
      "Ownership & Borrowing — the borrow checker, moves, stack vs heap",
      "Lifetimes — annotations, elision rules, why they exist",
      "Error Handling — Result<T,E>, Option<T>, the ? operator, thiserror/anyhow",
      "Structs, Enums & Pattern Matching — ADTs, exhaustive match",
      "Traits & Generics — trait objects vs monomorphization",
      "Iterators & Closures — lazy adapters, Fn/FnMut/FnOnce",
      "Smart Pointers — Box, Rc, Arc, RefCell, interior mutability",
      "Modules & Crates — workspaces, visibility, publishing",
      "Concurrency — threads, Send/Sync, channels, Mutex",
      "Async / Await — futures, Tokio, pinning",
      "Unsafe Rust & FFI — raw pointers, when and why",
      "Game Dev with Bevy — ECS, systems, queries, plugins",
    ],
    sources: ["this-week-in-rust", "rust-blog", "fasterthanlime", "corrode", "bevy"],
    starter: [
      { title: "The Rust Book", url: "https://doc.rust-lang.org/book/" },
      { title: "Rustlings (exercises)", url: "https://github.com/rust-lang/rustlings" },
      { title: "Bevy Quick Start", url: "https://bevy.org/learn/quick-start/introduction/" },
    ],
  },
  gamedev: {
    label: "Game Dev Foundations (for experienced devs)",
    topics: [
      "The Game Loop — fixed vs variable timestep, delta time",
      "Pick an Engine — Godot vs Bevy vs Unity vs Unreal tradeoffs",
      "Scene Graphs & ECS — composition over inheritance in games",
      "Game Math — vectors, dot/cross products, transforms, quaternions",
      "Input & Game Feel — juice, coyote time, input buffering",
      "Collision & Physics — AABB, raycasts, rigidbodies",
      "2D Rendering — sprites, tilemaps, cameras, animation",
      "Game AI — state machines, behaviour trees, pathfinding (A*)",
      "Audio — SFX, music, mixing",
      "UI & Menus — HUDs, save/load, settings",
      "Shaders 101 — vertex/fragment shaders, post-processing",
      "Ship It — game jams, scoping, Steam page, itch.io release",
    ],
    sources: ["gamefromscratch", "red-blob-games", "gaffer-on-games", "godot", "how-to-market-a-game"],
    starter: [
      { title: "Godot: Your first 2D game", url: "https://docs.godotengine.org/en/stable/getting_started/first_2d_game/index.html" },
      { title: "Game Programming Patterns (free book)", url: "https://gameprogrammingpatterns.com/" },
      { title: "Red Blob Games: A* introduction", url: "https://www.redblobgames.com/pathfinding/a-star/introduction.html" },
      { title: "Fix Your Timestep! (Gaffer On Games)", url: "https://gafferongames.com/post/fix_your_timestep/" },
    ],
  },
  cpp: {
    label: "Modern C++",
    topics: [
      "RAII & Object Lifetime — constructors, destructors, rule of 0/3/5",
      "Value Categories & Move Semantics — lvalues, rvalues, std::move",
      "Smart Pointers — unique_ptr, shared_ptr, weak_ptr",
      "Templates & Concepts — generic programming, C++20 concepts",
      "STL Containers & Algorithms — vector, unordered_map, ranges",
      "Undefined Behaviour — the common traps and sanitizers",
      "Build Systems — CMake, package managers (vcpkg/Conan)",
      "Concurrency — std::thread, atomics, memory order",
      "Data-Oriented Design — cache-friendly layouts for games",
      "Unreal C++ — UObjects, reflection macros, gameplay framework",
    ],
    sources: ["isocpp", "modernes-cpp", "herb-sutter", "unreal"],
    starter: [
      { title: "learncpp.com", url: "https://www.learncpp.com/" },
      { title: "C++ Core Guidelines", url: "https://isocpp.github.io/CppCoreGuidelines/" },
    ],
  },
  csharp: {
    label: "C# (Godot / Unity)",
    topics: [
      "Types — value vs reference types, structs, records",
      "Properties, Events & Delegates",
      "LINQ — query syntax, deferred execution",
      "Generics & Interfaces",
      "async/await & Tasks",
      "Memory & GC — allocations, Span<T>, avoiding GC spikes in games",
      "Godot C# — nodes, signals, exported properties",
      "Unity C# — MonoBehaviour lifecycle, ScriptableObjects, coroutines",
    ],
    sources: ["dotnet", "godot", "unity"],
    starter: [
      { title: "C# tour (Microsoft Learn)", url: "https://learn.microsoft.com/en-us/dotnet/csharp/tour-of-csharp/" },
      { title: "Godot C# basics", url: "https://docs.godotengine.org/en/stable/tutorials/scripting/c_sharp/c_sharp_basics.html" },
    ],
  },
  go: {
    label: "Go",
    topics: [
      "Goroutines & Channels — CSP model, select",
      "Interfaces — implicit satisfaction, composition",
      "Error Handling — errors.Is, errors.As, wrapping",
      "Context — cancellation, deadlines, propagation",
      "Generics — type parameters, constraints",
      "Memory Model — happens-before, sync primitives",
      "Profiling — pprof, trace, benchmarks",
      "Modules — go.mod, versioning, workspaces",
    ],
    sources: ["go-blog"],
    starter: [
      { title: "A Tour of Go", url: "https://go.dev/tour/" },
      { title: "Effective Go", url: "https://go.dev/doc/effective_go" },
    ],
  },
  typescript: {
    label: "TypeScript",
    topics: [
      "Type System Fundamentals — unions, intersections, narrowing",
      "Generics — constraints, conditional types, infer",
      "Utility & Mapped Types — Partial, Pick, Record, key remapping",
      "Discriminated Unions & Exhaustiveness",
      "Template Literal Types",
      "tsconfig Deep Dive — strict, module resolution",
      "Runtime Validation — Zod, schema-first APIs",
      "Declaration Files & Module Augmentation",
    ],
    sources: ["typescript"],
    starter: [
      { title: "TypeScript Handbook", url: "https://www.typescriptlang.org/docs/handbook/intro.html" },
      { title: "Type Challenges", url: "https://github.com/type-challenges/type-challenges" },
    ],
  },
  python: {
    label: "Python",
    topics: [
      "Data Model — dunder methods, iterators, generators",
      "Typing — type hints, Protocols, mypy/pyright",
      "Decorators & Context Managers",
      "asyncio — event loop, tasks, async iterators",
      "Packaging — uv, pyproject.toml, virtual envs",
      "NumPy & Vectorization",
      "PyTorch Basics — tensors, autograd, training loop",
      "Testing — pytest, fixtures, property-based testing",
    ],
    sources: ["real-python", "python-blog"],
    starter: [
      { title: "Python Tutorial (official)", url: "https://docs.python.org/3/tutorial/" },
      { title: "Real Python", url: "https://realpython.com/" },
    ],
  },
};
