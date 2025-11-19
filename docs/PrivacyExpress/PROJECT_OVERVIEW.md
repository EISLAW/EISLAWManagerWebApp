<!-- Project: PrivacyExpress | Full Context: docs/System_Definition.md#privacy-deliverable-flow -->
# EISLAW PrivacyExpress — Project Overview (Partner Brief)

Audience: Business partners, project stakeholders, and internal team.

Links: see docs/PrivacyExpress/README.md and docs/INDEX.md
Controls map: see `docs/UX_UI/Controls_Map.md` for button actions and test IDs.

## 1) Executive Summary

PrivacyExpress converts a short online questionnaire into an actionable privacy deliverable. The system fetches submissions, scores them using codified rules, presents a lightweight review UI, and composes a branded report and client email. Reviewers can override suggested outputs; the system tracks overrides and accuracy over time.

Goals
- Faster, consistent privacy diagnostics for small/medium businesses
- Clear reviewer control with transparent overrides
- Branded, RTL Hebrew deliverables ready for email/PDF
- Measurable accuracy that improves with feedback

Outcomes
- Client-facing report (HTML/PDF), email preview, and optional Word path
- Review queue + status trail (waiting_review → in_review → approved → sent)
- Metrics for overall accuracy and rolling last‑N accuracy

## 2) System Components

- Frontend (app): Privacy page with list + expandable card details and checklists
 - Backend (FastAPI): scoring webhook, Fillout fetch, Airtable upserts, tokenized reports, Microsoft Graph email send
 - Fillout: live form and submissions API (also provides contact metadata used in report/email)
 - Airtable: review state, selections, status, metrics (`PRIVACY_REVIEWS` table)
 - Microsoft Graph: send client email (Application permission `Mail.Send`)
- Templates & texts: modular Markdown templates and a unified HTML/CSS wrapper

Key Paths
- Tools: `tools/fillout_fetch_and_score.py`, `tools/compose_report_from_md.py`, `tools/airtable_utils.py`, `tools/airtable_preflight.py`
- Rules: `config/security_scoring_rules.json`
- Mapping: `docs/fillout_field_mapping.json`
- Texts: `docs/PrivacyExpress/ResultTexts/*` (levels, obligations, requirements, email)
- Unified HTML: `docs/PrivacyExpress/privacy_unified_template.html`

## 3) Data Model (inputs → results)

Identity & Metadata
- contact_name, business_name, contact_email, contact_phone, submitted_at, submission_id, form_id

Inputs (scoring)
- owners, access, ethics, ppl, sensitive_people, sensitive_types, biometric_100k, transfer, directmail_biz, directmail_self, monitor_1000, processor, processor_large_org, employees_exposed, cameras
- Derived: sensitive (from sensitive_people/sensitive_types) and small normalizations

Results (summary)
- level (label in UI: “מאגר מנוהל בידי יחיד” for lone; basic, mid, high)
- dpo, reg, report (booleans)
- requirements: [worker_security_agreement, cameras_policy, consultation_call, outsourcing_text, direct_marketing_rules]

Hebrew Labels (UI)
- Provided mapping for identity and inputs; can be edited later without code changes

## 4) End‑to‑End Flow

Phase 1 (current)
1. Fetch submissions from Fillout API (on demand refresh) and map contact fields + answers
2. Score locally using `security_scoring_rules.json`
3. Show list of assessments (email, name, phone, business, submitted_at, score badge)
4. Expand an assessment card to review details with Hebrew labels
5. Pre‑check deliverable checklists from results; reviewer can override
6. Compose report (unified HTML + selected modules) and preview client email
7. Approve & Publish generates a unique token, persists secure links, and exposes a short redirect
8. Send the client email: either via the built-in Microsoft Graph "Send Email" action (recommended) or copy from Preview. Status moves to `sent`

Phase 2 (planned)
- Fillout → backend webhook (`/fillout/webhook`) for real‑time push
- Upsert core state to Airtable immediately (CRM and queue continuity)
- PDF export of HTML and richer email tracking

## 4.1) Implementation Status (2025-11-07)

- Backend endpoints (FastAPI)
  - `GET /health`
  - `GET /privacy/labels` — Hebrew labels used in UI
  - `GET /privacy/submissions` — list submissions (via Fillout API)
  - `GET /privacy/submissions/{id}` — single submission with mapped answers + score
  - `POST /privacy/save_review` — upsert review row in Airtable (selections, overrides, accuracy)
  - `POST /privacy/approve_and_publish` — generate token, persist `report_url` + `share_url`, return links
  - `GET /privacy/report/{token}` — render unified HTML report for this token
  - `GET /r/{token}` — short redirect to the report
  - `POST /privacy/preview_email` — fills `ResultTexts/email_to_client.md` with context (includes `{{report_url}}`)
  - `GET /privacy/metrics?window=10` — accuracy and change-rate metrics (via configured Airtable view)
  - `POST /privacy/send_email` - sends the composed email via Microsoft Graph (Application `Mail.Send`)

