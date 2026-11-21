import { z } from "zod/v3";
import { Config, saveConfig } from "../config.js";
import { CATEGORIES, ARXIV, TRACKS, TOPIC_HINTS, getSource, sourcesInCategory, hasKeyword, Source } from "../catalog.js";
import { followTopic } from "./feeds.js";

const brief = (s: Source) => ({
  id: s.id,
  name: s.name,
  blurb: s.blurb,
  beginner: s.beginner || undefined,
  archive: s.archive || undefined,
});

export async function getCategories(cfg: Config) {
  return {
    onboarded: cfg.sources.length + cfg.customFeeds.length > 0,
    categories: Object.entries(CATEGORIES).map(([id, c]) => ({
      id,
      label: c.label,
      description: c.description,
      sources: sourcesInCategory(id).map(brief),
    })),
    arxivSubcategories: Object.entries(ARXIV).map(([code, a]) => ({ id: code, label: a.label, description: a.description })),
    tracks: Object.entries(TRACKS).map(([id, t]) => ({ id, label: t.label, topics: t.topics.length })),
    howToOnboard: [
      "1. Ask what they want to learn, in their own words. Mention a few category labels as examples, not a form.",
      "2. Call suggest_feeds with their exact words.",
      "3. Present the matches grouped (with blurbs). Point out beginner picks if they said they're new to something.",
      "4. Ask if there's anything else (niche topics, specific blogs). Topics not in the catalog become follow_topic entries; blog URLs go to add_feed.",
      "5. Call setup_interests with the confirmed categories/sources/arxiv/topics/track, then show get_feeds.",
    ],
  };
}

// ── suggest_feeds ────────────────────────────────────────────────────────────

export const suggestFeedsSchema = z.object({
  interests: z.string().describe("The user's own description of what they want to learn, e.g. 'new to game dev, LLM agents, Rust, system design interviews'"),
});

export async function suggestFeeds(_cfg: Config, input: z.infer<typeof suggestFeedsSchema>) {
  const text = ` ${input.interests.toLowerCase()} `;
  const wantsBeginner = /\b(new to|beginner|getting started|start(ing)?|learn(ing)? (to|how)|first)\b/.test(text);

  const phrases = input.interests
    .split(/[,;\n/]|\band\b|\balso\b|\bplus\b/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 1);

  const cats = new Set<string>();
  const srcs = new Set<string>();
  const arxiv = new Set<string>();
  const tracks = new Set<string>();
  const unmatched: string[] = [];

  const apply = (chunk: string) => {
    let hit = false;
    for (const h of TOPIC_HINTS) {
      if (h.keywords.some((k) => hasKeyword(chunk, k))) {
        hit = true;
        h.categories?.forEach((c) => cats.add(c));
        h.sources?.forEach((s) => getSource(s) && srcs.add(s));
        h.arxiv?.forEach((a) => arxiv.add(a));
        if (h.track) tracks.add(h.track);
      }
    }
    return hit;
  };

  for (const p of phrases) if (!apply(p)) unmatched.push(p);
  apply(text); // catch keywords spanning phrase boundaries

  const categorySuggestions = [...cats].map((id) => {
    const all = sourcesInCategory(id);
    const ordered = wantsBeginner ? [...all].sort((a, b) => Number(!!b.beginner) - Number(!!a.beginner)) : all;
    return { id, label: CATEGORIES[id].label, sources: ordered.map(brief) };
  });
  const inSuggestedCats = new Set(categorySuggestions.flatMap((c) => c.sources.map((s) => s.id)));

  return {
    categories: categorySuggestions,
    extraSources: [...srcs].filter((id) => !inSuggestedCats.has(id)).map((id) => brief(getSource(id)!)),
    arxiv: [...arxiv].map((code) => ({ id: code, label: ARXIV[code].label, description: ARXIV[code].description, note: "raw paper feed, ~20–400 papers/day; daily-papers is the gentler option" })),
    tracks: [...tracks].map((id) => ({ id, label: TRACKS[id].label })),
    followTopicCandidates: unmatched.length ? unmatched : undefined,
    guidance:
      (unmatched.length
        ? `Not in the catalog: ${unmatched.map((u) => `"${u}"`).join(", ")}. Offer to follow these as topics (HN + arXiv search + highlighting). `
        : "") +
      (wantsBeginner ? "User sounds new to some of this — lead with beginner: true sources. " : "") +
      "Confirm with the user, then call setup_interests.",
  };
}

// ── setup_interests ──────────────────────────────────────────────────────────

export const setupInterestsSchema = z.object({
  categories: z.array(z.string()).default([]).describe("Category ids — subscribes to every source in them"),
  sources: z.array(z.string()).default([]).describe("Individual source ids, for cherry-picking"),
  excludeSources: z.array(z.string()).default([]).describe("Source ids to skip even if their category is selected"),
  arxivSubcategories: z.array(z.string()).default([]).describe("arXiv codes like cs.CL, cs.GR"),
  topics: z.array(z.string()).default([]).describe("Free-text topics to follow (HN + arXiv search + highlighting)"),
  languageTrack: z.string().optional().describe("Learning track id: rust, gamedev, cpp, csharp, go, typescript, python"),
  replace: z.boolean().default(false).describe("Start over: clear existing catalog subscriptions first (custom feeds are kept)"),
});

export async function setupInterests(cfg: Config, input: z.infer<typeof setupInterestsSchema>) {
  if (input.replace) {
    cfg.sources = [];
    cfg.interests = [];
  }
  const wanted = new Set(cfg.sources);
  const unknown: string[] = [];

  for (const c of input.categories) {
    if (!CATEGORIES[c]) { unknown.push(c); continue; }
    sourcesInCategory(c).forEach((s) => wanted.add(s.id));
    if (!cfg.interests.includes(c)) cfg.interests.push(c);
  }
  for (const id of input.sources) (getSource(id) ? wanted.add(id) : unknown.push(id));
  for (const code of input.arxivSubcategories) (ARXIV[code] ? wanted.add(`arxiv:${code}`) : unknown.push(code));

  if (input.languageTrack) {
    const t = TRACKS[input.languageTrack];
    if (t) {
      cfg.languageTrack = input.languageTrack;
      t.sources.forEach((s) => wanted.add(s));
    } else unknown.push(input.languageTrack);
  }
  input.excludeSources.forEach((s) => wanted.delete(s));

  const before = new Set(cfg.sources);
  cfg.sources = [...wanted];
  saveConfig(cfg);

  const followed: string[] = [];
  const notes: string[] = [];
  for (const topic of input.topics) {
    const r = await followTopic(cfg, { topic, papers: true, discussions: true, minPoints: 25 });
    followed.push(...r.added);
    notes.push(...(r.notes ?? []));
  }

  return {
    message: "You're set up!",
    added: cfg.sources.filter((s) => !before.has(s)).map((id) => getSource(id)?.name ?? id),
    totalSources: cfg.sources.length + cfg.customFeeds.length,
    topicsFollowed: followed.length ? followed : undefined,
    notes: notes.length ? notes : undefined,
    languageTrack: cfg.languageTrack,
    unknownIds: unknown.length ? unknown : undefined,
    nextStep: "Call get_feeds to show their first reading list" + (cfg.languageTrack ? ", and get_language_track for the roadmap." : "."),
  };
}
