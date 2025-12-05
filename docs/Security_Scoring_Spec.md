<!-- Project: PrivacyExpress | Full Context: docs/System_Definition.md#privacy-deliverable-flow -->
# Privacy Security Scoring – Working Spec (v0.1)

Purpose
- Define clear, machine-readable rules to classify a client’s security level under the Privacy Protection framework and derive obligations (DPO, Registration, Reporting) from questionnaire answers.
- Produce one and only one security level: `lone`, `basic`, `mid`, or `high`.
- Enforce business/legal constraints you stated:
  - If `reg` (registration) is required → level must be `mid` or `high`.
  - If `report` is required → `dpo` must be true.

Outputs (mutually exclusive security level + obligations)
- `level` ∈ {`lone`, `basic`, `mid`, `high`} (exactly one)
- `dpo` ∈ {true,false}
- `reg` ∈ {true,false}
- `report` ∈ {true,false}

Questionnaire Dictionary (input fields)
- `ethics` (bool) – professional ethics applies (Y/N)
- `access` (int) – number of authorized users with access
- `ppl` (int) – number of data subjects/records in the DB
- `sensitive` (bool) – has sensitive data
- `sensitive_bio_100` (bool) – biometric sensitive data with ≥100K records
- `owners` (int) – number of owners/controllers
- `transfer` (bool) – transfers data to others
- `directmail_biz` (bool) – direct marketing for a third party
- `directmail_self` (bool) – direct marketing for your own business
- `place_info` (bool) – location data for ≥1000 people
- `sensitive_major` (bool) – sensitive data in material quantities
- `processor` (bool) – processes/holds for others (processor role)

Initial Rule Strategy (to be refined with you)
- Precedence: `high` > `mid` > `basic` > `lone`.
- High triggers are rare and explicit; mid triggers reflect broader risk; otherwise drop to basic/lone by exclusion.
- Constraints applied after rules to enforce legal/business policy (registration/DPO couplings).

Initial Rules (draft)
- R1 (high – biometric scale): if `sensitive_bio_100 == true` → set `level = high`, `reg = true`, `dpo = true`.
- R2 (mid floor – material risks): if any of `{sensitive_major, place_info, processor, transfer, directmail_biz} == true` → set `level_min = mid` (at least mid; may escalate by other rules).
- R3 (lone – minimal profile): if `owners == 1` AND `ppl` ≤ `ppl_mid` AND all of `{sensitive, transfer, processor, directmail_biz, place_info} == false` → set `level = lone`.
- R4 (basic fallback): if none of the above apply and not forced to mid/high by constraints → `level = basic`.

Constraints (always enforced)
- C1: if `reg == true` → `level ∈ {mid, high}` (escalate if needed).
- C2: if `report == true` → `dpo = true`.

Thresholds (to confirm)
- `ppl_mid` (default 10,000) – below this, and with low-risk flags, a single owner can be `lone`.
- Note: these are placeholders; we will adjust with your domain expertise.

Evaluation Pipeline
1) Normalize inputs (booleans, ints; unset → defaults).
2) Apply rules to derive a candidate `level`, optional `level_min`, and obligations.
3) Enforce constraints (C1–C2), escalating level or obligations if needed.
4) Ensure exactly one security level: if multiple candidates, resolve using precedence.

Artifacts
- Machine-readable rules: `config/security_scoring_rules.json` (versioned).
- Evaluator script: `tools/security_scoring_eval.py` - reads answers JSON, prints derived outputs; used for quick tests and CI.
- (Later) Fillout mapping: compute formula fields or post-process submissions server-side to assign the outputs.
 - Episodic test log: `docs/Testing_Episodic_Log.md` (captures incidents, fixes, and regression cases).

---

Current Rules Summary (v1)
- Registration: (`transfer` OR `directmail_biz`) AND `ppl >= 10000` (reg -> dpo, min level mid)
- Reporting: `reg == false` AND (`sensitive_people >= 100000` OR `biometric_100k == true`) (report -> dpo)
- DPO: `reg` OR `report` OR (`sensitive_people >= 1000`) OR `monitor_1000`
- Level:
  - High if: `biometric_100k` OR `ppl >= 100000` OR (`sensitive` AND `access >= 101`) OR `sensitive_people >= 100000` OR `processor_large_org`
  - Lone if: `ethics==false` AND `owners <= 2` AND `access <= 2` AND no `transfer/directmail_biz` AND `ppl < 10000`
  - Basic if: not lone AND no `transfer/directmail_biz` AND (`sensitive==false` OR (`sensitive==true` AND `access <= 10`))
  - Mid otherwise; also enforced as floor when `processor == true`
- Normalization:
  - `ppl := max(ppl, sensitive_people)`
  - If `biometric_100k == true`, floor `ppl`, `sensitive_people`, `biometric_people` to 100,000
  - Derive `sensitive := (sensitive_people > 0) OR (sensitive_types non-empty)`

Artifacts (updated)
- Hidden field mapping: `docs/fillout_field_mapping.json` (IDs for the live form).

Open Points / To Be Decided
- Exact registration/report triggers per Israeli law (we’ll encode as explicit rules once confirmed).
- Whether `ethics`, `access`, `directmail_self` influence level or only obligations (start neutral; adjust later).
- Exact numeric thresholds for `ppl` and any “material quantity” definitions.

Next Steps
- You’ll specify the concrete legal triggers; I’ll encode them as atomic rules in the JSON and update the evaluator.
- Once stable, I’ll wire a small post-submission hook (Fillout or server-side) to compute outputs automatically and write back to Airtable/registry.
\n+---
\n+Update v0.2 (DPO Threshold Revision)
- Questionnaire: deprecate `sensitive_major` and ensure numeric `sensitive_people` (and `biometric_people`) fields exist.
- DPO logic: `dpo = true` if `reg` OR `report` OR `place_info` OR (`sensitive_people >= 1000`).
- Other rules unchanged (report at 100,000 sensitive/biometric when `reg==false`; high level triggers unchanged).
\n+Update v0.2.1 (Questionnaire + DPO Threshold)
- Questionnaire: deprecate `sensitive_major`; ensure numeric `sensitive_people` and boolean `biometric_100k` fields exist (no need for `biometric_people` numeric).
- DPO logic: `dpo = true` if `reg` OR `report` OR (`sensitive_people >= 1000`).
- Other rules unchanged (report at 100,000 sensitive or when `biometric_100k == true` and `reg==false`; high level triggers unchanged).
Update v0.2.3 (High + Lone clarifications)
- High: add explicit trigger `sensitive_people >= 100000`.
- Lone: require `ppl < 10000` in addition to ethics=false, owners<=2, access<=2, and no transfer/directmail_biz.
- Registration: confirm threshold is `ppl >= 10000`.
Update v0.2.5 (Processor large org → DPO)
- If `processor_large_org == true`, set `dpo = true` (level unchanged beyond processor mid floor).
- If `processor_sensitive_org == true`, keep `level = high` and `dpo = true`.

