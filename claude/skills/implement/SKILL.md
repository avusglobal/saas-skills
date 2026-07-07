---
name: implement
description: Execute a Linear issue end to end. Use when the user invokes /implement <issue-id> (e.g. /implement TSK-123), pastes a Linear issue ID or URL and asks to work on it, or asks to "pick up the next unblocked issue". Fetches the issue via the Linear MCP, refuses to start while blockers are open, creates the branch from Linear's suggested name in an isolated workspace, runs the TDD loop against the issue's tests, opens the PR, and watches CI to green.
disable-model-invocation: true
argument-hint: <linear-issue-id>
---

# Skill: `implement`

The execution half of the delivery workflow: takes **one Linear issue** and
carries it through branch → TDD → PR → CI green. It orchestrates; the
disciplines it delegates — tests to the `tdd` skill, code bias to
`simplicity`, UI to `design`.

## Input

- **`/implement TSK-123`** — a Linear issue ID or URL. This is the standard
  invocation.
- **No argument** ("pick up the next issue") — list the project's unblocked
  issues (no open "Blocked by" relations, status Todo/Backlog), propose the
  best candidate with a one-line rationale, and wait for confirmation.

Requires the **Linear MCP**. If it is not connected, stop and ask the user to
connect it — never guess issue content from memory.

## Flow

### 1. Fetch the contract

Get the issue from Linear: body (objective, `domain`, `scope`, `provides`,
`requires`, `tests`, checklist, acceptance criteria per
`docs/templates/issue.md`), its parent (phase) issue, and its relations.

### 2. Refuse blocked work

If any "Blocked by" issue is not Done → **stop**. List the open blockers and
offer the next unblocked sibling instead. Never start a blocked issue "just
partially".

### 3. Prepare the workspace

- Move the issue to **In Progress**.
- Create the branch using **Linear's suggested branch name** (so the PR
  auto-links) in an **isolated workspace** (git worktree or fresh session) —
  never on the default branch, never two issues on one branch.

### 4. Restate before coding

Summarize back: objective, the `tests:` scenarios, and the acceptance
criteria. If anything in the issue body is ambiguous or contradicts the code
you find, resolve it **one question at a time** via `AskUserQuestion`
(recommended answer as the first option) — before writing any code. Facts
discoverable in the codebase are looked up, not asked.

### 5. TDD loop

Run the red-green loop per the **`tdd` skill** against the issue's `tests:`
list: one failing test → minimal green → next scenario. If the issue is its
phase's **tracer bullet**, build the thin end-to-end path first — do not
fan out into layers. `scope: frontend` work follows the `design` skill,
including its screenshot + recording deliverables.

### 6. Open the PR

- Title: the issue title. Body: objective + acceptance criteria as
  checkboxes + anything the reviewer must know.
- The branch name auto-links the PR to the Linear issue — verify the link.

### 7. Watch CI to green

Watch **every CI check** on the PR (verify, format, bug-analysis,
readability). Red or still running = not done. Address bug-analysis findings
by fixing and pushing (or replying why a finding doesn't apply), then watch
again. The loop ends green.

### 8. Report

Close with: issue link, PR link, CI status, and which acceptance criteria
are demonstrably met (with evidence — test names, screenshots). Only then is
the issue's work done; merging the PR closes the issue.

## Inviolable rules

- **Never start blocked work** (step 2) — offer an unblocked issue instead.
- **One issue = one branch = one PR**, in an isolated workspace.
- **Red test first** — the `tdd` skill is the methodology, CI the backstop.
- **Not done while CI is red or running.**
- **English everywhere** (branch, commits, PR, comments).

## When NOT to use

- No Linear issue exists yet → run `plan` first (or create a single issue for
  a small direct change — the issue→branch→PR path still applies).
- The request is a question or an investigation, not a change → answer it;
  don't open branches for reading work.
