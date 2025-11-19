EISLAW WebApp — Testing Guide
=============================

Layers
- Backend (pytest): in `backend/tests`. Covers utilities, endpoints (with TestClient), and error paths.
- UI (Playwright): in `tests`. Covers navigation, Clients (empty + populated), Add Client modal (with mocked network), and Dashboard tasks.

Local Run
- Start services: `session_start.bat`
- Backend: `cd backend && python -m pytest -q`
- UI: `cd .. && npx playwright test`

Reports
- Playwright HTML report: `playwright-report/index.html`
- JUnit: `playwright-report/junit.xml`

CI
- Workflow: `.github/workflows/ui-tests.yml` (Windows runner). Artifacts uploaded automatically.

Selectors
- Prefer `data-testid` on buttons/inputs likely to collide. Scope locators to containers (row/card) to avoid strict‑mode violations.

Mocks
- Use `page.route('**/sp/folder_create', ...)` and `page.route('**/registry/clients', ...)` to validate UI without real writes in CI.

Edge Cases to Cover
- Empty lists (Clients/Tasks)
- Required fields disabled until valid
- Network failures (mock 500) show error toasts and keep forms enabled

