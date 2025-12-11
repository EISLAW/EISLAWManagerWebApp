Title: Prompt Generator — Chain‑of‑Verification (CoVe)

Purpose
- Reduce hallucinations and reasoning errors by forcing the model to self‑verify before finalizing.
- One turn contains two internal phases: Produce → Verify → Revise.

When To Use
- High‑stakes outputs: legal/privacy review, compliance, finance, security, code correctness, decision memos.

Definitions
- Evidence: a quote from the Draft, a calculation shown, or a cited source/URL.
- Severity:
  - Critical: misleads decisions or violates hard constraints.
  - Major: substantial quality/coverage issue; fix recommended.
  - Minor: cosmetic or style; does not change conclusions.

Inputs (caller must provide)
- Goal (precise task).
- Constraints (audience, scope, jurisdiction, formatting, tone).
- Must‑include sections (e.g., headings, tables).
- Sources rule (what must be cited or proven; allow “assumed” if none).
- Mode: short‑verification (top 5 issues) or deep‑verification (no cap).
- Optional domain checklist (legal/privacy | code | finance …).

Mandatory Output Headings (exact)
- Draft Answer
- Verification
- Final Answer
- Summary (JSON)

JSON Schema (exact)
{
  "issues":[{"id":"i1","category":"factual|logical|scope|constraint","severity":"Critical|Major|Minor"}],
  "assumptions":["…"],
  "unknowns":["…"],
  "material_change": true|false
}

SOP v1.2 — Procedure (model must follow)
1) Draft Answer: provide the best solution.
2) Verification:
   - Check for: factual errors, logical errors, scope/completeness gaps, constraint violations.
   - For each issue, list: id, category, where (quote/section ref), evidence, severity, fix.
   - If no issues: explicitly state “No material issues found (N/A)” with rationale.
   - List assumptions and unknowns (what info would change the answer).
   - If any Critical unknown blocks a safe answer: state “Final Answer deferred — need input” and stop before Step 3.
3) Final Answer (Revised): apply fixes; re‑render the full corrected output; add “Changes Applied” noting whether the outcome changed materially.
4) Summary (JSON): emit the JSON object exactly as specified (even when empty/no issues).

Modes
- short‑verification: list top 5 issues by severity (still emit JSON, assumptions, unknowns).
- deep‑verification: no cap; rank by severity/impact.

Domain Checklists (optional add‑on)
- Legal/privacy: define terms; cite authority; jurisdiction fit; data classification; risk ranking.
- Code: inputs/outputs; algorithm correctness; edge cases/tests; complexity; security.
- Finance: labeled assumptions; time frames; reconciliation; sensitivity; sources.

Copy/Paste Prompt Template (fill brackets)
System
- You are a precise analyst. You must self‑verify your work before finalizing. Obey all constraints and formatting exactly.

User
- Task
  - Goal: [exact goal].
  - Constraints: [audience, scope, jurisdiction, style, format].
  - Must include: [sections/tables].
  - Sources: [rules; if none, mark “assumed” and explain risk].
  - Mode: [short‑verification|deep‑verification].
  - Domain checklist: [optional items].
- Produce → Verify → Revise (follow SOP v1.2 strictly)
  1) Draft Answer — your best answer.
  2) Verification — find issues (factual/logical/scope/constraint). For each issue: id, category, where, evidence, severity, fix. If none, say “No material issues found (N/A)” with rationale. List assumptions and unknowns. If any Critical unknown blocks a safe answer, stop and state “Final Answer deferred — need input”.
  3) Final Answer — revised full answer; include “Changes Applied”.
  4) Summary (JSON) — emit the JSON object exactly as specified.

Notes
- Always print all four headings in this order.
- Never omit the JSON summary; use empty arrays when none.
- If token pressure occurs, compress Draft Answer first; do not compress Verification structure or JSON.

