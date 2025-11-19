<!-- Project: PrivacyExpress | Full Context: docs/System_Definition.md#privacy-deliverable-flow -->
# Fillout Audit – Privacy Security Scoring (v0.1)

Goal
- Align the Fillout questionnaire with the scoring rules in `config/security_scoring_rules.json` so we can compute: `level`, `reg`, `report`, `dpo` reliably.
- Produce a concrete mapping plan, validation hints, and sample payloads for a webhook.

Status of this pass
- The public page is client‑rendered; static HTML does not expose the field schema. I proceeded with a requirements‑first audit and a precise mapping you can apply in Fillout. Once the form is finalized, I’ll run a live DOM audit and update this file with the exact keys observed.

Required inputs (key → type → purpose)
- `ethics` → bool → Professional ethics applies (Y/N). Only gates `lone`.
- `owners` → int → Number of owners/controllers (lone allows ≤2).
- `access` → int → Authorized users (basic if sensitive & ≤10; high if sensitive & ≥101; 11–100 → mid).
- `ppl` → int → Total records/data subjects (reg if transfer/directmail_biz & ≥10,000; high if >100,000).
- `sensitive` → bool → Sensitive data exists.
- `sensitive_people` → int → People with sensitive data (report if ≥100,000 and reg==false).
- `biometric_people` → int → People with biometric data (high/report if ≥100,000, implies sensitive_people ≥100,000).
- `transfer` → bool → Transfers to others (reg with ppl ≥10,000).
- `directmail_biz` → bool → Direct marketing for a third party (reg with ppl ≥10,000).
- `directmail_self` → bool → Direct marketing for own business (compliance‑only; no effect on level/obligations here).
- `place_info` → bool → Location data in material quantities (DPO only; no effect on level).
- `sensitive_major` → bool → Sensitive data in material quantities (DPO only; no effect on level).
- `processor` → bool → Holds/processes for others (reserved for future rule; include for extensibility).

Current evaluation logic (summary)
- Registration (reg): true iff (`transfer` OR `directmail_biz`) AND `ppl ≥ 10000`. Never otherwise.
- Reporting (report): true iff `reg==false` AND (`sensitive_people ≥ 100000` OR `biometric_people ≥ 100000`).
- DPO (dpo): true iff `reg` OR `report` OR `place_info` OR `sensitive_major`.
- Level:
  - High if: `biometric_people ≥ 100000` OR `ppl > 100000` OR (`sensitive==true` AND `access ≥ 101`).
  - Lone if: `ethics==false` AND `owners ≤ 2` AND `access ≤ 2` AND `directmail_biz==false` AND `transfer==false` (sensitive may be true).
  - Basic if: `directmail_biz==false` AND `transfer==false` AND (`sensitive==false` OR (`sensitive==true` AND `access ≤ 10`)).
  - Mid otherwise (default).

Proposed field layout (labels → key → type)
- “Does professional ethics apply?” → `ethics` → Yes/No
- “How many owners/controllers?” → `owners` → Number (>=1)
- “How many authorized users have access?” → `access` → Number (>=0)
- “How many total records (data subjects) are in your database?” → `ppl` → Number (>=0)
- “Does your database include sensitive data?” → `sensitive` → Yes/No
- If `sensitive == Yes`:
  - “How many people’s sensitive data do you hold?” → `sensitive_people` → Number (>=0)
  - “How many people’s biometric data do you hold?” → `biometric_people` → Number (>=0)
- “Do you transfer personal data to other parties?” → `transfer` → Yes/No
- “Do you perform direct marketing for a third party?” → `directmail_biz` → Yes/No
- “Do you perform direct marketing for your own business?” → `directmail_self` → Yes/No
- “Do you hold location data in material quantities?” → `place_info` → Yes/No
- “Do you hold sensitive data in material quantities?” → `sensitive_major` → Yes/No
- “Do you process/hold data for others (processor role)?” → `processor` → Yes/No

Validation hints
- Numeric fields (`owners`, `access`, `ppl`, `sensitive_people`, `biometric_people`) should be numeric with non‑negative validation; add helper text for thresholds (10/101/10,000/100,000) to reduce user error.
- Conditional visibility: show `sensitive_people`/`biometric_people` only when `sensitive==true`.
- Tooltips: clarify “material quantities” for `place_info` and `sensitive_major`.