- Frontend (Privacy page)
  - Route `#/privacy`: list submissions; expandable card shows identity, score, and a "Questionnaire Results" block (answers)
  - Radio for level selection, toggles for obligations/requirements, per-change notes
  - Side-by-side layout for "Security Level" and "Components" for efficient use of space
  - Tab/list item width condensed to show just name, email, phone
  - Actions: Save Review, Approve & Publish (returns links), Preview Email, Send Email (Graph), Copy WhatsApp link (short URL)

- Tokenized links
  - Short: `/r/{token}` → redirects to `/privacy/report/{token}`
  - TTL default: 30 days (env `REPORT_TOKEN_TTL_DAYS`); host may be overridden by `REPORT_LINK_HOST`

- Email template
  - `docs/PrivacyExpress/ResultTexts/email_to_client.md` supports `{{report_url}}`
  - CTA currently plain link; optional styled button next
  - Preview via `/privacy/preview_email` and send via `/privacy/send_email`

- Airtable (table: `PRIVACY_REVIEWS`)
  - Config: `secrets.local.json` → `airtable.base_id`, `table_id`, `view`
  - Fields created/verified via Meta API helper: selections, overrides, mirrors, status, links (see §6)
  - Save Review upserts the row; Approve & Publish updates link fields on the existing row

## 5) Review UI (Management)

Layout
- Two‑pane or list with expandable cards (confirmed: expandable card)

Card Sections
- Identity + metadata (name, business, email, phone, submitted_at)
- System diagnosis: level + flags (dpo, reg, report)
- Checklists
  - Obligations: DPO, Registration, Report (pre‑checked based on logic)
  - Requirements: five content modules (pre‑checked based on logic)
  - Level text is included for copy but does not toggle the level itself
- Overrides
  - UI highlights changes in red and logs an audit entry per change
- Actions
  - Save Review (status + checklists; upserts to Airtable)
  - Preview Email (renders `email_to_client.md` with placeholders)
  - Approve & Publish (generates links; copies short URL for WhatsApp)
  - Send Email (via Microsoft Graph)

## 6) Persistence & Analytics

Storage: Airtable (`PRIVACY_REVIEWS`)
- submission_id (primary), form_id, submitted_at
- email, contact_name, contact_phone, business_name
- status (waiting_review, in_review, approved, sent); reviewer, reviewed_at
- auto_selected_modules (snapshot from logic) and selected_modules (final reviewer selection)
- auto_level, selected_level, level_overridden (checkbox)
- overrides_added, overrides_removed, overrides_diff_json, override_reason
- Mirrors for score: score_level, score_reg, score_report, score_dpo, score_requirements, is_correct_auto, is_correct_reviewed
- Publish links: report_token_hash, report_expires_at, report_url, share_url

Audit Table (Review_Audit)
- submission_id, module, action (checked/unchecked), from→to, reviewer, timestamp

Accuracy Metrics
- is_correct_auto: auto_selected_modules == selected_modules (exact set match)
- is_correct_reviewed: reviewer’s correctness judgment (optional override)
- accuracy_overall = avg(is_correct_reviewed if set else is_correct_auto)
- accuracy_lastN = same metric but over the most recent N reviewed items (N is UI‑configurable)

## 7) Deliverables

Report
- Unified RTL template: `privacy_unified_template.html`
- Content modules linked to results: `ResultTexts/*.md`
- Composer fills placeholders (e.g., `{{business_name}}`, `{{contact_name}}`) and merges selected modules
- Examples: `docs/PrivacyExpress/sample_report_lone.html`, `docs/PrivacyExpress/report_from_lone.html`

Email
- Template: `ResultTexts/email_to_client.md`
- First line sets subject with `[EMAIL_SUBJECT]: ...`
- Preview in UI; send directly via Microsoft Graph (recommended) or copy/paste into Outlook as fallback
- Endpoint: `POST /privacy/send_email`
- Required app settings: `GRAPH_CLIENT_ID`, `GRAPH_CLIENT_SECRET`, `GRAPH_TENANT_ID`, `GRAPH_MAILBOX`

## 8) Security & Privacy

- Secrets live in `EISLAW System/secrets.local.json` (not committed). See `docs/Integrations.md`
- Avoid PII in URLs; URL parameters from Fillout are treated as untrusted metadata (used as fallback only)
- Minimal data cached in Airtable; attachments/links stored via URL fields when applicable
- CORS limited to local dev origins; production domains to be configured per environment
- Microsoft Graph requires Azure AD App Registration with Application permission `Mail.Send` (admin consent). Store credentials as app settings or GitHub secrets.

