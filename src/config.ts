import fs from "fs";
import path from "path";
import { findSourceByUrl } from "./catalog.js";

export interface CustomFeed {
  id: string;
  name: string;
  url: string;
  kind?: "rss" | "html";
  linkPattern?: string;
  categories: string[];
  /** Set when the feed was created by follow_topic */
  topic?: string;
  ttlMinutes?: number;
}

export interface Config {
  username: string;
  vaultPath: string;
  /** Catalog source ids (see catalog.ts), e.g. "bytebytego", "arxiv:cs.CL" */
  sources: string[];
  /** Feeds the user added that aren't in the catalog */
  customFeeds: CustomFeed[];
  /** Free-text topics the user follows; used to rank/flag articles */
  topics: string[];
  /** Category ids chosen during onboarding */
  interests: string[];
  languageTrack?: string;
}

// Resolve config next to the package (dist/../config.json), NOT process.cwd():
// Claude Desktop launches MCP servers from an arbitrary working directory.
export const PROJECT_ROOT = path.resolve(__dirname, "..");
const CONFIG_PATH = process.env.GAMIFY_CONFIG ?? path.join(PROJECT_ROOT, "config.json");

/** Accept Windows-style paths on WSL/Linux (E:\Obsidian -> /mnt/e/Obsidian) and vice versa. */
function normalizeVaultPath(p: string): string {
  const winDrive = p.match(/^([A-Za-z]):[\\/](.*)$/);
  if (process.platform !== "win32" && winDrive) {
    return path.posix.join("/mnt", winDrive[1].toLowerCase(), winDrive[2].replace(/\\/g, "/"));
  }
  if (process.platform === "win32") {
    const wsl = p.match(/^\/mnt\/([a-z])\/(.*)$/i);
    if (wsl) return `${wsl[1].toUpperCase()}:\\${wsl[2].replace(/\//g, "\\")}`;
  }
  return p.replace(/[\\/]/g, path.sep);
}

interface LegacyFeed {
  url: string;
  name: string;
  category?: string;
}

export function loadConfig(): Config {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(
      `config.json not found at ${CONFIG_PATH}. Copy config.example.json to config.json and set your vaultPath and username.`
    );
  }
  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as Partial<Config> & { feeds?: LegacyFeed[] };
  if (!raw.username || !raw.vaultPath) {
    throw new Error("config.json must have 'username' and 'vaultPath'.");
  }
  const cfg: Config = {
    username: raw.username,
    vaultPath: raw.vaultPath,
    sources: raw.sources ?? [],
    customFeeds: raw.customFeeds ?? [],
    topics: raw.topics ?? [],
    interests: raw.interests ?? [],
    languageTrack: raw.languageTrack || undefined,
  };

  // Migrate v0.2 configs ("feeds": [{url,name,category}]) to catalog ids
  if (Array.isArray(raw.feeds) && raw.feeds.length > 0) {
    for (const f of raw.feeds) {
      const known = findSourceByUrl(f.url);
      if (known) {
        if (!cfg.sources.includes(known.id)) cfg.sources.push(known.id);
      } else if (!cfg.customFeeds.some((c) => c.url === f.url)) {
        cfg.customFeeds.push({ id: `custom:${slug(f.name || f.url)}`, name: f.name, url: f.url, categories: [f.category ?? "custom"] });
      }
    }
    saveConfig(cfg);
  }

  cfg.vaultPath = normalizeVaultPath(cfg.vaultPath);
  return cfg;
}

export function saveConfig(cfg: Config): void {
  // Write the user's original vaultPath form back if we normalized it
  const onDisk = fs.existsSync(CONFIG_PATH) ? JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) : {};
  const out = { ...cfg, vaultPath: onDisk.vaultPath ?? cfg.vaultPath };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(out, null, 2) + "\n");
}

export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}
