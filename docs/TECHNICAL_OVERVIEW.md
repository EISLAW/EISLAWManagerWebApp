<!-- Project: PrivacyExpress | Full Context: docs/System_Definition.md#privacy-deliverable-flow -->
# EISLAW System – Technical Overview

Purpose: a single, engineer‑facing overview of the current system, core modules, data flows, tools, and operational procedures so new contributors can come up to speed quickly and operate safely.

Scope: covers the “System” platform, the Privacy/TK module (questionnaire → scoring → review → send), email mirror and catalog, Airtable contacts integration, and the RAG pilot.

## Architecture Snapshot

- Code and docs: `EISLAW System/`
- Secrets: `EISLAW System/secrets.local.json` (see `docs/Integrations.md` for schema). Contains Fillout, Microsoft Graph/Entra, Airtable, Facebook Marketing, Instagram.
- Clients workspace: `EISLAW System/clients/` (one folder per client + `Unassigned` for unmatched emails).
- Tools (CLI utilities): `EISLAW System/tools/`.
- Frontend (UI scaffold): `EISLAW System/frontend/` (see `docs/Frontend_Dashboard_Plan.md`).
 - RAG Agent prompt: `EISLAW System/agents/RAG_Agent/SYSTEM_PROMPT.md`.
- Services: `EISLAW System/scoring_service/` (FastAPI webhook for Fillout scoring; optional offline CLI exists).
- Persistent search index (emails): SQLite FTS DB created by `tools/email_catalog.py` alongside client folders.

## Modules

### Privacy (Questionnaire → Scoring → Review → Send)

- Form source: Fillout (live link managed in `docs/fillout_field_mapping.json`). Hidden fields mirror logical values; the scoring uses only hidden fields where available.
- Rules/spec: `docs/Security_Scoring_Spec.md` defines levels (lone/basic/mid/high), obligations (reg, report, dpo), requirements, and triggers. Single level result per submission (mutually exclusive by precedence rules).
- Fetch & score:
  - Pull on demand: `tools/fillout_fetch_and_score.py` (reads latest submissions via Fillout REST, maps fields, applies rules, outputs normalized JSON including level, obligations, requirements, trigger blurbs).
  - Webhook service: `scoring_service/` (FastAPI endpoint for automatic processing; optional).
- Word review flow (manual QC):
  - Compose example selection sheet: `tools/make_word_review_example.ps1`.
  - Apply selection to a deliverable doc via macro: `tools/word_apply_selection.ps1` and `docs/Word/ComposeCheckedBlocks.bas`.
  - Operator marks checkboxes in Word, runs macro; selected blocks insert into the final document.
- Email compose: `tools/security_email_compose.py` can draft a mail from scored results (to be integrated with the automailer pipeline).

Operational notes:
- Hidden field logic in the form prevents contradictory answers (e.g., sensitive types → prompt count; biometric sub‑question only appears if relevant). Scoring assumes missing sub‑questions = false.
- Registration/reporting/DPO dependencies: if registration or reporting is required, DPO is also required (captured in rules).

### Email Mirror & Catalog (legacy tools)

- Mirror (read‑only) from Microsoft 365 Graph: `tools/email_sync_graph.py`
  - Pulls last N days (`--days`) and optional `--limit` (0 = uncapped) for `eitan@eislaw.co.il`.
  - Saves each message as `.eml` and normalized `.json` under the mapped client folder; unknowns under `clients/Unassigned`.
  - Mapping to clients is based on a local registry and known aliases; additional addresses can be assigned post‑sync.
- Assign/move tool: `tools/email_assign_and_move.py` maps an alias (e.g., a contact’s alternate Gmail) to a client and moves matching messages from `Unassigned` to the client folder.
- Catalog & search: `tools/email_catalog.py` builds an SQLite FTS index; `tools/email_list.py` lists threads or runs FTS searches per client.

### Email Index (app‑integrated)
- Ingestor (Graph app‑only): `tools/email_sync_worker.py` — filters by `config/email_sync.json` (mailboxes, folders/categories, participants_allow, since_days). Writes `clients/email_index.sqlite` with `body_preview`.
- Backend endpoints:
  - `GET /email/by_client?name=&limit=&offset=` → paginated list `{ items, total, next_offset }`
  - `GET /email/search?q=&mailbox=&limit=&offset=` → LIKE search across subject/from/to (FTS later)
- Frontend:
  - Client → Emails tab → “Emails (Indexed)” list; click a row to expand preview and Reply/Forward via mailto.
  - In LOCAL mode, Outlook shortcuts are hidden to prevent navigation. In CLOUD (or when enabled), “Open Emails (Search)” opens a named Outlook window.
- Tests:
  - Backend: `scoring_service/tests/test_email_index.py`
  - UI: `tests/email_index_ui.spec.ts`, `tests/emails_preview.spec.ts`

Operational notes:
- After a large sync, re‑index: `python tools/email_catalog.py`.
- Common workflow: sync → re‑index → list by client → open client folder.

### Airtable Contacts Integration (see `docs/Airtable_Schema.md` for table/view mapping)

- Upsert contacts and link to client: `tools/airtable_contacts_upsert.py`
  - Resolves Client by name (`--clients-table` or `--clients-table-id`).
  - Discovers actual column names in your Contacts table (Hebrew/English variants) and writes only to existing fields to avoid 422 errors.
  - Supports fields: Name, Email, Phone, Role, and link to Client.
