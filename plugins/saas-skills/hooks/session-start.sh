#!/usr/bin/env bash
# SessionStart hook — brings the project's environment up so tests, linters and
# the dev server work from the first message of a session.
#
# Configured in the consumer repository at .claude/saas-skills.json, under
# "sessionStart":
#
#   remoteOnly  when true (the default), only runs on Claude Code web sessions,
#               leaving local machines untouched
#   commands    shell commands run in order from the project root; a failing
#               command is reported and the rest still run
#
# Without that config file the hook is inert.
set -uo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$PWD}"
CONFIG="$PROJECT_DIR/.claude/saas-skills.json"

[ -f "$CONFIG" ] || exit 0
command -v jq >/dev/null 2>&1 || exit 0

session=$(jq -c '.sessionStart // {}' "$CONFIG" 2>/dev/null) || exit 0
[ "$session" = "{}" ] && exit 0

remote_only=$(jq -r '.remoteOnly // true' <<<"$session")
if [ "$remote_only" != "false" ] && [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$PROJECT_DIR" || exit 0

# Command output goes to stderr: this hook's stdout is reserved for the JSON
# the harness reads.
failed=()
while IFS= read -r command; do
  [ -n "$command" ] || continue
  echo "saas-skills session-start: $command" >&2
  bash -lc "$command" >&2 2>&1 || failed+=("$command")
done < <(jq -r '.commands[]? // empty' <<<"$session")

if [ ${#failed[@]} -gt 0 ]; then
  printf 'saas-skills session-start: %d command(s) failed: %s\n' \
    "${#failed[@]}" "${failed[*]}" >&2
fi
exit 0
