# Task: Agent Database Tables

**Assigned To:** Joseph (Database Developer)
**Date:** 2025-12-05
**Priority:** P1

---

## Objective

Create the database tables needed for the Agent system from David's PRD. This extends your SQLite work to support agent approvals, audit logging, and agent state.

---

## Background

From `PRD_AGENTS_ARCHITECTURE.md`:
- Agent actions need approval workflow
- All agent actions must be logged for audit
- Agent state (enabled/disabled, settings) needs persistence

Alex is implementing the Agent Registry code, you handle the database.

---

## Task Checklist

### 1. Create Agent Approvals Table

**Table:** `agent_approvals`

```sql
CREATE TABLE IF NOT EXISTS agent_approvals (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    tool_id TEXT NOT NULL,
    action_name TEXT NOT NULL,
    action_name_he TEXT,
    description TEXT,
    context TEXT,
    parameters TEXT,  -- JSON string
    risk_level TEXT CHECK(risk_level IN ('low', 'medium', 'high')),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'expired')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT,  -- Auto-expire old approvals
    resolved_at TEXT,
    resolved_by TEXT,
    reject_reason TEXT,
    execution_result TEXT  -- JSON: success/error after execution
);

CREATE INDEX idx_approvals_status ON agent_approvals(status);
CREATE INDEX idx_approvals_agent ON agent_approvals(agent_id);
CREATE INDEX idx_approvals_created ON agent_approvals(created_at);
```

### 2. Create Agent Audit Log Table

**Table:** `agent_audit_log`

```sql
CREATE TABLE IF NOT EXISTS agent_audit_log (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    tool_id TEXT,
    action TEXT NOT NULL,
    action_type TEXT CHECK(action_type IN ('invoke', 'tool_call', 'approval', 'error', 'complete')),
    input_data TEXT,  -- JSON: what was sent to agent
    output_data TEXT, -- JSON: what agent returned
    tokens_used INTEGER,
    duration_ms INTEGER,
    success INTEGER DEFAULT 1,
    error_message TEXT,
    user_id TEXT,
    client_id TEXT,  -- If action related to specific client
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_agent ON agent_audit_log(agent_id);
CREATE INDEX idx_audit_timestamp ON agent_audit_log(timestamp);
CREATE INDEX idx_audit_client ON agent_audit_log(client_id);
CREATE INDEX idx_audit_action_type ON agent_audit_log(action_type);
```

### 3. Create Agent Settings Table

**Table:** `agent_settings`

```sql
CREATE TABLE IF NOT EXISTS agent_settings (
    agent_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 1,
    auto_trigger INTEGER DEFAULT 0,  -- Can agent auto-trigger?
    approval_required INTEGER DEFAULT 1,
    max_actions_per_hour INTEGER DEFAULT 100,
    allowed_tools TEXT,  -- JSON array of allowed tool IDs
    blocked_tools TEXT,  -- JSON array of blocked tool IDs
    custom_prompt TEXT,  -- Additional system prompt
    settings_json TEXT,  -- Additional settings
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_by TEXT
);
```

### 4. Create Agent Metrics Table

**Table:** `agent_metrics` (for analytics)

```sql
CREATE TABLE IF NOT EXISTS agent_metrics (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    date TEXT NOT NULL,  -- YYYY-MM-DD
    invocations INTEGER DEFAULT 0,
    tool_calls INTEGER DEFAULT 0,
    approvals_requested INTEGER DEFAULT 0,
    approvals_granted INTEGER DEFAULT 0,
    approvals_rejected INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    avg_response_ms INTEGER,
    UNIQUE(agent_id, date)
);

CREATE INDEX idx_metrics_agent_date ON agent_metrics(agent_id, date);
```

### 5. Add Migration Script

**File:** `backend/migrations/003_agent_tables.py`

