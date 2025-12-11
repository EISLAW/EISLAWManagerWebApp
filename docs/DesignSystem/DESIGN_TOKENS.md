# EISLAW UI — Design Tokens (RTL)

Purpose: shared, reusable tokens to keep a single visual language across Dashboard, Tasks, Privacy, and future modules. Tokens map directly to CSS variables and React constants.

CSS Variables (brand, typography, layout)
```css
:root {
  /* Brand */
  --petrol: #0B3B5A;  /* primary */
  --copper: #D07655;  /* accent */
  --text:   #1F2733;  /* off-black */
  --muted:  #666A72;
  --line:   #F3F4F6;  /* separators */
  --card:   #F7F8FA;  /* panels */

  /* Typography */
  --font-hebrew: "Noto Sans Hebrew", "David", system-ui, -apple-system, Segoe UI, Arial, sans-serif;
  --fs-title: 26pt;
  --fs-subtitle: 18pt;
  --fs-heading: 20pt;
  --fs-body: 15pt;
  --lh-base: 1.6;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --shadow-md: 0 4px 16px rgba(0,0,0,0.08);
}

html[dir="rtl"], body[dir="rtl"] { direction: rtl; }
```

Priority Tokens
```css
.priority-high   { background: #FEE2E2; color: #B91C1C; border-color: #FCA5A5; }
.priority-medium { background: #FEF3C7; color: #B45309; border-color: #FCD34D; }
.priority-low    { background: #DCFCE7; color: #166534; border-color: #86EFAC; }
```

Iconography
- Library: lucide-react
- Sizes: 16, 20, 24 (consistent touch targets ≥ 44px)
- Color: default var(--petrol); contextual override per component

Accessibility
- Hit area ≥ 44x44 px
- Color contrast ≥ 4.5:1 for text
- dir="rtl" on major containers; use `dir="auto"` for mixed LTR strings (emails, URLs)

