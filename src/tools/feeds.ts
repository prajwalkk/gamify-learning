import { z } from "zod/v3";
import { Config, saveConfig, slug, CustomFeed } from "../config.js";
import { loadState, saveState, addXp } from "../state.js";
import { findSourceByUrl, getSource, hasKeyword } from "../catalog.js";
import { resolveFeed, fetchRss, scrapeLinks } from "../fetcher.js";
import { configuredSources, loadSources, findCachedItem, cachedHealth, itemDate, CachedItem } from "../feed-engine.js";

const DAY = 864e5;
const isoDay = (t?: number) => (t ? new Date(t).toISOString().slice(0, 10) : undefined);

function topicMatches(text: string, topics: string[]): string[] {
  return topics.filter((k) => hasKeyword(text, k));
}

// ── get_feeds ────────────────────────────────────────────────────────────────

export const getFeedsSchema = z.object({
  category: z.string().optional().describe("Only this category id (e.g. research, gamedev-learn, claude, system-design)"),
  source: z.string().optional().describe("Only this source id (e.g. bytebytego, arxiv:cs.CL)"),
  query: z.string().optional().describe("Keyword filter on title/summary, e.g. 'diffusion' or 'netcode'"),
  days: z.number().optional().describe("Only items from the last N days"),
  limit: z.number().default(15).describe("Max articles to return"),
  perSource: z.number().default(2).describe("Max articles from any single source (keeps arXiv from flooding)"),
  includeRead: z.boolean().default(false).describe("Include articles already marked read"),
  refresh: z.boolean().default(false).describe("Ignore the cache and refetch now"),
});

export async function getFeeds(cfg: Config, input: z.infer<typeof getFeedsSchema>) {
  let { sources } = configuredSources(cfg);
  if (sources.length === 0) {
    return { articles: [], message: "No feeds yet. Ask me to onboard you (get_categories → suggest_feeds → setup_interests), or add_feed a blog URL." };
  }
  if (input.source) sources = sources.filter((s) => s.id === input.source);
  if (input.category) sources = sources.filter((s) => s.categories.includes(input.category!));
  if (sources.length === 0) {
    return { articles: [], message: `None of your feeds match ${input.source ? `source '${input.source}'` : `category '${input.category}'`}.` };
  }

  // Answer within ~8s; anything slower finishes in the background for next time
  const results = await loadSources(sources, input.refresh, 8000);
  const state = loadState(cfg.vaultPath, cfg.username);
  const read = new Set(state.readArticles.map((r) => r.guid));
  const cutoff = input.days ? Date.now() - input.days * DAY : 0;
  const q = input.query?.toLowerCase();

  type Cand = { item: CachedItem; src: (typeof results)[number]["source"]; matches: string[]; score: number };
  const seenLinks = new Set<string>();
  const perSource: Cand[][] = results.map((r) => {
    const out: Cand[] = [];
    for (const item of r.items) {
      if (!input.includeRead && read.has(item.guid)) continue;
      if (itemDate(item) < cutoff) continue;
      const text = `${item.title} ${item.summary}`;
      if (q && !text.toLowerCase().includes(q)) continue;
      const key = item.link || item.guid;
      if (seenLinks.has(key)) continue; // same post via two sources
      seenLinks.add(key);
      const matches = topicMatches(text, cfg.topics);
      // Followed topics give a ranking boost worth ~3 days of recency each
      out.push({ item, src: r.source, matches, score: itemDate(item) + matches.length * 3 * DAY });
    }
    return out.sort((a, b) => b.score - a.score).slice(0, input.perSource);
  });

  const articles = perSource
    .flat()
    .sort((a, b) => b.score - a.score)
    .slice(0, input.limit)
    .map(({ item, src, matches }) => ({
      guid: item.guid,
      title: item.title,
      link: item.link,
      source: src.name,
      sourceId: src.id,
      date: isoDay(item.date) ?? "undated",
      summary: item.summary ? item.summary.slice(0, 220) + (item.summary.length > 220 ? "…" : "") : undefined,
      matchesYourTopics: matches.length ? matches : undefined,
      read: read.has(item.guid) || undefined,
    }));

  const failing = results
    .filter((r) => r.error && !r.pending)
    .map((r) => ({
      source: r.source.name,
      error: r.error,
      showing: r.items.length ? `cached copy from ${isoDay(r.lastOkAt) ?? "earlier"}` : "nothing (never fetched successfully)",
    }));

  const pending = results.filter((r) => r.pending).map((r) => r.source.name);
  return {
    articles,
    sourcesChecked: results.length,
    stillLoading: pending.length ? `${pending.join(", ")} — still loading in the background; ask again in a minute to include them` : undefined,
    failing: failing.length ? failing : undefined,
    hint: articles.length === 0 ? "Nothing new matches — try includeRead, a wider days window, or another category." : "Use mark_article_read with the guid after reading (+5 XP).",
  };
}

