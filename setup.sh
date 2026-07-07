#!/usr/bin/env bash
# Bootstrap this kit into a target repository.
#
#   ./setup.sh /path/to/your-project
#
# Copies the workflows into .github/workflows/, the Claude Code setup into
# .claude/, the docs system into docs/, and AGENTS.template.md to AGENTS.md
# (only if the target has none). Existing files with the same names are
# overwritten — review `git status` in the target afterwards.
set -euo pipefail

TARGET="${1:?usage: ./setup.sh <target-repo-dir>}"
KIT="$(cd "$(dirname "$0")" && pwd)"

if [ ! -d "$TARGET/.git" ]; then
  echo "error: $TARGET is not a git repository (run git init first)" >&2
  exit 1
fi

mkdir -p "$TARGET/.github/workflows" "$TARGET/.claude" "$TARGET/docs"
cp -r "$KIT/github/workflows/." "$TARGET/.github/workflows/"
cp -r "$KIT/claude/." "$TARGET/.claude/"
cp -r "$KIT/docs/." "$TARGET/docs/"
chmod +x "$TARGET/.claude/hooks/"*.sh

# Record which kit commit this install corresponds to — the kit-sync skill
# diffs from this SHA to apply future kit updates.
git -C "$KIT" rev-parse HEAD > "$TARGET/.kit-version" 2>/dev/null \
  || echo unknown > "$TARGET/.kit-version"

if [ -f "$TARGET/AGENTS.md" ]; then
  echo "note: $TARGET/AGENTS.md already exists — left untouched (template at docs/AGENTS.template.md)"
  cp "$KIT/AGENTS.template.md" "$TARGET/docs/AGENTS.template.md"
else
  cp "$KIT/AGENTS.template.md" "$TARGET/AGENTS.md"
fi

echo "Kit installed into $TARGET"
cat <<'EOF'

Next steps — do them by hand, or open Claude Code in the target repo and ask
it to walk the list (each file marks its own TODOs):

 1. AGENTS.md               — fill the <placeholders> (project name, stack, commands).
 2. .github/workflows/      — ci.yml + format.yml: pick the toolchain block and wire
                              typecheck/lint/format/test as package scripts.
 3. Repo secret             — CLAUDE_CODE_OAUTH_TOKEN (`claude setup-token`) for
                              push-bug-analysis.yml and readability-analysis.yml.
 4. .claude/hooks/guard.sh  — set FORBIDDEN_PATTERNS and MODULE_BASENAMES.
 5. .claude/hooks/session-start.sh — set the install/local-stack commands.
 6. .claude/skills/simplicity/SKILL.md — fill the stack table.
 7. .claude/skills/plan/SKILL.md — set the Linear team/project it creates
                              issues in (Linear is the tracker; connect the
                              Linear MCP). Issue body standard:
                              docs/templates/issue.md.
 8. Future updates          — when the kit repo changes, run the `kit-sync`
                              skill here: it applies the kit diff since
                              .kit-version and opens a PR.
EOF
