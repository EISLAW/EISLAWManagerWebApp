Title: Prompt Generator — Deliberate Over‑Instruction (DOI)

Purpose
- Preserve critical‑thinking details that compressed prompts/summaries lose by deliberately specifying objectives, constraints, steps, evidence rules, and quality gates at high granularity.
- Reduce ambiguity and drift; make outputs consistent and auditable across long or complex tasks.

When To Use
- Multi‑stage analysis; compliance/legal/privacy/security work; long documents; complex transformations; any case where omissions or ambiguity create risk.

Key Concepts & Definitions
- Over‑Instruction: intentionally explicit, layered guidance that removes ambiguity (objective → constraints → steps → checks → outputs).
- Instruction Layers: Objective, Glossary/Definitions, Constraints/Rules, Decomposition (steps), Evidence & Sources, Quality Gates, Output Schema, Safety/Privacy.
- Granularity (g): 1–5 level controlling verbosity/detail (default g=4). Higher g means more enumeration (variables, cases, sub‑steps, examples).
- Checkpoint: a required intermediate artifact (plan, outline, table, calc) that precedes the final output.

Inputs (caller supplies)
- Objective (what success looks like, explicit deliverables).
- Constraints (audience, jurisdiction, privacy/safety/brand/style, length/token/time caps, formatting/headings/JSON).
- Glossary/Definitions (domain terms that must be used consistently) or “none”.
- Required Checkpoints (plan/outline/table/tests) with order.
- Evidence Rule (citations, quotes, calculations; allowed sources).
- Quality Gates (validation the model must perform before finalizing).
- Granularity g (1–5; default 4).

SOP v1 — Procedure
1) Expand Objective
   - Rewrite the objective into explicit success criteria and acceptance tests.
   - Enumerate variables/inputs/assumptions. List unknowns; if blocking, ask once or proceed with clearly labeled defaults.
2) Build the Instruction Spec (layers)
   - System/Role: who the model is; style/tone; compliance posture.
   - Context & Glossary: inject definitions and domain notes to avoid synonym drift.
   - Constraints & Rules: bullets for jurisdiction/privacy/brand/style/format/length/token caps.
   - Decomposition (Steps 1..N): for each step specify preconditions, action, required intermediate output, and stop condition.
   - Evidence & Sources: what must be quoted, calculated, or cited; what is disallowed.
   - Quality Gates: specific checks (consistency, constraint adherence, numeric validation, link working, schema validation).
   - Output Schema: exact headings and/or JSON shape for machine use.
   - Safety & Privacy: PII handling, redaction rules, refusal criteria.
3) Execute with Checkpoints
   - Produce each checkpoint in order (Plan → Outline → …). If a required checkpoint fails a gate, fix before moving on.
4) Self‑Check & Finalize
   - Run quality gates; list fixes applied. If any Critical gate fails and cannot be fixed, emit “Final deferred — unresolved gate failure”.
5) Emit Deliverables
   - Final Output (fully formatted)
   - Summary (JSON) with assumptions, unknowns, gates, and granularity.

Defaults & Guardrails
- Always emit all required headings/JSON, even if empty arrays.
- Under token pressure, compress narrative prose first; never remove Output Schema or Summary JSON.
- Ask clarifying questions once (single block). If unanswered, proceed with explicit defaults and risk notes.

Summary JSON (exact)
{
  "assumptions": ["…"],
  "unknowns": ["…"],
  "gates": [
    {"gate":"schema_valid","result":true,"notes":"…"},
    {"gate":"privacy_check","result":true,"notes":"…"}
  ],
  "granularity": 4,
  "material_deviation": true|false
}

Modes
- Short: g=3; ≤2 checkpoints; minimal examples; same Summary JSON.
- Deep: g=5; ≥3 checkpoints; include small example/table/tests per step; stricter gates.

Copy/Paste Prompt Template (one‑turn; fill brackets)
System
- You are a careful analyst. Apply Deliberate Over‑Instruction (DOI): build layered instructions, execute checkpoints, run quality gates, and emit a final output + JSON summary.

User
- Objective: [exact deliverable].
- Constraints: [audience, jurisdiction, privacy/safety/brand/style, length/token caps, formatting/headings/JSON].
- Glossary/Definitions: [terms] or "none".
- Checkpoints (in order): [e.g., Plan, Outline, Table of Inputs, Draft, QC].
- Evidence Rule: [citations, quotes, calculations; allowed sources].
- Quality Gates: [schema_valid, privacy_check, constraints_ok, numeric_consistency, links_ok …].
- Granularity g: [1–5 (default 4)].

Process
1) Expand Objective → success criteria, acceptance tests; list variables, assumptions, unknowns. Ask one block of clarifying questions if needed; else set defaults with risk notes.
2) Instruction Spec → System/Role; Context & Glossary; Constraints; Steps 1..N (with preconditions/output/stop); Evidence & Sources; Quality Gates; Output Schema; Safety & Privacy.
3) Execute Checkpoints in order. If a gate fails, fix and re‑check before continuing.
4) Finalize → run all gates; if any Critical gate unresolved, state “Final deferred — unresolved gate failure”.
5) Emit Final Output (formatted) and Summary (JSON) exactly as specified above.

Adversarial Notes (design decisions & mitigations)
- Removes ambiguity through layered spec + checkpoints; prevents schema drift via gates; compresses only prose under token pressure; single‑shot questions to avoid loops.

