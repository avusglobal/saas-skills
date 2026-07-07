#!/usr/bin/env bash
# One-line installer — run from inside the target project:
#
#   curl -fsSL https://raw.githubusercontent.com/gruporezult/code-toolkit/main/install.sh | bash
#
# Installs into the current directory. Variants:
#
#   ... | bash -s -- /path/to/project     # install into another directory
#   KIT_REF=my-branch ... | bash          # pin a kit branch/tag (default: main)
#
# No sudo needed — everything lands as regular files inside the target repo.
# The script clones the kit into a temp dir, runs its setup.sh against the
# target (copies files, records .kit-version, prints the fill-in checklist),
# then cleans up after itself.
set -euo pipefail

KIT_REPO="${KIT_REPO:-gruporezult/code-toolkit}"
KIT_REF="${KIT_REF:-main}"
TARGET="${1:-$(pwd)}"

command -v git >/dev/null 2>&1 || { echo "error: git is required" >&2; exit 1; }

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "Fetching $KIT_REPO@$KIT_REF ..."
git clone --quiet --depth 1 --branch "$KIT_REF" "https://github.com/$KIT_REPO.git" "$tmp/kit" \
  || { rm -rf "$tmp/kit"; git clone --quiet --depth 1 --branch "$KIT_REF" "git@github.com:$KIT_REPO.git" "$tmp/kit"; }

"$tmp/kit/setup.sh" "$TARGET"
