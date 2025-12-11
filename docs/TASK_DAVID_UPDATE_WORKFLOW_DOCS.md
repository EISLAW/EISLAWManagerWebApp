# TASK: Update Documentation for New Development Workflow

**Task ID:** RESEARCH-SKILLS-002
**Assigned To:** David (Senior Product)
**Assigned By:** Joe (CEO request)
**Date Assigned:** 2025-12-12
**Status:** 🔄 NEW
**Branch:** feature/RESEARCH-SKILLS-002
**Model:** Codex (default for David)

---

## Task Overview

Research and document the new development workflow implemented via ENV-001/ENV-002 (local development + automated sync to VM), then update all relevant documentation including the Skills Architecture Research to reflect this change.

---

## Context

**What changed:**
- **OLD workflow:** Develop directly on VM (SSH to 20.217.86.4, edit files there)
- **NEW workflow:** Develop locally on Windows, auto-sync to VM via GitHub Actions + VM webhook/SSH pull

**Why this matters:**
- Your Skills Architecture Research (RESEARCH-SKILLS-001) references the old VM-first workflow
- CLAUDE.md and other docs still describe the old workflow
- Skills like `vm-connect-and-hot-reload` need to reflect the new local-first approach

**CEO's question:** "Where should we update the documentation to reflect the new development workflow?"

---

## Objectives

1. **Research the new workflow** (ENV-001/ENV-002 implementation details)
2. **Identify all docs that reference the old workflow**
3. **Update documentation** (CLAUDE.md, Skills research, etc.)
4. **Update Skills proposals** in your research to reflect new workflow
5. **Create workflow diagram** showing local → GitHub → VM sync flow
6. **Document in TEAM_INBOX** the new workflow for all team members

---

## Detailed Requirements

### 1. Research New Workflow

**Read these files:**
- `docs/PLAN_ENV_PRESERVE_AND_ALIGN.md` - ENV-001/002 plan
- `docs/TEAM_INBOX.md` - Jane's ENV-001 completion message (line 91)
- `.github/workflows/` (if exists) - GitHub Actions for auto-sync
- Any VM webhook/script files for SSH pull

**Understand:**
- How does local → GitHub → VM sync work?
- What triggers the sync? (git push? specific branches?)
- What gets synced? (code only? dependencies?)
- Does VM auto-rebuild containers?
- What's the developer experience now vs. before?

**Deliverable:** Section 1 in update doc explaining new workflow end-to-end

---

### 2. Identify Documentation Requiring Updates

**Search these files for old workflow references:**

| File | What to check |
|------|---------------|
| `C:\Coding Projects\CLAUDE.md` | Section 1D (Azure VM Development), spawn templates, testing discipline |
| `docs/RESEARCH_SKILLS_ARCHITECTURE.md` | Skills like `vm-connect-and-hot-reload`, testing workflows |
| `docs/Testing_Episodic_Log.md` | VM testing procedures, spawn patterns |
| `docs/WORKING_MEMORY.md` | Current workflow descriptions |
| `docs/DOCUMENTATION_BIBLE.md` | (if exists) Workflow documentation rules |
| Any PRDs | References to VM development |

**Look for phrases like:**
- "SSH to VM"
- "Develop on VM"
- "Connect to 20.217.86.4"
- "Edit files on VM"
- "VM-first workflow"

**Deliverable:** Table mapping files → sections that need updates

---

### 3. Update CLAUDE.md

**Section to update: 1D Azure VM Development Environment**

**OLD content (example):**
```markdown
Agents develop directly on VM via SSH. Connect with:
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4
cd ~/EISLAWManagerWebApp
```

**NEW content should explain:**
```markdown
## Development Workflow (As of 2025-12-11: Local-First)

**Default:** Develop locally on Windows (`C:\Coding Projects\EISLAW System Clean\`), push to GitHub, auto-syncs to VM.

**Auto-Sync Flow:**
1. Developer: `git push origin feature/TASK-ID`
2. GitHub Action: Triggers on push
3. VM webhook: Pulls latest code via SSH
4. VM: Auto-rebuilds containers (if needed)
5. Services restart with hot-reload

**When to SSH to VM:**
- View logs: `docker-compose-v2 logs api -f`
- Smoke test: Verify endpoints after deployment
- Debug production issues
- Check container status

**VM Details:**
- IP: 20.217.86.4
- User: azureuser
- Key: ~/.ssh/eislaw-dev-vm.pem
- Project: ~/EISLAWManagerWebApp
- Default branch: dev-main-2025-12-11
```

**Deliverable:** Updated CLAUDE.md section 1D

---

### 4. Update Skills Architecture Research

**File:** `docs/RESEARCH_SKILLS_ARCHITECTURE.md`

**Sections to update:**

