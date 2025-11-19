<!-- Project: ClientComms | Full Context: docs/TECHNICAL_OVERVIEW.md (Email section) -->
# EISLAW — Central Email Index PRD

**Purpose**
- Provide fast, reliable, client‑aware email discovery inside the EISLAW app, independent of Outlook UI quirks.
- Keep Outlook as the system of record; store a compact index for search, preview, and quick actions.

**Goals**
- Show “all emails for a client” (client + contacts) in seconds.
- Global search across selected mailboxes with filters (date, people, attachments, keywords).
- Quick actions: Open in Outlook, Reply/Forward via user’s mail client, save attachments to client SharePoint folder.
- Minimal storage: ingest only selected mailboxes/folders/categories and store previews by default.

**Scope**
- Phase 1 (MVP)
  - Ingest one or more allowlisted mailboxes via Microsoft Graph (application permissions), store metadata + bodyPreview.
  - UI: “Emails (Indexed)” panel on Client view; Global “Email Search” page.
  - Actions: Open in Outlook (webLink), Reply/Forward (mailto/Outlook desktop), Save attachment(s) to client’s SharePoint folder.
  - Filters: Date (Last 30/90/180d), has:attachments, keyword, people (client + contacts), mailbox.
  - Linking: auto‑link messages to clients by participant email; manual “Assign to Client” override.
- Phase 1.5 (early add‑in usability)
  - Outlook Add‑in (no OAuth): add a single “Assign to Client” command on Message Read.
  - Task Pane shows client suggestions (by participants) and buttons (Open Files/SharePoint in browser).
  - Reads current message context via Office.js and posts to our backend; no Graph delegated calls.
- Phase 2
  - Multi‑mailbox at scale; background schedule; per‑user controls.
  - Optional full‑text body indexing; optional on‑demand full body fetch.
  - Outlook add‑in (no‑OAuth) for “Assign to Client” and task pane with client actions.
- Phase 3
  - Outlook add‑in SSO/OAuth for native reply/forward and live mailbox search in‑pane.
  - Analytics: volumes by client, response times, attachment stats.

**Personas & Primary Stories**
- Attorney: “Show me all emails with Sivan and her contacts since last month; open a thread and save the proposal attachment to her folder.”
- Assistant: “Find messages tagged EISLAW and route attachments into the right client folders.”
- Owner: “Search across my mailbox for ‘onboarding’ and filter to clients with active matters.”

