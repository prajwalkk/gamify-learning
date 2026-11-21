// npm run verify-feeds — live-checks every Learning Quest feed with the production fetcher.
// Exit code 1 on failures. arXiv shows WKND on weekends (it publishes nothing then).
import { FEEDS, QuestFeed } from "../quest/feeds.js";
import { fetchRss, scrapeLinks } from "../fetcher.js";

async function check(f: QuestFeed): Promise<string> {
  const t0 = Date.now();
  try {
    const items = f.linkPattern ? await scrapeLinks(f.url, f.linkPattern, { retries: 1 }) : await fetchRss(f.url, { retries: 1, timeoutMs: 20000 });
    const newest = Math.max(0, ...items.map((i) => i.date ?? 0));
    const age = newest ? Math.round((Date.now() - newest) / 864e5) : undefined;
    if (!items.length && f.id.startsWith("arxiv") && [0, 6].includes(new Date().getUTCDay())) return `WKND     0 items  ${f.id}`;
    const flag = !items.length ? "EMPTY" : age !== undefined && age > 365 ? "STALE" : "ok";
    return `${flag.padEnd(5)} ${String(items.length).padStart(4)} items  newest ${age === undefined ? "  n/a" : `${String(age).padStart(4)}d`}  ${String(Date.now() - t0).padStart(5)}ms  ${f.id}`;
  } catch (e) {
    return `FAIL  ${f.id} — ${(e as Error).message.split("\n")[0]}`;
  }
}

async function main() {
  const ids = new Set<string>();
  const dupes = FEEDS.filter((f) => (ids.has(f.id) ? true : (ids.add(f.id), false)));
  const lines = await Promise.all(FEEDS.map(check));
  lines.sort().forEach((l) => console.log(l));
  const failed = lines.filter((l) => /^(FAIL|EMPTY)/.test(l)).length;
  console.log(`\n${FEEDS.length} feeds: ${FEEDS.length - failed} working, ${failed} failing`);
  dupes.forEach((f) => console.log(`CATALOG: duplicate id ${f.id}`));
  process.exit(failed || dupes.length ? 1 : 0);
}

main();
