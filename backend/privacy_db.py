"""
Privacy Database Module - SQLite storage for privacy submissions
"""
import sqlite3
import json
import time
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime
from contextlib import contextmanager

# Database path - will be created in /app/data/ in Docker
DB_PATH = Path(__file__).resolve().parent.parent / "data" / "privacy.db"

# Level to color mapping
LEVEL_TO_COLOR = {
    "lone": "yellow",
    "basic": "orange",
    "mid": "red",
    "high": "red"
}

LEVEL_LABELS = {
    "lone": "נמוכה",
    "basic": "בסיסית",
    "mid": "בינונית",
    "high": "גבוהה"
}


def get_db_path() -> Path:
    """Get database path, creating directory if needed"""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    return DB_PATH


@contextmanager
def get_connection():
    """Context manager for database connections"""
    conn = sqlite3.connect(str(get_db_path()), timeout=30)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """Initialize database tables"""
    with get_connection() as conn:
        cursor = conn.cursor()

        # Privacy submissions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS privacy_submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                submission_id TEXT UNIQUE NOT NULL,
                form_id TEXT NOT NULL,
                submitted_at TEXT NOT NULL,
                received_at TEXT DEFAULT CURRENT_TIMESTAMP,

                -- Contact info
                contact_name TEXT,
                contact_email TEXT,
                contact_phone TEXT,
                business_name TEXT,

                -- Raw answers (JSON)
                answers_json TEXT,

                -- Algorithm results
                score_level TEXT,
                score_color TEXT,
                score_dpo BOOLEAN DEFAULT FALSE,
                score_reg BOOLEAN DEFAULT FALSE,
                score_report BOOLEAN DEFAULT FALSE,
                score_requirements TEXT,
                score_confidence INTEGER,

                -- Review status (for QA)
                review_status TEXT DEFAULT 'pending',
                reviewed_at TEXT,
                override_level TEXT,
                override_reason TEXT
            )
        """)

        # Activity log table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS activity_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                event_type TEXT NOT NULL,
                submission_id TEXT,
                details TEXT,
                duration_ms INTEGER,
                success BOOLEAN DEFAULT TRUE
            )
        """)

        # Indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sub_id ON privacy_submissions(submission_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sub_status ON privacy_submissions(review_status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sub_submitted ON privacy_submissions(submitted_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_activity_ts ON activity_log(timestamp)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_log(event_type)")


def save_submission(
    submission_id: str,
    form_id: str,
    submitted_at: str,
    contact_name: Optional[str] = None,
    contact_email: Optional[str] = None,
    contact_phone: Optional[str] = None,
    business_name: Optional[str] = None,
    answers: Optional[Dict] = None,
    score: Optional[Dict] = None
) -> bool:
    """
    Save a privacy submission to the database.
    Returns True if inserted, False if already exists (duplicate).
    """
    with get_connection() as conn:
        cursor = conn.cursor()

        # Check if already exists
        cursor.execute(
            "SELECT id FROM privacy_submissions WHERE submission_id = ?",
            (submission_id,)
        )
        if cursor.fetchone():
            return False  # Duplicate

        # Extract score fields
        score_level = score.get("level") if score else None
        score_color = LEVEL_TO_COLOR.get(score_level) if score_level else None
        score_dpo = score.get("dpo", False) if score else False
        score_reg = score.get("reg", False) if score else False
        score_report = score.get("report", False) if score else False
        score_requirements = json.dumps(score.get("requirements", [])) if score else "[]"
        score_confidence = score.get("confidence") if score else None

        cursor.execute("""
            INSERT INTO privacy_submissions (
                submission_id, form_id, submitted_at,
                contact_name, contact_email, contact_phone, business_name,
                answers_json,
                score_level, score_color, score_dpo, score_reg, score_report,
                score_requirements, score_confidence
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            submission_id, form_id, submitted_at,
            contact_name, contact_email, contact_phone, business_name,
            json.dumps(answers) if answers else None,
            score_level, score_color, score_dpo, score_reg, score_report,
            score_requirements, score_confidence
        ))

        return True


def get_submission(submission_id: str) -> Optional[Dict]:
    """Get a submission by ID"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM privacy_submissions WHERE submission_id = ?",
            (submission_id,)
        )
        row = cursor.fetchone()
        if not row:
            return None
        return dict(row)


