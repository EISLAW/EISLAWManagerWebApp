"""
Privacy Fillout Sync Module - Phase 5B
Syncs Fillout form submissions to eislaw.db privacy_submissions table
Uses Joseph's schema from Phase 5A
"""
import json
import sqlite3
import urllib.request
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime

# Database path - eislaw.db (not privacy.db)
DB_PATH = Path(__file__).resolve().parent.parent / "data" / "eislaw.db"

# Fillout form ID for privacy assessment
PRIVACY_FORM_ID = "t9nJNoMdBgus"  # פרטיות_שאלון אבחון (עדכני)

# Field ID mapping from Fillout to our schema
FIELD_ID_MAP = {
    "g1MV": "contact_name",
    "cRPD": "contact_email",
    "1eJw": "contact_phone",
    "3nJ4": "business_name",
    "uZie": "owners",
    "e6gk": "access",
    "68Yz": "ethics",
    "1v44": "ppl",
    "pWDs": "sensitive_types",
    "1ZwV": "sensitive_people",
    "i983": "biometric_100k",
    "kgeV": "transfer",
    "1CHH": "directmail_biz",
    "fxeW": "directmail_self",
    "v7hP": "monitor_1000",
    "gfpv": "processor",
    "3T6X": "processor_large_org",
    "gDyJ": "employees_exposed",
    "sXuG": "cameras",
}


def get_fillout_api_key() -> Optional[str]:
    """Load Fillout API key from secrets"""
    secrets_path = Path(__file__).resolve().parent.parent / "secrets.local.json"
    if secrets_path.exists():
        try:
            data = json.loads(secrets_path.read_text("utf-8"))
            return data.get("fillout", {}).get("api_key")
        except Exception:
            pass
    return None


def normalize_boolean(value: Any) -> int:
    """Convert Hebrew Yes/No to 0/1"""
    if value is None:
        return 0
    if isinstance(value, bool):
        return 1 if value else 0
    if isinstance(value, (int, float)):
        return 1 if value else 0
    if isinstance(value, str):
        val = value.strip().lower()
        if val in {"כן", "כן.", "yes", "true", "1"}:
            return 1
        if val in {"לא", "no", "false", "0", ""}:
            return 0
    return 0


def normalize_number(value: Any) -> int:
    """Ensure integer, default to 0"""
    if value is None:
        return 0
    try:
        return int(value)
    except (ValueError, TypeError):
        return 0


def normalize_multiselect(value: Any) -> str:
    """Convert multi-select to JSON array string"""
    if isinstance(value, (list, tuple)):
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, str):
        try:
            json.loads(value)  # Validate it's JSON
            return value
        except:
            return json.dumps([value], ensure_ascii=False)
    return "[]"


def map_fillout_response(response: dict) -> dict:
    """Map Fillout API response to our schema"""
    result = {
        "id": response.get("submissionId"),
        "form_id": PRIVACY_FORM_ID,
        "submitted_at": response.get("submissionTime"),
        "raw_response": json.dumps(response, ensure_ascii=False),
    }

    # Default values for all fields
    field_defaults = {
        "contact_name": None,
        "contact_email": None,
        "contact_phone": None,
        "business_name": None,
        "owners": 0,
        "access": 0,
        "ethics": 0,
        "ppl": 0,
        "sensitive_types": "[]",
        "sensitive_people": 0,
        "biometric_100k": 0,
        "transfer": 0,
        "directmail_biz": 0,
        "directmail_self": 0,
        "monitor_1000": 0,
        "processor": 0,
        "processor_large_org": 0,
        "employees_exposed": 0,
        "cameras": 0,
    }
    result.update(field_defaults)

    # Map questions by ID
    for q in response.get("questions", []):
        q_id = q.get("id")
        q_value = q.get("value")

        if q_id not in FIELD_ID_MAP or q_value is None:
            continue

        field_name = FIELD_ID_MAP[q_id]

        # Apply appropriate normalization
        if field_name in ["contact_name", "contact_email", "contact_phone", "business_name"]:
            result[field_name] = str(q_value) if q_value else None
        elif field_name in ["owners", "access", "ppl", "sensitive_people"]:
            result[field_name] = normalize_number(q_value)
        elif field_name == "sensitive_types":
            result[field_name] = normalize_multiselect(q_value)
        else:
            # Boolean fields
            result[field_name] = normalize_boolean(q_value)

    return result


