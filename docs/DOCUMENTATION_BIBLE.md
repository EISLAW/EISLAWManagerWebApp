# Documentation Bible

**Owner:** Joe (CTO)
**Created:** 2025-12-09
**Purpose:** Rules for maintaining EISLAW documentation

> **This is the single source of truth for documentation standards.**

---

## 1. Tiered Architecture

```
TIER 0: CLAUDE.md + AGENTS.md (AUTO-LOADED)
├── CLAUDE.md: Read by Claude CLI
├── AGENTS.md: Read by Codex CLI (MIRROR - keep in sync!)
├── WHO: Agent personas
├── HOW: Rules, VM, Git workflow
├── WHERE: Path Reference table
└── Size: ~600 lines max each
         │
         ▼
TIER 1: TEAM_INBOX.md (NAVIGATION HUB)
├── WHAT: Active tasks only
├── Links to Tier 2 docs
└── Size: ~200 lines max
         │
         ▼
TIER 2: Feature Docs (ON DEMAND)
├── PRD_*.md - Requirements
├── *_FEATURES_SPEC.md - Module bibles
├── TASK_*.md - Task details
└── Size: Unlimited per doc
         │
         ▼
TIER 3: Archives (RARELY READ)
├── TEAM_INBOX_ARCHIVE.md
├── Testing_Episodic_Log.md
└── Git history
```

---

## 2. Document Ownership

| Document | Owner | Updates When |
|----------|-------|--------------|
| CLAUDE.md | Joe | Rules/paths change |
| AGENTS.md | Joe | **Always sync with CLAUDE.md** |
| TEAM_INBOX.md | Joe | Tasks assigned/completed |
| *_FEATURES_SPEC.md | David | Module behavior changes |
| API_ENDPOINTS_INVENTORY.md | Alex | Any API change |
| DATA_STORES.md | Joseph | Schema changes |
| AGENT_BIBLE.md | Joe | Spawn patterns change |
| DOCUMENTATION_BIBLE.md | Joe | Doc rules change |

---

## 3. Update Rules (from CLAUDE.md §8)

| If you changed... | Update this doc |
|-------------------|-----------------|
| API endpoint | `API_ENDPOINTS_INVENTORY.md` |
| Database table/column | `DATA_STORES.md` |
| Clients module | `CLIENTS_FEATURES_SPEC.md` |
| Privacy module | `PRIVACY_FEATURES_SPEC.md` |
| AI Studio module | `AI_STUDIO_PRD.md` |
| RAG module | `RAG_FEATURES_SPEC.md` |
| Agent orchestration | `AGENT_ORCHESTRATION_STATUS.md` |
| Marketing/forms | `MARKETING_BIBLE.md` |
| Docker/ports/services | `DEV_PORTS.md` + CLAUDE.md §3 |

**Enforcement:** Jacob verifies during review. No approval without docs update.

---

## 4. Archival Policy

### TEAM_INBOX.md
- **Keep:** Active/pending tasks, last 5 messages
- **Archive when:** Task status = ✅ COMPLETE for 24+ hours
- **Archive to:** TEAM_INBOX_ARCHIVE.md
- **Frequency:** Weekly cleanup (or when > 200 lines)

### Messages TO Joe
- **Keep:** Last 5 active messages
- **Archive when:** Status = ✅ COMPLETE or ✅ APPROVED
- **Archive to:** TEAM_INBOX_ARCHIVE.md (summary only)
- **Full text:** Git history preserves details

### Task Docs (TASK_*.md)
- **Keep forever** - They're small and searchable
- **No archival needed**

---

## 5. Single Source of Truth Rule

Each fact lives in **ONE place**. Other docs **link** to it.

| Fact | Lives In | NOT Duplicated In |
|------|----------|-------------------|
| VM IP, SSH commands | CLAUDE.md §3 | ~~TEAM_INBOX~~ |
| Git workflow rules | CLAUDE.md §3 | ~~TEAM_INBOX~~ |
| Agent spawn patterns | CLAUDE.md §1a + AGENT_BIBLE | ~~TEAM_INBOX~~ |
| Current task list | TEAM_INBOX.md | ~~CLAUDE.md~~ |
| Module feature status | *_FEATURES_SPEC.md | ~~TEAM_INBOX~~ |
| Doc maintenance rules | DOCUMENTATION_BIBLE.md | ~~CLAUDE.md~~ |

---

## 6. New Document Checklist

Before creating a new document:

1. **Does it already exist?** Search first
2. **Where does it belong?** (Tier 0/1/2/3)
3. **Who owns it?** Assign in header
4. **Is it linked?** Add to relevant Quick Links sections
5. **Is path in CLAUDE.md?** Add to Path Reference if frequently accessed

---