```python
"""
Migration: Create agent tables
Run: python -m backend.migrations.003_agent_tables
"""
from backend.db import get_connection

def migrate():
    conn = get_connection()
    cursor = conn.cursor()

    # Agent approvals
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS agent_approvals (
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            tool_id TEXT NOT NULL,
            action_name TEXT NOT NULL,
            action_name_he TEXT,
            description TEXT,
            context TEXT,
            parameters TEXT,
            risk_level TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            expires_at TEXT,
            resolved_at TEXT,
            resolved_by TEXT,
            reject_reason TEXT,
            execution_result TEXT
        )
    ''')

    # Agent audit log
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS agent_audit_log (
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            tool_id TEXT,
            action TEXT NOT NULL,
            action_type TEXT,
            input_data TEXT,
            output_data TEXT,
            tokens_used INTEGER,
            duration_ms INTEGER,
            success INTEGER DEFAULT 1,
            error_message TEXT,
            user_id TEXT,
            client_id TEXT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Agent settings
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS agent_settings (
            agent_id TEXT PRIMARY KEY,
            enabled INTEGER DEFAULT 1,
            auto_trigger INTEGER DEFAULT 0,
            approval_required INTEGER DEFAULT 1,
            max_actions_per_hour INTEGER DEFAULT 100,
            allowed_tools TEXT,
            blocked_tools TEXT,
            custom_prompt TEXT,
            settings_json TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_by TEXT
        )
    ''')

    # Agent metrics
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS agent_metrics (
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            date TEXT NOT NULL,
            invocations INTEGER DEFAULT 0,
            tool_calls INTEGER DEFAULT 0,
            approvals_requested INTEGER DEFAULT 0,
            approvals_granted INTEGER DEFAULT 0,
            approvals_rejected INTEGER DEFAULT 0,
            errors INTEGER DEFAULT 0,
            total_tokens INTEGER DEFAULT 0,
            avg_response_ms INTEGER,
            UNIQUE(agent_id, date)
        )
    ''')

    # Create indexes
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_approvals_status ON agent_approvals(status)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_approvals_agent ON agent_approvals(agent_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_agent ON agent_audit_log(agent_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON agent_audit_log(timestamp)')

    conn.commit()
    conn.close()
    print("Agent tables created successfully")

if __name__ == '__main__':
    migrate()
```

### 6. Add Helper Functions to db.py

```python
# In backend/db.py - add these functions

def log_agent_action(
    agent_id: str,
    action: str,
    action_type: str,
    input_data: dict = None,
    output_data: dict = None,
    tokens_used: int = None,
    duration_ms: int = None,
    success: bool = True,
    error_message: str = None,
    user_id: str = None,
    client_id: str = None
):
    """Log an agent action to audit table"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO agent_audit_log
        (id, agent_id, action, action_type, input_data, output_data,
         tokens_used, duration_ms, success, error_message, user_id, client_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        str(uuid.uuid4()),
        agent_id,
        action,
        action_type,
        json.dumps(input_data) if input_data else None,
        json.dumps(output_data) if output_data else None,
        tokens_used,
        duration_ms,
        1 if success else 0,
        error_message,
        user_id,
        client_id
    ))
    conn.commit()
    conn.close()

def get_agent_settings(agent_id: str) -> dict:
    """Get agent settings or defaults"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM agent_settings WHERE agent_id = ?', (agent_id,))
    row = cursor.fetchone()
    conn.close()

    if row:
        return dict(row)
    return {
        'agent_id': agent_id,
        'enabled': True,
        'auto_trigger': False,
        'approval_required': True,
        'max_actions_per_hour': 100
    }

def update_agent_metrics(agent_id: str, **metrics):
    """Update daily agent metrics"""
    from datetime import date
    today = date.today().isoformat()

    conn = get_connection()
    cursor = conn.cursor()

    # Upsert metrics
    cursor.execute('''
        INSERT INTO agent_metrics (id, agent_id, date)
        VALUES (?, ?, ?)
        ON CONFLICT(agent_id, date) DO NOTHING
    ''', (str(uuid.uuid4()), agent_id, today))

    for key, value in metrics.items():
        if key in ('invocations', 'tool_calls', 'approvals_requested',
                   'approvals_granted', 'approvals_rejected', 'errors', 'total_tokens'):
            cursor.execute(f'''
                UPDATE agent_metrics
                SET {key} = {key} + ?
                WHERE agent_id = ? AND date = ?
            ''', (value, agent_id, today))

    conn.commit()
    conn.close()
```

