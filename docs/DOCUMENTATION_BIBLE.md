# DOCUMENTATION BIBLE

**Purpose:** Single source of truth for all documentation rules, patterns, and maintenance procedures.
**Owner:** David (Senior Product)
**Last Updated:** 2025-12-12
**Status:** ✅ Active

> **Quick Rule:** Every completed task MUST update documentation. Use the mapping below. Task is NOT complete until docs are updated. Jacob verifies.

---

## Table of Contents

1. [Core Rules](#core-rules)
2. [Document Update Mapping](#document-update-mapping)
3. [MkDocs Wiki Update Rules](#mkdocs-wiki-update-rules)
4. [Document Patterns](#document-patterns)
5. [Content Standards](#content-standards)
6. [Memory System Architecture](#memory-system-architecture)
7. [Episodic Memory Log Rules](#episodic-memory-log-rules)
8. [Task Completion Checklist](#task-completion-checklist)
9. [Quick Reference & Examples](#quick-reference--examples)

---

## Core Rules

### Rule 1: Docs Update Rule (MANDATORY)

**Every completed task MUST update relevant documentation using the mapping in Section 2.**

**Process:**
1. Complete the task (code, features, fixes)
2. Identify what changed (API endpoint, DB schema, module, etc.)
3. Find corresponding doc in the mapping table
4. Update that doc with current state
5. Jacob verifies during code review - **task NOT approved until docs are updated**

**Principle:** Documentation is not optional. It's part of the deliverable.

---

### Rule 2: MkDocs Wiki Update Rule (MANDATORY)

**When creating a NEW documentation file (research report, PRD, spec), you MUST update `mkdocs.yml`.**

**Who this applies to:**
- **David** (all PRDs, research reports, feature specs)
- **Noa** (legal/marketing docs)
- Any agent creating user-facing documentation

**When it DOES NOT apply:**
- Task docs (`TASK_*.md`) - internal only, not for wiki
- Temporary/scratch files
- Files explicitly marked as "internal only"
- TEAM_INBOX updates (communication doc)

**Process:**
1. Create the document (e.g., `docs/RESEARCH_NEW_TOPIC.md`)
2. Open `mkdocs.yml` in the project root
3. Add entry to appropriate nav section:
   ```yaml
   nav:
     - Agent Orchestration & CLI:
       - Model Research:
         - Your New Doc: RESEARCH_NEW_TOPIC.md  # <-- Add this line
   ```
4. Test build from project root:
   ```bash
   mkdocs build
   ```
5. If build succeeds (no errors), you're done. If it fails, fix path or structure.

**Navigation Sections (choose the most appropriate):**
- **Agent Orchestration & CLI** → Model research, agent status docs
- **Feature Specs** → PRDs, architecture docs, feature specifications
- **Developer Resources** → Setup guides, tools, troubleshooting
- **API Documentation** → API specs, endpoint inventory

**Verification:**
- `mkdocs build` output must show zero errors
- Warnings about missing files acceptable only if intentional
- Links should not be broken (test by checking build output)

---

### Rule 3: Build Order (Mandatory Sequence)

When implementing features, follow this sequence:

```
Database → API → Frontend → Test → Docs
```

**Why this order matters:**
- Database schema must exist before API can use it
- API must exist before frontend can call it
- Tests validate everything works together
- Docs come last to reflect final implementation

**Exception:** Docs can be drafted in parallel with code, but must be finalized after code is complete.

---

### Rule 4: Handshake Rule

**No task is DONE until verified working end-to-end on VM.**

**Process:**
1. Complete implementation locally
2. Push to GitHub (auto-syncs to VM)
3. Test on VM at: `http://20.217.86.4:5173` (frontend) or `http://20.217.86.4:8799` (API)
4. Run relevant tests
5. Only then mark complete

**Why:** Local verification isn't enough. Production behavior may differ.

---

### Rule 5: Skeptical User Review

**Click EVERY button as a real user would before marking complete.**

**Process:**
1. Open the feature on VM
2. Go through each user journey in the PRD
3. Test edge cases and error scenarios
4. Verify visual design matches Design System
5. Check mobile responsiveness (if UI feature)
6. Only then report as complete

---

## Document Update Mapping

**Use this table to determine which doc to update based on what you changed.**

| If you changed... | Update this doc | Why | Examples |
|-------------------|-----------------|-----|----------|
| **API endpoint (add/change/remove)** | `docs/API_ENDPOINTS_INVENTORY.md` | Source of truth for all API endpoints | New POST /clients endpoint, changed GET /tasks filter, removed deprecated endpoint |
| **Database table/column** | `docs/DATA_STORES.md` | Schema documentation and data location map | Added `sharepoint_url` column, created `email_archive` table, changed column type |
| **Clients module** | `docs/CLIENTS_FEATURES_SPEC.md` | Feature count, working/broken list | Added archive feature, fixed search bug, new contact type |
| **Privacy module** | `docs/PRIVACY_FEATURES_SPEC.md` | Privacy algorithm, scoring, features | Updated algorithm, fixed scoring bug, new question type |
| **AI Studio module** | `docs/AI_STUDIO_PRD.md` | AI features, models, capabilities | Added new model, changed prompt, fixed tool issue |
| **RAG module** | `docs/RAG_FEATURES_SPEC.md` | RAG features, search, indexing | Fixed search results, added transcription, updated index |
| **Agent orchestration** | `docs/AGENT_ORCHESTRATION_STATUS.md` | Agent definitions, workflows, status | Added new agent, changed workflow, updated spawn rules |
| **Marketing/forms** | `docs/MARKETING_BIBLE.md` | Marketing copy, campaign status, forms | Changed email template, updated landing page, new form field |
| **Docker/ports/services** | `docs/DEV_PORTS.md` + CLAUDE.md §3 | Service ports, URLs, startup commands | Added new service, changed port, updated docker-compose |
| **New skills/procedures** | `docs/WORKING_MEMORY.md` | Current procedures, team assignments | New testing checklist, changed git workflow, new debugging procedure |
| **Framework/tool changes** | `docs/INDEX.md` or specific module doc | Dependency updates, version changes | Updated React version, changed build tool, new library |

**Key Principle:** If it exists in code, it should be documented. If it changes, documentation should change.

---

## MkDocs Wiki Update Rules

### Navigation Structure

The wiki is organized in `mkdocs.yml` under these top-level sections:

```yaml
nav:
  - Home
  - Agent Orchestration & CLI:
    - Overview
    - Model Research
    - Agent Status
  - Feature Specs:
    - PRDs
    - Architecture
    - Specifications
  - Developer Resources:
    - Setup & Installation
    - Development Workflow
    - Troubleshooting
  - API Documentation:
    - Endpoints
    - Schema
    - Examples
```

### Adding a New Document

**Step 1: Create the file**
```bash
# Example: Creating a new PRD
touch docs/PRD_NEW_FEATURE.md

# Or new research report
touch docs/RESEARCH_TOPIC_NAME.md
```

**Step 2: Add to mkdocs.yml**

Find the appropriate section. Example for a new PRD:
```yaml
  - Feature Specs:
    - PRDs:
      - New Feature: PRD_NEW_FEATURE.md  # <-- Add this
```

**Step 3: Test the build**
```bash
cd C:\Coding Projects\EISLAW System Clean
mkdocs build
```

Should complete with zero errors. If it fails, check:
- File path is correct
- YAML indentation is proper (2 spaces per level)
- File exists at specified path

**Step 4: Commit and push**
```bash
git add mkdocs.yml docs/PRD_NEW_FEATURE.md
git commit -m "TASK-ID: Add new feature PRD"
git push origin feature/TASK-ID
```

### Document Structure for New Docs

**Every new doc should have this structure:**

```markdown
# Document Title

**Purpose:** Single sentence explaining why this doc exists
**Owner:** Person/team responsible for maintenance
**Last Updated:** YYYY-MM-DD
**Status:** Active | Archived | Draft

---

[Your content here]

---

**See Also:**
- Related doc 1
- Related doc 2
```

---

## Document Patterns

### Task Document Pattern

**Pattern:** `TASK_{AGENT}_{DESCRIPTION}.md`

**Examples:**
- `TASK_ALEX_STORAGE_MIGRATION.md`
- `TASK_JOSEPH_DATABASE_BACKUP.md`
- `TASK_MAYA_ACCESSIBILITY_AUDIT.md`

**Contents:**
- Objective and context
- Detailed checklist
- Implementation steps or code
- Testing requirements
- Completion report template

**Storage:** Internal only (not in wiki)
**Lifespan:** Archived after completion to `TEAM_INBOX_ARCHIVE.md`

---

### Research Report Pattern

**Pattern:** `RESEARCH_{TOPIC}_{DATE}.md` or `RESEARCH_{TOPIC}_ARCHITECTURE.md`

**Examples:**
- `RESEARCH_SKILLS_ARCHITECTURE.md`
- `RESEARCH_VM_STORAGE_MIGRATION.md`
- `RESEARCH_WORKFLOW_2025_12_11.md`

**Contents:**
- Executive summary
- Background and context
- Detailed findings
- Recommendations
- Appendices (detailed data, test results, etc.)

**Storage:** Wiki (add to mkdocs.yml)
**Status:** Updated as implementation progresses

---

### PRD (Product Requirements Document) Pattern

**Pattern:** `PRD_{FEATURE_NAME}.md`

**Examples:**
- `PRD_CLIENT_ARCHIVE.md`
- `PRD_QUOTE_TEMPLATES.md`
- `PRD_MKDOCS_WIKI.md`

**Contents:**
- Overview and motivation
- User journeys
- Requirements (feature list)
- Technical architecture
- Data model
- API endpoints
- Testing criteria
- Acceptance criteria

**Storage:** Wiki (add to mkdocs.yml)
**Status:** Living document, updated as feature evolves

---

### Feature Spec Pattern

**Pattern:** `{MODULE}_FEATURES_SPEC.md`

**Examples:**
- `CLIENTS_FEATURES_SPEC.md`
- `PRIVACY_FEATURES_SPEC.md`
- `RAG_FEATURES_SPEC.md`

**Contents:**
- Module overview
- Feature list with counts
- What's working (fully implemented features)
- What's broken (bugs, missing features)
- Status definitions
- Update procedure
- Historical change log

**Storage:** Permanent reference (in docs folder)
**Update:** After every bug fix or feature completion

---

### Audit Report Pattern

**Pattern:** `AUDIT_{AREA}_{DATE}.md` or `AUDIT_RESULTS_{AGENT}_{AREA}.md`

**Examples:**
- `AUDIT_RESULTS_SARAH_UX.md`
- `AUDIT_ACCESSIBILITY_2025_12.md`
- `AUDIT_API_ENDPOINTS.md`

**Contents:**
- Scope of audit
- Methodology
- Findings (organized by severity)
- Recommendations
- Action items
- Timeline for fixes

**Storage:** Wiki (add to mkdocs.yml)
**Status:** Active until addressed, then archived

---

## Content Standards

### Writing Style

**Tone:** Professional, clear, action-oriented
**Audience:** Team members (not end users)
**Length:** As long as needed; section summaries at top for long docs

### Formatting Rules

**Headers:**
- Use `#` for main title (only one per doc)
- Use `##` for major sections
- Use `###` for subsections
- Use `####` for sub-subsections

**Code blocks:**
- Use triple backticks with language: ````python`, ````bash`, ````json`
- Include comments explaining non-obvious lines
- Real examples are better than abstract ones

**Tables:**
- Use for structured data (features, API endpoints, etc.)
- Include headers and column descriptions
- Keep columns logically ordered

**Links:**
- Always use relative paths: `../docs/OTHER.md` (not absolute paths)
- Test links in wiki builds
- Link to specific sections when possible: `API.md#authentication`

**Status indicators:**
- ✅ Complete / ✅ Done
- 🔄 In Progress
- ❌ Blocked / ❌ Issue
- ⏸️ On Hold
- 🟢 Ready
- 🟡 Partial
- 🔴 Critical

---

### Mandatory Sections

**Every documentation file should include:**

1. **Title + Metadata**
   ```markdown
   # Document Title

   **Purpose:** What is this doc for?
   **Owner:** Who maintains it?
   **Last Updated:** YYYY-MM-DD
   **Status:** Active | Draft | Archived
   ```

2. **Quick Reference / TL;DR** (if doc > 500 words)
   ```markdown
   ## Quick Reference

   - Key fact 1
   - Key fact 2
   - Key fact 3
   ```

3. **Table of Contents** (if doc has 5+ major sections)
   ```markdown
   ## Table of Contents

   1. [Section 1](#section-1)
   2. [Section 2](#section-2)
   ```

4. **See Also / Related Docs** (at bottom)
   ```markdown
   ---

   **See Also:**
   - Related doc 1
   - Related doc 2
   ```

---

## Memory System Architecture

The EISLAW system has three distinct memory layers, each serving a different purpose.

### Layer 1: Working Memory (`docs/WORKING_MEMORY.md`)

**Purpose:** Ephemeral context for the current session

**Contents:**
- Current sprint status
- Team assignments and blockers
- In-session task references
- Recent decisions and context

**Rules:**
- Cleared at session end by design
- Lives entirely in context during session
- Never used for persistent patterns
- Updated only when major decisions made

**Update:** During active sprint planning and at sprint end

**Owner:** Joe (CTO) - updated during sprint reviews

---

### Layer 2: Episodic Memory (`docs/Testing_Episodic_Log.md`)

**Purpose:** Persistent record of meaningful experiences, lessons, and patterns

**Contents:**
- Lessons learned (what worked, what didn't)
- Bug patterns (recurring issues)
- Failure modes (what to watch for)
- Success patterns (what to repeat)
- System changes (when and why)
- MEMORIZE rules (critical lessons)

**Rules:**
- Updated only after completing a task or fixing a non-trivial bug
- Enables behavioral improvement across sessions
- Not for raw logs, transcripts, or temporary state
- Entries should be meaningful and actionable

**Format:**
```markdown
## {Date} - {Category}

**Issue:** What happened?
**Root Cause:** Why did it happen?
**Solution:** What we did about it
**MEMORIZE:** Future prevention rule
```

**Update:** After fixing bugs, completing sprints, or recognizing patterns

**Owner:** All team members (log when they learn)

---

### Layer 3: Semantic Memory (`docs/INDEX.md`)

**Purpose:** Stable domain knowledge, rules, schemas, specifications

**Contents:**
- Architecture rules and conventions
- Tool documentation
- Process specifications
- Framework guidelines
- API schemas
- Data models
- Best practices

**Rules:**
- Structured, slower-changing, requires controlled updates
- Versioned reference material
- Never used for session-specific reasoning
- Pruned based on relevance

**Update:** When domain knowledge evolves (new tools, architectural changes)

**Owner:** David (Product) with input from subject matter experts

---

## Episodic Memory Log Rules

### Purpose

The Episodic Log enables the team to learn from experience and avoid repeating mistakes.

### What to Log

**Log when:**
- You fix a non-trivial bug (not typos)
- You complete a major feature
- You discover a pattern (recurring issue)
- You hit an unexpected limitation
- You learn something valuable about the system
- The system breaks and you need to fix it

**Don't log:**
- Trivial changes (typos, formatting)
- Temporary state or session context
- Raw logs or command output
- Detailed reasoning steps

### Format

Each entry should follow this structure:

```markdown
## {Date} - {Category}: {Short Description}

**What Happened:**
{1-2 sentences explaining the issue/discovery}

**Root Cause:**
{Why did it happen? What was the underlying reason?}

**What We Did:**
{How did we fix or resolve it?}

**Why It Matters:**
{Impact: what would have happened if we didn't fix it?}

**MEMORIZE - Future Prevention:**
{Concrete rule for avoiding this in future}

**Related Docs:**
{Links to related documentation}
```

### Example Entries

```markdown
## 2025-12-11 - Bug Fix: WebSocket Timeout on VM

**What Happened:**
Socket connection hangs after 60 seconds on the Azure VM, causing tests to fail.

**Root Cause:**
Azure Load Balancer has 60-second idle timeout; our keep-alive was set to 90 seconds.

**What We Did:**
Changed keep-alive interval to 45 seconds in config; added health check endpoint.

**Why It Matters:**
Without this fix, all long-running connections drop, breaking real-time features.

**MEMORIZE - Future Prevention:**
RULE: Always check cloud provider's default timeouts (Azure LB = 60s) and set keep-alives to 50% of that.

**Related Docs:**
- docs/DEV_PORTS.md (service timeouts section)
- CLAUDE.md §1D (VM connection rules)
```

```markdown
## 2025-12-10 - Pattern: SQLite Lock Contention

**What Happened:**
Database locks occur when multiple API workers write to SQLite simultaneously.

**Root Cause:**
SQLite is single-writer; using WAL mode would help, but our Docker mount doesn't support it.

**What We Did:**
Implemented connection pooling with serialization; added queue for writes.

**Why It Matters:**
Without this, concurrent writes cause random failures, making prod unreliable.

**MEMORIZE - Future Prevention:**
RULE: SQLite + Docker = single writer only. Use PostgreSQL for multi-writer scenarios.

**Related Docs:**
- backend/database.py (connection pooling implementation)
- STORAGE-001 research (database migration plan)
```

### When to Add Entries

- After completing a task with significant learning
- After fixing a bug that took >1 hour to diagnose
- After discovering a system limitation
- After recognizing a pattern (recurring issue)
- After a production incident

### Pruning the Log

- **Quarterly:** Review and remove duplicate entries
- **Semi-annually:** Archive entries >6 months old that are no longer relevant
- **When:** A MEMORIZE rule becomes part of standard process, it can move to CLAUDE.md

---

## Task Completion Checklist

**Use this checklist before marking ANY task complete.**

### Pre-Completion Verification

- [ ] **Code Quality**: Matches PRD/spec requirements?
- [ ] **Tests**: All tests passing (if applicable)?
- [ ] **Handshake Rule**: Verified working end-to-end on VM?
- [ ] **User Journey**: Clicked every button as a real user would?

### Documentation Updates

- [ ] **Identified what changed** (API endpoint, DB schema, module, etc.)
- [ ] **Found corresponding doc** in the mapping (Section 2)
- [ ] **Updated that doc** with current state
- [ ] **Jacob will verify** during code review

### Git & Sync

- [ ] **Committed locally** (git add -A && git commit -m "TASK-ID: summary")
- [ ] **Pushed to GitHub** (git push origin feature/TASK-ID)
- [ ] **Auto-synced to VM** (GitHub Action triggered, code is on VM)
- [ ] **Verified on VM** at http://20.217.86.4:5173 or http://20.217.86.4:8799

### MkDocs (if creating new doc)

- [ ] **Updated mkdocs.yml** (added entry to appropriate nav section)
- [ ] **Ran mkdocs build** (zero errors)
- [ ] **Tested navigation** (links work, doc appears in wiki)

### Completion Report

- [ ] **Posted to TEAM_INBOX** "Messages TO Joe" section
- [ ] **Included summary** of what was done
- [ ] **Linked to deliverables** (code, docs, tests)
- [ ] **Ready for Jacob review**

---

## Quick Reference & Examples

### Example: Documenting a New API Endpoint

**Scenario:** You added a new endpoint `POST /clients/{id}/archive`

**Docs to update:**
1. `docs/API_ENDPOINTS_INVENTORY.md` - Add endpoint details
2. `docs/CLIENTS_FEATURES_SPEC.md` - Note new feature
3. TEAM_INBOX - Post completion message

**Process:**

1. **Update API_ENDPOINTS_INVENTORY.md:**
   ```markdown
   ### Archive a Client

   **Endpoint:** `POST /clients/{id}/archive`
   **Auth:** Required (login)
   **Input:**
   ```json
   {
     "reason": "string (optional)",
     "soft_delete": boolean
   }
   ```
   **Output:**
   ```json
   {
     "client_id": 123,
     "archived_at": "2025-12-12T10:30:00Z",
     "archived_by": "user_email"
   }
   ```
   **Status:** ✅ Implemented
   ```

2. **Update CLIENTS_FEATURES_SPEC.md:**
   ```markdown
   | Feature | Status | Notes |
   |---------|--------|-------|
   | Archive client (soft delete) | ✅ Working | POST /clients/{id}/archive |
   | Restore archived client | ✅ Working | POST /clients/{id}/restore |
   ```

3. **Post to TEAM_INBOX:**
   ```markdown
   | **Alex** | ✅ **COMPLETE** | **CLI-007**: Implemented POST /clients/{id}/archive endpoint with soft-delete. Updated API_ENDPOINTS_INVENTORY.md and CLIENTS_FEATURES_SPEC.md. Ready for Jacob review. |
   ```

---

### Example: Documenting a Database Schema Change

**Scenario:** You added `archived_at` and `archived_by` columns to the `clients` table

**Docs to update:**
1. `docs/DATA_STORES.md` - Update table schema
2. `backend/migrations/` - Create migration file
3. TEAM_INBOX - Post completion message

**Process:**

1. **Update DATA_STORES.md:**
   ```markdown
   ### clients (SQLite table)

   **Purpose:** EISLAW clients data
   **Location:** `backend/eislaw.db`

   **Schema:**
   | Column | Type | Purpose | Nullable |
   |--------|------|---------|----------|
   | id | INTEGER | Primary key | No |
   | name | TEXT | Client legal name | No |
   | email | TEXT | Contact email | Yes |
   | archived_at | TIMESTAMP | When archived (NULL if active) | Yes |
   | archived_by | TEXT | Email of user who archived | Yes |

   **Indexes:**
   - PRIMARY KEY: id
   - UNIQUE: email
   - INDEX: archived_at (for filtering active clients)

   **Last Updated:** 2025-12-12
   ```

2. **Create migration file:**
   ```python
   # backend/migrations/008_add_archive_columns.py

   def migrate_up(db):
       cursor = db.cursor()
       cursor.execute("""
           ALTER TABLE clients ADD COLUMN archived_at TIMESTAMP NULL;
           ALTER TABLE clients ADD COLUMN archived_by TEXT NULL;
           CREATE INDEX idx_clients_archived_at ON clients(archived_at);
       """)
       db.commit()

   def migrate_down(db):
       cursor = db.cursor()
       cursor.execute("""
           DROP INDEX idx_clients_archived_at;
           ALTER TABLE clients DROP COLUMN archived_by;
           ALTER TABLE clients DROP COLUMN archived_at;
       """)
       db.commit()
   ```

---

### Example: Creating a New PRD

**Scenario:** You're creating a PRD for a new "Quote Templates" feature

**Process:**

1. **Create the file:** `docs/PRD_QUOTE_TEMPLATES.md`

2. **Structure:**
   ```markdown
   # PRD: Quote Templates

   **Purpose:** Allow users to create reusable quote templates
   **Owner:** David (Product)
   **Last Updated:** 2025-12-12
   **Status:** Active

   ## Overview
   [Brief description]

   ## User Journeys
   [Detailed workflows]

   ## Requirements
   [Feature list]

   ## Technical Design
   [Architecture, data model, APIs]

   ## Testing Criteria
   [Acceptance tests]

   ## Success Metrics
   [How to measure success]
   ```

3. **Update mkdocs.yml:**
   ```yaml
   nav:
     - Feature Specs:
       - PRDs:
         - Quote Templates: PRD_QUOTE_TEMPLATES.md  # <-- Add this
   ```

4. **Test build:**
   ```bash
   mkdocs build
   ```

5. **Commit:**
   ```bash
   git add docs/PRD_QUOTE_TEMPLATES.md mkdocs.yml
   git commit -m "TASK-ID: Add Quote Templates PRD"
   git push origin feature/TASK-ID
   ```

---

### Example: Logging a Bug Fix to Episodic Memory

**Scenario:** You fixed a bug where email imports were duplicating messages

**Episodic Log Entry:**

```markdown
## 2025-12-12 - Bug Fix: Email Import Duplication

**What Happened:**
Running email import twice created duplicate messages in the database.

**Root Cause:**
Missing UNIQUE constraint on (email_message_id, client_id) combination in messages table.
Import script had no idempotency check before INSERT.

**What We Did:**
(1) Added UNIQUE constraint to messages table
(2) Modified import script to check for existing message before insert
(3) Re-ran import; no more duplicates

**Why It Matters:**
Duplicates cause UI confusion and wrong message counts, making the system look broken.

**MEMORIZE - Future Prevention:**
RULE: Every table that receives external data (emails, documents, etc.) must have UNIQUE constraint
on the external ID. Import scripts must always check for existence before INSERT.

**Related Docs:**
- docs/DATA_STORES.md (messages table schema)
- backend/tools/email_sync_graph.py (import implementation)
- backend/migrations/007_add_email_unique_constraint.py
```

---

## Related Documentation

**See Also:**
- `CLAUDE.md` - Core rules and workflow
- `API_ENDPOINTS_INVENTORY.md` - All API endpoints
- `DATA_STORES.md` - Database schema and data locations
- `TEAM_INBOX.md` - Current tasks and team communication
- `Testing_Episodic_Log.md` - Lessons learned and patterns
- `WORKING_MEMORY.md` - Current sprint context
- `INDEX.md` - Semantic memory and stable references

---

**This document is the single source of truth for documentation rules. Update it when processes change.**
