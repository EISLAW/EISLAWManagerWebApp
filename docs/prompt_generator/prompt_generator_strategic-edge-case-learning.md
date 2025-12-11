Title: Prompt Generator — Strategic Edge Case Learning (SECL)

Purpose
- Systematically discover and probe decision boundaries by generating boundary‑focused scenarios, evaluating outcomes, and tightening where failures occur.
- Reduce gray‑area errors and expose hidden risks before deployment.

When To Use
- Ambiguous correctness, complex policies, safety/privacy/security review, fairness/compliance checks, product eligibility rules, threshold logic, algorithmic boundaries.

Definitions
- Edge Case: scenario near/beyond intended operating boundaries, likely to cause failure/uncertainty.
- Decision Boundary: threshold/rule separating outputs (e.g., approve/deny; lone/basic/mid/high).
- Scenario Class: family of scenarios defined by parameters.
- Oracle/Proxy: ground‑truth rule (or high‑quality approximation) to judge correctness.
- Evaluation Rule: pass/fail/uncertain rubric applied to each scenario.

Inputs (caller supplies)
- Goal (what logic/decision to stress‑test).
- Constraints (audience, jurisdiction, privacy/safety, formatting).
- Domain assumptions (explicit assumptions affecting answers).
- Risk criteria (what counts as material failure: legal, safety, privacy, fairness).
- Boundary hypotheses (where failures might occur).
- Parameterization (scenario parameters + ranges).
- Seed examples (representative + borderline cases).
- Stop criteria (min coverage %, max failure/uncertain %, max tokens).
- Token budget (cap by mode) and Random seed (reproducible sampling).

Scenario Generation Plan
- Class coverage: enumerate scenario classes; ensure balance; include negative controls.
- Boundary hypotheses: identify parameters near thresholds per class.
- Perturbations:
  - Grid: sweep parameters around hypotheses (± deltas).
  - Mutation: perturb inputs to create plausible near‑misses.
  - Counterfactual: minimal edits to cross boundary (trace original_id + delta).
  - OOD: include a small set of out‑of‑distribution stressors.
- Balance & controls: per‑class quotas; include benign scenarios to detect over‑triggering.

Evaluation & Confidence
- Oracle/proxy rules produce pass/fail/uncertain with justification.
- Confidence score per scenario with evidence (quote, calculation, or source).
- “Uncertain” is first‑class; escalates if critical.

Metrics & Stop Rules (defaults; override via inputs)
- Defaults: coverage_target = 0.80; edge_density_target ≥ 0.50; fail_rate_alert ≥ 0.10; uncertain_rate_alert ≥ 0.10.
- Coverage: % classes tested; # scenarios per class; edge density (# near boundary / total).
- Outcomes: fail rate; uncertain rate; confusion patterns; top failure modes.
- Stop: when coverage ≥ target OR max tokens hit OR failures exceed threshold (or other stop conditions) — else escalate for input.

Privacy & Safety
- PII minimization in scenarios; use synthetic placeholders.
- Jurisdiction flags per scenario; avoid unsafe instructions.
- PII lint: reject any scenario containing real PII; report pii_rejected_count.

SECL Result JSON (emit at end of a run)
{
  "seed": 1234,
  "boundary_hypotheses": ["…"],
  "scenario_classes": [{"name":"ClassA","quota":10},{"name":"ClassB","quota":10}],
  "sampling_table": [{"class":"ClassA","quota":10,"generated":10}],
  "scenarios": [
    {
      "id":"s1",
      "class":"ClassA",
      "input":"(synthetic/redacted)",
      "parameters":{"p1":0.49,"p2":true},
      "expected":"deny",
      "oracle":"rule-13-sec17",
      "outcome":"pass|fail|uncertain",
      "confidence":0.78,
      "evidence":"quote|calc|source",
      "notes":"…",
      "is_boundary": true,
      "is_counterfactual": false
    }
  ],
  "counterfactual_links": [{"id":"s7","original_id":"s3","delta":"p1:+0.02"}],
  "coverage":{"classes_tested":2,"edge_density":0.6,"fail_rate":0.15,"uncertain_rate":0.10},
  "top_fail_modes":["…"],
  "pii_rejected_count": 0,
  "fairness_note": "(if applicable)",
  "stop_conditions_met": true
}

Modes
- Short: ≤ 4 classes; ≤ 12 scenarios; top failures only; still emit full SECL Result JSON.
- Deep: ≤ 8 classes; ≤ 48 scenarios; allow 2 perturbation passes; still emit full SECL Result JSON.

Copy/Paste Prompt Template (one‑turn; fill brackets)
System
- You are a rigorous analyst. Run Strategic Edge Case Learning (SECL) to probe decision boundaries and report structured results. Follow all formatting and JSON rules exactly.

User
- Goal: [what logic/decision to stress‑test].
- Constraints: [audience, jurisdiction, privacy/safety, formatting].
- Domain assumptions: [key assumptions].
- Boundary hypotheses: [where failures may occur].
- Parameterization: [parameters and ranges].
- Seed examples (optional): [few seeds].
- Stop criteria: [min coverage %, max failures %, max uncertain %, max tokens].
- Mode: [short|deep]; Random seed: [int].
- Process
  - Generate scenario classes and balanced quotas with negative controls.
  - For each class, create boundary‑focused scenarios via grid, mutations, counterfactuals (record original_id + delta), and a small OOD sample.
  - Evaluate each scenario with oracle/proxy: outcome pass/fail/uncertain, confidence, evidence.
  - Compute coverage + failure metrics; apply stop rules; highlight top failure modes.
  - Emit SECL Result JSON exactly as specified. Do not include PII; use synthetic content. Include sampling_table and pii_rejected_count.
- Output
  - Sections: “SECL Run — Scenarios & Evaluation”, “Metrics & Coverage”, “Top Failure Modes”, “SECL Result JSON”.

Adversarial summary (design decisions & mitigations)
- Set metrics defaults and explicit mode caps.
- Enforce class balance via per‑class quotas and sampling_table.
- Add PII‑lint rejection count; fairness note when relevant.
- Define minimal‑edit counterfactual rule and links.

