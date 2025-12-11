# Task: Quote Templates Backend - Phase 1

**Assigned To:** Alex (Engineering Senior)
**Date:** 2025-12-05
**Priority:** P2
**Based On:** `PRD_QUOTE_TEMPLATES.md` (David)

---

## Objective

Implement the backend API for Quote Templates feature (Phase 1 from PRD).

---

## Background

David completed the Quote Templates PRD. This task implements the core backend infrastructure:
- Database schema
- CRUD API endpoints
- Basic variable substitution

---

## Task Checklist

### 1. Create Database Schema

Add to SQLite:

```sql
CREATE TABLE quote_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    content TEXT NOT NULL,
    variables TEXT,  -- JSON array of variable names
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    version INTEGER DEFAULT 1
);

CREATE INDEX idx_templates_category ON quote_templates(category);
```

### 2. Create Router File

**File:** `backend/routers/quote_templates.py`

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime

router = APIRouter(prefix="/api/templates/quotes", tags=["quote-templates"])

class QuoteTemplate(BaseModel):
    name: str
    category: str = "general"
    content: str
    variables: List[str] = []

class QuoteTemplateResponse(QuoteTemplate):
    id: str
    created_at: str
    updated_at: str
    version: int

@router.get("/")
async def list_templates(category: Optional[str] = None):
    # Return all templates, optionally filtered by category
    pass

@router.get("/{template_id}")
async def get_template(template_id: str):
    pass

@router.post("/")
async def create_template(template: QuoteTemplate):
    pass

@router.put("/{template_id}")
async def update_template(template_id: str, template: QuoteTemplate):
    pass

@router.delete("/{template_id}")
async def delete_template(template_id: str):
    pass
```

### 3. Include Router in main.py

```python
from routers.quote_templates import router as quote_templates_router
app.include_router(quote_templates_router)
```

### 4. Create Default Templates

Insert 2-3 default Hebrew templates:
- General consultation quote
- Privacy consultation quote
- Litigation quote

### 5. Test Endpoints

```bash
# Create template
curl -X POST http://20.217.86.4:8799/api/templates/quotes \
  -H "Content-Type: application/json" \
  -d '{"name": "הצעה כללית", "category": "general", "content": "לכבוד {{client_name}}..."}'

# List templates
curl http://20.217.86.4:8799/api/templates/quotes

# Get single
curl http://20.217.86.4:8799/api/templates/quotes/{id}
```

---

## API Specification (from PRD)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/templates/quotes` | List all quote templates |
| GET | `/api/templates/quotes/:id` | Get single template |
| POST | `/api/templates/quotes` | Create new template |
| PUT | `/api/templates/quotes/:id` | Update template |
| DELETE | `/api/templates/quotes/:id` | Delete template |

---

## Success Criteria

- [x] Database table created
- [x] All 5 CRUD endpoints working
- [x] Default templates inserted
- [x] Router included in main.py
- [x] Endpoints tested and returning correct data

---

## Completion Report

**Date:** 2025-12-05
**Status:** ✅ COMPLETE

**Files Created/Changed:**
| File | Change |
|------|--------|
| `backend/db.py` | Added quote_templates table to SCHEMA |
| `backend/routers/quote_templates.py` | NEW - Full CRUD router (200 lines) |
| `backend/routers/__init__.py` | Added quote_templates_router export |
| `backend/main.py` | Added include_router for quote_templates |

**Endpoints Working:**
- [x] GET /api/templates/quotes/ - List all templates (with optional category filter)
- [x] GET /api/templates/quotes/:id - Get single template
- [x] POST /api/templates/quotes/ - Create new template
- [x] PUT /api/templates/quotes/:id - Update template (increments version)
- [x] DELETE /api/templates/quotes/:id - Delete template
- [x] GET /api/templates/quotes/categories/list - List all categories (bonus)
- [x] POST /api/templates/quotes/:id/render - Render template with variables (bonus)

**Default Templates:**
| Name | Category |
|------|----------|
| הצעת מחיר - ייעוץ כללי (מעודכן) | general |
| הצעת מחיר - ייעוץ פרטיות | privacy |
| הצעת מחיר - ליטיגציה | litigation |

**Test Results:**
```
✅ GET /api/templates/quotes/ - Returns 3 templates
✅ GET by ID - Returns correct template with Hebrew content
✅ Filter by category - Returns 1 privacy template
✅ POST - Creates template with generated UUID
✅ PUT - Updates name, increments version to 2
✅ DELETE - Returns {"status": "deleted"}
✅ 404 - Returns proper error for non-existent ID
```

**Notes:**
- Endpoint uses trailing slash: `/api/templates/quotes/` (not `/api/templates/quotes`)
- This avoids conflict with existing `/api/templates/quotes` endpoint from templates_api.py
- Version auto-increments on each PUT update
- Hebrew content stored and retrieved correctly with UTF-8

**Issues Encountered:**
- Initial curl requests corrupted Hebrew text (encoding issue) - Fixed by inserting via Python script with proper UTF-8 handling

---

**Assigned:** 2025-12-05
**Completed:** 2025-12-06
