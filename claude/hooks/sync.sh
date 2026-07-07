#!/usr/bin/env bash
# Post-tool hook: fires after Write|Edit on docs/adrs|learnings.
# Injects a reminder for the agent to invoke the `sync` skill and regenerate INDEX.md files.

set -e

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# Only act on docs/adrs|learnings
if [[ "$file_path" != *"/docs/adrs/"* && "$file_path" != *"/docs/learnings/"* ]]; then
  echo '{}'
  exit 0
fi

# Avoid loop: if the modified file was an INDEX.md itself, do not fire sync
if [[ "$file_path" == *"/INDEX.md" ]]; then
  echo '{}'
  exit 0
fi

echo '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"Docs changed: '"$file_path"'. Invoke the `sync` skill to regenerate ancestor INDEX.md files and detect inconsistencies (orphan files, broken entries)."}}'