// ── mark_article_read ────────────────────────────────────────────────────────

export const markReadSchema = z.object({
  guid: z.string().describe("Article guid (or link) from get_feeds"),
  title: z.string().optional().describe("Article title (looked up automatically if omitted)"),
  feedName: z.string().optional().describe("Source name (looked up automatically if omitted)"),
});

export async function markArticleRead(cfg: Config, input: z.infer<typeof markReadSchema>) {
  let state = loadState(cfg.vaultPath, cfg.username);
  const hit = findCachedItem(input.guid);
  if (!hit && !input.title) {
    return { message: "I don't recognize that article — pass the guid exactly as get_feeds returned it, or include its title to log an article from elsewhere." };
  }
  const guid = hit?.item.guid ?? input.guid;
  if (state.readArticles.some((r) => r.guid === guid)) return { message: "Already marked as read." };

  state.readArticles.push({
    guid,
    title: input.title ?? hit?.item.title ?? guid,
    feedName: input.feedName ?? (hit ? getSource(hit.sourceId)?.name ?? hit.sourceId : "unknown"),
    readAt: new Date().toISOString(),
  });
  const XP = 5;
  state = addXp(state, XP);
  saveState(cfg.vaultPath, state);
  return { message: `Read! +${XP} XP`, xp: state.xp, level: state.level, totalRead: state.readArticles.length };
}

// ── add_feed / remove_feed / list_feeds / check_feeds ────────────────────────

export const addFeedSchema = z.object({
  url: z.string().url().describe("A feed URL or just the blog's homepage — the feed is auto-discovered"),
  name: z.string().optional().describe("Display name (defaults to the feed's title)"),
  categories: z.array(z.string()).default(["custom"]).describe("Category ids to file it under"),
});

export async function addFeed(cfg: Config, input: z.infer<typeof addFeedSchema>) {
  const known = findSourceByUrl(input.url);
  if (known) {
    if (cfg.sources.includes(known.id)) return { message: `Already subscribed to ${known.name}.` };
    cfg.sources.push(known.id);
    saveConfig(cfg);
    return { message: `Added ${known.name} from the catalog.`, sourceId: known.id };
  }

  let resolved;
  try {
    resolved = await resolveFeed(input.url);
  } catch (e) {
    return { message: `Couldn't add it: ${(e as Error).message}. If the site has no RSS, ask me to watch the page instead (I can scrape article links).`, added: false };
  }
  const knownAfter = findSourceByUrl(resolved.feedUrl);
  if (knownAfter && !cfg.sources.includes(knownAfter.id)) {
    cfg.sources.push(knownAfter.id);
    saveConfig(cfg);
    return { message: `Found ${knownAfter.name} (already in the catalog) — subscribed.`, sourceId: knownAfter.id };
  }
  if (cfg.customFeeds.some((f) => f.url === resolved.feedUrl) || knownAfter) {
    return { message: "You already follow that feed." };
  }
  const name = input.name ?? resolved.title?.trim() ?? new URL(resolved.feedUrl).hostname;
  const feed: CustomFeed = { id: `custom:${slug(name)}`, name, url: resolved.feedUrl, categories: input.categories };
  cfg.customFeeds.push(feed);
  saveConfig(cfg);
  return {
    message: `Added '${name}'.`,
    sourceId: feed.id,
    feedUrl: resolved.feedUrl,
    latest: resolved.items.slice(0, 3).map((i) => i.title),
  };
}

