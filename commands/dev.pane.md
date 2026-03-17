# Dev Pane — Split tmux and launch a drone session in a worktree

Split the current tmux window 50/50. The left pane is the **🧠 mind** (Opus — overseer), the right pane is the **🛸 drone** (Sonnet — worker). Always refer to the mind as 🧠 and the drone as 🛸 in all output.

## Arguments

- `$ARGUMENTS` — Optional flags:
  - `--branch <name>` — Branch name for the worktree
  - `--base <branch>` — Base branch to fork from
  - `--task <description>` — Task description to send to the drone
  - `--linear <ticket-id>` — Linear ticket ID (e.g., ENG-123) — drone fetches and implements it
  - `--jira <ticket-id>` — Jira ticket ID (e.g., PROJ-456) — drone fetches and implements it

  If branch/base are omitted, branch auto-generates and base is the current branch. Task, linear, and jira are mutually exclusive — only one task source at a time.

## Steps

1. Get the current tmux pane ID from the `$TMUX_PANE` environment variable:
   ```bash
   echo $TMUX_PANE
   ```

2. Run the CLI, passing the caller's pane ID and any user arguments:
   ```bash
   bun ~/.claude/bin/dev-pane.ts --pane $TMUX_PANE $ARGUMENTS
   ```

3. The CLI outputs JSON. Parse it and report:
   - 🧠 Mind (Opus): pane `<mind_pane>`
   - 🛸 Drone (Sonnet): pane `<drone_pane>`
   - Worktree: `<worktree>`
   - Branch: `<branch>` (based on `<base>`)

4. Wait 5 seconds, then capture the 🛸 drone pane to verify it started:
   ```bash
   sleep 5 && tmux capture-pane -t <drone_pane> -p | tail -10
   ```

5. If the JSON output includes a `task` field, send it to the 🛸 drone after it has started (wait 10 seconds for Claude Code to initialize):
   ```bash
   sleep 10 && bun ~/.claude/bin/tmux-send.ts <drone_pane> "<task>"
   ```
   Use `run_in_background: true` on this Bash call.

6. Set the 🧠 mind session to Opus as the **last step** (run in background so it fires after this response completes):
   ```bash
   sleep 5 && bun ~/.claude/bin/tmux-send.ts <mind_pane> "/model opus"
   ```
   Use `run_in_background: true` on this Bash call. The delay gives time for the current response to finish and the prompt to become available.

## Sending messages to the 🛸 drone

Always use the `tmux-send.ts` CLI to send messages to the 🛸 drone:

```bash
bun ~/.claude/bin/tmux-send.ts <drone_pane> "your prompt text"
```

**Never use raw `tmux send-keys` directly.**
