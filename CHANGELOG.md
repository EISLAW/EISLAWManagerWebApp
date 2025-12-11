# CHANGELOG

All notable changes to the EISLAW Manager Web App are documented here.

## [2025-12-04] - Production Monitoring Stack (Phase 3)
## [2025-12-05] - AI Agent Tool Calling (AI Studio Phase 2)

### Added - AI Agent Capabilities
- **Tool Calling Framework** - AI can now perform actions in the system
  - LLM decides when to use tools based on user requests
  - Supports Gemini, Claude, and OpenAI providers
  - Maximum 5 tool iterations per request (prevents infinite loops)

- **6 Agent Tools**:
  | Tool | Description |
  |------|-------------|
  | search_clients | Search clients by name, email, or phone |
  | get_client_details | Get full details for a specific client |
  | search_tasks | Search/filter tasks by title, client, status |
  | create_task | Create new tasks with priority, due date, client |
  | update_task_status | Mark tasks as done, in_progress, blocked |
  | get_system_summary | Get system statistics (clients, tasks, etc.) |

- **Agent Mode Toggle** - UI button to switch between Chat Mode and Agent Mode
- **Tool Event Display** - Shows tool calls and results during streaming
- **New API Endpoint** - GET /api/ai-studio/tools lists available tools

### Files Added
- backend/ai_studio_tools.py - Tool definitions and execution logic

### Files Modified
- backend/ai_studio.py - Added tool calling support, TOOLS_SYSTEM_PROMPT
- backend/main.py - Added ai_studio router include
- frontend/src/pages/AIStudio/index.jsx - Added Agent Mode toggle and tool display

### Technical Notes
- Tools read/write directly to JSON data files (clients.json, tasks.json)
- Will integrate with SQLite when migration completes (see PRD_SQLITE_MIGRATION.md)
- Task status values use current format: new/in_progress/done/blocked

### Testing
- curl test: Tool calling works end-to-end
- Task creation via AI: Verified working
- System summary via AI: Verified working


### Added - Full Monitoring Infrastructure
- **Prometheus** - Metrics collection and alerting
  - Scrapes API /metrics endpoint every 15s
  - Stores time-series data
  - Port: 9090

- **Grafana** - Visualization and dashboards
  - Pre-configured EISLAW API dashboard
  - 6 panels: Request rate, Error %, Latency p95/p50, Status codes, External APIs, Logs
  - Port: 3000 (admin/eislaw2024)

- **Loki** - Log aggregation
  - 31-day retention
  - Indexed by service, level, correlation_id
  - Port: 3100

- **Promtail** - Log shipping
  - Scrapes Docker container logs
  - Parses JSON structured logs
  - Auto-discovers EISLAW containers

- **Alertmanager** - Alert routing
  - Routes alerts to API webhook
  - Configurable for email/Slack/PagerDuty
  - Port: 9093

### Added - Alert Rules
- **HighErrorRate** - >5% error rate for 2min (critical)
- **APIDown** - API unreachable for 1min (critical)
- **HighLatency** - p95 latency >2s for 5min (warning)
- **ExternalAPIFailures** - External API errors >0.1/s (warning)
- **HighMemoryUsage** - Memory >500MB (warning)
- **NoActiveClients** - Zero clients for 10min (warning)

### Files Added
- `monitoring/docker-compose.yml` - Full stack configuration
- `monitoring/prometheus.yml` - Prometheus scrape config
- `monitoring/loki-config.yml` - Loki storage config
- `monitoring/promtail-config.yml` - Log scraping config
- `monitoring/alert_rules.yml` - Prometheus alert rules
- `monitoring/alertmanager.yml` - Alert routing config
- `monitoring/provisioning/datasources/datasources.yml` - Grafana datasources
- `monitoring/provisioning/dashboards/dashboards.yml` - Dashboard provisioning
- `monitoring/provisioning/dashboards/eislaw-api.json` - Main dashboard

### Access URLs (Azure VM)
- Grafana: http://20.217.86.4:3000
- Prometheus: http://20.217.86.4:9090
- Alertmanager: http://20.217.86.4:9093

### Next Actions (Post-Deployment)
- [ ] Configure SENTRY_DSN (requires Sentry.io account)
- [ ] Add LOG_LEVEL environment variable for production
- [ ] Secure Grafana password via environment variable
- [ ] Add TLS termination for monitoring endpoints (when scaling)

