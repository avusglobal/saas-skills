---
name: plan
description: Analyze, plan, and create Linear issues for feature work. Use WHENEVER the user invokes /plan, asks to "create a plan", "plan feature X", "do planning for Y", "new plan", or similar. Runs a one-question-at-a-time discovery interview until clarity ≥95%, explores the codebase, then creates Linear issues — one per phase when phases are needed, with each phase's tasks as sub-issues — and always ends with the execution order showing which tasks run in parallel. Linear is the single source of truth for all task state.
model: opus
---

# Skill: `plan`

Analyzes work, interviews the operator until clarity, and creates **Linear issues** (via the Linear MCP — connect it before planning). Every issue body follows the standard template in `docs/templates/issue.md`. Read your project's `AGENTS.md` and structure doc before planning.

**Context rule (from AGENTS.md rule #0):** this project has **one developer working across multiple projects**. Plans must be simple to execute and simple to resume after weeks away — fewer moving parts beat elegant ones, and every issue must be understandable on its own without tribal knowledge.

## When to fire

- User invokes **`/plan`**.
- User asks: "create a plan", "do planning", "new plan", "plan for X", "phases for Y", "how should we do Z".
- User asks to archive or reorder planned work — update Linear issues instead of moving files.

## Delivery model (inviolable)

Every issue created here follows the project's delivery workflow:

- **1 Linear issue = 1 GitHub branch** (use Linear's suggested branch name so the PR auto-links), worked in an **isolated workspace** (worktree or fresh session).
- **1 branch = 1 pull request.** Merging that PR ships the issue's functionality and closes the Linear issue.
- Execution agents **watch CI to green after every push** before reporting back or moving on.

Write issues assuming this — self-contained scope, a diff one PR can carry, acceptance criteria the PR review can check.

## Mandatory flow

### 1. Discovery (before creating ANY issue)

Use `AskUserQuestion` **one question at a time** until ≥95% clarity. Follow the **Interview style** rule below.

1. **Objective** — what's the measurable outcome expected?
2. **Scope** — what's in and what's out?
3. **Modules affected** — which areas of the codebase change?
4. **Contracts / APIs** — new or modified endpoints, schemas, events?
5. **Critical error cases** — what can fail? How do we handle it?
6. **Success criteria** — how will we know we're done (tests, metrics, observable behavior)?
7. **Risks / prerequisites** — anything depending on another domain (→ separate blocker issue)?
8. **Breakdown** — confirm whether the work needs **phases** or is a flat set of tasks (see Structure below).

Stop when the user says "go ahead" / "it's clear" / similar, OR when their answers cover all the points above unambiguously.

### 2. Pre-creation: scan Linear + repo context

1. Search Linear for duplicates or related open work.
2. Check open cross-domain blocker issues that touch the areas in scope — ask whether to fold them in or keep separate.
3. Explore the codebase for affected modules, existing patterns, and test coverage.

### 3. Codebase analysis

Before writing issues, produce a short internal summary (share with the user): files/modules likely touched, existing patterns to reuse (UI → `design` skill), cross-domain boundaries needing separate issues, TDD scenarios per layer.

### 4. Structure: phases and tasks

Break the work into the smallest structure that fits — **don't force phases**:

- **Small feature (a handful of tasks, no natural stages)** → one parent issue + task sub-issues.
- **Larger work with natural stages** → **one issue per phase**; each phase's tasks become **sub-issues of that phase's issue**. Order phases with blocking relations.

### 5. Create the issues (in Linear)

Every issue body follows the standard template — `docs/templates/issue.md` (phase and task variants). Summary:

**Phase issue** (or single parent):

- `title`: `Phase N — <goal>` (or the feature name when flat).
- body: objective, scope in/out, success criteria, links to ADRs/docs.

**Task sub-issues** (execution units — one branch + one PR each):

- Created as **Linear sub-issues** of their phase issue.
- Sized for a **fast execution agent** in one session: prefer one domain, a bounded working set; split anything that would need many modules or fullstack passes.
- Body must include (see the template):
  - `domain`: the owning area (e.g. `billing`, `auth`)
  - `scope`: `backend` | `frontend` | `iac` | `migrations` (any combination, small diff)
  - `provides`: artifacts this issue delivers
  - `requires`: Linear "Blocked by" relations (or "none")
  - `tests`: red TDD scenarios (unit/integration via the project's test runner)
  - Checklist of concrete steps
  - Acceptance criteria (what the PR must demonstrate, CI green included)

Set Linear blocking relations between sub-issues when order matters — relations, never prose.

### 6. Report the execution order (ALWAYS — the plan's final output)

Close every planning session by giving the user, in this order:

1. Links: parent/phase issues, then sub-issues.
2. **The execution lanes diagram** — which tasks are sequential, which run in parallel. One lane per parallel track; left→right is sequential within a lane; lanes run concurrently:

```
TSK-1 ---------- TSK-3 ------- TSK-4
TSK-2 ------------------------ TSK-5
```

(here TSK-1 and TSK-2 start together; TSK-3 then TSK-4 follow TSK-1's lane; TSK-5 follows TSK-2.)

3. One line per lane explaining the dependency that shaped it.

### 7. Pre-mortem

Before finalizing, run a pre-mortem ("it's 3 months later and this failed — why?"). Adjust the breakdown if it spots holes.

## Inviolable rules

- **Interview style — relentless, one-by-one, recommended-answer-included.** Ask **exactly one question per turn** via `AskUserQuestion`. Include your **recommended answer** as the first option, labeled `(Recommended)`. Explore the codebase instead of asking when the answer is discoverable.
- **Phases only when the work has natural stages** — phase = issue, its tasks = sub-issues.
- **Every plan ends with the execution-lanes diagram** (step 6). No plan is delivered without it.
- **English only** in issue titles and bodies.
- **TDD mandatory**: every sub-issue lists `tests:` scenarios — red first.
- **Linear is the standard tracker** for all planning and task state — never in-repo planning trees or task files.
- **Solo-dev bias**: if a breakdown needs a diagram to explain the diagram, it's too complex — simplify.

## When NOT to create a plan

- 1 small change (1–3 files): the overhead isn't worth it — suggest doing it directly (still via issue → branch → PR).
- An active epic already covers the topic: add sub-issues to it instead of a duplicate parent.

## Operator preferences (always apply)

- UI work in sub-issues must note screenshot + screen recording deliverables (see `design` skill).
- Execution agents must **watch CI to green after every push** before reporting back.
- List/table delete UX must follow the `DropdownMenu` + `DeleteResource` pattern (see `design` skill).
