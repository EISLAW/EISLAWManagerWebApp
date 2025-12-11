"""
Approvals System

Handles the human-in-the-loop approval workflow for agent actions.
High-risk actions are queued for review before execution.

Approval states:
- pending: Awaiting human review
- approved: Action approved, ready for execution
- rejected: Action rejected with reason
- expired: Action timed out without review
"""

import json
import uuid
import sqlite3
import os
from datetime import datetime
from typing import List, Optional, Dict, Any


def get_db_path():
    """Get database path"""
    if os.path.exists("/app/data/eislaw.db"):
        return "/app/data/eislaw.db"
    return os.path.expanduser("~/.eislaw/store/eislaw.db")


def get_connection():
    """Get SQLite connection"""
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    return conn


def init_approvals_table():
    """Create approvals table if not exists"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS agent_approvals (
            id TEXT PRIMARY KEY,
            agent_id TEXT NOT NULL,
            tool_id TEXT NOT NULL,
            action_name TEXT NOT NULL,
            description TEXT,
            context TEXT,
            parameters TEXT,
            risk_level TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            resolved_at TEXT,
            resolved_by TEXT,
            reject_reason TEXT
        )
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_approvals_status
        ON agent_approvals(status)
    ''')
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_approvals_agent
        ON agent_approvals(agent_id)
    ''')
    conn.commit()
    conn.close()


def create_approval(
    agent_id: str,
    tool_id: str,
    action_name: str,
    description: str,
    parameters: Dict[str, Any],
    risk_level: str,
    context: str = None
) -> str:
    """
    Create a pending approval request.

    Returns the approval ID.
    """
    approval_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat() + "Z"

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO agent_approvals
        (id, agent_id, tool_id, action_name, description, context, parameters, risk_level, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        approval_id,
        agent_id,
        tool_id,
        action_name,
        description,
        context,
        json.dumps(parameters, ensure_ascii=False),
        risk_level,
        now
    ))
    conn.commit()
    conn.close()

    return approval_id


def get_approval(approval_id: str) -> Optional[Dict]:
    """Get a single approval by ID"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM agent_approvals WHERE id = ?', (approval_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    return _row_to_dict(row)


def get_pending_approvals(agent_id: str = None) -> List[Dict]:
    """
    Get all pending approvals.
    Optionally filter by agent_id.
    """
    conn = get_connection()
    cursor = conn.cursor()

    if agent_id:
        cursor.execute('''
            SELECT * FROM agent_approvals
            WHERE status = 'pending' AND agent_id = ?
            ORDER BY created_at DESC
        ''', (agent_id,))
    else:
        cursor.execute('''
            SELECT * FROM agent_approvals
            WHERE status = 'pending'
            ORDER BY created_at DESC
        ''')

    rows = cursor.fetchall()
    conn.close()

    return [_row_to_dict(row) for row in rows]


def get_recent_approvals(limit: int = 20) -> List[Dict]:
    """Get recent approvals (any status)"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT * FROM agent_approvals
        ORDER BY created_at DESC
        LIMIT ?
    ''', (limit,))
    rows = cursor.fetchall()
    conn.close()

    return [_row_to_dict(row) for row in rows]


def approve_action(approval_id: str, user: str = "system") -> bool:
    """
    Approve a pending action.

    Returns True if successful, False if not found or already resolved.
    """
    now = datetime.utcnow().isoformat() + "Z"

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE agent_approvals
        SET status = 'approved', resolved_at = ?, resolved_by = ?
        WHERE id = ? AND status = 'pending'
    ''', (now, user, approval_id))

    success = cursor.rowcount > 0
    conn.commit()
    conn.close()

    return success


def reject_action(approval_id: str, reason: str = "", user: str = "system") -> bool:
    """
    Reject a pending action with reason.

    Returns True if successful, False if not found or already resolved.
    """
    now = datetime.utcnow().isoformat() + "Z"

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE agent_approvals
        SET status = 'rejected', resolved_at = ?, resolved_by = ?, reject_reason = ?
        WHERE id = ? AND status = 'pending'
    ''', (now, user, reason, approval_id))

    success = cursor.rowcount > 0
    conn.commit()
    conn.close()

    return success


def expire_old_approvals(hours: int = 24) -> int:
    """
    Mark old pending approvals as expired.

    Returns count of expired approvals.
    """
    now = datetime.utcnow().isoformat() + "Z"

    conn = get_connection()
    cursor = conn.cursor()

    # SQLite datetime comparison
    cursor.execute('''
        UPDATE agent_approvals
        SET status = 'expired', resolved_at = ?
        WHERE status = 'pending'
        AND datetime(created_at) < datetime('now', '-' || ? || ' hours')
    ''', (now, hours))

    count = cursor.rowcount
    conn.commit()
    conn.close()

    return count


def get_approval_stats() -> Dict[str, int]:
    """Get count of approvals by status"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT status, COUNT(*) as count
        FROM agent_approvals
        GROUP BY status
    ''')
    rows = cursor.fetchall()
    conn.close()

    return {row['status']: row['count'] for row in rows}


def _row_to_dict(row) -> Dict:
    """Convert SQLite row to dictionary"""
    d = dict(row)
    # Parse parameters JSON
    if d.get('parameters'):
        try:
            d['parameters'] = json.loads(d['parameters'])
        except json.JSONDecodeError:
            pass
    return d


# Initialize table on module load
try:
    init_approvals_table()
except Exception:
    pass  # Table might already exist or DB not available yet
