# AGENTS.md — <project name>

<!-- Fill every <placeholder>. Delete sections that don't apply. This file is
the first thing every agent reads — keep it short and inviolable. -->

<project one-line description: what it is, who uses it.>

## Rule #0 — context this project lives in

**One developer, many projects.** This codebase is maintained by a single
person who works on other projects during the day. Everything here is
optimized for that reality: work happens in short, efficient sessions, and
the code will be revisited after weeks away. Every decision — architecture,
tooling, planning, code style — must favor **simple to develop, simple to
re-understand**. When two options tie, pick the one with less to remember.
Two months from now, the code must explain itself (see the `code-standard`
skill).

**Stack bias (applies to every technology decision — reuse it in all
planning and ADRs):** prefer pieces that are easy to use, need **no
maintenance**, are **easy to configure**, and preferably **scale on their
own** — managed/serverless services over anything that must be provisioned,
patched, monitored, or resized by hand. There is no ops team; a dependency
that needs babysitting is a cost this project cannot pay.

## Language and communication

Everything that lands in this repository — code, comments, docs, commits,
issues, PRs, CI reports — is **English**. One language only; mixed-language
repos rot.

**The conversation is in the operator's language.** The `communication` skill
is the full standard; the part that applies to every message:

- Plain words, first sentence says the thing, no filler.
- A technical term is allowed once you say what it means.
- One question per turn, with its context and a full comparison of the options
  — advantages, disadvantages, nothing assumed — then the recommendation,
  stated separately.
- Done, failed and waiting-on-you are stated plainly and kept apart.

## Stack

One row per capability, one answer per row. **The default answer is a
library or a service, never our own code** — a row filled with "custom" needs a
reason next to it. The code skills read this table before writing anything, so
an empty row is an invitation to hand-roll.

Core — fill these when the project starts:

| Capability | Use this — not custom code |
|---|---|
| Runtime | <...> |
| Framework, routing, middleware | <...> |
| Database schema, queries, migrations | <...> |
| Validating and typing input | <...> |
| Auth, sessions, password hashing | <...> |
| Logging and structured events | <...> |
| UI, forms, state | Kumo UI (<https://kumo-ui.com/>) — see the `design` skill |
| Tests | <...> |
| HTTP, crypto, encoding, timers | Web standard APIs — `fetch`, `crypto.subtle`, `URL`, `TextEncoder` |

Everything else — fill a row the first time the need appears, and never before:

| Capability | Use this — not custom code |
|---|---|
| Dates, times, timezones | <...> |
| Money, decimals, rounding | <...> |
| IDs, UUIDs, slugs | <...> |
| Environment and config validation | <...> |
| Retries, backoff, timeouts | <...> |
| Rate limiting | <...> |
| Background jobs and queues | <...> |
| Scheduling and cron | <...> |
| File storage and uploads | <...> |
| Cache | <...> |
| Transactional email | <...> |
| Payments and billing | <...> |
| Full-text or vector search | <...> |
| PDF, CSV, spreadsheets | <...> |
| Images: resize, optimize, serve | <...> |
| Error tracking | <...> |
| Product analytics | <...> |
| Feature flags | <...> |
| Internationalization | <...> |
| State machines and workflows | <...> |
| Diffing, fuzzy matching, parsing | <...> |
| AI and model calls | <...> |

A library or service adopted for a capability gets its row in the same pull
request that adopts it.

Commands (also wired as package scripts and used verbatim by CI):

- Install: `<bun install --frozen-lockfile>`
- Typecheck: `<bun run typecheck>`
- Lint/format: `<bun run lint>` / `<bun run format>`
- Test: `<bun run test>`

## Delivery workflow (inviolable)

1. **Every unit of work is a Linear issue**, body following
   `docs/templates/epic.md` (parent) or `docs/templates/issue.md` (task).
   `/saas-skills:plan` creates them: the spec and the plan live in
   the parent's body, the tasks become sub-issues.
2. **Every issue becomes exactly one branch** (use Linear's suggested branch
   name so the PR auto-links), worked on in an **isolated workspace** (git
   worktree or a fresh clone/session) — never directly on the default
   branch, never two issues on one branch.
   `/saas-skills:implement <issue-id>` runs steps 2–4 end to end for
   the whole issue tree.
3. **Every branch is linked to exactly one pull request.** The PR merging is
   what ships that functionality (and closes the Linear issue) — nothing
   lands on the default branch except through its PR.
4. **After every push, watch CI until it is green** (verify, format,
   bug-analysis, readability). Do not report work as done, move to the next
   task, or ask for review while CI is red or still running. If CI fails,
   fix it and push again — the loop ends green.

## Planning

Use `/saas-skills:plan`. Its contract: the spec is closed before the
plan, an independent agent argues the counterpoint, the operator approves part
by part, all planning lives in Linear (never in repository files), and every
plan ends with the execution order showing what runs in parallel:

```
TSK-1 ---------- TSK-3 ------- TSK-4
TSK-2 ------------------------ TSK-5
```

(lanes run in parallel; left→right is sequential within a lane)

## Code rules

- **TDD** — the failing test comes first, it traces to what the issue asked
  for, and a review agent proves it by breaking the code (`guard` hook
  reminds; CI enforces). The `tdd` skill is the methodology.
- **Code standard** — the `code-standard` skill: the shape is decided first
  (its `design-and-patterns` reference), then written to the thresholds,
  naming and tie-breakers in the skill body.
- **Libraries over hand-rolled complexity** — searching for a library is the
  default, not an option; the bar it must clear is in the skill's
  `dependencies` reference. We don't grow bespoke logic in-repo.
- **Self-documenting** — descriptive names over comments; comment only a
  non-obvious *why*.
- **Module layout** — <describe your layout, e.g. one folder per module with
  fixed per-layer filenames>; the `guard` hook blocks violations.
- **Forbidden APIs** — <e.g. no `bun:*`/`Bun.*` in `src/` if production runs
  elsewhere>; configured in `.claude/saas-skills.json`.

## UI rules

See the `design` skill. Non-negotiables: **Kumo UI** for all interface work;
list-item actions via `DropdownMenu` (icon + item title, delete last in red
after a separator); deletions confirmed with Kumo's `DeleteResource` block.
Every UI change ships with **before** (when a before exists) **and after**
screenshots + screen recording, attached to the PR (see the `design` skill's
deliverables section).

## Docs

`docs/README.md` describes the system: ADRs for decisions, learnings for
surprises, runbooks for operations, INDEX.md files kept in sync by the docs
hook.
Record a learning whenever something genuinely surprised you. **Linear is the
standard for all task state** — plans and task lists never live in docs/.
