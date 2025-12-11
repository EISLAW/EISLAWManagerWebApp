# Task: main.py Refactoring

**Assigned To:** Alex (Engineering Senior)
**Date:** 2025-12-05
**Priority:** P2
**Status:** IN PROGRESS - Phase 2 Complete

---

## Progress Update (2025-12-05)

**Phase 1 Complete:** Created routers directory and extracted clients + tasks modules.

| File | Lines | Status |
|------|-------|--------|
| routers/__init__.py | 11 | Created |
| routers/clients.py | 102 | Created |
| routers/tasks.py | 172 | Created |

**Endpoints tested and working:**
- GET /api/clients
- GET /api/clients/{cid}
- GET /api/tasks
- GET /api/tasks/{task_id}
- 404 returns properly for missing resources

**Note:** Old routes still exist in main.py (duplicates). First route wins in FastAPI, so new routers take precedence. Duplicates will be removed in Phase 2 after validation.

---

## Task Overview

Once Joseph is done, refactor `main.py` (currently 2,765 lines) into smaller, maintainable modules.

---

## Current State

| Metric | Value |
|--------|-------|
| File | `backend/main.py` |
| Lines | 2,765 |
| Endpoints | 77 |
| Issue | Too large, hard to maintain |

---

## Proposed Module Structure

```
backend/
├── main.py              # App entry, CORS, startup (< 100 lines)
├── db.py                # Database module (Joseph created)
├── db_backup.py         # Backup utilities (Joseph created)
├── routers/
│   ├── __init__.py
│   ├── clients.py       # /api/clients endpoints
│   ├── tasks.py         # /api/tasks endpoints
│   ├── privacy.py       # /api/privacy endpoints
│   ├── rag.py           # /api/rag endpoints
│   ├── ai_studio.py     # /api/ai-studio endpoints
│   ├── emails.py        # /api/emails endpoints
│   ├── marketing.py     # /api/marketing endpoints
│   └── settings.py      # /api/settings endpoints
├── services/
│   ├── __init__.py
│   ├── graph_service.py # Microsoft Graph integration
│   ├── airtable_service.py
│   └── ai_service.py    # AI/LLM integrations
└── utils/
    ├── __init__.py
    └── helpers.py
```

---

## Refactoring Steps

### Step 1: Create Router Files

Extract each endpoint group into its own router:

```python
# routers/clients.py
from fastapi import APIRouter, HTTPException
from db import ClientsDB

router = APIRouter(prefix="/api/clients", tags=["clients"])

@router.get("")
async def list_clients():
    return clients_db.list()

@router.get("/{cid}")
async def get_client(cid: str):
    client = clients_db.get(cid)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client
```

### Step 2: Update main.py to Include Routers

```python
# main.py
from fastapi import FastAPI
from routers import clients, tasks, privacy, rag, ai_studio

app = FastAPI()

app.include_router(clients.router)
app.include_router(tasks.router)
app.include_router(privacy.router)
app.include_router(rag.router)
app.include_router(ai_studio.router)
```

### Step 3: Extract Services

Move business logic to service files:
- Graph API calls → `services/graph_service.py`
- Airtable calls → `services/airtable_service.py`
- AI/LLM calls → `services/ai_service.py`

### Step 4: Test Each Module

After each extraction:
1. Run existing tests
2. Test affected endpoints manually
3. Verify no regressions

---

## Endpoint Inventory (for reference)

| Module | Endpoints | Lines (approx) |
|--------|-----------|----------------|
| Clients | 8 | ~300 |
| Tasks | 6 | ~200 |
| Privacy | 10 | ~400 |
| RAG | 8 | ~350 |
| AI Studio | 5 | ~250 |
| Emails | 6 | ~300 |
| Marketing | 4 | ~200 |
| Settings | 5 | ~150 |
| Graph/Auth | 8 | ~350 |
| Other | 17 | ~265 |

---

## Success Criteria

- [ ] `main.py` reduced to < 200 lines
- [ ] All endpoints still work
- [ ] No regressions in functionality
- [ ] Tests pass
- [ ] Code is more maintainable

---

## Testing

```bash
# Run all tests
cd backend && pytest

# Test specific endpoint
curl http://20.217.86.4:8799/api/clients
curl http://20.217.86.4:8799/api/tasks
curl http://20.217.86.4:8799/health
```

---

## Completion Report

### Phase 1 (2025-12-05)

**Modules Created:**
| Module | Lines | Endpoints |
|--------|-------|-----------|
| routers/clients.py | 102 | 8 (clients, archive, restore, summary, files, emails, privacy) |
| routers/tasks.py | 172 | 8 (list, get, create, update, delete, done, subtask, summary) |

**main.py:** 2,829 lines (was 2,765 - increased due to Joseph's SQLite integration)

---

### Phase 2 (2025-12-05)

**Changes:**
1. Removed duplicate client routes from main.py (~130 lines)
2. Removed duplicate task routes from main.py (~320 lines)
3. Created privacy router with 7 endpoints (~177 lines)
4. Created rag_helpers.py for shared utility functions

**Modules Created:**
| Module | Lines | Endpoints |
|--------|-------|-----------|
| routers/privacy.py | 177 | 7 (submissions, webhook, public-results, activity, stats, labels, db-submissions) |
| rag_helpers.py | 35 | - (utility functions) |

**main.py reduced:** 2,829 → 2,175 lines (-654 lines, -23%)

**Endpoints in main.py:** 32 (was 77+)

**All endpoints tested and working:**
- ✅ GET /health
- ✅ GET /api/clients
- ✅ GET /api/tasks
- ✅ GET /api/privacy/labels
- ✅ GET /api/privacy/stats
- ✅ GET /api/rag/inbox

---

### Next Steps (Phase 3)

**RAG Router Extraction (Complex):**
- 12 RAG endpoints (~335 lines)
- Requires extracting AI service functions (gemini_transcribe_audio, list_*_models)
- Estimated effort: High (many dependencies)

**Zoom Router Extraction:**
- 9 Zoom endpoints (~590 lines)
- Depends on Azure Blob Storage functions
- Estimated effort: Medium

**Target:** main.py under 500 lines requires extracting RAG + Zoom + Email routes

---

**Assigned:** 2025-12-05
**Phase 1 Complete:** 2025-12-05
**Phase 2 Complete:** 2025-12-05
