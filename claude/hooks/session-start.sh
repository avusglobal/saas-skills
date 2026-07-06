#!/bin/bash
# SessionStart hook for Claude Code on the web: install dependencies and bring
# up whatever local stack the project needs (database, migrations, seed data)
# so tests, linters and the dev server work from the first message. Local
# machines are untouched (CLAUDE_CODE_REMOTE guard).
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# --- Adapt to your project ---
# Install dependencies with a frozen lockfile (pick your package manager):
bun install --frozen-lockfile # or: npm ci / pnpm install --frozen-lockfile

# Optional: bring up the local stack so integration tests and authenticated
# flows work without manual setup, e.g.:
# bash scripts/local-stack.sh   # DB up + migrations + seeded dev user