### 7. Verify Tables

```bash
# SSH to VM
ssh -i ~/.ssh/eislaw-dev-vm.pem azureuser@20.217.86.4

# Run migration
cd ~/EISLAWManagerWebApp
python -m backend.migrations.003_agent_tables

# Verify tables
sqlite3 ~/.eislaw/store/eislaw.db ".tables"

# Check schema
sqlite3 ~/.eislaw/store/eislaw.db ".schema agent_approvals"
sqlite3 ~/.eislaw/store/eislaw.db ".schema agent_audit_log"
```

---

## Tables Summary

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `agent_approvals` | Pending action approvals | agent_id, status, risk_level |
| `agent_audit_log` | All agent actions for audit | agent_id, action, timestamp |
| `agent_settings` | Per-agent configuration | enabled, approval_required |
| `agent_metrics` | Daily usage analytics | invocations, errors, tokens |

---

## Success Criteria

- [x] 4 tables created
- [x] Indexes created for performance
- [x] Migration script works
- [x] Helper functions added to db.py
- [x] Tables verified on VM
- [x] Documentation updated

---

## Coordination with Alex

Alex is creating:
- `backend/agents/registry.py`
- `backend/agents/approvals.py`

Your tables support his code. Make sure table names match.

---

## Completion Report

**Date:** 2025-12-05

**Tables Created:**
| Table | Columns | Indexes |
|-------|---------|---------|
| `agent_approvals` | id, agent_id, tool_id, action_name, action_name_he, description, context, parameters, risk_level, status, created_at, expires_at, resolved_at, resolved_by, reject_reason, execution_result | 3 (status, agent, created) |
| `agent_audit_log` | id, agent_id, tool_id, action, action_type, input_data, output_data, tokens_used, duration_ms, success, error_message, user_id, client_id, timestamp | 4 (agent, timestamp, client, action_type) |
| `agent_settings` | agent_id, enabled, auto_trigger, approval_required, max_actions_per_hour, allowed_tools, blocked_tools, custom_prompt, settings_json, updated_at, updated_by | 0 (PK only) |
| `agent_metrics` | id, agent_id, date, invocations, tool_calls, approvals_requested, approvals_granted, approvals_rejected, errors, total_tokens, avg_response_ms | 1 (agent_date) |

**Files Created/Modified:**
| File | Change |
|------|--------|
| `backend/migrations/003_agent_tables.py` | Created - Migration script |
| `backend/db.py` | Added 4 DB helper classes + global instances |
| `backend/routers/db_health.py` | Updated to include agent tables in health check |

**Helper Classes Added:**
- `AgentApprovalsDB` - CRUD for approval requests
- `AgentAuditDB` - Logging agent actions
- `AgentSettingsDB` - Per-agent configuration
- `AgentMetricsDB` - Daily metrics tracking

**Verification:**
```json
GET /api/db/stats → {
  "tables": {
    "agent_approvals": {"count": 0},
    "agent_audit_log": {"count": 0},
    "agent_settings": {"count": 0},
    "agent_metrics": {"count": 0}
  },
  "indexes": [...9 new agent indexes...]
}
```

**Database Size:** 0.18 MB (grew from 0.11 MB after adding tables)

**Issues Encountered:** None

---

**Status:** ✅ COMPLETE
**Assigned:** 2025-12-05
**Due:** 2025-12-06
