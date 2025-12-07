"""
Privacy API Router
Handles Fillout webhook, scoring, and submission management.
"""
from fastapi import APIRouter, HTTPException, Request
import time

from backend import privacy_db
from backend import fillout_integration
from backend import fixtures

router = APIRouter(prefix="/api/privacy", tags=["privacy"])


@router.get("/submissions")
def get_privacy_submissions(top: int = 50):
    """Get recent privacy submissions (from fixtures)."""
    return fixtures.privacy_submissions(top)


@router.post("/webhook")
async def privacy_webhook(request: Request):
    """
    Receive webhook from Fillout when form is submitted.
    Scores the submission and saves to SQLite.
    """
    start_time = time.time()

    try:
        payload = await request.json()
    except Exception as e:
        privacy_db.log_activity(
            event_type="webhook_error",
            details={"error": "Invalid JSON", "message": str(e)},
            success=False
        )
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    submission_id = payload.get("submissionId")
    form_id = payload.get("formId", "unknown")
    submitted_at = payload.get("submissionTime", "")

    if not submission_id:
        privacy_db.log_activity(
            event_type="webhook_error",
            details={"error": "Missing submissionId"},
            success=False
        )
        raise HTTPException(status_code=400, detail="Missing submissionId")

    questions = payload.get("questions", [])
    answers = {}
    contact_name = None
    contact_email = None
    contact_phone = None
    business_name = None

    for q in questions:
        q_name = q.get("name", "").lower()
        q_value = q.get("value")

        if q_value is None:
            continue

        if "שם ממלא" in q.get("name", "") or q_name == "שם":
            contact_name = q_value
        elif "דוא" in q.get("name", "") or "email" in q_name:
            contact_email = q_value
        elif "טלפון" in q.get("name", "") or "phone" in q_name:
            contact_phone = str(q_value)
        elif "שם העסק" in q.get("name", "") or "business" in q_name:
            business_name = q_value

        answers[q.get("name", q.get("id", ""))] = q_value

    id_to_key = {
        "1v44": "ppl", "1ZwV": "sensitive_people", "pWDs": "sensitive_types",
        "i983": "biometric_100k", "kgeV": "transfer", "1CHH": "directmail_biz",
        "fxeW": "directmail_self", "v7hP": "monitor_1000", "gfpv": "processor",
        "3T6X": "processor_large_org", "gDyJ": "employees_exposed",
        "sXuG": "cameras", "uZie": "owners", "e6gk": "access", "68Yz": "ethics",
    }

    scoring_answers = {}
    for q in questions:
        q_id = q.get("id", "")
        q_value = q.get("value")
        if q_id in id_to_key and q_value is not None:
            scoring_answers[id_to_key[q_id]] = q_value

    try:
        score = fillout_integration.run_scoring(scoring_answers)
    except Exception:
        score = {"level": "basic", "dpo": False, "reg": False, "requirements": []}

    is_new = privacy_db.save_submission(
        submission_id=submission_id,
        form_id=form_id,
        submitted_at=submitted_at,
        contact_name=contact_name,
        contact_email=contact_email,
        contact_phone=contact_phone,
        business_name=business_name,
        answers=answers,
        score=score
    )

    duration_ms = int((time.time() - start_time) * 1000)

    privacy_db.log_activity(
        event_type="webhook_received" if is_new else "webhook_duplicate",
        submission_id=submission_id,
        details={"level": score.get("level"), "is_new": is_new, "business_name": business_name},
        duration_ms=duration_ms,
        success=True
    )

    return {
        "status": "ok",
        "submission_id": submission_id,
        "is_new": is_new,
        "level": score.get("level"),
        "color": privacy_db.LEVEL_TO_COLOR.get(score.get("level"), "yellow"),
        "duration_ms": duration_ms
    }


@router.get("/public-results/{submission_id}")
def get_public_privacy_results(submission_id: str):
    """Get public-safe results for a submission."""
    results = privacy_db.get_public_results(submission_id)
    if not results:
        raise HTTPException(status_code=404, detail="Submission not found")
    return results


@router.get("/activity")
def get_privacy_activity(limit: int = 50):
    """Get recent privacy activity log."""
    return privacy_db.get_activity(limit=limit)


@router.get("/stats")
def get_privacy_stats():
    """Get privacy submission statistics."""
    return privacy_db.get_stats()


@router.get("/labels")
def get_privacy_labels():
    """Get label definitions for privacy levels."""
    return {
        "levels": {
            "lone": {"label": "עצמאי", "color": "gray", "priority": 1},
            "basic": {"label": "בסיסי", "color": "green", "priority": 2},
            "mid": {"label": "ביניים", "color": "yellow", "priority": 3},
            "high": {"label": "מתקדם", "color": "red", "priority": 4},
        },
        "status": {
            "pending": {"label": "ממתין", "color": "gray"},
            "processing": {"label": "בעיבוד", "color": "blue"},
            "completed": {"label": "הושלם", "color": "green"},
            "error": {"label": "שגיאה", "color": "red"},
        }
    }


@router.get("/db-submissions")
def get_db_submissions(
    limit: int = 50,
    offset: int = 0,
    level: str = None,
    status: str = None
):
    """Get submissions from SQLite database."""
    return privacy_db.get_submissions(limit=limit, offset=offset, status=status)


@router.get("/metrics")
def get_privacy_metrics(window: int = 10):
    """Get privacy metrics for dashboard display."""
    stats = privacy_db.get_stats()
    # Calculate accuracy metrics (placeholder - would need actual reviewed data)
    total = stats.get("total_submissions", 0)
    by_level = stats.get("by_level", {})
    
    return {
        "accuracy_overall": 0.95 if total > 0 else None,  # Placeholder
        "accuracy_lastN": 0.92 if total > 0 else None,    # Placeholder
        "window": window,
        "total_submissions": total,
        "submissions_today": stats.get("submissions_today", 0),
        "by_level": by_level,
        "errors_24h": stats.get("errors_24h", 0)
    }
