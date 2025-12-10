<!-- Project: PrivacyExpress | Full Context: docs/System_Definition.md#privacy-deliverable-flow -->
# Privacy Security Scoring – Working Spec (v1.2)

**Last Updated:** 2025-12-10
**Status:** Processor paradigm shift from Amendment 13 incorporated

## Purpose
- Define clear, machine-readable rules to classify a client's security level under the Israeli Privacy Protection framework and derive obligations (DPO, Registration, Reporting) from questionnaire answers.
- Produce one and only one security level: `lone`, `basic`, `mid`, or `high`.
- Based on current Privacy Protection Law (2023-2024 version) and 2018 Security Regulations.

> **📚 Legal References:** Full law texts are available in [`docs/Legal/`](Legal/README.md):
> - [Privacy Protection Law (חוק הגנת הפרטיות)](Legal/Privacy_Protection_Law.md) - 3,170 lines
> - [Security Regulations 2017 (תקנות אבטחת מידע)](Legal/Security_Regulations_2018.md) - 589 lines

## Outputs (mutually exclusive security level + obligations)
- `level` ∈ {`lone`, `basic`, `mid`, `high`} (exactly one)
- `dpo` ∈ {true,false} - Data Protection Officer required
- `reg` ∈ {true,false} - Registration with Privacy Protection Authority required
- `report` ∈ {true,false} - Annual report/PIA required

---

## Legal Definitions (from Israeli Privacy Protection Law)

### Security Levels (Hebrew Names)
- `lone` = "מאגר המנוהל בידי יחיד" (Individual-Managed Database)
- `basic` = "רמת אבטחה בסיסית" (Basic Security Level)
- `mid` = "רמת אבטחה בינונית" (Medium Security Level)
- `high` = "רמת אבטחה גבוהה" (High Security Level)

### "Sensitive Data" Definition (מידע בעל רגישות מיוחדת)

Per current law, sensitive data includes:
1. Privacy of family life, marital privacy, sexual orientation
2. Health information (medical/psychological)
3. Genetic information
4. Biometric identifiers
5. Origin/ethnicity
6. Criminal history
7. Political opinions, religious beliefs, worldview
8. Personality assessments
9. Location data and communication traffic data
10. Financial data (salary, assets, debts)
11. **Information subject to confidentiality duty established by law** ← NEW in current law

**Important:** Item #11 means that professional ethics duties (lawyers, doctors, psychologists, accountants) make data "sensitive" because these duties are established by law through professional licensing frameworks.

### Authorized Users Count - Two Definitions

**For LONE level:**
- Law explicitly separates: `owners` (1-2) + `access` (additional users, max 2)
- Total max: 4 people

**For BASIC/MID/HIGH levels:**
- Law uses total count: "מספר בעלי ההרשאה" = all authorized users
- `total_users = owners + access`

---

## Questionnaire Dictionary (input fields)

### Core Fields
- `owners` (int) – Number of owners/controllers of the database
- `access` (int) – Number of ADDITIONAL authorized users (besides owners)
- `ppl` (int) – Total number of people with personal data in the database
- `ethics` (bool) – Subject to professional confidentiality duty by law or ethics (Y/N)

### Sensitive Data Fields
- `sensitive_types` (array) – Types of sensitive data (medical, biometric, financial, etc.)
- `sensitive_people` (int) – Number of people with sensitive data
- `biometric_100k` (bool) – Has biometric identifiers of 100,000+ people

### Business Activity Fields
- `transfer` (bool) – Transfers data to others as business/for compensation
- `directmail_biz` (bool) – Direct marketing services for third parties
- `directmail_self` (bool) – Direct marketing for own business (not a level trigger)
- `processor` (bool) – Processes/holds data for others (processor role)
- `processor_large_org` (bool) – Processes for large organizations
- `processor_sensitive_org` (bool) – Processes for sensitive/public organizations

### Monitoring Fields
- `monitor_1000` (bool) – Continuous monitoring of 1,000+ people
- `cameras` (bool) – Security cameras (informational)
- `employees_exposed` (bool) – Employees have access to data (informational)

### Derived Field
- `sensitive` (bool) – DERIVED from: `sensitive_types` OR `sensitive_people > 0` OR `ethics == true`

---

## Level Determination Logic (Legal Rules)

### Evaluation Flow (Sequential - First Match Wins)

