# PRD: Privacy Tab QA-Focused Redesign v1.0

**Document Owner:** EISLAW Development Team
**Created:** 2025-12-03
**Status:** Approved
**Related:** `frontend/src/pages/Privacy/index.jsx`, `docs/DesignSystem/`

---

## 1. Problem Statement

The Privacy tab was built as an **operations tool** (send emails, publish reports) but is actually used as an **algorithm QA tool** (validate that the privacy assessment algorithm works correctly).

### Current Issues:
- UI is designed for daily operations workflow, not validation
- Algorithm decision is buried among form controls
- No quick "correct/incorrect" marking
- Hard to see accuracy trends
- Mixed English/Hebrew labels
- No visual status of reviewed vs pending items
- Layout is LTR instead of RTL

### Business Context:
- **Primary user:** CEO, for QA validation
- **Purpose:** Verify algorithm accuracy before full automation
- **Target:** >90% accuracy, then system runs automatically
- **Volume:** Pilot 100-200 users → production 5-10/day
- **Lifespan:** Heavy use during validation phase, minimal after

---

## 2. Goals & Success Criteria

### Primary Goal:
Transform Privacy tab into a **QA validation tool** that makes it fast and easy to verify algorithm decisions, while retaining ability to send reports to clients.

### Success Metrics:
| Metric | Current | Target |
|--------|---------|--------|
| Time to validate one submission | ~60 sec | < 15 sec |
| Items reviewed per session | ~5 | 20+ |
| Algorithm accuracy visibility | Partial (% shown) | Full (trend + breakdown) |
| "Correct" marking | N/A | One click |

---

## 3. Proposed Solution

### 3.1 Layout Architecture (RTL)

```
┌─────────────────────────────────────────────────────────────────┐
│  Privacy - בדיקת אלגוריתם                      [רענן] Accuracy: 92% │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────┐ ┌─────────────────────────────────┐  │
│  │ CONTEXT ZONE (RIGHT)  │ │ DETAIL ZONE (LEFT)              │  │
│  │ ─────────────────     │ │ ────────────────                │  │
│  │                       │ │                                 │  │
│  │ נבדקו: 18/20          │ │ ┌─ החלטת האלגוריתם ───────────┐ │  │
│  │ דיוק: 92%             │ │ │                             │ │  │
│  │                       │ │ │  רמה: בינונית      [✓ נכון] │ │  │
│  │ ───────────────       │ │ │                             │ │  │
│  │ ✓ דוד כהן    בינונית  │ │ │  רכיבים:                    │ │  │
│  │ ✗ שרה לוי    בסיסית   │ │ │  ☑ DPO  ☑ רישום  ☐ דוח     │ │  │
│  │ ○ משה ישראלי גבוהה    │ │ │                             │ │  │
│  │ ○ רונית אברהם בסיסית  │ │ │  ציון: 87%                  │ │  │
│  │                       │ │ └─────────────────────────────┘ │  │
│  │ ○ = ממתין             │ │                                 │  │
│  │ ✓ = אושר              │ │ ┌─ קלטים מרכזיים ─────────────┐ │  │
│  │ ✗ = תוקן              │ │ │  עובדים: 50                 │ │  │
│  │                       │ │ │  מידע רגיש: כן              │ │  │
│  │                       │ │ │  ביומטרי: לא                │ │  │
│  │                       │ │ │  מעבד מידע: כן              │ │  │
│  │                       │ │ │  העברה לחו"ל: לא            │ │  │
│  │                       │ │ └─────────────────────────────┘ │  │
│  │                       │ │                                 │  │
│  │                       │ │ ┌─ אם לא נכון ────────────────┐ │  │
│  │                       │ │ │  רמה נכונה: [בחירה ▾]       │ │  │
│  │                       │ │ │  רכיבים: [checkboxes]       │ │  │
│  │                       │ │ │  הערה: [_______________]    │ │  │
│  │                       │ │ └─────────────────────────────┘ │  │
│  │                       │ │                                 │  │
│  │                       │ │ [שמור הערכה]  [אשר ושלח ללקוח] │  │
│  └───────────────────────┘ └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Key UI Changes

| Element | Current | Proposed |
|---------|---------|----------|
| **Layout direction** | LTR | RTL |
| **Panel order** | List left, Detail right | List right, Detail left |
| **Algorithm decision** | Buried in form | Prominent card at top |
| **"Correct" action** | None | One-click button |
| **Override section** | Always visible | Collapsed by default |
| **List item status** | No indicator | ✓/✗/○ icons |
| **Sidebar metrics** | Top banner only | Sidebar with reviewed count |
| **Buttons language** | English | Hebrew |
| **Action buttons** | 5 equal buttons | 2 distinct actions |

### 3.3 Component Breakdown

#### 3.3.1 Submissions List (Right Panel)
```jsx
<aside className="w-80" dir="rtl">
  <div className="mb-4">
    <div className="text-lg font-semibold">נבדקו: {reviewed}/{total}</div>
    <div className="text-sm text-slate-600">דיוק: {accuracy}%</div>
  </div>

  <div className="space-y-2">
    {items.map(item => (
      <SubmissionCard
        key={item.id}
        status={item.status} // 'pending' | 'correct' | 'override'
        name={item.contact_name}
        level={item.level}
        onClick={() => selectItem(item.id)}
        isSelected={selectedId === item.id}
      />
    ))}
  </div>

  <div className="mt-4 text-xs text-slate-500">
    ○ ממתין · ✓ אושר · ✗ תוקן
  </div>
