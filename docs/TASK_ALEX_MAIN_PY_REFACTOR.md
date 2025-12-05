# Task: main.py Refactoring

**Assigned To:** Alex (Engineering Senior)
**Date:** 2025-12-05
**Priority:** P2
**Status:** WAITING - Do not start until Joseph completes API migration

---

## Current Blocker

**Wait for Joseph to complete:** Phase 3 - API Endpoint Migration

Joseph is updating `main.py` to use SQLite instead of JSON files. Starting refactoring now would cause merge conflicts.

**Check status:** Ask CTO if Joseph has completed his task.

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

When complete, fill in this section:

**Date:** _______________

**Modules Created:**
| Module | Lines | Endpoints |
|--------|-------|-----------|
| | | |

**main.py after refactor:** ___ lines (was 2,765)

**Tests passed:** Yes / No

**Issues encountered:**

---

**Assigned:** 2025-12-05
**Blocker:** Wait for Joseph to complete Phase 3