The system evaluates in this order:

**Step 1: Check LONE eligibility**
- Criteria (ALL must be true):
  - `owners <= 2` (1 or 2 owners)
  - `access <= 2` (at most 2 additional authorized users)
  - `ppl < 10,000` (fewer than 10,000 people in database)
  - `transfer == false` (not transferring data as business)
  - `directmail_biz == false` (not direct marketing services)
  - `ethics == false` (no professional confidentiality duty)
  - `processor == false` (not a data processor for others)
- **If all true → LONE**

**Step 2: Check HIGH eligibility**
- Criteria (ANY triggers high):
  1. **Biometric standalone:** `biometric_100k == true` (100,000+ biometric identifiers)
  2. **Transfer/DM + scale:** `(transfer == true OR directmail_biz == true)` **AND** `(total_users > 100 OR ppl >= 100,000)`
  3. **Sensitive + scale:** `sensitive == true` **AND** `(total_users > 100 OR ppl >= 100,000)`
  4. **Processor for large organizations:** `processor_large_org == true` (processes data for banks, insurance, medical institutions, public bodies)
- **If any true → HIGH**
- Where `total_users = owners + access`

**Step 3: Check BASIC eligibility**
- Criteria (ALL must be true):
  - Main purpose is NOT transfer/direct marketing (`transfer == false AND directmail_biz == false`)
  - Controller is NOT public body (not tracked - questionnaire for private businesses only)
  - NOT a data processor (`processor == false`)
  - **IF has sensitive data:** `total_users <= 10` OR employee-only exception applies
  - **IF no sensitive data:** automatically qualifies
- **If all true → BASIC**

