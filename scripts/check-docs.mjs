#!/usr/bin/env node
// Keeps docs/ in step with the code. Three rules:
//   R1  changes under src/ must come with a change under docs/
//   R2  every MCP tool registered in src/index.ts is documented in docs/features/*.md
//   R3  every docs/features/*.md page is linked from docs/README.md
//
// Modes:
//   node scripts/check-docs.mjs                 R2 + R3 (also: npm run check-docs)
//   node scripts/check-docs.mjs --stop          Claude Code Stop hook: R1-R3 on uncommitted work;
//                                               prints {"decision":"block"} so Claude goes back and writes docs
//   node scripts/check-docs.mjs --commit FILE   git commit-msg hook: R1-R3 on the staged change.
//                                               Put [no-docs] in the message for changes with no user-visible effect.
//   node scripts/check-docs.mjs --ack           Mark the current uncommitted src/ diff as "no docs needed"
//                                               (refactors, typo fixes) so the Stop hook stops asking about it
//   node scripts/check-docs.mjs --install-hooks Point git at .githooks/ (run automatically by npm install)

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FEATURES = path.join(ROOT, "docs", "features");
const INDEX = path.join(ROOT, "docs", "README.md");
const ACK_FILE = path.join(ROOT, ".cache", "docs-ack");

const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const inGitRepo = () => {
  try {
    git("rev-parse", "--is-inside-work-tree");
    return true;
  } catch {
    return false;
  }
};
const hasHead = () => {
  try {
    git("rev-parse", "--verify", "HEAD");
    return true;
  } catch {
    return false;
  }
};

/** Files changed but not committed (staged, unstaged, untracked). */
function uncommittedFiles() {
  return git("status", "--porcelain", "--untracked-files=all")
    .split("\n")
    .filter(Boolean)
    .map((l) => l.slice(3).replace(/^"|"$/g, "").split(" -> ").pop());
}

function stagedFiles() {
  return git("diff", "--cached", "--name-only").split("\n").filter(Boolean);
}

/** Fingerprint of the uncommitted src/ change, for --ack. */
function srcDiffHash() {
  const h = createHash("sha1");
  if (hasHead()) h.update(git("diff", "HEAD", "--", "src"));
  for (const f of git("ls-files", "--others", "--exclude-standard", "--", "src").split("\n").filter(Boolean)) {
    h.update(f);
    h.update(fs.readFileSync(path.join(ROOT, f)));
  }
  return h.digest("hex");
}

function registeredTools() {
  const src = fs.readFileSync(path.join(ROOT, "src", "index.ts"), "utf8");
  return [...src.matchAll(/^\s*tool\(\s*"([a-z_]+)"/gm)].map((m) => m[1]);
}

function featurePages() {
  if (!fs.existsSync(FEATURES)) return [];
  return fs.readdirSync(FEATURES).filter((f) => f.endsWith(".md") && !f.startsWith("_"));
}

/** R2 + R3 */
function coverageProblems() {
  const problems = [];
  const pages = featurePages();
  const text = pages.map((p) => fs.readFileSync(path.join(FEATURES, p), "utf8")).join("\n");
  const undocumented = registeredTools().filter((t) => !text.includes("`" + t + "`"));
  if (undocumented.length) {
    problems.push(`These MCP tools aren't documented in any docs/features/*.md page (mention each as \`name\`): ${undocumented.join(", ")}`);
  }
  const index = fs.existsSync(INDEX) ? fs.readFileSync(INDEX, "utf8") : "";
  const unlinked = pages.filter((p) => !index.includes(`features/${p}`));
  if (unlinked.length) problems.push(`These feature pages aren't linked from docs/README.md: ${unlinked.join(", ")}`);
  return problems;
}

/** R1 */
function pairingProblem(files) {
  const src = files.filter((f) => f.startsWith("src/"));
  const docs = files.filter((f) => f.startsWith("docs/"));
  if (src.length && !docs.length) {
    return `src/ changed (${src.slice(0, 5).join(", ")}${src.length > 5 ? ", …" : ""}) but nothing in docs/ did.`;
  }
  return undefined;
}

const HOW_TO_FIX =
  "Update docs per CLAUDE.md: edit or add the page in docs/features/ for this feature, link new pages from docs/README.md, and add a line to docs/CHANGELOG.md.";

const [mode, arg] = process.argv.slice(2);

if (mode === "--install-hooks") {
  if (inGitRepo()) {
    try {
      git("config", "core.hooksPath", ".githooks");
      console.log("git hooks: core.hooksPath -> .githooks (docs check on commit)");
    } catch {
      /* not fatal for npm install */
    }
  }
  process.exit(0);
}

if (mode === "--ack") {
  if (!inGitRepo()) process.exit(0);
  fs.mkdirSync(path.dirname(ACK_FILE), { recursive: true });
  fs.writeFileSync(ACK_FILE, srcDiffHash());
  console.log("Recorded: the current src/ changes need no docs update.");
  process.exit(0);
}

if (mode === "--stop") {
  let input = {};
  try {
    input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  } catch {
    /* no stdin */
  }
  // Already sent back once this turn: let Claude stop rather than loop
  if (input.stop_hook_active) process.exit(0);

  const problems = coverageProblems();
  if (inGitRepo()) {
    const pairing = pairingProblem(uncommittedFiles());
    let acked = false;
    try {
      acked = fs.readFileSync(ACK_FILE, "utf8").trim() === srcDiffHash();
    } catch {
      /* no ack yet */
    }
    if (pairing && !acked) problems.unshift(pairing);
  }
  if (problems.length) {
    const reason = [
      "Docs check failed:",
      ...problems.map((p) => `- ${p}`),
      HOW_TO_FIX,
      "If these changes have no user-visible effect (refactor, typo), run `node scripts/check-docs.mjs --ack` and say so instead.",
    ].join("\n");
    process.stdout.write(JSON.stringify({ decision: "block", reason }));
  }
  process.exit(0);
}

if (mode === "--commit") {
  const msg = arg && fs.existsSync(arg) ? fs.readFileSync(arg, "utf8") : "";
  const problems = coverageProblems();
  if (!/\[no-docs\]/i.test(msg)) {
    const pairing = pairingProblem(stagedFiles());
    if (pairing) problems.unshift(pairing);
  }
  if (problems.length) {
    console.error(["", "✖ Commit blocked by the docs check:", ...problems.map((p) => `  - ${p}`), `  ${HOW_TO_FIX}`, "  No user-visible change? Add [no-docs] to the commit message.", ""].join("\n"));
    process.exit(1);
  }
  process.exit(0);
}

const problems = coverageProblems();
if (problems.length) {
  problems.forEach((p) => console.error(`✖ ${p}`));
  process.exit(1);
}
console.log(`docs ok: ${registeredTools().length} tools documented across ${featurePages().length} feature pages`);
