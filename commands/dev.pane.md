# Dev Pane — Split tmux and launch a drone session in a worktree

Split the current tmux window 50/50. The left pane is the **🧠 mind** (Opus — overseer), the right pane is the **🛸 drone** (Sonnet — worker). Always refer to the mind as 🧠 and the drone as 🛸 in all output.

## Arguments

- `$ARGUMENTS` — Natural language. Parse the user's intent to extract:
  - **task** — A description of what the drone should work on
  - **ticket** — A Linear or Jira ticket ID (e.g., ENG-123, PROJ-456)
  - **branch** — A branch name for the worktree
  - **base** — A base branch to fork from

  All are optional. Examples:
  - `/dev.pane` — just launch a drone, no task
  - `/dev.pane fix the auth timeout bug` — launch with a task
  - `/dev.pane ENG-123` — launch and fetch a Linear ticket
  - `/dev.pane Jira ticket PROJ-456 on branch my-fix` — ticket + branch
  - `/dev.pane add rate limiting, base off develop` — task + base branch

## Steps

1. **Parse `$ARGUMENTS`** into structured values:
   - If it looks like a ticket ID (e.g., `ENG-123`, `PROJ-456`, or prefixed with "Linear"/"Jira"), treat it as a ticket
   - If a branch name is mentioned (e.g., "on branch X", "branch: X"), extract it
   - If a base branch is mentioned (e.g., "base off X", "from X"), extract it
   - Everything else is the task description

2. Get the current tmux pane ID from the `$TMUX_PANE` environment variable:
   ```bash
   echo $TMUX_PANE
   ```

3. Build and run the CLI command:
   ```bash
   bun ~/.claude/bin/dev-pane.ts --pane $TMUX_PANE [--branch <branch>] [--base <base>]
   ```
   Only include `--branch` and `--base` if you extracted them from the arguments.

4. The CLI outputs JSON. Parse it and report:
   - 🧠 Mind (Opus): pane `<mind_pane>`
   - 🛸 Drone (Sonnet): pane `<drone_pane>`
   - Worktree: `<worktree>`
   - Branch: `<branch>` (based on `<base>`)

5. Wait 5 seconds, then capture the 🛸 drone pane to verify it started:
   ```bash
   sleep 5 && tmux capture-pane -t <drone_pane> -p | tail -10
   ```

6. If you parsed a task or ticket from the arguments, send it to the 🛸 drone after it has started (wait 10 seconds for Claude Code to initialize):
   - For a **task description**: send the description directly
   - For a **Linear ticket**: send `Fetch Linear ticket <ID> and implement it. Use any available Linear tools or MCP to get the full ticket details, then work through the requirements.`
   - For a **Jira ticket**: send `Fetch Jira ticket <ID> and implement it. Use any available Jira tools or MCP to get the full ticket details, then work through the requirements.`

   ```bash
   sleep 10 && bun ~/.claude/bin/tmux-send.ts <drone_pane> "<prompt>"
   ```
   Use `run_in_background: true` on this Bash call.

7. Set the 🧠 mind session to Opus as the **last step** (run in background so it fires after this response completes):
   ```bash
   sleep 5 && bun ~/.claude/bin/tmux-send.ts <mind_pane> "/model opus"
   ```
   Use `run_in_background: true` on this Bash call. The delay gives time for the current response to finish and the prompt to become available.

8. Tell the user: "The 🛸 drone will signal `[TASK:COMPLETE]` when it's done. I'll automatically run `/dev.review` when that happens."

## When you receive `[TASK:COMPLETE]`

The 🛸 drone has finished its work. The `CLAUDE.local.md` in the worktree instructs the drone to send this signal when done. **Immediately run `/dev.review` to begin the code review cycle.** Do not wait for user input.

## Sending messages to the 🛸 drone

Always use the `tmux-send.ts` CLI to send messages to the 🛸 drone:

```bash
bun ~/.claude/bin/tmux-send.ts <drone_pane> "your prompt text"
```

**Never use raw `tmux send-keys` directly.**
