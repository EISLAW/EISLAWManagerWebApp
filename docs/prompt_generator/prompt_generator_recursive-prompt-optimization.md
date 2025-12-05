Title: Prompt Generator — Recursive Prompt Optimization (RPO)

Purpose
- Maintain and continuously improve prompt quality across many executions by iteratively generating variants, testing against a rubric + test set, and selecting the best prompt version.
- Reduce manual QC while keeping outputs consistent, compliant, and performant (accuracy, format, latency/cost).

When To Use
- Batch generation (reports, emails, summaries), long‑lived assistants, CI for prompts, or any workflow where drift/regressions are costly.

Definitions
- RPO Loop: repeat (generate variants → evaluate → select → accept/stop).
- Prompt Version (vᵢ): a concrete prompt spec (system/role/context/constraints/steps/examples/output schema).
- Test Set: representative inputs (and expected signals) used to score variants; include a holdout for overfitting checks.
- Rubric: scoring rules (e.g., accuracy/compliance/format/conciseness/latency/cost) with weights and pass thresholds.
- Mutation Operator: a change to the prompt (ordering, specificity, role priming, examples, constraints, output schemas, instruction brevity).
- Acceptance Criteria: when a new version becomes “best” (e.g., composite score gain ≥ ε and no regression on critical metrics).
- Budget: limits (max variants/iteration, max iterations, token/time caps).

Inputs (caller supplies)
- Objective + success criteria (what the prompt must achieve).
- Constraints (compliance/privacy/brand/style/format; must‑include headings/JSON).
- Test set (N inputs) + holdout set (M inputs); seeds for reproducibility.
- Rubric (metrics + weights + pass thresholds); critical metrics that must not regress.
- Budget (max iters, max variants/iter, token/time caps); exploration vs exploitation ratio.
- Environment/tools context (APIs/features available) or “none”.

SOP v1 — Procedure
1) Bootstrap
   - Build Prompt v0 from the objective/constraints.
   - Freeze test set (T) + holdout (H); set random seed; record baseline metrics on v0.
2) Generate Variants (explore)
   - Create K variants using mutation operators, e.g.:
     - Constraint ordering; stronger specificity; role priming; examples (few‑shot vs minimal); output schema clarity; hallucination safeguards; brevity.
   - Ensure diversity; tag each variant with the applied mutations.
3) Evaluate
   - Run each variant on T; score per rubric (accuracy/compliance/format/conciseness/latency/cost) → composite score.
   - Penalize violations (hallucinations, format errors) and high latency/cost.
4) Select & Accept
   - Pick top variant(s). Run on holdout H to check generalization.
   - Accept if composite gain ≥ ε AND no regression on critical metrics; else keep v*.
5) Early Stop & Budget
   - Stop if: max iters reached OR improvement < ε for K rounds OR token/time cap exceeded.
6) Overfitting Guards
   - Maintain class balance; rotate holdout; compare failure patterns; keep a small adversarial slice.
7) Artifacts
   - Save best prompt v*; metrics table; changelog (diff vs previous); mutation history; seeds; environment info.

Defaults (override as needed)
- Weights: accuracy 0.5, compliance 0.25, format 0.15, latency/cost 0.10.
- Critical metrics: compliance, format (no regressions allowed).
- Budget (short): iters≤2, variants/iter≤4. Budget (deep): iters≤5, variants/iter≤8.
- ε (min improvement): short 1–2 pts (on 0–100 scale); deep 0.5–1 pt.

Privacy & Safety
- Use synthetic/test data; no real PII. Record seeds; sanitize logs before persistence.
- Honor jurisdiction/brand constraints in prompts and tests.

RPO Result JSON (emit at end of an RPO run)
{
  "seed": 1234,
  "budget": {"iters": 3, "variants_per_iter": 6, "token_cap": 150000},
  "rubric": {"weights": {"accuracy":0.5, "compliance":0.25, "format":0.15, "latency_cost":0.10}, "critical":["compliance","format"]},
  "baseline": {"version":"v0","score":72.4,"metrics":{"accuracy":0.71,"compliance":0.95,"format":0.92,"latency_cost":0.60}},
  "iterations": [
    {
      "iter": 1,
      "variants": [
        {"id":"v1a","mutations":["reordered_constraints","explicit_schema"],"score":78.1},
        {"id":"v1b","mutations":["role_priming","fewer_examples"],"score":75.0}
      ],
      "selected": "v1a",
      "holdout": {"score":77.5, "no_critical_regressions": true}
    }
  ],
  "best": {"version":"v1a","score":77.5},
  "changelog": [
    {"from":"v0","to":"v1a","diff":"constraints reordered; schema clarified; evidence required"}
  ],
  "stop_reason": "improvement_below_epsilon"
}

Modes
- Short: iters≤2, variants/iter≤4; test set size small; prioritize low‑cost mutations.
- Deep: iters≤5, variants/iter≤8; larger test/holdout; allow multiple mutation families per iter.

Copy/Paste Prompt Template (one‑turn; fill brackets)
System
- You are a prompt optimization engine. Run Recursive Prompt Optimization (RPO): generate prompt variants, evaluate against a rubric + test set, select the best, and emit RPO Result JSON. Follow all constraints and JSON exactly.

User
- Objective: [what the prompt must achieve].
- Constraints: [jurisdiction/privacy/brand/style/format; headings/JSON requirements].
- Environment/tools: [APIs/features] or “none”.
- Test set: [N representative inputs]; Holdout: [M inputs]; Random seed: [int].
- Rubric: weights {accuracy, compliance, format, latency/cost}; critical metrics; pass thresholds.
- Budget: {iters, variants/iter, token_cap}; ε (min improvement).

Process
1) Build Prompt v0 from Objective + Constraints; run baseline on Test set.
2) Generate diverse variants via mutation operators (ordering, specificity, role priming, examples, schemas, safeguards, brevity).
3) Evaluate each variant on Test set; compute scores; penalize violations + high latency/cost.
4) Select top; validate on Holdout; accept only if gain≥ε and no regression on critical metrics; else keep current best.
5) Early stop when Budget reached or improvement < ε; keep best prompt v*.
6) Emit RPO Result JSON exactly as specified (include seeds, weights, budget, iterations, best, changelog, stop_reason).

Adversarial summary (design decisions & mitigations)
- Prevent regressions on critical metrics; holdout validation; budget + ε; mutation diversity; logging artifacts; PII‑safe tests.

