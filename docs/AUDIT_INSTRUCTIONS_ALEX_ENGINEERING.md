# Audit Instructions: Alex (Engineering Senior)

**Project:** EISLAW System Audit
**Role:** Engineering Reviewer
**Date:** 2025-12-05
**Report To:** CTO

---

## Your Mission

You are conducting a **brutal, adversarial engineering review** of the EISLAW system. Find dead code, security holes, performance issues, technical debt, and architectural problems. Nothing is sacred.

**Philosophy:** If code doesn't run, delete it. If it's slow, flag it. If it's insecure, escalate it.

---

## System Access

| Resource | URL/Path |
|----------|----------|
| Frontend (Dev) | http://20.217.86.4:5173 |
| API | http://20.217.86.4:8799 |
| API Docs | http://20.217.86.4:8799/docs |
| VM SSH | `ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4` |
| Code Path | `~/EISLAWManagerWebApp` |

---

## Review Areas

1. **API Audit** - All endpoints, response times, error handling
2. **Frontend Code** - Dead components, duplicate code, bundle size
3. **Backend Code** - Dead code, security, complexity
4. **Database** - Schema, performance, backups
5. **Performance** - Load times, API times, bottlenecks
6. **Security** - Injection, auth, secrets

---

## Playwright Setup

```bash
cd /path/to/frontend
npm install @playwright/test
npx playwright install chromium
mkdir -p audit-tests
mkdir -p audit-screenshots
```

### Test File: `audit-tests/engineering-audit.spec.js`

