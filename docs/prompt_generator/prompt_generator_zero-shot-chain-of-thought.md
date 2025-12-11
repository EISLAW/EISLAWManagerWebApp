Title: Prompt Generator — Zero‑Shot Chain‑of‑Thought Through Structure (ZS‑CoT)

Purpose
- Elicit reliable, debuggable reasoning without free‑form “think‑aloud” text by enforcing a structured reasoning trace (steps, evidence, checks) and a concise, auditable output.
- Make it obvious which reasoning step failed in quantitative or logical tasks.

When To Use
- Math/logic/quant tasks, policy/criteria evaluations, data extraction→rules→decision, multi‑step transformations, and debugging analyses where pinpointing the failing step matters.

Key Concepts & Definitions
- Step: a named, atomic reasoning unit (e.g., Extract Known Values; Choose Formula; Substitute; Compute; Check Units; Sanity Check; Conclude).
- Rationale (concise): a one‑sentence justification per step (no long chain‑of‑thought prose).
- Evidence: quote, number, formula, or rule reference used by the step.
- Status: pass | fail | uncertain for each step; failing step must state cause.
- Tolerance / Rounding: numeric settings for equality checks (e.g., ±1e‑6; round half‑up to 2 dp) and unit conversions.

Inputs (caller supplies)
- Problem statement.
- Data/Constraints: units, allowed formulas/assumptions, rounding/tolerance, domain rules (jurisdiction/privacy), formatting (headings/JSON).
- Detail level: short (coarse steps) | deep (fine‑grained steps).
- Expected output schema (exact headings and/or JSON), including any required units.

SOP v1 — Procedure
1) Define Structure
   - Select a step template appropriate to task type:
     - Numeric/Engineering: Extract Known Values → Select Formula(s) → Substitute → Compute → Unit Check → Sanity Check (bounds/approximation) → Conclude.
     - Logic/Textual: Extract Claims/Facts → Link Evidence → Apply Rule/Test → Consider Counterexample → Resolve → Conclude.
   - Declare tolerances, rounding, and unit conversions up front.
2) Execute Steps (Structured Trace)
   - For each step i: produce {id, name, inputs, operation, result, status, rationale (≤1 sentence), evidence}.
   - Mark fail/uncertain when applicable; include cause and next action (fix/stop/escalate).
3) Detect & Handle Failures
   - If any step fails and cannot be fixed with available data, stop and emit “Final deferred — unresolved step failure” with failed_steps list.
4) Finalize
   - Produce the requested Final Answer in the specified schema (with correct units/format).
   - Emit a Reasoning Trace JSON (schema below) for auditability.

Defaults & Guardrails
- Do not output long free‑form chain‑of‑thought. Use 1‑sentence rationales plus structured fields.
- Under token pressure, compress narrative first; never drop required JSON or headings.
- Numeric: default tolerance = 1e‑6; rounding = half‑up 2 dp unless overridden; show intermediate numbers.
- Unit/locale: be explicit (e.g., N·m, kg, dd.mm.yy vs mm/dd/yy) and convert once.

Reasoning Trace JSON (exact)
{
  "steps": [
    {
      "id": "s1",
      "name": "Extract Known Values",
      "inputs": {"given": ["…"]},
      "operation": "parse",
      "result": {"values": {"m": 5.2, "t": 3}},
      "status": "pass",
      "evidence": "quoted numbers or table",
      "rationale": "Parsed m and t from the problem statement."
    }
  ],
  "failed_steps": ["s3"],
  "tolerance": 1e-6,
  "rounding": {"mode": "half_up", "dp": 2},
  "unit_system": "SI",
  "final_answer": {"value": 12.34, "unit": "kg"},
  "confidence": 0.82
}

Modes
- Short: 4–6 steps; minimal fields per step; still emit JSON; show top‑1 sanity check.
- Deep: 7–12 steps; include alternate check (independent method) and counterexample test; detailed intermediate values.

Copy/Paste Prompt Template (one‑turn; fill brackets)
System
- You are a precise reasoner. Apply Zero‑Shot Chain‑of‑Thought Through Structure (ZS‑CoT): execute the task via named steps with concise rationales and emit a Reasoning Trace JSON. Do not print long chain‑of‑thought prose.

User
- Problem: [exact statement].
- Data/Constraints: [units, allowed formulas/assumptions, rounding/tolerance, domain rules, formatting/headings/JSON].
- Detail level: [short|deep].
- Required Output Schema: [Final Answer headings/JSON with units].

Process
1) Define Structure — choose an appropriate step template (numeric or textual). Declare tolerance/rounding/units.
2) Execute Steps — for each step, output: id, name, inputs, operation, result, status, evidence, 1‑sentence rationale.
3) Failure Handling — if a step fails and cannot be fixed safely, stop and state “Final deferred — unresolved step failure”; include failed_steps.
4) Finalize — deliver Final Answer in the requested schema and the Reasoning Trace JSON exactly as specified.

Headings (print exactly)
- Final Answer
- Reasoning Trace (JSON)

— Review Pass 1 (Gaps & Fixes) —
- Numeric rigor: add explicit tolerance/rounding defaults and require intermediate values (fixed above). Add explicit unit conversion rule.
- Step fidelity: require 1‑sentence rationale to avoid long CoT; force evidence field to prevent hand‑waving.
- Failure clarity: add explicit “Final deferred” rule when unresolved.

— Review Pass 2 (Harder Cases) —
- Multi‑branch logic: in deep mode, add “alternate check” step to cross‑validate results (e.g., different formula or independent method).
- Locale & date/time: require explicit locale and unit system; avoid silent conversions; note in JSON.
- Determinism: require a stable step id order and unique ids to support diffing.

