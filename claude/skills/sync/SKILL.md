---
name: sync
description: Keeps every docs/**/INDEX.md in sync with the actual files on disk. Triggered by the PostToolUse hook on Write|Edit matching docs/plans/**, docs/dependencies/**, docs/learnings/**, and explicitly invoked by planning/guard skills. Walks each affected level, reads each file's frontmatter, regenerates the relevant INDEX.md with order + status. Detects inconsistencies (orphan files, INDEX entries pointing to non-existent files, status: completed without archiving). Never edits source documents — only INDEX.md files are output.
model: opus
---

# Skill: `sync`

Keeps the `INDEX.md` files under `docs/` consistent with the actual files on disk. INDEXes are **projections** of source files; the skill never edits sources.

## Trigger

1. **`PostToolUse` hook** on `Write|Edit` matching:
   - `docs/plans/**`
   - `docs/dependencies/**`
   - `docs/learnings/**`
2. **Explicit invocation** by other skills (e.g. a planning skill) when creating/moving/archiving items.
3. **Manual invocation** by the user ("sync the docs", "update the INDEXes").

## Algorithm

### 1. Determine affected scope

- Receive the `file_path` that was written.
- Identify the ancestor levels up to `docs/plans/`, `docs/dependencies/`, or `docs/learnings/`.
- Each ancestor level will have its `INDEX.md` regenerated.

### 2. Regenerate `INDEX.md` per level

For each affected `INDEX.md`:

1. List the child files/folders of the level (excluding `archived/`, `INDEX.md`, and the level's own source files like `PLAN.md`, `PHASE.md`, `CHANGE.md`).
2. Read the YAML frontmatter of each child source file (if it's a folder with its own source file, e.g. `phases/<slug>/PHASE.md`).
3. Extract: `slug` (from name or frontmatter), `status`, and the first line of the body as description.
4. Build the markdown table in the format:

```markdown
# <title derived from level>

## Execution order

1. [<slug>](./path) — <short description> · status: <status>
2. ...

## Archived

Items in [archived/](./archived/) — completed or discarded.
```

**Order**: follow the existing INDEX order (if any). For new items not listed, append at the end. If the INDEX doesn't exist yet, order alphabetically.

### 3. Consistency checks

After regenerating, scan for:

- **Orphan file**: exists on disk but not in INDEX → add an entry.
- **Broken entry**: INDEX points to a non-existent file → remove entry and log a warning.
- **Active `completed` status**: a file with `status: completed` still outside `archived/` → report as a suggestion (don't auto-move — user decides).
- **`pending` status in archived/**: file is archived but has `pending` status → report inconsistency.

### 4. Special cases

- **`docs/plans/INDEX.md`** — list of all plans (no parent level).
- **`docs/dependencies/INDEX.md`** — table format `slug | owner_domain | required_by | status`, reading each `docs/dependencies/tasks/*.md`.
- **`docs/learnings/INDEX.md`** — format `date | slug | title`, reading each `docs/learnings/<date>-<slug>.md`.

## Output

- **Reads and writes only `INDEX.md` files**. Never edits PLAN/PHASE/CHANGE/task/dependency-source.
- Emits a short log on stdout listing updated INDEXes and any detected inconsistencies.
- On frontmatter parse errors, report the problematic file and continue (don't fail).

## Language

All generated INDEX content follows the repository's language policy (single-language docs recommended). Description lines extracted from source bodies inherit whatever language the source uses.

## Performance

- When invoked by the hook, scope **only** the ancestor levels of the file that triggered it — don't walk all of `docs/`.
- When invoked explicitly with no target, run a full scan.
