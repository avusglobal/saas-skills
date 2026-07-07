# AGENTS.md — <project name>

<!-- Fill every <placeholder>. Delete sections that don't apply. This file is
the first thing every agent reads — keep it short and inviolable. -->

<project one-line description: what it is, who uses it.>

## Rule #0 — context this project lives in

**One developer, many projects.** Everything here is optimized for a solo
developer who juggles multiple projects and will come back to this code after
weeks away. Every decision — architecture, tooling, planning, code style —
must favor **simple to develop, simple to re-understand**. When two options
tie, pick the one with less to remember. Two months from now, the code must
explain itself (see the `simplicity` skill).

## Language

Everything — code, comments, docs, commits, issues, PRs, CI reports — in
**English**. One language only; mixed-language repos rot.

## Stack

| Layer | Technology |
|---|---|
| Runtime | <...> |
| Framework | <...> |
| Database | <...> |
| UI | Kumo UI (<https://kumo-ui.com/>) — see the `design` skill |
| Tests | <...> |

Commands (also wired as package scripts and used verbatim by CI):

- Install: `<bun install --frozen-lockfile>`
- Typecheck: `<bun run typecheck>`
- Lint/format: `<bun run lint>` / `<bun run format>`
- Test: `<bun run test>`

## Delivery workflow (inviolable)

1. **Every unit of work is a Linear issue**, body following the standard
   template in `docs/templates/issue.md`. Planning creates them (see the
   `plan` skill): phases become issues, a phase's tasks become sub-issues.
2. **Every issue becomes exactly one branch** (use Linear's suggested branch
   name so the PR auto-links), worked on in an **isolated workspace** (git
   worktree or a fresh clone/session) — never directly on the default
   branch, never two issues on one branch.
3. **Every branch is linked to exactly one pull request.** The PR merging is
   what ships that functionality (and closes the Linear issue) — nothing
   lands on the default branch except through its PR.
4. **After every push, watch CI until it is green** (verify, format,
   bug-analysis, readability). Do not report work as done, move to the next
   task, or ask for review while CI is red or still running. If CI fails,
   fix it and push again — the loop ends green.

## Planning

Use the `plan` skill. Its contract: all planning lives in Linear (phase =
issue, task = sub-issue, bodies per `docs/templates/issue.md`; phases only
when the work has natural stages), and every plan ends with the execution
order showing what runs in parallel:

```
TSK-1 ---------- TSK-3 ------- TSK-4
TSK-2 ------------------------ TSK-5
```

(lanes run in parallel; left→right is sequential within a lane)

## Code rules

- **TDD** — the failing test comes first (`guard` hook reminds; CI enforces).
- **Simplicity** — the `simplicity` skill is the default bias for all code.
- **Self-documenting** — descriptive names over comments; comment only a
  non-obvious *why*.
- **Module layout** — <describe your layout, e.g. one folder per module with
  fixed per-layer filenames>; the `guard` hook blocks violations.
- **Forbidden APIs** — <e.g. no `bun:*`/`Bun.*` in `src/` if production runs
  elsewhere>; configured in `.claude/hooks/guard.sh`.

## UI rules

See the `design` skill. Non-negotiables: **Kumo UI** for all interface work;
list-item actions via `DropdownMenu` (icon + item title, delete last in red
after a separator); deletions confirmed with Kumo's `DeleteResource` block.

## Docs

`docs/README.md` describes the system: ADRs for decisions, learnings for
surprises, runbooks for operations, INDEX.md files kept by the `sync` skill.
Record a learning whenever something genuinely surprised you. **No plans or
task lists in docs/** — all task state lives in Linear.