---

# CHANGELOG

All notable changes to the EISLAW Manager Web App are documented here.

## [2025-12-04] - Production Logging Infrastructure (Phase 2)
## [2025-12-04] - SharePoint Integration V2 - Quality Fixes

### P0 Fixes (Critical)

- **Loading Overlay During Generation**
  - Full-screen overlay with animated spinner
  - Progress bar showing upload percentage
  - Clear Hebrew message: "מייצר את המסמך..."
  - "נא להמתין, המסמך מועלה ל-SharePoint" subtitle

- **Extended Success Message**
  - Duration extended from 1.5s to 3.0s
  - Added clickable "פתח ב-SharePoint" link
  - Success icon (Check) in message
  - Link opens document directly in SharePoint

- **Toast Notification**
  - Persistent toast appears after modal closes
  - 5 second duration with close button
  - Green for success, red for errors
  - Slide-up animation

- **MSAL Token Caching**
  - MSAL app instance now reused (not recreated)
  - Token cached with expiry tracking
  - Site/drive IDs cached
  - Secrets cached for 5 minutes

- **Rate Limiting**
  - 30 requests per minute limit
  - HTTP 429 response when exceeded
  - Automatic cleanup of old requests

### P1 Fixes (Important)

- **Template Name Formatting**
  - Removed "טמפלייט_" prefix
  - Replaced underscores with spaces
  - Removed .docx extension
  - Clean, readable names

- **Accessibility Improvements**
  - Added `aria-label` to all buttons
  - Added `role="dialog"` and `aria-modal="true"` to modal
  - Added `role="listbox"` to template list
  - Added `role="alert"` to error messages
  - Added `aria-labelledby` for modal title
  - All icons have `aria-hidden="true"`

### Code Quality

- Added input validation (client_name length limit)
- Added httpx timeouts (30-60 seconds)
- Improved error handling with graceful degradation
- Added cache status to health endpoint

### Test Results

| Metric | Before | After |
|--------|--------|-------|
| Playwright Score | 8.6/10 | 9.5/10 |
| PM Review | 7.0/10 | 8.5/10 |
| Engineering Review | 6.0/10 | 8.0/10 |
| UX/UI Review | 5.5/10 | 8.0/10 |
| **Final Score** | **6.9/10** | **8.6/10** |

### Files Modified

- `frontend/src/components/TemplatePicker.jsx` - Complete rewrite with all UX fixes
- `backend/word_api.py` - Token caching, rate limiting, input validation


### Fixed - Critical Issues from Review
- **Bare `except:` clauses** - Fixed 6 instances in main.py that were swallowing all exceptions
  - Manifest loading
  - Zoom manifest loading (2 places)
  - Notifications loading
  - Get notifications endpoint
  - Update notification endpoint
- **print() statements** - Replaced with structured logging in:
  - `fillout_integration.py` - 2 print statements converted to logger.error()
  - `word_api.py` - 8 print statements converted to logger.error()/logger.warning()

### Added - Monitoring & Observability
- **Prometheus /metrics endpoint** - Exposes Python GC and custom metrics
- **Sentry integration** (`backend/sentry_config.py`)
  - Error tracking ready (set SENTRY_DSN to activate)
  - Automatic sensitive data filtering
  - FastAPI integration
- **PII Filter** (`backend/pii_filter.py`)
  - Automatic redaction of emails, phone numbers, Israeli IDs
  - Sensitive field detection (passwords, tokens, API keys)
  - Integrated into logging
- **React Error Boundary** (`frontend/src/components/ErrorBoundary.jsx`)
  - Catches frontend crashes
  - Hebrew error message with retry button
  - Sends errors to backend `/api/log/error`
- **Frontend error logging endpoint** (`POST /api/log/error`)
  - Receives frontend errors
  - Applies PII filtering
  - Forwards to Sentry if configured

---

## [2025-12-04] - Production Logging Infrastructure (Phase 1)

### Added
- **Structured Logging System**
  - `backend/logging_config.py` - JSON formatter with correlation ID support
  - `backend/middleware.py` - Request tracking middleware
  - `tools/worker_logging.py` - Shared logger for background workers
  - Industry-standard JSON log format for ELK/Grafana compatibility

