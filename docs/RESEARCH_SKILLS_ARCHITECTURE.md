# Claude Skills Architecture Research

**Author:** David  
**Date:** 2025-12-12  
**Status:** Draft for CEO Review

## Executive Summary
- EISLAW’s knowledge is fragmented across CLAUDE.md (identity + process), episodic logs, PRDs/specs, and tribal memory. Procedural “how-to” guidance (VM boot, monitoring tunnels, testing discipline, TEAM_INBOX etiquette) is repeated in multiple places and should be codified as Skills, leaving CLAUDE.md focused on identity, guardrails, and invariants.  
- A lean Skills taxonomy with four tiers—core (safety/identity-adjacent runbooks), quality gates, automation, and domain—keeps discoverability high while isolating external/marketplace Skills (Anthropic DOCX/PDF/XLSX, Superpowers library).  
- Self-learning is feasible via append-only memory Skills (updating episodic log, adding ADRs) and feedback loops, but auto-editing Skill manifests should stay human-gated (PR + tests) to avoid drift.  
- Anthropic document Skills are the highest-ROI install (DOCX/PDF/XLSX). The `plugin` CLI is not present on this machine; installation is blocked until the Claude Code plugin runner is installed (`/plugin marketplace add anthropics/skills`).  
- UX/marketing Skills are sparse in marketplaces; we should author custom RTL/accessibility/marketing Skills backed by existing specs (UX_UI_Spec, BRAND_GUIDE, PRIVACY PRDs) and WCAG/NNG heuristics.

## 1. Current State Analysis
- **Documentation reviewed:** CLAUDE.md; docs/Testing_Episodic_Log.md; docs/WORKING_MEMORY.md; docs/TEAM_INBOX.md; docs/API_ENDPOINTS_INVENTORY.md; docs/DATA_STORES.md; docs/CLIENTS_FEATURES_SPEC.md; docs/EISLAW_System_Feature_Spec.md; docs/INDEX.md; BRAND_GUIDE + UX_UI_Spec (skim); various PRDs (Privacy QA/Purchase, Clients UX sprint references); DOCUMENTATION_BIBLE.md is referenced but **missing** (not found in repo).  
- **Knowledge distribution:**  
  - CLAUDE.md mixes identity/guardrails with procedural runbooks (VM access, monitoring tunnels, planning/execution loops, self-healing, testing discipline, spawn templates).  
  - Episodic log captures regressions and fixes (chat integration reliability, RAG regressions, Hebrew encoding issues).  
  - PRDs/specs document product behavior (Clients, Privacy, RAG, Email, MkDocs wiki) but are not discoverable through a consistent index.  
  - TEAM_INBOX is the live coordination surface; WORKING_MEMORY captures sprint snapshot.  
- **Pain points:** CEO cognitive load, duplicated instructions, missing Documentation Bible, brittle recall of “how to test/post/update” steps, no codified Skills to drive automation or memory upkeep.

## 2. Skills vs CLAUDE.md Mapping
| CLAUDE.md Section | Type | Recommendation | Rationale |
| --- | --- | --- | --- |
| 1. Identity & Mission; 2. Bounded Creativity; 3. Outcome-Driven Autonomy; 6. Autonomy & System-Wide Thinking; 7. Consistency/Output Rules; 8. Persona Modes; 11. Secrets | Identity/guardrails | **Keep in CLAUDE.md** | Defines agent character, safety, and immutable rules. |
| 1D Azure VM Development Environment; VM commands; hot-reload workflow | Procedural | **Skill: `core/vm-connect-and-hot-reload`** | Repeatable steps to connect/start services; reduces context sprawl. |
| 1E Monitoring Stack (tunnels to Grafana/Prometheus); credentials lookup | Procedural | **Skill: `core/monitoring-tunnel`** | Automates tunnel commands and credential retrieval. |
| 1F Virtual Team & Communication (TEAM_INBOX rules, status codes, task doc pattern) | Procedural | **Skill: `core/team-inbox-update`** | Ensures start/completion posts and templates are applied correctly. |
| 4 Unified Execution Alignment Loop; 13 Planning/Execution boundary | Workflow | **Skill: `core/write-plan-and-verify`** | Template for planning vs execution with checkpoints. |
| 10 Tools & MCP Behavior | Reference | **Keep + short Skill link** | Keep canonical in CLAUDE.md; add Skill pointer for MCP discovery commands. |
| 12 Memory Architecture (working/episodic/semantic); integrity rules | Procedural | **Skill: `memory/episodic-log-update`**, `memory/working-memory-refresh` | Standardizes how to append incidents and refresh sprint status. |
| 14 Testing & Validation Discipline | Checklist | **Skill: `quality/testing-checklist`** | Enforces pytest/build/playwright smoke before completion. |
| 15 Operational Discipline; 16 Failure Patterns; 17 Self-Healing | Runbook | **Skill: `quality/self-heal`** | Guided recovery steps and anti-patterns. |
| Spawn templates (from Testing_Episodic_Log) | Procedural | **Skill: `core/spawn-template`** | Guarantees start/completion posts use Python helper, not bash. |
| Visual Language Baseline (DesignSystem refs) | Reference | **Skill: `domain/ui-style-baseline`** | Loads design token links + RTL rules on demand. |

