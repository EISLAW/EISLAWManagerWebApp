# Deploy Runbook

Audience: non-technical operator running ship cycles.

## Pre-deploy safety steps
- Run the GitHub Actions workflow **Airtable Snapshot** before risky deploys (schema changes, bulk automation changes). In GitHub → Actions → Airtable Snapshot → **Run workflow**, leave defaults unless you need to override tables/base. Wait for a green run; investigate and rerun if it fails.
- Confirm required secrets exist for the snapshot: `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `AIRTABLE_TABLES`, `AZURE_BLOB_CONNECTION_STRING`, `AZURE_BLOB_CONTAINER`.

## Post-deploy checks
- Verify the deployment target (API/UI) is healthy and that Airtable records look correct for a small sample.
- If an Airtable mistake is detected, pull the matching snapshot blob by timestamp and restore targeted rows (see docs/AIRTABLE_BACKUP_PLAN.md for the playbook).

## Preferred path: GitHub Actions container deploy (staging slot → smoke → swap)
- Workflow: GitHub → Actions → **Deploy Privacy Module** → Run workflow.
- Inputs:
  - `resource_group`, `webapp_name`, `storage_account`, `acr_name`, `image_name` (backend), optional `frontend_webapp_name` + `frontend_image_name` (containerized frontend).
  - `frontend_api_url` (default prod API) baked into the frontend image.
  - `image_tag` (optional override; defaults to commit SHA) and `promote_tag` (extra ACR tag, default `staging`).
  - `slot_name` (default `staging`), `run_smoke_tests` (default true), `swap_on_success` (default true).
  - `release_tag` (Git tag to create/push, e.g., `v2025.11.20a`) — set this on every deploy for traceability.
- Flow (automated in the workflow):
  1. Build + push backend image to ACR (tags: `${IMAGE_TAG}` + `${PROMOTE_TAG}`).
  2. Optionally build + push frontend container (Dockerfile.web) with `VITE_API_URL` baked in, and deploy to the provided frontend Web App.
  3. Ensure the staging slot exists; deploy the backend container + app settings there (includes `APPINSIGHTS_CONNECTION_STRING` if present).
  4. Health-check `/$slot/health`, send an App Insights heartbeat (if configured), run `python tools/privacy_flow_smoke_test.py --count 2`.
  5. Swap the slot into production (if enabled) and re-run the production `/health` check.
  6. Build the frontend and upload to the static website container (kept for compatibility even if the container is used).
  7. If `release_tag` is provided, create and push a Git tag from the workflow (git bot identity).
- Secrets required: `AZURE_CREDENTIALS`, `ACR_USERNAME`/`ACR_PASSWORD`, `FILLOUT_API_KEY`, `AIRTABLE_*`, `GRAPH_*`, `APPINSIGHTS_CONNECTION_STRING` (optional but recommended). Smoke tests will fail if Fillout/Airtable secrets are missing.

## Versioning and tagging discipline
- Before each deploy, update `docs/CHANGELOG.md` with a dated entry and include backend/frontend image tags.
- Run the deploy workflow with `release_tag` set (e.g., `vYYYY.MM.DDa`). The workflow will create/push the tag automatically using `GITHUB_TOKEN`.
- Note in `docs/DEPLOY_RUNBOOK.md` table which tag was pushed and whether the deploy swapped to production.

## Deployment history (manual log)

| Timestamp (UTC) | Change summary | Result |
| --- | --- | --- |
| 2025-11-19 22:55 | Zip deploy built via `infra/deploy_privacy_only.ps1` (python-multipart + cryptography pinned) | **Failed** – App Service crashed at import due to missing Azure monitoring deps (`azure.identity`/`opencensus` not vendored). Next action: add these packages to `scoring_service/requirements.txt` and redeploy. |
| 2025-11-20 09:16 | Container deploy (Dockerfile.api) pushed to `eislawacr.azurecr.io/privacy-api:2025-11-20`, Web App switched to container image. | **Succeeded** – `/health` returns 200. Backend now runs inside container with vendored Azure deps. |

## Container deploy checklist
1. **Build & push image**
   ```bash
   cd "EISLAW System"
   rm -rf build/container_context
   mkdir -p build/container_context
   cp Dockerfile.api build/container_context/
   cp -r scoring_service config build/container_context/
   az acr build -r eislawacr -t privacy-api:<tag> -f Dockerfile.api build/container_context
   ```
2. **Point Web App to the new image**
   ```bash
   az webapp config set -g EISLAW-Dashboard -n eislaw-api-01 --linux-fx-version "DOCKER|eislawacr.azurecr.io/privacy-api:<tag>"
   az webapp restart -g EISLAW-Dashboard -n eislaw-api-01
   ```
3. **Verify**
   - `curl https://eislaw-api-01.azurewebsites.net/health` → expect 200.
   - Leave `python tools/azure_log_stream.py ...` running for a few minutes to ensure the container stays healthy.
4. **Log the attempt** in the table above and update `docs/NEXT_ACTIONS.md` / `docs/Testing_Episodic_Log.md`.

Update this table after each manual deploy attempt so the next session knows the last known state.
