# PRD: Privacy Assessment MVP

**Version:** 2.0 (Simplified)
**Date:** 2025-12-03
**Status:** APPROVED
**Priority:** HIGH

---

## 1. Goal

Get the technical flow working end-to-end, free, to learn and measure.

---

## 2. User Flow (MVP)

```
User fills Fillout form (FREE)
    |
    v
Fillout webhook --> Our API
    |
    v
Score + Save to SQLite
    |
    v
Redirect to: eislaw.org/privacy-results?id=XXX
    |
    v
Results page shows:
  - Level (Yellow/Orange/Red)
  - Video (Wistia)
  - Key requirements
  - CTA buttons
    |
    v
  [DONE]
```

---

## 3. Level System

| Level | Color | Message | CTA |
|-------|-------|---------|-----|
| basic | Yellow | הכל בסדר יחסית | Buy product / Paid call |
| mid | Orange | יש לך עבודה לעשות | Buy product / Paid call |
| high | Red | עצור הכל, דבר איתי | Paid call only |

**No green** - we don't want people thinking everything is fine.

---

## 4. What We Are NOT Building (MVP)

- PDF generation
- Email automation
- Payment/WooCommerce integration
- Free consultation calls
- Complex product tiers
- Airtable

---

## 5. What We ARE Building

### 5.1 Backend Components

| Component | Purpose |
|-----------|---------|
| SQLite DB | Store submissions + scores |
| Webhook endpoint | Receive from Fillout |
| Public results API | Serve data to WordPress |
| Monitor API | Dashboard visibility |

### 5.2 Frontend Components

| Component | Purpose |
|-----------|---------|
| Monitor panel | See pipeline activity |
| Results page (WordPress) | Show results to user |

---

## 6. SQLite Schema

```sql
CREATE TABLE privacy_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id TEXT UNIQUE NOT NULL,
    form_id TEXT NOT NULL,
    submitted_at TEXT NOT NULL,
    received_at TEXT DEFAULT CURRENT_TIMESTAMP,

    -- Contact
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    business_name TEXT,

    -- Answers (JSON)
    answers_json TEXT,

    -- Score
    score_level TEXT,
    score_color TEXT,
    score_dpo BOOLEAN DEFAULT FALSE,
    score_reg BOOLEAN DEFAULT FALSE,
    score_requirements TEXT
);

CREATE TABLE activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    event_type TEXT NOT NULL,
    submission_id TEXT,
    details TEXT,
    duration_ms INTEGER,
    success BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_sub_id ON privacy_submissions(submission_id);
CREATE INDEX idx_activity_ts ON activity_log(timestamp);
```

---

## 7. API Endpoints

### 7.1 Webhook (receives from Fillout)
```
POST /api/privacy/webhook
Body: Fillout webhook payload
Response: { status: ok, submission_id: XXX, level: mid }
```

### 7.2 Public Results (serves to WordPress)
```
GET /api/privacy/public-results/{submission_id}

Response:
{
  "business_name": "כהן ושות",
  "level": "mid",
  "color": "orange",
  "level_label": "בינונית",
  "requirements": ["מינוי ממונה פרטיות", "רישום מאגר מידע"],
  "video_id": "orange"
}
```

### 7.3 Monitor (for dashboard)
```
GET /api/privacy/activity?limit=50
GET /api/privacy/stats
```

---

## 8. Level to Color Mapping

```python
LEVEL_TO_COLOR = {
    "lone": "yellow",
    "basic": "yellow",
    "mid": "orange",
    "high": "red"
}
```

---

## 9. Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| backend/privacy_db.py | CREATE | SQLite module |
| backend/main.py | MODIFY | Add endpoints |
| frontend/src/pages/Privacy/index.jsx | MODIFY | Add monitor panel |
| data/privacy.db | CREATE | SQLite database file |

---

## 10. Implementation Order

1. **SQLite Setup** - Create database module
2. **Webhook Endpoint** - Receive and store submissions
3. **Public Results API** - Serve data to WordPress
4. **Monitor Panel** - Dashboard visibility
5. **Stress Test** - Validate reliability
6. **WordPress Page** - User-facing results

---

## 11. Success Criteria

1. Webhook receives and stores submissions
2. Scoring runs correctly
3. Public API returns correct data
4. Monitor shows activity
5. Handles 10 submissions/minute without errors