## 3. Proposed Skills Architecture
- **Taxonomy & directories**
```
.claude/skills/
├── core/                 # Mandatory operational workflows
│   ├── vm-connect-and-hot-reload/
│   ├── monitoring-tunnel/
│   ├── spawn-template/
│   ├── team-inbox-update/
│   └── write-plan-and-verify/
├── quality/              # Gates before completion
│   ├── testing-checklist/
│   ├── self-heal/
│   ├── rtl-a11y-sweep/
│   └── data-integrity-check/       # leverages DATA_STORES, API inventory
├── automation/           # Cognitive offload
│   ├── status-report/
│   ├── adr-creator/
│   ├── episodic-log-update/
│   └── working-memory-refresh/
├── domain/               # EISLAW-specific flows
│   ├── privacy-score-review/       # uses Privacy PRDs
│   ├── client-data-validator/      # checks registry vs Airtable/SharePoint
│   ├── rag-quality-checker/
│   └── rtl-ui-validator/           # pairs with UX specs
└── external/             # Third-party / marketplace
    ├── anthropic-docx/
    ├── anthropic-pdf/
    ├── anthropic-xlsx/
    ├── superpowers/                # obra/superpowers marketplace
    └── awesome-brand-guidelines/   # e.g., anthropic brand-guidelines
```
- **Naming conventions:** kebab-case directories; include `manifest.json` + `README.md` per Skill; tests in `tests/` subfolder when executable.  
- **Discovery strategy:** add short `index.json` tagging Skills by domain (`infra`, `quality`, `privacy`, `clients`, `ux`, `marketing`). Keep manifests <4–5k tokens; heavy docs linked, not inlined.  
- **Composition patterns:** core Skills load first; domain Skills depend on core/quality (e.g., `privacy-score-review` imports `testing-checklist` steps before running). External Skills isolated to avoid accidental execution.

## 4. Self-Learning Skills Analysis
- **Capabilities today:** Skills can read/write repo files, so they can append to episodic log, add ADRs, and generate reports. They can capture run results (pytest/build) into `/docs/Testing_Episodic_Log.md` or an `/logs/skills/` folder.  
- **Limitations:** No native auto-retraining; Skills do not self-modify safely without human review. Auto-editing manifests risks drift and broken commands.  
- **Recommendations:**  
  - Allow Skills to **write observations** (append-only) to episodic log and create dated ADRs; keep manifests immutable without PR.  
  - Add a `feedback-loop` helper Skill: after failures, collect stack traces + fix summary + next-try tweaks into a structured block.  
  - Version control Skills in git; require `tests/` smoke for Skills that run commands (e.g., dry-run tunnel command).  
  - Periodic curation: weekly review of Skill usage/errors to refine prompts and prune stale ones.

## 5. Anthropic Official Skills
- **Sources:** anthropics/skills marketplace; official document Skills (docx, pdf, xlsx), plus pptx and others listed in Awesome Claude Skills.  
- **Install command (expected):** `/plugin marketplace add anthropics/skills` then `/plugin install document-skills@anthropic-agent-skills` (per Anthropic guidance).  
- **Local attempt:** `plugin` CLI not found on this machine; installation blocked. Action: install Claude Code plugin runner (likely via Anthropic CLI or VS Code extension) and rerun install.  
- **Planned tests (post-install):**  
  - DOCX: open and diff tracked changes for sample Hebrew template; generate new doc from template.  
  - PDF: extract tables from privacy report PDF; merge/split smoke.  
  - XLSX: validate formulas and data types on `airtable_fields` export; summarize sheets.  
