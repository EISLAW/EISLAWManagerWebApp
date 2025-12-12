# TASK_ALEX_DOC006_WIKI_SYNC

> **Template Version:** 1.0 | **Created:** 2025-12-09
> **Purpose:** Wiki Full Sync - Add all missing key docs to mkdocs.yml nav

---

## Assignment

| Field | Value |
|-------|-------|
| **Task ID** | DOC-006 |
| **Agent** | Alex (Senior Engineer) |
| **Status** | 🟢 READY |
| **PRD/Spec** | `docs/PRD_DOCUMENTATION_GOVERNANCE.md` |
| **Output Doc** | `docs/TASK_ALEX_DOC006_WIKI_SYNC.md` |
| **Branch** | `feature/DOC-006` |

---

## Requirements

Per `PRD_DOCUMENTATION_GOVERNANCE.md §3`, add all MUST docs to `mkdocs.yml` nav that are currently missing.

### What Needs to Be Done

1. **Audit current `mkdocs.yml`** - List all docs currently in nav
2. **Compare against MUST list** from PRD §3:
   - Tier 0/1: CLAUDE.md, AGENTS.md (mirrored), TEAM_INBOX.md, DOCUMENTATION_BIBLE.md
   - Bibles: DATA_STORES.md, API_ENDPOINTS_INVENTORY.md, DEV_PORTS.md, MARKETING_BIBLE.md, AGENT_BIBLE.md
   - Module specs: CLIENTS_FEATURES_SPEC.md, PRIVACY_FEATURES_SPEC.md, AI_STUDIO_PRD.md, RAG_FEATURES_SPEC.md, AGENT_ORCHESTRATION_STATUS.md
   - Active PRDs: PRD_MKDOCS_WIKI.md, PRD_CLIENT_ARCHIVE.md, PRD_DOCUMENTATION_GOVERNANCE.md, etc.
3. **Add missing docs** to appropriate nav buckets per PRD_MKDOCS_WIKI.md §4
4. **Build and verify** using `tools/docs_build.sh`
5. **Test locally** with `tools/docs_serve.sh` (port 9003)

### Where Code Lives

- **mkdocs.yml**: `~/EISLAWManagerWebApp/mkdocs.yml` (VM)
- **Docs folder**: `~/EISLAWManagerWebApp/docs/` (VM)
- **Build tools**: `~/EISLAWManagerWebApp/tools/docs_build.sh`, `docs_serve.sh`

---

## Acceptance Criteria

- [ ] All MUST docs from PRD §3 are in `mkdocs.yml` nav
- [ ] Nav structure follows PRD_MKDOCS_WIKI.md §4 buckets (Home, Bibles, Modules, Runbooks, PRDs, Archive)
- [ ] `tools/docs_build.sh` runs without errors
- [ ] Wiki site loads at http://20.217.86.4:8000 with all added pages accessible
- [ ] Each added doc appears in search
- [ ] Mirrored docs (CLAUDE.md, AGENTS.md) have canonical path notice

---

## Technical Context

### Current Nav Structure (from PRD_MKDOCS_WIKI.md §4)

```yaml
nav:
  - Home: index.md
  - Bibles:
    - CLAUDE.md: root/CLAUDE.md
    - AGENTS.md: root/AGENTS.md
    - Documentation Bible: DOCUMENTATION_BIBLE.md
    # Add: DATA_STORES, API_ENDPOINTS_INVENTORY, DEV_PORTS, etc.
  - Modules:
    - Clients: CLIENTS_FEATURES_SPEC.md
    # Add: PRIVACY, RAG, AI_STUDIO specs
  - PRDs:
    # Add active PRDs
  - Runbooks:
    # Add operational docs
```

### Build Commands

```bash
# SSH to VM
wsl -e bash -c "ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4"

# Build
cd ~/EISLAWManagerWebApp
./tools/docs_build.sh

# Preview (optional)
./tools/docs_serve.sh  # Access at VM_IP:9003

# Production deploy (after merge to main, CI handles this)
```

### Reference Docs

- `PRD_DOCUMENTATION_GOVERNANCE.md §3` - MUST/MAY/DO NOT inclusion rules
- `PRD_MKDOCS_WIKI.md §4` - Nav bucket structure
- `DOCUMENTATION_BIBLE.md §10` - Wiki governance summary

---

## Completion Checklist (REQUIRED)

> **IMPORTANT:** Do NOT mark task complete until ALL items checked.
> See CLAUDE.md §8 for the full Docs Update Rule mapping.

### Code & Testing
- [ ] `mkdocs.yml` updated with all MUST docs
- [ ] Build runs without errors (`tools/docs_build.sh`)
- [ ] Tested on VM (http://20.217.86.4:8000)
- [ ] All added pages load correctly
- [ ] Search returns expected results

### Git
- [ ] On feature branch `feature/DOC-006`
- [ ] All changes committed
- [ ] Pushed to origin

### Documentation
- [ ] N/A - this task IS the documentation update

### Handoff
- [ ] Completion message posted to TEAM_INBOX "Messages TO Joe"
- [ ] Ready for Jacob review

---

## Completion Report

*Fill this section when task is complete:*

### Summary
{1-2 sentences describing what was done}

### Files Changed
- `mkdocs.yml` - {Added X docs to nav}

### Test Results
{Screenshot of wiki nav or list of accessible pages}

### Notes for Reviewer
{Any context Jacob should know for review}

---

*Task created by Joe (CTO) on 2025-12-09*
*Template location: `docs/TASK_TEMPLATE.md`*
