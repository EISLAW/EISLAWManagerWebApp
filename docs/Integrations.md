<!-- Project: PrivacyExpress | Full Context: docs/System_Definition.md#privacy-deliverable-flow -->
# Integrations

Purpose: document external systems and how assistants should access them safely and autonomously.

## Fillout (Onboarding Questionnaire)
- Form: ריטיינר_אונבורדינג (public link: https://eislaw.fillout.com/t/sg4zY9dGS1us)
- Data flow:
  - Client completes form and uploads documents.
  - Operator syncs responses and files into the client’s folder (central store of truth).
  - Attorneys review flagged items requiring judgment.

### Access Methods
- Browser automation (Playwright MCP) to navigate the link when needed for structure validation.
- API (recommended for data ingestion): store the API key outside version control and use it from scripts.

### Credentials Handling (do not commit raw secrets)
- Create: C:\Coding Projects\EISLAW System\secrets.local.json (not in version control) with:
  {
    "fillout": { "api_key": "<SET LOCALLY>" }
  }
- Reference from the existing desktop app (or a small integration script) reading from this file.
- Note: The owner provided the Fillout API key out-of-band; assistants must prompt to set it locally if missing.

### Planned Usage
- Fetch form schema/questions to map intake fields to the client folder structure.
- Poll or receive submissions and download attachments into the client's folder.
- Maintain a minimal log (timestamp, client id/email, files stored) for auditability.

### Hidden Fields & Mapping (current)
- We rely on hidden fields with canonical keys to ensure stable machine inputs.
- Canonical keys: owners, access, ethics, ppl, sensitive_people, sensitive_types, biometric_100k, transfer, directmail_biz, directmail_self, monitor_1000, processor, processor_large_org, employees_exposed, cameras.
- Mapping file: `docs/fillout_field_mapping.json` (question IDs for the live form).
- Normalization rules in the scorer:
  - ppl := max(ppl, sensitive_people)
  - biometric_100k → floor ppl/sensitive_people/biometric_people to 100,000
  - sensitive := (sensitive_people > 0) OR (sensitive_types non-empty)

### API Fetch & Score
- Tool: `tools/fillout_fetch_and_score.py`
  - `python tools/fillout_fetch_and_score.py --form-id <id> --limit 3`
  - Or resolve by name: `--form-name "..."`
  - Reads API key from `secrets.local.json`.
  - Uses `docs/fillout_field_mapping.json` to extract answers and prints computed `{ level, reg, report, dpo, requirements }`.
  - Treats missing booleans as false and missing numbers as 0 (matches form visibility logic).


## Airtable
- Stores client master data; connected to app registry. Credentials sourced from central secrets file.

## Microsoft Graph
- Optional email send/integration; credentials sourced from central secrets file.

### Graph Permissions (App Registration)

Current app: "Music Snippet" (Service Principal: "Virtual Visits App"). Used by backend + automation.

Status
- ARM (Azure Resource Manager): Contributor on RG `EISLAW-Dashboard` granted to the service principal — covers deployments.
- Microsoft Graph: baseline only; expanded permissions can be granted via the admin’s device‑code flow using the helper script below.

Recommended permission strategy
- Start least‑privilege and expand as needed. However, the owner requested a broad, future‑proof set to avoid later blockers. The following application permissions cover current and near‑term features:
  - Files.Read.All, Sites.Read.All (SharePoint/OneDrive read)
  - Mail.Read (Application or Delegated — for mailbox sync)
  - Calendars.Read (optional for scheduling)
  - User.Read.All, Directory.Read.All (read directory objects for lookups)

Granting admin consent (device‑code, via owner account)
- Script: `infra/graph_grant_app_perms_device.ps1`
- Usage (from repo root):
  pwsh -NoProfile -File "EISLAW System/infra/graph_grant_app_perms_device.ps1" -AppId "20a21e50-e7c9-4731-bff5-133353ed7a48"
- The script:
  1) Prompts via device code for Microsoft Graph admin consent
  2) Resolves the Microsoft Graph service principal in the tenant
  3) Assigns selected app roles (Application permissions) to the EISLAW app’s service principal

