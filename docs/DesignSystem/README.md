# EISLAW Design System – Quick Use Guide

Use these references before touching any UI code so every screen matches the established visual language.

1. **DESIGN_TOKENS.md** — canonical colors (petrol/copper), typography stack, spacing/radius tokens, RTL rules. Map these to Tailwind variables or CSS custom properties before introducing new values.
2. **TASKS_TEMPLATE.md** — card/layout template shared by the Dashboard, Client cards, Tasks, Privacy, and RAG surfaces. Reuse its structure for headings, helper text, buttons, badges, and error states.
3. **COMPONENT_LIBRARY.md** — checklist of reusable components (cards, pills, alerts, tables) plus the required data-testid/data-action hooks.
4. **Frontend_Dashboard_Plan.md** (in the parent docs folder) — macro layout, routes, and how the tokens tie into Tailwind + React.

Workflow:
- Reference DESIGN_TOKENS first, then pull patterns from TASKS_TEMPLATE/COMPONENT_LIBRARY.
- When creating a new UI surface, link to this guide in the task description so future contributors inherit the same baseline.
