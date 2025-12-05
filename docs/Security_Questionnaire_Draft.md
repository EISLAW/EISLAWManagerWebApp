<!-- Project: PrivacyExpress | Full Context: docs/System_Definition.md#privacy-deliverable-flow -->
# Privacy Security Questionnaire – Working Draft (v0.1)

Purpose
- Organize all questions, types, and explanations in a logical flow aligned to the scoring rules in `config/security_scoring_rules.json`.
- Map each question to a machine-readable parameter so results can be computed automatically (level, reg, report, dpo).
- Identify gaps/redundancies and suggest improvements (labels, validations, conditional display).

Core params referenced by the scorer
- Numeric
  - `ppl` – total data subjects/records.
  - `sensitive_people` – people with sensitive data.
  - `biometric_people` – people with biometric data.
  - `owners` – number of owners/controllers.
  - `access` – number of authorized users (people; includes owners).
- Boolean
  - `sensitive`, `transfer`, `directmail_biz`, `directmail_self` (compliance‑only),
  - `ethics`, `place_info`, `sensitive_major`, `processor`.

Proposed page order (logical grouping)
1) Scale (how many people, sensitive yes/no, sensitive scale, biometric scale, access)
2) Data uses for others and direct marketing
3) Governance baseline (ownership, ethics)
4) Special categories at scale (location monitoring, sensitive‑major)
5) Workforce/process context (processor role, misc operational flags)

Detailed questions (as provided, with mapping)

Page 1 — Scale
1) On how many people do you store personal data (any type)?
   - Type: number (short answer)
   - Explanation: Personal data is any data that can identify a person directly or indirectly (e.g., name, phone, email, device type, IP address, browsing habits). Include all sources (local PC, CRM, Drive, email, etc.).
   - Param: `ppl`
   - Validation: integer ≥ 0

2) Does your database include special‑sensitivity data?
   - Type: Yes/No
   - Explanation: Sensitive data includes medical, genetic, criminal, credit/financial, biometric, and any category defined as “sensitive” by law.
   - Param: `sensitive`

3) How many people’s special‑sensitivity data do you hold?
   - Type: number (short answer)
   - Explanation: —
   - Param: `sensitive_people`
   - Validation: integer ≥ 0; show only if `sensitive == true` (or keep always visible if you prefer explicit entry).

4) How many people’s biometric data do you hold?
   - Type: number (short answer)
   - Explanation: Biometric data is information about a physical characteristic used for computational identification (e.g., fingerprints, facial geometry).
   - Param: `biometric_people`
   - Validation: integer ≥ 0; show only if `sensitive == true` (optional).

5) How many authorized users does the business have (including owners)?
   - Type: number (short answer)
   - Explanation: Authorized users = any person (not a company) with access to business systems or data, including cloud services; includes owners. Excludes third‑party providers like Google and their staff.
   - Param: `access`
   - Validation: integer ≥ 0

Page 2 — Data uses for others / direct marketing
1) Does your business collect data on people in order to pass it to others?
   - Type: Yes/No
   - Explanation: Select “Yes” if a core activity is collecting data to pass to a third party for consideration (e.g., CV collection to employers; lead sites; referrals).
   - Param: `transfer`

2) Do you perform direct marketing to people in your database, based on personal attributes, on behalf of another party?
   - Type: Yes/No
   - Explanation: “Based on personal attributes” = segmented by a personal trait (income, DOB, address, etc.). If all recipients receive identical content, select “No”. Examples: birthday month offers; geography/income‑based offers.
   - Param: `directmail_biz`

3) Do you perform direct marketing to people in your database, based on personal attributes, for your own business?
   - Type: Yes/No
   - Explanation: As above; this affects compliance guidance, not security scoring outputs.
   - Param: `directmail_self` (compliance‑only)

Page 3 — Governance baseline
1) How many owners does the business have?
   - Type: number (short answer)
   - Explanation: Number of people who own the business (including via a company). A married couple counts as one.
   - Param: `owners`

2) Are you bound by professional ethics or confidentiality under law?
   - Type: Yes/No
   - Explanation: Examples: attorneys, teachers, psychologists, CPAs.
   - Param: `ethics`

Page 4 — Special categories at scale
1) Is a core business activity monitoring at least 1,000 people (e.g., location, behavior, browsing habits)?
   - Type: Yes/No
   - Explanation: Select “Yes” even if the data is anonymized. This drives DPO only.
   - Param: `place_info`

2) Is a core business activity processing or storing special‑sensitivity data (e.g., medical, genetic, criminal, credit, biometric) in material quantities (≈1,000+ people)?
   - Type: Yes/No
   - Explanation: This drives DPO only. (Note: text currently duplicates the location hint in your draft; suggestion: replace with the definition above.)
   - Param: `sensitive_major`

Page 5 — Workforce/process context
1) Do you have employees or freelancers?
   - Type: Yes/No
   - Explanation: —
   - Param: (none for scoring) — informational/context; optional.

2) Which of the following are true? (multiple select)
   - Type: multi‑select
   - Options include: mailbox for staff, CCTV, social media or customer comms access, access to computing resources, etc.
   - Param: (none for scoring) — informational/context; optional.

3) Does your business process/hold data for customers (processor role)?
   - Type: Yes/No
   - Explanation: “Process data” = perform operations on a client’s data under their instruction, including storage. Examples: operate/maintain CRMs; provide IT/support with exposure to client data; run payroll/bookkeeping; operate storage or mailing services for clients.
   - Param: `processor` (reserved; future rule)

Summary of validation and display logic
- Numeric fields (`owners`, `access`, `ppl`, `sensitive_people`, `biometric_people`) must be numbers ≥ 0.
- Conditional visibility: show `sensitive_people`/`biometric_people` only when `sensitive == true` (or keep visible if you prefer explicit entry every time).
- No need for a separate “ppl ≥ 100,000?” question; this is derived from `ppl` and handled by the scorer.

Fit with scoring logic (current)
- Registration (reg): true iff (`transfer` OR `directmail_biz`) AND `ppl ≥ 10000`. Never otherwise.
- Reporting (report): true iff `reg==false` AND (`sensitive_people ≥ 100000` OR `biometric_people ≥ 100000`).
- DPO (dpo): true iff `reg` OR `report` OR `place_info` OR `sensitive_major`.
- Level:
  - High if: `biometric_people ≥ 100000` OR `ppl > 100000` OR (`sensitive==true` AND `access ≥ 101`).
  - Lone if: `ethics==false` AND `owners ≤ 2` AND `access ≤ 2` AND `directmail_biz==false` AND `transfer==false` (sensitive may be true).
  - Basic if: `directmail_biz==false` AND `transfer==false` AND (`sensitive==false` OR (`sensitive==true` AND `access ≤ 10`)).
  - Mid otherwise (default).

Open items for your confirmation
- Switch “biometric ≥ 100,000 (Yes/No)” to a numeric field `biometric_people` (recommended).
- Make `sensitive_people` visible only if `sensitive==true` (or keep always visible if that’s simpler operationally).
- Optional: drop the explicit “ppl ≥ 100,000?” since it’s derivable from `ppl`.
- Keep Page 5 items for context only (they do not change scoring outputs today).

Next steps
- If you approve this structure, I’ll align the Fillout mapping (keys → params) and wire the webhook to compute outputs on submit. After that, we can run test submissions to validate boundary cases.