</aside>
```

#### 3.3.2 Algorithm Decision Card
```jsx
<Card title="החלטת האלגוריתם" className="border-2 border-petrol/20">
  <div className="flex items-center justify-between">
    <div>
      <div className="text-lg">רמה: <Badge>{levelLabel(score.level)}</Badge></div>
      <div className="mt-2 flex gap-2">
        {['DPO', 'Registration', 'Report'].map(c => (
          <Badge key={c} variant={score[c] ? 'success' : 'neutral'}>
            {c === 'DPO' ? 'DPO' : c === 'Registration' ? 'רישום' : 'דוח'}
          </Badge>
        ))}
      </div>
      <div className="mt-2 text-sm text-slate-600">ציון: {score.confidence}%</div>
    </div>

    <button
      onClick={markCorrect}
      className="px-6 py-3 bg-success text-white rounded-lg text-lg"
    >
      ✓ נכון
    </button>
  </div>
</Card>
```

#### 3.3.3 Key Inputs Card
```jsx
<Card title="קלטים מרכזיים">
  <div className="grid grid-cols-2 gap-2 text-sm">
    {KEY_FIELDS.map(field => (
      <div key={field} className="flex justify-between">
        <span className="text-slate-600">{labels[field]}</span>
        <span>{formatValue(answers[field])}</span>
      </div>
    ))}
  </div>
</Card>
```

#### 3.3.4 Override Section (Collapsed by Default)
```jsx
<Collapsible title="אם לא נכון - תקן" defaultOpen={false}>
  <div className="space-y-3">
    <div>
      <label>רמה נכונה:</label>
      <select value={overrideLevel} onChange={...}>
        <option value="lone">יחיד</option>
        <option value="basic">בסיסית</option>
        <option value="mid">בינונית</option>
        <option value="high">גבוהה</option>
      </select>
    </div>

    <div>
      <label>רכיבים:</label>
      {/* Checkboxes */}
    </div>

    <div>
      <label>הערה:</label>
      <textarea value={overrideNote} onChange={...} />
    </div>

    <button onClick={saveOverride} className="btn-secondary">
      שמור תיקון
    </button>
  </div>
</Collapsible>
```

#### 3.3.5 Action Buttons
```jsx
<div className="flex gap-3 pt-4 border-t">
  <button
    onClick={saveReview}
    className="flex-1 px-4 py-2 bg-petrol text-white rounded-lg"
  >
    שמור הערכה
  </button>

  <button
    onClick={approveAndSend}
    className="flex-1 px-4 py-2 border border-petrol text-petrol rounded-lg"
  >
    אשר ושלח ללקוח
  </button>
