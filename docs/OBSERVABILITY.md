# Observability & Search Stack (Local)

This repo includes a local stack for metrics (Prometheus + Grafana) and a search engine (Meilisearch). All are optional and run via Docker Compose.

## Services
- **Prometheus** (port 9090): scrapes backend metrics from `http://127.0.0.1:8799/metrics`.
- **Grafana** (port 3000): dashboards; default creds `admin` / `admin` (change after first login).
- **Meilisearch** (port 7700): fast search engine; backend `/email/search` will query it when available.

## Files
- `tools/monitoring/docker-compose.yml` — service definitions.
- `tools/monitoring/prometheus.yml` — Prometheus scrape config (backend at 8799).
- Backend search integration:
  - `/email/search` uses Meilisearch if reachable (`MEILI_URL`, default `http://127.0.0.1:7700`).
  - Manual reindex from SQLite → Meili: `POST /email/reindex_search`.

## Run
From repo root (WSL/PowerShell):
```bash
docker compose -f tools/monitoring/docker-compose.yml up -d
```
Stop:
```bash
docker compose -f tools/monitoring/docker-compose.yml down
```

## Grafana setup
1) Open http://localhost:3000
2) Login: admin / admin
3) Add data source → Prometheus → URL http://prometheus:9090 → Save & test.
4) Import a Prometheus dashboard (optional) and chart `api_requests_total`, `api_request_latency_seconds`.

## Meilisearch
- Available at http://localhost:7700 (no API key set; enable if needed).
- Backend uses it automatically for `/email/search` when up. Trigger a full reindex via `POST /email/reindex_search` if needed.

## Security
- For local dev only. Do not expose publicly without authentication, TLS, and restricted network access.
