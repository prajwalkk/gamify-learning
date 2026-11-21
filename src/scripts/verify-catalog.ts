// npm run verify-feeds — live-checks every catalog source with the production fetcher,
// and checks that every id referenced by hints/tracks exists. Exit code 1 on problems.
import { SOURCES, ARXIV, arxivSource, TOPIC_HINTS, TRACKS, getSource, CATEGORIES, Source } from "../catalog.js";
import { fetchRss, scrapeLinks, RawItem } from "../fetcher.js";

async function check(s: Source): Promise<string> {
  const t0 = Date.now();
  try {
    const items: RawItem[] =
      s.kind === "html" ? await scrapeLinks(s.url, s.linkPattern!, { exclude: s.exclude, retries: 1 }) : await fetchRss(s.url, { retries: 1, timeoutMs: 20000 });
    const newest = Math.max(0, ...items.map((i) => i.date ?? 0));
    const age = newest ? Math.round((Date.now() - newest) / 864e5) : undefined;
    const weekend = [0, 6].includes(new Date().getUTCDay());
    if (items.length === 0 && s.id.startsWith("arxiv:") && weekend) {
      return `WKND     0 items  (arXiv publishes nothing on weekends)                 ${s.id}`;
    }
    const flag = items.length === 0 ? "EMPTY" : age !== undefined && age > 180 && !s.archive ? "STALE" : "ok";
    return `${flag.padEnd(5)} ${String(items.length).padStart(4)} items  newest ${age === undefined ? "  n/a" : `${String(age).padStart(4)}d`}  ${String(Date.now() - t0).padStart(5)}ms  ${s.id}`;
  } catch (e) {
    return `FAIL  ${s.id} — ${(e as Error).message.split("\n")[0]}`;
  }
}

async function main() {
  const problems: string[] = [];
  for (const h of TOPIC_HINTS) {
    h.sources?.forEach((id) => !getSource(id) && problems.push(`hint references unknown source '${id}'`));
    h.categories?.forEach((c) => !CATEGORIES[c] && problems.push(`hint references unknown category '${c}'`));
    h.arxiv?.forEach((a) => !ARXIV[a] && problems.push(`hint references unknown arXiv '${a}'`));
    if (h.track && !TRACKS[h.track]) problems.push(`hint references unknown track '${h.track}'`);
  }
  for (const [id, t] of Object.entries(TRACKS)) t.sources.forEach((s) => !getSource(s) && problems.push(`track ${id} references unknown source '${s}'`));
  const ids = new Set<string>();
  for (const s of SOURCES) {
    if (ids.has(s.id)) problems.push(`duplicate source id '${s.id}'`);
    ids.add(s.id);
    s.categories.forEach((c) => !CATEGORIES[c] && problems.push(`${s.id} has unknown category '${c}'`));
  }

  const all = [...SOURCES, ...Object.keys(ARXIV).map((c) => arxivSource(c)!)];
  const lines: string[] = new Array(all.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      while (next < all.length) {
        const i = next++;
        lines[i] = await check(all[i]);
      }
    })
  );
  lines.sort().forEach((l) => console.log(l));
  const failed = lines.filter((l) => /^(FAIL|EMPTY)/.test(l)).length;
  console.log(`\n${all.length} sources: ${all.length - failed} working, ${failed} failing`);
  problems.forEach((p) => console.log(`CATALOG: ${p}`));
  process.exit(failed || problems.length ? 1 : 0);
}

main();
