#!/usr/bin/env bash
# PreToolUse hook on Write|Edit — the deterministic half of the `guard` skill.
#
# This script ships inside the plugin and is READ-ONLY for the projects that
# install it. Everything project-specific lives in the consumer repository at
# .claude/saas-skills.json (written by /saas-skills:setup), under "guard":
#
#   pathScope         only files whose path contains this substring are checked
#   testFilePatterns  globs that mark a file as a test (exempt from the rules)
#   forbiddenPatterns [{ pattern, message }] — extended regexes banned from
#                     shipped code; a match blocks the write with `message`
#   moduleLayout      { pathPattern, fileExtensions, basenames } — enforced file
#                     layout inside a module folder; omit `basenames` to disable
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

# Test files run on the dev runtime and own their own naming — they are exempt
# from both deterministic rules.
is_test=false
while IFS= read -r pattern; do
  [ -n "$pattern" ] || continue
  # shellcheck disable=SC2254 -- the pattern is a glob on purpose
  case "$file_path" in $pattern) is_test=true; break ;; esac
done < <(jq -r '.testFilePatterns[]? // empty' <<<"$guard")

block() { jq -cn --arg reason "$1" '{decision:"block",reason:$reason}'; exit 0; }

# Rule 1 — runtime APIs that must never reach shipped code.
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

# Rule 2 — one file per layer inside a module folder.
layout=$(jq -c '.moduleLayout // {}' <<<"$guard")
basenames=$(jq -r '[.basenames[]?] | join("|")' <<<"$layout")
if [ "$is_test" = false ] && [ -n "$basenames" ]; then
  layout_path=$(jq -r '.pathPattern // "/src/modules/"' <<<"$layout")
  extensions=$(jq -r '[.fileExtensions[]?] | join("|")' <<<"$layout")
  [ -n "$extensions" ] || extensions="ts|tsx"
  if [[ "$file_path" == *"$layout_path"* ]]; then
    basename="${file_path##*/}"
    extension="${basename##*.}"
    stem="${basename%.*}"
    if [[ "|$extensions|" == *"|$extension|"* && ! "$stem" =~ ^(${basenames})$ ]]; then
      block "Blocked: files under ${layout_path} must be named one of {${basenames//|/, }}.${extension}, or be a test file. Got: ${basename}. Keep one file per layer — do not invent new layer names or anticipate subfolders."
    fi
  fi
fi

# Everything deterministic passed. Hand the judgment rules to the agent.
advisory=$(jq -r '.advisoryContext // empty' <<<"$guard")
[ -n "$advisory" ] || pass
jq -cn --arg context "$advisory" \
  '{hookSpecificOutput:{hookEventName:"PreToolUse",additionalContext:$context}}'
