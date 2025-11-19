EISLAW — Testing Protocols
==========================

Purpose
- Establish reliable, autonomous testing across units, integration points, and UI. Tests must run locally and in CI and produce human‑readable and machine‑parsable reports.

Test Layers
- Unit (backend):
  - Scope: pure functions, helpers, request handlers with external calls mocked.
  - Tooling: pytest.
  - Location: EISLAW-WebApp/backend/tests.
  - Naming: test_<area>.py; one behavior per test.
- Integration (backend):
  - Scope: endpoint round‑trips with in‑process TestClient; external services mocked (Airtable/Graph/SharePoint).
  - Tooling: pytest + monkeypatch/requests-mock.
  - Contracts: verify HTTP status codes, JSON shape, and error paths.
  - SharePoint examples covered: `GET /sp/check`, `POST /sp/folder_create`, `GET /api/client/locations` (Graph calls monkeypatched).
- UI Functional (frontend):
  - Scope: navigation, empty states, forms, buttons, state changes, and flows (e.g., Add Client; Add/Done task).
  - Tooling: Playwright (@playwright/test) with Chromium/Firefox/WebKit + a mobile profile.
  - Artifacts: HTML report, JUnit XML, optional trace/video on failure.
  - Network mocking: tests route `**/api/client/summary*` and `**/api/client/locations*` to keep runs deterministic; asserts that clicking "SharePoint" opens a popup to SharePoint/Microsoft login.

Environments
- Local: start backend (uvicorn) and frontend (vite/preview) via `session_start.bat`.
- CI (GitHub Actions): workflow `.github/workflows/ui-tests.yml` builds and runs the same test matrix headless.

Running Tests
- Backend (unit/integration):
  - `cd EISLAW-WebApp/backend`
  - `python -m pytest -q`
- UI Functional:
  - `cd EISLAW-WebApp`
  - `npx playwright test`
  - Reports: `playwright-report/index.html`, `playwright-report/junit.xml`
  - Inspect a failure: `npx playwright show-trace <trace.zip>`

External Services & Mocks
- Microsoft Graph/SharePoint: prefer app‑only flows in code; in tests, mock via Playwright route/pytest stubs.
- Airtable: mock search/create during UI tests with `page.route('**/airtable/*', ...)`.
- Outlook behavior: UI tests assert we open Outlook search (or popup created); do not depend on inbox state.

Selectors & Stability
- Prefer `data-testid` for clickable elements (e.g., `data-testid="add-client-header"`).
- Avoid ambiguous `getByText` matches; scope locators to containers (e.g., row, card) to reduce strict‑mode violations.
- Always cover empty state + populated state.

Quality Gates
- New/changed features must include tests for:
  - The happy path + at least one edge/error path.
  - State changes (loading, success, error, disabled buttons) and accessibility roles.
  - Cross‑browser (Chromium/Firefox/WebKit) and a mobile viewport.

Performance & Flake Handling
- Keep timeouts reasonable (≤30s) and add small waits only when needed.
- On flake, prefer better selectors or mocking over sleeps.

Reporting
- Default reporters: list + HTML + JUnit. CI uploads the artifacts.
- For manual runs, open `playwright-report/index.html` for a visual summary.

Quick Checklist (per feature)
- [ ] Unit tests for new logic
- [ ] Endpoint tests for new routes
- [ ] UI test for the button/form/flow (empty + populated)
- [ ] Cross‑browser & mobile run is green
- [ ] Reports stored/linked
