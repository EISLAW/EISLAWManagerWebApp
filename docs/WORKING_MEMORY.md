<!-- Project: PrivacyExpress | Full Context: docs/System_Definition.md#privacy-deliverable-flow -->
# Working Memory (Current State)

Last updated: 2025-11-06

Context snapshot
- Privacy module is live with: rules JSON, evaluator, FastAPI webhook, Fillout API pull, hidden-field mapping, Word review flow, and email composer.
- Hidden field mapping matches formId `t9nJNoMdBgus` (see `docs/fillout_field_mapping.json`).
- One new submission fetched and scored successfully; older pre-hidden submission is intentionally ignored.
- Infra live in Azure (Israel Central):
  - Backend Web App: `https://eislaw-api-01.azurewebsites.net` (FastAPI docs at `/docs`)
  - Static website (frontend): `https://eislawstweb.z39.web.core.windows.net`
  - App Insights wired via connection string
- Local dev interface ready (self-contained):
  - Launchers: `start_dev.bat`, `smoke_dev.bat`
  - Scripts: `tools/dev_start.ps1`, `tools/dev_env.ps1`, `tools/dev_smoke.ps1`
  - Native folder open (optional): `tools/install_open_protocol.ps1` — protocol `eislaw-open://<path>`
- Client page actions wired (Sivan example): Open Files, SharePoint, Open Emails, Send Email, WhatsApp, Sync (Graph).
- Clients UX updates:
  - Outlook opens in a dedicated named window (no more replacing the app tab). Edge app-window warm-up endpoint available in local mode.
  - "Open Files" now uses the backend helper first; falls back to SharePoint/open path copy.
- New buttons: "Airtable Search" (opens record/clients view) and "Sync Airtable".
  - UX/UI Controls Map available at `docs/UX_UI/Controls_Map.md` (authoritative button/action list used for tests).

Decisions
- DPO thresholds and couplings are encoded (reg/report/monitor_1000/sensitive_people>=1000).
- Lone requires ppl < 10k; high via ppl >= 100k (any personal data) and other triggers.
- Outsourcing: processor_large_org → High + DPO; processor (regular) → mid floor + consultation when needed.
- Review UX: Word checkbox flow confirmed (macro works). Airtable review queue planned next.

Where things are
- Scoring rules: `config/security_scoring_rules.json`
- Evaluator (CLI): `tools/security_scoring_eval.py`
- Webhook: `scoring_service/main.py` (+ `README.md`)
- Fillout fetch: `tools/fillout_fetch_and_score.py`
- Mapping (hidden IDs): `docs/fillout_field_mapping.json`
- Word review scripts: `tools/make_word_review_example.ps1`, `tools/word_apply_selection.ps1`
- Email composer: `tools/security_email_compose.py` + texts `docs/security_texts.he-IL.json`
- Episodic test log: `docs/Testing_Episodic_Log.md`
- Infra + deploy scripts: `infra/azuredeploy.bicep`, `infra/package_backend.ps1`, `infra/grant_sp_roles.ps1`, `infra/README.md`

Open items / blockers
- Airtable schema bootstrap added (Meta API). Save Review and Approve & Publish write successfully to `PRIVACY_REVIEWS`.
- UI polish: fix Hebrew labels in `#/privacy`; style email CTA button.
- "Send" step not wired yet (Outlook COM or Graph).
- Policy: for any NEW external integration or scope (Graph, Fillout, Airtable schema writes, etc.), always run a 60-second preflight test and ask for approval if consent/permissions are required. Record the outcome in `docs/Testing_Episodic_Log.md`.
- Cloud backend redeploy needs to include latest routes (`/api/client/locations`, SharePoint fuzzy search) and finalize `SP_DRIVE_NAME` if default library isn't used.
- Local UI: scrollbar jump fixed by reserving vertical scrollbar space (see `frontend/src/styles.css`).
- Test client created: "??? ????" (folder + registry + Airtable upsert) for email/SP checks.

What we paused on
- Outlook/Graph send helper and PDF export wiring.
- Optional per-change audit table (`Review_Audit`) wiring.
- Clients list: optional multi-address email search (client view already supports it).

Pointers to resume
- If continuing Word path: use `tools/word_apply_selection.ps1` with a score/answers JSON to pre-check and compose quickly.
- If continuing API pull: use `tools/fillout_fetch_and_score.py --form-id t9nJNoMdBgus --limit 3` to fetch and score.
- Airtable is configured in `secrets.local.json`; run `python tools/airtable_add_fields.py` to ensure schema, then use the UI Save Review.
- To redeploy backend quickly: `pwsh infra/package_backend.ps1` — `az webapp deploy -g EISLAW-Dashboard -n eislaw-api-01 --src-path build/webapp_package.zip --type zip`
- To upload frontend (AAD): `az storage blob upload-batch -s frontend/dist -d '$web' --account-name eislawstweb --auth-mode login --overwrite`
- Local dev quick smoke: `pwsh tools/dev_smoke.ps1 -ClientName "???? ???????"`

What we paused on (2025-11-01)
- "Open Files" behavior: native protocol (`eislaw-open://`) available; API fallback works when started via launcher; verify on your desktop and roll into CI docs.
- SharePoint mapping: resolver works; confirm library display name (`SP_DRIVE_NAME`) in prod and redeploy.
- Next features: Airtable Tasks + Contact edit (read/write), CI deploy workflow.
