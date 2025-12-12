"""
Privacy Fillout Sync Module - Phase 5B
Syncs Fillout form submissions to privacy.db privacy_submissions table
Uses Joseph's schema from Phase 5A
"""
import json
import sqlite3
import urllib.request
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime

# Database path - privacy.db (not privacy.db)
DB_PATH = Path(__file__).resolve().parent.parent / "data" / "privacy.db"

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

    # Connect to privacy.db
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    for response in responses:
        try:
            mapped = map_fillout_response(response)
            submission_id = mapped["id"]

            # Check if exists
            cursor.execute("SELECT id FROM privacy_submissions WHERE id = ?", (submission_id, submission_id))
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
    """Get submissions from privacy.db privacy_submissions table"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Query using actual schema - answers are in answers_json, scores in score_* columns
    cursor.execute("""
        SELECT
            id, submission_id, form_id, submitted_at, received_at,
            contact_name, contact_email, contact_phone, business_name,
            answers_json,
            score_level, score_color, score_dpo, score_reg, score_report,
            score_requirements, score_confidence,
            review_status, reviewed_at, override_level, override_reason
        FROM privacy_submissions
        ORDER BY submitted_at DESC
        LIMIT ? OFFSET ?
    """, (limit, offset))

    rows = cursor.fetchall()
    conn.close()

    # Transform to frontend format
    submissions = []
    for row in rows:
        # Parse answers_json to get questionnaire fields
        answers = {}
        if row["answers_json"]:
            try:
                answers = json.loads(row["answers_json"])
            except (json.JSONDecodeError, TypeError):
                pass

        submissions.append({
            "id": row["id"],
            "submission_id": row["submission_id"],
            "contact_name": row["contact_name"] or "לא צוין",
            "business_name": row["business_name"],
            "contact_email": row["contact_email"],
            "contact_phone": row["contact_phone"],
            "submitted_at": row["submitted_at"],
            "level": row["score_level"] or "pending",
            "status": row["review_status"] or "pending",
            "dpo": bool(row["score_dpo"]) if row["score_dpo"] is not None else None,
            "reg": bool(row["score_reg"]) if row["score_reg"] is not None else None,
            "report": bool(row["score_report"]) if row["score_report"] is not None else None,
            "ppl": answers.get("ppl"),
        })

    return submissions


def get_submissions_count() -> int:
    """Get total count of privacy submissions"""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM privacy_submissions")
    count = cursor.fetchone()[0]
    conn.close()
    return count


def get_submission_by_id(submission_id: str) -> Optional[dict]:
    """Get a single submission by ID with all details"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Query using actual schema - no privacy_reviews table exists
    cursor.execute("""
        SELECT *
        FROM privacy_submissions
        WHERE id = ? OR submission_id = ?
    """, (submission_id, submission_id))

    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    row_dict = dict(row)

    # Parse requirements from JSON
    requirements = []
    req_str = row_dict.get("score_requirements")
    if req_str:
        try:
            requirements = json.loads(req_str)
        except:
            pass

    # Parse answers_json for detailed fields
    answers = {}
    if row_dict.get("answers_json"):
        try:
            answers = json.loads(row_dict["answers_json"])
        except:
            pass

    return {
        "id": row_dict.get("id"),
        "submission_id": row_dict.get("submission_id"),
        "form_id": row_dict.get("form_id"),
        "submitted_at": row_dict.get("submitted_at"),
        "imported_at": row_dict.get("received_at"),
        "received_at": row_dict.get("received_at"),
        "contact_name": row_dict.get("contact_name"),
        "contact_email": row_dict.get("contact_email"),
        "contact_phone": row_dict.get("contact_phone"),
        "business_name": row_dict.get("business_name"),
        "answers": compute_derived_fields(map_answers_to_fields(answers)),
        "answers_json": row_dict.get("answers_json"),
        "score": {
            "level": row_dict.get("override_level") or row_dict.get("score_level"),
            "color": row_dict.get("score_color"),
            "dpo": bool(row_dict.get("score_dpo")),
            "reg": bool(row_dict.get("score_reg")),
            "report": bool(row_dict.get("score_report")),
            "requirements": requirements,
            "level_reasons": compute_level_reasons(compute_derived_fields(map_answers_to_fields(answers)), row_dict.get("override_level") or row_dict.get("score_level")),
        },
        "review": {
            "status": row_dict.get("review_status") or "pending",
            "reviewed_at": row_dict.get("reviewed_at"),
            "notes": row_dict.get("override_reason"),
        },
        "override": {
            "level": row_dict.get("override_level"),
            "reason": row_dict.get("override_reason"),
        },
    }


