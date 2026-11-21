import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v3";
import * as quest from "./quest/api.js";

export const VERSION = "1.0.1";

const server = new McpServer(
  { name: "learning-quest", version: VERSION },
  {
    instructions: [
      "Learning Quest: a calm daily learning habit, one sitting a day capped at 60 minutes (a 10-minute reading and a 50-minute goal block).",
      "Run the daily session with the learning-quest skill (/quest). If get_status says it isn't set up, onboard first.",
      "Coach rules: never plan past the daily cap; short messages, one step at a time; no extra reading lists or tangents;",
      "deadlines guide, they don't whip; honest numbers, said calmly; never run git; write only through these tools.",
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

tool("get_status", "Whether Learning Quest is set up, and which notes folder is in use", noArgs, () => quest.getStatus());
tool("set_notes_folder", "Save the notes folder (e.g. the Obsidian vault) to the shared config, so every app on this machine uses it", quest.setNotesFolderSchema, (i) => quest.setNotesFolder(i));
tool("list_library", "Starter goals: each with track, format, units and time estimates", noArgs, () => quest.listLibrary());
tool("onboard", "First-time setup: goals (library ids, in study order), daily cap and blocks, study days, track rotation, learning style, feeds, learning log and daily notes", quest.onboardSchema, (i) => quest.onboard(i));
tool("add_library_goal", "Add a goal from the starter library (check list_library first)", quest.addLibraryGoalSchema, (i) => quest.addLibraryGoal(i));
tool("add_goal", "Add a custom goal with ordered units and time estimates. Propose the units to the user and wait for their OK before calling this", quest.addGoalSchema, (i) => quest.addGoal(i));
tool("update_goal", "Change a goal: status, priority, deadline, note, or its units (edit, add, remove, mark done)", quest.updateGoalSchema, (i) => quest.updateGoal(i));
tool("get_today", "Today: study day or leave, track, the reading, the goal block, minutes left, risk, headlines, streak and level, tomorrow", quest.getTodaySchema, (i) => quest.getToday(i));
tool("get_board", "Goals with progress and projected finish dates, the next study days, leaves, recent sessions, totals", noArgs, () => quest.getBoard());
tool("log_session", "Record a sitting: minutes, reading, units finished, where they stopped, quiz score, what they learned, a summary. Awards XP and writes the notes", quest.logSessionSchema, (i) => quest.logSession(i));
tool("add_leave", "Add a leave (date range with no sessions); the plan and active deadlines shift", quest.addLeaveSchema, (i) => quest.addLeave(i));
tool("remove_leave", "Remove a leave by id or start date", quest.removeLeaveSchema, (i) => quest.removeLeave(i));
tool("list_feeds", "The feed catalog: each feed's track, role, volume and whether it's on", noArgs, () => quest.listFeeds());
tool("set_feeds", "Save the feed selection (only saves; fetch with refresh_news)", quest.setFeedsSchema, (i) => quest.setFeeds(i));
tool("refresh_news", "Fetch the selected feeds now (10s each at most) and update today's reading and headlines", noArgs, () => quest.refreshNewsTool());
tool("set_config", "Change settings: daily cap, reading/goal blocks, study days, track rotation, leave behavior, session time, learning style, notes paths", quest.setConfigSchema, (i) => quest.setConfig(i));

async function main() {
  await server.connect(new StdioServerTransport());
  console.error(`learning-quest MCP v${VERSION} ready`);
  // Every session: redraw the Quest Board, today's snapshot and daily-note section (and fetch stale news)
  quest.startupRefresh().catch((e) => console.error("learning-quest: startup refresh failed:", (e as Error).message));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