#### Section 2: Skills vs CLAUDE.md Mapping
- **Current:** Recommends `core/vm-connect-and-hot-reload` Skill
- **Update:** Change to `core/local-dev-workflow` or `core/deploy-to-vm`
- **Description:** Automates local dev setup + push + verify VM sync

#### Section 3: Proposed Skills Architecture
```diff
.claude/skills/
├── core/
-│   ├── vm-connect-and-hot-reload/
+│   ├── local-dev-workflow/       # Local setup + GitHub + VM sync
+│   ├── vm-log-viewer/            # SSH to VM, tail logs
```

#### Appendix C: Example Skill Prototypes
Update `vm-connect-and-hot-reload` manifest to reflect new workflow:

```json
// .claude/skills/core/local-dev-workflow/manifest.json
{
  "name": "local-dev-workflow",
  "description": "Set up local development, push to GitHub, verify VM sync.",
  "inputs": {"branch": "string"},
  "steps": [
    {"type": "bash", "command": "git checkout {{branch}}"},
    {"type": "bash", "command": "git pull origin {{branch}}"},
    {"type": "bash", "command": "npm install && pip install -r requirements.txt"},
    {"type": "info", "message": "Local setup complete. Make changes, then git push to sync VM."}
  ],
  "outputs": ["Local environment ready"]
}
```

**Deliverable:** Updated Skills research sections 2, 3, Appendix C

---

### 5. Create Workflow Diagram

**Create:** `docs/DEV_WORKFLOW_DIAGRAM.md`

**Content:**
```markdown
# Development Workflow Diagram (As of 2025-12-11)

## Local → GitHub → VM Sync Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Developer (Local Windows)                                        │
│ Location: C:\Coding Projects\EISLAW System Clean\               │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ 1. git push origin feature/TASK-ID
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ GitHub Repository                                                │
│ Default Branch: dev-main-2025-12-11                             │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ 2. GitHub Action triggers
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ VM Webhook / SSH Pull                                           │
│ Script: [location TBD - research this]                          │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ 3. Pull latest code
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Azure VM (20.217.86.4)                                          │
│ Location: ~/EISLAWManagerWebApp                                │
│ Services: api, web-dev, meili (hot-reload enabled)             │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ 4. Auto-restart services
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Live URLs                                                        │
│ - Frontend (dev): http://20.217.86.4:5173                      │
│ - API: http://20.217.86.4:8799                                 │
└─────────────────────────────────────────────────────────────────┘
```

## When to Use What

| Scenario | Tool | Command |
|----------|------|---------|
| Normal development | Local + git push | `git push origin feature/TASK-ID` |
| View logs | SSH to VM | `ssh azureuser@20.217.86.4` then `docker-compose-v2 logs api -f` |
| Smoke test after push | Browser | `http://20.217.86.4:5173` |
| Debug container | SSH to VM | `docker-compose-v2 ps` |
| Hot-reload not working | SSH to VM | `docker-compose-v2 restart api` |

## Developer Experience

**Before (VM-first):**
1. SSH to VM
2. Edit files on VM
3. Test on VM
4. Git commit/push from VM

**After (Local-first):**
1. Edit files locally (VS Code, etc.)
2. Test locally (optional: `npm run dev`)
3. Git commit/push from local
4. Auto-syncs to VM
5. Verify on VM URLs
```

**Deliverable:** New workflow diagram document

---

### 6. Update TEAM_INBOX

**Add to TEAM_INBOX.md:**

**New section (after "How to Use This Document"):**

```markdown
## Development Workflow (UPDATED 2025-12-11)

**We now develop locally with auto-sync to VM.**

### Quick Start
1. Work locally: `C:\Coding Projects\EISLAW System Clean\`
2. Create feature branch: `git checkout -b feature/TASK-ID`
3. Make changes, commit: `git add . && git commit -m "TASK-ID: description"`
4. Push to GitHub: `git push origin feature/TASK-ID`
5. Auto-syncs to VM (20.217.86.4)
6. Verify at http://20.217.86.4:5173

### When to SSH to VM
- View logs: `docker-compose-v2 logs api -f`
- Debug container issues
- Smoke test after deployment
- **NOT for editing code** (do that locally)

### References
- Full workflow: `docs/DEV_WORKFLOW_DIAGRAM.md`
- ENV plan: `docs/PLAN_ENV_PRESERVE_AND_ALIGN.md`
- VM details: CLAUDE.md §3
```

**Deliverable:** Updated TEAM_INBOX with workflow section

---

## Git Workflow

**CRITICAL GIT RULES:**
- Work on branch: `feature/RESEARCH-SKILLS-002`
- **DO NOT** git commit or push (Jacob will do this after review)
- Save all work locally only

---

## Chat Integration

Use `tools/agent_chat.py` to post progress updates:

