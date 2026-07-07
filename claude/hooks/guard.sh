#!/usr/bin/env bash
# PreToolUse hook on Write|Edit: validates files before they are written.
# Project-agnostic version of the `guard` skill's deterministic rules — the
# two knobs below are the only things to adapt:
#
#   1) FORBIDDEN_PATTERNS — runtime APIs that must never appear in shipped
#      code under src/ (e.g. Bun/Node APIs in an edge runtime, server-only
#      APIs in shared code). Each entry is "<extended-regex>|<block message>".
#      Leave the array empty to disable the rule.
#   2) MODULE_BASENAMES — enforced file layout inside src/modules/*/
#      (pipe-separated basenames without extension). Leave empty to disable.
#
# Everything that needs judgment (TDD, staying inside the active task's
# domain) is NOT hard-blocked here — it is injected as additionalContext for
# the agent to self-check, with CI as the hard backstop.

set -e

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')
content=$(echo "$input" | jq -r '.tool_input.content // .tool_input.new_string // empty')

# --- Knob 1: forbidden runtime APIs in src/ (regex|message pairs) ---
FORBIDDEN_PATTERNS=(
  "from[[:space:]]+['\"]bun:|Blocked: importing from \`bun:*\` inside src/ does not work in the production runtime. Use Web standard APIs or your platform bindings."
  "\bBun\.|Blocked: using \`Bun.*\` inside src/ does not work in the production runtime. Use Web standard APIs or your platform bindings."
)

# --- Knob 2: allowed basenames inside src/modules/*/ (empty string disables) ---
MODULE_BASENAMES="validators|models|repositories|services|controllers|errors"

# Only act on src/**
if [[ "$file_path" != *"/src/"* ]]; then
  echo '{}'
  exit 0
fi

# Test files are exempt from the forbidden-API rule (they run on the dev
# runtime, not the production one).
is_test_file=false
if [[ "$file_path" == *.test.ts || "$file_path" == *.test.tsx ]]; then
  is_test_file=true
fi

# Rule 1: forbidden runtime APIs in src/
if [[ "$is_test_file" == false ]]; then
  for entry in "${FORBIDDEN_PATTERNS[@]}"; do
    pattern="${entry%%|*}"
    message="${entry#*|}"
    if echo "$content" | grep -qE "$pattern"; then
      jq -cn --arg reason "$message" '{decision:"block",reason:$reason}'
      exit 0
    fi
  done
fi

# Rule 2: module file layout — src/modules/<name>/<file>.ts (any nesting
# depth) must use one of the allowed basenames, or be a *.test.ts file.
if [[ -n "$MODULE_BASENAMES" && "$file_path" =~ /src/modules/(.+)/([^/]+)\.tsx?$ ]]; then
  basename="${BASH_REMATCH[2]}"
  if [[ "$is_test_file" == true ]]; then
    : # *.test.ts is always allowed — any name
  elif [[ ! "$basename" =~ ^(${MODULE_BASENAMES})$ ]]; then
    jq -cn --arg reason "Blocked: a file inside src/modules/<name>/ must be one of {${MODULE_BASENAMES//|/,}}.ts or *.test.ts. Got: ${basename}.ts. Keep one file per layer — do not anticipate subfolders or invent new layer names." '{decision:"block",reason:$reason}'
    exit 0
  fi
fi

# All deterministic rules passed — inject the judgment-based reminders.
echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"Before completing this Write/Edit, manually validate: (a) TDD — if this file holds behavior (services/repositories/controllers or equivalent), make sure the matching test under tests/ mirroring src/ already exists and is failing; CI runs the test suite on every push as the backstop. (b) Domain boundary — if there is an active task whose domain differs from the target module, record a cross-domain blocker issue in Linear instead of editing outside the domain."}}'
