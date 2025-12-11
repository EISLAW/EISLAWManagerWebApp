#!/usr/bin/env bash
# Pull target branch and rebuild services safely on the VM
# Usage: BRANCH=name SERVICES="api web" bash tools/remote_sync.sh
set -euo pipefail

BRANCH=${BRANCH:-${1:-dev-main-2025-12-11}}
REPO_DIR=${REPO_DIR:-$(cd "$(dirname "$0")/.." && pwd)}
DOCKER_COMPOSE=${DOCKER_COMPOSE:-/usr/local/bin/docker-compose-v2}
SERVICES=${SERVICES:-}

log() { echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] $*"; }

cd "$REPO_DIR"
log "Starting sync for branch=$BRANCH in $REPO_DIR"

# Stash dirty state (including untracked) to avoid overwriting runtime files
dirty=0
if ! git diff --quiet --ignore-submodules HEAD || [ -n "$(git status --porcelain)" ]; then
  dirty=1
  log "Working tree dirty; stashing before sync"
  git stash push --include-untracked -m "auto-sync-$BRANCH-$(date -u +"%Y%m%dT%H%M%SZ")" || true
fi

log "Fetching origin/$BRANCH"
git fetch origin "$BRANCH"

if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git checkout "$BRANCH"
else
  git checkout -B "$BRANCH" "origin/$BRANCH"
fi

log "Resetting to origin/$BRANCH"
git reset --hard "origin/$BRANCH"

deploy_services() {
  if [ -n "$SERVICES" ]; then
    log "Rebuilding services: $SERVICES"
    $DOCKER_COMPOSE pull $SERVICES || true
    $DOCKER_COMPOSE up -d --build $SERVICES
  else
    log "Rebuilding all services"
    $DOCKER_COMPOSE pull || true
    $DOCKER_COMPOSE up -d --build
  fi
}

if command -v $DOCKER_COMPOSE >/dev/null 2>&1; then
  deploy_services
else
  log "docker-compose-v2 not found; skipping service restart"
fi

# Restore stashed local data if we stashed earlier
if [ "$dirty" -eq 1 ]; then
  log "Restoring stashed local changes"
  git stash pop || log "No stash to pop or conflicts occurred; please resolve manually"
fi

log "Sync complete"
