import { z } from "zod/v3";
import { Config, saveConfig } from "../config.js";
import { loadState } from "../state.js";
import { TRACKS, getSource } from "../catalog.js";

export async function getLanguageTrack(cfg: Config) {
  const available = Object.entries(TRACKS).map(([id, t]) => ({ id, label: t.label }));
  if (!cfg.languageTrack) {
    return { message: "No learning track set yet. Pick one with set_language_track.", available };
  }
  const track = TRACKS[cfg.languageTrack];
  if (!track) return { message: `Unknown track '${cfg.languageTrack}'.`, available };

  const state = loadState(cfg.vaultPath, cfg.username);
  const tag = cfg.languageTrack.toLowerCase();
  const tagged = state.entries.filter((e) => e.tags.some((t) => t.toLowerCase() === tag));

  // A topic counts as touched if a tagged entry mentions any of its key terms
  const topics = track.topics.map((topic) => {
    const terms = topic
      .split("—")[0]
      .split(/[&,/]| and /)
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 2);
    const hits = tagged.filter((e) => {
      const hay = `${e.topic} ${e.content} ${e.tags.join(" ")}`.toLowerCase();
      return terms.some((t) => hay.includes(t));
    });
    return { topic, covered: hits.length > 0, entries: hits.length || undefined };
  });
  const covered = topics.filter((t) => t.covered).length;
  const nextUp = topics.find((t) => !t.covered)?.topic;

  return {
    track: track.label,
    progress: `${Math.round((covered / topics.length) * 100)}% (${covered}/${topics.length} topics)`,
    nextUp,
    topics,
    startHere: track.starter,
    feeds: track.sources.map((id) => getSource(id)?.name ?? id),
    tip: `Tag learning entries with '${tag}' so they count toward this roadmap.`,
  };
}

export const setLanguageTrackSchema = z.object({
  language: z.string().describe("Track id: rust, gamedev, cpp, csharp, go, typescript, python"),
});

export async function setLanguageTrack(cfg: Config, input: z.infer<typeof setLanguageTrackSchema>) {
  const id = input.language.toLowerCase().replace(/^c#$/, "csharp").replace(/^c\+\+$/, "cpp").replace(/^golang$/, "go");
  const track = TRACKS[id];
  if (!track) return { message: `Unknown track '${input.language}'.`, available: Object.keys(TRACKS) };

  cfg.languageTrack = id;
  const added = track.sources.filter((s) => !cfg.sources.includes(s));
  cfg.sources.push(...added);
  saveConfig(cfg);
  return {
    message: `Learning track set to ${track.label}.`,
    topics: track.topics.length,
    feedsAdded: added.map((s) => getSource(s)?.name ?? s),
    startHere: track.starter,
  };
}