def get_public_results(submission_id: str) -> Optional[Dict]:
    """Get public-safe results for a submission (for WordPress page)"""
    sub = get_submission(submission_id)
    if not sub:
        return None

    # Parse requirements JSON
    requirements = []
    if sub.get("score_requirements"):
        try:
            requirements = json.loads(sub["score_requirements"])
        except:
            pass

    return {
        "submission_id": sub["submission_id"],
        "business_name": sub.get("business_name") or "העסק שלך",
        "level": sub.get("score_level") or "basic",
        "color": sub.get("score_color") or "yellow",
        "level_label": LEVEL_LABELS.get(sub.get("score_level"), "בסיסית"),
        "requirements": requirements,
        "dpo_required": bool(sub.get("score_dpo")),
        "registration_required": bool(sub.get("score_reg")),
        "video_id": sub.get("score_color") or "yellow"
    }


def get_submissions(
    limit: int = 50,
    status: Optional[str] = None,
    offset: int = 0
) -> List[Dict]:
    """Get list of submissions"""
    with get_connection() as conn:
        cursor = conn.cursor()

        query = "SELECT * FROM privacy_submissions"
        params = []

        if status:
            query += " WHERE review_status = ?"
            params.append(status)

        query += " ORDER BY received_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        cursor.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]


def update_review(
    submission_id: str,
    status: str,
    override_level: Optional[str] = None,
    override_reason: Optional[str] = None
) -> bool:
    """Update review status for a submission"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE privacy_submissions
            SET review_status = ?,
                reviewed_at = ?,
                override_level = ?,
                override_reason = ?
            WHERE submission_id = ?
        """, (
            status,
            datetime.utcnow().isoformat(),
            override_level,
            override_reason,
            submission_id
        ))
        return cursor.rowcount > 0


def log_activity(
    event_type: str,
    submission_id: Optional[str] = None,
    details: Optional[Dict] = None,
    duration_ms: Optional[int] = None,
    success: bool = True
):
    """Log an activity event"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO activity_log (event_type, submission_id, details, duration_ms, success)
            VALUES (?, ?, ?, ?, ?)
        """, (
            event_type,
            submission_id,
            json.dumps(details) if details else None,
            duration_ms,
            success
        ))


def get_activity(limit: int = 50) -> List[Dict]:
    """Get recent activity log entries"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM activity_log
            ORDER BY timestamp DESC
            LIMIT ?
        """, (limit,))
        return [dict(row) for row in cursor.fetchall()]


def get_stats() -> Dict:
    """Get statistics for monitoring"""
    with get_connection() as conn:
        cursor = conn.cursor()

        # Total submissions
        cursor.execute("SELECT COUNT(*) as count FROM privacy_submissions")
        total = cursor.fetchone()["count"]

        # By status
        cursor.execute("""
            SELECT review_status, COUNT(*) as count
            FROM privacy_submissions
            GROUP BY review_status
        """)
        by_status = {row["review_status"]: row["count"] for row in cursor.fetchall()}

        # By level
        cursor.execute("""
            SELECT score_level, COUNT(*) as count
            FROM privacy_submissions
            GROUP BY score_level
        """)
        by_level = {row["score_level"]: row["count"] for row in cursor.fetchall()}

        # Recent errors (last 24h)
        cursor.execute("""
            SELECT COUNT(*) as count FROM activity_log
            WHERE success = FALSE
            AND timestamp > datetime('now', '-24 hours')
        """)
        errors_24h = cursor.fetchone()["count"]

        # Submissions today
        cursor.execute("""
            SELECT COUNT(*) as count FROM privacy_submissions
            WHERE date(received_at) = date('now')
        """)
        today = cursor.fetchone()["count"]

        return {
            "total_submissions": total,
            "submissions_today": today,
            "by_status": by_status,
            "by_level": by_level,
            "errors_24h": errors_24h
        }


# Initialize on import
init_db()
