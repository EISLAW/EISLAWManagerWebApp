Title: Prompt Generator — Reference Class Priming (RCP)

Purpose
- Calibrate the model to match a target “quality bar” by showing exemplars of reasoning quality, structure, and format — not just answers. The model matches the bar across tasks from the same reference class.

When To Use
- Need consistent quality/format across a collection (reports, memos, legal notes, reviews) or when onboarding a new model/team to a house style.

Definitions
- Reference Class: a set of tasks sharing quality/format expectations (e.g., EISLAW privacy notes).
- Exemplars: short excerpts showing reasoning depth, evidence handling, headings, tone.
- Quality Bar: explicit rubric derived from exemplars (depth, evidence, structure, tone, formatting).

Inputs (caller supplies)
- Objective; Constraints (audience, jurisdiction, style, headings/JSON).
- Exemplars (3–7 short excerpts) + notes on what makes them good.
- Rubric (weights + pass thresholds) and “must‑have” elements.

SOP v1 — Procedure
1) Extract Quality Signals
   - From each exemplar, list: structure cues (headings), evidence handling, tone, reasoning depth, citation style, formatting.
   - Synthesize the Quality Bar rubric with weighted criteria and pass thresholds.
2) Build Prompt Spec
   - System/Role; Context; Constraints; Output Schema aligned with the Quality Bar.
   - “Do like this” list of signals; “Do not” list (anti‑patterns).
3) Apply to Task
   - Generate output; self‑score against the rubric; if below threshold on any critical criterion, revise once.
4) Emit Summary JSON
   - Include which exemplars/signals were used and the final rubric scores.

JSON (exact)
{
  "exemplars_used": ["ex1","ex2","ex3"],
  "signals": ["headings:H3/H4","evidence:quote+cite","tone:formal"],
  "rubric": {"weights":{"depth":0.4,"evidence":0.3,"structure":0.2,"tone":0.1},"thresholds":{"depth":0.7,"evidence":0.8}},
  "scores": {"depth":0.74,"evidence":0.86,"structure":0.88,"tone":0.92},
  "passed": true
}

Copy/Paste Prompt Template (one‑turn; fill brackets)
System
- You are an expert writer. Match the reference class quality bar derived from the exemplars. Follow the rubric and output schema exactly.

User
- Objective: [task].
- Constraints: [audience, jurisdiction, style, headings/JSON].
- Exemplars: [paste 3–7 brief excerpts].
- Rubric weights/thresholds: [json].

Process
1) Extract signals → list “do like this” and “do not” items.
2) Build Prompt Spec → System, Context, Constraints, Output Schema, Signals, Anti‑patterns.
3) Generate output → self‑score via rubric → if any critical threshold not met, revise once.
4) Summary (JSON) — emit the JSON above (exemplars_used, signals, rubric, scores, passed).

