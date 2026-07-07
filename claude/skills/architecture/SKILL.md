---
name: architecture
description: Analyze the project's stack and architecture in depth and materialize them as docs agents can act on. Use when the user invokes /architecture, asks to "define the architecture", "document the stack", "map the structure", or when docs/ARCHITECTURE.md or docs/STRUCTURE.md are missing or stale. Explores the codebase first, reuses an existing PRD/ADRs/docs to answer what it can, interviews the user for the decisions code can't reveal, then writes docs/ARCHITECTURE.md and docs/STRUCTURE.md — including a where-to-change guide and file templates for creating new code — and wires the results into AGENTS.md and the guard hook knobs.
disable-model-invocation: true
---

# Skill: `architecture`

Builds a **shared understanding of the project's stack and architecture**
and writes it down where agents will find it: `docs/ARCHITECTURE.md` (what
the system is) and `docs/STRUCTURE.md` (where to modify, how to create —
with file templates). The goal is that any fresh agent session can answer
"where does this change go, and what does a new file here look like?"
without asking anyone.

## Flow

### 1. Explore first — facts come from the code, not the user

Read before asking anything: `AGENTS.md`, package manifests + lockfile,
config files (tsconfig, bundler, framework, CI workflows), entry points,
the `src/` module tree, the `tests/` layout, `.claude/` knobs (guard
patterns, module basenames), and all existing docs — `ARCHITECTURE.md`,
`STRUCTURE.md`, ADRs, learnings. Build the inventory: runtime(s),
framework, database, UI kit, test runner, deploy target, module layout,
layer conventions, naming patterns, and every place where **two competing
patterns** coexist (those become questions).

### 2. Reuse before interviewing

If a **PRD**, an ADR, or prior docs already answer a question, take the
answer from there and cite it — don't re-ask what is already decided.
Check `docs/`, Linear documents/issues, and the repo root for PRD-like
files. Only decisions that remain genuinely open go to the interview.

### 3. Interview until common ground

For what the code can't reveal — which of two coexisting patterns is
canonical, where new features should live, what is deprecated, hard
runtime constraints, boundaries between domains — ask **one question per
turn** via `AskUserQuestion`, with your recommended answer as the first
option labeled `(Recommended)`. Every recommendation follows AGENTS.md
rule #0's **stack bias**: one maintainer, no ops team — so easy to use, no
maintenance, easy to configure, preferably auto-scaling
(managed/serverless) options come first. Close with a one-paragraph
summary of the agreed stack + architecture and **wait for the user to
confirm it. Nothing is written before that confirmation.**

### 4. Write the two docs

**`docs/ARCHITECTURE.md`** — what the system is:

- Stack table (layer → technology → why, one line each).
- Runtime & request/data flow (entry point → handler → data, in prose or
  one small diagram).
- Integration points (external services, queues, storage).
- Hard constraints (production runtime limits, forbidden APIs — mirror the
  guard hook's knobs).

**`docs/STRUCTURE.md`** — where to modify and how to create:

- The layout tree with one line per folder saying what belongs there.
- **"Where do I change what"** table: kind of change (new endpoint, new
  field, new page, new background job…) → exact location + which existing
  file to imitate.
- **"How to create"** recipes: new module, new endpoint, new UI page, new
  test — each with **file templates** as fenced code blocks with
  `<placeholders>`, matching the enforced layer basenames (guard hook) and
  the tests-mirror-src convention. Templates are minimal (see
  `simplicity`): the skeleton agents copy, not example business logic.

### 5. Wire it in

- Update `AGENTS.md`: stack table + module-layout rule now reference the
  confirmed reality (and link both docs).
- Propose values for the guard hook knobs (`MODULE_BASENAMES`,
  `FORBIDDEN_PATTERNS`) when the confirmed layout differs from what is
  configured — show the diff, apply on approval.
- Any decision unearthed here that is hard to reverse and carries a real
  trade-off → propose an ADR (don't silently bury decisions in prose).
- Let the `sync` skill refresh `docs/INDEX.md`.

### 6. Re-runs update — they never clobber

When the docs already exist, diff them against the explored reality:
update what drifted, add what's missing, and **preserve hand-written
custom content** (same spirit as `kit-sync`). Confirm any section you
would rewrite substantially before touching it.

## Delivery

Branch + PR like everything else (`docs/architecture-<date>`), CI watched
to green. The PR body lists: what was derived from code, what came from
the PRD/ADRs, what the user decided in the interview.

## Inviolable rules

- **Facts from the code, decisions from the user** — never invent a
  convention the code doesn't show and the user didn't confirm.
- **No writes before the user confirms the summary** (step 3 gate).
- Templates must match the guard hook's enforced layout — the docs and the
  hook can't disagree.
- English everywhere.
