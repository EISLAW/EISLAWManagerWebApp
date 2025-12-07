# Agent Integration Tests

Integration tests for the EISLAW Agent system API endpoints.

## Overview

These tests cover the agent-related API endpoints as defined in `PRD_AGENTS_ARCHITECTURE.md`:

| Test File | Endpoints | Tests |
|-----------|-----------|-------|
| `agent-registry.spec.ts` | `/api/agents`, `/api/agents/{id}`, `/api/agents/{id}/invoke` | 8 |
| `agent-approvals.spec.ts` | `/api/approvals`, `/api/approvals/{id}/approve`, `/api/approvals/{id}/reject` | 9 |
| `agent-audit.spec.ts` | `/api/agents/audit` | 9 |
| **Total** | | **26 tests** |

## Prerequisites

- Node.js 18+
- Playwright installed
- Agent API endpoints deployed (tests skip gracefully if not ready)

## Running Tests

```bash
# SSH to Azure VM
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4

# Navigate to test directory
cd ~/EISLAWManagerWebApp/tests/integration/agents

# Run all agent tests
npx playwright test --config=playwright.agents.config.ts

# Run specific test file
npx playwright test agent-registry.spec.ts --config=playwright.agents.config.ts

# Run with verbose output
npx playwright test --config=playwright.agents.config.ts --reporter=list
```

## Test Behavior

### Skip on 404
All tests check if endpoints return 404 (not deployed) and skip gracefully:

```typescript
if (response.status() === 404) {
  console.log('Endpoint not yet deployed - skipping');
  test.skip();
  return;
}
```

### Authentication Handling
Tests accept 401 (authentication required) as valid responses:

```typescript
if (response.status() === 401) {
  console.log('Requires authentication - expected');
  expect(response.status()).toBe(401);
  return;
}
```

## Endpoint Coverage

### Agent Registry (`/api/agents`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents` | GET | List all registered agents |
| `/api/agents/{id}` | GET | Get agent details (tools, triggers, approval_required) |
| `/api/agents/{id}/invoke` | POST | Manually invoke agent with message |

### Approvals (`/api/approvals`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/approvals` | GET | List pending approvals |
| `/api/approvals?status=pending` | GET | Filter by status |
| `/api/approvals?agent_id=privacy` | GET | Filter by agent |
| `/api/approvals/{id}/approve` | POST | Approve pending action |
| `/api/approvals/{id}/reject` | POST | Reject pending action |

### Audit Log (`/api/agents/audit`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents/audit` | GET | List audit log entries |
| `/api/agents/audit?agent_id=privacy` | GET | Filter by agent |
| `/api/agents/audit?result=success` | GET | Filter by result |
| `/api/agents/audit?limit=10` | GET | Pagination |
| `/api/agents/audit?from=DATE&to=DATE` | GET | Date range filter |

## Expected Agent Configuration (from PRD)

### Privacy Agent
- `approval_required: true`
- Tools: get_privacy_submission, calculate_privacy_score, draft_privacy_email, publish_privacy_report, send_privacy_email
- Triggers: new_privacy_submission, manual

### Task Agent
- `approval_required: false` (low-risk actions)
- Tools: search_clients, create_task, update_task_status, search_tasks, get_system_summary
- Triggers: manual

## Security Tests

The audit log tests include security validations:
- Checks that sensitive data (API keys, passwords, tokens) are not exposed
- Validates required security fields (timestamp, agent_id, result)
- Response time checks (<2 seconds)

## Status

| Component | Status |
|-----------|--------|
| Test structure | ✅ Complete |
| Registry tests | ✅ Ready (pending endpoint deployment) |
| Approvals tests | ✅ Ready (pending endpoint deployment) |
| Audit tests | ✅ Ready (pending endpoint deployment) |

**Note:** Tests are ready and will run once Alex (Agent Registry Backend) and Joseph (Agent Database Tables) complete their tasks.
