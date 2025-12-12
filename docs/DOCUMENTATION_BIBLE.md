# Documentation Bible

**Purpose:** Authoritative reference for all documentation maintenance rules, patterns, and best practices in the EISLAW project.

**Last Updated:** 2025-12-12

---

## Table of Contents

1. [Document Patterns & Naming](#document-patterns--naming)
2. [Docs Update Rule (MANDATORY)](#docs-update-rule-mandatory)
3. [MkDocs Wiki Update Rule](#mkdocs-wiki-update-rule)
4. [Task Completion Checklist](#task-completion-checklist)
5. [Documentation Hierarchy](#documentation-hierarchy)
6. [Common Documentation Tasks](#common-documentation-tasks)
7. [Documentation Quality Standards](#documentation-quality-standards)

---

## Document Patterns & Naming

Use these standardized naming patterns for all documentation files:

| Type | Pattern | Example | Location |
|------|---------|---------|----------|
| **Task** | `TASK_{NAME}_{DESC}.md` | `TASK_ALEX_SYNC_ENDPOINTS.md` | `docs/` |
| **Audit** | `AUDIT_RESULTS_{NAME}_{AREA}.md` | `AUDIT_RESULTS_SARAH_UX.md` | `docs/` |
| **PRD** | `PRD_{FEATURE}.md` | `PRD_QUOTE_TEMPLATES.md` | `docs/` |
| **Bug Report** | `BUG_REPORT_{DATE}.md` | `BUG_REPORT_2025_12_07.md` | `docs/` |
| **Research** | `RESEARCH_{TOPIC}.md` | `RESEARCH_SKILLS_ARCHITECTURE.md` | `docs/` |
| **Feature Spec** | `{MODULE}_FEATURES_SPEC.md` | `CLIENTS_FEATURES_SPEC.md` | `docs/` |
| **Plan** | `PLAN_{TOPIC}.md` | `PLAN_ENV_PRESERVE_AND_ALIGN.md` | `docs/` |

**Naming Conventions:**
- Use `SCREAMING_SNAKE_CASE` for multi-word names
- Use descriptive names (e.g., `STORAGE_MIGRATION` not `STORAGE_MIG`)
- Include agent name in task docs (e.g., `TASK_ALEX_...`)
- Include date in bug reports (YYYY-MM-DD format)
- Use singular for module specs (e.g., `CLIENTS` not `CLIENT`)

---

## Docs Update Rule (MANDATORY)

**Rule:** Every completed task MUST update relevant documentation. Task is NOT DONE until docs are updated. Jacob verifies this during review.

### Documentation Update Mapping

| If you changed... | Update this doc |
|-------------------|-----------------|
| **API endpoint** (add/change/remove) | `docs/API_ENDPOINTS_INVENTORY.md` |
| **Database table/column** | `docs/DATA_STORES.md` |
| **Clients module** | `docs/CLIENTS_FEATURES_SPEC.md` |
| **Privacy module** | `docs/PRIVACY_FEATURES_SPEC.md` |
| **AI Studio module** | `docs/AI_STUDIO_PRD.md` |
| **RAG module** | `docs/RAG_FEATURES_SPEC.md` |
| **Agent orchestration** | `docs/AGENT_ORCHESTRATION_STATUS.md` |
| **Marketing/forms** | `docs/MARKETING_BIBLE.md` |
| **Docker/ports/services** | `docs/DEV_PORTS.md` + `CLAUDE.md` §3 |
| **Git workflow** | `docs/GIT_WORKFLOW.md` |
| **Development workflow** | `docs/DEV_WORKFLOW_DIAGRAM.md` |
| **Skills/automation** | `.claude/skills/README.md` |

### Update Process

1. **Identify affected docs** using the mapping table above
2. **Read the current doc** to understand its structure
3. **Update the relevant sections** (add/modify/remove)
4. **Verify changes** are accurate and complete
5. **Commit with clear message** (e.g., `CLI-009: Update API endpoints inventory`)

### Example: API Endpoint Change

```markdown
# Before
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/clients` | GET | List all clients |

# After
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/clients` | GET | List all clients (supports `?sort=name` query param) |
| `/api/clients/{id}/archive` | POST | Archive a client (soft delete) |
```

---

## MkDocs Wiki Update Rule

**When:** Creating a NEW documentation file (research report, PRD, spec).

**Who this applies to:**
- **David** (all PRDs, research reports, feature specs)
- **Noa** (legal/marketing docs)
- Any agent creating user-facing documentation

### Process

**Step 1: Create the document**
```bash
# Example
docs/RESEARCH_NEW_TOPIC.md
```

**Step 2: Edit mkdocs.yml**

Add to appropriate navigation section:

```yaml
nav:
  - Agent Orchestration & CLI:
    - Model Research:
      - Your New Doc: RESEARCH_NEW_TOPIC.md  # <-- Add this line
```

**Step 3: Test build**

```bash
mkdocs build
# Must succeed with no errors
```

**Step 4: Fix if needed**

If build fails:
- Check file path is correct (relative to `docs/`)
- Verify YAML indentation (2 spaces)
- Ensure file exists at specified path

### Navigation Sections

Choose the appropriate section for your doc:

| Section | Content Type |
|---------|-------------|
| **Agent Orchestration & CLI** | Model research, agent status, CLI guides |
| **Feature Specs** | PRDs, feature specifications |
| **Developer Resources** | Setup guides, tools, workflows |
| **API Documentation** | API specs, endpoint inventories |
| **Data & Storage** | Database schemas, data stores |
| **Testing & QA** | Test plans, audit results |
| **Marketing & Legal** | Privacy forms, marketing materials |

### Exemptions

**DO NOT add these to mkdocs.yml:**
- Task docs (`TASK_*.md`) - internal only
- Temporary/scratch files
- Files marked as "internal only"
- TEAM_INBOX updates (communication doc)
- Archived documents

### Verification

```bash
# Run build to verify
mkdocs build

# Should see output like:
INFO    -  Building documentation...
INFO    -  Cleaning site directory
INFO    -  Documentation built in X.XX seconds

# Warnings about missing files are acceptable if intentional
```

---

## Task Completion Checklist

**Before marking ANY task complete, verify:**

```markdown
- [ ] Code synced to VM and tested (Handshake Rule)
- [ ] Git: committed to feature branch, pushed
- [ ] Docs updated per mapping above
- [ ] MkDocs wiki updated (if new doc created)
- [ ] MkDocs build passes: `mkdocs build`
- [ ] Completion message posted to TEAM_INBOX
- [ ] Ready for Jacob review
```

**Copy this checklist to every task document.**

---

## Documentation Hierarchy

### Tier 1: Source of Truth (NEVER duplicate)

| Document | Purpose | Update Frequency |
|----------|---------|------------------|
| `CLAUDE.md` | Agent instructions, rules, workflow | As needed |
| `AGENTS.md` | Codex-specific instructions (mirrors CLAUDE.md) | On CLAUDE.md changes |
| `docs/TEAM_INBOX.md` | Active tasks, sprint status | Daily |
| `docs/API_ENDPOINTS_INVENTORY.md` | All 40+ API endpoints | On API changes |
| `docs/DATA_STORES.md` | All data stores and schemas | On DB changes |

### Tier 2: Feature Specifications

| Document | Purpose | Update Frequency |
|----------|---------|------------------|
| `docs/CLIENTS_FEATURES_SPEC.md` | Clients module features and bugs | On feature changes |
| `docs/PRIVACY_FEATURES_SPEC.md` | Privacy algorithm features | On privacy changes |
| `docs/AI_STUDIO_PRD.md` | AI Studio chat features | On AI Studio changes |
| `docs/RAG_FEATURES_SPEC.md` | RAG document processing | On RAG changes |

### Tier 3: Process Documentation

| Document | Purpose | Update Frequency |
|----------|---------|------------------|
| `docs/GIT_WORKFLOW.md` | Git branching and commit rules | Rarely |
| `docs/DEV_WORKFLOW_DIAGRAM.md` | Development workflow (local → VM) | On workflow changes |
| `docs/DEV_PORTS.md` | All service ports on VM | On service changes |
| `docs/DOCUMENTATION_BIBLE.md` | This file | As needed |

### Tier 4: Task & Research Documents

| Type | Purpose | Lifecycle |
|------|---------|-----------|
| `TASK_*.md` | Temporary task assignments | Delete after completion |
| `RESEARCH_*.md` | Research reports | Archive after completion |
| `AUDIT_*.md` | Audit results | Archive after addressed |
| `BUG_REPORT_*.md` | Bug tracking | Delete after fixed |

---

## Common Documentation Tasks

### Task 1: Add New API Endpoint

**Files to update:**
1. `docs/API_ENDPOINTS_INVENTORY.md`
   - Add row to table with method, endpoint, description, authentication
2. Feature spec (e.g., `docs/CLIENTS_FEATURES_SPEC.md`)
   - Add to "Implemented Features" section

**Example:**
```markdown
## In API_ENDPOINTS_INVENTORY.md:
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/clients/{id}/archive` | Archive a client (soft delete) | Yes (JWT) |

## In CLIENTS_FEATURES_SPEC.md:
### Feature: Client Archiving
**Status:** ✅ Implemented
**Endpoint:** `POST /api/clients/{id}/archive`
**Description:** Soft delete clients with restore capability
```

### Task 2: Database Schema Change

**Files to update:**
1. `docs/DATA_STORES.md`
   - Update schema documentation
   - Add new tables/columns
2. Migration script
   - Create in `backend/migrations/`
3. Feature spec (if visible to users)

**Example:**
```markdown
## In DATA_STORES.md:
### clients table
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| archived_at | TEXT | Yes | ISO 8601 timestamp when client was archived (NULL = active) |
```

### Task 3: New PRD or Research Doc

**Files to update:**
1. Create the document: `docs/PRD_NEW_FEATURE.md`
2. Update `mkdocs.yml`:
   ```yaml
   - Feature Specs:
     - New Feature PRD: PRD_NEW_FEATURE.md
   ```
3. Test: `mkdocs build`

### Task 4: Update Feature Status

**Files to update:**
1. Feature spec (e.g., `docs/CLIENTS_FEATURES_SPEC.md`)
   - Move feature from "In Progress" to "Implemented"
   - Update bug count
2. `docs/TEAM_INBOX.md`
   - Move task from "Active" to "Completed"

---

## Documentation Quality Standards

### Writing Style

- **Clear and concise:** Avoid jargon, explain technical terms
- **Action-oriented:** Use active voice ("Update the file" not "The file should be updated")
- **Scannable:** Use headings, lists, tables
- **Complete:** Include examples, edge cases, troubleshooting

### Code Examples

```markdown
# Good example (with context)
```bash
# SSH to VM to check logs
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4
cd ~/EISLAWManagerWebApp
/usr/local/bin/docker-compose-v2 logs api --tail=50
```

# Bad example (no context)
```bash
docker logs api
```
```

### Tables

Use tables for:
- Structured data (API endpoints, database schemas)
- Comparisons (before/after, options)
- Mappings (if X changed → update Y)

**Format:**
```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Value 1  | Value 2  | Value 3  |
```

### Links

- **Internal docs:** Use relative paths: `docs/TEAM_INBOX.md`
- **External docs:** Use full URLs with descriptive text: `[Anthropic Skills](https://docs.claude.com/skills)`
- **Code references:** Use file:line format: `backend/api/clients.py:42`

### Status Indicators

Use emojis for status (consistent with TEAM_INBOX):
- ✅ Complete / Implemented
- 🔄 In Progress / Active
- ❌ Blocked / Cancelled
- ⏸️ On Hold / Paused
- 🟢 Ready to Start
- ⚠️ Warning / Attention Needed

### Version Control

- **Always commit docs with code changes** (same branch)
- **Descriptive commit messages:** "CLI-009: Update API endpoints inventory"
- **Atomic commits:** One logical change per commit

---

## Quick Reference

### Before Marking Task Complete

1. ✅ Identify affected docs using mapping table
2. ✅ Update each doc (Read → Edit → Verify)
3. ✅ Add new doc to mkdocs.yml (if applicable)
4. ✅ Run `mkdocs build` to verify
5. ✅ Commit docs with clear message
6. ✅ Check task completion checklist

### Documentation Mapping Quick Reference

**API change?** → `API_ENDPOINTS_INVENTORY.md`
**DB change?** → `DATA_STORES.md`
**Module change?** → `{MODULE}_FEATURES_SPEC.md`
**New doc?** → `mkdocs.yml`
**Ports/services?** → `DEV_PORTS.md`

### Common Commands

```bash
# Test MkDocs build
mkdocs build

# Serve docs locally
mkdocs serve

# Check for broken links
mkdocs build --strict
```

---

## References

- CLAUDE.md §7: Task Management
- CLAUDE.md §8: Key Rules
- docs/TEAM_INBOX.md: Active tasks
- mkdocs.yml: Wiki navigation
- .claude/skills/automation/working-memory-refresh/: Sprint documentation