</div>
```

---

## 4. Workflow Changes

### 4.1 Happy Path (Algorithm Correct)
1. Open Privacy tab
2. First pending item auto-selected
3. Review "החלטת האלגוריתם" card
4. Click "✓ נכון"
5. Auto-advance to next pending item
6. Repeat

**Time per item: ~5 seconds**

### 4.2 Override Path (Algorithm Wrong)
1. Open item
2. See algorithm decision is wrong
3. Expand "אם לא נכון" section
4. Select correct level
5. Adjust components if needed
6. Add note explaining error
7. Click "שמור תיקון"
8. Auto-advance to next

**Time per item: ~30 seconds**

### 4.3 Send to Client Path
1. Complete review (correct or override)
2. Click "אשר ושלח ללקוח"
3. System publishes report + sends email
4. Item marked as sent

---

## 5. Data Model Changes

### 5.1 Submission Status (New Field)
```typescript
type ReviewStatus = 'pending' | 'correct' | 'override' | 'sent'
```

### 5.2 Review Record (Extend Existing)
```typescript
interface ReviewRecord {
  submission_id: string
  status: ReviewStatus
  reviewed_at: string
  reviewer: string  // For future multi-user

  // If override:
  original_level?: string
  override_level?: string
  override_components?: string[]
  override_note?: string
}
```

### 5.3 API Changes
| Endpoint | Change |
|----------|--------|
| `GET /privacy/submissions` | Add `status` field to response |
| `POST /privacy/save_review` | Accept `status: 'correct' | 'override'` |
| `GET /privacy/metrics` | Add `reviewed_count`, `override_rate` |

---

## 6. UI/UX Specifications

### 6.1 Colors & Visual Language
| Element | Color | Purpose |
|---------|-------|---------|
| Pending (○) | `text-slate-400` | Not yet reviewed |
| Correct (✓) | `text-success` | Algorithm was right |
| Override (✗) | `text-copper` | Algorithm was wrong |
| "נכון" button | `bg-success` | Primary positive action |
| Algorithm card border | `border-petrol/20` | Highlight decision |

### 6.2 Typography
- **Section titles:** `text-lg font-semibold text-petrol`
- **Field labels:** `text-sm text-slate-600`
- **Field values:** `text-sm text-offblack`
- **Metrics:** `text-lg font-semibold`

### 6.3 Spacing
- **Card gap:** `space-y-4`
- **Internal card padding:** `p-4`
- **Field rows:** `gap-2`

### 6.4 RTL Implementation
- Add `dir="rtl"` to main container
- Swap panel positions (list right, detail left)
- Use `text-right` for Hebrew labels
- Use `dir="ltr"` for email addresses, URLs

### 6.5 Accessibility
- All buttons: min 44x44px
- `data-testid` on all interactive elements
- `aria-label` on icon-only buttons
- Keyboard: Enter to select item, Tab through form

---

## 7. Implementation Plan

### Phase 1: Layout & RTL (1-2 hours)
1. Add `dir="rtl"` to container
2. Swap panel order
3. Translate button labels to Hebrew
4. Use Card component

### Phase 2: Algorithm Decision Card (1 hour)
5. Create prominent decision display
6. Add "✓ נכון" button
7. Style with border highlight

### Phase 3: Key Inputs Display (30 min)
8. Show key fields in clean grid
9. Remove "תוצאות השאלון" section duplication

### Phase 4: Override Section (1 hour)
10. Create collapsible section
11. Move level/components selection inside
12. Add note field

### Phase 5: List Enhancement (1 hour)
13. Add status icons (✓/✗/○)
14. Add sidebar metrics
15. Implement auto-advance on action

### Phase 6: Polish (30 min)
16. Add data-testid attributes
17. Test keyboard navigation
18. Verify RTL alignment

---

## 8. Files to Modify

| File | Changes |
|------|---------|
| `frontend/src/pages/Privacy/index.jsx` | Main rewrite |
| `frontend/src/components/Card.jsx` | Use existing |
| `frontend/src/components/Badge.jsx` | Use existing |
| `backend/main.py` | Add status field to save_review |

---

## 9. Out of Scope (v1.0)

- Search/filter submissions
- Pagination (20 items sufficient for QA)
- Multi-user review assignment
- Audit log UI
- Export/print functionality
- Mobile optimization

---

## 10. Testing Checklist

- [ ] RTL layout correct
- [ ] All labels in Hebrew
- [ ] "נכון" button saves and advances
- [ ] Override section collapses/expands
- [ ] Status icons show correctly in list
- [ ] Metrics update after review
- [ ] Send email still works
- [ ] Publish report still works

---

## 11. Success Validation

After implementation:
1. Time yourself reviewing 10 items
2. Target: < 3 minutes for 10 correct items
3. Target: < 1 minute per override item
4. All existing functionality preserved