- **Use cases for EISLAW:** privacy report generation (DOCX), client intake packet review (PDF), Airtable schema audits (XLSX).

## 6. UX/UI & Marketing Skills
- **Available marketplace Skills (from Awesome Claude Skills):** `brand-guidelines`, `canvas-design`, `webapp-testing` (Playwright-based), `internal-comms`, `artifacts-builder`, `mcp-builder`. No strong RTL/accessibility or marketing ops Skills found.  
- **Gaps to fill with custom Skills:**  
  - `ux/rtl-a11y-sweep`: enforce RTL, WCAG AA, aria roles per UX_UI_Spec & BRAND_GUIDE.  
  - `ux/design-tokens-loader`: preload DesignSystem tokens before UI changes.  
  - `marketing/copy-optimizer`: applies brand voice + legal tone + NNG heuristics.  
  - `marketing/ab-test-designer`: lightweight experiment design for headlines/CTA.  
  - `marketing/seo-onpage-check`: schema tags + meta + Hebrew/English toggles.  
- **Implementation approach:** codify heuristics from BRAND_GUIDE, UX_UI_Spec, SAAS_UI_Research, and existing PRDs; pair with Playwright probes (`tools/tasks_ui_probe.mjs`) for validation.

## 7. Recommendations
### Phase 1 (Week 1) – Foundation
- Stand up `.claude/skills` with core/quality scaffolding; implement `vm-connect-and-hot-reload`, `team-inbox-update`, `testing-checklist`, `episodic-log-update`, `spawn-template`.  
- Install Anthropic document Skills once `plugin` CLI is available; add to `external/`.  
- Create missing `DOCUMENTATION_BIBLE.md` (source from CLAUDE.md §8 references) and link from Skills.

### Phase 2 (Weeks 2–3) – Automation
- Add automation Skills: `status-report`, `adr-creator`, `working-memory-refresh`.  
- Add `rtl-a11y-sweep`, `ui-style-baseline`, and `privacy-score-review` domain Skills that pull spec excerpts automatically.  
- Integrate feedback-loop Skill to log failures into episodic memory.

### Phase 3 (Week 4+) – Domain-Specific
- Build `client-data-validator`, `rag-quality-checker`, `privacy-purchase-flow` Skills aligned to PRDs.  
- Evaluate marketplace libraries (`superpowers`, `webapp-testing`) and selectively enable with allowlist.  
- Add marketing Skills (copy optimizer, SEO/AB-test designer) tied to landing-page efforts.

## 8. Implementation Roadmap
- **Week 1:** Create Skills folder + manifests; migrate procedural content; install document Skills (unblock CLI); add nav entry; smoke test Skills locally.  
- **Weeks 2–3:** Expand automation/domain Skills; wire feedback-loop Skill; start capturing usage metrics (simple JSON logs).  
- **Week 4+:** Harden with tests, add CI gate for Skill schema validation, integrate with orchestration (AOS workflows).  
- **Dependencies:** Claude Code plugin runner, mkdocs nav, availability of BRAND_GUIDE/UX specs, VM access for command tests.  
- **Success metrics:** time-to-onboard (-50%), reduction in CEO clarifications (>40%), Skills usage logs per week (>10 runs), fewer repeated incidents in episodic log.

## 9. Cost-Benefit Analysis
- **Time saved:** ~4–6 hours/week by offloading VM boot/tunnel/testing/reporting routines; ~2 hours/week reduction in status/TEAM_INBOX drafting.  
- **Cognitive load:** Expect 40–50% reduction for CEO/lead by codifying “how-to” in Skills.  
- **Effort to create Skills:** Phase 1 ~8–10 engineer hours; Phase 2 ~12–16; Phase 3 ~16–20 (heavier domain wiring).  
- **Maintenance:** ~1–2 hours/week to update manifests/tests and curate logs; mitigated by append-only memory Skills.