- **Correlation ID Tracking**
  - Unique `correlation_id` (e.g., `req-4845c6ea57dd`) for every request
  - ID returned in `X-Correlation-ID` response header
  - Enables end-to-end request tracing across services

- **Request/Response Logging**
  - All requests logged with: method, path, client IP, duration
  - 4xx/5xx responses logged as WARNING level
  - Exceptions logged with full traceback

- **Docker Log Configuration**
  - Log rotation: 50MB max, 5 files retained
  - JSON log driver for parsing
  - Persistent log volume `eislaw_logs`

### Fixed
- **Silent Exception Handlers**
  - `load_secrets()` - now logs errors instead of silently failing
  - `load_tasks()` - now logs errors instead of returning empty
  - `load_tasks_archive()` - now logs warnings

- **Worker Logging**
  - `email_sync_worker.py` - Converted from print() to structured JSON logs

### Changed
- Replaced all `print()` statements in `main.py` with structured `logger.error()`/`logger.info()` calls
- Removed deprecated `version: "3.9"` from docker-compose.yml

### Log Format Example
```json
{
  "timestamp": "2025-12-04T09:26:07.671199+00:00",
  "level": "INFO",
  "service": "api",
  "correlation_id": "req-4845c6ea57dd",
  "logger": "eislaw.api",
  "message": "Request completed",
  "details": {
    "method": "GET",
    "path": "/api/clients",
    "status_code": 200,
    "duration_ms": 1.83
  }
}
```

### Rollback
To rollback logging changes:
1. Restore `main.py` from `main.py.pre-logging`
2. Remove `backend/logging_config.py` and `backend/middleware.py`
3. Restart API container

---

## [2025-12-04] - UI Fixes & TemplatePicker Implementation

### Added
- **Word Document Generation API** (`/word/*` routes)
  - `GET /word/templates` - List available document templates
  - `POST /word/generate` - Generate document from template for client
  - `GET /word/templates_root` - Get templates folder path/URL
  - Created `backend/word_api.py` with 10 sample templates

- **Files Tab SharePoint Button**
  - Added "Open SharePoint Folder" button to Files tab
  - Shows alert if no SharePoint URL configured for client

### Fixed
- **TemplatePicker Modal**
  - Completely redesigned to match QuoteModal/DeliveryEmailModal style
  - Now properly loads templates from API
  - Shows success/error messages
  - Auto-closes after successful generation
  - "Open Folder" button opens SharePoint URL

- **SharePoint (SP) Button in Client List**
  - Now shows Hebrew alert when no SharePoint URL configured
  - Message: "לא נמצא קישור SharePoint ללקוח זה. יש להגדיר תחילה."

- **"New" Tag on Clients**
  - Changed from "חדש" to "להגדרה" (needs setup)
  - Improved tooltip explaining the tag means client needs Airtable or SharePoint configuration

- **Email Scrolling**
  - Added `max-h-[60vh] overflow-y-auto` to full emails tab
  - Email widget on overview already had scrolling (`max-h-[280px]`)

- **Email Widget Click Handler**
  - Email rows now clickable to show inline preview
  - Added `cursor-pointer` styling

### Technical Details
- Backend API running on port 8799
- Frontend dev server on port 5173
- All changes tested with Playwright automated tests
- 9/10 Senior UI Review tests passed

### Pending (Next Actions)
- Implement real SharePoint template fetching
- Add python-docx placeholder filling with client data
- Save generated documents to client's SharePoint folder
- Return actual SharePoint URLs to generated documents

---

## [2025-12-03] - Quick Actions Implementation

### Added
- **Quick Actions Component** (`QuickActions.jsx`)
  - Three action buttons: Quote, Documents, Delivery
  - Accessible with ARIA labels
  - RTL-aware design

- **QuoteModal Component**
  - Template selection for price quotes
  - Preview functionality
  - Open in Outlook integration

- **DeliveryEmailModal Component**
  - Template selection for delivery emails
  - Document attachment selection from SharePoint
  - Preview and Outlook integration

### Fixed
- Gray screen bug caused by duplicate toast render in ClientOverview.jsx

---

## [2025-11-30] - Initial Setup

### Added
- Project scaffolding
- Docker Compose configuration
- FastAPI backend
- Vite + React frontend
- Basic client management
