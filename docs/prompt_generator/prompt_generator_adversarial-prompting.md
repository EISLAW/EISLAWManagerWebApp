Title: Prompt Generator — Adversarial Prompting (AP)

Purpose
- Stress‑test answers by simulating a strong adversary that actively searches for failures, edge cases, and hidden risks before finalizing.

When To Use
- High‑risk decisions; compliance/legal/privacy; security reviews; technical architectures; policies with tradeoffs.

Attack Classes
- factual (counter‑evidence), logical (contradictions), scope (missing requirement), constraint (legal/privacy/format), edge (abuse/edge inputs), scale (latency/cost/operational).

Inputs (caller supplies)
- Goal, Constraints, Domain assumptions.
- Risk framing: failure definition, severity scale, threat models (if any).
- Mode: short (top 5 attacks) | deep (top 12; allow 2nd pass for unresolved).

SOP v1 — Procedure
1) Initial Answer — best complete answer.
2) Adversarial Review — generate ranked attacks using the Attack classes; for each: id, class, relevance, severity, evidence (quote/constructed counterexample/source), proposed mitigation. Discard Low relevance.
3) Defender Revision — accept/reject/partial with rationale; note impact on conclusions (none/minor/material); apply mitigations. If any Critical unresolved issue remains, state “Final deferred — unresolved critical risk”.
4) Residual Risks — list remaining risks with severity/likelihood + note.
5) Summary (JSON) — emit the JSON below.

JSON (exact)
{
  "attacks": [
    {"id":"a1","class":"factual|logical|scope|constraint|edge|scale","relevance":"High|Med|Low","severity":"Critical|Major|Minor","evidence":"quote|constructed example|source","proposed_mitigation":"…"}
  ],
  "accepted": ["a1"],
  "rejected": ["a2"],
  "residual_risks": [{"id":"r1","severity":"Critical|Major|Minor","likelihood":"High|Med|Low","note":"…"}],
  "material_change": true|false
}

Modes
- short: cap to 5 attacks, still emit JSON and Residual Risks.
- deep: up to 12 attacks; optionally a second pass focusing on unresolved/material issues.

Copy/Paste Prompt Template (one‑turn; fill brackets)
System
- You are a rigorous analyst. Run an adversarial review on your own answer, then defend and revise. Follow the headings and JSON exactly.

User
- Task: [Goal + Constraints + Domain assumptions].
- Mode: [short|deep].

Process
- Initial Answer — provide your best complete answer.
- Adversarial Review — attacks across factual/logical/scope/constraint/edge/scale; each with id, relevance, severity, evidence, mitigation; discard Low relevance.
- Defender Revision — accept/reject/partial each attack; record impact (none/minor/material); apply changes. If unresolved Critical exists, state “Final deferred — unresolved critical risk”.
- Residual Risks — remaining risks with severity/likelihood.
- Summary (JSON) — emit the JSON object above.