## 9) Operations (Dev)

- Local start: `session_start.bat` (or `open_local.bat` for lighter start)
- Fillout fetch/score (ad‑hoc):
  - `python tools/fillout_fetch_and_score.py --form-id <id> --limit 3`
  - Optional upsert: add `--airtable-upsert --airtable-status waiting_review`
- Airtable preflight (quick sanity):
  - `python tools/airtable_preflight.py`
- Report from a module (example):
  - `python tools/compose_report_from_md.py docs/PrivacyExpress/ResultTexts/level_lone.md docs/PrivacyExpress/report_from_lone.html "דו"ח פרטיות" "" "דוח פרטיות, נערך על-ידי עו"ד איתן שמיר"`


E2E test (local)
- Run: `start_dev.bat` → backend `http://127.0.0.1:8788`, frontend `http://localhost:5173/#/privacy`
- In UI: open a submission → set level/checklists → Save Review (see Airtable row)
- Click Approve & Publish → copy `share_url` (`/r/{token}`) and open it → report renders
- Click Preview Email → `{{report_url}}` present; send manually for now

Questionnaire → Airtable smoke test
- Script: `python tools/privacy_flow_smoke_test.py --count 10 --form-id t9nJNoMdBgus`
- Prereqs: `secrets.local.json` must include `fillout.api_key` and the Airtable token/base/table IDs; the script reuses `docs/fillout_field_mapping.json` plus `config/security_scoring_rules.json`.
- Flow: seeds the Fillout form with `{count}` timestamped submissions via the bulk API response (no polling), scores them locally, and upserts each submission into `Security_Submissions` via `tools.airtable_utils`.
- Output: prints a JSON summary listing each submission id, derived level, Airtable record id, and stored status/level so we can confirm the answers landed end-to-end.
- Optional flags: `--email-template privacy-test+{ts}-{n}@domain`, `--airtable-status waiting_review`.

## 10) Roadmap
- Click Send Email → email is sent via Microsoft Graph (requires app settings)

### Task Files (system-wide)
- Per-task canonical folder in SharePoint (human: “<Client Name> — <Task Title>”).
- Files saved with Hebrew-safe names + DD.MM.YY suffix; DriveItem IDs stored (stable links).
- UI: Task modal → Files panel supports Upload, Rename title (renames in SP), Set Current, Add email (EML + attachments).
- Email attach: EML is canonical; optional PDF snapshot; attachments named short and linked by metadata.
- Click Send Email → email is sent via Microsoft Graph (requires app settings)

### 9.1) Cloud Deployment (Privacy module only)
- GitHub Action: `.github/workflows/deploy_privacy.yml` builds backend + frontend and deploys to Azure Web App + Static Website
- Required repository secrets:
  - `AZURE_CREDENTIALS` (JSON for SPN with access to RG/webapp/storage)
  - `FILLOUT_API_KEY`
  - `AIRTABLE_TOKEN`, `AIRTABLE_BASE_ID`
  - `GRAPH_CLIENT_ID`, `GRAPH_CLIENT_SECRET`, `GRAPH_TENANT_ID`, `GRAPH_MAILBOX`
  - Optional: `REPORT_TOKEN_TTL_DAYS`, `REPORT_LINK_HOST`
- Azure resources (current env): RG `EISLAW-Dashboard`, Web App `eislaw-api-01`, Storage `eislawstweb`
- CORS: allow the static site origin to call the API (`https://<storage>.z39.web.core.windows.net`)
- Post-deploy smoke: open `/#/privacy`, expand a submission, Save Review, Approve & Publish, Preview Email, Send Email

Near-term (polish)
- Frontend Hebrew label corrections in `#/privacy`
- Styled CTA button in the email template (Petrol/Copper)
- Optional `Review_Audit` table and audit inserts

Next
- Real-time webhook ingest from Fillout to backend, then upsert to Airtable
- Outlook/Graph assisted send with PDF export of HTML
- Batch backfill + rolling accuracy dashboard

## 12) Redirect & Hero Page (Fillout)

- Hero page URL: your published Fillout page (brand section already live)
- Button target for published reports: short link `https://eislaw-api-01.azurewebsites.net/r/{token}`
- The backend returns this link after Approve & Publish; include it in email/WhatsApp
- For immediate access via Hero, configure the redirect after approval using the generated short link

## 11) Success Criteria

- Reviewer can approve/override and send within minutes
- ≥90% correctness auto‑selection on last N assessments
- Consistent brand styling across all outputs (browser + PDF)
- Zero data loss: every change audited; statuses accurate

---

If any resource mentioned here is missing, respond in the session with: `Missing resource: <path>. Please add or re-link.`

