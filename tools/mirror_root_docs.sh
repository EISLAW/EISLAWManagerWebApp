#!/usr/bin/env bash
# Sync canonical root docs into docs/root/ for MkDocs inclusion
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT_DIR/docs/root"
mkdir -p "$DEST"

commit_hash=$(cd "$ROOT_DIR" && git rev-parse --short HEAD || echo "unknown")
now_utc=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

for name in CLAUDE.md AGENTS.md; do
  src="$ROOT_DIR/$name"
  dest="$DEST/$name"
  if [ ! -f "$src" ]; then
    echo "[mirror_root_docs] Missing source: $src" >&2
    continue
  fi

  {
    echo "> Mirrored from $name (canonical at repo root)."
    echo "> Last sync commit: $commit_hash on $now_utc UTC."
    echo
    cat "$src"
  } > "$dest"
done