```python
from tools.agent_chat import post_start, post_completion, post_message

# At start
post_start('David', 'RESEARCH-SKILLS-002', 'Update docs for new local-first workflow', 'feature/RESEARCH-SKILLS-002', '3-4 hours')

# During work (optional)
post_message('David', 'RESEARCH-SKILLS-002', 'Researched ENV-001/002 - found auto-sync details', 'agent-tasks')
post_message('David', 'RESEARCH-SKILLS-002', 'Updated CLAUDE.md section 1D with new workflow', 'agent-tasks')

# At completion
post_completion(
    'David', 'RESEARCH-SKILLS-002',
    'Workflow Documentation Update',
    'Updated CLAUDE.md, Skills research, created workflow diagram, updated TEAM_INBOX',
    '3.5 hours', 'abc123',
    'Jacob review',
    'Phase 1 Skills implementation'
)
```

---

## Acceptance Criteria

- [ ] New workflow researched (ENV-001/002 implementation understood)
- [ ] All docs referencing old workflow identified (table created)
- [ ] CLAUDE.md section 1D updated (local-first workflow documented)
- [ ] Skills research updated (sections 2, 3, Appendix C)
- [ ] Workflow diagram created (`docs/DEV_WORKFLOW_DIAGRAM.md`)
- [ ] TEAM_INBOX updated with "Development Workflow" section
- [ ] All changes consistent (CLAUDE.md ↔ Skills research ↔ TEAM_INBOX)
- [ ] MkDocs navigation updated (if new docs added)
- [ ] Completion message posted to TEAM_INBOX "Messages TO Joe"
- [ ] Ready for Jacob review

---

## Estimated Time

**3-4 hours**

Breakdown:
- Research new workflow: 1 hour
- Identify docs needing updates: 30 minutes
- Update CLAUDE.md: 45 minutes
- Update Skills research: 1 hour
- Create workflow diagram: 30 minutes
- Update TEAM_INBOX: 15 minutes

---

## Resources

**Files to read:**
- `docs/PLAN_ENV_PRESERVE_AND_ALIGN.md`
- `docs/TEAM_INBOX.md` (Jane's ENV-001 message)
- `C:\Coding Projects\CLAUDE.md`
- `docs/RESEARCH_SKILLS_ARCHITECTURE.md`
- `.github/workflows/` (if exists)

**References:**
- ENV-001 completion message (TEAM_INBOX line 91)
- Jane's implementation of auto-sync

---

## Output Document Template

Create `docs/WORKFLOW_UPDATE_ANALYSIS.md`:

```markdown
# Development Workflow Update Analysis

**Author:** David
**Date:** 2025-12-12
**Task:** RESEARCH-SKILLS-002

## Executive Summary
[2-3 sentences: What changed, why, impact]

## 1. New Workflow Details
[Explain ENV-001/002 implementation]

## 2. Documentation Audit
[Table of files → sections needing updates]

## 3. Updates Made

### 3.1 CLAUDE.md
- Section 1D updated (before/after diff)

### 3.2 Skills Architecture Research
- Section 2 updated (Skills mapping)
- Section 3 updated (taxonomy)
- Appendix C updated (example Skills)

### 3.3 TEAM_INBOX
- Added "Development Workflow" section

### 3.4 Workflow Diagram
- Created DEV_WORKFLOW_DIAGRAM.md

## 4. Impact on Skills

[How does new workflow affect proposed Skills?]

## 5. Recommendations

[Any additional docs that should be updated?]
```

---

## Completion Report Template

Post to TEAM_INBOX "Messages TO Joe":

```markdown
**RESEARCH-SKILLS-002 (2025-12-12):** Workflow documentation update complete.

**Deliverables:**
- `WORKFLOW_UPDATE_ANALYSIS.md` - Analysis of workflow changes
- `DEV_WORKFLOW_DIAGRAM.md` - Visual workflow diagram
- Updated `CLAUDE.md` section 1D (local-first workflow)
- Updated `RESEARCH_SKILLS_ARCHITECTURE.md` (sections 2, 3, Appendix C)
- Updated `TEAM_INBOX.md` (new "Development Workflow" section)

**Key Changes:**
- CLAUDE.md: VM development → local development + auto-sync
- Skills: `vm-connect-and-hot-reload` → `local-dev-workflow`
- TEAM_INBOX: Added quick-start guide for local development

**Impact:**
- All docs now consistent with ENV-001/002 implementation
- Team members have clear guidance on new workflow
- Skills proposals reflect current development practices

**Branch:** feature/RESEARCH-SKILLS-002 (local changes, ready for Jacob review)
```

---

**BEFORE marking done, verify:**
- All updated docs are consistent with each other
- No references to old VM-first workflow remain
- Workflow diagram matches actual implementation
- TEAM_INBOX has actionable quick-start guide

---

*Task created by Joe on 2025-12-12. For questions, update TEAM_INBOX "Messages TO Joe".*
