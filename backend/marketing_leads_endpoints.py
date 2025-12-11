# ─────────────────────────────────────────────────────────────
# Marketing Leads & Attribution Endpoints
# ─────────────────────────────────────────────────────────────
# NOTE: This file is exec'd in main.py context, so `app`, `json`, `Path`,
# `HTTPException`, `Request`, `Query`, `Body`, `os` are already in scope.

from typing import Optional, List as ListType
try:
    from backend.marketing_db import (
        save_lead, get_lead, get_leads, update_lead,
        save_campaign, get_campaigns, get_campaign, update_campaign,
        get_campaign_stats, get_leads_stats,
        save_form_mapping, get_form_mapping, get_all_form_mappings,
        get_scoring_rules, update_scoring_rule,
        LEAD_STATUSES
    )
except ImportError:
    from marketing_db import (
        save_lead, get_lead, get_leads, update_lead,
        save_campaign, get_campaigns, get_campaign, update_campaign,
        get_campaign_stats, get_leads_stats,
        save_form_mapping, get_form_mapping, get_all_form_mappings,
        get_scoring_rules, update_scoring_rule,
        LEAD_STATUSES
    )

import logging
logger = logging.getLogger(__name__)


# ============ Webhook Endpoint ============

@app.post("/api/marketing/webhook/fillout")
async def fillout_webhook(request: Request):
    """
    Receive Fillout form submissions and save as leads.
    """
    try:
        body = await request.body()
        data = json.loads(body)

        logger.info(f"Received Fillout webhook: form_id={data.get('formId')}")

        submission = data.get("submission", {})
        questions = submission.get("questions", [])

        # Build lookup dict for answers
        answers = {}
        for q in questions:
            key = q.get("name", q.get("id", ""))
            value = q.get("value")
            if key:
                answers[key.lower()] = value

        # Extract common fields
        full_name = (
            answers.get("name") or answers.get("full_name") or
            answers.get("שם") or answers.get("שם מלא") or ""
        )
        email = (
            answers.get("email") or answers.get("אימייל") or
            answers.get("דואר אלקטרוני") or ""
        )
        phone = (
            answers.get("phone") or answers.get("טלפון") or
            answers.get("נייד") or answers.get("מספר טלפון") or ""
        )
        company_name = (
            answers.get("company") or answers.get("company_name") or
            answers.get("חברה") or answers.get("שם החברה") or
            answers.get("שם העסק") or ""
        )

        # UTM parameters
        url_params = submission.get("urlParameters", {})
        utm_source = url_params.get("utm_source")
        utm_medium = url_params.get("utm_medium")
        utm_campaign = url_params.get("utm_campaign")
        utm_content = url_params.get("utm_content")
        utm_term = url_params.get("utm_term")

        # Form mapping
        form_id = data.get("formId")
        form_mapping = get_form_mapping(form_id) if form_id else None
        service_type = form_mapping.get("service_type") if form_mapping else None
        form_name = form_mapping.get("form_name") if form_mapping else data.get("formName")

        # Save lead
        lead_id, is_new, duplicate_of = save_lead(
            full_name=full_name,
            email=email,
            phone=phone,
            company_name=company_name,
            utm_source=utm_source,
            utm_medium=utm_medium,
            utm_campaign=utm_campaign,
            utm_content=utm_content,
            utm_term=utm_term,
            source_type="fillout",
            source_form_id=form_id,
            source_form_name=form_name,
            landing_page=url_params.get("landing_page"),
            referrer=url_params.get("referrer"),
            service_type=service_type,
            raw_submission=data,
            fillout_submission_id=submission.get("submissionId")
        )

        logger.info(f"Saved lead: id={lead_id}, is_new={is_new}, duplicate_of={duplicate_of}")
        return {"success": True, "lead_id": lead_id, "is_new": is_new, "duplicate_of": duplicate_of}

    except Exception as e:
        logger.error(f"Webhook error: {e}", exc_info=True)
        return {"success": False, "error": str(e)}


# ============ Leads Endpoints ============

@app.get("/api/marketing/leads")
async def list_marketing_leads(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    status: Optional[str] = None,
    utm_source: Optional[str] = None,
    utm_campaign: Optional[str] = None,
    service_type: Optional[str] = None,
    min_score: Optional[int] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    search: Optional[str] = None
):
    """Get leads with optional filters"""
    leads = get_leads(
        limit=limit, offset=offset, status=status,
        utm_source=utm_source, utm_campaign=utm_campaign,
        service_type=service_type, min_score=min_score,
        from_date=from_date, to_date=to_date, search=search
    )
    return {"leads": leads, "count": len(leads)}