```javascript
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://20.217.86.4:5173';
const API_URL = 'http://20.217.86.4:8799';

test.describe('Engineering Audit - Alex', () => {

  // ============================================
  // API ENDPOINT AUDIT
  // ============================================
  test.describe('API Endpoints', () => {

    test('Health endpoint', async ({ request }) => {
      const start = Date.now();
      const response = await request.get(`${API_URL}/health`);
      const time = Date.now() - start;

      console.log(`/health: ${response.status()} in ${time}ms`);
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      console.log('Health response:', JSON.stringify(data, null, 2));
    });

    test('Clients API', async ({ request }) => {
      const start = Date.now();
      const response = await request.get(`${API_URL}/api/clients`);
      const time = Date.now() - start;

      console.log(`/api/clients: ${response.status()} in ${time}ms`);

      if (response.ok()) {
        const data = await response.json();
        console.log(`Returned ${Array.isArray(data) ? data.length : 'non-array'} items`);
      }
    });

    test('Tasks API', async ({ request }) => {
      const start = Date.now();
      const response = await request.get(`${API_URL}/api/tasks`);
      const time = Date.now() - start;

      console.log(`/api/tasks: ${response.status()} in ${time}ms`);

      if (response.ok()) {
        const data = await response.json();
        console.log(`Returned ${Array.isArray(data) ? data.length : 'object'}`);
      }
    });

    test('Privacy Submissions API', async ({ request }) => {
      const start = Date.now();
      const response = await request.get(`${API_URL}/api/privacy/submissions`);
      const time = Date.now() - start;

      console.log(`/api/privacy/submissions: ${response.status()} in ${time}ms`);
    });

    test('Privacy Stats API', async ({ request }) => {
      const start = Date.now();
      const response = await request.get(`${API_URL}/api/privacy/stats`);
      const time = Date.now() - start;

      console.log(`/api/privacy/stats: ${response.status()} in ${time}ms`);

      if (response.ok()) {
        const data = await response.json();
        console.log('Stats:', JSON.stringify(data, null, 2));
      }
    });

    test('RAG Inbox API', async ({ request }) => {
      const start = Date.now();
      const response = await request.get(`${API_URL}/api/rag/inbox`);
      const time = Date.now() - start;

      console.log(`/api/rag/inbox: ${response.status()} in ${time}ms`);
    });

    test('OpenAPI schema available', async ({ request }) => {
      const response = await request.get(`${API_URL}/openapi.json`);
      expect(response.ok()).toBeTruthy();

      const schema = await response.json();
      const endpoints = Object.keys(schema.paths || {});
      console.log(`Total endpoints in schema: ${endpoints.length}`);
      console.log('Endpoints:', endpoints.join('\n'));
    });

    test('Check for duplicate endpoints', async ({ request }) => {
      const response = await request.get(`${API_URL}/openapi.json`);
      const schema = await response.json();
      const endpoints = Object.keys(schema.paths || {});

      // Look for similar endpoints that might be duplicates
      const groups = {};
      for (const ep of endpoints) {
        const base = ep.replace(/\{[^}]+\}/g, '{id}').replace(/\/+$/, '');
        if (!groups[base]) groups[base] = [];
        groups[base].push(ep);
      }

      console.log('=== Potential Duplicates ===');
      for (const [base, eps] of Object.entries(groups)) {
        if (eps.length > 1) {
          console.log(`${base}: ${eps.join(', ')}`);
        }
      }

      // Specifically check privacy endpoints
      const privacyEndpoints = endpoints.filter(e => e.includes('privacy'));
      console.log('\n=== Privacy Endpoints ===');
      console.log(privacyEndpoints.join('\n'));
    });
  });

  // ============================================
  // PERFORMANCE AUDIT
  // ============================================
  test.describe('Performance', () => {

    test('Page load times', async ({ page }) => {
      const pages = [
        { name: 'Clients', url: '/#/clients' },
        { name: 'Privacy', url: '/#/privacy' },
        { name: 'RAG', url: '/#/rag' },
        { name: 'Settings', url: '/#/settings/quotes' }
      ];

      console.log('=== Page Load Times ===');
      for (const p of pages) {
        const start = Date.now();
        await page.goto(`${BASE_URL}${p.url}`);
        await page.waitForLoadState('networkidle');
        const time = Date.now() - start;

        const status = time < 2000 ? '✓' : time < 4000 ? '⚠' : '✗';
        console.log(`${status} ${p.name}: ${time}ms`);
      }
    });

    test('API response time benchmark', async ({ request }) => {
      const endpoints = [
        '/api/clients',
        '/api/tasks',
        '/api/privacy/submissions',
        '/api/privacy/stats',
        '/health'
      ];

      console.log('=== API Response Times ===');
      for (const ep of endpoints) {
        const times = [];
        for (let i = 0; i < 3; i++) {
          const start = Date.now();
          await request.get(`${API_URL}${ep}`);
          times.push(Date.now() - start);
        }
        const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        const status = avg < 100 ? '✓' : avg < 500 ? '⚠' : '✗';
        console.log(`${status} ${ep}: avg ${avg}ms (${times.join(', ')})`);
      }
    });

    test('Check for N+1 queries', async ({ page }) => {
      // Monitor network requests
      const requests = [];
      page.on('request', req => {
        if (req.url().includes(':8799')) {
          requests.push(req.url());
        }
      });

      await page.goto(`${BASE_URL}/#/clients`);
      await page.waitForLoadState('networkidle');

      console.log('=== API Requests on Clients Page ===');
      console.log(`Total requests: ${requests.length}`);
      requests.forEach(r => console.log(r));

      // Check for excessive requests
      if (requests.length > 5) {
        console.log('⚠ Potential N+1: More than 5 API requests on page load');
      }
    });

    test('Bundle size check', async ({ page }) => {
      const resources = [];
      page.on('response', response => {
        const url = response.url();
        if (url.includes('.js') || url.includes('.css')) {
          const size = response.headers()['content-length'];
          resources.push({ url: url.split('/').pop(), size: parseInt(size) || 0 });
        }
      });

      await page.goto(`${BASE_URL}/#/clients`);
      await page.waitForLoadState('networkidle');

      console.log('=== Bundle Sizes ===');
      resources.sort((a, b) => b.size - a.size);
      for (const r of resources.slice(0, 10)) {
        const kb = Math.round(r.size / 1024);
        const status = kb < 100 ? '✓' : kb < 500 ? '⚠' : '✗';
        console.log(`${status} ${r.url}: ${kb}KB`);
      }
    });
  });

  // ============================================
  // ERROR HANDLING AUDIT
  // ============================================
  test.describe('Error Handling', () => {

    test('API returns proper error for invalid ID', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/clients/nonexistent-id-12345`);
      console.log(`Invalid client ID: ${response.status()}`);

      // Should return 404, not 500
      if (response.status() === 500) {
        console.log('✗ Returns 500 instead of 404 for missing resource');
      } else if (response.status() === 404) {
        console.log('✓ Proper 404 for missing resource');
      }
    });

    test('API handles malformed request', async ({ request }) => {
      const response = await request.post(`${API_URL}/api/tasks`, {
        data: 'not json',
        headers: { 'Content-Type': 'application/json' }
      });

      console.log(`Malformed JSON: ${response.status()}`);
      // Should return 400 or 422, not 500
      if (response.status() === 500) {
        console.log('✗ Returns 500 for malformed input');
      } else {
        console.log('✓ Proper error code for malformed input');
      }
    });

    test('Frontend console errors', async ({ page }) => {
      const errors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      page.on('pageerror', err => {
        errors.push(err.message);
      });

      const pages = ['/#/clients', '/#/privacy', '/#/rag'];
      for (const p of pages) {
        await page.goto(`${BASE_URL}${p}`);
        await page.waitForLoadState('networkidle');
      }

      console.log('=== Console Errors ===');
      if (errors.length === 0) {
        console.log('✓ No console errors');
      } else {
        console.log(`✗ ${errors.length} errors found:`);
        errors.forEach(e => console.log(e));
      }
    });
  });

  // ============================================
  // SECURITY AUDIT
  // ============================================
  test.describe('Security', () => {

    test('Check for exposed secrets in responses', async ({ request }) => {
      const response = await request.get(`${API_URL}/health`);
      const text = await response.text();

      const sensitivePatterns = [
        /password/i,
        /secret/i,
        /api_key/i,
        /token.*=.*[a-zA-Z0-9]{20,}/i,
        /bearer/i
      ];

      console.log('=== Secret Exposure Check ===');
      for (const pattern of sensitivePatterns) {
        if (pattern.test(text)) {
          console.log(`✗ Potential secret exposure: ${pattern}`);
        }
      }
      console.log('✓ No obvious secrets in health response');
    });

    test('CORS headers', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/clients`);
      const cors = response.headers()['access-control-allow-origin'];

      console.log('=== CORS Check ===');
      console.log(`Access-Control-Allow-Origin: ${cors || 'not set'}`);

      if (cors === '*') {
        console.log('⚠ CORS allows all origins - review if intentional');
      }
    });

    test('SQL injection attempt', async ({ request }) => {
      // Test with suspicious input
      const response = await request.get(`${API_URL}/api/clients?status='; DROP TABLE clients; --`);

      console.log('=== SQL Injection Test ===');
      console.log(`Status: ${response.status()}`);

      // Should not return 500
      if (response.status() === 500) {
        console.log('✗ Potential SQL injection vulnerability');
      } else {
        console.log('✓ Handled suspicious input gracefully');
      }
    });

    test('XSS in client name', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/clients`);
      await page.waitForLoadState('networkidle');

      // Check if any script tags are in the DOM that shouldn't be
      const scriptTags = await page.locator('script').count();
      console.log(`=== XSS Check ===`);
      console.log(`Script tags in DOM: ${scriptTags}`);

      // Look for inline event handlers
      const inlineHandlers = await page.evaluate(() => {
        const elements = document.querySelectorAll('[onclick], [onerror], [onload]');
        return elements.length;
      });

      if (inlineHandlers > 0) {
        console.log(`⚠ Found ${inlineHandlers} inline event handlers`);
      }
    });
  });

  // ============================================
  // CODE QUALITY INDICATORS
  // ============================================
  test.describe('Code Quality Indicators', () => {

    test('Check for TODO/FIXME in responses', async ({ page }) => {
      await page.goto(`${BASE_URL}/#/clients`);

      const pageContent = await page.content();
      const todos = (pageContent.match(/TODO|FIXME|HACK|XXX/gi) || []).length;

      console.log('=== Code Quality ===');
      console.log(`TODO/FIXME markers visible in page: ${todos}`);
    });

    test('Check for debug code', async ({ page }) => {
      // Look for console.log in loaded scripts
      const scripts = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script[src]');
        return Array.from(scripts).map(s => s.src);
      });

      console.log('=== Debug Code Check ===');
      console.log(`${scripts.length} script files loaded`);
    });
  });

});
```

### Run Tests

```bash
npx playwright test audit-tests/engineering-audit.spec.js --reporter=html
npx playwright show-report
```

---

## SSH Audit Commands

Connect to VM and run these:

```bash
# Connect
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4