export const watchPageSchema = z.object({
  url: z.string().url().describe("Listing page with article links, e.g. https://example.com/blog"),
  linkPattern: z.string().describe("Regex the article URLs must match, e.g. '^https://example\\.com/blog/[a-z0-9-]+$'"),
  name: z.string().describe("Display name"),
  categories: z.array(z.string()).default(["custom"]),
});

export async function watchPage(cfg: Config, input: z.infer<typeof watchPageSchema>) {
  let items;
  try {
    items = await scrapeLinks(input.url, input.linkPattern);
  } catch (e) {
    return { added: false, message: `Couldn't load the page: ${(e as Error).message}` };
  }
  if (items.length === 0) {
    return { added: false, message: "No links matched that pattern — adjust linkPattern and try again." };
  }
  const feed: CustomFeed = { id: `custom:${slug(input.name)}`, name: input.name, url: input.url, kind: "html", linkPattern: input.linkPattern, categories: input.categories, ttlMinutes: 180 };
  cfg.customFeeds = cfg.customFeeds.filter((f) => f.id !== feed.id).concat(feed);
  saveConfig(cfg);
  return { added: true, sourceId: feed.id, matched: items.length, sample: items.slice(0, 5).map((i) => i.title) };
}

export const removeFeedSchema = z.object({
  id: z.string().describe("Source id, URL, name, or followed topic to remove"),
});

export async function removeFeed(cfg: Config, input: z.infer<typeof removeFeedSchema>) {
  const key = input.id.toLowerCase();
  const before = cfg.sources.length + cfg.customFeeds.length + cfg.topics.length;
  cfg.sources = cfg.sources.filter((id) => {
    const s = getSource(id);
    return !(id.toLowerCase() === key || s?.url.toLowerCase() === key || s?.name.toLowerCase() === key);
  });
  cfg.customFeeds = cfg.customFeeds.filter(
    (f) => ![f.id, f.url, f.name, f.topic ?? ""].map((x) => x.toLowerCase()).includes(key)
  );
  cfg.topics = cfg.topics.filter((t) => t.toLowerCase() !== key);
  const removed = before - (cfg.sources.length + cfg.customFeeds.length + cfg.topics.length);
  saveConfig(cfg);
  return { removed, message: removed ? `Removed ${removed} item(s).` : "Nothing matched — use list_feeds to see ids." };
}

export async function listFeeds(cfg: Config) {
  const { sources, unknownIds } = configuredSources(cfg);
  return {
    feeds: sources.map((s) => {
      const h = cachedHealth(s.id);
      return {
        id: s.id,
        name: s.name,
        categories: s.categories,
        status: !h ? "not fetched yet" : h.lastError ? `failing (${h.lastError})` : "ok",
        lastSuccess: isoDay(h?.lastOkAt),
      };
    }),
    topics: cfg.topics,
    unknownIds: unknownIds.length ? unknownIds : undefined,
    languageTrack: cfg.languageTrack,
  };
}

export const checkFeedsSchema = z.object({
  removeBroken: z.boolean().default(false).describe("Unsubscribe from feeds that fail right now and have no successful fetch in 14 days"),
});