- Example upserts (tested):
  - `--client "יוניסל דיגיטל - סמוב" --name "עמית בן יהודה" --email "amit@unicell.co.il" --phone "0544499985" --role "מנכ""ל"`
  - `--client "יוניסל דיגיטל - סמוב" --name "אוהד עפגין" --email "ohad@unicell.co.il" --phone "052-5328484" --role "סמנכ""ל כספים"`

### RAG Pilot

- Ingest transcripts: `RAG_Pilot/ingest_transcripts.py` (targets `EISLAW System/RAG_Pilot/transcripts` by default).
- Search: `RAG_Pilot/search.py` for quick retrieval testing.
- Goal: unify Zoom transcripts and other artifacts under client context for future assistants.

### Insights Extension (RAG)

- Product definition: `docs/INSIGHTS_RAG_PRD.md`.
- Backend (planned): new endpoints under `/api/insights/*` (search/add/review) in `scoring_service/main.py` or a dedicated service.
- Frontend (planned): `/src/pages/Insights/` — chat with context memory, filters (client/tags/source), insight cards, and “Convert to Content”.
- Vector store: start with SQLite (local/dev); leave abstraction to allow Elastic/Qdrant in staging/prod.
- Review queue: “Pending Review” → speaker alignment check → approve to index.
- Config: `config/insights_metadata.json` for canonical tags/status values.

## End‑to‑End Workflows

### Privacy Deliverable Flow

1) Intake (Fillout): client submits form; hidden fields normalize logic.
2) Fetch & Score: via webhook or `tools/fillout_fetch_and_score.py`; outputs: level, obligations, requirements, trigger blurbs.
3) Review in Word: operator loads selection sheet, checks blocks, runs macro to generate deliverable; optionally convert to PDF.
4) Send: compose email (`tools/security_email_compose.py`) or use automailer; attach deliverable.

### Communications Unification

1) Email sync: `python tools/email_sync_graph.py --days 180 --limit 0`
2) Re‑index: `python tools/email_catalog.py`
3) List recent by client: `python tools/email_list.py --client "<Client Name>" --top 20`
4) Resolve unknown aliases: `python tools/email_assign_and_move.py --client-name "<Client Name>" --email "alias@example.com"`

### Contacts Maintenance (Airtable)

1) Ensure PAT and Base ID in `secrets.local.json`.
2) Upsert contact(s) with client linkage using `tools/airtable_contacts_upsert.py`.
3) Verify in Contacts view; records are typecasted and linked.

## Configuration & Secrets

- `secrets.local.json` (local only; do not commit):
  - Airtable: `{ "airtable": { "token": "...", "base_id": "app..." } }`
  - Microsoft Graph: client/app registration for `eitan@eislaw.co.il` access; see `docs/Integrations.md` (Graph scopes and test).
  - Azure ARM: uses the same Microsoft app (tenant/client/secret) to request `https://management.azure.com/.default` for subscription checks; see `tools/azure_check.ps1`.
  - Fillout: API key and form IDs; see `docs/Integrations.md` and mapping JSON.

## Operational Playbook

- Preflight tests (new integration or token change): follow `docs/AGENT_BOOT.md`.
- Email:
  - First sync (last 6 months): `python tools/email_sync_graph.py --days 180 --limit 0`
  - Reindex: `python tools/email_catalog.py`
  - List by client: `python tools/email_list.py --client "..." --top 20`
- Privacy:
  - Fetch latest and score: `python tools/fillout_fetch_and_score.py --form "<id>" --limit 20`
  - Word review: run `tools/make_word_review_example.ps1`, mark checkboxes, apply via `tools/word_apply_selection.ps1`.
- Airtable:
  - Upsert: `python tools/airtable_contacts_upsert.py --clients-table "לקוחות" --contacts-table-id "tbl..." --client "..." --name "..." --email "..."`.

## Known Limitations / Open Items

- Email listing help text can throw Unicode encode errors in non‑UTF8 consoles; prefer setting `PYTHONIOENCODING=utf-8`.
- `email_sync_graph.py` uses `datetime.utcnow()` (deprecation warning); migrate to timezone‑aware UTC in a future patch.
- Client lookup pagination in Airtable can miss records beyond first pages if the client table is very large; formula filtering is preferred once the exact name field is known.
- “Client Card” GUI (planned): a simple desktop view to see Name, primary email, additional contacts, quick actions (Review in Word, Email Threads, Open Folder, Sync to Airtable).

## References

- Docs Index: `docs/README.md`
- Boot Policy: `docs/AGENT_BOOT.md`
- Working Memory: `docs/WORKING_MEMORY.md`
- Integrations: `docs/Integrations.md`
- Frontend Plan: `docs/Frontend_Dashboard_Plan.md`
- Azure Check Script: `tools/azure_check.ps1`
- Scoring Spec: `docs/Security_Scoring_Spec.md`
- Fillout Mapping: `docs/Fillout_Mapping.md`, `docs/fillout_field_mapping.json`
- Word Macro: `docs/Word/ComposeCheckedBlocks.bas`
- Tools: `tools/` (see filenames above)
 - RAG CLI: `tools/rag_search_cli.py` (JSON results)