# Question keyword to field name mapping for answer display
QUESTION_TO_FIELD = [
    ("על כמה אנשים שמור", "ppl"),
    ("כמה בעלים יש", "owners"),
    ("בעלי ההרשאה לגשת", "access"),
    ("תפקידים הכפופים לחובת סודיות", "ethics"),
    ("מסוגי המידע האלה", "sensitive_types"),
    ("אנשים אתם שומרים מידע בעל רגישות", "sensitive_people"),
    ("ביומטרי על 100,000", "biometric_100k"),
    ("שומרים מידע ביומטרי מעל", "biometric_100k"),
    ("לאסוף נתונים על אנשים כדי להעבירם", "transfer"),
    ("בפילוח לפי מאפיין אישי, כשירות בשביל גורם אחר", "directmail_biz"),
    ("בפילוח לפי מאפיין אישי, עבור העסק", "directmail_self"),
    ("מנטר לפחות 1,000", "monitor_1000"),
    ("מטפלים במידע אישי במיקור חוץ למען אחרים", "processor"),
    ("מעבדים מידע במיקור חוץ בעבור", "processor_large_org"),
    ("עובדים או פרילנסרים החשופים", "employees_exposed"),
    ("שימוש במצלמות מעקב", "cameras"),
]

def map_answers_to_fields(answers_dict: dict) -> dict:
    """Map Hebrew question text keys to normalized field names"""
    mapped = {}
    for question, value in answers_dict.items():
        for keyword, field in QUESTION_TO_FIELD:
            if keyword in question:
                mapped[field] = value
                break
    return mapped

def compute_derived_fields(answers: dict) -> dict:
    """Compute derived fields like sensitive based on other answers.
    
    ALG-001 FIX: When biometric_100k=Yes, enforce minimum floors:
    - sensitive_people >= 100,000
    - ppl >= 100,000
    Because biometric data IS sensitive data.
    """
    # Compute sensitive field - true if any sensitive data indicators present
    has_sensitive = False
    
    # Check if sensitive_types has values
    st = answers.get("sensitive_types")
    if st and (isinstance(st, list) and len(st) > 0):
        has_sensitive = True
    elif st and isinstance(st, str) and st.strip():
        has_sensitive = True
    
    # Check if sensitive_people > 0
    sp = answers.get("sensitive_people")
    if sp and (isinstance(sp, (int, float)) and sp > 0):
        has_sensitive = True
    
    # Check if biometric_100k is yes (biometric is sensitive data)
    bio = answers.get("biometric_100k")
    if bio and str(bio).strip() in ["כן", "yes", "true", "1", True]:
        has_sensitive = True
        
        # ALG-001: Biometric implies minimum floors for counts
        # If someone has biometric data on 100K+ people, they automatically
        # have sensitive data on at least 100K people
        BIOMETRIC_MIN = 100000
        
        # Enforce minimum for sensitive_people
        try:
            sp_val = int(answers.get("sensitive_people") or 0)
        except (ValueError, TypeError):
            sp_val = 0
        if sp_val < BIOMETRIC_MIN:
            answers["sensitive_people"] = BIOMETRIC_MIN
        
        # Enforce minimum for ppl (total people)
        try:
            ppl_val = int(answers.get("ppl") or 0)
        except (ValueError, TypeError):
            ppl_val = 0
        if ppl_val < BIOMETRIC_MIN:
            answers["ppl"] = BIOMETRIC_MIN
    
    # Set the derived field
    if has_sensitive:
        answers["sensitive"] = "כן"
    
    return answers
def compute_level_reasons(answers: dict, level: str) -> list:
    """Compute the specific reasons why this submission has this level"""
    reasons = []
    
    # Get values with defaults
    ppl = int(answers.get("ppl") or 0)
    sensitive_people = int(answers.get("sensitive_people") or 0)
    access = int(answers.get("access") or 0)
    sensitive = answers.get("sensitive") in [True, "כן", "yes", 1]
    biometric_100k = answers.get("biometric_100k") in [True, "כן", "yes", 1]
    
    if level == "high":
        # Check which high-level rules triggered
        if biometric_100k:
            reasons.append("ביומטרי מעל 100,000 איש")
        if sensitive_people >= 100000:
            reasons.append("מעל 100,000 אנשים עם מידע רגיש")
        if ppl >= 100000:
            reasons.append("מעל 100,000 אנשים במאגר")
        if sensitive and access >= 101:
            reasons.append("מידע רגיש עם יותר מ-100 מורשי גישה")
        if answers.get("processor_large_org") in [True, "כן", "yes", 1]:
            reasons.append("מעבד מידע לגוף גדול")
        if answers.get("processor_sensitive_org") in [True, "כן", "yes", 1]:
            reasons.append("מעבד מידע לגוף רגיש/ציבורי")
    
    elif level == "mid":
        if answers.get("processor") in [True, "כן", "yes", 1]:
            reasons.append("מעבד מידע במיקור חוץ")
        if answers.get("transfer") in [True, "כן", "yes", 1]:
            reasons.append("העברת מידע לאחר כנגד תמורה")
        if answers.get("directmail_biz") in [True, "כן", "yes", 1]:
            reasons.append("דיוור ישיר למען אחר")
        if sensitive and access > 10:
            reasons.append("מידע רגיש עם יותר מ-10 מורשי גישה")
    
    elif level == "basic":
        reasons.append("לא עומד בתנאי יחיד, אין דיוור/העברה למען אחר")
    
    elif level == "lone":
        reasons.append("עד 2 בעלים, עד 2 מורשי גישה, פחות מ-10,000 אנשים")
    
    return reasons
