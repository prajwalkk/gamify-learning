import fs from "fs";
import path from "path";
import { Config, PROJECT_ROOT } from "./config.js";
import { getSource, Source } from "./catalog.js";
import { fetchRss, scrapeLinks, RawItem } from "./fetcher.js";

export interface CachedItem extends RawItem {
  firstSeen: number;
}

interface SourceCache {
  items: CachedItem[];
  fetchedAt: number; // last attempt
  lastOkAt?: number;
  lastError?: string;
  failCount: number;
}

export interface SourceResult {
  source: Source;
  items: CachedItem[];
  fromCache: boolean;
  error?: string;
  lastOkAt?: number;
  /** Still loading in the background (time budget ran out) */
  pending?: boolean;
}

const CACHE_DIR = path.join(PROJECT_ROOT, ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "feeds.json");
const MAX_ITEMS_PER_SOURCE = 150;
const MIN_RETRY_MS = 5 * 60 * 1000;
const CONCURRENCY = 8;
const RETAIN_DAYS = 30;

let cache: Record<string, SourceCache> | undefined;

function loadCache(): Record<string, SourceCache> {
  if (cache) return cache;
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
  } catch {
    cache = {};
  }
  return cache!;
}

function saveCache() {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache ?? {}));
  } catch {
    /* cache is best-effort */
  }
}

/** All sources the user is subscribed to: catalog ids + custom feeds. */
export function configuredSources(cfg: Config): { sources: Source[]; unknownIds: string[] } {
  const sources: Source[] = [];
  const unknownIds: string[] = [];
  for (const id of cfg.sources) {
    const s = getSource(id);
    if (s) sources.push(s);
    else unknownIds.push(id);
  }
  for (const c of cfg.customFeeds) {
    sources.push({
      id: c.id,
      name: c.name,
      url: c.url,
      kind: c.kind,
      linkPattern: c.linkPattern,
      categories: c.categories,
      blurb: c.topic ? `Followed topic: ${c.topic}` : "Custom feed",
      ttlMinutes: c.ttlMinutes,
    });
  }
  return { sources, unknownIds };
}

async function fetchOne(src: Source, url: string): Promise<RawItem[]> {
  if (src.kind === "html" && url === src.url) {
    if (!src.linkPattern) throw new Error("html source missing linkPattern");
    return scrapeLinks(url, src.linkPattern, { exclude: src.exclude });
  }
  // arXiv's API is slow and asks for one request every 3s: queue those, never retry a 429
  if (url.includes("export.arxiv.org/api")) {
    return arxivQueue(() => fetchRss(url, { timeoutMs: 25000, retries: 0 }));
  }
  return fetchRss(url, { timeoutMs: 12000, retries: 2 });
}

let arxivChain: Promise<unknown> = Promise.resolve();
function arxivQueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = arxivChain.then(fn, fn);
  arxivChain = run.then(
    () => new Promise((r) => setTimeout(r, 3000)),
    () => new Promise((r) => setTimeout(r, 3000))
  );
  return run;
}

/** Main URL first; fallbacks only if it errors or comes back empty. */
async function fetchItems(src: Source, haveCached: boolean): Promise<RawItem[]> {
  let primaryErr: unknown;
  try {
    const items = await fetchOne(src, src.url);
    // Empty-but-valid with a cache in hand (e.g. arXiv on weekends): keep the cache, skip fallbacks
    if (items.length > 0 || haveCached || !src.fallbackUrls?.length) return items;
  } catch (e) {
    primaryErr = e;
  }
  for (const fb of src.fallbackUrls ?? []) {
    try {
      const items = await fetchOne(src, fb);
      if (items.length > 0) return items;
    } catch {
      /* next fallback */
    }
  }
  if (primaryErr) throw primaryErr;
  return [];
}

const inFlight = new Map<string, Promise<SourceResult>>();

/** Fetch (or reuse the cache for) one source. Concurrent calls for the same source share one request. */
export function loadSource(src: Source, force = false): Promise<SourceResult> {
  const running = inFlight.get(src.id);
  if (running) return running;
  const p = loadSourceUncached(src, force).finally(() => inFlight.delete(src.id));
  inFlight.set(src.id, p);
  return p;
}

