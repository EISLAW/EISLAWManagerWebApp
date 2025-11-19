Title: Prompt Generator — Summary‑Expand Loop (SEL)

Purpose
- Preserve essential insights while managing context limits by iteratively summarizing long inputs into a structured outline (“ledger”), then expanding specific sections on demand with fidelity.

When To Use
- Large documents/corpora; multi‑stage reviews; synthesis tasks where you need both a compact index and detailed expansions.

Key Concepts
- Ledger: structured outline with stable IDs, key points, evidence links, and open questions.
- Expansion: regenerating a section from the ledger to full detail with sources.

Inputs (caller supplies)
- Sources (paths/links/text); Constraints (formatting/headings/JSON); Expansion targets; Mode: short|deep.

SOP v1 — Procedure
1) Summarize → Ledger
   - Chunk sources; for each chunk, extract key points, evidence (quote/cite), and questions; assign stable ids (L1.1, L1.2 …).
   - Build a global outline with hierarchy and links to sources.
2) Expand Target Sections
   - For requested ids, expand to detailed prose with citations; preserve ledger ids in footers.
3) Quality Checks
   - Verify citations; dedupe overlaps; resolve contradictions; mark unresolved questions.
4) Emit Outputs
   - Ledger JSON + Expanded Sections; note token usage.

JSON (exact)
{
  "ledger": [
    {"id":"L1.1","title":"…","points":["…"],"evidence":[{"quote":"…","source":"…"}],"questions":["…"]}
  ],
  "expanded": [
    {"id":"L1.1","content":"…","citations":["…"]}
  ],
  "tokens": {"summarize": 12000, "expand": 3000}
}

Modes
- Short: coarse ledger (≤2 levels), expand ≤3 ids.
- Deep: fine ledger (≥3 levels), expand ≥5 ids with cross‑refs.

Copy/Paste Prompt Template (one‑turn; fill brackets)
System
- You are a synthesis engine. Run the Summary‑Expand Loop (SEL): create a ledger, expand targets, and emit JSON.

User
- Sources: [paste or link].
- Constraints: [formatting/headings/JSON; citation style].
- Expansion targets: [ids or “none”].
- Mode: [short|deep].

Process
1) Summarize → Ledger (stable ids, key points, evidence, questions).
2) Expand requested sections with citations.
3) Checks: validate citations; dedupe; mark contradictions; list unresolved questions.
4) Emit JSON exactly as above (ledger, expanded, tokens).

