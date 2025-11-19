<!-- Project: SystemCore | Full Context: docs/System_Definition.md -->
# SaaS UI Research – Law Practice Management

Goal
- Align the EISLAW Dashboard UX with common patterns in leading law‑firm SaaS tools, while preserving our unique modules (SFU, PrivacyExpress, RAG).

Observed conventions (market leaders)
- Global layout: persistent left sidebar nav + top app bar (search, quick‑add, user menu).
- Primary entities: Matters/Cases, Contacts/Clients, Tasks, Calendar, Documents (DMS), Time/Billing/Accounting, Messages, Reports.
- “Matter/Client Workspace” tabs: Overview, Notes, Tasks, Events/Calendar, Emails/Comms, Documents, Billing/Time, Activity.
- List views: table with filters, quick search, saved views, bulk actions. Sort + pagination.
- Dashboards: KPI tiles + activity feed; quick filters (time, user, status).
- Document actions: open online (SharePoint/DMS), preview, version history.
- Tasks: simple Kanban or list with inline status/priority/due, quick add, assignees.
- Consistent badges/pills for status, priority, and workflow stage.

Mapping to EISLAW
- Sidebar
  - Dashboard, Clients, Projects, RAG, Documents (SharePoint), Admin (Users, Integrations).
- Client Card (workspace)
  - Tabs: Overview, Files (Local/SharePoint), Emails (Threads), Tasks/Deadlines, RAG Insights, Privacy (placeholder; enable later).
  - Overview KPIs: Phase (SFU), Next deadline, Open tasks, Last email.
  - StagePills: SFU phases with current highlight.
- Projects
  - Kanban board (Not Started / In Progress / On Hold / Completed), click‑through to details later.
- RAG
  - Search box + filters (client/date/type), results with snippets and source link.
- Documents
  - Global SharePoint search + quick open.
- Admin
  - Users/Roles; Integrations Health.

UI guidelines
- RTL‑friendly layout; English labels allowed with Hebrew content.
- Brand tokens: petrol #0B3B5A (primary), copper #D07655 (accent), bg #F3F4F6.
- Cards: rounded‑2xl, shadow‑md, p‑4; headings semibold xl/2xl.
- Tables: sticky header, hover row, right‑aligned text where natural.
- Quick‑add: floating button or app bar action for new Task/Project.

Next
- Keep PrivacyExpress as a disabled tab initially; wire later to the scoring backend.
- Add a global search box in the app bar in a following iteration.

