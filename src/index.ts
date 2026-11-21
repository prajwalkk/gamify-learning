import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v3";
import { loadConfig } from "./config.js";
import { logLearning, logLearningSchema, getEntries, getEntriesSchema } from "./tools/learning.js";
import { addGoal, addGoalSchema, completeGoal, completeGoalSchema, getGoals } from "./tools/goals.js";
import { getDashboard, getLeaderboard } from "./tools/gamification.js";
import {
  getFeeds, getFeedsSchema, markArticleRead, markReadSchema, addFeed, addFeedSchema,
  watchPage, watchPageSchema, removeFeed, removeFeedSchema, listFeeds, checkFeeds, checkFeedsSchema,
  followTopic, followTopicSchema,
} from "./tools/feeds.js";
import { getCategories, suggestFeeds, suggestFeedsSchema, setupInterests, setupInterestsSchema } from "./tools/onboard.js";
import { getLanguageTrack, setLanguageTrack, setLanguageTrackSchema } from "./tools/language.js";

const cfg = loadConfig();
const VERSION = "0.3.0";

const server = new McpServer(
  { name: "gamify-learning", version: VERSION },
  {
    instructions: [
      `Gamified learning companion for ${cfg.username}. Learning notes and daily notes are written to their Obsidian vault.`,
      "First run: if the user has no feeds (get_categories → onboarded: false), offer a short, conversational onboarding:",
      "ask what they want to learn in their own words, call suggest_feeds with those words, confirm picks, ask about any extra topics or blogs,",
      "then setup_interests. Unmatched topics → follow_topic; blog URLs → add_feed (auto-discovers RSS).",
      "Daily use: get_dashboard + get_feeds for a reading list; when they finish an article, mark_article_read; when they explain something they learned, log_learning (tags matter for tracks).",
      "Keep feed lists short and readable: title, source, one-line why. Never dump raw JSON at the user.",
    ].join(" "),
  }
);

type Handler<A> = (input: A) => Promise<unknown>;
const json = (v: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(v, null, 2) }] });
const noArgs = z.object({});

function tool<S extends z.AnyZodObject>(name: string, description: string, schema: S, fn: Handler<z.infer<S>>) {
  // Generic schemas defeat the SDK's callback inference; inputs are validated by the SDK anyway.
  const cb = async (input: z.infer<S>) => {
    try {
      return json(await fn(input));
    } catch (e) {
      return { ...json({ error: (e as Error).message }), isError: true };
    }
  };
  server.registerTool(name, { description, inputSchema: schema }, cb as never);
}

// ── Learning & goals ──────────────────────────────────────────────────────────
tool("log_learning", "Log something learned — earns XP and writes a note to the Obsidian vault", logLearningSchema, (i) => logLearning(cfg, i));
tool("get_entries", "Recent learning log entries", getEntriesSchema, (i) => getEntries(cfg, i));
tool("add_goal", "Add a learning goal for today", addGoalSchema, (i) => addGoal(cfg, i));
tool("complete_goal", "Mark a goal done (+10 XP)", completeGoalSchema, (i) => completeGoal(cfg, i));
tool("get_goals", "Today's goals; refreshes the Obsidian daily note", noArgs, () => getGoals(cfg));

// ── Gamification ──────────────────────────────────────────────────────────────
tool("get_dashboard", "XP, level, streak, today's goals and progress", noArgs, () => getDashboard(cfg));
tool("get_stats", "Full stats: XP, level, streak, articles read, total entries", noArgs, () => getLeaderboard(cfg));

// ── Reading ───────────────────────────────────────────────────────────────────
tool("get_feeds", "Reading list from subscribed feeds: newest first, capped per source, articles on followed topics ranked up. Filter by category, source, keyword, or days.", getFeedsSchema, (i) => getFeeds(cfg, i));
tool("mark_article_read", "Mark an article read (+5 XP)", markReadSchema, (i) => markArticleRead(cfg, i));
tool("add_feed", "Subscribe to a blog — accepts a feed URL or just the homepage (RSS is auto-discovered and tested before saving)", addFeedSchema, (i) => addFeed(cfg, i));
tool("watch_page", "Follow a site that has no RSS by scraping article links from a listing page", watchPageSchema, (i) => watchPage(cfg, i));
tool("follow_topic", "Follow any free-text topic: adds Hacker News + arXiv searches for it and highlights matching articles across all feeds", followTopicSchema, (i) => followTopic(cfg, i));
tool("remove_feed", "Unsubscribe from a source, custom feed, or followed topic", removeFeedSchema, (i) => removeFeed(cfg, i));
tool("list_feeds", "List subscriptions with their last known health (no network)", noArgs, () => listFeeds(cfg));
tool("check_feeds", "Live health check of every subscribed feed; optionally drop ones that are broken", checkFeedsSchema, (i) => checkFeeds(cfg, i));

// ── Onboarding ────────────────────────────────────────────────────────────────
tool("get_categories", "The full catalog (categories, sources with blurbs, arXiv subcategories, learning tracks) plus how to run onboarding", noArgs, () => getCategories(cfg));
tool("suggest_feeds", "Turn the user's free-text interests into suggested categories, sources, arXiv feeds, tracks, and topics to follow", suggestFeedsSchema, (i) => suggestFeeds(cfg, i));
tool("setup_interests", "Apply onboarding choices: categories, individual sources, arXiv subcategories, free-text topics, learning track", setupInterestsSchema, (i) => setupInterests(cfg, i));

// ── Learning tracks ───────────────────────────────────────────────────────────
tool("get_language_track", "Roadmap and progress for the current learning track (Rust, game dev, C++, C#, Go, TS, Python)", noArgs, () => getLanguageTrack(cfg));
tool("set_language_track", "Choose a learning track — adds its feeds and starter resources", setLanguageTrackSchema, (i) => setLanguageTrack(cfg, i));

async function main() {
  await server.connect(new StdioServerTransport());
  console.error(`gamify-learning MCP v${VERSION} running for ${cfg.username}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
