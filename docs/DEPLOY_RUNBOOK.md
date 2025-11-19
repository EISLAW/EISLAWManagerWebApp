# Deploy Runbook

Audience: non-technical operator running ship cycles.

## Pre-deploy safety steps
- Run the GitHub Actions workflow **Airtable Snapshot** before risky deploys (schema changes, bulk automation changes). In GitHub → Actions → Airtable Snapshot → **Run workflow**, leave defaults unless you need to override tables/base. Wait for a green run; investigate and rerun if it fails.
- Confirm required secrets exist for the snapshot: `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `AIRTABLE_TABLES`, `AZURE_BLOB_CONNECTION_STRING`, `AZURE_BLOB_CONTAINER`.

## Post-deploy checks
- Verify the deployment target (API/UI) is healthy and that Airtable records look correct for a small sample.
- If an Airtable mistake is detected, pull the matching snapshot blob by timestamp and restore targeted rows (see docs/AIRTABLE_BACKUP_PLAN.md for the playbook).