## 7. Document Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Task | `TASK_{AGENT}_{DESC}.md` | `TASK_ALEX_SYNC_ENDPOINTS.md` |
| PRD | `PRD_{FEATURE}.md` | `PRD_CLIENT_ARCHIVE.md` |
| Feature Spec | `{MODULE}_FEATURES_SPEC.md` | `CLIENTS_FEATURES_SPEC.md` |
| Audit | `AUDIT_RESULTS_{AGENT}_{AREA}.md` | `AUDIT_RESULTS_SARAH_UX.md` |
| Research | `RESEARCH_{TOPIC}.md` | `RESEARCH_CODEX_PLAYWRIGHT.md` |
| Bible | `{TOPIC}_BIBLE.md` | `AGENT_BIBLE.md` |

---

## 8. CLAUDE.md Maintenance

### MANDATORY: CLAUDE.md ↔ AGENTS.md Sync Rule

> **When you update CLAUDE.md, you MUST also update AGENTS.md with the same changes.**

| File | Read By | Location |
|------|---------|----------|
| CLAUDE.md | Claude CLI | `C:\Coding Projects\CLAUDE.md` |
| AGENTS.md | Codex CLI | `C:\Coding Projects\AGENTS.md` |

**Why?** Both files serve as project context for their respective CLIs. If they diverge, agents will have inconsistent rules.

**How to sync:**
1. Make your changes to CLAUDE.md
2. Copy the same changes to AGENTS.md
3. Adjust self-references (CLAUDE.md → AGENTS.md in the AGENTS.md file)

**When to update CLAUDE.md:**
- New agent persona added
- New path needs to be discoverable
- New mandatory rule for all agents
- Workflow pattern changes

**When NOT to update CLAUDE.md:**
- Task-specific details (→ TASK_*.md)
- Feature status (→ *_FEATURES_SPEC.md)
- Historical data (→ archives)
- Module-specific rules (→ module docs)

**Size limit:** Keep under 600 lines each. If growing, extract to dedicated doc.

---

## 9. Quick Reference

### Key Anchors

| Anchor | Purpose | Location |
|--------|---------|----------|
| Path Reference | Where things are | CLAUDE.md §1a |
| Docs Update Rule | What to update when | CLAUDE.md §8 |
| Jacob's Checklist | Review verification | CLAUDE.md §1 |
| Task Template | Standard task structure | TASK_TEMPLATE.md |
| Doc Architecture | Tier system | This file §1 |

### Bible Documents

| Bible | Covers |
|-------|--------|
| CLAUDE.md | Agent rules, workflow, VM (Claude CLI) |
| AGENTS.md | Mirror of CLAUDE.md (Codex CLI) |
| AGENT_BIBLE.md | Spawn patterns, wait semantics |
| DOCUMENTATION_BIBLE.md | Doc maintenance rules |
| DATA_STORES.md | All data locations |
| API_ENDPOINTS_INVENTORY.md | All API endpoints |
| DEV_PORTS.md | All service ports on VM |
| MARKETING_BIBLE.md | Marketing/conversion |

---

## 10. Wiki Governance & Sync (DOC-005)

- **Inclusion:** MUST include Tier 0/1 docs, all Bibles, module specs, active PRDs, and runbooks/playbooks in `mkdocs.yml`. MAY include active tasks/audits; never include temp_* or generated artifacts. See PRD_DOCUMENTATION_GOVERNANCE.md §3 for examples.
- **Adding docs:** Author updates `mkdocs.yml` in the same change when creating a MUST doc. Required headers: Title, Owner, Created/Updated, Status, Canonical path (if mirrored). Use nav buckets from PRD_MKDOCS_WIKI.md §4.
- **Sync flow:** Local branch → `python3 -m mkdocs build --clean` (or `tools/docs_build.sh`) → optional preview `tools/docs_serve.sh` on port 9003 → push to `main` or `feature/**` branch → **CI auto-builds and deploys** via `.github/workflows/docs.yml` to `http://20.217.86.4:8000`. **Real-time updates:** Wiki rebuilds automatically on every push to `main` or any `feature/**` branch when docs/, mkdocs.yml, or requirements-docs.txt change. Manual trigger available via GitHub Actions UI (workflow_dispatch).
- **Ownership:** Owner per doc type per PRD_DOCUMENTATION_GOVERNANCE.md §6 (Joe = Tier 0/1, David = module specs/PRDs, others per header). Update headers + this Bible when ownership changes.
- **Audit:** Weekly or end-of-sprint. Check mkdocs.yml coverage, CI green, mirrored root docs synced, robots.txt served, no temp files in nav. Log findings in TEAM_INBOX Messages TO Joe; remediate critical gaps within 1 business day.

---

*This document is the source of truth for documentation standards.*
*Update this when documentation rules change.*
