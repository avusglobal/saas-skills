# Extracted reusable kit — CI, Docs, Skills

Project-agnostic assets extracted from `messager.dev`, ready to become a standalone versioned repository and be dropped into any other project (any stack). Everything stack-specific was either generalized into a configurable knob or deliberately left out (see [What was left behind](#what-was-left-behind-and-why)).

## Install into a project

```bash
./setup.sh /path/to/your-project
```

`setup.sh` copies everything to its real location (`.github/workflows/`, `.claude/`, `docs/`, `AGENTS.md`), makes the hooks executable, and prints the fill-in checklist. Then open Claude Code in the target repo and ask it to walk the checklist.

| Here | Installed at | What it is |
|---|---|---|
| `github/workflows/` | `.github/workflows/` | CI verify gate, auto-format, AI bug analysis, AI readability analysis |
| `claude/settings.json` | `.claude/settings.json` | Hook wiring (SessionStart, PreToolUse guard, PostToolUse sync) |
| `claude/hooks/` | `.claude/hooks/` | The three hook scripts |
| `claude/skills/` | `.claude/skills/` | Skills (see inventory) |
| `docs/` | `docs/` | Documentation system: conventions + templates (ADR, learning, runbook, INDEX) |
| `AGENTS.template.md` | `AGENTS.md` | Root agent doc template: solo-dev rule #0, delivery workflow, code/UI rules |

## Updating adopted repos

`setup.sh` records the installed kit commit in the target's `.kit-version`. When this kit gains new commits, open Claude Code in the adopted repo and run the **`kit-sync`** skill: it diffs the kit from `.kit-version` to the latest `main`, re-applies each change while preserving the repo's local adaptations (filled knobs, stack tables, commands), skips anything listed in that repo's `docs/KIT-DEVIATIONS.md`, bumps `.kit-version`, and delivers the result as a branch + PR (CI watched to green). Repos with specific needs record their intentional divergences in `docs/KIT-DEVIATIONS.md` — syncs never clobber them.

## Operating model (what the kit assumes)

- **One developer, many projects** — everything favors *simple to develop, simple to re-understand two months later* (AGENTS.md rule #0).
- **Linear issue → branch → PR**: every unit of work is a Linear issue (standard body in `docs/templates/issue.md`); each issue becomes exactly one GitHub branch, worked in an isolated workspace, linked to exactly one pull request; merging the PR ships the functionality.
- **Watch CI after every push**: work isn't done (and the next task doesn't start) until CI is green.
- **Planning** creates phase issues + task sub-issues in Linear — never planning files in the repo — and always ends with the execution-lanes diagram (which tasks run in parallel).

## Inventory

### CI (`github/workflows/`)

- **`ci.yml`** — single blocking `verify` job (typecheck → lint → test), superseded-run cancellation, frozen lockfile. Swap the toolchain block (Bun/Node) and keep the three commands as package scripts so CI and laptop never diverge.
- **`format.yml`** — auto-formats every PR and pushes the fix commit back to the branch (skips forks; note in-file caveat about GITHUB_TOKEN pushes not retriggering CI).
- **`push-bug-analysis.yml`** — Claude reviews every push's diff for **bugs** and posts/updates one PR comment. Deliberate design worth keeping: the model only *analyzes* (never holds a GitHub token — prompt-injection safe), all GitHub plumbing is deterministic shell, failures post an explicit "did not complete" notice instead of silence.
- **`readability-analysis.yml`** — Claude reviews every PR's diff for **readability** (the "will I understand this in 2 months?" bar): naming, function shape, indirection, comment quality, consistency, simplicity. Same analyze-then-publish architecture and marker-comment updates.

Both analysis workflows need the `CLAUDE_CODE_OAUTH_TOKEN` secret (`claude setup-token`); reports are written in English (kit-wide language policy).

### Claude Code setup (`claude/`)

- **`settings.json`** — wires the three hooks below (all via `$CLAUDE_PROJECT_DIR` so they run regardless of the hook's cwd).
- **`hooks/session-start.sh`** — on Claude Code web sessions only (`CLAUDE_CODE_REMOTE` guard): install deps + optionally boot a local stack so tests work from message one. Adapt the two marked lines.
- **`hooks/guard.sh`** — deterministic PreToolUse blocker with two knobs at the top: `FORBIDDEN_PATTERNS` (runtime APIs banned from shipped code) and `MODULE_BASENAMES` (enforced module file layout; empty disables). Judgment rules (TDD, domain boundaries) are injected as context, with CI as backstop.
- **`hooks/sync.sh`** — PostToolUse reminder to re-run the `sync` skill after docs change (ADRs, learnings).

### Skills (`claude/skills/`)

| Skill | Status | Notes |
|---|---|---|
| `simplicity` | generalized | The anti-over-engineering bias. Fill the stack table with *your* libraries when adopting. |
| `plan` | generalized | Interview-driven planning into Linear: phases = issues, tasks = sub-issues (bodies follow `docs/templates/issue.md`), issue→branch→PR delivery, and every plan ends with the execution-lanes parallelism diagram. |
| `design` | generalized | UI standard: **Kumo UI** (<https://kumo-ui.com/>) as-is, `data-mode` theming, and the mandatory list pattern — `DropdownMenu` row actions (icon + title, delete last in red after a separator) + [`DeleteResource`](https://kumo-ui.com/blocks/delete-resource/) confirmation. |
| `guard` | generalized | Spec for the guard hook's 4 rules; pairs with `hooks/guard.sh`. |
| `sync` | generalized | Keeps `docs/**/INDEX.md` as projections of files on disk. |
| `kit-sync` | generalized | Updates an adopted repo with the kit's changes since its recorded `.kit-version`: AI-assisted three-way merge that preserves local adaptations and `docs/KIT-DEVIATIONS.md`, then opens a PR. |
| `analyze-logs` | verbatim | evlog NDJSON log analysis. Applies to any TS project using [evlog](https://github.com/evlog). |
| `build-audit-logs` | verbatim | Audit-trail building with evlog; framework-agnostic. |
| `review-logging-patterns` | verbatim | Logging-pattern review + evlog adoption across ~15 frameworks. |

The three evlog skills are stack-conditional (they assume evlog) but project-agnostic — drop them if you don't use evlog. The `design` skill assumes Kumo UI by choice (the kit's UI standard).

### Docs system (`docs/`)

Conventions (English-only, INDEX-as-projection, surprise-only learnings, ADR immutability, executable runbooks, and **no plans or dependencies in docs — Linear owns all task state**) in `docs/README.md`, plus fill-in templates for ADRs, learnings, runbooks, INDEX files, and the mandatory Linear issue body (`templates/issue.md`).

## What was left behind (and why)

- **`deploy.yml`** — entirely Alchemy + Cloudflare Workers + PlanetScale specific (stages, resource adoption, preview DB reset). The reusable *ideas* (deploy only after CI on main, per-environment GitHub Environments, never cancel in-flight deploys, disposable preview DB) are worth reimplementing per project, but the file itself is not portable.
- **`provider-scaffolder` agent** — bound to the source repo's messaging-provider domain model.
- **Docs content** (`ARCHITECTURE.md`, `STRUCTURE.md`, the actual ADRs/learnings/runbooks) — those are the source project's decisions, not reusable assets; only their *formats* were extracted as templates.

## Adoption order (suggested)

1. `./setup.sh` + fill `AGENTS.md`.
2. `ci.yml` + `format.yml` — wire the package scripts.
3. Docs system + `sync` skill (already active via hooks).
4. `simplicity` (fill the stack table) + `guard` (configure the two knobs).
5. `push-bug-analysis.yml` + `readability-analysis.yml` (create the OAuth token secret).
6. `plan` + `design` skills.
7. From then on, updates flow via the `kit-sync` skill (see [Updating adopted repos](#updating-adopted-repos)).