**Functional Requirements**
- Ingestion (Worker)
  - Pull messages via Graph for allowlisted mailboxes.
  - Support scoping by: folders (e.g., Clients/*), categories (e.g., EISLAW), date window (since_utc), participants (registry emails/contacts).
  - Persist delta tokens to do incremental sync.
  - Handle deletes/moves: reflect Graph delta changes — remove deleted items from index (soft‑delete flag, then purge), update folder metadata on move.
  - Delta token expiry: detect invalid/expired delta (e.g., HTTP 410/BadDelta) and automatically trigger a full resync for that mailbox/folder scope.
  - Retry policy: exponential backoff with jitter on 429/503, respect Retry‑After; bounded retries with circuit‑breaker log and resume next cycle.
- Storage
  - SQLite with FTS5 initially: `data/email_index.sqlite`.
  - Tables: users, messages, recipients, attachments, message_client_links.
  - Indexes: received desc, participants; FTS on subject/body_preview.
  - Scalability note: For Phase 2 (multi‑mailbox, higher QPS), plan migration to PostgreSQL (or managed cloud DB) for concurrency and durability; keep a thin DAO to ease migration.
- API (FastAPI)
  - `GET /email/by_client?name=&q=&from=&to=&has=attachments&since=&mailbox=&limit=&offset=`
  - `GET /email/search?q=&from=&to=&has=&since=&mailbox=&limit=&offset=`
  - `GET /email/message?id=` (metadata + preview; full body on demand if enabled)
  - `POST /email/attachments/save` { message_id, attachment_id, client_name }
  - `POST /email/assign` { message_id, client_name, note? }
  - Pagination: `limit` (default 50, max 100), `offset` (default 0). Responses include `{ items: [...], total, next_offset }`.
  - Errors: consistent JSON `{ "error": { "code": "string", "message": "human readable", "details": {...} } }` with HTTP statuses (400 bad input, 401/403 auth, 404 not found, 409 conflict, 429 throttled, 500/502/503 server/upstream).
- UI
  - Client view → “Emails (Indexed)” panel with list + filters; expandable preview drawer.
  - Per‑row actions: Open in Outlook, Reply, Forward, Save attachments, Assign to client.
  - Global nav → “Email Search” page with identical list + filters.

**Linking Logic**
- Auto link when any from/to/cc matches client or any contact email (case‑insensitive, normalized).
- Multi‑link: a message MAY link to multiple clients (e.g., two clients in the same thread). `message_client_links` supports many‑to‑many; UI shows all linked clients.
- Store `link_type=heuristic` + `confidence` (e.g., 1.0 if direct match to client email, 0.7 if contact).
- Manual override: POST /email/assign sets `link_type=manual` (highest precedence).
- Policy: Start with flexible “registry‑only” model; “require_client_folder” is optional and configurable.

**Configuration**
- File: `config/email_sync.json` (created on first run if missing)
  - `mailboxes`: ["eitan@eislaw.co.il"]
  - `folders`: ["Clients/EISLAW"] (optional)
  - `categories`: ["EISLAW"] (optional)
  - `participants_allow`: ["@client.com"] (optional)
  - `since_utc`: "2025-01-01T00:00:00Z" (optional)
  - `store`: { "mode": "preview", "max_body_chars": 1000, "enable_full_body_indexing": false }
  - `attachments`: { "max_save_mb": 25, "block_extensions": [".exe", ".bat", ".cmd", ".com", ".js", ".vbs", ".ps1", ".scr", ".jar", ".dll"] }
  - `require_client_folder`: false

**Permissions & Auth**
- Phase 1: Microsoft Graph application permissions, admin‑consented.
  - Mail.Read or Mail.ReadBasic for selected mailboxes.
  - SharePoint Sites.Selected (preferred) or Sites.ReadWrite.All for attachment saves.
- Phase 2: Outlook add‑in SSO (delegated) for draft reply/forward and live in‑pane search.

**Non‑Functional Requirements**
- Performance: paginate results; fetch previews from DB; open Outlook only on explicit action.
- Reliability: idempotent ingestion; resume with delta tokens; recover on rate limits.
- Privacy/Security:
  - Minimize: default to metadata + bodyPreview; fetch full body on demand; attachments only by explicit save.
  - Access: only allowlisted mailboxes; role‑based access in UI; exclude personal/private tags.
  - Storage: encrypted disk (OS level) or move to Postgres/managed DB in cloud deploys.
 - Backup & Recovery:
   - Nightly backup of `data/email_index.sqlite` (copy‑and‑rotate); keep last 7 days.
   - Automatic rebuild path: if DB missing/corrupt, recreate schema and perform full resync using current config; preserve ingestion logs for root cause.
   - Delta tokens are re‑discovered on rebuild.

**Telemetry & Logging**
- Log ingestion durations, deltas applied, throttling/backoffs, per‑mailbox health.
- UI events: search queries (aggregate), actions (open, save attachment).
 - Surface error metrics (HTTP status distribution), retry counts, and full‑resync events.

**Rollout Plan**
- Week 1: Worker + DB + API; Client panel MVP with list + open/assign.
- Week 2: Attachments save to SharePoint; Global search page; basic analytics.
- Optional: add Outlook add‑in scaffold (no‑OAuth) after MVP is stable.

**Validation**
- Unit tests: ingestion (mocked Graph), link heuristics, DB writes, API filters.
- UI tests: client panel renders list; “Open”, “Assign”, “Save attachment” buttons present; selectors stable via `data-testid`.
- Manual: run worker on one mailbox; verify results for known clients; time a 30/90/180d search.

**Acceptance Criteria (Phase 1)**
- Ingests selected mailbox(es) with configured filters; maintains delta without errors for 48h.
- Client view shows indexed emails for at least 3 sample clients within 1s (10k messages DB).
- Per‑row actions work: Open in Outlook, Reply/Forward (mailto), Assign to client.
- Save attachments writes files into the correct SharePoint client folder and reports success.
- Security posture documented; only allowlisted mailboxes ingested; previews only by default.

**Open Questions**
- Do we require client folder to index messages (strict mode) or allow registry‑only clients?
- Full body retention defaults (e.g., disabled; enable per client?).
- Attachment size limits and content‑type allowlist.
