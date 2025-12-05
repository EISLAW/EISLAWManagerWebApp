<!-- Project: PrivacyExpress | Full Context: docs/System_Definition.md#privacy-deliverable-flow -->
# EISLAW System — Feature & Architecture Overview

Purpose
- Provide partners (technical and non‑technical) a clear view of what the system does, the tools and integrations it uses, and how it is validated.
- Summarize current status: what’s done, in progress, and planned.

Audience
- Firm partners and technical collaborators who need both the “why” (business goals) and the “how” (stack, endpoints, tests).

Goals (Business Outcomes)
- Centralize client work: files, emails, tasks, and deliverables in one interface.
- Accelerate privacy/compliance deliverables (questionnaire → scoring → Word review → send).
- Keep local‑first velocity (fast iteration on desktop) with seamless cloud deploy parity.

System Modules (Conceptual)
- SystemCore: Navigation, brand, session bootstrapping, docs, and governance.
- ClientComms: Client registry, folders (local/SharePoint), Outlook deep‑links, Airtable integration.
- PrivacyExpress: Scoring engine, Fillout integration, Word review flow.
- AutomailerBridge: Bridges deliverables into Outlook/Automailer for compose/send.
- MarketingOps: Optional Facebook/Instagram analytics utilities.
- RAGPilot / Insights: Retrieval over transcripts/knowledge, expanding to an “Insights Engine”.

High‑Level Architecture
- Frontend: React + Vite SPA (local dev on `5173`), routes for Dashboard, Clients, Marketing, Prompts, Insights.
- Backend: FastAPI app (`scoring_service/main.py`) exposed locally on `8788` and in Azure Web App (staging).
- Data/Stores:
  - Client registry JSON (`clients.json`) in the SharePoint library under “לקוחות משרד”. Local mirror is discovered via AudoProcessor settings.
  - Email local index (SQLite) at `clients/email_index.sqlite` (if present) for quick history by client.
  - RAG index (pilot) under `rag_local` or future vector store.
- Integrations:
  - Microsoft Graph (app‑only) for Outlook message links and SharePoint drive/folder access.
  - SharePoint (Graph) as the canonical file store (“לקוחות משרד”).
  - Airtable for client/contacts registry (optional but supported).
  - Fillout for intake (PrivacyExpress).

Core Feature Catalog (by Module)

1) ClientComms
- Clients list and detail (“Client Overview”) with per‑client actions:
  - Open (view): navigates to client detail.
  - Files: opens Windows Explorer on the client folder via backend helper; falls back to SharePoint or copies path.
  - SharePoint: opens the exact SharePoint folder for the client.
  - Emails (Outlook): opens a dedicated named Outlook window (EISLAW‑OWA) with either a deep link to the latest message or an OWA search (AQS) scoped to the client’s address(es).
  - Send Email: `mailto:` quick compose.
  - WhatsApp: opens a chat using `wa.me/<digits>` when phone is available.
  - Sync: pulls recent emails (online) where supported.
  - Airtable buttons: “Airtable Search” (opens record or Clients view) and “Sync Airtable” (upserts name/email).
- Add Client modal:
  - Airtable search backed by view `viw34b0ytkGoQd1n3` (table `tbloKUYGtEEdM76Nm`) with normalized name/email/phone/status/type pulled from `docs/Airtable_Schema.md`.
  - Selecting a client hydrates summary + linked contacts (via `tblWVZn9VjoGjdWrX` / `viwDZcPYwOkY2bm1g`), then creates/links SharePoint folder, upserts Airtable client + contacts, and mirrors metadata into the local registry (`/registry/clients`).
- Registry cleanup endpoint (admin): preview/apply removal of stale or buggy entries (with backup).

2) PrivacyExpress
- Scoring engine with rules (thresholds, precedence) and Fillout mapping.
- Intake pull via Fillout API, evaluation, and staging for review.
- Word review workflow: compose content in DOCX from templates; optional email compose integration.

3) AutomailerBridge
- Bridge for sending deliverables via Outlook/Automailer (initial scaffolding; sending path next).

4) Word Template Flow (TK Parity)
- Template discovery (`/word/templates`) from “לקוחות משרד_טמפלייטים” (auto‑detected relative to store base). `TEMPLATES_ROOT` env can override.
- Generate DOCX (`/word/generate`):
  - Windows: Microsoft Word COM (DOTX/DOCX) with `SaveAs2` into the client folder.
  - Fallback: `python-docx` for basic DOCX generation when COM is unavailable or busy.

5) MarketingOps
- Optional analytics utilities (FB/IG) for internal reporting (tokens in local secrets, used only when invoked).

6) RAGPilot / Insights (expansion)
- PRD defined for an Insights Engine: transcript review, tagging, search, and chat with memory; later email/WhatsApp/legal docs.
- Backend stubs: `/api/insights/add|review|search|ingest_manifest` (to be completed).

Technology Stack & Key Files
- Frontend: React 18, Vite 5, React Router 6, lightweight CSS (Tailwind present), Playwright for e2e.
  - Example pages: `frontend/src/pages/Clients/ClientsList.jsx`, `frontend/src/pages/Clients/ClientCard/ClientOverview.jsx`.
- Backend: Python FastAPI, uvicorn, Starlette; pytest for unit tests.
  - Main service: `scoring_service/main.py` (all endpoints below).
- Local Automation: PowerShell launchers (`session_start.bat`, `tools/session_start.ps1`, `tools/open_local.ps1`) and MCP helper scripts (`start_mcp.bat`).

