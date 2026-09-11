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
planning and ADRs):** prefer pieces that are **easy to use**, **easy to
configure**, and cheap to leave. On infrastructure, **provisioned over
serverless while the project is small** — an instance rented by the month
costs less to keep running than per-request pricing, and its bill does not
move with traffic. Serverless earns its place when the load is spiky enough
that the instance sits idle most of the time, or when one instance stops being
enough. There is no ops team either way, so anything that needs constant
babysitting is still a cost this project cannot pay.

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
- A long session gets compacted, and a summarizer keeps a rule only when it
  reads as one. Write every constraint as an order on its own line, restate
  facts instead of pointing back at an earlier turn, and put anything that
  must outlive the session into this repository, not only into a message.

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
| UI, forms, state | <...> |
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

- Install: `<install command, with a frozen lockfile>`
- Typecheck: `<typecheck command>`
- Lint/format: `<lint command>` / `<format command>`
- Test: `<test command>`

## Delivery workflow (inviolable)

1. **Every unit of work is a Linear issue**, body following
   `docs/templates/epic.md` (parent) or `docs/templates/issue.md` (task).
   `/saas-skills:spec` creates them: the spec and the plan live in the
   parent's body, the tasks become sub-issues.
2. **Every issue becomes exactly one branch** (use Linear's suggested branch
   name so the PR auto-links), worked on in an **isolated workspace** (git
   worktree or a fresh clone/session) — never directly on the default
   branch, never two issues on one branch.
   `/saas-skills:implement <issue-id>` runs steps 2–4 end to end for the
   whole issue tree.
3. **Every branch is linked to exactly one pull request.** The PR merging is
   what ships that functionality (and closes the Linear issue) — nothing
   lands on the default branch except through its PR.
4. **After every push, watch CI until the `verify` job is green.** It is the
   only blocking check. The `format` workflow may push a formatting commit.
   Code review is not a workflow: the `bug-reviewer`, `spec-verifier` and
   `simplify` agents run inside `/saas-skills:implement`, in the child
   workspace, so CI never pays for a second copy of that review. Do not
   report work as done, move to the next task, or ask for review while
   `verify` is red or still running. If it fails, fix it and push again — the
   loop ends green.

## Planning

Use `/saas-skills:spec`. Its contract: the spec is closed before the plan, an independent agent argues the counterpoint, the operator approves part
by part, all planning lives in Linear (never in repository files), and every
plan ends with the execution order showing what runs in parallel:

```
TSK-1 ---------- TSK-3 ------- TSK-4
TSK-2 ------------------------ TSK-5
```

(lanes run in parallel; left→right is sequential within a lane)

## Code rules

- **TDD** — the failing test comes first, it traces to what the issue asked
  for, and the `spec-verifier` agent proves it by breaking the code. The
  guard hook reminds on every write; the `tdd` skill is the methodology.
- **Code standard** — the `code-standard` skill: the shape is decided first
  (its `design-and-patterns` reference), then written to the thresholds,
  naming and tie-breakers in the skill body.
- **Libraries over hand-rolled complexity** — searching for a library is the
  default, not an option; the bar it must clear is in the skill's
  `dependencies` reference. We don't grow bespoke logic in-repo.
- **Stage before scale** — the `not-overengineering` skill. The project is
  at the stage its numbers prove, never the one it hopes for: everything
  in-process on one instance until traffic is measured, no compliance work
  (LGPD, GDPR, audit, retention) until real users' data is held, no option
  or edge case until someone hits it. Current stage: <0 — no users | 1 —
  first users | 2 — measured load>, measured by <what proves it>.
- **Self-documenting** — descriptive names over comments; comment only a
  non-obvious *why*.
- **Module layout** — package by feature: one directory per subdomain holding
  its entity, service, repository and controller together. No top-level
  `controllers/`, `services/` or `repositories/`.

  ```
  <src>/
    books/     book.entity.<ext>  book.service.<ext>  book.repository.<ext>  book.controller.<ext>
    users/     user.entity.<ext>  ...
    rentals/   rental.entity.<ext>  ...
    shared/    technical capability only — logging, config, database access; no business rule
  ```

  A directory per use case (`features/`) exists only next to a `domain/` that
  holds the one definition of the entity, and only where `/saas-skills:spec`
  measured the signal for it. Modules talk through a public entry point or an event, never
  through each other's internals and never by sharing an entity.

  Tests live in <`tests/`, mirroring `src/` — or co-located as
  `*.test.<ext>` next to the module>.

  <Replace the tree and the test location with this project's real paths and
  file naming. Keep the rules above.> The guard hook repeats this section as
  context on every write.
- **Forbidden APIs** — <e.g. no server-runtime built-ins in `src/` if
  production runs on the edge>; configured in `.claude/saas-skills.json`.

## UI rules

<The component library and the non-negotiables for interface work, if the
project has a UI. Delete this section otherwise.> Every UI change ships with
**before** (when a before exists) **and after** screenshots attached to the
PR.

## Docs

`docs/README.md` describes the system: ADRs for decisions, learnings for
surprises, runbooks for operations, sessions for the story of an important
session, INDEX.md files regenerated after every docs change (the docs hook
reminds).
Record a learning whenever something genuinely surprised you. **Linear is the
standard for all task state** — plans and task lists never live in docs/.

**At the end of a session that produced a decision, a dead end or a change
across several files, ask once whether to save it under `docs/sessions/`**
(`docs/templates/session.md`). Never save without a yes, and never ask after
a one-line exchange.