## 10. Next Steps
1) Install Claude Code plugin runner; rerun `/plugin marketplace add anthropics/skills` + `/plugin install document-skills@anthropic-agent-skills`.  
2) Create `.claude/skills/` scaffold and implement Phase 1 Skills.  
3) Add missing `DOCUMENTATION_BIBLE.md` and link from Skills + nav.  
4) Add this research doc to MkDocs nav; run `mkdocs build`.  
5) Begin Phase 2 automation Skills once foundation is validated.

## Appendices

### Appendix A. Skills Inventory (proposed)
- **Core:** vm-connect-and-hot-reload; monitoring-tunnel; spawn-template; team-inbox-update; write-plan-and-verify.  
- **Quality:** testing-checklist; self-heal; rtl-a11y-sweep; data-integrity-check.  
- **Automation:** status-report; adr-creator; episodic-log-update; working-memory-refresh.  
- **Domain:** privacy-score-review; client-data-validator; rag-quality-checker; rtl-ui-validator; privacy-purchase-flow.  
- **External:** anthropic-docx; anthropic-pdf; anthropic-xlsx; superpowers; brand-guidelines.

### Appendix B. CLAUDE.md Sections Analysis (detailed)
- Identity/mission, safety (2,3,6,7,8,11,18) → remain canonical.  
- Procedural runbooks (1D,1E,1F,4,10 tool usage examples,12 memory,14 testing,15–17 ops/self-heal, spawn templates) → Skills.  
- Visual language baseline (1C) → reference Skill with links to DESIGN_TOKENS and Frontend_Dashboard_Plan.

### Appendix C. Example Skill Prototypes (manifests, draft)
```json
// .claude/skills/core/vm-connect-and-hot-reload/manifest.json
{
  "name": "vm-connect-and-hot-reload",
  "description": "Connect to Azure VM and start hot-reload services.",
  "inputs": {},
  "steps": [
    {"type": "bash", "command": "ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4"},
    {"type": "bash", "command": "cd ~/EISLAWManagerWebApp && /usr/local/bin/docker-compose-v2 up -d api web-dev meili"},
    {"type": "read", "path": "docs/DEV_PORTS.md", "optional": true}
  ],
  "outputs": ["Service status summary"]
}
```

```json
// .claude/skills/automation/episodic-log-update/manifest.json
{
  "name": "episodic-log-update",
  "description": "Append incidents/fixes to docs/Testing_Episodic_Log.md with date + evidence.",
  "inputs": {
    "title": "string",
    "problem": "string",
    "fix": "string",
    "evidence": "string"
  },
  "steps": [
    {"type": "template", "template": "## {{title}}\n- Problem: {{problem}}\n- Fix: {{fix}}\n- Evidence: {{evidence}}\n"},
    {"type": "append_file", "path": "docs/Testing_Episodic_Log.md"}
  ]
}
```

```json
// .claude/skills/quality/rtl-a11y-sweep/manifest.json
{
  "name": "rtl-a11y-sweep",
  "description": "Run RTL + accessibility sweep for UI changes.",
  "inputs": {"route": "string"},
  "steps": [
    {"type": "read", "path": "docs/UX_UI_Spec.md"},
    {"type": "read", "path": "docs/BRAND_GUIDE.md", "optional": true},
    {"type": "bash", "command": "cd frontend && npm run build"},
    {"type": "bash", "command": "node tools/playwright_probe.mjs --route {{route}}", "optional": true}
  ],
  "outputs": ["Findings checklist", "Playwright probe summary"]
}
```

### Appendix D. Resources & References
- Anthropic Skills docs: https://docs.claude.com/en/docs/claude-code/skills  
- Anthropic Skills repo: https://github.com/anthropics/skills  
- Awesome Claude Skills (marketplace catalog): https://github.com/travisvn/awesome-claude-skills  
- SkillsMP marketplace: https://skillsmp.com/  
- CLAUDE.md, Testing_Episodic_Log.md, WORKING_MEMORY.md, TEAM_INBOX.md, API_ENDPOINTS_INVENTORY.md, DATA_STORES.md, CLIENTS_FEATURES_SPEC.md, EISLAW_System_Feature_Spec.md.
