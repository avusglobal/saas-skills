---
name: sync
description: Keeps every docs/**/INDEX.md in sync with the actual files on disk. Triggered by the PostToolUse hook on Write|Edit matching docs/adrs/** and docs/learnings/**, and explicitly invoked by other skills. Walks each affected level, reads each file's frontmatter, regenerates the relevant INDEX.md. Detects inconsistencies (orphan files, INDEX entries pointing to non-existent files). Never edits source documents — only INDEX.md files are output.
model: opus
---

# Skill: `sync`

Keeps the `INDEX.md` files under `docs/` consistent with the actual files on disk. INDEXes are **projections** of source files; the skill never edits sources.

## Trigger

1. **`PostToolUse` hook** on `Write|Edit` matching:
   - `docs/adrs/**`
   - `docs/learnings/**`
2. **Explicit invocation** by other skills when creating/moving/archiving items.
3. **Manual invocation** by the user ("sync the docs", "update the INDEXes").

## Algorithm

### 1. Determine affected scope

- Receive the `file_path` that was written.
- Identify the ancestor levels up to `docs/adrs/` or `docs/learnings/`.
- Each ancestor level will have its `INDEX.md` regenerated.

### 2. Regenerate `INDEX.md` per level

For each affected `INDEX.md`:

1. List the child files/folders of the level (excluding `archived/` and `INDEX.md`).
2. Read the YAML frontmatter of each child source file.
3. Extract: `slug` (from name or frontmatter), `status`, and the first line of the body as description.
4. Build the markdown table using the folder's variant from `docs/templates/INDEX.md` (ADRs: `# | Title | Status`; learnings: `date | slug | title`).

**Order**: ADRs numerically; learnings by date (oldest first).

### 3. Consistency checks

After regenerating, scan for:

- **Orphan file**: exists on disk but not in INDEX → add an entry.
- **Broken entry**: INDEX points to a non-existent file → remove entry and log a warning.

### 4. Special cases

- **`docs/adrs/INDEX.md`** — table format `# | Title | Status`, reading each `docs/adrs/NNNN-<slug>.md`.
- **`docs/learnings/INDEX.md`** — format `date | slug | title`, reading each `docs/learnings/<date>-<slug>.md`.

## Output

- **Reads and writes only `INDEX.md` files**. Never edits the source documents.
- Emits a short log on stdout listing updated INDEXes and any detected inconsistencies.
- On frontmatter parse errors, report the problematic file and continue (don't fail).

## Language

All generated INDEX content is in English (the kit's language policy). Description lines extracted from source bodies inherit whatever language the source uses.

## Performance

- When invoked by the hook, scope **only** the ancestor levels of the file that triggered it — don't walk all of `docs/`.
- When invoked explicitly with no target, run a full scan.
