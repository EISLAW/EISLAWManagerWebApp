# PRD: Privacy Report Purchase Flow

**Version:** 1.0
**Date:** 2025-12-03
**Status:** APPROVED
**Priority:** HIGH

---

## 1. Executive Summary

Build an automated end-to-end flow from privacy questionnaire submission to paid report delivery, integrated with the existing WordPress/WooCommerce store at eislaw.org.

### Business Goal
Convert privacy questionnaire leads into paying customers automatically, with minimal manual intervention.

### Success Metrics
- Time from submission to purchase option: < 5 seconds
- Conversion rate tracking via WooCommerce
- Zero manual steps in happy path

---

## 2. Current State

### What Exists
| Component | Status | Location |
|-----------|--------|----------|
| Fillout questionnaire | ✅ Live | Form ID: t9nJNoMdBgus |
| Scoring algorithm | ✅ Working | fillout_integration.py |
| QA validation tab | ✅ Built | Privacy tab in dashboard |
| WooCommerce store | ✅ Live | eislaw.org |
| Invoice4U payments | ✅ Installed | Israeli payment gateway |
| WordPress API access | ✅ Configured | secrets.local.json |

### What's Missing
1. Results page showing score to user
2. WooCommerce product for privacy report
3. Fillout redirect to results page
4. Purchase flow integration
5. Report generation after purchase
6. Delivery mechanism

---

## 3. Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER JOURNEY                                 │
└─────────────────────────────────────────────────────────────────┘

[1] User fills Fillout form
         │
         ▼
[2] Fillout redirects to Results Page
    URL: eislaw.org/privacy-results?submission_id=XXX
         │
         ▼
[3] Results Page shows:
    - Privacy level (בסיסית/בינונית/גבוהה)
    - Key requirements
    - CTA: "לרכישת הדוח המלא" button
         │
         ▼
[4] Button links to WooCommerce checkout
    URL: eislaw.org/checkout?add-to-cart=PRODUCT_ID
         │
         ▼
[5] User pays via Invoice4U
         │
         ▼
[6] WooCommerce webhook → Our API
    POST /api/woocommerce/order-complete
         │
         ▼
[7] Generate PDF report
         │
         ▼
[8] Email report to customer
```

---

## 4. Implementation Phases

### Phase 1: WooCommerce Product (Day 1)
**Priority:** CRITICAL

- [ ] Create WooCommerce product via API:
  - Name: דוח הגנת פרטיות מותאם אישית
  - Type: Virtual (no shipping)
  - Price: TBD (suggest ₪299-499)
  - SKU: privacy-report-v1
- [ ] Add custom field for submission_id
- [ ] Configure thank-you page redirect

**Files to modify:**
- None (API call only)

**Testing:**
- [ ] Product appears in WooCommerce admin
- [ ] Can add to cart via URL parameter
- [ ] Checkout works with Invoice4U

---

### Phase 2: Results Page on WordPress (Day 1-2)
**Priority:** CRITICAL

- [ ] Create WordPress page: /privacy-results
- [ ] Build with Elementor (matches site style)
- [ ] Dynamic content based on URL params:
  - submission_id
  - level (from API call)
- [ ] Hebrew RTL layout
- [ ] Mobile responsive

**Page sections:**
1. Header: "תוצאות בדיקת הפרטיות שלך"
2. Level badge with explanation
3. Key findings summary
4. CTA button to purchase
5. Contact info for questions

**API endpoint needed:**
```
GET /api/privacy/public-results/{submission_id}
Returns: { level, level_label, key_points[], price }
```

**Files to modify:**
- backend/main.py - Add public results endpoint

---

### Phase 3: Fillout Redirect Configuration (Day 2)
**Priority:** HIGH

- [ ] Configure Fillout form completion redirect
- [ ] URL: https://eislaw.org/privacy-results?submission_id={{submissionId}}
- [ ] Test redirect works

**No code changes needed** - Fillout admin configuration only

---

### Phase 4: Purchase Flow Integration (Day 2-3)
**Priority:** HIGH

- [ ] Add submission_id to WooCommerce order meta
- [ ] Create WooCommerce webhook for order completion
- [ ] Build webhook handler endpoint

**Webhook endpoint:**
```
POST /api/woocommerce/order-complete
Headers: X-WC-Webhook-Signature
Body: { order_id, status, meta_data[] }
```

**Files to modify:**
- backend/main.py - Add webhook endpoint
- backend/woocommerce_integration.py - New module

---

### Phase 5: Report Generation (Day 3-4)
**Priority:** MEDIUM

- [ ] Create PDF report template
- [ ] Generate report based on submission answers
- [ ] Include:
  - Business name
  - Privacy level determination
  - Required actions checklist
  - Relevant regulations
  - Next steps

**Files to modify:**
- backend/report_generator.py - New module
- templates/privacy_report.html - Report template

---

### Phase 6: Email Delivery (Day 4)
**Priority:** MEDIUM

- [ ] Send report via email after purchase
- [ ] Hebrew email template
- [ ] Attach PDF report
- [ ] Include support contact

**Files to modify:**
- backend/email_service.py - New or extend existing

---

## 5. API Specifications

### 5.1 Public Results Endpoint
```
GET /api/privacy/public-results/{submission_id}

Response 200:
{
  "submission_id": "abc123",
  "level": "mid",
  "level_label": "בינונית",
  "level_description": "העסק שלך מחזיק מידע על 100-1000 אנשים...",
  "key_points": [
    "נדרש מינוי ממונה הגנת פרטיות",
    "חובת רישום מאגר מידע"
  ],
  "product_url": "https://eislaw.org/checkout?add-to-cart=XXXX",
  "price": 299,
  "currency": "ILS"
}

Response 404:
{ "error": "Submission not found" }
```

### 5.2 WooCommerce Webhook Handler
```
POST /api/woocommerce/order-complete

Headers:
  X-WC-Webhook-Signature: <hmac-sha256>
  Content-Type: application/json

Body:
{
  "id": 12345,
  "status": "completed",
  "billing": {
    "email": "customer@example.com",
    "first_name": "ישראל",
    "last_name": "ישראלי"
  },
  "meta_data": [
    { "key": "submission_id", "value": "abc123" }
  ]
}

Response 200:
{ "status": "ok", "report_sent": true }
```

---

## 6. WordPress/WooCommerce Configuration

### 6.1 Product Settings
| Setting | Value |
|---------|-------|
| Product Type | Simple, Virtual |
| Price | ₪299 (suggested) |
| Tax Status | Taxable |
| SKU | privacy-report-v1 |
| Sold Individually | Yes |
| Stock | Unlimited |

### 6.2 Webhook Configuration
| Setting | Value |
|---------|-------|
| Name | Privacy Report Order Complete |
| Status | Active |
| Topic | Order completed |
| Delivery URL | https://20.217.86.4:8799/api/woocommerce/order-complete |
| Secret | (generate and store in secrets.local.json) |

---

## 7. Data Flow

### Fillout → Results Page
```
Fillout completion
    → Redirect with submission_id
    → Results page loads
    → Fetch /api/privacy/public-results/{id}
    → Display results + purchase button
```

### Purchase → Delivery
```
User clicks purchase
    → WooCommerce cart (submission_id in URL)
    → Checkout (Invoice4U)
    → Payment complete
    → WooCommerce webhook fires
    → Our API generates report
    → Email sent to customer
```

---

## 8. Security Considerations

1. **Public results endpoint**: Only expose level and key points, not full answers
2. **Webhook signature**: Validate X-WC-Webhook-Signature
3. **Rate limiting**: Prevent abuse of public endpoint
4. **submission_id**: Use UUID, not sequential

---

## 9. Testing Checklist

### Phase 1: Product
- [ ] Product created in WooCommerce
- [ ] Can add to cart via URL
- [ ] Checkout flow works
- [ ] Invoice4U payment succeeds

### Phase 2: Results Page
- [ ] Page loads with valid submission_id
- [ ] Shows correct level
- [ ] Purchase button works
- [ ] Mobile responsive

### Phase 3: Redirect
- [ ] Fillout redirects correctly
- [ ] submission_id passes through

### Phase 4: Webhook
- [ ] Webhook fires on order complete
- [ ] Signature validates
- [ ] submission_id extracted correctly

### Phase 5: Report
- [ ] PDF generates correctly
- [ ] Contains all required sections
- [ ] Hebrew text renders properly

### Phase 6: Email
- [ ] Email sends successfully
- [ ] PDF attached
- [ ] Links work

---

## 10. Rollback Plan

Each phase is independent. If any phase fails:
1. Disable webhook (WooCommerce admin)
2. Remove results page (WordPress admin)
3. Unpublish product (WooCommerce admin)
4. Revert API changes (git revert)

---

## 11. Future Enhancements

- [ ] Upsell: Full consultation package
- [ ] Subscription: Annual compliance check
- [ ] Dashboard: Customer portal for report access
- [ ] Analytics: Conversion funnel tracking

---

## 12. Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| Fillout API | ✅ Ready | Form t9nJNoMdBgus |
| WooCommerce API | ✅ Ready | Keys in secrets.local.json |
| Invoice4U | ✅ Installed | Israeli payments |
| Email service | ⚠️ TBD | Need to configure |
| PDF generation | ⚠️ TBD | Library needed |

---

## Appendix A: Secrets Required

```json
{
  "wordpress": {
    "site_url": "https://eislaw.org",
    "username": "eislaw",
    "app_password": "****",
    "wc_consumer_key": "ck_****",
    "wc_consumer_secret": "cs_****",
    "wc_webhook_secret": "****"
  }
}
```

---

## Appendix B: Price Recommendation

Based on market research for privacy compliance reports:
- Basic report: ₪199-299
- Full report with consultation: ₪499-799
- Annual subscription: ₪999/year

Suggested starting price: **₪299** (can adjust based on conversion data)

---

## 13. Data Storage Architecture (SQLite - No Airtable)

### Decision
Use SQLite instead of Airtable for privacy submissions storage.

### Rationale
- Fillout is the source of truth for raw submissions
- No need for external database service
- SQLite handles 3-4 writes/minute easily (capacity: 50,000+/min)
- ACID compliant, survives crashes
- Zero configuration, single file
- Free (no Airtable costs)

### SQLite Schema

```sql
-- Privacy submissions from Fillout
CREATE TABLE privacy_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id TEXT UNIQUE NOT NULL,
    form_id TEXT NOT NULL,
    submitted_at TEXT NOT NULL,
    received_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    -- Contact info
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    business_name TEXT,
    
    -- Raw answers (JSON)
    answers_json TEXT,
    
    -- Algorithm results
    score_level TEXT,  -- lone/basic/mid/high
    score_dpo BOOLEAN DEFAULT FALSE,
    score_reg BOOLEAN DEFAULT FALSE,
    score_report BOOLEAN DEFAULT FALSE,
    score_requirements TEXT,  -- JSON array
    score_confidence INTEGER,
    
    -- Review status
    review_status TEXT DEFAULT pending,  -- pending/correct/override
    reviewed_at TEXT,
    override_level TEXT,
    override_reason TEXT,
    
    -- Purchase status
    purchase_status TEXT DEFAULT none,  -- none/pending/completed
    order_id TEXT,
    purchased_at TEXT,
    
    -- Report delivery
    report_status TEXT DEFAULT none,  -- none/generating/sent/failed
    report_url TEXT,
    sent_at TEXT
);

-- Activity log for monitoring
CREATE TABLE activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    event_type TEXT NOT NULL,  -- webhook_received/scored/error/purchased/report_sent
    submission_id TEXT,
    details TEXT,  -- JSON
    duration_ms INTEGER,
    success BOOLEAN DEFAULT TRUE
);

-- Indexes
CREATE INDEX idx_submissions_status ON privacy_submissions(review_status);
CREATE INDEX idx_submissions_submitted ON privacy_submissions(submitted_at);
CREATE INDEX idx_activity_timestamp ON activity_log(timestamp);
```

### File Location
```
/app/data/privacy.db  (Docker mount: ~/EISLAWManagerWebApp/data/privacy.db)
```

### Backup Strategy
- SQLite file copied to Azure Blob daily (optional)
- Or: git-ignored local backup script

---

## 14. Stress Testing Phase (Pre-Launch)

### Purpose
Validate pipeline reliability before production traffic.

### Test Scenarios

| Scenario | Rate | Duration | Expected |
|----------|------|----------|----------|
| Normal | 3-4/min | 10 min | 0 errors |
| Burst | 20/min | 2 min | 0 errors |
| Sustained | 10/min | 30 min | 0 errors |

### Stress Test Tool
`tools/stress_test_privacy.py`

Features:
- Simulate Fillout webhook calls
- Configurable rate and duration
- Measure response time, error rate
- Generate report

### Monitor Panel
Add to Privacy tab in dashboard:
- Live activity feed
- Error count
- Throughput metrics
- Last 100 events

### Success Criteria
- 99.9% success rate at 10/min for 30 min
- Average response time < 500ms
- No memory leaks
- SQLite file size reasonable
