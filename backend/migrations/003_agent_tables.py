"""
Migration: Create agent tables for EISLAW agent system
Run: python -m backend.migrations.003_agent_tables
"""
import sqlite3
import os
from pathlib import Path
import uuid

# Database path - works in both container and local
if os.path.exists("/app"):
    DB_PATH = Path("/app/data/eislaw.db")
else:
    DB_PATH = Path.home() / ".eislaw" / "data" / "eislaw.db"


def migrate():
    """Create all agent-related tables"""
    print(f"Connecting to database: {DB_PATH}")
    
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    
    # Enable WAL mode
    cursor.execute("PRAGMA journal_mode=WAL")
    
    print("Creating agent_approvals table...")
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
            risk_level TEXT CHECK(risk_level IN ('low', 'medium', 'high')),
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'expired')),
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            expires_at TEXT,
            resolved_at TEXT,
            resolved_by TEXT,
            reject_reason TEXT,
            execution_result TEXT
        )
    ''')
    
    print("Creating agent_audit_log table...")
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS agent_audit_log (
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            tool_id TEXT,
            action TEXT NOT NULL,
            action_type TEXT CHECK(action_type IN ('invoke', 'tool_call', 'approval', 'error', 'complete')),
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
    
    print("Creating agent_settings table...")
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
    
    print("Creating agent_metrics table...")
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
    
    print("Creating indexes...")
    # Approvals indexes
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_approvals_status ON agent_approvals(status)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_approvals_agent ON agent_approvals(agent_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_approvals_created ON agent_approvals(created_at)')
    
    # Audit log indexes
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_agent ON agent_audit_log(agent_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON agent_audit_log(timestamp)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_client ON agent_audit_log(client_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_action_type ON agent_audit_log(action_type)')
    
    # Metrics indexes
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_metrics_agent_date ON agent_metrics(agent_id, date)')
    
    conn.commit()
    
    # Verify tables were created
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'agent_%'")
    tables = [row[0] for row in cursor.fetchall()]
    print(f"\nTables created: {tables}")
    
    # Count indexes
    cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_a%'")
    indexes = [row[0] for row in cursor.fetchall()]
    print(f"Indexes created: {len(indexes)}")
    
    conn.close()
    print("\n✅ Agent tables migration complete!")


if __name__ == '__main__':
    migrate()
