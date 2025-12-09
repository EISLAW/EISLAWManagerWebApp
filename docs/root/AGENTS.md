# AGENTS.md (Mirrored Placeholder)

**Canonical path:** `/AGENTS.md` (not present in this repo snapshot).  
**Mirror location:** `docs/root/AGENTS.md` for MkDocs inclusion.  
**Last sync:** commit `10535cd2` (placeholder created; canonical source missing on VM).

This page is a placeholder to keep MkDocs navigation aligned with the PRD. Once the canonical `/AGENTS.md` is added to the repo, replace this content with the synced copy and update the commit hash/date.  

## Temporary Contents
- The canonical AGENTS.md is not available in this VM checkout.  
- Add the real file at repo root, then re-run the mirror step: `cp AGENTS.md docs/root/AGENTS.md` and update the sync metadata above.  
- Ensure the mirrored copy preserves the canonical notice and last-sync hash.

## Services & Ports

### Dev Container Hot Reload Status
| Service | Hot Reload | Command/Notes |
|---------|------------|---------------|
| api | ✅ Yes | `uvicorn --reload` via `api` service (docker-compose) |
| web-dev | ✅ Yes | Vite HMR (`npm run dev -- --host --port 5173`) |
| orchestrator | ✅ Yes | `uvicorn orchestrator.main:app --reload` via `orchestrator` service (docker-compose; mounts ./backend/orchestrator) |
