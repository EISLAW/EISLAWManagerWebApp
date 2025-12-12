# TASK: VM Storage Migration Research

**Task ID:** STORAGE-001
**Assigned To:** David (Senior Product)
**Assigned By:** Joe
**Date Assigned:** 2025-12-12
**Status:** 🔄 NEW
**Branch:** feature/STORAGE-001
**Model:** Codex (default for David)

---

## Task Overview

Research and create a comprehensive plan to migrate files from Azure VM disk storage to Azure Blob Storage and/or SharePoint. The goal is to free up VM disk space and make the system more scalable by moving the VM toward a stateless architecture.

**Context:** CEO asked: "Is there a reason we store anything (such as the emails) on the VM?" The answer is no - storing large files on VM disk is expensive, risky, and doesn't scale. This research will identify what can be moved and how.

---

## Objectives

1. **Analyze current VM storage usage** - SSH to VM and identify what's stored on disk
2. **Categorize files** - Determine what should stay on VM vs move to Blob/SharePoint
3. **Map database dependencies** - Identify all database tables/columns that reference file paths
4. **Create migration plan** - Step-by-step plan with code changes, DB migrations, cost analysis
5. **Produce comprehensive research document** with recommendations for implementation

---

## Detailed Requirements

### 1. VM Storage Analysis

**SSH to VM and analyze disk usage:**

```bash
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4

# Analyze disk usage
df -h
du -h --max-depth=2 /home/azureuser | sort -hr | head -20
du -h --max-depth=2 ~/EISLAWManagerWebApp | sort -hr | head -20

# Look for specific data directories
ls -lah ~/emails/
ls -lah ~/EISLAWManagerWebApp/backend/uploads/
ls -lah ~/EISLAWManagerWebApp/backend/storage/
find ~/EISLAWManagerWebApp -type f -name "*.eml" -o -name "*.pdf" -o -name "*.docx" | head -20
find /home/azureuser -type f -size +10M | head -20
```

**Deliverable:** Markdown table showing:
- Directory path
- Current size
- File types stored
- Purpose (emails, uploads, logs, etc.)
- Can be moved? (Yes/No/Maybe)

### 2. File Categorization

**Create a decision matrix for what to move:**

| Storage Location | What Should Be Here | What Shouldn't Be Here |
|------------------|---------------------|------------------------|
| **VM Disk** | Application code (Docker containers)<br>PostgreSQL database<br>Config files<br>Short-term logs (rotated) | Emails<br>Client documents<br>Backups<br>Large exports<br>Media files |
| **Azure Blob Storage** | Emails (.eml files)<br>Email attachments<br>Backups<br>Large exports/reports<br>Logs archives | Application code<br>Database files<br>Config files |
| **SharePoint** | Client documents (already there)<br>Templates<br>Shared files | System logs<br>Application data |

**Deliverable:** Table categorizing every file type currently on VM

### 3. Database Schema Analysis

**Find all database references to file paths:**

```bash
# On VM, check SQLite databases
cd ~/EISLAWManagerWebApp/backend

# Search for file path columns
sqlite3 eislaw.db "SELECT sql FROM sqlite_master WHERE type='table';" | grep -i 'path\|file\|url'

# Search for email-related tables
sqlite3 eislaw.db ".schema" | grep -i email

# Check what tables might reference files
sqlite3 eislaw.db "SELECT name FROM sqlite_master WHERE type='table';"
```

**Also check:**
- `backend/models/` - SQLAlchemy models that reference files
- `backend/api/` - API endpoints that save/retrieve files
- `docs/DATA_STORES.md` - Current data architecture documentation

**Deliverable:** Table of database schema changes needed:

| Table | Column | Current Type | New Type | Migration Required |
|-------|--------|--------------|----------|-------------------|
| `emails` | `file_path` | `TEXT` (local path) | `blob_url` (Azure URL) | Yes - migrate existing records |
| ... | ... | ... | ... | ... |

### 4. Azure Blob Storage Research

**Research Azure Blob Storage setup:**

- Pricing: Hot vs Cool vs Archive tiers
- SDK usage: `azure-storage-blob` Python library
- Authentication: Connection string vs managed identity
- Container structure: How to organize files
- Security: Access control, SAS tokens

**Example code pattern to include:**

```python
from azure.storage.blob import BlobServiceClient

# Upload email to Blob
blob_client = blob_service.get_blob_client(
    container="eislaw-emails",
    blob=f"{client_id}/{email_id}.eml"
)
blob_client.upload_blob(email_content)

# Get URL for database
blob_url = blob_client.url
# Store blob_url in PostgreSQL instead of file_path
```

**Deliverable:** Code examples and cost estimates

### 5. Migration Plan

**Create step-by-step implementation plan:**

**Phase 1: Setup Azure Blob**
- Create Azure Storage Account
- Create containers (eislaw-emails, eislaw-backups, eislaw-exports)
- Configure access policies
- Add credentials to secrets.local.json

