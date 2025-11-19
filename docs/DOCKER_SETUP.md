# Docker Setup (API + Web)

Purpose: provide a consistent, portable way to run the backend (FastAPI) and frontend (Vite build) plus Meilisearch. Suitable for local and Azure container hosting.

## Files
- `Dockerfile.api` — backend container (uvicorn on port 8799).
- `Dockerfile.web` — frontend build + nginx (serves on port 80 inside container).
- `docker-compose.yml` — api + web + meili.
- `.env.example` — copy to `.env.local` for overrides.

## Quick start (local)
1. Copy `.env.example` to `.env.local` and adjust if needed.
2. Build & run:
```bash
docker compose up --build
```
3. Web UI: http://localhost:${WEB_PORT:-8080}
   API: http://localhost:${API_PORT:-8799}
   Meilisearch: http://localhost:${MEILI_PORT:-7700}

## Env vars
- `API_PORT` (host port for backend, default 8799)
- `WEB_PORT` (host port for frontend, default 8080)
- `MEILI_PORT` (host port for Meilisearch, default 7700)
- `VITE_API_URL` (API base used at build time for the frontend)
- `DEV_CORS_ORIGINS` (frontend origins allowed by the API)
- `MEILI_URL` (API-side Meilisearch URL, default `http://meili:7700` in compose)

## Azure notes
- Build images from `Dockerfile.api` and `Dockerfile.web` or use `docker-compose.yml` if Azure service supports it.
- Provide env vars/secrets via Azure container app settings/key vault; do not bake secrets into images.
- For a static frontend in Azure, you can deploy the `Dockerfile.web` image or a static file host; point it to your API base via `VITE_API_URL` at build time.

## Maintenance
- Rebuild after dependency changes.
- Meilisearch data persists in the `meili_data` volume. Remove with `docker volume rm` if you need a clean slate.
