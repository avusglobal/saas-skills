---
name: dispatch
description: Execute a change by launching one Claude agent per task (permissions bypassed) inside a per-change git worktree, laid out as one terminal pane per parallel track in a single cmux workspace (a dependency chain shares one pane and runs sequentially via clear+respawn), with a side "Code" tab running nvim on the worktree. Reviews each task with an adversarial code-reviewer agent (autonomous — no manual review; CI is the second backstop) and merges the change back to base with the task-integrator at the end. The agent verifies completion itself (git diff + tests + frontmatter) and auto-advances high-confidence decisions (next task, act on the reviewer's verdict, launch a ready dependent wave); it asks the user only for external prerequisites and the final merge. Use when the user says "dispatch <change>", "run change X", "execute the tasks of <change>", or passes a change slug/path to be executed by parallel agents.
---

# Skill: `dispatch`

Given a **change**, run it in its **own git worktree** (branch `dispatch/<change>`) inside one cmux
**workspace** named `dispatch/<change-slug>` — the single screen for that change — plus a side
**tab named "Code"** running `nvim .` on the worktree so the operator can watch the diffs live.
When the workspace is created, the panes are laid out **one per *track* (parallel lane), not one per
task**: tasks that can run concurrently get their own panes, while a **dependency chain shares ONE
pane** and runs **sequentially** there — when a task finishes, its pane is **cleared and respawned**
with the next task in the chain. The panes are tiled into one balanced grid (a binary space
partition, so the cells stay roughly equal for any track count). Each task runs an independent
`claude` agent — **interactively** (the Claude Code TUI opens in the pane; no headless `-p`),
with `--dangerously-skip-permissions`, executing a **single task**. Each agent is
launched with `Notification` + `Stop` hooks (via `--settings`) that fire `cmux notify` so the pane
raises a notification when its agent **needs an answer** (Notification) or **pauses at end of turn**
(Stop). Tasks with no pending dependency launch together (a wave, in parallel); dependent tasks
launch later by reusing their track's pane. After each task, the adversarial **`code-reviewer`** agent
reviews its diff in a **dedicated appended pane** (a clean shell — never the task's own pane,
whose interactive TUI is still open); when all tasks are done, the **`task-integrator`** agent
**merges** the change branch into base in another appended pane, resolving conflicts.

**Review is fully autonomous — there is no manual review step.** The `code-reviewer` returns a
severity-ranked verdict and you act on it yourself; **CI** (your verify workflow: typecheck + lint +
tests) is the second backstop. Never ask the operator to adjudicate findings.

**You (the agent) drive this autonomously, deciding the high-confidence steps yourself** — the kind
of decision the operator would say "yes" to ~90% of the time. Concretely you DECIDE on your own to:
verify a finished task, advance to the next task in a chain, **act on the reviewer's verdict**
(auto-fix critical/high findings, accept low ones), and launch a dependent wave once its prerequisites
are ready and verified. You only **STOP to ask** for the genuinely uncertain or costly calls:
- a task with an **external prerequisite** (produced outside this change) — confirm it exists first;
- the **final merge into base** — confirm before integrating;
- a **merge conflict**, or anything **destructive / irreversible / ambiguous**.
(Review findings are NOT on this list — the reviewer + CI own them.)

The deterministic mechanics live in `dispatch.ts` (parsing, graph, worktree, cmux). This skill is the
**autonomous, lightly-gated orchestration** you (the agent) perform on top of it.

## Adopting in another project (knobs)

- **Prerequisites:** `bun` (runs `dispatch.ts`), the `claude` CLI, and `cmux` on the operator's machine.
- **Task tree:** changes live under `docs/plans/**/changes/<slug>/` with `INDEX.md` + `tasks/*.md`
  (frontmatter: `status`, `requires.intra`, `requires.external`, `wave`, `track`, `provides`,
  `domain`, `tests`). See the docs-system templates shipped alongside this kit.
- **Test command:** the prompts inside `dispatch.ts` tell agents to run `bun test` — search-replace
  with your project's test command when adopting.
- **Migration collision detection:** `dispatch.ts plan` flags tasks that touch `migrations/**` or the
  schema module so you can serialize changes that both emit migrations. Adjust the paths it scans if
  your project keeps migrations elsewhere.

## Inputs

- `$ARGUMENTS` — a change **slug** or a **path** to a change dir (containing `INDEX.md` + `tasks/`).

## Tooling

```
bun .claude/skills/dispatch/dispatch.ts <command> <change> [flags]
```

Subcommands: `plan`, `launch --tasks <csv>`, `review --tasks <csv>`, `merge --base <ref>`, `status`,
`cleanup`. All emit JSON. `plan` and `status` are read-only. Default model is `sonnet`.

> The sandboxed Bash of an orchestrating session may not see `.claude/`. If a call fails with
> "No such file", retry with the sandbox disabled. The cmux panes run in real shells, unaffected.

## Isolation model

- **One git worktree per change** at `.claude/worktrees/dispatch-<change>` on branch
  `dispatch/<change>`, branched from the root's current HEAD. All of the change's task panes run
  there, so they never touch the user's working copy or another change's worktree.
- **One cmux workspace per change**, created on the first `launch`, plus a side **"Code" tab**
  running `nvim .` on the worktree. Its terminal panes are tiled into a single grid **one pane per
  track (parallel lane)** at creation time — peak concurrency, not task count — so the whole change is
  visible on one screen from the start.
- **Track = sequential lane = one pane.** Tasks of the **same** track share a pane: when one finishes,
  `dispatch.ts` **clears and respawns** that pane with the next task in the chain (the previous task's
  interactive TUI is replaced). Tasks of **different** tracks run **in parallel** in their own panes.
- Tasks of the **same** change share that worktree and run in dependency order (waves), each
  committing to the change branch. **Different** changes get **different** worktrees → run them in
  parallel by **invoking `dispatch.ts` once per change** (each gets its own worktree + workspace +
  Code tab); their only contact is the final merge into base (where real conflicts, if any,
  surface). To accelerate development, launch independent changes concurrently and orchestrate them
  side by side — they are fully isolated until merge.

## Parallel changes (run 2+ at once safely)

Worktrees isolate the source tree, but two things still cross the boundary and bite at merge time —
neutralize them BEFORE launching changes in parallel (don't ask the user; this is your call):

- **Migrations collide.** Two changes that both touch the DB schema each emit the next
  `migrations/<seq>_*` file (and often append to a shared journal) → guaranteed conflict + duplicate
  sequence. `dispatch.ts plan` reports `migrationTasks` (and per-task `touchesMigrations`).
  **Rule:** never run two changes with non-empty `migrationTasks` concurrently — **serialize** them
  (run + merge one, then the next). Changes with empty `migrationTasks` parallelize freely.
- **Shared registration spine.** Most projects have a central file where every module is registered
  (route registration, schema barrel, DI container). Parallel changes that append at the same tail
  conflict; have agents insert entries at their **alphabetical** position so git auto-merges
  non-adjacent inserts. Residual conflicts are additive and resolved by the `task-integrator` at merge.
- **Merge sequentially, never together.** Merge change A into base, then merge B into the *updated*
  base so any real spine conflict surfaces once. Pick the more foundational/smaller change first.

## Flow (you perform these steps)

1. **Resolve & plan.** `dispatch.ts plan <change>` → parse `tasks` (`requires.intra`,
   `requires.external`, `wave`, `status`, `track`) and `waves`.
2. **Present the plan.** Show the wave + track breakdown (which tasks share a pane sequentially, which
   run in parallel); flag tasks with non-empty `requires.external` (prerequisite produced **outside
   this change** — always needs confirmation). Skip `status: completed` tasks.
3. **Wave 1** (tasks whose `requires.intra` is empty):
   - If any has non-empty `requires.external`, **ask the user** (`AskUserQuestion`) to confirm those
     external prerequisites exist before launching.
   - `dispatch.ts launch <change> --tasks <wave-1 csv>` (creates the worktree + workspace + Code
     tab on first call).
4. **Poll, then VERIFY yourself.** `dispatch.ts status <change>` until each task is `done` /
   `blocked` / `failed`. Do **not** trust the on-screen sentinel alone — **independently confirm the
   work happened**: in the worktree, run `git -C <worktree> show --stat HEAD` and `git -C <worktree>
   diff HEAD~1..HEAD` to see the actual diff, confirm the files the task `provides`/`scope` were
   created or changed, confirm the task frontmatter flipped to `status: completed` (and was archived),
   and that the module's tests pass. If the diff is empty, the wrong files changed, or tests
   fail, treat the task as **not done** regardless of the sentinel — read the pane
   (`cmux read-screen --surface <ref>`) and act (auto-fix or ask, per the gating rules).
5. **Review each finished task (autonomous — no manual review).** `dispatch.ts review <change>
   --tasks <just-finished slugs>` spawns the adversarial `code-reviewer`. Poll `status` →
   `reviews`. Act on the verdict **yourself**, never asking the operator:
   - `ok` → continue (any `NOTES:` are medium/low; fix a cheap medium if obvious, accept lows).
   - `findings` (critical/high, or module tests failed) → read the review pane and **launch a fix**
     in that task's pane (reuse the lane), re-verify (step 4), and re-review until `ok`. This is your
     call — the reviewer's verdict + CI are the authority, not the operator.
6. **Each subsequent wave / next task in a chain.** Once a wave's intra-change prerequisites are
   `done` **and verified** (step 4), **launch the next wave/task yourself** — that's the ~90%-yes
   call you own. Reusing the lane's pane (clear + respawn) is automatic in `dispatch.ts`. Only
   **ask first** when the task has an **external prerequisite** (confirm it exists). Then poll,
   verify, review (steps 4–5). Repeat until all waves are verified.
7. **Merge (human gate).** Once every task is `done`, verified, and reviewed `ok` (or accepted),
   **ask the user to confirm the merge**, then `dispatch.ts merge <change>` (defaults to the root's
   current branch as base; override with `--base`). Poll `status` → `merge`. On `ok`, report the
   change is integrated. On `conflict`, read the merge pane and **ask the user** how to proceed.
8. **Wrap up.** Report final task/review/merge status. Optionally `dispatch.ts cleanup <change>` to
   close the workspace, the Code tab, and remove the worktree.

## When the user questions something

If the user **questions, doubts, or challenges** anything (a status, a decision, "are you sure?",
"did task X really finish?", "is this right?"), do a **full validation pass before answering** — never
answer from memory:
- **Read the docs end-to-end** for the change: `PLAN.md`, `PHASE.md`, `CHANGE.md`, every
  `tasks/<slug>.md` (and `archived/`), and the relevant `INDEX.md` files.
- **Validate every task's real status** against the worktree (frontmatter + whether it was archived),
  not the pane sentinel.
- **Validate every modification**: `git -C <worktree> diff <base>...HEAD` for the whole change, plus
  per-task `git diff HEAD~1..HEAD`, and confirm the test suite passes.
- Then answer with the **evidence** (file paths, diff lines, test output), and reconcile any
  discrepancy you find before continuing.

## Gating rules (the core contract)

You are **autonomous on the high-confidence calls** (the ~90%-yes decisions) and only **stop on the
uncertain or costly ones**.

**Decide yourself (no need to ask):**
- **Independent task** (`requires.intra` empty **and** `requires.external` empty) → launch
  immediately, in parallel with its wave.
- **Advance the chain**: launch the next task / dependent wave once its intra-change prerequisites are
  `done` **and you verified them** (step 4).
- **All review outcomes**: the `code-reviewer`'s verdict is the authority — auto-fix critical/high
  findings (order a fix, re-verify, re-review until `ok`), accept lows. **Never** ask the operator to
  adjudicate a finding; CI is the second backstop.

**Always STOP and ask the user (`AskUserQuestion`):**
- A task with a non-empty **`requires.external`** prerequisite → confirm it exists before launching.
- The **final merge into base** → confirm before integrating.
- A **merge conflict**, or anything **destructive, irreversible, or ambiguous** (review findings are
  NOT in this set — they are fully automated).

When you stop at a gate, also `cmux notify --title "dispatch · <change>" --subtitle "<reason>"` so the
user is pinged.

## Notes

- Each agent runs in the change's worktree, so it inherits the project config (`CLAUDE.md`/`AGENTS.md`,
  hooks, skills) — TDD enforcement and cross-domain blocking apply automatically.
- **Dispatch agents must never touch `.claude/`.** They may only change the application (`src/`) and
  its modules, plus their own `docs/plans/` archival. A PreToolUse guard (injected via `--settings`)
  blocks any Write/Edit under `.claude/`, any Bash write into `.claude/`, and skills installers
  (`npx skills add`) — those pollute the repo with `.claude/skills/` and other-agent dirs. Installing
  skills or editing hooks/agents is the operator's job, done outside dispatch. The known other-agent
  dirs are also gitignored as a backup.
- **`dispatch.ts status` is a hint, not proof.** It reports `done` when the agent flips its task
  frontmatter to `status: completed` (read from the worktree) and/or prints `__TASK_DONE__<slug>`
  (`__TASK_BLOCKED__` / `__TASK_FAIL__` on failure). **You must still verify the work yourself** (see
  Flow step 4): inspect the actual diff in the worktree, confirm the `provides`/`scope` files changed,
  and that tests pass. Each task commits its work to the change branch, so the diff is real and
  inspectable — never accept a sentinel without confirming a matching commit/diff exists.
- **Track lanes & pane reuse.** Panes are one-per-track, not one-per-task. A dependency chain shares a
  single pane: when a task in a chain finishes, launching the next task in that track makes
  `dispatch.ts` **clear the scrollback and `respawn-pane`** the lane with the next task — the previous
  task's interactive TUI is replaced, and its stale on-screen sentinels are wiped (so a verdict is
  never read from the lane's previous occupant). Independent tracks keep running in parallel.
- **Code tab.** On first `launch`, a **"Code" tab** (a terminal surface in the dispatch workspace)
  opens with `nvim .` on the change's worktree so you/the operator can browse the live modifications.
  It's best-effort (a failure only logs, never aborts) and is closed by `cleanup`.
- Review and merge each run in their **own appended pane** (a fresh shell). They must NOT reuse the
  task's pane: in interactive mode the task's `claude` TUI never exits, so anything sent to that
  surface lands in the chat, not a shell. Verdicts are read from the pane scrollback, requiring the
  sentinel to appear **twice** (the echoed prompt names it once): `__REVIEW_OK__` / `__REVIEW_FAIL__`
  per task, `__MERGE_OK__` / `__MERGE_CONFLICT__` per change. The `code-reviewer` never auto-fixes — it
  reports a severity-ranked verdict; **you** act on it autonomously (auto-fix critical/high, accept
  low). Findings are never escalated to the operator — the reviewer + CI are the authority.
- `merge` runs in the **root** working tree and requires it to be **clean** (the integrator aborts
  otherwise) — commit or stash the root before merging.
- Agents run **interactively** (the TUI opens, no `-p`) so the work is visible in the pane and stays
  open when idle. The positional prompt auto-submits, so each agent starts working on its task on its
  own. Completion is still detected via task frontmatter (`status: completed`) and the on-screen
  sentinels, which `read-screen` captures from the TUI.
- Each launched agent carries `Notification` + `Stop` hooks (written to a per-agent `--settings`
  file) that run `cmux notify` — "needs an answer" when the agent needs input, "paused" when it
  ends a turn. `--settings` **merges**, so the project's `guard` (PreToolUse) hook is untouched.
  When **you** stop at one of the human gates (external prerequisite, final merge, or a conflict),
  also emit `cmux notify --title "dispatch · <change>" --subtitle "<reason>"` so the user is pinged.
- `--model` is configurable for task agents; **review always runs on the strongest available model**
  regardless, since it is the last human-free check before CI. `--dangerously-skip-permissions` is
  always on by design.
- Review is the adversarial **`code-reviewer`** (`.claude/agents/code-reviewer.md`, read-only);
  merge is the **`task-integrator`** (`.claude/agents/task-integrator.md`, `MODE=merge`).
