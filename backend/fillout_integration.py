from backend.logging_config import logger
# Fillout Integration for Privacy Submissions
# Add this to main.py or create as a separate module

import json
import urllib.request
from pathlib import Path
from typing import Optional

def get_fillout_api_key():
    """Load Fillout API key from secrets"""
    secrets_path = Path(__file__).resolve().parent.parent / "secrets.local.json"
    if not secrets_path.exists():
        secrets_path = Path(__file__).resolve().parent / "secrets.local.json"
    if secrets_path.exists():
        try:
            data = json.loads(secrets_path.read_text("utf-8"))
            return data.get("fillout", {}).get("api_key")
        except Exception:
            pass
    return None


def fillout_http_get(url: str, api_key: str) -> dict:
    """Make authenticated GET request to Fillout API"""
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {api_key}"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_fillout_submissions(form_id: str, limit: int = 20) -> list:
    """Fetch submissions from Fillout API"""
    api_key = get_fillout_api_key()
    if not api_key:
        return []

    try:
        url = f"https://api.fillout.com/v1/api/forms/{form_id}/submissions?limit={limit}"
        data = fillout_http_get(url, api_key)
        responses = data.get("responses", [])

        # Transform to our format
        submissions = []
        for resp in responses:
            q_by_name = {q.get("name"): q for q in resp.get("questions", [])}

            # Extract contact info from questions
            contact_name = None
            contact_email = None
            contact_phone = None
            business_name = None

            for q in resp.get("questions", []):
                name = q.get("name", "").lower()
                val = q.get("value")
                if val is None:
                    continue
                if "שם ממלא" in q.get("name", "") or "שם" == name:
                    contact_name = val
                elif "דוא" in q.get("name", "") or "email" in name:
                    contact_email = val
                elif "טלפון" in q.get("name", "") or "phone" in name:
                    contact_phone = str(val)
                elif "שם העסק" in q.get("name", "") or "business" in name:
                    business_name = val

            # Run scoring
            answers = map_fillout_answers(resp.get("questions", []))
            score = run_scoring(answers)

            submissions.append({
                "submission_id": resp.get("submissionId"),
                "contact_name": contact_name or "לא צוין",
                "business_name": business_name,
                "contact_email": contact_email,
                "contact_phone": contact_phone,
                "level": score.get("level", "basic"),
                "submitted_at": resp.get("submissionTime"),
                "status": "pending",
            })

        return submissions
    except Exception as e:
        logger.error("Failed to fetch Fillout submissions", error=str(e))
        return []


def fetch_fillout_submission_detail(form_id: str, submission_id: str) -> Optional[dict]:
    """Fetch single submission detail from Fillout"""
    # Fillout doesn't have a single submission endpoint, so we fetch all and filter
    submissions_raw = fetch_fillout_submissions_raw(form_id, limit=50)

    for resp in submissions_raw:
        if resp.get("submissionId") == submission_id:
            answers = map_fillout_answers(resp.get("questions", []))
            score = run_scoring(answers)

            # Extract contact info
            contact_name = answers.get("contact_name")
            contact_email = answers.get("contact_email")
            contact_phone = answers.get("contact_phone")
            business_name = answers.get("business_name")

            return {
                "submission_id": submission_id,
                "contact_name": contact_name,
                "business_name": business_name,
                "contact_email": contact_email,
                "contact_phone": str(contact_phone) if contact_phone else None,
                "level": score.get("level"),
                "submitted_at": resp.get("submissionTime"),
                "status": "pending",
                "answers": answers,
                "score": score,
            }
    return None


def fetch_fillout_submissions_raw(form_id: str, limit: int = 50) -> list:
    """Fetch raw submissions from Fillout"""
    api_key = get_fillout_api_key()
    if not api_key:
        return []
    try:
        url = f"https://api.fillout.com/v1/api/forms/{form_id}/submissions?limit={limit}"
        data = fillout_http_get(url, api_key)
        return data.get("responses", [])
    except Exception:
        return []


def map_fillout_answers(questions: list) -> dict:
    """Map Fillout questions to our answer format"""
    answers = {}

    # Field mapping (Fillout question name patterns -> our field names)
    mappings = {
        "contact_name": ["שם ממלא הטופס"],
        "contact_email": ["כתובת דוא"],
        "contact_phone": ["מספר טלפון"],
        "business_name": ["שם העסק"],
        "owners": ["owners", "כמה בעלים"],
        "access": ["access", "מספר בעלי ההרשאה"],
        "ethics": ["ethics", "סודיות מקצועית"],
        "ppl": ["ppl", "על כמה אנשים שמור"],
        "sensitive_types": ["sensitive_types", "מידע בעל רגישות מיוחדת"],
        "sensitive_people": ["sensitive_people", "מידע בעל רגישות מיוחדת"],
        "biometric_100k": ["biometric_100k", "מידע ביומטרי"],
        "transfer": ["transfer", "להעבירם לאחרים"],
        "directmail_biz": ["directmail_biz", "מדוורים למאגר שלכם"],
        "directmail_self": ["directmail_self"],
        "monitor_1000": ["monitor_1000", "מנטר לפחות"],
        "processor": ["processor", "מיקור חוץ"],
        "processor_large_org": ["processor_large_org"],
        "employees_exposed": ["employees_exposed", "עובדים או פרילנסרים"],
        "cameras": ["cameras", "מצלמות"],
    }

    for q in questions:
        q_name = q.get("name", "")
        q_value = q.get("value")

        if q_value is None:
            continue

        # Try to match to our fields
        for field, patterns in mappings.items():
            for pattern in patterns:
                if pattern.lower() in q_name.lower() or q_name.lower() == pattern.lower():
                    # Convert Hebrew yes/no to boolean
                    if isinstance(q_value, str):
                        if q_value.strip() in ["כן", "כן.", "Yes", "yes"]:
                            q_value = True
                        elif q_value.strip() in ["לא", "No", "no"]:
                            q_value = False
                    answers[field] = q_value
                    break

    return answers


def run_scoring(answers: dict) -> dict:
    """Run the privacy scoring algorithm using the full evaluator"""
    import sys
    from pathlib import Path
    
    # Add tools directory to path for importing evaluator
    tools_dir = Path(__file__).resolve().parent.parent / "tools"
    if str(tools_dir) not in sys.path:
        sys.path.insert(0, str(tools_dir))
    
    try:
        from security_scoring_eval import evaluate, load_rules, coerce_inputs
        rules_path = Path(__file__).resolve().parent.parent / "config" / "security_scoring_rules.json"
        rules = load_rules(rules_path)
        normalized = coerce_inputs(answers)
        result = evaluate(rules, normalized)
        return result
    except Exception as e:
        # Fallback to basic if evaluator fails
        logger.error("Scoring error", error=str(e))
        return {"level": "basic", "dpo": False, "reg": False, "report": False, "requirements": []}