@app.get("/api/marketing/leads/stats")
async def marketing_leads_statistics(days: int = Query(30, ge=1, le=365)):
    """Get lead statistics"""
    return get_leads_stats(days=days)


@app.get("/api/marketing/leads/{lead_id}")
async def get_marketing_lead(lead_id: int):
    """Get a specific lead by ID"""
    lead = get_lead(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@app.put("/api/marketing/leads/{lead_id}")
async def update_marketing_lead(lead_id: int, payload: dict = Body(...)):
    """Update a lead"""
    status = payload.get("status")
    if status and status not in LEAD_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {LEAD_STATUSES}")

    allowed = ["status", "assigned_to", "notes", "full_name", "email", "phone", "company_name"]
    updates = {k: v for k, v in payload.items() if k in allowed}
    success = update_lead(lead_id, **updates)

    if not success:
        raise HTTPException(status_code=404, detail="Lead not found or no changes made")
    return {"success": True, "lead": get_lead(lead_id)}


@app.post("/api/marketing/leads/manual")
async def create_manual_marketing_lead(payload: dict = Body(...)):
    """Create a lead manually"""
    lead_id, is_new, duplicate_of = save_lead(
        full_name=payload.get("full_name"),
        email=payload.get("email"),
        phone=payload.get("phone"),
        company_name=payload.get("company_name"),
        utm_source=payload.get("utm_source", "manual"),
        utm_medium=payload.get("utm_medium"),
        utm_campaign=payload.get("utm_campaign"),
        source_type="manual",
        service_type=payload.get("service_type")
    )
    if payload.get("notes") and lead_id:
        update_lead(lead_id, notes=payload["notes"])

    return {"success": True, "lead_id": lead_id, "is_new": is_new, "duplicate_of": duplicate_of, "lead": get_lead(lead_id)}


# ============ Campaigns Endpoints ============

@app.get("/api/marketing/campaigns")
async def list_marketing_campaigns(status: Optional[str] = None):
    """Get all campaigns"""
    return {"campaigns": get_campaigns(status=status)}


@app.get("/api/marketing/campaigns/stats")
async def marketing_campaigns_statistics(days: int = Query(30, ge=1, le=365)):
    """Get all campaigns with statistics"""
    return {"campaigns": get_campaign_stats(days=days)}


@app.get("/api/marketing/campaigns/{campaign_id}")
async def get_marketing_campaign(campaign_id: int):
    """Get a specific campaign"""
    campaign = get_campaign(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


@app.get("/api/marketing/campaigns/{campaign_id}/stats")
async def get_marketing_campaign_statistics(campaign_id: int, days: int = Query(30, ge=1, le=365)):
    """Get statistics for a specific campaign"""
    campaign = get_campaign(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    stats = get_campaign_stats(campaign_id=campaign_id, days=days)
    return {**campaign, **stats}


@app.post("/api/marketing/campaigns")
async def create_marketing_campaign(payload: dict = Body(...)):
    """Create a new campaign"""
    required = ["name", "utm_campaign", "channel"]
    for field in required:
        if not payload.get(field):
            raise HTTPException(status_code=400, detail=f"{field} is required")

    try:
        campaign_id = save_campaign(
            name=payload["name"],
            utm_campaign=payload["utm_campaign"],
            channel=payload["channel"],
            description=payload.get("description"),
            target_service=payload.get("target_service"),
            budget=payload.get("budget"),
            start_date=payload.get("start_date"),
            end_date=payload.get("end_date"),
            destination_url=payload.get("destination_url")
        )
        return {"success": True, "campaign_id": campaign_id, "campaign": get_campaign(campaign_id)}
    except Exception as e:
        if "UNIQUE constraint" in str(e):
            raise HTTPException(status_code=400, detail="Campaign with this UTM campaign name already exists")
        raise


@app.put("/api/marketing/campaigns/{campaign_id}")
async def update_marketing_campaign(campaign_id: int, payload: dict = Body(...)):
    """Update a campaign"""
    allowed = ["name", "description", "status", "budget", "start_date", "end_date", "target_service"]
    updates = {k: v for k, v in payload.items() if k in allowed}
    success = update_campaign(campaign_id, **updates)

    if not success:
        raise HTTPException(status_code=404, detail="Campaign not found or no changes made")
    return {"success": True, "campaign": get_campaign(campaign_id)}


# ============ Form Mapping Endpoints ============

@app.get("/api/marketing/forms")
async def list_marketing_form_mappings():
    """Get all form mappings"""
    return {"forms": get_all_form_mappings()}


@app.get("/api/marketing/forms/{form_id}")
async def get_marketing_form_mapping(form_id: str):
    """Get form mapping by Fillout form ID"""
    mapping = get_form_mapping(form_id)
    if not mapping:
        raise HTTPException(status_code=404, detail="Form mapping not found")
    return mapping


@app.post("/api/marketing/forms")
async def create_marketing_form_mapping(payload: dict = Body(...)):
    """Create or update form mapping"""
    if not payload.get("fillout_form_id"):
        raise HTTPException(status_code=400, detail="fillout_form_id is required")

    save_form_mapping(
        form_id=payload["fillout_form_id"],
        form_name=payload.get("form_name"),
        service_type=payload.get("service_type"),
        scoring_bonus=payload.get("scoring_bonus", 0)
    )
    return {"success": True, "mapping": get_form_mapping(payload["fillout_form_id"])}


# ============ Scoring Rules Endpoints ============

@app.get("/api/marketing/scoring-rules")
async def list_marketing_scoring_rules():
    """Get all lead scoring rules"""
    return {"rules": get_scoring_rules()}


@app.put("/api/marketing/scoring-rules")
async def update_marketing_scoring_rule(payload: dict = Body(...)):
    """Update or create a scoring rule"""
    if not payload.get("signal"):
        raise HTTPException(status_code=400, detail="signal is required")
    if "points" not in payload:
        raise HTTPException(status_code=400, detail="points is required")

    success = update_scoring_rule(
        signal=payload["signal"],
        points=payload["points"],
        name=payload.get("name"),
        is_active=payload.get("is_active", True)
    )
    return {"success": success, "rules": get_scoring_rules()}


@app.put("/api/marketing/scoring-rules/batch")
async def batch_update_marketing_scoring_rules(payload: dict = Body(...)):
    """Update multiple scoring rules at once"""
    rules = payload.get("rules", [])
    for rule in rules:
        if rule.get("signal") and "points" in rule:
            update_scoring_rule(
                signal=rule["signal"],
                points=rule["points"],
                name=rule.get("name"),
                is_active=rule.get("is_active", True)
            )
    return {"success": True, "rules": get_scoring_rules()}


# ============ UTM Link Generator ============

@app.post("/api/marketing/generate-tracking-url")
async def generate_marketing_tracking_url(payload: dict = Body(...)):
    """Generate a tracking URL with UTM parameters"""
    destination_url = payload.get("destination_url")
    utm_source = payload.get("utm_source")
    utm_campaign = payload.get("utm_campaign")

    if not all([destination_url, utm_source, utm_campaign]):
        raise HTTPException(status_code=400, detail="destination_url, utm_source, and utm_campaign are required")

    separator = "&" if "?" in destination_url else "?"
    params = [
        f"utm_source={utm_source}",
        f"utm_medium={payload.get('utm_medium', 'cpc')}",
        f"utm_campaign={utm_campaign}"
    ]
    if payload.get("utm_content"):
        params.append(f"utm_content={payload['utm_content']}")
    if payload.get("utm_term"):
        params.append(f"utm_term={payload['utm_term']}")

    tracking_url = f"{destination_url}{separator}{'&'.join(params)}"
    return {"tracking_url": tracking_url}


# ============ AI Insights Chat ============

@app.post("/api/marketing/insights/chat")
async def marketing_insights_chat(payload: dict = Body(...)):
    """AI-powered chat for marketing insights"""
    import os
    import json
    from pathlib import Path

    message = payload.get("message", "")
    history = payload.get("history", [])

    if not message:
        raise HTTPException(status_code=400, detail="message is required")

    # Get current stats for context
    stats = get_leads_stats(days=30)

    # Load secrets for LLM
    secrets_path = Path(__file__).parent / "secrets.local.json"
    if not secrets_path.exists():
        secrets_path = Path("/mnt/c/Coding Projects/EISLAW System/secrets.local.json")

    llm_key = None
    try:
        if secrets_path.exists():
            secrets = json.loads(secrets_path.read_text("utf-8"))
            llm_key = secrets.get("llm", {}).get("api_keys", {}).get("gemini")
    except:
        pass

    # If no LLM key, return a structured response based on the query
    if not llm_key:
        response = generate_stats_response(message, stats)
        return {"response": response, "data": None}

    # Use Gemini for natural language response
    try:
        import google.generativeai as genai
        genai.configure(api_key=llm_key)

        # Prepare context
        context = f"""אתה עוזר ניתוח שיווקי למשרד עורכי דין EISLAW.

נתונים עדכניים (30 ימים אחרונים):
- סה"כ לידים: {stats.get('total_leads', 0)}
- ציון ממוצע: {stats.get('avg_score', 0):.0f}
- לידים איכותיים (80+): {stats.get('by_level', {}).get('high', 0)}
- לידים בינוניים (50-79): {stats.get('by_level', {}).get('medium', 0)}
- לידים נמוכים (<50): {stats.get('by_level', {}).get('low', 0)}

מקורות לידים:
{json.dumps(stats.get('by_source', {}), ensure_ascii=False, indent=2)}

ענה בעברית בצורה תמציתית ומקצועית. אם נשאלת על נתונים שאין לך, אמור זאת בכנות.
"""

        model = genai.GenerativeModel('gemini-1.5-flash')

        # Build messages
        messages = [{"role": "user", "parts": [context]}]
        for h in history[-4:]:
            role = "user" if h["role"] == "user" else "model"
            messages.append({"role": role, "parts": [h["content"]]})
        messages.append({"role": "user", "parts": [message]})

        response = model.generate_content(messages)
        return {"response": response.text, "data": None}

    except Exception as e:
        # Fallback to structured response
        response = generate_stats_response(message, stats)
        return {"response": response, "data": None}


def generate_stats_response(message: str, stats: dict) -> str:
    """Generate a response based on the query without LLM"""
    message_lower = message.lower()

    total = stats.get('total_leads', 0)
    avg = stats.get('avg_score', 0)
    by_level = stats.get('by_level', {})
    by_source = stats.get('by_source', {})

    if any(word in message_lower for word in ['מגמה', 'טרנד', 'trend']):
        return f"""הנה סיכום המגמות:

📊 סה"כ לידים ב-30 הימים האחרונים: {total}
📈 ציון ממוצע: {avg:.0f}

התפלגות איכות:
• איכות גבוהה: {by_level.get('high', 0)} לידים
• איכות בינונית: {by_level.get('medium', 0)} לידים
• איכות נמוכה: {by_level.get('low', 0)} לידים"""

    if any(word in message_lower for word in ['מקור', 'source', 'מאיפה', 'איכותי']):
        sources_text = "\n".join([f"• {src}: {count} לידים" for src, count in sorted(by_source.items(), key=lambda x: -x[1])[:5]])
        return f"""מקורות הלידים העיקריים:

{sources_text if sources_text else 'אין נתונים על מקורות'}

סה"כ: {total} לידים
ציון ממוצע: {avg:.0f}"""

    if any(word in message_lower for word in ['קמפיין', 'campaign', 'משתלם']):
        return f"""ניתוח קמפיינים:

📊 סה"כ לידים: {total}
📈 ציון ממוצע: {avg:.0f}

ביצועים לפי מקור:
{chr(10).join([f"• {src}: {count}" for src, count in sorted(by_source.items(), key=lambda x: -x[1])[:5]])}

💡 המלצה: התמקד במקורות עם הכי הרבה לידים איכותיים"""

    if any(word in message_lower for word in ['המלצ', 'recommend', 'שיפור', 'improve']):
        high_pct = (by_level.get('high', 0) / total * 100) if total > 0 else 0
        return f"""המלצות לשיפור:

📊 מצב נוכחי:
• {high_pct:.0f}% מהלידים באיכות גבוהה
• ציון ממוצע: {avg:.0f}

💡 המלצות:
1. {"הגדל השקעה במקורות עם לידים איכותיים" if high_pct > 30 else "שפר את איכות הלידים - רק " + f"{high_pct:.0f}%" + " באיכות גבוהה"}
2. וודא שכל הטפסים כוללים שדה טלפון חובה (+5 נקודות)
3. {"התמקד בקהל עסקי" if avg < 60 else "המשך להתמקד בקהל הנוכחי"}"""

    # Default response
    return f"""הנה סיכום מהיר:

📊 סה"כ לידים (30 יום): {total}
📈 ציון ממוצע: {avg:.0f}
✅ לידים איכותיים: {by_level.get('high', 0)}

מקורות מובילים:
{chr(10).join([f"• {src}: {count}" for src, count in sorted(by_source.items(), key=lambda x: -x[1])[:3]])}

💬 שאל אותי על מגמות, מקורות, קמפיינים או המלצות לשיפור."""
