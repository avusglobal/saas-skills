---
name: onboard
description: One-time project onboarding after installing the kit. Use when the user invokes /onboard, asks to "onboard this project", "configure the kit", "walk the setup checklist", or right after install.sh/setup.sh has run. Reaches common ground on WHAT the project is (product, users, problem, domain vocabulary) by reusing a PRD/README first and interviewing only for what stays open, then fills AGENTS.md, writes the docs/CONTEXT.md domain glossary, walks the rest of the setup checklist, and hands off to /architecture for the technical half.
disable-model-invocation: true
---

# Skill: `onboard`

Run **once, right after the kit is installed** (`install.sh` / `setup.sh`).
Its job is the common ground about **what the project is** — product, users,
problem, domain language — written down where every future agent session
will find it. The technical half (stack, where to modify, file templates)
belongs to `/architecture`, which this skill hands off to at the end.

## Flow

### 1. Explore first — reuse before asking

Read whatever already answers "what is this project": a **PRD** (in the
repo root, `docs/`, or Linear documents), the README, an existing
`AGENTS.md`/`CONTEXT.md`, package manifests, and the code's domain names
(module names, entity types). Take answers from these sources and cite
them — only what stays genuinely open goes to the interview.

### 2. Interview until common ground

Grilling style: **one question per turn** via `AskUserQuestion`, your
recommended answer first labeled `(Recommended)`. Cover, in order:

1. **What it is** — one sentence: what the product does.
2. **Who uses it** — the user(s) and the job they hire it for.
3. **The problem** — what breaks/costs/hurts without it.
4. **Domain vocabulary** — the nouns and verbs of the domain, and what
   each means *in this project* (e.g. what exactly is an "order", a
   "provider", a "session"). Challenge fuzzy terms until each has one
   crisp meaning.
5. **Boundaries** — what this project deliberately does NOT do.

Close with a one-paragraph summary and **wait for the user to confirm it.
Nothing is written before that confirmation.**

### 3. Fill `AGENTS.md`

Replace the `<placeholders>`: project one-line description, stack table,
and the install/typecheck/lint/test commands (verify them by running them
when the project already builds). Never overwrite content the user already
filled by hand — show a diff and ask.

### 4. Write `docs/CONTEXT.md` — the domain glossary

One table, one line per term:

```markdown
# Domain glossary

Term | Meaning in this project
---|---
<term> | <one crisp sentence>
```

Rules: terms come from step 2 and from the code; every future rename or
new entity must use these words (`plan` and `architecture` read this file
before naming anything). Keep it short — a glossary nobody maintains is
worse than none.

### 5. Walk the rest of the setup checklist

Go through the remaining items `setup.sh` printed, one at a time, asking
only what you can't derive:

- `.github/workflows/ci.yml` + `format.yml` — toolchain block and package
  scripts wired.
- `.claude/hooks/guard.sh` — propose `FORBIDDEN_PATTERNS` and
  `MODULE_BASENAMES` from what you learned about the stack.
- `.claude/hooks/session-start.sh` — install/local-stack commands.
- `.claude/skills/simplicity/SKILL.md` — fill the stack table.
- `.claude/skills/plan/SKILL.md` — the Linear team/project (remind the
  user to connect the Linear MCP).
- Remind about the `CLAUDE_CODE_OAUTH_TOKEN` repo secret (you can't create
  it — give the one-liner: `claude setup-token`).

### 6. Hand off to `/architecture`

Offer to run `/architecture` next — it produces `docs/ARCHITECTURE.md` +
`docs/STRUCTURE.md` (where to modify, how to create, file templates). The
project is ready for `/plan` once both halves exist.

## Delivery

Branch + PR like everything else. Exception: on a brand-new repo with no
history/CI yet, an initial commit to the default branch is acceptable —
say so explicitly in the report.

## Inviolable rules

- **Reuse before asking** — a PRD/README answer is never re-asked.
- **Facts from the code, decisions from the user.**
- **No writes before the user confirms the summary** (step 2 gate).
- Never overwrite hand-filled content without showing the diff first.
- English in everything written (kit language policy).
