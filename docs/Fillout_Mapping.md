<!-- Project: PrivacyExpress | Full Context: docs/System_Definition.md#privacy-deliverable-flow -->
# Fillout Mapping Plan (Privacy Security Scoring)

---

Authoritative Mapping (Hidden Fields, v1)
- Canonical keys expected by the scorer: owners, access, ethics, ppl, sensitive_people, sensitive_types, biometric_100k, transfer, directmail_biz, directmail_self, monitor_1000, processor, processor_large_org, employees_exposed, cameras.
- Prefer hidden fields in Fillout for stable machine keys. Missing booleans are treated as false; missing numbers as 0.
- Mapping file: `docs/fillout_field_mapping.json` holds the form question IDs currently in use.
- Normalizations applied by the scorer:
  - If `sensitive_people > ppl`, effective `ppl = sensitive_people`.
  - If `biometric_100k == true`, floor `ppl`, `sensitive_people`, `biometric_people` to 100,000.
  - Derive `sensitive = true` if `sensitive_people > 0` or `sensitive_types` non-empty.

Hidden Fields We Use (current form)
- owners (number), access (number), ppl (number), sensitive_people (number)
- ethics (boolean), biometric_100k (boolean), transfer (boolean)
- directmail_biz (boolean), directmail_self (boolean), monitor_1000 (boolean)
- processor (boolean), processor_large_org (boolean)
- employees_exposed (boolean), cameras (boolean)
- sensitive_types (multi-select; optional)

See `docs/Integrations.md` for API fetch instructions and `tools/fillout_fetch_and_score.py` usage.
Scope
- Ensure the questionnaire captures all inputs needed for the rules in `config/security_scoring_rules.json` and can compute outputs `level`, `reg`, `report`, `dpo`.
- Start with simple fields (bool/numeric). We can add a post‑submit webhook to compute results via `tools/security_scoring_eval.py`.

Required Inputs (field keys → type → purpose)
- `ethics` → bool → Professional ethics applies (Yes/No). Used only to exclude `lone` when true.
- `owners` → int → Number of owners/controllers.
- `access` → int → Authorized users with access to the DB.
- `ppl` → int → Total number of data subjects/records.
- `sensitive` → bool → Sensitive data exists.
- `sensitive_people` → int → People with sensitive data. (Report if ≥ 100,000.)
- `biometric_people` → int → People with biometric data. (High/Report if ≥ 100,000.)
- `transfer` → bool → Transfers data to others. (Reg with ppl ≥ 10,000.)
- `directmail_biz` → bool → Direct marketing for a third party. (Reg with ppl ≥ 10,000.)
- `directmail_self` → bool → Direct marketing for own business (compliance-only; does not affect level/obligations).
- `place_info` → bool → Location data in material quantities. (DPO only.)
- `sensitive_major` → bool → Sensitive data in material quantities. (DPO only.)
- `processor` → bool → Holds/processes for others. (Reserved.)

Evaluation Logic (summary)
- Registration (reg): true iff (`transfer` OR `directmail_biz`) AND `ppl ≥ 10000`. Never otherwise.
- Reporting (report): true iff `reg==false` AND (`sensitive_people ≥ 100000` OR `biometric_people ≥ 100000`).
- DPO (dpo): true iff `reg` OR `report` OR `place_info` OR `sensitive_major`.
- Level: High if biometric_people ≥ 100000 OR ppl > 100000 OR (sensitive AND access ≥ 101); Lone if (ethics==false AND owners ≤ 2 AND access ≤ 2 AND directmail_biz==false AND transfer==false); Basic if (directmail_biz==false AND transfer==false AND (sensitive==false OR (sensitive AND access ≤ 10))); Mid otherwise.

Integration Plan
- Webhook (recommended): On submission, Fillout POSTs JSON to a local endpoint that calls `tools/security_scoring_eval.py` and returns outputs; appends to Airtable/registry.
- Alternative: Fillout formula fields (more complex; not recommended for maintenance).

