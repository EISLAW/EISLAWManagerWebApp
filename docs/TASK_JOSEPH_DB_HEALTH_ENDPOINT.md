# Task: Database Health Monitoring Endpoint

**Assigned To:** Joseph (Database Developer)
**Date:** 2025-12-05
**Priority:** P2

---

## Objective

Create a database health monitoring endpoint that can be used by the monitoring stack and CI/CD pipeline.

---

## Background

With automated backups in place and CI/CD being set up, we need a health endpoint that reports database status for:
- Monitoring dashboards (Grafana)
- CI/CD health checks
- Alerting on issues

---

## Task Checklist

### 1. Create Health Check Endpoint

**File:** `backend/routers/db_health.py`

```python
from fastapi import APIRouter
import sqlite3
import os
from datetime import datetime

router = APIRouter(prefix="/api/db", tags=["database"])

@router.get("/health")
async def db_health():
    """Database health check endpoint"""

    db_path = "/app/data/eislaw.db"

    result = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "checks": {}
    }

    # Check 1: Database file exists
    result["checks"]["file_exists"] = os.path.exists(db_path)

    # Check 2: Can connect
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        result["checks"]["connection"] = True

        # Check 3: Integrity check
        cursor.execute("PRAGMA integrity_check")
        integrity = cursor.fetchone()[0]
        result["checks"]["integrity"] = integrity == "ok"

        # Check 4: Table counts
        tables = ["clients", "tasks", "contacts"]
        result["counts"] = {}
        for table in tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                result["counts"][table] = cursor.fetchone()[0]
            except:
                result["counts"][table] = -1

        # Check 5: WAL mode
        cursor.execute("PRAGMA journal_mode")
        result["checks"]["wal_mode"] = cursor.fetchone()[0] == "wal"

        # Check 6: Database size
        result["size_mb"] = round(os.path.getsize(db_path) / 1024 / 1024, 2)

        conn.close()

    except Exception as e:
        result["status"] = "unhealthy"
        result["checks"]["connection"] = False
        result["error"] = str(e)

    # Overall status
    if not all(v for k, v in result["checks"].items() if isinstance(v, bool)):
        result["status"] = "unhealthy"

    return result
```

### 2. Include Router in main.py

```python
from routers.db_health import router as db_health_router
app.include_router(db_health_router)
```

### 3. Add to Prometheus Metrics (Optional)

If time permits, expose metrics for Prometheus:

```python
# Metrics for Grafana
@router.get("/metrics")
async def db_metrics():
    """Database metrics for Prometheus"""
    # Return in Prometheus format
    pass
```

### 4. Test Endpoint

```bash
# Test health endpoint
curl http://20.217.86.4:8799/api/db/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-12-05T20:00:00",
  "checks": {
    "file_exists": true,
    "connection": true,
    "integrity": true,
    "wal_mode": true
  },
  "counts": {
    "clients": 13,
    "tasks": 9,
    "contacts": 12
  },
  "size_mb": 0.05
}
```

---

## Success Criteria

- [x] `/api/db/health` endpoint created
- [x] Returns status, checks, and counts
- [x] Works with healthy database
- [x] Returns "unhealthy" when issues detected
- [x] Included in main.py router

---

## Completion Report

**Date:** 2025-12-05

**Files Created/Changed:**
| File | Change |
|------|--------|
| `backend/routers/db_health.py` | Created - Health and stats endpoints |
| `backend/main.py` | Added db_health_router import and include |

**Endpoints Created:**
| Endpoint | Purpose |
|----------|---------|
| `GET /api/db/health` | Health check with status, checks, counts, backup info |
| `GET /api/db/stats` | Detailed stats: tables, indexes, sizes |

**Endpoint Tests:**
- [x] Returns healthy for working DB
- [x] Returns counts correctly (13 clients, 10 tasks, 12 contacts)
- [x] Returns size correctly (0.11 MB)
- [x] Returns backup status (5 backups, 0.2 hours old)

**Response Example:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-05T20:09:02.838893Z",
  "checks": {
    "file_exists": true,
    "connection": true,
    "integrity": true,
    "wal_mode": true,
    "backup_recent": true
  },
  "counts": {
    "clients": 13,
    "tasks": 10,
    "contacts": 12,
    "activity_log": 1
  },
  "size_mb": 0.11,
  "backup": {
    "latest": "eislaw_20251205_195634_auto-daily.db",
    "age_hours": 0.2,
    "count": 5,
    "healthy": true
  }
}
```

**Issues Encountered:** None

---

**Assigned:** 2025-12-05
