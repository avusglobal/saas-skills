# Documentation system

A project-agnostic documentation layout extracted from a production repo where 100% of the code is written by AI agents. Its goal is to make every non-obvious decision, lesson, and procedure **discoverable by an agent** before it repeats a mistake or re-litigates a decision.

## Layout

```
docs/
  INDEX.md            — map of all documentation (the onboarding entry point)
  CONTEXT.md          — domain glossary: one line per term, its meaning in this project (written by the `onboard` skill; every rename/new entity uses these words)
  ARCHITECTURE.md     — stack, runtime, request flow (project-specific; the `architecture` skill generates and maintains it)
  STRUCTURE.md        — source of truth for layout + conventions, where-to-change guide, file templates (kept by the `architecture` skill)
  adrs/               — Architecture Decision Records (Nygard format)
    INDEX.md          — numbered table: # | Title | Status
    0001-<slug>.md
  learnings/          — non-obvious lessons captured during development
    INDEX.md          — table: date | slug | title
    <YYYY-MM-DD>-<slug>.md
  runbooks/           — operational procedures (enablement, cutover, rotation)
    <slug>.md
  templates/          — fill-in formats (ADR, learning, runbook, INDEX, issue)
```

## Rules that make it work

1. **One language for everything: English.** Enforce it in every doc, commit, issue, and CI report. Mixed-language docs rot fast and split search.
2. **Linear is the standard for all task state.** Every plan, phase, task, and cross-domain blocker is a **Linear issue** (mandatory body format in [templates/issue.md](./templates/issue.md)) — never a file in docs/. docs/ records only decisions (ADRs), surprises (learnings), and procedures (runbooks). The moment a file starts tracking work state, it belongs in Linear, not here.
3. **INDEX.md files are projections, never sources.** Every folder has an `INDEX.md` listing its children with status. They are regenerated from the files' frontmatter (the `sync` skill + PostToolUse hook automate this) — never hand-edit an INDEX to say something the source files don't.
4. **ADRs record decisions, not designs.** Nygard format: Status / Context / Decision / Consequences. Number them (`0001-...`), never delete — supersede (link both ways) or amend (dated note under Status).
5. **Learnings are surprise-only.** If it's in official docs or inferable from the code, it doesn't belong. Only what genuinely surprised you (a library quirk, a platform behavior, a dead end). Date-prefixed filename, frontmatter with `slug`, `date`, `relates_to`.
6. **Runbooks are executable prose.** Numbered steps, environment matrix tables, troubleshooting section. Written so an agent (or a person at 3am) can follow them without asking anyone.
7. **Onboarding is a numbered list in `docs/INDEX.md`.** New agent/session: read the root agent doc (`AGENTS.md`/`CLAUDE.md`), then STRUCTURE, then the templates, then the open issues in Linear. Keep it to 4–5 steps.

## Templates

- [templates/adr.md](./templates/adr.md)
- [templates/learning.md](./templates/learning.md)
- [templates/runbook.md](./templates/runbook.md)
- [templates/INDEX.md](./templates/INDEX.md)
- [templates/issue.md](./templates/issue.md) — the body format for **every Linear issue**
