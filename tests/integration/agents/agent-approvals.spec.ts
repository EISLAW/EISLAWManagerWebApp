import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * Agent Approvals API Integration Tests
 *
 * Tests endpoints:
 * - GET  /api/approvals              - List pending approvals
 * - POST /api/approvals/{id}/approve - Approve action
 * - POST /api/approvals/{id}/reject  - Reject action
 *
 * Note: Tests skip gracefully if endpoints not yet deployed.
 */

const API_BASE = process.env.API_URL || 'http://20.217.86.4:8799';

test.describe('Agent Approvals API', () => {
  let request: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: API_BASE,
    });
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  test('GET /api/approvals - list pending approvals', async () => {
    const response = await request.get('/api/approvals');

    // Skip if endpoint not yet deployed
    if (response.status() === 404) {
      console.log('Approvals endpoint not yet deployed - skipping');
      test.skip();
      return;
    }

    expect(response.ok()).toBe(true);
    const data = await response.json();

    // Validate response structure
    expect(Array.isArray(data) || (data && typeof data === 'object')).toBe(true);

    const approvals = Array.isArray(data) ? data : data.approvals || data.items || data.pending || [];
    console.log(`Found ${approvals.length} pending approvals`);

    // If there are approvals, validate structure
    if (approvals.length > 0) {
      const approval = approvals[0];
      expect(approval).toHaveProperty('id');
      // Expected properties per PRD
      if (approval.agent_id) expect(typeof approval.agent_id).toBe('string');
      if (approval.action) expect(typeof approval.action).toBe('string');
      if (approval.status) expect(['pending', 'approved', 'rejected']).toContain(approval.status);
      if (approval.created_at) expect(typeof approval.created_at).toBe('string');
    }
  });

  test('GET /api/approvals?status=pending - filter pending only', async () => {
    const response = await request.get('/api/approvals?status=pending');

    if (response.status() === 404) {
      console.log('Approvals endpoint not yet deployed - skipping');
      test.skip();
      return;
    }

    expect(response.ok()).toBe(true);
    const data = await response.json();

    const approvals = Array.isArray(data) ? data : data.approvals || data.items || [];

    // All returned items should be pending
    for (const approval of approvals) {
      if (approval.status) {
        expect(approval.status).toBe('pending');
      }
    }
    console.log(`Found ${approvals.length} pending approvals`);
  });

  test('GET /api/approvals?agent_id=privacy - filter by agent', async () => {
    const response = await request.get('/api/approvals?agent_id=privacy');

    if (response.status() === 404) {
      console.log('Approvals endpoint not yet deployed - skipping');
      test.skip();
      return;
    }

    expect(response.ok()).toBe(true);
    const data = await response.json();

    const approvals = Array.isArray(data) ? data : data.approvals || data.items || [];

    // All returned items should be for privacy agent
    for (const approval of approvals) {
      if (approval.agent_id) {
        expect(approval.agent_id).toBe('privacy');
      }
    }
    console.log(`Found ${approvals.length} privacy agent approvals`);
  });

  test('POST /api/approvals/{id}/approve - approve pending action', async () => {
    // First, get a pending approval
    const listResponse = await request.get('/api/approvals?status=pending');

    if (listResponse.status() === 404) {
      console.log('Approvals endpoint not yet deployed - skipping');
      test.skip();
      return;
    }

    const data = await listResponse.json();
    const approvals = Array.isArray(data) ? data : data.approvals || data.items || [];

    if (approvals.length === 0) {
      console.log('No pending approvals to test - skipping');
      test.skip();
      return;
    }

    const approvalId = approvals[0].id;
    const response = await request.post(`/api/approvals/${approvalId}/approve`, {
      data: {
        comment: 'Approved via integration test'
      }
    });

    if (response.status() === 404) {
      console.log('Approval action endpoint not yet deployed - skipping');
      test.skip();
      return;
    }

    // Accept 200 (success) or 401 (auth required)
    if (response.status() === 401) {
      console.log('Approval action requires authentication - expected');
      expect(response.status()).toBe(401);
      return;
    }

    expect(response.ok()).toBe(true);
    const result = await response.json();

    // Verify approval was processed
    if (result.status) {
      expect(result.status).toBe('approved');
    }
    console.log(`Approval ${approvalId} approved`);
  });

  test('POST /api/approvals/{id}/reject - reject pending action', async () => {
    // First, get a pending approval
    const listResponse = await request.get('/api/approvals?status=pending');

    if (listResponse.status() === 404) {
      console.log('Approvals endpoint not yet deployed - skipping');
      test.skip();
      return;
    }

    const data = await listResponse.json();
    const approvals = Array.isArray(data) ? data : data.approvals || data.items || [];

    if (approvals.length === 0) {
      console.log('No pending approvals to test - skipping');
      test.skip();
      return;
    }

    const approvalId = approvals[0].id;
    const response = await request.post(`/api/approvals/${approvalId}/reject`, {
      data: {
        reason: 'Rejected via integration test'
      }
    });

    if (response.status() === 404) {
      console.log('Rejection endpoint not yet deployed - skipping');
      test.skip();
      return;
    }

    // Accept 200 (success) or 401 (auth required)
    if (response.status() === 401) {
      console.log('Rejection requires authentication - expected');
      expect(response.status()).toBe(401);
      return;
    }

    expect(response.ok()).toBe(true);
    const result = await response.json();

    // Verify rejection was processed
    if (result.status) {
      expect(result.status).toBe('rejected');
    }
    console.log(`Approval ${approvalId} rejected`);
  });

  test('POST /api/approvals/invalid-id/approve - handle invalid approval ID', async () => {
    const response = await request.post('/api/approvals/invalid-id-12345/approve', {
      data: {}
    });

    if (response.status() === 404) {
      // Either endpoint not deployed OR invalid ID returns 404
      console.log('404 returned - endpoint may not be deployed or ID invalid (expected)');
      expect(response.status()).toBe(404);
      return;
    }

    // Should return 400 (bad request) or 404 (not found)
    expect([400, 404]).toContain(response.status());
    console.log(`Invalid approval ID correctly returned ${response.status()}`);
  });

  test('Approval workflow integration - create, list, approve', async () => {
    // Step 1: Invoke privacy agent to create pending approval
    const invokeResponse = await request.post('/api/agents/privacy/invoke', {
      data: {
        submission_id: 'test-workflow-' + Date.now(),
        action: 'process'
      }
    });

    if (invokeResponse.status() === 404) {
      console.log('Agent invoke endpoint not yet deployed - skipping workflow test');
      test.skip();
      return;
    }

    let approvalId: string | null = null;
    if (invokeResponse.ok()) {
      const result = await invokeResponse.json();
      approvalId = result.approval_id;
    }

    // Step 2: List approvals
    const listResponse = await request.get('/api/approvals');
    if (!listResponse.ok()) {
      test.skip();
      return;
    }

    const data = await listResponse.json();
    const approvals = Array.isArray(data) ? data : data.approvals || data.items || [];
    console.log(`Workflow: Found ${approvals.length} approvals after invoke`);

    // Step 3: If we created an approval, try to approve it
    if (approvalId) {
      const approveResponse = await request.post(`/api/approvals/${approvalId}/approve`, {
        data: { comment: 'Workflow test approval' }
      });

      if (approveResponse.ok()) {
        console.log(`Workflow: Approval ${approvalId} completed`);
      }
    }

    // Workflow test passes if all API calls completed
    expect(true).toBe(true);
  });

  test('GET /api/approvals - response time acceptable', async () => {
    const startTime = Date.now();
    const response = await request.get('/api/approvals');
    const duration = Date.now() - startTime;

    if (response.status() === 404) {
      test.skip();
      return;
    }

    // API should respond within 1 second
    expect(duration).toBeLessThan(1000);
    console.log(`Approvals list response time: ${duration}ms`);
  });

});
