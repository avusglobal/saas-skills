#!/usr/bin/env bash
# PostToolUse hook on Write|Edit — reminds the agent to re-run the `sync` skill
# after a documentation file changes, so every docs/**/INDEX.md stays a faithful
# projection of the files on disk.
#
# Configured in the consumer repository at .claude/saas-skills.json, under
# "docsSync":
#
#   watchPaths  path fragments that trigger the reminder (e.g. docs/adrs/)
#   reminder    the text injected; omit it to use the default below
#
# Without that config file the hook is inert.
set -uo pipefail

CONFIG="${CLAUDE_PROJECT_DIR:-$PWD}/.claude/saas-skills.json"

pass() { echo '{}'; exit 0; }

[ -f "$CONFIG" ] || pass
command -v jq >/dev/null 2>&1 || pass

sync=$(jq -c '.docsSync // {}' "$CONFIG" 2>/dev/null) || pass
[ "$sync" = "{}" ] && pass

input=$(cat)
file_path=$(jq -r '.tool_input.file_path // empty' <<<"$input" 2>/dev/null) || pass
[ -n "$file_path" ] || pass

# An INDEX.md is the sync skill's own output — reacting to it would loop.
[[ "$file_path" == *"/INDEX.md" ]] && pass

watched=false
while IFS= read -r watch_path; do
  [ -n "$watch_path" ] || continue
  if [[ "$file_path" == *"$watch_path"* ]]; then watched=true; break; fi
done < <(jq -r '.watchPaths[]? // empty' <<<"$sync")
[ "$watched" = true ] || pass

reminder=$(jq -r '.reminder // empty' <<<"$sync")
[ -n "$reminder" ] || reminder="Invoke the \`sync\` skill to regenerate the ancestor INDEX.md files and report inconsistencies (orphan files, entries pointing at files that no longer exist)."

jq -cn --arg context "Documentation changed: ${file_path}. ${reminder}" \
  '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:$context}}'