Primary Backend Endpoints (selection)
- Clients & Registry
  - `GET /api/clients` — list clients (from SharePoint registry or local mirror).
  - `GET /api/client/summary?name=` — client files/emails summary.
  - `GET /api/client/locations?name=` — returns `{ localFolder, sharepointUrl }` for Explorer/SharePoint open.
  - `GET /registry/clients` — read registry; `POST /registry/clients` — upsert (display_name, emails, phone, contacts).
  - `GET /registry/cleanup?apply=false|true` — preview/apply stale entry cleanup.
- Outlook & Emails
  - `GET /api/outlook/latest_link?email=` — Graph‑based deep link to the latest message for an address.
  - Client view composes OWA search queries for single/multiple addresses and reuses a named window.
- SharePoint
  - `GET /sp/check` — verify site/drive/base connectivity.
  - `POST /sp/folder_create` — ensure a client folder exists in SharePoint.
- Files (local dev)
  - `POST /dev/open_folder` — opens Explorer on the client folder (enabled only in local dev via `DEV_ENABLE_OPEN`).
- Word Templates
  - `GET /word/templates` — list DOTX/DOCX templates.
  - `POST /word/generate` — generate a client‑scoped DOCX (COM first, fallback to `python-docx`).
- Airtable
  - `POST /airtable/clients_upsert` — upsert client record.
  - `POST /airtable/contacts_upsert` — upsert contact(s) associated to a client.
  - `GET /airtable/search_open?name=&email=` — return UI URL to open a matching record/view.
- Insights (stubs)
  - `GET /api/insights/search`, `POST /api/insights/add`, `POST /api/insights/review`, `POST /api/insights/ingest_manifest`.

Environment & Deployments
- Local‑first (preferred for iteration)
  - One‑click start: `session_start.bat` (starts backend on 8788, frontend on 5173, MCP bridge; opens Clients page).
  - Light start: `open_local.bat` (backend + Vite dev + browser).
  - Env setup: `tools/dev_env.ps1` sets `GRAPH_*`, `SP_*`, `VITE_API_URL`, `DEV_ENABLE_OPEN`, CORS.
  - Secrets: `secrets.local.json` (never committed) contains Airtable token/base, Microsoft Graph app creds, etc. Schema: `secrets.schema.json`.
- Cloud/Staging (Azure)
  - Backend Web App: `https://eislaw-api-01.azurewebsites.net`.
  - Frontend Static Site: Azure Storage static website (e.g., `eislawstweb`).
  - Redeploy scripts in `infra/` (package, grant roles, README).

Security & Privacy
- Secrets: stored locally in `secrets.local.json`. Do not commit or share tokens; use the schema to validate presence.
- Microsoft Graph: app‑only credentials; recommend `Sites.Selected` or carefully scoped `Sites.ReadWrite.All` to the SharePoint site; Mail read via application permissions only when needed.
- Desktop: local‑first workflow reduces cloud exposure while iterating; minimal logging of personal data; registry cleanup tool to remove stale data.

Testing & QA (What and How)
- Automated
  - Unit tests (pytest): focus on SharePoint endpoints and location resolution. Example: `scoring_service/tests/test_sharepoint.py` (3 passing locally).
  - UI tests (Playwright): navigation, Clients list, add client modal, SharePoint button behavior, Word templates modal, and client update flow. Suite passes locally (6/6).
- Manual smoke
  - Test client “יעל שמיר” created end‑to‑end: SharePoint folder creation, registry upsert, Airtable upsert, locations returns correct paths, Outlook latest link resolves.
  - Emails open in named “EISLAW‑OWA” window; Files open via backend; SharePoint opens exact folder.
- CI (next): enable in repo runner to run pytest + Playwright on PRs; address any selectors flakiness with stable `data-testid`s.

Status Snapshot (04‑Nov‑2025)
- Completed
  - Clients module core: list, detail, actions (Files, SP, Emails, Send Email, WhatsApp, Sync).
  - Outlook named window behavior; OWA deep link/search fallback.
  - SharePoint folder resolution and creation; registry read/write; cleanup preview/apply.
  - Word template listing and DOCX generation; default templates root detection; Windows COM + fallback.
  - Airtable Search/Sync buttons; clients_upsert and contacts_upsert endpoints.
  - Local one‑click session start; MCP bridge bootstrap; docs updated.
  - Automated tests green locally (pytest + Playwright).
- In Progress
  - Client view: richer Airtable contact edit/add (phone), and Task list backed by Airtable.
  - Clients list: optional multi‑address email search parity with detail view.
  - Outlook convenience: optional Edge app‑window launcher for steady reuse (local only).
  - Cloud path for Word: upload generated DOCX to SharePoint when running in cloud; return webUrl.
  - Insights (RAG): implement backend routes + vector index; frontend tab.
- Upcoming
  - “Send” step for AutomailerBridge (Outlook/Graph send + optional PDF export).
  - CI workflows for tests; staging deploy automation.

Operations (Runbook)
- Start session: `session_start.bat` (or `open_local.bat`).
- Verify health: backend `/health`, `GET /sp/check` (site/drive/base true), and open `/#/clients`.
- Run tests: `python -m pytest -q scoring_service/tests` and `npm run ui:test`.
- Common issues
  - Outlook replaces app tab → refresh to latest build; popups allowed; ensure named window path is active.
  - Word COM “call was rejected” → retry; fallback uses `python-docx` for DOCX.
  - Explorer open requires local start scripts (set `DEV_ENABLE_OPEN=1`).

References
- Index: `docs/INDEX.md`
- Technical Overview: `docs/TECHNICAL_OVERVIEW.md`
- Working Memory (live status): `docs/WORKING_MEMORY.md`
- Insights PRD: `docs/INSIGHTS_RAG_PRD.md`
