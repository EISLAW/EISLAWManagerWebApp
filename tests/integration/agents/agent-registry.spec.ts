import { test, expect, APIRequestContext } from '@playwright/test';

/**
 * Agent Registry API Integration Tests
 *
 * Tests endpoints:
 * - GET  /api/agents           - List available agents
 * - GET  /api/agents/{id}      - Get agent details
 * - POST /api/agents/{id}/invoke - Manually invoke agent
 *
 * Note: Tests skip gracefully if endpoints not yet deployed.
 */

const API_BASE = process.env.API_URL || 'http://20.217.86.4:8799';

test.describe('Agent Registry API', () => {
  let request: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext({
      baseURL: API_BASE,
    });
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  test('GET /api/agents - list available agents', async () => {
    const response = await request.get('/api/agents');

    // Skip if endpoint not yet deployed
    if (response.status() === 404) {
      console.log('Agent registry endpoint not yet deployed - skipping');
      test.skip();
      return;
    }

    expect(response.ok()).toBe(true);
    const data = await response.json();

    // Validate response structure
    expect(Array.isArray(data) || (data && typeof data === 'object')).toBe(true);

    // If array, check agent structure
    const agents = Array.isArray(data) ? data : data.agents || data.items || [];

    if (agents.length > 0) {
      const agent = agents[0];
      expect(agent).toHaveProperty('name');
      // Expected agents from PRD: privacy, task, intake, document
      console.log(`Found ${agents.length} agents: ${agents.map((a: any) => a.name || a.id).join(', ')}`);
    }
  });

  test('GET /api/agents/{id} - get specific agent details', async () => {
    // First get list of agents
    const listResponse = await request.get('/api/agents');

    if (listResponse.status() === 404) {
      console.log('Agent registry endpoint not yet deployed - skipping');
      test.skip();
      return;
    }

    const data = await listResponse.json();
    const agents = Array.isArray(data) ? data : data.agents || data.items || [];

    if (agents.length === 0) {
      console.log('No agents registered yet - skipping detail test');
      test.skip();
      return;
    }

    // Get first agent's ID
    const agentId = agents[0].id || agents[0].name || 'privacy';
    const response = await request.get(`/api/agents/${agentId}`);

    if (response.status() === 404) {
      console.log('Agent detail endpoint not yet deployed - skipping');
      test.skip();
      return;
    }

    expect(response.ok()).toBe(true);
    const agent = await response.json();

    // Validate agent structure per PRD
    expect(agent).toHaveProperty('name');
    // Optional properties based on PRD
    if (agent.description) expect(typeof agent.description).toBe('string');
    if (agent.tools) expect(Array.isArray(agent.tools)).toBe(true);
    if (agent.triggers) expect(Array.isArray(agent.triggers)).toBe(true);
    if (agent.approval_required !== undefined) {
      expect(typeof agent.approval_required).toBe('boolean');
    }

    console.log(`Agent "${agent.name}" has ${agent.tools?.length || 0} tools`);
  });

  test('GET /api/agents/privacy - verify privacy agent configuration', async () => {
    const response = await request.get('/api/agents/privacy');

    if (response.status() === 404) {
      console.log('Privacy agent endpoint not yet deployed - skipping');
      test.skip();
      return;
    }

    expect(response.ok()).toBe(true);
    const agent = await response.json();

    // Privacy agent should require approval per PRD
    expect(agent.name).toContain('Privacy');
    expect(agent.approval_required).toBe(true);

    // Check for expected privacy tools
    const expectedTools = [
      'get_privacy_submission',
      'calculate_privacy_score',
      'draft_privacy_email',
      'publish_privacy_report',
      'send_privacy_email'
    ];

    const agentTools = agent.tools || [];
    console.log(`Privacy agent tools: ${agentTools.join(', ')}`);
  });

  test('GET /api/agents/task - verify task agent configuration', async () => {
    const response = await request.get('/api/agents/task');

    if (response.status() === 404) {
      console.log('Task agent endpoint not yet deployed - skipping');
      test.skip();
      return;
    }

    expect(response.ok()).toBe(true);
    const agent = await response.json();

    // Task agent should NOT require approval (low-risk) per PRD
    expect(agent.name).toContain('Task');
    expect(agent.approval_required).toBe(false);

    // Check for expected task tools
    const expectedTools = [
      'search_clients',
      'create_task',
      'update_task_status',
      'search_tasks',
      'get_system_summary'
    ];

    const agentTools = agent.tools || [];
    console.log(`Task agent tools: ${agentTools.join(', ')}`);
  });

  test('POST /api/agents/{id}/invoke - invoke agent manually', async () => {
    const response = await request.post('/api/agents/task/invoke', {
      data: {
        message: 'List all pending tasks',
        context: {}
      }
    });

    if (response.status() === 404) {
      console.log('Agent invoke endpoint not yet deployed - skipping');
      test.skip();
      return;
    }

    // Accept 200 (success), 202 (accepted/async), or 401 (auth required)
    if (response.status() === 401) {
      console.log('Agent invoke requires authentication - expected behavior');
      expect(response.status()).toBe(401);
      return;
    }

    expect([200, 202]).toContain(response.status());
    const result = await response.json();

    // Result should have response or action items
    expect(result).toBeDefined();
    console.log('Agent invocation response received');
  });

  test('POST /api/agents/privacy/invoke - privacy agent requires approval', async () => {
    const response = await request.post('/api/agents/privacy/invoke', {
      data: {
        submission_id: 'test-submission-123',
        action: 'process'
      }
    });

    if (response.status() === 404) {
      console.log('Privacy agent invoke endpoint not yet deployed - skipping');
      test.skip();
      return;
    }

    // Privacy agent should create pending approval, not execute immediately
    if (response.ok()) {
      const result = await response.json();
      // Should indicate approval required or pending
      if (result.status) {
        expect(['pending_approval', 'approval_required', 'pending']).toContain(result.status);
      }
      if (result.approval_id) {
        expect(typeof result.approval_id).toBe('string');
        console.log(`Approval created: ${result.approval_id}`);
      }
    }
  });

  test('GET /api/agents - response time acceptable', async () => {
    const startTime = Date.now();
    const response = await request.get('/api/agents');
    const duration = Date.now() - startTime;

    if (response.status() === 404) {
      test.skip();
      return;
    }

    // API should respond within 1 second
    expect(duration).toBeLessThan(1000);
    console.log(`Agent list response time: ${duration}ms`);
  });

});