Mapping table (Fillout_key → spec_param → used by)
- `ethics` → `ethics` → Lone gate
- `owners` → `owners` → Lone gate
- `access` → `access` → Basic/Mid/High thresholds
- `ppl` → `ppl` → Reg (& High >100k)
- `sensitive` → `sensitive` → Basic/Mid/High logic
- `sensitive_people` → `sensitive_people` → Report trigger
- `biometric_people` → `biometric_people` → High/Report trigger
- `transfer` → `transfer` → Reg trigger
- `directmail_biz` → `directmail_biz` → Reg trigger
- `directmail_self` → `directmail_self` → Compliance‑only (outside scoring)
- `place_info` → `place_info` → DPO trigger
- `sensitive_major` → `sensitive_major` → DPO trigger
- `processor` → `processor` → reserved (no rule yet)

Webhook integration (recommended)
- Local endpoint: `POST http://127.0.0.1:8788/fillout/webhook` (see `scoring_service/README.md`).
- Optional shared secret: header `X-Fillout-Secret: <your-secret>`; set env `FILL0UT_SHARED_SECRET` on the server.
- Payload: send field keys/values as JSON. Example:
{
  "ethics": false,
  "owners": 1,
  "access": 2,
  "ppl": 5000,
  "sensitive": true,
  "sensitive_people": 120000,
  "biometric_people": 0,
  "transfer": false,
  "directmail_biz": false,
  "directmail_self": true,
  "place_info": false,
  "sensitive_major": false,
  "processor": false
}
- Response:
{ "level": "mid", "reg": false, "report": true, "dpo": true }

Gaps to confirm in your form
- Add numeric fields: `sensitive_people`, `biometric_people` (if missing).
- Ensure `owners`, `access`, `ppl` are numeric.
- Ensure booleans exist for: `ethics`, `sensitive`, `transfer`, `directmail_biz`, `directmail_self`, `place_info`, `sensitive_major`, `processor`.

Next actions
- Finalize the fields/keys in Fillout (send me an export or confirm the exact keys), and I’ll update this audit with the exact mapping.
- I’ll also validate the live form with Playwright and attach a brief field inventory once finalized.

## Field Inventory (first pass via Playwright)

Saved raw inventory to: docs/fillout_field_inventory.json

Example entries:
`
[
  {
    "step": 1,
    "type": "select-one",
    "required": false,
    "label": "Phone number country"
  },
  {
    "step": 1,
    "type": "tel",
    "required": false,
    "label": "מספר טלפון נייד (לשאלות ועדכונים במידת הצורך):"
  },
  {
    "step": 1,
    "type": "email",
    "required": false,
    "label": "כתובת דוא\"ל"
  },
  {
    "step": 1,
    "type": "text",
    "required": false,
    "label": "שם פרטי ושם משפחה:"
  }
]
`

Notes
- Form currently shows contact details on the first step (phone/email/name). I will progress through subsequent steps (as you finalize them) to capture all scoring-related questions and align them to the required keys listed above.
- We'll ensure all scoring keys exist (or are derived) before wiring the webhook.
 - For a running changelog of issues found during testing and their fixes, see `docs/Testing_Episodic_Log.md`.
\n+---
\n+Update v0.2 (Questionnaire + Rules Alignment)
- Drop the explicit question "sensitive data in material quantities"; rely on the numeric `sensitive_people`.
- DPO rule now triggers when `sensitive_people >= 1000` (in addition to `reg`, `report`, or `place_info`).
- Mapping/table guidance: remove `sensitive_major` everywhere and ensure `sensitive_people` is present as a numeric field.
- Example payloads: remove `sensitive_major` key; use `sensitive_people` to test the 1,000 threshold.
\n+Update v0.2.1 (Align to current questions)
- Replace biometric count with boolean `biometric_100k` (High/Report trigger).
- Remove `sensitive_major` and any `place_info` dependency from scoring; rely on `sensitive_people` numeric and the business triggers for `reg`.
- Ensure `sensitive` boolean is derived from the sensitive-types multi-select OR `sensitive_people > 0`.
- Boundary tests to run: {999, 1000, 100000} for `sensitive_people`; `true/false` for `biometric_100k`; `ppl` around 10,000 and 100,000; access around 10 and 101.
Update v0.2.3 (High + Lone refinements)
- High level: also when `sensitive_people >= 100000` (not only biometric/ppl/access rules).
- Lone level: add constraint `ppl < 10000` (cannot be lone if personal-data count is >= 10,000).
- Registration reminder: uses `ppl >= 10000`.
Update v0.2.5 (Processor large org)
- New follow-up: `processor_large_org` (bool) — if processing for a large organization, DPO is required; include outsourcing guidance text.