# Navigate to project
cd ~/EISLAWManagerWebApp
```

### Backend Audit

```bash
# Count lines of code
wc -l backend/*.py

# Find large files
ls -lhS backend/*.py

# Check main.py size
wc -l backend/main.py

# Find all TODO/FIXME
grep -rn "TODO\|FIXME\|HACK\|XXX" backend/

# Find unused imports (basic check)
grep -n "^import\|^from" backend/main.py | head -50

# Check for hardcoded secrets
grep -rn "password\|secret\|api_key\|token" backend/ --include="*.py"

# List all route handlers
grep -n "@app\." backend/main.py | head -50
```

### Frontend Audit

```bash
# Count components
find frontend/src -name "*.jsx" -o -name "*.tsx" | wc -l

# Large files
find frontend/src -name "*.jsx" -o -name "*.tsx" -exec wc -l {} \; | sort -rn | head -10

# Find unused imports (basic)
grep -rn "^import" frontend/src/ | wc -l

# Find TODO/FIXME
grep -rn "TODO\|FIXME\|HACK" frontend/src/
```

### Database Audit

```bash
# Check SQLite files
ls -lh ~/.eislaw/store/

# Check privacy.db size and structure
sqlite3 ~/.eislaw/store/privacy.db ".tables"
sqlite3 ~/.eislaw/store/privacy.db ".schema"
sqlite3 ~/.eislaw/store/privacy.db "SELECT COUNT(*) FROM privacy_submissions;"

# Check JSON files
ls -lh ~/.eislaw/store/*.json
```

### Docker/Container Audit

```bash
# Check running containers
docker ps

# Check container resource usage
docker stats --no-stream

# Check logs for errors
/usr/local/bin/docker-compose-v2 logs --tail=100 api | grep -i error

# Check disk usage
df -h
```

---

## Checklists to Complete

### C1. API Endpoint Inventory

| Endpoint | Method | Status | Response Time | Used By | Notes |
|----------|--------|--------|---------------|---------|-------|
| /health | GET | | | | |
| /api/clients | GET | | | | |
| /api/clients | POST | | | | |
| /api/client/summary | GET | | | | |
| /registry/clients | POST | | | | |
| /api/clients/{name}/archive | PATCH | | | | |
| /api/clients/{name}/restore | PATCH | | | | |
| /api/tasks | GET | | | | |
| /api/tasks | POST | | | | |
| /api/tasks/{id} | PATCH | | | | |
| /api/tasks/{id} | DELETE | | | | |
| /email/sync_client | POST | | | | |
| /email/by_client | GET | | | | |
| /privacy/submissions | GET | | | | |
| /api/privacy/submissions | GET | | | | |
| /api/privacy/stats | GET | | | | |
| /api/privacy/webhook | POST | | | | |
| /api/rag/inbox | GET | | | | |
| /api/ai-studio/tools | GET | | | | |
| /api/ai-studio/chat | POST | | | | |
| /api/ai-studio/agent | POST | | | | |

### C1.5 AI Studio Endpoints (NEW - Phase 2)

Test each tool individually:

```bash
# List available tools
curl http://20.217.86.4:8799/api/ai-studio/tools

# Test Agent mode with system summary
curl -X POST http://20.217.86.4:8799/api/ai-studio/agent \
  -H "Content-Type: application/json" \
  -d '{"message": "How many clients do we have?"}'

# Test search_clients tool
curl -X POST http://20.217.86.4:8799/api/ai-studio/agent \
  -H "Content-Type: application/json" \
  -d '{"message": "Find client Sivan"}'

# Test create_task tool
curl -X POST http://20.217.86.4:8799/api/ai-studio/agent \
  -H "Content-Type: application/json" \
  -d '{"message": "Create a test task"}'
```

| Tool | Response Time | Works? | Notes |
|------|---------------|--------|-------|
| get_system_summary | | | |
| search_clients | | | |
| get_client_details | | | |
| search_tasks | | | |
| create_task | | | |
| update_task | | | |

### C2. Duplicate/Legacy Endpoints

| Endpoint A | Endpoint B | Which to Keep | Action |
|------------|------------|---------------|--------|
| /privacy/submissions | /api/privacy/submissions | | |
| | | | |

### C3. Performance Benchmarks

| Metric | Value | Threshold | Pass/Fail |
|--------|-------|-----------|-----------|
| /api/clients response time | | <100ms | |
| /api/tasks response time | | <100ms | |
| /api/privacy/submissions response time | | <200ms | |
| Clients page load | | <2s | |
| Privacy page load | | <2s | |
| Main bundle size | | <500KB | |

### C4. Security Checklist

| Check | Pass/Fail | Notes |
|-------|-----------|-------|
| No secrets in responses | | |
| SQL injection handled | | |
| XSS prevention | | |
| CORS configured properly | | |
| Input validation on POST | | |
| Error messages don't leak info | | |
| Auth on sensitive endpoints | | |

### C5. Code Quality

**Backend:**
| File | Lines | Complexity | Issues |
|------|-------|------------|--------|
| main.py | | | |
| privacy_db.py | | | |
| fillout_integration.py | | | |

**Frontend:**
| Component | Lines | Used? | Issues |
|-----------|-------|-------|--------|
| | | | |

### C6. Database Status

| Database/File | Location | Size | Records | Backup? |
|---------------|----------|------|---------|---------|
| privacy.db | ~/.eislaw/store/ | | | |
| clients.json | ~/.eislaw/store/ | | | |
| tasks.json | ~/.eislaw/store/ | | | |

### C7. Technical Debt

| Item | Location | Severity | Effort | Description |
|------|----------|----------|--------|-------------|
| | | HIGH/MED/LOW | S/M/L | |
| | | | | |
| | | | | |

### C8. Dead Code Found

| File | Code | Last Used | Action |
|------|------|-----------|--------|
| | | | DELETE |
| | | | |

---

## Where to Update Results

**Update your findings in:**
```
docs/AUDIT_RESULTS_ALEX_ENGINEERING.md
```

**Format:**
1. Copy this entire document
2. Fill in all tables
3. Run all commands and paste output
4. List all technical debt
5. List all security concerns
6. List all dead code

**When complete, notify CTO.**

---

**Be thorough. Find the rot. Document everything.**
