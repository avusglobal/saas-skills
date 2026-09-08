#!/usr/bin/env bash
# PreToolUse hook on Write|Edit — the deterministic write guard.
#
# This script ships inside the plugin and is READ-ONLY for the projects that
# install it. Everything project-specific lives in the consumer repository at
# .claude/saas-skills.json (written by /saas-skills:setup), under "guard":
#
#   pathScope         only files whose path contains this substring are checked
#   testFilePatterns  globs that mark a file as a test (exempt from the rules)
#   forbiddenPatterns [{ pattern, message }] — extended regexes banned from
#                     shipped code; a match blocks the write with `message`
#   advisoryContext   free text injected on every allowed write (TDD reminders,
#                     domain boundaries — judgment rules that must not hard-block)
#
# Without that config file the hook is completely inert, so installing the
# plugin never changes behavior in a project that has not opted in.
set -uo pipefail

CONFIG="${CLAUDE_PROJECT_DIR:-$PWD}/.claude/saas-skills.json"

# Allow the write and stop. Every failure path uses this: a broken guard must
# never block the user's work.
pass() { echo '{}'; exit 0; }

[ -f "$CONFIG" ] || pass
command -v jq >/dev/null 2>&1 || pass

guard=$(jq -c '.guard // {}' "$CONFIG" 2>/dev/null) || pass
[ "$guard" = "{}" ] && pass

input=$(cat)
file_path=$(jq -r '.tool_input.file_path // empty' <<<"$input" 2>/dev/null) || pass
[ -n "$file_path" ] || pass
content=$(jq -r '.tool_input.content // .tool_input.new_string // empty' <<<"$input" 2>/dev/null)

path_scope=$(jq -r '.pathScope // "/src/"' <<<"$guard")
[[ "$file_path" == *"$path_scope"* ]] || pass

# Test files run on the dev runtime — they are exempt from the forbidden
# patterns.
is_test=false
while IFS= read -r pattern; do
  [ -n "$pattern" ] || continue
  # shellcheck disable=SC2254 -- the pattern is a glob on purpose
  case "$file_path" in $pattern) is_test=true; break ;; esac
done < <(jq -r '.testFilePatterns[]? // empty' <<<"$guard")

# The PreToolUse-specific output shape: `permissionDecision` is what the
# harness documents today; the older top-level `decision: block` is no longer
# in the docs and could stop being read without any error reaching us.
block() {
  jq -cn --arg reason "$1" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$reason}}'
  exit 0
}

# The one deterministic rule — runtime APIs that must never reach shipped code.
if [ "$is_test" = false ] && [ -n "$content" ]; then
  while IFS= read -r entry; do
    [ -n "$entry" ] || continue
    pattern=$(jq -r '.pattern // empty' <<<"$entry")
    [ -n "$pattern" ] || continue
    if grep -qE -- "$pattern" <<<"$content"; then
      message=$(jq -r '.message // empty' <<<"$entry")
      block "${message:-Blocked: this file matches a pattern forbidden in shipped code (guard.forbiddenPatterns in .claude/saas-skills.json).}"
    fi
  done < <(jq -c '.forbiddenPatterns[]? // empty' <<<"$guard")
fi

# Everything deterministic passed. Hand the judgment rules to the agent.
advisory=$(jq -r '.advisoryContext // empty' <<<"$guard")
[ -n "$advisory" ] || pass
jq -cn --arg context "$advisory" \
  '{hookSpecificOutput:{hookEventName:"PreToolUse",additionalContext:$context}}'
