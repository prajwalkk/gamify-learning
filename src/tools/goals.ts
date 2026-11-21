import { z } from "zod/v3";
import { loadState, saveState, addXp, Goal } from "../state.js";
import { writeDailyNote } from "../obsidian.js";
import { Config } from "../config.js";

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export const addGoalSchema = z.object({
  text: z.string().describe("The goal to add for today"),
});

export async function addGoal(cfg: Config, input: z.infer<typeof addGoalSchema>) {
  const state = loadState(cfg.vaultPath, cfg.username);
  const goal: Goal = {
    id: makeId(),
    text: input.text,
    done: false,
    createdAt: new Date().toISOString(),
  };
  state.goals.push(goal);
  saveState(cfg.vaultPath, state);
  return { message: `Goal added: "${input.text}"`, goalId: goal.id };
}

export const completeGoalSchema = z.object({
  goalId: z.string().optional().describe("Goal ID to mark done"),
  text: z.string().optional().describe("Or match by partial text"),
});

export async function completeGoal(cfg: Config, input: z.infer<typeof completeGoalSchema>) {
  let state = loadState(cfg.vaultPath, cfg.username);
  const goal = state.goals.find(
    (g) =>
      !g.done &&
      (g.id === input.goalId || (input.text && g.text.toLowerCase().includes(input.text.toLowerCase())))
  );
  if (!goal) return { message: "No matching incomplete goal found." };
  goal.done = true;
  state = addXp(state, 10);
  saveState(cfg.vaultPath, state);
  return { message: `Goal completed: "${goal.text}" +10 XP`, goalId: goal.id, xp: state.xp, level: state.level };
}

export async function getGoals(cfg: Config) {
  const state = loadState(cfg.vaultPath, cfg.username);
  const today = new Date().toISOString().slice(0, 10);
  const todayGoals = state.goals.filter((g) => g.createdAt.startsWith(today));

  const notePath = writeDailyNote(
    cfg.vaultPath,
    state.username,
    state.xp,
    state.level,
    state.streak,
    todayGoals,
    state.entries
  );

  return {
    goals: todayGoals,
    done: todayGoals.filter((g) => g.done).length,
    total: todayGoals.length,
    notePath,
  };
}