def sync_from_fillout(form_id: str = None, limit: int = 100) -> dict:
    """
    Sync submissions from Fillout API to SQLite.
    Returns counts of new, existing, and errors.
    """
    form_id = form_id or PRIVACY_FORM_ID
    api_key = get_fillout_api_key()

    if not api_key:
        return {"error": "Fillout API key not found in secrets.local.json", "new": 0, "existing": 0}

    # Fetch from Fillout
    try:
        url = f"https://api.fillout.com/v1/api/forms/{form_id}/submissions?limit={limit}"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {api_key}"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        return {"error": f"Fillout API error: {str(e)}", "new": 0, "existing": 0}

    responses = data.get("responses", [])
    new_count = 0
    existing_count = 0
    errors = []

    # Connect to eislaw.db
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    for response in responses:
        try:
            mapped = map_fillout_response(response)
            submission_id = mapped["id"]

            # Check if exists
            cursor.execute("SELECT id FROM privacy_submissions WHERE id = ?", (submission_id,))
            if cursor.fetchone():
                existing_count += 1
                continue

            # Insert new submission
            cursor.execute("""
                INSERT INTO privacy_submissions (
                    id, form_id, submitted_at,
                    contact_name, contact_email, contact_phone, business_name,
                    owners, access, ethics, ppl,
                    sensitive_types, sensitive_people, biometric_100k,
                    transfer, directmail_biz, directmail_self,
                    monitor_1000, processor, processor_large_org,
                    employees_exposed, cameras,
                    raw_response, imported_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            """, (
                mapped["id"], mapped["form_id"], mapped["submitted_at"],
                mapped["contact_name"], mapped["contact_email"], mapped["contact_phone"], mapped["business_name"],
                mapped["owners"], mapped["access"], mapped["ethics"], mapped["ppl"],
                mapped["sensitive_types"], mapped["sensitive_people"], mapped["biometric_100k"],
                mapped["transfer"], mapped["directmail_biz"], mapped["directmail_self"],
                mapped["monitor_1000"], mapped["processor"], mapped["processor_large_org"],
                mapped["employees_exposed"], mapped["cameras"],
                mapped["raw_response"]
            ))
            new_count += 1
        except Exception as e:
            errors.append(f"{response.get('submissionId', 'unknown')}: {str(e)}")

    conn.commit()
    conn.close()

    result = {
        "new": new_count,
        "existing": existing_count,
        "total_fetched": len(responses),
        "form_id": form_id,
    }
    if errors:
        result["errors"] = errors[:5]  # Limit error output

    return result


def get_submissions_from_sqlite(limit: int = 50, offset: int = 0) -> List[dict]:
    """Get submissions from eislaw.db privacy_submissions table"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            ps.id, ps.form_id, ps.submitted_at,
            ps.contact_name, ps.contact_email, ps.contact_phone, ps.business_name,
            ps.owners, ps.access, ps.ethics, ps.ppl,
            ps.sensitive_types, ps.sensitive_people, ps.biometric_100k,
            ps.transfer, ps.directmail_biz, ps.directmail_self,
            ps.monitor_1000, ps.processor, ps.processor_large_org,
            ps.employees_exposed, ps.cameras,
            ps.imported_at,
            pr.level, pr.dpo, pr.reg, pr.report, pr.status as review_status
        FROM privacy_submissions ps
        LEFT JOIN privacy_reviews pr ON ps.id = pr.submission_id
        ORDER BY ps.submitted_at DESC
        LIMIT ? OFFSET ?
    """, (limit, offset))

    rows = cursor.fetchall()
    conn.close()

    # Transform to frontend format
    submissions = []
    for row in rows:
        submissions.append({
            "id": row["id"],
            "submission_id": row["id"],
            "contact_name": row["contact_name"] or "לא צוין",
            "business_name": row["business_name"],
            "contact_email": row["contact_email"],
            "contact_phone": row["contact_phone"],
            "submitted_at": row["submitted_at"],
            "level": row["level"] or "pending",
            "status": row["review_status"] or "pending",
            "dpo": bool(row["dpo"]) if row["dpo"] is not None else None,
            "reg": bool(row["reg"]) if row["reg"] is not None else None,
            "report": bool(row["report"]) if row["report"] is not None else None,
            "ppl": row["ppl"],
        })

    return submissions


def get_submission_by_id(submission_id: str) -> Optional[dict]:
    """Get a single submission by ID with all details"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            ps.*,
            pr.level, pr.dpo, pr.reg, pr.report, pr.requirements,
            pr.status as review_status, pr.reviewed_by, pr.notes,
            pr.email_sent_at, pr.report_token
        FROM privacy_submissions ps
        LEFT JOIN privacy_reviews pr ON ps.id = pr.submission_id
        WHERE ps.id = ?
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

    # Parse requirements from JSON
    requirements = []
    if row["requirements"]:
        try:
            requirements = json.loads(row["requirements"])
        except:
            pass

    return {
        "id": row["id"],
        "submission_id": row["id"],
        "form_id": row["form_id"],
        "submitted_at": row["submitted_at"],
        "imported_at": row["imported_at"],

        # Contact info
        "contact_name": row["contact_name"],
        "contact_email": row["contact_email"],
        "contact_phone": row["contact_phone"],
        "business_name": row["business_name"],

        # Form answers
        "answers": {
            "owners": row["owners"],
            "access": row["access"],
            "ethics": bool(row["ethics"]),
            "ppl": row["ppl"],
            "sensitive_types": sensitive_types,
            "sensitive_people": row["sensitive_people"],
            "biometric_100k": bool(row["biometric_100k"]),
            "transfer": bool(row["transfer"]),
            "directmail_biz": bool(row["directmail_biz"]),
            "directmail_self": bool(row["directmail_self"]),
            "monitor_1000": bool(row["monitor_1000"]),
            "processor": bool(row["processor"]),
            "processor_large_org": bool(row["processor_large_org"]),
            "employees_exposed": bool(row["employees_exposed"]),
            "cameras": bool(row["cameras"]),
        },

        # Score (from review if exists)
        "score": {
            "level": row["level"],
            "dpo": bool(row["dpo"]) if row["dpo"] is not None else None,
            "reg": bool(row["reg"]) if row["reg"] is not None else None,
            "report": bool(row["report"]) if row["report"] is not None else None,
            "requirements": requirements,
        },

        # Review status
        "status": row["review_status"] or "pending",
        "reviewed_by": row["reviewed_by"],
        "notes": row["notes"],
        "email_sent_at": row["email_sent_at"],
        "report_token": row["report_token"],
    }


def get_submissions_count() -> int:
    """Get total count of submissions"""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM privacy_submissions")
    count = cursor.fetchone()[0]
    conn.close()
    return count
