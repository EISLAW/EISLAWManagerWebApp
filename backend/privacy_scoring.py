"""
Privacy Scoring Module - Phase 5C
Implements scoring algorithm for privacy submissions using existing evaluator.
Saves results to privacy_reviews table.
"""
import json
import sqlite3
import uuid
import sys
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime

# Database path - privacy.db
DB_PATH = Path(__file__).resolve().parent.parent / "data" / "privacy.db"

# Add tools directory to path for importing evaluator
TOOLS_DIR = Path(__file__).resolve().parent.parent / "tools"
CONFIG_DIR = Path(__file__).resolve().parent.parent / "config"

# Import the existing scoring evaluator
if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))

try:
    from security_scoring_eval import evaluate, load_rules, coerce_inputs
    RULES_PATH = CONFIG_DIR / "security_scoring_rules.json"
    RULES = load_rules(RULES_PATH) if RULES_PATH.exists() else {}
except ImportError:
    # Fallback - define minimal evaluate function
    RULES = {}
    def evaluate(rules, answers):
        return {"level": "basic", "dpo": False, "reg": False, "report": False, "requirements": []}
    def coerce_inputs(d):
        return d


def get_submission_answers(submission_id: str) -> Optional[Dict]:
    """Get submission answers from privacy_submissions table"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            owners, access, ethics, ppl,
            sensitive_types, sensitive_people, biometric_100k,
            transfer, directmail_biz, directmail_self,
            monitor_1000, processor, processor_large_org,
            employees_exposed, cameras
        FROM privacy_submissions
        WHERE id = ?
    """, (submission_id,))

    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    # Parse sensitive_types from JSON
    sensitive_types = []
    if row["sensitive_types"]:
        try:
            sensitive_types = json.loads(row["sensitive_types"])
        except:
            pass

    # Build answers dict
    answers = {
        "owners": row["owners"] or 0,
        "access": row["access"] or 0,
        "ethics": bool(row["ethics"]),
        "ppl": row["ppl"] or 0,
        "sensitive_types": sensitive_types,
        "sensitive_people": row["sensitive_people"] or 0,
        "biometric_100k": bool(row["biometric_100k"]),
        "transfer": bool(row["transfer"]),
        "directmail_biz": bool(row["directmail_biz"]),
        "directmail_self": bool(row["directmail_self"]),
        "monitor_1000": bool(row["monitor_1000"]),
        "processor": bool(row["processor"]),
        "processor_large_org": bool(row["processor_large_org"]),
        "processor_sensitive_org": bool(row["processor_large_org"]),  # Alias
        "employees_exposed": bool(row["employees_exposed"]),
        "cameras": bool(row["cameras"]),
    }

    # Derive 'sensitive' from sensitive_types or sensitive_people
    if sensitive_types or answers["sensitive_people"] > 0:
        answers["sensitive"] = True
    else:
        answers["sensitive"] = False

    return answers


def score_submission(submission_id: str) -> Dict:
    """
    Run the scoring algorithm on a submission.
    Returns the score result and saves to privacy_reviews table.
    """
    # Get submission answers
    answers = get_submission_answers(submission_id)
    if not answers:
        return {"error": "Submission not found", "submission_id": submission_id}

    # Coerce inputs for the evaluator
    coerced = coerce_inputs(answers)

    # Run the scoring algorithm
    try:
        result = evaluate(RULES, coerced)
    except Exception as e:
        return {"error": f"Scoring error: {str(e)}", "submission_id": submission_id}

    # Save to privacy_reviews table
    review_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    requirements_json = json.dumps(result.get("requirements", []), ensure_ascii=False)

    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    # Check if review already exists for this submission
    cursor.execute("SELECT id FROM privacy_reviews WHERE submission_id = ?", (submission_id,))
    existing = cursor.fetchone()

    if existing:
        # Update existing review
        cursor.execute("""
            UPDATE privacy_reviews SET
                level = ?,
                dpo = ?,
                reg = ?,
                report = ?,
                requirements = ?,
                status = 'scored',
                updated_at = ?
            WHERE submission_id = ?
        """, (
            result.get("level"),
            1 if result.get("dpo") else 0,
            1 if result.get("reg") else 0,
            1 if result.get("report") else 0,
            requirements_json,
            now,
            submission_id
        ))
        review_id = existing[0]
    else:
        # Insert new review
        cursor.execute("""
            INSERT INTO privacy_reviews (
                id, submission_id, level, dpo, reg, report, requirements,
                status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'scored', ?, ?)
        """, (
            review_id, submission_id,
            result.get("level"),
            1 if result.get("dpo") else 0,
            1 if result.get("reg") else 0,
            1 if result.get("report") else 0,
            requirements_json,
            now, now
        ))

    conn.commit()
    conn.close()

    return {
        "submission_id": submission_id,
        "review_id": review_id,
        "level": result.get("level"),
        "dpo": result.get("dpo"),
        "reg": result.get("reg"),
        "report": result.get("report"),
        "requirements": result.get("requirements", []),
        "status": "scored",
        "scored_at": now,
    }


