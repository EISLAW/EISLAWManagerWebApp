# Marketing Bible

**Project:** EISLAW
**Owner:** Joe (CTO) + Noa (Conversion Copywriter)
**Last Updated:** 2025-12-07

> Single source of truth for all marketing assets, conversion optimization, and user acquisition.

---

## Table of Contents

1. [User Acquisition Funnel](#user-acquisition-funnel)
2. [Landing Pages](#landing-pages)
3. [Forms & Conversion](#forms--conversion)
4. [A/B Testing Protocol](#ab-testing-protocol)
5. [Brand Voice & Copy Guidelines](#brand-voice--copy-guidelines)
6. [Assets Inventory](#assets-inventory)

---

## User Acquisition Funnel

```
┌─────────────────────────────────────────────────────────────────┐
│                     AWARENESS                                    │
│  LinkedIn posts, Articles, Webinars, Referrals                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     INTEREST                                     │
│  Landing Page (eislaw.org) → "רוצים לדעת?" CTA                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     CONSIDERATION                                │
│  Privacy Assessment Form (Fillout) → 2-3 min questionnaire      │
│  URL: https://forms.eislaw.org/t/t9nJNoMdBgus                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     CONVERSION                                   │
│  Personalized Results Email → Schedule consultation             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     RETENTION                                    │
│  Client Dashboard (eislaw.org/dashboard) → Ongoing services     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Landing Pages

### Main Landing Page

| Property | Value |
|----------|-------|
| **URL** | `https://eislaw.org` |
| **Purpose** | Introduce EISLAW, capture leads |
| **Primary CTA** | "בדקו את החשיפה שלכם" → Privacy Form |
| **Secondary CTA** | "קראו את המדריך" → Educational content |

### Privacy Form Landing (Fillout)

| Property | Value |
|----------|-------|
| **URL** | `https://forms.eislaw.org/t/t9nJNoMdBgus` |
| **Form Name** | פרטיות_שאלון אבחון (עדכני) |
| **Form ID** | `t9nJNoMdBgus` |
| **Pages** | 6 (including landing + success) |
| **Questions** | 15 substantive questions |
| **Avg. Completion Time** | 2-3 minutes |

---

## Forms & Conversion

### Privacy Assessment Form

**Full Schema:** See [FILLOUT_PRIVACY_SCHEMA.md](FILLOUT_PRIVACY_SCHEMA.md)

**Optimization Status:**
- [x] Question text audit (Noa - 2025-12-07)
- [x] 3 options per question prepared for A/B testing
- [x] Checkbox reorder recommendation (sensitive → end)
- [x] Help text shortened (example-first format)
- [x] Tooltip content prepared
- [ ] Legal review of rewrites
- [ ] Implementation in Fillout

**Key Metrics to Track:**
| Metric | Target | Current |
|--------|--------|---------|
| Form completion rate | >60% | ~43% (est.) |
| Per-question abandonment | <15% | Unknown |
| Time to complete | <3 min | ~3-4 min |

**Question Improvements (Approved):**

| Question | Winner | Clarity Gain |
|----------|--------|--------------|
| Q3 (Ethics) | **Option C** | +2.3 |
| Q9 (Direct Mail Biz) | **Option B** | +1.6 |
| Q10 (Direct Mail Self) | **Option A** | +1.6 |
| Q12 (Processor) | **Option A** | +3.3 |
| Q2 (Access) | Keep Original | 0 |
| Q11 (Monitor) | Keep Original | 0 |
| Q13 (Processor Large) | **Option A** | +1.0 |

**Full Analysis:** See [NOA_OPTIONS_ANALYSIS.md](NOA_OPTIONS_ANALYSIS.md)
**Task Details:** See [TASK_NOA_PRIVACY_FORM_OPTIMIZATION.md](TASK_NOA_PRIVACY_FORM_OPTIMIZATION.md)

---

## A/B Testing Protocol

### Overview

We use AI-simulated user personas to test form variations before deploying to real users.

### When to Run A/B Tests

- Before implementing question rewrites
- When changing form structure or flow
- When testing new UX elements (progress bars, time estimates)
- After significant abandonment issues are identified

### How to Run

**1. Prepare Variations**

Create question alternatives in a task document (see `TASK_NOA_*.md` format):
```markdown
**Q3** | Field ID: `68Yz`
**Current:** [original text]

| Option | Rewrite |
|--------|---------|
| A | [alternative 1] |
| B | [alternative 2] |
| C | [alternative 3] |
```

**2. Run Options Analysis**

```bash
# From project root (WSL)
cd "/mnt/c/Coding Projects/EISLAW System Clean"
python3 tools/test_noa_options.py
```

**Output:** Heuristic scoring based on:
- Length (optimal: 50-80 chars)
- Jargon penalty (מיקור חוץ, כפופים, פילוח)
- Example bonus (למשל:)
- Clarity score (1-10)
- Abandonment risk (1-10)

**3. Run Full Persona Simulation (Optional)**

For deeper testing with AI personas:

```bash
# From project root (WSL)
cd "/mnt/c/Coding Projects/EISLAW System Clean"
python3 tools/form_ab_test_simulator.py
```

**Personas Simulated:**
| ID | Name | Profile | Sensitivity |
|----|------|---------|-------------|
| `small_biz_owner` | יוסי | בעל עסק קטן, 45 שנה | High - unfamiliar with legal terms |
| `accountant` | רונית | רואת חשבון, 38 שנה | Low - professional |
| `tech_startup` | אורי | מייסד סטארטאפ, 32 שנה | Medium - tech-savvy but impatient |
| `clinic_manager` | דנה | מנהלת מרפאה, 52 שנה | High - handles sensitive health data |
| `hr_agency` | מיכל | סוכנות השמה, 41 שנה | Medium - handles employee data |
| `lawyer` | יעל | עורכת דין, 35 שנה | Low - legal professional |
| `retailer` | משה | רשת קמעונאית, 48 שנה | Medium - many customers |
| `consultant` | נועם | יועץ עסקי, 44 שנה | Low - business experience |
| `medical_supplier` | רחל | ספקית ציוד רפואי, 39 שנה | High - sensitive data context |
| `real_estate` | דוד | סוכן נדל"ן, 55 שנה | Medium - client data handling |

**Output Report:** `docs/FORM_AB_TEST_REPORT.md`

**4. Review Results**

Compare:
- Estimated completion rate per version
- Per-question abandonment predictions
- Clarity improvements

**5. Implement Winners**

After testing:
1. Update Fillout form with winning variations
2. Document changes in [FILLOUT_PRIVACY_SCHEMA.md](FILLOUT_PRIVACY_SCHEMA.md)
3. Monitor real completion rates for 2 weeks
4. Iterate if needed

### Test Tools Location

| Tool | Path | Purpose |
|------|------|---------|
| Options Analyzer | `tools/test_noa_options.py` | Heuristic scoring of alternatives |
| Persona Simulator | `tools/form_ab_test_simulator.py` | AI persona simulation |
| Form Capture | `tools/capture_fillout_full.js` | Playwright screenshots |

---

## Brand Voice & Copy Guidelines

### Tone

| Context | Tone | Example |
|---------|------|---------|
| Landing page | Professional, trustworthy | "נעזור לכם להבין את החשיפה שלכם" |
| Form questions | Clear, approachable | "לכמה אנשים יש גישה למידע?" (not "בעלי הרשאה") |
| Error messages | Helpful, not blaming | "לא הצלחנו לשמור - נסו שוב" |
| Success messages | Celebratory | "מעולה! קיבלנו את הנתונים" |

### Hebrew Copy Rules

1. **Avoid legal jargon** - Replace with plain Hebrew:
   - ❌ "כפופים לחובת סודיות" → ✅ "מחויבים לשמור על סודיות"
   - ❌ "פילוח לפי מאפיין אישי" → ✅ "לפי מידע אישי"
   - ❌ "מיקור חוץ" → ✅ "מנהלים מידע בשביל אחרים"

2. **Use examples** - Start help text with "למשל:"

3. **Keep questions short** - Target 50-80 characters

4. **Active voice** - "האם אתם שומרים..." not "האם נשמר אצלכם..."

5. **RTL alignment** - All text right-to-left, buttons on left

---

## Assets Inventory

### Forms

| Form | Platform | ID | Status |
|------|----------|-----|--------|
| Privacy Assessment | Fillout | `t9nJNoMdBgus` | Active |
| Contact Form | Fillout | TBD | Planned |

### Email Templates

| Template | Purpose | Location |
|----------|---------|----------|
| Privacy Results | Post-form submission | Backend: `email_templates/` |

### Images

| Asset | Location | Usage |
|-------|----------|-------|
| Eitan Photo | Fillout form | Landing page, success page |
| Logo | `frontend/public/` | Header, emails |

### Documents

| Document | Purpose | Path |
|----------|---------|------|
| Form Schema | Technical reference | `docs/FILLOUT_PRIVACY_SCHEMA.md` |
| Noa's Task | Question rewrites | `docs/TASK_NOA_PRIVACY_FORM_OPTIMIZATION.md` |
| A/B Analysis | Test results | `docs/NOA_OPTIONS_ANALYSIS.md` |

---

## Metrics & Dashboards

### Key Performance Indicators (KPIs)

| KPI | Definition | Target | Tracking |
|-----|------------|--------|----------|
| Form Completion Rate | Submissions / Form Opens | >60% | Fillout Analytics |
| Per-Question Abandonment | Drop-offs at each question | <15% | Fillout Analytics |
| Email Open Rate | Opens / Emails Sent | >40% | Email provider |
| Consultation Bookings | Bookings / Results Sent | >20% | Manual tracking |

### How to Access Fillout Analytics

1. Log into Fillout dashboard
2. Select "פרטיות_שאלון אבחון (עדכני)"
3. View "Analytics" tab for:
   - Submission count
   - Completion rate
   - Drop-off points

---

## Change Log

| Date | Change | By |
|------|--------|-----|
| 2025-12-07 | Created Marketing Bible | Joe (CTO) |
| 2025-12-07 | Added A/B Testing Protocol | Joe (CTO) |
| 2025-12-07 | Linked Noa's form optimization work | Joe (CTO) |

---

*This is a living document. Update when marketing assets or strategies change.*