Next Actions
- Confirm the form contains or will contain all required inputs above.
- Send me the field keys (or export). I’ll produce the final key→param mapping and a small webhook skeleton.
\n+---
\n+Update v0.2 (DPO rule change)
- Removed the separate "sensitive_major" boolean. The questionnaire now uses `sensitive_people` only.
- DPO rule: `dpo = true` if any of: `reg == true`, `report == true`, `place_info == true`, or `sensitive_people >= 1000`.
- Mapping impact: ensure the form collects a numeric `sensitive_people` value; do not include `sensitive_major`.
- Examples and validations remain the same otherwise; update any payloads to omit `sensitive_major`.
\n+Authoritative Mapping (v0.2.1)
\n+Required inputs (key  type  purpose)
- `ethics`  bool  Professional secrecy/ethics applies (Y/N). Used only to exclude `lone` when true.
- `owners`  int  Number of owners/controllers (count couples as one per instruction).
- `access`  int  Authorized users with access to the data (include owners; exclude cloud vendors).
- `ppl`  int  Total people with personal data (approximate is fine).
- `sensitive`  bool  Derived: true if any sensitive type selected OR if `sensitive_people > 0`.
- `sensitive_people`  int  People with sensitive data (report at =100,000; DPO at =1,000).
- `biometric_100k`  bool  Biometric data held for 100,000+ people (High/Report trigger).
- `transfer`  bool  Transfers data to others as a business activity (core practice).
- `directmail_biz`  bool  Segmented direct marketing for another party.
- `directmail_self`  bool  Segmented direct marketing for own business (compliance-only; does not affect level/obligations here).
- `processor`  bool  Processes/holds data for another controller (material scope).

Evaluation Logic (summary)
- Registration (reg): true iff (`transfer` OR `directmail_biz`) AND `ppl = 10000`.
- Reporting (report): true iff `reg==false` AND (`sensitive_people = 100000` OR `biometric_100k == true`).
- DPO (dpo): true iff `reg` OR `report` OR (`sensitive_people = 1000`).
- Level:
  - High if: `biometric_100k == true` OR `ppl > 100000` OR (`sensitive==true` AND `access = 101`).
  - Lone if: `ethics==false` AND `owners = 2` AND `access = 2` AND `directmail_biz==false` AND `transfer==false`.
  - Basic if: `directmail_biz==false` AND `transfer==false` AND (`sensitive==false` OR (`sensitive==true` AND `access = 10`)).
  - Mid otherwise (default).

Sample payload (for webhook/tests)
{
  "ethics": false,
  "owners": 2,
  "access": 10,
  "ppl": 12000,
  "sensitive": true,
  "sensitive_people": 1500,
  "biometric_100k": false,
  "transfer": false,
  "directmail_biz": true,
  "directmail_self": false,
  "processor": false
}

Expected result (illustrative): { "level": "mid", "reg": true, "report": false, "dpo": true }

Notes
- Do not include `sensitive_major` or `place_info` — not part of the current questionnaire.
- If the form only stores the sensitive multi-select, derive `sensitive = (selected_count > 0)`.
---

Update v0.2.3 (High + Lone clarification)
- High level: also when `sensitive_people >= 100000` (not just biometric/ppl/access).
- Lone level: add `ppl < 10000` constraint in addition to ethics=false, owners<=2, access<=2, and no transfer/directmail_biz.
- Registration threshold is `ppl >= 10000` (clarified).
\n+---
\n+Update v0.2.4 (Requirements outputs)
- New keys and requirement outputs:
  - `employees_exposed` (Q13) → add requirement `worker_security_agreement`.
  - `cameras` (Q14) → add requirement `cameras_policy`.
  - `processor` (Q12) → enforce `level_min = mid`, add requirements `consultation_call` and `outsourcing_text`.
  - `processor_sensitive_org` (Q12 follow-up) → set `level = high`, `dpo = true`, add requirements `consultation_call`, `outsourcing_text`.
  - `directmail_biz` (Q9) or `directmail_self` (Q10) → add requirement `direct_marketing_rules`.
\n+Response schema now includes `requirements: string[]` alongside `level`, `reg`, `report`, `dpo`.
Update v0.2.5 (Processor large org → DPO)
- Add follow-up key: `processor_large_org` (bool). When true, DPO is required (even if not a sensitive/public body), and outsourcing text is needed.
- Existing follow-up `processor_sensitive_org` continues to set High + DPO and also requires outsourcing text.
