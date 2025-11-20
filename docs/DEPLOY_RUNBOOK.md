# Deploy Runbook

Audience: non-technical operator running ship cycles.

## Pre-deploy safety steps
- Run the GitHub Actions workflow **Airtable Snapshot** before risky deploys (schema changes, bulk automation changes). In GitHub → Actions → Airtable Snapshot → **Run workflow**, leave defaults unless you need to override tables/base. Wait for a green run; investigate and rerun if it fails.
- Confirm required secrets exist for the snapshot: `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `AIRTABLE_TABLES`, `AZURE_BLOB_CONNECTION_STRING`, `AZURE_BLOB_CONTAINER`.

## Post-deploy checks
- Verify the deployment target (API/UI) is healthy and that Airtable records look correct for a small sample.
- If an Airtable mistake is detected, pull the matching snapshot blob by timestamp and restore targeted rows (see docs/AIRTABLE_BACKUP_PLAN.md for the playbook).

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
