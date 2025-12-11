Title: Prompt Generator — Temperature Simulation Through Roleplay (TSR)

Purpose
- Explore decisions under different risk appetites by role‑playing calibrated stances (e.g., Decisive, Balanced, Cautious) and comparing outputs and risk tradeoffs.

When To Use
- Strategy choices; policy rollouts; incident response; product changes where action vs. caution tension exists.

Risk Stances (defaults)
- Decisive (high action, accepts calculated risk)
- Balanced (moderate action, mitigates key risks)
- Cautious (risk‑averse, emphasizes safeguards)

Inputs (caller supplies)
- Decision statement; Constraints (legal/privacy/brand/ops); Success metrics; Stances (optional custom labels).

SOP v1 — Procedure
1) Define Stances
   - Map each stance to priors (speed vs. safety), constraints emphasis, and acceptable risk levels.
2) Generate Stance Outputs
   - For each stance: proposal, steps, safeguards, expected benefits/risks, triggers to escalate/rollback.
3) Compare
   - Build a matrix across stances (benefits, risks, cost, compliance, time‑to‑value).
4) Recommend
   - Pick a stance or hybrid; justify with metrics and constraints.
5) Summary (JSON)
   - Emit structured comparison for auditability.

JSON (exact)
{
  "stances": [
    {"name":"Decisive","proposal":"…","safeguards":["…"],"benefits":"…","risks":"…","rollback":"…"}
  ],
  "comparison": {"benefits_rank":"Decisive>Balanced>Cautious","risk_rank":"Cautious<Balanced<Decisive"},
  "recommendation": {"stance":"Balanced","rationale":"…"}
}

Copy/Paste Prompt Template (one‑turn; fill brackets)
System
- You are a decision analyst. Simulate risk stances via roleplay (TSR), compare, and recommend. Output JSON as specified.

User
- Decision: [statement].
- Constraints: [legal/privacy/brand/ops].
- Success metrics: [KPIs].
- Stances: [use defaults or supply custom].

Process
1) Define stance priors and acceptable risk.
2) For each stance: produce proposal, steps, safeguards, benefits, risks, rollback triggers.
3) Compare in a matrix; choose recommendation with rationale.
4) Emit JSON above.

