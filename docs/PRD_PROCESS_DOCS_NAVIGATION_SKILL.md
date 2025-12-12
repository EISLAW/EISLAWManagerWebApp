# PRD: Documentation Navigation Skill

**Author:** Joe (Task Master)
**Date:** 2025-12-12
**Status:** Draft
**Bin:** PROCESS
**Module:** Documentation

---

## Problem Statement

Agents struggle to:
1. Know which document type to create (SPEC vs PRD vs GUIDE vs TASK)
2. Follow consistent naming conventions
3. Find existing documentation efficiently
4. Update the right docs when making changes

This leads to inconsistent documentation, duplicated information, and wasted time searching.

---

## Proposed Solution

Create a Claude Code skill (`eislaw-docs`) that provides agents with:
1. Document type decision tree
2. Naming convention rules
3. Search patterns for finding docs
4. Doc update mapping (what changed → which doc to update)

---

## Document Type System

### Primary Types

| Type | Purpose | Pattern | Lifespan |
|------|---------|---------|----------|
| **SPEC** | What exists (reference) | `SPEC_{BIN}_{MODULE}.md` | Permanent |
| **PRD** | What to build + decision record | `PRD_{BIN}_{MODULE}_{FEATURE}.md` | Until implemented |
| **GUIDE** | How to do things (rules/standards) | `GUIDE_{BIN}_{TOPIC}.md` | Permanent |
| **TASK** | Work assignment | `TASK_{AGENT}_{DESC}.md` | Until done |
| **RUNBOOK** | Step-by-step ops procedures | `RUNBOOK_{TOPIC}.md` | Permanent |
| **RESEARCH** | Exploration/investigation | `RESEARCH_{TOPIC}.md` | Archive after decision |
| **AUDIT** | Review/inspection results | `AUDIT_{AGENT}_{AREA}.md` | Archive |
| **TEMPLATE** | Output content templates | `TEMPLATE_{TYPE}_{NAME}.md` | Permanent |
| **LOG** | Historical records | `LOG_{TYPE}.md` | Append-only |
| **STATUS** | Current state (ephemeral) | `STATUS_{AREA}.md` | Overwritten |

### Bins

| Bin | Use For | Examples |
|-----|---------|----------|
| `MODULE` | Product features with UI | Clients, RAG, Privacy, AI Studio, Marketing |
| `INFRA` | Technical systems (no UI) | Data, API, Integrations, Design System |
| `PROCESS` | Team workflow | Agents, Git, Deploy, Documentation |

### Special Files (No Prefix)

| File | Purpose |
|------|---------|
| `CHANGELOG.md` | Release history |
| `TEAM_INBOX.md` | Communication hub |
| `README.md` | Folder entry points |
| `INDEX.md` | Navigation |

---

## Decision Tree: Which Doc Type?

```
Is this about something that EXISTS or something to BUILD?
├─ EXISTS (current state)
│   ├─ Is it a product feature? → SPEC_MODULE_{name}.md
│   ├─ Is it technical infrastructure? → SPEC_INFRA_{name}.md
│   └─ Is it how we work? → GUIDE_PROCESS_{name}.md
│
├─ BUILD (proposed change)
│   └─ → PRD_{BIN}_{MODULE}_{FEATURE}.md
│
├─ DOING (work in progress)
│   └─ → TASK_{AGENT}_{DESC}.md
│
├─ LEARNING (investigation)
│   ├─ Before decision → RESEARCH_{TOPIC}.md
│   └─ After review → AUDIT_{AGENT}_{AREA}.md
│
└─ OPERATING (procedures)
    └─ → RUNBOOK_{TOPIC}.md
```

---

## Search Patterns

### Find by Type
```bash
# All specs
ls docs/SPEC_*.md

# All PRDs for a module
ls docs/PRD_MODULE_CLIENTS_*.md

# All tasks for an agent
ls docs/TASK_ALEX_*.md
```

### Find by Content
```bash
# Find docs mentioning an API endpoint
grep -l "/api/clients" docs/*.md

# Find docs about a feature
grep -l "archive" docs/*.md
```

### Find by Module
```bash
# Everything about Clients module
grep -l -i "clients" docs/SPEC_MODULE_*.md docs/PRD_MODULE_CLIENTS_*.md
```

---

## Migration Plan

### Phase 1: Rename Existing (Low Risk)

| Current | New |
|---------|-----|
| `CLIENTS_FEATURES_SPEC.md` | `SPEC_MODULE_CLIENTS.md` |
| `RAG_FEATURES_SPEC.md` | `SPEC_MODULE_RAG.md` |
| `API_ENDPOINTS_INVENTORY.md` | `SPEC_INFRA_API_ENDPOINTS.md` |
| `DATA_STORES.md` | `SPEC_INFRA_DATA_STORES.md` |
| `MARKETING_BIBLE.md` | `GUIDE_PROCESS_MARKETING.md` |
| `BRAND_GUIDE.md` | `GUIDE_PROCESS_BRAND.md` |
| `DEPLOY_RUNBOOK.md` | `RUNBOOK_DEPLOY.md` |
| `DEV_SETUP.md` | `RUNBOOK_DEV_SETUP.md` |

### Phase 2: Update References

- Update CLAUDE.md section 5 and 7 with new names
- Update mkdocs.yml navigation
- Update any cross-references in docs

### Phase 3: Build Skill

Create `eislaw-docs` skill with:
- `SKILL.md` - Decision tree + naming rules
- `references/doc-types.md` - Full type definitions
- `references/search-patterns.md` - How to find docs

---

## Decision Record

**Status:** Proposed

**Alternatives Considered:**
1. Folder-based organization (`specs/`, `prds/`, etc.) - Rejected: more refactoring, breaks links
2. Keep current mixed patterns - Rejected: inconsistent, hard to find docs
3. Prefix-based with bins ✅ - Chosen: minimal change, clear categories

**Trade-offs:**
+ Consistent naming across all docs
+ Easy to filter/search by type
+ Clear decision tree for agents
- Requires renaming existing files
- Need to update references

---

## Success Criteria

- [ ] All existing docs renamed to new convention
- [ ] CLAUDE.md updated with new patterns
- [ ] mkdocs.yml navigation updated
- [ ] `eislaw-docs` skill created and tested
- [ ] Agents consistently use correct doc types

---

## Owner

**PRD:** David (Product)
**Implementation:** Alex (skill code) + Joe (doc renames)
**Review:** Jacob (CTO)
