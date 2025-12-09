Dev Port Map (frontend/api/dev tools)
=====================================

Purpose: fixed, predictable ports to avoid conflicts and accidental drift between dev and prod.

Defaults
- Frontend (Vite/React): 3000
- Backend API: 8080
- Dev tools (storybook/admin/etc.): 9001, 9002, … (keep within 9000–9099)
- DB/queues: keep vendor defaults (e.g., Postgres 5432, Redis 6379) and don’t expose externally unless required.

Rules
- Do not auto-bump ports. Fail fast if the port is busy; resolve the conflict explicitly.
- Frontend dev script: `npm run dev -- --host --port 3000`.
- Backend: run uvicorn/API on 8080. If behind Docker compose, map `8080:8080`.
- Only override via env (e.g., FRONTEND_PORT, API_PORT) if absolutely necessary; otherwise keep the fixed ports.
- For Docker networking, services talk on the container port (8080, 3000). Host mappings remain consistent (8080→8080, 3000→3000, 9001→9001).

Checks
- Before starting, `lsof -i :3000` or `lsof -i :8080` to confirm free ports.
- If a conflict is unavoidable, bump within the same family (frontend 300x, API 808x, tools 900x) and update the env accordingly—but prefer to free the fixed port.

Prod alignment
- Keep the API bound to 8080 (or behind a reverse proxy) and serve the frontend as static over 80/443 via the proxy. Don’t change app ports between environments; change only the public exposure.
- Docs (MkDocs static server): 9003 (VM-hosted), served via tools/docs_serve.sh
- Docs (nginx via docker-compose): 8000 (primary)
- Orchestrator service: 8801 (uvicorn --reload, hot-reload enabled; docker-compose `orchestrator` service mounts ./backend/orchestrator)