async function loadSourceUncached(src: Source, force: boolean): Promise<SourceResult> {
  const c = loadCache();
  const entry = c[src.id];
  const now = Date.now();
  const ttl = (src.ttlMinutes ?? 30) * 60 * 1000;

  if (entry && !force) {
    const fresh = !entry.lastError && now - entry.fetchedAt < ttl;
    const backingOff = entry.lastError && now - entry.fetchedAt < Math.min(ttl, MIN_RETRY_MS * 2 ** Math.min(entry.failCount - 1, 4));
    if (fresh || backingOff) {
      return { source: src, items: entry.items, fromCache: true, error: entry.lastError, lastOkAt: entry.lastOkAt };
    }
  }

  try {
    const raw = await fetchItems(src, (entry?.items.length ?? 0) > 0);
    const prevSeen = new Map((entry?.items ?? []).map((i) => [i.guid, i.firstSeen]));
    const seen = new Set<string>();
    const items: CachedItem[] = [];
    for (const [idx, r] of raw.entries()) {
      if (seen.has(r.guid)) continue;
      seen.add(r.guid);
      // Undated items (scraped pages) seen on the very first fetch are backlog, not news:
      // place them a week back, keeping page order (newest first).
      const firstSeen = prevSeen.get(r.guid) ?? (entry?.lastOkAt || r.date ? now : now - 7 * 864e5 - idx * 36e5);
      items.push({ ...r, firstSeen });
      if (items.length >= MAX_ITEMS_PER_SOURCE) break;
    }
    // Merge, don't replace: items that rolled off the feed (or a temporarily empty feed)
    // stay readable for a while instead of vanishing from the reading list.
    const keepAfter = now - RETAIN_DAYS * 864e5;
    for (const old of entry?.items ?? []) {
      if (items.length >= MAX_ITEMS_PER_SOURCE) break;
      if (!seen.has(old.guid) && (old.date ?? old.firstSeen) > keepAfter) {
        seen.add(old.guid);
        items.push(old);
      }
    }
    c[src.id] = { items, fetchedAt: now, lastOkAt: now, failCount: 0 };
    return { source: src, items, fromCache: false, lastOkAt: now };
  } catch (e) {
    const msg = e instanceof Error ? e.message.split("\n")[0] : String(e);
    c[src.id] = {
      items: entry?.items ?? [],
      fetchedAt: now,
      lastOkAt: entry?.lastOkAt,
      lastError: msg,
      failCount: (entry?.failCount ?? 0) + 1,
    };
    return { source: src, items: entry?.items ?? [], fromCache: true, error: msg, lastOkAt: entry?.lastOkAt };
  }
}

/**
 * Load many sources with a concurrency limit. With `budgetMs`, returns once the budget is
 * spent: slow sources keep loading in the background (their results land in the cache for
 * the next call) and are reported with `pending: true` using whatever is cached now.
 */
export async function loadSources(sources: Source[], force = false, budgetMs?: number): Promise<SourceResult[]> {
  const results: (SourceResult | undefined)[] = new Array(sources.length);
  let next = 0;
  const worker = async () => {
    while (next < sources.length) {
      const i = next++;
      results[i] = await loadSource(sources[i], force);
    }
  };
  const all = Promise.all(Array.from({ length: Math.min(CONCURRENCY, sources.length) }, worker)).then(saveCache);
  if (budgetMs === undefined) {
    await all;
  } else {
    let timer: NodeJS.Timeout | undefined;
    await Promise.race([all, new Promise<void>((r) => (timer = setTimeout(r, budgetMs)))]);
    clearTimeout(timer);
    saveCache();
  }
  const c = loadCache();
  return sources.map((src, i) => {
    const done = results[i];
    if (done) return done;
    const e = c[src.id];
    return { source: src, items: e?.items ?? [], fromCache: true, pending: true, error: e?.lastError, lastOkAt: e?.lastOkAt };
  });
}

/** Look up a cached item by guid across all sources (for mark_article_read). */
export function findCachedItem(guid: string): { item: CachedItem; sourceId: string } | undefined {
  const c = loadCache();
  for (const [sourceId, entry] of Object.entries(c)) {
    const item = entry.items.find((i) => i.guid === guid || i.link === guid);
    if (item) return { item, sourceId };
  }
  return undefined;
}

export function cachedHealth(sourceId: string): Omit<SourceCache, "items"> & { itemCount: number } | undefined {
  const e = loadCache()[sourceId];
  if (!e) return undefined;
  return { fetchedAt: e.fetchedAt, lastOkAt: e.lastOkAt, lastError: e.lastError, failCount: e.failCount, itemCount: e.items.length };
}

/** Effective date for sorting: published date, or when we first saw it (scraped pages). */
export function itemDate(i: CachedItem): number {
  return i.date ?? i.firstSeen;
}
