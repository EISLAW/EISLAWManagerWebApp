# Airtable “Data Parachute” Plan (Backups for Privacy / CRM Data)

Audience: New developer with zero context. Mission: protect Airtable data from bad deploys or human error by taking frequent, restorable snapshots. Scope: Privacy/CRM Airtable bases used by EISLAW.

## Why
- Airtable overwrites in place; there is no transaction safety or undo for API mistakes.
- A faulty deploy or script can clobber many records at once (e.g., mis-setting a status column for dozens of rows).
- Recurring, versioned snapshots let us rewind quickly with minimal operational effort.

## Objectives
1) Recurring snapshots of key Airtable tables to durable storage.  
2) Simple, targeted restore path: pick a JSON snapshot and PATCH only intended fields for specific records.  
3) Low operational burden: GitHub Actions + Azure Blob; fail loud so humans notice and rerun.

## Components
- `tools/airtable_snapshot.py` (to be implemented): fetch tables and emit JSON snapshots.
- Storage: Azure Blob Storage (preferred) using container-level SAS or connection string. Fallback: local temp file (dev) or emailed attachment (last resort).
- Scheduler: GitHub Actions cron every 6h (UTC) plus manual dispatch (“run before deploy”).

## Data Model & Scope
- Inputs: Airtable Base ID(s), table names, API key (`AIRTABLE_API_KEY`), optional view filters.
- Output JSON per table: `{ "table": "TABLE_NAME", "rows": [ Airtable record objects ], "snapshot_at": "ISO8601" }`.
- Filenames are idempotent and timestamped: `backup_YYYYMMDD_HHMM_TABLE.json` (one per table) or `backup_YYYYMMDD_HHMM_all.json`.
- Retention: keep N days (target 14) in Blob; garbage-collect older blobs each run.

## Secrets & Config
- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID` (support multiple if needed)
- `AIRTABLE_TABLES` (comma-separated list or CLI list)
- `AZURE_BLOB_CONNECTION_STRING` or SAS URL + `AZURE_BLOB_CONTAINER`
- Optional: `SNAPSHOT_RETENTION_DAYS` (default 14)
- Optional: `SNAPSHOT_PREFIX` (default `backup_`)
- Secrets live in `secrets.local.json` locally; mirror them as GitHub Actions secrets for the workflow.

## Happy-Path Flow (step-by-step)
1) Load config/secrets (env vars or CLI args). Validate required values: Airtable base ID, tables, API key, Azure container + connection/SAS.
2) For each table:
   - GET all records, handling pagination; include fields, `createdTime`, and revision metadata if present.
   - Respect Airtable rate limits (minor sleep between pages).
3) Assemble snapshot payload with `snapshot_at` ISO timestamp.
4) Write JSON to local temp; upload to Azure Blob using idempotent filename.
5) Garbage-collect blobs older than the retention threshold (date-based).

## Failure Handling
- Airtable 429/5xx: retry with exponential backoff (e.g., Tenacity) and per-table sleep.
- Upload failures: retry once; on persistent failure, exit non-zero so GitHub Actions surfaces the error.
- Partial success: upload whatever succeeded; keep logs per table; reruns reuse same filenames safely.
- Notifications: GitHub Action fails loudly; optional Slack/email notification step can be added.

## Restore Playbook (manual, targeted)
1) Identify the correct snapshot blob by timestamp.
2) Download JSON; for each table, iterate rows and PATCH back to Airtable by record ID.
3) Only update trusted fields (allowlist); do **not** bulk overwrite unreviewed columns.
4) Validate a small sample in Airtable UI before completing the restore.
(Optional later: `tools/airtable_restore.py` automates the targeted PATCH with a field allowlist.)

## Schedule
- Automated: GitHub Actions cron every 6 hours (UTC).
- Manual: Dispatchable workflow button before deploys or schema migrations.

## Work Items (build next)
1) Implement `tools/airtable_snapshot.py` with argparse, per-table pagination, backoff, Azure Blob upload, and retention GC.
2) Add `.github/workflows/airtable_snapshot.yml` with cron (6h) + `workflow_dispatch`, wired to Airtable/Azure secrets, and fail-loud notifications.
3) Optional: add `tools/airtable_restore.py` for controlled restores with field allowlists.
4) Update `docs/DEPLOY_RUNBOOK.md` to include “Run Airtable snapshot” before riskier deploys.

## Posture
- Airtable stays the UI/ops source of truth; snapshots are the safety net.
- No silent failures: let Actions fail loudly; keep logs for every run.
- Prefer Azure-managed storage and GitHub Actions scheduling to minimize local ops.

## Implementation notes (current state)
- CLI: `python tools/airtable_snapshot.py --tables "Table1,Table2"` (defaults: `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `AZURE_BLOB_CONNECTION_STRING`, `AZURE_BLOB_CONTAINER`, optional `AIRTABLE_VIEW`, `SNAPSHOT_PREFIX`, `SNAPSHOT_RETENTION_DAYS`, `AZURE_BLOB_CONTAINER_SAS`). Supports multiple `--base-id` and repeated `--table`; use `--all-tables` to snapshot every table in the base (requires Airtable metadata scope).
- Storage: uploads JSON to the configured Azure container with filenames like `backup_YYYYMMDD_HHMM_<table>.json`, then deletes blobs older than retention days.
- Workflow: `.github/workflows/airtable_snapshot.yml` runs every 6h UTC and is `workflow_dispatch`-able. Secrets needed in GitHub: `AIRTABLE_API_KEY` (or `AIRTABLE_TOKEN`), `AIRTABLE_BASE_ID`, `AIRTABLE_TABLES`, `AZURE_BLOB_CONNECTION_STRING`, `AZURE_BLOB_CONTAINER`. Optional: `AZURE_BLOB_CONTAINER_SAS`, org-level `SNAPSHOT_PREFIX`, `SNAPSHOT_RETENTION_DAYS`.
- Restore: manual, per the playbook below (automated restore script still optional/future).

## How to run a snapshot locally (quick start)
1) Ensure `python -m pip install azure-storage-blob requests` in your environment (or use the GitHub Action).
2) Set env vars: `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `AIRTABLE_TABLES`, `AZURE_BLOB_CONNECTION_STRING`, `AZURE_BLOB_CONTAINER` (plus `AIRTABLE_VIEW` if needed).
3) Run:  
   ```bash
   python tools/airtable_snapshot.py --tables "$AIRTABLE_TABLES"
   ```
   Optional overrides: `--base-id`, `--table`, `--view`, `--snapshot-prefix`, `--retention-days`, `--azure-container-sas` (if using SAS instead of a connection string), or `--all-tables` to snapshot every table in the base (requires metadata scope on the API key).
4) Confirm blobs land in Azure and older blobs are pruned per retention.

## Restore Playbook (manual, targeted)
1) Identify the correct snapshot blob by timestamp.
2) Download JSON; for each table, iterate rows and PATCH back to Airtable by record ID.
3) Only update trusted fields (allowlist); do **not** bulk overwrite unreviewed columns.
4) Validate a small sample in Airtable UI before completing the restore.
(Optional later: `tools/airtable_restore.py` automates the targeted PATCH with a field allowlist.)
