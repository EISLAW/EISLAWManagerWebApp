Title: Prompt Generator — Reverse Prompting (RP)

Purpose
- Make the model do the prompting work: elicit missing requirements, construct an optimal prompt specification (system/role/context/constraints/steps/output schema/examples/tests), verify it adversarially, and deliver a ready copy/paste prompt.

When To Use
- Ambiguous tasks; new domains; standardizing prompts across teams; onboarding a new model/tool; reducing back‑and‑forth by collecting constraints up front.

Definitions
- Elicitation Round: a bounded set of clarifying questions to identify gaps (requirements, constraints, data, success criteria).
- Prompt Spec: the final structured prompt (System, Role, Context, Constraints, Process, Output Schema, Safeguards, Examples, Test cases).
- Tools Context: capabilities and limits (APIs, retrieval, code execution) available to the receiving model.
- Dry Run: applying the prompt to a small set of test cases to validate usefulness.

Inputs (caller supplies)
- Objective (what success looks like).
- Audience + style (tone, language, formatting).
- Constraints (jurisdiction/privacy/safety/brand rules; length/time/token budgets).
- Environment/tools (what the model can use/assume).
- Context sources (links/paths) or “none”.
- Must‑include sections/outputs (tables, JSON, headings).

Procedure (SOP v1)
1) Elicitation & Gaps (bounded)
   - List unknowns as bullets.
   - Ask up to N (default 5 short) questions in a single “Questions for user” block.
   - If user won’t answer, propose defaults with risk notes and proceed.
2) Prompt Draft v0
   - Build the Prompt Spec with sections:
     - System/Role
     - Context injection (how to use supplied sources)
     - Constraints (jurisdiction/privacy/brand/style/length)
     - Process/Steps (what the model should do)
     - Output Schema (exact headings/JSON)
     - Safeguards (hallucination handling, evidence requirements)
     - Tools Context (APIs/features to assume)
     - Examples (few‑shot) + Test Cases (min 3)
3) Adversarial Review (self‑check)
   - Attack classes: ambiguity, constraint misfit, tool mismatch, test coverage gaps, hallucination risk, token budget.
   - For each: id, class, relevance, severity, evidence (quote/constructed example), proposed mitigation.
4) Revised Prompt v1 (Defender Revision)
   - Accept/reject each attack with rationale; update Prompt Spec (trace attack_id → mitigations → section).
5) Dry Run (optional)
   - Apply Prompt v1 to the Test Cases; report quick results + issues.
6) Summary (JSON)
   - Emit machine‑readable summary with unknowns, decisions, tests, and material change flag.

Modes
- Short: at most 5 questions; 1 example; 3 test cases.
- Deep: up to 10 questions; 2–3 examples; 6–10 test cases; optional Dry Run.

JSON — Adversarial Summary (emit at the end of generation)
{
  "attacks": [
    {"id":"a1","class":"ambiguity|constraint|tools|coverage|hallucination|scale","relevance":"High|Med|Low","severity":"Critical|Major|Minor","evidence":"quote|constructed example","proposed_mitigation":"…"}
  ],
  "accepted":["a1"],
  "rejected":["a2"],
  "unknowns":["…"],
  "decisions":{"defaults": ["…"], "caps":{"questions":5,"tests":3}},
  "material_change": true|false
}

Copy/Paste Prompt Template (one‑turn; fill brackets)
System
- You are a prompt engineer. Build an optimal, self‑contained prompt for the user’s objective. Elicit gaps (bounded), create Prompt Draft v0, adversarially review, revise to Prompt v1, then output a JSON summary.

User
- Objective: [exact objective].
- Audience/style: [tone, language, formatting].
- Constraints: [jurisdiction/privacy/brand/length/token].
- Tools/Environment: [APIs/features available] or “none”.
- Context sources: [links/paths] or “none”.
- Must‑include outputs: [headings/JSON/tables].
- Mode: [short|deep]; Max questions: [5|10].

Process
1) Elicitation & Gaps — list unknowns; ask up to Max questions in one block. If unanswered, set defaults with risk notes.
2) Prompt Draft v0 — include System, Context, Constraints, Steps, Output Schema, Safeguards, Tools, Examples, Test Cases.
3) Adversarial Review — attacks across ambiguity/constraint/tools/coverage/hallucination/scale.
4) Revised Prompt v1 — apply mitigations; show what changed.
5) Summary (JSON) — emit the JSON above with unknowns, decisions, caps, and material_change.

Notes
- Never loop questions; ask once. Proceed with defaults if unanswered.
- Compress examples first under token pressure; never drop Summary JSON.

