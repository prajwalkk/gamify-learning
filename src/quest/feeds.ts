import fs from "fs";
import path from "path";
import { fetchRss, scrapeLinks, RawItem } from "../fetcher.js";
import { atomicWrite, questDir } from "./store.js";
import { daysBetween, parseDay } from "./dates.js";
import type { PickedReading, QuestState, TrackId } from "./types.js";

export type FeedRole = "reading" | "headlines";

export interface QuestFeed {
  id: string;
  name: string;
  url: string;
  group: string;
  track: TrackId | "news";
  role: FeedRole;
  /** Roughly how many items a week */
  volume: "low" | "medium" | "high";
  defaultOn: boolean;
  /** Curated daily paper feed: its day's paper wins, and each item's subject decides its track */
  curated?: boolean;
  /** Feed has no RSS: scrape article links matching this pattern from its page */
  linkPattern?: string;
}

// Every URL here was checked with the production fetcher; `npm run verify-feeds` re-checks.
export const FEEDS: QuestFeed[] = [
  // Curated papers (stands in for Fanout until its feed URL is known)
  { id: "daily-papers", name: "Daily AI Papers (Hugging Face trending, TL;DR)", url: "https://papers.takara.ai/api/feed", group: "Curated papers", track: "ml", role: "reading", volume: "high", defaultOn: true, curated: true },
  // AI dev
  { id: "claude-dev", name: "claude.dev", url: "https://claude.dev/rss.xml", group: "AI dev", track: "ai-dev", role: "reading", volume: "low", defaultOn: true },
  { id: "anthropic-engineering", name: "Anthropic Engineering", url: "https://www.anthropic.com/engineering", group: "AI dev", track: "ai-dev", role: "reading", volume: "low", defaultOn: true, linkPattern: "^https://www\\.anthropic\\.com/(engineering|research)/[a-z0-9-]+$" },
  { id: "openai-engineering", name: "OpenAI Engineering", url: "https://openai.com/news/engineering/rss.xml", group: "AI dev", track: "ai-dev", role: "reading", volume: "low", defaultOn: true },
  { id: "simon-willison", name: "Simon Willison", url: "https://simonwillison.net/atom/everything/", group: "AI dev", track: "ai-dev", role: "reading", volume: "high", defaultOn: true },
  { id: "latent-space", name: "Latent Space", url: "https://www.latent.space/feed", group: "AI dev", track: "ai-dev", role: "reading", volume: "medium", defaultOn: true },
  // Languages
  { id: "this-week-in-rust", name: "This Week in Rust", url: "https://this-week-in-rust.org/rss.xml", group: "Languages", track: "languages", role: "reading", volume: "low", defaultOn: false },
  { id: "rust-blog", name: "Rust Blog", url: "https://blog.rust-lang.org/feed.xml", group: "Languages", track: "languages", role: "reading", volume: "low", defaultOn: false },
  { id: "go-blog", name: "Go Blog", url: "https://go.dev/blog/feed.atom", group: "Languages", track: "languages", role: "reading", volume: "low", defaultOn: false },
  { id: "python-blog", name: "Python Insider", url: "https://blog.python.org/feeds/posts/default", group: "Languages", track: "languages", role: "reading", volume: "medium", defaultOn: false },
  // ML explainers
  { id: "lilian-weng", name: "Lil'Log (Lilian Weng)", url: "https://lilianweng.github.io/index.xml", group: "ML explainers", track: "ml", role: "reading", volume: "low", defaultOn: true },
  { id: "ahead-of-ai", name: "Ahead of AI (Sebastian Raschka)", url: "https://magazine.sebastianraschka.com/feed", group: "ML explainers", track: "ml", role: "reading", volume: "low", defaultOn: true },
  { id: "chip-huyen", name: "Chip Huyen", url: "https://huyenchip.com/feed.xml", group: "ML explainers", track: "ml", role: "reading", volume: "low", defaultOn: true },
  // ML labs
  { id: "huggingface", name: "Hugging Face Blog", url: "https://huggingface.co/blog/feed.xml", group: "ML labs", track: "ml", role: "reading", volume: "high", defaultOn: true },
  { id: "google-research", name: "Google Research", url: "https://research.google/blog/rss/", group: "ML labs", track: "ml", role: "reading", volume: "medium", defaultOn: true },
  { id: "bair", name: "Berkeley AI Research (BAIR)", url: "https://bair.berkeley.edu/blog/feed.xml", group: "ML labs", track: "ml", role: "reading", volume: "low", defaultOn: true },
  { id: "interconnects", name: "Interconnects (Nathan Lambert)", url: "https://www.interconnects.ai/feed", group: "ML labs", track: "ml", role: "reading", volume: "low", defaultOn: true },
  // arXiv (firehoses: off by default)
  { id: "arxiv-cs-lg", name: "arXiv cs.LG", url: "https://rss.arxiv.org/rss/cs.LG", group: "arXiv", track: "ml", role: "reading", volume: "high", defaultOn: false },
  { id: "arxiv-cs-cl", name: "arXiv cs.CL", url: "https://rss.arxiv.org/rss/cs.CL", group: "arXiv", track: "ml", role: "reading", volume: "high", defaultOn: false },
  { id: "arxiv-cs-ai", name: "arXiv cs.AI", url: "https://rss.arxiv.org/rss/cs.AI", group: "arXiv", track: "ai-dev", role: "reading", volume: "high", defaultOn: false },
  { id: "arxiv-cs-dc", name: "arXiv cs.DC", url: "https://rss.arxiv.org/rss/cs.DC", group: "arXiv", track: "system-design", role: "reading", volume: "medium", defaultOn: false },
  { id: "arxiv-cs-db", name: "arXiv cs.DB", url: "https://rss.arxiv.org/rss/cs.DB", group: "arXiv", track: "system-design", role: "reading", volume: "medium", defaultOn: false },
  // System design, production
  { id: "bytebytego", name: "ByteByteGo", url: "https://blog.bytebytego.com/feed", group: "System design, production", track: "system-design", role: "reading", volume: "medium", defaultOn: true },
  { id: "pragmatic-engineer", name: "The Pragmatic Engineer", url: "https://newsletter.pragmaticengineer.com/feed", group: "System design, production", track: "system-design", role: "reading", volume: "medium", defaultOn: true },
  { id: "cloudflare", name: "Cloudflare Blog", url: "https://blog.cloudflare.com/rss/", group: "System design, production", track: "system-design", role: "reading", volume: "medium", defaultOn: true },
  { id: "netflix", name: "Netflix Tech Blog", url: "https://netflixtechblog.com/feed", group: "System design, production", track: "system-design", role: "reading", volume: "low", defaultOn: true },
  { id: "aws-architecture", name: "AWS Architecture Blog", url: "https://aws.amazon.com/blogs/architecture/feed/", group: "System design, production", track: "system-design", role: "reading", volume: "high", defaultOn: false },
  { id: "werner-vogels", name: "All Things Distributed (Werner Vogels)", url: "https://www.allthingsdistributed.com/atom.xml", group: "System design, production", track: "system-design", role: "reading", volume: "low", defaultOn: true },
  // System design, internals
  { id: "kleppmann", name: "Martin Kleppmann", url: "https://feeds.feedburner.com/martinkl?format=xml", group: "System design, internals", track: "system-design", role: "reading", volume: "low", defaultOn: true },
  { id: "julia-evans", name: "Julia Evans", url: "https://jvns.ca/atom.xml", group: "System design, internals", track: "system-design", role: "reading", volume: "low", defaultOn: true },
  { id: "dan-luu", name: "Dan Luu", url: "https://danluu.com/atom.xml", group: "System design, internals", track: "system-design", role: "reading", volume: "low", defaultOn: true },
  { id: "lemire", name: "Daniel Lemire", url: "https://lemire.me/blog/feed/", group: "System design, internals", track: "system-design", role: "reading", volume: "medium", defaultOn: true },
  { id: "bendersky", name: "Eli Bendersky", url: "https://eli.thegreenplace.net/feeds/all.atom.xml", group: "System design, internals", track: "system-design", role: "reading", volume: "low", defaultOn: true },
  // News, headlines only
  { id: "hacker-news", name: "Hacker News (300+ points)", url: "https://hnrss.org/frontpage?points=300", group: "News", track: "news", role: "headlines", volume: "medium", defaultOn: true },
  { id: "lobsters", name: "Lobsters", url: "https://lobste.rs/rss", group: "News", track: "news", role: "headlines", volume: "high", defaultOn: true },
  { id: "ars-technica", name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", group: "News", track: "news", role: "headlines", volume: "high", defaultOn: false },
];

export const feedById = (id: string) => FEEDS.find((f) => f.id === id);
export const defaultFeeds = () => FEEDS.filter((f) => f.defaultOn).map((f) => f.id);

// ── News cache: Learning/.quest/news.json ───────────────────────────────────

export interface NewsItem {
  title: string;
  url: string;
  date?: string; // ISO
  summary?: string;
}

export interface NewsCache {
  fetchedAt: string;
  /** The feed selection this cache was fetched for */
  selection: string;
  feeds: Record<string, { ok: boolean; error?: string; items: NewsItem[] }>;
}

export const CACHE_HOURS = 20;
export const ITEMS_PER_FEED = 30;
const newsPath = (root: string) => path.join(questDir(root), "news.json");
const selectionKey = (ids: string[]) => [...ids].sort().join(",");

export function loadNews(root: string): NewsCache | undefined {
  try {
    return JSON.parse(fs.readFileSync(newsPath(root), "utf-8"));
  } catch {
    return undefined;
  }
}

export function newsStatus(state: QuestState, news: NewsCache | undefined): { stale: boolean; fetchedAt?: string; reason?: string } {
  if (!news) return { stale: true, reason: "never fetched" };
  if (news.selection !== selectionKey(state.feeds)) return { stale: true, fetchedAt: news.fetchedAt, reason: "feed selection changed" };
  const hours = (Date.now() - Date.parse(news.fetchedAt)) / 36e5;
  return hours > CACHE_HOURS ? { stale: true, fetchedAt: news.fetchedAt, reason: `${Math.round(hours)}h old` } : { stale: false, fetchedAt: news.fetchedAt };
}

const toNews = (i: RawItem): NewsItem => ({
  title: i.title,
  url: i.link,
  date: i.date ? new Date(i.date).toISOString() : undefined,
  summary: i.summary ? i.summary.slice(0, 280) : undefined,
});

/** Fetch every selected feed in parallel (10s each at most). Keeps the last good items of a feed that fails. */
export async function refreshNews(root: string, state: QuestState): Promise<{ ok: number; failed: { feed: string; error: string }[] }> {
  const prev = loadNews(root);
  const feeds = state.feeds.map(feedById).filter((f): f is QuestFeed => !!f);
  const results = await Promise.all(
    feeds.map(async (f) => {
      try {
        const raw = f.linkPattern ? await scrapeLinks(f.url, f.linkPattern, { timeoutMs: 10000, retries: 0 }) : await fetchRss(f.url, { timeoutMs: 10000, retries: 0 });
        const items = raw.filter((i) => i.link).map(toNews);
        items.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
        return [f.id, { ok: true, items: items.slice(0, ITEMS_PER_FEED) } as { ok: boolean; error?: string; items: NewsItem[] }] as const;
      } catch (e) {
        return [f.id, { ok: false, error: (e as Error).message.split("\n")[0], items: prev?.feeds[f.id]?.items ?? [] } as { ok: boolean; error?: string; items: NewsItem[] }] as const;
      }
    })
  );
  const cache: NewsCache = { fetchedAt: new Date().toISOString(), selection: selectionKey(state.feeds), feeds: Object.fromEntries(results) };
  atomicWrite(newsPath(root), JSON.stringify(cache) + "\n");
  return {
    ok: results.filter(([, r]) => r.ok).length,
    failed: results.filter(([, r]) => !r.ok).map(([id, r]) => ({ feed: feedById(id)!.name, error: r.error ?? "failed" })),
  };
}

// ── Picking ──────────────────────────────────────────────────────────────────

const TRACK_WORDS: [TrackId, RegExp][] = [
  ["ai-dev", /\b(agent|agents|agentic|tool[- ]use|coding assistant|code generation|software engineering|prompt|rag|retrieval-augmented|llm app|benchmark for (llm|agent)s?)\b/i],
  ["system-design", /\b(distributed|serving|inference system|throughput|latency|database|storage|kv[- ]cache|scheduling|cluster|systems?)\b/i],
];

/** A curated paper's track comes from its title (summaries mention too much); anything else is ML. */
export function inferTrack(item: NewsItem): TrackId {
  const text = item.title;
  for (const [track, re] of TRACK_WORDS) if (re.test(text)) return track;
  return "ml";
}

/**
 * Today's reading for `track`: unread reading-role items only. A curated feed's paper
 * from the last day wins; otherwise take each feed's newest unread item and rotate
 * between feeds by date, so one busy feed doesn't win every day.
 */
export function pickReading(state: QuestState, news: NewsCache | undefined, track: TrackId, day: string): PickedReading | undefined {
  if (!news) return undefined;
  const read = new Set(state.readingsDone);
  const selected = state.feeds.map(feedById).filter((f): f is QuestFeed => !!f && f.role === "reading");

  const dayMs = parseDay(day).getTime();
  for (const f of selected.filter((f) => f.curated)) {
    const fresh = (news.feeds[f.id]?.items ?? []).find(
      (i) => !read.has(i.url) && inferTrack(i) === track && i.date && dayMs - Date.parse(i.date) < 1.5 * 864e5
    );
    if (fresh) return { title: fresh.title, url: fresh.url, source: f.name, feedId: f.id, track, summary: fresh.summary, pickedBy: "curated" };
  }

  const candidates = selected
    .filter((f) => !f.curated && f.track === track)
    .map((f) => ({ f, item: (news.feeds[f.id]?.items ?? []).find((i) => !read.has(i.url)) }))
    .filter((c): c is { f: QuestFeed; item: NewsItem } => !!c.item)
    .sort((a, b) => a.f.id.localeCompare(b.f.id));
  if (!candidates.length) return undefined;
  const turn = Math.abs(daysBetween("2026-01-01", day)) % candidates.length;
  const { f, item } = candidates[turn]!;
  return { title: item.title, url: item.url, source: f.name, feedId: f.id, track, summary: item.summary, pickedBy: "rotation" };
}

/** Up to `max` headlines: headline-only feeds first, at most 2 per source, newest first within each. */
export function pickHeadlines(state: QuestState, news: NewsCache | undefined, max = 5): { title: string; url: string; source: string }[] {
  if (!news) return [];
  const selected = state.feeds.map(feedById).filter((f): f is QuestFeed => !!f);
  const ordered = [...selected.filter((f) => f.role === "headlines"), ...selected.filter((f) => f.role === "reading" && !f.curated)];
  const out: { title: string; url: string; source: string }[] = [];
  const skip = new Set([...state.readingsDone, ...Object.values(state.picks).map((p) => p.url)]);
  for (const f of ordered) {
    for (const i of (news.feeds[f.id]?.items ?? []).filter((i) => !skip.has(i.url)).slice(0, 2)) {
      if (out.length >= max) return out;
      out.push({ title: i.title, url: i.url, source: f.name });
    }
  }
  return out;
}