**Phase 2: Update Backend Code**
- Install `azure-storage-blob` in requirements.txt
- Create `backend/services/blob_storage.py` helper
- Update email ingestion endpoints to save to Blob
- Update file retrieval endpoints to fetch from Blob

**Phase 3: Database Migration**
- Add new columns (e.g., `blob_url`) to relevant tables
- Create migration script to move existing files to Blob
- Update database records with new URLs
- Verify data integrity

**Phase 4: Cleanup**
- Archive or delete migrated files from VM
- Monitor disk usage reduction
- Update documentation

**Deliverable:** Detailed migration plan with code snippets

### 6. Cost Analysis

**Compare costs:**

| Storage Type | Current Cost (estimate) | Post-Migration Cost | Monthly Savings |
|--------------|------------------------|---------------------|-----------------|
| VM Disk (128GB) | ~$25-40 | ~$10-15 (smaller disk) | ~$15-25 |
| Azure Blob (Hot) | $0 | ~$2-5 (for 100GB) | -$2-5 |
| **Total** | ~$25-40 | ~$12-20 | ~$13-20/month |

**Annual savings estimate:** ~$150-240/year

**Deliverable:** Cost comparison table with assumptions documented

---

## Key Questions to Answer

1. **What's currently stored on VM disk?** (file types, sizes, locations)
2. **What can be moved to Blob?** (emails, documents, backups, logs)
3. **What must stay on VM?** (code, configs, database)
4. **What database changes are needed?** (new columns, migrations)
5. **What's the migration complexity?** (simple, moderate, complex)
6. **What's the cost/benefit?** (savings vs implementation effort)
7. **Are there any risks?** (data loss, downtime, performance)

---

## References

**Documentation to read:**
- `docs/DATA_STORES.md` - Current data architecture
- `docs/API_ENDPOINTS_INVENTORY.md` - API endpoints that handle files
- `docs/RAG_FEATURES_SPEC.md` - Email/document indexing system
- `CLAUDE.md` §3 - VM configuration and services
- Azure Blob Storage docs: https://learn.microsoft.com/en-us/azure/storage/blobs/

**VM Access:**
```bash
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4
cd ~/EISLAWManagerWebApp
```

---

## Deliverables

Create a comprehensive research document: `docs/RESEARCH_VM_STORAGE_MIGRATION.md`

**Document should include:**

1. **Executive Summary** - Key findings and recommendations (1 page)
2. **Current State Analysis** - What's on VM disk now (with disk usage table)
3. **File Categorization** - What stays vs what moves (decision matrix)
4. **Database Impact Analysis** - Schema changes needed (table)
5. **Azure Blob Architecture** - Container structure, code patterns, security
6. **Migration Plan** - Phased implementation steps (detailed)
7. **Cost Analysis** - Before/after comparison with ROI calculation
8. **Risk Assessment** - Potential issues and mitigations
9. **Recommendations** - Priority order (emails first, then backups, etc.)
10. **Appendix** - Code examples, commands, reference links

**Format:** Markdown, well-structured with clear headings, tables, and code blocks.

---

## Success Criteria

- [ ] VM disk usage analyzed and documented
- [ ] All file types categorized (stay vs move)
- [ ] Database schema impact mapped completely
- [ ] Azure Blob setup and code examples provided
- [ ] Step-by-step migration plan created
- [ ] Cost analysis completed with savings estimate
- [ ] Research document created and comprehensive
- [ ] MkDocs navigation updated (`mkdocs.yml`)
- [ ] Completion message posted to TEAM_INBOX

---

## Git Workflow

**CRITICAL GIT RULES:**
- Work on branch: `feature/STORAGE-001` (already created by Joe)
- DO NOT git commit or push (Jacob will do this after review)
- Save all work locally only
- Post completion to TEAM_INBOX when done

---

## Notes

**This is a research task, not an implementation task.** You are NOT expected to:
- ❌ Implement Azure Blob integration (that's a future task for Alex)
- ❌ Migrate actual files (that's a future task with CEO approval)
- ❌ Make database schema changes (research only)

**You ARE expected to:**
- ✅ Analyze what's currently on the VM
- ✅ Recommend what should be moved
- ✅ Create a detailed plan for HOW to migrate
- ✅ Provide cost/benefit analysis to help CEO decide
- ✅ Write code examples to guide implementation

---

## Chat Integration

**Post progress updates using the Python helper:**

```python
from tools.agent_chat import post_start, post_completion, post_message

# When starting work
post_start('David', 'STORAGE-001', 'VM Storage Migration Research', 'feature/STORAGE-001', '3-4 hours')

# During work (optional progress updates)
post_message('David', 'STORAGE-001', 'Completed VM disk analysis - 45GB in emails/', channel='agent-tasks')

# When complete
post_completion(
    'David', 'STORAGE-001',
    'VM Storage Migration Research',
    'Research doc created with migration plan and cost analysis',
    '3.5 hours', 'abc123def',
    'Jacob review',
    'STORAGE-002 (Alex implementation)'
)
```

---

**Questions?** Post to `#agent-tasks` or update TEAM_INBOX Messages TO Joe section.

**Ready to begin!** 🚀