Notes
- Delegated flows (e.g., Mail.Read on a specific user) will still require the user to sign in once at runtime.
- If we later narrow scope, we can remove appRole assignments on the app’s service principal.

## Azure (ARM/Subscriptions)

Scope: verify Azure subscription access and hosting regions using the existing Microsoft app credentials.

Credentials
- Source: `microsoft_graph` block in `EISLAW System/secrets.local.json` (tenant_id, client_id, client_secret).
- Token scope: `https://management.azure.com/.default` (client credentials).

Usage
- Check access and enumerate regions/resource groups:
  - `pwsh -NoProfile -File "EISLAW System/tools/azure_check.ps1" -SubscriptionId "<subscription-id>"`

Current Verification
- Subscription: `bfdb71dc-de87-4c32-b792-158ae902bf85` (Azure subscription 1) — Enabled.
- Regions: subscription locations returned successfully (e.g., East US, West Europe, UK South, Sweden Central, Israel Central appears via RG).
- Resource groups: access OK; found `EISLAW-Dashboard` in region `israelcentral`.

Notes
- The app can read subscription metadata and resource groups. If deployment is required, ensure the app has the appropriate role (e.g., Contributor) on the subscription or target RG.


## LLM Providers
- Default Gemini; alternatives OpenAI/Anthropic. API keys sourced from central secrets file and configured in the app’s settings.json if needed.

## Central Secrets Location
- C:\\Coding Projects\\EISLAW System\\secrets.local.json (schema: secrets.schema.json).
 - Do not commit secrets. Assistants must populate locally and read at runtime.

## Facebook Marketing + Instagram

Scope: validate access to Facebook Marketing API (sandbox ad account) and Instagram Graph.

### Credentials Handling
- Store in `EISLAW System/secrets.local.json` under:
  {
    "facebook_marketing": {
      "access_token": "<FB user access token with ads_* scopes>",
      "ad_account_id": "act_801103545898702"
    },
    "instagram": {
      "user_id": "17841457090983397",
      "username": "eislaw_firm",
      "access_token": "<optional if using IG token; prefer Page/User FB token>"
    },
    "instagram_app": {
      "app_id": "<APP ID>",
      "app_secret": "<APP SECRET>",
      "app_name": "<APP NAME>"
    }
  }
- Schema updated in `secrets.schema.json` to include `facebook_marketing` and `instagram`.
 - Added `instagram_app` for OAuth exchanges and token debugging.

### Connectivity Check (performed)
- Facebook Graph OK:
  - `GET /v19.0/me?fields=id,name` using the provided token returned a valid user.
  - `GET /v19.0/act_801103545898702` returned the sandbox ad account details (ILS, Asia/Jerusalem).
- Instagram: CONNECTED (organic); promotions pending
  - Page ID: `260609460464545`
  - IG User ID: `17841457090983397` (`username: eislaw_firm`)
  - Organic media + insights OK.
  - Limitation: in‑app Instagram “Boost” (promotions) spend/metrics are not visible yet because the promotions ad account is not accessible to the API user. Paid fields in reports show 0 until access is granted or specific Ad IDs are supplied.

### Re-Verification Steps
- As Page owner, get a User token with: `pages_show_list`, `pages_manage_metadata`, `pages_read_engagement`, `instagram_basic`.
- GET `/me/accounts?fields=id,name,access_token` → find `260609460464545` and copy its Page token.
- GET `/260609460464545?fields=instagram_business_account` using the Page token → returns IG user id.
- GET `/17841457090983397?fields=id,username` → returns `eislaw_firm`.

### Notes
- Use Page tokens for Instagram Graph requests; use User tokens to list Pages and initiate the flow.
- App access token: `GET /oauth/access_token?client_id={app_id}&client_secret={app_secret}&grant_type=client_credentials` (debug/exchange only; not sufficient for Page/IG data).

### Promotions (Boost) Access
- Grant the API user (eitan@eislaw.co.il) access to the promotions ad account in Business Settings, or provide Ad IDs per boosted reel.
- Once accessible, paid report columns will populate: spend, paid reach/impressions/clicks, 3s plays, paid views, profile visits, duration.

