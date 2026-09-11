# Documentation system

A project-agnostic documentation layout extracted from a production repo where 100% of the code is written by AI agents. Its goal is to make every non-obvious decision, lesson, and procedure **discoverable by an agent** before it repeats a mistake or re-litigates a decision.

## Layout

```
docs/
  INDEX.md               — map of all documentation (the onboarding entry point)
  adrs/                  — Architecture Decision Records (Nygard format)
    INDEX.md             — numbered table: # | Title | Status
    0001-<slug>.md
  learnings/             — non-obvious lessons captured during development
    INDEX.md             — table: date | slug | title
    <YYYY-MM-DD>-<slug>.md
  runbooks/              — operational procedures (enablement, cutover, rotation)
    INDEX.md             — table: runbook | covers
    <slug>.md
  sessions/              — records of important sessions, saved only on the operator's yes
    INDEX.md             — table: date | slug | title
    <YYYY-MM-DD>-<slug>.md
  templates/             — fill-in formats (epic, issue, ADR, learning, runbook, session)
```

## Rules that make it work

1. **One language for everything: English.** Enforce it in every doc, commit, issue, and CI report. Mixed-language docs rot fast and split search.
2. **Linear is the standard for all task state.** Every plan, phase, task, and cross-domain blocker is a **Linear issue** (mandatory body format in [templates/issue.md](./templates/issue.md)) — never a file in docs/. docs/ records only decisions (ADRs), surprises (learnings), procedures (runbooks) and the story of an important session (sessions, rule 8). The moment a file starts tracking work state, it belongs in Linear, not here.
3. **INDEX.md files are projections, never sources.** Every folder has an `INDEX.md` listing its children with status; the scaffold ships them empty. They are regenerated from the files' frontmatter after every docs change (the PostToolUse docs hook reminds the agent) — never hand-edit an INDEX to say something the source files don't.
4. **ADRs record decisions, not designs.** Nygard format: Status / Context / Decision / Consequences. Number them (`0001-...`), never delete — supersede (link both ways) or amend (dated note under Status).
5. **Learnings are surprise-only.** If it's in official docs or inferable from the code, it doesn't belong. Only what genuinely surprised you (a library quirk, a platform behavior, a dead end). Date-prefixed filename, frontmatter with `slug`, `date`, `relates_to`.
6. **Runbooks are executable prose.** Numbered steps, environment matrix tables, troubleshooting section. Written so an agent (or a person at 3am) can follow them without asking anyone.
7. **Onboarding is a numbered list in `docs/INDEX.md`.** New agent/session: read the root agent doc (`AGENTS.md`/`CLAUDE.md`), then the ADR index, then the templates, then the open issues in Linear. Keep it to 4–5 steps.
8. **Sessions are saved only when the operator says yes.** At the end of a session that produced a decision, a dead end or a change across several files, the agent asks once whether to save it under `sessions/` ([templates/session.md](./templates/session.md)). A session record is the story of one important session — goal, what was done, decisions, dead ends, what was left open — written for the next session that starts cold. It is never task state: an open item is a Linear issue the record links to. A one-line exchange is never asked about.

## Templates

- [templates/epic.md](./templates/epic.md) — the body of a parent issue: the spec **and** the plan
- [templates/issue.md](./templates/issue.md) — the body format for **every task issue**
- [templates/adr.md](./templates/adr.md)
- [templates/learning.md](./templates/learning.md)
- [templates/runbook.md](./templates/runbook.md)
- [templates/session.md](./templates/session.md) — the record of an important session, saved on the operator's yes
