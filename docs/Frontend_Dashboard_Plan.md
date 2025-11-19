<!-- Project: SystemCore | Full Context: docs/System_Definition.md -->
# EISLAW Dashboard – Frontend Plan

Purpose
- Ship a clean, scalable React UI focused on Client Card and SFU workflow, with placeholders for PrivacyExpress to be enabled later.

Scope (phase 1)
- Visual-first build: theme, layout, core components, routes, fixtures.
- Client Card tabs: overview, files, emails, tasks, RAG. Privacy tab present but disabled/placeholder.
- Demo Mode toggle to load fixtures when backend is unavailable.

Tech
- React + Vite, React Router, TanStack Query, Axios
- TailwindCSS with RTL support; brand colors: petrol #0B3B5A, copper #D07655, bg #F3F4F6
- Icons: lucide-react

Routes
- / (Dashboard)
- /clients (list)
- /clients/:id (tabs: overview | files | emails | tasks | rag | privacy-disabled)
- /projects (kanban)
- /rag (search)
- /admin (users & integrations health)

Deliverables
- Working scaffold with components: Card, KPI, StagePills, Badge, Table, TabNav, Skeleton, EmptyState
- Fixtures for clients, files, emails, tasks, rag results
- Axios instance + React Query baseline (VITE_API_URL, with Demo Mode fallback)

Out of scope (phase 1)
- Full PrivacyExpress workflow (kept as placeholder)
- Auth flows; use stubbed user for now

Next steps
1) Scaffold frontend/ app with Vite + Tailwind (RTL) + routes
2) Add theme + core components + fixtures
3) Wire Client Card tabs to fixtures
4) Add Integrations Health page calling tools/integrations_health.py (local) or /api/integrations/health when backend exists
5) Testing policy: run Playwright smoke after build/preview to verify the app renders (see tools/playwright_probe.mjs). Assistants must validate locally before surfacing to the owner.