def score_all_submissions() -> Dict:
    """Score all unscored submissions"""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    # Get submissions without reviews
    cursor.execute("""
        SELECT ps.id
        FROM privacy_submissions ps
        LEFT JOIN privacy_reviews pr ON ps.id = pr.submission_id
        WHERE pr.id IS NULL
    """)

    unscored = [row[0] for row in cursor.fetchall()]
    conn.close()

    results = {"scored": 0, "errors": 0, "total": len(unscored)}

    for submission_id in unscored:
        result = score_submission(submission_id)
        if "error" in result:
            results["errors"] += 1
        else:
            results["scored"] += 1

    return results


def save_review_override(
    submission_id: str,
    override_level: Optional[str] = None,
    notes: Optional[str] = None,
    reviewed_by: Optional[str] = None,
    status: str = "reviewed"
) -> Dict:
    """
    Save a human override/review for a submission.
    If override_level is provided, it overrides the algorithm result.
    """
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()

    # Check if review exists
    cursor.execute("SELECT id, level FROM privacy_reviews WHERE submission_id = ?", (submission_id,))
    existing = cursor.fetchone()

    if existing:
        # Update existing review with override
        update_fields = ["status = ?", "updated_at = ?"]
        params = [status, now]

        if override_level:
            update_fields.append("level = ?")
            params.append(override_level)
        if notes:
            update_fields.append("notes = ?")
            params.append(notes)
        if reviewed_by:
            update_fields.append("reviewed_by = ?")
            params.append(reviewed_by)

        params.append(submission_id)

        cursor.execute(f"""
            UPDATE privacy_reviews SET
                {', '.join(update_fields)}
            WHERE submission_id = ?
        """, params)

        review_id = existing[0]
    else:
        # Need to score first, then apply override
        conn.close()
        score_result = score_submission(submission_id)
        if "error" in score_result:
            return score_result

        # Re-open connection and apply override
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE privacy_reviews SET
                level = COALESCE(?, level),
                notes = ?,
                reviewed_by = ?,
                status = ?,
                updated_at = ?
            WHERE submission_id = ?
        """, (override_level, notes, reviewed_by, status, now, submission_id))

        review_id = score_result.get("review_id")

    conn.commit()
    conn.close()

    return {
        "submission_id": submission_id,
        "review_id": review_id,
        "status": status,
        "override_level": override_level,
        "reviewed_by": reviewed_by,
        "updated_at": now,
    }


def get_metrics() -> Dict:
    """
    Get privacy scoring metrics:
    - Total submissions
    - Scored vs unscored
    - By level distribution
    - By status distribution
    - DPO/Registration/Report requirements
    """
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    # Total submissions
    cursor.execute("SELECT COUNT(*) FROM privacy_submissions")
    total_submissions = cursor.fetchone()[0]

    # Total reviews (scored)
    cursor.execute("SELECT COUNT(*) FROM privacy_reviews")
    total_scored = cursor.fetchone()[0]

    # By level
    cursor.execute("""
        SELECT level, COUNT(*) as count
        FROM privacy_reviews
        WHERE level IS NOT NULL
        GROUP BY level
    """)
    by_level = {row[0]: row[1] for row in cursor.fetchall()}

    # By status
    cursor.execute("""
        SELECT status, COUNT(*) as count
        FROM privacy_reviews
        GROUP BY status
    """)
    by_status = {row[0]: row[1] for row in cursor.fetchall()}

    # DPO required count
    cursor.execute("SELECT COUNT(*) FROM privacy_reviews WHERE dpo = 1")
    dpo_required = cursor.fetchone()[0]

    # Registration required count
    cursor.execute("SELECT COUNT(*) FROM privacy_reviews WHERE reg = 1")
    reg_required = cursor.fetchone()[0]

    # Report required count
    cursor.execute("SELECT COUNT(*) FROM privacy_reviews WHERE report = 1")
    report_required = cursor.fetchone()[0]

    # Recent submissions (last 7 days)
    cursor.execute("""
        SELECT COUNT(*) FROM privacy_submissions
        WHERE submitted_at > datetime('now', '-7 days')
    """)
    recent_submissions = cursor.fetchone()[0]

    conn.close()

    return {
        "total_submissions": total_submissions,
        "total_scored": total_scored,
        "unscored": total_submissions - total_scored,
        "by_level": by_level,
        "by_status": by_status,
        "requirements": {
            "dpo_required": dpo_required,
            "reg_required": reg_required,
            "report_required": report_required,
        },
        "recent_submissions_7d": recent_submissions,
        "scoring_rate": round(total_scored / total_submissions * 100, 1) if total_submissions > 0 else 0,
    }


def get_review_by_submission(submission_id: str) -> Optional[Dict]:
    """Get review details for a submission"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM privacy_reviews WHERE submission_id = ?
    """, (submission_id,))

    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    # Parse requirements JSON
    requirements = []
    if row["requirements"]:
        try:
            requirements = json.loads(row["requirements"])
        except:
            pass

    return {
        "id": row["id"],
        "submission_id": row["submission_id"],
        "level": row["level"],
        "dpo": bool(row["dpo"]),
        "reg": bool(row["reg"]),
        "report": bool(row["report"]),
        "requirements": requirements,
        "status": row["status"],
        "reviewed_by": row["reviewed_by"],
        "notes": row["notes"],
        "email_sent_at": row["email_sent_at"],
        "report_token": row["report_token"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }
