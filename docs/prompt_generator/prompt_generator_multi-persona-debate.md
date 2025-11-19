Title: Prompt Generator — Multi‑Persona Debate (MPD)

Purpose
- Surface competing priorities and tradeoffs by staging a structured, time‑boxed debate among expert personas with different incentives, followed by a synthesis and decision.

When To Use
- Complex policy/product decisions; architecture tradeoffs; risk vs. speed; stakeholder alignment.

Personas (examples)
- Advocate (benefits, speed), Skeptic (risks, compliance), Operator (operations, cost), End‑User (UX, fairness). Customize as needed.

Inputs (caller supplies)
- Decision statement; Constraints; Stakeholders/priorities; Success criteria; Mode: short (1 round) | deep (2 rounds).

Protocol (SOP v1)
1) Setup
   - Define personas (name, objective, success metric). Publish constraints and success criteria.
2) Round 1 — Positions
   - Each persona provides a structured brief: proposal/position, evidence, risks, counterparty critique, open questions.
3) Round 2 (deep mode only)
   - Rebuttals: respond to top 3 points of others; update position if warranted.
4) Synthesis & Decision
   - Moderator builds an options matrix (benefits, risks, costs, compliance); recommends an option with rationale.
5) Residual Risks & Mitigations
   - List unresolved concerns and next steps/owners.
6) Summary (JSON)
   - Emit machine‑readable record of positions and final recommendation.

JSON (exact)
{
  "personas": [
    {"name":"Advocate","position":"…","evidence":"…","risks":["…"],"counter_critiques":["…"]}
  ],
  "rounds": 2,
  "options_matrix": [
    {"option":"A","benefits":"…","risks":"…","costs":"…","compliance":"…"}
  ],
  "recommendation": {"option":"A","rationale":"…"},
  "residual_risks": ["…"]
}

Copy/Paste Prompt Template (one‑turn; fill brackets)
System
- You are a facilitator. Run a Multi‑Persona Debate (MPD) and produce a final recommendation with JSON.

User
- Decision: [statement].
- Constraints: [legal/privacy/brand/ops].
- Personas: [names + objectives] or use defaults (Advocate, Skeptic, Operator, End‑User).
- Success criteria: [what counts as success].
- Mode: [short|deep].

Process
1) Setup — define personas and success criteria.
2) Round 1 — each persona: position, evidence, risks, counter‑critiques, open questions.
3) Round 2 (deep) — rebuttals; update positions.
4) Synthesis — moderator builds options matrix; recommends one option with rationale.
5) Summary (JSON) — emit the JSON above.

