---
name: kit-sync
description: Update this repository with the latest changes from the code-toolkit kit. Use when the user invokes /kit-sync, asks to "update the kit", "sync the toolkit", "pull kit updates", or after the kit repo gains commits that should land here. Reads .kit-version (the kit commit this repo was last synced to), diffs the kit from that commit to its latest main, applies each change while preserving this repo's local adaptations and the deviations listed in docs/KIT-DEVIATIONS.md, bumps .kit-version, and delivers everything as one branch + PR.
model: opus
---

# Skill: `kit-sync`

Brings this repository up to date with the kit. The kit installs by copy
(`setup.sh`), so updates are an **AI-assisted three-way merge**: what the kit
changed × what this repo customized.

- **Kit repo (knob):** `git@github.com:gruporezult/code-toolkit.git`, branch `main`.
- **`.kit-version`** (repo root): the kit commit SHA this repo was last synced
  to. Written by `setup.sh` on install and by every successful sync.
- **`docs/KIT-DEVIATIONS.md`** (optional): this repo's intentional divergences
  from the kit — one bullet per file/behavior, with the reason. Never
  overwritten by a sync.

## Path mapping (kit → this repo)

| Kit | Here | Update policy |
|---|---|---|
| `github/workflows/` | `.github/workflows/` | port changes; keep local toolchain/commands |
| `claude/` | `.claude/` | port changes; keep filled knobs (guard patterns, stack tables, session-start commands) |
| `docs/` | `docs/` | port conventions/templates; never touch this repo's own ADRs/learnings/runbooks |
| `AGENTS.template.md` | `AGENTS.md` | structural changes only — never overwrite filled content |

## Flow

1. **Resolve the range.** Read `.kit-version` → `OLD`. Clone or fetch the kit
   into a temp dir; `main` HEAD → `NEW`. If `OLD == NEW`, report "already up to
   date" and stop. If `.kit-version` is missing (repo adopted before this skill
   existed), infer the closest kit commit by comparing kit-owned files against
   the kit's history, confirm it with the user, then proceed.
2. **Understand the delta.** In the kit clone: `git log --oneline OLD..NEW` and
   `git diff OLD..NEW`. Summarize for the user what the sync will carry.
3. **Apply file by file** (mapping paths per the table above):
   - Listed in `docs/KIT-DEVIATIONS.md` → **skip**, note it in the PR body.
   - Identical here to the kit@OLD version → apply the kit's new version verbatim.
   - Locally adapted (filled knobs, project names, commands) → port the kit's
     change **around** the local adaptation; when the kit changed the very lines
     the repo adapted, prefer the repo's values inside the kit's new structure.
   - Deleted in the kit → delete here too (unless a deviation).
   - New in the kit → add it.
4. **Bump `.kit-version`** to `NEW`.
5. **Verify.** Hooks stay executable (`chmod +x .claude/hooks/*.sh`), workflow
   YAML parses, and this repo's own verify commands (typecheck/lint/test) pass.
6. **Deliver as branch + PR.** Branch `kit-sync/<NEW-short-sha>`, PR titled
   `Sync kit to <NEW-short-sha>`; body lists the kit commits applied, every file
   adapted (and how), deviations skipped, and anything left unresolved. Watch CI
   to green.

## Inviolable rules

- Never apply directly on the default branch — always branch + PR.
- Never overwrite a deviation or a filled knob without asking.
- What can't be applied cleanly: apply the safe parts, and list the remainder in
  the PR body with the kit's diff hunk — an incomplete sync must be visible, not
  silent.
- English everywhere (branch, commits, PR, notes).