export async function checkFeeds(cfg: Config, input: z.infer<typeof checkFeedsSchema>) {
  const { sources } = configuredSources(cfg);
  const results = await loadSources(sources, true, 45000);
  const report = results.map((r) => {
    const newest = Math.max(0, ...r.items.map((i) => i.date ?? 0));
    const stale = newest > 0 && Date.now() - newest > 180 * DAY && !r.source.archive;
    return {
      id: r.source.id,
      name: r.source.name,
      ok: !r.error && !r.pending,
      pending: r.pending || undefined,
      items: r.items.length,
      newest: isoDay(newest || undefined),
      error: r.error,
      note: r.source.archive ? "archive (not updated, classic backlog)" : stale ? "no new posts in 6+ months" : undefined,
    };
  });
  let removed: string[] = [];
  if (input.removeBroken) {
    const broken = results.filter((r) => r.error && !r.pending && (!r.lastOkAt || Date.now() - r.lastOkAt > 14 * DAY)).map((r) => r.source.id);
    cfg.sources = cfg.sources.filter((id) => !broken.includes(id));
    cfg.customFeeds = cfg.customFeeds.filter((f) => !broken.includes(f.id));
    removed = broken;
    saveConfig(cfg);
  }
  return {
    healthy: report.filter((r) => r.ok).length,
    failing: report.filter((r) => !r.ok),
    stale: report.filter((r) => r.ok && r.note?.startsWith("no new")),
    removed: removed.length ? removed : undefined,
    all: report,
  };
}

// ── follow_topic ─────────────────────────────────────────────────────────────

export const followTopicSchema = z.object({
  topic: z.string().describe("Anything the user wants to follow, e.g. 'gaussian splatting', 'roguelike design', 'CRDTs'"),
  papers: z.boolean().default(true).describe("Also follow new arXiv papers matching the topic"),
  discussions: z.boolean().default(true).describe("Also follow Hacker News posts about it"),
  minPoints: z.number().default(25).describe("Minimum HN points (filters noise)"),
});

export async function followTopic(cfg: Config, input: z.infer<typeof followTopicSchema>) {
  const topic = input.topic.trim();
  if (!cfg.topics.some((t) => t.toLowerCase() === topic.toLowerCase())) cfg.topics.push(topic);

  const added: string[] = [];
  const notes: string[] = [];
  const q = encodeURIComponent(topic.includes(" ") ? `"${topic}"` : topic);

  if (input.discussions) {
    const url = `https://hnrss.org/newest?q=${q}&points=${input.minPoints}`;
    // Always save it: hnrss has occasional 5xx blips, and failed feeds are retried with backoff
    upsertCustom(cfg, { id: `topic:hn:${slug(topic)}`, name: `HN: ${topic}`, url, categories: ["topics"], topic, ttlMinutes: 60 });
    try {
      const items = await fetchRss(url, { retries: 1, timeoutMs: 8000 });
      added.push(`Hacker News posts about "${topic}" (${items.length} recent)`);
    } catch (e) {
      added.push(`Hacker News posts about "${topic}"`);
      notes.push(`hnrss.org is erroring right now (${(e as Error).message}); it'll be retried automatically.`);
    }
  }
  if (input.papers) {
    // arXiv search API (Atom). It is rate-limited and slow, so it refreshes twice a day and
    // failures fall back to cache. Keyword matching on subscribed arXiv categories also applies.
    const url = `https://export.arxiv.org/api/query?search_query=all:${q}&sortBy=submittedDate&sortOrder=descending&max_results=25`;
    upsertCustom(cfg, { id: `topic:arxiv:${slug(topic)}`, name: `arXiv: ${topic}`, url, categories: ["research", "topics"], topic, ttlMinutes: 720 });
    added.push(`new arXiv papers mentioning "${topic}"`);
  }
  saveConfig(cfg);
  return {
    message: `Following "${topic}". Articles from any of your feeds that mention it are also ranked higher and flagged.`,
    added,
    notes: notes.length ? notes : undefined,
  };
}

function upsertCustom(cfg: Config, feed: CustomFeed) {
  cfg.customFeeds = cfg.customFeeds.filter((f) => f.id !== feed.id).concat(feed);
}
