#!/usr/bin/env bun

/**
 * dev-pane.ts — Split current tmux pane and launch a Claude Code drone in a worktree.
 *
 * Usage:
 *   bun dev-pane.ts [--branch <name>] [--base <branch>] [--pane <pane-id>]
 *
 * Options:
 *   --branch  Branch name for worktree (default: auto-generated drone/<repo>-<timestamp>)
 *   --base    Base branch to fork from (default: dev if exists, else main)
 *   --pane    Tmux pane ID of the caller (default: current pane via tmux display-message)
 *
 * Output: JSON with mind_pane, drone_pane, worktree, branch, base
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import { basename } from "path";

function run(cmd: string): string {
  return execSync(cmd, { encoding: "utf-8" }).trim();
}

function tryRun(cmd: string): string | null {
  try {
    return run(cmd);
  } catch {
    return null;
  }
}

// --- Parse args ---
const args = process.argv.slice(2);
function getArg(flag: string): string | undefined {
  const i = args.indexOf(flag);
  if (i !== -1 && i + 1 < args.length) return args[i + 1];
  return undefined;
}

// --- Determine caller pane (the mind) ---
// Priority: --pane flag > $TMUX_PANE env var > tmux display-message fallback
const mindPane = getArg("--pane") ?? process.env.TMUX_PANE ?? run("tmux display-message -p '#{pane_id}'");

// --- Determine repo root and name ---
const repoRoot = run("git rev-parse --show-toplevel");
const repoName = basename(repoRoot);

// --- Determine base branch (default: current branch) ---
let baseBranch = getArg("--base") ?? run("git branch --show-current");

// --- Pull latest ---
tryRun(`git fetch origin`);
tryRun(`git pull origin ${baseBranch}`);

// --- Determine branch name ---
let branchName = getArg("--branch");
if (!branchName) {
  const ts = Math.floor(Date.now() / 1000);
  branchName = `drone/${repoName}-${ts}`;
}

// --- Determine worktree path (find first available) ---
const parentDir = `${repoRoot}/..`;
let worktreePath = `${parentDir}/${repoName}-dev`;
let suffix = 2;
while (existsSync(worktreePath)) {
  worktreePath = `${parentDir}/${repoName}-dev-${suffix}`;
  suffix++;
}
// Resolve to absolute
const resolvedWorktree = run(`cd "${parentDir}" && pwd`) + "/" + basename(worktreePath);

// --- Delete stale branch if it exists (from a previous cleaned-up worktree) ---
tryRun(`git branch -D "${branchName}" 2>/dev/null`);

// --- Create worktree ---
try {
  run(`git worktree add "${resolvedWorktree}" -b "${branchName}" "${baseBranch}"`);
} catch (err) {
  console.error(JSON.stringify({ error: `Failed to create worktree: ${err}` }));
  process.exit(1);
}

// --- Split tmux pane (in the same window as the caller) ---
let dronePane: string;
try {
  dronePane = run(`tmux split-window -h -p 50 -t ${mindPane} -P -F '#{pane_id}'`);
} catch (err) {
  console.error(JSON.stringify({ error: `Failed to split tmux: ${err}` }));
  process.exit(1);
}

// --- Run collab installer in worktree, then launch Claude Code drone (Sonnet) ---
// Check .claude/commands/ first (installed repos), fall back to src/commands/ (collab repo itself)
const installScript = `test -f .claude/commands/collab.install.ts && bun .claude/commands/collab.install.ts || bun src/commands/collab.install.ts`;
run(`tmux send-keys -t ${dronePane} 'cd ${resolvedWorktree} && ${installScript} && .collab/bin/collab pipelines install full-workflow --yes 2>/dev/null; claude --dangerously-skip-permissions --model sonnet' Enter`);

// --- Output result ---
console.log(JSON.stringify({
  mind_pane: mindPane,
  drone_pane: dronePane,
  worktree: resolvedWorktree,
  branch: branchName,
  base: baseBranch,
}));