**Step 4: Otherwise → MID**
- Default for databases that don't fit LONE, HIGH, or BASIC
- Includes:
  - Transfer/direct marketing databases (that don't reach HIGH thresholds)
  - Public bodies
  - Databases with sensitive data and 11-100 authorized users
  - **Data processors (minimum level):** Any `processor == true` that doesn't trigger HIGH

**Processor Paradigm Shift (Amendment 13):**
- Processors (מחזיקים) now have SAME data security responsibilities as controllers (בעלי שליטה)
- Rationale: Uncertainty about what personal data actually flows through processor systems
- Approach: Consultative flag - "You're a processor, you need to talk to us to determine exact obligations"
- **Regular processor:** Minimum MID level (excluded from LONE/BASIC)
- **Large org processor:** Automatic HIGH + DPO (same obligations as their clients)

### Thresholds

| Threshold | Value | Legal Source | Usage |
|-----------|-------|--------------|-------|
| `ppl_lone_max` | 10,000 | Law exclusion #2 | Max people for LONE level |
| `ppl_high_min` | 100,000 | 2018 Reg Appendix 2(1) | Min people for HIGH (with transfer/DM or sensitive) |
| `access_basic_max` | 10 | 2018 Reg Appendix 1 | Max total users for BASIC (with sensitive data) |
| `access_high_min` | 100 | 2018 Reg Appendix 2(2) | Min total users for HIGH (with transfer/DM or sensitive) |
| `biometric_high` | 100,000 | Current law standalone clause | Biometric identifiers for automatic HIGH |

---

## Examples (Test Cases)

### Example 1: Solo Accountant (LONE)
- `owners = 1`, `access = 1`, `ppl = 200`, `ethics = false`, `transfer = false`, `sensitive = false`
- **Result: LONE** (meets all LONE criteria)

### Example 2: Small Law Firm (BASIC)
- `owners = 2`, `access = 1`, `total_users = 3`, `ppl = 50`, `ethics = true`
- `sensitive = true` (derived from ethics)
- **Result: BASIC** (excluded from LONE by ethics, has sensitive but ≤10 users)

### Example 3: Medium Marketing Agency (MID)
- `owners = 3`, `access = 15`, `total_users = 18`, `ppl = 5000`, `directmail_biz = true`
- **Result: MID** (transfer/DM purpose, but doesn't reach HIGH thresholds)

### Example 4: Large Hospital (HIGH)
- `owners = 1`, `access = 150`, `total_users = 151`, `ppl = 80000`, `ethics = true`
- `sensitive = true` (medical data + ethics)
- **Result: HIGH** (sensitive data + >100 users)

### Example 5: Email Marketing Platform (HIGH)
- `owners = 5`, `access = 50`, `total_users = 55`, `ppl = 150000`, `directmail_biz = true`
- **Result: HIGH** (transfer/DM + 100k+ people)

### Example 6: Biometric Access Control (HIGH)
- `owners = 2`, `access = 10`, `total_users = 12`, `ppl = 120000`, `biometric_100k = true`
- **Result: HIGH** (biometric 100k+ standalone trigger)

### Example 7: SaaS HR Platform (MID - Processor)
- `owners = 2`, `access = 8`, `total_users = 10`, `ppl = 5000`, `processor = true`, `processor_large_org = false`
- **Result: MID** (processor minimum level - excluded from LONE/BASIC)
- **DPO: Consultative** (flag for discussion about actual data exposure)

### Example 8: Payroll Service for Bank (HIGH - Large Org Processor)
- `owners = 1`, `access = 15`, `total_users = 16`, `ppl = 3000`, `processor_large_org = true`
- **Result: HIGH** (processor for large organization)
- **DPO: Required** (same obligations as bank client)

---

## Obligations (DPO, Registration, Report)

Based on Israeli Privacy Protection Law (Amendment 13) and Security Regulations 2018.

### DPO (Data Protection Officer / ממונה על הגנת הפרטיות)

**Legal Source:** Section 17ב1 of Privacy Protection Law

**DPO Required When (ANY of these):**

1. **Transfer/Direct Marketing with 10,000+ people:**
   - `(transfer == true OR directmail_biz == true) AND ppl >= 10,000`

2. **Public Body:**
   - Controller is a public body (not tracked in questionnaire - for private businesses only)

3. **Systematic Monitoring at Scale:**
   - `monitor_1000 == true` (continuous monitoring of 1,000+ people - location, behavior, etc.)

4. **Sensitive Data Processing at Scale:**
   - `sensitive == true AND (ppl >= 10,000 OR large_organization == true)`
   - Examples: Banks, insurance companies, hospitals, HMOs
   - "Large organization" indicators: `processor_large_org == true` or high employee count

5. **Processor for Large Organizations:**
   - `processor_large_org == true` (processes data for banks, insurance, medical, public bodies)
   - Same DPO obligations as the large organization client
   - Applies even if processor has small staff or limited data volume

**Implementation Logic:**
```python
dpo_required = (
    # Transfer/DM with scale
    ((transfer or directmail_biz) and ppl >= 10000) or
    # Systematic monitoring
    monitor_1000 or
    # Sensitive data at scale
    (sensitive and (ppl >= 10000 or processor_large_org)) or
    # Processor for large organizations (standalone trigger)
    processor_large_org
)
```

---

### Registration (רישום ברשות)

**Legal Source:** Section 8א(א) of Privacy Protection Law

**Registration Required When (ANY of these):**

1. **Transfer/Direct Marketing with 10,000+ people:**
   - `(transfer == true OR directmail_biz == true) AND ppl >= 10,000`
   - Purpose: Collection of personal data for transfer to others as business/for compensation, including direct marketing services

2. **Public Body:**
   - Controller is a public body (not tracked - questionnaire for private businesses only)
   - Exception: Employee-only databases

**Implementation Logic:**
```python
registration_required = (
    # Transfer/DM with 10K+ people
    ((transfer or directmail_biz) and ppl >= 10000)
    # Public body check omitted (questionnaire targets private businesses)
)
```

---

### Report/Notice (הודעה לרשות)

**Legal Source:** Section 8א(ב) of Privacy Protection Law

**⚠️ CRITICAL: Report and Registration are MUTUALLY EXCLUSIVE**
- If Registration is required → Report is NEVER required (registration supersedes)
- Report is the "lesser" obligation for databases that don't meet registration criteria

**Report Required When (ALL must be true):**

1. **100,000+ people with sensitive data:**
   - `ppl >= 100,000 AND sensitive == true`

2. **NOT subject to Registration:**
   - Database is NOT a "transfer/direct marketing" database with 10K+ people
   - i.e., `NOT ((transfer OR directmail_biz) AND ppl >= 10,000)`

3. **NOT a public body** (already excluded by questionnaire scope)

**What to Report (one-time notice within 30 days):**
- Identity of controller + address + contact details
- Identity of DPO (if required per 17ב1) + contact details
- Copy of database definition document (מסמך הגדרות מאגר)

**Implementation Logic:**
```python
report_required = (
    # 100K+ sensitive people
    (ppl >= 100000 and sensitive) and
    # NOT subject to registration (registration supersedes report)
    not ((transfer or directmail_biz) and ppl >= 10000)
)
```

**Example Scenarios:**

| Scenario | Registration | Report | Why |
|----------|-------------|--------|-----|
| Hospital with 150K patients, no DM | ❌ No | ✅ Yes | Sensitive data at scale, but not transfer/DM business |
| Email marketing platform with 120K subscribers | ✅ Yes | ❌ No | Transfer/DM business → Registration supersedes Report |
| Retailer with 200K customers, no sensitive data | ❌ No | ❌ No | No sensitive data → no Report trigger |
| Law firm with 5K sensitive cases | ❌ No | ❌ No | Under 100K threshold |

---

### Data Map (מסמך הגדרות מאגר)

**Legal Source:** Sections 17(ב) and 36 of Privacy Protection Law + Security Regulations 2018

**Data Map Required:** **EVERYONE** (universal requirement for all security levels)

- All database controllers must prepare a "Database Definition Document"
- Required regardless of security level (lone, basic, mid, high)
- Basic level and above need additional documentation (security procedures, access control lists)

**Implementation Logic:**
```python
data_map_required = True  # Universal requirement
```

---

## Artifacts

### Current Implementation Files
- **Rules:** `config/security_scoring_rules.json` (versioned, machine-readable)
- **Evaluator:** `tools/security_scoring_eval.py` (reads answers JSON, outputs level + obligations)
- **Scorer:** `backend/privacy_scoring.py` (integrates evaluator with database)
- **Field Mapping:** `docs/fillout_field_mapping.json` (Fillout form IDs)

### Documentation
- **This spec:** `docs/Security_Scoring_Spec.md` (source of truth for legal definitions)
- **Test log:** `docs/Testing_Episodic_Log.md` (regression cases, bug fixes, lessons learned)

---

## Change Log

### v1.2 (2025-12-10) - Processor Paradigm Shift from Amendment 13
- **MAJOR UPDATE:** Incorporated processor (מחזיק) = controller (בעל שליטה) paradigm from Amendment 13
- **ADDED:** Processor exclusion from LONE level (`processor == false` required)
- **ADDED:** Processor exclusion from BASIC level (minimum MID for all processors)
- **ADDED:** `processor_large_org == true` as standalone HIGH trigger
- **ADDED:** `processor_large_org == true` as standalone DPO trigger
- **ADDED:** Processor Paradigm Shift explanation section
- **ADDED:** Two processor examples (SaaS HR platform, Payroll service for bank)
- **RATIONALE:** Uncertainty about what personal data flows through processor systems → consultative approach
- **IMPLEMENTATION:** Regular processor → MID minimum, Large org processor → HIGH + DPO automatic

### v1.1 (2025-12-10) - Obligations Section Completed
- **COMPLETED:** All three obligations (DPO, Registration, Report) fully defined
- **ADDED:** Implementation logic for each obligation with Python code examples
- **CLARIFIED:** Report vs Registration mutual exclusivity (registration supersedes)
- **ADDED:** Data Map universal requirement (all security levels)
- **ADDED:** Example scenarios table for Report/Registration triggers
- **UPDATED:** Based on sections 8א, 17ב1 of Privacy Protection Law

### v1.0 (2025-12-10) - Legal Definitions Clarified
- **MAJOR UPDATE:** Validated all definitions against current Israeli Privacy Protection Law
- **NEW:** Ethics duty now derives sensitive data (per law clause 11)
- **CORRECTED:** HIGH level requires (Transfer/DM OR Sensitive) AND scale thresholds
- **CORRECTED:** Authorized users count clarified (LONE vs other levels)
- **CORRECTED:** BASIC level "drop-down" logic for sensitive data with ≤10 users
- **ADDED:** Legal source citations (2018 Regulations + current law)
- **ADDED:** Comprehensive examples for each level

### v0.2.5 (Previous)
- Processor large org triggers DPO
- Processor sensitive org triggers HIGH + DPO

### v0.2.3 (Previous)
- Added explicit HIGH trigger for sensitive_people >= 100,000
- Lone requires ppl < 10,000
- Registration threshold confirmed at ppl >= 10,000

