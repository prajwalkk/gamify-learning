import Parser from "rss-parser";

// Robust feed fetching: our own fetch (hard timeout via AbortController, retries with
// backoff, browser-ish headers), XML sanitizing for real-world broken feeds, feed
// auto-discovery from HTML pages, and an HTML link-scraper for sites with no feed.

const UA = "Mozilla/5.0 (compatible; gamify-learning/0.3; RSS reader)";
const parser = new Parser();

export interface RawItem {
  guid: string;
  title: string;
  link: string;
  summary: string;
  date?: number; // epoch ms, undefined if the source gives none
}

export interface FetchOptions {
  timeoutMs?: number;
  retries?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchText(url: string, opts: FetchOptions = {}): Promise<{ text: string; finalUrl: string }> {
  const timeoutMs = opts.timeoutMs ?? 12000;
  const retries = opts.retries ?? 2;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: ctrl.signal,
        headers: {
          "User-Agent": UA,
          Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/html;q=0.8, */*;q=0.5",
        },
      });
      if (res.ok) return { text: await res.text(), finalUrl: res.url || url };
      lastErr = new Error(`HTTP ${res.status}`);
      // 4xx (other than rate limiting) won't fix itself on retry
      if (res.status !== 429 && res.status < 500) break;
    } catch (e) {
      lastErr = ctrl.signal.aborted ? new Error(`timed out after ${timeoutMs}ms`) : e;
    } finally {
      clearTimeout(timer);
    }
    if (attempt < retries) await sleep(1000 * 2 ** attempt);
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/** Fix the common ways real feeds are malformed: BOM/junk before the XML, bare ampersands. */
export function sanitizeXml(xml: string): string {
  let s = xml.replace(/^﻿/, "");
  const start = s.indexOf("<");
  if (start > 0) s = s.slice(start);
  return s.replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]{1,31}|#\d{1,7}|#x[0-9a-fA-F]{1,6});)/g, "&amp;");
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
}

export function stripHtml(s: string): string {
  return decodeEntities(
    s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(...candidates: (string | undefined)[]): number | undefined {
  for (const c of candidates) {
    if (!c) continue;
    const t = Date.parse(c);
    if (!isNaN(t)) return t;
  }
  return undefined;
}

function looksLikeHtml(text: string): boolean {
  const head = text.slice(0, 2000).toLowerCase();
  return head.includes("<!doctype html") || head.includes("<html");
}

async function parseXml(xml: string) {
  try {
    return await parser.parseString(xml);
  } catch {
    return await parser.parseString(sanitizeXml(xml));
  }
}

function toItems(feed: Awaited<ReturnType<typeof parseXml>>): RawItem[] {
  const out: RawItem[] = [];
  for (const item of feed.items ?? []) {
    const raw = item.contentSnippet ?? item.summary ?? item.content ?? "";
    // arXiv RSS: drop re-announcements of old papers, strip the boilerplate prefix
    if (/Announce Type:\s*replace/i.test(raw)) continue;
    const summary = stripHtml(raw).replace(/^arXiv:\S+\s+Announce Type:\s*\S+\s*Abstract:\s*/i, "");
    const link = item.link ?? "";
    const title = stripHtml(item.title ?? "") || "(untitled)";
    out.push({
      guid: item.guid || link || title,
      title,
      link,
      summary: summary.slice(0, 400),
      date: parseDate(item.isoDate, item.pubDate),
    });
  }
  return out;
}

export async function fetchRss(url: string, opts: FetchOptions = {}): Promise<RawItem[]> {
  const { text } = await fetchText(url, opts);
  if (looksLikeHtml(text)) throw new Error("got an HTML page, not a feed");
  return toItems(await parseXml(text));
}

/** Find <link rel="alternate" type="application/rss+xml|atom+xml"> feeds on an HTML page. */
export function discoverFeedLinks(html: string, baseUrl: string): { url: string; title?: string }[] {
  const out: { url: string; title?: string }[] = [];
  const tagRe = /<link\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html))) {
    const tag = m[0];
    if (!/rel=["']?alternate/i.test(tag) || !/type=["']?application\/(rss|atom)\+xml/i.test(tag)) continue;
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    try {
      out.push({ url: new URL(decodeEntities(href), baseUrl).toString(), title: tag.match(/title=["']([^"']+)["']/i)?.[1] });
    } catch {
      /* ignore bad href */
    }
  }
  return out;
}

/**
 * Resolve whatever URL a user pastes (blog homepage, feed URL) to a working feed.
 * Tries: the URL itself as a feed → <link rel=alternate> discovery → common feed paths.
 */
export async function resolveFeed(url: string): Promise<{ feedUrl: string; title?: string; items: RawItem[] }> {
  const { text, finalUrl } = await fetchText(url, { retries: 1 });
  if (!looksLikeHtml(text)) {
    const feed = await parseXml(text);
    return { feedUrl: finalUrl, title: feed.title, items: toItems(feed) };
  }
  const candidates = discoverFeedLinks(text, finalUrl).map((c) => c.url);
  const base = new URL(finalUrl);
  for (const p of ["/feed", "/rss.xml", "/feed.xml", "/atom.xml", "/index.xml", "/rss", "/feed/"]) {
    candidates.push(new URL(p, base.origin + base.pathname.replace(/\/?$/, "/")).toString());
    candidates.push(new URL(p, base.origin).toString());
  }
  for (const c of [...new Set(candidates)]) {
    try {
      const { text: t, finalUrl: f } = await fetchText(c, { retries: 0, timeoutMs: 8000 });
      if (looksLikeHtml(t)) continue;
      const feed = await parseXml(t);
      if ((feed.items ?? []).length > 0) return { feedUrl: f, title: feed.title, items: toItems(feed) };
    } catch {
      /* try next candidate */
    }
  }
  throw new Error("no RSS/Atom feed found on that page");
}

/**
 * For sites with no feed: collect article links whose absolute URL matches `linkPattern`.
 * Titles come from the link's heading, image alt text, or first text chunk. Pages that
 * render their lists from embedded JSON are covered by also scanning raw URL strings.
 */
export async function scrapeLinks(
  url: string,
  linkPattern: string,
  opts: FetchOptions & { exclude?: string } = {}
): Promise<RawItem[]> {
  const { text: html, finalUrl } = await fetchText(url, opts);
  const re = new RegExp(linkPattern);
  const ex = opts.exclude ? new RegExp(opts.exclude) : undefined;
  const self = finalUrl.replace(/\/$/, "");
  const found = new Map<string, string>(); // url -> best title

  const accept = (href: string): string | undefined => {
    try {
      const abs = new URL(decodeEntities(href), finalUrl);
      abs.hash = "";
      abs.search = "";
      const s = abs.toString().replace(/\/$/, "");
      if (s === self || !re.test(s) || (ex && ex.test(s))) return undefined;
      return s;
    } catch {
      return undefined;
    }
  };

  const anchor = /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchor.exec(html))) {
    const abs = accept(m[1]);
    if (!abs) continue;
    const inner = m[2];
    const heading = inner.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1];
    const alt = inner.match(/<img[^>]*alt="([^"]{6,})"/i)?.[1];
    const firstChunk = inner
      .split(/<\/(?:p|div|span|time|h\d)>|<br\s*\/?>/i)
      .map(stripHtml)
      .find((t) => t.length >= 8 && !/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/.test(t));
    const title = stripHtml(heading ?? "") || (alt ? decodeEntities(alt) : "") || firstChunk || "";
    const prev = found.get(abs);
    // Prefer heading-derived titles; otherwise keep the first reasonable one
    if (!prev || (heading && title)) found.set(abs, title.slice(0, 200));
  }

  // Raw scan for links embedded in JSON / script payloads
  const rawRe = /(?:https?:\/\/[a-z0-9.-]+)?\/[a-z0-9][a-z0-9_\/-]{3,}/gi;
  for (const r of html.match(rawRe) ?? []) {
    const abs = accept(r);
    if (abs && !found.has(abs)) found.set(abs, "");
  }

  return [...found.entries()].map(([link, title]) => ({
    guid: link,
    link,
    title: title || slugTitle(link),
    summary: "",
  }));
}

function slugTitle(link: string): string {
  const slug = link.split("/").pop() ?? link;
  const t = slug.replace(/[-_]+/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}
